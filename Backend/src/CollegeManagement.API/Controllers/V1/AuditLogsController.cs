using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v{version:apiVersion}/audit-logs")]
    [Route("api/v{version:apiVersion}/settings/audit-logs")]
    [Authorize]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogRepository _auditLogRepository;

        public AuditLogsController(IAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] string? query, 
            [FromQuery] string? module, 
            [FromQuery] string? severity, 
            [FromQuery] string? fromDate, 
            [FromQuery] string? toDate, 
            [FromQuery] int pageNumber = 1, 
            [FromQuery] int pageSize = 50)
        {
            var result = await _auditLogRepository.GetAuditLogsPagedAsync(query, module, severity, fromDate, toDate, pageNumber, pageSize);
            return Ok(result);
        }
    }
}
