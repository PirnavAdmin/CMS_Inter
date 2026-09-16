namespace CollegeManagement.API.Dtos.Transport.PickupPoint
{
    public class PickupPointFilterDto
    {
        public string? Search { get; set; }

        public long? RouteId { get; set; }

        public bool? Status { get; set; }

        public string SortBy { get; set; } = "pickupPointName";

        public string SortOrder { get; set; } = "asc";

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}
