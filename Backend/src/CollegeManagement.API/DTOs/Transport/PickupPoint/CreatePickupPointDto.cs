using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.PickupPoint
{
    public class CreatePickupPointDto
    {
        private string _pickupPointName = string.Empty;
        private TimeSpan _pickupTime = new TimeSpan(7, 30, 0);

        [JsonPropertyName("routeId")]
        public long RouteId { get; set; } = 1;

        [JsonPropertyName("pickupPointName")]
        public string PickupPointName
        {
            get => !string.IsNullOrWhiteSpace(_pickupPointName) ? _pickupPointName : "Pickup Point";
            set => _pickupPointName = value ?? string.Empty;
        }

        [JsonPropertyName("pickupName")]
        public string? PickupName
        {
            get => PickupPointName;
            set { if (!string.IsNullOrWhiteSpace(value)) PickupPointName = value; }
        }

        [JsonPropertyName("landmark")]
        public string? Landmark { get; set; }

        [JsonPropertyName("sequenceNo")]
        public int SequenceNo { get; set; } = 1;

        [JsonPropertyName("sequenceNumber")]
        public int? SequenceNumber
        {
            get => SequenceNo;
            set { if (value.HasValue && value.Value > 0) SequenceNo = value.Value; }
        }

        [JsonPropertyName("pickupTime")]
        public TimeSpan PickupTime
        {
            get => _pickupTime;
            set => _pickupTime = value;
        }

        [JsonPropertyName("arrivalTime")]
        public string? ArrivalTime
        {
            get => _pickupTime.ToString(@"hh\:mm");
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && TimeSpan.TryParse(value, out var ts))
                {
                    _pickupTime = ts;
                }
            }
        }

        private TimeSpan _dropTime = new TimeSpan(16, 15, 0);
        private decimal _monthlyFee = 1200;

        [JsonPropertyName("dropTime")]
        public TimeSpan DropTime
        {
            get => _dropTime;
            set => _dropTime = value;
        }

        [JsonPropertyName("eveningDropTime")]
        public string? EveningDropTime
        {
            get => _dropTime.ToString(@"hh\:mm");
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && TimeSpan.TryParse(value, out var ts))
                {
                    _dropTime = ts;
                }
            }
        }

        [JsonPropertyName("morningPickupTime")]
        public string? MorningPickupTime
        {
            get => _pickupTime.ToString(@"hh\:mm");
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && TimeSpan.TryParse(value, out var ts))
                {
                    _pickupTime = ts;
                }
            }
        }

        [JsonPropertyName("distanceFromStart")]
        public decimal DistanceFromStart { get; set; }

        [JsonPropertyName("distanceFromSchoolKm")]
        public decimal? DistanceFromSchoolKm
        {
            get => DistanceFromStart;
            set { if (value.HasValue) DistanceFromStart = value.Value; }
        }

        [JsonPropertyName("monthlyFee")]
        public decimal MonthlyFee
        {
            get => _monthlyFee;
            set => _monthlyFee = value;
        }

        [JsonPropertyName("monthlyFare")]
        public decimal? MonthlyFare
        {
            get => _monthlyFee;
            set { if (value.HasValue) _monthlyFee = value.Value; }
        }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}
