using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelTransferVacateService
        : IHostelTransferVacateService
    {
        private readonly IHostelTransferVacateRepository _repository;
        private readonly IHostelWardenAssignmentRepository _wardenRepository;

        public HostelTransferVacateService(
            IHostelTransferVacateRepository repository,
            IHostelWardenAssignmentRepository wardenRepository)
        {
            _repository = repository;
            _wardenRepository = wardenRepository;
        }

        public async Task<IEnumerable<HostelTransferVacateResponseDto>>
            GetAllAsync(
                int? studentId = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? feeSettlementStatus = null,
                DateTime? requestDate = null,
                string? search = null)
        {
            var records = await _repository.GetAllAsync(
                studentId,
                requestType,
                approvalStatus,
                feeSettlementStatus,
                requestDate,
                search);

            return records.Select(MapToResponseDto);
        }

        public async Task<HostelTransferVacateResponseDto?>
            GetByIdAsync(int requestId)
        {
            var record = await _repository.GetByIdAsync(requestId);

            return record == null
                ? null
                : MapToResponseDto(record);
        }

        public async Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            CreateAsync(CreateHostelTransferVacateDto dto)
        {
            var validation = await ValidateRequestAsync(
                dto.AllocationId,
                dto.StudentId,
                dto.RequestType,
                dto.FromHostelId,
                dto.FromRoomId,
                dto.FromBedId,
                dto.ToHostelId,
                dto.ToRoomId,
                dto.ToBedId,
                dto.RequestDate,
                dto.EffectiveDate,
                dto.Reason);

            if (!validation.Success)
            {
                return (false, validation.Message, null);
            }

            var requestType = NormalizeRequestType(dto.RequestType)!;

            var openRequest =
                await _repository.GetOpenRequestByAllocationAsync(
                    dto.AllocationId);

            if (openRequest != null)
            {
                return (
                    false,
                    "This allocation already has a pending or approved transfer/vacate request.",
                    null);
            }

            var wardenResult = await ResolveWardenAsync(
                requestType,
                dto.FromHostelId,
                dto.ToHostelId,
                dto.WardenAssignmentId);

            if (!wardenResult.Success)
            {
                return (
                    false,
                    wardenResult.Message,
                    null);
            }

            var request = new HostelTransferVacate
            {
                AllocationId = dto.AllocationId,
                StudentId = dto.StudentId,

                RequestType = requestType,

                FromHostelId = dto.FromHostelId,
                FromRoomId = dto.FromRoomId,
                FromBedId = dto.FromBedId,

                ToHostelId =
                    requestType == "Transfer"
                        ? dto.ToHostelId
                        : null,

                ToRoomId =
                    requestType == "Transfer"
                        ? dto.ToRoomId
                        : null,

                ToBedId =
                    requestType == "Transfer"
                        ? dto.ToBedId
                        : null,

                WardenAssignmentId =
                    wardenResult.WardenAssignmentId,

                RequestDate =
                    dto.RequestDate.Date,

                EffectiveDate =
                    dto.EffectiveDate?.Date,

                Reason =
                    dto.Reason.Trim(),

                ApprovalStatus =
                    "Pending",

                ApprovalRemarks =
                    null,

                ApprovedAt =
                    null,

                FeeSettlementStatus =
                    "Pending",

                RefundAmount =
                    0,

                AdditionalChargeAmount =
                    0,

                SettlementRemarks =
                    null,

                CompletedAt =
                    null
            };

            var requestId =
                await _repository.CreateAsync(request);

            var created =
                await _repository.GetByIdAsync(requestId);

            return (
                true,
                "Hostel transfer/vacate request created successfully.",
                created == null
                    ? null
                    : MapToResponseDto(created));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            UpdateAsync(
                int requestId,
                UpdateHostelTransferVacateDto dto)
        {
            var existing =
                await _repository.GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel transfer/vacate request not found.",
                    null);
            }

            if (!existing.ApprovalStatus.Equals(
                    "Pending",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Only pending transfer/vacate requests can be modified.",
                    null);
            }

            var validation = await ValidateRequestAsync(
                dto.AllocationId,
                dto.StudentId,
                dto.RequestType,
                dto.FromHostelId,
                dto.FromRoomId,
                dto.FromBedId,
                dto.ToHostelId,
                dto.ToRoomId,
                dto.ToBedId,
                dto.RequestDate,
                dto.EffectiveDate,
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

            var openRequest =
                await _repository
                    .GetOpenRequestByAllocationAsync(
                        dto.AllocationId,
                        requestId);

            if (openRequest != null)
            {
                return (
                    false,
                    "This allocation already has another pending or approved transfer/vacate request.",
                    null);
            }

            var wardenResult = await ResolveWardenAsync(
                requestType,
                dto.FromHostelId,
                dto.ToHostelId,
                dto.WardenAssignmentId);

            if (!wardenResult.Success)
            {
                return (
                    false,
                    wardenResult.Message,
                    null);
            }

            var request = new HostelTransferVacate
            {
                RequestId = requestId,

                AllocationId = dto.AllocationId,
                StudentId = dto.StudentId,

                RequestType = requestType,

                FromHostelId = dto.FromHostelId,
                FromRoomId = dto.FromRoomId,
                FromBedId = dto.FromBedId,

                ToHostelId =
                    requestType == "Transfer"
                        ? dto.ToHostelId
                        : null,

                ToRoomId =
                    requestType == "Transfer"
                        ? dto.ToRoomId
                        : null,

                ToBedId =
                    requestType == "Transfer"
                        ? dto.ToBedId
                        : null,

                WardenAssignmentId =
                    wardenResult.WardenAssignmentId,

                RequestDate =
                    dto.RequestDate.Date,

                EffectiveDate =
                    dto.EffectiveDate?.Date,

                Reason =
                    dto.Reason.Trim()
            };

            var updated =
                await _repository.UpdateAsync(request);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update hostel transfer/vacate request.",
                    null);
            }

            var updatedRecord =
                await _repository.GetByIdAsync(requestId);

            return (
                true,
                "Hostel transfer/vacate request updated successfully.",
                updatedRecord == null
                    ? null
                    : MapToResponseDto(updatedRecord));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            UpdateApprovalAsync(
                int requestId,
                UpdateHostelTransferVacateApprovalDto dto)
        {
            var existing =
                await _repository.GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel transfer/vacate request not found.",
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

            var approvalStatus =
                NormalizeApprovalStatus(dto.ApprovalStatus);

            if (approvalStatus == null)
            {
                return (
                    false,
                    "Approval status must be Approved, Rejected or Cancelled.",
                    null);
            }

            DateTime? approvedAt =
                approvalStatus == "Approved"
                    ? DateTime.Now
                    : null;

            var updated =
                await _repository.UpdateApprovalAsync(
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
                    "Unable to update approval status.",
                    null);
            }

            var updatedRecord =
                await _repository.GetByIdAsync(requestId);

            return (
                true,
                $"Hostel transfer/vacate request {approvalStatus.ToLower()} successfully.",
                updatedRecord == null
                    ? null
                    : MapToResponseDto(updatedRecord));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            UpdateSettlementAsync(
                int requestId,
                UpdateHostelTransferVacateSettlementDto dto)
        {
            var existing =
                await _repository.GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel transfer/vacate request not found.",
                    null);
            }

            if (!existing.ApprovalStatus.Equals(
                    "Approved",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Fee settlement can be updated only after the request is approved.",
                    null);
            }

            var settlementStatus =
                NormalizeSettlementStatus(
                    dto.FeeSettlementStatus);

            if (settlementStatus == null)
            {
                return (
                    false,
                    "Fee settlement status must be Pending, Settled or NotApplicable.",
                    null);
            }

            if (dto.RefundAmount < 0)
            {
                return (
                    false,
                    "Refund amount cannot be negative.",
                    null);
            }

            if (dto.AdditionalChargeAmount < 0)
            {
                return (
                    false,
                    "Additional charge amount cannot be negative.",
                    null);
            }

            var updated =
                await _repository.UpdateSettlementAsync(
                    requestId,
                    settlementStatus,
                    dto.RefundAmount,
                    dto.AdditionalChargeAmount,
                    string.IsNullOrWhiteSpace(
                        dto.SettlementRemarks)
                        ? null
                        : dto.SettlementRemarks.Trim());

            if (!updated)
            {
                return (
                    false,
                    "Unable to update fee settlement.",
                    null);
            }

            var updatedRecord =
                await _repository.GetByIdAsync(requestId);

            return (
                true,
                "Hostel fee settlement updated successfully.",
                updatedRecord == null
                    ? null
                    : MapToResponseDto(updatedRecord));
        }

        public async Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            CompleteAsync(int requestId)
        {
            var existing =
                await _repository.GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel transfer/vacate request not found.",
                    null);
            }

            if (!existing.ApprovalStatus.Equals(
                    "Approved",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Request must be approved before completion.",
                    null);
            }

            if (!existing.FeeSettlementStatus.Equals(
                    "Settled",
                    StringComparison.OrdinalIgnoreCase)
                &&
                !existing.FeeSettlementStatus.Equals(
                    "NotApplicable",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Fee settlement must be Settled or NotApplicable before completion.",
                    null);
            }

            if (existing.RequestType.Equals(
                    "Transfer",
                    StringComparison.OrdinalIgnoreCase))
            {
                if (!existing.ToBedId.HasValue)
                {
                    return (
                        false,
                        "Destination bed is required for transfer.",
                        null);
                }

                var bedAvailable =
                    await _repository.IsBedAvailableAsync(
                        existing.ToBedId.Value);

                if (!bedAvailable)
                {
                    return (
                        false,
                        "Destination bed is no longer available.",
                        null);
                }
            }

            var completed =
                await _repository.CompleteAsync(requestId);

            if (!completed)
            {
                return (
                    false,
                    "Unable to complete hostel transfer/vacate request.",
                    null);
            }

            var completedRecord =
                await _repository.GetByIdAsync(requestId);

            return (
                true,
                existing.RequestType.Equals(
                    "Transfer",
                    StringComparison.OrdinalIgnoreCase)
                    ? "Hostel transfer completed successfully."
                    : "Hostel vacate completed successfully.",
                completedRecord == null
                    ? null
                    : MapToResponseDto(completedRecord));
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int requestId)
        {
            var existing =
                await _repository.GetByIdAsync(requestId);

            if (existing == null)
            {
                return (
                    false,
                    "Hostel transfer/vacate request not found.");
            }

            if (existing.ApprovalStatus.Equals(
                    "Approved",
                    StringComparison.OrdinalIgnoreCase)
                ||
                existing.ApprovalStatus.Equals(
                    "Completed",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Approved or completed request cannot be deleted.");
            }

            var deleted =
                await _repository.DeleteAsync(requestId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete hostel transfer/vacate request.");
            }

            return (
                true,
                "Hostel transfer/vacate request deleted successfully.");
        }

        private async Task<(bool Success, string Message)>
            ValidateRequestAsync(
                int allocationId,
                int studentId,
                string? requestType,
                int fromHostelId,
                int fromRoomId,
                int fromBedId,
                int? toHostelId,
                int? toRoomId,
                int? toBedId,
                DateTime requestDate,
                DateTime? effectiveDate,
                string? reason)
        {
            if (!await _repository
                    .AllocationExistsAsync(allocationId))
            {
                return (
                    false,
                    "Student hostel allocation not found.");
            }

            if (!await _repository
                    .ActiveAllocationMatchesAsync(
                        allocationId,
                        studentId,
                        fromHostelId,
                        fromRoomId,
                        fromBedId))
            {
                return (
                    false,
                    "Active hostel allocation does not match the selected student, hostel, room and bed.");
            }

            var normalizedRequestType =
                NormalizeRequestType(requestType);

            if (normalizedRequestType == null)
            {
                return (
                    false,
                    "Request type must be Transfer or Vacate.");
            }

            if (requestDate == default)
            {
                return (
                    false,
                    "Request date is required.");
            }

            if (effectiveDate.HasValue &&
                effectiveDate.Value.Date <
                requestDate.Date)
            {
                return (
                    false,
                    "Effective date cannot be earlier than request date.");
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                return (
                    false,
                    "Reason is required.");
            }

            if (normalizedRequestType == "Transfer")
            {
                if (!toHostelId.HasValue ||
                    !toRoomId.HasValue ||
                    !toBedId.HasValue)
                {
                    return (
                        false,
                        "Destination hostel, room and bed are required for transfer.");
                }

                if (!await _repository
                        .HostelExistsAsync(
                            toHostelId.Value))
                {
                    return (
                        false,
                        "Destination hostel not found.");
                }

                if (!await _repository
                        .RoomExistsAsync(
                            toRoomId.Value))
                {
                    return (
                        false,
                        "Destination room not found.");
                }

                if (!await _repository
                        .RoomBelongsToHostelAsync(
                            toRoomId.Value,
                            toHostelId.Value))
                {
                    return (
                        false,
                        "Destination room does not belong to the selected destination hostel.");
                }

                if (!await _repository
                        .BedExistsAsync(
                            toBedId.Value))
                {
                    return (
                        false,
                        "Destination bed not found.");
                }

                if (!await _repository
                        .BedBelongsToRoomAsync(
                            toBedId.Value,
                            toRoomId.Value))
                {
                    return (
                        false,
                        "Destination bed does not belong to the selected destination room.");
                }

                if (fromBedId == toBedId.Value)
                {
                    return (
                        false,
                        "Source bed and destination bed cannot be the same.");
                }

                if (!await _repository
                        .IsBedAvailableAsync(
                            toBedId.Value))
                {
                    return (
                        false,
                        "Destination bed is not available.");
                }
            }

            return (
                true,
                "Valid");
        }

        private async Task<(
            bool Success,
            string Message,
            int? WardenAssignmentId)>
            ResolveWardenAsync(
                string requestType,
                int fromHostelId,
                int? toHostelId,
                int? requestedWardenAssignmentId)
        {
            var targetHostelId =
                requestType == "Transfer" &&
                toHostelId.HasValue
                    ? toHostelId.Value
                    : fromHostelId;

            if (requestedWardenAssignmentId.HasValue)
            {
                var warden =
                    await _wardenRepository.GetByIdAsync(
                        requestedWardenAssignmentId.Value);

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

                if (warden.HostelId != targetHostelId)
                {
                    return (
                        false,
                        "Selected warden is not assigned to the applicable hostel.",
                        null);
                }

                return (
                    true,
                    "Valid",
                    requestedWardenAssignmentId.Value);
            }

            var activeWarden =
                await _wardenRepository
                    .GetActiveByHostelAsync(
                        targetHostelId);

            return (
                true,
                "Valid",
                activeWarden?.WardenAssignmentId);
        }

        private static string? NormalizeRequestType(
            string? requestType)
        {
            if (string.IsNullOrWhiteSpace(requestType))
                return null;

            if (requestType.Equals(
                    "Transfer",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Transfer";
            }

            if (requestType.Equals(
                    "Vacate",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Vacate";
            }

            return null;
        }

        private static string? NormalizeApprovalStatus(
            string? approvalStatus)
        {
            if (string.IsNullOrWhiteSpace(approvalStatus))
                return null;

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

        private static string? NormalizeSettlementStatus(
            string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return null;

            if (status.Equals(
                    "Pending",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Pending";
            }

            if (status.Equals(
                    "Settled",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "Settled";
            }

            if (status.Equals(
                    "NotApplicable",
                    StringComparison.OrdinalIgnoreCase))
            {
                return "NotApplicable";
            }

            return null;
        }

        private static HostelTransferVacateResponseDto
            MapToResponseDto(
                HostelTransferVacate model)
        {
            return new HostelTransferVacateResponseDto
            {
                RequestId = model.RequestId,
                AllocationId = model.AllocationId,
                StudentId = model.StudentId,

                AdmissionNo = model.AdmissionNo,
                RollNo = model.RollNo,
                StudentName = model.StudentName,

                RequestType = model.RequestType,

                FromHostelId = model.FromHostelId,
                FromHostelName = model.FromHostelName,
                FromHostelCode = model.FromHostelCode,

                FromRoomId = model.FromRoomId,
                FromRoomNumber = model.FromRoomNumber,
                FromFloorLevel = model.FromFloorLevel,

                FromBedId = model.FromBedId,
                FromBedNumber = model.FromBedNumber,

                ToHostelId = model.ToHostelId,
                ToHostelName = model.ToHostelName,
                ToHostelCode = model.ToHostelCode,

                ToRoomId = model.ToRoomId,
                ToRoomNumber = model.ToRoomNumber,
                ToFloorLevel = model.ToFloorLevel,

                ToBedId = model.ToBedId,
                ToBedNumber = model.ToBedNumber,

                WardenAssignmentId =
                    model.WardenAssignmentId,

                WardenName = model.WardenName,

                RequestDate = model.RequestDate,
                EffectiveDate = model.EffectiveDate,
                Reason = model.Reason,

                ApprovalStatus =
                    model.ApprovalStatus,

                ApprovalRemarks =
                    model.ApprovalRemarks,

                ApprovedAt =
                    model.ApprovedAt,

                FeeSettlementStatus =
                    model.FeeSettlementStatus,

                RefundAmount =
                    model.RefundAmount,

                AdditionalChargeAmount =
                    model.AdditionalChargeAmount,

                SettlementRemarks =
                    model.SettlementRemarks,

                CompletedAt =
                    model.CompletedAt,

                CreatedAt =
                    model.CreatedAt,

                UpdatedAt =
                    model.UpdatedAt
            };
        }
    }
}