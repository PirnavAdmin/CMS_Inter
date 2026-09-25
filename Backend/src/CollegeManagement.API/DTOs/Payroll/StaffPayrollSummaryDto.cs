namespace CollegeManagement.API.DTOs.Payroll
{
    public class StaffPayrollSummaryDto
    {
        public int StaffId { get; set; }
        public int PayrollYear { get; set; }
        public long TotalPayslips { get; set; }
        public decimal TotalGrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal TotalAdvanceDeductions { get; set; }
        public decimal TotalNetSalary { get; set; }
        public long PaidPayslips { get; set; }
        public long PendingPayslips { get; set; }
        public long OnHoldPayslips { get; set; }
    }
}
