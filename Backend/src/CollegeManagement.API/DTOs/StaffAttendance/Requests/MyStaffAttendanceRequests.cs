using System;
using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Requests
{
    public class StaffPunchRequest
    {
        public VerificationMethod VerificationMethod { get; set; } = VerificationMethod.WebCheckIn;

        [MaxLength(100)]
        public string? DeviceId { get; set; } = "Web Portal";

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class SubmitRegularizationRequest
    {
        [Required]
        public DateTime AttendanceDate { get; set; }

        public string? RequestedInTime { get; set; }

        public string? RequestedOutTime { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }

    public class ReviewRegularizationRequest
    {
        [Required]
        public string Status { get; set; } = "Approved"; // "Approved" or "Rejected"

        [MaxLength(500)]
        public string? AdminRemarks { get; set; }
    }
}
