using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelOutpassLeaveRepository : IHostelOutpassLeaveRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelOutpassLeaveRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelOutpassLeave>> GetAllAsync(
            int? hostelId = null,
            int? studentId = null,
            string? requestType = null,
            string? approvalStatus = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? search = null)
        {
            var parameters = new
            {
                p_HostelId = hostelId,
                p_StudentId = studentId,
                p_RequestType = requestType,
                p_ApprovalStatus = approvalStatus,
                p_FromDate = fromDate?.Date,
                p_ToDate = toDate?.Date,
                p_Search = search
            };

            return await _dbConnection.QueryAsync<HostelOutpassLeave>(
                "sp_GetHostelOutpassLeave",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelOutpassLeave?> GetByIdAsync(int requestId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelOutpassLeave>(
                "sp_GetHostelOutpassLeaveById",
                new { p_RequestId = requestId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelOutpassLeave?> GetOverlappingRequestAsync(
            int studentId,
            DateTime fromDateTime,
            DateTime toDateTime,
            int? excludeRequestId = null)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelOutpassLeave>(
                "sp_GetOverlappingHostelOutpassLeave",
                new
                {
                    p_StudentId = studentId,
                    p_FromDateTime = fromDateTime,
                    p_ToDateTime = toDateTime,
                    p_ExcludeRequestId = excludeRequestId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelOutpassLeave request)
        {
            var parameters = new
            {
                p_StudentId = request.StudentId,
                p_HostelId = request.HostelId,
                p_RoomId = request.RoomId,
                p_BedId = request.BedId,
                p_WardenAssignmentId = request.WardenAssignmentId,
                p_RequestType = request.RequestType,
                p_FromDateTime = request.FromDateTime,
                p_ToDateTime = request.ToDateTime,
                p_Reason = request.Reason,
                p_Destination = request.Destination,
                p_ApprovalStatus = request.ApprovalStatus,
                p_ApprovalRemarks = request.ApprovalRemarks,
                p_ApprovedAt = request.ApprovedAt
            };

            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelOutpassLeave",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelOutpassLeave request)
        {
            var parameters = new
            {
                p_RequestId = request.RequestId,
                p_StudentId = request.StudentId,
                p_HostelId = request.HostelId,
                p_RoomId = request.RoomId,
                p_BedId = request.BedId,
                p_WardenAssignmentId = request.WardenAssignmentId,
                p_RequestType = request.RequestType,
                p_FromDateTime = request.FromDateTime,
                p_ToDateTime = request.ToDateTime,
                p_Reason = request.Reason,
                p_Destination = request.Destination
            };

            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelOutpassLeave",
                parameters,
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
                "sp_UpdateHostelOutpassLeaveApproval",
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

        public async Task<bool> DeleteAsync(int requestId)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelOutpassLeave",
                new { p_RequestId = requestId },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(int requestId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelOutpassLeaveExists",
                new { p_RequestId = requestId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> StudentExistsAsync(int studentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckStudentExists",
                new { p_StudentId = studentId },
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

        public async Task<bool> StudentHasActiveAllocationAsync(
            int studentId,
            int hostelId,
            int roomId,
            int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckStudentHasActiveHostelAllocation",
                new
                {
                    p_StudentId = studentId,
                    p_HostelId = hostelId,
                    p_RoomId = roomId,
                    p_BedId = bedId
                },
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
