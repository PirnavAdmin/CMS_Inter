using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Models.Transport
{
    [Table("DriverPreferences")]
    public class DriverPreference
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public Staff.Staff Staff { get; set; } = null!;

        public bool EmailAttendanceAlerts { get; set; } = true;
        
        public bool SmsUrgentAlerts { get; set; } = false;
        
        public bool TripReminders { get; set; } = true;
        
        public int AutoLogoutMinutes { get; set; } = 30;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
