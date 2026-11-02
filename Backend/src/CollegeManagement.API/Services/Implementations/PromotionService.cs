using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotion;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class PromotionService : IPromotionService
    {
        private readonly IPromotionRepository _repository;
        private readonly IFeeService _feeService;

        public PromotionService(IPromotionRepository repository, IFeeService feeService)
        {
            _repository = repository;
            _feeService = feeService;
        }

        public Task<IEnumerable<EligibleStudentDto>> GetEligibleStudentsAsync(
            PromotionEligibilityQuery query,
            CancellationToken cancellationToken = default)
        {
            if (query.AcademicYearId.HasValue && query.TargetAcademicYearId.HasValue && query.AcademicYearId.Value == query.TargetAcademicYearId.Value)
                throw new ValidationException("Source and target academic year cannot be the same.");

            if (!string.IsNullOrWhiteSpace(query.EligibilityStatus) &&
                !new[] { "Eligible", "Not Eligible" }.Contains(query.EligibilityStatus, StringComparer.OrdinalIgnoreCase))
                throw new ValidationException("EligibilityStatus must be Eligible or Not Eligible.");

            return _repository.GetEligibleStudentsAsync(query, cancellationToken);
        }

        public Task<PromotionPreviewResponse> PreviewAsync(
            PromotionPreviewRequest request,
            CancellationToken cancellationToken = default)
        {
            ValidateConfiguration(request.SourceAcademicYearId, request.SourceAcademicLevel, request.SourceGroupId, request.TargetAcademicYearId, request.TargetAcademicLevel, request.TargetGroupId);
            ValidateIds(request.StudentIds);
            return _repository.PreviewAsync(request, cancellationToken);
        }

        public async Task<PromotionExecutionResponse> PromoteStudentsAsync(
            PromoteStudentsRequest request,
            string performedBy = "System",
            CancellationToken cancellationToken = default)
        {
            ValidateConfiguration(request.SourceAcademicYearId, request.SourceAcademicLevel, request.SourceGroupId, request.TargetAcademicYearId, request.TargetAcademicLevel, request.TargetGroupId);
            ValidateIds(request.StudentIds);
            
            var result = await _repository.PromoteStudentsAsync(request, performedBy, cancellationToken);

            if (result != null && result.Students != null && result.Students.Any(s => s.PromotionStatus == "Promoted"))
            {
                int? feeStructureId = request.TargetFeeStructureId;
                if (!feeStructureId.HasValue || feeStructureId <= 0)
                {
                    var match = await _feeService.GetMatchingFeeStructureAsync(
                        null,
                        request.TargetBoardId ?? request.SourceBoardId ?? 0,
                        request.TargetAcademicYearId,
                        request.TargetAcademicLevelId,
                        request.TargetGroupId,
                        null);
                    feeStructureId = match?.FeeStructureId;
                }

                if (feeStructureId.HasValue && feeStructureId > 0)
                {
                    var promotedIds = result.Students
                        .Where(s => s.PromotionStatus == "Promoted")
                        .Select(s => s.StudentId)
                        .ToList();

                    foreach (var sId in promotedIds)
                    {
                        try
                        {
                            await _feeService.AssignPromotionFeeAsync(
                                sId,
                                feeStructureId.Value,
                                request.PaymentPlan ?? "Full Payment",
                                request.NumberOfInstallments ?? 1,
                                performedBy);
                        }
                        catch
                        {
                            // Non-critical fee assignment exception
                        }
                    }
                }
            }

            return result ?? new PromotionExecutionResponse();
        }

        public Task<IEnumerable<PromotionHistoryDto>> GetHistoryAsync(
            PromotionHistoryQuery query,
            CancellationToken cancellationToken = default) => _repository.GetHistoryAsync(query, cancellationToken);

        public Task<RollbackResponse> RollbackAsync(
            RollbackPromotionRequest request,
            string performedBy = "System",
            CancellationToken cancellationToken = default)
        {
            if (request.PromotionId <= 0) throw new ValidationException("Promotion ID is required.");
            if (string.IsNullOrWhiteSpace(request.Reason)) throw new ValidationException("Rollback reason is required.");
            return _repository.RollbackAsync(request, performedBy, cancellationToken);
        }

        public async Task<PromotionHistoryDto> PromoteSingleStudentAsync(
            int studentId,
            PromoteSingleStudentRequest request,
            string performedBy = "System",
            CancellationToken cancellationToken = default)
        {
            if (studentId <= 0) throw new ValidationException("Student ID is required.");
            if (request.TargetAcademicYearId <= 0) throw new ValidationException("Target academic year is required.");
            if (string.IsNullOrWhiteSpace(request.TargetAcademicLevel)) throw new ValidationException("Target academic level is required.");
            if (request.TargetGroupId <= 0) throw new ValidationException("Target group is required.");
            if (string.IsNullOrWhiteSpace(request.TargetSection)) throw new ValidationException("Target section is required.");
            
            var row = await _repository.PromoteSingleStudentAsync(studentId, request, performedBy, cancellationToken);
            if (row == null) throw new NotFoundException($"Student {studentId} was not found.");

            int? feeStructureId = request.TargetFeeStructureId;
            if (!feeStructureId.HasValue || feeStructureId <= 0)
            {
                var match = await _feeService.GetMatchingFeeStructureAsync(
                    null,
                    request.TargetBoardId ?? 0,
                    request.TargetAcademicYearId,
                    null,
                    request.TargetGroupId,
                    request.TargetProgramId);
                feeStructureId = match?.FeeStructureId;
            }

            if (feeStructureId.HasValue && feeStructureId > 0)
            {
                try
                {
                    await _feeService.AssignPromotionFeeAsync(
                        studentId,
                        feeStructureId.Value,
                        request.PaymentPlan ?? "Full Payment",
                        request.NumberOfInstallments ?? 1,
                        performedBy);
                }
                catch
                {
                    // Non-critical fee error
                }
            }

            return row;
        }

        public Task<AllocationResponse> AllocateGroupAsync(
            GroupAllocationRequest request,
            CancellationToken cancellationToken = default)
        {
            ValidateIds(request.StudentIds);
            if (request.TargetAcademicYearId <= 0 || request.TargetGroupId <= 0 || string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                throw new ValidationException("Target academic configuration is required.");
            return _repository.AllocateGroupAsync(request, cancellationToken);
        }

        public async Task<AllocationResponse> AllocateProgramAsync(
            ProgramAllocationRequest request,
            CancellationToken cancellationToken = default)
        {
            ValidateIds(request.StudentIds);
            if (request.TargetAcademicYearId <= 0 || request.TargetGroupId <= 0 || request.TargetProgramId <= 0 || string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                throw new ValidationException("Target academic configuration (including Program) is required.");
            
            var response = await _repository.AllocateProgramAsync(request, cancellationToken);

            if (request.UpdateFees && response != null && response.Students != null)
            {
                var updatedIds = response.Students.Where(s => s.Status == "Updated").Select(s => s.StudentId);
                foreach (var sId in updatedIds)
                {
                    try
                    {
                        await _feeService.ApplyProgramFeeAdjustmentAsync(sId, request.TargetProgramId, request.TargetFeeStructureId);
                    }
                    catch
                    {
                        // Ignore adjustment error
                    }
                }
            }

            return response ?? new AllocationResponse();
        }

        public Task<AllocationResponse> AllocateSectionAsync(
            SectionAllocationRequest request,
            CancellationToken cancellationToken = default)
        {
            ValidateIds(request.StudentIds);
            if (request.TargetAcademicYearId <= 0 || request.TargetGroupId <= 0 || string.IsNullOrWhiteSpace(request.TargetAcademicLevel) || string.IsNullOrWhiteSpace(request.TargetSection))
                throw new ValidationException("Target academic configuration is required.");
            return _repository.AllocateSectionAsync(request, cancellationToken);
        }

        public Task<PromotionReportResponse> GetPromotionReportAsync(
            PromotionReportQuery query,
            CancellationToken cancellationToken = default) => _repository.GetPromotionReportAsync(query, cancellationToken);

        private static void ValidateConfiguration(int? sourceYear, string? sourceLevel, int? sourceGroup, int? targetYear, string? targetLevel, int? targetGroup)
        {
            if (sourceYear <= 0) throw new ValidationException("Source academic year is required.");
            if (string.IsNullOrWhiteSpace(sourceLevel)) throw new ValidationException("Source academic level is required.");
            if (sourceGroup <= 0) throw new ValidationException("Source group is required.");
            if (targetYear <= 0) throw new ValidationException("Target academic year is required.");
            if (string.IsNullOrWhiteSpace(targetLevel)) throw new ValidationException("Target academic level is required.");
            if (targetGroup <= 0) throw new ValidationException("Target group is required.");
            if (sourceYear == targetYear) throw new ValidationException("Source and target academic year cannot be the same.");
        }

        private static void ValidateIds(IEnumerable<int>? ids)
        {
            if (ids == null || !ids.Any()) throw new ValidationException("At least one student ID is required.");
            if (ids.Any(x => x <= 0) || ids.Distinct().Count() != ids.Count()) throw new ValidationException("Student IDs must be valid and unique.");
        }
    }
}
