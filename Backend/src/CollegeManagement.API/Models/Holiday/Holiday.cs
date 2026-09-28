using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Holiday
{
    [Table("Holidays")]
    public class Holiday
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(20)]
        public string HolidayCode { get; set; } = string.Empty;

        public int? CampusId { get; set; } = 1;

        public int? AcademicYearId { get; set; }

        public int? BoardId { get; set; }

        [Required]
        [MaxLength(150)]
        public string HolidayName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string HolidayType { get; set; } = "Festival Holiday";

        [Required]
        [MaxLength(50)]
        public string AppliesTo { get; set; } = "All Students & Staff";

        [Required]
        [MaxLength(20)]
        public string DateType { get; set; } = "Single Day";

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active";

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsDeleted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
