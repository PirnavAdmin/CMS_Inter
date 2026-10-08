using System;

namespace CollegeManagement.API.Services.Exports
{
    public class PayslipPdfModel
    {
        public int PayslipId { get; set; }
        public int StaffId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string StructureName { get; set; } = string.Empty;
        public int PayrollMonth { get; set; }
        public int PayrollYear { get; set; }
        public string MonthName { get; set; } = string.Empty;

        // Earnings
        public decimal BasicPay { get; set; }
        public decimal HRA { get; set; }
        public decimal DA { get; set; }
        public decimal ConveyanceAllowance { get; set; }
        public decimal MedicalAllowance { get; set; }
        public decimal OtherAllowance { get; set; }

        // Deductions
        public decimal PF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TDS { get; set; }
        public decimal ESI { get; set; }
        public decimal InsuranceOtherDeduction { get; set; }

        // Totals
        public decimal GrossSalary { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }

        public string PayslipStatus { get; set; } = "Generated";
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // Institution branding
        public string InstitutionName { get; set; } = "PIRNAV JUNIOR COLLEGE";
        public string Subtitle { get; set; } = "Affiliated to State Board of Intermediate Education";
    }
}
