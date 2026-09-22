using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Promotion
{
    [Table("PromotionHistories")]
    public class PromotionHistory
    {
        [Key]
        public int PromotionHistoryId { get; set; }
        public int StudentId { get; set; }
        [MaxLength(50)] public string? PromotionBatchId { get; set; }
        public int FromAcademicYearId { get; set; }
        public int? FromBoardId { get; set; }
        public int ToAcademicYearId { get; set; }
        public int? ToBoardId { get; set; }
        [MaxLength(50)] public string FromAcademicLevel { get; set; } = string.Empty;
        [MaxLength(50)] public string ToAcademicLevel { get; set; } = string.Empty;
        public int FromGroupId { get; set; }
        public int ToGroupId { get; set; }
        [MaxLength(20)] public string FromSection { get; set; } = string.Empty;
        [MaxLength(20)] public string ToSection { get; set; } = string.Empty;
        [MaxLength(50)] public string? FromMedium { get; set; }
        [MaxLength(50)] public string? ToMedium { get; set; }
        public DateTime PromotionDate { get; set; }
        [MaxLength(150)] public string? PromotedBy { get; set; }
        [MaxLength(20)] public string Status { get; set; } = "Promoted";
        public bool IsRolledBack { get; set; }
        public DateTime? RolledBackAt { get; set; }
        [MaxLength(500)] public string? Remarks { get; set; }
        [MaxLength(500)] public string? RollbackRemarks { get; set; }
        public DateTime CreatedAt { get; set; }

        [NotMapped] public string StudentName { get; set; } = string.Empty;
        [NotMapped] public string AdmissionNo { get; set; } = string.Empty;
        [NotMapped] public string? FromAcademicYearName { get; set; }
        [NotMapped] public string? ToAcademicYearName { get; set; }
        [NotMapped] public string? FromGroupName { get; set; }
        [NotMapped] public string? ToGroupName { get; set; }
    }

    public class PromotionReport
    {
        public int PromotionHistoryId { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public string? FromAcademicYearName { get; set; }
        public string? ToAcademicYearName { get; set; }
        public string FromAcademicLevel { get; set; } = string.Empty;
        public string ToAcademicLevel { get; set; } = string.Empty;
        public string? FromGroupName { get; set; }
        public string? ToGroupName { get; set; }
        public string FromSection { get; set; } = string.Empty;
        public string ToSection { get; set; } = string.Empty;
        public DateTime PromotionDate { get; set; }
        [MaxLength(150)] public string? PromotedBy { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Remarks { get; set; }
    }

    public class SectionAllocation
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int GroupId { get; set; }
        public string? GroupName { get; set; }
        public string Section { get; set; } = string.Empty;
        public DateTime AllocatedAt { get; set; }
    }

    public class GroupAllocation
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int GroupId { get; set; }
        public string? GroupName { get; set; }
        public string Section { get; set; } = string.Empty;
        public DateTime AllocatedAt { get; set; }
    }
}
