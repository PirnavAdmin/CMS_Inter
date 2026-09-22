using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    public class AcademicYear
    {
        [Key]
        public int AcademicYearId { get; set; }

        [Required]
        [StringLength(50)]
        public string AcademicYearName { get; set; } = string.Empty;

        public int? BoardId { get; set; }

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        public DateOnly EndDate { get; set; }

        public DateOnly? AdmissionStartDate { get; set; }

        public DateOnly? AdmissionEndDate { get; set; }

        [Required]
        public bool IsActive { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [ForeignKey(nameof(BoardId))]
        public virtual Board? Board { get; set; }
    }
}
