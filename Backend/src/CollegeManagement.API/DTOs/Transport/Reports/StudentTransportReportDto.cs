using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Reports
{
    public class StudentTransportReportDto
    {
        [JsonPropertyName("assignmentId")]
        public long AssignmentId { get; set; }

        [JsonPropertyName("id")]
        public string Id => AssignmentId > 0 ? AssignmentId.ToString() : "1";

        [JsonPropertyName("admissionNo")]
        public string AdmissionNo { get; set; } = string.Empty;

        [JsonPropertyName("studentName")]
        public string StudentName { get; set; } = string.Empty;

        [JsonPropertyName("classSection")]
        public string ClassSection { get; set; } = string.Empty;

        [JsonPropertyName("className")]
        public string ClassName { get; set; } = string.Empty;

        [JsonPropertyName("routeName")]
        public string RouteName { get; set; } = string.Empty;

        [JsonPropertyName("pickupPoint")]
        public string PickupPoint { get; set; } = string.Empty;

        [JsonPropertyName("assignedBus")]
        public string AssignedBus { get; set; } = string.Empty;

        [JsonPropertyName("vehicleNumber")]
        public string VehicleNumber => AssignedBus;

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";
    }
}

