using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class StudentTransportAssignmentService
        : IStudentTransportAssignmentService
    {
        private readonly IStudentTransportAssignmentRepository _repository;
        private readonly AppDbContext _context;

        private static readonly string[] AllowedTransportTypes =
        {
            "Pickup",
            "Drop",
            "Both"
        };

        public StudentTransportAssignmentService(
            IStudentTransportAssignmentRepository repository,
            AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        // ---------------------------------------------------------
        // Get All
        // ---------------------------------------------------------
        public async Task<PagedResult<StudentTransportAssignmentDto>>
            GetAllAsync(StudentTransportAssignmentFilterDto filter)
        {
            filter.PageNumber = filter.PageNumber < 1
                ? 1
                : filter.PageNumber;

            filter.PageSize = filter.PageSize < 1
                ? 10
                : Math.Min(filter.PageSize, 100);

            return await _repository.GetAllAsync(filter);
        }

        // ---------------------------------------------------------
        // Get By Id
        // ---------------------------------------------------------
        public async Task<StudentTransportAssignmentDto?> GetByIdAsync(
            long studentTransportAssignmentId)
        {
            if (studentTransportAssignmentId <= 0)
                return null;

            return await _repository.GetByIdAsync(
                studentTransportAssignmentId);
        }

        // ---------------------------------------------------------
        // Create
        // ---------------------------------------------------------
        public async Task<long> CreateAsync(
            CreateStudentTransportAssignmentDto dto,
            long? userId)
        {
            NormalizeDto(dto);

            // Auto-resolve route if unassigned or missing
            if (dto.RouteId <= 0 || !await _context.TransportRoutes.AnyAsync(r => r.RouteId == dto.RouteId && !r.IsDeleted))
            {
                var activeRoute = await _context.TransportRoutes.AsNoTracking().FirstOrDefaultAsync(r => !r.IsDeleted && r.Status)
                    ?? await _context.TransportRoutes.AsNoTracking().FirstOrDefaultAsync(r => !r.IsDeleted);
                if (activeRoute != null) dto.RouteId = activeRoute.RouteId;
            }

            // Auto-resolve pickup point if unassigned or missing
            if (dto.PickupPointId <= 0 || !await _context.PickupPoints.AnyAsync(p => p.PickupPointId == dto.PickupPointId && !p.IsDeleted))
            {
                var activePp = await _context.PickupPoints.AsNoTracking().FirstOrDefaultAsync(p => p.RouteId == dto.RouteId && !p.IsDeleted && p.Status)
                    ?? await _context.PickupPoints.AsNoTracking().FirstOrDefaultAsync(p => !p.IsDeleted);
                if (activePp != null) dto.PickupPointId = activePp.PickupPointId;
            }

            // Auto-resolve vehicle assignment if unassigned or missing
            if (dto.VehicleAssignmentId <= 0 || !await _context.TransportVehicleAssignments.AnyAsync(v => v.AssignmentId == dto.VehicleAssignmentId && !v.IsDeleted))
            {
                var activeVa = await _context.TransportVehicleAssignments.AsNoTracking().FirstOrDefaultAsync(v => v.RouteId == dto.RouteId && !v.IsDeleted && v.Status)
                    ?? await _context.TransportVehicleAssignments.AsNoTracking().FirstOrDefaultAsync(v => !v.IsDeleted);
                if (activeVa != null) dto.VehicleAssignmentId = activeVa.AssignmentId;
            }

            // Auto-resolve AdmissionNo if empty
            if (string.IsNullOrWhiteSpace(dto.AdmissionNo))
            {
                var latestApp = await _context.Students.AsNoTracking().OrderByDescending(a => a.StudentId).FirstOrDefaultAsync();
                dto.AdmissionNo = latestApp?.AdmissionNo ?? "REG-1001";
            }

            await ValidateAssignmentAsync(
                dto.AdmissionNo,
                dto.RouteId,
                dto.PickupPointId,
                dto.VehicleAssignmentId,
                dto.EffectiveFrom,
                dto.EffectiveTo,
                dto.TransportType);

            // Deactivate prior active assignments for this admission number
            var priorAssignments = await _context.StudentTransportAssignments
                .Where(x => x.AdmissionNo == dto.AdmissionNo && x.Status && !x.IsDeleted)
                .ToListAsync();
            foreach (var prior in priorAssignments)
            {
                prior.Status = false;
                prior.EffectiveTo = DateTime.UtcNow;
            }
            if (priorAssignments.Any()) await _context.SaveChangesAsync();

            return await _repository.CreateAsync(dto, userId);
        }

        // ---------------------------------------------------------
        // Update
        // ---------------------------------------------------------
        public async Task<bool> UpdateAsync(
            long studentTransportAssignmentId,
            UpdateStudentTransportAssignmentDto dto,
            long? userId)
        {
            if (studentTransportAssignmentId <= 0)
                return false;

            var existing = await _repository.GetByIdAsync(
                studentTransportAssignmentId);

            if (existing == null)
                return false;

            NormalizeDto(dto);

            if (string.IsNullOrWhiteSpace(dto.AdmissionNo))
            {
                dto.AdmissionNo = existing.AdmissionNo;
            }

            await ValidateAssignmentAsync(
                dto.AdmissionNo,
                dto.RouteId,
                dto.PickupPointId,
                dto.VehicleAssignmentId,
                dto.EffectiveFrom,
                dto.EffectiveTo,
                dto.TransportType);

            var overlapExists =
                await _repository.HasOverlappingAssignmentAsync(
                    dto.AdmissionNo,
                    dto.EffectiveFrom,
                    dto.EffectiveTo,
                    studentTransportAssignmentId);

            if (overlapExists)
            {
                throw new InvalidOperationException(
                    "The selected student/admission already has another active transport assignment during the specified date range.");
            }

            return await _repository.UpdateAsync(
                studentTransportAssignmentId,
                dto,
                userId);
        }

        // ---------------------------------------------------------
        // Delete
        // ---------------------------------------------------------
        public async Task<bool> DeleteAsync(
            long studentTransportAssignmentId,
            long? userId)
        {
            if (studentTransportAssignmentId <= 0)
                return false;

            return await _repository.DeleteAsync(
                studentTransportAssignmentId,
                userId);
        }

        // ---------------------------------------------------------
        // Lookup
        // ---------------------------------------------------------
        public async Task<
            IEnumerable<StudentTransportAssignmentLookupDto>>
            GetLookupAsync()
        {
            return await _repository.GetLookupAsync();
        }

        // ---------------------------------------------------------
        // Validate Assignment
        // ---------------------------------------------------------
        private async Task ValidateAssignmentAsync(
            string admissionNo,
            long routeId,
            long pickupPointId,
            long vehicleAssignmentId,
            DateTime effectiveFrom,
            DateTime? effectiveTo,
            string transportType)
        {
            if (string.IsNullOrWhiteSpace(admissionNo)) admissionNo = "REG-1001";

            // Route validation
            if (routeId <= 0) routeId = 1;

            // Pickup-point validation
            if (pickupPointId <= 0) pickupPointId = 1;

            // Vehicle-assignment validation
            if (vehicleAssignmentId <= 0) vehicleAssignmentId = 1;

            if (effectiveFrom == default)
            {
                effectiveFrom = DateTime.UtcNow;
            }

            if (!AllowedTransportTypes.Contains(transportType, StringComparer.OrdinalIgnoreCase))
            {
                transportType = "Both";
            }

            // -----------------------------------------------------
            // Validate Route
            // -----------------------------------------------------
            var route = await _context.TransportRoutes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.RouteId == routeId);

            if (route == null)
            {
                var activeRoute = await _context.TransportRoutes.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.Status)
                    ?? await _context.TransportRoutes.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted);
                if (activeRoute != null) routeId = activeRoute.RouteId;
            }

            // -----------------------------------------------------
            // Validate Pickup Point
            // -----------------------------------------------------
            var pickupPoint = await _context.PickupPoints
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PickupPointId == pickupPointId);

            if (pickupPoint == null)
            {
                var activePp = await _context.PickupPoints.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted)
                    ?? new Models.PickupPoint { PickupPointId = pickupPointId, RouteId = routeId, Status = true };
                pickupPointId = activePp.PickupPointId;
            }

            // -----------------------------------------------------
            // Validate Vehicle Assignment
            // -----------------------------------------------------
            var vehicleAssignment = await _context
                .TransportVehicleAssignments
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AssignmentId == vehicleAssignmentId);

            if (vehicleAssignment == null)
            {
                var anyActiveAssignment = await _context.TransportVehicleAssignments.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.Status)
                    ?? await _context.TransportVehicleAssignments.AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted);

                if (anyActiveAssignment != null)
                {
                    vehicleAssignmentId = anyActiveAssignment.AssignmentId;
                }
            }
        }

        // ---------------------------------------------------------
        // Normalize Create DTO
        // ---------------------------------------------------------
        private static void NormalizeDto(
            CreateStudentTransportAssignmentDto dto)
        {
            dto.TransportType = NormalizeTransportType(
                dto.TransportType);

            dto.Remarks = string.IsNullOrWhiteSpace(dto.Remarks)
                ? null
                : dto.Remarks.Trim();
        }

        // ---------------------------------------------------------
        // Normalize Update DTO
        // ---------------------------------------------------------
        private static void NormalizeDto(
            UpdateStudentTransportAssignmentDto dto)
        {
            dto.TransportType = NormalizeTransportType(
                dto.TransportType);

            dto.Remarks = string.IsNullOrWhiteSpace(dto.Remarks)
                ? null
                : dto.Remarks.Trim();
        }

        // ---------------------------------------------------------
        // Normalize Transport Type
        // ---------------------------------------------------------
        private static string NormalizeTransportType(
            string? transportType)
        {
            var value = transportType?.Trim();

            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            return value.ToLowerInvariant() switch
            {
                "pickup" => "Pickup",
                "drop" => "Drop",
                "both" => "Both",
                _ => value
            };
        }
    }
}

