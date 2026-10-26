using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Repositories.Interfaces;

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
            [FromQuery] string? role,
            [FromQuery] string? fromDate,
            [FromQuery] string? toDate,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? status = null,
            [FromQuery] string? action = null,
            [FromQuery] int? userId = null,
            [FromQuery] string? ipAddress = null,
            [FromQuery] string? deviceId = null,
            [FromQuery] string? requestId = null,
            [FromQuery] string? correlationId = null)
        {
            var result = await _auditLogRepository.GetAuditLogsPagedAsync(
                query,
                module,
                severity,
                role,
                fromDate,
                toDate,
                pageNumber,
                pageSize,
                status,
                action,
                userId,
                ipAddress,
                deviceId,
                requestId,
                correlationId);

            return Ok(result);
        }

        [HttpGet("related/{correlationId}")]
        public async Task<IActionResult> GetRelatedAuditLogs([FromRoute] string correlationId)
        {
            if (string.IsNullOrWhiteSpace(correlationId))
                return BadRequest(new { message = "Correlation ID is required." });

            var related = await _auditLogRepository.GetRelatedAuditLogsAsync(correlationId);
            return Ok(new { success = true, records = related });
        }
    }
}
