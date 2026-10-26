using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Helpers;

namespace CollegeManagement.API.Services.Implementations
{
    public class AuditLoggingService : IAuditLoggingService
    {
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly ILogger<AuditLoggingService> _logger;

        public AuditLoggingService(
            IAuditLogRepository auditLogRepository, 
            IHttpContextAccessor httpContextAccessor,
            IJwtTokenHelper jwtTokenHelper,
            ILogger<AuditLoggingService> logger)
        {
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
            _jwtTokenHelper = jwtTokenHelper;
            _logger = logger;
        }

        public async Task LogAsync(string action, string module, string target, string severity = "Info", string status = "Success", string? details = null, string? overrideUser = null, string? overrideRole = null)
        {
            try
            {
                var context = _httpContextAccessor.HttpContext;
                var user = context?.User;

                string? userName = null;
                string? role = null;
                int? userId = null;
                int? staffId = null;

                if (user != null && user.Identity?.IsAuthenticated == true)
                {
                    userName = user.FindFirst(ClaimTypes.Name)?.Value 
                               ?? user.FindFirst(ClaimTypes.Email)?.Value 
                               ?? "Authenticated User";
                    
                    var roles = user.FindAll(ClaimTypes.Role);
                    role = string.Join(", ", roles.Select(r => r.Value));

                    userId = _jwtTokenHelper.GetUserId(user);
                    try { staffId = _jwtTokenHelper.GetStaffId(user); } catch { /* Ignore */ }
                }

                var net = ClientIpHelper.GetNetworkDetails(context);
                var correlationId = AuditCorrelationHelper.GetOrCreateCorrelationId(context);
                var requestId = AuditCorrelationHelper.GetRequestId(context);

                // Sanitize any sensitive data from details
                string? sanitizedDetails = details != null ? AuditDataSanitizer.SanitizeJsonString(details) : null;

                var auditLog = new AuditLog
                {
                    EventId = Guid.NewGuid().ToString("N"),
                    CorrelationId = correlationId,
                    RequestId = requestId,
                    UserName = overrideUser ?? userName ?? "System",
                    ActorRole = overrideRole ?? role,
                    ActorType = (userId.HasValue || !string.IsNullOrEmpty(overrideUser)) ? "User" : "System",
                    Action = action,
                    EntityName = target,
                    Module = module,
                    Severity = severity,
                    Status = status,
                    IpAddress = net.EffectiveIpAddress,
                    RemoteIpAddress = net.RemoteIpAddress,
                    ForwardedClientIp = net.ForwardedClientIp,
                    IpSource = net.IpSource,
                    IpConfidence = net.IpConfidence,
                    UserAgent = net.UserAgent,
                    DeviceId = net.DeviceId,
                    RequestMethod = context?.Request?.Method,
                    RouteTemplate = context?.Request?.Path.Value,
                    UserId = userId,
                    StaffId = staffId,
                    Description = sanitizedDetails,
                    CreatedAt = DateTime.UtcNow
                };

                await _auditLogRepository.InsertAsync(auditLog);
            }
            catch (Exception ex)
            {
                // Never crash business transactions, but make audit failure observable in structured logs
                _logger.LogError(ex, "Failed to persist explicit audit log event: Action '{Action}' on Module '{Module}' / Target '{Target}'.", action, module, target);
            }
        }
    }
}
