using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly AppDbContext _context;

        public AuditLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task InsertAsync(AuditLog auditLog, IDbTransaction? transaction = null)
        {
            await _context.AuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();
        }

        public async Task<(IEnumerable<AuditLog> auditLogs, int totalCount)> GetHistoryAsync(int entityId, string entityName, int pageNumber, int pageSize)
        {
            int offset = (pageNumber - 1) * pageSize;
            if (offset < 0) offset = 0;
            if (pageSize <= 0) pageSize = 10;

            var query = _context.AuditLogs
                .AsNoTracking()
                .Where(x => x.EntityId == entityId && x.EntityName == entityName);

            int totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip(offset)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<AuditLogPagedResultDto> GetAuditLogsPagedAsync(
            string? query,
            string? module,
            string? severity,
            string? role,
            string? fromDate,
            string? toDate,
            int pageNumber = 1,
            int pageSize = 50,
            string? status = null,
            string? action = null,
            int? userId = null,
            string? ipAddress = null,
            string? deviceId = null,
            string? requestId = null,
            string? correlationId = null)
        {
            var dbQuery = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.ToLower();
                dbQuery = dbQuery.Where(x =>
                    (x.UserName != null && x.UserName.ToLower().Contains(q)) ||
                    (x.ActorRole != null && x.ActorRole.ToLower().Contains(q)) ||
                    x.Action.ToLower().Contains(q) ||
                    x.EntityName.ToLower().Contains(q) ||
                    (x.Module != null && x.Module.ToLower().Contains(q)) ||
                    (x.CorrelationId != null && x.CorrelationId.ToLower().Contains(q)) ||
                    (x.RequestId != null && x.RequestId.ToLower().Contains(q)) ||
                    (x.Description != null && x.Description.ToLower().Contains(q)));
            }

            if (!string.IsNullOrWhiteSpace(module) && module != "All modules")
                dbQuery = dbQuery.Where(x => x.Module == module);

            if (!string.IsNullOrWhiteSpace(severity) && severity != "All severity")
            {
                if (severity.Equals("Security alerts", StringComparison.OrdinalIgnoreCase) ||
                    severity.Equals("Security alert", StringComparison.OrdinalIgnoreCase) ||
                    severity.Equals("Alerts", StringComparison.OrdinalIgnoreCase) ||
                    severity.Equals("Security", StringComparison.OrdinalIgnoreCase))
                {
                    dbQuery = dbQuery.Where(x => x.Severity != null && x.Severity != "Info");
                }
                else
                {
                    dbQuery = dbQuery.Where(x => x.Severity == severity);
                }
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "All status")
            {
                dbQuery = dbQuery.Where(x => x.Status == status);
            }

            if (!string.IsNullOrWhiteSpace(action) && action != "All actions")
            {
                dbQuery = dbQuery.Where(x => x.Action == action);
            }

            if (userId.HasValue && userId.Value > 0)
            {
                dbQuery = dbQuery.Where(x => x.UserId == userId.Value);
            }

            if (!string.IsNullOrWhiteSpace(ipAddress))
            {
                dbQuery = dbQuery.Where(x =>
                    (x.IpAddress != null && x.IpAddress.Contains(ipAddress)) ||
                    (x.RemoteIpAddress != null && x.RemoteIpAddress.Contains(ipAddress)) ||
                    (x.ForwardedClientIp != null && x.ForwardedClientIp.Contains(ipAddress)));
            }

            if (!string.IsNullOrWhiteSpace(deviceId))
            {
                dbQuery = dbQuery.Where(x => x.DeviceId != null && x.DeviceId.Contains(deviceId));
            }

            if (!string.IsNullOrWhiteSpace(requestId))
            {
                dbQuery = dbQuery.Where(x => x.RequestId != null && x.RequestId == requestId);
            }

            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                dbQuery = dbQuery.Where(x => x.CorrelationId != null && x.CorrelationId == correlationId);
            }

            if (!string.IsNullOrWhiteSpace(role) && role != "All roles")
            {
                if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase) ||
                    role.Equals("Administrator", StringComparison.OrdinalIgnoreCase) ||
                    role.Equals("Active administrators", StringComparison.OrdinalIgnoreCase))
                {
                    dbQuery = dbQuery.Where(x => x.ActorRole == "Administrator" || x.ActorRole == "Admin" || (x.UserName != null && x.UserName.ToLower().Contains("admin")));
                }
                else
                {
                    dbQuery = dbQuery.Where(x => x.ActorRole != null && x.ActorRole.ToLower() == role.ToLower());
                }
            }

            if (DateTime.TryParse(fromDate, out var fromDt))
                dbQuery = dbQuery.Where(x => x.CreatedAt >= fromDt.Date);

            if (DateTime.TryParse(toDate, out var toDt))
            {
                toDt = toDt.Date.AddDays(1).AddTicks(-1);
                dbQuery = dbQuery.Where(x => x.CreatedAt <= toDt);
            }

            var totalCount = await dbQuery.CountAsync();
            var today = DateTime.UtcNow.Date;

            // Fetch today's lightweight stats
            var statsQuery = _context.AuditLogs.AsNoTracking().Where(x => x.CreatedAt >= today);

            var todayLogs = await statsQuery.Select(x => new
            {
                x.Severity,
                x.Status,
                x.UserId,
                x.ActorType,
                x.DeviceId,
                x.IpAddress,
                x.RemoteIpAddress,
                x.UserName,
                x.ActorRole,
                x.CreatedAt,
                x.Action
            }).ToListAsync();

            var eventsToday = todayLogs.Count;
            var failedOpsToday = todayLogs.Count(x =>
                x.Status.Equals("Failed", StringComparison.OrdinalIgnoreCase) ||
                x.Status.Equals("Forbidden", StringComparison.OrdinalIgnoreCase) ||
                x.Status.Equals("Unauthorized", StringComparison.OrdinalIgnoreCase) ||
                x.Status.Equals("ServerError", StringComparison.OrdinalIgnoreCase));

            var securityAlertsToday = todayLogs.Count(x => !string.IsNullOrEmpty(x.Severity) && !x.Severity.Equals("Info", StringComparison.OrdinalIgnoreCase));

            var activeUsersToday = todayLogs
                .Where(x => x.UserId.HasValue && x.UserId.Value > 0)
                .Select(x => x.UserId!.Value)
                .Distinct()
                .Count();

            var registeredDevicesToday = todayLogs
                .Where(x => !string.IsNullOrWhiteSpace(x.DeviceId) && !x.DeviceId.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
                .Select(x => x.DeviceId!)
                .Distinct()
                .Count();

            var distinctPublicIpsToday = todayLogs
                .Select(x => x.IpAddress ?? x.RemoteIpAddress)
                .Where(ip => !string.IsNullOrWhiteSpace(ip) && IPAddress.TryParse(ip, out var parsed) && !ClientIpHelper.IsPrivateOrLoopback(parsed))
                .Distinct()
                .Count();

            var adminLogs = todayLogs
                .Where(x => x.ActorRole == "Administrator" || x.ActorRole == "Admin" || (x.UserName != null && x.UserName.ToLower().Contains("admin")))
                .ToList();

            var activeAdmins = adminLogs
                .GroupBy(x => x.UserName ?? "Administrator")
                .Select(g => new ActiveAdminInfoDto
                {
                    UserName = g.Key,
                    Role = g.Select(x => x.ActorRole).FirstOrDefault(r => !string.IsNullOrEmpty(r)) ?? "Administrator",
                    ActionCount = g.Count(),
                    LastActive = g.Max(x => x.CreatedAt),
                    LastIp = g.OrderByDescending(x => x.CreatedAt).Select(x => x.IpAddress).FirstOrDefault(),
                    LastAction = g.OrderByDescending(x => x.CreatedAt).Select(x => x.Action).FirstOrDefault()
                })
                .OrderByDescending(x => x.LastActive)
                .ToList();

            var stats = new AuditLogStatsDto
            {
                EventsToday = eventsToday,
                FailedOperationsToday = failedOpsToday,
                SecurityAlertsToday = securityAlertsToday,
                SecurityAlerts = securityAlertsToday, // Backward compatibility
                ActiveUsersToday = activeUsersToday,
                RegisteredDevicesToday = registeredDevicesToday,
                DistinctPublicIpsToday = distinctPublicIpsToday,
                ActiveAdministrators = activeAdmins.Count,
                Administrators = activeAdmins
            };

            var distinctModules = await _context.AuditLogs.AsNoTracking().Where(x => x.Module != null).Select(x => x.Module!).Distinct().ToListAsync();

            if (pageNumber <= 0) pageNumber = 1;
            if (pageSize <= 0) pageSize = 50;

            var entities = await dbQuery
                .OrderByDescending(x => x.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var records = entities.Select(MapToDto).ToList();

            return new AuditLogPagedResultDto
            {
                Success = true,
                Total = totalCount,
                Stats = stats,
                Modules = distinctModules,
                Records = records
            };
        }

        public async Task<IEnumerable<AuditLogDto>> GetRelatedAuditLogsAsync(string correlationId)
        {
            if (string.IsNullOrWhiteSpace(correlationId))
                return Enumerable.Empty<AuditLogDto>();

            var entities = await _context.AuditLogs
                .AsNoTracking()
                .Where(x => x.CorrelationId == correlationId)
                .OrderBy(x => x.CreatedAt)
                .Take(50)
                .ToListAsync();

            return entities.Select(MapToDto).ToList();
        }

        private static AuditLogDto MapToDto(AuditLog a)
        {
            string? details = a.Description;
            List<AuditFieldChangeDto>? changes = null;
            Dictionary<string, object?>? userInput = null;

            if (!string.IsNullOrWhiteSpace(a.Description) && a.Description.TrimStart().StartsWith("{"))
            {
                try
                {
                    using var doc = JsonDocument.Parse(a.Description);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("summary", out var summaryProp))
                    {
                        details = summaryProp.GetString();
                    }

                    if (root.TryGetProperty("changes", out var changesProp) && changesProp.ValueKind == JsonValueKind.Array)
                    {
                        changes = new List<AuditFieldChangeDto>();
                        foreach (var item in changesProp.EnumerateArray())
                        {
                            changes.Add(new AuditFieldChangeDto
                            {
                                Field = item.TryGetProperty("field", out var f) ? f.GetString() ?? "" : "",
                                OldValue = item.TryGetProperty("old", out var o) ? o.ToString() : null,
                                NewValue = item.TryGetProperty("new", out var n) ? n.ToString() : null
                            });
                        }
                    }

                    if (root.TryGetProperty("userInput", out var inputProp) && inputProp.ValueKind == JsonValueKind.Object)
                    {
                        userInput = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                        foreach (var prop in inputProp.EnumerateObject())
                        {
                            userInput[prop.Name] = prop.Value.ToString();
                        }
                    }
                }
                catch
                {
                    // Fallback to raw description if parsing encounters errors
                }
            }

            return new AuditLogDto
            {
                AuditLogId = a.AuditLogId,
                EventId = a.EventId,
                CorrelationId = a.CorrelationId,
                RequestId = a.RequestId,
                Actor = a.UserName ?? "System",
                Role = a.ActorRole,
                ActorType = a.ActorType,
                UserId = a.UserId,
                StaffId = a.StaffId,
                Action = a.Action,
                Module = a.Module ?? a.EntityName,
                Target = a.EntityName + (a.EntityId.HasValue ? " - " + a.EntityId.Value : ""),
                Severity = a.Severity ?? "Info",
                Status = a.Status ?? "Success",
                Ip = a.IpAddress,
                RemoteIpAddress = a.RemoteIpAddress,
                ForwardedClientIp = a.ForwardedClientIp,
                IpSource = a.IpSource,
                IpConfidence = a.IpConfidence,
                Device = a.UserAgent,
                DeviceId = a.DeviceId,
                SessionId = a.SessionId,
                RequestMethod = a.RequestMethod,
                RouteTemplate = a.RouteTemplate,
                HttpStatusCode = a.HttpStatusCode,
                DurationMs = a.DurationMs,
                Details = details,
                Changes = changes,
                UserInput = userInput,
                RawPayload = a.Description,
                CreatedAt = a.CreatedAt
            };
        }
    }
}
