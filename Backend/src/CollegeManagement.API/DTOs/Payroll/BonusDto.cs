
namespace CollegeManagement.API.DTOs.Payroll
{
    public class BonusDto
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public string? EmployeeId { get; set; }
        public string? StaffName { get; set; }

        public string BonusType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int BonusMonth { get; set; }
        public int BonusYear { get; set; }
        public string? Reason { get; set; }

        public string Status { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}