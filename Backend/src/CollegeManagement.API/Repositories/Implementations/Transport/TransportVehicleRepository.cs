using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TransportVehicleRepository : ITransportVehicleRepository
    {
        private readonly AppDbContext _context;

        public TransportVehicleRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<PagedResult<TransportVehicleDto>> GetAllAsync(TransportVehicleFilterDto filter)
        {
            var query = _context.TransportVehicles
                .Where(x => !x.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                string search = filter.Search.Trim().ToLower();

                query = query.Where(x =>
                    (x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(search)) ||
                    (x.VehicleName != null && x.VehicleName.ToLower().Contains(search)) ||
                    (x.RegistrationNumber != null && x.RegistrationNumber.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(filter.VehicleType))
            {
                query = query.Where(x => x.VehicleType == filter.VehicleType);
            }

            if (filter.Status.HasValue)
            {
                query = query.Where(x => x.Status == filter.Status.Value);
            }

            int totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(x => x.VehicleName)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(x => new TransportVehicleDto
                {
                    VehicleId = x.VehicleId,
                    VehicleNumber = x.VehicleNumber ?? string.Empty,
                    RegistrationNumber = x.RegistrationNumber ?? string.Empty,
                    VehicleName = x.VehicleName ?? string.Empty,
                    VehicleType = x.VehicleType ?? string.Empty,
                    Capacity = x.Capacity,
                    IsAC = x.IsAC,
                    ChassisNumber = x.ChassisNumber,
                    EngineNumber = x.EngineNumber,
                    GpsDeviceId = x.GpsDeviceId,
                    Manufacturer = x.Manufacturer,
                    Model = x.Model,
                    InsuranceNumber = x.InsuranceNumber,
                    InsuranceExpiry = x.InsuranceExpiry,
                    PollutionExpiry = x.PollutionExpiry,
                    FitnessExpiry = x.FitnessExpiry,
                    Status = x.Status ? "Active" : "Inactive",
                    StatusText = x.Status ? "Active" : "Inactive",
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();

            return new PagedResult<TransportVehicleDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = filter.PageNumber,
                PageSize = filter.PageSize
            };
        }
        public async Task<TransportVehicleDto?> GetByIdAsync(long vehicleId)
        {
            return await _context.TransportVehicles
                .Where(x => x.VehicleId == vehicleId && !x.IsDeleted)
                .Select(x => new TransportVehicleDto
                {
                    VehicleId = x.VehicleId,
                    VehicleNumber = x.VehicleNumber ?? string.Empty,
                    RegistrationNumber = x.RegistrationNumber ?? string.Empty,
                    VehicleName = x.VehicleName ?? string.Empty,
                    VehicleType = x.VehicleType ?? string.Empty,
                    Capacity = x.Capacity,
                    IsAC = x.IsAC,
                    ChassisNumber = x.ChassisNumber,
                    EngineNumber = x.EngineNumber,
                    GpsDeviceId = x.GpsDeviceId,
                    Manufacturer = x.Manufacturer,
                    Model = x.Model,
                    InsuranceNumber = x.InsuranceNumber,
                    InsuranceExpiry = x.InsuranceExpiry,
                    PollutionExpiry = x.PollutionExpiry,
                    FitnessExpiry = x.FitnessExpiry,
                    Status = x.Status ? "Active" : "Inactive",
                    StatusText = x.Status ? "Active" : "Inactive",
                    CreatedAt = x.CreatedAt
                })
                .FirstOrDefaultAsync();
        }
        public async Task<long> CreateAsync(CreateTransportVehicleDto dto, long? userId)
        {
            var entity = new TransportVehicle
            {
                VehicleNumber = !string.IsNullOrWhiteSpace(dto.VehicleNumber) ? dto.VehicleNumber.Trim() : $"VH-{Random.Shared.Next(100, 999)}",
                RegistrationNumber = !string.IsNullOrWhiteSpace(dto.RegistrationNumber) ? dto.RegistrationNumber.Trim() : $"REG-{Random.Shared.Next(100, 999)}",
                VehicleName = !string.IsNullOrWhiteSpace(dto.VehicleName) ? dto.VehicleName.Trim() : "School Bus",
                VehicleType = !string.IsNullOrWhiteSpace(dto.VehicleType) ? dto.VehicleType.Trim() : "Bus",
                Capacity = dto.Capacity > 0 ? dto.Capacity : 40,
                IsAC = dto.IsAC,
                ChassisNumber = dto.ChassisNumber?.Trim(),
                EngineNumber = dto.EngineNumber?.Trim(),
                GpsDeviceId = dto.GpsDeviceId?.Trim(),
                Manufacturer = dto.Manufacturer?.Trim() ?? string.Empty,
                Model = dto.Model?.Trim() ?? string.Empty,
                InsuranceNumber = dto.InsuranceNumber?.Trim() ?? string.Empty,
                InsuranceExpiry = dto.InsuranceExpiry,
                PollutionExpiry = dto.PollutionExpiry,
                FitnessExpiry = dto.FitnessExpiry,
                Status = dto.Status,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TransportVehicles.Add(entity);

            await _context.SaveChangesAsync();

            return entity.VehicleId;
        }
        public async Task<bool> UpdateAsync(
    long vehicleId,
    UpdateTransportVehicleDto dto,
    long? userId)
        {
            var entity = await _context.TransportVehicles
                .FirstOrDefaultAsync(x =>
                    x.VehicleId == vehicleId &&
                    !x.IsDeleted);

            if (entity == null)
                return false;

            if (!string.IsNullOrWhiteSpace(dto.VehicleNumber)) entity.VehicleNumber = dto.VehicleNumber.Trim();
            if (!string.IsNullOrWhiteSpace(dto.RegistrationNumber)) entity.RegistrationNumber = dto.RegistrationNumber.Trim();
            if (!string.IsNullOrWhiteSpace(dto.VehicleName)) entity.VehicleName = dto.VehicleName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.VehicleType)) entity.VehicleType = dto.VehicleType.Trim();
            if (dto.Capacity > 0) entity.Capacity = dto.Capacity;
            entity.IsAC = dto.IsAC;
            if (dto.ChassisNumber != null) entity.ChassisNumber = dto.ChassisNumber.Trim();
            if (dto.EngineNumber != null) entity.EngineNumber = dto.EngineNumber.Trim();
            if (dto.GpsDeviceId != null) entity.GpsDeviceId = dto.GpsDeviceId.Trim();
            entity.Manufacturer = dto.Manufacturer?.Trim() ?? string.Empty;
            entity.Model = dto.Model?.Trim() ?? string.Empty;
            entity.InsuranceNumber = dto.InsuranceNumber?.Trim() ?? string.Empty;
            entity.InsuranceExpiry = dto.InsuranceExpiry;
            entity.PollutionExpiry = dto.PollutionExpiry;
            entity.FitnessExpiry = dto.FitnessExpiry;
            entity.Status = dto.Status;
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }
        public async Task<bool> DeleteAsync(
    long vehicleId,
    long? userId)
        {
            var entity = await _context.TransportVehicles
                .FirstOrDefaultAsync(x =>
                    x.VehicleId == vehicleId &&
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
    string vehicleNumber,
    string registrationNumber,
    long? excludeVehicleId = null)
        {
            vehicleNumber = vehicleNumber.Trim().ToLower();
            registrationNumber = registrationNumber.Trim().ToLower();

            return await _context.TransportVehicles
                .AsNoTracking()
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    (
                        (x.VehicleNumber != null && x.VehicleNumber.ToLower() == vehicleNumber) ||
                        (x.RegistrationNumber != null && x.RegistrationNumber.ToLower() == registrationNumber)
                    ) &&
                    (!excludeVehicleId.HasValue ||
                     x.VehicleId != excludeVehicleId.Value));
        }
        public async Task<IEnumerable<TransportVehicleLookupDto>> GetLookupAsync()
        {
            return await _context.TransportVehicles
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status)
                .OrderBy(x => x.VehicleNumber)
                .Select(x => new TransportVehicleLookupDto
                {
                    VehicleId = x.VehicleId,
                    VehicleNumber = x.VehicleNumber ?? string.Empty,
                    VehicleName = x.VehicleName ?? string.Empty,
                    RegistrationNumber = x.RegistrationNumber ?? string.Empty
                })
                .ToListAsync();
        }

        public async Task<TransportVehicleDto?> GetByIdOrNumberAsync(string vehicleIdOrNumber)
        {
            if (string.IsNullOrWhiteSpace(vehicleIdOrNumber)) return null;

            string search = vehicleIdOrNumber.Trim();

            if (long.TryParse(search, out long vehicleId))
            {
                var byId = await GetByIdAsync(vehicleId);
                if (byId != null) return byId;
            }

            var vehicle = await _context.TransportVehicles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => !x.IsDeleted && (
                    (x.VehicleNumber != null && x.VehicleNumber.ToLower() == search.ToLower()) ||
                    (x.RegistrationNumber != null && x.RegistrationNumber.ToLower() == search.ToLower()) ||
                    (x.VehicleName != null && x.VehicleName.ToLower() == search.ToLower()) ||
                    x.VehicleId.ToString() == search));

            if (vehicle == null) return null;

            return await GetByIdAsync(vehicle.VehicleId);
        }
    }
}

