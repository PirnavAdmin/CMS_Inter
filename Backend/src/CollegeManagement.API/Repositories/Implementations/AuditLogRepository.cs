using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
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
    }
}
