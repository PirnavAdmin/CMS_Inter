using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Hostel
{
    public class HostelFeeConfig
    {
        [Key]
        public int FeeConfigId { get; set; }

        [Required]
        public int HostelId { get; set; }

        [Required]
        public int RoomTypeId { get; set; }

        [Required]
        [MaxLength(50)]
        public string FeeFrequency { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal HostelFeeAmount { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal SecurityDeposit { get; set; } = 0;

        [Required]
        public DateTime EffectiveDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("HostelId")]
        public virtual HostelBlock? HostelBlock { get; set; }

        [ForeignKey("RoomTypeId")]
        public virtual RoomTypeConfig? RoomTypeConfig { get; set; }
    }
}
