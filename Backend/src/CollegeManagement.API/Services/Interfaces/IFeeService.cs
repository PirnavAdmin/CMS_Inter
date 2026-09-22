using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Services.Interfaces;

public interface IFeeService
{
    Task<FeeTypeResponse?> CreateFeeTypeAsync(CreateFeeTypeRequest request);
    Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync();
    Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int id);
    Task<FeeTypeResponse?> UpdateFeeTypeAsync(int id, UpdateFeeTypeRequest request);
    Task<bool> DeleteFeeTypeAsync(int id);

    Task<FeeStructureResponse?> CreateFeeStructureAsync(CreateFeeStructureRequest request);
    Task<IEnumerable<FeeStructureResponse>> GetFeeStructuresAsync();
    Task<FeeStructureResponse?> GetFeeStructureByIdAsync(int id);
    Task<FeeStructureResponse?> UpdateFeeStructureAsync(int id, UpdateFeeStructureRequest request);
    Task<bool> DeleteFeeStructureAsync(int id);
    Task<FeeStructureItemResponse?> AddFeeStructureItemAsync(int id, CreateFeeStructureItemRequest request);
    Task<IEnumerable<FeeStructureItemResponse>> GetFeeStructureItemsAsync(int id);
    Task<FeeStructureItemResponse?> UpdateFeeStructureItemAsync(int id, UpdateFeeStructureItemRequest request);
    Task<bool> DeleteFeeStructureItemAsync(int id);

    Task<ScholarshipResponse?> CreateScholarshipAsync(CreateScholarshipRequest request);
    Task<IEnumerable<ScholarshipResponse>> GetScholarshipsAsync();
    Task<ScholarshipResponse?> GetScholarshipByIdAsync(int id);
    Task<ScholarshipResponse?> UpdateScholarshipAsync(int id, UpdateScholarshipRequest request);
    Task<bool> DeleteScholarshipAsync(int id);

    Task<StudentFeeResponse?> AssignStudentFeeAsync(AssignStudentFeeRequest request);
    Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int id);
    Task<IEnumerable<StudentFeeLedgerResponse>> GetStudentFeeLedgerAsync(int? academicYearId, int? groupId, int? sectionId, string? paymentPlan, string? status, string? search);
    Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int studentId);
    Task<FeeConcessionResponse?> ApplyFeeConcessionAsync(ApplyFeeConcessionRequest request);

    Task<PaymentPlanResponse?> CreatePaymentPlanAsync(CreatePaymentPlanRequest request);
    Task<FeeScheduleResponse?> AddPaymentPlanInstallmentAsync(int planId, CreateInstallmentRequest request);

    Task<FeePaymentResponse?> CreateFeePaymentAsync(CreateFeePaymentRequest request);
    Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int studentId);
    Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int id);
    Task<FeeReceiptResponse?> GetReceiptAsync(string receiptNumber);

    Task<IEnumerable<FeeCollectionResponse>> GetFeeCollectionAsync(string? search);
    Task<IEnumerable<FeeDueResponse>> GetDueAsync();
    Task<FeeDashboardResponse> GetDashboardAsync();
    Task<FeeReportResponse> GetDailyReportAsync(DateTime? date);
    Task<FeeReportResponse> GetMonthlyReportAsync(int? year, int? month);
}
