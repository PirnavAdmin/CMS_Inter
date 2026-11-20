using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelReportService
    {
        Task<IEnumerable<HostelOccupancyReportDto>>
            GetOccupancyReportAsync(
                int? hostelId = null,
                int? campusId = null);

        Task<IEnumerable<HostelStudentReportDto>>
            GetStudentReportAsync(
                int? hostelId = null,
                string? status = null,
                string? search = null,
                int? campusId = null);

        Task<IEnumerable<HostelAttendanceReportDto>>
            GetAttendanceReportAsync(
                int? hostelId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? session = null,
                string? attendanceStatus = null,
                string? search = null,
                int? campusId = null);

        Task<IEnumerable<HostelOutpassLeaveReportDto>>
            GetOutpassLeaveReportAsync(
                int? hostelId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? search = null,
                int? campusId = null);

        Task<IEnumerable<HostelTransferVacateReportDto>>
            GetTransferVacateReportAsync(
                int? studentId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? feeSettlementStatus = null,
                string? search = null,
                int? campusId = null);
    }
}