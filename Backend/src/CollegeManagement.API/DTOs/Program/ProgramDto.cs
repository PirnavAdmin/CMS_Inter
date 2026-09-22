namespace CollegeManagement.API.DTOs.Program
{
    public class ProgramDto
    {
        public int ProgramId { get; set; }

        public string ProgramName { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}