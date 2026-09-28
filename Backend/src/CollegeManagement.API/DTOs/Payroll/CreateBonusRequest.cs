
namespace CollegeManagement.API.DTOs.Payroll
{
    public class CreateBonusRequest
    {
        public int StaffId { get; set; }
        public string BonusType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int BonusMonth { get; set; }
        public int BonusYear { get; set; }
        public string? Reason { get; set; }
    }
}