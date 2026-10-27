using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services
{
    public class GroupService : IGroupService
    {
        private readonly IGroupRepository _groupRepository;
        private readonly ILookupCacheService _cache;

        public GroupService(IGroupRepository groupRepository, ILookupCacheService cache)
        {
            _groupRepository = groupRepository;
            _cache = cache;
        }

        // =========================================================
        // GET ALL GROUPS
        // =========================================================

        public Task<List<GroupListItemDto>> GetAllAsync(
            string? search = null,
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            bool? isActive = null,
            int? masterGroupId = null)
        {
            if (string.IsNullOrWhiteSpace(search) && !masterGroupId.HasValue)
            {
                string key = $"lookup:groups:all:{boardId}:{academicYearId}:{academicLevelId}:{isActive}";
                return _cache.GetOrCreateAsync(key, () => _groupRepository.GetAllAsync(
                    search,
                    boardId,
                    academicYearId,
                    academicLevelId,
                    isActive,
                    masterGroupId));
            }

            return _groupRepository.GetAllAsync(
                search,
                boardId,
                academicYearId,
                academicLevelId,
                isActive,
                masterGroupId);
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
            int boardId,
            int? academicYearId = null,
            int? academicLevelId = null)
        {
            if (!academicYearId.HasValue && !academicLevelId.HasValue)
            {
                return _cache.GetOrCreateAsync($"lookup:groups:board:{boardId}", () => _groupRepository.GetByBoardAsync(boardId, null, null));
            }

            return _groupRepository.GetByBoardAsync(boardId, academicYearId, academicLevelId);
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
        // ACTIVATE / DEACTIVATE GROUP
        // =========================================================

        public async Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true)
        {
            var res = await _groupRepository.ActivateAsync(
                groupId,
                isActive);
            if (res) _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // GROUP CODE VALIDATION
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
        // STUDENTS OF GROUP
        // =========================================================

        public Task<List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(
                int groupId)
        {
            return _groupRepository.GetStudentsAsync(
                groupId);
        }

        // =========================================================
        // SUBJECTS OF GROUP
        // =========================================================

        public Task<List<CollegeManagement.API.Models.Subject>>
            GetSubjectsAsync(
                int groupId)
        {
            return _groupRepository.GetSubjectsAsync(
                groupId);
        }

        // =========================================================
        // GROUP SUMMARY
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
            GetDropdownAsync(
                int? boardId = null,
                int? academicYearId = null,
                int? academicLevelId = null)
        {
            return _groupRepository.GetDropdownAsync(boardId, academicYearId, academicLevelId);
        }

        // =========================================================
        // GET PROGRAMS BY GROUP
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
