using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ISectionRollAllocationRepository
    {
        // =====================================================
        // SECTION ALLOCATION
        // =====================================================

        Task<SectionAllocationPreviewResponse> PreviewSectionAllocationAsync(
            SectionRollAllocationFilterRequest request,
            CancellationToken cancellationToken = default);

        Task<int> ConfirmSectionAllocationAsync(
            ConfirmSectionAllocationRequest request,
            CancellationToken cancellationToken = default);

        // =====================================================
        // ROLL NUMBER ALLOCATION
        // =====================================================

        Task<RollNumberAllocationPreviewResponse> PreviewRollNumberAllocationAsync(
            SectionRollAllocationFilterRequest request,
            CancellationToken cancellationToken = default);

        Task<int> ConfirmRollNumberAllocationAsync(
            ConfirmRollNumberAllocationRequest request,
            CancellationToken cancellationToken = default);

        Task<(string Year, string Board, string BoardCode, string Level, string LevelCode, string Group, string GroupCode, string Program)> GetContextMetadataAsync(
            int? ayId,
            int? boardId,
            int? levelId,
            int? groupId,
            int? programId,
            CancellationToken cancellationToken = default);

        Task<int> SaveRollNumberAllocationsAsync(
            List<RollNumberPreviewStudentDto> allocations,
            CancellationToken cancellationToken = default);

        // =====================================================
        // UPDATE STUDENT ALLOCATION
        // =====================================================

        Task<object> UpdateAllocationAsync(
            int studentId,
            UpdateStudentAllocationRequest request,
            CancellationToken cancellationToken = default);
    }
}
