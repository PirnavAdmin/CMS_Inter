using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Roles
{
    public class CreateRoleRequest
    {
        [Required]
        [StringLength(50)]
        public string RoleName { get; set; } = string.Empty;
    }
}
