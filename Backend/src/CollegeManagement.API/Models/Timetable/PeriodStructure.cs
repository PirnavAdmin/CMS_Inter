using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Timetable
{
    [Table("PeriodStructures")]
    public class PeriodStructure
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public TimeSpan DayStartTime { get; set; }

        [Required]
        public int PeriodDurationMinutes { get; set; }

        [Required]
        public int TotalTeachingPeriods { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public virtual ICollection<PeriodStructureItem> Items { get; set; } = new List<PeriodStructureItem>();
        public virtual ICollection<PeriodStructureAssignment> Assignments { get; set; } = new List<PeriodStructureAssignment>();
        [NotMapped]
        public virtual ICollection<Period> Periods { get; set; } = new List<Period>();
    }
}