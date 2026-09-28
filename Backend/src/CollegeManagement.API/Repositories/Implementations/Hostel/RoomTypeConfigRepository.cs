using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class RoomTypeConfigRepository : IRoomTypeConfigRepository
    {
        private readonly IDbConnection _dbConnection;

        public RoomTypeConfigRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<RoomTypeConfig>> GetAllAsync(
            string? search = null,
            string? status = null)
        {
            return await _dbConnection.QueryAsync<RoomTypeConfig>(
                "sp_GetRoomTypeConfigs",
                new
                {
                    p_Search = search,
                    p_Status = status
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<RoomTypeConfig?> GetByIdAsync(int roomTypeId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<RoomTypeConfig>(
                "sp_GetRoomTypeConfigById",
                new { p_RoomTypeId = roomTypeId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<RoomTypeConfig?> GetBySpecificationAsync(
            string roomTypeSpecification)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<RoomTypeConfig>(
                "sp_GetRoomTypeConfigBySpecification",
                new { p_RoomTypeSpecification = roomTypeSpecification },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(
            RoomTypeConfig roomTypeConfig)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateRoomTypeConfig",
                new
                {
                    p_RoomTypeSpecification = roomTypeConfig.RoomTypeSpecification,
                    p_BedCapacity = roomTypeConfig.BedCapacity,
                    p_AcType = roomTypeConfig.AcType,
                    p_Status = roomTypeConfig.Status,
                    p_Description = roomTypeConfig.Description
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(
            RoomTypeConfig roomTypeConfig)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateRoomTypeConfig",
                new
                {
                    p_RoomTypeId = roomTypeConfig.RoomTypeId,
                    p_RoomTypeSpecification = roomTypeConfig.RoomTypeSpecification,
                    p_BedCapacity = roomTypeConfig.BedCapacity,
                    p_AcType = roomTypeConfig.AcType,
                    p_Status = roomTypeConfig.Status,
                    p_Description = roomTypeConfig.Description
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int roomTypeId)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteRoomTypeConfig",
                new { p_RoomTypeId = roomTypeId },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int roomTypeId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomTypeConfigExists",
                new { p_RoomTypeId = roomTypeId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> IsInUseAsync(int roomTypeId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomTypeConfigIsInUse",
                new { p_RoomTypeId = roomTypeId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }
    }
}