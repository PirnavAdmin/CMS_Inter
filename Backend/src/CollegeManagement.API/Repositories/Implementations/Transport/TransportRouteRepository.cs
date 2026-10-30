using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportRouteRepository : ITransportRouteRepository
    {
        private readonly AppDbContext _context;

        public TransportRouteRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportRouteDto>> GetAllAsync(TransportRouteFilterDto filter)
        {
            var c = Connection;
            string? busTypeFilter = !string.IsNullOrWhiteSpace(filter.BusType)
                ? filter.BusType
                : (filter.IsAc.HasValue ? (filter.IsAc.Value ? "AC" : "Non-AC") : null);

            var all = (await c.QueryAsync<TransportRouteDto>(
                "sp_GetTransportRoutes",
                new
                {
                    p_Search = filter.Search ?? "",
                    p_Status = filter.Status.HasValue ? (filter.Status.Value ? (byte)1 : (byte)0) : (byte?)null,
                    p_BusType = busTypeFilter,
                    p_CampusId = filter.CampusId
                },
                commandType: CommandType.StoredProcedure)).ToList();

            var totalCount = all.Count;
            var paged = all
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            return new PagedResult<TransportRouteDto>
            {
                Items = paged,
                TotalCount = totalCount,
                PageNumber = filter.PageNumber,
                PageSize = filter.PageSize
            };
        }

        public async Task<TransportRouteDto?> GetByIdAsync(long routeId)
        {
            var c = Connection;
            return await c.QueryFirstOrDefaultAsync<TransportRouteDto>(
                "sp_GetTransportRouteById",
                new { p_Id = routeId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportRouteDto dto, long? userId)
        {
            var c = Connection;
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportRoute",
                new
                {
                    p_RouteCode = dto.RouteCode.Trim(),
                    p_RouteName = dto.RouteName.Trim(),
                    p_StartLocation = dto.StartLocation?.Trim(),
                    p_EndLocation = dto.EndLocation?.Trim(),
                    p_Distance = dto.DistanceKm,
                    p_EstimatedDurationMinutes = dto.EstimatedDurationMinutes,
                    p_DefaultMonthlyFee = dto.NonAcBaseFare,
                    p_MinRangeKm = dto.MinRangeKm > 0 ? dto.MinRangeKm : 5.0m,
                    p_NonAcBaseFare = dto.NonAcBaseFare > 0 ? dto.NonAcBaseFare : 1000.0m,
                    p_NonAcRatePerKm = dto.NonAcRatePerKm > 0 ? dto.NonAcRatePerKm : 100.0m,
                    p_AcBaseFare = dto.AcBaseFare > 0 ? dto.AcBaseFare : 1200.0m,
                    p_AcRatePerKm = dto.AcRatePerKm > 0 ? dto.AcRatePerKm : 150.0m,
                    p_Description = dto.Description,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_CreatedBy = userId,
                    p_CampusId = dto.CampusId ?? 1
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long routeId, UpdateTransportRouteDto dto, long? userId)
        {
            var c = Connection;
            return await c.ExecuteAsync(
                "sp_UpdateTransportRoute",
                new
                {
                    p_RouteId = routeId,
                    p_RouteCode = dto.RouteCode.Trim(),
                    p_RouteName = dto.RouteName.Trim(),
                    p_StartLocation = dto.StartLocation?.Trim(),
                    p_EndLocation = dto.EndLocation?.Trim(),
                    p_Distance = dto.DistanceKm,
                    p_EstimatedDurationMinutes = dto.EstimatedDurationMinutes,
                    p_DefaultMonthlyFee = dto.NonAcBaseFare,
                    p_MinRangeKm = dto.MinRangeKm > 0 ? dto.MinRangeKm : 5.0m,
                    p_NonAcBaseFare = dto.NonAcBaseFare > 0 ? dto.NonAcBaseFare : 1000.0m,
                    p_NonAcRatePerKm = dto.NonAcRatePerKm > 0 ? dto.NonAcRatePerKm : 100.0m,
                    p_AcBaseFare = dto.AcBaseFare > 0 ? dto.AcBaseFare : 1200.0m,
                    p_AcRatePerKm = dto.AcRatePerKm > 0 ? dto.AcRatePerKm : 150.0m,
                    p_Description = dto.Description,
                    p_Status = dto.Status ? (byte)1 : (byte)0,
                    p_UpdatedBy = userId,
                    p_CampusId = dto.CampusId ?? 1
                },
                commandType: CommandType.StoredProcedure) > 0;
        }

        public async Task<bool> DeleteAsync(long routeId, long? userId)
        {
            var c = Connection;
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportRoute",
                new { p_RouteId = routeId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> ExistsAsync(string routeCode, string routeName, long? excludeRouteId = null)
        {
            var c = Connection;
            var count = await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportRouteExists",
                new { p_RouteCode = routeCode.Trim(), p_RouteName = routeName.Trim(), p_ExcludeId = excludeRouteId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        public async Task<IEnumerable<TransportRouteLookupDto>> GetLookupAsync(string? search, string? busType, int limit)
        {
            var c = Connection;
            return await c.QueryAsync<TransportRouteLookupDto>(
                "sp_GetTransportRouteLookup",
                new
                {
                    p_Search = search ?? "",
                    p_BusType = busType ?? "",
                    p_Limit = limit > 0 ? limit : 100,
                    p_CampusId = (int?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<TransportRouteDto?> GetByIdOrCodeAsync(string routeIdOrCode)
        {
            if (string.IsNullOrWhiteSpace(routeIdOrCode)) return null;
            string search = System.Uri.UnescapeDataString(routeIdOrCode.Trim());

            if (long.TryParse(search, out long routeId))
            {
                var byId = await GetByIdAsync(routeId);
                if (byId != null) return byId;
            }

            var c = Connection;
            var all = await c.QueryAsync<TransportRouteDto>(
                "sp_GetTransportRoutes",
                new { p_Search = search, p_Status = (byte?)null, p_BusType = (string?)null, p_CampusId = (int?)null },
                commandType: CommandType.StoredProcedure);

            return all.FirstOrDefault(r =>
                r.RouteCode.Equals(search, System.StringComparison.OrdinalIgnoreCase) ||
                r.RouteName.Equals(search, System.StringComparison.OrdinalIgnoreCase));
        }

        public async Task<bool> RouteCodeExistsAsync(string routeCode, long? excludeRouteId = null)
        {
            var c = Connection;
            return await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportRouteCodeExists",
                new { p_RouteCode = routeCode.Trim(), p_ExcludeId = excludeRouteId },
                commandType: CommandType.StoredProcedure) > 0;
        }

        public async Task<bool> RouteNameExistsAsync(string routeName, long? excludeRouteId = null)
        {
            var c = Connection;
            return await c.ExecuteScalarAsync<int>(
                "sp_CheckTransportRouteNameExists",
                new { p_RouteName = routeName.Trim(), p_ExcludeId = excludeRouteId },
                commandType: CommandType.StoredProcedure) > 0;
        }
    }
}
