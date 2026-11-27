using Microsoft.AspNetCore.SignalR;
using CollegeManagement.API.Hubs;
using CollegeManagement.API.Models.Transport;
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
        private readonly IHubContext<DriverNotificationHub> _hubContext;

        public TransportVehicleAssignmentService(
            ITransportVehicleAssignmentRepository repository,
            AppDbContext context,
            IHubContext<DriverNotificationHub> hubContext)
        {
            _repository = repository;
            _context = context;
            _hubContext = hubContext;
        }

        // -----------------------------------------------------------------------
        // Phase 2: Driver notification helpers — best-effort, never throws
        // -----------------------------------------------------------------------

        /// <summary>
        /// Resolves the driver's StaffId (the JWT identity) then inserts a
        /// persisted notification row + fires a SignalR push (best-effort).
        /// </summary>
        private async Task NotifyDriverAsync(
            long driverIdOrStaffId,
            long assignmentId,
            string type,
            string title,
            string message)
        {
            try
            {
                // Resolve StaffId: TransportDrivers.StaffId == JWT staff identity
                var driverRecord = await _context.TransportDrivers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d =>
                        d.DriverId == driverIdOrStaffId ||
                        d.StaffId  == (int)driverIdOrStaffId);

                int staffId = driverRecord?.StaffId ?? (int)driverIdOrStaffId;
                if (staffId <= 0) return;

                // Idempotent hourly event-key prevents duplicate rows on retry
                var eventKey = $"{assignmentId}_{type}_{DateTime.UtcNow:yyyyMMddHH}";
                var alreadyExists = await _context.DriverNotifications
                    .AnyAsync(n => n.EventKey == eventKey);

                if (!alreadyExists)
                {
                    _context.DriverNotifications.Add(new DriverNotification
                    {
                        StaffId      = staffId,
                        Type         = type,
                        Title        = title,
                        Message      = message,
                        AssignmentId = assignmentId,
                        EventKey     = eventKey,
                        CreatedTime  = DateTime.UtcNow,
                        IsDelivered  = false
                    });
                    await _context.SaveChangesAsync();
                }

                // SignalR live push (optional — 30-s polling is the fallback)
                try
                {
                    await _hubContext.Clients
                        .Group($"driver-{staffId}")
                        .SendAsync("ReceiveNotification", new
                        {
                            type,
                            title,
                            message,
                            assignmentId,
                            createdAt = DateTime.UtcNow
                        });
                }
                catch { /* non-fatal */ }
            }
            catch { /* notification must never block an assignment write */ }
        }

        private static string BuildAssignmentMessage(
            string action,
            string? vehicleNumber,
            string? routeName,
            DateTime effectiveFrom,
            DateTime? effectiveTo)
        {
            var dateStr = effectiveFrom.ToString("dd MMM yyyy");
            var endStr  = effectiveTo.HasValue
                ? $" to {effectiveTo.Value:dd MMM yyyy}"
                : string.Empty;

            return action switch
            {
                "ASSIGNMENT_CREATED"    =>
                    $"You have been assigned Vehicle {vehicleNumber ?? "N/A"} on Route '{routeName ?? "N/A"}' effective {dateStr}{endStr}.",
                "ASSIGNMENT_UPDATED"    =>
                    $"Your assignment has been updated: Vehicle {vehicleNumber ?? "N/A"} on Route '{routeName ?? "N/A"}', effective {dateStr}{endStr}.",
                "ASSIGNMENT_REMOVED"    =>
                    $"Your vehicle/route assignment (Vehicle {vehicleNumber ?? "N/A"}, Route '{routeName ?? "N/A"}') has been removed.",
                "ASSIGNMENT_REASSIGNED" =>
                    $"You have been assigned Vehicle {vehicleNumber ?? "N/A"} on Route '{routeName ?? "N/A"}' effective {dateStr}{endStr}.",
                "ASSIGNMENT_DEASSIGNED" =>
                    $"You have been unassigned from Vehicle {vehicleNumber ?? "N/A"} on Route '{routeName ?? "N/A"}' as of {dateStr}.",
                _ => "Your transport assignment has been updated."
            };
        }

        // -----------------------------------------------------------------------
        // Public service methods
        // -----------------------------------------------------------------------

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

            // Auto-resolve driverId if missing or non-existent (Staff is single source of truth for drivers)
            if (dto.DriverId <= 0 || !await _context.Staffs.AnyAsync(x => x.Id == dto.DriverId && !x.IsDeleted && x.IsDriver))
            {
                var activeDriver = await _context.Staffs.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.IsDriver && x.Status == "Active")
                    ?? await _context.Staffs.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.IsDriver);
                if (activeDriver != null) dto.DriverId = activeDriver.Id;
            }

            await ValidateAssignmentAsync(
                dto.RouteId,
                dto.VehicleId,
                dto.DriverId,
                dto.EffectiveFrom,
                dto.EffectiveTo);

            // Deactivate conflicting active vehicle or driver assignments to allow seamless reassignment
            var conflictingVehicleAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && (x.Status || x.IsActive) && x.VehicleId == dto.VehicleId)
                .ToListAsync();

            foreach (var va in conflictingVehicleAssignments)
            {
                va.Status = false;
                va.IsActive = false;
                va.EffectiveTo = dto.EffectiveFrom != default ? dto.EffectiveFrom : DateTime.UtcNow;
            }

            var conflictingDriverAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && (x.Status || x.IsActive) && x.DriverId == dto.DriverId)
                .ToListAsync();

            // Collect deassigned driver IDs before deactivating (for removal notifications)
            var deassignedDriverIds = conflictingDriverAssignments
                .Where(x => x.DriverId != dto.DriverId)
                .Select(x => x.DriverId)
                .Distinct()
                .ToList();

            foreach (var da in conflictingDriverAssignments)
            {
                da.Status = false;
                da.IsActive = false;
                da.EffectiveTo = dto.EffectiveFrom != default ? dto.EffectiveFrom : DateTime.UtcNow;
            }

            if (conflictingVehicleAssignments.Any() || conflictingDriverAssignments.Any())
            {
                await _context.SaveChangesAsync();
            }

            var assignmentId = await _repository.CreateAsync(dto, userId);

            if (assignmentId > 0)
            {
                // Look up vehicle & route names for the notification message
                var vehicle = await _context.TransportVehicles.AsNoTracking()
                    .FirstOrDefaultAsync(v => v.VehicleId == dto.VehicleId);
                var route = await _context.TransportRoutes.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.RouteId == dto.RouteId);

                var vehicleNumber = vehicle?.VehicleNumber;
                var routeName     = route?.RouteName;

                // Phase 2: Notify newly assigned driver
                await NotifyDriverAsync(
                    dto.DriverId,
                    assignmentId,
                    "ASSIGNMENT_CREATED",
                    "New Vehicle Assigned",
                    BuildAssignmentMessage("ASSIGNMENT_CREATED", vehicleNumber, routeName, dto.EffectiveFrom, dto.EffectiveTo));

                // Phase 2: Notify drivers who were deassigned as a side-effect
                foreach (var oldDriverId in deassignedDriverIds)
                {
                    await NotifyDriverAsync(
                        oldDriverId,
                        assignmentId,
                        "ASSIGNMENT_DEASSIGNED",
                        "Assignment Removed",
                        BuildAssignmentMessage("ASSIGNMENT_DEASSIGNED", vehicleNumber, routeName, dto.EffectiveFrom, dto.EffectiveTo));
                }
            }

            return assignmentId;
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

            // Track if driver is being reassigned to notify old driver
            var previousDriverId = existing.DriverId;
            var driverChanged    = dto.DriverId > 0 && dto.DriverId != previousDriverId;

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

            // Auto-resolve driverId if missing or non-existent (Staff is single source of truth for drivers)
            if (dto.DriverId <= 0 || !await _context.Staffs.AnyAsync(x => x.Id == dto.DriverId && !x.IsDeleted && x.IsDriver))
            {
                dto.DriverId = existing.DriverId;
                driverChanged = false;
            }

            await ValidateAssignmentAsync(
                dto.RouteId,
                dto.VehicleId,
                dto.DriverId,
                dto.EffectiveFrom,
                dto.EffectiveTo);

            // Deactivate conflicting active vehicle or driver assignments to allow seamless reassignment/editing
            var conflictingVehicleAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && (x.Status || x.IsActive) && x.VehicleId == dto.VehicleId && x.AssignmentId != assignmentId)
                .ToListAsync();

            foreach (var va in conflictingVehicleAssignments)
            {
                va.Status = false;
                va.IsActive = false;
                va.EffectiveTo = dto.EffectiveFrom != default ? dto.EffectiveFrom : DateTime.UtcNow;
            }

            var conflictingDriverAssignments = await _context.TransportVehicleAssignments
                .Where(x => !x.IsDeleted && (x.Status || x.IsActive) && x.DriverId == dto.DriverId && x.AssignmentId != assignmentId)
                .ToListAsync();

            foreach (var da in conflictingDriverAssignments)
            {
                da.Status = false;
                da.IsActive = false;
                da.EffectiveTo = dto.EffectiveFrom != default ? dto.EffectiveFrom : DateTime.UtcNow;
            }

            if (conflictingVehicleAssignments.Any() || conflictingDriverAssignments.Any())
            {
                await _context.SaveChangesAsync();
            }

            var success = await _repository.UpdateAsync(
                assignmentId,
                dto,
                userId);

            if (success)
            {
                // Look up vehicle & route names for notification messages
                var vehicle = await _context.TransportVehicles.AsNoTracking()
                    .FirstOrDefaultAsync(v => v.VehicleId == dto.VehicleId);
                var route = await _context.TransportRoutes.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.RouteId == dto.RouteId);

                var vehicleNumber = vehicle?.VehicleNumber;
                var routeName     = route?.RouteName;

                if (driverChanged)
                {
                    // Phase 2: Reassignment — notify old driver (removed) and new driver (assigned)
                    await NotifyDriverAsync(
                        previousDriverId,
                        assignmentId,
                        "ASSIGNMENT_DEASSIGNED",
                        "Assignment Removed",
                        BuildAssignmentMessage("ASSIGNMENT_DEASSIGNED", vehicleNumber, routeName, dto.EffectiveFrom, dto.EffectiveTo));

                    await NotifyDriverAsync(
                        dto.DriverId,
                        assignmentId,
                        "ASSIGNMENT_REASSIGNED",
                        "Vehicle Assignment Updated",
                        BuildAssignmentMessage("ASSIGNMENT_REASSIGNED", vehicleNumber, routeName, dto.EffectiveFrom, dto.EffectiveTo));
                }
                else
                {
                    // Phase 2: Same driver — notify about updated details (vehicle/route/timings change)
                    await NotifyDriverAsync(
                        dto.DriverId,
                        assignmentId,
                        "ASSIGNMENT_UPDATED",
                        "Assignment Details Updated",
                        BuildAssignmentMessage("ASSIGNMENT_UPDATED", vehicleNumber, routeName, dto.EffectiveFrom, dto.EffectiveTo));
                }
            }

            return success;
        }

        public async Task<bool> DeleteAsync(
            long assignmentId,
            long? userId)
        {
            if (assignmentId <= 0)
                return false;

            // Phase 2: Look up assignment before delete so we can notify driver
            var existing = await _repository.GetByIdAsync(assignmentId);

            var deleted = await _repository.DeleteAsync(assignmentId, userId);

            if (deleted && existing != null)
            {
                var vehicle = await _context.TransportVehicles.AsNoTracking()
                    .FirstOrDefaultAsync(v => v.VehicleId == existing.VehicleId);
                var route = await _context.TransportRoutes.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.RouteId == existing.RouteId);

                await NotifyDriverAsync(
                    existing.DriverId,
                    assignmentId,
                    "ASSIGNMENT_REMOVED",
                    "Assignment Removed",
                    BuildAssignmentMessage(
                        "ASSIGNMENT_REMOVED",
                        vehicle?.VehicleNumber,
                        route?.RouteName,
                        existing.EffectiveFrom,
                        existing.EffectiveTo));
            }

            return deleted;
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

            var driver = await _context.Staffs
                .AsNoTracking()
                .Where(x =>
                    x.Id == driverId &&
                    !x.IsDeleted &&
                    x.IsDriver &&
                    x.Status == "Active")
                .Select(x => new
                {
                    DriverId = (long)x.Id,
                    LicenceExpiry = x.DrivingLicenseExpiryDate
                })
                .FirstOrDefaultAsync();

            if (driver == null)
            {
                var legacyDriver = await _context.TransportDrivers
                    .AsNoTracking()
                    .Where(x => x.DriverId == driverId && !x.IsDeleted && x.Status)
                    .Select(x => new
                    {
                        DriverId = x.DriverId,
                        LicenceExpiry = x.LicenceExpiry
                    })
                    .FirstOrDefaultAsync();

                if (legacyDriver != null)
                {
                    driver = legacyDriver;
                }
            }

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
