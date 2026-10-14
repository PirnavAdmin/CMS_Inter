using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStaffReimbursementRepository
    {
        Task<StaffReimbursement> CreateAsync(StaffReimbursement reimbursement);
        Task<StaffReimbursement?> GetByIdAsync(int id);
        Task<IEnumerable<StaffReimbursement>> GetAllAsync(int? campusId = null, string? status = null, int? staffId = null);
        Task<bool> UpdateAsync(StaffReimbursement reimbursement);
        Task<bool> DeleteAsync(int id);
        Task<int> GetCountByStatusAsync(string status, int? campusId = null);
        Task<decimal> GetTotalAmountPaidThisMonthAsync(int? campusId = null);
        Task<decimal> GetTotalAmountPendingAsync(int? campusId = null);
    }
}
