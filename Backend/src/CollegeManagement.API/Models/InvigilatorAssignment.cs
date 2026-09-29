using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("InvigilatorAssignments")]
    public class InvigilatorAssignment
    {
        [Key]
        [Column("InvigilatorAssignmentId")]
        public int InvigilatorAssignmentId { get; set; }

        [NotMapped]
        public int Id
        {
            get => InvigilatorAssignmentId;
            set => InvigilatorAssignmentId = value;
        }

        public int ExamScheduleId { get; set; }

        [Column("InvigilatorId")]
        public int InvigilatorId { get; set; }

        [NotMapped]
        public int StaffId
        {
            get => InvigilatorId;
            set => InvigilatorId = value;
        }

        public string HallNumber { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(ExamScheduleId))]
        public ExamSchedule? ExamSchedule { get; set; }

        [ForeignKey(nameof(InvigilatorId))]
        public CollegeManagement.API.Models.Staff.Staff? InvigilatorStaff { get; set; }

        [NotMapped]
        public CollegeManagement.API.Models.Staff.Staff? Invigilator
        {
            get => InvigilatorStaff;
            set => InvigilatorStaff = value;
        }

        [NotMapped]
        private string? _invigilatorName;

        [NotMapped]
        public string InvigilatorName
        {
            get => !string.IsNullOrWhiteSpace(_invigilatorName) 
                ? _invigilatorName 
                : (InvigilatorStaff != null ? $"{InvigilatorStaff.FirstName} {InvigilatorStaff.LastName}".Trim() : string.Empty);
            set => _invigilatorName = value;
        }

        [NotMapped]
        public string? InvigilatorEmail { get; set; }
    }
}