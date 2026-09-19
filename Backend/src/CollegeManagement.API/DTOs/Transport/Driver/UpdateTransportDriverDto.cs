using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.Driver
{
    public class UpdateTransportDriverDto
    {
        private string _driverName = string.Empty;
        private string _mobileNumber = string.Empty;
        private string _licenceNumber = string.Empty;

        private string _employeeId = string.Empty;

        [JsonPropertyName("employeeId")]
        public string EmployeeId
        {
            get => !string.IsNullOrWhiteSpace(_employeeId) ? _employeeId : $"DRV-{Random.Shared.Next(1, 99)}";
            set => _employeeId = value ?? string.Empty;
        }

        [JsonPropertyName("empId")]
        public string? EmpId
        {
            get => EmployeeId;
            set { if (!string.IsNullOrWhiteSpace(value)) EmployeeId = value; }
        }

        [JsonPropertyName("driverName")]
        public string DriverName
        {
            get => !string.IsNullOrWhiteSpace(_driverName) ? _driverName : "Driver";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                    _driverName = value;
            }
        }

        [JsonPropertyName("driverFullName")]
        public string? DriverFullName
        {
            get => DriverName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_driverName))
                    _driverName = value;
            }
        }

        [JsonPropertyName("fullName")]
        public string? FullName
        {
            get => DriverName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_driverName))
                    _driverName = value;
            }
        }

        [JsonPropertyName("name")]
        public string? Name
        {
            get => DriverName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_driverName))
                    _driverName = value;
            }
        }

        [JsonPropertyName("mobileNumber")]
        public string MobileNumber
        {
            get => !string.IsNullOrWhiteSpace(_mobileNumber) ? _mobileNumber : "0000000000";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                    _mobileNumber = value;
            }
        }

        [JsonPropertyName("phone")]
        public string? Phone
        {
            get => MobileNumber;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_mobileNumber))
                    _mobileNumber = value;
            }
        }

        [JsonPropertyName("alternateMobileNumber")]
        public string? AlternateMobileNumber { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("licenceNumber")]
        public string LicenceNumber
        {
            get => !string.IsNullOrWhiteSpace(_licenceNumber) ? _licenceNumber : $"LIC-{Random.Shared.Next(1000, 9999)}";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                    _licenceNumber = value;
            }
        }

        [JsonPropertyName("licenseNumber")]
        public string? LicenseNumber
        {
            get => LicenceNumber;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_licenceNumber))
                    _licenceNumber = value;
            }
        }

        [JsonPropertyName("commercialLicenseNo")]
        public string? CommercialLicenseNo
        {
            get => LicenceNumber;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_licenceNumber))
                    _licenceNumber = value;
            }
        }

        [JsonPropertyName("licenceExpiry")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? LicenceExpiry { get; set; }

        [JsonPropertyName("licenseExpiryDate")]
        public string? LicenseExpiryDate
        {
            get => LicenceExpiry?.ToString("yyyy-MM-dd");
            set { if (DateTime.TryParse(value, out var d)) LicenceExpiry = d; }
        }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("bloodGroup")]
        public string? BloodGroup { get; set; }

        [JsonPropertyName("emergencyContactName")]
        public string? EmergencyContactName { get; set; }

        [JsonPropertyName("emergencyContactNumber")]
        public string? EmergencyContactNumber { get; set; }

        [JsonPropertyName("emergencyContact")]
        public string? EmergencyContact
        {
            get => EmergencyContactNumber ?? EmergencyContactName;
            set { if (!string.IsNullOrWhiteSpace(value)) { EmergencyContactNumber = value; EmergencyContactName = value; } }
        }

        [JsonPropertyName("experienceYears")]
        public int ExperienceYears { get; set; } = 5;

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}
