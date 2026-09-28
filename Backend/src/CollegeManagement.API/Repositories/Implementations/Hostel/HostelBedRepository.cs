using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelBedRepository : IHostelBedRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelBedRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelBed>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            string? bedStatus = null,
            string? status = null,
            string? search = null)
        {
            return await _dbConnection.QueryAsync<HostelBed>(
                "sp_GetHostelBeds",
                new
                {
                    p_HostelId = hostelId,
                    p_RoomId = roomId,
                    p_BedStatus = bedStatus,
                    p_Status = status,
                    p_Search = search
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelBed?> GetByIdAsync(int bedId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelBed>(
                "sp_GetHostelBedById",
                new { p_BedId = bedId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelBed?> GetByBedNumberAsync(
            int roomId,
            string bedNumber)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelBed>(
                "sp_GetHostelBedByNumber",
                new
                {
                    p_RoomId = roomId,
                    p_BedNumber = bedNumber
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelBed bed)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelBed",
                new
                {
                    p_RoomId = bed.RoomId,
                    p_BedNumber = bed.BedNumber,
                    p_BedStatus = bed.BedStatus,
                    p_Status = bed.Status
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelBed bed)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelBed",
                new
                {
                    p_BedId = bed.BedId,
                    p_RoomId = bed.RoomId,
                    p_BedNumber = bed.BedNumber,
                    p_BedStatus = bed.BedStatus,
                    p_Status = bed.Status
                },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteAsync(int bedId)
        {
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelBed",
                new { p_BedId = bedId },
                commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> ExistsAsync(int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBedExists",
                new { p_BedId = bedId },
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

        public async Task<int> GetBedCountByRoomAsync(int roomId)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_GetHostelBedCountByRoom",
                new { p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> GetRoomBedCapacityAsync(int roomId)
        {
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_GetHostelRoomBedCapacity",
                new { p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);
        }
    }
}