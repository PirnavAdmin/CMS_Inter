using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.VehicleAssignment
{
    public class TransportVehicleAssignmentDto
    {
        [JsonPropertyName("assignmentId")]
        public long AssignmentId { get; set; }

        [JsonPropertyName("id")]
        public string Id => AssignmentId.ToString();

        [JsonPropertyName("routeId")]
        public long RouteId { get; set; }

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("vehicleId")]
        public long VehicleId { get; set; }

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("vehicleName")]
        public string VehicleName { get; set; } = string.Empty;

        [JsonPropertyName("vehicleCapacity")]
        public int VehicleCapacity { get; set; } = 40;

        [JsonPropertyName("driverId")]
        public long DriverId { get; set; }

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("driverMobile")]
        public string DriverMobile { get; set; } = string.Empty;

        [JsonPropertyName("attendantId")]
        public long? AttendantId { get; set; }

        [JsonPropertyName("attendantName")]
        public string? AttendantName { get; set; }

        [JsonPropertyName("assignedStudents")]
        public int AssignedStudents { get; set; } = 0;

        [JsonPropertyName("branchName")]
        public string? BranchName { get; set; } = "Main Campus";

        [JsonPropertyName("academicYear")]
        public string? AcademicYear { get; set; } = "2026-2027";

        [JsonPropertyName("morningTripTime")]
        public string? MorningTripTime { get; set; } = "07:00 AM";

        [JsonPropertyName("eveningTripTime")]
        public string? EveningTripTime { get; set; } = "03:45 PM";

        [JsonPropertyName("assignmentDate")]
        public DateTime AssignmentDate { get; set; }

        [JsonPropertyName("effectiveFrom")]
        public DateTime EffectiveFrom { get; set; }

        [JsonPropertyName("effectiveTo")]
        public DateTime? EffectiveTo { get; set; }

        [JsonPropertyName("assignmentPeriod")]
        public string AssignmentPeriod => EffectiveTo.HasValue
            ? $"{EffectiveFrom:yyyy-MM-dd} to {EffectiveTo.Value:yyyy-MM-dd}"
            : $"{EffectiveFrom:yyyy-MM-dd} (Current)";

        [JsonPropertyName("shift")]
        public string? Shift { get; set; }

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("status")]
        public bool Status { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}
