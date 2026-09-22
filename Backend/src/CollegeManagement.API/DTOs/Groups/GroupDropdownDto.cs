namespace CollegeManagement.API.DTOs.Groups;

public class GroupDropdownDto
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string GroupCode { get; set; } = string.Empty;
    public int BoardId { get; set; }
    public string? BoardName { get; set; }
    public int AcademicYearId { get; set; }
    public string? AcademicYearName { get; set; }
    public int AcademicLevelId { get; set; }
    public string? AcademicLevelName { get; set; }

}
