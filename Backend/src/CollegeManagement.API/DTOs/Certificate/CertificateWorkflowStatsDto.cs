namespace CollegeManagement.API.DTOs.Certificate;

public class CertificateWorkflowStatsDto
{
    public int TotalCount { get; set; }
    public int GeneratedCount { get; set; }
    public int ReviewedCount { get; set; }
    public int ApprovedCount { get; set; }
    public int IssuedCount { get; set; }
    public int CancelledCount { get; set; }
}
