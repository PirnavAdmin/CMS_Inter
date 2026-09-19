namespace CollegeManagement.API.Dtos.Transport.Attendant
{
    public class TransportAttendantFilterDto
    {
        public string? Search { get; set; }

        public bool? Status { get; set; }

        public string? SortBy { get; set; } = "attendantName";

        public string? SortOrder { get; set; } = "asc";

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}

