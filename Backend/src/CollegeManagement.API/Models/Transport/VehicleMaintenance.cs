using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("transport_vehicle_maintenances")]
    public class VehicleMaintenance
    {
        [Key]
        [Column("maintenance_id")]
        public long MaintenanceId { get; set; }

        [Column("vehicle_id")]
        public long VehicleId { get; set; }

        [Column("service_type")]
        public string ServiceType { get; set; } = string.Empty;

        [Column("service_date")]
        public DateTime ServiceDate { get; set; }

        [Column("cost")]
        public decimal Cost { get; set; }

        [Column("vendor_center")]
        public string? VendorCenter { get; set; }

        [Column("next_service_due")]
        public DateTime? NextServiceDue { get; set; }

        [Column("remarks")]
        public string? Remarks { get; set; }

        [Column("status")]
        public bool Status { get; set; } = true;

        [Column("is_deleted")]
        public bool IsDeleted { get; set; }

        [Column("created_by")]
        public long? CreatedBy { get; set; }

        [Column("updated_by")]
        public long? UpdatedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        public TransportVehicle Vehicle { get; set; } = null!;
    }
}
