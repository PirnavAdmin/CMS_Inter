using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.Driver
{
    /// <summary>
    /// Request model to associate an existing Staff member as a Transport Driver.
    /// Staff is the single source of truth for employee identity.
    /// </summary>
    public class CreateTransportDriverDto
    {
        [JsonPropertyName("staffId")]
        public int? StaffId { get; set; }

        [JsonPropertyName("employeeId")]
        public string? EmployeeId { get; set; }

        private string _licenseNumber = string.Empty;
        [JsonPropertyName("licenseNumber")]
        public string LicenseNumber
        {
            get => _licenseNumber;
            set => _licenseNumber = value ?? string.Empty;
        }

        [JsonPropertyName("licenceNumber")]
        public string? LicenceNumber
        {
            get => _licenseNumber;
            set { if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_licenseNumber)) _licenseNumber = value; }
        }

        [JsonPropertyName("drivingLicenseNumber")]
        public string? DrivingLicenseNumber
        {
            get => _licenseNumber;
            set { if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_licenseNumber)) _licenseNumber = value; }
        }

        [JsonPropertyName("licenseExpiryDate")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? LicenseExpiryDate { get; set; }

        [JsonPropertyName("licenceExpiry")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? LicenceExpiry
        {
            get => LicenseExpiryDate;
            set { if (value.HasValue && !LicenseExpiryDate.HasValue) LicenseExpiryDate = value; }
        }

        [JsonPropertyName("experienceYears")]
        public int ExperienceYears { get; set; } = 5;

        [JsonPropertyName("assignedVehicleId")]
        public long? AssignedVehicleId { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;

        // --- Backward Compatibility Pass-Through Fields (Read for Staff lookup/fallback, not persisted as duplicate identity) ---
        [JsonPropertyName("driverName")]
        public string? DriverName { get; set; }

        [JsonPropertyName("mobileNumber")]
        public string? MobileNumber { get; set; }

        [JsonPropertyName("alternateMobileNumber")]
        public string? AlternateMobileNumber { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

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
