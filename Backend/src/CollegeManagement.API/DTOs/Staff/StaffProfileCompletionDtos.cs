using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.DTOs.Staff
{
    public class SendProfileLinkRequestDto
    {
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public int ValidityDays { get; set; } = 7;
        public string? CustomMessage { get; set; }
    }

    public class SendProfileLinkResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string ProfileLink { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime SentAt { get; set; }
        public bool EmailSent { get; set; }
        public string? EmailRecipient { get; set; }
        public string? EmailError { get; set; }
    }

    public class StaffProfileFullDto
    {
        private string? _photo;

        public int Id { get; set; }
        public int StaffId => Id;
        public int FacultyId => Id;
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;

        public string? GuardianName
        {
            get => FatherOrHusbandName;
            set => FatherOrHusbandName = value;
        }
        public string? FatherOrHusbandName { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string? MaritalStatus { get; set; }
        public string? Nationality { get; set; } = "Indian";
        public string? Aadhaar { get; set; }
        
        public string? Pan
        {
            get => PanNumber;
            set => PanNumber = value;
        }
        public string? PanNumber { get; set; }
        public string Mobile { get; set; } = string.Empty;
        public string? AlternateMobile { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? BloodGroup { get; set; }

        // Contact & Address
        public string? CurrentAddress { get; set; }
        public string? PermanentAddress { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        
        public string? Pin
        {
            get => Pincode;
            set => Pincode = value;
        }
        public string? Pincode { get; set; }
        public string? Country { get; set; } = "India";

        // Professional / Employment
        public string Qualification { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public int? DesignationId { get; set; }
        public string StaffType { get; set; } = "Teaching";
        public string FacultyType => StaffType;
        public string Department { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string? BoardName { get; set; }
        public string? BoardCode { get; set; }
        public string? Board => !string.IsNullOrWhiteSpace(BoardCode) ? BoardCode : BoardName;
        public int? BoardId { get; set; }

        public DateTime DateOfJoining
        {
            get => JoiningDate;
            set => JoiningDate = value;
        }
        public DateTime JoiningDate { get; set; }
        public decimal Experience { get; set; }
        public string? EmploymentType { get; set; } = "Full Time";
        public string Status { get; set; } = "Active";
        public string? PhotoPath { get; set; }
        public string? PhotoUrl { get; set; }
        public string? ProfilePhoto => !string.IsNullOrWhiteSpace(PhotoUrl) ? PhotoUrl : PhotoPath;
        public string? Photo
        {
            get => !string.IsNullOrWhiteSpace(_photo) ? _photo : ProfilePhoto;
            set => _photo = value;
        }

        // Lifecycle & Status
        public string ProfileStatus { get; set; } = "PendingLink";
        public int ProfileCompletion
        {
            get => ProfileCompletionPercentage;
            set => ProfileCompletionPercentage = value;
        }
        public int ProfileCompletionPercentage { get; set; } = 30;
        public string? ProfileLinkToken { get; set; }
        public bool LinkSent => ProfileLinkSentAt.HasValue || ProfileStatus == "Link Sent" || ProfileStatus == "LinkSent";
        public string? LinkSentAt => ProfileLinkSentAt.HasValue ? ProfileLinkSentAt.Value.ToString("yyyy-MM-dd") : null;
        public DateTime? ProfileLinkSentAt { get; set; }
        public DateTime? ProfileLinkExpiresAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? CorrectionRequestedAt { get; set; }
        public string? CorrectionNote
        {
            get => CorrectionNotes;
            set => CorrectionNotes = value;
        }
        public string? CorrectionNotes { get; set; }
        public string? ReviewStatus { get; set; }
        public string? AddedOn => CreatedAt.ToString("yyyy-MM-dd");
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Flattened Academic & Experience Fields for Frontend Views
        public string? HighestQualification { get; set; }
        public string? University { get; set; }
        public string? Specialization { get; set; }
        public string? PassingYear { get; set; }
        public string? Percentage { get; set; }
        public string? TotalExperience { get; set; }
        public string? PreviousInstitution { get; set; }
        public string? PreviousDesignation { get; set; }
        public string? ExperienceFrom { get; set; }
        public string? ExperienceTo { get; set; }

        public List<string> AllocatedSubjects { get; set; } = new();
        public List<string> Subjects
        {
            get => AllocatedSubjects;
            set => AllocatedSubjects = value;
        }

        // Flattened Bank Details
        public string? SalaryStructure { get; set; }
        public decimal? BasicSalary { get; set; }
        public decimal? GrossSalary { get; set; }
        public string? BankName { get; set; }
        public string? AccountHolder
        {
            get => AccountHolderName;
            set => AccountHolderName = value;
        }
        public string? AccountHolderName { get; set; }
        public string? AccountNumber { get; set; }
        public string? IfscCode { get; set; }
        public string? Ifsc
        {
            get => IfscCode;
            set => IfscCode = value;
        }
        public string? Branch { get; set; }
        public string? BranchName
        {
            get => Branch;
            set => Branch = value;
        }
        public string? AccountType { get; set; }
        public string? PfNumber { get; set; }
        public string? EsiNumber { get; set; }
        public string? UanNumber { get; set; }

        // Flattened Emergency Details
        public string? EmergencyName
        {
            get => ContactName;
            set => ContactName = value;
        }
        public string? ContactName { get; set; }
        public string? EmergencyContactName
        {
            get => ContactName;
            set => ContactName = value;
        }
        public string? EmergencyRelationship
        {
            get => Relationship;
            set => Relationship = value;
        }
        public string? Relationship { get; set; }
        public string? EmergencyContactRelation
        {
            get => Relationship;
            set => Relationship = value;
        }
        public string? EmergencyMobile { get; set; }
        public string? EmergencyContactPhone
        {
            get => EmergencyMobile;
            set => EmergencyMobile = value;
        }
        public string? EmergencyAlternate { get; set; }
        public string? EmergencyAddress { get; set; }

        public decimal? PreviousExperienceYears { get; set; }

        // Flattened Documents
        public string? AadhaarDocument { get; set; }
        public string? AadhaarCardUrl
        {
            get => AadhaarDocument;
            set => AadhaarDocument = value;
        }
        public string? PanDocument { get; set; }
        public string? PanCardUrl
        {
            get => PanDocument;
            set => PanDocument = value;
        }
        public string? QualificationCertificate { get; set; }
        public string? ExperienceCertificate { get; set; }
        public string? Resume { get; set; }
        public string? ResumeUrl
        {
            get => Resume;
            set => Resume = value;
        }
        public string? JoiningLetterUrl { get; set; }
        public string? BankProof { get; set; }
        public string? DrivingLicence { get; set; }
        public string? OtherDocuments { get; set; }
        public string? Signature { get; set; }

        // Structured Sub-sections (for nested callers)
        public List<StaffEducationItem> EducationList { get; set; } = new();
        public List<StaffExperienceItem> ExperienceList { get; set; } = new();
        public List<StaffDocumentItem> DocumentsList { get; set; } = new();
        public List<StaffDocumentItem> Documents
        {
            get => DocumentsList;
            set => DocumentsList = value;
        }
        public StaffBankDetails BankDetails { get; set; } = new();
        public StaffEmergencyContact EmergencyContact { get; set; } = new();
    }

    public class UpdateStaffProfileSectionDto
    {
        public string SectionName { get; set; } = string.Empty; // "Personal", "Address", "Education", "Experience", "Documents", "Bank", "Emergency", "Employment"
        
        public UpdateStaffPersonalDetailsDto? Personal { get; set; }
        public UpdateStaffAddressDto? Address { get; set; }
        public List<StaffEducationItem>? Education { get; set; }
        public List<StaffExperienceItem>? Experience { get; set; }
        public StaffBankDetails? Bank { get; set; }
        public StaffEmergencyContact? Emergency { get; set; }
        public UpdateStaffEmploymentDetailsDto? Employment { get; set; }
    }

    public class UpdateStaffPersonalDetailsDto
    {
        public string? FirstName { get; set; }
        public string? MiddleName { get; set; }
        public string? LastName { get; set; }
        public string? FatherOrHusbandName { get; set; }
        public string? GuardianName
        {
            get => FatherOrHusbandName;
            set => FatherOrHusbandName = value;
        }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? MaritalStatus { get; set; }
        public string? Nationality { get; set; }
        public string? Aadhaar { get; set; }
        public string? PanNumber { get; set; }
        public string? Pan
        {
            get => PanNumber;
            set => PanNumber = value;
        }
        public string? BloodGroup { get; set; }
    }

    public class UpdateStaffAddressDto
    {
        public string? AlternateMobile { get; set; }
        public string? CurrentAddress { get; set; }
        public string? PermanentAddress { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }
        public string? Pin
        {
            get => Pincode;
            set => Pincode = value;
        }
        public string? Country { get; set; }
    }

    public class UpdateStaffEmploymentDetailsDto
    {
        public int? DepartmentId { get; set; }
        public string? Department { get; set; }
        public int? DesignationId { get; set; }
        public string? Designation { get; set; }
        public DateTime? JoiningDate { get; set; }
        public DateTime? DateOfJoining
        {
            get => JoiningDate;
            set => JoiningDate = value;
        }
        public string? Qualification { get; set; }
        public decimal? Experience { get; set; }
        public string? EmploymentType { get; set; }
        public string? Status { get; set; }
    }

    public class AdminReviewStaffDto
    {
        [Required]
        public string Action { get; set; } = "Approve"; // "Approve" | "RequestCorrection"
        public string? CorrectionNotes { get; set; }
    }

    public class UploadStaffDocumentDto
    {
        [Required(ErrorMessage = "Document type is required.")]
        public string DocumentType { get; set; } = string.Empty;

        [Required(ErrorMessage = "Document file is required.")]
        public Microsoft.AspNetCore.Http.IFormFile File { get; set; } = null!;
    }
}
