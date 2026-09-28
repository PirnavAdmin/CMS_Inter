using System;

namespace CollegeManagement.API.DTOs.Certificate;

public class CertificateResponseDto
{
    public int CertificateId { get; set; }

    public string CertificateNumber { get; set; } = string.Empty;

    public int StudentId { get; set; }

    public string AdmissionNo { get; set; } = string.Empty;

    public string StudentName { get; set; } = string.Empty;

    public string? GroupName { get; set; }

    public string? AcademicLevel { get; set; }

    public string? AcademicYear { get; set; }

    public string CertificateType { get; set; } = string.Empty;

    public string Purpose { get; set; } = string.Empty;

    public string? Remarks { get; set; }

    public string Status { get; set; } = "Generated";

    public DateTime RequestDate { get; set; }

    public DateTime IssueDate { get; set; }

    public DateTime GeneratedAt { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? IssuedAt { get; set; }

    public string? IssuedBy { get; set; }

    public string? FatherName { get; set; }

    public string? MotherName { get; set; }

    public string? RollNo { get; set; }

    public string? Section { get; set; }

    public string? BoardName { get; set; }

    public DateTime? DateOfBirth { get; set; }

    public string? TemplateCode { get; set; }

    public string? TemplateTitle { get; set; }

    public string? Orientation { get; set; }

    public string? BorderColor { get; set; }

    public string? BadgeBgColor { get; set; }

    public string? BadgeTextColor { get; set; }

    public string? ParagraphOne { get; set; }

    public string? ParagraphTwo { get; set; }

    public string? Signature { get; set; }

    public bool IsActive { get; set; } = true;
    public int? CampusId { get; set; }
    public string? CampusName { get; set; }
}