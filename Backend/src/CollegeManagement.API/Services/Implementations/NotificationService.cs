using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Notification;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Hubs;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace CollegeManagement.API.Services.Implementations
{
    public class NotificationService : INotificationService
    {
        private static readonly ConcurrentDictionary<int, CancellationTokenSource> UserCacheTokens = new();
        private static long GlobalCacheEpoch = 0;

        private readonly INotificationRepository _notificationRepo;
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IMemoryCache _cache;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            INotificationRepository notificationRepo,
            AppDbContext context,
            IHubContext<NotificationHub> hubContext,
            IMemoryCache cache,
            ILogger<NotificationService> logger)
        {
            _notificationRepo = notificationRepo;
            _context = context;
            _hubContext = hubContext;
            _cache = cache;
            _logger = logger;
        }

        private static IChangeToken GetUserChangeToken(int userId)
        {
            var cts = UserCacheTokens.GetOrAdd(userId, _ => new CancellationTokenSource());
            return new CancellationChangeToken(cts.Token);
        }

        public static void InvalidateUserCache(int userId)
        {
            if (UserCacheTokens.TryRemove(userId, out var oldCts))
            {
                try
                {
                    oldCts.Cancel();
                    oldCts.Dispose();
                }
                catch
                {
                    // Ignore cancellation errors during invalidation
                }
            }
        }

        public static void InvalidateAllUserCaches()
        {
            Interlocked.Increment(ref GlobalCacheEpoch);
            foreach (var uid in UserCacheTokens.Keys.ToList())
            {
                InvalidateUserCache(uid);
            }
        }

        private static MemoryCacheEntryOptions BuildCacheOptions(int userId, TimeSpan absoluteExpiration)
        {
            return new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(absoluteExpiration)
                .AddExpirationToken(GetUserChangeToken(userId));
        }

        private static string BuildCacheKey(string kind, int userId, string suffix) =>
            $"notif:v{Volatile.Read(ref GlobalCacheEpoch)}:{kind}:{userId}:{suffix}";

        public async Task<int> PublishEventNotificationsAsync(int eventId)
        {
            try
            {
                var calendarEvent = await _context.AcademicCalendarEvents
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.EventId == eventId && !e.IsDeleted);

                if (calendarEvent == null)
                {
                    _logger.LogWarning("PublishEventNotificationsAsync: Event #{EventId} not found or deleted.", eventId);
                    return 0;
                }

                _logger.LogInformation("PublishEventNotificationsAsync: Resolving audience for Event #{EventId} ('{Title}')", eventId, calendarEvent.Title);

                // 1. Resolve Matching Students
                var studentsQuery = _context.Students.AsNoTracking()
                    .Where(s => (s.CampusId != null || s.BoardId != null));

                if (calendarEvent.BoardId > 0)
                    studentsQuery = studentsQuery.Where(s => s.BoardId == calendarEvent.BoardId);

                if (calendarEvent.AcademicYearId > 0)
                    studentsQuery = studentsQuery.Where(s => s.AcademicYearId == calendarEvent.AcademicYearId);

                if (calendarEvent.CampusId.HasValue && calendarEvent.CampusId > 0)
                    studentsQuery = studentsQuery.Where(s => s.CampusId == calendarEvent.CampusId.Value);

                if (calendarEvent.AcademicLevelId.HasValue && calendarEvent.AcademicLevelId > 0)
                    studentsQuery = studentsQuery.Where(s => s.AcademicLevelId == calendarEvent.AcademicLevelId.Value);

                if (calendarEvent.GroupId.HasValue && calendarEvent.GroupId > 0)
                    studentsQuery = studentsQuery.Where(s => s.GroupId == calendarEvent.GroupId.Value);

                if (calendarEvent.ProgramId.HasValue && calendarEvent.ProgramId > 0)
                    studentsQuery = studentsQuery.Where(s => s.ProgramId == calendarEvent.ProgramId.Value);

                if (calendarEvent.SectionId.HasValue && calendarEvent.SectionId > 0)
                    studentsQuery = studentsQuery.Where(s => s.SectionId == calendarEvent.SectionId.Value);

                var matchedStudentIds = await studentsQuery
                    .Select(s => s.StudentId)
                    .ToListAsync();

                var targetUserIds = new HashSet<int>();

                // 2. Add Student User Accounts
                if (matchedStudentIds.Any())
                {
                    var studentUserIds = await _context.Users.AsNoTracking()
                        .Where(u => u.IsActive && u.StudentId.HasValue && matchedStudentIds.Contains(u.StudentId.Value))
                        .Select(u => u.UserId)
                        .ToListAsync();

                    foreach (var uid in studentUserIds) targetUserIds.Add(uid);

                    // 3. Add Mapped Parent User Accounts via Stored Procedure
                    var conn = _context.Database.GetDbConnection();
                    if (conn.State != System.Data.ConnectionState.Open)
                    {
                        await conn.OpenAsync();
                    }
                    var activeParentUserIds = (await Dapper.SqlMapper.QueryAsync<int>(
                        conn,
                        "sp_GetParentUserIdsForStudents",
                        new { p_StudentIds = string.Join(",", matchedStudentIds) },
                        commandType: System.Data.CommandType.StoredProcedure)).ToList();

                    foreach (var uid in activeParentUserIds) targetUserIds.Add(uid);
                }

                // 4. Resolve Matching Staff
                var staffIdQuery = _context.Staffs.AsNoTracking().Where(s => s.Status == "Active");

                if (calendarEvent.CampusId.HasValue && calendarEvent.CampusId > 0)
                {
                    var staffInCampus = _context.StaffCampusAssignments.AsNoTracking()
                        .Where(a => a.CampusId == calendarEvent.CampusId.Value)
                        .Select(a => a.StaffId);

                    staffIdQuery = staffIdQuery.Where(s => s.CampusId == calendarEvent.CampusId.Value || staffInCampus.Contains(s.StaffId));
                }

                if (calendarEvent.BoardId > 0)
                {
                    var staffInBoard = _context.StaffBoardAssignments.AsNoTracking()
                        .Where(b => b.BoardId == calendarEvent.BoardId)
                        .Select(b => b.StaffId);

                    staffIdQuery = staffIdQuery.Where(s => staffInBoard.Contains(s.StaffId));
                }

                var matchedStaffIds = await staffIdQuery.Select(s => s.StaffId).ToListAsync();

                if (matchedStaffIds.Any())
                {
                    var staffUserIds = await _context.Users.AsNoTracking()
                        .Where(u => u.IsActive && u.StaffId.HasValue && matchedStaffIds.Contains(u.StaffId.Value))
                        .Select(u => u.UserId)
                        .ToListAsync();

                    foreach (var uid in staffUserIds) targetUserIds.Add(uid);
                }

                // Also notify active Admins scoped to the same college
                int? eventCollegeId = null;
                if (calendarEvent.CampusId.HasValue && calendarEvent.CampusId > 0)
                {
                    eventCollegeId = await GetCampusCollegeIdAsync(calendarEvent.CampusId.Value);
                }

                var adminQuery = _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && (u.AdminId.HasValue || (u.Role != null && u.Role.RoleName.ToLower().Contains("admin"))));

                if (eventCollegeId.HasValue && eventCollegeId.Value > 0)
                {
                    int targetCollege = eventCollegeId.Value;
                    adminQuery = adminQuery.Where(u => (u.CollegeId ?? 1) == targetCollege);
                }
                else
                {
                    adminQuery = adminQuery.Where(u => !u.CollegeId.HasValue || u.CollegeId.Value <= 1);
                }

                var adminUserIds = await adminQuery
                    .Select(u => u.UserId)
                    .ToListAsync();
                foreach (var uid in adminUserIds) targetUserIds.Add(uid);

                if (!targetUserIds.Any())
                {
                    _logger.LogInformation("PublishEventNotificationsAsync: No active users matched scope for event #{EventId}", eventId);
                    return 0;
                }

                var dateRangeStr = calendarEvent.StartDate.Date == calendarEvent.EndDate.Date
                    ? calendarEvent.StartDate.ToString("dd MMM yyyy")
                    : $"{calendarEvent.StartDate:dd MMM yyyy} to {calendarEvent.EndDate:dd MMM yyyy}";

                var locationStr = !string.IsNullOrWhiteSpace(calendarEvent.Location) ? $" at {calendarEvent.Location}" : "";
                var timeStr = !calendarEvent.IsAllDay && !string.IsNullOrWhiteSpace(calendarEvent.StartTime) ? $" ({calendarEvent.StartTime})" : "";

                var title = $"Academic Calendar: {calendarEvent.Title}";
                var message = $"{calendarEvent.EventType} has been scheduled for {dateRangeStr}{timeStr}{locationStr}.";

                int insertedCount = await SendToUsersAsync(
                    targetUserIds,
                    title,
                    message,
                    "AcademicCalendar",
                    calendarEvent.EventId,
                    "/dashboard/academic-calendar");

                _logger.LogInformation("PublishEventNotificationsAsync: Created {Count} notifications for Event #{EventId}", insertedCount, eventId);

                await _hubContext.Clients.All.SendAsync("AcademicCalendarEventPublished", new
                {
                    eventId = calendarEvent.EventId,
                    title = calendarEvent.Title,
                    eventType = calendarEvent.EventType,
                    startDate = calendarEvent.StartDate,
                    endDate = calendarEvent.EndDate
                });

                return insertedCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PublishEventNotificationsAsync failed for Event #{EventId}", eventId);
                return 0;
            }
        }

        private static NotificationDto MapToDto(Notification n) => new NotificationDto
        {
            NotificationId = n.NotificationId,
            UserId = n.UserId,
            Title = n.Title,
            Message = n.Message,
            Type = n.Type,
            ReferenceId = n.ReferenceId,
            ActionUrl = n.ActionUrl,
            GroupKey = !string.IsNullOrWhiteSpace(n.GroupKey)
                ? n.GroupKey
                : NotificationGroupingHelper.ResolveGroupKey(n.Type, n.Title, n.ActionUrl),
            GroupCount = 1,
            IsRead = n.IsRead,
            ReadAt = n.ReadAt.HasValue ? DateTime.SpecifyKind(n.ReadAt.Value, DateTimeKind.Utc) : null,
            CreatedAt = DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc)
        };

        public async Task<(List<NotificationDto> Items, int TotalCount, int UnreadCount)> GetUserNotificationsAsync(
            int userId, int page = 1, int pageSize = 20, bool? unreadOnly = null)
        {
            bool activeOnly = unreadOnly ?? true;
            string filterTag = activeOnly ? "active" : "all";
            string key = BuildCacheKey("list", userId, $"{filterTag}:{page}:{pageSize}");

            if (_cache.TryGetValue(key, out (List<NotificationDto> Items, int TotalCount, int UnreadCount) cached))
            {
                return cached;
            }

            if (activeOnly)
            {
                var rawUnread = await _notificationRepo.GetActiveUnreadNotificationsAsync(userId);
                var groupedAll = NotificationGroupingHelper.AggregateActiveUnread(rawUnread, MapToDto);
                int p = page > 0 ? page : 1;
                int ps = Math.Clamp(pageSize > 0 ? pageSize : 20, 1, 100);
                var paged = groupedAll.Skip((p - 1) * ps).Take(ps).ToList();
                int totalGrouped = groupedAll.Count;
                var groupedResult = (paged, totalGrouped, totalGrouped);
                _cache.Set(key, groupedResult, BuildCacheOptions(userId, TimeSpan.FromMinutes(2)));
                return groupedResult;
            }

            var (items, totalCount, unreadCount) = await _notificationRepo.GetUserNotificationsAsync(userId, page, pageSize, unreadOnly);
            var result = (items.Select(MapToDto).ToList(), totalCount, unreadCount);
            _cache.Set(key, result, BuildCacheOptions(userId, TimeSpan.FromMinutes(2)));
            return result;
        }

        public async Task<(List<NotificationDto> Items, int UnreadCount)> GetUserNotificationHistoryAsync(
            int userId, int limit = 10)
        {
            int clampedLimit = Math.Clamp(limit, 1, 10);
            string key = BuildCacheKey("history", userId, $"{clampedLimit}");

            if (_cache.TryGetValue(key, out (List<NotificationDto> Items, int UnreadCount) cached))
            {
                return cached;
            }

            var (items, unreadCount) = await _notificationRepo.GetLatestNotificationHistoryAsync(userId, clampedLimit);
            var result = (items.Select(MapToDto).ToList(), unreadCount);
            _cache.Set(key, result, BuildCacheOptions(userId, TimeSpan.FromMinutes(2)));
            return result;
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            string key = BuildCacheKey("unread", userId, "cnt");
            if (_cache.TryGetValue(key, out int cachedCount))
            {
                return cachedCount;
            }

            int count = await _notificationRepo.GetUnreadCountAsync(userId);
            _cache.Set(key, count, BuildCacheOptions(userId, TimeSpan.FromMinutes(2)));
            return count;
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            var (updated, groupKey, markedIds) = await _notificationRepo.MarkNotificationOrGroupAsReadAsync(notificationId, userId);
            if (updated)
            {
                InvalidateUserCache(userId);
                try
                {
                    int unreadCount = await _notificationRepo.GetUnreadCountAsync(userId);
                    _cache.Set(BuildCacheKey("unread", userId, "cnt"), unreadCount, BuildCacheOptions(userId, TimeSpan.FromMinutes(2)));
                    await _hubContext.Clients.Group($"User_{userId}").SendAsync("NotificationRead", new
                    {
                        notificationId,
                        notificationIds = markedIds,
                        groupKey,
                        userId,
                        unreadCount,
                        readAt = DateTime.UtcNow
                    });
                }
                catch
                {
                    // Non-blocking SignalR cross-tab sync
                }
            }
            return updated;
        }

        public async Task<bool> MarkGroupAsReadAsync(string groupKey, int userId)
        {
            var (updated, markedIds) = await _notificationRepo.MarkGroupAsReadAsync(groupKey, userId);
            if (updated)
            {
                InvalidateUserCache(userId);
                try
                {
                    int unreadCount = await _notificationRepo.GetUnreadCountAsync(userId);
                    _cache.Set(BuildCacheKey("unread", userId, "cnt"), unreadCount, BuildCacheOptions(userId, TimeSpan.FromMinutes(2)));
                    await _hubContext.Clients.Group($"User_{userId}").SendAsync("NotificationRead", new
                    {
                        notificationId = markedIds.FirstOrDefault(),
                        notificationIds = markedIds,
                        groupKey,
                        userId,
                        unreadCount,
                        readAt = DateTime.UtcNow
                    });
                }
                catch
                {
                    // Non-blocking SignalR cross-tab sync
                }
            }
            return updated;
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            bool updated = await _notificationRepo.MarkAllAsReadAsync(userId);
            if (updated)
            {
                InvalidateUserCache(userId);
                try
                {
                    _cache.Set(BuildCacheKey("unread", userId, "cnt"), 0, BuildCacheOptions(userId, TimeSpan.FromMinutes(2)));
                    await _hubContext.Clients.Group($"User_{userId}").SendAsync("AllNotificationsRead", new
                    {
                        userId,
                        unreadCount = 0,
                        readAt = DateTime.UtcNow
                    });
                }
                catch
                {
                    // Non-blocking SignalR cross-tab sync
                }
            }
            return updated;
        }

        private async Task<NotificationDto> BuildRealtimeGroupedDtoAsync(Notification latestRow)
        {
            string groupKey = !string.IsNullOrWhiteSpace(latestRow.GroupKey)
                ? latestRow.GroupKey
                : NotificationGroupingHelper.ResolveGroupKey(latestRow.Type, latestRow.Title, latestRow.ActionUrl);

            var groupItems = await _notificationRepo.GetActiveUnreadByGroupKeyAsync(latestRow.UserId, groupKey);
            if (!groupItems.Any(x => x.NotificationId == latestRow.NotificationId))
            {
                groupItems.Insert(0, latestRow);
            }

            var dto = NotificationGroupingHelper.BuildGroupedDto(groupKey, groupItems, MapToDto);
            dto.UnreadCount = await _notificationRepo.GetUnreadCountAsync(latestRow.UserId);
            return dto;
        }

        public async Task<NotificationDto> SendToUserAsync(
            int userId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            string groupKey = NotificationGroupingHelper.ResolveGroupKey(type, title, actionUrl);
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                ReferenceId = referenceId,
                ActionUrl = actionUrl,
                GroupKey = groupKey,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _notificationRepo.CreateNotificationAsync(notification);
            InvalidateUserCache(userId);

            var dto = await BuildRealtimeGroupedDtoAsync(created);

            try
            {
                await _hubContext.Clients.Group($"User_{userId}").SendAsync("ReceiveNotification", dto);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to broadcast notification to User_{UserId}", userId);
            }

            return dto;
        }

        public async Task<int> SendToUsersAsync(
            IEnumerable<int> userIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            var distinctIds = userIds.Distinct().ToList();
            if (!distinctIds.Any()) return 0;

            var now = DateTime.UtcNow;
            string groupKey = NotificationGroupingHelper.ResolveGroupKey(type, title, actionUrl);
            var notifications = distinctIds.Select(uid => new Notification
            {
                UserId = uid,
                Title = title,
                Message = message,
                Type = type,
                ReferenceId = referenceId,
                ActionUrl = actionUrl,
                GroupKey = groupKey,
                IsRead = false,
                CreatedAt = now
            }).ToList();

            int count = await _notificationRepo.CreateBatchNotificationsAsync(notifications);

            foreach (var notif in notifications)
            {
                InvalidateUserCache(notif.UserId);
                try
                {
                    var groupedDto = await BuildRealtimeGroupedDtoAsync(notif);
                    await _hubContext.Clients.Group($"User_{notif.UserId}").SendAsync("ReceiveNotification", groupedDto);
                }
                catch { }
            }

            return count;
        }

        private async Task<int?> GetCampusCollegeIdAsync(int campusId)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync();
            }
            return await Dapper.SqlMapper.QueryFirstOrDefaultAsync<int?>(
                conn,
                "SELECT CollegeId FROM Campuses WHERE CampusId = @CampusId;",
                new { CampusId = campusId });
        }

        private async Task<List<int>> ResolveRoleUserIdsAsync(IEnumerable<string> roles, int? campusId)
        {
            var roleList = (roles ?? Enumerable.Empty<string>())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();

            if (!roleList.Any()) return new List<int>();

            bool wantsAdmin = roleList.Any(r => r.Contains("admin"));
            var nonAdminRoles = roleList.Where(r => !r.Contains("admin")).ToList();

            int? targetCollegeId = null;
            if (campusId.HasValue && campusId.Value > 0)
            {
                targetCollegeId = await GetCampusCollegeIdAsync(campusId.Value);
            }

            var activeUsers = await _context.Users.AsNoTracking()
                .Where(u => u.IsActive)
                .Select(u => new
                {
                    u.UserId,
                    u.CollegeId,
                    RoleName = u.Role != null ? u.Role.RoleName : string.Empty,
                    HasAdminId = u.AdminId.HasValue,
                    StaffCampusId = u.Staff != null ? u.Staff.CampusId : null,
                    StudentCampusId = u.Student != null ? u.Student.CampusId : null
                })
                .ToListAsync();

            return activeUsers
                .Where(u =>
                {
                    var rLower = (u.RoleName ?? string.Empty).Trim().ToLowerInvariant();
                    bool roleMatched =
                        (wantsAdmin && (u.HasAdminId || rLower.Contains("admin"))) ||
                        (!string.IsNullOrEmpty(rLower) && nonAdminRoles.Any(rl => rLower == rl || rLower.Contains(rl) || rl.Contains(rLower)));

                    if (!roleMatched) return false;

                    if (campusId.HasValue && campusId.Value > 0)
                    {
                        bool sameCollege = targetCollegeId.HasValue && targetCollegeId.Value > 0
                            ? (u.CollegeId ?? 1) == targetCollegeId.Value
                            : (!u.CollegeId.HasValue || u.CollegeId.Value <= 1);

                        bool campusMatched =
                            u.StaffCampusId == campusId.Value ||
                            u.StudentCampusId == campusId.Value ||
                            (sameCollege && (u.HasAdminId || rLower.Contains("admin") || rLower == "principal"));
                        if (!campusMatched) return false;
                    }
                    else
                    {
                        // Without a campusId, only notify legacy/default college admins to avoid cross-tenant leaks
                        if (u.CollegeId.HasValue && u.CollegeId.Value > 1) return false;
                    }
                    return true;
                })
                .Select(u => u.UserId)
                .Distinct()
                .ToList();
        }

        public async Task<int> SendToRoleAsync(
            string role, int? campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await ResolveRoleUserIdsAsync(new[] { role }, campusId);
                if (userIds.Any())
                {
                    return await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToRoleAsync failed for role {Role}", role);
                return 0;
            }
        }

        public async Task<int> SendToCampusAsync(
            int campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var targetCollegeId = await GetCampusCollegeIdAsync(campusId);
                int resolvedCollege = targetCollegeId.HasValue && targetCollegeId.Value > 0 ? targetCollegeId.Value : 1;

                var query = _context.Users.AsNoTracking()
                    .Include(u => u.Role)
                    .Include(u => u.Staff)
                    .Include(u => u.Student)
                    .Where(u => u.IsActive && (
                        (u.Staff != null && u.Staff.CampusId == campusId) ||
                        (u.Student != null && u.Student.CampusId == campusId) ||
                        ((u.CollegeId ?? 1) == resolvedCollege && (u.AdminId.HasValue || (u.Role != null && u.Role.RoleName.ToLower().Contains("admin"))))));

                var userIds = await query.Select(u => u.UserId).Distinct().ToListAsync();
                if (userIds.Any())
                {
                    return await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToCampusAsync failed for campus #{CampusId}", campusId);
                return 0;
            }
        }

        public async Task<int> SendGlobalAsync(
            string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive)
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    return await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendGlobalAsync failed");
                return 0;
            }
        }

        public async Task<int> SendToRolesAsync(
            IEnumerable<string> roles, int? campusId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var distinctUserIds = await ResolveRoleUserIdsAsync(roles, campusId);
                if (!distinctUserIds.Any()) return 0;
                return await SendToUsersAsync(distinctUserIds, title, message, type, referenceId, actionUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToRolesAsync failed");
                return 0;
            }
        }

        public async Task<int> SendToStaffAsync(
            int staffId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StaffId == staffId)
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    return await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                try
                {
                    var payload = new
                    {
                        title,
                        message,
                        type,
                        referenceId,
                        actionUrl,
                        isRead = false,
                        createdAt = DateTime.UtcNow
                    };
                    await _hubContext.Clients.Group($"Staff_{staffId}").SendAsync("ReceiveNotification", payload);
                }
                catch { }

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStaffAsync failed for StaffId {StaffId}", staffId);
                return 0;
            }
        }

        public async Task<int> SendToStaffListAsync(
            IEnumerable<int> staffIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var distinctStaffIds = staffIds.Distinct().ToList();
                if (!distinctStaffIds.Any()) return 0;

                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StaffId.HasValue && distinctStaffIds.Contains(u.StaffId.Value))
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    return await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStaffListAsync failed");
                return 0;
            }
        }

        public async Task<int> SendToStudentAsync(
            int studentId, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StudentId == studentId)
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStudentAsync failed for StudentId {StudentId}", studentId);
                return 0;
            }
        }

        public async Task<int> SendToStudentsAsync(
            IEnumerable<int> studentIds, string title, string message, string type = "General", int? referenceId = null, string? actionUrl = null)
        {
            try
            {
                var distinct = studentIds.Distinct().ToList();
                if (!distinct.Any()) return 0;

                var userIds = await _context.Users.AsNoTracking()
                    .Where(u => u.IsActive && u.StudentId.HasValue && distinct.Contains(u.StudentId.Value))
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (userIds.Any())
                {
                    await SendToUsersAsync(userIds, title, message, type, referenceId, actionUrl);
                }

                return userIds.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendToStudentsAsync failed");
                return 0;
            }
        }
    }
}
