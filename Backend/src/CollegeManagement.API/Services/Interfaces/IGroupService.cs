using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Groups;

namespace CollegeManagement.API.Services
{
    public interface IGroupService
    {
        Task<List<GroupListItemDto>> GetAllAsync(
            string? search = null,
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            bool? isActive = null,
            int? masterGroupId = null,
            CancellationToken cancellationToken = default);

        Task<GroupResponse?> GetByIdAsync(
            int groupId,
            CancellationToken cancellationToken = default);

        Task<List<GroupListItemDto>> GetByBoardAsync(
            int boardId,
            int? academicYearId = null,
            int? academicLevelId = null,
            CancellationToken cancellationToken = default);

        Task<GroupResponse> CreateAsync(
            CreateGroupRequest request,
            CancellationToken cancellationToken = default);

        Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request,
            CancellationToken cancellationToken = default);

        Task<bool> DeleteAsync(
            int groupId,
            CancellationToken cancellationToken = default);

        Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true,
            CancellationToken cancellationToken = default);

        Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? boardId = null,
            int? excludeGroupId = null,
            CancellationToken cancellationToken = default);

        Task<List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(
                int groupId,
                CancellationToken cancellationToken = default);

        Task<List<CollegeManagement.API.Models.Subject>>
            GetSubjectsAsync(
                int groupId,
                CancellationToken cancellationToken = default);

        Task<GroupSummaryDto?> GetSummaryAsync(
            int groupId,
            CancellationToken cancellationToken = default);

        Task<List<GroupDropdownDto>>
            GetDropdownAsync(
                int? boardId = null,
                int? academicYearId = null,
                int? academicLevelId = null,
                CancellationToken cancellationToken = default);

        Task<List<CollegeManagement.API.DTOs.Program.GroupProgramDto>>
            GetProgramsAsync(
                int groupId,
                CancellationToken cancellationToken = default);

        Task<bool> UpdateProgramsAsync(
            int groupId,
            List<int> programIds,
            CancellationToken cancellationToken = default);
    }
}
