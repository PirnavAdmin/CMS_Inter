using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Faculty
{
    [Table("FacultySubjectAllocations")]
    public class FacultySubjectAllocation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int FacultyId { get; set; }

        [Required]
        public int SubjectId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        [ForeignKey(nameof(FacultyId))]
        public Faculty Faculty { get; set; } = null!;

        [ForeignKey(nameof(SubjectId))]
        public Subject Subject { get; set; } = null!;
    }
}
