using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Fees;

// ========================= FEE TYPE =========================
public class CreateFeeTypeRequest
{
    [Required, StringLength(100, MinimumLength = 2)] public string FeeTypeName { get; set; } = string.Empty;
    [Required, StringLength(50)] public string Category { get; set; } = "Academic";
    public bool IsActive { get; set; } = true;
}

public class UpdateFeeTypeRequest
{
    [Required, StringLength(100, MinimumLength = 2)] public string FeeTypeName { get; set; } = string.Empty;
    [Required, StringLength(50)] public string Category { get; set; } = "Academic";
    public bool IsActive { get; set; } = true;
}

public class FeeTypeResponse
{
    public int FeeTypeId { get; set; }
    public string FeeTypeCode { get; set; } = string.Empty;
    public string FeeTypeName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// ========================= FEE STRUCTURE =========================
public class CreateFeeStructureRequest
{
    [Range(1, int.MaxValue)] public int BoardId { get; set; }
    [Range(1, int.MaxValue)] public int AcademicYearId { get; set; }
    [Range(1, int.MaxValue)] public int GroupId { get; set; }
    public int? ProgramId { get; set; }
    public List<CreateFeeStructureItemRequest> Items { get; set; } = new();
}

public class UpdateFeeStructureRequest
{
    public string StructureName { get; set; } = string.Empty;

    public string? Description { get; set; }
    public int? ProgramId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateFeeStructureItemRequest
{
    [Range(1, int.MaxValue)] public int FeeTypeId { get; set; }
    [Required, StringLength(20)] public string Rule { get; set; } = "Mandatory";
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
}

public class UpdateFeeStructureItemRequest
{
    [Required, StringLength(20)] public string Rule { get; set; } = "Mandatory";
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
    public bool IsActive { get; set; } = true;
}

public class FeeStructureResponse
{
    public int FeeStructureId { get; set; }
    public int BoardId { get; set; }
    public string BoardName { get; set; } = string.Empty;
    public int AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = string.Empty;
   
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public int? ProgramId { get; set; }
    public string? ProgramName { get; set; }
    public string StructureName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<FeeStructureItemResponse> Items { get; set; } = new();
}

public class FeeStructureItemResponse
{
    public int FeeStructureComponentId { get; set; }
    public int FeeStructureId { get; set; }
    public int FeeTypeId { get; set; }
    public string FeeTypeName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Rule { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public bool IsActive { get; set; }
}

// ========================= SCHOLARSHIP MASTER =========================
public class CreateScholarshipRequest
{
    [Required, StringLength(100, MinimumLength = 2)] public string ScholarshipName { get; set; } = string.Empty;
    [Required, StringLength(20)] public string DiscountType { get; set; } = "Percentage";
    [Range(0.01, double.MaxValue)] public decimal DiscountValue { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateScholarshipRequest
{
    [Required, StringLength(100, MinimumLength = 2)] public string ScholarshipName { get; set; } = string.Empty;
    [Required, StringLength(20)] public string DiscountType { get; set; } = "Percentage";
    [Range(0.01, double.MaxValue)] public decimal DiscountValue { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ScholarshipResponse
{
    public int ScholarshipId { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string DiscountType { get; set; } = string.Empty;
    public decimal DiscountValue { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// ========================= STUDENT FEE =========================
public class AssignStudentFeeRequest
{
    [Range(1, int.MaxValue)] public int StudentId { get; set; }
    [Range(1, int.MaxValue)] public int FeeStructureId { get; set; }
    [Required, StringLength(100)]
    public string PlanName { get; set; } = "Full Payment";

    [Range(1, 24)]
    public int NumberOfInstallments { get; set; } = 1;
}

public class StudentFeeResponse
{
    public int StudentFeeId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNumber { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public int FeeStructureId { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal ConcessionAmount { get; set; }
    public decimal PayableAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public string Status { get; set; } = "Pending";
    public string PaymentPlan { get; set; }
    public DateTime AssignedAt { get; set; }
    public List<StudentFeeComponentResponse> Components { get; set; } = new();
    public List<FeeScheduleResponse> Schedules { get; set; } = new();
}

public class StudentFeeComponentResponse
{
    public int StudentFeeComponentId { get; set; }
    public int FeeStructureComponentId { get; set; }
    public int FeeTypeId { get; set; }
    public string FeeTypeName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal ConcessionAmount { get; set; }
    public decimal PayableAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public string? ConcessionScheme { get; set; }
    public string Status { get; set; } = "Pending";
}

// ========================= CONCESSION / SCHOLARSHIP APPLICATION =========================
public class ApplyFeeConcessionRequest
{
    [Range(1, int.MaxValue)] public int StudentId { get; set; }
    [Range(1, int.MaxValue)] public int StudentFeeId { get; set; }
    public int? ScholarshipId { get; set; }
    [StringLength(100)] public string? ScholarshipName { get; set; }
    [StringLength(20)] public string? DiscountType { get; set; }
    [Range(0, double.MaxValue)] public decimal? DiscountValue { get; set; }
    [StringLength(500)] public string? Reason { get; set; }
    public int? ApprovedBy { get; set; }
}

public class FeeConcessionResponse
{
    public int FeeConcessionId { get; set; }
    public int StudentId { get; set; }
    public int StudentFeeId { get; set; }
    public int? ScholarshipId { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string DiscountType { get; set; } = string.Empty;
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; }
}

// ========================= PAYMENT PLAN / SCHEDULE =========================
public class CreatePaymentPlanRequest
{
    [Range(1, int.MaxValue)]
    public int StudentFeeId { get; set; }

    [Required, StringLength(100)]
    public string PlanName { get; set; } = "Full Payment";

    [Range(1, 24)]
    public int NumberOfInstallments { get; set; }
}

public class CreateInstallmentRequest
{
    [Range(1, 24)] public int InstallmentNumber { get; set; }
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
    [Required] public DateTime DueDate { get; set; }
}

public class PaymentPlanResponse
{
    public int FeePaymentPlanId { get; set; }
    public int StudentFeeId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int NumberOfInstallments { get; set; }
    public bool IsActive { get; set; }
    public List<FeeScheduleResponse> Installments { get; set; } = new();
}

public class FeeScheduleResponse
{
    public int FeeInstallmentId { get; set; }
    public int FeePaymentPlanId { get; set; }
    public int InstallmentNumber { get; set; }
    public string FeeSchedule { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = "Pending";
}

// ========================= PAYMENT =========================
public class CreateFeePaymentRequest
{
    [Range(1, int.MaxValue)] public int StudentId { get; set; }
    [Range(1, int.MaxValue)] public int StudentFeeId { get; set; }
    public int? FeeInstallmentId { get; set; }
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
    public DateTime? PaymentDate { get; set; }
    [Required, StringLength(30)] public string PaymentMode { get; set; } = "Cash";
    [Range(0, double.MaxValue)] public decimal Discount { get; set; }
    [Range(0, double.MaxValue)] public decimal Fine { get; set; }
    [StringLength(100)] public string? TransactionReference { get; set; }
    [StringLength(500)] public string? Note { get; set; }
    public int? CollectedBy { get; set; }
}

public class FeePaymentResponse
{
    public int FeePaymentId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNumber { get; set; } = string.Empty;
    public int StudentFeeId { get; set; }
    public int? FeeInstallmentId { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Discount { get; set; }
    public decimal Fine { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public DateTime PaymentDate { get; set; }
    public string Status { get; set; } = "Paid";
    public string ReceiptNumber { get; set; } = string.Empty;
    public string? Note { get; set; }
}

public class FeeReceiptResponse
{
    public int FeeReceiptId { get; set; }
    public int FeePaymentId { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNumber { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public string PaymentType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public string? Remarks { get; set; }
}

// ========================= LEDGER / COLLECTION =========================
public class StudentFeeLedgerResponse
{
    public int StudentFeeId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNumber { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public string PaymentPlan { get; set; } 
    public decimal TotalPayable { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal Balance { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class FeeCollectionResponse
{
    public int StudentFeeId { get; set; }
    public int StudentId { get; set; }
    public string AdmissionNumber { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public decimal Payable { get; set; }
    public decimal Paid { get; set; }
    public decimal Balance { get; set; }
    public DateTime? NextDue { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class FeeDueResponse
{
    public int StudentFeeId { get; set; }
    public int StudentId { get; set; }
    public string AdmissionNumber { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public string FeeSchedule { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public decimal Amount { get; set; }
    public decimal Balance { get; set; }
    public string Status { get; set; } = string.Empty;
}

// ========================= DASHBOARD / REPORTS =========================
public class FeeDashboardResponse
{
    public int TotalStudents { get; set; }
    public decimal TotalExpected { get; set; }
    public decimal TotalCollected { get; set; }
    public decimal TotalOutstanding { get; set; }
    public int PendingStudents { get; set; }
    public int OverdueStudents { get; set; }
    public decimal CollectionPercentage { get; set; }
    public List<GroupCollectionResponse> GroupWiseCollection { get; set; } = new();
    public List<FeeDueResponse> UpcomingSchedules { get; set; } = new();
    public List<FeePaymentResponse> RecentPayments { get; set; } = new();
}

public class GroupCollectionResponse
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public decimal Expected { get; set; }
    public decimal Collected { get; set; }
    public decimal Outstanding { get; set; }
}

public class FeeReportResponse
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal TotalCollected { get; set; }
    public int TransactionCount { get; set; }
    public List<FeePaymentResponse> Transactions { get; set; } = new();
}

// ========================= STUDENT DETAILS =========================
public class StudentFeeDetailsResponse
{
    public int StudentFeeId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNumber { get; set; } = string.Empty;
    public string RollNumber { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public string AcademicLevelName { get; set; } = string.Empty;
    public string AcademicYearName { get; set; } = string.Empty;
    public DateTime AdmissionDate { get; set; }
    public decimal OriginalFee { get; set; }
    public decimal Concession { get; set; }
    public decimal ScheduledFees { get; set; }
    public decimal TotalPayable { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal OutstandingBalance { get; set; }
    public string PaymentPlan { get; set; } 
    public string FeeStatus { get; set; } = string.Empty;
    public List<StudentFeeBreakdownResponse> Breakdown { get; set; } = new();
    public List<FeeScheduleResponse> Schedules { get; set; } = new();
    public List<FeePaymentResponse> PaymentHistory { get; set; } = new();
}

public class StudentFeeBreakdownResponse
{
    public string FeeType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? ConcessionScheme { get; set; }
    public decimal Discount { get; set; }
    public decimal Payable { get; set; }
}
