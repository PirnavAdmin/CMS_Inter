using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Transport
{
    [Table("TransportDriverNotifications")]
    public class DriverNotification
    {
        [Key]
        public long NotificationId { get; set; }

        public int StaffId { get; set; }
        public int? CampusId { get; set; }
        public int? PayslipId { get; set; }
        public int? PayrollMonth { get; set; }
        public int? PayrollYear { get; set; }

        [Required]
        [MaxLength(100)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        public long? AssignmentId { get; set; }

        public DateTime CreatedTime { get; set; } = DateTime.UtcNow;

        public DateTime? ReadTime { get; set; }

        public bool IsDelivered { get; set; } = false;

        [MaxLength(255)]
        public string? EventKey { get; set; }
    }
}
