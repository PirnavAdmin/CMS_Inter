using CollegeManagement.API.DTOs.Reports;

namespace CollegeManagement.API.Services.Interfaces;

public interface IReportService
{
    Task<DashboardReportDto> DashboardAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<AdmissionReportDto>> AdmissionsAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<StudentStrengthReportDto>> StudentStrengthAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<AttendanceReportDto>> AttendanceAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<FacultyAttendanceReportDto>> FacultyAttendanceAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<FeeCollectionReportDto>> FeeCollectionAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<OutstandingFeeReportDto>> OutstandingFeesAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<ExaminationReportDto>> ExaminationsAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<ResultAnalysisReportDto>> ResultsAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<PassPercentageReportDto>> PassPercentageAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<TopperReportDto>> ToppersAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<SubjectWiseReportDto>> SubjectsAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<GroupWiseReportDto>> GroupsAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<SectionWiseReportDto>> SectionsAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<FacultyWorkloadReportDto>> FacultyWorkloadAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<StudentPerformanceReportDto>> StudentPerformanceAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<AuditLogDto>> AuditLogsAsync(ReportFilterDto filter, CancellationToken ct = default);
    Task<(byte[] Content, string ContentType, string FileName)> ExportAsync(string reportType, ReportFilterDto filter, bool pdf, CancellationToken ct = default);
    Task<object> CustomAsync(CustomReportRequestDto request, CancellationToken ct = default);
}
