namespace CollegeManagement.API.DTOs.Payroll
{
    public class AdvanceBalanceDto
    {
        public int AdvanceId { get; set; }

        public int StaffId { get; set; }

        public string AdvanceType { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }

        public decimal MonthlyDeduction { get; set; }

        public int RepaymentMonths { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal ScheduledAmount { get; set; }

        public decimal RemainingBalance { get; set; }
    }
}