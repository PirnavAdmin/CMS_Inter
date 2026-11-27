using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Filters
{
    /// <summary>
    /// Enforces server-side multi-tenant isolation across all V1 module controllers.
    /// Automatically scopes omitted campusId / DTO.CampusId parameters to the authenticated
    /// user's CollegeId campuses, and blocks cross-tenant campus access (arguments, headers, DTOs)
    /// with 403 Forbidden.
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
            "Health",
            "LandingPage"
        };

        private readonly AppDbContext _db;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly ITenantSecurityService _securityService;
        private readonly IMemoryCache _cache;
        private readonly ILogger<TenantIsolationActionFilter> _logger;

        public TenantIsolationActionFilter(
            AppDbContext db,
            IJwtTokenHelper jwtTokenHelper,
            ITenantSecurityService securityService,
            IMemoryCache cache,
            ILogger<TenantIsolationActionFilter> logger)
        {
            _db = db;
            _jwtTokenHelper = jwtTokenHelper;
            _securityService = securityService;
            _cache = cache;
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
            if (!collegeId.HasValue || collegeId.Value <= 0)
            {
                _logger.LogWarning("Cross-tenant block: Authenticated user has missing or invalid CollegeId on {Controller}", controllerName);
                context.Result = new ObjectResult(new
                {
                    success = false,
                    message = "Tenant context required."
                })
                { StatusCode = StatusCodes.Status403Forbidden };
                return;
            }

            string cacheKey = $"tenant_campuses_{collegeId.Value}";
            if (!_cache.TryGetValue(cacheKey, out List<int>? ownedCampuses) || ownedCampuses == null)
            {
                var conn = _db.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open)
                {
                    await conn.OpenAsync(context.HttpContext.RequestAborted);
                }

                ownedCampuses = (await conn.QueryAsync<int>(
                    "SELECT CampusId FROM Campuses WHERE CollegeId = @CollegeId AND IsActive = 1 ORDER BY IsHQ DESC, CampusId ASC;",
                    new { CollegeId = collegeId.Value })).ToList();

                _cache.Set(cacheKey, ownedCampuses, TimeSpan.FromMinutes(5));
            }

            var ownedSet = new HashSet<int>(ownedCampuses);
            int effectiveCampusId = ownedCampuses.Count > 0 ? ownedCampuses[0] : NoCampusSentinel;

            // 1. Strict X-Campus-Id header validation
            if (context.HttpContext.Request.Headers.TryGetValue("X-Campus-Id", out var headerVal))
            {
                if (int.TryParse(headerVal.FirstOrDefault(), out int xCampusId) && xCampusId > 0 && xCampusId != NoCampusSentinel)
                {
                    if (!ownedSet.Contains(xCampusId))
                    {
                        _logger.LogWarning(
                            "Cross-tenant header block: CollegeId {CollegeId} sent unauthorized X-Campus-Id {CampusId} on {Controller}",
                            collegeId.Value, xCampusId, controllerName);
                        context.Result = new ObjectResult(new
                        {
                            success = false,
                            message = "Access denied: Unauthorized campus access."
                        })
                        { StatusCode = StatusCodes.Status403Forbidden };
                        return;
                    }
                }
            }

            // 2. Ensure any optional campus parameter declared on the action descriptor is initialized
            foreach (var p in context.ActionDescriptor.Parameters)
            {
                if ((string.Equals(p.Name, "campusId", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(p.Name, "selectedCampusId", StringComparison.OrdinalIgnoreCase)) &&
                    (p.ParameterType == typeof(int) || p.ParameterType == typeof(int?)))
                {
                    if (!context.ActionArguments.ContainsKey(p.Name) || context.ActionArguments[p.Name] == null)
                    {
                        context.ActionArguments[p.Name] = effectiveCampusId;
                    }
                }
            }

            // 3. Validate and scope all ActionArguments
            foreach (var key in context.ActionArguments.Keys.ToList())
            {
                var arg = context.ActionArguments[key];

                if (string.Equals(key, "campusId", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(key, "selectedCampusId", StringComparison.OrdinalIgnoreCase))
                {
                    int? requested = TryToInt(arg);
                    if (requested.HasValue && requested.Value > 0 && requested.Value != NoCampusSentinel)
                    {
                        if (!ownedSet.Contains(requested.Value))
                        {
                            _logger.LogWarning(
                                "Cross-tenant block: CollegeId {CollegeId} requested unauthorized CampusId {CampusId} on {Controller}",
                                collegeId.Value, requested.Value, controllerName);
                            context.Result = new ObjectResult(new
                            {
                                success = false,
                                message = "Access denied: Unauthorized campus access."
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
                            if (!ownedSet.Contains(propVal.Value))
                            {
                                _logger.LogWarning(
                                    "Cross-tenant DTO block: CollegeId {CollegeId} sent unauthorized CampusId {CampusId} on {Controller}",
                                    collegeId.Value, propVal.Value, controllerName);
                                context.Result = new ObjectResult(new
                                {
                                    success = false,
                                    message = "Access denied: Unauthorized campus access."
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

            // 4. Ensure omitted campusId parameters receive effectiveCampusId
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

            // 5. Entity-level IDOR Protection
            try
            {
                int? idVal = TryExtractId(context, "id");
                string ctrl = controllerName ?? string.Empty;

                if (string.Equals(ctrl, "Students", StringComparison.OrdinalIgnoreCase))
                {
                    int? targetStudentId = TryExtractId(context, "studentId") ?? idVal;
                    if (targetStudentId.HasValue && targetStudentId.Value > 0)
                    {
                        await _securityService.ValidateStudentOwnershipAsync(targetStudentId.Value, collegeId.Value);
                    }
                }
                else if (string.Equals(ctrl, "StudentAdmissions", StringComparison.OrdinalIgnoreCase))
                {
                    int? targetAdmissionId = TryExtractId(context, "admissionId") ?? idVal;
                    if (targetAdmissionId.HasValue && targetAdmissionId.Value > 0)
                    {
                        await _securityService.ValidateAdmissionOwnershipAsync(targetAdmissionId.Value, collegeId.Value);
                    }
                }
                else if (string.Equals(ctrl, "Staff", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(ctrl, "Faculty", StringComparison.OrdinalIgnoreCase))
                {
                    int? targetStaffId = TryExtractId(context, "staffId") ?? TryExtractId(context, "facultyId") ?? idVal;
                    if (targetStaffId.HasValue && targetStaffId.Value > 0)
                    {
                        await _securityService.ValidateStaffOwnershipAsync(targetStaffId.Value, collegeId.Value);
                    }
                }
                else if (string.Equals(ctrl, "Department", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(ctrl, "Departments", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(ctrl, "NonTeachingDepartment", StringComparison.OrdinalIgnoreCase))
                {
                    int? targetDeptId = TryExtractId(context, "departmentId") ?? idVal;
                    if (targetDeptId.HasValue && targetDeptId.Value > 0)
                    {
                        await _securityService.ValidateDepartmentOwnershipAsync(targetDeptId.Value, collegeId.Value);
                    }
                }
                else if (string.Equals(ctrl, "Designation", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(ctrl, "Designations", StringComparison.OrdinalIgnoreCase))
                {
                    int? targetDesigId = TryExtractId(context, "designationId") ?? idVal;
                    if (targetDesigId.HasValue && targetDesigId.Value > 0)
                    {
                        await _securityService.ValidateDesignationOwnershipAsync(targetDesigId.Value, collegeId.Value);
                    }
                }
                else if (string.Equals(ctrl, "Examination", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(ctrl, "Examinations", StringComparison.OrdinalIgnoreCase))
                {
                    int? targetExamId = TryExtractId(context, "examinationId") ?? TryExtractId(context, "examId") ?? idVal;
                    if (targetExamId.HasValue && targetExamId.Value > 0)
                    {
                        await _securityService.ValidateExamOwnershipAsync(targetExamId.Value, collegeId.Value);
                    }
                }
                else if (string.Equals(ctrl, "Fee", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(ctrl, "FeeStructure", StringComparison.OrdinalIgnoreCase))
                {
                    int? targetFeeId = TryExtractId(context, "feeStructureId");
                    if (targetFeeId.HasValue && targetFeeId.Value > 0)
                    {
                        await _securityService.ValidateFeeStructureOwnershipAsync(targetFeeId.Value, collegeId.Value);
                    }
                }
            }
            catch (ForbiddenException fex)
            {
                context.Result = new ObjectResult(new { success = false, message = fex.Message })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }
            catch (NotFoundException nex)
            {
                context.Result = new ObjectResult(new { success = false, message = nex.Message })
                {
                    StatusCode = StatusCodes.Status404NotFound
                };
                return;
            }

            await next();
        }

        private static int? TryExtractId(ActionExecutingContext context, string key)
        {
            if (context.ActionArguments.TryGetValue(key, out var argVal))
            {
                return TryToInt(argVal);
            }
            if (context.RouteData.Values.TryGetValue(key, out var routeVal))
            {
                return TryToInt(routeVal);
            }
            return null;
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
