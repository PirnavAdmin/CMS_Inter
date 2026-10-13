using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff.Reimbursement;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStaffReimbursementService
    {
        Task<ReimbursementDto> CreateReimbursementAsync(CreateReimbursementRequest request);
        Task<ReimbursementDto?> GetReimbursementByIdAsync(int id);
        Task<IEnumerable<ReimbursementDto>> GetAllReimbursementsAsync(int? campusId = null, string? status = null, int? staffId = null);
        Task<ReimbursementSummaryDto> GetReimbursementSummaryAsync(int? campusId = null);
        
        Task<bool> VerifyReimbursementAsync(int id, AdminVerifyReimbursementRequest request, int adminId);
        Task<bool> RejectReimbursementAsync(int id, AdminRejectReimbursementRequest request, int adminId);
        Task<bool> ApproveReimbursementAsync(int id, AccountantProcessRequest request, int accountantId);
        Task<bool> MarkReimbursementAsPaidAsync(int id, MarkPaidReimbursementRequest request, int accountantId);
        
        Task<string> UploadProofDocumentAsync(int id, IFormFile file);
    }
}
