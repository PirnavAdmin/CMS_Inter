namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response model for the Academic Context info modal.
    /// </summary>
    public class AcademicContextResponse
    {
        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public int AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
    }
}
