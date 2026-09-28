
namespace CollegeManagement.API.DTOs.Payroll
{
    public class CreateAdvanceRequest
    {
        public int StaffId { get; set; }
        public string AdvanceType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Reason { get; set; }
        public int RepaymentMonths { get; set; }
        public int StartMonth { get; set; }
        public int StartYear { get; set; }
    }
}