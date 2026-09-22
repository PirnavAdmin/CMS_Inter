using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class TripReportDto
    {
        [JsonPropertyName("tripNo")]
        public string TripNo { get; set; } = string.Empty;

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("busAttendant")]
        public string BusAttendant { get; set; } = "Unassigned";

        [JsonPropertyName("studentsOnRoute")]
        public int StudentsOnRoute { get; set; } = 0;

        [JsonPropertyName("capacityUsed")]
        public string CapacityUsed { get; set; } = "N/A";

        [JsonPropertyName("effectiveFrom")]
        public string EffectiveFrom { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Scheduled";
    }
}

