using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelWardenAssignmentRepository : IHostelWardenAssignmentRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public HostelWardenAssignmentRepository(IDbConnection dbConnection, IHttpContextAccessor? httpContextAccessor = null)
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

        public async Task<IEnumerable<HostelWardenAssignment>> GetAllAsync(
            int? hostelId = null,
            int? staffId = null,
            string? status = null,
            string? search = null,
            int? campusId = null)
        {
            var collegeId = ResolveCollegeId();
            return await _dbConnection.QueryAsync<HostelWardenAssignment>(
                "sp_GetHostelWardenAssignments",
                new
                {
                    p_HostelId = hostelId,
                    p_StaffId = staffId,
                    p_Status = status,
                    p_Search = search,
                    p_CampusId = campusId,
                    p_CollegeId = collegeId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelWardenAssignment?> GetByIdAsync(int wardenAssignmentId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                "sp_GetHostelWardenAssignmentById",
                new
                {
                    p_WardenAssignmentId = wardenAssignmentId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelWardenAssignment?> GetActiveByHostelAsync(int hostelId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                "sp_GetActiveHostelWardenByHostel",
                new
                {
                    p_HostelId = hostelId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelWardenAssignment?> GetActiveByStaffAsync(int staffId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                "sp_GetActiveHostelWardenByStaff",
                new
                {
                    p_StaffId = staffId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelWardenAssignment assignment)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelWardenAssignment",
                new
                {
                    p_StaffId = assignment.StaffId,
                    p_HostelId = assignment.HostelId,
                    p_AssignmentDate = assignment.AssignmentDate,
                    p_Status = assignment.Status
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelWardenAssignment assignment)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelWardenAssignment",
                new
                {
                    p_WardenAssignmentId = assignment.WardenAssignmentId,
                    p_StaffId = assignment.StaffId,
                    p_HostelId = assignment.HostelId,
                    p_AssignmentDate = assignment.AssignmentDate,
                    p_Status = assignment.Status,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int wardenAssignmentId)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelWardenAssignment",
                new
                {
                    p_WardenAssignmentId = wardenAssignmentId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int wardenAssignmentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelWardenAssignmentExists",
                new
                {
                    p_WardenAssignmentId = wardenAssignmentId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> StaffExistsAsync(int staffId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelStaffExists",
                new
                {
                    p_StaffId = staffId,
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
    }
}