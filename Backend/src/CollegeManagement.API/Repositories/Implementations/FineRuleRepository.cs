using System.Collections.Generic;
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

        public async Task<IEnumerable<FineRule>> GetAllAsync()
        {
            return await _context.FineRules
                .Include(f => f.ApplicableFee)
                .AsNoTracking()
                .ToListAsync();
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
            var rule = await _context.FineRules.FindAsync(id);
            if (rule == null) return false;
            
            rule.Status = "Inactive";
            rule.UpdatedAt = System.DateTime.UtcNow;
            
            var rows = await _context.SaveChangesAsync();
            return rows > 0;
        }
    }
}
