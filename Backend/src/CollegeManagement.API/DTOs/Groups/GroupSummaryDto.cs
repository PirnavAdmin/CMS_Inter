namespace CollegeManagement.API.DTOs.Groups;

public class GroupSummaryDto
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string GroupCode { get; set; } = string.Empty;
    public int BoardId { get; set; }
    public string? BoardName { get; set; }
    public int AcademicLevelId { get; set; }
    public string? AcademicLevelName { get; set; }
    public int AcademicYearId { get; set; }
    public string? AcademicYearName { get; set; }
    public int TotalStudents { get; set; }
    public int ActiveStudents { get; set; }
    public int TotalSubjects { get; set; }
    public int ActiveSubjects { get; set; }
    public List<CollegeManagement.API.DTOs.Program.GroupProgramDto> Programs { get; set; }
    = new();
}
