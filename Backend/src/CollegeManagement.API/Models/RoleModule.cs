using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("RoleModules")]
    public class RoleModule
    {
        [Key]
        public int RoleModuleId { get; set; }

        [Required]
        public int RoleId { get; set; }

        [ForeignKey(nameof(RoleId))]
        public Role Role { get; set; } = null!;

        [Required]
        [StringLength(100)]
        public string ModuleKey { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string SubModule { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
