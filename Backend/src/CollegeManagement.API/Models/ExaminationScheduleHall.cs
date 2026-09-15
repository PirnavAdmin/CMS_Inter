using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("ExaminationScheduleHalls")]
    public class ExaminationScheduleHall
    {
        [Key]
        [Column("ScheduleHallId")]
        public int ScheduleHallId { get; set; }

        [Required]
        [Column("ScheduleId")]
        public int ScheduleId { get; set; }

        [Required]
        public int HallId { get; set; }

        public int CandidateCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public virtual ExamSchedule? ExamSchedule { get; set; }
        public virtual ICollection<ScheduleInvigilator> Invigilators { get; set; } = new List<ScheduleInvigilator>();
    }
}
