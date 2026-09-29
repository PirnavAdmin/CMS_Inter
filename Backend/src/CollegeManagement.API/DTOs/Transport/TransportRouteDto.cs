using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport
{
    public class TransportRouteDto
    {
        [JsonPropertyName("id")]
        public string Id => RouteId > 0 ? RouteId.ToString() : "1";

        [JsonPropertyName("routeId")]
        public long RouteId { get; set; }

        [JsonPropertyName("routeCode")]
        public string RouteCode { get; set; } = string.Empty;

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("startLocation")]
        public string StartLocation { get; set; } = string.Empty;

        [JsonPropertyName("endLocation")]
        public string EndLocation { get; set; } = string.Empty;

        [JsonPropertyName("distanceKm")]
        public decimal DistanceKm { get; set; }

        [JsonPropertyName("estimatedDurationMinutes")]
        public int EstimatedDurationMinutes { get; set; }

        [JsonPropertyName("estimatedDurationText")]
        public string EstimatedDurationText { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("totalPickupPoints")]
        public int TotalPickupPoints { get; set; } = 0;

        [JsonPropertyName("assignedBus")]
        public string AssignedBus { get; set; } = "Unassigned";

        [JsonPropertyName("assignedDriver")]
        public string AssignedDriver { get; set; } = "Unassigned";

        [JsonPropertyName("pickupPointSequenceText")]
        public string PickupPointSequenceText { get; set; } = string.Empty;

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

        private string _status = "Active";

        [JsonPropertyName("status")]
        public string Status
        {
            get => _status;
            set
            {
                if (string.Equals(value, "True", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "1"))
                    _status = "Active";
                else if (string.Equals(value, "False", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "0"))
                    _status = "Inactive";
                else if (!string.IsNullOrWhiteSpace(value))
                    _status = value;
            }
        }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("campusName")]
        public string? CampusName { get; set; }
    }
}
