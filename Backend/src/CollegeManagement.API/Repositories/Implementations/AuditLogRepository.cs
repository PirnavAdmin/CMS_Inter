using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
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

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task InsertAsync(AuditLog auditLog, IDbTransaction? transaction = null)
        {
            if (auditLog == null) return;

            var conn = transaction?.Connection ?? await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_EventId", auditLog.EventId);
            parameters.Add("p_CorrelationId", auditLog.CorrelationId);
            parameters.Add("p_RequestId", auditLog.RequestId);
            parameters.Add("p_UserId", auditLog.UserId);
            parameters.Add("p_UserName", auditLog.UserName);
            parameters.Add("p_ActorRole", auditLog.ActorRole);
            parameters.Add("p_ActorType", auditLog.ActorType ?? "User");
            parameters.Add("p_StaffId", auditLog.StaffId);
            parameters.Add("p_Action", auditLog.Action ?? string.Empty);
            parameters.Add("p_EntityName", auditLog.EntityName ?? string.Empty);
            parameters.Add("p_EntityId", auditLog.EntityId);
            parameters.Add("p_Module", auditLog.Module);
            parameters.Add("p_Description", auditLog.Description);
            parameters.Add("p_Severity", auditLog.Severity ?? "Info");
            parameters.Add("p_Status", auditLog.Status ?? "Success");
            parameters.Add("p_IpAddress", auditLog.IpAddress);
            parameters.Add("p_RemoteIpAddress", auditLog.RemoteIpAddress);
            parameters.Add("p_ForwardedClientIp", auditLog.ForwardedClientIp);
            parameters.Add("p_IpSource", auditLog.IpSource ?? "Unknown");
            parameters.Add("p_IpConfidence", auditLog.IpConfidence ?? "Unknown");
            parameters.Add("p_UserAgent", auditLog.UserAgent);
            parameters.Add("p_DeviceId", auditLog.DeviceId);
            parameters.Add("p_SessionId", auditLog.SessionId);
            parameters.Add("p_RequestMethod", auditLog.RequestMethod);
            parameters.Add("p_RouteTemplate", auditLog.RouteTemplate);
            parameters.Add("p_HttpStatusCode", auditLog.HttpStatusCode);
            parameters.Add("p_DurationMs", auditLog.DurationMs);

            var id = await conn.ExecuteScalarAsync<long>(
                "sp_InsertAuditLog",
                parameters,
                transaction: transaction,
                commandType: CommandType.StoredProcedure);

            auditLog.AuditLogId = id;
        }

        public async Task<(IEnumerable<AuditLog> auditLogs, int totalCount)> GetHistoryAsync(int entityId, string entityName, int pageNumber, int pageSize)
        {
            var paged = await GetAuditLogsPagedAsync(
                query: entityName,
                module: null,
                severity: null,
                role: null,
                fromDate: null,
                toDate: null,
                pageNumber: pageNumber,
                pageSize: pageSize);

            var matchedLogs = paged.Records.Select(r => new AuditLog
            {
                AuditLogId = r.AuditLogId,
                EventId = r.EventId,
                CorrelationId = r.CorrelationId,
                RequestId = r.RequestId,
                UserName = r.Actor,
                Action = r.Action,
                EntityName = entityName,
                EntityId = entityId,
                Module = r.Module,
                Severity = r.Severity,
                Status = r.Status,
                ActorRole = r.Role,
                IpAddress = r.Ip,
                CreatedAt = r.CreatedAt
            }).ToList();

            return (matchedLogs, paged.Total);
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
            var conn = await GetOpenConnectionAsync();

            DateTime? parsedFrom = null;
            if (DateTime.TryParse(fromDate, out var fDt)) parsedFrom = fDt.Date;

            DateTime? parsedTo = null;
            if (DateTime.TryParse(toDate, out var tDt)) parsedTo = tDt.Date.AddDays(1).AddTicks(-1);

            var pagedParams = new DynamicParameters();
            pagedParams.Add("p_Query", string.IsNullOrWhiteSpace(query) ? null : query.Trim());
            pagedParams.Add("p_Module", string.IsNullOrWhiteSpace(module) ? null : module.Trim());
            pagedParams.Add("p_Severity", string.IsNullOrWhiteSpace(severity) ? null : severity.Trim());
            pagedParams.Add("p_Role", string.IsNullOrWhiteSpace(role) ? null : role.Trim());
            pagedParams.Add("p_FromDate", parsedFrom);
            pagedParams.Add("p_ToDate", parsedTo);
            pagedParams.Add("p_Status", string.IsNullOrWhiteSpace(status) ? null : status.Trim());
            pagedParams.Add("p_Action", string.IsNullOrWhiteSpace(action) ? null : action.Trim());
            pagedParams.Add("p_UserId", userId);
            pagedParams.Add("p_IpAddress", string.IsNullOrWhiteSpace(ipAddress) ? null : ipAddress.Trim());
            pagedParams.Add("p_DeviceId", string.IsNullOrWhiteSpace(deviceId) ? null : deviceId.Trim());
            pagedParams.Add("p_RequestId", string.IsNullOrWhiteSpace(requestId) ? null : requestId.Trim());
            pagedParams.Add("p_CorrelationId", string.IsNullOrWhiteSpace(correlationId) ? null : correlationId.Trim());
            pagedParams.Add("p_PageNumber", pageNumber < 1 ? 1 : pageNumber);
            pagedParams.Add("p_PageSize", pageSize < 1 ? 50 : pageSize);

            int totalCount = 0;
            List<AuditLog> entities = new List<AuditLog>();

            using (var multi = await conn.QueryMultipleAsync("sp_GetAuditLogsPaged", pagedParams, commandType: CommandType.StoredProcedure))
            {
                totalCount = await multi.ReadFirstOrDefaultAsync<int>();
                var rawEntities = await multi.ReadAsync<AuditLog>();
                entities = rawEntities.ToList();
            }

            // Fetch lightweight aggregates via SP
            var stats = new AuditLogStatsDto();
            var distinctModules = new List<string>();

            using (var statsMulti = await conn.QueryMultipleAsync("sp_GetAuditLogStatsToday", commandType: CommandType.StoredProcedure))
            {
                var summary = await statsMulti.ReadFirstOrDefaultAsync<dynamic>();
                if (summary != null)
                {
                    stats.EventsToday = (int)summary.EventsToday;
                    stats.FailedOperationsToday = (int)summary.FailedOperationsToday;
                    stats.SecurityAlertsToday = (int)summary.SecurityAlertsToday;
                    stats.SecurityAlerts = (int)summary.SecurityAlertsToday;
                    stats.ActiveUsersToday = (int)summary.ActiveUsersToday;
                    stats.RegisteredDevicesToday = (int)summary.RegisteredDevicesToday;
                    stats.DistinctPublicIpsToday = (int)summary.DistinctPublicIpsToday;
                }

                var admins = (await statsMulti.ReadAsync<dynamic>()).Select(a => new ActiveAdminInfoDto
                {
                    UserName = (string)a.UserName,
                    Role = (string)a.Role,
                    ActionCount = (int)a.ActionCount,
                    LastActive = (DateTime)a.LastActive,
                    LastIp = (string?)a.LastIp,
                    LastAction = (string?)a.LastAction
                }).ToList();

                stats.Administrators = admins;
                stats.ActiveAdministrators = admins.Count;

                var mods = await statsMulti.ReadAsync<string>();
                distinctModules = mods.Where(m => !string.IsNullOrWhiteSpace(m)).ToList();
            }

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

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CorrelationId", correlationId.Trim());

            var entities = await conn.QueryAsync<AuditLog>(
                "sp_GetRelatedAuditLogs",
                parameters,
                commandType: CommandType.StoredProcedure);

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
