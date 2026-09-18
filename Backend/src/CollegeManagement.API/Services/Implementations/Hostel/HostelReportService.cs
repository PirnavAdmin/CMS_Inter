using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelReportService
        : IHostelReportService
    {
        private readonly IHostelReportRepository
            _reportRepository;

        public HostelReportService(
            IHostelReportRepository reportRepository)
        {
            _reportRepository = reportRepository;
        }

        public async Task<IEnumerable<HostelOccupancyReportDto>>
            GetOccupancyReportAsync(
                int? hostelId = null)
        {
            return await _reportRepository
                .GetOccupancyReportAsync(hostelId);
        }

        public async Task<IEnumerable<HostelStudentReportDto>>
            GetStudentReportAsync(
                int? hostelId = null,
                string? status = null,
                string? search = null)
        {
            return await _reportRepository
                .GetStudentReportAsync(
                    hostelId,
                    status,
                    search);
        }

        public async Task<IEnumerable<HostelAttendanceReportDto>>
            GetAttendanceReportAsync(
                int? hostelId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? session = null,
                string? attendanceStatus = null,
                string? search = null)
        {
            return await _reportRepository
                .GetAttendanceReportAsync(
                    hostelId,
                    fromDate,
                    toDate,
                    session,
                    attendanceStatus,
                    search);
        }

        public async Task<IEnumerable<HostelOutpassLeaveReportDto>>
            GetOutpassLeaveReportAsync(
                int? hostelId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? search = null)
        {
            return await _reportRepository
                .GetOutpassLeaveReportAsync(
                    hostelId,
                    fromDate,
                    toDate,
                    requestType,
                    approvalStatus,
                    search);
        }

        public async Task<IEnumerable<HostelTransferVacateReportDto>>
            GetTransferVacateReportAsync(
                int? studentId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? feeSettlementStatus = null,
                string? search = null)
        {
            return await _reportRepository
                .GetTransferVacateReportAsync(
                    studentId,
                    fromDate,
                    toDate,
                    requestType,
                    approvalStatus,
                    feeSettlementStatus,
                    search);
        }
    }
}