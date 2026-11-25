using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("StudyMaterials")]
    public class StudyMaterial
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StudyMaterialId { get; set; }

        public int CollegeId { get; set; } = 1;
        public int CampusId { get; set; } = 1;

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Faculty { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;

        public int? GroupId { get; set; }
        public string? Description { get; set; }
        public int? UploadedByStaffId { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
