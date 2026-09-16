using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    public class TransportVehicleAssignment
    {
        [Key]
        public long AssignmentId { get; set; }

        public long RouteId { get; set; }

        public long VehicleId { get; set; }

        public long DriverId { get; set; }

        [NotMapped]
        public long? AttendantId { get; set; }

        [NotMapped]
        public string? BranchName { get; set; }

        [NotMapped]
        public string? AcademicYear { get; set; }

        [NotMapped]
        public string? MorningTripTime { get; set; }

        [NotMapped]
        public string? EveningTripTime { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public DateTime AssignmentDate
        {
            get => EffectiveFrom;
            set => EffectiveFrom = value;
        }

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        [MaxLength(20)]
        public string? Shift { get; set; }

        [MaxLength(255)]
        public string? Remarks { get; set; }

        public bool Status { get; set; } = true;

        public bool IsDeleted { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public long? CreatedBy { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public long? UpdatedBy { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public DateTime CreatedAt
        {
            get => EffectiveFrom;
            set => EffectiveFrom = value;
        }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public DateTime? UpdatedAt { get; set; }

        public TransportRoute Route { get; set; } = null!;

        public TransportVehicle Vehicle { get; set; } = null!;

        public TransportDriver Driver { get; set; } = null!;

        [NotMapped]
        public TransportAttendant? Attendant { get; set; }
    }
}
