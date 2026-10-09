using System.Collections.Generic;
using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.DTOs.Fees
{
    // ==========================================
    // 1. PROMOTION FEE DTOS
    // ==========================================
    public class PromotionFeePreviewRequest
    {
        public int? CampusId { get; set; }
        public int? TargetCampusId { get; set; }
        public int BoardId { get; set; }
        public int? TargetBoardId { get; set; }
        public int TargetAcademicYearId { get; set; }
        public int? TargetAcademicLevelId { get; set; }
        public string? TargetAcademicLevel { get; set; }
        public int TargetGroupId { get; set; }
        public int? TargetProgramId { get; set; }
        public List<int>? StudentIds { get; set; }
    }

    public class PromotionFeePreviewResponse
    {
        public int? FeeStructureId { get; set; }
        public string? StructureName { get; set; }
        public decimal TotalAmount { get; set; }
        public List<FeeStructureItemResponse> Components { get; set; } = new();
        public int StudentsCount { get; set; }
        public int StudentsWithPriorArrears { get; set; }
        public decimal TotalPriorArrears { get; set; }
    }

    public class PromotionFeeConfigDto
    {
        public int? TargetFeeStructureId { get; set; }
        public string PaymentPlan { get; set; } = "Full Payment";
        public int NumberOfInstallments { get; set; } = 1;
    }

    // ==========================================
    // 2. CAMPUS TRANSFER FEE DTOS
    // ==========================================
    public class CampusTransferFeePreviewDto
    {
        public int TransferId { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int FromCampusId { get; set; }
        public string FromCampusName { get; set; } = string.Empty;
        public int ToCampusId { get; set; }
        public string ToCampusName { get; set; } = string.Empty;

        // Current Fee Status at Origin
        public int? CurrentFeeStructureId { get; set; }
        public string? CurrentFeeStructureName { get; set; }
        public decimal CurrentTotalAmount { get; set; }
        public decimal CurrentPaidAmount { get; set; }
        public decimal CurrentBalanceAmount { get; set; }

        // Destination Fee Structure
        public int? DestinationFeeStructureId { get; set; }
        public string? DestinationFeeStructureName { get; set; }
        public decimal DestinationTotalAmount { get; set; }

        // Reconciliation
        public decimal TransferableCredit { get; set; }
        public decimal EstimatedNewBalance { get; set; }
    }

    // ==========================================
    // 3. PROGRAM ALLOCATION / CHANGE FEE DTOS
    // ==========================================
    public class ProgramFeeAdjustmentPreviewDto
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int? CurrentProgramId { get; set; }
        public string? CurrentProgramName { get; set; }
        public int TargetProgramId { get; set; }
        public string TargetProgramName { get; set; } = string.Empty;

        public int? CurrentFeeStructureId { get; set; }
        public string? CurrentFeeStructureName { get; set; }
        public decimal CurrentTotalAmount { get; set; }
        public decimal CurrentPaidAmount { get; set; }
        public decimal CurrentBalanceAmount { get; set; }

        public int? TargetFeeStructureId { get; set; }
        public string? TargetFeeStructureName { get; set; }
        public decimal TargetTotalAmount { get; set; }

        public decimal DifferentialAmount { get; set; } // Target - Current
        public decimal RevisedBalanceAmount { get; set; } // Max(0, Target - Paid)
    }
}
