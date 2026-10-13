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

        Task<int> ConfirmRollNumberAllocationAsync(ConfirmRollNumberAllocationRequest request); Task<(string Year, string Board, string BoardCode, string Level, string LevelCode, string Group, string GroupCode, string Program)> GetContextMetadataAsync(int? ayId, int? boardId, int? levelId, int? groupId, int? programId);
        Task<int> SaveRollNumberAllocationsAsync(List<RollNumberPreviewStudentDto> allocations);

        // =====================================================
        // UPDATE STUDENT ALLOCATION
        // =====================================================

        Task<object>
            UpdateAllocationAsync(
                int studentId,
                UpdateStudentAllocationRequest request);
    }
}
