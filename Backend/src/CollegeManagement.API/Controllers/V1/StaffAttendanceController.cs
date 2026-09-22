using System;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-attendance")]
    [EnableCors("AllowFrontend")]
    [Authorize(Roles = "Faculty,Admin,Super Admin,HOD")]
    [Produces("application/json")]
    public class StaffAttendanceController : ControllerBase
    {
        private readonly IStaffAttendanceService _service;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        public StaffAttendanceController(
            IStaffAttendanceService service,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
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
        [Authorize(Roles = "Admin,Super Admin,HOD")]
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
    }
}
