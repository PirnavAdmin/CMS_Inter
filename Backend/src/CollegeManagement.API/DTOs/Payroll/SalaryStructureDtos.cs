namespace CollegeManagement.API.DTOs.Payroll
{
    public class CreateSalaryStructureRequest
    {
        public string StructureName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public int? DesignationId { get; set; }

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

        public string Status { get; set; } = "Active";
    }

    public class UpdateSalaryStructureRequest
    {
        public string StructureName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public int? DesignationId { get; set; }

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

        public string Status { get; set; } = "Active";
    }

    public class SalaryStructureDto
    {
        public int Id { get; set; }
        public string StructureName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;

        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public int? DesignationId { get; set; }
        public string? DesignationName { get; set; }

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

        public int AssignedStaff { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}