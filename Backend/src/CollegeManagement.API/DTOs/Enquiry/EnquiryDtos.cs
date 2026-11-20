using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Enquiry
{
    public class CreateEnquiryRequest
    {
        public int? CampusId { get; set; }

        [Required(ErrorMessage = "Please enter a valid name.")]
        [StringLength(150, MinimumLength = 2, ErrorMessage = "Full Name must be between 2 and 150 characters.")]
        [RegularExpression(@"^[a-zA-Z\s.'-]+$", ErrorMessage = "Please enter a valid name.")]
        public string FullName { get; set; } = string.Empty;

        [StringLength(150, ErrorMessage = "Parent / Guardian Name cannot exceed 150 characters.")]
        [RegularExpression(@"^[a-zA-Z\s.'-]+$", ErrorMessage = "Please enter a valid parent / guardian name.")]
        public string? GuardianName { get; set; }

        [Required(ErrorMessage = "Email Address is required.")]
        [EmailAddress(ErrorMessage = "Please provide a valid email address.")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Please enter a valid 10-digit mobile number.")]
        [RegularExpression(@"^(\+91[\-\s]?)?[0-9]{10}$", ErrorMessage = "Please enter a valid 10-digit mobile number.")]
        [StringLength(30)]
        public string Mobile { get; set; } = string.Empty;

        [Required(ErrorMessage = "Enquiry Type is required.")]
        [StringLength(100)]
        public string EnquiryType { get; set; } = "General Enquiry";

        [StringLength(255)]
        public string? Subject { get; set; }

        [Required(ErrorMessage = "Message is required.")]
        public string Message { get; set; } = string.Empty;
    }

    public class EnquiryDto
    {
        public int Id { get; set; }
        public int? CampusId { get; set; }
        public string? CampusName { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string EnquiryType { get; set; } = string.Empty;
        public string? Subject { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Status { get; set; } = "New";
        public string Priority { get; set; } = "Medium";
        public int? AssignedToStaffId { get; set; }
        public string? AssignedToStaffName { get; set; }
        public int? HandledByStaffId { get; set; }
        public int? HandledByUserId { get; set; }
        public string? HandledByStaffName { get; set; }
        public string? HandledByRole { get; set; }
        public DateTime? ClaimedAt { get; set; }
        public string? ResponseNotes { get; set; }
        public string? ContactMethodUsed { get; set; }
        public DateTime? ContactedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public System.Collections.Generic.List<EnquiryActivityDto> Activities { get; set; } = new();
    }

    public class UpdateEnquiryStatusRequest
    {
        [Required(ErrorMessage = "Status is required.")]
        public string Status { get; set; } = string.Empty;

        public string? ResponseNotes { get; set; }
        public string? ContactMethodUsed { get; set; } // 'Phone', 'Email', 'In-Person', 'WhatsApp'
        public int? HandledByUserId { get; set; }
        public int? HandledByStaffId { get; set; }
        public string? HandledByStaffName { get; set; }
        public string? HandledByRole { get; set; }
        public int? AssignedToStaffId { get; set; }
        public string? AssignedToStaffName { get; set; }
    }

    public class TakeChargeRequest
    {
        public int? UserId { get; set; }
        public int? StaffId { get; set; }
        public string? StaffName { get; set; }
        public string? Role { get; set; }
    }

    public class ClaimedByInfoDto
    {
        public int? UserId { get; set; }
        public string? StaffName { get; set; }
        public string? Role { get; set; }
        public DateTime? ClaimedAt { get; set; }
    }

    public class TakeChargeResultDto
    {
        public bool Success { get; set; }
        public bool AlreadyClaimedByOther { get; set; }
        public string Message { get; set; } = string.Empty;
        public EnquiryDto? Enquiry { get; set; }
        public ClaimedByInfoDto? ClaimedBy { get; set; }
    }

    public class EnquiryActivityDto
    {
        public int Id { get; set; }
        public int EnquiryId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? PreviousStatus { get; set; }
        public string? NewStatus { get; set; }
        public int? PerformedByUserId { get; set; }
        public string PerformedByName { get; set; } = string.Empty;
        public string PerformedByRole { get; set; } = string.Empty;
        public string? ContactMethod { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class EnquiryStatsDto
    {
        public int TotalCount { get; set; }
        public int NewCount { get; set; }
        public int InProgressCount { get; set; }
        public int ContactedCount { get; set; }
        public int ResolvedCount { get; set; }
        public int TodayCount { get; set; }
    }

    public class LandingContactConfigDto
    {
        public int Id { get; set; }
        public int? CampusId { get; set; }
        public string CollegeName { get; set; } = "Pirnav College";
        public string ContactAddress { get; set; } = "Vijayawada, Andhra Pradesh";
        public string ContactEmail { get; set; } = "support@pirnavcollege.com";
        public string ContactPhone { get; set; } = "+91 9398649798";
        public string OfficeHours { get; set; } = "Monday – Saturday: 9:00 AM – 5:00 PM";
        public string? SupportHelpline { get; set; } = "+91 9398649798";
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveLandingContactConfigRequest
    {
        public int? CampusId { get; set; }

        [Required(ErrorMessage = "College Name is required.")]
        [StringLength(200)]
        public string CollegeName { get; set; } = "Pirnav College";

        [Required(ErrorMessage = "Contact Address is required.")]
        [StringLength(500)]
        public string ContactAddress { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact Email is required.")]
        [EmailAddress(ErrorMessage = "Please provide a valid email address.")]
        public string ContactEmail { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact Phone is required.")]
        public string ContactPhone { get; set; } = string.Empty;

        [StringLength(200)]
        public string OfficeHours { get; set; } = "Monday – Saturday: 9:00 AM – 5:00 PM";

        [StringLength(50)]
        public string? SupportHelpline { get; set; }
    }
}
