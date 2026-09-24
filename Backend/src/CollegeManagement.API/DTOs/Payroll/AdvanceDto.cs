
namespace CollegeManagement.API.DTOs.Payroll
{
    public class AdvanceDto
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public string? EmployeeId { get; set; }
        public string? StaffName { get; set; }

        public string AdvanceType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Reason { get; set; }

        public int RepaymentMonths { get; set; }
        public decimal MonthlyDeduction { get; set; }
        public int StartMonth { get; set; }
        public int StartYear { get; set; }

        public string Status { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}