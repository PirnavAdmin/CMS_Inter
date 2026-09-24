using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Fee;

namespace CollegeManagement.API.Models
{
    public class FineRule
    {
        [Key]
        public int FineRuleId { get; set; }

        [Required]
        [MaxLength(150)]
        public string FineRuleName { get; set; } = string.Empty;

        [Required]
        public int ApplicableFeeId { get; set; }

        [Required]
        [MaxLength(50)]
        public string FineType { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal FineAmount { get; set; }

        [Required]
        public int GracePeriod { get; set; } = 0;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ApplicableFeeId")]
        public virtual FeeType? ApplicableFee { get; set; }
    }
}
