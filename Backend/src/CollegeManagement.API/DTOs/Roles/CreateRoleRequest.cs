using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Roles
{
    public class CreateRoleRequest
    {
        [Required]
        [StringLength(50)]
        public string RoleName { get; set; } = string.Empty;

        [StringLength(255)]
        public string? Description { get; set; }

        public int? DepartmentId { get; set; }

        public int? DesignationId { get; set; }

        [StringLength(100)]
        public string? NewDepartmentName { get; set; }

        [StringLength(100)]
        public string? NewDesignationName { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Both";
    }
}
