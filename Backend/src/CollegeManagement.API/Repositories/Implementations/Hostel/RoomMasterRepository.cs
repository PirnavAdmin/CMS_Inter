using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class RoomMasterRepository : IRoomMasterRepository
    {
        private readonly IDbConnection _dbConnection;

        public RoomMasterRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<RoomMaster>> GetAllAsync(
            int? hostelId = null,
            int? roomTypeId = null,
            string? status = null,
            string? search = null)
        {
            return await _dbConnection.QueryAsync<RoomMaster>(
                "sp_GetRoomMasters",
                new
                {
                    p_HostelId = hostelId,
                    p_RoomTypeId = roomTypeId,
                    p_Status = status,
                    p_Search = search
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<RoomMaster?> GetByIdAsync(int roomId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<RoomMaster>(
                "sp_GetRoomMasterById",
                new { p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<RoomMaster?> GetByRoomNumberAsync(
            int hostelId,
            string roomNumber)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<RoomMaster>(
                "sp_GetRoomMasterByNumber",
                new
                {
                    p_HostelId = hostelId,
                    p_RoomNumber = roomNumber
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(RoomMaster room)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateRoomMaster",
                new
                {
                    p_HostelId = room.HostelId,
                    p_RoomTypeId = room.RoomTypeId,
                    p_FloorLevel = room.FloorLevel,
                    p_RoomNumber = room.RoomNumber,
                    p_Status = room.Status
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(RoomMaster room)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateRoomMaster",
                new
                {
                    p_RoomId = room.RoomId,
                    p_HostelId = room.HostelId,
                    p_RoomTypeId = room.RoomTypeId,
                    p_FloorLevel = room.FloorLevel,
                    p_RoomNumber = room.RoomNumber,
                    p_Status = room.Status
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int roomId)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteRoomMaster",
                new { p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int roomId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomMasterExists",
                new { p_RoomId = roomId },
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

        public async Task<bool> RoomTypeExistsAsync(int roomTypeId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomTypeConfigExists",
                new { p_RoomTypeId = roomTypeId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }
    }
}
