using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Configuration for staff work schedules, late arrival thresholds, and early checkout rules.
    /// </summary>
    [Table("AttendanceTimingConfigs")]
    public class AttendanceTimingConfig
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string ConfigName { get; set; } = string.Empty;

        /// <summary>
        /// Applies to specific StaffType (1 = Teaching, 2 = Non-Teaching), or null for All Staff.
        /// </summary>
        public StaffType? StaffType { get; set; }

        /// <summary>
        /// Applies to a specific Department, or null for all departments.
        /// </summary>
        public int? DepartmentId { get; set; }

        /// <summary>
        /// Expected daily shift start time (e.g., 09:00:00).
        /// </summary>
        [Required]
        public TimeSpan WorkStartTime { get; set; } = new TimeSpan(9, 0, 0);

        /// <summary>
        /// Expected daily shift end time (e.g., 17:00:00).
        /// </summary>
        [Required]
        public TimeSpan WorkEndTime { get; set; } = new TimeSpan(17, 0, 0);

        /// <summary>
        /// Check-in after this time is considered Late (e.g., 09:15:00).
        /// </summary>
        [Required]
        public TimeSpan LateThreshold { get; set; } = new TimeSpan(9, 15, 0);

        /// <summary>
        /// Check-out before this time is considered Early Checkout (e.g., 16:30:00).
        /// </summary>
        [Required]
        public TimeSpan EarlyCheckoutThreshold { get; set; } = new TimeSpan(16, 30, 0);

        /// <summary>
        /// Additional grace period in minutes before marking as Late (e.g., 5).
        /// </summary>
        public int GracePeriodMinutes { get; set; } = 5;

        /// <summary>
        /// Minimum working hours required for a full day presence (e.g., 7.0).
        /// </summary>
        public decimal MinWorkingHours { get; set; } = 7.0m;

        public bool IsActive { get; set; } = true;

        [MaxLength(500)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
