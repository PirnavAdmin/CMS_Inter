using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Repositories.Interfaces;

public interface IFeeRepository
{
    Task<FeeTypeResponse?> CreateFeeTypeAsync(CreateFeeTypeRequest request);
    Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int feeTypeId);
    Task<FeeTypeResponse?> UpdateFeeTypeAsync(int feeTypeId, UpdateFeeTypeRequest request);
    Task<bool> DeleteFeeTypeAsync(int feeTypeId);

    Task<FeeStructureResponse?> CreateFeeStructureAsync(CreateFeeStructureRequest request);
    Task<IEnumerable<FeeStructureResponse>> GetFeeStructuresAsync(int? campusId = null);
    Task<FeeStructureResponse?> GetFeeStructureByIdAsync(int feeStructureId);
    Task<FeeStructureResponse?> UpdateFeeStructureAsync(int feeStructureId, UpdateFeeStructureRequest request);
    Task<bool> DeleteFeeStructureAsync(int feeStructureId);
    Task<FeeStructureItemResponse?> AddFeeStructureItemAsync(int feeStructureId, CreateFeeStructureItemRequest request);
    Task<IEnumerable<FeeStructureItemResponse>> GetFeeStructureItemsAsync(int feeStructureId);
    Task<FeeStructureItemResponse?> UpdateFeeStructureItemAsync(int itemId, UpdateFeeStructureItemRequest request);
    Task<bool> DeleteFeeStructureItemAsync(int itemId);

    Task<ScholarshipResponse?> CreateScholarshipAsync(CreateScholarshipRequest request);
    Task<IEnumerable<ScholarshipResponse>> GetScholarshipsAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<ScholarshipResponse?> GetScholarshipByIdAsync(int scholarshipId);
    Task<ScholarshipResponse?> UpdateScholarshipAsync(int scholarshipId, UpdateScholarshipRequest request);
    Task<bool> DeleteScholarshipAsync(int scholarshipId);

    Task<StudentFeeResponse?> AssignStudentFeeAsync(AssignStudentFeeRequest request);
    Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int studentFeeId);
    Task<IEnumerable<StudentFeeLedgerResponse>> GetStudentFeeLedgerAsync(int? campusId = null, int? academicYearId = null, int? groupId = null, int? sectionId = null, string? paymentPlan = null, string? status = null, string? search = null, int? boardId = null);
    Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int studentId);
    Task<Dictionary<int, StudentFeeDetailsResponse?>> GetBulkStudentFeeDetailsAsync(IEnumerable<int> studentIds);

    Task<FeeConcessionResponse?> ApplyFeeConcessionAsync(ApplyFeeConcessionRequest request);

    Task<PaymentPlanResponse?> CreatePaymentPlanAsync(CreatePaymentPlanRequest request);
    Task<FeeScheduleResponse?> AddPaymentPlanInstallmentAsync(int paymentPlanId, CreateInstallmentRequest request);

    Task<FeePaymentResponse?> CreateFeePaymentAsync(CreateFeePaymentRequest request);
    Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int studentId);
    Task<Dictionary<int, IEnumerable<FeePaymentResponse>>> GetBulkFeePaymentsAsync(IEnumerable<int> studentIds);
    Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int feePaymentId);
    Task<FeeReceiptResponse?> GetReceiptAsync(string receiptNumber);

    Task<IEnumerable<FeeCollectionResponse>> GetFeeCollectionAsync(int? campusId = null, string? search = null, int? boardId = null, int? academicYearId = null);
    Task<IEnumerable<FeeDueResponse>> GetDueAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<FeeDashboardResponse> GetDashboardAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
    Task<FeeReportResponse> GetDailyReportAsync(int? campusId = null, DateTime? date = null);
    Task<FeeReportResponse> GetMonthlyReportAsync(int? campusId = null, int? year = null, int? month = null);

    Task<FeeStructureResponse?> GetMatchingFeeStructureAsync(int? campusId, int boardId, int academicYearId, int? academicLevelId, int groupId, int? programId = null);
    Task<CampusTransferFeePreviewDto?> PreviewCampusTransferFeeAsync(int transferId);
    Task<bool> ApplyCampusTransferFeeAsync(int studentId, int toCampusId, int? destinationFeeStructureId, bool transferPaidCredit, string performedBy);
    Task<ProgramFeeAdjustmentPreviewDto?> PreviewProgramFeeAdjustmentAsync(int studentId, int targetProgramId);
}
