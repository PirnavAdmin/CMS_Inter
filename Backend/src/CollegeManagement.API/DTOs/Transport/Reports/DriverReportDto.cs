using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class DriverReportDto
    {
        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber { get; set; } = string.Empty;

        [JsonPropertyName("licenseNumber")]
        public string LicenseNumber { get; set; } = string.Empty;

        [JsonPropertyName("licenseExpiry")]
        public string? LicenseExpiry { get; set; }

        [JsonPropertyName("currentBus")]
        public string CurrentBus { get; set; } = "Unassigned";

        [JsonPropertyName("currentRoute")]
        public string CurrentRoute { get; set; } = "Unassigned";

        [JsonPropertyName("busAttendant")]
        public string BusAttendant { get; set; } = "Unassigned";

        [JsonPropertyName("assignmentStatus")]
        public string AssignmentStatus { get; set; } = "Unassigned";

        [JsonPropertyName("experienceYears")]
        public int ExperienceYears { get; set; } = 5;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";
    }
}

