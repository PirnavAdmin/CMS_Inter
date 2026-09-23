using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelWardenAssignmentRepository : IHostelWardenAssignmentRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelWardenAssignmentRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelWardenAssignment>> GetAllAsync(
            int? hostelId = null,
            int? staffId = null,
            string? status = null,
            string? search = null)
        {
            return await _dbConnection.QueryAsync<HostelWardenAssignment>(
                "sp_GetHostelWardenAssignments",
                new
                {
                    p_HostelId = hostelId,
                    p_StaffId = staffId,
                    p_Status = status,
                    p_Search = search
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelWardenAssignment?> GetByIdAsync(int wardenAssignmentId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                "sp_GetHostelWardenAssignmentById",
                new { p_WardenAssignmentId = wardenAssignmentId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelWardenAssignment?> GetActiveByHostelAsync(int hostelId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                "sp_GetActiveHostelWardenByHostel",
                new { p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelWardenAssignment?> GetActiveByStaffAsync(int staffId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelWardenAssignment>(
                "sp_GetActiveHostelWardenByStaff",
                new { p_StaffId = staffId },
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
                    p_Status = assignment.Status
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int wardenAssignmentId)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelWardenAssignment",
                new { p_WardenAssignmentId = wardenAssignmentId },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int wardenAssignmentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelWardenAssignmentExists",
                new { p_WardenAssignmentId = wardenAssignmentId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> StaffExistsAsync(int staffId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckStaffExists",
                new { p_StaffId = staffId },
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
    }
}