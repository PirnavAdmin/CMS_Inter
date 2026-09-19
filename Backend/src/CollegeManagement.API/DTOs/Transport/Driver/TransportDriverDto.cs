using System.Text.Json.Serialization;

namespace CollegeManagement.API.Dtos.Transport.Driver
{
    public class TransportDriverDto
    {
        [JsonPropertyName("id")]
        public string Id => DriverId > 0 ? DriverId.ToString() : "1";

        [JsonPropertyName("driverId")]
        public long DriverId { get; set; }

        [JsonPropertyName("driverName")]
        public string DriverName { get; set; } = string.Empty;

        [JsonPropertyName("employeeId")]
        public string EmployeeId { get; set; } = "DRV-1";

        [JsonPropertyName("empId")]
        public string EmpId => EmployeeId;

        [JsonPropertyName("driverFullName")]
        public string DriverFullName => DriverName;

        [JsonPropertyName("fullName")]
        public string FullName => DriverName;

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone => MobileNumber;

        [JsonPropertyName("alternateMobileNumber")]
        public string? AlternateMobileNumber { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("licenceNumber")]
        public string LicenceNumber { get; set; } = string.Empty;

        [JsonPropertyName("licenseNumber")]
        public string LicenseNumber => LicenceNumber;

        [JsonPropertyName("commercialLicenseNo")]
        public string CommercialLicenseNo => LicenceNumber;

        [JsonPropertyName("licenceExpiry")]
        public DateTime? LicenceExpiry { get; set; }

        [JsonPropertyName("licenseExpiryDate")]
        public string? LicenseExpiryDate => LicenceExpiry?.ToString("yyyy-MM-dd");

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("bloodGroup")]
        public string? BloodGroup { get; set; }

        [JsonPropertyName("emergencyContactName")]
        public string? EmergencyContactName { get; set; }

        [JsonPropertyName("emergencyContactNumber")]
        public string? EmergencyContactNumber { get; set; }

        [JsonPropertyName("emergencyContact")]
        public string? EmergencyContact => !string.IsNullOrWhiteSpace(EmergencyContactNumber) ? EmergencyContactNumber : EmergencyContactName;

        [JsonPropertyName("experienceYears")]
        public int ExperienceYears { get; set; } = 5;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("statusText")]
        public string StatusText { get; set; } = "Active";

        [JsonPropertyName("isLicenceExpired")]
        public bool IsLicenceExpired { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}
