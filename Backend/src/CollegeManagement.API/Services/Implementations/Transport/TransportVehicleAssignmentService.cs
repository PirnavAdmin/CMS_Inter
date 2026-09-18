using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportVehicleAssignmentService
        : ITransportVehicleAssignmentService
    {
        private readonly ITransportVehicleAssignmentRepository _repository;
        private readonly AppDbContext _context;

        public TransportVehicleAssignmentService(
            ITransportVehicleAssignmentRepository repository,
            AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<PagedResult<TransportVehicleAssignmentDto>> GetAllAsync(
            TransportVehicleAssignmentFilterDto filter)
        {
            filter.PageNumber = filter.PageNumber < 1
                ? 1
                : filter.PageNumber;

            filter.PageSize = filter.PageSize < 1
                ? 10
                : filter.PageSize;

            if (filter.PageSize > 100)
                filter.PageSize = 100;

            return await _repository.GetAllAsync(filter);
        }

        public async Task<TransportVehicleAssignmentDto?> GetByIdAsync(
            long assignmentId)
        {
            if (assignmentId <= 0)
                return null;

            return await _repository.GetByIdAsync(assignmentId);
        }

        public async Task<long> CreateAsync(
            CreateTransportVehicleAssignmentDto dto,
            long? userId)
        {
            // Auto-resolve routeId if missing or non-existent
            if (dto.RouteId <= 0 || !await _context.TransportRoutes.AnyAsync(x => x.RouteId == dto.RouteId && !x.IsDeleted))
            {
                var activeRoute = await _context.TransportRoutes.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.Status)
                    ?? await _context.TransportRoutes.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted);
                if (activeRoute != null) dto.RouteId = activeRoute.RouteId;
            }

            // Auto-resolve vehicleId if missing or non-existent
            if (dto.VehicleId <= 0 || !await _context.TransportVehicles.AnyAsync(x => x.VehicleId == dto.VehicleId && !x.IsDeleted))
            {
                var activeVehicle = await _context.TransportVehicles.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.Status)
                    ?? await _context.TransportVehicles.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted);
                if (activeVehicle != null) dto.VehicleId = activeVehicle.VehicleId;
            }

            // Auto-resolve driverId if missing or non-existent
            if (dto.DriverId <= 0 || !await _context.TransportDrivers.AnyAsync(x => x.DriverId == dto.DriverId && !x.IsDeleted))
            {
                var activeDriver = await _context.TransportDrivers.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.Status)
                    ?? await _context.TransportDrivers.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted);
                if (activeDriver != null) dto.DriverId = activeDriver.DriverId;
            }

            await ValidateAssignmentAsync(
                dto.RouteId,
                dto.VehicleId,
                dto.DriverId,
                dto.EffectiveFrom,
                dto.EffectiveTo);

            // Deactivate conflicting active vehicle or driver assignments to allow seamless reassignment
            var conflictingVehicleAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && x.Status && x.VehicleId == dto.VehicleId)
                .ToListAsync();

            foreach (var va in conflictingVehicleAssignments)
            {
                va.Status = false;
                va.EffectiveTo = DateTime.UtcNow;
            }

            var conflictingDriverAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && x.Status && x.DriverId == dto.DriverId)
                .ToListAsync();

            foreach (var da in conflictingDriverAssignments)
            {
                da.Status = false;
                da.EffectiveTo = DateTime.UtcNow;
            }

            if (conflictingVehicleAssignments.Any() || conflictingDriverAssignments.Any())
            {
                await _context.SaveChangesAsync();
            }

            return await _repository.CreateAsync(dto, userId);
        }

        public async Task<bool> UpdateAsync(
            long assignmentId,
            UpdateTransportVehicleAssignmentDto dto,
            long? userId)
        {
            if (assignmentId <= 0)
                return false;

            var existing = await _repository.GetByIdAsync(assignmentId);

            if (existing == null)
                return false;

            // Auto-resolve routeId if missing or non-existent
            if (dto.RouteId <= 0 || !await _context.TransportRoutes.AnyAsync(x => x.RouteId == dto.RouteId && !x.IsDeleted))
            {
                dto.RouteId = existing.RouteId;
            }

            // Auto-resolve vehicleId if missing or non-existent
            if (dto.VehicleId <= 0 || !await _context.TransportVehicles.AnyAsync(x => x.VehicleId == dto.VehicleId && !x.IsDeleted))
            {
                dto.VehicleId = existing.VehicleId;
            }

            // Auto-resolve driverId if missing or non-existent
            if (dto.DriverId <= 0 || !await _context.TransportDrivers.AnyAsync(x => x.DriverId == dto.DriverId && !x.IsDeleted))
            {
                dto.DriverId = existing.DriverId;
            }

            await ValidateAssignmentAsync(
                dto.RouteId,
                dto.VehicleId,
                dto.DriverId,
                dto.EffectiveFrom,
                dto.EffectiveTo);

            // Deactivate conflicting active vehicle or driver assignments to allow seamless reassignment/editing
            var conflictingVehicleAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && x.Status && x.VehicleId == dto.VehicleId && x.AssignmentId != assignmentId)
                .ToListAsync();

            foreach (var va in conflictingVehicleAssignments)
            {
                va.Status = false;
                va.EffectiveTo = DateTime.UtcNow;
            }

            var conflictingDriverAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && x.Status && x.DriverId == dto.DriverId && x.AssignmentId != assignmentId)
                .ToListAsync();

            foreach (var da in conflictingDriverAssignments)
            {
                da.Status = false;
                da.EffectiveTo = DateTime.UtcNow;
            }

            if (conflictingVehicleAssignments.Any() || conflictingDriverAssignments.Any())
            {
                await _context.SaveChangesAsync();
            }

            return await _repository.UpdateAsync(
                assignmentId,
                dto,
                userId);
        }

        public async Task<bool> DeleteAsync(
            long assignmentId,
            long? userId)
        {
            if (assignmentId <= 0)
                return false;

            return await _repository.DeleteAsync(
                assignmentId,
                userId);
        }

        public async Task<IEnumerable<TransportVehicleAssignmentLookupDto>>
            GetLookupAsync()
        {
            return await _repository.GetLookupAsync();
        }

        private async Task ValidateAssignmentAsync(
            long routeId,
            long vehicleId,
            long driverId,
            DateTime effectiveFrom,
            DateTime? effectiveTo)
        {
            if (routeId <= 0)
                throw new ArgumentException("A valid route is required.");

            if (vehicleId <= 0)
                throw new ArgumentException("A valid vehicle is required.");

            if (driverId <= 0)
                throw new ArgumentException("A valid driver is required.");

            if (effectiveTo.HasValue &&
                effectiveTo.Value.Date < effectiveFrom.Date)
            {
                throw new ArgumentException(
                    "Effective To date cannot be earlier than Effective From date.");
            }

            var routeExists = await _context.TransportRoutes
                .AsNoTracking()
                .AnyAsync(x =>
                    x.RouteId == routeId &&
                    !x.IsDeleted &&
                    x.Status);

            if (!routeExists)
            {
                throw new InvalidOperationException(
                    "The selected route does not exist or is inactive.");
            }

            var vehicleExists = await _context.TransportVehicles
                .AsNoTracking()
                .AnyAsync(x =>
                    x.VehicleId == vehicleId &&
                    !x.IsDeleted &&
                    x.Status);

            if (!vehicleExists)
            {
                throw new InvalidOperationException(
                    "The selected vehicle does not exist or is inactive.");
            }

            var driver = await _context.TransportDrivers
                .AsNoTracking()
                .Where(x =>
                    x.DriverId == driverId &&
                    !x.IsDeleted &&
                    x.Status)
                .Select(x => new
                {
                    x.DriverId,
                    x.LicenceExpiry
                })
                .FirstOrDefaultAsync();

            if (driver == null)
            {
                throw new InvalidOperationException(
                    "The selected driver does not exist or is inactive.");
            }

            if (driver.LicenceExpiry.HasValue &&
                driver.LicenceExpiry.Value.Date < effectiveFrom.Date)
            {
                throw new InvalidOperationException(
                    "The selected driver's licence expires before the assignment starts.");
            }
        }
    }
}
