using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Services.Interfaces;

public interface IFeeService
{
    Task<FeeTypeResponse?> CreateFeeTypeAsync(CreateFeeTypeRequest request);
    Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int id);
    Task<FeeTypeResponse?> UpdateFeeTypeAsync(int id, UpdateFeeTypeRequest request);
    Task<bool> DeleteFeeTypeAsync(int id);

    Task<FeeStructureResponse?> CreateFeeStructureAsync(CreateFeeStructureRequest request);
    Task<IEnumerable<FeeStructureResponse>> GetFeeStructuresAsync(int? campusId = null);
    Task<FeeStructureResponse?> GetFeeStructureByIdAsync(int id);
    Task<FeeStructureResponse?> UpdateFeeStructureAsync(int id, UpdateFeeStructureRequest request);
    Task<bool> DeleteFeeStructureAsync(int id);
    Task<FeeStructureItemResponse?> AddFeeStructureItemAsync(int id, CreateFeeStructureItemRequest request);
    Task<IEnumerable<FeeStructureItemResponse>> GetFeeStructureItemsAsync(int id);
    Task<FeeStructureItemResponse?> UpdateFeeStructureItemAsync(int id, UpdateFeeStructureItemRequest request);
    Task<bool> DeleteFeeStructureItemAsync(int id);

    Task<ScholarshipResponse?> CreateScholarshipAsync(CreateScholarshipRequest request);
    Task<IEnumerable<ScholarshipResponse>> GetScholarshipsAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<ScholarshipResponse?> GetScholarshipByIdAsync(int id);
    Task<ScholarshipResponse?> UpdateScholarshipAsync(int id, UpdateScholarshipRequest request);
    Task<bool> DeleteScholarshipAsync(int id);

    Task<StudentFeeResponse?> AssignStudentFeeAsync(AssignStudentFeeRequest request);
    Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int id);
    Task<IEnumerable<StudentFeeLedgerResponse>> GetStudentFeeLedgerAsync(int? campusId, int? academicYearId, int? groupId, int? sectionId, string? paymentPlan, string? status, string? search, int? boardId = null);
    Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int studentId);
    Task<FeeConcessionResponse?> ApplyFeeConcessionAsync(ApplyFeeConcessionRequest request);

    Task<PaymentPlanResponse?> CreatePaymentPlanAsync(CreatePaymentPlanRequest request);
    Task<FeeScheduleResponse?> AddPaymentPlanInstallmentAsync(int planId, CreateInstallmentRequest request);

    Task<FeePaymentResponse?> CreateFeePaymentAsync(CreateFeePaymentRequest request);
    Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int studentId);
    Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int id);
    Task<FeeReceiptResponse?> GetReceiptAsync(string receiptNumber);

    Task<IEnumerable<FeeCollectionResponse>> GetFeeCollectionAsync(int? campusId, string? search, int? boardId = null, int? academicYearId = null);
    Task<IEnumerable<FeeDueResponse>> GetDueAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<FeeDashboardResponse> GetDashboardAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<FeeReportResponse> GetDailyReportAsync(int? campusId, DateTime? date);
    Task<FeeReportResponse> GetMonthlyReportAsync(int? campusId, int? year, int? month);

    // ---------------- Fee Transition & Lifecycle Helpers ----------------
    Task<FeeStructureResponse?> GetMatchingFeeStructureAsync(int? campusId, int boardId, int academicYearId, int? academicLevelId, int groupId, int? programId = null);
    Task<PromotionFeePreviewResponse> PreviewPromotionFeeAsync(PromotionFeePreviewRequest request);
    Task<StudentFeeResponse?> AssignPromotionFeeAsync(int studentId, int feeStructureId, string? paymentPlan = "Full Payment", int numberOfInstallments = 1, string performedBy = "System");
    Task<CampusTransferFeePreviewDto?> PreviewCampusTransferFeeAsync(int transferId);
    Task ApplyCampusTransferFeeAsync(int studentId, int toCampusId, int? destinationFeeStructureId, bool transferPaidCredit = true, string performedBy = "System");
    Task<ProgramFeeAdjustmentPreviewDto?> PreviewProgramFeeAdjustmentAsync(int studentId, int targetProgramId);
    Task ApplyProgramFeeAdjustmentAsync(int studentId, int targetProgramId, int? targetFeeStructureId = null, string performedBy = "System");
}
