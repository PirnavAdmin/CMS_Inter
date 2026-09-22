namespace CollegeManagement.API.DTOs.Result
{
    public class GetResultsRequestDto
    {
        public int BoardId { get; set; }

        public int AcademicYearId { get; set; }

        public int AcademicLevelId { get; set; }

        public int GroupId { get; set; }

        public int ExamId { get; set; }

        public string? Search { get; set; }

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
