namespace CollegeManagement.API.DTOs.Certificate;

public class StudentGenerationLookupDto
{
    public int StudentId { get; set; }
    public string AdmissionNo { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public int? CampusId { get; set; }
    public int? BoardId { get; set; }
    public int? AcademicYearId { get; set; }
    public int? GroupId { get; set; }
    public int? SectionId { get; set; }
    public string? FatherName { get; set; }
}
