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

        public async Task<IEnumerable<PeriodStructureListItemDto>> GetAllAsync()
        {
            return await Connection.QueryAsync<PeriodStructureListItemDto>(
                "sp_GetPeriodStructures",
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
            foreach (var item in items)
            {
                await Connection.ExecuteAsync(
                    "sp_CreatePeriodStructureItem",
                    new
                    {
                        p_PeriodStructureId = structureId,
                        p_SequenceOrder = item.SequenceOrder,
                        p_ItemType = item.ItemType,
                        p_PeriodNumber = item.PeriodNumber,
                        p_BreakTypeId = item.BreakTypeId,
                        p_DurationMinutes = item.DurationMinutes,
                        p_Name = item.Name
                    },
                    commandType: CommandType.StoredProcedure);
            }
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

        public async Task<PeriodStructure?> GetActiveByContextAsync(int boardId, int academicLevelId, int academicYearId, int? groupId)
        {
            return await Connection.QueryFirstOrDefaultAsync<PeriodStructure>(
                "sp_GetActivePeriodStructureByContext",
                new
                {
                    p_BoardId = boardId,
                    p_AcademicLevelId = academicLevelId,
                    p_AcademicYearId = academicYearId,
                    p_GroupId = groupId
                },
                commandType: CommandType.StoredProcedure);
        }
    }
}