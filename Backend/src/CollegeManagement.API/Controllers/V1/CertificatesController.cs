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
        CancellationToken ct = default)
    {
        var result = await _service.GetAllAsync(search, status, certificateType, ct);
        return Ok(result);
    }

    // =========================================================
    // 2. GET WORKFLOW STATS (5 Stage Count Badges)
    // GET /api/v1/certificates/workflow-stats
    // =========================================================
    [HttpGet("workflow-stats")]
    [ProducesResponseType(typeof(CertificateWorkflowStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowStats(CancellationToken ct = default)
    {
        var stats = await _service.GetWorkflowStatsAsync(ct);
        return Ok(stats);
    }

    // =========================================================
    // 3. GET STUDENTS DROPDOWN (For Create Certificate Auto-fill)
    // GET /api/v1/certificates/students-dropdown
    // =========================================================
    [HttpGet("students-dropdown")]
    [ProducesResponseType(typeof(IReadOnlyList<StudentCertificateDropdownDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStudentsDropdown(CancellationToken ct = default)
    {
        var students = await _service.GetStudentsDropdownAsync(ct);
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
        CancellationToken ct = default)
    {
        var students = await _service.GetBulkEligibleStudentsAsync(academicYearId, boardId, groupId, sectionId, search, ct);
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
    [HttpGet("download/{id:int}")]
    public async Task<IActionResult> Download(int id, CancellationToken ct = default)
    {
        if (id <= 0) return BadRequest(new { message = "Invalid certificate ID" });

        var certificate = await _service.GetByIdAsync(id, ct);
        if (certificate == null) return NotFound(new { message = "Certificate not found" });

        var signaturePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "signature.png");
        var hasSignature = System.IO.File.Exists(signaturePath);

        var bytes = BuildCertificatePdf(certificate, hasSignature ? signaturePath : null);

        return File(bytes, "application/pdf", $"{certificate.CertificateNumber}.pdf");
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
        CancellationToken ct = default)
    {
        var certificates = await _service.GetAllAsync(search, status, certificateType, ct);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Certificate Number,Admission Number,Student Name,Academic Level,Group,Certificate Type,Request Date,Issue Date,Status,Issued By,Purpose,Remarks");

        foreach (var c in certificates)
        {
            var issueDateStr = c.IssueDate != default ? c.IssueDate.ToString("dd/MM/yyyy") : "";
            sb.AppendLine($"\"{c.CertificateNumber}\",\"{c.AdmissionNo}\",\"{c.StudentName}\",\"{c.AcademicLevel}\",\"{c.GroupName}\",\"{c.CertificateType}\",\"{c.RequestDate:dd/MM/yyyy}\",\"{issueDateStr}\",\"{c.Status}\",\"{c.IssuedBy ?? ""}\",\"{c.Purpose?.Replace("\"", "\"\"")}\",\"{c.Remarks?.Replace("\"", "\"\"")}\"");
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"Certificates_Export_{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    // =========================================================
    // 18. EXPORT CERTIFICATES REPORT PDF
    // GET /api/v1/certificates/export/pdf
    // =========================================================
    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? certificateType = null,
        CancellationToken ct = default)
    {
        var certificates = await _service.GetAllAsync(search, status, certificateType, ct);

        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(30);

                page.Header().Column(col =>
                {
                    col.Item().AlignCenter().Text("COLLEGE MANAGEMENT SYSTEM - CERTIFICATE RECORDS").Bold().FontSize(16).FontColor("#1b5e20");
                    col.Item().AlignCenter().Text($"Generated on: {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC | Total Records: {certificates.Count}").FontSize(10).FontColor("#666666");
                    col.Item().PaddingTop(4).LineHorizontal(1).LineColor("#cccccc");
                });

                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.ConstantColumn(30);
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(1.2f);
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(1.8f);
                        cols.RelativeColumn(1.2f);
                        cols.RelativeColumn(1.2f);
                        cols.RelativeColumn(1.2f);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Background("#2e7d32").Padding(4).Text("#").Bold().FontColor("#ffffff").FontSize(9);
                        header.Cell().Background("#2e7d32").Padding(4).Text("Cert No").Bold().FontColor("#ffffff").FontSize(9);
                        header.Cell().Background("#2e7d32").Padding(4).Text("Adm No").Bold().FontColor("#ffffff").FontSize(9);
                        header.Cell().Background("#2e7d32").Padding(4).Text("Student").Bold().FontColor("#ffffff").FontSize(9);
                        header.Cell().Background("#2e7d32").Padding(4).Text("Type").Bold().FontColor("#ffffff").FontSize(9);
                        header.Cell().Background("#2e7d32").Padding(4).Text("Req Date").Bold().FontColor("#ffffff").FontSize(9);
                        header.Cell().Background("#2e7d32").Padding(4).Text("Issue Date").Bold().FontColor("#ffffff").FontSize(9);
                        header.Cell().Background("#2e7d32").Padding(4).Text("Status").Bold().FontColor("#ffffff").FontSize(9);
                    });

                    int idx = 1;
                    foreach (var c in certificates)
                    {
                        var bg = idx % 2 == 0 ? "#f9f9f9" : "#ffffff";
                        var issueDateStr = c.IssueDate != default ? c.IssueDate.ToString("dd/MM/yyyy") : "-";
                        table.Cell().Background(bg).Padding(4).Text(idx.ToString()).FontSize(8);
                        table.Cell().Background(bg).Padding(4).Text(c.CertificateNumber).Bold().FontSize(8);
                        table.Cell().Background(bg).Padding(4).Text(c.AdmissionNo).FontSize(8);
                        table.Cell().Background(bg).Padding(4).Text($"{c.StudentName}\n({c.AcademicLevel})").FontSize(8);
                        table.Cell().Background(bg).Padding(4).Text(c.CertificateType).FontSize(8);
                        table.Cell().Background(bg).Padding(4).Text(c.RequestDate.ToString("dd/MM/yyyy")).FontSize(8);
                        table.Cell().Background(bg).Padding(4).Text(issueDateStr).FontSize(8);
                        table.Cell().Background(bg).Padding(4).Text(c.Status).Bold().FontSize(8);
                        idx++;
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });

        return File(document.GeneratePdf(), "application/pdf", $"Certificates_Report_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf");
    }

    // =========================================================
    // QUESTPDF STYLED CERTIFICATE BUILDER
    // =========================================================
    private static byte[] BuildCertificatePdf(CertificateResponseDto certificate, string? signaturePath)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);

                page.Content().Border(3).BorderColor("#2e7d32").Padding(24).Column(column =>
                {
                    column.Spacing(8);

                    // Top Header
                    column.Item().AlignCenter().Text("COLLEGE MANAGEMENT SYSTEM").Bold().FontSize(22).FontColor("#1b5e20");
                    column.Item().AlignCenter().Text("Recognized by State Board of Intermediate Education").FontSize(11).FontColor("#555555");
                    column.Item().PaddingTop(6).LineHorizontal(1.5f).LineColor("#2e7d32");

                    // Certificate Title Banner
                    column.Item().PaddingTop(16).AlignCenter().Text(certificate.CertificateType.ToUpperInvariant()).Bold().FontSize(18).FontColor("#1b5e20");
                    column.Item().AlignCenter().Text($"Certificate No: {certificate.CertificateNumber}").FontSize(11).Bold().FontColor("#333333");

                    // Body Statement
                    column.Item().PaddingTop(24).Text(text =>
                    {
                        text.Span("This is to certify that ").FontSize(13);
                        text.Span(certificate.StudentName).Bold().FontSize(14).FontColor("#1b5e20");
                        text.Span(" bearing Admission Number ").FontSize(13);
                        text.Span(certificate.AdmissionNo).Bold().FontSize(13);
                        text.Span(" is/was a bonafide student of this institution studying in ");
                        text.Span(!string.IsNullOrWhiteSpace(certificate.AcademicLevel) ? certificate.AcademicLevel : "1st Year").Bold().FontSize(13);
                        text.Span(" (Group: ");
                        text.Span(!string.IsNullOrWhiteSpace(certificate.GroupName) ? certificate.GroupName : "General").Bold().FontSize(13);
                        text.Span(") for the Academic Year ");
                        text.Span(!string.IsNullOrWhiteSpace(certificate.AcademicYear) ? certificate.AcademicYear : $"{DateTime.UtcNow.Year}-{DateTime.UtcNow.Year + 1}").Bold().FontSize(13);
                        text.Span(".");
                    });

                    // Purpose & Remarks
                    column.Item().PaddingTop(16).Text(text =>
                    {
                        text.Span("This certificate is issued on request for the purpose of: ").FontSize(12);
                        text.Span(certificate.Purpose).Bold().FontSize(12);
                    });

                    if (!string.IsNullOrWhiteSpace(certificate.Remarks))
                    {
                        column.Item().PaddingTop(6).Text($"Remarks: {certificate.Remarks}").FontSize(11).Italic().FontColor("#666666");
                    }

                    // Metadata details table
                    column.Item().PaddingTop(20).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn();
                            columns.RelativeColumn();
                        });

                        table.Cell().Text($"Request Date: {certificate.RequestDate:dd/MM/yyyy}").FontSize(11);
                        table.Cell().AlignRight().Text($"Issue Date: {certificate.IssueDate:dd/MM/yyyy}").FontSize(11);
                        table.Cell().Text($"Status: {certificate.Status}").FontSize(11).Bold();
                        table.Cell().AlignRight().Text($"Issued By: {certificate.IssuedBy ?? "Principal"}").FontSize(11);
                    });

                    // Footer with signatures
                    column.Item().PaddingTop(40).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().PaddingTop(30).Text("Office Seal").FontSize(11).Bold();
                        });

                        row.RelativeItem().AlignRight().Column(c =>
                        {
                            if (!string.IsNullOrWhiteSpace(signaturePath) && System.IO.File.Exists(signaturePath))
                            {
                                c.Item().Width(140).Height(50).Image(signaturePath);
                            }
                            else
                            {
                                c.Item().PaddingTop(30);
                            }
                            c.Item().Text("Principal / Authorized Signatory").FontSize(11).Bold();
                        });
                    });
                });
            });
        });

        return document.GeneratePdf();
    }
}