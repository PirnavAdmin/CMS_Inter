using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Students")]
    public class Student
    {
        // =========================================================
        // PRIMARY KEY
        // =========================================================

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StudentId { get; set; }


        // =========================================================
        // ADMISSION DETAILS
        // =========================================================

        public int? AdmissionId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AdmissionNo { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? RollNo { get; set; }

        [Required]
        public DateTime AdmissionDate { get; set; }

        [MaxLength(50)]
        public string? AdmissionType { get; set; }

        [MaxLength(50)]
        public string? AdmissionQuota { get; set; }

        [MaxLength(50)]
        public string? Medium { get; set; }

        [MaxLength(100)]
        public string? SecondLanguage { get; set; }


        // =========================================================
        // STUDENT BASIC DETAILS
        // =========================================================

        [Required]
        [MaxLength(150)]
        public string StudentName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Photo { get; set; }

        [Required]
        [MaxLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        [MaxLength(150)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? MobileNumber { get; set; }

        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(50)]
        public string? Religion { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }


        // =========================================================
        // ADDRESS
        // =========================================================

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? District { get; set; }

        [MaxLength(100)]
        public string? State { get; set; }

        [MaxLength(20)]
        public string? Pincode { get; set; }


        // =========================================================
        // ACADEMIC FOREIGN KEYS
        // =========================================================

        public int? BoardId { get; set; }

        [ForeignKey(nameof(BoardId))]
        public Board? BoardNavigation { get; set; }


        public int? AcademicYearId { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public AcademicYear? AcademicYear { get; set; }


        public int? AcademicLevelId { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public AcademicLevel? AcademicLevelNavigation { get; set; }


        public int? GroupId { get; set; }

        [ForeignKey(nameof(GroupId))]
        public Group? GroupNavigation { get; set; }


        public int? ProgramId { get; set; }

        [ForeignKey(nameof(ProgramId))]
        public AcademicProgram? ProgramNavigation { get; set; }


        // =========================================================
        // FEE CONFIGURATION REFERENCE
        // =========================================================

        public int? FeeStructureId { get; set; }

        [MaxLength(50)]
        public string? PaymentPlan { get; set; }


        // =========================================================
        // SECTION
        // =========================================================

        public int? SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public Section? SectionNavigation { get; set; }


        // =========================================================
        // PREVIOUS EDUCATION
        // =========================================================

        [MaxLength(200)]
        public string? PreviousSchool { get; set; }

        [MaxLength(100)]
        public string? PreviousHallTicketNumber { get; set; }

        [MaxLength(100)]
        public string? PreviousBoard { get; set; }

        public int? PreviousYearOfPassing { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? PreviousPercentage { get; set; }


        // =========================================================
        // STUDENT CATEGORY / SCHOLARSHIP
        // =========================================================

        [MaxLength(50)]
        public string? StudentCategory { get; set; }

        [MaxLength(50)]
        public string? ScholarshipStatus { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ScholarshipAmount { get; set; }


        // =========================================================
        // PARENT DETAILS
        // =========================================================

        [MaxLength(150)]
        public string? FatherName { get; set; }

        [MaxLength(100)]
        public string? FatherOccupation { get; set; }

        [MaxLength(20)]
        public string? FatherMobile { get; set; }

        [MaxLength(150)]
        public string? FatherEmail { get; set; }


        [MaxLength(150)]
        public string? MotherName { get; set; }

        [MaxLength(100)]
        public string? MotherOccupation { get; set; }

        [MaxLength(20)]
        public string? MotherMobile { get; set; }

        [MaxLength(150)]
        public string? MotherEmail { get; set; }


        [MaxLength(150)]
        public string? GuardianName { get; set; }

        [MaxLength(20)]
        public string? GuardianMobile { get; set; }

        [MaxLength(150)]
        public string? GuardianEmail { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? AnnualIncome { get; set; }


        // =========================================================
        // FEES (FINANCIAL SNAPSHOT)
        // =========================================================

        [Column(TypeName = "decimal(10,2)")]
        public decimal FeeAmount { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal FeePaid { get; set; }

        [MaxLength(30)]
        public string? FeeStatus { get; set; }


        // =========================================================
        // ATTENDANCE / PERFORMANCE
        // =========================================================

        [Column(TypeName = "decimal(5,2)")]
        public decimal AttendancePercentage { get; set; }

        [MaxLength(20)]
        public string? PerformanceGrade { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? CGPA { get; set; }

        public int? Rank { get; set; }


        // =========================================================
        // DOCUMENT CERTIFICATES
        // =========================================================

        [MaxLength(500)]
        public string? BirthCertificate { get; set; }

        [MaxLength(500)]
        public string? TransferCertificate { get; set; }

        [MaxLength(500)]
        public string? StudyCertificate { get; set; }

        [MaxLength(500)]
        public string? AadhaarDocument { get; set; }

        [MaxLength(500)]
        public string? CommunityCertificate { get; set; }

        [MaxLength(500)]
        public string? IncomeCertificate { get; set; }

        [MaxLength(500)]
        public string? CasteCertificate { get; set; }

        [MaxLength(500)]
        public string? TenthCertificate { get; set; }

        [MaxLength(500)]
        public string? MarksMemo { get; set; }


        // =========================================================
        // REMARKS
        // =========================================================

        [MaxLength(1000)]
        public string? Remarks { get; set; }


        // =========================================================
        // STUDENT LOGIN
        // =========================================================

        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        public bool IsFirstLogin { get; set; } = true;

        public DateTime? LastLogin { get; set; }


        // =========================================================
        // STATUS
        // =========================================================

        [MaxLength(30)]
        public string Status { get; set; } = "Active";

        public bool IsActive { get; set; } = true;


        // =========================================================
        // AUDIT
        // =========================================================

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
