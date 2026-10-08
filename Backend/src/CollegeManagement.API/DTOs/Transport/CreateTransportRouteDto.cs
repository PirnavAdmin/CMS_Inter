using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport
{
    public class CreateTransportRouteDto
    {
        private string _routeCode = string.Empty;
        private string _routeName = string.Empty;

        [JsonPropertyName("routeCode")]
        public string RouteCode
        {
            get => !string.IsNullOrWhiteSpace(_routeCode) ? _routeCode : $"R-CODE-{Random.Shared.Next(100, 999)}";
            set => _routeCode = value ?? string.Empty;
        }

        [JsonPropertyName("routeName")]
        public string RouteName
        {
            get => !string.IsNullOrWhiteSpace(_routeName) ? _routeName : (!string.IsNullOrWhiteSpace(_routeCode) ? _routeCode : "New Route");
            set => _routeName = value ?? string.Empty;
        }

        [JsonPropertyName("startLocation")]
        public string StartLocation { get; set; } = "Start Point";

        [JsonPropertyName("endLocation")]
        public string EndLocation { get; set; } = "End Point";

        [JsonPropertyName("distanceKm")]
        public decimal DistanceKm { get; set; }

        [JsonPropertyName("estimatedDurationMinutes")]
        public int EstimatedDurationMinutes { get; set; } = 30;

        [JsonPropertyName("minRangeKm")]
        public decimal MinRangeKm { get; set; } = 5;

        [JsonPropertyName("nonAcBaseFare")]
        public decimal NonAcBaseFare { get; set; } = 1000;

        [JsonPropertyName("nonAcRatePerKm")]
        public decimal NonAcRatePerKm { get; set; } = 100;

        [JsonPropertyName("acBaseFare")]
        public decimal AcBaseFare { get; set; } = 1200;

        [JsonPropertyName("acRatePerKm")]
        public decimal AcRatePerKm { get; set; } = 150;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        private bool _status = true;

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status
        {
            get => _status;
            set => _status = value;
        }

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }
    }
}
