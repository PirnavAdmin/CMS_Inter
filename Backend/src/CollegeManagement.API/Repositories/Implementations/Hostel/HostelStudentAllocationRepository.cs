using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelStudentAllocationRepository : IHostelStudentAllocationRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public HostelStudentAllocationRepository(IDbConnection dbConnection, IHttpContextAccessor? httpContextAccessor = null)
        {
            _dbConnection = dbConnection;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? ResolveCollegeId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CollegeId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("collegeId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            return null;
        }

        public async Task<IEnumerable<HostelStudentAllocation>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            string? status = null,
            string? search = null,
            int? campusId = null)
        {
            var collegeId = ResolveCollegeId();
            var parameters = new
            {
                p_HostelId = hostelId,
                p_RoomId = roomId,
                p_StudentId = studentId,
                p_Status = status,
                p_Search = search,
                p_CampusId = campusId,
                p_CollegeId = collegeId
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
                new
                {
                    p_AllocationId = allocationId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelStudentAllocation?> GetActiveByStudentAsync(int studentId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                "sp_GetActiveHostelStudentAllocationByStudent",
                new
                {
                    p_StudentId = studentId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelStudentAllocation?> GetActiveByBedAsync(int bedId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                "sp_GetActiveHostelStudentAllocationByBed",
                new
                {
                    p_BedId = bedId,
                    p_CollegeId = ResolveCollegeId()
                },
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
                p_Remarks = allocation.Remarks,
                p_CollegeId = ResolveCollegeId()
            };

            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelStudentAllocation",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> VacateAsync(int allocationId, string? reason = null)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_VacateHostelStudentAllocation",
                new
                {
                    p_AllocationId = allocationId,
                    p_Reason = reason,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(int allocationId)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelStudentAllocation",
                new
                {
                    p_AllocationId = allocationId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(int allocationId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelStudentAllocationExists",
                new
                {
                    p_AllocationId = allocationId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> StudentExistsAsync(int studentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelStudentExists",
                new
                {
                    p_StudentId = studentId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> HostelExistsAsync(int hostelId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBlockExists",
                new
                {
                    p_HostelId = hostelId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> RoomExistsAsync(int roomId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomMasterExists",
                new
                {
                    p_RoomId = roomId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> BedExistsAsync(int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBedExists",
                new
                {
                    p_BedId = bedId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> WardenAssignmentExistsAsync(int wardenAssignmentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckActiveHostelWardenAssignmentExists",
                new
                {
                    p_WardenAssignmentId = wardenAssignmentId,
                    p_CollegeId = ResolveCollegeId()
                },
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
