using CollegeManagement.API.DTOs.Promotion;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class PromotionService : IPromotionService
    {
        private readonly IPromotionRepository _repository;
        public PromotionService(IPromotionRepository repository) => _repository = repository;

        public Task<IEnumerable<EligibleStudentDto>> GetEligibleStudentsAsync(PromotionEligibilityQuery query)
        {
            if (query.AcademicYearId.HasValue && query.TargetAcademicYearId.HasValue && query.AcademicYearId.Value == query.TargetAcademicYearId.Value)
                throw new ValidationException("Source and target academic year cannot be the same.");

            if (!string.IsNullOrWhiteSpace(query.EligibilityStatus) &&
                !new[] { "Eligible", "Not Eligible" }.Contains(query.EligibilityStatus, StringComparer.OrdinalIgnoreCase))
                throw new ValidationException("EligibilityStatus must be Eligible or Not Eligible.");

            return _repository.GetEligibleStudentsAsync(query);
        }

        public Task<PromotionPreviewResponse> PreviewAsync(PromotionPreviewRequest request)
        {
            ValidateConfiguration(request.SourceAcademicYearId, request.SourceAcademicLevel, request.SourceGroupId, request.TargetAcademicYearId, request.TargetAcademicLevel, request.TargetGroupId);
            ValidateIds(request.StudentIds);
            return _repository.PreviewAsync(request);
        }

        public Task<PromotionExecutionResponse> PromoteStudentsAsync(PromoteStudentsRequest request, string performedBy = "System")
        {
            ValidateConfiguration(request.SourceAcademicYearId, request.SourceAcademicLevel, request.SourceGroupId, request.TargetAcademicYearId, request.TargetAcademicLevel, request.TargetGroupId);
            ValidateIds(request.StudentIds);
            return _repository.PromoteStudentsAsync(request, performedBy);
        }

        public Task<IEnumerable<PromotionHistoryDto>> GetHistoryAsync(PromotionHistoryQuery query) => _repository.GetHistoryAsync(query);

        public Task<RollbackResponse> RollbackAsync(RollbackPromotionRequest request, string performedBy = "System")
        {
            if (request.PromotionId <= 0) throw new ValidationException("Promotion ID is required.");
            if (string.IsNullOrWhiteSpace(request.Reason)) throw new ValidationException("Rollback reason is required.");
            return _repository.RollbackAsync(request, performedBy);
        }

        public async Task<PromotionHistoryDto> PromoteSingleStudentAsync(int studentId, PromoteSingleStudentRequest request, string performedBy = "System")
        {
            if (studentId <= 0) throw new ValidationException("Student ID is required.");
            if (request.TargetAcademicYearId <= 0) throw new ValidationException("Target academic year is required.");
            if (string.IsNullOrWhiteSpace(request.TargetAcademicLevel)) throw new ValidationException("Target academic level is required.");
            if (request.TargetGroupId <= 0) throw new ValidationException("Target group is required.");
            if (string.IsNullOrWhiteSpace(request.TargetSection)) throw new ValidationException("Target section is required.");
            var row = await _repository.PromoteSingleStudentAsync(studentId, request, performedBy);
            if (row == null) throw new NotFoundException($"Student {studentId} was not found.");
            return row;
        }

        public Task<AllocationResponse> AllocateGroupAsync(GroupAllocationRequest request)
        {
            ValidateIds(request.StudentIds);
            if (request.TargetAcademicYearId <= 0 || request.TargetGroupId <= 0 || string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                throw new ValidationException("Target academic configuration is required.");
            return _repository.AllocateGroupAsync(request);
        }

        public Task<AllocationResponse> AllocateProgramAsync(ProgramAllocationRequest request)
        {
            ValidateIds(request.StudentIds);
            if (request.TargetAcademicYearId <= 0 || request.TargetGroupId <= 0 || request.TargetProgramId <= 0 || string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                throw new ValidationException("Target academic configuration (including Program) is required.");
            return _repository.AllocateProgramAsync(request);
        }

        public Task<AllocationResponse> AllocateSectionAsync(SectionAllocationRequest request)
        {
            ValidateIds(request.StudentIds);
            if (request.TargetAcademicYearId <= 0 || request.TargetGroupId <= 0 || string.IsNullOrWhiteSpace(request.TargetAcademicLevel) || string.IsNullOrWhiteSpace(request.TargetSection))
                throw new ValidationException("Target academic configuration is required.");
            return _repository.AllocateSectionAsync(request);
        }

        public Task<PromotionReportResponse> GetPromotionReportAsync(PromotionReportQuery query) => _repository.GetPromotionReportAsync(query);

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
