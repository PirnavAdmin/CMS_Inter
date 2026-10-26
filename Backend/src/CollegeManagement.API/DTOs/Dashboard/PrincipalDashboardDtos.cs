using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Dashboard;

/// <summary>
/// Response DTO for the Principal Dashboard endpoint (/api/v1/dashboard/principal).
/// Returns campus-scoped metrics derived from the source-of-truth Admin Dashboard calculations.
/// </summary>
public class PrincipalDashboardResponseDto
{
    /// <summary>Campus ID assigned to this Principal or requested by Admin.</summary>
    public int CampusId { get; set; }

    /// <summary>Display name of the campus.</summary>
    public string CampusName { get; set; } = string.Empty;

    /// <summary>Board ID filter if applied.</summary>
    public int? BoardId { get; set; }

    /// <summary>Academic Year ID filter if applied.</summary>
    public int? AcademicYearId { get; set; }

    /// <summary>Reporting date for daily metrics.</summary>
    public DateTime Date { get; set; }

    // --- High-level KPI Counters (reused from Admin Dashboard Summary) ---
    /// <summary>Total active enrolled students in this campus.</summary>
    public int StudentCount { get; set; }
    public int TotalStudents => StudentCount;

    /// <summary>Total active staff members (Teaching + Non-Teaching) in this campus.</summary>
    public int StaffCount { get; set; }
    public int TotalStaff => StaffCount;

    /// <summary>Year-over-year percentage growth in student count.</summary>
    public decimal? StudentsGrowth { get; set; }

    /// <summary>Year-over-year percentage growth in staff count.</summary>
    public decimal? StaffGrowth { get; set; }

    /// <summary>Active section/class count for this campus.</summary>
    public int ActiveClasses { get; set; }

    /// <summary>Upcoming examination count for this campus.</summary>
    public int UpcomingExamCount { get; set; }

    /// <summary>New admissions count for the academic period.</summary>
    public int Admissions { get; set; }

    /// <summary>Overall published examination pass percentage for this campus (null if no published results exist).</summary>
    public decimal? PassPercentage { get; set; }

    // --- Detailed Sub-DTOs ---
    /// <summary>Today's student attendance breakdown (reused from Admin Student Attendance calculation).</summary>
    public StudentsAttendanceTodayResponseDto StudentAttendance { get; set; } = new();

    /// <summary>Today's staff attendance breakdown (reused from Admin Staff Attendance calculation).</summary>
    public StaffAttendanceTodayResponseDto StaffAttendance { get; set; } = new();

    /// <summary>Complete Admin Dashboard summary response for this campus.</summary>
    public DashboardSummaryResponseDto Summary { get; set; } = new();

    /// <summary>Stream / Group academic performance list with pass percentages.</summary>
    public List<PrincipalPerformanceStreamDto> PerformanceStreams { get; set; } = new();

    /// <summary>Campus circulars, holiday notices, and exam announcements.</summary>
    public List<PrincipalNoticeDto> Notices { get; set; } = new();
}

/// <summary>
/// Academic performance breakdown for an individual stream/group.
/// </summary>
public class PrincipalPerformanceStreamDto
{
    public string StreamName { get; set; } = string.Empty;
    public string Label => StreamName;
    public decimal Current { get; set; }
    public decimal PassPercentage => Current;
    public decimal Previous { get; set; }
}

/// <summary>
/// Notice or circular item for the Principal Dashboard notice board.
/// </summary>
public class PrincipalNoticeDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Type { get; set; } = "Notice";
    public string Priority { get; set; } = "Normal";
}
