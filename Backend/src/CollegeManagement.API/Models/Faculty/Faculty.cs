using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Faculty
{
    [Table("Faculties")]
    public class Faculty
    {
        [Key]
        public int Id { get; set; }

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

        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required]
        [StringLength(12)]
        public string Aadhaar { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        public string Mobile { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [StringLength(10)]
        public string? BloodGroup { get; set; }

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
        public string FacultyType { get; set; } = "Teaching";

        public int? DepartmentId { get; set; }

        [NotMapped]
        public string Department { get; set; } = string.Empty;

        [Required]
        public DateTime JoiningDate { get; set; }

        [Required]
        public decimal Experience { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? PhotoPath { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; } = false;

        // Navigation property for subject allocations
        public ICollection<FacultySubjectAllocation> FacultySubjectAllocations { get; set; } = new List<FacultySubjectAllocation>();
    }
}
