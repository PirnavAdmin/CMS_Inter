namespace CollegeManagement.API.Models.Reports;

public class ReportFilterModel
{
    public int? BoardId { get; set; }
    public int? AcademicYearId { get; set; }
    public int? AcademicLevelId { get; set; }
    public int? GroupId { get; set; }
    public int? SectionId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
