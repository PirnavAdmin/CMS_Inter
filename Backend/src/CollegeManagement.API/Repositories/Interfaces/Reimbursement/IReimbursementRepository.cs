using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Reimbursement;

namespace CollegeManagement.API.Repositories.Interfaces.Reimbursement
{
    public interface IReimbursementRepository
    {
        Task<CreateClaimResponseDto> CreateClaimAsync(CreateReimbursementClaimRequest request);
        Task<IEnumerable<ReimbursementClaimDto>> GetAllClaimsAsync(int? campusId, string? status, string? category, string? search);
        Task<IEnumerable<ReimbursementClaimDto>> GetMyClaimsAsync(int staffId, int? campusId);
        Task<ReimbursementClaimDto?> GetClaimByIdAsync(int id);
        Task<ReimbursementSummaryDto> GetSummaryAsync(int? campusId);
        Task<(bool Success, string? AccountRef)> VerifyClaimAsync(int id, decimal? approvedAmount, string? reviewNotes, int reviewedBy);
        Task<bool> RequestClarificationAsync(int id, string? notes, int reviewedBy);
        Task<bool> RejectClaimAsync(int id, string? rejectNotes, int reviewedBy);
        Task<bool> MarkPaidAsync(int id, string? paymentReference, int paidBy);
        Task<bool> UploadProofAsync(int id, string receiptUrl);
        Task<IEnumerable<AccountEntryDto>> GetAccountEntriesAsync(int? campusId);
    }
}
