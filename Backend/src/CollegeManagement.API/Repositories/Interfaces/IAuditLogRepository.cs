using CollegeManagement.API.Models.Reports;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAuditLogRepository
    {
        Task InsertAsync(AuditLog auditLog, IDbTransaction? transaction = null);
        Task<(IEnumerable<AuditLog> auditLogs, int totalCount)> GetHistoryAsync(int entityId, string entityName, int pageNumber, int pageSize);
    }
}
