using System.Collections.Generic;
using System.Threading;
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
            int? masterGroupId = null,
            CancellationToken cancellationToken = default)
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
                    masterGroupId,
                    cancellationToken));
            }

            return _groupRepository.GetAllAsync(
                search,
                boardId,
                academicYearId,
                academicLevelId,
                isActive,
                masterGroupId,
                cancellationToken);
        }

        // =========================================================
        // GET GROUP BY ID
        // =========================================================

        public Task<GroupResponse?> GetByIdAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            return _groupRepository.GetByIdAsync(groupId, cancellationToken);
        }

        // =========================================================
        // GET GROUPS BY BOARD
        // =========================================================

        public Task<List<GroupListItemDto>> GetByBoardAsync(
            int boardId,
            int? academicYearId = null,
            int? academicLevelId = null,
            CancellationToken cancellationToken = default)
        {
            if (!academicYearId.HasValue && !academicLevelId.HasValue)
            {
                return _cache.GetOrCreateAsync($"lookup:groups:board:{boardId}", () => _groupRepository.GetByBoardAsync(boardId, null, null, cancellationToken));
            }

            return _groupRepository.GetByBoardAsync(boardId, academicYearId, academicLevelId, cancellationToken);
        }

        // =========================================================
        // CREATE GROUP
        // =========================================================

        public async Task<GroupResponse> CreateAsync(
            CreateGroupRequest request,
            CancellationToken cancellationToken = default)
        {
            var res = await _groupRepository.CreateAsync(request, cancellationToken);
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // UPDATE GROUP
        // =========================================================

        public async Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request,
            CancellationToken cancellationToken = default)
        {
            var res = await _groupRepository.UpdateAsync(groupId, request, cancellationToken);
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // DELETE GROUP
        // =========================================================

        public async Task<bool> DeleteAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            var res = await _groupRepository.DeleteAsync(groupId, cancellationToken);
            if (res) _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE GROUP
        // =========================================================

        public async Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true,
            CancellationToken cancellationToken = default)
        {
            var res = await _groupRepository.ActivateAsync(
                groupId,
                isActive,
                cancellationToken);
            if (res) _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        // =========================================================
        // GROUP CODE VALIDATION
        // =========================================================

        public Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? boardId = null,
            int? excludeGroupId = null,
            CancellationToken cancellationToken = default)
        {
            return _groupRepository.GroupCodeExistsAsync(
                groupCode,
                boardId,
                excludeGroupId,
                cancellationToken);
        }

        // =========================================================
        // STUDENTS OF GROUP
        // =========================================================

        public Task<List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(
                int groupId,
                CancellationToken cancellationToken = default)
        {
            return _groupRepository.GetStudentsAsync(
                groupId,
                cancellationToken);
        }

        // =========================================================
        // SUBJECTS OF GROUP
        // =========================================================

        public Task<List<CollegeManagement.API.Models.Subject>>
            GetSubjectsAsync(
                int groupId,
                CancellationToken cancellationToken = default)
        {
            return _groupRepository.GetSubjectsAsync(
                groupId,
                cancellationToken);
        }

        // =========================================================
        // GROUP SUMMARY
        // =========================================================

        public Task<GroupSummaryDto?>
            GetSummaryAsync(
                int groupId,
                CancellationToken cancellationToken = default)
        {
            return _groupRepository.GetSummaryAsync(
                groupId,
                cancellationToken);
        }

        // =========================================================
        // GET GROUP DROPDOWN
        // =========================================================

        public Task<List<GroupDropdownDto>>
            GetDropdownAsync(
                int? boardId = null,
                int? academicYearId = null,
                int? academicLevelId = null,
                CancellationToken cancellationToken = default)
        {
            return _groupRepository.GetDropdownAsync(boardId, academicYearId, academicLevelId, cancellationToken);
        }

        // =========================================================
        // GET PROGRAMS BY GROUP
        // =========================================================

        public Task<List<CollegeManagement.API.DTOs.Program.GroupProgramDto>>
            GetProgramsAsync(
                int groupId,
                CancellationToken cancellationToken = default)
        {
            return _groupRepository.GetProgramsAsync(
                groupId,
                cancellationToken);
        }

        public async Task<bool> UpdateProgramsAsync(
            int groupId,
            List<int> programIds,
            CancellationToken cancellationToken = default)
        {
            var res = await _groupRepository.UpdateProgramsAsync(groupId, programIds, cancellationToken);
            if (res) _cache.RemoveByPrefix("lookup:groups");
            return res;
        }
    }
}
