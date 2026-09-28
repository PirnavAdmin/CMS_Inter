using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

public class FeeType
{
    [Key] public int FeeTypeId { get; set; }
    [Required, MaxLength(30)] public string FeeTypeCode { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string FeeTypeName { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<FeeStructureComponent> StructureComponents { get; set; } = new List<FeeStructureComponent>();
}

public class FeeStructure
{
    [Key] public int FeeStructureId { get; set; }
    public int? CampusId { get; set; }
    [Required] public int BoardId { get; set; }
    [Required] public int AcademicYearId { get; set; }
    [Required] public int AcademicLevelId { get; set; }
    [Required] public int GroupId { get; set; }
    public int? ProgramId { get; set; }
    [Required, MaxLength(150)] public string StructureName { get; set; } = string.Empty;
    [MaxLength(500)] public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(CampusId))]
    public Campus? Campus { get; set; }
    public Board? Board { get; set; }
    public AcademicYear? AcademicYear { get; set; }
    public AcademicLevel? AcademicLevel { get; set; }
    public Group? Group { get; set; }
    public AcademicProgram? Program { get; set; }
    public ICollection<FeeStructureComponent> Components { get; set; } = new List<FeeStructureComponent>();
    public ICollection<StudentFee> StudentFees { get; set; } = new List<StudentFee>();
}

public class FeeStructureComponent
{
    [Key] public int FeeStructureComponentId { get; set; }
    [Required] public int FeeStructureId { get; set; }
    [Required] public int FeeTypeId { get; set; }
    [Required, MaxLength(20)] public string Rule { get; set; } = "Mandatory";
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public FeeStructure? FeeStructure { get; set; }
    public FeeType? FeeType { get; set; }
    public ICollection<StudentFeeComponent> StudentFeeComponents { get; set; } = new List<StudentFeeComponent>();
}

public class Scholarship
{
    [Key] public int ScholarshipId { get; set; }
    [Required, MaxLength(100)] public string ScholarshipName { get; set; } = string.Empty;
    [Required, MaxLength(20)] public string DiscountType { get; set; } = "Percentage";
    [Column(TypeName = "decimal(18,2)")] public decimal DiscountValue { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<FeeConcession> Concessions { get; set; } = new List<FeeConcession>();
}

public class StudentFee
{
    [Key] public int StudentFeeId { get; set; }
    [Required] public int StudentId { get; set; }
    [Required] public int FeeStructureId { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal TotalAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal ConcessionAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal PayableAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal PaidAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal BalanceAmount { get; set; }
    [MaxLength(100)] public string? PaymentPlan { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Pending";
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Student? Student { get; set; }
    public FeeStructure? FeeStructure { get; set; }
    public ICollection<StudentFeeComponent> Components { get; set; } = new List<StudentFeeComponent>();
    public ICollection<FeeConcession> Concessions { get; set; } = new List<FeeConcession>();
    [NotMapped] public ICollection<FeePaymentPlan> PaymentPlans { get; set; } = new List<FeePaymentPlan>();
    public ICollection<FeePayment> Payments { get; set; } = new List<FeePayment>();
}

public class StudentFeeComponent
{
    [Key] public int StudentFeeComponentId { get; set; }
    [Required] public int StudentFeeId { get; set; }
    [Required] public int FeeStructureComponentId { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal ConcessionAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal PayableAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal PaidAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal BalanceAmount { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Pending";
    public StudentFee? StudentFee { get; set; }
    public FeeStructureComponent? FeeStructureComponent { get; set; }
}

public class FeeConcession
{
    [Key] public int FeeConcessionId { get; set; }
    [Required] public int StudentId { get; set; }
    [Required] public int StudentFeeId { get; set; }
    public int? ScholarshipId { get; set; }
    [Required, MaxLength(20)] public string DiscountType { get; set; } = "Fixed";
    [Column(TypeName = "decimal(18,2)")] public decimal DiscountValue { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal DiscountAmount { get; set; }
    [MaxLength(500)] public string? Reason { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Applied";
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    public int? ApprovedBy { get; set; }
    public Student? Student { get; set; }
    public StudentFee? StudentFee { get; set; }
    public Scholarship? Scholarship { get; set; }
}

public class FeePaymentPlan
{
    [Key] public int FeePaymentPlanId { get; set; }
    [Required] public int StudentFeeId { get; set; }
    [Required, MaxLength(100)] public string PlanName { get; set; } = string.Empty;
    [Column(TypeName = "decimal(18,2)")] public decimal TotalAmount { get; set; }
    public int NumberOfInstallments { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public StudentFee? StudentFee { get; set; }
    public ICollection<FeeInstallment> Installments { get; set; } = new List<FeeInstallment>();
}

public class FeeInstallment
{
    [Key] public int FeeInstallmentId { get; set; }
    [Required] public int FeePaymentPlanId { get; set; }
    public int InstallmentNumber { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal PaidAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal BalanceAmount { get; set; }
    public DateTime DueDate { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Pending";
    public FeePaymentPlan? FeePaymentPlan { get; set; }
    public ICollection<FeePayment> Payments { get; set; } = new List<FeePayment>();
}

public class FeePayment
{
    [Key] public int FeePaymentId { get; set; }
    [Required] public int StudentId { get; set; }
    [Required] public int StudentFeeId { get; set; }
    public int? FeeInstallmentId { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    [NotMapped] public decimal DiscountAmount { get; set; }
    [NotMapped] public decimal FineAmount { get; set; }
    [MaxLength(50)] public string? ReceiptNumber { get; set; }
    [Required, MaxLength(30)] public string PaymentMode { get; set; } = string.Empty;
    [MaxLength(100)] public string? TransactionReference { get; set; }
    [MaxLength(500)] public string? Remarks { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(30)] public string Status { get; set; } = "Paid";
    public int? CollectedBy { get; set; }
    public Student? Student { get; set; }
    public StudentFee? StudentFee { get; set; }
    public FeeInstallment? FeeInstallment { get; set; }
    public FeeReceipt? Receipt { get; set; }
}

public class FeeReceipt
{
    [Key] public int FeeReceiptId { get; set; }
    [Required] public int FeePaymentId { get; set; }
    [Required, MaxLength(50)] public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;
    [MaxLength(500)] public string? Remarks { get; set; }
    public FeePayment? FeePayment { get; set; }
}
