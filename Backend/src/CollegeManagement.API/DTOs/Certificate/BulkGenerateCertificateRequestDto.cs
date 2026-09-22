using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Certificate;

public class BulkGenerateCertificateRequestDto
{
    [Required(ErrorMessage = "At least one Admission number is required")]
    public List<string> AdmissionNos { get; set; } = new();

    [Required(ErrorMessage = "Certificate type is required")]
    [MaxLength(100)]
    public string CertificateType { get; set; } = string.Empty;

    [Required(ErrorMessage = "Purpose is required")]
    [MaxLength(500)]
    public string Purpose { get; set; } = string.Empty;

    public DateTime? RequestDate { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}

public class BulkEligibleStudentDto
{
    public int StudentId { get; set; }
    public string AdmissionNo { get; set; } = string.Empty;
    public string RollNo { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = string.Empty;
    public string BoardName { get; set; } = string.Empty;
}
