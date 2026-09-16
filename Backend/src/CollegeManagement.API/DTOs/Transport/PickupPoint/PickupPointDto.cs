using System.Text.Json.Serialization;

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

        [JsonPropertyName("pickupPointName")]
        public string PickupPointName { get; set; } = string.Empty;

        [JsonPropertyName("pickupName")]
        public string PickupName => PickupPointName;

        [JsonPropertyName("landmark")]
        public string? Landmark { get; set; }

        [JsonPropertyName("sequenceNo")]
        public int SequenceNo { get; set; }

        [JsonPropertyName("sequenceNumber")]
        public int SequenceNumber => SequenceNo;

        [JsonPropertyName("pickupTime")]
        public TimeSpan PickupTime { get; set; }

        [JsonPropertyName("arrivalTime")]
        public string ArrivalTime => PickupTime.ToString(@"hh\:mm");

        [JsonPropertyName("morningPickupTime")]
        public string MorningPickupTime => PickupTime != TimeSpan.Zero ? DateTime.Today.Add(PickupTime).ToString("hh:mm tt") : "00:00";

        [JsonPropertyName("morningPickup")]
        public string MorningPickup => MorningPickupTime;

        [JsonPropertyName("dropTime")]
        public TimeSpan DropTime { get; set; } = new TimeSpan(16, 15, 0);

        [JsonPropertyName("eveningDropTime")]
        public string EveningDropTime => DropTime != TimeSpan.Zero ? DateTime.Today.Add(DropTime).ToString("hh:mm tt") : "04:15 PM";

        [JsonPropertyName("eveningDrop")]
        public string EveningDrop => EveningDropTime;

        [JsonPropertyName("distanceFromStart")]
        public decimal DistanceFromStart { get; set; }

        [JsonPropertyName("distanceFromSchoolKm")]
        public decimal DistanceFromSchoolKm => DistanceFromStart;

        [JsonPropertyName("distanceKm")]
        public string DistanceKm => $"{DistanceFromStart} KM";

        [JsonPropertyName("monthlyFee")]
        public decimal MonthlyFee { get; set; } = 1200;

        [JsonPropertyName("monthlyFare")]
        public decimal MonthlyFare => MonthlyFee;

        [JsonPropertyName("monthlyFeeText")]
        public string MonthlyFeeText => $"₹{MonthlyFee}/mo";

        [JsonPropertyName("status")]
        public bool Status { get; set; }

        [JsonPropertyName("statusText")]
        public string StatusText { get; set; } = string.Empty;
    }
}
