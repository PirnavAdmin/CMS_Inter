namespace CollegeManagement.API.Models;

using System;
using System.ComponentModel.DataAnnotations;

public class TransportDriver
{
    [Key]
    public long DriverId { get; set; }

    public string? DriverName { get; set; }

    public string? EmployeeId { get; set; } = "DRV-1";

    public string? LicenceNumber { get; set; }

    public DateTime? LicenceExpiry { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string? LicenseNumber
    {
        get => LicenceNumber;
        set => LicenceNumber = value;
    }

    public string? MobileNumber { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string? Phone
    {
        get => MobileNumber;
        set => MobileNumber = value;
    }

    public string? AlternateMobileNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? BloodGroup { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactNumber { get; set; }

    public bool Status { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public long? CreatedBy { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public long? AssignedVehicleId { get; set; }
    public TransportVehicle? AssignedVehicle { get; set; }

    public int? UserId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.ForeignKey("UserId")]
    public virtual User? User { get; set; }
}
