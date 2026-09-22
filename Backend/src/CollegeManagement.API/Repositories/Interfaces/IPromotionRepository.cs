using CollegeManagement.API.DTOs.Promotion;
namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IPromotionRepository
    {
        Task<IEnumerable<EligibleStudentDto>> GetEligibleStudentsAsync(PromotionEligibilityQuery query);
        Task<PromotionPreviewResponse> PreviewAsync(PromotionPreviewRequest request);
        Task<PromotionExecutionResponse> PromoteStudentsAsync(PromoteStudentsRequest request, string performedBy = "System");
        Task<IEnumerable<PromotionHistoryDto>> GetHistoryAsync(PromotionHistoryQuery query);
        Task<RollbackResponse> RollbackAsync(RollbackPromotionRequest request, string performedBy = "System");
        Task<PromotionHistoryDto?> PromoteSingleStudentAsync(int studentId, PromoteSingleStudentRequest request, string performedBy = "System");
        Task<AllocationResponse> AllocateGroupAsync(GroupAllocationRequest request);
        Task<AllocationResponse> AllocateProgramAsync(ProgramAllocationRequest request);
        Task<AllocationResponse> AllocateSectionAsync(SectionAllocationRequest request);
        Task<PromotionReportResponse> GetPromotionReportAsync(PromotionReportQuery query);
    }
}
