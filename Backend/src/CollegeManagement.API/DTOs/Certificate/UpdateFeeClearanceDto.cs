using System;

namespace CollegeManagement.API.DTOs.Certificate;

public class UpdateFeeClearanceDto
{
    public string Status { get; set; } = "Cleared"; // "Cleared", "Dues Pending", "Principal Permitted"
    public decimal? DueAmount { get; set; }
    public string? ClearedBy { get; set; }
    public string? ExemptionReason { get; set; }
}
