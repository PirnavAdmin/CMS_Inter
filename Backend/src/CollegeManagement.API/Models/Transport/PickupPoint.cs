using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    public class PickupPoint
    {
        [Key]
        public long PickupPointId { get; set; }

        [Required]
        public long RouteId { get; set; }

        [ForeignKey(nameof(RouteId))]
        public TransportRoute? TransportRoute { get; set; }

        [MaxLength(150)]
        public string? PickupPointName { get; set; }

        [MaxLength(250)]
        public string? Landmark { get; set; }

        public int SequenceNo { get; set; }

        public TimeSpan PickupTime { get; set; }
        public TimeSpan DropTime { get; set; } = new TimeSpan(16, 15, 0);

        [Column(TypeName = "decimal(10,2)")]
        public decimal DistanceFromStart { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal MonthlyFee { get; set; } = 1200;

        public bool Status { get; set; } = true;

        public bool IsDeleted { get; set; } = false;

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public long? CreatedBy { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public long? UpdatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
