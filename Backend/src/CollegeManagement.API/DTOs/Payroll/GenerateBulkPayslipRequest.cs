namespace CollegeManagement.API.DTOs.Payroll
{
    public class GenerateBulkPayslipRequest
    {
        public List<int> StaffIds { get; set; } = new();
        public int PayrollMonth { get; set; }
        public int PayrollYear { get; set; }
    }
}