using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class LeaveManagementRepository : ILeaveManagementRepository
    {
        private readonly AppDbContext _context;

        public LeaveManagementRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State == ConnectionState.Broken || conn.State == ConnectionState.Closed)
            {
                try { await conn.CloseAsync(); } catch { }
                await _context.Database.OpenConnectionAsync();
            }
            else if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task<IEnumerable<StaffLeaveResponse>> GetStaffLeaveRequestsAsync(int? campusId = null, int? staffId = null, int? departmentId = null, LeaveStatus? status = null)
        {
            var conn = await GetOpenConnectionAsync();
            var results = await conn.QueryAsync<StaffLeaveResponse>(
                "sp_GetStaffLeaveRequests",
                new
                {
                    p_CampusId = campusId ?? 0,
                    p_StaffId = staffId ?? 0,
                    p_DepartmentId = departmentId ?? 0,
                    p_Status = status.HasValue ? (int)status.Value : 0
                },
                commandType: CommandType.StoredProcedure);

            return results.ToList();
        }

        private class LeaveDetailsDbRow
        {
            public int StaffLeaveRequestId { get; set; }
            public int StaffId { get; set; }
            public string StaffName { get; set; } = string.Empty;
            public string StaffCode { get; set; } = string.Empty;
            public string Department { get; set; } = string.Empty;
            public string StaffType { get; set; } = string.Empty;
            public LeaveType LeaveType { get; set; }
            public int? LeaveCategoryId { get; set; }
            public string? LeaveCategoryName { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public decimal TotalDays { get; set; }
            public string? Reason { get; set; }
            public LeaveStatus Status { get; set; }
            public string? RejectionReason { get; set; }
            public int? ApprovedByUserId { get; set; }
            public string? ApprovedByUserName { get; set; }
            public DateTime? ApprovedAt { get; set; }
            public DateTime CreatedAt { get; set; }
            public decimal TotalBalance { get; set; }
            public decimal UsedBalance { get; set; }
            public decimal RemainingBalance { get; set; }
        }

        public async Task<LeaveDetailsDto?> GetStaffLeaveDetailsAsync(int leaveRequestId)
        {
            var conn = await GetOpenConnectionAsync();
            var row = await conn.QueryFirstOrDefaultAsync<LeaveDetailsDbRow>(
                "sp_GetStaffLeaveDetails",
                new { p_StaffLeaveRequestId = leaveRequestId },
                commandType: CommandType.StoredProcedure);

            if (row == null) return null;

            return new LeaveDetailsDto
            {
                StaffLeaveRequestId = row.StaffLeaveRequestId,
                StaffId = row.StaffId,
                StaffName = row.StaffName,
                StaffCode = row.StaffCode,
                Department = row.Department,
                StaffType = row.StaffType,
                LeaveType = row.LeaveType,
                LeaveCategoryId = row.LeaveCategoryId,
                LeaveCategoryName = row.LeaveCategoryName,
                StartDate = row.StartDate,
                EndDate = row.EndDate,
                TotalDays = row.TotalDays,
                Reason = row.Reason,
                Status = row.Status,
                RejectionReason = row.RejectionReason,
                ApprovedByUserId = row.ApprovedByUserId,
                ApprovedByUserName = row.ApprovedByUserName,
                ApprovedAt = row.ApprovedAt,
                CreatedAt = row.CreatedAt,
                Balance = new LeaveBalanceDto
                {
                    Total = row.TotalBalance,
                    Used = row.UsedBalance,
                    Remaining = row.RemainingBalance
                }
            };
        }

        public async Task<StaffLeaveResponse> CreateStaffLeaveRequestAsync(CreateStaffLeaveRequest request, int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var row = await conn.QueryFirstOrDefaultAsync<LeaveDetailsDbRow>(
                "sp_CreateStaffLeaveRequest",
                new
                {
                    p_StaffId = request.StaffId,
                    p_LeaveType = (byte)request.LeaveType,
                    p_LeaveCategoryId = request.LeaveCategoryId ?? 0,
                    p_StartDate = request.StartDate.Date,
                    p_EndDate = request.EndDate.Date,
                    p_Reason = request.Reason ?? string.Empty,
                    p_DepartmentId = request.DepartmentId ?? 0,
                    p_AcademicYearId = request.AcademicYearId ?? 0,
                    p_UserId = userId
                },
                commandType: CommandType.StoredProcedure);

            if (row == null)
            {
                throw new InvalidOperationException("Failed to create staff leave request.");
            }

            return new StaffLeaveResponse
            {
                StaffLeaveRequestId = row.StaffLeaveRequestId,
                StaffId = row.StaffId,
                StaffName = row.StaffName,
                Department = row.Department,
                StaffType = row.StaffType,
                LeaveType = row.LeaveType,
                LeaveCategoryId = row.LeaveCategoryId,
                LeaveCategoryName = row.LeaveCategoryName,
                StartDate = row.StartDate,
                EndDate = row.EndDate,
                TotalDays = row.TotalDays,
                Reason = row.Reason,
                Status = row.Status,
                RejectionReason = row.RejectionReason,
                ApprovedByUserId = row.ApprovedByUserId,
                ApprovedByUserName = row.ApprovedByUserName,
                ApprovedAt = row.ApprovedAt,
                CreatedAt = row.CreatedAt
            };
        }

        public async Task<StaffLeaveResponse> ActionStaffLeaveRequestAsync(int leaveRequestId, StaffLeaveActionRequest request, int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var row = await conn.QueryFirstOrDefaultAsync<LeaveDetailsDbRow>(
                "sp_ActionStaffLeaveRequest",
                new
                {
                    p_StaffLeaveRequestId = leaveRequestId,
                    p_Status = (byte)request.Status,
                    p_RejectionReason = request.RejectionReason,
                    p_UserId = userId
                },
                commandType: CommandType.StoredProcedure);

            if (row == null)
            {
                throw new InvalidOperationException("Failed to update staff leave request status.");
            }

            return new StaffLeaveResponse
            {
                StaffLeaveRequestId = row.StaffLeaveRequestId,
                StaffId = row.StaffId,
                StaffName = row.StaffName,
                Department = row.Department,
                StaffType = row.StaffType,
                LeaveType = row.LeaveType,
                LeaveCategoryId = row.LeaveCategoryId,
                LeaveCategoryName = row.LeaveCategoryName,
                StartDate = row.StartDate,
                EndDate = row.EndDate,
                TotalDays = row.TotalDays,
                Reason = row.Reason,
                Status = row.Status,
                RejectionReason = row.RejectionReason,
                ApprovedByUserId = row.ApprovedByUserId,
                ApprovedByUserName = row.ApprovedByUserName,
                ApprovedAt = row.ApprovedAt,
                CreatedAt = row.CreatedAt
            };
        }

        public async Task<IEnumerable<StaffLeaveHistorySummaryDto>> GetStaffLeaveHistorySummaryAsync(int? campusId = null, int? departmentId = null, string? staffType = null)
        {
            var conn = await GetOpenConnectionAsync();
            var results = await conn.QueryAsync<StaffLeaveHistorySummaryDto>(
                "sp_GetStaffLeaveHistorySummary",
                new
                {
                    p_CampusId = campusId ?? 0,
                    p_DepartmentId = departmentId ?? 0,
                    p_StaffType = staffType ?? string.Empty
                },
                commandType: CommandType.StoredProcedure);

            return results.ToList();
        }

        private class StaffLeaveHistoryHeaderRow
        {
            public int StaffId { get; set; }
            public string StaffName { get; set; } = string.Empty;
            public string StaffCode { get; set; } = string.Empty;
            public string Department { get; set; } = string.Empty;
            public string StaffType { get; set; } = string.Empty;
            public int TotalRequests { get; set; }
            public int Approved { get; set; }
            public int Pending { get; set; }
            public int Rejected { get; set; }
            public decimal TotalBalance { get; set; }
            public decimal UsedBalance { get; set; }
            public decimal RemainingBalance { get; set; }
        }

        public async Task<StaffLeaveHistoryDto> GetStaffLeaveHistoryAsync(int staffId, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetStaffLeaveHistory",
                new
                {
                    p_StaffId = staffId,
                    p_CampusId = campusId ?? 0
                },
                commandType: CommandType.StoredProcedure);

            var header = await multi.ReadFirstOrDefaultAsync<StaffLeaveHistoryHeaderRow>();
            var history = (await multi.ReadAsync<StaffLeaveResponse>()).ToList();

            if (header == null)
            {
                throw new CollegeManagement.API.Exceptions.NotFoundException($"Staff member with ID {staffId} not found.");
            }

            return new StaffLeaveHistoryDto
            {
                StaffId = header.StaffId,
                StaffName = header.StaffName,
                StaffCode = header.StaffCode,
                Department = header.Department,
                StaffType = header.StaffType,
                TotalRequests = header.TotalRequests,
                Approved = header.Approved,
                Pending = header.Pending,
                Rejected = header.Rejected,
                Balance = new LeaveBalanceDto
                {
                    Total = header.TotalBalance,
                    Used = header.UsedBalance,
                    Remaining = header.RemainingBalance
                },
                History = history
            };
        }
    }
}
