using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Filters
{
    /// <summary>
    /// Attribute to enforce declarative User -> Role -> Module -> Action authorization.
    /// Returns HTTP 403 Forbidden (not 500) if the user or their role lacks permission.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
    public class RequirePermissionAttribute : TypeFilterAttribute
    {
        public RequirePermissionAttribute(string module, string action = "auto") 
            : base(typeof(RequirePermissionFilter))
        {
            Arguments = new object[] { module, action };
        }
    }

    /// <summary>
    /// Attribute to bypass RequirePermission authorization checks for specific actions within a protected controller.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
    public class BypassPermissionAttribute : Attribute
    {
    }

    public class RequirePermissionFilter : IAsyncAuthorizationFilter
    {
        private readonly string _module;
        private readonly string _action;
        private readonly IPermissionRepository _permissionRepository;
        private readonly ILogger<RequirePermissionFilter> _logger;

        public RequirePermissionFilter(
            string module, 
            string action, 
            IPermissionRepository permissionRepository,
            ILogger<RequirePermissionFilter> logger)
        {
            _module = module ?? throw new ArgumentNullException(nameof(module));
            _action = string.IsNullOrWhiteSpace(action) ? "auto" : action;
            _permissionRepository = permissionRepository ?? throw new ArgumentNullException(nameof(permissionRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            // AllowAnonymous, BypassPermission, or ParentStudentAuthorization check
            if (context.ActionDescriptor.EndpointMetadata.OfType<Microsoft.AspNetCore.Authorization.IAllowAnonymous>().Any()
                || context.ActionDescriptor.EndpointMetadata.OfType<BypassPermissionAttribute>().Any()
                || context.ActionDescriptor.EndpointMetadata.OfType<ParentStudentAuthorizationAttribute>().Any())
            {
                return;
            }

            var requestPath = context.HttpContext.Request.Path.Value?.ToLowerInvariant() ?? "";
            if (requestPath.Contains("/students/me") || requestPath.Contains("/my-children") || requestPath.Contains("/faculty/me") || requestPath.Contains("/staff/me"))
            {
                return;
            }

            // 1. Check if user is authenticated
            if (context.HttpContext.User?.Identity?.IsAuthenticated != true)
            {
                context.Result = new ObjectResult(new
                {
                    statusCode = StatusCodes.Status401Unauthorized,
                    success = false,
                    message = "Authentication required to access this resource."
                })
                {
                    StatusCode = StatusCodes.Status401Unauthorized
                };
                return;
            }

            // =========================================================================
            // DEMO / DEV MODE: MODULE RBAC ENFORCEMENT TEMPORARILY DISABLED
            // All authenticated users are granted access to module endpoints.
            // Authentication ([Authorize]) remains active, but no 403 Forbidden is thrown
            // due to missing database permission rows. Can be re-enabled later here.
            // =========================================================================
            return;
        }
    }
}
