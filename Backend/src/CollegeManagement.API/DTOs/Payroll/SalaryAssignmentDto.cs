using System;

namespace CollegeManagement.API.DTOs.Payroll
{
    public class SalaryAssignmentDto
    {
        public int Id { get; set; }
        public int AssignmentId => Id;
        public int StaffId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int? DesignationId { get; set; }
        public string Designation { get; set; } = string.Empty;

        public int SalaryStructureId { get; set; }
        public string? StructureName { get; set; }
        public decimal? BasicPay { get; set; }
        public decimal? GrossSalary { get; set; }
        public decimal? TotalDeductions { get; set; }
        public decimal? NetSalary { get; set; }

        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? CampusId { get; set; }

        public string? PaymentMode { get; set; }
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? IfscCode { get; set; }
        public string? IFSCCode { get => IfscCode; set => IfscCode = value; }
        public string? PanNumber { get; set; }
        public string? PANNumber { get => PanNumber; set => PanNumber = value; }
        public string? UanNumber { get; set; }
        public string? UANNumber { get => UanNumber; set => UanNumber = value; }
    }
}
