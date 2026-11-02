using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class FineRuleRepository : IFineRuleRepository
    {
        private readonly AppDbContext _context;

        public FineRuleRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection()
        {
            return _context.Database.GetDbConnection();
        }

        public async Task<FineRule> CreateAsync(FineRule fineRule)
        {
            var c = Connection();
            var created = await c.QueryFirstOrDefaultAsync<FineRule>(
                "sp_FineRule_Create",
                new
                {
                    p_FineRuleName = fineRule.FineRuleName,
                    p_ApplicableFeeId = fineRule.ApplicableFeeId,
                    p_FineType = fineRule.FineType,
                    p_FineAmount = fineRule.FineAmount,
                    p_GracePeriod = fineRule.GracePeriod,
                    p_Status = fineRule.Status,
                    p_CampusId = fineRule.CampusId,
                    p_BoardId = fineRule.BoardId,
                    p_AcademicYearId = fineRule.AcademicYearId
                },
                commandType: CommandType.StoredProcedure);

            return created ?? fineRule;
        }

        public async Task<IEnumerable<FineRule>> GetAllAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            var c = Connection();
            return await c.QueryAsync<FineRule, FeeType, FineRule>(
                "sp_FineRule_GetAll",
                (rule, fee) =>
                {
                    rule.ApplicableFee = fee;
                    return rule;
                },
                new
                {
                    p_CampusId = campusId ?? 0,
                    p_BoardId = boardId ?? 0,
                    p_AcademicYearId = academicYearId ?? 0
                },
                splitOn: "FeeTypeId",
                commandType: CommandType.StoredProcedure);
        }

        public async Task<FineRule?> GetByIdAsync(int id)
        {
            var c = Connection();
            var results = await c.QueryAsync<FineRule, FeeType, FineRule>(
                "sp_FineRule_GetById",
                (rule, fee) =>
                {
                    rule.ApplicableFee = fee;
                    return rule;
                },
                new { p_FineRuleId = id },
                splitOn: "FeeTypeId",
                commandType: CommandType.StoredProcedure);

            return System.Linq.Enumerable.FirstOrDefault(results);
        }

        public async Task<bool> UpdateAsync(FineRule fineRule)
        {
            var c = Connection();
            int rows = await c.ExecuteAsync(
                "sp_FineRule_Update",
                new
                {
                    p_FineRuleId = fineRule.FineRuleId,
                    p_FineRuleName = fineRule.FineRuleName,
                    p_ApplicableFeeId = fineRule.ApplicableFeeId,
                    p_FineType = fineRule.FineType,
                    p_FineAmount = fineRule.FineAmount,
                    p_GracePeriod = fineRule.GracePeriod,
                    p_Status = fineRule.Status,
                    p_CampusId = fineRule.CampusId,
                    p_BoardId = fineRule.BoardId,
                    p_AcademicYearId = fineRule.AcademicYearId
                },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var c = Connection();
            int rows = await c.ExecuteAsync(
                "sp_FineRule_Delete",
                new { p_FineRuleId = id },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
    }
}
