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
                    if (campusProp != null && campusProp.CanWrite &&
                        (campusProp.PropertyType == typeof(int) || campusProp.PropertyType == typeof(int?) ||
                         campusProp.PropertyType == typeof(long) || campusProp.PropertyType == typeof(long?)))
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
                            object valToSet = (campusProp.PropertyType == typeof(long) || campusProp.PropertyType == typeof(long?))
                                ? (long)effectiveCampusId
                                : effectiveCampusId;
                            campusProp.SetValue(arg, valToSet);
                        }
                    }

                    var collegeProp = arg.GetType().GetProperty("CollegeId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                    if (collegeProp != null && collegeProp.CanWrite && (collegeProp.PropertyType == typeof(int) || collegeProp.PropertyType == typeof(int?)))
                    {
                        collegeProp.SetValue(arg, collegeId.Value);
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
                else if (string.Equals(ctrl, "Hostel", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(ctrl, "HostelFee", StringComparison.OrdinalIgnoreCase))
                {
                    await ValidateHostelIsolationAsync(context, ctrl, idVal, collegeId.Value);
                }
                else if (IsTransportController(ctrl))
                {
                    await ValidateTransportIsolationAsync(context, ctrl, collegeId.Value);
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

        private async Task ValidateHostelIsolationAsync(ActionExecutingContext context, string ctrl, int? idVal, int collegeId)
        {
            if (string.Equals(ctrl, "HostelFee", StringComparison.OrdinalIgnoreCase))
            {
                if (idVal.HasValue && idVal.Value > 0)
                {
                    await _securityService.ValidateHostelResourceOwnershipAsync("fees", idVal.Value, collegeId, throwIfMissing: true);
                }
            }
            else if (idVal.HasValue && idVal.Value > 0)
            {
                string path = (context.HttpContext.Request.Path.Value ?? string.Empty).ToLowerInvariant();
                string? resource = null;
                if (path.Contains("/blocks/")) resource = "blocks";
                else if (path.Contains("/room-types/")) resource = "room-types";
                else if (path.Contains("/rooms/")) resource = "rooms";
                else if (path.Contains("/beds/")) resource = "beds";
                else if (path.Contains("/wardens/")) resource = "wardens";
                else if (path.Contains("/allocations/")) resource = "allocations";
                else if (path.Contains("/attendance/")) resource = "attendance";
                else if (path.Contains("/outpass-leave/")) resource = "outpass-leave";
                else if (path.Contains("/transfer-vacate/")) resource = "transfer-vacate";

                if (resource != null)
                {
                    await _securityService.ValidateHostelResourceOwnershipAsync(resource, idVal.Value, collegeId, throwIfMissing: true);
                }
            }

            // Validate query and DTO reference IDs to block cross-tenant creation/filtering
            var refChecks = new (string propName, string resourceType)[]
            {
                ("hostelId", "blocks"),
                ("fromHostelId", "blocks"),
                ("toHostelId", "blocks"),
                ("roomTypeId", "room-types"),
                ("roomId", "rooms"),
                ("fromRoomId", "rooms"),
                ("toRoomId", "rooms"),
                ("bedId", "beds"),
                ("fromBedId", "beds"),
                ("toBedId", "beds"),
                ("allocationId", "allocations"),
                ("wardenAssignmentId", "wardens")
            };

            foreach (var (propName, resourceType) in refChecks)
            {
                int? qVal = TryExtractId(context, propName);
                if (qVal.HasValue && qVal.Value > 0)
                {
                    await _securityService.ValidateHostelResourceOwnershipAsync(resourceType, qVal.Value, collegeId, throwIfMissing: false);
                }
            }

            int? qStudentId = TryExtractId(context, "studentId");
            if (qStudentId.HasValue && qStudentId.Value > 0)
            {
                try
                {
                    await _securityService.ValidateStudentOwnershipAsync(qStudentId.Value, collegeId);
                }
                catch (NotFoundException)
                {
                    // Allow service validation to handle missing reference IDs unless route-level
                }
            }

            int? qStaffId = TryExtractId(context, "staffId");
            if (qStaffId.HasValue && qStaffId.Value > 0)
            {
                try
                {
                    await _securityService.ValidateStaffOwnershipAsync(qStaffId.Value, collegeId);
                }
                catch (NotFoundException)
                {
                    // Allow service validation to handle missing reference IDs
                }
            }

            foreach (var arg in context.ActionArguments.Values)
            {
                if (arg == null || arg.GetType().IsPrimitive || arg is string || arg is decimal || arg is DateTime)
                    continue;

                var type = arg.GetType();
                foreach (var (propName, resourceType) in refChecks)
                {
                    var prop = type.GetProperty(propName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                    if (prop != null)
                    {
                        int? pVal = TryToInt(prop.GetValue(arg));
                        if (pVal.HasValue && pVal.Value > 0)
                        {
                            await _securityService.ValidateHostelResourceOwnershipAsync(resourceType, pVal.Value, collegeId, throwIfMissing: false);
                        }
                    }
                }

                var stuProp = type.GetProperty("StudentId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                if (stuProp != null)
                {
                    int? sVal = TryToInt(stuProp.GetValue(arg));
                    if (sVal.HasValue && sVal.Value > 0)
                    {
                        try { await _securityService.ValidateStudentOwnershipAsync(sVal.Value, collegeId); }
                        catch (NotFoundException) { }
                    }
                }

                var staffProp = type.GetProperty("StaffId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                if (staffProp != null)
                {
                    int? stVal = TryToInt(staffProp.GetValue(arg));
                    if (stVal.HasValue && stVal.Value > 0)
                    {
                        try { await _securityService.ValidateStaffOwnershipAsync(stVal.Value, collegeId); }
                        catch (NotFoundException) { }
                    }
                }

                // Check nested Records collection (e.g., BulkHostelAttendanceDto.Records)
                var recordsProp = type.GetProperty("Records", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                if (recordsProp?.GetValue(arg) is System.Collections.IEnumerable records)
                {
                    foreach (var item in records)
                    {
                        if (item == null) continue;
                        var itemType = item.GetType();
                        foreach (var (propName, resourceType) in refChecks)
                        {
                            var ip = itemType.GetProperty(propName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                            int? iv = ip != null ? TryToInt(ip.GetValue(item)) : null;
                            if (iv.HasValue && iv.Value > 0)
                            {
                                await _securityService.ValidateHostelResourceOwnershipAsync(resourceType, iv.Value, collegeId, throwIfMissing: false);
                            }
                        }

                        var iStu = itemType.GetProperty("StudentId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                        int? iStuVal = iStu != null ? TryToInt(iStu.GetValue(item)) : null;
                        if (iStuVal.HasValue && iStuVal.Value > 0)
                        {
                            try { await _securityService.ValidateStudentOwnershipAsync(iStuVal.Value, collegeId); }
                            catch (NotFoundException) { }
                        }
                    }
                }
            }
        }

        private static bool IsTransportController(string ctrl) =>
            ctrl.StartsWith("Transport", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(ctrl, "PickupPoint", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(ctrl, "VehicleMaintenance", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(ctrl, "StudentTransportAssignment", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(ctrl, "StudentTransport", StringComparison.OrdinalIgnoreCase);

        private async Task ValidateTransportIsolationAsync(ActionExecutingContext context, string ctrl, int collegeId)
        {
            string? routeResource = ctrl switch
            {
                var c when string.Equals(c, "TransportRoutes", StringComparison.OrdinalIgnoreCase) || string.Equals(c, "TransportRoute", StringComparison.OrdinalIgnoreCase) => "routes",
                var c when string.Equals(c, "PickupPoint", StringComparison.OrdinalIgnoreCase) => "pickup-points",
                var c when string.Equals(c, "TransportVehicle", StringComparison.OrdinalIgnoreCase) => "vehicles",
                var c when string.Equals(c, "TransportDriver", StringComparison.OrdinalIgnoreCase) => "drivers",
                var c when string.Equals(c, "TransportAttendant", StringComparison.OrdinalIgnoreCase) => "attendants",
                var c when string.Equals(c, "TransportVehicleAssignment", StringComparison.OrdinalIgnoreCase) => "vehicle-assignments",
                var c when string.Equals(c, "StudentTransportAssignment", StringComparison.OrdinalIgnoreCase) => "student-assignments",
                var c when string.Equals(c, "VehicleMaintenance", StringComparison.OrdinalIgnoreCase) => "maintenance",
                var c when string.Equals(c, "TransportOperations", StringComparison.OrdinalIgnoreCase) => "trips",
                var c when string.Equals(c, "TransportDashboard", StringComparison.OrdinalIgnoreCase) => "vehicle-assignments",
                var c when string.Equals(c, "TransportDriverDashboard", StringComparison.OrdinalIgnoreCase) => "trips",
                _ => null
            };

            long? primaryId = TryExtractLong(context, "id")
                           ?? TryExtractLong(context, "tripId")
                           ?? TryExtractLong(context, "assignmentId")
                           ?? TryExtractLong(context, "routeIdOrCode");

            // Avoid false NotFound on string codes/numbers (e.g. "HABSIGUDA_1" or "AP053834") which controllers resolve in-method
            if (routeResource != null && primaryId.HasValue && primaryId.Value > 0)
            {
                string path = (context.HttpContext.Request.Path.Value ?? string.Empty).ToLowerInvariant();
                bool isDocRoute = path.Contains("/documents/");
                await _securityService.ValidateTransportResourceOwnershipAsync(routeResource, primaryId.Value, collegeId, throwIfMissing: false);
                if (isDocRoute)
                {
                    long? docId = TryExtractLong(context, "docId");
                    if (docId.HasValue && docId.Value > 0)
                    {
                        await _securityService.ValidateTransportResourceOwnershipAsync("documents", docId.Value, collegeId, throwIfMissing: false);
                    }
                }
            }

            var transportRefChecks = new (string propName, string resourceType)[]
            {
                ("routeId", "routes"),
                ("pickupPointId", "pickup-points"),
                ("vehicleId", "vehicles"),
                ("driverId", "drivers"),
                ("attendantId", "attendants"),
                ("vehicleAssignmentId", "vehicle-assignments"),
                ("tripId", "trips"),
                ("maintenanceId", "maintenance")
            };

            foreach (var (propName, resType) in transportRefChecks)
            {
                long? qVal = TryExtractLong(context, propName);
                if (qVal.HasValue && qVal.Value > 0)
                {
                    await _securityService.ValidateTransportResourceOwnershipAsync(resType, qVal.Value, collegeId, throwIfMissing: false);
                }
            }

            foreach (var arg in context.ActionArguments.Values)
            {
                if (arg == null || arg.GetType().IsPrimitive || arg is string || arg is decimal || arg is DateTime)
                    continue;

                var type = arg.GetType();
                foreach (var (propName, resType) in transportRefChecks)
                {
                    var prop = type.GetProperty(propName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                    if (prop != null)
                    {
                        long? pVal = TryToLong(prop.GetValue(arg));
                        if (pVal.HasValue && pVal.Value > 0)
                        {
                            await _securityService.ValidateTransportResourceOwnershipAsync(resType, pVal.Value, collegeId, throwIfMissing: false);
                        }
                    }
                }
            }
        }

        private static long? TryExtractLong(ActionExecutingContext context, string key)
        {
            if (context.ActionArguments.TryGetValue(key, out var argVal))
                return TryToLong(argVal);
            if (context.RouteData.Values.TryGetValue(key, out var routeVal))
                return TryToLong(routeVal);
            return null;
        }

        private static long? TryToLong(object? value)
        {
            if (value == null) return null;
            if (value is long l) return l;
            if (value is int i) return i;
            if (long.TryParse(value.ToString(), out var parsed)) return parsed;
            return null;
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
