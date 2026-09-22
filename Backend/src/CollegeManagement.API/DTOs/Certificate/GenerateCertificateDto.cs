namespace CollegeManagement.API.DTOs.Certificate;

public class GenerateCertificateDto
{
    public string AdmissionNo { get; set; } = string.Empty;

    public string CertificateType { get; set; } = string.Empty;

    public string Purpose { get; set; } = string.Empty;

    public DateTime IssueDate { get; set; }

    public string? Remarks { get; set; }
}