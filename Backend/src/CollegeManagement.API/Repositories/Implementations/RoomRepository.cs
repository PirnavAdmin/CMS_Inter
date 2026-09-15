using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
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
            return await Connection.QueryAsync<Room>(
                "sp_GetRooms",
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<Room>> GetAllFilteredAsync(CollegeManagement.API.DTOs.Timetable.RoomFilterDto? filter)
        {
            var rooms = await GetAllAsync();
            if (filter == null) return rooms;

            var query = rooms.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(filter.Building))
            {
                var building = filter.Building.Trim();
                query = query.Where(r => string.Equals(r.BlockName, building, System.StringComparison.OrdinalIgnoreCase) ||
                                         string.Equals(r.BuildingName, building, System.StringComparison.OrdinalIgnoreCase) ||
                                         string.Equals(r.Building, building, System.StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(filter.Floor))
            {
                var floor = filter.Floor.Trim();
                query = query.Where(r => string.Equals(r.Floor, floor, System.StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(filter.RoomType))
            {
                var roomType = filter.RoomType.Trim();
                query = query.Where(r => string.Equals(r.RoomType, roomType, System.StringComparison.OrdinalIgnoreCase));
            }

            if (filter.IsActive.HasValue)
            {
                query = query.Where(r => r.IsActive == filter.IsActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var search = filter.SearchTerm.Trim().ToLowerInvariant();
                query = query.Where(r =>
                    (r.RoomCode != null && r.RoomCode.ToLowerInvariant().Contains(search)) ||
                    (r.RoomName != null && r.RoomName.ToLowerInvariant().Contains(search)) ||
                    (r.RoomNumber != null && r.RoomNumber.ToLowerInvariant().Contains(search)) ||
                    (r.BlockName != null && r.BlockName.ToLowerInvariant().Contains(search)) ||
                    (r.BuildingName != null && r.BuildingName.ToLowerInvariant().Contains(search)) ||
                    (r.Floor != null && r.Floor.ToLowerInvariant().Contains(search)) ||
                    (r.RoomType != null && r.RoomType.ToLowerInvariant().Contains(search))
                );
            }

            if (filter.OnlyAvailable == true || filter.ExcludeAssigned == true)
            {
                IEnumerable<int> assignedRoomIds;
                try
                {
                    assignedRoomIds = await Connection.QueryAsync<int>(
                        "sp_GetAssignedRoomIds",
                        commandType: CommandType.StoredProcedure);
                }
                catch (MySqlConnector.MySqlException ex) when (ex.Number == 1305)
                {
                    var assignedSql = @"
                        SELECT DISTINCT RoomId FROM `Sections` WHERE IsActive = 1 AND RoomId IS NOT NULL;";
                    assignedRoomIds = await Connection.QueryAsync<int>(assignedSql);
                }

                var assignedSet = assignedRoomIds.ToHashSet();
                query = query.Where(r => !assignedSet.Contains(r.RoomId));
            }

            return query;
        }

        public async Task<IEnumerable<SectionAssignedDto>> GetAssignedActiveSectionsByRoomAsync(int roomId, string? roomCode)
        {
            try
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
            catch (MySqlConnector.MySqlException ex) when (ex.Number == 1305)
            {
                var sql = @"
                    SELECT SectionId, SectionName, MaximumStrength, IsActive
                    FROM `Sections`
                    WHERE IsActive = 1
                      AND (
                          (@RoomId > 0 AND RoomId = @RoomId)
                          OR (@RoomCode IS NOT NULL AND @RoomCode <> '' AND RoomId IN (SELECT RoomId FROM `Rooms` WHERE RoomCode = @RoomCode OR RoomNumber = @RoomCode))
                      )";

                return await Connection.QueryAsync<SectionAssignedDto>(
                    sql,
                    new
                    {
                        RoomId = roomId,
                        RoomCode = string.IsNullOrWhiteSpace(roomCode) ? null : roomCode.Trim()
                    });
            }
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
            var rooms = await Connection.QueryAsync<Room>(
                "sp_GetRooms",
                commandType: CommandType.StoredProcedure);

            return rooms.FirstOrDefault(r => (r.RoomCode ?? r.RoomNumber).Equals(roomCode, System.StringComparison.OrdinalIgnoreCase));
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
