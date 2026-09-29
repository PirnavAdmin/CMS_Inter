using System.Text.Json.Serialization;
using CollegeManagement.API.Helpers;

namespace CollegeManagement.API.Dtos.Transport.PickupPoint
{
    public class PickupPointDto
    {
        [JsonPropertyName("pickupPointId")]
        public long PickupPointId { get; set; }

        [JsonPropertyName("id")]
        public string Id => PickupPointId.ToString();

        [JsonPropertyName("routeId")]
        public long RouteId { get; set; }

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("route")]
        public string Route => !string.IsNullOrWhiteSpace(RouteName) ? RouteName : (RouteId > 0 ? RouteId.ToString() : "-");

        [JsonPropertyName("pickupPointName")]
        public string PickupPointName { get; set; } = string.Empty;

        [JsonPropertyName("pickupName")]
        public string PickupName => PickupPointName;

        [JsonPropertyName("landmark")]
        public string? Landmark { get; set; }

        [JsonPropertyName("stopAddress")]
        public string? StopAddress => Landmark;

        [JsonPropertyName("sequenceNo")]
        public int SequenceNo { get; set; } = 1;

        [JsonPropertyName("sequenceNumber")]
        public int SequenceNumber => SequenceNo;

        [JsonPropertyName("pickupTime")]
        [JsonConverter(typeof(TimeSpanJsonConverter))]
        public TimeSpan PickupTime { get; set; }

        [JsonPropertyName("morningPickupTime")]
        public string MorningPickupTime => PickupTime != TimeSpan.Zero 
            ? DateTime.Today.Add(PickupTime).ToString("hh:mm tt") 
            : PickupTime.ToString(@"hh\:mm");

        [JsonPropertyName("dropTime")]
        [JsonConverter(typeof(TimeSpanJsonConverter))]
        public TimeSpan DropTime { get; set; } = new TimeSpan(16, 15, 0);

        [JsonPropertyName("eveningDropTime")]
        public string EveningDropTime => DropTime != TimeSpan.Zero 
            ? DateTime.Today.Add(DropTime).ToString("hh:mm tt") 
            : DropTime.ToString(@"hh\:mm");

        [JsonPropertyName("distanceFromStart")]
        public decimal DistanceFromStart { get; set; }

        [JsonPropertyName("distanceFromCollegeKm")]
        public decimal DistanceFromCollegeKm => DistanceFromStart;

        [JsonPropertyName("monthlyFee")]
        public decimal MonthlyFee { get; set; } = 1200;

        [JsonPropertyName("monthlyFare")]
        public decimal MonthlyFare => MonthlyFee;

        [JsonPropertyName("status")]
        public bool Status { get; set; } = true;

        [JsonPropertyName("isActive")]
        public bool IsActive => Status;

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }
    }
}

