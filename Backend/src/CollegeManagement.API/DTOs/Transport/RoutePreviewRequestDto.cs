using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport
{
    public class RoutePreviewRequestDto
    {
        [JsonPropertyName("originLat")]
        public double OriginLat { get; set; }

        [JsonPropertyName("originLng")]
        public double OriginLng { get; set; }

        [JsonPropertyName("destLat")]
        public double DestLat { get; set; }

        [JsonPropertyName("destLng")]
        public double DestLng { get; set; }
    }
}
