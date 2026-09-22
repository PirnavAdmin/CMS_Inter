using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Attendant
{
    public class TransportAttendantDto
    {
        [JsonPropertyName("id")]
        public string Id => AttendantId > 0 ? AttendantId.ToString() : "1";

        [JsonPropertyName("attendantId")]
        public long AttendantId { get; set; }

        [JsonPropertyName("employeeId")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("attendantCode")]
        public string? AttendantCode => !string.IsNullOrWhiteSpace(EmployeeId) ? EmployeeId : $"ATT-2026-{AttendantId:D2}";

        [JsonPropertyName("attendantName")]
        public string AttendantName { get; set; } = string.Empty;

        [JsonPropertyName("attendantFullName")]
        public string AttendantFullName => AttendantName;

        [JsonPropertyName("fullName")]
        public string FullName => AttendantName;

        [JsonPropertyName("name")]
        public string Name => AttendantName;

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone => MobileNumber;

        [JsonPropertyName("gender")]
        public string? Gender { get; set; }

        [JsonPropertyName("branchName")]
        public string? BranchName { get; set; }

        [JsonPropertyName("branchCampus")]
        public string? BranchCampus => BranchName ?? "Main Campus";

        [JsonPropertyName("branch")]
        public string? Branch => BranchCampus;

        [JsonPropertyName("alternateMobileNumber")]
        public string? AlternateMobileNumber { get; set; }

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

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("statusText")]
        public string StatusText { get; set; } = "Active";

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}

