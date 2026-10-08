
using System;
using System.ComponentModel.DataAnnotations;
namespace CollegeManagement.API.DTOs.Promotions {
    public class CreateCampusTransferRequestDto {
        [Required] public int StudentId { get; set; }
        [Required] public int ToCampusId { get; set; }
        [Required] public DateTime EffectiveDate { get; set; }
        [Required] public string TransferReason { get; set; } = string.Empty;
        public string? Remarks { get; set; }
    }
}