using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services;

public class CertificateService : ICertificateService
{
    private readonly ICertificateRepository _repository;
    private readonly CollegeManagement.API.Data.AppDbContext _context;
    private readonly INumberSeriesService _numberSeriesService;

    public CertificateService(
        ICertificateRepository repository, 
        CollegeManagement.API.Data.AppDbContext context, 
        INumberSeriesService numberSeriesService)
    {
        _repository = repository;
        _context = context;
        _numberSeriesService = numberSeriesService;
    }

    public async Task<IReadOnlyList<CertificateResponseDto>> GetAllAsync(
        string? search = null,
        string? status = null,
        string? certificateType = null,
        int? campusId = null,
        CancellationToken ct = default)
    {
        return await _repository.GetAllAsync(search, status, certificateType, campusId, ct);
    }

    public async Task<CertificateResponseDto?> GetByIdAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return null;
        return await _repository.GetByIdAsync(id, ct);
    }

    public async Task<CertificatePreviewResponseDto?> GetPreviewAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return null;
        return await _repository.GetPreviewAsync(id, ct);
    }

    public async Task<CertificateWorkflowStatsDto> GetWorkflowStatsAsync(
        int? campusId = null,
        CancellationToken ct = default)
    {
        return await _repository.GetWorkflowStatsAsync(campusId, ct);
    }

    public async Task<IReadOnlyList<StudentCertificateDropdownDto>> GetStudentsDropdownAsync(
        int? campusId = null,
        int? boardId = null,
        int? academicYearId = null,
        CancellationToken ct = default)
    {
        return await _repository.GetStudentsDropdownAsync(campusId, boardId, academicYearId, ct);
    }

    public async Task<CertificateResponseDto?> GenerateAsync(
        GenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.AdmissionNo))
            throw new ArgumentException("Admission number is required.");

        if (string.IsNullOrWhiteSpace(request.CertificateType))
            throw new ArgumentException("Certificate type is required.");

        if (string.IsNullOrWhiteSpace(request.Purpose))
            throw new ArgumentException("Purpose is required.");

        var student = await _context.Students
            .FirstOrDefaultAsync(s => s.AdmissionNo == request.AdmissionNo, ct);

        if (student != null && string.IsNullOrWhiteSpace(request.CertificateNo))
        {
            var reqDto = new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto 
            { 
                Board = student.BoardId?.ToString(),
                AcademicYear = student.AcademicYearId?.ToString()
            };
            
            var generatedDto = await _numberSeriesService.GenerateNextNumberAsync("CERTIFICATE_NUMBER", reqDto, student.CampusId ?? 1);
            if (generatedDto != null && !string.IsNullOrWhiteSpace(generatedDto.GeneratedNumber))
            {
                request.CertificateNo = generatedDto.GeneratedNumber;
            }
            else
            {
                request.CertificateNo = $"CERT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpper()}";
            }
        }

        return await _repository.GenerateAsync(request, ct);
    }

    public async Task<CertificateResponseDto?> GenerateAsync(
        GenerateCertificateDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return await _repository.GenerateAsync(request, ct);
    }

    public async Task<CertificateResponseDto?> GenerateAsync(
        string certificateType,
        GenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        request.CertificateType = !string.IsNullOrWhiteSpace(certificateType) 
            ? certificateType 
            : request.CertificateType;

        return await GenerateAsync(request, ct);
    }

    public async Task<CertificateResponseDto?> UpdateByAdmissionNoAsync(
        UpdateCertificateDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return await _repository.UpdateByAdmissionNoAsync(request, ct);
    }

    public async Task<IReadOnlyList<CertificateResponseDto>> GetHistoryAsync(
        string? admissionNo,
        CancellationToken ct = default)
    {
        return await _repository.GetHistoryAsync(admissionNo, ct);
    }

    public async Task<CertificateResponseDto?> VerifyAsync(
        string certificateNo,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(certificateNo))
            throw new ArgumentException("Certificate number is required.");

        return await _repository.VerifyAsync(certificateNo.Trim(), ct);
    }

    public async Task<CertificateResponseDto?> ReissueAsync(
        ReissueCertificateDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return await _repository.ReissueAsync(request, ct);
    }

    public async Task<bool> MoveStatusAsync(
        int id,
        string status,
        string? issuedBy = null,
        CancellationToken ct = default)
    {
        if (id <= 0 || string.IsNullOrWhiteSpace(status))
            return false;

        return await _repository.MoveStatusAsync(id, status, issuedBy, ct);
    }

    public async Task<int> BulkReviewAsync(
        string reviewedBy,
        CancellationToken ct = default)
    {
        return await _repository.BulkReviewAsync(reviewedBy, ct);
    }

    public async Task<int> BulkApproveAsync(
        string approvedBy,
        CancellationToken ct = default)
    {
        return await _repository.BulkApproveAsync(approvedBy, ct);
    }

    public async Task<int> BulkIssueAsync(
        string issuedBy,
        CancellationToken ct = default)
    {
        return await _repository.BulkIssueAsync(issuedBy, ct);
    }

    public async Task<IReadOnlyList<CertificateResponseDto>> BulkGenerateAsync(
        BulkGenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return await _repository.BulkGenerateAsync(request, ct);
    }

    public async Task<IReadOnlyList<BulkEligibleStudentDto>> GetBulkEligibleStudentsAsync(
        int? academicYearId,
        int? boardId,
        int? groupId,
        int? sectionId,
        string? search,
        int? campusId = null,
        CancellationToken ct = default)
    {
        return await _repository.GetBulkEligibleStudentsAsync(academicYearId, boardId, groupId, sectionId, search, campusId, ct);
    }

    public async Task<bool> CancelAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return false;
        return await _repository.CancelAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) return false;
        return await _repository.DeleteAsync(id, ct);
    }
}