using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/certificates")]
[EnableCors("AllowFrontend")]
[Produces("application/json")]
[Authorize]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _service;
    private readonly ITemplateService _templateService;
    private readonly ICertificateExportService _exportService;

    public CertificatesController(
        ICertificateService service, 
        ITemplateService templateService,
        ICertificateExportService exportService)
    {
        _service = service;
        _templateService = templateService;
        _exportService = exportService;
    }

    private int? GetCampusIdFromRequest(int? queryCampusId)
    {
        if (queryCampusId.HasValue && queryCampusId.Value > 0)
            return queryCampusId.Value;

        if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) && 
            int.TryParse(headerVal.FirstOrDefault(), out var campusId) && campusId > 0)
        {
            return campusId;
        }

        var campusClaim = User.FindFirst("CampusId")?.Value ?? User.FindFirst("campusId")?.Value;
        if (!string.IsNullOrEmpty(campusClaim) && int.TryParse(campusClaim, out var claimCampusId) && claimCampusId > 0)
        {
            return claimCampusId;
        }

        return null;
    }

    private string GetCurrentUserName(string? fallback = "Admin")
    {
        return User.Identity?.Name ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value ?? fallback ?? "Admin";
    }

    // =========================================================
    // 0.1. GET ACTIVE CERTIFICATE TEMPLATES
    // GET /api/v1/certificates/active-templates
    // =========================================================
    [HttpGet("active-templates")]
    [ProducesResponseType(typeof(IReadOnlyList<CollegeManagement.API.DTOs.Settings.TemplateResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActiveTemplates(CancellationToken ct = default)
    {
        var templates = await _templateService.GetActiveTemplatesByCategoryAsync("Certificate", null, ct);
        return Ok(templates);
    }

    // =========================================================
    // 0.2. GET CERTIFICATE TEMPLATE BY CODE
    // GET /api/v1/certificates/template-by-code/{templateCode}
    // =========================================================
    [HttpGet("template-by-code/{templateCode}")]
    [ProducesResponseType(typeof(CollegeManagement.API.DTOs.Settings.TemplateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTemplateByCode(string templateCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(templateCode))
            return BadRequest(new { message = "Template code is required." });

        var template = await _templateService.GetTemplateByCodeAsync(templateCode, null, ct);
        if (template == null)
            return NotFound(new { message = $"Certificate template with code '{templateCode}' not found." });

        return Ok(template);
    }

    // =========================================================
    // 0.3. DYNAMICALLY RENDER / PREVIEW CERTIFICATE TEMPLATE
    // POST /api/v1/certificates/render-template
    // POST /api/v1/certificates/preview-template
    // =========================================================
    [HttpPost("render-template")]
    [HttpPost("preview-template")]
    [ProducesResponseType(typeof(CollegeManagement.API.DTOs.Settings.RenderedTemplateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RenderTemplate(
        [FromBody] CollegeManagement.API.DTOs.Settings.RenderCertificateTemplateRequestDto request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _templateService.RenderTemplateAsync(request, null, ct);
            return Ok(result);
        }
        catch (System.ComponentModel.DataAnnotations.ValidationException ex)
        {
            return BadRequest(new { status = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { status = false, message = ex.Message });
        }
    }

    // =========================================================
    // 1. GET ALL CERTIFICATES
    // GET /api/v1/certificates
    // =========================================================
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CertificateResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? certificateType = null,
        [FromQuery] int? campusId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? academicYearId = null,
        CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var result = await _service.GetAllAsync(search, status, certificateType, campusId, boardId, academicYearId, ct);
        return Ok(result);
    }

    // =========================================================
    // 2. GET WORKFLOW STATS (5 Stage Count Badges)
    // GET /api/v1/certificates/workflow-stats
    // =========================================================
    [HttpGet("workflow-stats")]
    [ProducesResponseType(typeof(CertificateWorkflowStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowStats(
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var stats = await _service.GetWorkflowStatsAsync(campusId, ct);
        return Ok(stats);
    }

    // =========================================================
    // 3. GET STUDENTS DROPDOWN (For Create Certificate Auto-fill)
    // GET /api/v1/certificates/students-dropdown
    // =========================================================
    [HttpGet("students-dropdown")]
    [ProducesResponseType(typeof(IReadOnlyList<StudentCertificateDropdownDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStudentsDropdown(
        [FromQuery] int? campusId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? academicYearId = null,
        CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var students = await _service.GetStudentsDropdownAsync(campusId, boardId, academicYearId, ct);
        return Ok(students);
    }

    // =========================================================
    // 4. GET BY ID
    // GET /api/v1/certificates/{id}
    // =========================================================
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CertificateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var result = await _service.GetByIdAsync(id, ct);
        if (result == null) return NotFound(new { message = "Certificate not found" });

        return Ok(result);
    }

    // =========================================================
    // 4.1. GET CERTIFICATE PREVIEW
    // GET /api/v1/certificates/{id}/preview
    // GET /api/v1/certificates/records/{id}/preview
    // =========================================================
    [HttpGet("{id:int}/preview")]
    [HttpGet("records/{id:int}/preview")]
    [ProducesResponseType(typeof(CertificatePreviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPreview(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var result = await _service.GetPreviewAsync(id, ct);
        if (result == null) return NotFound(new { message = "Certificate not found" });

        return Ok(result);
    }

    // =========================================================
    // 5. UNIFIED GENERATE CERTIFICATE & SPECIALIZED ALIASES
    // POST /api/v1/certificates/generate
    // POST /api/v1/certificates/bonafide
    // POST /api/v1/certificates/study
    // POST /api/v1/certificates/conduct
    // POST /api/v1/certificates/fee
    // POST /api/v1/certificates/tc
    // POST /api/v1/certificates/other
    // =========================================================
    [HttpPost("generate")]
    [ProducesResponseType(typeof(CertificateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Generate(
        [FromBody] GenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        if (request == null) return BadRequest(new { message = "Request body is required" });
        if (string.IsNullOrWhiteSpace(request.AdmissionNo)) return BadRequest(new { message = "Admission number is required" });
        if (string.IsNullOrWhiteSpace(request.CertificateType)) return BadRequest(new { message = "Certificate type is required" });
        if (string.IsNullOrWhiteSpace(request.Purpose)) return BadRequest(new { message = "Purpose is required" });

        try
        {
            var result = await _service.GenerateAsync(request, ct);
            if (result == null)
                return BadRequest(new { message = $"Unable to generate {request.CertificateType} certificate for AdmissionNo '{request.AdmissionNo}'." });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Error generating certificate: {ex.Message}" });
        }
    }

    [HttpPost("bonafide")]
    public Task<IActionResult> GenerateBonafide([FromBody] GenerateCertificateRequestDto request, CancellationToken ct = default)
    {
        if (request != null && string.IsNullOrWhiteSpace(request.CertificateType))
            request.CertificateType = "Bonafide Certificate";
        return Generate(request!, ct);
    }

    [HttpPost("study")]
    public Task<IActionResult> GenerateStudy([FromBody] GenerateCertificateRequestDto request, CancellationToken ct = default)
    {
        if (request != null && string.IsNullOrWhiteSpace(request.CertificateType))
            request.CertificateType = "Study Certificate";
        return Generate(request!, ct);
    }

    [HttpPost("conduct")]
    public Task<IActionResult> GenerateConduct([FromBody] GenerateCertificateRequestDto request, CancellationToken ct = default)
    {
        if (request != null && string.IsNullOrWhiteSpace(request.CertificateType))
            request.CertificateType = "Conduct Certificate";
        return Generate(request!, ct);
    }

    [HttpPost("fee")]
    public Task<IActionResult> GenerateFeeClearance([FromBody] GenerateCertificateRequestDto request, CancellationToken ct = default)
    {
        if (request != null && string.IsNullOrWhiteSpace(request.CertificateType))
            request.CertificateType = "Fee Clearance Certificate";
        return Generate(request!, ct);
    }

    [HttpPost("tc")]
    public Task<IActionResult> GenerateTransfer([FromBody] GenerateCertificateRequestDto request, CancellationToken ct = default)
    {
        if (request != null && string.IsNullOrWhiteSpace(request.CertificateType))
            request.CertificateType = "Transfer Certificate";
        return Generate(request!, ct);
    }

    [HttpPost("other")]
    public Task<IActionResult> GenerateOther([FromBody] GenerateCertificateRequestDto request, CancellationToken ct = default)
    {
        if (request != null && string.IsNullOrWhiteSpace(request.CertificateType))
            request.CertificateType = "Other Certificate";
        return Generate(request!, ct);
    }

    // =========================================================
    // 6. STUDENT REQUEST CERTIFICATE
    // POST /api/v1/certificates/student-request
    // =========================================================
    [HttpPost("student-request")]
    [Authorize] // Enforces authentication
    [ProducesResponseType(typeof(CertificateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> StudentRequest(
        [FromBody] GenerateCertificateRequestDto request,
        CancellationToken ct = default)
    {
        if (request == null) return BadRequest(new { message = "Request body is required" });
        if (string.IsNullOrWhiteSpace(request.AdmissionNo)) return BadRequest(new { message = "Admission number is required" });
        if (string.IsNullOrWhiteSpace(request.CertificateType)) return BadRequest(new { message = "Certificate type is required" });
        if (string.IsNullOrWhiteSpace(request.Purpose)) return BadRequest(new { message = "Purpose is required" });

        try
        {
            var result = await _service.GenerateAsync(request, ct);
            if (result == null)
                return BadRequest(new { message = $"Unable to request {request.CertificateType} certificate for AdmissionNo '{request.AdmissionNo}'." });

            await _service.MoveStatusAsync(result.CertificateId, "Requested", "Student Portal", ct);
            result.Status = "Requested";

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Error requesting certificate: {ex.Message}" });
        }
    }

    // =========================================================
    // 7. REVIEW CERTIFICATE (Stage 1 -> 2)
    // PATCH /api/v1/certificates/{id}/review
    // =========================================================
    [HttpPatch("{id:int}/review")]
    public async Task<IActionResult> Review(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var userName = GetCurrentUserName("Admin");
        var success = await _service.MoveStatusAsync(id, "Reviewed", userName, ct);
        if (!success) return NotFound(new { message = "Certificate not found" });

        return Ok(new { success = true, message = "Certificate reviewed successfully" });
    }

    // =========================================================
    // 7.1 GENERATE CERTIFICATE FROM REQUEST
    // PATCH /api/v1/certificates/{id}/generate
    // =========================================================
    [HttpPatch("{id:int}/generate")]
    public async Task<IActionResult> GenerateFromRequest(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var userName = GetCurrentUserName("Admin");
        var success = await _service.MoveStatusAsync(id, "Generated", userName, ct);
        if (!success) return NotFound(new { message = "Certificate not found or could not be generated." });

        return Ok(new { success = true, message = "Certificate generated successfully" });
    }

    // =========================================================
    // 8. APPROVE CERTIFICATE (Stage 2 -> 3)
    // PATCH /api/v1/certificates/{id}/approve
    // =========================================================
    [HttpPatch("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var userName = GetCurrentUserName("Principal");
        var success = await _service.MoveStatusAsync(id, "Approved", userName, ct);
        if (!success) return NotFound(new { message = "Certificate not found" });

        return Ok(new { success = true, message = "Certificate approved successfully" });
    }

    // =========================================================
    // 9. ISSUE CERTIFICATE (Stage 3 -> 4)
    // PATCH /api/v1/certificates/{id}/issue
    // =========================================================
    [HttpPatch("{id:int}/issue")]
    public async Task<IActionResult> Issue(int id, [FromQuery] string? issuedBy = null, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var issuer = issuedBy ?? GetCurrentUserName("Principal");
        var success = await _service.MoveStatusAsync(id, "Issued", issuer, ct);
        if (!success) return NotFound(new { message = "Certificate not found" });

        return Ok(new { success = true, message = "Certificate issued successfully" });
    }

    // =========================================================
    // 9.1. BULK REVIEW (Review All Generated/Pending)
    // PATCH /api/v1/certificates/bulk-review
    // =========================================================
    [HttpPatch("bulk-review")]
    public async Task<IActionResult> BulkReview([FromQuery] int? campusId = null, CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var userName = GetCurrentUserName("Admin");
        var affected = await _service.BulkReviewAsync(userName, campusId, ct);
        return Ok(new { success = true, count = affected, message = $"{affected} certificate(s) reviewed successfully." });
    }

    // =========================================================
    // 10. BULK APPROVE (Approve All Reviewed)
    // PATCH /api/v1/certificates/bulk-approve
    // =========================================================
    [HttpPatch("bulk-approve")]
    public async Task<IActionResult> BulkApprove([FromQuery] int? campusId = null, CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var userName = GetCurrentUserName("Principal");
        var affected = await _service.BulkApproveAsync(userName, campusId, ct);
        return Ok(new { success = true, count = affected, message = $"{affected} certificate(s) approved successfully." });
    }

    // =========================================================
    // 11. BULK ISSUE (Issue All Approved)
    // PATCH /api/v1/certificates/bulk-issue
    // =========================================================
    [HttpPatch("bulk-issue")]
    public async Task<IActionResult> BulkIssue([FromQuery] string? issuedBy = null, [FromQuery] int? campusId = null, CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var issuer = issuedBy ?? GetCurrentUserName("Principal");
        var affected = await _service.BulkIssueAsync(issuer, campusId, ct);
        return Ok(new { success = true, count = affected, message = $"{affected} certificate(s) issued successfully." });
    }

    // =========================================================
    // 11.1. BULK GENERATE CERTIFICATES
    // POST /api/v1/certificates/bulk-generate
    // =========================================================
    [HttpPost("bulk-generate")]
    [ProducesResponseType(typeof(IReadOnlyList<CertificateResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> BulkGenerate([FromBody] BulkGenerateCertificateRequestDto request, CancellationToken ct = default)
    {
        if (request == null || request.AdmissionNos == null || !request.AdmissionNos.Any())
            return BadRequest(new { message = "At least one Admission number is required." });

        if (string.IsNullOrWhiteSpace(request.CertificateType))
            return BadRequest(new { message = "Certificate type is required." });

        if (string.IsNullOrWhiteSpace(request.Purpose))
            return BadRequest(new { message = "Purpose is required." });

        try
        {
            var results = await _service.BulkGenerateAsync(request, ct);
            return Ok(results);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = $"Error during bulk generation: {ex.Message}" });
        }
    }

    // =========================================================
    // 11.2. GET BULK ELIGIBLE STUDENTS (GRID SELECTION)
    // GET /api/v1/certificates/bulk-eligible-students
    // =========================================================
    [HttpGet("bulk-eligible-students")]
    [ProducesResponseType(typeof(IReadOnlyList<BulkEligibleStudentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBulkEligibleStudents(
        [FromQuery] int? academicYearId = null,
        [FromQuery] int? boardId = null,
        [FromQuery] int? groupId = null,
        [FromQuery] int? sectionId = null,
        [FromQuery] string? search = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var students = await _service.GetBulkEligibleStudentsAsync(academicYearId, boardId, groupId, sectionId, search, campusId, ct);
        return Ok(students);
    }

    // =========================================================
    // 12. CANCEL CERTIFICATE (Stage -> Cancelled)
    // PATCH /api/v1/certificates/{id}/cancel
    // =========================================================
    [HttpPatch("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var success = await _service.CancelAsync(id, ct);
        if (!success) return NotFound(new { message = "Certificate not found" });

        return Ok(new { success = true, message = "Certificate cancelled successfully" });
    }

    // =========================================================
    // 13. DELETE CERTIFICATE (Soft Delete)
    // DELETE /api/v1/certificates/{id}
    // =========================================================
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var success = await _service.DeleteAsync(id, ct);
        if (!success) return NotFound(new { message = "Certificate not found" });

        return Ok(new { success = true, message = "Certificate deleted successfully" });
    }

    // =========================================================
    // 13.1. UPDATE FEE CLEARANCE STATUS
    // PATCH /api/v1/certificates/{id}/fee-clearance
    // =========================================================
    [HttpPatch("{id:int}/fee-clearance")]
    public async Task<IActionResult> UpdateFeeClearance(
        int id, 
        [FromBody] CertificateFeeClearanceRequestDto request, 
        CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });
        if (request == null) return BadRequest(new { message = "Request body is required" });

        var success = await _service.UpdateFeeClearanceAsync(id, request, ct);
        if (!success) return NotFound(new { message = "Certificate not found or fee clearance could not be updated." });

        return Ok(new { success = true, message = "Fee clearance updated successfully." });
    }

    // =========================================================
    // 13.2. GRANT FEE EXEMPTION / PRINCIPAL PERMISSION
    // PATCH /api/v1/certificates/{id}/fee-exemption
    // =========================================================
    [HttpPatch("{id:int}/fee-exemption")]
    public async Task<IActionResult> GrantFeeExemption(
        int id, 
        [FromBody] CertificateFeeClearanceRequestDto request, 
        CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });
        if (request == null) return BadRequest(new { message = "Request body is required" });

        var success = await _service.GrantFeeExemptionAsync(id, request, ct);
        if (!success) return NotFound(new { message = "Certificate not found or fee exemption could not be recorded." });

        return Ok(new { success = true, message = "Principal permission / fee exemption granted successfully." });
    }

    // =========================================================
    // 14. REISSUE CERTIFICATE
    // POST /api/v1/certificates/reissue
    // =========================================================
    [HttpPost("reissue")]
    public async Task<IActionResult> Reissue([FromBody] ReissueCertificateDto request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest(new { message = "Request body is required." });
        if (string.IsNullOrWhiteSpace(request.AdmissionNo)) return BadRequest(new { message = "AdmissionNo is required." });

        var result = await _service.ReissueAsync(request, ct);
        if (result == null) return NotFound(new { message = $"Unable to reissue certificate for AdmissionNo '{request.AdmissionNo}'." });

        return Ok(result);
    }

    // =========================================================
    // 15. VERIFY CERTIFICATE (Public Link)
    // GET /api/v1/certificates/verify/{certificateNo}
    // =========================================================
    [HttpGet("verify/{certificateNo}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PublicCertificateVerificationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Verify(string certificateNo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(certificateNo)) return BadRequest(new { message = "Certificate number is required" });

        var result = await _service.VerifyPublicAsync(certificateNo, ct);
        if (result == null) return NotFound(new { message = "Certificate not found or cancelled" });

        return Ok(result);
    }

    // =========================================================
    // 15.1. VERIFY CERTIFICATE FULL (Authorized Admin/Principal)
    // GET /api/v1/certificates/verify-full/{certificateNo}
    // =========================================================
    [HttpGet("verify-full/{certificateNo}")]
    [Authorize]
    [ProducesResponseType(typeof(CertificateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyFull(string certificateNo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(certificateNo)) return BadRequest(new { message = "Certificate number is required" });

        var result = await _service.VerifyAsync(certificateNo, ct);
        if (result == null) return NotFound(new { message = "Certificate not found or cancelled" });

        return Ok(result);
    }

    // =========================================================
    // 16. DOWNLOAD CERTIFICATE PDF
    // GET /api/v1/certificates/download/{id}
    // =========================================================
    [HttpGet("download/{id:int}")]
    public async Task<IActionResult> Download(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var preview = await _service.GetPreviewAsync(id, ct);
        if (preview == null)
        {
            var certificate = await _service.GetByIdAsync(id, ct);
            if (certificate == null) return NotFound(new { message = "Certificate not found" });
            preview = _exportService.BuildPreviewFallback(certificate);
        }

        var bytes = _exportService.GenerateCertificatePdf(preview);
        return File(bytes, "application/pdf", $"{preview.CertificateNumber}.pdf");
    }

    // =========================================================
    // 17. EXPORT CERTIFICATES EXCEL / CSV
    // GET /api/v1/certificates/export/excel
    // =========================================================
    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? certificateType = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var certificates = await _service.GetAllAsync(search, status, certificateType, campusId, null, null, ct);
        var bytes = _exportService.ExportCertificatesCsv(certificates);
        return File(bytes, "text/csv", $"Certificates_Export_{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    // =========================================================
    // 18. EXPORT CERTIFICATES VISUAL MULTI-PAGE PDF
    // GET /api/v1/certificates/export/pdf
    // =========================================================
    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? certificateType = null,
        [FromQuery] int? campusId = null,
        CancellationToken ct = default)
    {
        campusId = GetCampusIdFromRequest(campusId);
        var certificates = await _service.GetAllAsync(search, status, certificateType, campusId, null, null, ct);
        var bytes = _exportService.GenerateBulkCertificatesPdf(certificates, ct);
        return File(bytes, "application/pdf", $"Bulk_Certificates_{DateTime.UtcNow:yyyy-MM-dd}.pdf");
    }
}
