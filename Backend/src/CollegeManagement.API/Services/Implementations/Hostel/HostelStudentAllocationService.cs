using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelStudentAllocationService
        : IHostelStudentAllocationService
    {
        private readonly IHostelStudentAllocationRepository
            _allocationRepository;

        private readonly IHostelWardenAssignmentRepository
            _wardenRepository;

        public HostelStudentAllocationService(
            IHostelStudentAllocationRepository allocationRepository,
            IHostelWardenAssignmentRepository wardenRepository)
        {
            _allocationRepository = allocationRepository;
            _wardenRepository = wardenRepository;
        }

        public async Task<IEnumerable<HostelStudentAllocationResponseDto>>
            GetAllAsync(
                int? hostelId = null,
                int? roomId = null,
                int? studentId = null,
                string? status = null,
                string? search = null)
        {
            var records =
                await _allocationRepository.GetAllAsync(
                    hostelId,
                    roomId,
                    studentId,
                    status,
                    search);

            return records.Select(MapToResponseDto);
        }

        public async Task<HostelStudentAllocationResponseDto?>
            GetByIdAsync(int allocationId)
        {
            var record =
                await _allocationRepository.GetByIdAsync(allocationId);

            return record == null
                ? null
                : MapToResponseDto(record);
        }

        public async Task<(
            bool Success,
            string Message,
            HostelStudentAllocationResponseDto? Data)>
            CreateAsync(CreateHostelStudentAllocationDto dto)
        {
            // Student validation
            if (!await _allocationRepository
                    .StudentExistsAsync(dto.StudentId))
            {
                return (
                    false,
                    "Student not found.",
                    null);
            }

            // Hostel validation
            if (!await _allocationRepository
                    .HostelExistsAsync(dto.HostelId))
            {
                return (
                    false,
                    "Hostel not found.",
                    null);
            }

            // Room validation
            if (!await _allocationRepository
                    .RoomExistsAsync(dto.RoomId))
            {
                return (
                    false,
                    "Room not found.",
                    null);
            }

            // Room must belong to selected hostel
            if (!await _allocationRepository
                    .RoomBelongsToHostelAsync(
                        dto.RoomId,
                        dto.HostelId))
            {
                return (
                    false,
                    "Selected room does not belong to the selected hostel.",
                    null);
            }

            // Bed validation
            if (!await _allocationRepository
                    .BedExistsAsync(dto.BedId))
            {
                return (
                    false,
                    "Bed not found.",
                    null);
            }

            // Bed must belong to selected room
            if (!await _allocationRepository
                    .BedBelongsToRoomAsync(
                        dto.BedId,
                        dto.RoomId))
            {
                return (
                    false,
                    "Selected bed does not belong to the selected room.",
                    null);
            }

            // Joining date validation
            if (dto.JoiningDate == default)
            {
                return (
                    false,
                    "Joining date is required.",
                    null);
            }

            var status =
                string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim();

            // Student cannot have two active hostel allocations
            if (status.Equals(
                    "Active",
                    StringComparison.OrdinalIgnoreCase))
            {
                var existingStudentAllocation =
                    await _allocationRepository
                        .GetActiveByStudentAsync(dto.StudentId);

                if (existingStudentAllocation != null)
                {
                    return (
                        false,
                        "This student already has an active hostel allocation.",
                        null);
                }

                // Bed cannot be allocated to two students
                var existingBedAllocation =
                    await _allocationRepository
                        .GetActiveByBedAsync(dto.BedId);

                if (existingBedAllocation != null)
                {
                    return (
                        false,
                        "Selected bed is already occupied.",
                        null);
                }
            }

            int? wardenAssignmentId =
                dto.WardenAssignmentId;

            // If warden was manually selected
            if (wardenAssignmentId.HasValue)
            {
                var selectedWarden =
                    await _wardenRepository.GetByIdAsync(
                        wardenAssignmentId.Value);

                if (selectedWarden == null)
                {
                    return (
                        false,
                        "Warden assignment not found.",
                        null);
                }

                if (!selectedWarden.Status.Equals(
                        "Active",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return (
                        false,
                        "Selected warden assignment is not active.",
                        null);
                }

                if (selectedWarden.HostelId != dto.HostelId)
                {
                    return (
                        false,
                        "Selected warden is not assigned to this hostel.",
                        null);
                }
            }
            else
            {
                // Automatically pick active warden of hostel
                var activeWarden =
                    await _wardenRepository
                        .GetActiveByHostelAsync(dto.HostelId);

                if (activeWarden != null)
                {
                    wardenAssignmentId =
                        activeWarden.WardenAssignmentId;
                }
            }

            var allocation =
                new HostelStudentAllocation
                {
                    StudentId = dto.StudentId,
                    HostelId = dto.HostelId,
                    RoomId = dto.RoomId,
                    BedId = dto.BedId,
                    WardenAssignmentId =
                        wardenAssignmentId,
                    JoiningDate = dto.JoiningDate.Date,
                    Status = status,
                    Remarks = dto.Remarks?.Trim()
                };

            var allocationId =
                await _allocationRepository.CreateAsync(
                    allocation);

            var created =
                await _allocationRepository.GetByIdAsync(
                    allocationId);

            return (
                true,
                "Student hostel allocation created successfully.",
                created == null
                    ? null
                    : MapToResponseDto(created));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelStudentAllocationResponseDto? Data)>
            UpdateAsync(
                int allocationId,
                UpdateHostelStudentAllocationDto dto)
        {
            var existing =
                await _allocationRepository.GetByIdAsync(
                    allocationId);

            if (existing == null)
            {
                return (
                    false,
                    "Student hostel allocation not found.",
                    null);
            }

            if (!await _allocationRepository
                    .StudentExistsAsync(dto.StudentId))
            {
                return (
                    false,
                    "Student not found.",
                    null);
            }

            if (!await _allocationRepository
                    .HostelExistsAsync(dto.HostelId))
            {
                return (
                    false,
                    "Hostel not found.",
                    null);
            }

            if (!await _allocationRepository
                    .RoomExistsAsync(dto.RoomId))
            {
                return (
                    false,
                    "Room not found.",
                    null);
            }

            if (!await _allocationRepository
                    .RoomBelongsToHostelAsync(
                        dto.RoomId,
                        dto.HostelId))
            {
                return (
                    false,
                    "Selected room does not belong to the selected hostel.",
                    null);
            }

            if (!await _allocationRepository
                    .BedExistsAsync(dto.BedId))
            {
                return (
                    false,
                    "Bed not found.",
                    null);
            }

            if (!await _allocationRepository
                    .BedBelongsToRoomAsync(
                        dto.BedId,
                        dto.RoomId))
            {
                return (
                    false,
                    "Selected bed does not belong to the selected room.",
                    null);
            }

            if (dto.JoiningDate == default)
            {
                return (
                    false,
                    "Joining date is required.",
                    null);
            }

            var status =
                string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim();

            if (status.Equals(
                    "Active",
                    StringComparison.OrdinalIgnoreCase))
            {
                var activeStudentAllocation =
                    await _allocationRepository
                        .GetActiveByStudentAsync(dto.StudentId);

                if (activeStudentAllocation != null &&
                    activeStudentAllocation.AllocationId !=
                    allocationId)
                {
                    return (
                        false,
                        "This student already has another active hostel allocation.",
                        null);
                }

                var activeBedAllocation =
                    await _allocationRepository
                        .GetActiveByBedAsync(dto.BedId);

                if (activeBedAllocation != null &&
                    activeBedAllocation.AllocationId !=
                    allocationId)
                {
                    return (
                        false,
                        "Selected bed is already occupied.",
                        null);
                }
            }

            int? wardenAssignmentId =
                dto.WardenAssignmentId;

            if (wardenAssignmentId.HasValue)
            {
                var selectedWarden =
                    await _wardenRepository.GetByIdAsync(
                        wardenAssignmentId.Value);

                if (selectedWarden == null)
                {
                    return (
                        false,
                        "Warden assignment not found.",
                        null);
                }

                if (!selectedWarden.Status.Equals(
                        "Active",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return (
                        false,
                        "Selected warden assignment is not active.",
                        null);
                }

                if (selectedWarden.HostelId != dto.HostelId)
                {
                    return (
                        false,
                        "Selected warden is not assigned to this hostel.",
                        null);
                }
            }
            else
            {
                var activeWarden =
                    await _wardenRepository
                        .GetActiveByHostelAsync(dto.HostelId);

                wardenAssignmentId =
                    activeWarden?.WardenAssignmentId;
            }

            var allocation =
                new HostelStudentAllocation
                {
                    AllocationId = allocationId,
                    StudentId = dto.StudentId,
                    HostelId = dto.HostelId,
                    RoomId = dto.RoomId,
                    BedId = dto.BedId,
                    WardenAssignmentId =
                        wardenAssignmentId,
                    JoiningDate = dto.JoiningDate.Date,
                    Status = status,
                    Remarks = dto.Remarks?.Trim()
                };

            var updated =
                await _allocationRepository.UpdateAsync(
                    allocation);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update student hostel allocation.",
                    null);
            }

            var updatedRecord =
                await _allocationRepository.GetByIdAsync(
                    allocationId);

            return (
                true,
                "Student hostel allocation updated successfully.",
                updatedRecord == null
                    ? null
                    : MapToResponseDto(updatedRecord));
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int allocationId)
        {
            if (!await _allocationRepository
                    .ExistsAsync(allocationId))
            {
                return (
                    false,
                    "Student hostel allocation not found.");
            }

            var deleted =
                await _allocationRepository.DeleteAsync(
                    allocationId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete student hostel allocation.");
            }

            return (
                true,
                "Student hostel allocation deleted successfully.");
        }

        private static HostelStudentAllocationResponseDto
            MapToResponseDto(
                HostelStudentAllocation model)
        {
            return new HostelStudentAllocationResponseDto
            {
                AllocationId = model.AllocationId,

                StudentId = model.StudentId,
                AdmissionNo = model.AdmissionNo,
                RollNo = model.RollNo,
                StudentName = model.StudentName,

                HostelId = model.HostelId,
                HostelName = model.HostelName,
                HostelCode = model.HostelCode,
                HostelType = model.HostelType,

                RoomId = model.RoomId,
                RoomNumber = model.RoomNumber,
                FloorLevel = model.FloorLevel,
                RoomTypeSpecification =
                    model.RoomTypeSpecification,

                BedId = model.BedId,
                BedNumber = model.BedNumber,
                BedStatus = model.BedStatus,

                WardenAssignmentId =
                    model.WardenAssignmentId,

                WardenName = model.WardenName,

                JoiningDate = model.JoiningDate,
                Status = model.Status,
                Remarks = model.Remarks,
                CreatedAt = model.CreatedAt,
                UpdatedAt = model.UpdatedAt
            };
        }
    }
}