namespace CollegeManagement.API.Dtos.Transport
{
    public class TransportRouteLookupDto
    {
        public long RouteId { get; set; }

        public string RouteCode { get; set; } = string.Empty;

        public string RouteName { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;
        public bool? IsAc { get; set; }
        public string? BusType { get; set; }
    }
}
