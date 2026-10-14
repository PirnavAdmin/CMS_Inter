using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Dashboard;

public class PrincipalDashboardResponseDto
{
    public PrincipalInfoDto Principal { get; set; } = new();
    public List<PrincipalSummaryCardDto> Summary { get; set; } = new();
    public PrincipalAttendanceSnapshotDto Attendance { get; set; } = new();
    public PrincipalStaffAttendanceSnapshotDto StaffAttendance { get; set; } = new();
    public List<PrincipalPerformanceDto> Performance { get; set; } = new();
    public List<PrincipalClassOverviewDto> ClassOverview { get; set; } = new();
    public List<PrincipalExamDto> Exams { get; set; } = new();
    public List<PrincipalMonthlyFeeDto> FeeCollection { get; set; } = new();
    public decimal FeeTotal { get; set; }
    public decimal PendingFees { get; set; }
    public decimal CollectionRate { get; set; }
    public List<PrincipalActivityDto> Activities { get; set; } = new();
    public List<PrincipalNoticeDto> Notices { get; set; } = new();
    public Dictionary<string, PrincipalPeriodSnapshotDto> PeriodSnapshots { get; set; } = new();
    public string LoadedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

public class PrincipalInfoDto
{
    public string Name { get; set; } = "Principal";
    public string Title { get; set; } = "Principal";
    public string College { get; set; } = "Pirnav Junior College";
    public string AcademicYear { get; set; } = "2026-2027";
}

public class PrincipalSummaryCardDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Trend { get; set; } = "Live";
    public string Tone { get; set; } = "green";
    public string Icon { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public string ModuleKey { get; set; } = string.Empty;
}

public class PrincipalAttendanceSnapshotDto
{
    public int Total { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Leave { get; set; }
    public decimal AttendanceRate { get; set; }
    public List<PrincipalClassAttendanceDto> Classes { get; set; } = new();
}

public class PrincipalClassAttendanceDto
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
}

public class PrincipalStaffAttendanceSnapshotDto
{
    public int Total { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Leave { get; set; }
    public decimal AttendanceRate { get; set; }
}

public class PrincipalPerformanceDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Current { get; set; }
    public decimal Previous { get; set; }
}

public class PrincipalClassOverviewDto
{
    public string ClassName { get; set; } = string.Empty;
    public int Students { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public string Tone { get; set; } = "green";
}

public class PrincipalExamDto
{
    public string Subject { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string Classes { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public int Students { get; set; }
}

public class PrincipalMonthlyFeeDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
}

public class PrincipalActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string Icon { get; set; } = "user";
    public string Tone { get; set; } = "green";
    public string To { get; set; } = "/dashboard";
    public string ModuleKey { get; set; } = "dashboard";
}

public class PrincipalNoticeDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Priority { get; set; } = "Normal";
    public string Tone { get; set; } = "green";
}

public class PrincipalPeriodSnapshotDto
{
    public PrincipalAttendanceSnapshotDto Attendance { get; set; } = new();
    public PrincipalStaffAttendanceSnapshotDto StaffAttendance { get; set; } = new();
    public List<PrincipalMonthlyFeeDto> FeeCollection { get; set; } = new();
    public decimal FeeTotal { get; set; }
    public decimal PendingFees { get; set; }
    public decimal CollectionRate { get; set; }
    public PrincipalAdmissionsSnapshotDto Admissions { get; set; } = new();
    public List<PrincipalActivityDto> Activities { get; set; } = new();
    public List<PrincipalNoticeDto> Notices { get; set; } = new();
}

public class PrincipalAdmissionsSnapshotDto
{
    public string Value { get; set; } = "0";
    public string Detail { get; set; } = "0 applications pending";
    public string Trend { get; set; } = "Live";
}
