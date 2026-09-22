namespace CollegeManagement.API.DTOs.Certificate;

public class StudentCertificateDropdownDto
{
    public int StudentId { get; set; }
    public string AdmissionNo { get; set; } = string.Empty;
    public string RollNo { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = string.Empty;
    public string AcademicLevel { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
}
