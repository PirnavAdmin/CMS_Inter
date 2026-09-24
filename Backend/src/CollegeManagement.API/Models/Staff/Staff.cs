using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using CollegeManagement.API.Models.Faculty;

namespace CollegeManagement.API.Models.Staff
{
    [Table("Staff")]
    public class Staff
    {
        [Key]
        public int Id { get; set; }

        [NotMapped]
        public int StaffId
        {
            get => Id;
            set => Id = value;
        }

        [NotMapped]
        public int FacultyId
        {
            get => Id;
            set => Id = value;
        }

        [Required]
        [StringLength(50)]
        public string EmployeeId { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(100)]
        public string? MiddleName { get; set; }

        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [StringLength(150)]
        public string? FatherOrHusbandName { get; set; }

        [Required]
        [StringLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [StringLength(20)]
        public string? MaritalStatus { get; set; }

        [StringLength(50)]
        public string? Nationality { get; set; } = "Indian";

        [StringLength(20)]
        public string? Aadhaar { get; set; }

        [StringLength(20)]
        public string? PanNumber { get; set; }

        [Required]
        [StringLength(15)]
        public string Mobile { get; set; } = string.Empty;

        [StringLength(15)]
        public string? AlternateMobile { get; set; }

        [StringLength(150)]
        public string? Email { get; set; }

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

        [StringLength(100)]
        public string? Country { get; set; } = "India";

        // Professional / Employment details
        [Required]
        [StringLength(100)]
        public string Qualification { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Designation { get; set; } = string.Empty;

        public int? DesignationId { get; set; }

        [ForeignKey(nameof(DesignationId))]
        public Designation? DesignationRef { get; set; }

        [Required]
        [StringLength(20)]
        public string StaffType { get; set; } = "Teaching"; // "Teaching" | "Non-Teaching"

        [NotMapped]
        public string FacultyType
        {
            get => StaffType;
            set => StaffType = value;
        }

        public int? DepartmentId { get; set; }

        [ForeignKey(nameof(DepartmentId))]
        public Department? DepartmentRef { get; set; }

        [NotMapped]
        public string Department { get; set; } = string.Empty;

        public int? CampusId { get; set; }

        [ForeignKey(nameof(CampusId))]
        public virtual Campus? Campus { get; set; }

        [NotMapped]
        public string? CampusName => Campus?.CampusName;

        public int? BoardId { get; set; }

        [ForeignKey(nameof(BoardId))]
        public virtual Board? BoardRef { get; set; }

        [NotMapped]
        public string? BoardName { get; set; }

        [NotMapped]
        public string? Board
        {
            get => BoardName;
            set => BoardName = value;
        }

        [Required]
        public DateTime JoiningDate { get; set; }

        [Required]
        public decimal Experience { get; set; } = 0.0m;

        [StringLength(50)]
        public string? EmploymentType { get; set; } = "Full Time"; // "Full Time", "Part Time", "Contract"

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? PhotoPath { get; set; }

        // Profile Completion Lifecycle Workflow
        [Required]
        [StringLength(50)]
        public string ProfileStatus { get; set; } = "PendingLink"; // "PendingLink", "LinkSent", "InProgress", "Submitted", "NeedsCorrection", "Completed"

        public int ProfileCompletionPercentage { get; set; } = 30;

        [StringLength(100)]
        public string? ProfileLinkToken { get; set; }

        public DateTime? ProfileLinkSentAt { get; set; }

        public DateTime? ProfileLinkExpiresAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public DateTime? CorrectionRequestedAt { get; set; }

        [StringLength(1000)]
        public string? CorrectionNotes { get; set; }

        // JSON Columns for complex profile sections
        public string? EducationJson { get; set; }
        public string? ExperienceJson { get; set; }
        public string? DocumentsJson { get; set; }
        public string? BankDetailsJson { get; set; }
        public string? EmergencyContactJson { get; set; }
        public string? DepartmentSpecificJson { get; set; }

        [NotMapped]
        public string? CustomFieldsJson
        {
            get => DepartmentSpecificJson;
            set => DepartmentSpecificJson = value;
        }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; } = false;

        public ICollection<StaffSubjectAllocation> StaffSubjectAllocations { get; set; } = new List<StaffSubjectAllocation>();
    }
}
