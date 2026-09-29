using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class HostelFeeConfigDto
    {
        public int FeeConfigId { get; set; }
        public int HostelId { get; set; }
        public string HostelName { get; set; } = string.Empty;
        public int RoomTypeId { get; set; }
        public string RoomTypeName { get; set; } = string.Empty;
        public string FeeFrequency { get; set; } = string.Empty;
        public decimal HostelFeeAmount { get; set; }
        public decimal SecurityDeposit { get; set; }
        public decimal TotalFee { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CreateHostelFeeConfigRequest
    {
        [Required]
        public int HostelId { get; set; }

        [Required]
        public int RoomTypeId { get; set; }

        [Required]
        public string FeeFrequency { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal HostelFeeAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal SecurityDeposit { get; set; } = 0;

        [Required]
        public DateTime EffectiveDate { get; set; }

        [Required]
        public string Status { get; set; } = "Active";
    }

    public class UpdateHostelFeeConfigRequest : CreateHostelFeeConfigRequest
    {
    }
}
