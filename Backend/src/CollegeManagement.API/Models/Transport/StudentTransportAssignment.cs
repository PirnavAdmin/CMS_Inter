using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    public class StudentTransportAssignment
    {
        [Key]
        public long StudentTransportAssignmentId { get; set; }

        public long? StudentId { get; set; }

        [MaxLength(50)]
        public string? AdmissionNo { get; set; }

        public long? RouteId { get; set; }

        public long? PickupPointId { get; set; }

        public long? VehicleAssignmentId { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        [MaxLength(20)]
        public string? TransportType { get; set; } = "Both";

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

        public TransportRoute? Route { get; set; }

        public PickupPoint? PickupPoint { get; set; }

        public TransportVehicleAssignment? VehicleAssignment { get; set; }
    }
}
