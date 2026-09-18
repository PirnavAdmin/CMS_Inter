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

        private IDbConnection Connection() => new MySqlConnector.MySqlConnection(_context.Database.GetConnectionString());

        public async Task<PagedResult<TransportRouteDto>> GetAllAsync(TransportRouteFilterDto filter)
        {
            using var c = Connection();
            var all = (await c.QueryAsync<TransportRouteDto>(
                "sp_GetTransportRoutes",
                new { p_Search = filter.Search ?? "", p_Status = filter.Status },
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
            using var c = Connection();
            return await c.QueryFirstOrDefaultAsync<TransportRouteDto>(
                "sp_GetTransportRouteById",
                new { p_Id = routeId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<long> CreateAsync(CreateTransportRouteDto dto, long? userId)
        {
            using var c = Connection();
            var rawCode = !string.IsNullOrWhiteSpace(dto.RouteCode) && !dto.RouteCode.Equals("string", System.StringComparison.OrdinalIgnoreCase)
                ? dto.RouteCode.Trim()
                : $"R-{System.Random.Shared.Next(100, 999)}";
            var rawName = !string.IsNullOrWhiteSpace(dto.RouteName) && !dto.RouteName.Equals("string", System.StringComparison.OrdinalIgnoreCase)
                ? dto.RouteName.Trim()
                : "New Route";
            var startLoc = !string.IsNullOrWhiteSpace(dto.StartLocation) && !dto.StartLocation.Equals("string", System.StringComparison.OrdinalIgnoreCase)
                ? dto.StartLocation.Trim()
                : (!string.IsNullOrWhiteSpace(dto.RouteStart) && !dto.RouteStart.Equals("string", System.StringComparison.OrdinalIgnoreCase) ? dto.RouteStart.Trim() : "Main City");
            var endLoc = !string.IsNullOrWhiteSpace(dto.EndLocation) && !dto.EndLocation.Equals("string", System.StringComparison.OrdinalIgnoreCase)
                ? dto.EndLocation.Trim()
                : (!string.IsNullOrWhiteSpace(dto.RouteEnd) && !dto.RouteEnd.Equals("string", System.StringComparison.OrdinalIgnoreCase) ? dto.RouteEnd.Trim() : "College Campus");

            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportRoute",
                new
                {
                    p_RouteCode = rawCode,
                    p_RouteName = rawName,
                    p_StartLocation = startLoc,
                    p_EndLocation = endLoc,
                    p_Distance = dto.DistanceKm,
                    p_EstimatedDurationMinutes = dto.EstimatedTimeMinutes > 0 ? dto.EstimatedTimeMinutes : 30,
                    p_DefaultMonthlyFee = dto.NonAcBaseFare,
                    p_MinRangeKm = dto.MinRangeKm > 0 ? dto.MinRangeKm : 5m,
                    p_NonAcBaseFare = dto.NonAcBaseFare > 0 ? dto.NonAcBaseFare : 1000m,
                    p_NonAcRatePerKm = dto.NonAcRatePerKm ?? (dto.NonAcRateAddlKm > 0 ? dto.NonAcRateAddlKm : 100m),
                    p_AcBaseFare = dto.AcBaseFare > 0 ? dto.AcBaseFare : 1200m,
                    p_AcRatePerKm = dto.AcRatePerKm ?? (dto.AcRateAddlKm > 0 ? dto.AcRateAddlKm : 150m),
                    p_Description = dto.Description ?? "",
                    p_Status = dto.Status ? (sbyte)1 : (sbyte)0,
                    p_CreatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long routeId, UpdateTransportRouteDto dto, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportRoute",
                new
                {
                    p_RouteId = routeId,
                    p_RouteCode = dto.RouteCode,
                    p_RouteName = dto.RouteName,
                    p_StartLocation = dto.StartLocation ?? dto.RouteStart,
                    p_EndLocation = dto.EndLocation ?? dto.RouteEnd,
                    p_Distance = dto.DistanceKm,
                    p_EstimatedDurationMinutes = dto.EstimatedTimeMinutes > 0 ? dto.EstimatedTimeMinutes : 30,
                    p_DefaultMonthlyFee = dto.NonAcBaseFare,
                    p_MinRangeKm = dto.MinRangeKm > 0 ? dto.MinRangeKm : 5m,
                    p_NonAcBaseFare = dto.NonAcBaseFare > 0 ? dto.NonAcBaseFare : 1000m,
                    p_NonAcRatePerKm = dto.NonAcRatePerKm ?? (dto.NonAcRateAddlKm > 0 ? dto.NonAcRateAddlKm : 100m),
                    p_AcBaseFare = dto.AcBaseFare > 0 ? dto.AcBaseFare : 1200m,
                    p_AcRatePerKm = dto.AcRatePerKm ?? (dto.AcRateAddlKm > 0 ? dto.AcRateAddlKm : 150m),
                    p_Description = dto.Description ?? "",
                    p_Status = dto.Status ? (sbyte)1 : (sbyte)0,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long routeId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportRoute",
                new { p_RouteId = routeId, p_UpdatedBy = userId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<TransportRouteLookupDto>> GetLookupAsync(string? search, int limit)
        {
            using var c = Connection();
            return await c.QueryAsync<TransportRouteLookupDto>(
                "sp_GetTransportRouteLookup",
                new { p_Search = search ?? "", p_Limit = limit > 0 ? limit : 100 },
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

            using var c = Connection();
            var all = await c.QueryAsync<TransportRouteDto>(
                "sp_GetTransportRoutes",
                new { p_Search = search, p_Status = (bool?)null },
                commandType: CommandType.StoredProcedure);

            return all.FirstOrDefault(r => 
                r.RouteCode.Equals(search, System.StringComparison.OrdinalIgnoreCase) || 
                r.RouteName.Equals(search, System.StringComparison.OrdinalIgnoreCase));
        }

        public async Task<bool> RouteCodeExistsAsync(string routeCode, long? excludeRouteId = null)
        {
            using var c = Connection();
            var sql = "SELECT COUNT(*) FROM TransportRoutes WHERE IsDeleted = 0 AND LOWER(RouteCode) = @Code AND (@ExcludeId IS NULL OR RouteId != @ExcludeId)";
            return await c.ExecuteScalarAsync<int>(sql, new { Code = routeCode.Trim().ToLower(), ExcludeId = excludeRouteId }) > 0;
        }

        public async Task<bool> RouteNameExistsAsync(string routeName, long? excludeRouteId = null)
        {
            using var c = Connection();
            var sql = "SELECT COUNT(*) FROM TransportRoutes WHERE IsDeleted = 0 AND LOWER(RouteName) = @Name AND (@ExcludeId IS NULL OR RouteId != @ExcludeId)";
            return await c.ExecuteScalarAsync<int>(sql, new { Name = routeName.Trim().ToLower(), ExcludeId = excludeRouteId }) > 0;
        }
    }
}
