using System.Collections.Generic;
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
            int? masterGroupId = null);

        Task<GroupResponse?> GetByIdAsync(
            int groupId);

        Task<List<GroupListItemDto>> GetByBoardAsync(
            int boardId,
            int? academicYearId = null,
            int? academicLevelId = null);

        Task<GroupResponse> CreateAsync(
            CreateGroupRequest request);

        Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request);

        Task<bool> DeleteAsync(
            int groupId);

        Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true);

        Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null);

        Task<List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(
                int groupId);

        Task<List<CollegeManagement.API.Models.Subject>>
            GetSubjectsAsync(
                int groupId);

        Task<GroupSummaryDto?> GetSummaryAsync(
            int groupId);

        Task<List<GroupDropdownDto>>
            GetDropdownAsync(
                int? boardId = null,
                int? academicYearId = null,
                int? academicLevelId = null);

        Task<List<CollegeManagement.API.DTOs.Program.GroupProgramDto>>
            GetProgramsAsync(
                int groupId);
    }
}
