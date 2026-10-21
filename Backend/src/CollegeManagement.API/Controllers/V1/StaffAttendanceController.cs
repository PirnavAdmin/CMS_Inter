using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-attendance")]
    [Authorize]
    [CollegeManagement.API.Filters.RequirePermission("staff-attendance")]
    [Produces("application/json")]
    public class StaffAttendanceController : ControllerBase
    {
        private readonly IStaffAttendanceService _service;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;
        private readonly AppDbContext? _context;

        public StaffAttendanceController(
            IStaffAttendanceService service,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper,
            AppDbContext? context = null)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
            _context = context;
        }

        /// <summary>
        /// Loads staff members for specified Date, Department, and StaffType (Teaching / Non-Teaching).
        /// </summary>
        [HttpPost("load")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> LoadStaff([FromBody] LoadStaffAttendanceRequest request)
        {
            var result = await _service.LoadStaffAttendanceAsync(request);
            return Ok(new { Status = true, Message = "Staff list loaded successfully.", Data = result });
        }

        /// <summary>
        /// Bulk saves/submits staff attendance records.
        /// </summary>
        [HttpPost("bulk")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> BulkSave([FromBody] BulkSaveStaffAttendanceRequest request)
        {
            var userId = GetCurrentUserId();
            var count = await _service.BulkSaveStaffAttendanceAsync(request, userId);
            return Ok(new { Status = true, Message = $"Staff attendance saved successfully for {count} members.", Data = count });
        }

        /// <summary>
        /// Updates a single staff attendance record.
        /// </summary>
        [HttpPut("update")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateStaffAttendance([FromBody] UpdateStaffAttendanceRequest request)
        {
            var userId = GetCurrentUserId();
            await _service.UpdateStaffAttendanceAsync(request, userId);
            return Ok(new { Status = true, Message = "Staff attendance updated successfully.", Data = true });
        }

        /// <summary>
        /// Retrieves staff details for the Staff Details popup modal.
        /// </summary>
        [HttpGet("staff/{facultyId}/details")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffDetails(int facultyId, [FromQuery] DateTime date)
        {
            var result = await _service.GetStaffDetailsAsync(facultyId, date);
            if (result == null)
            {
                return NotFound(new { Status = false, Message = $"Staff member with ID {facultyId} not found." });
            }
            return Ok(new { Status = true, Message = "Staff details retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Generates Staff Monthly Calendar Matrix Grid Report via GET query string.
        /// </summary>
        [HttpGet("monthly-report")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffMonthlyReportGridGet([FromQuery] StaffMonthlyReportRequest request)
        {
            var result = await _service.GetStaffMonthlyReportGridAsync(request);
            return Ok(new { Status = true, Message = "Staff monthly report grid generated successfully.", Data = result });
        }

        /// <summary>
        /// Generates Staff Monthly Calendar Matrix Grid Report via POST body.
        /// </summary>
        [HttpPost("monthly-report")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffMonthlyReportGrid([FromBody] StaffMonthlyReportRequest request)
        {
            var result = await _service.GetStaffMonthlyReportGridAsync(request);
            return Ok(new { Status = true, Message = "Staff monthly report grid generated successfully.", Data = result });
        }

        /// <summary>
        /// Exports Staff Monthly Calendar Matrix Report to CSV format.
        /// </summary>
        [HttpGet("monthly-report/export/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ExportStaffMonthlyCsv([FromQuery] StaffMonthlyReportRequest request)
        {
            var bytes = await _service.ExportStaffMonthlyReportToCsvAsync(request);
            return File(bytes, "text/csv", $"StaffMonthlyReport_{request.StaffType?.ToString() ?? "All"}_{request.Year}_{request.Month:D2}.csv");
        }

        /// <summary>
        /// Exports Staff Monthly Calendar Matrix Report to Excel format.
        /// </summary>
        [HttpGet("monthly-report/export/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ExportStaffMonthlyExcel([FromQuery] StaffMonthlyReportRequest request)
        {
            var bytes = await _service.ExportStaffMonthlyReportToExcelAsync(request);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"StaffMonthlyReport_{request.StaffType?.ToString() ?? "All"}_{request.Year}_{request.Month:D2}.xlsx");
        }

        [HttpGet("staff/{staffId}/yearly-overview")]
        [ProducesResponseType(typeof(CollegeManagement.API.DTOs.Attendance.Responses.YearlyOverviewResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffYearlyOverview(int staffId, [FromQuery] int academicYearId)
        {
            var result = await _service.GetStaffYearlyOverviewAsync(staffId, academicYearId);
            return Ok(result);
        }

        /// <summary>
        /// Downloads the Excel import template for Staff Attendance.
        /// </summary>
        [HttpGet("import/template")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadImportTemplate()
        {
            var bytes = await _service.GenerateImportTemplateAsync();
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "StaffAttendance_Template.xlsx");
        }

        /// <summary>
        /// Imports staff attendance records from an uploaded Excel file.
        /// </summary>
        [HttpPost("import/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ImportExcel(IFormFile file, [FromQuery] bool validateOnly = false)
        {
            if (file == null || file.Length == 0) return BadRequest("File is empty or not provided.");
            using var ms = new System.IO.MemoryStream();
            await file.CopyToAsync(ms);

            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var isAdmin = IsCurrentUserAdmin();

            var result = await _service.ImportStaffAttendanceFromExcelAsync(ms.ToArray(), validateOnly, isAdmin, userName, userId);
            return Ok(result);
        }

        private int GetCurrentUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new CollegeManagement.API.Exceptions.UnauthorizedException("User is not authenticated or user identifier claim is missing/invalid.");
            }
            return userId.Value;
        }
        private string GetCurrentUserName()
        {
            var userName = User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(userName))
            {
                userName = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            }
            if (string.IsNullOrEmpty(userName))
            {
                return "System Admin";
            }
            return userName;
        }

        private bool IsCurrentUserAdmin()
        {
            return User?.IsInRole("Admin") == true || User?.IsInRole("Super Admin") == true || User?.IsInRole("College Admin") == true;
        }

        private async Task<int> ResolveStaffIdAsync()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId.HasValue && staffId.Value > 0)
            {
                return staffId.Value;
            }

            var userId = _jwtTokenHelper.GetUserId(User);
            if (userId.HasValue && userId.Value > 0 && _context != null)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId.Value);
                if (user?.StaffId.HasValue == true && user.StaffId.Value > 0)
                {
                    return user.StaffId.Value;
                }

                if (!string.IsNullOrEmpty(user?.Email))
                {
                    var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Email == user.Email && !s.IsDeleted);
                    if (staff != null)
                    {
                        if (user != null && !user.StaffId.HasValue)
                        {
                            user.StaffId = staff.Id;
                            await _context.SaveChangesAsync();
                        }
                        return staff.Id;
                    }
                }

                // Auto-provision if Admin
                if (IsCurrentUserAdmin() && user != null)
                {
                    var campusId = await _context.Campuses.Select(c => c.CampusId).FirstOrDefaultAsync();
                    if (campusId <= 0) campusId = 1;

                    var names = (user.FullName ?? "Administrator").Split(' ');
                    var firstName = names[0];
                    var lastName = names.Length > 1 ? string.Join(" ", names.Skip(1)) : "Admin";

                    var newStaff = new CollegeManagement.API.Models.Staff.Staff
                    {
                        EmployeeId = $"ADM{user.UserId:D3}",
                        FirstName = firstName,
                        LastName = lastName,
                        Email = string.IsNullOrWhiteSpace(user.Email) ? $"admin{user.UserId}@college.local" : user.Email,
                        Mobile = string.IsNullOrWhiteSpace(user.PhoneNumber) ? "9876543210" : user.PhoneNumber,
                        Gender = "Other",
                        DateOfBirth = new DateTime(1985, 1, 1),
                        Qualification = "Master's Degree",
                        Designation = "Administrator",
                        StaffType = "Non-Teaching",
                        DepartmentId = 5,
                        CampusId = campusId,
                        JoiningDate = DateTime.UtcNow,
                        Status = "Active",
                        Nationality = "Indian",
                        Country = "India",
                        EmploymentType = "Full Time",
                        ProfileStatus = "Approved",
                        ProfileCompletionPercentage = 100,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Staffs.Add(newStaff);
                    await _context.SaveChangesAsync();

                    user.StaffId = newStaff.Id;
                    await _context.SaveChangesAsync();

                    var hasBalance = await _context.StaffLeaveBalances.AnyAsync(b => b.StaffId == newStaff.Id);
                    if (!hasBalance)
                    {
                        var activeYear = await _context.AcademicYears.Select(y => y.AcademicYearId).FirstOrDefaultAsync();
                        if (activeYear <= 0) activeYear = 1;

                        _context.StaffLeaveBalances.AddRange(
                            new CollegeManagement.API.Models.StaffLeaveBalance { StaffId = newStaff.Id, LeaveType = CollegeManagement.API.Enums.LeaveType.Casual, AcademicYearId = activeYear, TotalDays = 15m, UsedDays = 0m, RemainingDays = 15m },
                            new CollegeManagement.API.Models.StaffLeaveBalance { StaffId = newStaff.Id, LeaveType = CollegeManagement.API.Enums.LeaveType.Sick, AcademicYearId = activeYear, TotalDays = 10m, UsedDays = 0m, RemainingDays = 10m },
                            new CollegeManagement.API.Models.StaffLeaveBalance { StaffId = newStaff.Id, LeaveType = CollegeManagement.API.Enums.LeaveType.Earned, AcademicYearId = activeYear, TotalDays = 10m, UsedDays = 0m, RemainingDays = 10m }
                        );
                        await _context.SaveChangesAsync();
                    }

                    return newStaff.Id;
                }
            }

            throw new CollegeManagement.API.Exceptions.UnauthorizedException("Logged in user is not associated with an active staff or faculty record.");
        }

        #region Self-Service My Attendance Endpoints

        /// <summary>
        /// Retrieves today's punch status and shift information for the logged-in staff member.
        /// </summary>
        [HttpGet("my-today")]
        [BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceTodayResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyTodayStatus()
        {
            var staffId = await ResolveStaffIdAsync();
            var result = await _service.GetMyTodayStatusAsync(staffId, DateTime.Today);
            return Ok(new { Status = true, Message = "Today attendance status retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Records check-in (punch in) timestamp for the logged-in staff member.
        /// </summary>
        [HttpPost("punch-in")]
        [BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceTodayResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> PunchIn([FromBody] StaffPunchRequest request)
        {
            var staffId = await ResolveStaffIdAsync();
            var userId = _jwtTokenHelper.GetUserId(User);
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            try
            {
                var result = await _service.PunchInAsync(staffId, request, clientIp, userId);
                return Ok(new { Status = true, Message = "Checked in successfully.", Data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Records check-out (punch out) timestamp for the logged-in staff member.
        /// </summary>
        [HttpPost("punch-out")]
        [BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceTodayResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> PunchOut([FromBody] StaffPunchRequest request)
        {
            var staffId = await ResolveStaffIdAsync();
            var userId = _jwtTokenHelper.GetUserId(User);
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            try
            {
                var result = await _service.PunchOutAsync(staffId, request, clientIp, userId);
                return Ok(new { Status = true, Message = "Punched out successfully.", Data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves personal attendance logs and analytics metrics for the requested period (week, last_week, month, last_month).
        /// </summary>
        [HttpGet("my-history")]
        [BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceHistoryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyAttendanceHistory([FromQuery] string period = "week")
        {
            var staffId = await ResolveStaffIdAsync();
            var result = await _service.GetMyAttendanceHistoryAsync(staffId, period, DateTime.Today);
            return Ok(new { Status = true, Message = "Attendance history retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Submits an attendance regularization request for missing punch, late arrival, or official on-duty.
        /// </summary>
        [HttpPost("regularize")]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> SubmitRegularization([FromBody] SubmitRegularizationRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var staffId = await ResolveStaffIdAsync();
            var userId = _jwtTokenHelper.GetUserId(User);

            try
            {
                var success = await _service.SubmitRegularizationAsync(staffId, request, userId);
                return Ok(new { Status = true, Message = "Attendance regularization submitted successfully and is pending approval.", Data = success });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves pending/all regularization requests for review by Admin/Principal.
        /// </summary>
        [HttpGet("regularizations")]
        [ProducesResponseType(typeof(IEnumerable<RegularizationItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRegularizations([FromQuery] string? status, [FromQuery] int? departmentId)
        {
            var list = await _service.GetRegularizationsAsync(status, departmentId);
            return Ok(new { Status = true, Message = "Regularization requests loaded successfully.", Data = list });
        }

        /// <summary>
        /// Approves or rejects a staff attendance regularization request.
        /// </summary>
        [HttpPut("regularizations/{id:int}/review")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ReviewRegularization(int id, [FromBody] ReviewRegularizationRequest request)
        {
            var reviewerUserId = _jwtTokenHelper.GetUserId(User);
            try
            {
                var success = await _service.ReviewRegularizationAsync(id, request, reviewerUserId);
                return Ok(new { Status = true, Message = $"Regularization {request.Status.ToLowerInvariant()} successfully.", Data = success });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Status = false, Message = ex.Message });
            }
        }

        #endregion
    }
}
