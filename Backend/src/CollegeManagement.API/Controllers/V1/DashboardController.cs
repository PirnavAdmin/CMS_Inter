using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Dashboard;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard")]
[EnableCors("AllowFrontend")]
[Produces("application/json")]
[Authorize]
[RequirePermission("dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ICampusAuthorizationService? _campusAuthService;

    public DashboardController(
        IDashboardService dashboardService,
        ICampusAuthorizationService? campusAuthService = null)
    {
        _dashboardService = dashboardService;
        _campusAuthService = campusAuthService;
    }

    /// <summary>
    /// Helper to enforce assigned-campus authorization server-side.
    /// If user is Principal, validates requested campus is assigned in DB; spoofing returns HTTP 403 Forbidden.
    /// If campusId is omitted, automatically resolves and injects principal's assigned primary campus.
    /// Admins retain unrestricted multi-campus selection.
    /// </summary>
    private async Task<(bool Success, int? EffectiveCampusId, IActionResult? ErrorResult)> ValidateAndResolveCampusAsync(
        int? requestedCampusId, 
        CancellationToken ct)
    {
        if (_campusAuthService == null)
        {
            return (true, requestedCampusId, null);
        }

        var access = await _campusAuthService.ResolveCampusAccessAsync(User, requestedCampusId, ct);
        if (!access.IsAuthorized)
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new
            {
                statusCode = StatusCodes.Status403Forbidden,
                success = false,
                message = access.ErrorMessage ?? "Access denied: Unauthorized campus access."
            }));
        }
        return (true, access.EffectiveCampusId, null);
    }

    // =========================================================================
    // 0. PRINCIPAL DASHBOARD SNAPSHOT (/api/v1/dashboard/principal)
    // =========================================================================
    /// <summary>
    /// 0. GET /api/v1/dashboard/principal
    /// Retrieves live, campus-scoped dashboard snapshot for the Principal role, returning identical metric calculations
    /// as the Admin Dashboard for the principal's assigned campus.
    /// Strictly validates that the principal is assigned to the requested campus; cross-campus spoofing returns HTTP 403 Forbidden.
    /// Reuses Admin Dashboard's student & staff attendance formulas, active student counts, KPIs, and schedules.
    /// </summary>
    [HttpGet("principal")]
    [ProducesResponseType(typeof(PrincipalDashboardResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetPrincipalDashboard(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        int effectiveCampusId = campusCheck.EffectiveCampusId ?? (_campusAuthService != null ? await _campusAuthService.GetDefaultCampusIdAsync(ct) : 1);
        var result = await _dashboardService.GetPrincipalDashboardAsync(academicYearId, boardId, date, effectiveCampusId, ct);
        return Ok(result);
    }

    // =========================================================================
    // 0.1. CAMPUS NOTICES & CIRCULARS
    // =========================================================================
    /// <summary>
    /// POST /api/v1/dashboard/notices
    /// Creates a persistent campus notice/circular published by the Principal or Admin.
    /// </summary>
    [HttpPost("notices")]
    [Authorize(Roles = "Principal,Super Admin,Admin")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateNotice(
        [FromBody] CreateCampusNoticeRequest request,
        CancellationToken ct = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { success = false, message = "Notice title and content are required." });
        }

        var campusCheck = await ValidateAndResolveCampusAsync(request.CampusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        request.CampusId = campusCheck.EffectiveCampusId ?? (_campusAuthService != null ? await _campusAuthService.GetDefaultCampusIdAsync(ct) : 1);
        string publisherRole = User.IsInRole("Principal") ? "Principal" : "Admin";

        int noticeId = await _dashboardService.CreateNoticeAsync(request, publisherRole, ct);
        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            noticeId,
            message = "Notice successfully published and saved."
        });
    }

    /// <summary>
    /// GET /api/v1/dashboard/notices
    /// Retrieves active campus notices/circulars.
    /// </summary>
    [HttpGet("notices")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyList<PrincipalNoticeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotices(
        [FromQuery] int? campusId = null,
        [FromQuery] string? targetAudience = null,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        int effectiveCampusId = campusCheck.EffectiveCampusId ?? (_campusAuthService != null ? await _campusAuthService.GetDefaultCampusIdAsync(ct) : 1);
        var notices = await _dashboardService.GetNoticesAsync(effectiveCampusId, targetAudience, limit, ct);
        return Ok(notices);
    }

    // =========================================================================
    // 1. DASHBOARD FILTER OPTIONS (ACADEMIC YEARS & BOARDS)
    // =========================================================================
    /// <summary>
    /// 1. GET /api/v1/dashboard/filters
    /// Retrieves active Academic Years and Boards for global dashboard filtering.
    /// </summary>
    [HttpGet("filters")]
    [ProducesResponseType(typeof(DashboardFilterOptionsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
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
    /// Scoped to the caller's assigned campus for Principals.
    /// </summary>
    [HttpGet("summary")]
    [HttpGet("stats")]
    [ProducesResponseType(typeof(DashboardSummaryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Summary(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetSummaryAsync(academicYearId, boardId, date, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(StudentsOverviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> StudentsOverview(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetStudentsOverviewAsync(academicYearId, boardId, date, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(StudentsOverviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AdmissionTrend(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetAdmissionTrendAsync(academicYearId, boardId, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(GroupDistributionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GroupDistribution(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetGroupDistributionAsync(academicYearId, boardId, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(StudentsAttendanceTodayResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> StudentsAttendanceToday(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] string? viewBy = "Overall",
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetStudentsAttendanceTodayAsync(academicYearId, boardId, viewBy, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(StaffAttendanceTodayResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> StaffAttendanceToday(
        [FromQuery] int? boardId = null,
        [FromQuery] string? staffType = "All Staff",
        [FromQuery] DateTime? date = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetStaffAttendanceTodayAsync(boardId, staffType, date, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(CertificateRequestsSummaryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CertificateRequests(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetCertificateRequestsAsync(academicYearId, boardId, date, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(List<UpcomingExaminationItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpcomingExaminations(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetUpcomingExaminationsAsync(academicYearId, boardId, campusCheck.EffectiveCampusId, ct);
        return Ok(result);
    }

    // =========================================================================
    // 9B. UPCOMING HOLIDAYS & COLLEGE VACATIONS
    // =========================================================================
    /// <summary>
    /// 9B. GET /api/v1/dashboard/upcoming-holidays and /api/v1/dashboard/holidays
    /// Retrieves scheduled and upcoming holidays/vacations with date ranges, duration, and countdown badges.
    /// </summary>
    [HttpGet("upcoming-holidays")]
    [HttpGet("holidays")]
    [ProducesResponseType(typeof(List<UpcomingHolidayItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpcomingHolidays(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int limit = 20,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetUpcomingHolidaysAsync(academicYearId, boardId, limit, campusCheck.EffectiveCampusId, ct);
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
    [ProducesResponseType(typeof(TodaysHighlightsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> TodaysHighlights(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetTodaysHighlightsAsync(academicYearId, boardId, campusCheck.EffectiveCampusId, ct);
        return Ok(result);
    }

    // =========================================================================
    // 11. COMPATIBILITY & TESTER ENDPOINTS
    // =========================================================================
    [HttpGet("weekly-attendance")]
    [ProducesResponseType(typeof(WeeklyAttendanceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> WeeklyAttendance(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetWeeklyAttendanceAsync(academicYearId, boardId, date, startDate, endDate, campusCheck.EffectiveCampusId, ct);
        return Ok(result);
    }

    [HttpGet("recent-activity")]
    [ProducesResponseType(typeof(IReadOnlyList<RecentActivityItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RecentActivity(
        [FromQuery] int limit = 15, 
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        if (campusId.HasValue)
        {
            var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
            if (!campusCheck.Success) return campusCheck.ErrorResult!;
        }

        var result = await _dashboardService.GetRecentActivityAsync(limit, ct);
        return Ok(result);
    }

    [HttpGet("faculty-workload")]
    [ProducesResponseType(typeof(IReadOnlyList<FacultyWorkloadItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> FacultyWorkload(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        var result = await _dashboardService.GetFacultyWorkloadAsync(academicYearId, boardId, campusCheck.EffectiveCampusId, ct);
        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin,Admin")]
    [HttpPost("cache/invalidate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> InvalidateCache([FromQuery] int? campusId = null, CancellationToken ct = default)
    {
        await _dashboardService.InvalidateDashboardCacheAsync(campusId, ct);
        return Ok(new { Message = "Dashboard cache successfully invalidated." });
    }

    [Authorize(Roles = "SuperAdmin,Admin")]
    [HttpGet("test-verify-all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> TestVerifyAll(
        [FromQuery] int? academicYearId = null, 
        [FromQuery] int? boardId = null, 
        [FromQuery] int? campusId = null, 
        CancellationToken ct = default)
    {
        var campusCheck = await ValidateAndResolveCampusAsync(campusId, ct);
        if (!campusCheck.Success) return campusCheck.ErrorResult!;

        int? effectiveCampusId = campusCheck.EffectiveCampusId;

        var filtersRes = await GetFilterOptions(ct) as OkObjectResult;
        var principalRes = await GetPrincipalDashboard(academicYearId, boardId, null, effectiveCampusId, ct) as OkObjectResult;
        var summaryRes = await Summary(academicYearId, boardId, null, effectiveCampusId, ct) as OkObjectResult;
        var overviewRes = await StudentsOverview(academicYearId, boardId, null, effectiveCampusId, ct) as OkObjectResult;
        var groupRes = await GroupDistribution(academicYearId, boardId, effectiveCampusId, ct) as OkObjectResult;
        var stdAttRes = await StudentsAttendanceToday(academicYearId, boardId, "Overall", effectiveCampusId, ct) as OkObjectResult;
        var stfAttRes = await StaffAttendanceToday(boardId, "All Staff", null, effectiveCampusId, ct) as OkObjectResult;
        var certRes = await CertificateRequests(academicYearId, boardId, null, effectiveCampusId, ct) as OkObjectResult;
        var examRes = await UpcomingExaminations(academicYearId, boardId, effectiveCampusId, ct) as OkObjectResult;
        var highlightsRes = await TodaysHighlights(academicYearId, boardId, effectiveCampusId, ct) as OkObjectResult;
        var weeklyAttRes = await WeeklyAttendance(academicYearId, boardId, null, null, null, effectiveCampusId, ct) as OkObjectResult;

        return Ok(new
        {
            Status = "All Dashboard APIs Executed & Verified Cleanly",
            FiltersStatus = filtersRes?.StatusCode ?? 500,
            PrincipalDashboardStatus = principalRes?.StatusCode ?? 500,
            PrincipalDashboard = principalRes?.Value,
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
