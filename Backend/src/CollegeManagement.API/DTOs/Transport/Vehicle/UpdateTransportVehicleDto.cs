using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.Vehicle
{
    public class UpdateTransportVehicleDto
    {
        private string _vehicleNumber = string.Empty;
        private string _registrationNumber = string.Empty;
        private string _vehicleName = string.Empty;

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber
        {
            get => !string.IsNullOrWhiteSpace(_vehicleNumber) ? _vehicleNumber : $"BUS-{Random.Shared.Next(100, 999)}";
            set => _vehicleNumber = value ?? string.Empty;
        }

        [JsonPropertyName("registrationNumber")]
        public string RegistrationNumber
        {
            get => !string.IsNullOrWhiteSpace(_registrationNumber) ? _registrationNumber : $"REG-{Random.Shared.Next(1000, 9999)}";
            set => _registrationNumber = value ?? string.Empty;
        }

        [JsonPropertyName("regNumber")]
        public string? RegNumber
        {
            get => RegistrationNumber;
            set { if (!string.IsNullOrWhiteSpace(value)) RegistrationNumber = value; }
        }

        [JsonPropertyName("vehicleName")]
        public string VehicleName
        {
            get => !string.IsNullOrWhiteSpace(_vehicleName) ? _vehicleName : (!string.IsNullOrWhiteSpace(_vehicleNumber) ? _vehicleNumber : "College Bus");
            set => _vehicleName = value ?? string.Empty;
        }

        [JsonPropertyName("vehicleType")]
        public string VehicleType { get; set; } = "Bus";

        [JsonPropertyName("capacity")]
        public int Capacity { get; set; } = 40;

        [JsonPropertyName("seatingCapacity")]
        public int? SeatingCapacity
        {
            get => Capacity;
            set { if (value.HasValue && value.Value > 0) Capacity = value.Value; }
        }

        [JsonPropertyName("isAC")]
        public bool IsAC { get; set; } = true;

        [JsonPropertyName("acSpecification")]
        public string? AcSpecification
        {
            get => IsAC ? "AC" : "Non-AC";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    if (string.Equals(value, "Non-AC", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "false", StringComparison.OrdinalIgnoreCase))
                        IsAC = false;
                    else
                        IsAC = true;
                }
            }
        }

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
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? InsuranceExpiry { get; set; }

        [JsonPropertyName("pollutionExpiry")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? PollutionExpiry { get; set; }

        [JsonPropertyName("fitnessExpiry")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? FitnessExpiry { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}

