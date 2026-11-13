using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Helpers;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Filters
{
    /// <summary>
    /// Enforces server-side multi-tenant isolation across all V1 module controllers.
    /// Automatically scopes omitted campusId / DTO.CampusId parameters to the authenticated
    /// user's CollegeId campuses (or 999999999 sentinel when the college has no campuses yet),
    /// and blocks cross-tenant campus access with 403 Forbidden.
    /// </summary>
    public class TenantIsolationActionFilter : IAsyncActionFilter
    {
        public const int NoCampusSentinel = 999999999;

        private static readonly HashSet<string> ExemptControllers = new(StringComparer.OrdinalIgnoreCase)
        {
            "Auth",
            "SuperAdmin",
            "Campus",
            "Location",
            "ThemePolicy",
            "Health"
        };

        private readonly AppDbContext _db;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly ILogger<TenantIsolationActionFilter> _logger;

        public TenantIsolationActionFilter(
            AppDbContext db,
            IJwtTokenHelper jwtTokenHelper,
            ILogger<TenantIsolationActionFilter> logger)
        {
            _db = db;
            _jwtTokenHelper = jwtTokenHelper;
            _logger = logger;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var user = context.HttpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                await next();
                return;
            }

            var role = _jwtTokenHelper.GetRole(user);
            if (user.IsInRole("Super Admin") || string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }

            string? controllerName = context.RouteData.Values["controller"]?.ToString();
            if (!string.IsNullOrWhiteSpace(controllerName) && ExemptControllers.Contains(controllerName))
            {
                await next();
                return;
            }

            int? collegeId = _jwtTokenHelper.GetCollegeId(user);
            if (!collegeId.HasValue || collegeId.Value <= 1)
            {
                await next();
                return;
            }

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync(context.HttpContext.RequestAborted);
            }

            var ownedCampuses = (await conn.QueryAsync<int>(
                "SELECT CampusId FROM Campuses WHERE CollegeId = @CollegeId AND IsActive = 1 ORDER BY IsHQ DESC, CampusId ASC;",
                new { CollegeId = collegeId.Value })).ToList();

            var ownedSet = new HashSet<int>(ownedCampuses);
            int effectiveCampusId = ownedCampuses.Count > 0 ? ownedCampuses[0] : NoCampusSentinel;

            foreach (var key in context.ActionArguments.Keys.ToList())
            {
                var arg = context.ActionArguments[key];

                if (string.Equals(key, "campusId", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "selectedCampusId", StringComparison.OrdinalIgnoreCase))
                {
                    int? requested = TryToInt(arg);
                    if (requested.HasValue && requested.Value > 0 && requested.Value != NoCampusSentinel)
                    {
                        if (requested.Value == 1 && !ownedSet.Contains(1))
                        {
                            context.ActionArguments[key] = effectiveCampusId;
                        }
                        else if (!ownedSet.Contains(requested.Value))
                        {
                            _logger.LogWarning(
                                "Cross-tenant block: CollegeId {CollegeId} requested CampusId {CampusId} on {Controller}",
                                collegeId.Value, requested.Value, controllerName);
                            context.Result = new ObjectResult(new
                            {
                                success = false,
                                message = "Access denied: This campus does not belong to your college."
                            })
                            { StatusCode = StatusCodes.Status403Forbidden };
                            return;
                        }
                    }
                    else
                    {
                        var param = context.ActionDescriptor.Parameters
                            .FirstOrDefault(p => string.Equals(p.Name, key, StringComparison.OrdinalIgnoreCase));
                        if (param == null || param.ParameterType == typeof(int) || param.ParameterType == typeof(int?))
                        {
                            context.ActionArguments[key] = effectiveCampusId;
                        }
                    }
                }
                else if (arg != null && !arg.GetType().IsPrimitive && arg is not string && arg is not decimal && arg is not DateTime)
                {
                    var campusProp = arg.GetType().GetProperty("CampusId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                    if (campusProp != null && campusProp.CanWrite && (campusProp.PropertyType == typeof(int) || campusProp.PropertyType == typeof(int?)))
                    {
                        int? propVal = TryToInt(campusProp.GetValue(arg));
                        if (propVal.HasValue && propVal.Value > 0 && propVal.Value != NoCampusSentinel)
                        {
                            if (propVal.Value == 1 && !ownedSet.Contains(1))
                            {
                                campusProp.SetValue(arg, effectiveCampusId);
                            }
                            else if (!ownedSet.Contains(propVal.Value))
                            {
                                _logger.LogWarning(
                                    "Cross-tenant DTO block: CollegeId {CollegeId} sent CampusId {CampusId} on {Controller}",
                                    collegeId.Value, propVal.Value, controllerName);
                                context.Result = new ObjectResult(new
                                {
                                    success = false,
                                    message = "Access denied: This campus does not belong to your college."
                                })
                                { StatusCode = StatusCodes.Status403Forbidden };
                                return;
                            }
                        }
                        else
                        {
                            campusProp.SetValue(arg, effectiveCampusId);
                        }
                    }
                }
            }

            // Ensure omitted campusId / selectedCampusId parameters (not present in ActionArguments) also receive effectiveCampusId
            foreach (var param in context.ActionDescriptor.Parameters)
            {
                if ((string.Equals(param.Name, "campusId", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(param.Name, "selectedCampusId", StringComparison.OrdinalIgnoreCase)) &&
                    (param.ParameterType == typeof(int) || param.ParameterType == typeof(int?)) &&
                    !context.ActionArguments.ContainsKey(param.Name))
                {
                    context.ActionArguments[param.Name] = effectiveCampusId;
                }
            }

            await next();
        }

        private static int? TryToInt(object? value)
        {
            if (value == null) return null;
            if (value is int i) return i;
            if (int.TryParse(value.ToString(), out var parsed)) return parsed;
            return null;
        }
    }
}
