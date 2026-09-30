
using System;
namespace CollegeManagement.API.DTOs.Promotions {
    public class CampusTransferResponseDto {
        public int TransferId { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public int FromCampusId { get; set; }
        public string FromCampusName { get; set; } = string.Empty;
        public int ToCampusId { get; set; }
        public string ToCampusName { get; set; } = string.Empty;
        public int RequestedById { get; set; }
        public string RequestedByName { get; set; } = string.Empty;
        public string RequestedByRole { get; set; } = string.Empty;
        public DateTime RequestDate { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string TransferReason { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? ActionedById { get; set; }
        public string? ActionedByName { get; set; }
        public DateTime? ActionDate { get; set; }
        public string? ActionRemarks { get; set; }
    }
}