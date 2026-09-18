using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Dtos.Transport.Operations;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Dtos.Transport.Reports;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;

using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportRouteRepository : ITransportRouteRepository
    {
        private readonly AppDbContext _context;

        public TransportRouteRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportRouteDto>> GetAllAsync(TransportRouteFilterDto filter)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    r.RouteId, r.RouteCode, r.RouteName, r.StartLocation, r.EndLocation,
                    r.Distance, r.DefaultMonthlyFee, r.Description, r.Status,
                    (SELECT COUNT(*) FROM PickupPoints p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
                    a.VehicleId, v.VehicleRegistrationNo AS VehicleNumber,
                    a.DriverId, d.DriverName
                FROM TransportRoutes r
                LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
                LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
                LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
                WHERE r.IsDeleted = 0";
                
            var items = await c.QueryAsync<dynamic>(sql);
            
            var list = items.Select(x => new TransportRouteDto {
                RouteId = x.RouteId,
                RouteCode = x.RouteCode ?? "",
                RouteName = x.RouteName ?? "",
                
                StartLocation = x.StartLocation,
                
                EndLocation = x.EndLocation,
                DistanceKm = x.Distance,
                
                NonAcBaseFare = x.DefaultMonthlyFee,
                Description = x.Description,
                Status = x.Status,
                StatusText = x.Status ? "Active" : "Inactive",
                TotalPickupPoints = (int)x.PickupPointCount,
                
                
                
                AssignedDriver = x.DriverName
            }).AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.Search)) {
                var search = filter.Search.Trim().ToLower();
                list = list.Where(x => x.RouteCode.ToLower().Contains(search) || x.RouteName.ToLower().Contains(search) || x.StartLocation != null && x.StartLocation.ToLower().Contains(search) || x.EndLocation != null && x.EndLocation.ToLower().Contains(search));
            }
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<TransportRouteDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportRouteDto?> GetByIdAsync(long routeId)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    r.RouteId, r.RouteCode, r.RouteName, r.StartLocation, r.EndLocation,
                    r.Distance, r.DefaultMonthlyFee, r.Description, r.Status,
                    (SELECT COUNT(*) FROM PickupPoints p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
                    a.VehicleId, v.VehicleRegistrationNo AS VehicleNumber,
                    a.DriverId, d.DriverName
                FROM TransportRoutes r
                LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
                LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
                LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
                WHERE r.IsDeleted = 0 AND r.RouteId = @Id";
                
            var x = await c.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = routeId });
            if (x == null) return null;

            return new TransportRouteDto {
                RouteId = x.RouteId,
                RouteCode = x.RouteCode ?? "",
                RouteName = x.RouteName ?? "",
                
                StartLocation = x.StartLocation,
                
                EndLocation = x.EndLocation,
                DistanceKm = x.Distance,
                
                NonAcBaseFare = x.DefaultMonthlyFee,
                Description = x.Description,
                Status = x.Status,
                StatusText = x.Status ? "Active" : "Inactive",
                TotalPickupPoints = (int)x.PickupPointCount,
                
                
                
                AssignedDriver = x.DriverName
            };
        }

        public async Task<long> CreateAsync(CreateTransportRouteDto dto, long? userId)
        {
            using var c = Connection();
            var rawCode = !string.IsNullOrWhiteSpace(dto.RouteCode) && !dto.RouteCode.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteCode.Trim() : $"R-{Random.Shared.Next(100, 999)}";
            var rawName = !string.IsNullOrWhiteSpace(dto.RouteName) && !dto.RouteName.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteName.Trim() : "New Route";
            var startLoc = !string.IsNullOrWhiteSpace(dto.StartLocation) && !dto.StartLocation.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.StartLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteStart) && !dto.RouteStart.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteStart.Trim() : "Main City");
            var endLoc = !string.IsNullOrWhiteSpace(dto.EndLocation) && !dto.EndLocation.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.EndLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteEnd) && !dto.RouteEnd.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteEnd.Trim() : "College Campus");

            var checkSql = "SELECT COUNT(*) FROM TransportRoutes WHERE RouteCode = @Code AND IsDeleted = 0";
            if (await c.ExecuteScalarAsync<int>(checkSql, new { Code = rawCode }) > 0) rawCode = $"R-{Random.Shared.Next(1000, 9999)}";

            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportRoutes",
                new
                {
                    p_RouteNumber = rawCode,
                    p_RouteCode = rawCode,
                    p_RouteName = rawName,
                    p_StartLocation = startLoc,
                    p_EndLocation = endLoc,
                    p_Distance = dto.DistanceKm,
                    p_DefaultMonthlyFee = dto.NonAcBaseFare,
                    p_Description = dto.Description ?? "",
                    p_Status = dto.Status,
                    p_CreatedBy = userId,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long routeId, UpdateTransportRouteDto dto, long? userId)
        {
            using var c = Connection();
            
            var existing = await c.QueryFirstOrDefaultAsync<dynamic>("SELECT * FROM TransportRoutes WHERE RouteId = @Id AND IsDeleted = 0", new { Id = routeId });
            if (existing == null) return false;
            
            var startLoc = !string.IsNullOrWhiteSpace(dto.StartLocation) ? dto.StartLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteStart) ? dto.RouteStart.Trim() : existing.StartLocation);
            var endLoc = !string.IsNullOrWhiteSpace(dto.EndLocation) ? dto.EndLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteEnd) ? dto.RouteEnd.Trim() : existing.EndLocation);
            var name = !string.IsNullOrWhiteSpace(dto.RouteName) ? dto.RouteName.Trim() : existing.RouteName;

            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportRoutes",
                new
                {
                    p_Id = routeId,
                    p_RouteNumber = existing.RouteCode,
                    p_RouteCode = existing.RouteCode,
                    p_RouteName = name,
                    p_StartLocation = startLoc,
                    p_EndLocation = endLoc,
                    p_Distance = dto.DistanceKm,
                    p_DefaultMonthlyFee = dto.NonAcBaseFare,
                    p_Description = dto.Description ?? "",
                    p_Status = dto.Status,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long routeId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportRoutes",
                new { p_Id = routeId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<TransportRouteLookupDto>> GetLookupAsync(string? search, int limit)
        {
            if (limit < 1) limit = 20;
            if (limit > 100) limit = 100;

            using var c = Connection();
            var sql = "SELECT RouteId, RouteCode, RouteName FROM TransportRoutes WHERE IsDeleted = 0 AND Status = 1";
            if (!string.IsNullOrWhiteSpace(search)) sql += " AND (LOWER(RouteCode) LIKE @Search OR LOWER(RouteName) LIKE @Search)";
            sql += " ORDER BY RouteName LIMIT @Limit";
            
            var items = await c.QueryAsync<dynamic>(sql, new { Search = $"%{search?.ToLower()}%", Limit = limit });
            return items.Select(x => new TransportRouteLookupDto { RouteId = x.RouteId, RouteCode = x.RouteCode ?? "", RouteName = x.RouteName ?? "" });
        }

        public async Task<TransportRouteDto?> GetByIdOrCodeAsync(string routeIdOrCode)
        {
            if (string.IsNullOrWhiteSpace(routeIdOrCode)) return null;
            string search = Uri.UnescapeDataString(routeIdOrCode.Trim());
            
            if (long.TryParse(search, out long routeId))
            {
                var byId = await GetByIdAsync(routeId);
                if (byId != null) return byId;
            }
            
            using var c = Connection();
            var sql = "SELECT RouteId FROM TransportRoutes WHERE IsDeleted = 0 AND (LOWER(RouteCode) = @SearchStr OR LOWER(RouteName) = @SearchStr) LIMIT 1";
            var id = await c.QueryFirstOrDefaultAsync<long?>(sql, new { SearchStr = search.ToLower() });
            if (id.HasValue) return await GetByIdAsync(id.Value);
            return null;
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








