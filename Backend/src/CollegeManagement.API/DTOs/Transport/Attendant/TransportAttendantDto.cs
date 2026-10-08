using System;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Attendant
{
    public class TransportAttendantDto
    {
        [JsonPropertyName("id")]
        public string Id => AttendantId > 0 ? AttendantId.ToString() : "1";

        [JsonPropertyName("attendantId")]
        public long AttendantId { get; set; }

        [JsonPropertyName("staffId")]
        public int? StaffId { get; set; }

        [JsonPropertyName("employeeId")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("attendantName")]
        public string AttendantName { get; set; } = string.Empty;

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber { get; set; } = string.Empty;

        [JsonPropertyName("alternateMobileNumber")]
        public string? AlternateMobileNumber { get; set; }

        [JsonPropertyName("gender")]
        public string? Gender { get; set; } = "Female";

        [JsonPropertyName("branchName")]
        public string? BranchName { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("bloodGroup")]
        public string? BloodGroup { get; set; }

        [JsonPropertyName("emergencyContactName")]
        public string? EmergencyContactName { get; set; }

        [JsonPropertyName("emergencyContactNumber")]
        public string? EmergencyContactNumber { get; set; }

        [JsonPropertyName("assignedVehicleId")]
        public long? AssignedVehicleId { get; set; }

        [JsonPropertyName("assignedVehicleNumber")]
        public string? AssignedVehicleNumber { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("createdAt")]
        public DateTime? CreatedAt { get; set; }
    }
}
