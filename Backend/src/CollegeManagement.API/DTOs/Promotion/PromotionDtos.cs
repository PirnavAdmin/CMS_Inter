using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Promotion
{
    // ============================================================
    // ELIGIBILITY QUERY
    // ============================================================

    public class PromotionEligibilityQuery
    {
        public int? AcademicYearId { get; set; }

        public int? BoardId { get; set; }

        public string? AcademicLevel { get; set; }

        public int? GroupId { get; set; }

        public int? ProgramId { get; set; }

        public string? Program { get; set; }

        public string? Section { get; set; }

        public string? Medium { get; set; }

        public int? TargetAcademicYearId { get; set; }

        public int? TargetBoardId { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int? TargetGroupId { get; set; }

        public int? TargetProgramId { get; set; }

        public string? TargetProgram { get; set; }

        public string? TargetSection { get; set; }

        public string? TargetMedium { get; set; }

        public string? Search { get; set; }

        public string? EligibilityStatus { get; set; }
    }

    // ============================================================
    // ELIGIBLE STUDENT
    // ============================================================

    public class EligibleStudentDto
    {
        public int StudentId { get; set; }

        public string StudentCode { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public int AcademicYearId { get; set; }

        public string? AcademicYear { get; set; }

        public int? BoardId { get; set; }

        public string? BoardName { get; set; }

        public string AcademicLevel { get; set; } = string.Empty;

        public int GroupId { get; set; }

        public string? GroupName { get; set; }

        public int? ProgramId { get; set; }

        public string? ProgramName { get; set; }

        public string Section { get; set; } = string.Empty;

        public string? Medium { get; set; }

        public int? TargetAcademicYearId { get; set; }

        public string? TargetAcademicYear { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int? TargetGroupId { get; set; }

        public string? TargetGroupName { get; set; }

        public int? TargetProgramId { get; set; }

        public string? TargetProgramName { get; set; }

        public string? TargetSection { get; set; }

        public string? TargetMedium { get; set; }

        public decimal AttendancePercentage { get; set; }

        public string ResultStatus { get; set; } = "Not Available";

        public string FailedSubjects { get; set; } = string.Empty;

        public int Backlogs { get; set; }

        public string EligibilityStatus { get; set; } = "Not Eligible";

        public string EligibilityReason { get; set; } = string.Empty;
    }

    // ============================================================
    // PROMOTION CONFIGURATION
    // ============================================================

    public class PromotionConfiguration
    {
        public int SourceAcademicYearId { get; set; }

        public int? SourceBoardId { get; set; }

        public int? SourceAcademicLevelId { get; set; }

        public string? SourceAcademicLevel { get; set; }

        public int SourceGroupId { get; set; }

        public int? SourceProgramId { get; set; }

        public string? SourceProgram { get; set; }

        public int? SourceSectionId { get; set; }

        public string? SourceSection { get; set; }

        public string? SourceMedium { get; set; }

        public int TargetAcademicYearId { get; set; }

        public int? TargetBoardId { get; set; }

        public int? TargetAcademicLevelId { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int TargetGroupId { get; set; }

        public int? TargetProgramId { get; set; }

        public string? TargetProgram { get; set; }

        public int? TargetSectionId { get; set; }

        public string? TargetSection { get; set; }

        public string? TargetMedium { get; set; }
    }

    // ============================================================
    // PREVIEW
    // ============================================================

    public class PromotionPreviewRequest : PromotionConfiguration
    {
        [Required]
        [MinLength(1)]
        public List<int> StudentIds { get; set; } = new();
    }

    public class PromotionPreviewStudentDto
    {
        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string EligibilityStatus { get; set; } = string.Empty;

        public string EligibilityReason { get; set; } = string.Empty;
    }

    public class PromotionPreviewResponse
    {
        public int TotalSelected { get; set; }

        public int EligibleCount { get; set; }

        public int NotEligibleCount { get; set; }

        public List<PromotionPreviewStudentDto> Students { get; set; }
            = new();
    }

    // ============================================================
    // PROMOTION EXECUTION
    // ============================================================

    public class PromoteStudentsRequest : PromotionConfiguration
    {
        [Required]
        [MinLength(1)]
        public List<int> StudentIds { get; set; } = new();
    }

    public class PromotionExecutionStudentDto
    {
        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string PromotionStatus { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;
    }

    public class PromotionExecutionResponse
    {
        public string PromotionBatchId { get; set; } = string.Empty;

        public int TotalRequested { get; set; }

        public int PromotedCount { get; set; }

        public int FailedCount { get; set; }

        public List<PromotionExecutionStudentDto> Students { get; set; }
            = new();
    }

    // ============================================================
    // ROLLBACK
    // ============================================================

    public class RollbackPromotionRequest
    {
        [Range(1, int.MaxValue)]
        public int PromotionId { get; set; }

        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }

    public class RollbackResponse
    {
        public int PromotionId { get; set; }

        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string RollbackStatus { get; set; } = string.Empty;

        public string RollbackReason { get; set; } = string.Empty;

        public DateTime RolledBackAt { get; set; }

        public string? RolledBackBy { get; set; }
    }

    // ============================================================
    // SINGLE STUDENT PROMOTION
    // ============================================================

    public class PromoteSingleStudentRequest
    {
        [Range(1, int.MaxValue)]
        public int TargetAcademicYearId { get; set; }

        public int? TargetBoardId { get; set; }

        [Required]
        [MaxLength(50)]
        public string TargetAcademicLevel { get; set; } = string.Empty;

        [Range(1, int.MaxValue)]
        public int TargetGroupId { get; set; }

        public int? TargetProgramId { get; set; }

        public string? TargetProgram { get; set; }

        [Required]
        [MaxLength(50)]
        public string TargetSection { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? TargetMedium { get; set; }
    }

    // ============================================================
    // HISTORY QUERY
    // ============================================================

    public class PromotionHistoryQuery
    {
        public int? AcademicYearId { get; set; }

        public int? TargetAcademicYearId { get; set; }

        public string? AcademicLevel { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int? GroupId { get; set; }

        public int? ProgramId { get; set; }

        public string? Program { get; set; }

        public int? TargetProgramId { get; set; }

        public string? TargetProgram { get; set; }

        public string? Section { get; set; }

        public int? StudentId { get; set; }

        public string? Search { get; set; }

        public string? PromotionStatus { get; set; }

        public DateTime? FromDate { get; set; }

        public DateTime? ToDate { get; set; }
    }

    // ============================================================
    // HISTORY DTO
    // ============================================================

    public class PromotionHistoryDto
    {
        public int PromotionId { get; set; }

        /*
         * Your database does not have PromotionBatchId.
         *
         * Kept in DTO so existing controller/API contract
         * does not need to change.
         */
        public string? PromotionBatchId { get; set; }

        public int StudentId { get; set; }

        public string StudentCode { get; set; } = string.Empty;

        public string AdmissionNo { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public string? SourceAcademicYear { get; set; }

        public int? SourceBoardId { get; set; }

        public string? SourceBoard { get; set; }

        public string SourceAcademicLevel { get; set; }
            = string.Empty;

        public int SourceGroupId { get; set; }

        public string? SourceGroup { get; set; }

        public int? SourceProgramId { get; set; }

        public string? SourceProgram { get; set; }

        public string SourceSection { get; set; }
            = string.Empty;

        public string? SourceMedium { get; set; }

        public string? TargetAcademicYear { get; set; }

        public int? TargetBoardId { get; set; }

        public string? TargetBoard { get; set; }

        public string TargetAcademicLevel { get; set; }
            = string.Empty;

        public int TargetGroupId { get; set; }

        public string? TargetGroup { get; set; }

        public int? TargetProgramId { get; set; }

        public string? TargetProgram { get; set; }

        public string TargetSection { get; set; }
            = string.Empty;

        public string? TargetMedium { get; set; }

        public string PromotionStatus { get; set; }
            = string.Empty;

        public DateTime PromotionDate { get; set; }

        public string? PromotedBy { get; set; }

        public bool RollbackStatus { get; set; }

        public DateTime? RollbackDate { get; set; }

        public string? RollbackReason { get; set; }
    }

    // ============================================================
    // GROUP ALLOCATION
    // ============================================================

    public class GroupAllocationRequest
    {
        [Required]
        [MinLength(1)]
        public List<int> StudentIds { get; set; } = new();

        public int TargetAcademicYearId { get; set; }

        public int? TargetAcademicLevelId { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int TargetGroupId { get; set; }
    }

    // ============================================================
    // PROGRAM ALLOCATION
    // ============================================================

    public class ProgramAllocationRequest
    {
        [Required]
        [MinLength(1)]
        public List<int> StudentIds { get; set; } = new();

        public int TargetAcademicYearId { get; set; }

        public int? TargetAcademicLevelId { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int TargetGroupId { get; set; }

        public int TargetProgramId { get; set; }
    }

    // ============================================================
    // SECTION ALLOCATION
    // ============================================================

    public class SectionAllocationRequest
    {
        [Required]
        [MinLength(1)]
        public List<int> StudentIds { get; set; } = new();

        public int TargetAcademicYearId { get; set; }

        public int? TargetAcademicLevelId { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int TargetGroupId { get; set; }

        public int? TargetSectionId { get; set; }

        public string? TargetSection { get; set; }
    }

    // ============================================================
    // ALLOCATION RESPONSE
    // ============================================================

    public class AllocationStudentDto
    {
        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;
    }

    public class AllocationResponse
    {
        public int UpdatedCount { get; set; }

        public int FailedCount { get; set; }

        public List<AllocationStudentDto> Students { get; set; }
            = new();
    }

    // ============================================================
    // PROMOTION REPORT QUERY
    // ============================================================

    /*
     * You said there is NO separate PromotionReportQuery.cs.
     *
     * That is completely fine.
     *
     * Keep this class inside PromotionDto.cs.
     */

    public class PromotionReportQuery
    {
        public int? AcademicYearId { get; set; }

        public int? TargetAcademicYearId { get; set; }

        /*
         * BoardId is retained for API compatibility.
         *
         * The actual PromotionHistories table does not contain
         * FromBoardId / ToBoardId, so the repository does not
         * use this filter.
         */
        public int? BoardId { get; set; }

        public string? AcademicLevel { get; set; }

        public string? TargetAcademicLevel { get; set; }

        public int? GroupId { get; set; }

        public int? TargetGroupId { get; set; }

        public string? Section { get; set; }

        public string? TargetSection { get; set; }

        public string? PromotionStatus { get; set; }
    }

    // ============================================================
    // PROMOTION REPORT DETAIL
    // ============================================================

    public class PromotionReportDetailDto
    {
        public int PromotionId { get; set; }

        public int StudentId { get; set; }

        public string AdmissionNo { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public string? SourceAcademicYear { get; set; }

        public string SourceLevel { get; set; } = string.Empty;

        public string? TargetAcademicYear { get; set; }

        public string TargetLevel { get; set; } = string.Empty;

        public string? SourceGroup { get; set; }

        public string? TargetGroup { get; set; }

        public string SourceSection { get; set; } = string.Empty;

        public string TargetSection { get; set; } = string.Empty;

        public string EligibilityStatus { get; set; } = string.Empty;

        public string PromotionStatus { get; set; } = string.Empty;

        public DateTime? PromotionDate { get; set; }
    }

    // ============================================================
    // PROMOTION REPORT RESPONSE
    // ============================================================

    public class PromotionReportResponse
    {
        public int TotalStudents { get; set; }

        public int EligibleStudents { get; set; }

        public int NotEligibleStudents { get; set; }

        public int PromotedStudents { get; set; }

        public int NotPromotedStudents { get; set; }

        public int RolledBackStudents { get; set; }

        public List<PromotionReportDetailDto> Details { get; set; }
            = new();
    }
}