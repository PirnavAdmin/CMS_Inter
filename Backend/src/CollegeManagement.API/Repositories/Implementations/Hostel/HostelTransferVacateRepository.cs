using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelTransferVacateRepository : IHostelTransferVacateRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelTransferVacateRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelTransferVacate>> GetAllAsync(
            int? studentId = null,
            string? requestType = null,
            string? approvalStatus = null,
            string? feeSettlementStatus = null,
            DateTime? requestDate = null,
            string? search = null)
        {
            return await _dbConnection.QueryAsync<HostelTransferVacate>(
                "sp_GetHostelTransferVacate",
                new
                {
                    p_StudentId = studentId,
                    p_RequestType = string.IsNullOrWhiteSpace(requestType) ? null : requestType.Trim(),
                    p_ApprovalStatus = string.IsNullOrWhiteSpace(approvalStatus) ? null : approvalStatus.Trim(),
                    p_FeeSettlementStatus = string.IsNullOrWhiteSpace(feeSettlementStatus) ? null : feeSettlementStatus.Trim(),
                    p_RequestDate = requestDate?.Date,
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelTransferVacate?> GetByIdAsync(int requestId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelTransferVacate>(
                "sp_GetHostelTransferVacateById",
                new { p_RequestId = requestId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelTransferVacate?> GetOpenRequestByAllocationAsync(
            int allocationId,
            int? excludeRequestId = null)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelTransferVacate>(
                "sp_GetOpenHostelTransferVacateByAllocation",
                new
                {
                    p_AllocationId = allocationId,
                    p_ExcludeRequestId = excludeRequestId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelTransferVacate request)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelTransferVacate",
                new
                {
                    p_AllocationId = request.AllocationId,
                    p_StudentId = request.StudentId,
                    p_RequestType = request.RequestType,
                    p_FromHostelId = request.FromHostelId,
                    p_FromRoomId = request.FromRoomId,
                    p_FromBedId = request.FromBedId,
                    p_ToHostelId = request.ToHostelId,
                    p_ToRoomId = request.ToRoomId,
                    p_ToBedId = request.ToBedId,
                    p_WardenAssignmentId = request.WardenAssignmentId,
                    p_RequestDate = request.RequestDate,
                    p_EffectiveDate = request.EffectiveDate,
                    p_Reason = request.Reason,
                    p_ApprovalStatus = request.ApprovalStatus,
                    p_ApprovalRemarks = request.ApprovalRemarks,
                    p_ApprovedAt = request.ApprovedAt,
                    p_FeeSettlementStatus = request.FeeSettlementStatus,
                    p_RefundAmount = request.RefundAmount,
                    p_AdditionalChargeAmount = request.AdditionalChargeAmount,
                    p_SettlementRemarks = request.SettlementRemarks,
                    p_CompletedAt = request.CompletedAt
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelTransferVacate request)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelTransferVacate",
                new
                {
                    p_RequestId = request.RequestId,
                    p_AllocationId = request.AllocationId,
                    p_StudentId = request.StudentId,
                    p_RequestType = request.RequestType,
                    p_FromHostelId = request.FromHostelId,
                    p_FromRoomId = request.FromRoomId,
                    p_FromBedId = request.FromBedId,
                    p_ToHostelId = request.ToHostelId,
                    p_ToRoomId = request.ToRoomId,
                    p_ToBedId = request.ToBedId,
                    p_WardenAssignmentId = request.WardenAssignmentId,
                    p_RequestDate = request.RequestDate,
                    p_EffectiveDate = request.EffectiveDate,
                    p_Reason = request.Reason
                },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> UpdateApprovalAsync(
            int requestId,
            string approvalStatus,
            string? approvalRemarks,
            DateTime? approvedAt)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelTransferVacateApproval",
                new
                {
                    p_RequestId = requestId,
                    p_ApprovalStatus = approvalStatus,
                    p_ApprovalRemarks = approvalRemarks,
                    p_ApprovedAt = approvedAt
                },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> UpdateSettlementAsync(
            int requestId,
            string feeSettlementStatus,
            decimal refundAmount,
            decimal additionalChargeAmount,
            string? settlementRemarks)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelTransferVacateSettlement",
                new
                {
                    p_RequestId = requestId,
                    p_FeeSettlementStatus = feeSettlementStatus,
                    p_RefundAmount = refundAmount,
                    p_AdditionalChargeAmount = additionalChargeAmount,
                    p_SettlementRemarks = settlementRemarks
                },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> CompleteAsync(int requestId)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CompleteHostelTransferVacate",
                new { p_RequestId = requestId },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(int requestId)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelTransferVacate",
                new { p_RequestId = requestId },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(int requestId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelTransferVacateExists",
                new { p_RequestId = requestId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> AllocationExistsAsync(int allocationId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelStudentAllocationExists",
                new { p_AllocationId = allocationId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> ActiveAllocationMatchesAsync(
            int allocationId,
            int studentId,
            int hostelId,
            int roomId,
            int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelActiveAllocationMatches",
                new
                {
                    p_AllocationId = allocationId,
                    p_StudentId = studentId,
                    p_HostelId = hostelId,
                    p_RoomId = roomId,
                    p_BedId = bedId
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> HostelExistsAsync(int hostelId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBlockExists",
                new { p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> RoomExistsAsync(int roomId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomMasterExists",
                new { p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> BedExistsAsync(int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBedExists",
                new { p_BedId = bedId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> RoomBelongsToHostelAsync(int roomId, int hostelId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomBelongsToHostel",
                new { p_RoomId = roomId, p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> BedBelongsToRoomAsync(int bedId, int roomId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckBedBelongsToRoom",
                new { p_BedId = bedId, p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> IsBedAvailableAsync(int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBedIsAvailable",
                new { p_BedId = bedId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> WardenAssignmentExistsAsync(int wardenAssignmentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckActiveHostelWardenAssignmentExists",
                new { p_WardenAssignmentId = wardenAssignmentId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }
    }
}