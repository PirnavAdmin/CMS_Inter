using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Vehicle
{
    public class TransportVehicleDto
    {
        [JsonPropertyName("id")]
        public string Id => VehicleId > 0 ? VehicleId.ToString() : "1";

        [JsonPropertyName("vehicleId")]
        public long VehicleId { get; set; }

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("registrationNumber")]
        public string RegistrationNumber { get; set; } = string.Empty;

        [JsonPropertyName("vehicleName")]
        public string VehicleName { get; set; } = string.Empty;

        [JsonPropertyName("vehicleType")]
        public string VehicleType { get; set; } = string.Empty;

        [JsonPropertyName("capacity")]
        public int Capacity { get; set; }

        [JsonPropertyName("isAC")]
        public bool IsAC { get; set; } = true;

        [JsonPropertyName("chassisNumber")]
        public string? ChassisNumber { get; set; }

        [JsonPropertyName("engineNumber")]
        public string? EngineNumber { get; set; }

        [JsonPropertyName("gpsDeviceId")]
        public string? GpsDeviceId { get; set; }

        [JsonPropertyName("manufacturer")]
        public string? Manufacturer { get; set; }

        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("insuranceNumber")]
        public string? InsuranceNumber { get; set; }

        [JsonPropertyName("insuranceExpiry")]
        public DateTime? InsuranceExpiry { get; set; }

        [JsonPropertyName("pollutionExpiry")]
        public DateTime? PollutionExpiry { get; set; }

        [JsonPropertyName("fitnessExpiry")]
        public DateTime? FitnessExpiry { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("statusText")]
        public string StatusText { get; set; } = "Active";

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}
