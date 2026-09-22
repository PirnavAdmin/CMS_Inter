using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("ExamCodeSequences")]
    public class ExamCodeSequence
    {
        [Key]
        [Column("AcademicYear")]
        [MaxLength(20)]
        public string AcademicYear { get; set; } = string.Empty;

        [Required]
        public int LastSequence { get; set; } = 0;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
