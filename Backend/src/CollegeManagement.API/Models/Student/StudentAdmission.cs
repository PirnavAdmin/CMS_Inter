using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    public class StudentAdmission
    {
        [Key]
        public int AdmissionId { get; set; }

        // Admission Details
        [MaxLength(50)]
        public string? AdmissionNo { get; set; }

        public DateTime AdmissionDate { get; set; }

        // Student Details
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? LastName { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        // Student Photo
        [MaxLength(500)]
        public string? StudentPhoto { get; set; }

        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        [MaxLength(100)]
        public string? Nationality { get; set; }

        [MaxLength(100)]
        public string? Religion { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        // Parent Details - NOT mandatory
        [MaxLength(150)]
        public string? FatherName { get; set; }

        [MaxLength(100)]
        public string? FatherOccupation { get; set; }

        [MaxLength(15)]
        public string? FatherMobile { get; set; }

        [MaxLength(150)]
        public string? FatherEmail { get; set; }

        [MaxLength(150)]
        public string? MotherName { get; set; }

        [MaxLength(100)]
        public string? MotherOccupation { get; set; }

        [MaxLength(15)]
        public string? MotherMobile { get; set; }

        [MaxLength(150)]
        public string? MotherEmail { get; set; }

        [MaxLength(150)]
        public string? GuardianName { get; set; }

        [MaxLength(15)]
        public string? GuardianMobile { get; set; }

        [MaxLength(150)]
        public string? GuardianEmail { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? AnnualIncome { get; set; }
        // Address
        [MaxLength(100)]
        public string? HouseDoorNumber { get; set; }

        [MaxLength(200)]
        public string? StreetVillage { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }  // Frontend label: Mandal / Town

        [MaxLength(100)]
        public string? District { get; set; }

        [MaxLength(100)]
        public string? State { get; set; }

        [MaxLength(10)]
        public string? Pincode { get; set; }

        // Academic Relations
        public int BoardId { get; set; }

        public int AcademicYearId { get; set; }

        public int AcademicLevelId { get; set; }

        public int GroupId { get; set; }

        // Program is selected based on Group
        public int? ProgramId { get; set; }

        // Section is allocated AFTER approval
        [NotMapped]
        public int? SectionId { get; set; }

        // Roll Number is allocated in bulk AFTER section allocation
        [NotMapped]
        [MaxLength(30)]
        public string? RollNo { get; set; }

        // Previous Education
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }

        [MaxLength(100)]
        public string? PreviousBoard { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal? PreviousPercentage { get; set; }

        public int? PreviousYearOfPassing { get; set; }

       
        // Second Language
        [MaxLength(100)]
        public string? SecondLanguage { get; set; }

        // Admission
        [MaxLength(50)]
        public string? AdmissionType { get; set; }

        [MaxLength(50)]
        public string? Medium { get; set; }
        // ADD THIS
        public int? FeeStructureId { get; set; }
        public string? PaymentPlan { get; set; }
        [MaxLength(50)]
        public string? ScholarshipStatus { get; set; }

        // Status
        [MaxLength(30)]
        public string Status { get; set; } = "Pending";

        public bool IsVerified { get; set; }

        public bool IsApproved { get; set; }

        public bool IsRejected { get; set; }

        public bool IsActive { get; set; } = true;

        [MaxLength(1000)]
        public string? Remarks { get; set; }

        // Audit
        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Residential & Transport Allocation
        [MaxLength(30)]
        public string? StudentType { get; set; }

        public bool? TransportRequired { get; set; }

        [MaxLength(20)]
        public string? BusType { get; set; }

        public int? RouteId { get; set; }

        [MaxLength(100)]
        public string? BusRoute { get; set; }

        public int? PickupPointId { get; set; }

        [MaxLength(100)]
        public string? PickupPoint { get; set; }

        public int? HostelId { get; set; }

        [MaxLength(50)]
        public string? HostelBlock { get; set; }

        public int? RoomId { get; set; }

        [MaxLength(50)]
        public string? HostelRoom { get; set; }

        public int? BedId { get; set; }

        [MaxLength(50)]
        public string? HostelBed { get; set; }

        [MaxLength(50)]
        public string? HallTicketNumber { get; set; }
    }
}