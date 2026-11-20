using CollegeManagement.API.Data;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.DTOs.Payroll;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Interfaces.Payroll;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Produces("application/json")]
    [Authorize]
    [RequirePermission("payroll")]
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollService _payrollService;
        private readonly INotificationService? _notificationService;
        private readonly IJwtTokenHelper? _jwtTokenHelper;
        private readonly IUserRepository? _userRepository;
        private readonly IPermissionRepository? _permissionRepository;
        private readonly AppDbContext? _db;

        public PayrollController(
            IPayrollService payrollService,
            INotificationService? notificationService = null,
            IJwtTokenHelper? jwtTokenHelper = null,
            IUserRepository? userRepository = null,
            IPermissionRepository? permissionRepository = null,
            AppDbContext? db = null)
        {
            _payrollService = payrollService;
            _notificationService = notificationService;
            _jwtTokenHelper = jwtTokenHelper;
            _userRepository = userRepository;
            _permissionRepository = permissionRepository;
            _db = db;
        }

        private int? ResolveCampusId(int? explicitlyProvided = null)
        {
            if (explicitlyProvided.HasValue && explicitlyProvided.Value > 0)
                return explicitlyProvided.Value;

            if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) &&
                int.TryParse(headerVal, out var campusId) && campusId > 0)
            {
                return campusId;
            }

            if (Request.Headers.TryGetValue("Campus-Id", out var headerVal2) &&
                int.TryParse(headerVal2, out var campusId2) && campusId2 > 0)
            {
                return campusId2;
            }

            if (Request.Query.TryGetValue("campusId", out var queryVal) &&
                int.TryParse(queryVal, out var qCampusId) && qCampusId > 0)
            {
                return qCampusId;
            }

            if (Request.Cookies.TryGetValue("cms_selected_campus_id", out var cookieVal) &&
                int.TryParse(cookieVal, out var cCampusId) && cCampusId > 0)
            {
                return cCampusId;
            }

            var campusClaim = User?.Claims?.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
            if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
            {
                return claimCampusId;
            }

            return null;
        }

        private async Task<int?> ResolveCallerStaffIdAsync()
        {
            // 1. Direct trusted claims check
            var staffClaim = User?.FindFirst("StaffId")?.Value 
                ?? User?.FindFirst("staffId")?.Value 
                ?? User?.FindFirst("staff_id")?.Value
                ?? User?.FindFirst("Staff_Id")?.Value;

            if (int.TryParse(staffClaim, out int sId) && sId > 0)
            {
                return sId;
            }

            // 2. Resolve via authenticated User ID from trusted JWT identity claims
            int? userId = _jwtTokenHelper?.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                var uidClaim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                    ?? User?.FindFirst("sub")?.Value
                    ?? User?.FindFirst("UserId")?.Value;
                if (int.TryParse(uidClaim, out int uid) && uid > 0)
                {
                    userId = uid;
                }
            }

            if (userId.HasValue && userId.Value > 0)
            {
                if (_userRepository != null)
                {
                    var user = await _userRepository.GetByIdAsync(userId.Value);
                    if (user != null && user.StaffId.HasValue && user.StaffId.Value > 0)
                    {
                        return user.StaffId.Value;
                    }
                }
                else if (_db != null)
                {
                    var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId.Value);
                    if (user != null && user.StaffId.HasValue && user.StaffId.Value > 0)
                    {
                        return user.StaffId.Value;
                    }
                }
            }

            // Fail closed: Never treat sub, employee ID strings, or partial searches as StaffId
            return null;
        }

        private bool IsAdminOrHr() => User.IsInRole("Admin") || User.IsInRole("Super Admin") || User.IsInRole("Principal") || User.IsInRole("HR");

        private bool IsAccountantUser()
        {
            var role = User?.FindFirst(ClaimTypes.Role)?.Value 
                ?? User?.FindFirst("role")?.Value 
                ?? User?.FindFirst("Role")?.Value;
            return string.Equals(role, "Accountant", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "Finance", StringComparison.OrdinalIgnoreCase)
                || User.IsInRole("Accountant")
                || User.IsInRole("Finance");
        }

        private async Task<bool> HasStaffPayrollPermissionAsync()
        {
            if (IsAdminOrHr())
                return true;

            int? userId = _jwtTokenHelper?.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                var uidClaim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                    ?? User?.FindFirst("sub")?.Value
                    ?? User?.FindFirst("UserId")?.Value;
                if (int.TryParse(uidClaim, out int uid) && uid > 0)
                    userId = uid;
            }

            if (!userId.HasValue || userId.Value <= 0)
                return false;

            if (_permissionRepository != null)
            {
                return await _permissionRepository.HasPermissionAsync(userId.Value, "finance.payroll.payslips.view");
            }

            return false;
        }

        private async Task<int?> GetStaffCampusIdAsync(int staffId)
        {
            if (_db != null)
            {
                var staff = await _db.Staffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == staffId);
                if (staff != null) return staff.CampusId;
            }
            return null;
        }

        // GET: api/payroll/salary-structures
        [HttpGet("salary-structures")]
        public async Task<IActionResult> GetSalaryStructures(
            [FromQuery] string? staffType,
            [FromQuery] string? search,
            [FromQuery] int? campusId = null)
        {
            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new List<SalaryStructureDto>());
            }

            var result =
                await _payrollService.GetSalaryStructuresAsync(
                    staffType,
                    search,
                    resolvedCampusId);

            return Ok(result);
        }

        // GET: api/payroll/salary-structures/5
        [HttpGet("salary-structures/{id:int}")]
        public async Task<IActionResult> GetSalaryStructure(int id)
        {
            var result =
                await _payrollService.GetSalaryStructureByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    Message = "Salary structure not found."
                });
            }

            return Ok(result);
        }

        // POST: api/payroll/salary-structures
        [HttpPost("salary-structures")]
        public async Task<IActionResult> CreateSalaryStructure(
            [FromBody] CreateSalaryStructureRequest request)
        {
            var id =
                await _payrollService.CreateSalaryStructureAsync(request);

            return Ok(new
            {
                Id = id,
                Message = "Salary structure created successfully."
            });
        }

        // PUT: api/payroll/salary-structures/5
        [HttpPut("salary-structures/{id:int}")]
        public async Task<IActionResult> UpdateSalaryStructure(
            int id,
            [FromBody] UpdateSalaryStructureRequest request)
        {
            var updated =
                await _payrollService.UpdateSalaryStructureAsync(
                    id,
                    request);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Salary structure not found."
                });
            }

            return Ok(new
            {
                Message = "Salary structure updated successfully."
            });
        }

        // DELETE: api/payroll/salary-structures/5
        [HttpDelete("salary-structures/{id:int}")]
        public async Task<IActionResult> DeleteSalaryStructure(int id)
        {
            var deleted =
                await _payrollService.DeleteSalaryStructureAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    Message = "Salary structure not found."
                });
            }

            return Ok(new
            {
                Message = "Salary structure deleted successfully."
            });
        }

        // GET: api/payroll/employees
        [HttpGet("employees")]
        public async Task<IActionResult> GetEmployees(
            [FromQuery] string? staffType,
            [FromQuery] string? search,
            [FromQuery] int? campusId = null)
        {
            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new List<PayrollEmployeeDto>());
            }

            var result =
                await _payrollService.GetEmployeesAsync(
                    staffType,
                    search,
                    resolvedCampusId);

            return Ok(result);
        }

        // GET: api/payroll/salary-assignments?staffId=10&status=Active
        [HttpGet("salary-assignments")]
        public async Task<IActionResult> GetSalaryAssignments(
            [FromQuery] int? staffId,
            [FromQuery] string? status,
            [FromQuery] int? campusId = null)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Active" && status != "On Hold")
                return BadRequest(new
                {
                    Message = "Status must be Active or On Hold."
                });

            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new List<SalaryAssignmentDto>());
            }

            var result = await _payrollService
                .GetSalaryAssignmentsAsync(staffId, status, resolvedCampusId);
            return Ok(result);
        }

        // GET: api/payroll/salary-assignments/4
        [HttpGet("salary-assignments/{id:int}")]
        public async Task<IActionResult> GetSalaryAssignmentById(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid assignment Id is required." });

            var result = await _payrollService.GetSalaryAssignmentByIdAsync(id);
            if (result == null)
                return NotFound(new { Message = "Salary assignment not found." });

            return Ok(result);
        }

        // POST: api/payroll/salary-assignments
        [HttpPost("salary-assignments")]
        public async Task<IActionResult> AssignSalaryStructure(
            [FromBody] AssignSalaryStructureRequest request)
        {
            if (request.StaffId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid StaffId is required."
                });
            }

            if (request.SalaryStructureId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid SalaryStructureId is required."
                });
            }

            var assignmentId =
                await _payrollService.AssignSalaryStructureAsync(request);

            return Ok(new
            {
                AssignmentId = assignmentId,
                Message = "Salary structure assigned successfully."
            });
        }

        // PUT: api/payroll/salary-assignments/5
        [HttpPut("salary-assignments/{id:int}")]
        public async Task<IActionResult> UpdateSalaryAssignment(
            int id,
            [FromBody] UpdateSalaryAssignmentRequest request)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid assignment Id is required."
                });
            }

            if (request.SalaryStructureId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid SalaryStructureId is required."
                });
            }

            var updated =
                await _payrollService.UpdateSalaryAssignmentAsync(
                    id,
                    request);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Salary assignment not found."
                });
            }

            return Ok(new
            {
                Message = "Salary assignment updated successfully."
            });
        }

        // DELETE: api/payroll/salary-assignments/5
        [HttpDelete("salary-assignments/{id:int}")]
        public async Task<IActionResult> DeleteSalaryAssignment(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid assignment Id is required."
                });
            }

            var deleted =
                await _payrollService.DeleteSalaryAssignmentAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    Message = "Salary assignment not found."
                });
            }

            return Ok(new
            {
                Message = "Salary assignment deleted successfully."
            });
        }

        // PATCH: api/payroll/salary-assignments/5/status
        [HttpPatch("salary-assignments/{id:int}/status")]
        public async Task<IActionResult> UpdateSalaryAssignmentStatus(
            int id,
            [FromQuery] string status)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid assignment Id is required."
                });
            }

            if (string.IsNullOrWhiteSpace(status) ||
                (status != "Active" && status != "On Hold"))
            {
                return BadRequest(new
                {
                    Message = "Status must be 'Active' or 'On Hold'."
                });
            }

            var updated =
                await _payrollService.UpdateSalaryAssignmentStatusAsync(
                    id,
                    status);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Salary assignment not found."
                });
            }

            return Ok(new
            {
                Message =
                    $"Salary assignment status updated to {status}."
            });
        }

        // POST: api/payroll/payslips/generate
        [HttpPost("payslips/generate")]
        [Authorize(Roles = "Admin,Super Admin,Principal,HR")]
        public async Task<IActionResult> GeneratePayslip(
            [FromBody] GeneratePayslipRequest request)
        {
            if (request.StaffId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid StaffId is required."
                });
            }

            if (request.PayrollMonth < 1 ||
                request.PayrollMonth > 12)
            {
                return BadRequest(new
                {
                    Message =
                        "Payroll month must be between 1 and 12."
                });
            }

            if (request.PayrollYear <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid payroll year is required."
                });
            }

            var payslipId =
                await _payrollService.GeneratePayslipAsync(request);

            if (_notificationService != null && payslipId > 0)
            {
                try
                {
                    await _notificationService.SendToStaffAsync(
                        request.StaffId,
                        "Salary Payslip Released",
                        $"Your salary payslip for {request.PayrollMonth}/{request.PayrollYear} is now available in the portal.",
                        "Payroll",
                        payslipId,
                        $"/faculty-dashboard/payslips?payslipId={payslipId}");
                }
                catch { }
            }

            return Ok(new
            {
                PayslipId = payslipId,
                Message = "Payslip generated successfully."
            });
        }

        // POST: api/payroll/payslips/generate-bulk
        [HttpPost("payslips/generate-bulk")]
        [Authorize(Roles = "Admin,Super Admin,Principal,HR")]
        public async Task<IActionResult> GenerateBulkPayslips(
            [FromBody] GenerateBulkPayslipRequest request)
        {
            if (request.StaffIds == null ||
                request.StaffIds.Count == 0)
            {
                return BadRequest(new
                {
                    Message = "At least one StaffId is required."
                });
            }

            if (request.StaffIds.Any(id => id <= 0))
            {
                return BadRequest(new
                {
                    Message = "All StaffIds must be valid."
                });
            }

            if (request.PayrollMonth < 1 ||
                request.PayrollMonth > 12)
            {
                return BadRequest(new
                {
                    Message =
                        "Payroll month must be between 1 and 12."
                });
            }

            if (request.PayrollYear <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid payroll year is required."
                });
            }

            var payslipIds =
                (await _payrollService
                    .GenerateBulkPayslipsAsync(request))
                .ToList();

            if (_notificationService != null && payslipIds.Any())
            {
                try
                {
                    await _notificationService.SendToStaffListAsync(
                        request.StaffIds,
                        "Salary Payslip Released",
                        $"Your salary payslip for {request.PayrollMonth}/{request.PayrollYear} is now available in the portal.",
                        "Payroll",
                        null,
                        "/faculty-dashboard/payslips");
                }
                catch { }
            }

            return Ok(new
            {
                PayslipIds = payslipIds,
                GeneratedCount = payslipIds.Count,
                Message = "Bulk payslips generated successfully."
            });
        }

        // PATCH: api/payroll/payslips/5/status
        [HttpPatch("payslips/{id}/status")]
        [Authorize(Roles = "Admin,Super Admin,Principal,HR")]
        public async Task<IActionResult> UpdatePayslipStatus(
            string id,
            [FromQuery] string status)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new
                {
                    Message = "Valid payslip Id is required."
                });
            }

            var numericId = await _payrollService.ResolvePayslipIdAsync(id);
            if (!numericId.HasValue)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            if (string.IsNullOrWhiteSpace(status) ||
                (status != "Generated" &&
                 status != "Paid" &&
                 status != "On Hold"))
            {
                return BadRequest(new
                {
                    Message =
                        "Status must be 'Generated', 'Paid' or 'On Hold'."
                });
            }

            var updated =
                await _payrollService.UpdatePayslipStatusAsync(
                    numericId.Value,
                    status);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            if (_notificationService != null && string.Equals(status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var slip = await _payrollService.GetPayslipByIdAsync(numericId.Value);
                    if (slip != null && slip.StaffId > 0)
                    {
                        await _notificationService.SendToStaffAsync(
                            slip.StaffId,
                            "Salary Disbursed",
                            $"Your salary payslip #{numericId.Value} has been marked as Paid. Net payable: ₹{slip.NetSalary:N0}.",
                            "Payroll",
                            numericId.Value,
                            $"/faculty-dashboard/payslips?payslipId={numericId.Value}");
                    }
                }
                catch { }
            }

            return Ok(new
            {
                Message =
                    $"Payslip status updated to {status}."
            });
        }

        // POST: api/payroll/payslips/5/send-email
        [HttpPost("payslips/{id}/send-email")]
        [Authorize(Roles = "Admin,Super Admin,Principal,HR")]
        public async Task<IActionResult> SendPayslipEmail(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new
                {
                    Message = "Valid payslip Id is required."
                });
            }

            var numericId = await _payrollService.ResolvePayslipIdAsync(id);
            if (!numericId.HasValue)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            var sent =
                await _payrollService.SendPayslipEmailAsync(numericId.Value);

            if (!sent)
            {
                return StatusCode(500, new
                {
                    Message =
                        "Failed to deliver payslip email. Please check staff email address or mail server connectivity."
                });
            }

            return Ok(new
            {
                Message = "Payslip email sent successfully."
            });
        }

        // GET: api/v1/Payroll/my-payslips (Staff Self-Service Endpoint)
        [HttpGet("my-payslips")]
        [HttpGet("payslips/my-payslips")]
        [BypassPermission]
        public async Task<IActionResult> GetMyPayslips(
            [FromQuery] int? payrollMonth,
            [FromQuery] int? payrollYear,
            [FromQuery] int? campusId)
        {
            var callerStaffId = await ResolveCallerStaffIdAsync();
            if (!callerStaffId.HasValue || callerStaffId.Value <= 0)
            {
                return Unauthorized(new { Message = "Staff profile could not be identified from authentication credentials." });
            }

            var resolvedCampusId = ResolveCampusId(campusId);
            var allPayslips = await _payrollService.GetPayslipHistoryAsync(
                payrollMonth, payrollYear, null, null, resolvedCampusId);

            // Exact ownership filtering: Never return another employee's payslip
            var myPayslips = allPayslips.Where(p => p.StaffId == callerStaffId.Value).ToList();
            return Ok(myPayslips);
        }

        // GET: api/payroll/payslips
        [HttpGet("payslips")]
        [BypassPermission]
        public async Task<IActionResult> GetPayslipHistory(
            [FromQuery] int? payrollMonth,
            [FromQuery] int? payrollYear,
            [FromQuery] string? staffType,
            [FromQuery] string? search,
            [FromQuery] int? campusId = null,
            [FromQuery] string? scope = null,
            [FromQuery] bool? personal = null)
        {
            bool isPersonalRequested = personal == true || string.Equals(scope, "personal", StringComparison.OrdinalIgnoreCase);

            if (isPersonalRequested)
            {
                return await GetMyPayslips(payrollMonth, payrollYear, campusId);
            }

            bool canViewStaff = IsAdminOrHr() || (IsAccountantUser() && await HasStaffPayrollPermissionAsync());

            if (!canViewStaff)
            {
                // Accountant users without explicit finance.payroll.payslips.view cannot access staff payroll
                if (IsAccountantUser())
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied. You do not have permission to view staff payroll records." });
                }

                // Preserve existing personal self-service for Faculty, Driver, Non-Teaching Staff
                var callerStaffId = await ResolveCallerStaffIdAsync();
                if (!callerStaffId.HasValue || callerStaffId.Value <= 0)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied. Staff profile could not be identified." });
                }

                var resolvedCampus = ResolveCampusId(campusId);
                var personalHistory = await _payrollService.GetPayslipHistoryAsync(
                    payrollMonth, payrollYear, staffType, null, resolvedCampus);

                // Exact ownership match only (never partial search)
                var ownRecords = personalHistory.Where(p => p.StaffId == callerStaffId.Value).ToList();
                return Ok(ownRecords);
            }

            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new List<PayslipDto>());
            }

            // Enforce authorized campus scope for Accountant
            if (IsAccountantUser())
            {
                var callerStaffId = await ResolveCallerStaffIdAsync();
                if (callerStaffId.HasValue && callerStaffId.Value > 0)
                {
                    var accountantCampusId = await GetStaffCampusIdAsync(callerStaffId.Value);
                    if (accountantCampusId.HasValue && accountantCampusId.Value > 0)
                    {
                        if (resolvedCampusId.HasValue && resolvedCampusId.Value != accountantCampusId.Value)
                        {
                            return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: You can only view staff payroll for your authorized campus." });
                        }
                        resolvedCampusId = accountantCampusId.Value;
                    }
                }
            }

            var result = await _payrollService.GetPayslipHistoryAsync(
                payrollMonth,
                payrollYear,
                staffType,
                search,
                resolvedCampusId);

            return Ok(result);
        }

        // GET: api/payroll/payslips/5
        [HttpGet("payslips/{id}")]
        [BypassPermission]
        public async Task<IActionResult> GetPayslipById(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new
                {
                    Message = "Valid payslip Id is required."
                });
            }

            var numericId = await _payrollService.ResolvePayslipIdAsync(id);
            if (!numericId.HasValue)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            var result = await _payrollService.GetPayslipByIdAsync(numericId.Value);
            if (result == null)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            if (!IsAdminOrHr())
            {
                bool canViewStaff = IsAdminOrHr() || (IsAccountantUser() && await HasStaffPayrollPermissionAsync());
                var callerStaffId = await ResolveCallerStaffIdAsync();

                if (!canViewStaff)
                {
                    if (!callerStaffId.HasValue || callerStaffId.Value <= 0 || result.StaffId != callerStaffId.Value)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new { Message = "You are not authorized to view payslips of other employees." });
                    }
                }
                else
                {
                    if (callerStaffId.HasValue && callerStaffId.Value > 0)
                    {
                        var accountantCampusId = await GetStaffCampusIdAsync(callerStaffId.Value);
                        if (accountantCampusId.HasValue && accountantCampusId.Value > 0)
                        {
                            var targetCampusId = await GetStaffCampusIdAsync(result.StaffId);
                            if (targetCampusId.HasValue && targetCampusId.Value != accountantCampusId.Value)
                            {
                                return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: This payslip does not belong to your authorized campus." });
                            }
                        }
                    }
                }
            }

            return Ok(result);
        }

        // GET: api/payroll/payslips/{id}/pdf
        [HttpGet("payslips/{id}/pdf")]
        [HttpGet("payslips/{id}/download-pdf")]
        [BypassPermission]
        public async Task<IActionResult> DownloadPayslipPdf(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new
                {
                    Message = "Valid payslip Id is required."
                });
            }

            var numericId = await _payrollService.ResolvePayslipIdAsync(id);
            if (!numericId.HasValue)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            var existing = await _payrollService.GetPayslipByIdAsync(numericId.Value);
            if (existing == null)
            {
                return NotFound(new { Message = "Payslip not found." });
            }

            if (!IsAdminOrHr())
            {
                bool canViewStaff = IsAdminOrHr() || (IsAccountantUser() && await HasStaffPayrollPermissionAsync());
                var callerStaffId = await ResolveCallerStaffIdAsync();

                if (!canViewStaff)
                {
                    if (!callerStaffId.HasValue || callerStaffId.Value <= 0 || existing.StaffId != callerStaffId.Value)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new { Message = "You are not authorized to download payslips of other employees." });
                    }
                }
                else
                {
                    if (callerStaffId.HasValue && callerStaffId.Value > 0)
                    {
                        var accountantCampusId = await GetStaffCampusIdAsync(callerStaffId.Value);
                        if (accountantCampusId.HasValue && accountantCampusId.Value > 0)
                        {
                            var targetCampusId = await GetStaffCampusIdAsync(existing.StaffId);
                            if (targetCampusId.HasValue && targetCampusId.Value != accountantCampusId.Value)
                            {
                                return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: This payslip does not belong to your authorized campus." });
                            }
                        }
                    }
                }
            }

            var pdfBytes = await _payrollService.GeneratePayslipPdfAsync(numericId.Value);
            if (pdfBytes == null || pdfBytes.Length == 0)
            {
                return NotFound(new
                {
                    Message = "Payslip not found or failed to generate PDF."
                });
            }

            return File(pdfBytes, "application/pdf", $"Payslip_{numericId.Value}.pdf");
        }

        // GET: api/payroll/revisions?staffId=10&status=Pending
        [HttpGet("revisions")]
        public async Task<IActionResult> GetSalaryRevisions(
            [FromQuery] int? staffId,
            [FromQuery] string? status,
            [FromQuery] int? campusId = null)
        {
            if (staffId.HasValue && staffId.Value <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid StaffId is required."
                });
            }

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Pending" &&
                status != "Approved" &&
                status != "Rejected")
            {
                return BadRequest(new
                {
                    Message = "Status must be Pending, Approved or Rejected."
                });
            }

            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new List<SalaryRevisionDto>());
            }

            var result = await _payrollService
                .GetSalaryRevisionsAsync(staffId, status, resolvedCampusId);

            return Ok(result);
        }

        // POST: api/payroll/revisions
        [HttpPost("revisions")]
        public async Task<IActionResult> CreateSalaryRevision(
            [FromBody] CreateSalaryRevisionRequest request)
        {
            if (request.StaffId <= 0 ||
                request.CurrentSalaryStructureId <= 0 ||
                request.ProposedSalaryStructureId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid staff and salary structure IDs are required."
                });
            }

            if (request.CurrentSalaryStructureId ==
                request.ProposedSalaryStructureId)
            {
                return BadRequest(new
                {
                    Message = "Proposed salary structure must be different."
                });
            }

            if (request.EffectiveFrom == default)
            {
                return BadRequest(new
                {
                    Message = "Valid EffectiveFrom date is required."
                });
            }

            var revisionId = await _payrollService
                .CreateSalaryRevisionAsync(request);

            if (_notificationService != null && revisionId > 0)
            {
                try
                {
                    await _notificationService.SendToRolesAsync(
                        new[] { "Admin", "Super Admin", "Accountant", "Principal" },
                        ResolveCampusId(),
                        "Salary Revision Requested",
                        $"Salary revision request #{revisionId} submitted for Staff #{request.StaffId}.",
                        "Payroll",
                        revisionId,
                        "/dashboard/payroll");
                }
                catch { }
            }

            return Ok(new
            {
                RevisionId = revisionId,
                Message = "Salary revision requested successfully."
            });
        }

        // PATCH: api/payroll/revisions/5/approve
        // The approver ID is taken from the authenticated JWT, not request input.
        [HttpPatch("revisions/{id:int}/approve")]
        [Authorize(Roles = "Admin,Principal,Accountant,Finance")]
        public async Task<IActionResult> ApproveSalaryRevision(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid revision Id is required."
                });
            }

            var approverClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(approverClaim, out var approvedBy) ||
                approvedBy <= 0)
            {
                return Forbid();
            }

            var approved = await _payrollService
                .ApproveSalaryRevisionAsync(id, approvedBy);

            if (!approved)
            {
                return NotFound(new
                {
                    Message = "Salary revision not found or could not be approved."
                });
            }

            if (_notificationService != null)
            {
                try
                {
                    var revs = await _payrollService.GetSalaryRevisionsAsync(null, null, null);
                    var rev = revs.FirstOrDefault(r => r.Id == id);
                    if (rev != null && rev.StaffId > 0)
                    {
                        await _notificationService.SendToStaffAsync(
                            rev.StaffId,
                            "Salary Revision Approved",
                            $"Your salary revision request has been approved effective from {rev.EffectiveFrom:yyyy-MM-dd}.",
                            "Payroll",
                            id,
                            "/dashboard/payroll");
                    }
                }
                catch { }
            }

            return Ok(new
            {
                Message = "Salary revision approved successfully."
            });
        }

        // GET: api/payroll/bonuses?staffId=10&status=Pending
        [HttpGet("bonuses")]
        public async Task<IActionResult> GetBonuses(
            [FromQuery] int? staffId,
            [FromQuery] string? status,
            [FromQuery] int? campusId = null)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Pending" &&
                status != "Approved" &&
                status != "Rejected")
                return BadRequest(new
                {
                    Message = "Status must be Pending, Approved or Rejected."
                });

            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new List<BonusDto>());
            }

            var result = await _payrollService.GetBonusesAsync(staffId, status, resolvedCampusId);
            return Ok(result);
        }

        // GET: api/payroll/bonuses/1
        [HttpGet("bonuses/{id:int}")]
        public async Task<IActionResult> GetBonusById(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid bonus Id is required." });

            var bonus = await _payrollService.GetBonusByIdAsync(id);
            if (bonus == null)
                return NotFound(new { Message = "Bonus not found." });

            return Ok(bonus);
        }

        // POST: api/payroll/bonuses
        [HttpPost("bonuses")]
        public async Task<IActionResult> CreateBonus(
            [FromBody] CreateBonusRequest request)
        {
            if (request.StaffId <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (string.IsNullOrWhiteSpace(request.BonusType))
                return BadRequest(new { Message = "BonusType is required." });

            if (request.Amount <= 0)
                return BadRequest(new { Message = "Amount must be greater than zero." });

            if (request.BonusMonth < 1 || request.BonusMonth > 12)
                return BadRequest(new { Message = "BonusMonth must be between 1 and 12." });

            if (request.BonusYear < 2000)
                return BadRequest(new { Message = "Valid BonusYear is required." });

            var bonusId = await _payrollService.CreateBonusAsync(request);
            return Ok(new
            {
                BonusId = bonusId,
                Message = "Bonus requested successfully."
            });
        }

        // PATCH: api/payroll/bonuses/5/approve
        // Approver ID comes from the authenticated JWT, not request input.
        [HttpPatch("bonuses/{id:int}/approve")]
        [Authorize(Roles = "Admin,Principal,Accountant,Finance")]
        public async Task<IActionResult> ApproveBonus(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid bonus Id is required." });

            var approverClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(approverClaim, out var approvedBy) || approvedBy <= 0)
                return Forbid();

            var approved = await _payrollService.ApproveBonusAsync(id, approvedBy);

            if (!approved)
                return NotFound(new
                {
                    Message = "Bonus not found or could not be approved."
                });

            return Ok(new { Message = "Bonus approved successfully." });
        }

        // GET: api/payroll/advances?staffId=10&status=Pending
        [HttpGet("advances")]
        public async Task<IActionResult> GetAdvances(
            [FromQuery] int? staffId,
            [FromQuery] string? status,
            [FromQuery] int? campusId = null)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Pending" &&
                status != "Approved" &&
                status != "Rejected" &&
                status != "Closed")
                return BadRequest(new
                {
                    Message = "Status must be Pending, Approved, Rejected or Closed."
                });

            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new List<AdvanceDto>());
            }

            var result = await _payrollService.GetAdvancesAsync(staffId, status, resolvedCampusId);
            return Ok(result);
        }

        // GET: api/payroll/advances/1
        [HttpGet("advances/{id:int}")]
        public async Task<IActionResult> GetAdvanceById(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid advance Id is required." });

            var advance = await _payrollService.GetAdvanceByIdAsync(id);
            if (advance == null)
                return NotFound(new { Message = "Advance not found." });

            return Ok(advance);
        }

        // POST: api/payroll/advances
        [HttpPost("advances")]
        public async Task<IActionResult> CreateAdvance(
            [FromBody] CreateAdvanceRequest request)
        {
            if (request == null)
                return BadRequest(new { Message = "Request body is required." });

            if (request.StaffId <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (request.AdvanceType != "Salary Advance" &&
                request.AdvanceType != "Staff Loan")
                return BadRequest(new
                {
                    Message = "AdvanceType must be 'Salary Advance' or 'Staff Loan'."
                });

            if (request.Amount <= 0)
                return BadRequest(new { Message = "Amount must be greater than zero." });

            if (request.RepaymentMonths <= 0)
                return BadRequest(new { Message = "RepaymentMonths must be greater than zero." });

            if (Math.Round(request.Amount / request.RepaymentMonths, 2) <= 0)
                return BadRequest(new { Message = "Monthly deduction must be greater than zero." });

            if (request.StartMonth < 1 || request.StartMonth > 12)
                return BadRequest(new { Message = "StartMonth must be between 1 and 12." });

            if (request.StartYear < 2000)
                return BadRequest(new { Message = "Valid StartYear is required." });

            var advanceId = await _payrollService.CreateAdvanceAsync(request);
            return Ok(new
            {
                AdvanceId = advanceId,
                Message = "Advance or loan requested successfully."
            });
        }

        // PATCH: api/payroll/advances/5/approve
        // Approver ID is taken from the authenticated JWT.
        [HttpPatch("advances/{id:int}/approve")]
        [Authorize(Roles = "Admin,Principal,Accountant,Finance")]
        public async Task<IActionResult> ApproveAdvance(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid advance Id is required." });

            var approverClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(approverClaim, out var approvedBy) || approvedBy <= 0)
                return Forbid();

            var approved = await _payrollService.ApproveAdvanceAsync(id, approvedBy);

            if (!approved)
                return NotFound(new
                {
                    Message = "Advance or loan not found or could not be approved."
                });

            if (_notificationService != null)
            {
                try
                {
                    var adv = await _payrollService.GetAdvanceByIdAsync(id);
                    if (adv != null && adv.StaffId > 0)
                    {
                        await _notificationService.SendToStaffAsync(
                            adv.StaffId,
                            "Salary Advance / Loan Approved",
                            $"Your {adv.AdvanceType} request of ₹{adv.Amount} has been approved.",
                            "Payroll",
                            id,
                            "/dashboard/payroll");
                    }
                }
                catch { }
            }

            return Ok(new { Message = "Advance or loan approved successfully." });
        }

        // GET: api/payroll/advances/balances?staffId=10
        [HttpGet("advances/balances")]
        public async Task<IActionResult> GetAdvanceBalances([FromQuery] int? staffId)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            var result = await _payrollService.GetAdvanceBalancesAsync(staffId);
            return Ok(result);
        }

        // GET: api/payroll/advances/repayment-history?staffId=10&advanceId=1
        [HttpGet("advances/repayment-history")]
        public async Task<IActionResult> GetAdvanceRepaymentHistory(
            [FromQuery] int? staffId, [FromQuery] int? advanceId)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (advanceId.HasValue && advanceId.Value <= 0)
                return BadRequest(new { Message = "Valid AdvanceId is required." });

            var result = await _payrollService.GetAdvanceRepaymentHistoryAsync(staffId, advanceId);
            return Ok(result);
        }

        // GET: api/v1/payroll/staff/10/summary?year=2026
        [HttpGet("staff/{staffId:int}/summary")]
        [BypassPermission]
        public async Task<IActionResult> GetStaffPayrollSummary(int staffId, [FromQuery] int? year)
        {
            var targetYear = year.GetValueOrDefault(DateTime.UtcNow.Year);
            if (staffId <= 0 || targetYear < 2000)
                return BadRequest(new { Message = "Valid staff ID and year (>= 2000) are required." });

            if (!IsAdminOrHr())
            {
                bool canViewStaff = IsAdminOrHr() || (IsAccountantUser() && await HasStaffPayrollPermissionAsync());
                var callerStaffId = await ResolveCallerStaffIdAsync();

                if (!canViewStaff)
                {
                    if (!callerStaffId.HasValue || callerStaffId.Value <= 0 || callerStaffId.Value != staffId)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new { Message = "You are not authorized to view the payroll summary of other employees." });
                    }
                }
                else
                {
                    if (callerStaffId.HasValue && callerStaffId.Value > 0)
                    {
                        var accountantCampusId = await GetStaffCampusIdAsync(callerStaffId.Value);
                        if (accountantCampusId.HasValue && accountantCampusId.Value > 0)
                        {
                            var targetCampusId = await GetStaffCampusIdAsync(staffId);
                            if (targetCampusId.HasValue && targetCampusId.Value != accountantCampusId.Value)
                            {
                                return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: This staff summary does not belong to your authorized campus." });
                            }
                        }
                    }
                }
            }

            var result = await _payrollService.GetStaffPayrollSummaryAsync(staffId, targetYear);
            return Ok(result);
        }

        // GET: api/v1/payroll/my-summary (Personal summary for logged-in staff member)
        [HttpGet("my-summary")]
        [HttpGet("payslips/my-summary")]
        [BypassPermission]
        public async Task<IActionResult> GetMyPayrollSummary(
            [FromQuery] int? month, [FromQuery] int? year)
        {
            var targetMonth = month.GetValueOrDefault(DateTime.UtcNow.Month);
            var targetYear = year.GetValueOrDefault(DateTime.UtcNow.Year);

            if (targetMonth < 1 || targetMonth > 12 || targetYear < 2000)
                return BadRequest(new { Message = "Valid month (1-12) and year (>= 2000) are required." });

            return await GetPersonalSummaryResultAsync(targetMonth, targetYear);
        }

        // GET: api/v1/payroll/summary?month=9&year=2026
        [HttpGet("summary")]
        [HttpGet("payslips/summary")]
        [BypassPermission]
        public async Task<IActionResult> GetMonthlyPayrollSummary(
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] int? campusId = null,
            [FromQuery] string? scope = null,
            [FromQuery] bool? personal = null)
        {
            var targetMonth = month.GetValueOrDefault(DateTime.UtcNow.Month);
            var targetYear = year.GetValueOrDefault(DateTime.UtcNow.Year);

            if (targetMonth < 1 || targetMonth > 12 || targetYear < 2000)
                return BadRequest(new { Message = "Valid month (1-12) and year (>= 2000) are required." });

            bool isPersonalRequested = personal == true || string.Equals(scope, "personal", StringComparison.OrdinalIgnoreCase);

            if (isPersonalRequested)
            {
                return await GetPersonalSummaryResultAsync(targetMonth, targetYear);
            }

            bool canViewStaff = IsAdminOrHr() || (IsAccountantUser() && await HasStaffPayrollPermissionAsync());

            if (!canViewStaff)
            {
                if (string.Equals(scope, "staff", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied. You do not have permission to view staff-wide payroll summary." });
                }

                // For Accountant or unauthorized staff without explicit scope=staff, return personal summary (never leak campus-wide 74300)
                return await GetPersonalSummaryResultAsync(targetMonth, targetYear);
            }

            var resolvedCampusId = ResolveCampusId(campusId);
            if (resolvedCampusId == CollegeManagement.API.Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Ok(new MonthlyPayrollSummaryDto
                {
                    PayrollMonth = targetMonth,
                    PayrollYear = targetYear
                });
            }

            // Enforce authorized campus scope for Accountant
            if (IsAccountantUser())
            {
                var callerStaffId = await ResolveCallerStaffIdAsync();
                if (callerStaffId.HasValue && callerStaffId.Value > 0)
                {
                    var accountantCampusId = await GetStaffCampusIdAsync(callerStaffId.Value);
                    if (accountantCampusId.HasValue && accountantCampusId.Value > 0)
                    {
                        if (resolvedCampusId.HasValue && resolvedCampusId.Value != accountantCampusId.Value)
                        {
                            return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: You can only view staff payroll summary for your authorized campus." });
                        }
                        resolvedCampusId = accountantCampusId.Value;
                    }
                }
            }

            var result = await _payrollService.GetMonthlyPayrollSummaryAsync(targetMonth, targetYear, resolvedCampusId);
            return Ok(result);
        }

        private async Task<IActionResult> GetPersonalSummaryResultAsync(int targetMonth, int targetYear)
        {
            var callerStaffId = await ResolveCallerStaffIdAsync();
            if (!callerStaffId.HasValue || callerStaffId.Value <= 0)
            {
                return Unauthorized(new { Message = "Staff profile could not be identified from authentication credentials." });
            }

            var allPayslips = await _payrollService.GetPayslipHistoryAsync(
                targetMonth, targetYear, null, null, null);

            var mySlip = allPayslips.FirstOrDefault(p => p.StaffId == callerStaffId.Value);

            if (mySlip != null)
            {
                var summary = new MonthlyPayrollSummaryDto
                {
                    PayrollMonth = targetMonth,
                    PayrollYear = targetYear,
                    TotalPayslips = 1,
                    TotalEmployees = 1,
                    TotalGrossSalary = mySlip.GrossSalary,
                    TotalDeductions = mySlip.TotalDeductions,
                    TotalAdvanceDeductions = 0.00m,
                    TotalNetSalary = mySlip.NetSalary,
                    PaidPayslips = string.Equals(mySlip.PayslipStatus, "Paid", StringComparison.OrdinalIgnoreCase) ? 1 : 0,
                    PendingPayslips = (string.Equals(mySlip.PayslipStatus, "Pending", StringComparison.OrdinalIgnoreCase) || string.Equals(mySlip.PayslipStatus, "Generated", StringComparison.OrdinalIgnoreCase)) ? 1 : 0,
                    OnHoldPayslips = string.Equals(mySlip.PayslipStatus, "On Hold", StringComparison.OrdinalIgnoreCase) ? 1 : 0,

                    // Personal breakdown fields
                    StaffId = mySlip.StaffId,
                    EmployeeId = mySlip.EmployeeId,
                    StaffName = mySlip.StaffName,
                    PayslipStatus = mySlip.PayslipStatus,
                    BasicPay = mySlip.BasicPay,
                    Hra = mySlip.HRA,
                    Da = mySlip.DA,
                    ConveyanceAllowance = mySlip.ConveyanceAllowance,
                    MedicalAllowance = mySlip.MedicalAllowance,
                    OtherAllowance = mySlip.OtherAllowance,
                    Pf = mySlip.PF,
                    ProfessionalTax = mySlip.ProfessionalTax,
                    Tds = mySlip.TDS,
                    Esi = mySlip.ESI,
                    InsuranceOtherDeduction = mySlip.InsuranceOtherDeduction
                };
                return Ok(summary);
            }
            else
            {
                // Check if staff has an active assigned salary structure to show configured salary breakdown
                SalaryStructureDto? assignedStructure = null;
                string? empId = null;
                string? staffName = null;

                try
                {
                    if (_db != null)
                    {
                        var staffObj = await _db.Staffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == callerStaffId.Value);
                        if (staffObj != null)
                        {
                            empId = staffObj.EmployeeId;
                            staffName = $"{staffObj.FirstName} {staffObj.LastName}".Trim();
                        }
                    }

                    var assignments = await _payrollService.GetSalaryAssignmentsAsync(callerStaffId.Value, "Active", null);
                    var activeAssignment = assignments?.FirstOrDefault();
                    if (activeAssignment != null && activeAssignment.SalaryStructureId > 0)
                    {
                        assignedStructure = await _payrollService.GetSalaryStructureByIdAsync(activeAssignment.SalaryStructureId);
                    }
                }
                catch
                {
                    // Fall back gracefully
                }

                var basic = assignedStructure?.BasicPay ?? 0.00m;
                var hra = assignedStructure?.HRA ?? 0.00m;
                var da = assignedStructure?.DA ?? 0.00m;
                var conv = assignedStructure?.ConveyanceAllowance ?? 0.00m;
                var med = assignedStructure?.MedicalAllowance ?? 0.00m;
                var otherAll = assignedStructure?.OtherAllowance ?? 0.00m;
                var pf = assignedStructure?.PF ?? 0.00m;
                var pt = assignedStructure?.ProfessionalTax ?? 0.00m;
                var tds = assignedStructure?.TDS ?? 0.00m;
                var esi = assignedStructure?.ESI ?? 0.00m;
                var ins = assignedStructure?.InsuranceOtherDeduction ?? 0.00m;

                var gross = basic + hra + da + conv + med + otherAll;
                var ded = pf + pt + tds + esi + ins;
                var net = gross - ded;

                var summary = new MonthlyPayrollSummaryDto
                {
                    PayrollMonth = targetMonth,
                    PayrollYear = targetYear,
                    TotalPayslips = 0,
                    TotalEmployees = 0,
                    TotalGrossSalary = gross,
                    TotalDeductions = ded,
                    TotalAdvanceDeductions = 0.00m,
                    TotalNetSalary = net,
                    PaidPayslips = 0,
                    PendingPayslips = 0,
                    OnHoldPayslips = 0,
                    StaffId = callerStaffId.Value,
                    EmployeeId = empId,
                    StaffName = staffName,
                    PayslipStatus = assignedStructure != null ? "Structure Assigned (Not Generated)" : "Not Generated",
                    BasicPay = basic,
                    Hra = hra,
                    Da = da,
                    ConveyanceAllowance = conv,
                    MedicalAllowance = med,
                    OtherAllowance = otherAll,
                    Pf = pf,
                    ProfessionalTax = pt,
                    Tds = tds,
                    Esi = esi,
                    InsuranceOtherDeduction = ins
                };
                return Ok(summary);
            }
        }

        // GET: api/payroll/payslips/10/advance-repayments
        [HttpGet("payslips/{id}/advance-repayments")]
        public async Task<IActionResult> GetAdvanceRepaymentsByPayslip(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { Message = "Valid payslip Id is required." });

            var numericId = await _payrollService.ResolvePayslipIdAsync(id);
            if (!numericId.HasValue)
                return NotFound(new { Message = "Payslip not found." });

            var payslip = await _payrollService.GetPayslipByIdAsync(numericId.Value);
            if (payslip == null)
                return NotFound(new { Message = "Payslip not found." });

            var repayments = await _payrollService.GetAdvanceRepaymentsByPayslipAsync(numericId.Value);
            return Ok(repayments);
        }

    }
}
