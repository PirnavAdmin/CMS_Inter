using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class PickupPointRepository : IPickupPointRepository
    {
        private readonly AppDbContext _context;

        public PickupPointRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<PagedResult<PickupPointDto>> GetAllAsync(PickupPointFilterDto filter)
        {
            var query = _context.PickupPoints
                .Include(x => x.TransportRoute)
                .Where(x => !x.IsDeleted)
                .AsQueryable();

            if (filter.RouteId.HasValue)
                query = query.Where(x => x.RouteId == filter.RouteId.Value);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                string search = filter.Search.Trim().ToLower();

                query = query.Where(x =>
                    (x.PickupPointName != null && x.PickupPointName.ToLower().Contains(search)) ||
                    (x.Landmark != null &&
                     x.Landmark.ToLower().Contains(search)));
            }

            if (filter.Status.HasValue)
                query = query.Where(x => x.Status == filter.Status.Value);

            int totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(x => x.SequenceNo)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(x => new PickupPointDto
                {
                    PickupPointId = x.PickupPointId,
                    RouteId = x.RouteId,
                    RouteName = x.TransportRoute != null && x.TransportRoute.RouteName != null ? x.TransportRoute.RouteName : "Main Route",
                    PickupPointName = x.PickupPointName ?? string.Empty,
                    Landmark = x.Landmark,
                    SequenceNo = x.SequenceNo,
                    PickupTime = x.PickupTime,
                    DropTime = x.DropTime != TimeSpan.Zero ? x.DropTime : new TimeSpan(16, 15, 0),
                    DistanceFromStart = x.DistanceFromStart,
                    MonthlyFee = x.MonthlyFee > 0 ? x.MonthlyFee : 1200,
                    Status = x.Status,
                    StatusText = x.Status ? "Active" : "Inactive"
                })
                .ToListAsync();

            return new PagedResult<PickupPointDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = filter.PageNumber,
                PageSize = filter.PageSize
            };
        }
        public async Task<PickupPointDto?> GetByIdAsync(long pickupPointId)
        {
            return await _context.PickupPoints
                .Include(x => x.TransportRoute)
                .Where(x => x.PickupPointId == pickupPointId &&
                            !x.IsDeleted)
                .Select(x => new PickupPointDto
                {
                    PickupPointId = x.PickupPointId,
                    RouteId = x.RouteId,
                    RouteName = x.TransportRoute != null && x.TransportRoute.RouteName != null ? x.TransportRoute.RouteName : "Main Route",
                    PickupPointName = x.PickupPointName ?? string.Empty,
                    Landmark = x.Landmark,
                    SequenceNo = x.SequenceNo,
                    PickupTime = x.PickupTime,
                    DropTime = x.DropTime != TimeSpan.Zero ? x.DropTime : new TimeSpan(16, 15, 0),
                    DistanceFromStart = x.DistanceFromStart,
                    MonthlyFee = x.MonthlyFee > 0 ? x.MonthlyFee : 1200,
                    Status = x.Status,
                    StatusText = x.Status ? "Active" : "Inactive"
                })
                .FirstOrDefaultAsync();
        }
        public async Task<long> CreateAsync(CreatePickupPointDto dto, long? userId)
        {
            var entity = new PickupPoint
            {
                RouteId = dto.RouteId,
                PickupPointName = dto.PickupPointName.Trim(),
                Landmark = dto.Landmark,
                SequenceNo = dto.SequenceNo,
                PickupTime = dto.PickupTime,
                DropTime = dto.DropTime,
                DistanceFromStart = dto.DistanceFromStart,
                MonthlyFee = dto.MonthlyFee > 0 ? dto.MonthlyFee : (dto.MonthlyFare.HasValue ? dto.MonthlyFare.Value : 1200),
                Status = dto.Status,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.PickupPoints.Add(entity);

            await _context.SaveChangesAsync();

            return entity.PickupPointId;
        }
        public async Task<bool> UpdateAsync(
    long pickupPointId,
    UpdatePickupPointDto dto,
    long? userId)
        {
            var entity = await _context.PickupPoints
                .FirstOrDefaultAsync(x =>
                    x.PickupPointId == pickupPointId &&
                    !x.IsDeleted);

            if (entity is null)
                return false;

            entity.RouteId = dto.RouteId;
            entity.PickupPointName = dto.PickupPointName.Trim();
            entity.Landmark = string.IsNullOrWhiteSpace(dto.Landmark)
                ? null
                : dto.Landmark.Trim();
            entity.SequenceNo = dto.SequenceNo;
            entity.PickupTime = dto.PickupTime;
            entity.DropTime = dto.DropTime;
            entity.DistanceFromStart = dto.DistanceFromStart;
            entity.MonthlyFee = dto.MonthlyFee > 0 ? dto.MonthlyFee : (dto.MonthlyFare.HasValue ? dto.MonthlyFare.Value : entity.MonthlyFee);
            entity.Status = dto.Status;
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }
        public async Task<bool> DeleteAsync(
    long pickupPointId,
    long? userId)
        {
            var entity = await _context.PickupPoints
                .FirstOrDefaultAsync(x =>
                    x.PickupPointId == pickupPointId &&
                    !x.IsDeleted);

            if (entity is null)
                return false;

            entity.IsDeleted = true;
            entity.Status = false;
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }
        public async Task<IEnumerable<PickupPointLookupDto>> GetLookupAsync(
    long? routeId)
        {
            var query = _context.PickupPoints
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status);

            if (routeId.HasValue)
            {
                query = query.Where(x => x.RouteId == routeId.Value);
            }

            return await query
                .OrderBy(x => x.SequenceNo)
                .ThenBy(x => x.PickupPointName)
                .Select(x => new PickupPointLookupDto
                {
                    PickupPointId = x.PickupPointId,
                    PickupPointName = x.PickupPointName ?? string.Empty
                })
                .ToListAsync();
        }
        public async Task<bool> ExistsAsync(
    long routeId,
    string pickupPointName,
    long? excludePickupPointId = null)
        {
            string normalizedName = pickupPointName.Trim().ToLower();

            return await _context.PickupPoints
                .AsNoTracking()
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    x.RouteId == routeId &&
                    x.PickupPointName != null && x.PickupPointName.ToLower() == normalizedName &&
                    (!excludePickupPointId.HasValue ||
                     x.PickupPointId != excludePickupPointId.Value));
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

            var point = await _context.PickupPoints
                .AsNoTracking()
                .FirstOrDefaultAsync(x => !x.IsDeleted && (
                    (x.PickupPointName != null && x.PickupPointName.ToLower() == search.ToLower()) ||
                    x.PickupPointId.ToString() == search));

            if (point == null) return null;

            return await GetByIdAsync(point.PickupPointId);
        }
    }
}
