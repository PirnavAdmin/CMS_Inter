namespace CollegeManagement.API.Dtos.Transport
{
    public class RouteDistanceLookupResult
    {
        public decimal? DistanceKm { get; set; }
        public int? EstimatedDurationMinutes { get; set; }
        public string? Source { get; set; }
        public int? CampusId { get; set; }
        public string? CampusName { get; set; }
        public string? CampusCode { get; set; }
        public string? Address { get; set; }
    }
}
