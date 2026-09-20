using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.VehicleAssignment
{
    public class CreateTransportVehicleAssignmentDto
    {
        private DateTime _assignmentDate = DateTime.UtcNow;
        private DateTime _effectiveFrom = DateTime.UtcNow;

        [JsonPropertyName("routeId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long RouteId { get; set; } = 1;

        [JsonPropertyName("selectRoute")]
        public string? SelectRoute
        {
            get => RouteId.ToString();
            set { if (long.TryParse(value, out var id)) RouteId = id; }
        }

        [JsonPropertyName("vehicleId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long VehicleId { get; set; } = 1;

        [JsonPropertyName("selectActiveVehicle")]
        public string? SelectActiveVehicle
        {
            get => VehicleId.ToString();
            set { if (long.TryParse(value, out var id)) VehicleId = id; }
        }

        [JsonPropertyName("driverId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long DriverId { get; set; } = 1;

        [JsonPropertyName("selectLicensedDriver")]
        public string? SelectLicensedDriver
        {
            get => DriverId.ToString();
            set { if (long.TryParse(value, out var id)) DriverId = id; }
        }

        [JsonPropertyName("attendantId")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long? AttendantId { get; set; }

        [JsonPropertyName("selectBusAttendant")]
        public string? SelectBusAttendant
        {
            get => AttendantId?.ToString();
            set { if (long.TryParse(value, out var id)) AttendantId = id; }
        }

        [JsonPropertyName("branchName")]
        public string? BranchName { get; set; }

        [JsonPropertyName("branch")]
        public string? Branch
        {
            get => BranchName;
            set { if (!string.IsNullOrWhiteSpace(value)) BranchName = value; }
        }

        [JsonPropertyName("academicYear")]
        public string? AcademicYear { get; set; }

        [JsonPropertyName("morningTripTime")]
        public string? MorningTripTime { get; set; }

        [JsonPropertyName("morningTrip")]
        public string? MorningTrip
        {
            get => MorningTripTime;
            set { if (!string.IsNullOrWhiteSpace(value)) MorningTripTime = value; }
        }

        [JsonPropertyName("eveningTripTime")]
        public string? EveningTripTime { get; set; }

        [JsonPropertyName("eveningTrip")]
        public string? EveningTrip
        {
            get => EveningTripTime;
            set { if (!string.IsNullOrWhiteSpace(value)) EveningTripTime = value; }
        }

        [JsonPropertyName("assignmentDate")]
        public DateTime AssignmentDate
        {
            get => _assignmentDate;
            set => _assignmentDate = value != default ? value : DateTime.UtcNow;
        }

        [JsonPropertyName("effectiveFrom")]
        public DateTime EffectiveFrom
        {
            get => _effectiveFrom;
            set => _effectiveFrom = value != default ? value : DateTime.UtcNow;
        }

        [JsonPropertyName("effectiveFromDate")]
        public string? EffectiveFromDate
        {
            get => EffectiveFrom.ToString("yyyy-MM-dd");
            set { if (DateTime.TryParse(value, out var d)) EffectiveFrom = d; }
        }

        [JsonPropertyName("effectiveTo")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? EffectiveTo { get; set; }

        [JsonPropertyName("shift")]
        public string? Shift { get; set; } = "Morning";

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}
