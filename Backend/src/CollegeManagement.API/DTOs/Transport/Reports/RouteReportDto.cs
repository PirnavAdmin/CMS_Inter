using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class RouteReportDto
    {
        [JsonPropertyName("routeCode")]
        public string RouteCode { get; set; } = string.Empty;

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("startPoint")]
        public string StartPoint { get; set; } = string.Empty;

        [JsonPropertyName("destination")]
        public string Destination { get; set; } = string.Empty;

        [JsonPropertyName("distanceKm")]
        public decimal DistanceKm { get; set; } = 0;

        [JsonPropertyName("durationMins")]
        public int DurationMins { get; set; } = 30;

        [JsonPropertyName("totalPickupPoints")]
        public int TotalPickupPoints { get; set; } = 0;

        [JsonPropertyName("assignedBus")]
        public string AssignedBus { get; set; } = "Unassigned";

        [JsonPropertyName("assignedDriver")]
        public string AssignedDriver { get; set; } = "Unassigned";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";
    }
}

