using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CollegeManagement.API.Common;

namespace CollegeManagement.API.Dtos.Transport.Attendant
{
    public class CreateTransportAttendantDto
    {
        private string _attendantName = string.Empty;
        private string _mobileNumber = string.Empty;

        [JsonPropertyName("employeeId")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("attendantCode")]
        public string? AttendantCode
        {
            get => EmployeeId;
            set { if (!string.IsNullOrWhiteSpace(value)) EmployeeId = value; }
        }

        [JsonPropertyName("attendantName")]
        public string AttendantName
        {
            get => !string.IsNullOrWhiteSpace(_attendantName) ? _attendantName : "Bus Attendant";
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                    _attendantName = value;
            }
        }

        [JsonPropertyName("attendantFullName")]
        public string? AttendantFullName
        {
            get => AttendantName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_attendantName))
                    _attendantName = value;
            }
        }

        [JsonPropertyName("fullName")]
        public string? FullName
        {
            get => AttendantName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_attendantName))
                    _attendantName = value;
            }
        }

        [JsonPropertyName("name")]
        public string? Name
        {
            get => AttendantName;
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && string.IsNullOrWhiteSpace(_attendantName))
                    _attendantName = value;
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

        [JsonPropertyName("gender")]
        public string? Gender { get; set; }

        [JsonPropertyName("branchCampus")]
        public string? BranchCampus { get; set; }

        [JsonPropertyName("branchName")]
        public string? BranchName
        {
            get => BranchCampus;
            set { if (!string.IsNullOrWhiteSpace(value)) BranchCampus = value; }
        }

        [JsonPropertyName("branch")]
        public string? Branch
        {
            get => BranchCampus;
            set { if (!string.IsNullOrWhiteSpace(value)) BranchCampus = value; }
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

        [JsonPropertyName("assignedVehicleId")]
        public long? AssignedVehicleId { get; set; }

        [JsonPropertyName("status")]
        [JsonConverter(typeof(FlexibleBoolConverter))]
        public bool Status { get; set; } = true;
    }
}

