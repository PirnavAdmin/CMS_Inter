using System;
using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance
{
    public class CreateTimingConfigRequest
    {
        [Required(ErrorMessage = "Config name is required.")]
        [MaxLength(100)]
        public string ConfigName { get; set; } = string.Empty;

        public StaffType? StaffType { get; set; }

        public int? DepartmentId { get; set; }

        [Required(ErrorMessage = "Work start time is required.")]
        public string WorkStartTime { get; set; } = "09:00";

        [Required(ErrorMessage = "Work end time is required.")]
        public string WorkEndTime { get; set; } = "17:00";

        [Required(ErrorMessage = "Late threshold is required.")]
        public string LateThreshold { get; set; } = "09:15";

        [Required(ErrorMessage = "Early checkout threshold is required.")]
        public string EarlyCheckoutThreshold { get; set; } = "16:30";

        [Range(0, 120)]
        public int GracePeriodMinutes { get; set; } = 5;

        [Range(1, 24)]
        public decimal MinWorkingHours { get; set; } = 7.0m;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdateTimingConfigRequest : CreateTimingConfigRequest
    {
    }

    public class TimingConfigResponse
    {
        public int Id { get; set; }
        public string ConfigName { get; set; } = string.Empty;
        public StaffType? StaffType { get; set; }
        public string? StaffTypeName => StaffType?.ToString();
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string WorkStartTime { get; set; } = "09:00";
        public string WorkEndTime { get; set; } = "17:00";
        public string LateThreshold { get; set; } = "09:15";
        public string EarlyCheckoutThreshold { get; set; } = "16:30";
        public int GracePeriodMinutes { get; set; } = 5;
        public decimal MinWorkingHours { get; set; } = 7.0m;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
