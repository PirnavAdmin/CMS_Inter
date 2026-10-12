using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Reimbursement;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces.Reimbursement
{
    public interface IReimbursementService
    {
        Task<CreateClaimResponseDto> CreateClaimAsync(CreateReimbursementClaimRequest request);
        Task<IEnumerable<ReimbursementClaimDto>> GetAllClaimsAsync(int? campusId, string? status, string? category, string? search);
        Task<IEnumerable<ReimbursementClaimDto>> GetMyClaimsAsync(int staffId, int? campusId);
        Task<ReimbursementClaimDto?> GetClaimByIdAsync(int id);
        Task<ReimbursementSummaryDto> GetSummaryAsync(int? campusId);
        Task<(bool Success, string? AccountRef)> VerifyClaimAsync(int id, VerifyClaimRequest request, int reviewedBy);
        Task<bool> RequestClarificationAsync(int id, RequestClarificationRequest request, int reviewedBy);
        Task<bool> RejectClaimAsync(int id, RejectClaimRequest request, int reviewedBy);
        Task<bool> MarkPaidAsync(int id, MarkPaidClaimRequest request, int paidBy);
        Task<string> UploadProofAsync(int id, IFormFile file);
        Task<IEnumerable<AccountEntryDto>> GetAccountEntriesAsync(int? campusId);
    }
}
