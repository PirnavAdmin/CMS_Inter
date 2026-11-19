namespace CollegeManagement.API.DTOs.Payroll
{
    public class MonthlyPayrollSummaryDto
    {
        public int PayrollMonth { get; set; }
        public int PayrollYear { get; set; }
        public long TotalPayslips { get; set; }
        public long TotalEmployees { get; set; }
        public decimal TotalGrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal TotalAdvanceDeductions { get; set; }
        public decimal TotalNetSalary { get; set; }
        public long PaidPayslips { get; set; }
        public long PendingPayslips { get; set; }
        public long OnHoldPayslips { get; set; }

        // Personal payroll fields for My Payroll tab & personal summary
        public int? StaffId { get; set; }
        public string? EmployeeId { get; set; }
        public string? StaffName { get; set; }
        public string? PayslipStatus { get; set; }
        public decimal? BasicPay { get; set; }
        public decimal? Hra { get; set; }
        public decimal? Da { get; set; }
        public decimal? ConveyanceAllowance { get; set; }
        public decimal? MedicalAllowance { get; set; }
        public decimal? OtherAllowance { get; set; }
        public decimal? Pf { get; set; }
        public decimal? ProfessionalTax { get; set; }
        public decimal? Tds { get; set; }
        public decimal? Esi { get; set; }
        public decimal? InsuranceOtherDeduction { get; set; }
    }
}
