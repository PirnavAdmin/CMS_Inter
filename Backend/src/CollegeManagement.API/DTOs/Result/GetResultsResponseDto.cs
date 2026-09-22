namespace CollegeManagement.API.DTOs.Result
{
    public class GetResultsResponseDto
    {
        public int TotalRecords { get; set; }

        public int PageNumber { get; set; }

        public int PageSize { get; set; }

        public int TotalPages { get; set; }

        public List<ResultDto> Results { get; set; } = new();
    }
}
