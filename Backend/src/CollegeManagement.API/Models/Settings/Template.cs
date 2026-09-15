using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Settings
{
    [Table("templates")]
    public class Template
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("TemplateCode")]
        public string TemplateCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        [Column("Title")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("Category")]
        public string Category { get; set; } = "Certificate";

        [Required]
        [Column("ContentBody")]
        public string ContentBody { get; set; } = string.Empty;

        [Required]
        [Column("PlaceholdersJson")]
        public string PlaceholdersJson { get; set; } = "[]";

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("Version")]
        public int Version { get; set; } = 1;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
