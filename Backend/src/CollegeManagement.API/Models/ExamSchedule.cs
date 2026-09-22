using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("ExamSchedules")]
    public class ExamSchedule
    {
        [Key]
        [Column("ScheduleId")]
        public int ExamScheduleId { get; set; }

        [NotMapped]
        public int ScheduleId
        {
            get => ExamScheduleId;
            set => ExamScheduleId = value;
        }

        [Required]
        [Column("ExamId")]
        public int ExaminationId { get; set; }

        [NotMapped]
        public int ExamId
        {
            get => ExaminationId;
            set => ExaminationId = value;
        }

        [Required]
        public int SubjectId { get; set; }

        [Required]
        public DateOnly ExamDate { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        [NotMapped]
        public TimeOnly ExamTime
        {
            get => StartTime;
            set => StartTime = value;
        }

        [StringLength(100)]
        public string? SessionId { get; set; }

        [StringLength(50)]
        public string ScheduleMode { get; set; } = "SUBJECT_WISE";

        public int? RoomId { get; set; }

        public int? InvigilatorId { get; set; }

        [StringLength(100)]
        public string Hall { get; set; } = string.Empty;

        [StringLength(150)]
        public string Invigilator { get; set; } = string.Empty;

        [StringLength(50)]
        public string ExamMode { get; set; } = "Written";

        public decimal MaxMarks { get; set; } = 100.00m;

        public decimal PassingMarks { get; set; } = 35.00m;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        public Examination? Examination { get; set; }
        public Subject? Subject { get; set; }
    }
}