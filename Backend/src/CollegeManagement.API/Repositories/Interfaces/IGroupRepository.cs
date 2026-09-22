using CollegeManagement.API.DTOs.Groups;

namespace CollegeManagement.API.Repositories
{
    public interface IGroupRepository
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
        // Includes Programs assigned to the Group
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
        // ProgramIds from CreateGroupRequest are handled here
        // =========================================================

        Task<GroupResponse> CreateAsync(
            CreateGroupRequest request);

        // =========================================================
        // UPDATE GROUP
        // ProgramIds from UpdateGroupRequest are handled here
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
        // ACTIVATE / DEACTIVATE GROUP
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
        // STUDENTS OF GROUP
        // =========================================================

        Task<List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(
                int groupId);

        // =========================================================
        // SUBJECTS OF GROUP
        // =========================================================

        Task<List<CollegeManagement.API.Models.Subject>>
            GetSubjectsAsync(
                int groupId);

        // =========================================================
        // GROUP SUMMARY
        // =========================================================

        Task<GroupSummaryDto?> GetSummaryAsync(
            int groupId);

        // =========================================================
        // GROUP DROPDOWN
        // =========================================================

        Task<List<GroupDropdownDto>>
            GetDropdownAsync();

        // =========================================================
        // PROGRAMS ASSIGNED TO GROUP
        // =========================================================
        //
        // Example:
        //
        // MPC
        //  ├── Regular
        //  ├── JEE
        //  └── EAPCET
        //
        // This reads from GroupPrograms.
        // =========================================================

        Task<List<CollegeManagement.API.DTOs.Program.GroupProgramDto>>
            GetProgramsAsync(
                int groupId);
    }
}