using System;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.Attendant
{
    /// <summary>
    /// Request model to update transport-specific Attendant details.
    /// Employee identity belongs to Staff and is not updated through this DTO.
    /// </summary>
    public class UpdateTransportAttendantDto
    {
        [JsonPropertyName("assignedVehicleId")]
        public long? AssignedVehicleId { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;

        // --- Frontend Compatibility Pass-Through Fields (Accepted to prevent JSON deserialization errors) ---
        [JsonPropertyName("staffId")]
        public int? StaffId { get; set; }

        [JsonPropertyName("employeeId")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("attendantName")]
        public string? AttendantName { get; set; }

        [JsonPropertyName("mobileNumber")]
        public string? MobileNumber { get; set; }

        [JsonPropertyName("gender")]
        public string? Gender { get; set; }

        [JsonPropertyName("branchName")]
        public string? BranchName { get; set; }

        [JsonPropertyName("branchCampus")]
        public string? BranchCampus
        {
            get => BranchName;
            set { if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(BranchName)) BranchName = value; }
        }

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
    }
}
