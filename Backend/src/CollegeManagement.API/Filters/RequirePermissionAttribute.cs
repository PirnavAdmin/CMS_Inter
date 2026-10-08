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
        public RequirePermissionAttribute(string module, string action = "View") 
            : base(typeof(RequirePermissionFilter))
        {
            Arguments = new object[] { module, action };
        }
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
            _action = action ?? "View";
            _permissionRepository = permissionRepository ?? throw new ArgumentNullException(nameof(permissionRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
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

            // 2. Unrestricted bypass for platform Super Admin
            if (context.HttpContext.User.IsInRole("Super Admin"))
            {
                return;
            }

            // 3. Extract User ID
            var userIdClaim = context.HttpContext.User.FindFirst("UserId")
                           ?? context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)
                           ?? context.HttpContext.User.FindFirst(JwtRegisteredClaimNames.Sub);

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

            try
            {
                // 4. Verify permission in DB: User -> Role -> RoleModules -> Permissions (with User Overrides)
                bool hasPermission = await _permissionRepository.HasModulePermissionAsync(userId, _module, _action);
                if (!hasPermission)
                {
                    _logger.LogWarning("Forbidden: User {UserId} denied '{Action}' on module '{Module}'.", userId, _action, _module);
                    context.Result = new ObjectResult(new
                    {
                        statusCode = StatusCodes.Status403Forbidden,
                        success = false,
                        message = $"Access denied. You do not have '{_action}' permission for module '{_module}'.",
                        module = _module,
                        action = _action
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
