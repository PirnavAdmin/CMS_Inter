using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class PeriodRepository : IPeriodRepository
    {
        private readonly AppDbContext _context;

        public PeriodRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<Period>> GetAllAsync()
        {
            return await Connection.QueryAsync<Period>(
                "sp_GetPeriods",
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Period?> GetByIdAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<Period>(
                "sp_GetPeriodById",
                new { p_PeriodId = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<Period>> GetByStructureIdAsync(int periodStructureId)
        {
            return await Connection.QueryAsync<Period>(
                "sp_GetPeriodsByStructureId",
                new { p_PeriodStructureId = periodStructureId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<Period>> GetByContextAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId)
        {
            return await Connection.QueryAsync<Period>(
                "sp_GetPeriodsByContext",
                new
                {
                    p_BoardId = boardId,
                    p_AcademicLevelId = academicLevelId,
                    p_AcademicYearId = academicYearId,
                    p_GroupId = groupId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Period> AddAsync(Period period)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "sp_CreatePeriod",
                new
                {
                    p_PeriodStructureId = period.PeriodStructureId,
                    p_PeriodName = period.PeriodName,
                    p_StartTime = period.StartTime,
                    p_EndTime = period.EndTime,
                    p_DisplayOrder = period.DisplayOrder,
                    p_IsBreak = period.IsBreak ? 1 : 0,
                    p_IsActive = period.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);

            period.PeriodId = id;
            return period;
        }

        public async Task UpdateAsync(Period period)
        {
            await Connection.ExecuteAsync(
                "sp_UpdatePeriod",
                new
                {
                    p_PeriodId = period.PeriodId,
                    p_PeriodStructureId = period.PeriodStructureId,
                    p_PeriodName = period.PeriodName,
                    p_StartTime = period.StartTime,
                    p_EndTime = period.EndTime,
                    p_DisplayOrder = period.DisplayOrder,
                    p_IsBreak = period.IsBreak ? 1 : 0,
                    p_IsActive = period.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task DeleteAsync(int id)
        {
            await Connection.ExecuteAsync(
                "sp_DeletePeriod",
                new { p_PeriodId = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task DeleteByStructureIdAsync(int periodStructureId)
        {
            await Connection.ExecuteAsync(
                "sp_DeletePeriodsByStructureId",
                new { p_PeriodStructureId = periodStructureId },
                commandType: CommandType.StoredProcedure);
        }
    }
}