using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class OfferLetterWorkflowConfigDto
    {
        public string WorkflowPreference { get; set; } = "Automatic"; // "Automatic" | "AdminApproval"
        public bool AutoSendOnSubmission { get; set; } = true;
        public bool AutoSendOnApproval { get; set; } = true;
        public string? CcHrEmail { get; set; } = "hr@pirnav.edu.in";
        public string? EmailSubject { get; set; } = "Official Letter of Appointment & Offer Letter - {{EmployeeId}}";
        public string? EmailBody { get; set; } = "Dear {{StaffName}},\n\nCongratulations! Your staff onboarding profile has been processed.\nAttached is your official Letter of Appointment and Offer Letter.\n\nWelcome to Pirnav Educational Society.";
        public string? AttachPdfFilenamePattern { get; set; } = "Offer_Letter_{{EmployeeId}}.pdf";
    }

    public class VerifyStaffOnboardingDto
    {
        public string? VerificationNotes { get; set; }
    }

    public class ApproveStaffOfferLetterDto
    {
        public string? Remarks { get; set; }
    }

    public class RejectStaffOfferLetterDto
    {
        [Required(ErrorMessage = "Rejection reason is required.")]
        public string RejectionReason { get; set; } = string.Empty;

        [Required(ErrorMessage = "Rejection scenario is required.")]
        public string Scenario { get; set; } = "Correction"; // "DateChange" | "Correction" | "Discontinue"

        public DateTime? RevisedOnboardingDate { get; set; }
        public string? AdditionalInstructions { get; set; }
    }

    public class StaffOnboardingRequestDto
    {
        public int StaffId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Department { get; set; }
        public string? Designation { get; set; }
        public string? CampusName { get; set; }
        public int? CampusId { get; set; }
        public string? BoardName { get; set; }
        public string ProfileStatus { get; set; } = "PendingApproval";
        public int ProfileCompletionPercentage { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? CorrectionRequestedAt { get; set; }
        public string? CorrectionNotes { get; set; }
        public DateTime JoiningDate { get; set; }
        public string? PhotoPath { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? Status { get; set; }
        public bool HasOfferLetter { get; set; }
    }
}
