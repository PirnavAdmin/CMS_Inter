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
    }
}
