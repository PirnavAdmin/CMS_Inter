namespace CollegeManagement.API.DTOs.Certificate;

public class ReissueCertificateDto
{
    public string AdmissionNo { get; set; } = string.Empty;

    public string CertificateType { get; set; } = string.Empty;

    public string Purpose { get; set; } = string.Empty;

    public DateTime RequestDate { get; set; }

    public string? Remarks { get; set; }
}