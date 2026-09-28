namespace CollegeManagement.API.DTOs.AcademicYear
{
    public class AcademicYearSearchRequestDto
    {
        public int? CampusId { get; set; }
        public string? Search { get; set; }
        public bool? Status { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
