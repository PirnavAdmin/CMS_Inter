using CollegeManagement.API.DTOs;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ISectionRollAllocationRepository
    {
        // =====================================================
        // SECTION ALLOCATION
        // =====================================================

        Task<SectionAllocationPreviewResponse>
            PreviewSectionAllocationAsync(
                SectionRollAllocationFilterRequest request);

        Task<int>
            ConfirmSectionAllocationAsync(
                ConfirmSectionAllocationRequest request);


        // =====================================================
        // ROLL NUMBER ALLOCATION
        // =====================================================

        Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request);

        Task<int>
            ConfirmRollNumberAllocationAsync(
                ConfirmRollNumberAllocationRequest request);

        // =====================================================
        // UPDATE STUDENT ALLOCATION
        // =====================================================

        Task<object>
            UpdateAllocationAsync(
                int studentId,
                UpdateStudentAllocationRequest request);
    }
}