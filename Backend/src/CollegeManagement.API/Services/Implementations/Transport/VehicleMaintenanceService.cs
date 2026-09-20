using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class VehicleMaintenanceService : IVehicleMaintenanceService
    {
        private readonly IVehicleMaintenanceRepository _repository;
        private readonly AppDbContext _context;

        public VehicleMaintenanceService(
            IVehicleMaintenanceRepository repository,
            AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        // ----------------------------------------------------
        // Get All
        // ----------------------------------------------------

        public async Task<(
            IEnumerable<VehicleMaintenanceDto> Items,
            int TotalCount)> GetAllAsync(
                VehicleMaintenanceFilterDto filter)
        {
            filter ??= new VehicleMaintenanceFilterDto();

            if (filter.PageNumber <= 0)
                filter.PageNumber = 1;

            if (filter.PageSize <= 0)
                filter.PageSize = 10;

            if (filter.PageSize > 100)
                filter.PageSize = 100;

            if (filter.FromDate.HasValue &&
                filter.ToDate.HasValue &&
                filter.FromDate.Value.Date > filter.ToDate.Value.Date)
            {
                throw new ArgumentException(
                    "From date cannot be greater than to date.");
            }

            filter.Search = NormalizeOptionalText(filter.Search);
            filter.SortBy = NormalizeSortBy(filter.SortBy);
            filter.SortOrder = NormalizeSortOrder(filter.SortOrder);

            return await _repository.GetAllAsync(filter);
        }

        // ----------------------------------------------------
        // Get By Id
        // ----------------------------------------------------

        public async Task<VehicleMaintenanceDto?> GetByIdAsync(
            long maintenanceId)
        {
            if (maintenanceId <= 0)
                throw new ArgumentException(
                    "Invalid maintenance ID.");

            return await _repository.GetByIdAsync(maintenanceId);
        }

        // ----------------------------------------------------
        // Create
        // ----------------------------------------------------

        public async Task<long> CreateAsync(
            CreateVehicleMaintenanceDto dto,
            long createdBy)
        {
            ArgumentNullException.ThrowIfNull(dto);

            if (createdBy <= 0)
                createdBy = 1;

            if (dto.VehicleId <= 0 || !await _context.TransportVehicles.AnyAsync(x => x.VehicleId == dto.VehicleId && !x.IsDeleted))
            {
                var activeVehicle = await _context.TransportVehicles.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.Status)
                    ?? await _context.TransportVehicles.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted);
                if (activeVehicle != null) dto.VehicleId = activeVehicle.VehicleId;
            }

            NormalizeCreateDto(dto);

            await ValidateVehicleAsync(dto.VehicleId);

            ValidateMaintenanceData(
                dto.ServiceType,
                dto.ServiceDate,
                dto.Cost,
                dto.NextServiceDue);

            return await _repository.CreateAsync(dto, createdBy);
        }

        // ----------------------------------------------------
        // Update
        // ----------------------------------------------------

        public async Task<bool> UpdateAsync(
            long maintenanceId,
            UpdateVehicleMaintenanceDto dto,
            long updatedBy)
        {
            if (maintenanceId <= 0)
                throw new ArgumentException(
                    "Invalid maintenance ID.");

            ArgumentNullException.ThrowIfNull(dto);

            if (updatedBy <= 0)
                throw new ArgumentException(
                    "Invalid updated-by user ID.");

            var existing =
                await _repository.GetByIdAsync(maintenanceId);

            if (existing == null)
                throw new KeyNotFoundException(
                    "Vehicle maintenance record not found.");

            NormalizeUpdateDto(dto);

            await ValidateVehicleAsync(dto.VehicleId);

            ValidateMaintenanceData(
                dto.ServiceType,
                dto.ServiceDate,
                dto.Cost,
                dto.NextServiceDue);

            return await _repository.UpdateAsync(
                maintenanceId,
                dto,
                updatedBy);
        }

        // ----------------------------------------------------
        // Delete
        // ----------------------------------------------------

        public async Task<bool> DeleteAsync(
            long maintenanceId,
            long updatedBy)
        {
            if (maintenanceId <= 0)
                throw new ArgumentException(
                    "Invalid maintenance ID.");

            if (updatedBy <= 0)
                throw new ArgumentException(
                    "Invalid updated-by user ID.");

            var existing =
                await _repository.GetByIdAsync(maintenanceId);

            if (existing == null)
                throw new KeyNotFoundException(
                    "Vehicle maintenance record not found.");

            return await _repository.DeleteAsync(
                maintenanceId,
                updatedBy);
        }

        // ----------------------------------------------------
        // Lookup
        // ----------------------------------------------------

        public async Task<IEnumerable<VehicleMaintenanceLookupDto>>
            GetLookupAsync()
        {
            return await _repository.GetLookupAsync();
        }

        // ----------------------------------------------------
        // Vehicle Validation
        // ----------------------------------------------------

        private async Task ValidateVehicleAsync(long vehicleId)
        {
            if (vehicleId <= 0)
                throw new ArgumentException(
                    "Please select a valid vehicle.");

            var vehicle = await _context.TransportVehicles
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.VehicleId == vehicleId);

            if (vehicle == null)
                throw new KeyNotFoundException(
                    "Selected vehicle does not exist.");

            if (vehicle.IsDeleted)
                throw new InvalidOperationException(
                    "Selected vehicle has been deleted.");

            if (!vehicle.Status)
                throw new InvalidOperationException(
                    "Selected vehicle is inactive.");
        }

        // ----------------------------------------------------
        // Common Validation
        // ----------------------------------------------------

        private static void ValidateMaintenanceData(
            string serviceType,
            DateTime serviceDate,
            decimal cost,
            DateTime? nextServiceDue)
        {
            if (string.IsNullOrWhiteSpace(serviceType))
                throw new ArgumentException(
                    "Service type is required.");

            if (serviceType.Length > 150)
                throw new ArgumentException(
                    "Service type cannot exceed 150 characters.");

            if (serviceDate == default)
                throw new ArgumentException(
                    "Service date is required.");

            if (serviceDate.Date > DateTime.UtcNow.AddDays(1).Date)
                throw new ArgumentException(
                    "Service date cannot be in the future.");

            if (cost < 0)
                throw new ArgumentException(
                    "Cost cannot be negative.");

            if (nextServiceDue.HasValue &&
                nextServiceDue.Value.Date < serviceDate.Date)
            {
                throw new ArgumentException(
                    "Next service due date cannot be before the service date.");
            }
        }

        // ----------------------------------------------------
        // Normalize Create DTO
        // ----------------------------------------------------

        private static void NormalizeCreateDto(
            CreateVehicleMaintenanceDto dto)
        {
            dto.ServiceType =
                dto.ServiceType?.Trim() ?? string.Empty;

            dto.VendorCenter =
                NormalizeOptionalText(dto.VendorCenter);

            dto.Remarks =
                NormalizeOptionalText(dto.Remarks);

            dto.ServiceDate = dto.ServiceDate.Date;

            if (dto.NextServiceDue.HasValue)
                dto.NextServiceDue =
                    dto.NextServiceDue.Value.Date;
        }

        // ----------------------------------------------------
        // Normalize Update DTO
        // ----------------------------------------------------

        private static void NormalizeUpdateDto(
            UpdateVehicleMaintenanceDto dto)
        {
            dto.ServiceType =
                dto.ServiceType?.Trim() ?? string.Empty;

            dto.VendorCenter =
                NormalizeOptionalText(dto.VendorCenter);

            dto.Remarks =
                NormalizeOptionalText(dto.Remarks);

            dto.ServiceDate = dto.ServiceDate.Date;

            if (dto.NextServiceDue.HasValue)
                dto.NextServiceDue =
                    dto.NextServiceDue.Value.Date;
        }

        private static string? NormalizeOptionalText(
            string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            return value.Trim();
        }

        private static string NormalizeSortOrder(
            string? sortOrder)
        {
            return string.Equals(
                sortOrder,
                "asc",
                StringComparison.OrdinalIgnoreCase)
                ? "asc"
                : "desc";
        }

        private static string NormalizeSortBy(
            string? sortBy)
        {
            var allowedFields = new HashSet<string>(
                StringComparer.OrdinalIgnoreCase)
            {
                "ServiceDate",
                "ServiceType",
                "VehicleNumber",
                "Cost"
            };

            return !string.IsNullOrWhiteSpace(sortBy) &&
                   allowedFields.Contains(sortBy)
                ? sortBy
                : "ServiceDate";
        }
    }
}
