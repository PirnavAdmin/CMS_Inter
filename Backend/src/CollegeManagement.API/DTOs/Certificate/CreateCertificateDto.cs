using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Certificate;

public class CreateCertificateDto
{
    [Required]
    public int StudentId { get; set; }

    [Required, MaxLength(100)]
    public string CertificateType { get; set; } = string.Empty;

    [Required, MinLength(5), MaxLength(250)]
    public string Purpose { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Remarks { get; set; }
}
