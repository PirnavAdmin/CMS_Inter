using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs
{
    public class FineRuleDto
    {
        public int FineRuleId { get; set; }
        public string FineRuleName { get; set; } = string.Empty;
        public int ApplicableFeeId { get; set; }
        public string ApplicableFeeName { get; set; } = string.Empty;
        public string FineType { get; set; } = string.Empty;
        public decimal FineAmount { get; set; }
        public int GracePeriod { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CreateFineRuleRequest
    {
        [Required]
        [MaxLength(150)]
        public string FineRuleName { get; set; } = string.Empty;

        [Required]
        public int ApplicableFeeId { get; set; }

        [Required]
        [MaxLength(50)]
        public string FineType { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal FineAmount { get; set; }

        [Required]
        [Range(0, int.MaxValue)]
        public int GracePeriod { get; set; } = 0;

        [Required]
        public string Status { get; set; } = "Active";
    }

    public class UpdateFineRuleRequest : CreateFineRuleRequest
    {
    }
}
