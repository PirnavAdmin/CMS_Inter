using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelBlockRepository : IHostelBlockRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelBlockRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelBlock>> GetAllAsync(
            string? search = null,
            string? status = null)
        {
            return await _dbConnection.QueryAsync<HostelBlock>(
                "sp_GetHostelBlocks",
                new
                {
                    p_Search = search,
                    p_Status = status
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelBlock?> GetByIdAsync(int hostelId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelBlock>(
                "sp_GetHostelBlockById",
                new { p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelBlock?> GetByCodeAsync(string hostelCode)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelBlock>(
                "sp_GetHostelBlockByCode",
                new { p_HostelCode = hostelCode },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelBlock hostelBlock)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelBlock",
                new
                {
                    p_HostelName = hostelBlock.HostelName,
                    p_HostelCode = hostelBlock.HostelCode,
                    p_HostelType = hostelBlock.HostelType,
                    p_TotalFloors = hostelBlock.TotalFloors,
                    p_WardenName = hostelBlock.WardenName,
                    p_PrimaryMobileNumber = hostelBlock.PrimaryMobileNumber,
                    p_AlternateMobileNumber = hostelBlock.AlternateMobileNumber,
                    p_Email = hostelBlock.Email,
                    p_Status = hostelBlock.Status,
                    p_Address = hostelBlock.Address
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelBlock hostelBlock)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelBlock",
                new
                {
                    p_HostelId = hostelBlock.HostelId,
                    p_HostelName = hostelBlock.HostelName,
                    p_HostelCode = hostelBlock.HostelCode,
                    p_HostelType = hostelBlock.HostelType,
                    p_TotalFloors = hostelBlock.TotalFloors,
                    p_WardenName = hostelBlock.WardenName,
                    p_PrimaryMobileNumber = hostelBlock.PrimaryMobileNumber,
                    p_AlternateMobileNumber = hostelBlock.AlternateMobileNumber,
                    p_Email = hostelBlock.Email,
                    p_Status = hostelBlock.Status,
                    p_Address = hostelBlock.Address
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int hostelId)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelBlock",
                new { p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int hostelId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBlockExists",
                new { p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }
    }
}