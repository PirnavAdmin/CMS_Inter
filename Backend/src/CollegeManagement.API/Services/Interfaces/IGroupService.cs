using CollegeManagement.API.DTOs.Groups;

namespace CollegeManagement.API.Services
{
    public interface IGroupService
    {
        // =========================================================
        // GROUP LIST
        // =========================================================

        Task<List<GroupListItemDto>> GetAllAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            bool? isActive);

        // =========================================================
        // GROUP DETAILS
        // =========================================================

        Task<GroupResponse?> GetByIdAsync(
            int groupId);

        // =========================================================
        // GROUPS BY BOARD
        // =========================================================

        Task<List<GroupListItemDto>> GetByBoardAsync(
            int boardId);

        // =========================================================
        // CREATE GROUP
        // =========================================================

        Task<GroupResponse> CreateAsync(
            CreateGroupRequest request);

        // =========================================================
        // UPDATE GROUP
        // =========================================================

        Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request);

        // =========================================================
        // DELETE GROUP
        // =========================================================

        Task<bool> DeleteAsync(
            int groupId);

        // =========================================================
        // ACTIVATE / DEACTIVATE
        // =========================================================

        Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true);

        // =========================================================
        // GROUP CODE VALIDATION
        // =========================================================

        Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null);

        // =========================================================
        // STUDENTS
        // =========================================================

        Task<List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(
                int groupId);

        // =========================================================
        // SUBJECTS
        // =========================================================

        Task<List<CollegeManagement.API.Models.Subject>>
            GetSubjectsAsync(
                int groupId);

        // =========================================================
        // GROUP SUMMARY
        // =========================================================

        Task<GroupSummaryDto?>
            GetSummaryAsync(
                int groupId);

        // =========================================================
        // GROUP DROPDOWN
        // =========================================================

        Task<List<GroupDropdownDto>>
            GetDropdownAsync();

        // =========================================================
        // PROGRAMS BY GROUP
        // =========================================================
        //
        // Example:
        //
        // MPC
        //   ├── Regular
        //   ├── JEE
        //   └── EAPCET
        //
        // =========================================================

        Task<List<CollegeManagement.API.DTOs.Program.GroupProgramDto>>
            GetProgramsAsync(
                int groupId);
    }
}