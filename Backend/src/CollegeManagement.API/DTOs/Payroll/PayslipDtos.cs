namespace CollegeManagement.API.DTOs.Payroll
{
    public class GeneratePayslipRequest
    {
        public int StaffId { get; set; }
        public int PayrollMonth { get; set; }
        public int PayrollYear { get; set; }
    }

    public class PayslipDto
    {
        public int PayslipId { get; set; }
        public int StaffId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;

        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public int? DesignationId { get; set; }
        public string? Designation { get; set; }

        public int PayrollMonth { get; set; }
        public int PayrollYear { get; set; }

        public int SalaryStructureId { get; set; }
        public string StructureName { get; set; } = string.Empty;

        public decimal BasicPay { get; set; }

        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal ConveyanceAllowance { get; set; }
        public decimal MedicalAllowance { get; set; }
        public decimal OtherAllowance { get; set; }

        public decimal PF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TDS { get; set; }
        public decimal ESI { get; set; }
        public decimal InsuranceOtherDeduction { get; set; }

        public decimal GrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }

        public string PayslipStatus { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
    }
}