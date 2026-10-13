using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff.Reimbursement;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffReimbursementService : IStaffReimbursementService
    {
        private readonly IStaffReimbursementRepository _repository;
        private readonly INumberSeriesService _numberSeriesService;

        public StaffReimbursementService(
            IStaffReimbursementRepository repository,
            INumberSeriesService numberSeriesService)
        {
            _repository = repository;
            _numberSeriesService = numberSeriesService;
        }

        public async Task<ReimbursementDto> CreateReimbursementAsync(CreateReimbursementRequest request)
        {
            var claimNumberResult = await _numberSeriesService.GenerateNextNumberAsync("Reimbursement", null, request.CampusId ?? 1);
            var claimNumber = claimNumberResult?.GeneratedNumber ?? $"CLM-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";

            var reimbursement = new StaffReimbursement
            {
                ClaimNumber = claimNumber,
                StaffId = request.StaffId,
                ClaimCategory = request.ClaimCategory,
                ClaimedAmount = request.ClaimedAmount,
                Description = request.Description,
                CampusId = request.CampusId,
                AcademicYear = request.AcademicYear,
                Status = "Pending"
            };

            await _repository.CreateAsync(reimbursement);
            
            var created = await _repository.GetByIdAsync(reimbursement.Id);
            return MapToDto(created!);
        }

        public async Task<ReimbursementDto?> GetReimbursementByIdAsync(int id)
        {
            var reimbursement = await _repository.GetByIdAsync(id);
            return reimbursement == null ? null : MapToDto(reimbursement);
        }

        public async Task<IEnumerable<ReimbursementDto>> GetAllReimbursementsAsync(int? campusId = null, string? status = null, int? staffId = null)
        {
            var reimbursements = await _repository.GetAllAsync(campusId, status, staffId);
            return reimbursements.Select(MapToDto);
        }

        public async Task<ReimbursementSummaryDto> GetReimbursementSummaryAsync(int? campusId = null)
        {
            return new ReimbursementSummaryDto
            {
                TotalPendingClaims = await _repository.GetCountByStatusAsync("Pending", campusId),
                TotalVerifiedClaims = await _repository.GetCountByStatusAsync("AdminVerified", campusId),
                TotalApprovedClaims = await _repository.GetCountByStatusAsync("AccountantApproved", campusId),
                TotalAmountPaidThisMonth = await _repository.GetTotalAmountPaidThisMonthAsync(campusId),
                TotalAmountPending = await _repository.GetTotalAmountPendingAsync(campusId)
            };
        }

        public async Task<bool> VerifyReimbursementAsync(int id, AdminVerifyReimbursementRequest request, int adminId)
        {
            var reimbursement = await _repository.GetByIdAsync(id);
            if (reimbursement == null || reimbursement.Status != "Pending") return false;

            reimbursement.Status = "AdminVerified";
            reimbursement.ApprovedAmount = request.ApprovedAmount;
            reimbursement.AdminNotes = request.AdminNotes;
            reimbursement.AdminReviewedAt = DateTime.UtcNow;
            reimbursement.AdminReviewedBy = adminId;

            return await _repository.UpdateAsync(reimbursement);
        }

        public async Task<bool> RejectReimbursementAsync(int id, AdminRejectReimbursementRequest request, int adminId)
        {
            var reimbursement = await _repository.GetByIdAsync(id);
            if (reimbursement == null || (reimbursement.Status != "Pending" && reimbursement.Status != "AdminVerified")) return false;

            reimbursement.Status = "Rejected";
            reimbursement.AdminNotes = request.RejectNotes;
            reimbursement.AdminReviewedAt = DateTime.UtcNow;
            reimbursement.AdminReviewedBy = adminId;

            return await _repository.UpdateAsync(reimbursement);
        }

        public async Task<bool> ApproveReimbursementAsync(int id, AccountantProcessRequest request, int accountantId)
        {
            var reimbursement = await _repository.GetByIdAsync(id);
            if (reimbursement == null || reimbursement.Status != "AdminVerified") return false;

            reimbursement.Status = "AccountantApproved";
            reimbursement.AccountantNotes = request.AccountantNotes;
            reimbursement.AccountantProcessedAt = DateTime.UtcNow;
            reimbursement.AccountantProcessedBy = accountantId;

            return await _repository.UpdateAsync(reimbursement);
        }

        public async Task<bool> MarkReimbursementAsPaidAsync(int id, MarkPaidReimbursementRequest request, int accountantId)
        {
            var reimbursement = await _repository.GetByIdAsync(id);
            if (reimbursement == null || reimbursement.Status != "AccountantApproved") return false;

            reimbursement.Status = "Paid";
            reimbursement.PaymentReference = request.PaymentReference;
            if (!string.IsNullOrEmpty(request.AccountantNotes))
            {
                reimbursement.AccountantNotes = request.AccountantNotes;
            }
            reimbursement.PaidAt = DateTime.UtcNow;
            
            // If they skipped AccountantApprove step and went straight to mark paid
            if (reimbursement.AccountantProcessedAt == null)
            {
                reimbursement.AccountantProcessedAt = DateTime.UtcNow;
                reimbursement.AccountantProcessedBy = accountantId;
            }

            return await _repository.UpdateAsync(reimbursement);
        }

        public async Task<string> UploadProofDocumentAsync(int id, IFormFile file)
        {
            var reimbursement = await _repository.GetByIdAsync(id);
            if (reimbursement == null) throw new ArgumentException("Reimbursement not found.");

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
            reimbursement.ProofDocumentPath = documentPath;
            await _repository.UpdateAsync(reimbursement);

            return documentPath;
        }

        private ReimbursementDto MapToDto(StaffReimbursement entity)
        {
            return new ReimbursementDto
            {
                Id = entity.Id,
                ClaimNumber = entity.ClaimNumber,
                StaffId = entity.StaffId,
                StaffName = entity.Staff != null ? $"{entity.Staff.FirstName} {entity.Staff.LastName}".Trim() : string.Empty,
                StaffType = entity.Staff?.StaffType ?? string.Empty,
                Designation = entity.Staff?.Designation ?? string.Empty,
                Department = entity.Staff?.Department ?? string.Empty,
                ClaimCategory = entity.ClaimCategory,
                ClaimedAmount = entity.ClaimedAmount,
                ApprovedAmount = entity.ApprovedAmount,
                Description = entity.Description,
                ProofDocumentPath = entity.ProofDocumentPath,
                SubmittedAt = entity.SubmittedAt,
                Status = entity.Status,
                AdminReviewedAt = entity.AdminReviewedAt,
                AdminNotes = entity.AdminNotes,
                AccountantProcessedAt = entity.AccountantProcessedAt,
                AccountantNotes = entity.AccountantNotes,
                PaidAt = entity.PaidAt,
                PaymentReference = entity.PaymentReference,
                CampusId = entity.CampusId,
                AcademicYear = entity.AcademicYear
            };
        }
    }
}
