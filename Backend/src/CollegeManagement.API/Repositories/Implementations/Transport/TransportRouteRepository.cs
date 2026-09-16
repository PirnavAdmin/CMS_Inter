using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TransportRouteRepository : ITransportRouteRepository
    {
        private readonly AppDbContext _context;

        public TransportRouteRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<TransportRouteDto>> GetAllAsync(
            TransportRouteFilterDto filter)
        {
            IQueryable<TransportRoute> query = _context.TransportRoutes
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                string search = filter.Search.Trim().ToLower();

                query = query.Where(x =>
                    (x.RouteCode != null && x.RouteCode.ToLower().Contains(search)) ||
                    (x.RouteName != null && x.RouteName.ToLower().Contains(search)) ||
                    (x.StartLocation != null && x.StartLocation.ToLower().Contains(search)) ||
                    (x.EndLocation != null && x.EndLocation.ToLower().Contains(search)));
            }

            if (filter.Status.HasValue)
            {
                query = query.Where(x => x.Status == filter.Status.Value);
            }

            query = ApplySorting(
                query,
                filter.SortBy,
                filter.SortOrder);

            int totalCount = await query.CountAsync();

            List<TransportRoute> rawRoutes = await query
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            List<long> routeIds = rawRoutes.Select(r => r.RouteId).ToList();

            Dictionary<long, int> pickupCounts = await _context.PickupPoints
                .AsNoTracking()
                .Where(p => routeIds.Contains(p.RouteId) && !p.IsDeleted)
                .GroupBy(p => p.RouteId)
                .ToDictionaryAsync(g => g.Key, g => g.Count());

            List<TransportVehicleAssignment> assignments = await _context.TransportVehicleAssignments
                .AsNoTracking()
                .Include(a => a.Vehicle)
                .Include(a => a.Driver)
                .Where(a => routeIds.Contains(a.RouteId) && !a.IsDeleted && a.Status)
                .ToListAsync();

            List<TransportRouteDto> items = rawRoutes.Select(x =>
            {
                var assignment = assignments.FirstOrDefault(a => a.RouteId == x.RouteId);
                var pickupCount = pickupCounts.TryGetValue(x.RouteId, out int count) ? count : 0;
                var assignedBus = assignment?.Vehicle?.VehicleNumber ?? x.Vehicle?.VehicleNumber ?? "Unassigned";
                var assignedDriver = assignment?.Driver?.DriverName ?? "Unassigned";

                return new TransportRouteDto
                {
                    RouteId = x.RouteId,
                    RouteCode = x.RouteCode ?? string.Empty,
                    RouteName = x.RouteName ?? string.Empty,
                    StartLocation = x.StartLocation ?? string.Empty,
                    EndLocation = x.EndLocation ?? string.Empty,
                    DistanceKm = x.DistanceKm,
                    EstimatedDurationMinutes = x.EstimatedDurationMinutes,
                    EstimatedDurationText = FormatDuration(x.EstimatedDurationMinutes),
                    Description = x.Description,
                    TotalPickupPoints = pickupCount,
                    AssignedBus = assignedBus,
                    AssignedDriver = assignedDriver,
                    MinRangeKm = x.MinRangeKm > 0 ? x.MinRangeKm : 5,
                    NonAcBaseFare = x.NonAcBaseFare > 0 ? x.NonAcBaseFare : 1000,
                    NonAcRateAddlKm = x.NonAcRatePerKm > 0 ? x.NonAcRatePerKm : 100,
                    AcBaseFare = x.AcBaseFare > 0 ? x.AcBaseFare : 1200,
                    AcRateAddlKm = x.AcRatePerKm > 0 ? x.AcRatePerKm : 150,
                    Status = x.Status ? "Active" : "Inactive",
                    StatusText = x.Status ? "Active" : "Inactive",
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt
                };
            }).ToList();

            return new PagedResult<TransportRouteDto>
            {
                Items = items,
                PageNumber = filter.PageNumber,
                PageSize = filter.PageSize,
                TotalCount = totalCount
            };
        }

        public async Task<TransportRouteDto?> GetByIdAsync(long routeId)
        {
            var x = await _context.TransportRoutes
                .AsNoTracking()
                .Include(r => r.Vehicle)
                .FirstOrDefaultAsync(r => r.RouteId == routeId && !r.IsDeleted);

            if (x == null) return null;

            var pickupCount = await _context.PickupPoints
                .AsNoTracking()
                .CountAsync(p => p.RouteId == routeId && !p.IsDeleted);

            var assignment = await _context.TransportVehicleAssignments
                .AsNoTracking()
                .Include(a => a.Vehicle)
                .Include(a => a.Driver)
                .FirstOrDefaultAsync(a => a.RouteId == routeId && !a.IsDeleted && a.Status);

            var assignedBus = assignment?.Vehicle?.VehicleNumber ?? x.Vehicle?.VehicleNumber ?? "Unassigned";
            var assignedDriver = assignment?.Driver?.DriverName ?? "Unassigned";

            return new TransportRouteDto
            {
                RouteId = x.RouteId,
                RouteCode = x.RouteCode ?? string.Empty,
                RouteName = x.RouteName ?? string.Empty,
                StartLocation = x.StartLocation ?? string.Empty,
                EndLocation = x.EndLocation ?? string.Empty,
                DistanceKm = x.DistanceKm,
                EstimatedDurationMinutes = x.EstimatedDurationMinutes,
                EstimatedDurationText = FormatDuration(x.EstimatedDurationMinutes),
                Description = x.Description,
                TotalPickupPoints = pickupCount,
                AssignedBus = assignedBus,
                AssignedDriver = assignedDriver,
                MinRangeKm = x.MinRangeKm > 0 ? x.MinRangeKm : 5,
                NonAcBaseFare = x.NonAcBaseFare > 0 ? x.NonAcBaseFare : 1000,
                NonAcRateAddlKm = x.NonAcRatePerKm > 0 ? x.NonAcRatePerKm : 100,
                AcBaseFare = x.AcBaseFare > 0 ? x.AcBaseFare : 1200,
                AcRateAddlKm = x.AcRatePerKm > 0 ? x.AcRatePerKm : 150,
                Status = x.Status ? "Active" : "Inactive",
                StatusText = x.Status ? "Active" : "Inactive",
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            };
        }

        public async Task<long> CreateAsync(
            CreateTransportRouteDto dto,
            long? userId)
        {
            var rawCode = !string.IsNullOrWhiteSpace(dto.RouteCode) && !dto.RouteCode.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteCode.Trim() : $"R-{Random.Shared.Next(100, 999)}";
            var rawName = !string.IsNullOrWhiteSpace(dto.RouteName) && !dto.RouteName.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteName.Trim() : "New Route";
            var startLoc = !string.IsNullOrWhiteSpace(dto.StartLocation) && !dto.StartLocation.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.StartLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteStart) && !dto.RouteStart.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteStart.Trim() : "Main City");
            var endLoc = !string.IsNullOrWhiteSpace(dto.EndLocation) && !dto.EndLocation.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.EndLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteEnd) && !dto.RouteEnd.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.RouteEnd.Trim() : "School Campus");

            bool codeExists = await _context.TransportRoutes.AnyAsync(r => r.RouteCode == rawCode && !r.IsDeleted);
            if (codeExists)
            {
                rawCode = $"R-{Random.Shared.Next(1000, 9999)}";
            }

            TransportRoute route = new()
            {
                RouteCode = rawCode,
                RouteName = rawName,
                StartLocation = startLoc,
                EndLocation = endLoc,
                PickupPoint = startLoc,
                DropPoint = endLoc,
                DistanceKm = dto.DistanceKm > 0 ? dto.DistanceKm : (dto.TotalDistanceKm.HasValue ? dto.TotalDistanceKm.Value : 15),
                EstimatedDurationMinutes = dto.EstimatedDurationMinutes > 0 ? dto.EstimatedDurationMinutes : (dto.EstimatedTimeMinutes.HasValue ? dto.EstimatedTimeMinutes.Value : 30),
                Description = dto.Description != null && !dto.Description.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.Description.Trim() : string.Empty,
                MinRangeKm = dto.MinRangeKm > 0 ? dto.MinRangeKm : 5,
                NonAcBaseFare = dto.NonAcBaseFare > 0 ? dto.NonAcBaseFare : 1000,
                NonAcRatePerKm = dto.NonAcRateAddlKm > 0 ? dto.NonAcRateAddlKm : (dto.NonAcRatePerKm.HasValue ? dto.NonAcRatePerKm.Value : 100),
                AcBaseFare = dto.AcBaseFare > 0 ? dto.AcBaseFare : 1200,
                AcRatePerKm = dto.AcRateAddlKm > 0 ? dto.AcRateAddlKm : (dto.AcRatePerKm.HasValue ? dto.AcRatePerKm.Value : 150),
                Status = dto.Status,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            await _context.TransportRoutes.AddAsync(route);
            await _context.SaveChangesAsync();

            return route.RouteId;
        }

        public async Task<bool> UpdateAsync(
            long routeId,
            UpdateTransportRouteDto dto,
            long? userId)
        {
            TransportRoute? route =
                await _context.TransportRoutes
                    .FirstOrDefaultAsync(x =>
                        x.RouteId == routeId &&
                        !x.IsDeleted);

            if (route is null)
                return false;

            var startLoc = !string.IsNullOrWhiteSpace(dto.StartLocation) ? dto.StartLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteStart) ? dto.RouteStart.Trim() : route.StartLocation);
            var endLoc = !string.IsNullOrWhiteSpace(dto.EndLocation) ? dto.EndLocation.Trim() : (!string.IsNullOrWhiteSpace(dto.RouteEnd) ? dto.RouteEnd.Trim() : route.EndLocation);

            if (!string.IsNullOrWhiteSpace(dto.RouteCode)) route.RouteCode = dto.RouteCode.Trim();
            if (!string.IsNullOrWhiteSpace(dto.RouteName)) route.RouteName = dto.RouteName.Trim();
            route.StartLocation = startLoc;
            route.EndLocation = endLoc;
            route.PickupPoint = startLoc;
            route.DropPoint = endLoc;
            route.DistanceKm = dto.DistanceKm > 0 ? dto.DistanceKm : (dto.TotalDistanceKm.HasValue ? dto.TotalDistanceKm.Value : route.DistanceKm);
            route.EstimatedDurationMinutes = dto.EstimatedDurationMinutes > 0 ? dto.EstimatedDurationMinutes : (dto.EstimatedTimeMinutes.HasValue ? dto.EstimatedTimeMinutes.Value : route.EstimatedDurationMinutes);
            route.Description = dto.Description?.Trim() ?? string.Empty;
            route.MinRangeKm = dto.MinRangeKm > 0 ? dto.MinRangeKm : route.MinRangeKm;
            route.NonAcBaseFare = dto.NonAcBaseFare > 0 ? dto.NonAcBaseFare : route.NonAcBaseFare;
            route.NonAcRatePerKm = dto.NonAcRateAddlKm > 0 ? dto.NonAcRateAddlKm : (dto.NonAcRatePerKm.HasValue ? dto.NonAcRatePerKm.Value : route.NonAcRatePerKm);
            route.AcBaseFare = dto.AcBaseFare > 0 ? dto.AcBaseFare : route.AcBaseFare;
            route.AcRatePerKm = dto.AcRateAddlKm > 0 ? dto.AcRateAddlKm : (dto.AcRatePerKm.HasValue ? dto.AcRatePerKm.Value : route.AcRatePerKm);
            route.Status = dto.Status;
            route.UpdatedBy = userId;
            route.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeleteAsync(
            long routeId,
            long? userId)
        {
            TransportRoute? route =
                await _context.TransportRoutes
                    .FirstOrDefaultAsync(x =>
                        x.RouteId == routeId &&
                        !x.IsDeleted);

            if (route is null)
                return false;

            var matchingRoutes = await _context.TransportRoutes
                .Where(x => (x.RouteId == routeId || 
                             (!string.IsNullOrEmpty(route.RouteCode) && x.RouteCode == route.RouteCode) ||
                             (!string.IsNullOrEmpty(route.RouteName) && x.RouteName == route.RouteName)) && 
                            !x.IsDeleted)
                .ToListAsync();

            foreach (var r in matchingRoutes)
            {
                r.IsDeleted = true;
                r.Status = false;
                r.UpdatedBy = userId;
                r.UpdatedAt = DateTime.UtcNow;

                // Soft delete associated pickup points
                var points = await _context.PickupPoints
                    .Where(p => p.RouteId == r.RouteId && !p.IsDeleted)
                    .ToListAsync();
                foreach (var p in points)
                {
                    p.IsDeleted = true;
                    p.Status = false;
                    p.UpdatedBy = userId;
                    p.UpdatedAt = DateTime.UtcNow;
                }

                // Soft delete associated vehicle assignments
                var assignments = await _context.TransportVehicleAssignments
                    .Where(a => a.RouteId == r.RouteId && !a.IsDeleted)
                    .ToListAsync();
                foreach (var a in assignments)
                {
                    a.IsDeleted = true;
                    a.Status = false;
                    a.UpdatedBy = userId;
                    a.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<IEnumerable<TransportRouteLookupDto>>
            GetLookupAsync(string? search, int limit)
        {
            if (limit < 1)
                limit = 20;

            if (limit > 100)
                limit = 100;

            IQueryable<TransportRoute> query =
                _context.TransportRoutes
                    .AsNoTracking()
                    .Where(x =>
                        !x.IsDeleted &&
                        x.Status);

            if (!string.IsNullOrWhiteSpace(search))
            {
                string normalizedSearch =
                    search.Trim().ToLower();

                query = query.Where(x =>
                    (x.RouteCode != null && x.RouteCode.ToLower().Contains(normalizedSearch)) ||
                    (x.RouteName != null && x.RouteName.ToLower().Contains(normalizedSearch)));
            }

            return await query
                .OrderBy(x => x.RouteName)
                .Take(limit)
                .Select(x => new TransportRouteLookupDto
                {
                    RouteId = x.RouteId,
                    RouteCode = x.RouteCode ?? string.Empty,
                    RouteName = x.RouteName ?? string.Empty,
                    DisplayName =
                        x.RouteCode + " - " + x.RouteName
                })
                .ToListAsync();
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

            var route = await _context.TransportRoutes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => !x.IsDeleted && (
                    (x.RouteCode != null && x.RouteCode.ToLower() == search.ToLower()) ||
                    (x.RouteName != null && x.RouteName.ToLower() == search.ToLower()) ||
                    x.RouteId.ToString() == search));

            if (route == null) return null;

            return await GetByIdAsync(route.RouteId);
        }

        public async Task<bool> RouteCodeExistsAsync(
            string routeCode,
            long? excludeRouteId = null)
        {
            string normalizedCode =
                routeCode.Trim().ToLower();

            return await _context.TransportRoutes
                .AsNoTracking()
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    x.RouteCode != null && x.RouteCode.ToLower() == normalizedCode &&
                    (!excludeRouteId.HasValue ||
                     x.RouteId != excludeRouteId.Value));
        }

        public async Task<bool> RouteNameExistsAsync(
            string routeName,
            long? excludeRouteId = null)
        {
            string normalizedName =
                routeName.Trim().ToLower();

            return await _context.TransportRoutes
                .AsNoTracking()
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    x.RouteName != null && x.RouteName.ToLower() == normalizedName &&
                    (!excludeRouteId.HasValue ||
                     x.RouteId != excludeRouteId.Value));
        }

        private static IQueryable<TransportRoute> ApplySorting(
            IQueryable<TransportRoute> query,
            string? sortBy,
            string? sortOrder)
        {
            string normalizedSortBy =
                sortBy?.Trim().ToLower() ?? "createdat";

            bool descending =
                string.Equals(
                    sortOrder,
                    "desc",
                    StringComparison.OrdinalIgnoreCase);

            return normalizedSortBy switch
            {
                "routecode" => descending
                    ? query.OrderByDescending(x => x.RouteCode)
                    : query.OrderBy(x => x.RouteCode),

                "routename" => descending
                    ? query.OrderByDescending(x => x.RouteName)
                    : query.OrderBy(x => x.RouteName),

                "startlocation" => descending
                    ? query.OrderByDescending(x => x.StartLocation)
                    : query.OrderBy(x => x.StartLocation),

                "endlocation" => descending
                    ? query.OrderByDescending(x => x.EndLocation)
                    : query.OrderBy(x => x.EndLocation),

                "distancekm" => descending
                    ? query.OrderByDescending(x => x.DistanceKm)
                    : query.OrderBy(x => x.DistanceKm),

                "status" => descending
                    ? query.OrderByDescending(x => x.Status)
                    : query.OrderBy(x => x.Status),

                "createdat" => descending
                    ? query.OrderByDescending(x => x.CreatedAt)
                    : query.OrderBy(x => x.CreatedAt),

                _ => query.OrderByDescending(x => x.CreatedAt)
            };
        }

        private static string FormatDuration(int totalMinutes)
        {
            if (totalMinutes <= 0)
                return "0 min";

            int hours = totalMinutes / 60;
            int minutes = totalMinutes % 60;

            if (hours == 0)
                return $"{minutes} min";

            if (minutes == 0)
                return $"{hours} hr";

            return $"{hours} hr {minutes} min";
        }
    }
}
