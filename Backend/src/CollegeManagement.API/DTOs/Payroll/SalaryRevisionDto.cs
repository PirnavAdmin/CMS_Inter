namespace CollegeManagement.API.DTOs.Payroll
{
    public class SalaryRevisionDto
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public string? EmployeeId { get; set; }
        public string? StaffName { get; set; }

        public int CurrentSalaryStructureId { get; set; }
        public int ProposedSalaryStructureId { get; set; }

        public DateTime EffectiveFrom { get; set; }
        public string? Reason { get; set; }
        public string? Status { get; set; }

        public DateTime RequestedAt { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}