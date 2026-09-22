using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("admins")]
    public class Admin
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(255)]
        [Column("Email")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        [Column("Password")]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Column("IsActive")]
        public bool IsActive { get; set; } = true;
    }
}
