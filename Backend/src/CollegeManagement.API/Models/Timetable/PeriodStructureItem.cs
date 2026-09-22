using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Timetable
{
    [Table("PeriodStructureItems")]
    public class PeriodStructureItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PeriodStructureId { get; set; }

        [Required]
        public int SequenceOrder { get; set; }

        [Required]
        [MaxLength(30)]
        public string ItemType { get; set; } = "TeachingPeriod"; // "TeachingPeriod" or "Break"

        public int? PeriodNumber { get; set; }

        public int? BreakTypeId { get; set; }

        [Required]
        public int DurationMinutes { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // Navigation
        [ForeignKey(nameof(PeriodStructureId))]
        public virtual PeriodStructure? PeriodStructure { get; set; }

        [ForeignKey(nameof(BreakTypeId))]
        public virtual BreakType? BreakType { get; set; }
    }
}