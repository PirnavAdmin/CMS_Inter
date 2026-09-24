using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Roles
{
    public class UpdateRoleRequest
    {
        [Required]
        [StringLength(50)]
        public string RoleName { get; set; } = string.Empty;

        [StringLength(255)]
        public string? Description { get; set; }

        public bool? IsActive { get; set; }
    }
}
