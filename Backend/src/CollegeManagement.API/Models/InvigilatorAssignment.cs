using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("InvigilatorAssignments")]
    public class InvigilatorAssignment
    {
        [Key]
        [Column("Id")]
        public int InvigilatorAssignmentId { get; set; }

        [NotMapped]
        public int Id
        {
            get => InvigilatorAssignmentId;
            set => InvigilatorAssignmentId = value;
        }

        public int ExamScheduleId { get; set; }
        public int InvigilatorId { get; set; }
        public string HallNumber { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

        public ExamSchedule? ExamSchedule { get; set; }
        public CollegeManagement.API.Models.User? Invigilator { get; set; }
    }
}