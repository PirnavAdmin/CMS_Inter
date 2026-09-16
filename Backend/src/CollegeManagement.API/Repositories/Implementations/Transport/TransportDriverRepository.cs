using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TransportDriverRepository : ITransportDriverRepository
    {
        private readonly AppDbContext _context;

        public TransportDriverRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<TransportDriverDto>> GetAllAsync(
            TransportDriverFilterDto filter)
        {
            var query = _context.TransportDrivers
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim().ToLower();

                query = query.Where(x =>
                    (x.DriverName != null && x.DriverName.ToLower().Contains(search)) ||
                    (x.MobileNumber != null && x.MobileNumber.ToLower().Contains(search)) ||
                    (x.LicenceNumber != null && x.LicenceNumber.ToLower().Contains(search)));
            }

            if (filter.Status.HasValue)
            {
                query = query.Where(x => x.Status == filter.Status.Value);
            }

            if (filter.LicenceExpired.HasValue)
            {
                var today = DateTime.UtcNow.Date;

                if (filter.LicenceExpired.Value)
                {
                    query = query.Where(x =>
                        x.LicenceExpiry.HasValue &&
                        x.LicenceExpiry.Value.Date < today);
                }
                else
                {
                    query = query.Where(x =>
                        !x.LicenceExpiry.HasValue ||
                        x.LicenceExpiry.Value.Date >= today);
                }
            }

            query = ApplySorting(query, filter.SortBy, filter.SortOrder);

            var totalCount = await query.CountAsync();

            var pageNumber = filter.PageNumber < 1
                ? 1
                : filter.PageNumber;

            var pageSize = filter.PageSize < 1
                ? 10
                : filter.PageSize;

            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new TransportDriverDto
                {
                    DriverId = x.DriverId,
                    DriverName = x.DriverName ?? string.Empty,
                    EmployeeId = !string.IsNullOrWhiteSpace(x.EmployeeId) ? x.EmployeeId : $"DRV-{x.DriverId}",
                    MobileNumber = x.MobileNumber ?? string.Empty,
                    AlternateMobileNumber = x.AlternateMobileNumber,
                    Email = x.Email,
                    LicenceNumber = x.LicenceNumber ?? string.Empty,
                    LicenceExpiry = x.LicenceExpiry,
                    Address = x.Address,
                    BloodGroup = x.BloodGroup,
                    EmergencyContactName = x.EmergencyContactName,
                    Status = x.Status ? "Active" : "Inactive",
                    StatusText = x.Status ? "Active" : "Inactive",
                    IsLicenceExpired =
                        x.LicenceExpiry.HasValue &&
                        x.LicenceExpiry.Value.Date < DateTime.UtcNow.Date,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();

            return new PagedResult<TransportDriverDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<TransportDriverDto?> GetByIdAsync(long driverId)
        {
            return await _context.TransportDrivers
                .AsNoTracking()
                .Where(x =>
                    x.DriverId == driverId &&
                    !x.IsDeleted)
                .Select(x => new TransportDriverDto
                {
                    DriverId = x.DriverId,
                    DriverName = x.DriverName ?? string.Empty,
                    EmployeeId = !string.IsNullOrWhiteSpace(x.EmployeeId) ? x.EmployeeId : $"DRV-{x.DriverId}",
                    MobileNumber = x.MobileNumber ?? string.Empty,
                    AlternateMobileNumber = x.AlternateMobileNumber,
                    Email = x.Email,
                    LicenceNumber = x.LicenceNumber ?? string.Empty,
                    LicenceExpiry = x.LicenceExpiry,
                    Address = x.Address,
                    BloodGroup = x.BloodGroup,
                    EmergencyContactName = x.EmergencyContactName,
                    EmergencyContactNumber = x.EmergencyContactNumber,
                    Status = x.Status ? "Active" : "Inactive",
                    StatusText = x.Status ? "Active" : "Inactive",
                    IsLicenceExpired =
                        x.LicenceExpiry.HasValue &&
                        x.LicenceExpiry.Value.Date < DateTime.UtcNow.Date,
                    CreatedAt = x.CreatedAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<long> CreateAsync(
            CreateTransportDriverDto dto,
            long? userId)
        {
            var rand = Random.Shared.Next(1000, 9999);
            var empId = !string.IsNullOrWhiteSpace(dto.EmployeeId) && !dto.EmployeeId.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.EmployeeId.Trim() : $"DRV-{rand}";
            var licNum = !string.IsNullOrWhiteSpace(dto.LicenceNumber) && !dto.LicenceNumber.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.LicenceNumber.Trim() : $"LIC-{rand}";
            var mobNum = !string.IsNullOrWhiteSpace(dto.MobileNumber) && !dto.MobileNumber.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.MobileNumber.Trim() : $"98765{rand}";

            var entity = new TransportDriver
            {
                DriverName = !string.IsNullOrWhiteSpace(dto.DriverName) && !dto.DriverName.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.DriverName.Trim() : "Driver",
                EmployeeId = empId,
                MobileNumber = mobNum,
                AlternateMobileNumber = dto.AlternateMobileNumber?.Trim() ?? string.Empty,
                Email = dto.Email?.Trim(),
                LicenceNumber = licNum,
                LicenceExpiry = dto.LicenceExpiry,
                Address = dto.Address?.Trim() ?? string.Empty,
                BloodGroup = dto.BloodGroup?.Trim() ?? string.Empty,
                EmergencyContactName = dto.EmergencyContactName?.Trim() ?? string.Empty,
                EmergencyContactNumber = dto.EmergencyContactNumber?.Trim() ?? string.Empty,
                Status = dto.Status,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TransportDrivers.Add(entity);
            await _context.SaveChangesAsync();

            return entity.DriverId;
        }

        public async Task<bool> UpdateAsync(
            long driverId,
            UpdateTransportDriverDto dto,
            long? userId)
        {
            var entity = await _context.TransportDrivers
                .FirstOrDefaultAsync(x =>
                    x.DriverId == driverId &&
                    !x.IsDeleted);

            if (entity == null)
                return false;

            if (!string.IsNullOrWhiteSpace(dto.DriverName)) entity.DriverName = dto.DriverName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.EmployeeId)) entity.EmployeeId = dto.EmployeeId.Trim();
            if (!string.IsNullOrWhiteSpace(dto.MobileNumber)) entity.MobileNumber = dto.MobileNumber.Trim();
            entity.AlternateMobileNumber = dto.AlternateMobileNumber?.Trim() ?? string.Empty;
            if (dto.Email != null) entity.Email = dto.Email.Trim();
            if (!string.IsNullOrWhiteSpace(dto.LicenceNumber)) entity.LicenceNumber = dto.LicenceNumber.Trim();
            entity.LicenceExpiry = dto.LicenceExpiry;
            entity.Address = dto.Address?.Trim() ?? string.Empty;
            entity.BloodGroup = dto.BloodGroup?.Trim() ?? string.Empty;
            entity.EmergencyContactName = dto.EmergencyContactName?.Trim() ?? string.Empty;
            entity.EmergencyContactNumber = dto.EmergencyContactNumber?.Trim() ?? string.Empty;
            entity.Status = dto.Status;
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeleteAsync(
            long driverId,
            long? userId)
        {
            var entity = await _context.TransportDrivers
                .FirstOrDefaultAsync(x =>
                    x.DriverId == driverId &&
                    !x.IsDeleted);

            if (entity == null)
                return false;

            entity.IsDeleted = true;
            entity.Status = false;
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ExistsAsync(
            string licenceNumber,
            string mobileNumber,
            long? excludeDriverId = null)
        {
            licenceNumber = licenceNumber.Trim().ToLower();
            mobileNumber = mobileNumber.Trim().ToLower();

            return await _context.TransportDrivers
                .AsNoTracking()
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    (
                        (x.LicenceNumber != null && x.LicenceNumber.ToLower() == licenceNumber) ||
                        (x.MobileNumber != null && x.MobileNumber.ToLower() == mobileNumber)
                    ) &&
                    (!excludeDriverId.HasValue ||
                     x.DriverId != excludeDriverId.Value));
        }

        public async Task<IEnumerable<TransportDriverLookupDto>>
            GetLookupAsync()
        {
            return await _context.TransportDrivers
                .AsNoTracking()
                .Where(x =>
                    !x.IsDeleted &&
                    x.Status)
                .OrderBy(x => x.DriverName)
                .Select(x => new TransportDriverLookupDto
                {
                    DriverId = x.DriverId,
                    DriverName = x.DriverName ?? string.Empty,
                    MobileNumber = x.MobileNumber ?? string.Empty,
                    LicenceNumber = x.LicenceNumber ?? string.Empty
                })
                .ToListAsync();
        }

        public async Task<TransportDriverDto?> GetByIdOrNumberAsync(string driverIdOrNumber)
        {
            if (string.IsNullOrWhiteSpace(driverIdOrNumber)) return null;

            string search = driverIdOrNumber.Trim();

            if (long.TryParse(search, out long driverId))
            {
                var byId = await GetByIdAsync(driverId);
                if (byId != null) return byId;
            }

            var driver = await _context.TransportDrivers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => !x.IsDeleted && (
                    (x.LicenceNumber != null && x.LicenceNumber.ToLower() == search.ToLower()) ||
                    (x.DriverName != null && x.DriverName.ToLower() == search.ToLower()) ||
                    (x.MobileNumber != null && x.MobileNumber.ToLower() == search.ToLower()) ||
                    x.DriverId.ToString() == search));

            if (driver == null) return null;

            return await GetByIdAsync(driver.DriverId);
        }

        private static IQueryable<TransportDriver> ApplySorting(
            IQueryable<TransportDriver> query,
            string? sortBy,
            string? sortOrder)
        {
            var descending = string.Equals(
                sortOrder,
                "desc",
                StringComparison.OrdinalIgnoreCase);

            return sortBy?.Trim().ToLower() switch
            {
                "mobilenumber" => descending
                    ? query.OrderByDescending(x => x.MobileNumber)
                    : query.OrderBy(x => x.MobileNumber),

                "licencenumber" => descending
                    ? query.OrderByDescending(x => x.LicenceNumber)
                    : query.OrderBy(x => x.LicenceNumber),

                "licenceexpiry" => descending
                    ? query.OrderByDescending(x => x.LicenceExpiry)
                    : query.OrderBy(x => x.LicenceExpiry),

                "createdat" => descending
                    ? query.OrderByDescending(x => x.CreatedAt)
                    : query.OrderBy(x => x.CreatedAt),

                _ => descending
                    ? query.OrderByDescending(x => x.DriverName)
                    : query.OrderBy(x => x.DriverName)
            };
        }
    }
}
