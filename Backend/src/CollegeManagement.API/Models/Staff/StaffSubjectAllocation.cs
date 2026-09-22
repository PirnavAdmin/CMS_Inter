using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Models.Staff
{
    [Table("StaffSubjectAllocations")]
    public class StaffSubjectAllocation
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("StaffId")]
        public int StaffId { get; set; }

        [NotMapped]
        public int? FacultyId
        {
            get => StaffId;
            set { if (value.HasValue) StaffId = value.Value; }
        }

        [Required]
        [Column("SubjectId")]
        public int SubjectId { get; set; }

        [NotMapped]
        public int? AcademicYearId { get; set; }

        [NotMapped]
        public int MaxWeeklyHours { get; set; } = 18;

        [NotMapped]
        public int? WeeklyHours
        {
            get => MaxWeeklyHours;
            set => MaxWeeklyHours = value ?? 18;
        }

        [NotMapped]
        public bool IsActive { get; set; } = true;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        [ForeignKey(nameof(StaffId))]
        public virtual Staff? Staff { get; set; }

        [ForeignKey(nameof(SubjectId))]
        public virtual Subject? Subject { get; set; }
    }
}