using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ISectionRollAllocationService
    {
        Task<SectionAllocationPreviewResponse> PreviewSectionAllocationAsync(
            SectionRollAllocationFilterRequest request,
            CancellationToken cancellationToken = default);

        Task<int> ConfirmSectionAllocationAsync(
            ConfirmSectionAllocationRequest request,
            CancellationToken cancellationToken = default);

        Task<RollNumberAllocationPreviewResponse> PreviewRollNumberAllocationAsync(
            SectionRollAllocationFilterRequest request,
            CancellationToken cancellationToken = default);

        Task<int> ConfirmRollNumberAllocationAsync(
            ConfirmRollNumberAllocationRequest request,
            CancellationToken cancellationToken = default);

        Task<object> UpdateAllocationAsync(
            int studentId,
            UpdateStudentAllocationRequest request,
            CancellationToken cancellationToken = default);
    }
}
