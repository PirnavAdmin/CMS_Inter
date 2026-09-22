namespace CollegeManagement.API.DTOs.Program
{
    public class GroupProgramDto
    {
        public int ProgramId { get; set; }

        public string ProgramName { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }
}