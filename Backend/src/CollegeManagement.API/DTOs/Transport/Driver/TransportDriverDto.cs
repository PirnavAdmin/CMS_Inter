using System;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Driver
{
    public class TransportDriverDto
    {
        [JsonPropertyName("id")]
        public string Id => (StaffId.HasValue && StaffId.Value > 0) 
            ? StaffId.Value.ToString() 
            : (DriverId > 0 ? DriverId.ToString() : string.Empty);

        [JsonPropertyName("driverId")]
        public long DriverId { get; set; }

        [JsonPropertyName("staffId")]
        public int? StaffId { get; set; }

        [JsonPropertyName("employeeId")]
        public string EmployeeId { get; set; } = string.Empty;

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber { get; set; } = string.Empty;

        [JsonPropertyName("alternateMobileNumber")]
        public string? AlternateMobileNumber { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("licenseNumber")]
        public string LicenseNumber { get; set; } = string.Empty;

        [JsonPropertyName("licenseExpiryDate")]
        public string? LicenseExpiryDate { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("bloodGroup")]
        public string? BloodGroup { get; set; }

        [JsonPropertyName("emergencyContactName")]
        public string? EmergencyContactName { get; set; }

        [JsonPropertyName("emergencyContactNumber")]
        public string? EmergencyContactNumber { get; set; }

        [JsonPropertyName("experienceYears")]
        public int ExperienceYears { get; set; } = 5;

        [JsonPropertyName("assignedVehicleId")]
        public long? AssignedVehicleId { get; set; }

        [JsonPropertyName("assignedVehicleNumber")]
        public string? AssignedVehicleNumber { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("createdAt")]
        public DateTime? CreatedAt { get; set; }

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("campusName")]
        public string? CampusName { get; set; }
    }
}
