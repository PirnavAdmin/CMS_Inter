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

        [JsonPropertyName("routeStart")]
        public string RouteStart => StartLocation;

        [JsonPropertyName("endLocation")]
        public string EndLocation { get; set; } = string.Empty;

        [JsonPropertyName("routeEnd")]
        public string RouteEnd => EndLocation;

        [JsonPropertyName("distanceKm")]
        public decimal DistanceKm { get; set; }

        [JsonPropertyName("totalDistanceKm")]
        public decimal TotalDistanceKm => DistanceKm;

        [JsonPropertyName("estimatedDurationMinutes")]
        public int EstimatedDurationMinutes { get; set; }

        [JsonPropertyName("estimatedTimeMinutes")]
        public int EstimatedTimeMinutes => EstimatedDurationMinutes;

        [JsonPropertyName("estimatedDurationText")]
        public string EstimatedDurationText { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("totalPickupPoints")]
        public int TotalPickupPoints { get; set; } = 0;

        [JsonPropertyName("pickupPointCount")]
        public int PickupPointCount => TotalPickupPoints;

        [JsonPropertyName("assignedBus")]
        public string AssignedBus { get; set; } = "Unassigned";

        [JsonPropertyName("assignedVehicleNumber")]
        public string AssignedVehicleNumber => AssignedBus;

        [JsonPropertyName("assignedDriver")]
        public string AssignedDriver { get; set; } = "Unassigned";

        [JsonPropertyName("assignedDriverName")]
        public string AssignedDriverName => AssignedDriver;

        [JsonPropertyName("pickupPointSequenceText")]
        public string PickupPointSequenceText { get; set; } = string.Empty;

        [JsonPropertyName("minRangeKm")]
        public decimal MinRangeKm { get; set; } = 5;

        [JsonPropertyName("minRange")]
        public decimal MinRange => MinRangeKm;

        [JsonPropertyName("nonAcBaseFare")]
        public decimal NonAcBaseFare { get; set; } = 1000;

        [JsonPropertyName("nonAcRateAddlKm")]
        public decimal NonAcRateAddlKm { get; set; } = 100;

        [JsonPropertyName("nonAcRatePerKm")]
        public decimal NonAcRatePerKm => NonAcRateAddlKm;

        [JsonPropertyName("acBaseFare")]
        public decimal AcBaseFare { get; set; } = 1200;

        [JsonPropertyName("acRateAddlKm")]
        public decimal AcRateAddlKm { get; set; } = 150;

        [JsonPropertyName("acRatePerKm")]
        public decimal AcRatePerKm => AcRateAddlKm;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("statusText")]
        public string StatusText { get; set; } = "Active";

        [JsonPropertyName("isAc")]
        public bool? IsAc { get; set; }

        [JsonPropertyName("busType")]
        public string? BusType { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }
}
