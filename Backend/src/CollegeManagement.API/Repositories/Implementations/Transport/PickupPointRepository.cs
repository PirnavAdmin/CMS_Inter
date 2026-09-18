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
    public class PickupPointRepository : IPickupPointRepository
    {
        private readonly AppDbContext _context;

        public PickupPointRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<PagedResult<PickupPointDto>> GetAllAsync(PickupPointFilterDto filter)
        {
            using var c = Connection();
            var sql = @"SELECT p.*, r.RouteName 
                        FROM PickupPoints p 
                        LEFT JOIN TransportRoutes r ON p.RouteId = r.RouteId 
                        WHERE p.IsDeleted = 0";
            var items = await c.QueryAsync<dynamic>(sql);
            
            var list = items.Select(x => new PickupPointDto {
                PickupPointId = x.PickupPointId,
                RouteId = x.RouteId,
                RouteName = x.RouteName ?? "Main Route",
                PickupPointName = x.StopName ?? string.Empty,
                Landmark = x.StopAddress,
                SequenceNo = x.StopOrder,
                PickupTime = TimeSpan.Parse(x.PickupTime?.ToString() ?? "00:00"),
                DropTime = x.DropTime != null ? TimeSpan.Parse(x.DropTime.ToString()) : new TimeSpan(16, 15, 0),
                DistanceFromStart = x.DistanceFromSchool,
                MonthlyFee = x.MonthlyFee > 0 ? x.MonthlyFee : 1200,
                Status = x.Status,
                StatusText = x.Status ? "Active" : "Inactive"
            }).AsQueryable();

            if (filter.RouteId.HasValue) list = list.Where(x => x.RouteId == filter.RouteId.Value);
            if (!string.IsNullOrWhiteSpace(filter.Search)) {
                var search = filter.Search.Trim().ToLower();
                list = list.Where(x => x.PickupPointName.ToLower().Contains(search) || (x.Landmark != null && x.Landmark.ToLower().Contains(search)));
            }
            if (filter.Status.HasValue) list = list.Where(x => x.Status == filter.Status.Value);
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<PickupPointDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<PickupPointDto?> GetByIdAsync(long pickupPointId)
        {
            using var c = Connection();
            var sql = @"SELECT p.*, r.RouteName 
                        FROM PickupPoints p 
                        LEFT JOIN TransportRoutes r ON p.RouteId = r.RouteId 
                        WHERE p.IsDeleted = 0 AND p.PickupPointId = @Id";
            var x = await c.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = pickupPointId });
            if (x == null) return null;

            return new PickupPointDto {
                PickupPointId = x.PickupPointId,
                RouteId = x.RouteId,
                RouteName = x.RouteName ?? "Main Route",
                PickupPointName = x.StopName ?? string.Empty,
                Landmark = x.StopAddress,
                SequenceNo = x.StopOrder,
                PickupTime = TimeSpan.Parse(x.PickupTime?.ToString() ?? "00:00"),
                DropTime = x.DropTime != null ? TimeSpan.Parse(x.DropTime.ToString()) : new TimeSpan(16, 15, 0),
                DistanceFromStart = x.DistanceFromSchool,
                MonthlyFee = x.MonthlyFee > 0 ? x.MonthlyFee : 1200,
                Status = x.Status,
                StatusText = x.Status ? "Active" : "Inactive"
            };
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
                    p_MonthlyFee = dto.MonthlyFee > 0 ? dto.MonthlyFee : (dto.MonthlyFare ?? 1200),
                    p_Description = "",
                    p_Time = (TimeSpan?)null,
                    p_Status = dto.Status,
                    p_IsActive = true,
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
                    p_MonthlyFee = dto.MonthlyFee > 0 ? dto.MonthlyFee : (dto.MonthlyFare ?? 1200),
                    p_Description = "",
                    p_Time = (TimeSpan?)null,
                    p_Status = dto.Status,
                    p_IsActive = true,
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
                new { p_Id = pickupPointId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> ExistsAsync(long routeId, string pickupPointName, long? excludePickupPointId = null)
        {
            using var c = Connection();
            var sql = "SELECT COUNT(*) FROM PickupPoints WHERE IsDeleted = 0 AND RouteId = @RouteId AND LOWER(StopName) = @Name AND (@ExcludeId IS NULL OR PickupPointId != @ExcludeId)";
            var count = await c.ExecuteScalarAsync<int>(sql, new { RouteId = routeId, Name = pickupPointName.Trim().ToLower(), ExcludeId = excludePickupPointId });
            return count > 0;
        }

        public async Task<IEnumerable<PickupPointLookupDto>> GetLookupAsync(long? routeId)
        {
            using var c = Connection();
            var sql = "SELECT PickupPointId, StopName FROM PickupPoints WHERE IsDeleted = 0 AND Status = 1";
            if (routeId.HasValue) sql += $" AND RouteId = {routeId.Value}";
            sql += " ORDER BY StopOrder, StopName";
            
            var items = await c.QueryAsync<dynamic>(sql);
            return items.Select(x => new PickupPointLookupDto { PickupPointId = x.PickupPointId, PickupPointName = x.StopName ?? "" });
        }

        public async Task<PickupPointDto?> GetByIdOrNameAsync(string pickupIdOrName)
        {
            if (string.IsNullOrWhiteSpace(pickupIdOrName)) return null;
            string search = pickupIdOrName.Trim();
            
            if (long.TryParse(search, out long pickupId))
            {
                var byId = await GetByIdAsync(pickupId);
                if (byId != null) return byId;
            }
            
            using var c = Connection();
            var sql = "SELECT PickupPointId FROM PickupPoints WHERE IsDeleted = 0 AND LOWER(StopName) = @SearchStr LIMIT 1";
            var id = await c.QueryFirstOrDefaultAsync<long?>(sql, new { SearchStr = search.ToLower() });
            if (id.HasValue) return await GetByIdAsync(id.Value);
            return null;
        }
    }
}



