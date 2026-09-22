using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Certificate;

public class UpdateCertificateDto
{
    [Required]
    public string AdmissionNo { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string CertificateType { get; set; } = string.Empty;

    [Required, MinLength(5), MaxLength(250)]
    public string Purpose { get; set; } = string.Empty;

    public DateTime? IssueDate { get; set; }

    [MaxLength(1000)]
    public string? Remarks { get; set; }
}