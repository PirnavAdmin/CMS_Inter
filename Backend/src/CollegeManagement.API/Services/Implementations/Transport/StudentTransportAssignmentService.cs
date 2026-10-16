using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;

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

            if (string.IsNullOrWhiteSpace(dto.AdmissionNo))
            {
                throw new ArgumentException("Admission number is required and must correspond to an active registered student.");
            }

            var student = await _context.Students.AsNoTracking()
                .FirstOrDefaultAsync(s => s.AdmissionNo == dto.AdmissionNo.Trim() && s.IsActive);

            if (student == null)
            {
                throw new InvalidOperationException($"Student with admission number '{dto.AdmissionNo}' was not found or is not active in the CMS.");
            }

            dto.AdmissionNo = student.AdmissionNo;

            // Validate Route
            if (dto.RouteId <= 0 || !await _context.TransportRoutes.AnyAsync(r => r.RouteId == dto.RouteId && !r.IsDeleted))
            {
                throw new InvalidOperationException($"Invalid or non-existent Route ID {dto.RouteId}.");
            }

            // Resolve PickupPointId if missing or 0
            if (dto.PickupPointId <= 0)
            {
                if (!string.IsNullOrWhiteSpace(dto.PickupPointName))
                {
                    var nameLower = dto.PickupPointName.Trim().ToLower();
                    var point = await _context.PickupPoints
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.RouteId == dto.RouteId &&
                            p.PickupPointName != null && p.PickupPointName.ToLower() == nameLower &&
                            !p.IsDeleted);

                    if (point != null)
                    {
                        dto.PickupPointId = point.PickupPointId;
                    }
                    else
                    {
                        throw new InvalidOperationException($"Pickup point '{dto.PickupPointName}' was not found on Route ID {dto.RouteId}.");
                    }
                }
                else
                {
                    throw new InvalidOperationException("Pickup point ID or a valid pickup point name is required.");
                }
            }

            // Validate Pickup Point
            if (dto.PickupPointId <= 0 || !await _context.PickupPoints.AnyAsync(p => p.PickupPointId == dto.PickupPointId && !p.IsDeleted))
            {
                throw new InvalidOperationException($"Invalid or non-existent Pickup Point ID {dto.PickupPointId}.");
            }

            // Resolve VehicleAssignmentId if missing or 0
            if (dto.VehicleAssignmentId <= 0 && dto.VehicleId > 0)
            {
                var va = await _context.TransportVehicleAssignments
                    .AsNoTracking()
                    .OrderByDescending(v => v.Status)
                    .FirstOrDefaultAsync(v => v.RouteId == dto.RouteId && v.VehicleId == dto.VehicleId && !v.IsDeleted);

                if (va != null)
                {
                    dto.VehicleAssignmentId = va.AssignmentId;
                }
                else
                {
                    throw new InvalidOperationException($"No active vehicle assignment found for Vehicle ID {dto.VehicleId} on Route ID {dto.RouteId}.");
                }
            }

            // Validate Vehicle Assignment
            if (dto.VehicleAssignmentId <= 0 || !await _context.TransportVehicleAssignments.AnyAsync(v => v.AssignmentId == dto.VehicleAssignmentId && !v.IsDeleted))
            {
                throw new InvalidOperationException($"Invalid or non-existent Vehicle Assignment ID {dto.VehicleAssignmentId}.");
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

            var assignmentId = await _repository.CreateAsync(dto, userId);

            // Synchronize Student Master Record: Set Day Scholar + Transport Required, clear any residual hostel data
            var studentToSync = await _context.Students.FirstOrDefaultAsync(s => s.AdmissionNo == dto.AdmissionNo);
            if (studentToSync != null)
            {
                studentToSync.StudentType = "Day Scholar";
                studentToSync.TransportRequired = true;
                studentToSync.RouteId = (int)dto.RouteId;
                studentToSync.PickupPointId = (int)dto.PickupPointId;
                studentToSync.BusType = "Bus";

                studentToSync.HostelId = null;
                studentToSync.HostelBlock = null;
                studentToSync.RoomId = null;
                studentToSync.HostelRoom = null;
                studentToSync.BedId = null;
                studentToSync.HostelBed = null;
                studentToSync.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
            }

            return assignmentId;
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

            // 1. Preserve RouteId and AdmissionNo
            if (dto.RouteId <= 0)
            {
                dto.RouteId = existing.RouteId;
            }

            if (string.IsNullOrWhiteSpace(dto.AdmissionNo))
            {
                dto.AdmissionNo = existing.AdmissionNo;
            }

            if (string.IsNullOrWhiteSpace(dto.TransportType) || dto.TransportType.Equals("Both", StringComparison.OrdinalIgnoreCase))
            {
                dto.TransportType = !string.IsNullOrWhiteSpace(existing.TransportType) ? existing.TransportType : "TwoWay";
            }

            if (dto.EffectiveFrom == default)
            {
                dto.EffectiveFrom = existing.EffectiveFrom;
            }

            // 2. Resolve PickupPointId safely
            if (dto.PickupPointId <= 0)
            {
                if (!string.IsNullOrWhiteSpace(dto.PickupPointName))
                {
                    var nameLower = dto.PickupPointName.Trim().ToLower();
                    var point = await _context.PickupPoints
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.RouteId == dto.RouteId &&
                            p.PickupPointName != null && p.PickupPointName.ToLower() == nameLower &&
                            !p.IsDeleted);

                    if (point != null)
                    {
                        dto.PickupPointId = point.PickupPointId;
                    }
                    else
                    {
                        throw new InvalidOperationException($"Pickup point '{dto.PickupPointName}' was not found on Route ID {dto.RouteId}.");
                    }
                }
                else if (existing.PickupPointId > 0)
                {
                    dto.PickupPointId = existing.PickupPointId;
                }
                else
                {
                    throw new InvalidOperationException("Pickup point ID or a valid pickup point name is required.");
                }
            }

            // 3. Resolve VehicleAssignmentId safely
            if (dto.VehicleAssignmentId <= 0)
            {
                if (dto.VehicleId > 0)
                {
                    var va = await _context.TransportVehicleAssignments
                        .AsNoTracking()
                        .OrderByDescending(v => v.Status)
                        .FirstOrDefaultAsync(v => v.RouteId == dto.RouteId && v.VehicleId == dto.VehicleId && !v.IsDeleted);

                    if (va != null)
                    {
                        dto.VehicleAssignmentId = va.AssignmentId;
                    }
                    else
                    {
                        throw new InvalidOperationException($"No active vehicle assignment found for Vehicle ID {dto.VehicleId} on Route ID {dto.RouteId}.");
                    }
                }
                else if (existing.VehicleAssignmentId > 0)
                {
                    dto.VehicleAssignmentId = existing.VehicleAssignmentId;
                }
                else
                {
                    throw new InvalidOperationException("Vehicle assignment ID or a valid vehicle ID is required.");
                }
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

            var updated = await _repository.UpdateAsync(
                studentTransportAssignmentId,
                dto,
                userId);

            if (updated && !string.IsNullOrWhiteSpace(dto.AdmissionNo))
            {
                var remainingActive = await _context.StudentTransportAssignments
                    .AnyAsync(x => x.AdmissionNo == dto.AdmissionNo && x.StudentTransportAssignmentId != studentTransportAssignmentId && x.Status && !x.IsDeleted);

                var studentToSync = await _context.Students.FirstOrDefaultAsync(s => s.AdmissionNo == dto.AdmissionNo);
                if (studentToSync != null)
                {
                    if (dto.Status)
                    {
                        studentToSync.StudentType = "Day Scholar";
                        studentToSync.TransportRequired = true;
                        studentToSync.RouteId = (int)dto.RouteId;
                        studentToSync.PickupPointId = (int)dto.PickupPointId;
                        studentToSync.BusType = "Bus";

                        studentToSync.HostelId = null;
                        studentToSync.HostelBlock = null;
                        studentToSync.RoomId = null;
                        studentToSync.HostelRoom = null;
                        studentToSync.BedId = null;
                        studentToSync.HostelBed = null;
                    }
                    else if (!remainingActive)
                    {
                        studentToSync.TransportRequired = false;
                        studentToSync.RouteId = null;
                        studentToSync.BusRoute = null;
                        studentToSync.PickupPointId = null;
                        studentToSync.PickupPoint = null;
                        studentToSync.BusType = null;
                    }
                    studentToSync.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            return updated;
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

            var existing = await _repository.GetByIdAsync(studentTransportAssignmentId);
            var result = await _repository.DeleteAsync(
                studentTransportAssignmentId,
                userId);

            if (result && existing != null && !string.IsNullOrWhiteSpace(existing.AdmissionNo))
            {
                var remainingActive = await _context.StudentTransportAssignments
                    .AnyAsync(x => x.AdmissionNo == existing.AdmissionNo && x.StudentTransportAssignmentId != studentTransportAssignmentId && x.Status && !x.IsDeleted);

                if (!remainingActive)
                {
                    var studentToSync = await _context.Students.FirstOrDefaultAsync(s => s.AdmissionNo == existing.AdmissionNo);
                    if (studentToSync != null)
                    {
                        studentToSync.TransportRequired = false;
                        studentToSync.RouteId = null;
                        studentToSync.BusRoute = null;
                        studentToSync.PickupPointId = null;
                        studentToSync.PickupPoint = null;
                        studentToSync.BusType = null;
                        studentToSync.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }
            }

            return result;
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
            if (string.IsNullOrWhiteSpace(admissionNo))
            {
                throw new ArgumentException("Admission number is required.");
            }

            var student = await _context.Students.AsNoTracking()
                .FirstOrDefaultAsync(s => s.AdmissionNo == admissionNo.Trim() && s.IsActive);

            if (student == null)
            {
                throw new InvalidOperationException($"Student with admission number '{admissionNo}' is not registered or active in the CMS.");
            }

            // -----------------------------------------------------
            // Mutual Exclusion: Student must not reside in Hostel
            // -----------------------------------------------------
            var activeHostel = await _context.Database.GetDbConnection().QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT hsa.AllocationId, hb.HostelName, hr.RoomNumber
                FROM hostel_student_allocations hsa
                INNER JOIN Students s ON hsa.StudentId = s.StudentId
                LEFT JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId
                LEFT JOIN hostel_rooms hr ON hsa.RoomId = hr.RoomId
                WHERE (s.AdmissionNo = @admNo OR hsa.StudentId = @sId)
                  AND hsa.Status = 'Active'
                LIMIT 1", new { admNo = student.AdmissionNo.Trim(), sId = student.StudentId });

            if (activeHostel != null)
            {
                string hostelName = activeHostel.HostelName ?? "the college hostel";
                string roomNo = activeHostel.RoomNumber != null ? $", Room {activeHostel.RoomNumber}" : "";
                throw new InvalidOperationException(
                    $"Student '{student.AdmissionNo}' is currently allocated to Hostel ({hostelName}{roomNo}). " +
                    "Students residing in the hostel cannot be assigned to college bus transport. " +
                    "Please vacate the hostel bed first before assigning bus transport.");
            }

            if (string.Equals(student.StudentType, "Hosteller", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(student.StudentType, "Residential", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(student.StudentType, "Hostel", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Student '{student.AdmissionNo}' is registered as a Hosteller. " +
                    "Hostel residents cannot be assigned to college bus transport. " +
                    "Please update student category to Day Scholar before assigning bus transport.");
            }

            // -----------------------------------------------------
            // Validate Route
            // -----------------------------------------------------
            var route = await _context.TransportRoutes
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.RouteId == routeId && !x.IsDeleted);

            if (route == null)
            {
                throw new InvalidOperationException($"Route ID {routeId} does not exist or has been deleted.");
            }

            // -----------------------------------------------------
            // Validate Pickup Point
            // -----------------------------------------------------
            var pickupPoint = await _context.PickupPoints
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PickupPointId == pickupPointId && !x.IsDeleted);

            if (pickupPoint == null)
            {
                throw new InvalidOperationException($"Pickup point ID {pickupPointId} does not exist or has been deleted.");
            }

            // -----------------------------------------------------
            // Validate Vehicle Assignment
            // -----------------------------------------------------
            var vehicleAssignment = await _context
                .TransportVehicleAssignments
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AssignmentId == vehicleAssignmentId && !x.IsDeleted);

            if (vehicleAssignment == null)
            {
                throw new InvalidOperationException($"Vehicle assignment ID {vehicleAssignmentId} does not exist or has been deleted.");
            }

            if (effectiveFrom == default)
            {
                effectiveFrom = DateTime.UtcNow;
            }

            if (!AllowedTransportTypes.Contains(transportType, StringComparer.OrdinalIgnoreCase))
            {
                transportType = "Both";
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

