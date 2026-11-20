using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport
{
    public class RoutePreviewResultDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("distanceKm")]
        public double DistanceKm { get; set; }

        [JsonPropertyName("durationMinutes")]
        public int DurationMinutes { get; set; }

        [JsonPropertyName("polylineCoordinates")]
        public List<double[]>? PolylineCoordinates { get; set; }

        [JsonPropertyName("routeGeometry")]
        public string? RouteGeometry { get; set; }

        [JsonPropertyName("originAddress")]
        public string? OriginAddress { get; set; }

        [JsonPropertyName("destAddress")]
        public string? DestAddress { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
}
