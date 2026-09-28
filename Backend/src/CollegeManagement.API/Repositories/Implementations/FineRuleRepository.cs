using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Repositories.Interfaces;
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

        public async Task<FineRule> CreateAsync(FineRule fineRule)
        {
            _context.FineRules.Add(fineRule);
            await _context.SaveChangesAsync();
            return fineRule;
        }

        public async Task<IEnumerable<FineRule>> GetAllAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            var query = _context.FineRules
                .Include(f => f.ApplicableFee)
                .AsNoTracking()
                .AsQueryable();

            if (campusId.HasValue && campusId.Value > 0)
                query = query.Where(f => f.CampusId == null || f.CampusId == campusId.Value);

            if (boardId.HasValue && boardId.Value > 0)
                query = query.Where(f => f.BoardId == null || f.BoardId == boardId.Value);

            if (academicYearId.HasValue && academicYearId.Value > 0)
                query = query.Where(f => f.AcademicYearId == null || f.AcademicYearId == academicYearId.Value);

            return await query.ToListAsync();
        }

        public async Task<FineRule?> GetByIdAsync(int id)
        {
            return await _context.FineRules
                .Include(f => f.ApplicableFee)
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.FineRuleId == id);
        }

        public async Task<bool> UpdateAsync(FineRule fineRule)
        {
            _context.FineRules.Update(fineRule);
            var rows = await _context.SaveChangesAsync();
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var fineRule = await _context.FineRules.FindAsync(id);
            if (fineRule == null) return false;

            fineRule.Status = "Inactive";
            var rows = await _context.SaveChangesAsync();
            return rows > 0;
        }
    }
}
