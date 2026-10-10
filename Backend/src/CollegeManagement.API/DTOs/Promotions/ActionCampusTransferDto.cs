
namespace CollegeManagement.API.DTOs.Promotions {
    public class ActionCampusTransferDto {
        public string? ActionRemarks { get; set; }
        public int? DestinationFeeStructureId { get; set; }
        public bool TransferPaidCredit { get; set; } = true;
    }
}