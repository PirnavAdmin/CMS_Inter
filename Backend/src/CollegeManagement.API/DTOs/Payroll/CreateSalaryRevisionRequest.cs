namespace CollegeManagement.API.DTOs.Payroll
{
    public class CreateSalaryRevisionRequest
    {
        public int StaffId { get; set; }
        public int CurrentSalaryStructureId { get; set; }
        public int ProposedSalaryStructureId { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public string? Reason { get; set; }
    }
}