using System.Data;
using Dapper;
using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelReportRepository
        : IHostelReportRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public HostelReportRepository(
            IDbConnection dbConnection,
            IHttpContextAccessor? httpContextAccessor = null)
        {
            _dbConnection = dbConnection;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? ResolveCollegeId()
        {
            return CampusContextResolver.ResolveCollegeId(_httpContextAccessor?.HttpContext?.User);
        }

        public async Task<IEnumerable<HostelOccupancyReportDto>>
            GetOccupancyReportAsync(
                int? hostelId = null,
                int? campusId = null)
        {
            if (campusId == TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<HostelOccupancyReportDto>();
            }

            return await _dbConnection
                .QueryAsync<HostelOccupancyReportDto>(
                    "sp_GetHostelOccupancyReport",
                    new
                    {
                        p_HostelId = hostelId,
                        p_CampusId = campusId,
                        p_CollegeId = ResolveCollegeId()
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<HostelStudentReportDto>>
            GetStudentReportAsync(
                int? hostelId = null,
                string? status = null,
                string? search = null,
                int? campusId = null)
        {
            if (campusId == TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<HostelStudentReportDto>();
            }

            return await _dbConnection
                .QueryAsync<HostelStudentReportDto>(
                    "sp_GetHostelStudentReport",
                    new
                    {
                        p_HostelId = hostelId,
                        p_Status =
                            string.IsNullOrWhiteSpace(status)
                                ? null
                                : status.Trim(),
                        p_Search =
                            string.IsNullOrWhiteSpace(search)
                                ? null
                                : search.Trim(),
                        p_CampusId = campusId,
                        p_CollegeId = ResolveCollegeId()
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<HostelAttendanceReportDto>>
            GetAttendanceReportAsync(
                int? hostelId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? session = null,
                string? attendanceStatus = null,
                string? search = null,
                int? campusId = null)
        {
            if (campusId == TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<HostelAttendanceReportDto>();
            }

            return await _dbConnection
                .QueryAsync<HostelAttendanceReportDto>(
                    "sp_GetHostelAttendanceReport",
                    new
                    {
                        p_HostelId = hostelId,
                        p_FromDate =
                            fromDate?.Date,
                        p_ToDate =
                            toDate?.Date,
                        p_Session =
                            string.IsNullOrWhiteSpace(session)
                                ? null
                                : session.Trim(),
                        p_AttendanceStatus =
                            string.IsNullOrWhiteSpace(
                                attendanceStatus)
                                ? null
                                : attendanceStatus.Trim(),
                        p_Search =
                            string.IsNullOrWhiteSpace(search)
                                ? null
                                : search.Trim(),
                        p_CampusId = campusId,
                        p_CollegeId = ResolveCollegeId()
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<HostelOutpassLeaveReportDto>>
            GetOutpassLeaveReportAsync(
                int? hostelId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? search = null,
                int? campusId = null)
        {
            if (campusId == TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<HostelOutpassLeaveReportDto>();
            }

            return await _dbConnection
                .QueryAsync<HostelOutpassLeaveReportDto>(
                    "sp_GetHostelOutpassLeaveReport",
                    new
                    {
                        p_HostelId = hostelId,
                        p_FromDate =
                            fromDate?.Date,
                        p_ToDate =
                            toDate?.Date,
                        p_RequestType =
                            string.IsNullOrWhiteSpace(
                                requestType)
                                ? null
                                : requestType.Trim(),
                        p_ApprovalStatus =
                            string.IsNullOrWhiteSpace(
                                approvalStatus)
                                ? null
                                : approvalStatus.Trim(),
                        p_Search =
                            string.IsNullOrWhiteSpace(search)
                                ? null
                                : search.Trim(),
                        p_CampusId = campusId,
                        p_CollegeId = ResolveCollegeId()
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<HostelTransferVacateReportDto>>
            GetTransferVacateReportAsync(
                int? studentId = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? feeSettlementStatus = null,
                string? search = null,
                int? campusId = null)
        {
            if (campusId == TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<HostelTransferVacateReportDto>();
            }

            return await _dbConnection
                .QueryAsync<HostelTransferVacateReportDto>(
                    "sp_GetHostelTransferVacateReport",
                    new
                    {
                        p_StudentId = studentId,
                        p_FromDate = fromDate?.Date,
                        p_ToDate = toDate?.Date,
                        p_RequestType = string.IsNullOrWhiteSpace(requestType) ? null : requestType.Trim(),
                        p_ApprovalStatus = string.IsNullOrWhiteSpace(approvalStatus) ? null : approvalStatus.Trim(),
                        p_FeeSettlementStatus = string.IsNullOrWhiteSpace(feeSettlementStatus) ? null : feeSettlementStatus.Trim(),
                        p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                        p_CampusId = campusId,
                        p_CollegeId = ResolveCollegeId()
                    },
                    commandType: CommandType.StoredProcedure);
        }
    }
}
