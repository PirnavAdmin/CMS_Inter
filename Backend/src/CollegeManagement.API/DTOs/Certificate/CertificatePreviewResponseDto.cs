using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Certificate;

public class CertificatePreviewResponseDto
{
    public int CertificateId { get; set; }
    public string CertificateNumber { get; set; } = string.Empty;
    public string CertificateType { get; set; } = string.Empty;
    public string Status { get; set; } = "Generated";
    public DateTime? RequestDate { get; set; }
    public DateTime? IssueDate { get; set; }
    public string? IssuedBy { get; set; }
    public string Purpose { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    // Template metadata
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateTitle { get; set; } = string.Empty;
    public string Orientation { get; set; } = "Landscape";
    public string BorderColor { get; set; } = "#1e3a8a";
    public string BadgeBgColor { get; set; } = "#1e3a8a";
    public string BadgeTextColor { get; set; } = "#ffffff";
    public string SignatureType { get; set; } = "Principal";
    public string SealText { get; set; } = "PIRNAV COLLEGE\nVIJAYAWADA";
    public bool QrEnabled { get; set; } = true;

    // Fully hydrated content components
    public string Heading { get; set; } = string.Empty;
    public string ParagraphOne { get; set; } = string.Empty;
    public string ParagraphTwo { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;

    // Key-value dictionary of all interpolated placeholders
    public Dictionary<string, string> DataPayload { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
