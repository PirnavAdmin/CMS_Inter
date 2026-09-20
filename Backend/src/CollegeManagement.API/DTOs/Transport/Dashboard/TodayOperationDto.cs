using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Dashboard
{
    public class TodayOperationDto
    {
        [JsonPropertyName("assignmentId")]
        public long AssignmentId { get; set; }

        [JsonPropertyName("vehicleId")]
        public long VehicleId { get; set; }

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("registrationNumber")]
        public string RegistrationNumber { get; set; } = string.Empty;

        [JsonPropertyName("routeId")]
        public long RouteId { get; set; }

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("routeCode")]
        public string RouteCode { get; set; } = string.Empty;

        [JsonPropertyName("driverId")]
        public long DriverId { get; set; }

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("attendantId")]
        public long? AttendantId { get; set; }

        [JsonPropertyName("attendantName")]
        public string AttendantName { get; set; } = "Unassigned";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Morning Running";

        [JsonPropertyName("shift")]
        public string Shift { get; set; } = "Morning";
    }
}

