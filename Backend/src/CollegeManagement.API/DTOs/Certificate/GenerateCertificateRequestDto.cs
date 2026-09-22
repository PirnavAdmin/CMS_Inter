using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Certificate;

public class GenerateCertificateRequestDto
{
    [Required(ErrorMessage = "Admission number is required.")]
    public string AdmissionNo { get; set; } = string.Empty;

    [Required(ErrorMessage = "Certificate type is required.")]
    public string CertificateType { get; set; } = string.Empty;

    [Required(ErrorMessage = "Purpose is required.")]
    public string Purpose { get; set; } = string.Empty;

    public DateTime? RequestDate { get; set; }

    public string? Remarks { get; set; }
}