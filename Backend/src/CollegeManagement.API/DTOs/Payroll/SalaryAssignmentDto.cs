using System;

namespace CollegeManagement.API.DTOs.Payroll
{
    public class SalaryAssignmentDto
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public int SalaryStructureId { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
