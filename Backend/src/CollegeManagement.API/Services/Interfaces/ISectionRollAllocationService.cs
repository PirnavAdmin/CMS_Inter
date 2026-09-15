using CollegeManagement.API.DTOs;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ISectionRollAllocationService
    {
        Task<SectionAllocationPreviewResponse>
            PreviewSectionAllocationAsync(
                SectionRollAllocationFilterRequest request);

        Task<int>
            ConfirmSectionAllocationAsync(
                ConfirmSectionAllocationRequest request);


        Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request);

        Task<int>
            ConfirmRollNumberAllocationAsync(
                ConfirmRollNumberAllocationRequest request);


        // =========================================================
        // UPDATE STUDENT ALLOCATION
        // =========================================================

        Task<object>
            UpdateAllocationAsync(
                int studentId,
                UpdateStudentAllocationRequest request);


    }
}