using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class VehicleReportDto
    {
        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber { get; set; } = string.Empty;

        [JsonPropertyName("registrationNo")]
        public string RegistrationNo { get; set; } = string.Empty;

        [JsonPropertyName("vehicleType")]
        public string VehicleType { get; set; } = "Bus";

        [JsonPropertyName("acStatus")]
        public string AcStatus { get; set; } = "AC";

        [JsonPropertyName("capacity")]
        public int Capacity { get; set; } = 40;

        [JsonPropertyName("assignedStudents")]
        public int AssignedStudents { get; set; } = 0;

        [JsonPropertyName("assignedRoute")]
        public string AssignedRoute { get; set; } = "Unassigned";

        [JsonPropertyName("assignedDriver")]
        public string AssignedDriver { get; set; } = "Unassigned";

        [JsonPropertyName("busAttendant")]
        public string BusAttendant { get; set; } = "Unassigned";

        [JsonPropertyName("assignmentStatus")]
        public string AssignmentStatus { get; set; } = "Unassigned";

        [JsonPropertyName("utilizationPercentage")]
        public string UtilizationPercentage { get; set; } = "0%";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";
    }
}

