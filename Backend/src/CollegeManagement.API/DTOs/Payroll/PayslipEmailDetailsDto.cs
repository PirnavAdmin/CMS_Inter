namespace CollegeManagement.API.DTOs.Payroll
{
    public class PayslipEmailDetailsDto
    {
        public int PayslipId { get; set; }

        public int StaffId { get; set; }

        public string? EmployeeId { get; set; }

        public string? StaffName { get; set; }

        public string? Email { get; set; }

        public int PayrollMonth { get; set; }

        public int PayrollYear { get; set; }

        public decimal GrossSalary { get; set; }

        public decimal TotalDeductions { get; set; }

        public decimal NetSalary { get; set; }

        public string? PayslipStatus { get; set; }
    }
}