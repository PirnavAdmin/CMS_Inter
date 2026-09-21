using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelOutpassLeaveService
        : IHostelOutpassLeaveService
    {
        private readonly IHostelOutpassLeaveRepository
            _repository;

        private readonly IHostelWardenAssignmentRepository
            _wardenRepository;

        public HostelOutpassLeaveService(
            IHostelOutpassLeaveRepository repository,
            IHostelWardenAssignmentRepository wardenRepository)
        {
            _repository = repository;
            _wardenRepository = wardenRepository;
        }

        public async Task<IEnumerable<HostelOutpassLeaveResponseDto>>
            GetAllAsync(
                int? hostelId = null,
                int? studentId = null,
                string? requestType = null,
                string? approvalStatus = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? search = null)
        {
            var records =
                await _repository.GetAllAsync(
                    hostelId,
                    studentId,
                    requestType,
                    approvalStatus,
                    fromDate,
                    toDate,
                    search);

            return records.Select(MapToResponseDto);
        }

        public async Task<HostelOutpassLeaveResponseDto?>
            GetByIdAsync(int requestId)
        {
            var record =
                await _repository.GetByIdAsync(requestId);

            return record == null
                ? null
                : MapToResponseDto(record);
        }

        public async Task<(
            bool Success,
            string Message,
            HostelOutpassLeaveResponseDto? Data)>
            CreateAsync(
                CreateHostelOutpassLeaveDto dto)
        {
            var validation =
                await ValidateRequestAsync(
                    dto.StudentId,
                    dto.HostelId,
                    dto.RoomId,
                    dto.BedId,
                    dto.WardenAssignmentId,
                    dto.RequestType,
                    dto.FromDateTime,
                    dto.ToDateTime,
                    dto.Reason);

            if (!validation.Success)
            {
                return (
                    false,
                    validation.Message,
                    null);
            }

            var requestType =
                NormalizeRequestType(dto.RequestType)!;

            var overlapping =
                await _repository
                    .GetOverlappingRequestAsync(
                        dto.StudentId,
                        dto.FromDateTime,
                        dto.ToDateTime);

            if (overlapping != null)
            {
                return (
                    false,
                    "Student already has a pending or approved request for the selected date and time range.",
                    null);
            }

            int? wardenAssignmentId =
                dto.WardenAssignmentId;

            if (wardenAssignmentId.HasValue)
            {
                var warden =
                    await _wardenRepository
                        .GetByIdAsync(
                            wardenAssignmentId.Value);

                if (warden == null)
                {
                    return (
                        false,
                        "Warden assignment not found.",
                        null);
                }

                if (!warden.Status.Equals(
                        "Active",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return (
                        false,
                        "Selected warden assignment is not active.",
                        null);
                }

                if (warden.HostelId != dto.HostelId)
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
                        .GetActiveByHostelAsync(
                            dto.HostelId);

                wardenAssignmentId =
                    activeWarden?.WardenAssignmentId;
            }

            var request =
                new HostelOutpassLeave
                {
                    StudentId = dto.StudentId,
                    HostelId = dto.HostelId,
                    RoomId = dto.RoomId,
                    BedId = dto.BedId,

                    WardenAssignmentId =
                        wardenAssignmentId,

                    RequestType =
                        requestType,

                    FromDateTime =
                        dto.FromDateTime,

                    ToDateTime =
                        dto.ToDateTime,

                    Reason =
                        dto.Reason.Trim(),

                    Destination =
                        string.IsNullOrWhiteSpace(
                            dto.Destination)
                            ? null
                            : dto.Destination.Trim(),

                    ApprovalStatus =
                        "Pending",

                    ApprovalRemarks =
                        null,

                    ApprovedAt =
                        null
                };

            var requestId =
                await _repository
                    .CreateAsync(request);

            var created =
                await _repository
                    .GetByIdAsync(requestId);

            return (
                true,
                "Hostel outpass/leave request created successfully.",
                created == null
                    ? null
                    : MapToResponseDto(created));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelOutpassLeaveResponseDto? Data)>
            UpdateAsync(
                int requestId,
                UpdateHostelOutpassLeaveDto dto)
        {
            var existing =
                await _repository
                    .GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel outpass/leave request not found.",
                    null);
            }

            if (!existing.ApprovalStatus.Equals(
                    "Pending",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Only pending requests can be modified.",
                    null);
            }

            var validation =
                await ValidateRequestAsync(
                    dto.StudentId,
                    dto.HostelId,
                    dto.RoomId,
                    dto.BedId,
                    dto.WardenAssignmentId,
                    dto.RequestType,
                    dto.FromDateTime,
                    dto.ToDateTime,
                    dto.Reason);

            if (!validation.Success)
            {
                return (
                    false,
                    validation.Message,
                    null);
            }

            var requestType =
                NormalizeRequestType(dto.RequestType)!;

            var overlapping =
                await _repository
                    .GetOverlappingRequestAsync(
                        dto.StudentId,
                        dto.FromDateTime,
                        dto.ToDateTime,
                        requestId);

            if (overlapping != null)
            {
                return (
                    false,
                    "Student already has another pending or approved request for the selected date and time range.",
                    null);
            }

            int? wardenAssignmentId =
                dto.WardenAssignmentId;

            if (wardenAssignmentId.HasValue)
            {
                var warden =
                    await _wardenRepository
                        .GetByIdAsync(
                            wardenAssignmentId.Value);

                if (warden == null)
                {
                    return (
                        false,
                        "Warden assignment not found.",
                        null);
                }

                if (!warden.Status.Equals(
                        "Active",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return (
                        false,
                        "Selected warden assignment is not active.",
                        null);
                }

                if (warden.HostelId != dto.HostelId)
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
                        .GetActiveByHostelAsync(
                            dto.HostelId);

                wardenAssignmentId =
                    activeWarden?.WardenAssignmentId;
            }

            var request =
                new HostelOutpassLeave
                {
                    RequestId =
                        requestId,

                    StudentId =
                        dto.StudentId,

                    HostelId =
                        dto.HostelId,

                    RoomId =
                        dto.RoomId,

                    BedId =
                        dto.BedId,

                    WardenAssignmentId =
                        wardenAssignmentId,

                    RequestType =
                        requestType,

                    FromDateTime =
                        dto.FromDateTime,

                    ToDateTime =
                        dto.ToDateTime,

                    Reason =
                        dto.Reason.Trim(),

                    Destination =
                        string.IsNullOrWhiteSpace(
                            dto.Destination)
                            ? null
                            : dto.Destination.Trim()
                };

            var updated =
                await _repository
                    .UpdateAsync(request);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update hostel outpass/leave request.",
                    null);
            }

            var updatedRecord =
                await _repository
                    .GetByIdAsync(requestId);

            return (
                true,
                "Hostel outpass/leave request updated successfully.",
                updatedRecord == null
                    ? null
                    : MapToResponseDto(
                        updatedRecord));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelOutpassLeaveResponseDto? Data)>
            UpdateApprovalAsync(
                int requestId,
                UpdateHostelOutpassLeaveApprovalDto dto)
        {
            var existing =
                await _repository
                    .GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel outpass/leave request not found.",
                    null);
            }

            var approvalStatus =
                NormalizeApprovalStatus(
                    dto.ApprovalStatus);

            if (approvalStatus == null)
            {
                return (
                    false,
                    "Approval status must be Approved, Rejected or Cancelled.",
                    null);
            }

            if (!existing.ApprovalStatus.Equals(
                    "Pending",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Only pending requests can be approved, rejected or cancelled.",
                    null);
            }

            DateTime? approvedAt = null;

            if (approvalStatus == "Approved")
            {
                approvedAt = DateTime.Now;
            }

            var updated =
                await _repository
                    .UpdateApprovalAsync(
                        requestId,
                        approvalStatus,
                        string.IsNullOrWhiteSpace(
                            dto.ApprovalRemarks)
                            ? null
                            : dto.ApprovalRemarks.Trim(),
                        approvedAt);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update request approval status.",
                    null);
            }

            var updatedRecord =
                await _repository
                    .GetByIdAsync(requestId);

            return (
                true,
                $"Hostel request {approvalStatus.ToLower()} successfully.",
                updatedRecord == null
                    ? null
                    : MapToResponseDto(
                        updatedRecord));
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int requestId)
        {
            var existing =
                await _repository
                    .GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel outpass/leave request not found.");
            }

            if (existing.ApprovalStatus.Equals(
                    "Approved",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Approved request cannot be deleted.");
            }

            var deleted =
                await _repository
                    .DeleteAsync(requestId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete hostel outpass/leave request.");
            }

            return (
                true,
                "Hostel outpass/leave request deleted successfully.");
        }

        private async Task<(bool Success, string Message)>
            ValidateRequestAsync(
                int studentId,
                int hostelId,
                int roomId,
                int bedId,
                int? wardenAssignmentId,
                string? requestType,
                DateTime fromDateTime,
                DateTime toDateTime,
                string? reason)
        {
            if (!await _repository
                    .StudentExistsAsync(studentId))
            {
                return (
                    false,
                    "Student not found.");
            }

            if (!await _repository
                    .HostelExistsAsync(hostelId))
            {
                return (
                    false,
                    "Hostel not found.");
            }

            if (!await _repository
                    .RoomExistsAsync(roomId))
            {
                return (
                    false,
                    "Room not found.");
            }

            if (!await _repository
                    .RoomBelongsToHostelAsync(
                        roomId,
                        hostelId))
            {
                return (
                    false,
                    "Selected room does not belong to the selected hostel.");
            }

            if (!await _repository
                    .BedExistsAsync(bedId))
            {
                return (
                    false,
                    "Bed not found.");
            }

            if (!await _repository
                    .BedBelongsToRoomAsync(
                        bedId,
                        roomId))
            {
                return (
                    false,
                    "Selected bed does not belong to the selected room.");
            }

            if (!await _repository
                    .StudentHasActiveAllocationAsync(
                        studentId,
                        hostelId,
                        roomId,
                        bedId))
            {
                return (
                    false,
                    "Student does not have an active hostel allocation for the selected hostel, room and bed.");
            }

            if (NormalizeRequestType(
                    requestType) == null)
            {
                return (
                    false,
                    "Request type must be Outpass or Leave.");
            }

            if (fromDateTime == default)
            {
                return (
                    false,
                    "From date and time is required.");
            }

            if (toDateTime == default)
            {
                return (
                    false,
                    "To date and time is required.");
            }

            if (toDateTime <= fromDateTime)
            {
                return (
                    false,
                    "To date and time must be greater than From date and time.");
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                return (
                    false,
                    "Reason is required.");
            }

            if (wardenAssignmentId.HasValue)
            {
                var exists =
                    await _repository
                        .WardenAssignmentExistsAsync(
                            wardenAssignmentId.Value);

                if (!exists)
                {
                    return (
                        false,
                        "Active warden assignment not found.");
                }
            }

            return (
                true,
                "Valid");
        }

        private static string?
            NormalizeRequestType(
                string? requestType)
        {
            if (string.IsNullOrWhiteSpace(
                    requestType))
            {
                return null;
            }

            if (requestType.Equals(
                    "Outpass",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Outpass";
            }

            if (requestType.Equals(
                    "Leave",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Leave";
            }

            return null;
        }

        private static string?
            NormalizeApprovalStatus(
                string? approvalStatus)
        {
            if (string.IsNullOrWhiteSpace(
                    approvalStatus))
            {
                return null;
            }

            if (approvalStatus.Equals(
                    "Approved",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Approved";
            }

            if (approvalStatus.Equals(
                    "Rejected",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Rejected";
            }

            if (approvalStatus.Equals(
                    "Cancelled",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Cancelled";
            }

            return null;
        }

        private static HostelOutpassLeaveResponseDto
            MapToResponseDto(
                HostelOutpassLeave model)
        {
            return new HostelOutpassLeaveResponseDto
            {
                RequestId =
                    model.RequestId,

                StudentId =
                    model.StudentId,

                AdmissionNo =
                    model.AdmissionNo,

                RollNo =
                    model.RollNo,

                StudentName =
                    model.StudentName,

                HostelId =
                    model.HostelId,

                HostelName =
                    model.HostelName,

                HostelCode =
                    model.HostelCode,

                HostelType =
                    model.HostelType,

                RoomId =
                    model.RoomId,

                RoomNumber =
                    model.RoomNumber,

                FloorLevel =
                    model.FloorLevel,

                BedId =
                    model.BedId,

                BedNumber =
                    model.BedNumber,

                WardenAssignmentId =
                    model.WardenAssignmentId,

                WardenName =
                    model.WardenName,

                RequestType =
                    model.RequestType,

                FromDateTime =
                    model.FromDateTime,

                ToDateTime =
                    model.ToDateTime,

                Reason =
                    model.Reason,

                Destination =
                    model.Destination,

                ApprovalStatus =
                    model.ApprovalStatus,

                ApprovalRemarks =
                    model.ApprovalRemarks,

                ApprovedAt =
                    model.ApprovedAt,

                CreatedAt =
                    model.CreatedAt,

                UpdatedAt =
                    model.UpdatedAt
            };
        }
    }
}