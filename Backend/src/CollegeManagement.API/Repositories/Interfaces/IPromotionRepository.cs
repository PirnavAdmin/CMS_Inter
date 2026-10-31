using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotion;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IPromotionRepository
    {
        Task<IEnumerable<EligibleStudentDto>> GetEligibleStudentsAsync(PromotionEligibilityQuery query, CancellationToken cancellationToken = default);
        Task<PromotionPreviewResponse> PreviewAsync(PromotionPreviewRequest request, CancellationToken cancellationToken = default);
        Task<PromotionExecutionResponse> PromoteStudentsAsync(PromoteStudentsRequest request, string performedBy = "System", CancellationToken cancellationToken = default);
        Task<IEnumerable<PromotionHistoryDto>> GetHistoryAsync(PromotionHistoryQuery query, CancellationToken cancellationToken = default);
        Task<RollbackResponse> RollbackAsync(RollbackPromotionRequest request, string performedBy = "System", CancellationToken cancellationToken = default);
        Task<PromotionHistoryDto?> PromoteSingleStudentAsync(int studentId, PromoteSingleStudentRequest request, string performedBy = "System", CancellationToken cancellationToken = default);
        Task<AllocationResponse> AllocateGroupAsync(GroupAllocationRequest request, CancellationToken cancellationToken = default);
        Task<AllocationResponse> AllocateProgramAsync(ProgramAllocationRequest request, CancellationToken cancellationToken = default);
        Task<AllocationResponse> AllocateSectionAsync(SectionAllocationRequest request, CancellationToken cancellationToken = default);
        Task<PromotionReportResponse> GetPromotionReportAsync(PromotionReportQuery query, CancellationToken cancellationToken = default);
    }
}
