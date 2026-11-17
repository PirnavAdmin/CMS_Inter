using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("UserPreferences")]
    public class UserPreference
    {
        [Key]
        [ForeignKey(nameof(User))]
        public int UserId { get; set; }

        [Required]
        [MaxLength(20)]
        public string ThemeMode { get; set; } = "light";

        [Required]
        [MaxLength(50)]
        public string Palette { get; set; } = "purple";

        [MaxLength(20)]
        public string? CustomColor { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual User? User { get; set; }
    }
}
