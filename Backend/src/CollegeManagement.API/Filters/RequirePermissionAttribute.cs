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
            // AllowAnonymous or BypassPermission check
            if (context.ActionDescriptor.EndpointMetadata.OfType<Microsoft.AspNetCore.Authorization.IAllowAnonymous>().Any()
                || context.ActionDescriptor.EndpointMetadata.OfType<BypassPermissionAttribute>().Any())
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

            // 2. Unrestricted bypass for platform Super Admin and Admin
            if (context.HttpContext.User.IsInRole("Super Admin") || context.HttpContext.User.IsInRole("Admin"))
            {
                return;
            }

            // 3. Extract User ID
            var userIdClaim = context.HttpContext.User.FindFirst("UserId")
                           ?? context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)
                           ?? context.HttpContext.User.FindFirst(JwtRegisteredClaimNames.Sub)
                           ?? context.HttpContext.User.FindFirst("sub");

            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId) || userId <= 0)
            {
                context.Result = new ObjectResult(new
                {
                    statusCode = StatusCodes.Status401Unauthorized,
                    success = false,
                    message = "User session does not contain a valid user identifier."
                })
                {
                    StatusCode = StatusCodes.Status401Unauthorized
                };
                return;
            }

            // Resolve action: if "auto", map based on HTTP method and path
            string resolvedAction = _action;
            if (string.IsNullOrWhiteSpace(resolvedAction) || resolvedAction.Equals("auto", StringComparison.OrdinalIgnoreCase))
            {
                var httpMethod = context.HttpContext.Request.Method.ToUpperInvariant();
                var path = context.HttpContext.Request.Path.Value?.ToLowerInvariant() ?? "";

                // Endpoints that use POST for searching/filtering/exporting/readiness are viewing operations
                if (httpMethod == "POST" && (path.EndsWith("/search") || path.EndsWith("/filter") || path.EndsWith("/export") || path.EndsWith("/dropdown") || path.EndsWith("/readiness") || path.EndsWith("/preview")))
                {
                    resolvedAction = "view";
                }
                else
                {
                    resolvedAction = httpMethod switch
                    {
                        "GET" or "HEAD" => "view",
                        "POST" => "create",
                        "PUT" or "PATCH" => "edit",
                        "DELETE" => "delete",
                        _ => "view"
                    };
                }
            }

            try
            {
                // 4. Verify permission in DB: User -> Role -> RoleModules -> Permissions (with User Overrides)
                bool hasPermission = await _permissionRepository.HasModulePermissionAsync(userId, _module, resolvedAction);
                if (!hasPermission)
                {
                    _logger.LogWarning("Forbidden: User {UserId} denied '{Action}' on module '{Module}'.", userId, resolvedAction, _module);
                    context.Result = new ObjectResult(new
                    {
                        statusCode = StatusCodes.Status403Forbidden,
                        success = false,
                        message = $"Access denied. You do not have '{resolvedAction}' permission for module '{_module}'.",
                        module = _module,
                        action = resolvedAction
                    })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while checking module permission for user {UserId}.", userId);
                context.Result = new ObjectResult(new
                {
                    statusCode = StatusCodes.Status403Forbidden,
                    success = false,
                    message = "Access denied: Unable to verify permissions."
                })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
            }
        }
    }
}
