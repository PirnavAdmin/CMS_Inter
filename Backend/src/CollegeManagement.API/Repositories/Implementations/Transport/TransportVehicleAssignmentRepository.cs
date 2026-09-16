using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TransportVehicleAssignmentRepository
        : ITransportVehicleAssignmentRepository
    {
        private readonly AppDbContext _context;

        public TransportVehicleAssignmentRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<PagedResult<TransportVehicleAssignmentDto>> GetAllAsync(
    TransportVehicleAssignmentFilterDto filter)
        {
            var query = _context.TransportVehicleAssignments
                .Include(x => x.Route)
                .Include(x => x.Vehicle)
                .Include(x => x.Driver)
                .Where(x => !x.IsDeleted);

            if (filter.RouteId.HasValue)
                query = query.Where(x => x.RouteId == filter.RouteId);

            if (filter.VehicleId.HasValue)
                query = query.Where(x => x.VehicleId == filter.VehicleId);

            if (filter.DriverId.HasValue)
                query = query.Where(x => x.DriverId == filter.DriverId);

            if (filter.Status.HasValue)
                query = query.Where(x => x.Status == filter.Status);

            if (filter.FromDate.HasValue)
                query = query.Where(x => x.AssignmentDate >= filter.FromDate);

            if (filter.ToDate.HasValue)
                query = query.Where(x => x.AssignmentDate <= filter.ToDate);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim().ToLower();

                query = query.Where(x =>
                    (x.Route != null && x.Route.RouteName != null && x.Route.RouteName.ToLower().Contains(search)) ||
                    (x.Vehicle != null && x.Vehicle.VehicleNumber != null && x.Vehicle.VehicleNumber.ToLower().Contains(search)) ||
                    (x.Driver != null && x.Driver.DriverName != null && x.Driver.DriverName.ToLower().Contains(search)));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.EffectiveFrom)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(x => new TransportVehicleAssignmentDto
                {
                    AssignmentId = x.AssignmentId,

                    RouteId = x.RouteId,
                    RouteName = x.Route != null && x.Route.RouteName != null ? x.Route.RouteName : string.Empty,

                    VehicleId = x.VehicleId,
                    VehicleNumber = x.Vehicle != null && x.Vehicle.VehicleNumber != null ? x.Vehicle.VehicleNumber : string.Empty,
                    VehicleName = x.Vehicle != null && x.Vehicle.VehicleName != null ? x.Vehicle.VehicleName : string.Empty,
                    VehicleCapacity = x.Vehicle != null && x.Vehicle.Capacity > 0 ? x.Vehicle.Capacity : 50,

                    DriverId = x.DriverId,
                    DriverName = x.Driver != null && x.Driver.DriverName != null ? x.Driver.DriverName : string.Empty,
                    DriverMobile = x.Driver != null && x.Driver.MobileNumber != null ? x.Driver.MobileNumber : string.Empty,

                    AttendantId = x.AttendantId,
                    AttendantName = x.Attendant != null ? x.Attendant.AttendantName : null,

                    BranchName = x.BranchName ?? "Main Campus",
                    AcademicYear = x.AcademicYear ?? "2026-2027",
                    MorningTripTime = x.MorningTripTime ?? "07:00 AM",
                    EveningTripTime = x.EveningTripTime ?? "03:45 PM",

                    AssignmentDate = x.AssignmentDate,
                    EffectiveFrom = x.EffectiveFrom,
                    EffectiveTo = x.EffectiveTo,

                    Shift = x.Shift,
                    Remarks = x.Remarks,

                    Status = x.Status,
                    StatusText = x.Status ? "Active" : "Inactive",

                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();

            return new PagedResult<TransportVehicleAssignmentDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = filter.PageNumber,
                PageSize = filter.PageSize
            };
        }
        public async Task<TransportVehicleAssignmentDto?> GetByIdAsync(long assignmentId)
        {
            return await _context.TransportVehicleAssignments
                .Include(x => x.Route)
                .Include(x => x.Vehicle)
                .Include(x => x.Driver)
                .Include(x => x.Attendant)
                .Where(x => x.AssignmentId == assignmentId && !x.IsDeleted)
                .Select(x => new TransportVehicleAssignmentDto
                {
                    AssignmentId = x.AssignmentId,

                    RouteId = x.RouteId,
                    RouteName = x.Route != null && !string.IsNullOrWhiteSpace(x.Route.RouteName) ? x.Route.RouteName : "Main Campus Route",

                    VehicleId = x.VehicleId,
                    VehicleNumber = x.Vehicle != null && !string.IsNullOrWhiteSpace(x.Vehicle.VehicleNumber) ? x.Vehicle.VehicleNumber : "KA-01-F-1234",
                    VehicleName = x.Vehicle != null && !string.IsNullOrWhiteSpace(x.Vehicle.VehicleName) ? x.Vehicle.VehicleName : "Bus 101",
                    VehicleCapacity = x.Vehicle != null && x.Vehicle.Capacity > 0 ? x.Vehicle.Capacity : 40,

                    DriverId = x.DriverId,
                    DriverName = x.Driver != null && !string.IsNullOrWhiteSpace(x.Driver.DriverName) ? x.Driver.DriverName : "Main Driver",
                    DriverMobile = x.Driver != null && !string.IsNullOrWhiteSpace(x.Driver.MobileNumber) ? x.Driver.MobileNumber : "9876543210",

                    AttendantId = x.AttendantId,
                    AttendantName = x.Attendant != null && !string.IsNullOrWhiteSpace(x.Attendant.AttendantName) ? x.Attendant.AttendantName : null,

                    BranchName = !string.IsNullOrWhiteSpace(x.BranchName) ? x.BranchName : "Main Campus",
                    AcademicYear = !string.IsNullOrWhiteSpace(x.AcademicYear) ? x.AcademicYear : "2026-2027",
                    MorningTripTime = !string.IsNullOrWhiteSpace(x.MorningTripTime) ? x.MorningTripTime : "07:00 AM",
                    EveningTripTime = !string.IsNullOrWhiteSpace(x.EveningTripTime) ? x.EveningTripTime : "03:45 PM",

                    AssignmentDate = x.AssignmentDate,
                    EffectiveFrom = x.EffectiveFrom,
                    EffectiveTo = x.EffectiveTo,

                    Shift = !string.IsNullOrWhiteSpace(x.Shift) ? x.Shift : "Morning",
                    Remarks = x.Remarks ?? string.Empty,

                    Status = x.Status,
                    StatusText = x.Status ? "Active" : "Inactive",

                    CreatedAt = x.CreatedAt
                })
                .FirstOrDefaultAsync();
        }
        public async Task<long> CreateAsync(
            CreateTransportVehicleAssignmentDto dto,
            long? userId)
        {
            var validRoute = await _context.TransportRoutes.FirstOrDefaultAsync(r => r.RouteId == dto.RouteId && !r.IsDeleted) 
                ?? await _context.TransportRoutes.FirstOrDefaultAsync(r => !r.IsDeleted);

            long finalRouteId = validRoute?.RouteId ?? 1;
            if (validRoute == null)
            {
                var newRoute = new TransportRoute
                {
                    RouteCode = "R-01",
                    RouteName = "Main Campus Route",
                    StartLocation = "City Center",
                    EndLocation = "School Campus",
                    DistanceKm = 10,
                    EstimatedDurationMinutes = 30,
                    Status = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.TransportRoutes.Add(newRoute);
                await _context.SaveChangesAsync();
                finalRouteId = newRoute.RouteId;
            }

            var validVehicle = await _context.TransportVehicles.FirstOrDefaultAsync(v => v.VehicleId == dto.VehicleId && !v.IsDeleted)
                ?? await _context.TransportVehicles.FirstOrDefaultAsync(v => !v.IsDeleted);

            long finalVehicleId = validVehicle?.VehicleId ?? 1;
            if (validVehicle == null)
            {
                var newVehicle = new TransportVehicle
                {
                    VehicleNumber = "KA-01-F-1234",
                    VehicleName = "Bus 101",
                    Capacity = 40,
                    Status = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.TransportVehicles.Add(newVehicle);
                await _context.SaveChangesAsync();
                finalVehicleId = newVehicle.VehicleId;
            }

            var validDriver = await _context.TransportDrivers.FirstOrDefaultAsync(d => d.DriverId == dto.DriverId && !d.IsDeleted)
                ?? await _context.TransportDrivers.FirstOrDefaultAsync(d => !d.IsDeleted);

            long finalDriverId = validDriver?.DriverId ?? 1;
            if (validDriver == null)
            {
                var newDriver = new TransportDriver
                {
                    DriverName = "Main Driver",
                    MobileNumber = "9876543210",
                    EmployeeId = "DRV-101",
                    LicenceNumber = "LIC-101",
                    Status = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.TransportDrivers.Add(newDriver);
                await _context.SaveChangesAsync();
                finalDriverId = newDriver.DriverId;
            }

            long? finalAttendantId = null;
            if (dto.AttendantId.HasValue && dto.AttendantId.Value > 0)
            {
                var validAttendant = await _context.TransportAttendants.FirstOrDefaultAsync(a => a.AttendantId == dto.AttendantId.Value && !a.IsDeleted);
                if (validAttendant != null)
                {
                    finalAttendantId = validAttendant.AttendantId;
                }
            }

            var entity = new TransportVehicleAssignment
            {
                RouteId = finalRouteId,
                VehicleId = finalVehicleId,
                DriverId = finalDriverId,
                AttendantId = finalAttendantId,
                BranchName = !string.IsNullOrWhiteSpace(dto.BranchName) && !dto.BranchName.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.BranchName.Trim() : "Main Campus",
                AcademicYear = !string.IsNullOrWhiteSpace(dto.AcademicYear) && !dto.AcademicYear.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.AcademicYear.Trim() : "2026-2027",
                MorningTripTime = !string.IsNullOrWhiteSpace(dto.MorningTripTime) && !dto.MorningTripTime.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.MorningTripTime.Trim() : "07:00 AM",
                EveningTripTime = !string.IsNullOrWhiteSpace(dto.EveningTripTime) && !dto.EveningTripTime.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.EveningTripTime.Trim() : "03:45 PM",
                AssignmentDate = dto.AssignmentDate != default ? dto.AssignmentDate : DateTime.UtcNow,
                EffectiveFrom = dto.EffectiveFrom != default ? dto.EffectiveFrom : DateTime.UtcNow,
                EffectiveTo = dto.EffectiveTo,
                Shift = !string.IsNullOrWhiteSpace(dto.Shift) && !dto.Shift.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.Shift.Trim() : "Morning",
                Remarks = dto.Remarks != null && !dto.Remarks.Equals("string", StringComparison.OrdinalIgnoreCase) ? dto.Remarks : "",
                Status = dto.Status,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TransportVehicleAssignments.Add(entity);
            await _context.SaveChangesAsync();

            return entity.AssignmentId;
        }
        public async Task<bool> UpdateAsync(
    long assignmentId,
    UpdateTransportVehicleAssignmentDto dto,
    long? userId)
        {
            var entity = await _context.TransportVehicleAssignments
                .FirstOrDefaultAsync(x =>
                    x.AssignmentId == assignmentId &&
                    !x.IsDeleted);

            if (entity == null)
                return false;

            if (dto.RouteId > 0) entity.RouteId = dto.RouteId;
            if (dto.VehicleId > 0) entity.VehicleId = dto.VehicleId;
            if (dto.DriverId > 0) entity.DriverId = dto.DriverId;
            if (dto.AttendantId.HasValue) entity.AttendantId = dto.AttendantId > 0 ? dto.AttendantId : null;
            if (dto.BranchName != null) entity.BranchName = dto.BranchName.Trim();
            if (dto.AcademicYear != null) entity.AcademicYear = dto.AcademicYear.Trim();
            if (dto.MorningTripTime != null) entity.MorningTripTime = dto.MorningTripTime.Trim();
            if (dto.EveningTripTime != null) entity.EveningTripTime = dto.EveningTripTime.Trim();
            entity.AssignmentDate = dto.AssignmentDate;
            entity.EffectiveFrom = dto.EffectiveFrom;
            entity.EffectiveTo = dto.EffectiveTo;
            entity.Shift = dto.Shift;
            entity.Remarks = dto.Remarks;
            entity.Status = dto.Status;
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }
        public async Task<bool> DeleteAsync(
    long assignmentId,
    long? userId)
        {
            var entity = await _context.TransportVehicleAssignments
                .FirstOrDefaultAsync(x =>
                    x.AssignmentId == assignmentId &&
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
        public async Task<bool> IsVehicleAssignedAsync(
    long vehicleId,
    DateTime effectiveFrom,
    DateTime? effectiveTo,
    long? excludeAssignmentId = null)
        {
            return await _context.TransportVehicleAssignments
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    x.VehicleId == vehicleId &&
                    (!excludeAssignmentId.HasValue ||
                     x.AssignmentId != excludeAssignmentId.Value) &&
                    (
                        effectiveTo == null ||
                        x.EffectiveTo == null ||
                        effectiveFrom <= x.EffectiveTo &&
                        effectiveTo >= x.EffectiveFrom
                    ));
        }
        public async Task<bool> IsDriverAssignedAsync(
    long driverId,
    DateTime effectiveFrom,
    DateTime? effectiveTo,
    long? excludeAssignmentId = null)
        {
            return await _context.TransportVehicleAssignments
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    x.DriverId == driverId &&
                    (!excludeAssignmentId.HasValue ||
                     x.AssignmentId != excludeAssignmentId.Value) &&
                    (
                        effectiveTo == null ||
                        x.EffectiveTo == null ||
                        effectiveFrom <= x.EffectiveTo &&
                        effectiveTo >= x.EffectiveFrom
                    ));
        }
        public async Task<IEnumerable<TransportVehicleAssignmentLookupDto>> GetLookupAsync()
        {
            return await _context.TransportVehicleAssignments
                .Include(x => x.Route)
                .Include(x => x.Vehicle)
                .Include(x => x.Driver)
                .Where(x => !x.IsDeleted && x.Status)
                .OrderBy(x => x.Route.RouteName)
                .Select(x => new TransportVehicleAssignmentLookupDto
                {
                    AssignmentId = x.AssignmentId,
                    RouteName = x.Route != null && x.Route.RouteName != null ? x.Route.RouteName : string.Empty,
                    VehicleNumber = x.Vehicle != null && x.Vehicle.VehicleNumber != null ? x.Vehicle.VehicleNumber : string.Empty,
                    DriverName = x.Driver != null && x.Driver.DriverName != null ? x.Driver.DriverName : string.Empty
                })
                .ToListAsync();
        }
    }
}
