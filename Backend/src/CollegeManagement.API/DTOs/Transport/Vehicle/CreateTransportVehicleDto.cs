using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.Vehicle
{
    public class CreateTransportVehicleDto
    {
        private string _vehicleNumber = string.Empty;
        private string? _registrationNumber;
        private string? _regNumber;
        private string _vehicleName = string.Empty;
        private int? _capacity;
        private int? _seatingCapacity;

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber
        {
            get => _vehicleNumber;
            set => _vehicleNumber = value?.Trim() ?? string.Empty;
        }

        [JsonPropertyName("registrationNumber")]
        public string RegistrationNumber
        {
            get => !string.IsNullOrWhiteSpace(_registrationNumber) ? _registrationNumber!
                 : !string.IsNullOrWhiteSpace(_regNumber) ? _regNumber!
                 : _vehicleNumber;
            set => _registrationNumber = value?.Trim();
        }

        [JsonPropertyName("regNumber")]
        public string? RegNumber
        {
            get => RegistrationNumber;
            set => _regNumber = value?.Trim();
        }

        [JsonPropertyName("vehicleName")]
        public string VehicleName
        {
            get => !string.IsNullOrWhiteSpace(_vehicleName) ? _vehicleName : (!string.IsNullOrWhiteSpace(_vehicleNumber) ? _vehicleNumber : "College Bus");
            set => _vehicleName = value?.Trim() ?? string.Empty;
        }

        [JsonPropertyName("vehicleType")]
        public string VehicleType { get; set; } = "Bus";

        [JsonPropertyName("capacity")]
        public int Capacity
        {
            get => (_capacity.HasValue && _capacity.Value > 0) ? _capacity.Value
                 : (_seatingCapacity.HasValue && _seatingCapacity.Value > 0) ? _seatingCapacity.Value
                 : (_capacity ?? _seatingCapacity ?? 40);
            set => _capacity = value;
        }

        [JsonPropertyName("seatingCapacity")]
        public int? SeatingCapacity
        {
            get => Capacity;
            set => _seatingCapacity = value;
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

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("collegeId")]
        public int? CollegeId { get; set; }
    }
}
