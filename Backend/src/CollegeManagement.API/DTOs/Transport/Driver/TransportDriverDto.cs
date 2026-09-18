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

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber { get; set; } = string.Empty;

        [JsonPropertyName("alternateMobileNumber")]
        public string? AlternateMobileNumber { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("licenseNumber")]
        public string LicenseNumber { get; set; } = string.Empty;

        [JsonPropertyName("licenseExpiryDate")]
        public string? LicenseExpiryDate => LicenceExpiry.HasValue ? LicenceExpiry.Value.ToString("yyyy-MM-dd") : null;

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

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("statusText")]
        public string StatusText { get; set; } = "Active";

        [JsonPropertyName("isLicenceExpired")]
        public bool IsLicenceExpired => LicenceExpiry.HasValue && LicenceExpiry.Value < DateTime.UtcNow.Date;

        [JsonPropertyName("createdAt")]
        public DateTime? CreatedAt { get; set; }

        // Compatibility aliases marked with [JsonIgnore] to prevent duplicate JSON response fields
        [JsonIgnore]
        public string EmpId { get => EmployeeId; set => EmployeeId = value; }

        [JsonIgnore]
        public string DriverFullName => DriverName;

        [JsonIgnore]
        public string FullName => DriverName;

        [JsonIgnore]
        public string Phone { get => MobileNumber; set => MobileNumber = value; }

        [JsonIgnore]
        public string LicenceNumber { get => LicenseNumber; set => LicenseNumber = value; }

        [JsonIgnore]
        public string CommercialLicenseNo => LicenseNumber;

        [JsonIgnore]
        public DateTime? LicenceExpiry { get; set; }

        [JsonIgnore]
        public string? EmergencyContact => !string.IsNullOrWhiteSpace(EmergencyContactNumber) ? EmergencyContactNumber : EmergencyContactName;
    }
}
