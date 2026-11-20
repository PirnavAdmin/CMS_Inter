using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport
{
    public class RouteDistanceCalculationResultDto
    {
        [JsonPropertyName("startLocation")]
        public string StartLocation { get; set; } = string.Empty;

        [JsonPropertyName("endLocation")]
        public string EndLocation { get; set; } = string.Empty;

        [JsonPropertyName("distanceKm")]
        public decimal DistanceKm { get; set; }

        [JsonPropertyName("estimatedDurationMinutes")]
        public int EstimatedDurationMinutes { get; set; }

        [JsonPropertyName("source")]
        public string Source { get; set; } = "Calculated";

        [JsonPropertyName("isCalculated")]
        public bool IsCalculated { get; set; } = true;
    }
}
