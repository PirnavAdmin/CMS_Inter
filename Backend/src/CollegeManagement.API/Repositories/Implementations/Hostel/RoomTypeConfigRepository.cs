using System.Data;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using Dapper;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class RoomTypeConfigRepository : IRoomTypeConfigRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public RoomTypeConfigRepository(IDbConnection dbConnection, IHttpContextAccessor? httpContextAccessor = null)
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

        public async Task<IEnumerable<RoomTypeConfig>> GetAllAsync(
            string? search = null,
            string? status = null,
            int? campusId = null)
        {
            if (campusId == Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return Enumerable.Empty<RoomTypeConfig>();
            }

            return await _dbConnection.QueryAsync<RoomTypeConfig>(
                "sp_GetRoomTypeConfigs",
                new
                {
                    p_Search = search,
                    p_Status = status,
                    p_CampusId = campusId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<RoomTypeConfig?> GetByIdAsync(int roomTypeId)
        {
            var roomType = await _dbConnection.QueryFirstOrDefaultAsync<RoomTypeConfig>(
                "sp_GetRoomTypeConfigById",
                new { p_RoomTypeId = roomTypeId },
                commandType: CommandType.StoredProcedure);

            var collegeId = ResolveCollegeId();
            if (roomType != null && collegeId.HasValue && roomType.CollegeId > 0 && roomType.CollegeId != collegeId.Value)
            {
                return null;
            }

            return roomType;
        }

        public async Task<RoomTypeConfig?> GetBySpecificationAsync(
            string roomTypeSpecification,
            int? campusId = null)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<RoomTypeConfig>(
                "sp_GetRoomTypeConfigBySpecification",
                new
                {
                    p_RoomTypeSpecification = roomTypeSpecification,
                    p_CampusId = campusId,
                    p_CollegeId = ResolveCollegeId()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(
            RoomTypeConfig roomTypeConfig)
        {
            var collegeId = roomTypeConfig.CollegeId > 0 ? roomTypeConfig.CollegeId : ResolveCollegeId();
            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateRoomTypeConfig",
                new
                {
                    p_RoomTypeSpecification = roomTypeConfig.RoomTypeSpecification,
                    p_BedCapacity = roomTypeConfig.BedCapacity,
                    p_AcType = roomTypeConfig.AcType,
                    p_Status = roomTypeConfig.Status,
                    p_Description = roomTypeConfig.Description,
                    p_CampusId = roomTypeConfig.CampusId,
                    p_CollegeId = collegeId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(
            RoomTypeConfig roomTypeConfig)
        {
            var collegeId = roomTypeConfig.CollegeId > 0 ? roomTypeConfig.CollegeId : ResolveCollegeId();
            var affectedRows = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateRoomTypeConfig",
                new
                {
                    p_RoomTypeId = roomTypeConfig.RoomTypeId,
                    p_RoomTypeSpecification = roomTypeConfig.RoomTypeSpecification,
                    p_BedCapacity = roomTypeConfig.BedCapacity,
                    p_AcType = roomTypeConfig.AcType,
                    p_Status = roomTypeConfig.Status,
                    p_Description = roomTypeConfig.Description,
                    p_CampusId = roomTypeConfig.CampusId,
                    p_CollegeId = collegeId
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