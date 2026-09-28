namespace CollegeManagement.API.DTOs.Payroll
{
    public class PayrollEmployeeDto
    {
        public int StaffId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;

        public int DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public int? DesignationId { get; set; }
        public string Designation { get; set; } = string.Empty;

        public string EmploymentType { get; set; } = string.Empty;
        public DateTime JoiningDate { get; set; }
        public string Status { get; set; } = string.Empty;

        public int? AssignmentId { get; set; }
        public int? SalaryStructureId { get; set; }
        public string? StructureName { get; set; }

        public decimal? BasicPay { get; set; }
        public decimal? GrossSalary { get; set; }
        public decimal? TotalDeductions { get; set; }
        public decimal? NetSalary { get; set; }

        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class AssignSalaryStructureRequest
    {
        public int StaffId { get; set; }
        public int SalaryStructureId { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public string? PaymentMode { get; set; }
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? IFSCCode { get; set; }
        public string? PANNumber { get; set; }
        public string? UANNumber { get; set; }
    }
}