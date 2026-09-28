using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Transport
{
    public class TransportGpsTelemetry
    {
        [Key]
        public int Id { get; set; }

        public long? DriverId { get; set; }
        public long? VehicleId { get; set; }
        public long? TripId { get; set; }

        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public decimal? Speed { get; set; }
        public decimal? Heading { get; set; }
        public decimal? Accuracy { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [ForeignKey("DriverId")]
        public virtual TransportDriver? Driver { get; set; }

        [ForeignKey("VehicleId")]
        public virtual TransportVehicle? Vehicle { get; set; }

        [ForeignKey("TripId")]
        public virtual TransportTrip? Trip { get; set; }
    }
}
