using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a detailed audit history record for attendance modifications.
    /// Tracks who changed what, when, with old and new values for queryability.
    /// Separate from the generic AuditLogs table for attendance-specific reporting.
    /// </summary>
    [Table("AttendanceAuditHistory")]
    public class AttendanceAuditHistory
    {
        /// <summary>
        /// Gets or sets the unique identifier of the audit record.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long AuditId { get; set; }

        /// <summary>
        /// Gets or sets the entity type being audited.
        /// Expected values: "StudentAttendance", "StaffAttendance".
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string EntityType { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the ID of the entity being audited (AttendanceId or StaffAttendanceId).
        /// </summary>
        [Required]
        public int EntityId { get; set; }

        /// <summary>
        /// Gets or sets the student identifier, populated for student attendance changes.
        /// </summary>
        public int? StudentId { get; set; }

        /// <summary>
        /// Gets or sets the faculty/staff identifier, populated for staff attendance changes.
        /// </summary>
        public int? FacultyId { get; set; }

        /// <summary>
        /// Gets or sets the attendance date that was modified.
        /// </summary>
        [Required]
        public DateTime AttendanceDate { get; set; }

        /// <summary>
        /// Gets or sets the previous attendance status value. Null for newly created records.
        /// </summary>
        public byte? OldStatus { get; set; }

        /// <summary>
        /// Gets or sets the new attendance status value.
        /// </summary>
        public byte? NewStatus { get; set; }

        /// <summary>
        /// Gets or sets the session (Morning/Afternoon) for student attendance.
        /// </summary>
        public CollegeManagement.API.Enums.StudentAttendanceSession? Session { get; set; }

        /// <summary>
        /// Gets or sets the type of action performed.
        /// Expected values: "Create", "Update", "Delete", "StatusChange", "Lock", "Unlock".
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a human-readable description of the change.
        /// </summary>
        [MaxLength(1000)]
        public string? Description { get; set; }

        /// <summary>
        /// Gets or sets the User ID of who made the change.
        /// </summary>
        public int? ModifiedByUserId { get; set; }

        /// <summary>
        /// Gets or sets the display name of the user who made the change.
        /// Denormalized for quick display without joins.
        /// </summary>
        [MaxLength(150)]
        public string? ModifiedByUserName { get; set; }

        /// <summary>
        /// Gets or sets the client IP address from which the change was made.
        /// </summary>
        [MaxLength(45)]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Gets or sets the timestamp when this audit record was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        #region Navigation Properties

        /// <summary>
        /// Gets or sets the user who performed the modification.
        /// </summary>
        [ForeignKey(nameof(ModifiedByUserId))]
        public virtual User? ModifiedByUser { get; set; }

        #endregion
    }
}
