using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelFeeConfigRepository : IHostelFeeConfigRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelFeeConfigRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<int> CreateAsync(CreateHostelFeeConfigRequest request)
        {
            return await _dbConnection.QuerySingleAsync<int>(
                "sp_CreateHostelFeeConfig",
                new
                {
                    p_HostelId = request.HostelId,
                    p_RoomTypeId = request.RoomTypeId,
                    p_FeeFrequency = request.FeeFrequency,
                    p_HostelFeeAmount = request.HostelFeeAmount,
                    p_SecurityDeposit = request.SecurityDeposit,
                    p_EffectiveDate = request.EffectiveDate,
                    p_Status = request.Status
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<HostelFeeConfigDto>> GetAllAsync(int? hostelId, string? status)
        {
            return await _dbConnection.QueryAsync<HostelFeeConfigDto>(
                "sp_GetHostelFeeConfigs",
                new
                {
                    p_HostelId = hostelId,
                    p_Status = status
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelFeeConfigDto?> GetByIdAsync(int feeConfigId)
        {
            return await _dbConnection.QuerySingleOrDefaultAsync<HostelFeeConfigDto>(
                "sp_GetHostelFeeConfigById",
                new { p_FeeConfigId = feeConfigId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(int feeConfigId, UpdateHostelFeeConfigRequest request)
        {
            var affectedRows = await _dbConnection.ExecuteAsync(
                "sp_UpdateHostelFeeConfig",
                new
                {
                    p_FeeConfigId = feeConfigId,
                    p_HostelId = request.HostelId,
                    p_RoomTypeId = request.RoomTypeId,
                    p_FeeFrequency = request.FeeFrequency,
                    p_HostelFeeAmount = request.HostelFeeAmount,
                    p_SecurityDeposit = request.SecurityDeposit,
                    p_EffectiveDate = request.EffectiveDate,
                    p_Status = request.Status
                },
                commandType: CommandType.StoredProcedure);
            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int feeConfigId)
        {
            var affectedRows = await _dbConnection.ExecuteAsync(
                "sp_DeleteHostelFeeConfig",
                new { p_FeeConfigId = feeConfigId },
                commandType: CommandType.StoredProcedure);
            return affectedRows > 0;
        }
    }
}
