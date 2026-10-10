using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Repositories;

namespace CollegeManagement.API.Services
{
    public class GroupService : IGroupService
    {
        private readonly IGroupRepository _groupRepository;
        private readonly CollegeManagement.API.Services.Interfaces.ILookupCacheService _cache;

        public GroupService(IGroupRepository groupRepository, CollegeManagement.API.Services.Interfaces.ILookupCacheService cache)
        {
            _groupRepository = groupRepository;
            _cache = cache;
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
            if (string.IsNullOrWhiteSpace(search))
            {
                string key = $"lookup:groups:all:{boardId}:{academicYearId}:{academicLevelId}:{isActive}";
                return _cache.GetOrCreateAsync(key, () => _groupRepository.GetAllAsync(
                    search,
                    boardId,
                    academicYearId,
                    academicLevelId,
                    isActive));
            }

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
            return _cache.GetOrCreateAsync($"lookup:groups:board:{boardId}", () => _groupRepository.GetByBoardAsync(boardId));
        }

        // =========================================================
        // CREATE GROUP
        // =========================================================

        public async Task<GroupResponse> CreateAsync(
            CreateGroupRequest request)
        {
            var res = await _groupRepository.CreateAsync(request);
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // UPDATE GROUP
        // =========================================================

        public async Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request)
        {
            var res = await _groupRepository.UpdateAsync(groupId, request);
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // DELETE GROUP
        // =========================================================

        public async Task<bool> DeleteAsync(
            int groupId)
        {
            var res = await _groupRepository.DeleteAsync(groupId);
            if (res) _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE
        // =========================================================

        public async Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true)
        {
            var res = await _groupRepository.ActivateAsync(groupId, isActive);
            _cache.RemoveByPrefix("lookup:groups");
            return res;
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