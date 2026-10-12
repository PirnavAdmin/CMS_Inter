using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Reimbursement;
using CollegeManagement.API.Repositories.Interfaces.Reimbursement;
using CollegeManagement.API.Services.Interfaces.Reimbursement;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Implementations.Reimbursement
{
    public class ReimbursementService : IReimbursementService
    {
        private readonly IReimbursementRepository _repository;

        public ReimbursementService(IReimbursementRepository repository)
        {
            _repository = repository;
        }

        public async Task<CreateClaimResponseDto> CreateClaimAsync(CreateReimbursementClaimRequest request)
        {
            if (request.Amount <= 0)
            {
                throw new ArgumentException("Claim amount must be greater than zero.");
            }

            if (string.IsNullOrWhiteSpace(request.ExpenseCategory))
            {
                throw new ArgumentException("Expense category is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Purpose))
            {
                throw new ArgumentException("Purpose / description is required.");
            }

            return await _repository.CreateClaimAsync(request);
        }

        public async Task<IEnumerable<ReimbursementClaimDto>> GetAllClaimsAsync(int? campusId, string? status, string? category, string? search)
        {
            return await _repository.GetAllClaimsAsync(campusId, status, category, search);
        }

        public async Task<IEnumerable<ReimbursementClaimDto>> GetMyClaimsAsync(int staffId, int? campusId)
        {
            return await _repository.GetMyClaimsAsync(staffId, campusId);
        }

        public async Task<ReimbursementClaimDto?> GetClaimByIdAsync(int id)
        {
            var claim = await _repository.GetClaimByIdAsync(id);
            if (claim == null) return null;

            // Build activity audit timeline
            claim.AuditLog = BuildAuditLog(claim);
            return claim;
        }

        private List<ReimbursementAuditLogDto> BuildAuditLog(ReimbursementClaimDto claim)
        {
            var logs = new List<ReimbursementAuditLogDto>();

            // 1. Submitted Event
            logs.Add(new ReimbursementAuditLogDto
            {
                Id = $"LOG-{claim.ClaimNumber}-1",
                Action = "Submitted",
                Actor = claim.StaffName ?? "Claimant",
                Role = "Faculty Member",
                Timestamp = claim.SubmissionDate,
                Notes = !string.IsNullOrWhiteSpace(claim.AdditionalNotes)
                    ? claim.AdditionalNotes
                    : "Claim submitted with supporting documentation."
            });

            // 2. Under Review / Clarification Requested Event
            if (string.Equals(claim.Status, "Under Review", StringComparison.OrdinalIgnoreCase))
            {
                logs.Add(new ReimbursementAuditLogDto
                {
                    Id = $"LOG-{claim.ClaimNumber}-2",
                    Action = "Clarification Requested",
                    Actor = claim.ReviewerName ?? "Finance Reviewer",
                    Role = "Finance Officer",
                    Timestamp = claim.ReviewedAt ?? DateTime.UtcNow,
                    Notes = !string.IsNullOrWhiteSpace(claim.ReviewNotes)
                        ? claim.ReviewNotes
                        : "Clarification or additional proof requested from claimant."
                });
            }

            // 3. Approved Event
            if (string.Equals(claim.Status, "Approved", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(claim.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                logs.Add(new ReimbursementAuditLogDto
                {
                    Id = $"LOG-{claim.ClaimNumber}-2",
                    Action = "Approved",
                    Actor = claim.ReviewerName ?? "Finance Officer (Admin)",
                    Role = "Finance Officer",
                    Timestamp = claim.ReviewedAt ?? DateTime.UtcNow,
                    Notes = !string.IsNullOrWhiteSpace(claim.ReviewNotes)
                        ? claim.ReviewNotes
                        : $"Claim approved for payment. Account Reference: {claim.AccountRef}"
                });
            }

            // 4. Rejected Event
            if (string.Equals(claim.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
            {
                logs.Add(new ReimbursementAuditLogDto
                {
                    Id = $"LOG-{claim.ClaimNumber}-2",
                    Action = "Rejected",
                    Actor = claim.ReviewerName ?? "Finance Reviewer",
                    Role = "Finance Officer",
                    Timestamp = claim.ReviewedAt ?? DateTime.UtcNow,
                    Notes = !string.IsNullOrWhiteSpace(claim.ReviewNotes)
                        ? claim.ReviewNotes
                        : "Claim rejected by finance reviewer."
                });
            }

            // 5. Paid Event
            if (string.Equals(claim.Status, "Paid", StringComparison.OrdinalIgnoreCase))
            {
                logs.Add(new ReimbursementAuditLogDto
                {
                    Id = $"LOG-{claim.ClaimNumber}-3",
                    Action = "Paid",
                    Actor = claim.PayerName ?? "Chief Accountant",
                    Role = "Chief Accountant",
                    Timestamp = claim.PaidAt ?? DateTime.UtcNow,
                    Notes = !string.IsNullOrWhiteSpace(claim.PaymentReference)
                        ? $"Payment disbursed. Reference: {claim.PaymentReference}"
                        : "Payment successfully disbursed to claimant."
                });
            }

            return logs;
        }

        public async Task<ReimbursementSummaryDto> GetSummaryAsync(int? campusId)
        {
            return await _repository.GetSummaryAsync(campusId);
        }

        public async Task<(bool Success, string? AccountRef)> VerifyClaimAsync(int id, VerifyClaimRequest request, int reviewedBy)
        {
            var existing = await _repository.GetClaimByIdAsync(id);
            if (existing == null)
            {
                throw new KeyNotFoundException("Reimbursement claim not found.");
            }

            // If frontend passes { status: "Under Review", notes: "..." }, route to clarification request!
            if (string.Equals(request.Status, "Under Review", StringComparison.OrdinalIgnoreCase))
            {
                var noteText = request.Notes ?? request.ReviewNotes;
                var clarSuccess = await _repository.RequestClarificationAsync(id, noteText, reviewedBy);
                return (clarSuccess, null);
            }

            decimal approvedAmount = request.ApprovedAmount ?? existing.Amount;
            var reviewNotes = request.ReviewNotes ?? request.Notes;
            return await _repository.VerifyClaimAsync(id, approvedAmount, reviewNotes, reviewedBy);
        }

        public async Task<bool> RequestClarificationAsync(int id, RequestClarificationRequest request, int reviewedBy)
        {
            var existing = await _repository.GetClaimByIdAsync(id);
            if (existing == null)
            {
                throw new KeyNotFoundException("Reimbursement claim not found.");
            }

            var noteText = request.ClarificationNotes ?? request.Notes;
            return await _repository.RequestClarificationAsync(id, noteText, reviewedBy);
        }

        public async Task<bool> RejectClaimAsync(int id, RejectClaimRequest request, int reviewedBy)
        {
            var existing = await _repository.GetClaimByIdAsync(id);
            if (existing == null)
            {
                throw new KeyNotFoundException("Reimbursement claim not found.");
            }

            var noteText = request.RejectNotes ?? request.Notes;
            return await _repository.RejectClaimAsync(id, noteText, reviewedBy);
        }

        public async Task<bool> MarkPaidAsync(int id, MarkPaidClaimRequest request, int paidBy)
        {
            var existing = await _repository.GetClaimByIdAsync(id);
            if (existing == null)
            {
                throw new KeyNotFoundException("Reimbursement claim not found.");
            }

            var paymentRef = request.PaymentReference ?? request.PaymentRef ?? request.Remarks;
            return await _repository.MarkPaidAsync(id, paymentRef, paidBy);
        }

        public async Task<string> UploadProofAsync(int id, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("Proof file is required.");
            }

            if (file.Length > 5 * 1024 * 1024)
            {
                throw new ArgumentException("Proof file size exceeds the maximum limit of 5 MB.");
            }

            var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (Array.IndexOf(allowedExtensions, fileExtension) < 0)
            {
                throw new ArgumentException("Invalid file format. Only PDF, JPG, and PNG files are allowed.");
            }

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Reimbursements");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            var documentPath = $"/Uploads/Reimbursements/{uniqueFileName}";
            await _repository.UploadProofAsync(id, documentPath);

            return documentPath;
        }

        public async Task<IEnumerable<AccountEntryDto>> GetAccountEntriesAsync(int? campusId)
        {
            return await _repository.GetAccountEntriesAsync(campusId);
        }
    }
}
