using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("NumberSeries")]
    public class NumberSeries
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string SeriesCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Slug { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string SeriesName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Prefix { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string FormatPattern { get; set; } = string.Empty;

        public int NumberLength { get; set; } = 4;

        public int StartNumber { get; set; } = 1;

        public int CurrentSequence { get; set; } = 1;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
