using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffReimbursementRepository : IStaffReimbursementRepository
    {
        private readonly AppDbContext _context;

        public StaffReimbursementRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<StaffReimbursement> CreateAsync(StaffReimbursement reimbursement)
        {
            _context.StaffReimbursements.Add(reimbursement);
            await _context.SaveChangesAsync();
            return reimbursement;
        }

        public async Task<StaffReimbursement?> GetByIdAsync(int id)
        {
            return await _context.StaffReimbursements
                .Include(r => r.Staff)
                .ThenInclude(s => s.Designation)
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        }

        public async Task<IEnumerable<StaffReimbursement>> GetAllAsync(int? campusId = null, string? status = null, int? staffId = null)
        {
            var query = _context.StaffReimbursements
                .Include(r => r.Staff)
                .ThenInclude(s => s.Designation)
                .Where(r => !r.IsDeleted)
                .AsQueryable();

            if (campusId.HasValue)
            {
                query = query.Where(r => r.CampusId == campusId.Value);
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(r => r.Status == status);
            }

            if (staffId.HasValue)
            {
                query = query.Where(r => r.StaffId == staffId.Value);
            }

            return await query.OrderByDescending(r => r.SubmittedAt).ToListAsync();
        }

        public async Task<bool> UpdateAsync(StaffReimbursement reimbursement)
        {
            reimbursement.UpdatedAt = DateTime.UtcNow;
            _context.StaffReimbursements.Update(reimbursement);
            var result = await _context.SaveChangesAsync();
            return result > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var reimbursement = await _context.StaffReimbursements.FindAsync(id);
            if (reimbursement == null || reimbursement.IsDeleted)
            {
                return false;
            }

            reimbursement.IsDeleted = true;
            reimbursement.UpdatedAt = DateTime.UtcNow;
            _context.StaffReimbursements.Update(reimbursement);
            var result = await _context.SaveChangesAsync();
            return result > 0;
        }

        public async Task<int> GetCountByStatusAsync(string status, int? campusId = null)
        {
            var query = _context.StaffReimbursements.Where(r => !r.IsDeleted && r.Status == status);
            if (campusId.HasValue)
            {
                query = query.Where(r => r.CampusId == campusId.Value);
            }
            return await query.CountAsync();
        }

        public async Task<decimal> GetTotalAmountPaidThisMonthAsync(int? campusId = null)
        {
            var now = DateTime.UtcNow;
            var query = _context.StaffReimbursements
                .Where(r => !r.IsDeleted && r.Status == "Paid" && r.PaidAt.HasValue && r.PaidAt.Value.Month == now.Month && r.PaidAt.Value.Year == now.Year);
            
            if (campusId.HasValue)
            {
                query = query.Where(r => r.CampusId == campusId.Value);
            }

            return await query.SumAsync(r => r.ApprovedAmount ?? 0);
        }

        public async Task<decimal> GetTotalAmountPendingAsync(int? campusId = null)
        {
            var query = _context.StaffReimbursements
                .Where(r => !r.IsDeleted && (r.Status == "Pending" || r.Status == "AdminVerified"));
            
            if (campusId.HasValue)
            {
                query = query.Where(r => r.CampusId == campusId.Value);
            }

            return await query.SumAsync(r => r.ClaimedAmount);
        }
    }
}
