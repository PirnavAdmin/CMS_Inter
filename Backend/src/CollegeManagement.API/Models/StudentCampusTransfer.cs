
using System;
namespace CollegeManagement.API.Models {
    public class StudentCampusTransfer {
        public int TransferId { get; set; }
        public int StudentId { get; set; }
        public int FromCampusId { get; set; }
        public int ToCampusId { get; set; }
        public int RequestedById { get; set; }
        public DateTime RequestDate { get; set; }
        public DateTime EffectiveDate { get; set; }
        public string TransferReason { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public string Status { get; set; } = "Pending";
        public int? ActionedById { get; set; }
        public DateTime? ActionDate { get; set; }
        public string? ActionRemarks { get; set; }
    }
}