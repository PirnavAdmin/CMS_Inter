using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Transport
{
    public class TransportStudentAttendance
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required]
        public long TripId { get; set; }

        public long? RouteId { get; set; }
        public long? DriverId { get; set; }
        public long? PickupPointId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, PickedUp, Dropped, Missed

        public DateTime EventTime { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("StudentId")]
        public virtual CollegeManagement.API.Models.Student? Student { get; set; }

        [ForeignKey("TripId")]
        public virtual TransportTrip? Trip { get; set; }

        [ForeignKey("RouteId")]
        public virtual TransportRoute? Route { get; set; }

        [ForeignKey("DriverId")]
        public virtual TransportDriver? Driver { get; set; }

        [ForeignKey("PickupPointId")]
        public virtual PickupPoint? PickupPoint { get; set; }
    }
}
