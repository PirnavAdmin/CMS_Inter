using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport
{
    public class UpdateTransportRouteDto
    {
        private string _routeCode = string.Empty;
        private string _routeName = string.Empty;
        private string _startLocation = string.Empty;
        private string _endLocation = string.Empty;
        private decimal _distanceKm;
        private int _estimatedDurationMinutes = 30;

        [JsonPropertyName("routeCode")]
        public string RouteCode
        {
            get => !string.IsNullOrWhiteSpace(_routeCode) ? _routeCode : $"R-CODE-{Random.Shared.Next(100, 999)}";
            set => _routeCode = value ?? string.Empty;
        }

        [JsonPropertyName("routeName")]
        public string RouteName
        {
            get => !string.IsNullOrWhiteSpace(_routeName) ? _routeName : (!string.IsNullOrWhiteSpace(_routeCode) ? _routeCode : "Updated Route");
            set => _routeName = value ?? string.Empty;
        }

        [JsonPropertyName("startLocation")]
        public string StartLocation
        {
            get => !string.IsNullOrWhiteSpace(_startLocation) ? _startLocation : (RouteStart ?? "Start Point");
            set => _startLocation = value ?? string.Empty;
        }

        [JsonPropertyName("routeStart")]
        public string? RouteStart
        {
            get => _startLocation;
            set { if (!string.IsNullOrWhiteSpace(value)) _startLocation = value; }
        }

        [JsonPropertyName("endLocation")]
        public string EndLocation
        {
            get => !string.IsNullOrWhiteSpace(_endLocation) ? _endLocation : (RouteEnd ?? "End Point");
            set => _endLocation = value ?? string.Empty;
        }

        [JsonPropertyName("routeEnd")]
        public string? RouteEnd
        {
            get => _endLocation;
            set { if (!string.IsNullOrWhiteSpace(value)) _endLocation = value; }
        }

        [JsonPropertyName("distanceKm")]
        public decimal DistanceKm
        {
            get => _distanceKm;
            set => _distanceKm = value;
        }

        [JsonPropertyName("totalDistanceKm")]
        public decimal? TotalDistanceKm
        {
            get => _distanceKm;
            set { if (value.HasValue) _distanceKm = value.Value; }
        }

        [JsonPropertyName("estimatedDurationMinutes")]
        public int EstimatedDurationMinutes
        {
            get => _estimatedDurationMinutes;
            set => _estimatedDurationMinutes = value;
        }

        [JsonPropertyName("estimatedTimeMinutes")]
        public int? EstimatedTimeMinutes
        {
            get => _estimatedDurationMinutes;
            set { if (value.HasValue) _estimatedDurationMinutes = value.Value; }
        }

        [JsonPropertyName("minRangeKm")]
        public decimal MinRangeKm { get; set; } = 5;

        [JsonPropertyName("minRange")]
        public decimal? MinRange
        {
            get => MinRangeKm;
            set { if (value.HasValue) MinRangeKm = value.Value; }
        }

        [JsonPropertyName("nonAcBaseFare")]
        public decimal NonAcBaseFare { get; set; } = 1000;

        [JsonPropertyName("nonAcRateAddlKm")]
        public decimal NonAcRateAddlKm { get; set; } = 100;

        [JsonPropertyName("nonAcRatePerKm")]
        public decimal? NonAcRatePerKm
        {
            get => NonAcRateAddlKm;
            set { if (value.HasValue) NonAcRateAddlKm = value.Value; }
        }

        [JsonPropertyName("acBaseFare")]
        public decimal AcBaseFare { get; set; } = 1200;

        [JsonPropertyName("acRateAddlKm")]
        public decimal AcRateAddlKm { get; set; } = 150;

        [JsonPropertyName("acRatePerKm")]
        public decimal? AcRatePerKm
        {
            get => AcRateAddlKm;
            set { if (value.HasValue) AcRateAddlKm = value.Value; }
        }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}

