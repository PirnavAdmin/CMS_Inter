using System;

namespace CollegeManagement.API.DTOs.Payroll
{
    public class PayslipAdvanceRepaymentDto
    {
        public int Id { get; set; }
        public int AdvanceId { get; set; }
        public int PayslipId { get; set; }
        public int StaffId { get; set; }
        public string AdvanceType { get; set; } = string.Empty;
        public int RepaymentMonth { get; set; }
        public int RepaymentYear { get; set; }
        public decimal DeductionAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
