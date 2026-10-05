using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
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

        public AuditLoggingService(
            IAuditLogRepository auditLogRepository, 
            IHttpContextAccessor httpContextAccessor,
            IJwtTokenHelper jwtTokenHelper)
        {
            _auditLogRepository = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
            _jwtTokenHelper = jwtTokenHelper;
        }

        public async Task LogAsync(string action, string module, string target, string severity = "Info", string status = "Success", string? details = null)
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

                var ipAddress = context?.Connection?.RemoteIpAddress?.ToString();
                var userAgent = context?.Request?.Headers["User-Agent"].ToString();

                var auditLog = new AuditLog
                {
                    UserName = userName ?? "System",
                    ActorRole = role,
                    Action = action,
                    EntityName = target, // Using EntityName column for target
                    Module = module,
                    Severity = severity,
                    Status = status,
                    IpAddress = ipAddress,
                    UserAgent = userAgent?.Length > 500 ? userAgent.Substring(0, 500) : userAgent,
                    UserId = userId,
                    StaffId = staffId,
                    Description = details,
                    CreatedAt = DateTime.UtcNow
                };

                await _auditLogRepository.InsertAsync(auditLog);
            }
            catch
            {
                // Never fail a business transaction because audit logging failed
            }
        }
    }
}
