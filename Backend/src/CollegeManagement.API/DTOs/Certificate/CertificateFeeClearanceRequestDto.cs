namespace CollegeManagement.API.DTOs.Certificate;

public class CertificateFeeClearanceRequestDto
{
    public string Status { get; set; } = "Cleared";
    public decimal? DueAmount { get; set; } = 0;
    public string? ExemptionReason { get; set; }
    public string? ClearedBy { get; set; }
}
