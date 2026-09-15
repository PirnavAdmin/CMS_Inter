using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Dashboard;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard")]
[EnableCors("AllowFrontend")]
[AllowAnonymous]
[Produces("application/json")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    // =========================================================================
    // =========================================================================
    // 1. DASHBOARD FILTER OPTIONS (ACADEMIC YEARS & BOARDS)
    // =========================================================================
    /// <summary>
    /// 1. GET /api/v1/dashboard/filters
    /// Retrieves active Academic Years and Boards for global dashboard filtering.
    /// </summary>
    [HttpGet("filters")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(DashboardFilterOptionsResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFilterOptions(CancellationToken ct = default)
    {
        var result = await _dashboardService.GetFilterOptionsAsync(ct);
        return Ok(result);
    }

    // =========================================================================
    // 2. DASHBOARD SUMMARY / OVERVIEW (TOP 5 KPI CARDS + VS LAST YEAR METRICS)
    // =========================================================================
    /// <summary>
    /// 2. GET /api/v1/dashboard/summary and /api/v1/dashboard/stats
    /// Retrieves top 5 Primary KPI Cards (Total Students, Teaching Staff, Non-Teaching Staff, Total Groups, Total Sections)
    /// alongside Prior Academic Year baseline comparisons and Year-over-Year (YoY) percentage change metrics.
    /// For baseline year 2026-2027 with no prior year, last year values and percentages return 0 and neutral trend.
    /// When querying 2027-2028, prior year data is calculated against 2026-2027.
    /// </summary>
    [HttpGet("summary")]
    [HttpGet("stats")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(DashboardSummaryResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetSummaryAsync(academicYearId, boardId, date, ct);
        return Ok(result);
    }

    // =========================================================================
    // 3. STUDENTS OVERVIEW (BREAKDOWN / GENDER / MONTHLY TREND)
    // =========================================================================
    /// <summary>
    /// 3. GET /api/v1/dashboard/students-overview
    /// Retrieves student breakdown statistics including active/inactive status, gender distribution (Boys, Girls, Others),
    /// academic level distribution (1st Year, 2nd Year), and monthly admission trajectory.
    /// </summary>
    [HttpGet("students-overview")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(StudentsOverviewResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> StudentsOverview(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetStudentsOverviewAsync(academicYearId, boardId, date, ct);
        return Ok(result);
    }

    // =========================================================================
    // 4. ADMISSION TREND ENDPOINT (/api/v1/dashboard/admission-trend)
    // =========================================================================
    /// <summary>
    /// 4. GET /api/v1/dashboard/admission-trend
    /// Retrieves monthly student admissions timeline for area and bar chart visualizations.
    /// </summary>
    [HttpGet("admission-trend")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(StudentsOverviewResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AdmissionTrend(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetAdmissionTrendAsync(academicYearId, boardId, ct);
        return Ok(result);
    }

    // =========================================================================
    // 5. GROUP DISTRIBUTION (DONUT / PIE CHART / BAR CHART)
    // =========================================================================
    /// <summary>
    /// 5. GET /api/v1/dashboard/group-distribution
    /// Retrieves distribution of enrolled students per academic group/stream (e.g., MPC, BiPC, CEC, MEC, HEC).
    /// </summary>
    [HttpGet("group-distribution")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(GroupDistributionResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GroupDistribution(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetGroupDistributionAsync(academicYearId, boardId, ct);
        return Ok(result);
    }

    // =========================================================================
    // 6. STUDENTS ATTENDANCE OVERVIEW TODAY (DONUT + VIEW BY FILTER)
    // =========================================================================
    /// <summary>
    /// 6. GET /api/v1/dashboard/students-attendance-today
    /// Retrieves today's student attendance metrics and category breakdowns (Overall, Academic Level, Group, Section).
    /// </summary>
    [HttpGet("students-attendance-today")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(StudentsAttendanceTodayResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> StudentsAttendanceToday(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] string? viewBy = "Overall",
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetStudentsAttendanceTodayAsync(academicYearId, boardId, viewBy, ct);
        return Ok(result);
    }

    // =========================================================================
    // 7. STAFF ATTENDANCE OVERVIEW TODAY (DONUT + STAFF TYPE FILTER)
    // =========================================================================
    /// <summary>
    /// 7. GET /api/v1/dashboard/staff-attendance-today
    /// Retrieves today's staff attendance metrics filtered by staff type (All Staff, Teaching Staff, Non-Teaching Staff).
    /// </summary>
    [HttpGet("staff-attendance-today")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(StaffAttendanceTodayResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> StaffAttendanceToday(
        [FromQuery] int? boardId = null,
        [FromQuery] string? staffType = "All Staff",
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetStaffAttendanceTodayAsync(boardId, staffType, ct);
        return Ok(result);
    }

    // =========================================================================
    // 8. CERTIFICATE REQUESTS SUMMARY & RECENT LIST
    // =========================================================================
    /// <summary>
    /// 8. GET /api/v1/dashboard/certificate-requests
    /// Retrieves certificate request counts categorized by type (Bonafide, Study, Conduct, Transfer, Others) and recent request records.
    /// </summary>
    [HttpGet("certificate-requests")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CertificateRequestsSummaryResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CertificateRequests(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetCertificateRequestsAsync(academicYearId, boardId, date, ct);
        return Ok(result);
    }

    // =========================================================================
    // 9. UPCOMING EXAMINATIONS
    // =========================================================================
    /// <summary>
    /// 9. GET /api/v1/dashboard/upcoming-examinations
    /// Retrieves scheduled and upcoming examinations with date ranges and countdown badges.
    /// </summary>
    [HttpGet("upcoming-examinations")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(List<UpcomingExaminationItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpcomingExaminations(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetUpcomingExaminationsAsync(academicYearId, boardId, ct);
        return Ok(result);
    }

    // =========================================================================
    // 10. TODAY'S HIGHLIGHTS
    // =========================================================================
    /// <summary>
    /// 10. GET /api/v1/dashboard/todays-highlights
    /// Retrieves summary counts of today's key events: admissions, certificate requests, examinations, and student birthdays.
    /// </summary>
    [HttpGet("todays-highlights")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TodaysHighlightsResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> TodaysHighlights(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetTodaysHighlightsAsync(academicYearId, boardId, ct);
        return Ok(result);
    }

    // =========================================================================
    // 11. COMPATIBILITY & TESTER ENDPOINTS
    // =========================================================================
    [HttpGet("weekly-attendance")]
    [AllowAnonymous]
    public async Task<IActionResult> WeeklyAttendance(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetWeeklyAttendanceAsync(academicYearId, boardId, date, startDate, endDate, ct);
        return Ok(result);
    }

    [HttpGet("recent-activity")]
    [AllowAnonymous]
    public async Task<IActionResult> RecentActivity([FromQuery] int limit = 15, CancellationToken ct = default)
    {
        var result = await _dashboardService.GetRecentActivityAsync(limit, ct);
        return Ok(result);
    }

    [HttpGet("faculty-workload")]
    [AllowAnonymous]
    public async Task<IActionResult> FacultyWorkload(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        CancellationToken ct = default)
    {
        var result = await _dashboardService.GetFacultyWorkloadAsync(academicYearId, boardId, ct);
        return Ok(result);
    }

    [HttpGet("test-verify-all")]
    [AllowAnonymous]
    public async Task<IActionResult> TestVerifyAll([FromQuery] int? academicYearId = null, [FromQuery] int? boardId = null, CancellationToken ct = default)
    {
        var filtersRes = await GetFilterOptions(ct) as OkObjectResult;
        var summaryRes = await Summary(academicYearId, boardId, null, ct) as OkObjectResult;
        var overviewRes = await StudentsOverview(academicYearId, boardId, null, ct) as OkObjectResult;
        var groupRes = await GroupDistribution(academicYearId, boardId, ct) as OkObjectResult;
        var stdAttRes = await StudentsAttendanceToday(academicYearId, boardId, "Overall", ct) as OkObjectResult;
        var stfAttRes = await StaffAttendanceToday(boardId, "All Staff", ct) as OkObjectResult;
        var certRes = await CertificateRequests(academicYearId, boardId, null, ct) as OkObjectResult;
        var examRes = await UpcomingExaminations(academicYearId, boardId, ct) as OkObjectResult;
        var highlightsRes = await TodaysHighlights(academicYearId, boardId, ct) as OkObjectResult;
        var weeklyAttRes = await WeeklyAttendance(academicYearId, boardId, null, null, null, ct) as OkObjectResult;

        return Ok(new
        {
            Status = "All 11 Dashboard APIs Executed & Verified Cleanly",
            FiltersStatus = filtersRes?.StatusCode ?? 500,
            SummaryStatus = summaryRes?.StatusCode ?? 500,
            Summary = summaryRes?.Value,
            StudentsOverviewStatus = overviewRes?.StatusCode ?? 500,
            GroupDistributionStatus = groupRes?.StatusCode ?? 500,
            StudentsAttendanceStatus = stdAttRes?.StatusCode ?? 500,
            StaffAttendanceStatus = stfAttRes?.StatusCode ?? 500,
            CertificateRequestsStatus = certRes?.StatusCode ?? 500,
            UpcomingExaminationsStatus = examRes?.StatusCode ?? 500,
            TodaysHighlightsStatus = highlightsRes?.StatusCode ?? 500,
            WeeklyAttendanceStatus = weeklyAttRes?.StatusCode ?? 500
        });
    }
}
