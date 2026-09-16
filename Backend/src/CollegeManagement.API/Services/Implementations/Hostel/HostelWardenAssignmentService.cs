using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelWardenAssignmentService
        : IHostelWardenAssignmentService
    {
        private readonly IHostelWardenAssignmentRepository _repository;

        public HostelWardenAssignmentService(
            IHostelWardenAssignmentRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<HostelWardenAssignmentResponseDto>>
            GetAllAsync(
                int? hostelId = null,
                int? staffId = null,
                string? status = null,
                string? search = null)
        {
            var assignments =
                await _repository.GetAllAsync(
                    hostelId,
                    staffId,
                    status,
                    search);

            return assignments.Select(MapToResponse);
        }

        public async Task<HostelWardenAssignmentResponseDto?>
            GetByIdAsync(int wardenAssignmentId)
        {
            var assignment =
                await _repository.GetByIdAsync(
                    wardenAssignmentId);

            if (assignment == null)
            {
                return null;
            }

            return MapToResponse(assignment);
        }

        public async Task<
            (bool Success,
             string Message,
             HostelWardenAssignmentResponseDto? Data)>
            CreateAsync(CreateHostelWardenAssignmentDto dto)
        {
            var staffExists =
                await _repository.StaffExistsAsync(dto.StaffId);

            if (!staffExists)
            {
                return (
                    false,
                    "Staff not found.",
                    null
                );
            }

            var hostelExists =
                await _repository.HostelExistsAsync(dto.HostelId);

            if (!hostelExists)
            {
                return (
                    false,
                    "Hostel block not found.",
                    null
                );
            }

            var activeForHostel =
                await _repository.GetActiveByHostelAsync(
                    dto.HostelId);

            if (activeForHostel != null)
            {
                return (
                    false,
                    "This hostel already has an active warden.",
                    null
                );
            }

            var activeForStaff =
                await _repository.GetActiveByStaffAsync(
                    dto.StaffId);

            if (activeForStaff != null)
            {
                return (
                    false,
                    "This staff member is already assigned as an active warden.",
                    null
                );
            }

            var assignment =
                new HostelWardenAssignment
                {
                    StaffId = dto.StaffId,

                    HostelId = dto.HostelId,

                    AssignmentDate = dto.AssignmentDate,

                    Status =
                        string.IsNullOrWhiteSpace(dto.Status)
                            ? "Active"
                            : dto.Status.Trim()
                };

            var id =
                await _repository.CreateAsync(assignment);

            assignment.WardenAssignmentId = id;

            var created =
                await _repository.GetByIdAsync(id);

            return (
                true,
                "Warden assigned successfully.",
                created == null
                    ? MapToResponse(assignment)
                    : MapToResponse(created)
            );
        }

        public async Task<
            (bool Success,
             string Message,
             HostelWardenAssignmentResponseDto? Data)>
            UpdateAsync(
                int wardenAssignmentId,
                UpdateHostelWardenAssignmentDto dto)
        {
            var assignment =
                await _repository.GetByIdAsync(
                    wardenAssignmentId);

            if (assignment == null)
            {
                return (
                    false,
                    "Warden assignment not found.",
                    null
                );
            }

            var staffExists =
                await _repository.StaffExistsAsync(dto.StaffId);

            if (!staffExists)
            {
                return (
                    false,
                    "Staff not found.",
                    null
                );
            }

            var hostelExists =
                await _repository.HostelExistsAsync(dto.HostelId);

            if (!hostelExists)
            {
                return (
                    false,
                    "Hostel block not found.",
                    null
                );
            }

            if (dto.Status.Equals(
                    "Active",
                    StringComparison.OrdinalIgnoreCase))
            {
                var activeForHostel =
                    await _repository.GetActiveByHostelAsync(
                        dto.HostelId);

                if (activeForHostel != null &&
                    activeForHostel.WardenAssignmentId !=
                    wardenAssignmentId)
                {
                    return (
                        false,
                        "This hostel already has another active warden.",
                        null
                    );
                }

                var activeForStaff =
                    await _repository.GetActiveByStaffAsync(
                        dto.StaffId);

                if (activeForStaff != null &&
                    activeForStaff.WardenAssignmentId !=
                    wardenAssignmentId)
                {
                    return (
                        false,
                        "This staff member is already assigned as an active warden.",
                        null
                    );
                }
            }

            assignment.StaffId = dto.StaffId;
            assignment.HostelId = dto.HostelId;
            assignment.AssignmentDate = dto.AssignmentDate;

            assignment.Status =
                string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim();

            var updated =
                await _repository.UpdateAsync(assignment);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update warden assignment.",
                    null
                );
            }

            var result =
                await _repository.GetByIdAsync(
                    wardenAssignmentId);

            return (
                true,
                "Warden assignment updated successfully.",
                result == null
                    ? MapToResponse(assignment)
                    : MapToResponse(result)
            );
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int wardenAssignmentId)
        {
            var exists =
                await _repository.ExistsAsync(
                    wardenAssignmentId);

            if (!exists)
            {
                return (
                    false,
                    "Warden assignment not found."
                );
            }

            var deleted =
                await _repository.DeleteAsync(
                    wardenAssignmentId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete warden assignment."
                );
            }

            return (
                true,
                "Warden assignment deleted successfully."
            );
        }

        private static HostelWardenAssignmentResponseDto
            MapToResponse(
                HostelWardenAssignment assignment)
        {
            return new HostelWardenAssignmentResponseDto
            {
                WardenAssignmentId =
                    assignment.WardenAssignmentId,

                StaffId =
                    assignment.StaffId,

                EmployeeId =
                    assignment.EmployeeId,

                FirstName =
                    assignment.FirstName,

                MiddleName =
                    assignment.MiddleName,

                LastName =
                    assignment.LastName,

                WardenName =
                    assignment.WardenName,

                HostelId =
                    assignment.HostelId,

                HostelName =
                    assignment.HostelName,

                HostelCode =
                    assignment.HostelCode,

                HostelType =
                    assignment.HostelType,

                AssignmentDate =
                    assignment.AssignmentDate,

                Status =
                    assignment.Status,

                CreatedAt =
                    assignment.CreatedAt
            };
        }
    }
}