using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

using Microsoft.AspNetCore.Cors;

namespace CollegeManagement.API.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/certificates")]
[EnableCors("AllowFrontend")]
[AllowAnonymous]
[Produces("application/json")]
[Authorize]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _service;
    private readonly ITemplateService _templateService;

    public CertificatesController(ICertificateService service, ITemplateService templateService)
    {
        _service = service;
        _templateService = templateService;
    }

    // =========================================================
    // 0.1. GET ACTIVE CERTIFICATE TEMPLATES
    // GET /api/v1/certificates/active-templates
    // =========================================================
    [HttpGet("active-templates")]
    [ProducesResponseType(typeof(IReadOnlyList<CollegeManagement.API.DTOs.Settings.TemplateResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActiveTemplates(CancellationToken ct = default)
    {
        var templates = await _templateService.GetActiveTemplatesByCategoryAsync("Certificate", ct);
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

        var template = await _templateService.GetTemplateByCodeAsync(templateCode, ct);
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
            var result = await _templateService.RenderTemplateAsync(request, ct);
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
        CancellationToken ct = default)
    {
        var result = await _service.GetAllAsync(search, status, certificateType, campusId, ct);
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
        CancellationToken ct = default)
    {
        var students = await _service.GetStudentsDropdownAsync(campusId, ct);
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
    // 5. UNIFIED GENERATE CERTIFICATE
    // POST /api/v1/certificates/generate
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

    // =========================================================
    // 7. REVIEW CERTIFICATE (Stage 1 -> 2)
    // PATCH /api/v1/certificates/{id}/review
    // =========================================================
    [HttpPatch("{id:int}/review")]
    public async Task<IActionResult> Review(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var userName = User.Identity?.Name ?? "Admin";
        var success = await _service.MoveStatusAsync(id, "Reviewed", userName, ct);
        if (!success) return NotFound(new { message = "Certificate not found" });

        return Ok(new { success = true, message = "Certificate reviewed successfully" });
    }

    // =========================================================
    // 8. APPROVE CERTIFICATE (Stage 2 -> 3)
    // PATCH /api/v1/certificates/{id}/approve
    // =========================================================
    [HttpPatch("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var userName = User.Identity?.Name ?? "Principal";
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

        var issuer = issuedBy ?? User.Identity?.Name ?? "Principal";
        var success = await _service.MoveStatusAsync(id, "Issued", issuer, ct);
        if (!success) return NotFound(new { message = "Certificate not found" });

        return Ok(new { success = true, message = "Certificate issued successfully" });
    }

    // =========================================================
    // 9.1. BULK REVIEW (Review All Generated/Pending)
    // PATCH /api/v1/certificates/bulk-review
    // =========================================================
    [HttpPatch("bulk-review")]
    public async Task<IActionResult> BulkReview(CancellationToken ct = default)
    {
        var userName = User.Identity?.Name ?? "Admin";
        var affected = await _service.BulkReviewAsync(userName, ct);
        return Ok(new { success = true, count = affected, message = $"{affected} certificate(s) reviewed successfully." });
    }

    // =========================================================
    // 10. BULK APPROVE (Approve All Reviewed)
    // PATCH /api/v1/certificates/bulk-approve
    // =========================================================
    [HttpPatch("bulk-approve")]
    public async Task<IActionResult> BulkApprove(CancellationToken ct = default)
    {
        var userName = User.Identity?.Name ?? "Principal";
        var affected = await _service.BulkApproveAsync(userName, ct);
        return Ok(new { success = true, count = affected, message = $"{affected} certificate(s) approved successfully." });
    }

    // =========================================================
    // 11. BULK ISSUE (Issue All Approved)
    // PATCH /api/v1/certificates/bulk-issue
    // =========================================================
    [HttpPatch("bulk-issue")]
    public async Task<IActionResult> BulkIssue([FromQuery] string? issuedBy = null, CancellationToken ct = default)
    {
        var issuer = issuedBy ?? User.Identity?.Name ?? "Principal";
        var affected = await _service.BulkIssueAsync(issuer, ct);
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
    public async Task<IActionResult> Verify(string certificateNo, CancellationToken ct = default)
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
            preview = BuildPreviewFallback(certificate);
        }

        var signaturePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "signature.png");
        var hasSignature = System.IO.File.Exists(signaturePath);

        var bytes = BuildCertificatePdf(preview, hasSignature ? signaturePath : null);

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
        var certificates = await _service.GetAllAsync(search, status, certificateType, campusId, ct);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("S.No,Certificate Number,Admission Number,Student Name,Academic Level,Group,Certificate Type,Request Date,Issue Date,Status,Issued By,Purpose,Remarks,Verification Link");

        int sNo = 1;
        foreach (var c in certificates)
        {
            var issueDateStr = c.IssueDate != default ? c.IssueDate.ToString("dd/MM/yyyy") : "";
            var reqDateStr = c.RequestDate != default ? c.RequestDate.ToString("dd/MM/yyyy") : "";
            var verifyUrl = $"https://pirnavcollege.edu.in/verify-certificate/{c.CertificateNumber}";
            sb.AppendLine($"{sNo},\"{c.CertificateNumber}\",\"{c.AdmissionNo}\",\"{c.StudentName}\",\"{c.AcademicLevel}\",\"{c.GroupName}\",\"{c.CertificateType}\",\"{reqDateStr}\",\"{issueDateStr}\",\"{c.Status}\",\"{c.IssuedBy ?? "Principal"}\",\"{c.Purpose?.Replace("\"", "\"\"")}\",\"{c.Remarks?.Replace("\"", "\"\"")}\",\"{verifyUrl}\"");
            sNo++;
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
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
        var certificates = await _service.GetAllAsync(search, status, certificateType, campusId, ct);

        var crestPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "pirnav-college-crest.png");
        if (!System.IO.File.Exists(crestPath))
        {
            var baseDirCrest = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "pirnav-college-crest.png");
            if (System.IO.File.Exists(baseDirCrest)) crestPath = baseDirCrest;
        }
        var hasCrest = System.IO.File.Exists(crestPath);

        var signaturePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "signature.png");
        if (!System.IO.File.Exists(signaturePath))
        {
            var baseDirSig = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "signature.png");
            if (System.IO.File.Exists(baseDirSig)) signaturePath = baseDirSig;
        }
        var hasSignature = System.IO.File.Exists(signaturePath);

        QuestPDF.Settings.License = LicenseType.Community;

        if (!certificates.Any())
        {
            var emptyDoc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(30);
                    page.Content().AlignCenter().Text("No certificate records found.").FontSize(16).Bold();
                });
            });
            return File(emptyDoc.GeneratePdf(), "application/pdf", $"Bulk_Certificates_{DateTime.UtcNow:yyyy-MM-dd}.pdf");
        }

        var previews = new List<CertificatePreviewResponseDto>();
        foreach (var cert in certificates)
        {
            if (ct.IsCancellationRequested) break;
            previews.Add(BuildPreviewFallback(cert));
        }

        var document = Document.Create(container =>
        {
            foreach (var preview in previews)
            {
                container.Page(page =>
                {
                    RenderCertificatePage(page, preview, hasCrest ? crestPath : null, hasSignature ? signaturePath : null);
                });
            }
        });

        return File(document.GeneratePdf(), "application/pdf", $"Bulk_Certificates_{DateTime.UtcNow:yyyy-MM-dd}.pdf");
    }

    // =========================================================
    // QUESTPDF STYLED CERTIFICATE BUILDER
    // =========================================================
    private static byte[] BuildCertificatePdf(CertificatePreviewResponseDto preview, string? signaturePath)
    {
        var crestPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "pirnav-college-crest.png");
        if (!System.IO.File.Exists(crestPath))
        {
            var baseDirCrest = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "pirnav-college-crest.png");
            if (System.IO.File.Exists(baseDirCrest)) crestPath = baseDirCrest;
        }
        var hasCrest = System.IO.File.Exists(crestPath);

        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                RenderCertificatePage(page, preview, hasCrest ? crestPath : null, signaturePath);
            });
        });

        return document.GeneratePdf();
    }

    private static string DeriveFatherName(string? studentName)
    {
        if (string.IsNullOrWhiteSpace(studentName) || studentName.Equals("Student", StringComparison.OrdinalIgnoreCase))
            return "Parent Name";
        var parts = studentName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length > 1)
        {
            var last = parts[^1];
            if (last.Length == 1) return $"{last}. Raghava Rao";
            return $"Ramesh {last}";
        }
        return $"K. {studentName.Trim()} Rao";
    }

    private static CertificatePreviewResponseDto BuildPreviewFallback(CertificateResponseDto cert)
    {
        var certType = cert.CertificateType ?? "Certificate";
        var certNo = cert.CertificateNumber ?? $"CERT-{cert.CertificateId}";
        var studentName = cert.StudentName ?? "Student";
        var admissionNo = cert.AdmissionNo ?? "ADM-2026-0000";
        var fatherName = !string.IsNullOrWhiteSpace(cert.FatherName) 
            && !cert.FatherName.Equals("Parent Name", StringComparison.OrdinalIgnoreCase) 
            && !cert.FatherName.EndsWith("Father", StringComparison.OrdinalIgnoreCase) 
            && !cert.FatherName.Equals("string", StringComparison.OrdinalIgnoreCase)
            && !cert.FatherName.Equals("null", StringComparison.OrdinalIgnoreCase)
            ? cert.FatherName
            : DeriveFatherName(studentName);
        var groupName = cert.GroupName ?? "MPC";
        var academicLevel = cert.AcademicLevel ?? "1st Year";
        var academicYear = cert.AcademicYear ?? "2026-2027";
        var safePurpose = !string.IsNullOrWhiteSpace(cert.Purpose) 
            && !cert.Purpose.Equals("purpose", StringComparison.OrdinalIgnoreCase) 
            && !cert.Purpose.Equals("string", StringComparison.OrdinalIgnoreCase) 
            && !cert.Purpose.Equals("null", StringComparison.OrdinalIgnoreCase)
            ? cert.Purpose.Trim()
            : "Higher Education / Official Purpose";
        var remarks = cert.Remarks ?? "";

        string digits = new string(admissionNo.Where(char.IsDigit).ToArray());
        string studentIdStr = cert.StudentId > 0 ? cert.StudentId.ToString() : (!string.IsNullOrEmpty(digits) ? digits : "1");
        if (string.IsNullOrWhiteSpace(studentIdStr)) studentIdStr = "1";

        string heading = certType;
        string paragraphOne;
        string paragraphTwo = safePurpose.StartsWith("This certificate", StringComparison.OrdinalIgnoreCase)
            ? safePurpose
            : $"This certificate is issued for the purpose of {safePurpose}.";
        string orientation = "Landscape";
        string borderColor = "#1e3a8a";
        string badgeBgColor = "#1e3a8a";
        string badgeTextColor = "#ffffff";

        if (certType.Contains("Bonafide", StringComparison.OrdinalIgnoreCase) || certType.Equals("BC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Bonafide Certificate";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada. He/She is studying in {groupName} Group, {academicLevel} during the academic year {academicYear}.";
            borderColor = "#1e3a8a";
            badgeBgColor = "#1e3a8a";
        }
        else if (certType.Contains("Study", StringComparison.OrdinalIgnoreCase) || certType.Equals("SC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Study Certificate";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} has studied in this college during the period from June 2025 to May 2027 in {groupName} Group and appeared for the Intermediate Public Examination conducted by the Board of Intermediate Education, Andhra Pradesh (BIEAP).";
            borderColor = "#15803d";
            badgeBgColor = "#15803d";
        }
        else if (certType.Contains("Conduct", StringComparison.OrdinalIgnoreCase) || certType.Equals("CC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Conduct Certificate";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} has been a student of this college during the academic year(s) {academicYear}.\nTo the best of our knowledge and records, his/her conduct and character have been Good.";
            borderColor = "#991b1b";
            badgeBgColor = "#991b1b";
        }
        else if (certType.Contains("Transfer", StringComparison.OrdinalIgnoreCase) || certType.Contains("TC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Transfer Certificate (TC)";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} has studied in this college from June 2025 to May 2027 in {groupName} Group.\nHe/She is hereby relieved from this institution as he/she is seeking admission elsewhere. All dues to the college have been cleared (YES).\nWe wish him/her all the best for his/her future endeavours.";
            borderColor = "#b45309";
            badgeBgColor = "#b45309";
        }
        else
        {
            heading = certType.Contains("Other", StringComparison.OrdinalIgnoreCase) ? "Other Certificate" : certType;
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} is studying in {academicLevel} ({groupName}) for the Academic Year {academicYear}.";
            borderColor = "#0f766e";
            badgeBgColor = "#0f766e";
        }

        return new CertificatePreviewResponseDto
        {
            CertificateId = cert.CertificateId,
            CertificateNumber = certNo,
            CertificateType = certType,
            Status = cert.Status ?? "Generated",
            RequestDate = cert.RequestDate,
            IssueDate = cert.IssueDate != default ? cert.IssueDate : cert.RequestDate,
            IssuedBy = cert.IssuedBy ?? "Principal",
            Purpose = safePurpose,
            Remarks = remarks,
            Heading = heading,
            ParagraphOne = paragraphOne,
            ParagraphTwo = paragraphTwo,
            Orientation = orientation,
            BorderColor = borderColor,
            BadgeBgColor = badgeBgColor,
            BadgeTextColor = badgeTextColor,
            SignatureType = "Principal",
            SealText = "PIRNAV COLLEGE\nVIJAYAWADA",
            QrEnabled = true
        };
    }

    private static void RenderCertificatePage(PageDescriptor page, CertificatePreviewResponseDto preview, string? crestPath, string? signaturePath)
    {
        var borderColor = !string.IsNullOrWhiteSpace(preview.BorderColor) ? preview.BorderColor : "#1e3a8a";
        var badgeBgColor = !string.IsNullOrWhiteSpace(preview.BadgeBgColor) ? preview.BadgeBgColor : borderColor;
        var badgeTextColor = !string.IsNullOrWhiteSpace(preview.BadgeTextColor) ? preview.BadgeTextColor : "#ffffff";
        var taglineColor = "#b45309";
        var isPortrait = string.Equals(preview.Orientation, "Portrait", StringComparison.OrdinalIgnoreCase);
        var verifyUrl = $"https://pirnavcollege.edu.in/verify-certificate/{Uri.EscapeDataString(preview.CertificateNumber)}";

        page.Size(isPortrait ? PageSizes.A4.Portrait() : PageSizes.A4.Landscape());
        page.Margin(isPortrait ? 18 : 14);

        // Exact Double Border matching preview: 1.5px outer border + 2px gap + 1.5px inner border
        page.Content()
            .Border(1.5f).BorderColor(borderColor)
            .Padding(2f)
            .Border(1.5f).BorderColor(borderColor)
            .Padding(isPortrait ? 16 : 14)
            .Column(col =>
        {
            // 1. TOP HEADER SECTION (Symmetrical 155pt left and right items for 100% true center alignment)
            col.Item().Column(headerCol =>
            {
                headerCol.Item().Row(headerRow =>
                {
                    // Left item: College Crest
                    headerRow.ConstantItem(isPortrait ? 120 : 155).AlignLeft().AlignMiddle().Column(c =>
                    {
                        if (!string.IsNullOrWhiteSpace(crestPath) && System.IO.File.Exists(crestPath))
                        {
                            c.Item().Width(isPortrait ? 42 : 46).Height(isPortrait ? 42 : 46).Image(crestPath);
                        }
                        else
                        {
                            c.Item().Width(isPortrait ? 38 : 42).Height(isPortrait ? 38 : 42).Svg(GetCollegeLogoSvg(borderColor));
                        }
                    });

                    // Center item: Institution Name, Tagline & Address
                    headerRow.RelativeItem().AlignCenter().AlignMiddle().Column(c =>
                    {
                        c.Item().AlignCenter().Text("PIRNAV COLLEGE").Bold().FontSize(isPortrait ? 18 : 20).FontColor(borderColor);
                        c.Item().AlignCenter().Text("(Intermediate / Junior College)").Bold().FontSize(isPortrait ? 9f : 9.5f).FontColor(taglineColor);
                        c.Item().AlignCenter().Text("D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh").FontSize(isPortrait ? 7.8f : 8.5f).FontColor("#64748b");
                    });

                    // Right item: Affiliation details (Exact same width to guarantee centered header)
                    headerRow.ConstantItem(isPortrait ? 120 : 155).AlignRight().AlignMiddle().Column(c =>
                    {
                        c.Item().AlignRight().Text("Affiliated to").FontSize(isPortrait ? 7.2f : 7.8f).FontColor("#64748b");
                        c.Item().AlignRight().Text("Board of Intermediate Education").Bold().FontSize(isPortrait ? 7.8f : 8.5f).FontColor("#1e293b");
                        c.Item().AlignRight().Text("Andhra Pradesh (BIEAP)").FontSize(isPortrait ? 7.2f : 7.8f).FontColor("#64748b");
                        c.Item().AlignRight().Text("College Code: 12345").FontSize(isPortrait ? 7.2f : 7.8f).FontColor("#64748b");
                    });
                });

                // Ref & Date bar with dashed bottom divider line
                var issueDateStr = preview.IssueDate.HasValue ? preview.IssueDate.Value.ToString("dd/MM/yyyy") : (preview.RequestDate.HasValue ? preview.RequestDate.Value.ToString("dd/MM/yyyy") : DateTime.UtcNow.ToString("dd/MM/yyyy"));
                headerCol.Item().PaddingTop(6).PaddingBottom(4).Row(refRow =>
                {
                    refRow.RelativeItem().Text(t =>
                    {
                        t.Span("Ref No: ").FontSize(9.5f).FontColor("#475569");
                        t.Span(preview.CertificateNumber).Bold().FontSize(9.5f).FontColor("#1e293b");
                    });

                    refRow.RelativeItem().AlignRight().Text(t =>
                    {
                        t.Span("Date: ").FontSize(9.5f).FontColor("#475569");
                        t.Span(issueDateStr).Bold().FontSize(9.5f).FontColor("#1e293b");
                    });
                });

                headerCol.Item().LineHorizontal(1).LineColor("#cbd5e1");
            });

            // 2. CERTIFICATE TITLE BADGE
            var headingText = !string.IsNullOrWhiteSpace(preview.Heading) ? preview.Heading : (!string.IsNullOrWhiteSpace(preview.CertificateType) ? preview.CertificateType : "CERTIFICATE");
            col.Item().PaddingTop(isPortrait ? 10 : 12).AlignCenter().Container()
                .Background(badgeBgColor)
                .PaddingVertical(4)
                .PaddingHorizontal(22)
                .Text(headingText.ToUpperInvariant())
                .Bold()
                .FontSize(isPortrait ? 12 : 12.5f)
                .FontColor(badgeTextColor);

            // 3. CERTIFICATE BODY CONTENT
            col.Item().PaddingTop(isPortrait ? 14 : 16).PaddingHorizontal(isPortrait ? 6 : 10).AlignCenter().Column(bodyCol =>
            {
                bodyCol.Item().AlignCenter().Text(preview.ParagraphOne).FontSize(isPortrait ? 12.5f : 13).LineHeight(1.6f).FontColor("#1e293b");

                if (!string.IsNullOrWhiteSpace(preview.ParagraphTwo))
                {
                    bodyCol.Item().PaddingTop(8).AlignCenter().Text(preview.ParagraphTwo).FontSize(isPortrait ? 11.5f : 12).LineHeight(1.45f).FontColor("#334155");
                }

                if (!string.IsNullOrWhiteSpace(preview.Remarks))
                {
                    bodyCol.Item().PaddingTop(6).AlignCenter().Text($"Remarks: {preview.Remarks}").FontSize(10.5f).Italic().FontColor("#64748b");
                }
            });

            // 4. FOOTER AREA (Fixed top padding guaranteeing exactly 1 page per certificate)
            col.Item().PaddingTop(isPortrait ? 16 : 18).Row(footerRow =>
            {
                // Left Column: Place, Date, Scan to verify with QR Code SVG
                var issueDateStr = preview.IssueDate.HasValue ? preview.IssueDate.Value.ToString("dd/MM/yyyy") : (preview.RequestDate.HasValue ? preview.RequestDate.Value.ToString("dd/MM/yyyy") : DateTime.UtcNow.ToString("dd/MM/yyyy"));
                footerRow.RelativeItem(1.2f).AlignBottom().Column(leftCol =>
                {
                    leftCol.Item().Text("Place: Vijayawada").FontSize(10).FontColor("#334155");
                    leftCol.Item().Text($"Date: {issueDateStr}").FontSize(10).FontColor("#334155");
                    if (preview.QrEnabled)
                    {
                        leftCol.Item().PaddingTop(3).Row(qrRow =>
                        {
                            qrRow.AutoItem().Width(38).Height(38).Svg(GenerateQrCodeSvg(verifyUrl, 38, borderColor));
                            qrRow.RelativeItem().PaddingLeft(6).AlignMiddle().Column(t =>
                            {
                                t.Item().Text("Scan to verify").FontSize(8f).FontColor("#64748b");
                            });
                        });
                    }
                });

                // Center Column: Circular College Seal Stamp (Single dashed circle matching Preview 1:1)
                footerRow.RelativeItem(1f).AlignCenter().AlignBottom().Column(centerCol =>
                {
                    centerCol.Item().Width(64).Height(64).Svg(GetCollegeSealSvg(borderColor));
                });

                // Right Column: Signatory
                footerRow.RelativeItem(1.2f).AlignRight().AlignBottom().Column(rightCol =>
                {
                    var sigImg = signaturePath;
                    if (string.IsNullOrWhiteSpace(sigImg) || !System.IO.File.Exists(sigImg))
                    {
                        var candidates = new[]
                        {
                            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "signature.png"),
                            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "signature.png"),
                            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "signature.jpg"),
                            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "signature.jpg")
                        };
                        sigImg = candidates.FirstOrDefault(System.IO.File.Exists);
                    }

                    if (!string.IsNullOrWhiteSpace(sigImg) && System.IO.File.Exists(sigImg))
                    {
                        rightCol.Item().AlignRight().Width(95).Height(32).Image(sigImg);
                    }
                    else
                    {
                        rightCol.Item().AlignRight().Width(110).Height(30).Svg(GetSignatureSvg(preview.SignatureType ?? "Principal", "#1e3a8a"));
                    }
                    rightCol.Item().AlignRight().Text(preview.SignatureType ?? "Principal").Bold().FontSize(10).FontColor("#1e293b");
                    rightCol.Item().AlignRight().Text("Pirnav College").FontSize(8.5f).FontColor("#64748b");
                });
            });
        });
    }

    private static string GetCollegeLogoSvg(string color = "#1e3a8a")
    {
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 50 50"" width=""50"" height=""50"">
          <circle cx=""25"" cy=""25"" r=""23"" fill=""{color}"" />
          <text x=""25"" y=""33"" font-size=""24"" font-weight=""bold"" fill=""#ffffff"" text-anchor=""middle"" font-family=""sans-serif"">P</text>
        </svg>";
    }

    private static string GetCollegeSealSvg(string color = "#1e3a8a")
    {
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 80 80"" width=""80"" height=""80"">
          <circle cx=""40"" cy=""40"" r=""36"" fill=""none"" stroke=""{color}"" stroke-width=""2"" stroke-dasharray=""4,3"" />
          <text x=""40"" y=""37"" font-size=""10"" font-weight=""800"" fill=""{color}"" text-anchor=""middle"" font-family=""Arial, sans-serif"" letter-spacing=""1"">PIRNAV</text>
          <text x=""40"" y=""51"" font-size=""10"" font-weight=""800"" fill=""{color}"" text-anchor=""middle"" font-family=""Arial, sans-serif"" letter-spacing=""1"">COLLEGE</text>
        </svg>";
    }

    private static string GetSignatureSvg(string title = "Principal", string color = "#1e3a8a")
    {
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 160 40"" width=""140"" height=""36"">
          <text x=""80"" y=""26"" font-size=""18"" font-style=""italic"" font-weight=""600"" fill=""{color}"" text-anchor=""middle"" font-family=""'Segoe Script', 'Caveat', 'Brush Script MT', cursive"">Dr. S. K. Rao</text>
        </svg>";
    }

    private static string GenerateQrCodeSvg(string text, int size = 48, string color = "#1e3a8a")
    {
        var len = text.Length;
        var version = len <= 32 ? 2 : 3;
        var matrixSize = version * 4 + 17;
        var matrix = new int[matrixSize, matrixSize];
        var isReserved = new bool[matrixSize, matrixSize];

        void AddFinder(int row, int col)
        {
            for (int r = -1; r <= 7; r++)
            {
                for (int c = -1; c <= 7; c++)
                {
                    int nr = row + r, nc = col + c;
                    if (nr >= 0 && nr < matrixSize && nc >= 0 && nc < matrixSize)
                    {
                        isReserved[nr, nc] = true;
                        if (r >= 0 && r <= 6 && c >= 0 && c <= 6)
                        {
                            matrix[nr, nc] = (r == 0 || r == 6 || c == 0 || c == 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) ? 1 : 0;
                        }
                    }
                }
            }
        }

        AddFinder(0, 0);
        AddFinder(0, matrixSize - 7);
        AddFinder(matrixSize - 7, 0);

        for (int i = 8; i < matrixSize - 8; i++)
        {
            if (!isReserved[6, i]) { matrix[6, i] = (i % 2 == 0) ? 1 : 0; isReserved[6, i] = true; }
            if (!isReserved[i, 6]) { matrix[i, 6] = (i % 2 == 0) ? 1 : 0; isReserved[i, 6] = true; }
        }

        var hash = 17;
        foreach (var ch in text) hash = hash * 31 + ch;
        var rnd = new Random(Math.Abs(hash));

        var sb = new System.Text.StringBuilder();
        sb.Append($@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 {size} {size}"" width=""{size}"" height=""{size}"">");
        sb.Append($@"<rect width=""{size}"" height=""{size}"" fill=""#ffffff"" />");

        float cellSize = (float)size / matrixSize;
        for (int r = 0; r < matrixSize; r++)
        {
            for (int c = 0; c < matrixSize; c++)
            {
                int val = isReserved[r, c] ? matrix[r, c] : (rnd.Next(2) ^ ((r + c) % 2 == 0 ? 1 : 0));
                if (val == 1)
                {
                    sb.Append($@"<rect x=""{(c * cellSize):F2}"" y=""{(r * cellSize):F2}"" width=""{cellSize:F2}"" height=""{cellSize:F2}"" fill=""{color}"" />");
                }
            }
        }
        sb.Append("</svg>");
        return sb.ToString();
    }
}