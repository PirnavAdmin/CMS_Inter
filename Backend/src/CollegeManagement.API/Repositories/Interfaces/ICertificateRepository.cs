using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Certificate;

namespace CollegeManagement.API.Repositories.Interfaces;

public interface ICertificateRepository
{
    Task<IReadOnlyList<CertificateResponseDto>> GetAllAsync(
        string? search = null,
        string? status = null,
        string? certificateType = null,
        CancellationToken ct = default);

    Task<CertificateResponseDto?> GetByIdAsync(
        int id,
        CancellationToken ct = default);

    Task<CertificatePreviewResponseDto?> GetPreviewAsync(
        int id,
        CancellationToken ct = default);

    Task<CertificateWorkflowStatsDto> GetWorkflowStatsAsync(
        CancellationToken ct = default);

    Task<IReadOnlyList<StudentCertificateDropdownDto>> GetStudentsDropdownAsync(
        CancellationToken ct = default);

    Task<CertificateResponseDto?> GenerateAsync(
        GenerateCertificateRequestDto request,
        CancellationToken ct = default);

    Task<CertificateResponseDto?> GenerateAsync(
        GenerateCertificateDto request,
        CancellationToken ct = default);

    Task<IReadOnlyList<CertificateResponseDto>> GetHistoryAsync(
        string? admissionNo,
        CancellationToken ct = default);

    Task<CertificateResponseDto?> VerifyAsync(
        string certificateNo,
        CancellationToken ct = default);

    Task<CertificateResponseDto?> ReissueAsync(
        ReissueCertificateDto request,
        CancellationToken ct = default);

    Task<CertificateResponseDto?> UpdateByAdmissionNoAsync(
        UpdateCertificateDto request,
        CancellationToken ct = default);

    Task<bool> CancelAsync(
        int id,
        CancellationToken ct = default);

    Task<bool> MoveStatusAsync(
        int id,
        string status,
        string? issuedBy = null,
        CancellationToken ct = default);

    Task<int> BulkReviewAsync(
        string reviewedBy,
        CancellationToken ct = default);

    Task<int> BulkApproveAsync(
        string approvedBy,
        CancellationToken ct = default);

    Task<int> BulkIssueAsync(
        string issuedBy,
        CancellationToken ct = default);

    Task<IReadOnlyList<CertificateResponseDto>> BulkGenerateAsync(
        BulkGenerateCertificateRequestDto request,
        CancellationToken ct = default);

    Task<IReadOnlyList<BulkEligibleStudentDto>> GetBulkEligibleStudentsAsync(
        int? academicYearId,
        int? boardId,
        int? groupId,
        int? sectionId,
        string? search,
        CancellationToken ct = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken ct = default);
}