using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models.Reports;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAuditLogRepository
    {
        Task InsertAsync(AuditLog auditLog, IDbTransaction? transaction = null);
        Task<(IEnumerable<AuditLog> auditLogs, int totalCount)> GetHistoryAsync(int entityId, string entityName, int pageNumber, int pageSize);
        Task<AuditLogPagedResultDto> GetAuditLogsPagedAsync(
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
            string? correlationId = null);
        Task<IEnumerable<AuditLogDto>> GetRelatedAuditLogsAsync(string correlationId);
    }
}
