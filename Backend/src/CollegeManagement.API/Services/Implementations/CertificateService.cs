using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Hubs;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services;

public class CertificateService : ICertificateService
{
    private readonly ICertificateRepository _repository;
    private readonly CollegeManagement.API.Data.AppDbContext _context;
    private readonly INumberSeriesService _numberSeriesService;
    private readonly ITemplateService _templateService;
    private readonly IHubContext<NotificationHub>? _hubContext;

    public CertificateService(
        ICertificateRepository repository, 
        CollegeManagement.API.Data.AppDbContext context, 
        INumberSeriesService numberSeriesService,
        ITemplateService templateService,
        IHubContext<NotificationHub>? hubContext = null)
    {
        _repository = repository;
        _context = context;
        _numberSeriesService = numberSeriesService;
        _templateService = templateService;
        _hubContext = hubContext;
    }

    public async Task<IReadOnlyList<CertificateResponseDto>> GetAllAsync(
        string? search = null,
        string? status = null,
        string? certificateType = null,
        int? campusId = null,
        int? boardId = null,
        int? academicYearId = null,
        CancellationToken ct = default)
    {
        return await _repository.GetAllAsync(search, status, certificateType, campusId, boardId, academicYearId, ct);
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
        var preview = await _repository.GetPreviewAsync(id, ct);
        if (preview == null) return null;

        string? admissionNo = null;
        if (preview.DataPayload.TryGetValue("admission_no", out var adm)) admissionNo = adm;
        else if (preview.DataPayload.TryGetValue("AdmissionNo", out var admNo)) admissionNo = admNo;

        var renderRequest = new CollegeManagement.API.DTOs.Settings.RenderCertificateTemplateRequestDto
        {
            TemplateCode = preview.TemplateCode,
            AdmissionNo = admissionNo,
            CertificateNo = preview.CertificateNumber,
            IssueDate = preview.IssueDate,
            Purpose = preview.Purpose,
            Remarks = preview.Remarks,
            IssuedBy = preview.IssuedBy,
            Conduct = preview.DataPayload.TryGetValue("conduct_rating", out var cnd) ? cnd : null
        };

        try
        {
            var rendered = await _templateService.RenderTemplateAsync(renderRequest, null, ct);
            if (rendered != null && !string.IsNullOrWhiteSpace(rendered.RenderedHtml))
            {
                preview.HtmlContent = rendered.RenderedHtml;
                foreach (var kvp in rendered.AppliedPlaceholders)
                {
                    preview.DataPayload[kvp.Key] = kvp.Value;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CertificateService.GetPreviewAsync] Failed to render template via service: {ex.Message}");
        }

        return preview;
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

        var generatedCert = await _repository.GenerateAsync(request, ct);
        if (generatedCert != null)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("NotificationReceived", new { type = "NEW_CERTIFICATE_REQUEST" }, ct);
            }
            catch { }
        }
        return generatedCert;
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

        var moveResult = await _repository.MoveStatusAsync(id, status, issuedBy, ct);
        if (moveResult)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("NotificationReceived", new { type = "CERTIFICATE_STATUS_UPDATED" }, ct);
            }
            catch { }
        }
        return moveResult;
    }

    public async Task<int> BulkReviewAsync(
        string reviewedBy,
        CancellationToken ct = default)
    {
        var count = await _repository.BulkReviewAsync(reviewedBy, ct);
        if (count > 0)
        {
            try { await _hubContext.Clients.All.SendAsync("NotificationReceived", new { type = "CERTIFICATE_STATUS_UPDATED" }, ct); } catch { }
        }
        return count;
    }

    public async Task<int> BulkApproveAsync(
        string approvedBy,
        CancellationToken ct = default)
    {
        var count = await _repository.BulkApproveAsync(approvedBy, ct);
        if (count > 0)
        {
            try { await _hubContext.Clients.All.SendAsync("NotificationReceived", new { type = "CERTIFICATE_STATUS_UPDATED" }, ct); } catch { }
        }
        return count;
    }

    public async Task<int> BulkIssueAsync(
        string issuedBy,
        CancellationToken ct = default)
    {
        var count = await _repository.BulkIssueAsync(issuedBy, ct);
        if (count > 0)
        {
            try { await _hubContext.Clients.All.SendAsync("NotificationReceived", new { type = "CERTIFICATE_STATUS_UPDATED" }, ct); } catch { }
        }
        return count;
    }

    public async Task<IReadOnlyList<CertificateResponseDto>> BulkGenerateAsync(
        BulkGenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var list = await _repository.BulkGenerateAsync(request, ct);
        if (list.Count > 0)
        {
            try { await _hubContext.Clients.All.SendAsync("NotificationReceived", new { type = "NEW_CERTIFICATE_REQUEST" }, ct); } catch { }
        }
        return list;
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

    public async Task<bool> UpdateFeeClearanceAsync(
        int certificateId,
        UpdateFeeClearanceDto dto,
        string userName,
        CancellationToken ct = default)
    {
        if (certificateId <= 0 || dto == null) return false;
        var cert = await _repository.GetByIdAsync(certificateId, ct);
        if (cert == null) return false;

        decimal dueAmount = dto.DueAmount ?? cert.FeeDueAmount;
        string status = string.IsNullOrWhiteSpace(dto.Status) ? "Cleared" : dto.Status;
        if (status.Equals("Cleared", StringComparison.OrdinalIgnoreCase))
        {
            dueAmount = 0.00m;
        }

        string clearedBy = !string.IsNullOrWhiteSpace(dto.ClearedBy) ? dto.ClearedBy : userName;
        return await _repository.UpdateFeeClearanceAsync(certificateId, status, dueAmount, clearedBy, dto.ExemptionReason, ct);
    }
}