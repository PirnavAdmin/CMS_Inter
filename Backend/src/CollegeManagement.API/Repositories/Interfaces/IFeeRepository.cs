using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Repositories.Interfaces;

public interface IFeeRepository
{
    Task<FeeTypeResponse?> CreateFeeTypeAsync(CreateFeeTypeRequest request);
    Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync();
    Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int feeTypeId);
    Task<FeeTypeResponse?> UpdateFeeTypeAsync(int feeTypeId, UpdateFeeTypeRequest request);
    Task<bool> DeleteFeeTypeAsync(int feeTypeId);

    Task<FeeStructureResponse?> CreateFeeStructureAsync(CreateFeeStructureRequest request);
    Task<IEnumerable<FeeStructureResponse>> GetFeeStructuresAsync();
    Task<FeeStructureResponse?> GetFeeStructureByIdAsync(int feeStructureId);
    Task<FeeStructureResponse?> UpdateFeeStructureAsync(int feeStructureId, UpdateFeeStructureRequest request);
    Task<bool> DeleteFeeStructureAsync(int feeStructureId);
    Task<FeeStructureItemResponse?> AddFeeStructureItemAsync(int feeStructureId, CreateFeeStructureItemRequest request);
    Task<IEnumerable<FeeStructureItemResponse>> GetFeeStructureItemsAsync(int feeStructureId);
    Task<FeeStructureItemResponse?> UpdateFeeStructureItemAsync(int itemId, UpdateFeeStructureItemRequest request);
    Task<bool> DeleteFeeStructureItemAsync(int itemId);

    Task<ScholarshipResponse?> CreateScholarshipAsync(CreateScholarshipRequest request);
    Task<IEnumerable<ScholarshipResponse>> GetScholarshipsAsync();
    Task<ScholarshipResponse?> GetScholarshipByIdAsync(int scholarshipId);
    Task<ScholarshipResponse?> UpdateScholarshipAsync(int scholarshipId, UpdateScholarshipRequest request);
    Task<bool> DeleteScholarshipAsync(int scholarshipId);

    Task<StudentFeeResponse?> AssignStudentFeeAsync(AssignStudentFeeRequest request);
    Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int studentFeeId);
    Task<IEnumerable<StudentFeeLedgerResponse>> GetStudentFeeLedgerAsync(int? academicYearId = null, int? groupId = null, int? sectionId = null, string? paymentPlan = null, string? status = null, string? search = null);
    Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int studentId);

    Task<FeeConcessionResponse?> ApplyFeeConcessionAsync(ApplyFeeConcessionRequest request);

    Task<PaymentPlanResponse?> CreatePaymentPlanAsync(CreatePaymentPlanRequest request);
    Task<FeeScheduleResponse?> AddPaymentPlanInstallmentAsync(int paymentPlanId, CreateInstallmentRequest request);

    Task<FeePaymentResponse?> CreateFeePaymentAsync(CreateFeePaymentRequest request);
    Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int studentId);
    Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int feePaymentId);
    Task<FeeReceiptResponse?> GetReceiptAsync(string receiptNumber);

    Task<IEnumerable<FeeCollectionResponse>> GetFeeCollectionAsync(string? search = null);
    Task<IEnumerable<FeeDueResponse>> GetDueAsync();
    Task<FeeDashboardResponse> GetDashboardAsync();
    Task<FeeReportResponse> GetDailyReportAsync(DateTime? date = null);
    Task<FeeReportResponse> GetMonthlyReportAsync(int? year = null, int? month = null);
}
