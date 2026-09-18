using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("transport_vehicle_maintenances")]
    public class VehicleMaintenance
    {
        [Key]
        
        public long MaintenanceId { get; set; }

        
        public long VehicleId { get; set; }

        
        public string ServiceType { get; set; } = string.Empty;

        
        public DateTime ServiceDate { get; set; }

        
        public decimal Cost { get; set; }

        
        public string? VendorCenter { get; set; }

        
        public DateTime? NextServiceDue { get; set; }

        
        public string? Remarks { get; set; }

        
        public bool Status { get; set; } = true;

        
        public bool IsDeleted { get; set; }

        
        public long? CreatedBy { get; set; }

        
        public long? UpdatedBy { get; set; }

        
        public DateTime CreatedAt { get; set; }

        
        public DateTime? UpdatedAt { get; set; }

        public TransportVehicle Vehicle { get; set; } = null!;
    }
}
