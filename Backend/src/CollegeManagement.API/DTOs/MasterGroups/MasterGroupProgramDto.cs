namespace CollegeManagement.API.DTOs.MasterGroups
{
    public class MasterGroupProgramDto
    {
        public int ProgramId { get; set; }
        public string ProgramName { get; set; } = string.Empty;
        public string ProgramCode { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
