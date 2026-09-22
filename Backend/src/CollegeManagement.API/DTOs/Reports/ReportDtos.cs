using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Reports;

public class ReportFilterDto
{
    public int? BoardId { get; set; }
    public int? AcademicYearId { get; set; }
    public int? AcademicLevelId { get; set; }
    public int? GroupId { get; set; }
    public int? SectionId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class DashboardReportDto
{
    public int Admissions { get; set; }
    public decimal Attendance { get; set; }
    public decimal FeeCollection { get; set; }
    public decimal DueFees { get; set; }
    public int Examinations { get; set; }
    public int ResultsPublished { get; set; }
    public decimal FacultyWorkload { get; set; }
    public int StudentStrength { get; set; }
    public decimal PassPercentage { get; set; }
    public int ToppersIdentified { get; set; }
    public IReadOnlyList<TrendPointDto> AdmissionsVsTarget { get; set; } = [];
    public IReadOnlyList<TrendPointDto> AttendanceTrend { get; set; } = [];
    public IReadOnlyList<TrendPointDto> FeeCollectedVsDue { get; set; } = [];
    public IReadOnlyList<TopperReportDto> Toppers { get; set; } = [];
}

public class TrendPointDto
{
    public string? Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal Target { get; set; }
    public decimal Due { get; set; }
}

public class AdmissionReportDto
{
    public int AdmissionId { get; set; }
    public string? AdmissionNo { get; set; } = string.Empty;
    public string? StudentName { get; set; } = string.Empty;
    public string? FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; } = string.Empty;
    public int? BoardId { get; set; }
    public string? BoardName { get; set; } = string.Empty;
    public string? Board { get; set; } = string.Empty;
    public int? AcademicYearId { get; set; }
    public string? AcademicYear { get; set; } = string.Empty;
    public int? AcademicLevelId { get; set; }
    public string? AcademicLevel { get; set; } = string.Empty;
    public int? GroupId { get; set; }
    public string? GroupName { get; set; } = string.Empty;
    public string? Group { get; set; } = string.Empty;
    public int? SectionId { get; set; }
    public string? SectionName { get; set; } = string.Empty;
    public string? Section { get; set; } = string.Empty;
    public DateTime? AdmissionDate { get; set; }
    public string? Status { get; set; } = "Pending";
    public bool IsApproved { get; set; }
    public bool IsRejected { get; set; }
    public bool IsVerified { get; set; }
    public string? Gender { get; set; } = string.Empty;
    public string? FatherName { get; set; } = string.Empty;
    public string? FatherMobile { get; set; } = string.Empty;
    public string? RollNo { get; set; } = string.Empty;
    public string? AdmissionType { get; set; } = string.Empty;
    public string? Medium { get; set; } = string.Empty;

    // Backward compatibility aggregates
    public string? Period { get; set; } = string.Empty;
    public int Admissions { get; set; }
    public int Approved { get; set; }
    public int Rejected { get; set; }
    public int Pending { get; set; }
}

public class StudentStrengthReportDto
{
    public int GroupId { get; set; }
    public string? GroupName { get; set; } = string.Empty;
    public int SectionId { get; set; }
    public string? SectionName { get; set; } = string.Empty;
    public string? BoardName { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public int MaleStudents { get; set; }
    public int FemaleStudents { get; set; }
    public int OtherStudents { get; set; }

    public IReadOnlyList<StudentStrengthStudentDto> Students { get; set; } = [];
}

public class StudentStrengthStudentDto
{
    public int StudentId { get; set; }
    public string? AdmissionNo { get; set; } = string.Empty;
    public string? RollNo { get; set; } = string.Empty;
    public string? StudentName { get; set; } = string.Empty;
    public string? Gender { get; set; } = string.Empty;
    public string? GroupName { get; set; } = string.Empty;
    public string? SectionName { get; set; } = string.Empty;
    public string? BoardName { get; set; } = string.Empty;
    public string? MobileNumber { get; set; } = string.Empty;
}

public class AttendanceReportDto
{
    public string? Period { get; set; } = string.Empty;
    public DateTime? AttendanceDate { get; set; }
    public string? GroupName { get; set; } = string.Empty;
    public string? SectionName { get; set; } = string.Empty;
    public string? SubjectName { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public int Leave { get; set; }
    public decimal AttendancePercentage { get; set; }
}

public class FacultyAttendanceReportDto
{
    public int FacultyId { get; set; }
    public string? FacultyName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; } = string.Empty;
    public string? Designation { get; set; } = string.Empty;
    public int TotalDays { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public int Leave { get; set; }
    public decimal AttendancePercentage { get; set; }
}

public class FeeCollectionReportDto
{
    public int PaymentId { get; set; }
    public string? ReceiptNo { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string? StudentName { get; set; } = string.Empty;
    public string? AdmissionNo { get; set; } = string.Empty;
    public string? RollNo { get; set; } = string.Empty;
    public string? GroupName { get; set; } = string.Empty;
    public string? SectionName { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public decimal Collected { get; set; }
    public decimal Discount { get; set; }
    public decimal Fine { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? PaymentMode { get; set; } = "Online";
    public string? Status { get; set; } = "Paid";
    public string? Remarks { get; set; } = string.Empty;
    public string? Period { get; set; } = string.Empty;
    public int Transactions { get; set; }
}

public class OutstandingFeeReportDto
{
    public int StudentFeeId { get; set; }
    public int StudentId { get; set; }
    public string? AdmissionNo { get; set; } = string.Empty;
    public string? RollNo { get; set; } = string.Empty;
    public string? StudentName { get; set; } = string.Empty;
    public string? GroupName { get; set; } = string.Empty;
    public string? SectionName { get; set; } = string.Empty;
    public string? MobileNumber { get; set; } = string.Empty;
    public string? FeeStructureName { get; set; } = string.Empty;
    public string? PaymentPlan { get; set; } = "Full Payment";
    public decimal TotalAmount { get; set; }
    public decimal ConcessionAmount { get; set; }
    public decimal PayableAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DueAmount { get; set; }
    public string? FeeStatus { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public DateTime? AssignedDate { get; set; }
}

public class ExaminationReportDto
{
    public int ExaminationId { get; set; }
    public string? ExamCode { get; set; } = string.Empty;
    public string? ExamName { get; set; } = string.Empty;
    public string? BoardName { get; set; } = string.Empty;
    public string? AcademicYear { get; set; } = string.Empty;
    public string? AcademicLevel { get; set; } = string.Empty;
    public string? GroupName { get; set; } = string.Empty;
    public string? ProgramName { get; set; } = string.Empty;
    public string? ExamType { get; set; } = string.Empty;
    public string? StartDate { get; set; } = string.Empty;
    public string? EndDate { get; set; } = string.Empty;
    public string? Status { get; set; } = string.Empty;
    public int TotalEligibleSubjects { get; set; }
    public int ScheduledSubjectsCount { get; set; }
    public int TotalEligibleStudents { get; set; }
    public int HallTicketsGeneratedCount { get; set; }
    public int ResultCount { get; set; }
    public int PublishedCount { get; set; }
    public decimal PassPercentage { get; set; }
}

public class ResultAnalysisReportDto
{
    public int ResultId { get; set; }
    public int StudentId { get; set; }
    public string? StudentName { get; set; } = string.Empty;
    public string? RollNo { get; set; } = string.Empty;
    public int ExamId { get; set; }
    public string? ExamName { get; set; } = string.Empty;
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; } = string.Empty;
    public decimal TotalMarks { get; set; }
    public decimal MarksObtained { get; set; }
    public decimal InternalMarks { get; set; }
    public decimal ExternalMarks { get; set; }
    public string? Grade { get; set; } = "A";
    public string? ResultStatus { get; set; } = "Pass";
    public DateTime? PublishedDate { get; set; }
    public string? GroupName { get; set; } = string.Empty;
    public string? SectionName { get; set; } = string.Empty;

    // Aggregates
    public int TotalResults { get; set; }
    public int Passed { get; set; }
    public int Failed { get; set; }
    public decimal AveragePercentage { get; set; }
}

public class PassPercentageReportDto
{
    public int ExamId { get; set; }
    public string? ExamName { get; set; } = string.Empty;
    public string? AcademicYear { get; set; } = string.Empty;
    public string? GroupName { get; set; } = string.Empty;
    public string? SectionName { get; set; } = string.Empty;
    public int TotalAppeared { get; set; }
    public int Passed { get; set; }
    public int Failed { get; set; }
    public decimal PassPercentage { get; set; }
}

public class TopperReportDto
{
    public int Rank { get; set; }
    public int StudentId { get; set; }
    public string? StudentName { get; set; } = string.Empty;
    public string? RollNo { get; set; } = string.Empty;
    public string? AdmissionNo { get; set; } = string.Empty;
    public int GroupId { get; set; }
    public string? GroupName { get; set; } = string.Empty;
    public int SectionId { get; set; }
    public string? SectionName { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public string? DepartmentName { get; set; } = string.Empty;
    public int ProgramId { get; set; }
    public string? ProgramName { get; set; } = string.Empty;
    public int Subjects { get; set; }
    public decimal TotalMarks { get; set; }
    public decimal MaxMarks { get; set; }
    public decimal Percentage { get; set; }
    public int PassedSubjects { get; set; }
    public int FailedSubjects { get; set; }
}

public class SubjectWiseReportDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; } = string.Empty;
    public int Students { get; set; }
    public decimal AverageMarks { get; set; }
    public decimal PassPercentage { get; set; }
}

public class GroupWiseReportDto
{
    public int GroupId { get; set; }
    public string? GroupName { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public decimal AveragePercentage { get; set; }
    public decimal PassPercentage { get; set; }
}

public class SectionWiseReportDto
{
    public int SectionId { get; set; }
    public string? SectionName { get; set; } = string.Empty;
    public string? GroupName { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public decimal AveragePercentage { get; set; }
    public decimal PassPercentage { get; set; }
}

public class FacultyWorkloadReportDto
{
    public int FacultyId { get; set; }
    public string? FacultyEmployeeId { get; set; } = string.Empty;
    public string? FacultyName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; } = string.Empty;
    public string? Designation { get; set; } = string.Empty;
    public int PeriodCount { get; set; }
    public decimal HoursPerWeek { get; set; }
    public string? SubjectNames { get; set; } = string.Empty;
}

public class StudentPerformanceReportDto
{
    public int StudentId { get; set; }
    public string? AdmissionNo { get; set; } = string.Empty;
    public string? RollNo { get; set; } = string.Empty;
    public string? StudentName { get; set; } = string.Empty;
    public string? GroupName { get; set; } = string.Empty;
    public string? SectionName { get; set; } = string.Empty;
    public decimal AveragePercentage { get; set; }
    public int PassedSubjects { get; set; }
    public int FailedSubjects { get; set; }
    public decimal AttendancePercentage { get; set; }
    public string? Grade { get; set; }
}

public class AuditLogDto
{
    public long AuditLogId { get; set; }
    public string? UserName { get; set; }
    public string? Action { get; set; } = string.Empty;
    public string? EntityName { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CustomReportRequestDto : ReportFilterDto
{
    [Required, MaxLength(60)]
    public string ReportType { get; set; } = string.Empty;
}
