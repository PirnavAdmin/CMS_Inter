using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("ScheduleInvigilators")]
    public class ScheduleInvigilator
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("ScheduleHallId")]
        public int ScheduleHallId { get; set; }

        [Required]
        [Column("FacultyId")]
        public int FacultyId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Property
        public virtual ExaminationScheduleHall? ScheduleHall { get; set; }
    }
}
