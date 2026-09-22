using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Timetable
{
    [Table("Periods")]
    public class Period
    {
        [Key]
        public int PeriodId { get; set; }

        [NotMapped]
        public int? PeriodStructureId { get; set; }

        [Required]
        [MaxLength(50)]
        public string PeriodName { get; set; } = string.Empty;

        [Required]
        public TimeSpan StartTime { get; set; }

        [Required]
        public TimeSpan EndTime { get; set; }

        public int DisplayOrder { get; set; } = 1;

        public bool IsBreak { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation
        [NotMapped]
        public virtual PeriodStructure? PeriodStructure { get; set; }
    }
}