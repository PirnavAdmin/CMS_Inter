using System;
using System.Diagnostics;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Middleware
{
    public class AuditRequestMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuditRequestMiddleware> _logger;

        public AuditRequestMiddleware(RequestDelegate next, ILogger<AuditRequestMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IAuditLogRepository auditLogRepository, IJwtTokenHelper jwtTokenHelper)
        {
            // Establish correlation ID on request and attach to response header
            var correlationId = AuditCorrelationHelper.GetOrCreateCorrelationId(context);
            context.Response.Headers[AuditCorrelationHelper.CorrelationIdHeader] = correlationId;

            var path = context.Request.Path.Value ?? string.Empty;

            // Exclude static assets, swagger, and health check routes
            if (IsIgnoredRoute(path))
            {
                await _next(context);
                return;
            }

            var stopwatch = Stopwatch.StartNew();

            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                var statusCode = context.Response.StatusCode;

                // Log security failures (401 Unauthorized, 403 Forbidden) and server errors (500)
                if (statusCode == StatusCodes.Status401Unauthorized || 
                    statusCode == StatusCodes.Status403Forbidden || 
                    statusCode >= 500)
                {
                    try
                    {
                        var user = context.User;
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
                            userId = jwtTokenHelper.GetUserId(user);
                            try { staffId = jwtTokenHelper.GetStaffId(user); } catch { /* Ignore */ }
                        }

                        var net = ClientIpHelper.GetNetworkDetails(context);
                        var method = context.Request.Method;
                        var severity = statusCode >= 500 ? "Critical" : "Warning";
                        var status = statusCode == StatusCodes.Status401Unauthorized ? "Unauthorized" :
                                     statusCode == StatusCodes.Status403Forbidden ? "Forbidden" : "ServerError";

                        var action = statusCode == StatusCodes.Status401Unauthorized ? "Unauthorized API Access Attempt" :
                                     statusCode == StatusCodes.Status403Forbidden ? "Forbidden API Access Attempt" : "API Server Fault";

                        var log = new AuditLog
                        {
                            EventId = Guid.NewGuid().ToString("N"),
                            CorrelationId = correlationId,
                            RequestId = context.TraceIdentifier,
                            UserName = userName ?? "Anonymous",
                            ActorRole = role,
                            ActorType = userId.HasValue ? "User" : "System",
                            Action = action,
                            EntityName = path,
                            Module = ResolveModuleFromPath(path),
                            Severity = severity,
                            Status = status,
                            IpAddress = net.EffectiveIpAddress,
                            RemoteIpAddress = net.RemoteIpAddress,
                            ForwardedClientIp = net.ForwardedClientIp,
                            IpSource = net.IpSource,
                            IpConfidence = net.IpConfidence,
                            UserAgent = net.UserAgent,
                            DeviceId = net.DeviceId,
                            RequestMethod = method,
                            RouteTemplate = path,
                            HttpStatusCode = statusCode,
                            DurationMs = stopwatch.Elapsed.TotalMilliseconds,
                            UserId = userId,
                            StaffId = staffId,
                            Description = $"{method} {path} resulted in HTTP {statusCode} after {stopwatch.ElapsedMilliseconds}ms.",
                            CreatedAt = DateTime.UtcNow
                        };

                        await auditLogRepository.InsertAsync(log);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to record HTTP security event audit log for {Path}", path);
                    }
                }
            }
        }

        private static bool IsIgnoredRoute(string path)
        {
            if (string.IsNullOrEmpty(path)) return true;
            if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/health", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/static/", StringComparison.OrdinalIgnoreCase) ||
                path.EndsWith(".ico", StringComparison.OrdinalIgnoreCase) ||
                path.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                path.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                path.EndsWith(".css", StringComparison.OrdinalIgnoreCase) ||
                path.EndsWith(".js", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
            return false;
        }

        private static string ResolveModuleFromPath(string path)
        {
            var p = path.ToLowerInvariant();
            if (p.Contains("auth") || p.Contains("login")) return "Authentication";
            if (p.Contains("roles") || p.Contains("permissions")) return "Roles & Permissions";
            if (p.Contains("attendance")) return "Attendance";
            if (p.Contains("student") || p.Contains("admission")) return "Administration";
            if (p.Contains("staff")) return "Staff Management";
            if (p.Contains("fee") || p.Contains("payment")) return "Finance";
            if (p.Contains("exam") || p.Contains("result")) return "Examinations";
            if (p.Contains("transport")) return "Transport";
            if (p.Contains("hostel")) return "Hostel Management";
            if (p.Contains("settings")) return "Settings";
            return "API Gateway";
        }
    }
}
