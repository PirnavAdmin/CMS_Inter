using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class PickupPointRepository : IPickupPointRepository
    {
        private readonly AppDbContext _context;

        public PickupPointRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => new MySqlConnector.MySqlConnection(_context.Database.GetConnectionString());

        public async Task<PagedResult<PickupPointDto>> GetAllAsync(PickupPointFilterDto filter)
        {
            using var c = Connection();
            var all = (await c.QueryAsync<PickupPointDto>(
                "sp_GetPickupPoints",
                new
                {
                    p_RouteId = filter.RouteId,
                    p_Search = filter.Search ?? "",
                    p_Status = filter.Status
                },
                commandType: CommandType.StoredProcedure)).ToList();

            var totalCount = all.Count;
            var paged = all
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            return new PagedResult<PickupPointDto>
            {
                Items = paged,
                TotalCount = totalCount,
                PageNumber = filter.PageNumber,
                PageSize = filter.PageSize
            };
        }

        public async Task<PickupPointDto?> GetByIdAsync(long pickupPointId)
        {
            using var c = Connection();
            return await c.QueryFirstOrDefaultAsync<PickupPointDto>(
                "sp_GetPickupPointById",
                new { p_Id = pickupPointId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreatePickupPointDto dto, long? userId)
        {
            using var c = Connection();
            return await c.ExecuteScalarAsync<long>(
                "sp_CreatePickupPoints",
                new
                {
                    p_RouteId = dto.RouteId,
                    p_StopName = dto.PickupPointName.Trim(),
                    p_StopAddress = dto.Landmark,
                    p_StopOrder = dto.SequenceNo,
                    p_PickupTime = dto.PickupTime,
                    p_DropTime = dto.DropTime,
                    p_DistanceFromSchool = dto.DistanceFromStart,
                    p_MonthlyFee = dto.MonthlyFee > 0 ? dto.MonthlyFee : (dto.MonthlyFare ?? 1200m),
                    p_Description = "",
                    p_Time = (System.TimeSpan?)null,
                    p_Status = dto.Status ? (sbyte)1 : (sbyte)0,
                    p_IsActive = (sbyte)1,
                    p_CreatedBy = userId,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long pickupPointId, UpdatePickupPointDto dto, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdatePickupPoints",
                new
                {
                    p_Id = pickupPointId,
                    p_RouteId = dto.RouteId,
                    p_StopName = dto.PickupPointName.Trim(),
                    p_StopAddress = dto.Landmark,
                    p_StopOrder = dto.SequenceNo,
                    p_PickupTime = dto.PickupTime,
                    p_DropTime = dto.DropTime,
                    p_DistanceFromSchool = dto.DistanceFromStart,
                    p_MonthlyFee = dto.MonthlyFee > 0 ? dto.MonthlyFee : (dto.MonthlyFare ?? 1200m),
                    p_Description = "",
                    p_Time = (System.TimeSpan?)null,
                    p_Status = dto.Status ? (sbyte)1 : (sbyte)0,
                    p_IsActive = (sbyte)1,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long pickupPointId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_DeletePickupPoints",
                new { p_Id = pickupPointId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<PickupPointLookupDto>> GetLookupAsync(long? routeId)
        {
            using var c = Connection();
            return await c.QueryAsync<PickupPointLookupDto>(
                "sp_GetPickupPointLookup",
                new { p_RouteId = routeId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<PickupPointDto?> GetByIdOrNameAsync(string pickupIdOrName)
        {
            return await GetByIdOrNameAsync(pickupIdOrName, null);
        }

        public async Task<PickupPointDto?> GetByIdOrNameAsync(string idOrName, long? routeId)
        {
            if (string.IsNullOrWhiteSpace(idOrName)) return null;
            string search = System.Uri.UnescapeDataString(idOrName.Trim());

            if (long.TryParse(search, out long pickupPointId))
            {
                var byId = await GetByIdAsync(pickupPointId);
                if (byId != null) return byId;
            }

            using var c = Connection();
            var all = await c.QueryAsync<PickupPointDto>(
                "sp_GetPickupPoints",
                new { p_RouteId = routeId, p_Search = search, p_Status = (bool?)null },
                commandType: CommandType.StoredProcedure);

            return all.FirstOrDefault(p => p.PickupPointName.Equals(search, System.StringComparison.OrdinalIgnoreCase));
        }

        public async Task<bool> ExistsAsync(long routeId, string pickupPointName, long? excludePickupPointId = null)
        {
            using var c = Connection();
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckPickupPointExists",
                new { p_RouteId = routeId, p_StopName = pickupPointName.Trim(), p_ExcludeId = excludePickupPointId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        public async Task<bool> SequenceExistsAsync(long routeId, int sequenceNo, long? excludePickupPointId = null)
        {
            using var c = Connection();
            return await c.ExecuteScalarAsync<int>(
                "sp_CheckPickupPointSequenceExists",
                new { p_RouteId = routeId, p_SequenceNo = sequenceNo, p_ExcludeId = excludePickupPointId },
                commandType: CommandType.StoredProcedure) > 0;
        }
    }
}
