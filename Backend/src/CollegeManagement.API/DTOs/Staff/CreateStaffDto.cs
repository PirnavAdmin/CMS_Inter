using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class CreateStaffDto
    {
        [StringLength(50)]
        public string? EmployeeId { get; set; }

        [Required(ErrorMessage = "First name is required.")]
        [StringLength(100, ErrorMessage = "First name cannot exceed 100 characters.")]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? MiddleName { get; set; }

        [Required(ErrorMessage = "Last name is required.")]
        [StringLength(100, ErrorMessage = "Last name cannot exceed 100 characters.")]
        public string LastName { get; set; } = string.Empty;

        [StringLength(150)]
        public string? FatherOrHusbandName { get; set; }

        public string? GuardianName
        {
            get => FatherOrHusbandName;
            set => FatherOrHusbandName = value;
        }

        [StringLength(20)]
        public string? Gender { get; set; } = "Male";

        public DateTime? DateOfBirth { get; set; }

        [StringLength(20)]
        public string? MaritalStatus { get; set; }

        [StringLength(50)]
        public string? Nationality { get; set; } = "Indian";

        [StringLength(20, ErrorMessage = "Aadhaar number must not exceed 20 characters.")]
        public string? Aadhaar { get; set; }

        [StringLength(20)]
        public string? PanNumber { get; set; }

        public string? Pan
        {
            get => PanNumber;
            set => PanNumber = value;
        }

        [Required(ErrorMessage = "Mobile number is required.")]
        [StringLength(15, ErrorMessage = "Mobile number cannot exceed 15 digits.")]
        public string Mobile { get; set; } = string.Empty;

        [StringLength(15)]
        public string? AlternateMobile { get; set; }

        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [StringLength(10)]
        public string? BloodGroup { get; set; }

        // Contact & Address
        [StringLength(255)]
        public string? CurrentAddress { get; set; }

        [StringLength(255)]
        public string? PermanentAddress { get; set; }

        [StringLength(100)]
        public string? City { get; set; }

        [StringLength(100)]
        public string? District { get; set; }

        [StringLength(100)]
        public string? State { get; set; }

        [StringLength(20)]
        public string? Pincode { get; set; }

        public string? Pin
        {
            get => Pincode;
            set => Pincode = value;
        }

        [StringLength(100)]
        public string? Country { get; set; } = "India";

        [StringLength(100)]
        public string? Qualification { get; set; } = "Bachelor's Degree";

        [StringLength(100)]
        public string? Designation { get; set; }

        public int? DesignationId { get; set; }

        /// <summary>
        /// Frontend-selected Role ID from Roles table (e.g. Faculty, HOD, Accounts, Library, etc.).
        /// Required for centralized User account provisioning.
        /// </summary>
        public int? RoleId { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Teaching";
        public string FacultyType => StaffType;

        public int? DepartmentId { get; set; }

        [StringLength(100)]
        public string? Department { get; set; }

        public int? BoardId { get; set; }

        [StringLength(50)]
        public string? BoardCode { get; set; }

        [StringLength(100)]
        public string? BoardName { get; set; }

        public string? Board
        {
            get => !string.IsNullOrWhiteSpace(BoardCode) ? BoardCode : BoardName;
            set => BoardName = value;
        }

        public DateTime? JoiningDate { get; set; }

        public DateTime? DateOfJoining
        {
            get => JoiningDate;
            set => JoiningDate = value;
        }

        public decimal Experience { get; set; } = 0.0m;

        [StringLength(50)]
        public string? EmploymentType { get; set; } = "Full Time";

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? PhotoPath { get; set; }

        public string? ProfileStatus { get; set; }
        public int? ProfileCompletionPercentage { get; set; }

        // Subject Allocation Lists
        public List<string>? AllocatedSubjects { get; set; } = new();
        public List<string>? Subjects
        {
            get => AllocatedSubjects;
            set => AllocatedSubjects = value;
        }

        // Flattened Bank Details
        public string? SalaryStructure { get; set; }
        public decimal? BasicSalary { get; set; }
        public decimal? GrossSalary { get; set; }
        public string? BankName { get; set; }
        public string? AccountHolder { get; set; }
        public string? AccountHolderName
        {
            get => AccountHolder;
            set => AccountHolder = value;
        }
        public string? AccountNumber { get; set; }
        public string? Ifsc { get; set; }
        public string? IfscCode
        {
            get => Ifsc;
            set => Ifsc = value;
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
        public string? EmergencyName { get; set; }
        public string? ContactName
        {
            get => EmergencyName;
            set => EmergencyName = value;
        }
        public string? EmergencyContactName
        {
            get => EmergencyName;
            set => EmergencyName = value;
        }
        public string? EmergencyRelationship { get; set; }
        public string? Relationship
        {
            get => EmergencyRelationship;
            set => EmergencyRelationship = value;
        }
        public string? EmergencyContactRelation
        {
            get => EmergencyRelationship;
            set => EmergencyRelationship = value;
        }
        public string? EmergencyMobile { get; set; }
        public string? EmergencyContactPhone
        {
            get => EmergencyMobile;
            set => EmergencyMobile = value;
        }
        public string? EmergencyAlternate { get; set; }
        public string? EmergencyAddress { get; set; }

        // Flattened Academic & Experience
        public string? HighestQualification { get; set; }
        public string? University { get; set; }
        public string? Specialization { get; set; }
        public string? PassingYear { get; set; }
        public string? Percentage { get; set; }
        public string? TotalExperience { get; set; }
        public decimal? PreviousExperienceYears { get; set; }
        public string? PreviousInstitution { get; set; }
        public string? PreviousDesignation { get; set; }
        public string? ExperienceFrom { get; set; }
        public string? ExperienceTo { get; set; }

        // Flattened Documents
        public string? AadhaarDocument { get; set; }
        public string? PanDocument { get; set; }
        public string? QualificationCertificate { get; set; }
        public string? ExperienceCertificate { get; set; }
        public string? Resume { get; set; }
        public string? BankProof { get; set; }
        public string? DrivingLicence { get; set; }
        public string? OtherDocuments { get; set; }
        public string? Photo { get; set; }
        public string? Signature { get; set; }

        // Optional Raw JSON Columns
        public string? EducationJson { get; set; }
        public string? ExperienceJson { get; set; }
        public string? DocumentsJson { get; set; }
        public string? BankDetailsJson { get; set; }
        public string? EmergencyContactJson { get; set; }
    }
}
