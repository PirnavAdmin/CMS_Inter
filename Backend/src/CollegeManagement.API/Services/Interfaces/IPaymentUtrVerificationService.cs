using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Fees;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces;

/// <summary>
/// Orchestrates idempotent Direct UPI QR / UTR submissions with private payment-proof attachments
/// and campus-isolated authenticated attachment retrieval.
/// </summary>
public interface IPaymentUtrVerificationService
{
    Task<PaymentProofSubmissionResult> SubmitUtrWithProofAsync(
        SubmitUtrRequest request,
        IFormFile? attachment,
        bool hasMultipleFiles,
        string? clientIdempotencyKey,
        int? userId,
        CancellationToken cancellationToken = default);

    Task<PaymentProofDownloadResult> GetAttachmentMetadataAsync(
        int attachmentId,
        CancellationToken cancellationToken = default);
}
