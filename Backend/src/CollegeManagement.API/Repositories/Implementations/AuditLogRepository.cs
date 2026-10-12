using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
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

        public async Task<AuditLogPagedResultDto> GetAuditLogsPagedAsync(string? query, string? module, string? severity, string? fromDate, string? toDate, int pageNumber = 1, int pageSize = 50)
        {
            var dbQuery = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.ToLower();
                dbQuery = dbQuery.Where(x => 
                    (x.UserName != null && x.UserName.ToLower().Contains(q)) || 
                    x.Action.ToLower().Contains(q) || 
                    x.EntityName.ToLower().Contains(q) || 
                    (x.Module != null && x.Module.ToLower().Contains(q)) ||
                    (x.Description != null && x.Description.ToLower().Contains(q)));
            }

            if (!string.IsNullOrWhiteSpace(module) && module != "All modules")
                dbQuery = dbQuery.Where(x => x.Module == module);

            if (!string.IsNullOrWhiteSpace(severity) && severity != "All severity")
                dbQuery = dbQuery.Where(x => x.Severity == severity);

            if (DateTime.TryParse(fromDate, out var fromDt))
                dbQuery = dbQuery.Where(x => x.CreatedAt >= fromDt.Date);

            if (DateTime.TryParse(toDate, out var toDt))
            {
                toDt = toDt.Date.AddDays(1).AddTicks(-1);
                dbQuery = dbQuery.Where(x => x.CreatedAt <= toDt);
            }

            var totalCount = await dbQuery.CountAsync();
            var today = DateTime.UtcNow.Date;

            var statsQuery = _context.AuditLogs.AsNoTracking().Where(x => x.CreatedAt >= today);
            
            var stats = new AuditLogStatsDto
            {
                EventsToday = await statsQuery.CountAsync(),
                SecurityAlerts = await statsQuery.CountAsync(x => x.Severity != "Info"),
                ActiveAdministrators = await statsQuery.Where(x => x.ActorRole == "Administrator" || x.ActorRole == "Admin").Select(x => x.UserName).Distinct().CountAsync()
            };

            var distinctModules = await _context.AuditLogs.AsNoTracking().Where(x => x.Module != null).Select(x => x.Module!).Distinct().ToListAsync();

            var records = await dbQuery
                .OrderByDescending(x => x.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AuditLogDto
                {
                    AuditLogId = a.AuditLogId,
                    Actor = a.UserName ?? "System",
                    Role = a.ActorRole,
                    Action = a.Action,
                    Module = a.Module ?? a.EntityName,
                    Target = a.EntityName + (a.EntityId.HasValue ? " - " + a.EntityId.Value : ""),
                    Severity = a.Severity ?? "Info",
                    Status = a.Status ?? "Success",
                    Ip = a.IpAddress,
                    Device = a.UserAgent,
                    Details = a.Description,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return new AuditLogPagedResultDto
            {
                Success = true,
                Total = totalCount,
                Stats = stats,
                Modules = distinctModules,
                Records = records
            };
        }
    }
}
