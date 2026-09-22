using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models.Reports;

namespace CollegeManagement.API.Repositories.Interfaces;

public interface IReportRepository
{
    Task<DashboardReportDto> GetDashboardAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<AdmissionReportDto>> GetAdmissionsAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<StudentStrengthReportDto>> GetStudentStrengthAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<AttendanceReportDto>> GetAttendanceAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<FacultyAttendanceReportDto>> GetFacultyAttendanceAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<FeeCollectionReportDto>> GetFeeCollectionAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<OutstandingFeeReportDto>> GetOutstandingFeesAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<ExaminationReportDto>> GetExaminationsAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<ResultAnalysisReportDto>> GetResultsAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<PassPercentageReportDto>> GetPassPercentageAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<TopperReportDto>> GetToppersAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<SubjectWiseReportDto>> GetSubjectsAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<GroupWiseReportDto>> GetGroupsAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<SectionWiseReportDto>> GetSectionsAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<FacultyWorkloadReportDto>> GetFacultyWorkloadAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<StudentPerformanceReportDto>> GetStudentPerformanceAsync(ReportFilterModel filter, CancellationToken ct = default);
    Task<IReadOnlyList<AuditLogDto>> GetAuditLogsAsync(ReportFilterModel filter, CancellationToken ct = default);
}
