using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/reports")]
[EnableCors("AllowFrontend")]
[Authorize]
[Produces("application/json")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IReportService _reportService;

    public ReportsController(AppDbContext db, IReportService reportService)
    {
        _db = db;
        _reportService = reportService;
    }

    // =========================================================================
    // 1. FILTER DROPDOWNS
    // =========================================================================

    [HttpGet("filters/boards")]
    public async Task<IActionResult> GetBoards(CancellationToken ct = default)
    {
        var result = await _db.Boards
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.BoardName)
            .Select(x => new
            {
                id = x.BoardId,
                boardId = x.BoardId,
                name = x.BoardName,
                boardName = x.BoardName,
                code = x.BoardCode
            })
            .ToListAsync(ct);

        return Ok(result);
    }

    [HttpGet("filters/academic-years")]
    public async Task<IActionResult> GetAcademicYears(CancellationToken ct = default)
    {
        var result = await _db.AcademicYears
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.StartDate)
            .Select(x => new
            {
                id = x.AcademicYearId,
                academicYearId = x.AcademicYearId,
                name = x.AcademicYearName,
                academicYearName = x.AcademicYearName,
                startDate = x.StartDate,
                endDate = x.EndDate
            })
            .ToListAsync(ct);

        return Ok(result);
    }

    [HttpGet("filters/academic-levels")]
    public async Task<IActionResult> GetAcademicLevels([FromQuery] int? boardId = null, CancellationToken ct = default)
    {
        IQueryable<AcademicLevel> query = _db.AcademicLevels.AsNoTracking().Where(x => x.IsActive);

        if (boardId.HasValue && boardId.Value > 0)
        {
            query = query.Where(level =>
                _db.BoardAcademicLevels.Any(map =>
                    map.BoardId == boardId.Value &&
                    map.AcademicLevelId == level.AcademicLevelId &&
                    map.IsActive));
        }

        var result = await query
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.LevelName)
            .Select(x => new
            {
                id = x.AcademicLevelId,
                academicLevelId = x.AcademicLevelId,
                name = x.LevelName,
                levelName = x.LevelName,
                code = x.LevelCode
            })
            .ToListAsync(ct);

        if (!result.Any())
        {
            result = await _db.AcademicLevels.AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.LevelName)
                .Select(x => new
                {
                    id = x.AcademicLevelId,
                    academicLevelId = x.AcademicLevelId,
                    name = x.LevelName,
                    levelName = x.LevelName,
                    code = x.LevelCode
                })
                .ToListAsync(ct);
        }

        return Ok(result);
    }

    [HttpGet("filters/groups")]
    public async Task<IActionResult> GetGroups(
        [FromQuery] int? boardId = null,
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? academicLevelId = null,
        CancellationToken ct = default)
    {
        var query = _db.Groups.AsNoTracking().Where(x => x.IsActive);

        if (academicYearId.HasValue && academicYearId.Value > 0)
            query = query.Where(x => x.AcademicYearId == academicYearId.Value);

        if (academicLevelId.HasValue && academicLevelId.Value > 0)
            query = query.Where(x => x.AcademicLevelId == academicLevelId.Value);

        if (boardId.HasValue && boardId.Value > 0)
        {
            query = query.Where(x =>
                x.BoardId == boardId.Value
                || _db.Sections.Any(s => s.IsActive && s.GroupId == x.GroupId && s.BoardId == boardId.Value)
                || _db.StudentAdmissions.Any(a => a.IsActive && a.GroupId == x.GroupId && a.BoardId == boardId.Value));
        }

        var result = await query
            .OrderBy(x => x.GroupName)
            .Select(x => new
            {
                id = x.GroupId,
                groupId = x.GroupId,
                name = x.GroupName,
                groupName = x.GroupName,
                code = x.GroupCode,
                groupCode = x.GroupCode,
                academicYearId = x.AcademicYearId,
                academicLevel = x.AcademicLevelNavigation != null ? x.AcademicLevelNavigation.LevelName : string.Empty,
                board = x.BoardNavigation != null ? x.BoardNavigation.BoardName : string.Empty
            })
            .ToListAsync(ct);

        if (!result.Any())
        {
            result = await _db.Groups.AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.GroupName)
                .Select(x => new
                {
                    id = x.GroupId,
                    groupId = x.GroupId,
                    name = x.GroupName,
                    groupName = x.GroupName,
                    code = x.GroupCode,
                    groupCode = x.GroupCode,
                    academicYearId = x.AcademicYearId,
                    academicLevel = x.AcademicLevelNavigation != null ? x.AcademicLevelNavigation.LevelName : string.Empty,
                    board = x.BoardNavigation != null ? x.BoardNavigation.BoardName : string.Empty
                })
                .ToListAsync(ct);
        }

        return Ok(result);
    }

    [HttpGet("filters/sections")]
    public async Task<IActionResult> GetSections(
        [FromQuery] int? groupId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? academicLevelId = null,
        CancellationToken ct = default)
    {
        var query = _db.Sections.AsNoTracking().Where(x => x.IsActive);

        if (groupId.HasValue && groupId.Value > 0)
            query = query.Where(x => x.GroupId == groupId.Value);

        if (academicYearId.HasValue && academicYearId.Value > 0)
            query = query.Where(x => x.AcademicYearId == academicYearId.Value);

        if (boardId.HasValue && boardId.Value > 0)
        {
            query = query.Where(x => x.BoardId == boardId.Value || x.BoardId == null || _db.StudentAdmissions.Any(a => a.IsActive && a.SectionId == x.SectionId && a.BoardId == boardId.Value));
        }

        if (academicLevelId.HasValue && academicLevelId.Value > 0)
        {
            query = query.Where(x => x.AcademicLevelId == academicLevelId.Value || x.AcademicLevelId == null);
        }

        var result = await query
            .OrderBy(x => x.SectionName)
            .Select(x => new
            {
                id = x.SectionId,
                sectionId = x.SectionId,
                name = x.SectionName,
                sectionName = x.SectionName,
                groupId = x.GroupId,
                groupName = x.GroupNavigation != null ? x.GroupNavigation.GroupName : string.Empty,
                boardId = x.BoardId,
                board = x.BoardNavigation != null ? x.BoardNavigation.BoardName : string.Empty,
                academicYearId = x.AcademicYearId,
                academicLevel = x.AcademicLevelNavigation != null ? x.AcademicLevelNavigation.LevelName : string.Empty,
                maximumStrength = x.MaximumStrength
            })
            .ToListAsync(ct);

        if (!result.Any() && groupId.HasValue && groupId.Value > 0)
        {
            result = await _db.Sections.AsNoTracking()
                .Where(x => x.IsActive && x.GroupId == groupId.Value)
                .OrderBy(x => x.SectionName)
                .Select(x => new
                {
                    id = x.SectionId,
                    sectionId = x.SectionId,
                    name = x.SectionName,
                    sectionName = x.SectionName,
                    groupId = x.GroupId,
                    groupName = x.GroupNavigation != null ? x.GroupNavigation.GroupName : string.Empty,
                    boardId = x.BoardId,
                    board = x.BoardNavigation != null ? x.BoardNavigation.BoardName : string.Empty,
                    academicYearId = x.AcademicYearId,
                    academicLevel = x.AcademicLevelNavigation != null ? x.AcademicLevelNavigation.LevelName : string.Empty,
                    maximumStrength = x.MaximumStrength
                })
                .ToListAsync(ct);
        }

        if (!result.Any())
        {
            result = await _db.Sections.AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.SectionName)
                .Select(x => new
                {
                    id = x.SectionId,
                    sectionId = x.SectionId,
                    name = x.SectionName,
                    sectionName = x.SectionName,
                    groupId = x.GroupId,
                    groupName = x.GroupNavigation != null ? x.GroupNavigation.GroupName : string.Empty,
                    boardId = x.BoardId,
                    board = x.BoardNavigation != null ? x.BoardNavigation.BoardName : string.Empty,
                    academicYearId = x.AcademicYearId,
                    academicLevel = x.AcademicLevelNavigation != null ? x.AcademicLevelNavigation.LevelName : string.Empty,
                    maximumStrength = x.MaximumStrength
                })
                .ToListAsync(ct);
        }

        return Ok(result);
    }

    // =========================================================================
    // 2. OVERVIEW / DASHBOARD METRICS (10 CARDS)
    // =========================================================================

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.DashboardAsync(filter, ct);
        return Ok(data);
    }

    // =========================================================================
    // 3. 10+ DETAILED REPORT QUERIES (FULL RECORDS + COUNTS)
    // =========================================================================

    // 1. Admissions Details
    [HttpGet("details/admissions")]
    public async Task<IActionResult> AdmissionsDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.AdmissionsAsync(filter, ct);
        var approved = data.Count(x => x.IsApproved || string.Equals(x.Status, "Approved", StringComparison.OrdinalIgnoreCase));
        var rejected = data.Count(x => x.IsRejected || string.Equals(x.Status, "Rejected", StringComparison.OrdinalIgnoreCase));
        var pending = data.Count(x => (!x.IsApproved && !x.IsRejected) || string.Equals(x.Status, "Pending", StringComparison.OrdinalIgnoreCase));

        return Ok(new
        {
            total = data.Count,
            approved,
            rejected,
            pending,
            details = data
        });
    }

    // 2. Attendance Details
    [HttpGet("details/attendance")]
    public async Task<IActionResult> AttendanceDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.AttendanceAsync(filter, ct);
        var totalPresent = data.Sum(x => x.Present);
        var totalAbsent = data.Sum(x => x.Absent);
        var totalLate = data.Sum(x => x.Late);
        var totalLeave = data.Sum(x => x.Leave);
        return Ok(new
        {
            totalDays = data.Count,
            totalRecords = data.Count,
            totalPresent,
            totalAbsent,
            totalLate,
            totalLeave,
            overallPercentage = data.Any() ? Math.Round(data.Average(x => (double)x.AttendancePercentage), 2) : 0,
            details = data
        });
    }

    // 3. Staff Attendance Details
    [HttpGet("details/staff-attendance")]
    [HttpGet("details/faculty-attendance")]
    public async Task<IActionResult> FacultyAttendanceDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.FacultyAttendanceAsync(filter, ct);
        var avgPct = data.Any() ? Math.Round(data.Average(x => (double)x.AttendancePercentage), 2) : 0;
        return Ok(new
        {
            totalFaculty = data.Count,
            averageAttendancePercentage = avgPct,
            details = data
        });
    }

    // 4. Fee Collection Details
    [HttpGet("details/fee-collection")]
    public async Task<IActionResult> FeeCollectionDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.FeeCollectionAsync(filter, ct);
        var totalCollected = data.Sum(x => x.PaidAmount > 0 ? x.PaidAmount : x.Collected);
        var totalDiscount = data.Sum(x => x.Discount);
        var totalFine = data.Sum(x => x.Fine);
        return Ok(new
        {
            totalCollected,
            totalDiscount,
            totalFine,
            transactions = data.Count,
            totalTransactions = data.Count,
            details = data
        });
    }

    // 5. Due Fees Details
    [HttpGet("details/due-fees")]
    [HttpGet("details/outstanding-fees")]
    public async Task<IActionResult> DueFeesDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.OutstandingFeesAsync(filter, ct);
        var totalDue = data.Sum(x => x.DueAmount);
        var totalFee = data.Sum(x => x.TotalAmount);
        var totalPaid = data.Sum(x => x.PaidAmount);
        return Ok(new
        {
            totalDue,
            totalFeeAmount = totalFee,
            totalPaidAmount = totalPaid,
            studentsWithDue = data.Count,
            totalStudentsWithDue = data.Count,
            details = data
        });
    }

    // 6. Examinations Details
    [HttpGet("details/examinations")]
    public async Task<IActionResult> ExaminationsDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.ExaminationsAsync(filter, ct);
        var completed = data.Count(x => string.Equals(x.Status, "Completed", StringComparison.OrdinalIgnoreCase) || string.Equals(x.Status, "Published", StringComparison.OrdinalIgnoreCase));
        var upcoming = data.Count(x => string.Equals(x.Status, "Upcoming", StringComparison.OrdinalIgnoreCase) || string.Equals(x.Status, "Scheduled", StringComparison.OrdinalIgnoreCase));
        var pendingEvaluation = data.Count(x => string.Equals(x.Status, "Pending Evaluation", StringComparison.OrdinalIgnoreCase) || string.Equals(x.Status, "Ongoing", StringComparison.OrdinalIgnoreCase));
        return Ok(new
        {
            totalExams = data.Count,
            total = data.Count,
            completed,
            upcoming,
            pendingEvaluation,
            details = data,
            items = data
        });
    }

    // 7. Results Published Details
    [HttpGet("details/results")]
    public async Task<IActionResult> ResultsDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.ResultsAsync(filter, ct);
        var passed = data.Count(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase));
        var failed = data.Count(x => string.Equals(x.ResultStatus, "Fail", StringComparison.OrdinalIgnoreCase) || string.Equals(x.ResultStatus, "Failed", StringComparison.OrdinalIgnoreCase));
        var pct = data.Count > 0 ? Math.Round((double)passed * 100 / data.Count, 2) : 0;
        return Ok(new
        {
            total = data.Count,
            totalResults = data.Count,
            passed,
            failed,
            passPercentage = pct,
            results = data,
            details = data
        });
    }

    // 8. Staff Workload Details
    [HttpGet("details/staff-workload")]
    [HttpGet("details/faculty-workload")]
    public async Task<IActionResult> FacultyWorkloadDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.FacultyWorkloadAsync(filter, ct);
        var totalStaff = data.Select(x => x.FacultyId).Distinct().Count();
        var totalHours = data.Sum(x => x.HoursPerWeek);
        var totalPeriods = data.Sum(x => x.PeriodCount);
        return Ok(new
        {
            faculty = totalStaff,
            totalFaculty = totalStaff,
            totalHours,
            totalPeriods,
            averageHoursPerFaculty = totalStaff > 0 ? Math.Round((double)totalHours / totalStaff, 2) : 0,
            details = data
        });
    }

    // 9. Student Strength Details
    [HttpGet("details/student-strength")]
    public async Task<IActionResult> StudentStrengthDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.StudentStrengthAsync(filter, ct);
        var total = data.Sum(x => x.TotalStudents);
        var male = data.Sum(x => x.MaleStudents);
        var female = data.Sum(x => x.FemaleStudents);
        var other = data.Sum(x => x.OtherStudents);
        return Ok(new
        {
            totalStudents = total,
            maleStudents = male,
            femaleStudents = female,
            otherStudents = other,
            totalSections = data.Count,
            details = data
        });
    }

    // 10. Pass Percentage Details
    [HttpGet("details/pass-percentage")]
    public async Task<IActionResult> PassPercentageDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.PassPercentageAsync(filter, ct);
        var totalPassed = data.Sum(x => x.Passed);
        var totalFailed = data.Sum(x => x.Failed);
        var totalAppeared = totalPassed + totalFailed;
        var overallPct = totalAppeared > 0 ? Math.Round((double)totalPassed * 100 / totalAppeared, 2) : 0;
        return Ok(new
        {
            totalPassed,
            totalFailed,
            totalAppeared,
            overallPassPercentage = overallPct,
            details = data
        });
    }

    // 11. Toppers Leaderboard Details
    [HttpGet("details/toppers")]
    public async Task<IActionResult> TopperDetails([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.ToppersAsync(filter, ct);
        var highestMarks = data.Any() ? data.Max(x => x.TotalMarks) : 0;
        var avgMarks = data.Any() ? Math.Round(data.Average(x => (double)x.TotalMarks), 2) : 0;
        return Ok(new
        {
            totalToppers = data.Count,
            identified = data.Count,
            highestMarks,
            averageMarks = avgMarks,
            toppers = data,
            details = data
        });
    }

    // =========================================================================
    // 4. AUDIT LOGS
    // =========================================================================

    [HttpGet("details/audit-logs")]
    public async Task<IActionResult> AuditLogs([FromQuery] ReportFilterDto filter, CancellationToken ct = default)
    {
        var data = await _reportService.AuditLogsAsync(filter, ct);
        return Ok(new
        {
            total = data.Count,
            records = data,
            details = data
        });
    }

    // =========================================================================
    // 5. EXPORT (PDF & EXCEL)
    // =========================================================================

    [HttpGet("export")]
    public async Task<IActionResult> ExportUnified(
        [FromQuery] string reportType = "dashboard",
        [FromQuery] string format = "pdf",
        [FromQuery] ReportFilterDto? filter = null,
        CancellationToken ct = default)
    {
        bool isPdf = !string.Equals(format, "excel", StringComparison.OrdinalIgnoreCase) 
                  && !string.Equals(format, "xlsx", StringComparison.OrdinalIgnoreCase);
        var result = await _reportService.ExportAsync(reportType, filter ?? new ReportFilterDto(), isPdf, ct);
        return File(result.Content, result.ContentType, result.FileName);
    }

    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf(
        [FromQuery] string reportType = "dashboard",
        [FromQuery] ReportFilterDto? filter = null,
        CancellationToken ct = default)
    {
        var result = await _reportService.ExportAsync(reportType, filter ?? new ReportFilterDto(), true, ct);
        return File(result.Content, result.ContentType, result.FileName);
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] string reportType = "dashboard",
        [FromQuery] ReportFilterDto? filter = null,
        CancellationToken ct = default)
    {
        var result = await _reportService.ExportAsync(reportType, filter ?? new ReportFilterDto(), false, ct);
        return File(result.Content, result.ContentType, result.FileName);
    }
}
