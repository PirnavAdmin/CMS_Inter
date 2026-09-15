using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Dashboard;

public class DashboardFilterDto
{
    public int? AcademicYearId { get; set; }
    public int? BoardId { get; set; }
    public DateTime? Date { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class DashboardFilterOptionsResponseDto
{
    public IReadOnlyList<DashboardLookupItemDto> AcademicYears { get; set; } = new List<DashboardLookupItemDto>();
    public IReadOnlyList<DashboardLookupItemDto> Boards { get; set; } = new List<DashboardLookupItemDto>();
}

public class DashboardLookupItemDto
{
    public int Id { get; set; }
    public int AcademicYearId => Id;
    public int? BoardId { get; set; }
    public int Value => Id;
    public string Name { get; set; } = string.Empty;
    public string AcademicYearName => Name;
    public string BoardName => Name;
    public string Label => Name;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsCurrent { get; set; }
}

public class DashboardCardMetricDto
{
    public int CurrentCount { get; set; }
    public int PreviousCount { get; set; }
    public int PreviousYearValue => PreviousCount;
    public int LastYearCount => PreviousCount;
    public decimal PercentageChange { get; set; }
    public decimal Percentage => PercentageChange;
    public decimal GrowthPercentage => PercentageChange;
    public string Trend { get; set; } = "neutral";
    public string GrowthType => Trend;
    public string Status => Trend;
}

public class DashboardSummaryResponseDto
{
    // Top 5 Primary KPI Cards matching Dashboard screens
    public int TotalStudents { get; set; }
    public int TeachingStaff { get; set; }
    public int NonTeachingStaff { get; set; }
    public int TotalGroups { get; set; }
    public int TotalSections { get; set; }

    // Combined Staff Metrics
    public int TotalStaff => TeachingStaff + NonTeachingStaff;
    public int LastYearTotalStaff => LastYearTeachingStaff + LastYearNonTeachingStaff;
    public decimal StaffVsLastYearPercentage { get; set; }

    // Growth Metrics (vs last year)
    public decimal StudentsVsLastYearPercentage { get; set; }
    public int LastYearTotalStudents { get; set; }
    public decimal TeachingStaffVsLastYearPercentage { get; set; }
    public int LastYearTeachingStaff { get; set; }
    public decimal NonTeachingStaffVsLastYearPercentage { get; set; }
    public int LastYearNonTeachingStaff { get; set; }
    public decimal GroupsVsLastYearPercentage { get; set; }
    public int LastYearTotalGroups { get; set; }
    public decimal SectionsVsLastYearPercentage { get; set; }
    public int LastYearTotalSections { get; set; }

    // Structured Metric Cards for API consumers & modern frontends
    public DashboardCardMetricDto TotalStudentsCard => new()
    {
        CurrentCount = TotalStudents,
        PreviousCount = LastYearTotalStudents,
        PercentageChange = StudentsVsLastYearPercentage,
        Trend = StudentsVsLastYearPercentage > 0 ? "up" : (StudentsVsLastYearPercentage < 0 ? "down" : "neutral")
    };
    public DashboardCardMetricDto StudentsMetric => TotalStudentsCard;

    public DashboardCardMetricDto TeachingStaffCard => new()
    {
        CurrentCount = TeachingStaff,
        PreviousCount = LastYearTeachingStaff,
        PercentageChange = TeachingStaffVsLastYearPercentage,
        Trend = TeachingStaffVsLastYearPercentage > 0 ? "up" : (TeachingStaffVsLastYearPercentage < 0 ? "down" : "neutral")
    };
    public DashboardCardMetricDto TeachingStaffMetric => TeachingStaffCard;

    public DashboardCardMetricDto NonTeachingStaffCard => new()
    {
        CurrentCount = NonTeachingStaff,
        PreviousCount = LastYearNonTeachingStaff,
        PercentageChange = NonTeachingStaffVsLastYearPercentage,
        Trend = NonTeachingStaffVsLastYearPercentage > 0 ? "up" : (NonTeachingStaffVsLastYearPercentage < 0 ? "down" : "neutral")
    };
    public DashboardCardMetricDto NonTeachingStaffMetric => NonTeachingStaffCard;

    public DashboardCardMetricDto TotalStaffCard => new()
    {
        CurrentCount = TotalStaff,
        PreviousCount = LastYearTotalStaff,
        PercentageChange = StaffVsLastYearPercentage,
        Trend = StaffVsLastYearPercentage > 0 ? "up" : (StaffVsLastYearPercentage < 0 ? "down" : "neutral")
    };
    public DashboardCardMetricDto TotalStaffMetric => TotalStaffCard;

    public DashboardCardMetricDto TotalGroupsCard => new()
    {
        CurrentCount = TotalGroups,
        PreviousCount = LastYearTotalGroups,
        PercentageChange = GroupsVsLastYearPercentage,
        Trend = GroupsVsLastYearPercentage > 0 ? "up" : (GroupsVsLastYearPercentage < 0 ? "down" : "neutral")
    };
    public DashboardCardMetricDto GroupsMetric => TotalGroupsCard;

    public DashboardCardMetricDto TotalSectionsCard => new()
    {
        CurrentCount = TotalSections,
        PreviousCount = LastYearTotalSections,
        PercentageChange = SectionsVsLastYearPercentage,
        Trend = SectionsVsLastYearPercentage > 0 ? "up" : (SectionsVsLastYearPercentage < 0 ? "down" : "neutral")
    };
    public DashboardCardMetricDto SectionsMetric => TotalSectionsCard;

    // Backward compatibility & alias properties
    public int TotalFaculty => TeachingStaff;
    public int FacultyMembers => TeachingStaff;
    public int TeachingFaculty => TeachingStaff;
    public int TeachingStaffCount => TeachingStaff;
    public int NonTeachingFaculty => NonTeachingStaff;
    public int NonTeachingStaffCount => NonTeachingStaff;
    public int TotalStudentCount => TotalStudents;
    public int StudentsCount => TotalStudents;
    public int StudentCount => TotalStudents;
    public int GroupsCount => TotalGroups;
    public int GroupCount => TotalGroups;
    public int SectionsCount => TotalSections;
    public int SectionCount => TotalSections;

    // Additional context metrics
    public decimal TodayAttendance { get; set; }
    public decimal TodayAttendancePercentage => TodayAttendance;
    public int Admissions { get; set; }
    public int TotalAdmissions => Admissions;
    public string AcademicYear { get; set; } = string.Empty;
    public string AcademicYearName => AcademicYear;
    public int TotalSubjects { get; set; }
    public int UpcomingExams { get; set; }
    public int UpcomingExaminations => UpcomingExams;
}

public class StudentsOverviewResponseDto
{
    public int TotalStudents { get; set; }
    public int TotalCount => TotalStudents;
    public int ActiveStudents { get; set; }
    public int InactiveStudents { get; set; }
    public int MaleStudents { get; set; }
    public int FemaleStudents { get; set; }
    public int OtherStudents { get; set; }
    
    // Direct alias mappings for frontend chips:
    // metric(overviewState.data, ["boys", "boysCount", "male", "maleCount"])
    // metric(overviewState.data, ["girls", "girlsCount", "female", "femaleCount"])
    public int Boys => MaleStudents;
    public int BoysCount => MaleStudents;
    public int Male => MaleStudents;
    public int MaleCount => MaleStudents;
    public int Girls => FemaleStudents;
    public int GirlsCount => FemaleStudents;
    public int Female => FemaleStudents;
    public int FemaleCount => FemaleStudents;

    public decimal MalePercentage { get; set; }
    public decimal FemalePercentage { get; set; }
    public int FirstYearStudents { get; set; }
    public int SecondYearStudents { get; set; }
    public IReadOnlyList<StudentOverviewDistributionDto> GenderDistribution { get; set; } = new List<StudentOverviewDistributionDto>();
    public IReadOnlyList<StudentOverviewDistributionDto> LevelDistribution { get; set; } = new List<StudentOverviewDistributionDto>();
    public IReadOnlyList<StudentMonthlyTrendDto> MonthlyTrend { get; set; } = new List<StudentMonthlyTrendDto>();
    public IReadOnlyList<StudentMonthlyTrendDto> Trend => MonthlyTrend;
    public IReadOnlyList<StudentMonthlyTrendDto> MonthlyAdmissions => MonthlyTrend;
    public IReadOnlyList<StudentMonthlyTrendDto> AdmissionTrend => MonthlyTrend;
    public IReadOnlyList<StudentMonthlyTrendDto> Items => MonthlyTrend;
}

public class StudentMonthlyTrendDto
{
    public string Period { get; set; } = string.Empty;
    public string Label => Period;
    public string PeriodLabel => Period;
    public string MonthName => Period;
    public string Month => Period;
    public int StudentsJoined { get; set; }
    public int Value => StudentsJoined;
    public int Admissions => StudentsJoined;
    public int AdmissionCount => StudentsJoined;
    public int Count => StudentsJoined;
}

public class StudentOverviewDistributionDto
{
    public string Category { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Name => Label;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class GroupDistributionItemDto
{
    public int GroupId { get; set; }
    public int Id => GroupId;
    public string GroupName { get; set; } = string.Empty;
    public string Name => GroupName;
    public string GroupCode { get; set; } = string.Empty;
    public string Code => GroupCode;
    public int TotalStudents { get; set; }
    public int StudentCount => TotalStudents;
    public int Count => TotalStudents;
    public int Value => TotalStudents;
    public decimal Percentage { get; set; }
    public string Color { get; set; } = string.Empty;
}

public class GroupDistributionResponseDto
{
    public int TotalStudents { get; set; }
    public IReadOnlyList<GroupDistributionItemDto> Groups { get; set; } = new List<GroupDistributionItemDto>();
    public IReadOnlyList<GroupDistributionItemDto> Items => Groups;
}

public class DailyAttendanceItemDto
{
    public string Date { get; set; } = string.Empty;
    public string FormattedDate { get; set; } = string.Empty;
    public string Day { get; set; } = string.Empty;
    public string DayName { get; set; } = string.Empty;
    public int Total { get; set; }
    public int TotalStudents => Total;
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public int Leave { get; set; }
    public decimal Percentage { get; set; }
    public decimal AttendancePercentage => Percentage;
}

public class WeeklyAttendanceResponseDto
{
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string DateRange { get; set; } = string.Empty;
    public decimal AveragePercentage { get; set; }
    public int TotalStudents { get; set; }
    public IReadOnlyList<DailyAttendanceItemDto> DailyAttendance { get; set; } = new List<DailyAttendanceItemDto>();
    public IReadOnlyList<DailyAttendanceItemDto> Days => DailyAttendance;
    public IReadOnlyList<DailyAttendanceItemDto> Items => DailyAttendance;
}

public class StudentsAttendanceTodayResponseDto
{
    public string ViewBy { get; set; } = "Overall";
    public int TotalStudents { get; set; }
    public int Total => TotalStudents;
    public int TotalCount => TotalStudents;
    public int Present { get; set; }
    public int PresentCount => Present;
    public int Absent { get; set; }
    public int AbsentCount => Absent;
    public int Late { get; set; }
    public int LateCount => Late;
    public decimal AttendancePercentage { get; set; }
    public decimal Percentage => AttendancePercentage;
    public decimal PresentPercentage { get; set; }
    public decimal AbsentPercentage { get; set; }
    public decimal LatePercentage { get; set; }
    public string LastUpdated { get; set; } = "Today";
    
    // Donut chart data pre-formatted
    public IReadOnlyList<dynamic> ChartData => new List<dynamic>
    {
        new { name = "Present", value = Present, color = "#22a447" },
        new { name = "Absent", value = Absent, color = "#ef4444" },
        new { name = "Late", value = Late, color = "#f59e0b" }
    };

    public IReadOnlyList<AttendanceCategoryBreakdownDto> Breakdown { get; set; } = new List<AttendanceCategoryBreakdownDto>();
    public IReadOnlyList<AttendanceCategoryBreakdownDto> Items => Breakdown;
    public IReadOnlyList<AttendanceCategoryBreakdownDto> List => Breakdown;
    public IReadOnlyList<AttendanceCategoryBreakdownDto> BreakdownList => Breakdown;
}

public class StaffAttendanceTodayResponseDto
{
    public string StaffType { get; set; } = "All Staff";
    public int TotalStaff { get; set; }
    public int Total => TotalStaff;
    public int TotalCount => TotalStaff;
    public int Present { get; set; }
    public int PresentCount => Present;
    public int Absent { get; set; }
    public int AbsentCount => Absent;
    public int Late { get; set; }
    public int LateCount => Late;
    public int OnLeave { get; set; }
    public int OnLeaveCount => OnLeave;
    public int LeaveCount => OnLeave;
    public decimal AttendancePercentage { get; set; }
    public decimal Percentage => AttendancePercentage;
    public decimal PresentPercentage { get; set; }
    public decimal AbsentPercentage { get; set; }
    public decimal LatePercentage { get; set; }
    public decimal OnLeavePercentage { get; set; }
    public int TeachingCount { get; set; }
    public int TeachingStaffCount => TeachingCount;
    public int NonTeachingCount { get; set; }
    public int NonTeachingStaffCount => NonTeachingCount;
    public int TeachingStaff => TeachingCount;
    public int NonTeachingStaff => NonTeachingCount;

    public IReadOnlyList<dynamic> ChartData => new List<dynamic>
    {
        new { name = "Present", value = Present, color = "#22a447" },
        new { name = "Absent", value = Absent, color = "#ef4444" },
        new { name = "Late", value = Late, color = "#f59e0b" },
        new { name = "On Leave", value = OnLeave, color = "#7c3aed" }
    };
}

public class AttendanceCategoryBreakdownDto
{
    public string CategoryName { get; set; } = string.Empty;
    public string Name => CategoryName;
    public string Label => CategoryName;
    public string GroupName => CategoryName;
    public string SectionName => CategoryName;
    public string LevelName => CategoryName;
    public int TotalStudents { get; set; }
    public int Total => TotalStudents;
    public int StudentsCount => TotalStudents;
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public decimal AttendancePercentage { get; set; }
    public decimal Percentage => AttendancePercentage;
    public string Color { get; set; } = "#22a447";
}

public class RecentCertificateRequestItemDto
{
    public int CertificateId { get; set; }
    public int Id => CertificateId;
    public string RequestNumber { get; set; } = string.Empty;
    public string RequestNo => RequestNumber;
    public string CertificateType { get; set; } = string.Empty;
    public string Label => CertificateType;
    public string CertificateName => CertificateType;
    public string Title => CertificateType;
    public string StudentName { get; set; } = string.Empty;
    public string Subtitle => !string.IsNullOrWhiteSpace(RequestNumber) ? $"{StudentName} • {RequestNumber}" : StudentName;
    public string Status { get; set; } = "Pending";
    public string Tone => (string.Equals(Status, "Approved", StringComparison.OrdinalIgnoreCase) || string.Equals(Status, "Issued", StringComparison.OrdinalIgnoreCase)) ? "green" : "orange";
    public string TimeAgo { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
}

public class CertificateTypeSummaryDto
{
    public string Type { get; set; } = string.Empty;
    public string Name => Type;
    public string CertificateType => Type;
    public int Count { get; set; }
    public int RequestCount => Count;
    public int Total => Count;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class CertificateRequestsSummaryResponseDto
{
    public int TotalRequests { get; set; }
    public int Total => TotalRequests;
    public int RequestCount => TotalRequests;
    public int Bonafide { get; set; }
    public int BonafideCertificate => Bonafide;
    public int BonafideRequests => Bonafide;
    public int BonafideCount => Bonafide;
    public int Study { get; set; }
    public int StudyCertificate => Study;
    public int StudyRequests => Study;
    public int StudyCount => Study;
    public int Conduct { get; set; }
    public int ConductCertificate => Conduct;
    public int ConductRequests => Conduct;
    public int ConductCount => Conduct;
    public int Transfer { get; set; }
    public int TransferCertificate => Transfer;
    public int TransferRequests => Transfer;
    public int TransferCount => Transfer;
    public int Others { get; set; }
    public int Other => Others;
    public int OthersRequests => Others;
    public int OthersCount => Others;
    
    // Categorical breakdown
    public IReadOnlyList<CertificateTypeSummaryDto> Types { get; set; } = new List<CertificateTypeSummaryDto>();
    public IReadOnlyList<CertificateTypeSummaryDto> TypeSummaries => Types;
    public IReadOnlyList<CertificateTypeSummaryDto> RequestsByType => Types;
    
    // Individual requests list for Frontend card:
    // raw = certState.data?.items || certState.data?.requests
    public IReadOnlyList<RecentCertificateRequestItemDto> RecentRequests { get; set; } = new List<RecentCertificateRequestItemDto>();
    public IReadOnlyList<RecentCertificateRequestItemDto> Items => RecentRequests;
    public IReadOnlyList<RecentCertificateRequestItemDto> Requests => RecentRequests;

    // Workflow counts
    public int GeneratedCount { get; set; }
    public int ReviewedCount { get; set; }
    public int ApprovedCount { get; set; }
    public int IssuedCount { get; set; }
    public int CancelledCount { get; set; }
}

public class RecentActivityItemDto
{
    public long Id { get; set; }
    public long AuditLogId => Id;
    public string Title { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string User => UserName;
    public string EntityName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string TimeAgo { get; set; } = string.Empty;
    public string Time => TimeAgo;
    public string CreatedAt { get; set; } = string.Empty;
    public string BadgeType { get; set; } = "info";
}

public class FacultyWorkloadItemDto
{
    public int FacultyId { get; set; }
    public int StaffId => FacultyId;
    public int Id => FacultyId;
    public string FacultyName { get; set; } = string.Empty;
    public string Name => FacultyName;
    public string StaffName => FacultyName;
    public string Department { get; set; } = "General";
    public string DepartmentName => Department;
    public decimal HoursPerWeek { get; set; }
    public decimal Hours => HoursPerWeek;
    public decimal WeeklyClasses => HoursPerWeek;
    public decimal PeriodCount => HoursPerWeek;
    public decimal Workload => HoursPerWeek;
    public decimal WorkloadHours => HoursPerWeek;
    public decimal TotalHours => HoursPerWeek;
    public int AssignedSubjects { get; set; }
    public int SubjectCount => AssignedSubjects;
    public decimal Count => HoursPerWeek;
    public decimal Value => HoursPerWeek;
}

public class UpcomingExaminationItemDto
{
    public int ExamId { get; set; }
    public int ExaminationId => ExamId;
    public int ScheduleId { get; set; }
    public int Id => ScheduleId > 0 ? ScheduleId : ExamId;
    public string ExamName { get; set; } = string.Empty;
    public string Name => ExamName;
    public string Title => ExamName;
    public string ExaminationName => ExamName;
    public string ExamCode { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string SubjectName => Subject;
    public string SubjectCode { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string ExamDate => Date;
    public string StartDate => Date;
    public string FormattedDate { get; set; } = string.Empty;
    public string DateRange => FormattedDate;
    public string Context => Subject;
    public string Time { get; set; } = "10:00 AM - 01:00 PM";
    public string ExamTime => Time;
    public string TimeRange => Time;
    public string Hall { get; set; } = "Main Hall";
    public string HallName => Hall;
    public string Invigilator { get; set; } = "Staff In-Charge";
    public string InvigilatorName => Invigilator;
    public string Status { get; set; } = "Scheduled";
    public string PatternName { get; set; } = string.Empty;
    public int? TotalMarks { get; set; }
    public string DaysRemainingText { get; set; } = string.Empty;
    public string DaysLeft => DaysRemainingText;
    public string Badge => !string.IsNullOrWhiteSpace(DaysRemainingText) ? DaysRemainingText : Status;
    public string AcademicLevelName { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
}

public class TodaysHighlightsResponseDto
{
    public int AdmissionsToday { get; set; }
    public int Admissions => AdmissionsToday;
    public int CertificateRequestsToday { get; set; }
    public int CertificateRequests => CertificateRequestsToday;
    public int Certificates => CertificateRequestsToday;
    public int ExaminationsToday { get; set; }
    public int Examinations => ExaminationsToday;
    public int Exams => ExaminationsToday;
    public int BirthdaysToday { get; set; }
    public int Birthdays => BirthdaysToday;
}
