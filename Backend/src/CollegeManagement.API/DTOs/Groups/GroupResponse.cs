namespace CollegeManagement.API.DTOs.Groups
{
    public class GroupResponse
    {
        public int GroupId { get; set; }
        public int BoardId { get; set; }
        public string? BoardName { get; set; }
        public int AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int AcademicLevelId { get; set; }
        public string? AcademicLevelName { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string GroupCode { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int TotalSubjects { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<int> ProgramIds { get; set; } = new();
        public List<CollegeManagement.API.DTOs.Program.GroupProgramDto> Programs { get; set; }
    = new();
    }
}
