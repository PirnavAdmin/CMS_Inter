namespace CollegeManagement.API.DTOs.Payroll
{
    public class UpdateSalaryAssignmentRequest
    {
        public int SalaryStructureId { get; set; }
        public DateTime EffectiveFrom { get; set; }
    }
}