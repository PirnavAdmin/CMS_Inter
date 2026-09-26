using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class PeriodStructureRepository : IPeriodStructureRepository
    {
        private readonly AppDbContext _context;

        public PeriodStructureRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<PeriodStructureListItemDto>> GetAllAsync(int? campusId = null)
        {
            return await Connection.QueryAsync<PeriodStructureListItemDto>(
                "sp_GetPeriodStructures",
                new { p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<PeriodStructure?> GetByIdAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<PeriodStructure>(
                "sp_GetPeriodStructureById",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<PeriodStructure> AddAsync(PeriodStructure structure)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "sp_CreatePeriodStructure",
                new
                {
                    p_CampusId = structure.CampusId,
                    p_Name = structure.Name,
                    p_DayStartTime = structure.DayStartTime,
                    p_PeriodDurationMinutes = structure.PeriodDurationMinutes,
                    p_TotalTeachingPeriods = structure.TotalTeachingPeriods,
                    p_IsActive = structure.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);

            structure.Id = id;
            return structure;
        }

        public async Task UpdateAsync(PeriodStructure structure)
        {
            await Connection.ExecuteAsync(
                "sp_UpdatePeriodStructure",
                new
                {
                    p_Id = structure.Id,
                    p_CampusId = structure.CampusId,
                    p_Name = structure.Name,
                    p_DayStartTime = structure.DayStartTime,
                    p_PeriodDurationMinutes = structure.PeriodDurationMinutes,
                    p_TotalTeachingPeriods = structure.TotalTeachingPeriods,
                    p_IsActive = structure.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> IsStructureReferencedInTimetablesAsync(int structureId)
        {
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckStructureTimetableReferences",
                new { p_Id = structureId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task DeleteAsync(int id)
        {
            await Connection.ExecuteAsync(
                "sp_DeletePeriodStructure",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<PeriodStructureItemDto>> GetItemsByStructureIdAsync(int structureId)
        {
            return await Connection.QueryAsync<PeriodStructureItemDto>(
                "sp_GetPeriodStructureItems",
                new { p_PeriodStructureId = structureId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task AddItemsAsync(int structureId, IEnumerable<PeriodStructureItem> items)
        {
            var itemList = items?.ToList();
            if (itemList == null || itemList.Count == 0) return;

            var sb = new System.Text.StringBuilder();
            var p = new DynamicParameters();
            sb.Append("INSERT INTO `PeriodStructureItems` (`PeriodStructureId`, `SequenceOrder`, `ItemType`, `PeriodNumber`, `BreakTypeId`, `DurationMinutes`, `Name`) VALUES ");
            for (int i = 0; i < itemList.Count; i++)
            {
                if (i > 0) sb.Append(", ");
                sb.Append($"(@strId{i}, @seq{i}, @type{i}, @pNum{i}, @btId{i}, @dur{i}, @name{i})");
                var it = itemList[i];
                p.Add($"strId{i}", structureId);
                p.Add($"seq{i}", it.SequenceOrder);
                p.Add($"type{i}", it.ItemType);
                p.Add($"pNum{i}", it.PeriodNumber);
                p.Add($"btId{i}", it.BreakTypeId);
                p.Add($"dur{i}", it.DurationMinutes);
                p.Add($"name{i}", it.Name);
            }
            sb.Append(";");
            await Connection.ExecuteAsync(sb.ToString(), p);
        }

        public async Task DeleteItemsByStructureIdAsync(int structureId)
        {
            await Connection.ExecuteAsync(
                "sp_DeletePeriodStructureItems",
                new { p_PeriodStructureId = structureId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> AssignAsync(PeriodStructureAssignment assignment)
        {
            return await Connection.ExecuteScalarAsync<int>(
                "sp_AssignPeriodStructure",
                new
                {
                    p_CampusId = assignment.CampusId,
                    p_PeriodStructureId = assignment.PeriodStructureId,
                    p_BoardId = assignment.BoardId,
                    p_AcademicLevelId = assignment.AcademicLevelId,
                    p_AcademicYearId = assignment.AcademicYearId,
                    p_GroupId = assignment.GroupId,
                    p_IsActive = assignment.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<PeriodStructureAssignmentResponseDto>> GetAssignmentsByStructureIdAsync(int structureId)
        {
            return await Connection.QueryAsync<PeriodStructureAssignmentResponseDto>(
                "sp_GetPeriodStructureAssignments",
                new { p_PeriodStructureId = structureId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<PeriodStructure?> GetActiveByContextAsync(int boardId, int academicLevelId, int academicYearId, int? groupId, int? campusId = null)
        {
            return await Connection.QueryFirstOrDefaultAsync<PeriodStructure>(
                "sp_GetActivePeriodStructureByContext",
                new
                {
                    p_BoardId = boardId,
                    p_AcademicLevelId = academicLevelId,
                    p_AcademicYearId = academicYearId,
                    p_GroupId = groupId,
                    p_CampusId = campusId
                },
                commandType: CommandType.StoredProcedure);
        }
    }
}