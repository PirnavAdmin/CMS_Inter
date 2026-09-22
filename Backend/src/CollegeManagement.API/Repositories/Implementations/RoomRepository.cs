using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class RoomRepository : IRoomRepository
    {
        private readonly AppDbContext _context;

        public RoomRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<Room>> GetAllAsync()
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Building", null, DbType.String);
            parameters.Add("p_Floor", null, DbType.String);
            parameters.Add("p_RoomType", null, DbType.String);
            parameters.Add("p_IsActive", null, DbType.Boolean);
            parameters.Add("p_SearchTerm", null, DbType.String);
            parameters.Add("p_OnlyAvailable", 0, DbType.Int32);

            return await Connection.QueryAsync<Room>(
                "sp_GetRooms",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<Room>> GetAllFilteredAsync(RoomFilterDto? filter)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Building", string.IsNullOrWhiteSpace(filter?.Building) ? null : filter.Building.Trim(), DbType.String);
            parameters.Add("p_Floor", string.IsNullOrWhiteSpace(filter?.Floor) ? null : filter.Floor.Trim(), DbType.String);
            parameters.Add("p_RoomType", string.IsNullOrWhiteSpace(filter?.RoomType) ? null : filter.RoomType.Trim(), DbType.String);
            parameters.Add("p_IsActive", filter?.IsActive, DbType.Boolean);
            parameters.Add("p_SearchTerm", string.IsNullOrWhiteSpace(filter?.SearchTerm) ? null : filter.SearchTerm.Trim(), DbType.String);
            parameters.Add("p_OnlyAvailable", (filter?.OnlyAvailable == true || filter?.ExcludeAssigned == true) ? 1 : 0, DbType.Int32);

            return await Connection.QueryAsync<Room>(
                "sp_GetRooms",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<SectionAssignedDto>> GetAssignedActiveSectionsByRoomAsync(int roomId, string? roomCode)
        {
            return await Connection.QueryAsync<SectionAssignedDto>(
                "sp_GetAssignedSectionsByRoom",
                new
                {
                    p_RoomId = roomId,
                    p_RoomCode = string.IsNullOrWhiteSpace(roomCode) ? null : roomCode.Trim()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Room?> GetByIdAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<Room>(
                "sp_GetRoomById",
                new { p_RoomId = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Room?> GetByCodeAsync(string roomCode)
        {
            return await Connection.QueryFirstOrDefaultAsync<Room>(
                "sp_GetRoomByCode",
                new { p_RoomCode = roomCode?.Trim() },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Room> AddAsync(Room room)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "sp_CreateRoom",
                new
                {
                    p_RoomCode = room.RoomCode ?? room.RoomNumber,
                    p_RoomName = room.RoomName ?? room.RoomCode ?? room.RoomNumber,
                    p_Capacity = room.Capacity,
                    p_RoomType = room.RoomType,
                    p_Building = room.BlockName ?? room.Building ?? room.BuildingName,
                    p_BlockName = room.BlockName ?? room.Building ?? room.BuildingName,
                    p_Floor = room.Floor,
                    p_IsActive = room.IsActive
                },
                commandType: CommandType.StoredProcedure);

            room.RoomId = id;
            return room;
        }

        public async Task UpdateAsync(Room room)
        {
            await Connection.ExecuteAsync(
                "sp_UpdateRoom",
                new
                {
                    p_RoomId = room.RoomId,
                    p_RoomCode = room.RoomCode ?? room.RoomNumber,
                    p_RoomName = room.RoomName ?? room.RoomCode ?? room.RoomNumber,
                    p_Capacity = room.Capacity,
                    p_RoomType = room.RoomType,
                    p_Building = room.BlockName ?? room.Building ?? room.BuildingName,
                    p_BlockName = room.BlockName ?? room.Building ?? room.BuildingName,
                    p_Floor = room.Floor,
                    p_IsActive = room.IsActive
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task DeleteAsync(int id)
        {
            await Connection.ExecuteAsync(
                "sp_DeleteRoom",
                new { p_RoomId = id },
                commandType: CommandType.StoredProcedure);
        }
    }
}
