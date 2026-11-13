using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.Notification;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Helpers
{
    public sealed record NotificationGroupMetadata(
        string GroupKey,
        string CanonicalTitle,
        string MultipleSummaryMessage,
        string CanonicalScreenUrl,
        bool IsRequestGroup);

    public static class NotificationGroupingHelper
    {
        private static readonly Regex TrailingRefRegex = new(@"#\d+\b", RegexOptions.Compiled);
        private static readonly Regex NonSlugRegex = new(@"[^a-z0-9\-]+", RegexOptions.Compiled);
        private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled);

        private static readonly HashSet<string> RecordSpecificQueryKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "regId", "admissionId", "leaveId", "claimId", "examinationId", "examId",
            "certificateId", "payslipId", "referenceId", "refId", "id"
        };

        public static string ResolveGroupKey(string? type, string? title, string? actionUrl) =>
            ResolveGroupMetadata(type, title, actionUrl).GroupKey;

        public static NotificationGroupMetadata ResolveGroupMetadata(string? type, string? title, string? actionUrl)
        {
            string cleanType = (type ?? "General").Trim();
            string typeLower = cleanType.ToLowerInvariant();
            string cleanTitle = (title ?? string.Empty).Trim();
            string titleLower = cleanTitle.ToLowerInvariant();
            string cleanUrl = (actionUrl ?? string.Empty).Trim();
            string urlLower = cleanUrl.ToLowerInvariant();

            // 1. Staff Attendance Regularization Requests (Admin review queue)
            if (typeLower.Contains("attend") &&
                (urlLower.Contains("view=regularize") || titleLower.Contains("regularization request")) &&
                !titleLower.Contains("approved") &&
                !titleLower.Contains("rejected"))
            {
                return new NotificationGroupMetadata(
                    GroupKey: "attendance:staff-regularize:request",
                    CanonicalTitle: "Staff Attendance Regularization",
                    MultipleSummaryMessage: "Multiple staff members submitted regularization requests.",
                    CanonicalScreenUrl: "/dashboard/attendance/staff?tab=staff-attendance&view=regularize&regScreen=pending",
                    IsRequestGroup: true);
            }

            // 2. Student Admission Applications (Admin review queue)
            if (typeLower == "admission" &&
                (titleLower.Contains("new admission") || titleLower.Contains("admission application")) &&
                !titleLower.Contains("approved") &&
                !titleLower.Contains("rejected"))
            {
                return new NotificationGroupMetadata(
                    GroupKey: "admission:admin-requests:new",
                    CanonicalTitle: "Student Admission Applications",
                    MultipleSummaryMessage: "Multiple student admission applications were submitted for review.",
                    CanonicalScreenUrl: "/dashboard/admission?view=requests",
                    IsRequestGroup: true);
            }

            // 3. Staff Leave Requests (Admin review queue)
            if (typeLower == "leave" &&
                (titleLower.Contains("new leave") || titleLower.Contains("leave request")) &&
                !titleLower.Contains("approved") &&
                !titleLower.Contains("rejected"))
            {
                return new NotificationGroupMetadata(
                    GroupKey: "leave:admin-requests:pending",
                    CanonicalTitle: "Staff Leave Requests",
                    MultipleSummaryMessage: "Multiple staff members submitted leave applications.",
                    CanonicalScreenUrl: "/dashboard/leave-management?tab=all",
                    IsRequestGroup: true);
            }

            // 4. Staff Reimbursement Claims (Admin/Accountant review queue)
            if (typeLower.Contains("reimburse") &&
                !titleLower.Contains("approved") &&
                !titleLower.Contains("rejected") &&
                !titleLower.Contains("paid"))
            {
                return new NotificationGroupMetadata(
                    GroupKey: "reimbursement:admin-claims:pending",
                    CanonicalTitle: "Reimbursement Claims",
                    MultipleSummaryMessage: "Multiple staff reimbursement claims were submitted for review.",
                    CanonicalScreenUrl: "/dashboard/reimbursements",
                    IsRequestGroup: true);
            }

            // 5. Certificate Requests
            if (typeLower.Contains("certif") &&
                (titleLower.Contains("new certificate") || titleLower.Contains("certificate request")) &&
                !titleLower.Contains("approved") &&
                !titleLower.Contains("rejected") &&
                !titleLower.Contains("issued") &&
                !titleLower.Contains("ready"))
            {
                return new NotificationGroupMetadata(
                    GroupKey: "certificate:requests:pending",
                    CanonicalTitle: "Certificate Requests",
                    MultipleSummaryMessage: "Multiple certificate requests were submitted for review.",
                    CanonicalScreenUrl: "/dashboard/certificates",
                    IsRequestGroup: true);
            }

            // 6. UTR Verification / Marks Submitted / General screen+action normalization
            string canonicalScreenUrl = NormalizeScreenUrl(cleanUrl);
            string screenSlug = canonicalScreenUrl.Trim('/');
            if (string.IsNullOrEmpty(screenSlug))
            {
                screenSlug = "no-url";
            }

            string normalizedTitleStem = NormalizeTitleStem(cleanTitle);
            string groupKeyRaw = $"{Slug(typeLower, "general")}|{Slug(screenSlug, "screen")}|{Slug(normalizedTitleStem, "item")}";
            string groupKey = groupKeyRaw.Length <= 155
                ? groupKeyRaw
                : $"{groupKeyRaw[..120]}:{ShortHash(groupKeyRaw)}";

            bool isRequestWorkflow =
                titleLower.Contains("request") ||
                titleLower.Contains("application") ||
                titleLower.Contains("claim") ||
                titleLower.Contains("submitted");

            string groupTitle = string.IsNullOrWhiteSpace(cleanTitle)
                ? $"{cleanType} Notifications"
                : TrailingRefRegex.Replace(cleanTitle, "").Trim();

            return new NotificationGroupMetadata(
                GroupKey: groupKey,
                CanonicalTitle: groupTitle,
                MultipleSummaryMessage: $"Multiple notifications for {groupTitle.ToLowerInvariant()}.",
                CanonicalScreenUrl: string.IsNullOrWhiteSpace(canonicalScreenUrl) ? cleanUrl : canonicalScreenUrl,
                IsRequestGroup: isRequestWorkflow);
        }

        public static List<NotificationDto> AggregateActiveUnread(
            IEnumerable<Notification> unreadEntities,
            Func<Notification, NotificationDto> mapSingleDto)
        {
            var ordered = unreadEntities
                .OrderByDescending(n => n.CreatedAt)
                .ThenByDescending(n => n.NotificationId)
                .ToList();

            var grouped = new List<NotificationDto>();
            var byGroupKey = new Dictionary<string, List<Notification>>(StringComparer.Ordinal);
            var groupOrder = new List<string>();

            foreach (var item in ordered)
            {
                string key = !string.IsNullOrWhiteSpace(item.GroupKey)
                    ? item.GroupKey
                    : ResolveGroupKey(item.Type, item.Title, item.ActionUrl);

                if (!byGroupKey.TryGetValue(key, out var list))
                {
                    list = new List<Notification>();
                    byGroupKey[key] = list;
                    groupOrder.Add(key);
                }
                list.Add(item);
            }

            foreach (var key in groupOrder)
            {
                grouped.Add(BuildGroupedDto(key, byGroupKey[key], mapSingleDto));
            }

            return grouped;
        }

        public static NotificationDto BuildGroupedDto(
            string groupKey,
            List<Notification> groupItems,
            Func<Notification, NotificationDto> mapSingleDto)
        {
            var sorted = groupItems
                .OrderByDescending(n => n.CreatedAt)
                .ThenByDescending(n => n.NotificationId)
                .ToList();

            var newest = sorted[0];
            var meta = ResolveGroupMetadata(newest.Type, newest.Title, newest.ActionUrl);

            // Count distinct logical requests (avoid double-counting repeated events for same ReferenceId)
            var distinctRequests = new HashSet<string>(StringComparer.Ordinal);
            foreach (var row in sorted)
            {
                string reqKey = row.ReferenceId.HasValue && row.ReferenceId.Value > 0
                    ? $"ref:{row.ReferenceId.Value}"
                    : $"row:{row.NotificationId}";
                distinctRequests.Add(reqKey);
            }

            int groupCount = Math.Max(1, distinctRequests.Count);
            var dto = mapSingleDto(newest);
            dto.GroupKey = groupKey;
            dto.GroupCount = groupCount;
            dto.IsRequestGroup = meta.IsRequestGroup || groupCount > 1;
            dto.NotificationIds = sorted.Select(x => x.NotificationId).Distinct().ToList();

            if (groupCount > 1)
            {
                dto.Title = meta.CanonicalTitle;
                dto.Message = meta.MultipleSummaryMessage;
                dto.ActionUrl = string.IsNullOrWhiteSpace(meta.CanonicalScreenUrl) ? newest.ActionUrl : meta.CanonicalScreenUrl;
                dto.ReferenceId = null;
            }
            else
            {
                // Single item in group: keep direct screen+record ActionUrl and clear screen title for request queues
                if (meta.IsRequestGroup && meta.GroupKey == "attendance:staff-regularize:request")
                {
                    dto.Title = meta.CanonicalTitle;
                    dto.ActionUrl = newest.ActionUrl ?? meta.CanonicalScreenUrl;
                }
            }

            return dto;
        }

        private static string NormalizeScreenUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return string.Empty;

            int qIdx = url.IndexOf('?', StringComparison.Ordinal);
            string rawPath = (qIdx >= 0 ? url[..qIdx] : url).Trim().TrimEnd('/').ToLowerInvariant();
            if (string.IsNullOrEmpty(rawPath)) return string.Empty;

            // Normalize legacy path aliases to canonical screens
            rawPath = rawPath switch
            {
                "/dashboard/admissions" => "/dashboard/admission",
                "/dashboard/reimbursement" => "/dashboard/reimbursements",
                "/dashboard/leave" => "/dashboard/leave-management",
                "/dashboard/faculty/marks" => "/dashboard/results",
                _ => rawPath
            };

            if (qIdx < 0 || qIdx == url.Length - 1)
            {
                return rawPath;
            }

            string queryStr = url[(qIdx + 1)..];
            var keptPairs = new List<string>();
            foreach (var part in queryStr.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                int eq = part.IndexOf('=', StringComparison.Ordinal);
                string k = eq >= 0 ? part[..eq].Trim() : part.Trim();
                string v = eq >= 0 ? part[(eq + 1)..].Trim() : string.Empty;
                if (string.IsNullOrEmpty(k) || RecordSpecificQueryKeys.Contains(k)) continue;
                if (string.Equals(k, "view", StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(v, "preview", StringComparison.OrdinalIgnoreCase))
                {
                    v = "requests";
                }
                keptPairs.Add(string.IsNullOrEmpty(v) ? k.ToLowerInvariant() : $"{k.ToLowerInvariant()}={v.ToLowerInvariant()}");
            }

            keptPairs.Sort(StringComparer.Ordinal);
            return keptPairs.Count > 0 ? $"{rawPath}?{string.Join("&", keptPairs)}" : rawPath;
        }

        private static string NormalizeTitleStem(string title)
        {
            if (string.IsNullOrWhiteSpace(title)) return "notification";
            string withoutRefs = TrailingRefRegex.Replace(title, " ");
            return WhitespaceRegex.Replace(withoutRefs, " ").Trim().ToLowerInvariant();
        }

        private static string Slug(string input, string fallback)
        {
            if (string.IsNullOrWhiteSpace(input)) return fallback;
            string s = NonSlugRegex.Replace(input.Trim().ToLowerInvariant(), "-").Trim('-');
            return string.IsNullOrEmpty(s) ? fallback : s;
        }

        private static string ShortHash(string raw)
        {
            byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes, 0, 6).ToLowerInvariant();
        }
    }
}
