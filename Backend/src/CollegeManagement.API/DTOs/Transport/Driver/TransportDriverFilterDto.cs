namespace CollegeManagement.API.Dtos.Transport.Driver
{
    public class TransportDriverFilterDto
    {
        public string? Search { get; set; }

        public bool? Status { get; set; }

        public bool? LicenceExpired { get; set; }

        public string? SortBy { get; set; } = "driverName";

        public string? SortOrder { get; set; } = "asc";

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
