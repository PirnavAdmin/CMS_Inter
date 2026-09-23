using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelStudentAllocationRepository : IHostelStudentAllocationRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelStudentAllocationRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelStudentAllocation>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            string? status = null,
            string? search = null)
        {
            var parameters = new
            {
                p_HostelId = hostelId,
                p_RoomId = roomId,
                p_StudentId = studentId,
                p_Status = status,
                p_Search = search
            };

            return await _dbConnection.QueryAsync<HostelStudentAllocation>(
                "sp_GetHostelStudentAllocations",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelStudentAllocation?> GetByIdAsync(int allocationId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                "sp_GetHostelStudentAllocationById",
                new { p_AllocationId = allocationId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelStudentAllocation?> GetActiveByStudentAsync(int studentId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                "sp_GetActiveHostelStudentAllocationByStudent",
                new { p_StudentId = studentId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelStudentAllocation?> GetActiveByBedAsync(int bedId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                "sp_GetActiveHostelStudentAllocationByBed",
                new { p_BedId = bedId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelStudentAllocation allocation)
        {
            var parameters = new
            {
                p_StudentId = allocation.StudentId,
                p_HostelId = allocation.HostelId,
                p_RoomId = allocation.RoomId,
                p_BedId = allocation.BedId,
                p_WardenAssignmentId = allocation.WardenAssignmentId,
                p_JoiningDate = allocation.JoiningDate.Date,
                p_Status = allocation.Status,
                p_Remarks = allocation.Remarks
            };

            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelStudentAllocation",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelStudentAllocation allocation)
        {
            var parameters = new
            {
                p_AllocationId = allocation.AllocationId,
                p_StudentId = allocation.StudentId,
                p_HostelId = allocation.HostelId,
                p_RoomId = allocation.RoomId,
                p_BedId = allocation.BedId,
                p_WardenAssignmentId = allocation.WardenAssignmentId,
                p_JoiningDate = allocation.JoiningDate.Date,
                p_Status = allocation.Status,
                p_Remarks = allocation.Remarks
            };

            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelStudentAllocation",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(int allocationId)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelStudentAllocation",
                new { p_AllocationId = allocationId },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(int allocationId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelStudentAllocationExists",
                new { p_AllocationId = allocationId },
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

        public async Task<bool> WardenAssignmentExistsAsync(int wardenAssignmentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckActiveHostelWardenAssignmentExists",
                new { p_WardenAssignmentId = wardenAssignmentId },
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
    }
}
