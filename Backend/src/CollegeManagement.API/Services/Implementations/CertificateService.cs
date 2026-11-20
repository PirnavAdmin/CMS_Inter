using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Hubs;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace CollegeManagement.API.Services;

public class CertificateService : ICertificateService
{
    private readonly ICertificateRepository _repository;
    private readonly INumberSeriesService _numberSeriesService;
    private readonly ITemplateService _templateService;
    private readonly ICertificateExportService? _exportService;
    private readonly ICertificateDocumentStorageService? _storageService;
    private readonly IFeeService? _feeService;
    private readonly IHubContext<NotificationHub>? _hubContext;
    private readonly Microsoft.Extensions.Logging.ILogger<CertificateService>? _logger;

    public CertificateService(
        ICertificateRepository repository, 
        INumberSeriesService numberSeriesService,
        ITemplateService templateService,
        ICertificateExportService? exportService = null,
        ICertificateDocumentStorageService? storageService = null,
        IFeeService? feeService = null,
        IHubContext<NotificationHub>? hubContext = null,
        Microsoft.Extensions.Logging.ILogger<CertificateService>? logger = null)
    {
        _repository = repository;
        _numberSeriesService = numberSeriesService;
        _templateService = templateService;
        _exportService = exportService;
        _storageService = storageService;
        _feeService = feeService;
        _hubContext = hubContext;
        _logger = logger;
    }

    private async Task BroadcastCertificateEventAsync(string eventType, int? campusId = null, bool includeStudents = false, CancellationToken ct = default)
    {
        if (_hubContext == null) return;
        try
        {
            var groups = new List<string> { "Role_admin", "Role_superadmin", "Role_super admin", "Role_principal", "Role_examcell", "Role_exam cell", "Role_exam_cell" };
            if (includeStudents) groups.Add("Role_student");
            if (campusId.HasValue && campusId.Value > 0) groups.Add($"Campus_{campusId.Value}");
            await _hubContext.Clients.Groups(groups.Distinct().ToList()).SendAsync("NotificationReceived", new { type = eventType, campusId }, ct);
        }
        catch { }
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
            _logger?.LogWarning(ex, "[CertificateService.GetPreviewAsync] Failed to render template via service: {Message}", ex.Message);
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

        var student = await _repository.GetStudentForGenerationAsync(request.AdmissionNo.Trim(), ct);

        if (student == null)
            throw new InvalidOperationException($"Student with AdmissionNo '{request.AdmissionNo}' not found.");

        request.CampusId ??= student.CampusId;

        if (string.IsNullOrWhiteSpace(request.CertificateNo))
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
                // Pipeline 5: Strict atomic sequence lock. Eliminate silent random GUID fallback.
                throw new InvalidOperationException("Certificate number series 'CERTIFICATE_NUMBER' could not be generated. Please ensure the sequence configuration is initialized.");
            }
        }

        var generatedCert = await _repository.GenerateAsync(request, ct);
        if (generatedCert != null)
        {
            // --- Permanent Server-Side Document Generation & File Path Persistence ---
            if (_storageService != null && _exportService != null)
            {
                try
                {
                    var preview = await GetPreviewAsync(generatedCert.CertificateId, ct);
                    if (preview == null)
                    {
                        preview = _exportService.BuildPreviewFallback(generatedCert);
                    }

                    var pdfBytes = _exportService.GenerateCertificatePdf(preview);
                    var (relPath, fullPath, size) = await _storageService.SaveCertificateDocumentAsync(
                        generatedCert.CertificateNumber, 
                        pdfBytes, 
                        ct);

                    var generatedBy = "Admin";
                    await _repository.UpdateCertificateFileAsync(
                        generatedCert.CertificateId, 
                        relPath, 
                        $"{generatedCert.CertificateNumber}.pdf", 
                        "application/pdf", 
                        size, 
                        generatedBy, 
                        ct);

                    generatedCert.FilePath = relPath;
                    generatedCert.FileName = $"{generatedCert.CertificateNumber}.pdf";
                    generatedCert.FileType = "application/pdf";
                    generatedCert.FileSize = size;
                    generatedCert.GeneratedBy = generatedBy;
                    generatedCert.GeneratedAt = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "[CertificateService.GenerateAsync] Failed to render and save permanent certificate document for {CertNo}: {Message}", 
                        generatedCert.CertificateNumber, ex.Message);
                }
            }

            if (_feeService != null && student.StudentId > 0)
            {
                try
                {
                    var feeDetails = await _feeService.GetStudentFeeDetailsByStudentAsync(student.StudentId);
                    if (feeDetails != null)
                    {
                        var due = feeDetails.OutstandingBalance;
                        var clearanceStatus = due > 0 ? "Dues Pending" : "Cleared";
                        generatedCert.FeeClearanceStatus = clearanceStatus;
                        generatedCert.FeeDueAmount = due;
                        await _repository.UpdateFeeClearanceAsync(generatedCert.CertificateId, new CertificateFeeClearanceRequestDto
                        {
                            Status = clearanceStatus,
                            DueAmount = due,
                            ClearedBy = "Fee System Verification"
                        }, ct);
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "[CertificateService.GenerateAsync] Could not fetch student fee details for student {StudentId}", student.StudentId);
                }
            }

            await BroadcastCertificateEventAsync("NEW_CERTIFICATE_REQUEST", request.CampusId, false, ct);
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

    public async Task<PublicCertificateVerificationDto?> VerifyPublicAsync(
        string certificateNo,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(certificateNo))
            throw new ArgumentException("Certificate number is required.");

        var cert = await _repository.VerifyAsync(certificateNo.Trim(), ct);
        if (cert == null) return null;

        string maskedName = MaskStudentName(cert.StudentName);
        var issueDate = cert.IssueDate != default ? cert.IssueDate : DateTime.UtcNow;

        // Deterministic verification hash (SHA256 of certificateNo + issueDate + type)
        using var sha = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes($"{cert.CertificateNumber}:{issueDate:yyyy-MM-dd}:{cert.CertificateType}"));
        var verificationHash = Convert.ToHexString(hashBytes)[..16];

        return new PublicCertificateVerificationDto
        {
            CertificateNumber = cert.CertificateNumber,
            StudentNameMasked = maskedName,
            CertificateType = cert.CertificateType,
            IssueDate = issueDate,
            IssuingInstitution = !string.IsNullOrWhiteSpace(cert.BoardName) ? cert.BoardName : "College Management System",
            ValidityStatus = string.Equals(cert.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) ? "Cancelled" : "Valid",
            VerificationHash = verificationHash
        };
    }

    private static string MaskStudentName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return "****";
        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var maskedParts = parts.Select(p =>
        {
            if (p.Length <= 2) return p[0] + "*";
            return p[0] + new string('*', Math.Max(1, p.Length - 2)) + p[^1];
        });
        return string.Join(" ", maskedParts);
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

        if (status.Equals("Issued", StringComparison.OrdinalIgnoreCase))
        {
            var cert = await _repository.GetByIdAsync(id, ct);
            if (cert != null)
            {
                bool isPermitted = !string.IsNullOrWhiteSpace(cert.FeeExemptionReason)
                    || string.Equals(cert.FeeClearanceStatus, "Principal Permitted", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(cert.FeeClearanceStatus, "Exempted", StringComparison.OrdinalIgnoreCase);

                if (!isPermitted && _feeService != null && cert.StudentId > 0)
                {
                    var feeDetails = await _feeService.GetStudentFeeDetailsByStudentAsync(cert.StudentId);
                    if (feeDetails != null && feeDetails.OutstandingBalance > 0)
                    {
                        throw new InvalidOperationException($"Cannot issue certificate {cert.CertificateNumber}. Student {cert.StudentName} (Admission No: {cert.AdmissionNo}) has pending fee dues of ₹{feeDetails.OutstandingBalance:N2}. Fee clearance or Principal Permission is required.");
                    }
                }
                else if (!isPermitted && cert.FeeDueAmount.GetValueOrDefault() > 0)
                {
                    throw new InvalidOperationException($"Cannot issue certificate {cert.CertificateNumber}. Student {cert.StudentName} (Admission No: {cert.AdmissionNo}) has pending fee dues of ₹{cert.FeeDueAmount.Value:N2}. Fee clearance or Principal Permission is required.");
                }
            }
        }

        var moveResult = await _repository.MoveStatusAsync(id, status, issuedBy, ct);
        if (moveResult)
        {
            await BroadcastCertificateEventAsync("CERTIFICATE_STATUS_UPDATED", null, true, ct);
        }
        return moveResult;
    }

    public async Task<int> BulkReviewAsync(
        string reviewedBy,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var count = await _repository.BulkReviewAsync(reviewedBy, campusId, ct);
        if (count > 0)
        {
            await BroadcastCertificateEventAsync("CERTIFICATE_STATUS_UPDATED", campusId, true, ct);
        }
        return count;
    }

    public async Task<int> BulkApproveAsync(
        string approvedBy,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var count = await _repository.BulkApproveAsync(approvedBy, campusId, ct);
        if (count > 0)
        {
            await BroadcastCertificateEventAsync("CERTIFICATE_STATUS_UPDATED", campusId, true, ct);
        }
        return count;
    }

    public async Task<int> BulkIssueAsync(
        string issuedBy,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var count = await _repository.BulkIssueAsync(issuedBy, campusId, ct);
        if (count > 0)
        {
            await BroadcastCertificateEventAsync("CERTIFICATE_STATUS_UPDATED", campusId, true, ct);
        }
        return count;
    }

    public async Task<bool> UpdateFeeClearanceAsync(
        int id,
        CertificateFeeClearanceRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return await _repository.UpdateFeeClearanceAsync(id, request, ct);
    }

    public async Task<bool> GrantFeeExemptionAsync(
        int id,
        CertificateFeeClearanceRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return await _repository.GrantFeeExemptionAsync(id, request, ct);
    }

    public async Task<IReadOnlyList<CertificateResponseDto>> BulkGenerateAsync(
        BulkGenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var list = await _repository.BulkGenerateAsync(request, ct);
        if (list.Count > 0)
        {
            foreach (var cert in list)
            {
                try
                {
                    var (content, fileName, contentType) = await GetOrGenerateDocumentAsync(cert.CertificateId, ct);
                    cert.FileName = fileName;
                    cert.FileType = contentType;
                    cert.FileSize = content.Length;
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "[CertificateService.BulkGenerateAsync] Could not save document for {CertId}: {Message}", cert.CertificateId, ex.Message);
                }
            }
            await BroadcastCertificateEventAsync("NEW_CERTIFICATE_REQUEST", null, false, ct);
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

    // =========================================================================
    // GET OR GENERATE DOCUMENT (Retrieves from Server Storage or Self-Heals)
    // =========================================================================
    public async Task<(byte[] content, string fileName, string contentType)> GetOrGenerateDocumentAsync(
        int id,
        CancellationToken ct = default)
    {
        if (id <= 0) throw new ArgumentException("Invalid certificate ID", nameof(id));

        var cert = await _repository.GetByIdAsync(id, ct);
        if (cert == null) throw new KeyNotFoundException($"Certificate #{id} not found.");

        var fileName = !string.IsNullOrWhiteSpace(cert.FileName) 
            ? cert.FileName 
            : $"{cert.CertificateNumber}.pdf";

        // 1. If physical file exists on permanent server storage, stream directly
        if (_storageService != null && !string.IsNullOrWhiteSpace(cert.FilePath) && _storageService.DocumentExists(cert.FilePath))
        {
            var bytes = await _storageService.GetCertificateDocumentAsync(cert.FilePath, ct);
            if (bytes != null && bytes.Length > 0)
            {
                return (bytes, fileName, cert.FileType ?? "application/pdf");
            }
        }

        // 2. Self-Healing: Generate PDF, persist to storage, and update database record
        if (_exportService == null)
        {
            throw new InvalidOperationException("Certificate export service is not available.");
        }

        var preview = await GetPreviewAsync(id, ct);
        if (preview == null)
        {
            preview = _exportService.BuildPreviewFallback(cert);
        }

        var generatedBytes = _exportService.GenerateCertificatePdf(preview);

        if (_storageService != null)
        {
            try
            {
                var (relPath, fullPath, size) = await _storageService.SaveCertificateDocumentAsync(
                    cert.CertificateNumber, 
                    generatedBytes, 
                    ct);

                await _repository.UpdateCertificateFileAsync(
                    cert.CertificateId, 
                    relPath, 
                    fileName, 
                    "application/pdf", 
                    size, 
                    cert.GeneratedBy ?? "Admin", 
                    ct);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "[CertificateService.GetOrGenerateDocumentAsync] Error saving document to storage for #{CertId}: {Message}", id, ex.Message);
            }
        }

        return (generatedBytes, fileName, "application/pdf");
    }
}
