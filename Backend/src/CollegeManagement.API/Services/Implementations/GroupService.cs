using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Repositories;

namespace CollegeManagement.API.Services
{
    public class GroupService : IGroupService
    {
        private readonly IGroupRepository _groupRepository;

        public GroupService(IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
        }

        // =========================================================
        // GET ALL GROUPS
        // =========================================================

        public Task<List<GroupListItemDto>> GetAllAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            bool? isActive)
        {
            return _groupRepository.GetAllAsync(
                search,
                boardId,
                academicYearId,
                academicLevelId,
                isActive);
        }

        // =========================================================
        // GET GROUP BY ID
        // =========================================================

        public Task<GroupResponse?> GetByIdAsync(
            int groupId)
        {
            return _groupRepository.GetByIdAsync(groupId);
        }

        // =========================================================
        // GET GROUPS BY BOARD
        // =========================================================

        public Task<List<GroupListItemDto>> GetByBoardAsync(
            int boardId)
        {
            return _groupRepository.GetByBoardAsync(
                boardId);
        }

        // =========================================================
        // CREATE GROUP
        // =========================================================

        public Task<GroupResponse> CreateAsync(
            CreateGroupRequest request)
        {
            return _groupRepository.CreateAsync(
                request);
        }

        // =========================================================
        // UPDATE GROUP
        // =========================================================

        public Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request)
        {
            return _groupRepository.UpdateAsync(
                groupId,
                request);
        }

        // =========================================================
        // DELETE GROUP
        // =========================================================

        public Task<bool> DeleteAsync(
            int groupId)
        {
            return _groupRepository.DeleteAsync(
                groupId);
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE
        // =========================================================

        public Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true)
        {
            return _groupRepository.ActivateAsync(
                groupId,
                isActive);
        }

        // =========================================================
        // GROUP CODE EXISTS
        // =========================================================

        public Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null)
        {
            return _groupRepository.GroupCodeExistsAsync(
                groupCode,
                excludeGroupId);
        }

        // =========================================================
        // GET STUDENTS
        // =========================================================

        public Task<List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(
                int groupId)
        {
            return _groupRepository.GetStudentsAsync(
                groupId);
        }

        // =========================================================
        // GET SUBJECTS
        // =========================================================

        public Task<List<CollegeManagement.API.Models.Subject>>
            GetSubjectsAsync(
                int groupId)
        {
            return _groupRepository.GetSubjectsAsync(
                groupId);
        }

        // =========================================================
        // GET GROUP SUMMARY
        // =========================================================

        public Task<GroupSummaryDto?>
            GetSummaryAsync(
                int groupId)
        {
            return _groupRepository.GetSummaryAsync(
                groupId);
        }

        // =========================================================
        // GET GROUP DROPDOWN
        // =========================================================

        public Task<List<GroupDropdownDto>>
            GetDropdownAsync()
        {
            return _groupRepository.GetDropdownAsync();
        }

        // =========================================================
        // GET PROGRAMS BY GROUP
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

        public Task<List<CollegeManagement.API.DTOs.Program.GroupProgramDto>>
            GetProgramsAsync(
                int groupId)
        {
            return _groupRepository.GetProgramsAsync(
                groupId);
        }
    }
}