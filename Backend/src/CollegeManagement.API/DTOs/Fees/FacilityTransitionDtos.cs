using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Fees
{
    public class FacilityTransitionPreviewDto
    {
        public int StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string CurrentStudentType { get; set; } = string.Empty;

        // Hostel Breakdown (From Facility)
        public string FromFacility { get; set; } = "Hostel";
        public DateTime? HostelJoiningDate { get; set; }
        public DateTime TransitionDate { get; set; }
        public int MonthsUsedHostel { get; set; }
        public decimal OriginalAnnualHostelFee { get; set; }
        public decimal ProratedHostelFee { get; set; }
        public decimal DiscontinuedHostelFeeSavings { get; set; }
        public decimal HostelPaidAmount { get; set; }
        public decimal ExcessHostelCredit { get; set; }

        // Transport Breakdown (To Facility)
        public string ToFacility { get; set; } = "Transport";
        public long RouteId { get; set; }
        public string RouteName { get; set; } = string.Empty;
        public long PickupPointId { get; set; }
        public string PickupPointName { get; set; } = string.Empty;
        public decimal MonthlyTransportFee { get; set; }
        public int RemainingTransportMonths { get; set; }
        public decimal ProratedTransportFee { get; set; }
        public decimal CreditAppliedToTransport { get; set; }
        public decimal NetTransportDue { get; set; }

        // Overall Financial Impact
        public decimal PreviousTotalFee { get; set; }
        public decimal NewTotalFee { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal PreviousBalance { get; set; }
        public decimal NewBalance { get; set; }

        public List<FacilityTransitionInstallmentPreviewDto> InstallmentsPreview { get; set; } = new();
    }

    public class FacilityTransitionInstallmentPreviewDto
    {
        public int InstallmentNumber { get; set; }
        public DateTime DueDate { get; set; }
        public decimal PreviousAmount { get; set; }
        public decimal NewAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal NewBalance { get; set; }
        public string Status { get; set; } = "Pending";
    }

    public class FacilityTransitionRequestDto
    {
        [Required]
        public int StudentId { get; set; }

        [Required]
        public long PickupPointId { get; set; }

        public long? VehicleAssignmentId { get; set; }

        public DateTime? EffectiveDate { get; set; }

        public string? Remarks { get; set; }
    }

    public class FacilityTransitionResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? TransitionId { get; set; }
        public FacilityTransitionPreviewDto? Breakdown { get; set; }
    }

    public class TransportToHostelPreviewDto
    {
        public int StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string CurrentStudentType { get; set; } = string.Empty;

        // Transport Breakdown (From Facility)
        public string FromFacility { get; set; } = "Transport";
        public DateTime? TransportStartDate { get; set; }
        public DateTime TransitionDate { get; set; }
        public int MonthsUsedTransport { get; set; }
        public decimal OriginalAnnualTransportFee { get; set; }
        public decimal ProratedTransportFee { get; set; }
        public decimal DiscontinuedTransportFeeSavings { get; set; }
        public decimal TransportPaidAmount { get; set; }
        public decimal ExcessTransportCredit { get; set; }

        // Hostel Breakdown (To Facility)
        public string ToFacility { get; set; } = "Hostel";
        public int HostelId { get; set; }
        public string HostelName { get; set; } = string.Empty;
        public int RoomId { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public int BedId { get; set; }
        public string BedNumber { get; set; } = string.Empty;
        public decimal AnnualHostelFee { get; set; }
        public decimal MonthlyHostelRate { get; set; }
        public int RemainingHostelMonths { get; set; }
        public decimal ProratedHostelFee { get; set; }
        public decimal CreditAppliedToHostel { get; set; }
        public decimal NetHostelDue { get; set; }

        // Overall Financial Impact
        public decimal PreviousTotalFee { get; set; }
        public decimal NewTotalFee { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal PreviousBalance { get; set; }
        public decimal NewBalance { get; set; }

        public List<FacilityTransitionInstallmentPreviewDto> InstallmentsPreview { get; set; } = new();
    }

    public class TransportToHostelRequestDto
    {
        [Required]
        public int StudentId { get; set; }

        [Required]
        public int HostelId { get; set; }

        [Required]
        public int RoomId { get; set; }

        [Required]
        public int BedId { get; set; }

        public decimal? CustomAnnualHostelFee { get; set; }

        public DateTime? EffectiveDate { get; set; }

        public string? Remarks { get; set; }
    }

    public class TransportToHostelResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? TransitionId { get; set; }
        public TransportToHostelPreviewDto? Breakdown { get; set; }
    }

    public class DiscontinueFacilityPreviewDto
    {
        public int StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string CurrentStudentType { get; set; } = string.Empty;

        public string FromFacility { get; set; } = string.Empty; // "Hostel" or "Transport"
        public string ToFacility { get; set; } = "Self Transport";
        public DateTime? StartDate { get; set; }
        public DateTime DiscontinuationDate { get; set; }
        public int MonthsUsed { get; set; }

        public decimal OriginalAnnualFee { get; set; }
        public decimal ProratedUsedFee { get; set; }
        public decimal DiscontinuedFeeSavings { get; set; }
        public decimal FacilityPaidAmount { get; set; }
        public decimal ExcessCredit { get; set; }
        public decimal CreditAdjustedToTuitionOrGeneral { get; set; }
        public decimal RefundableCreditRemaining { get; set; }

        // Overall Financial Impact
        public decimal PreviousTotalFee { get; set; }
        public decimal NewTotalFee { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal PreviousBalance { get; set; }
        public decimal NewBalance { get; set; }

        public List<FacilityTransitionInstallmentPreviewDto> InstallmentsPreview { get; set; } = new();
    }

    public class DiscontinueFacilityRequestDto
    {
        [Required]
        public int StudentId { get; set; }

        [Required]
        public string FromFacility { get; set; } = "Hostel"; // "Hostel" or "Transport"

        public DateTime? EffectiveDate { get; set; }

        public string? Remarks { get; set; }
    }

    public class DiscontinueFacilityResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? TransitionId { get; set; }
        public DiscontinueFacilityPreviewDto? Breakdown { get; set; }
    }
}
