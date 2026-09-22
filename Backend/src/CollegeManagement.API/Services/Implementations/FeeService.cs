using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations;

public class FeeService : IFeeService
{
    private readonly IFeeRepository _repo;
    public FeeService(IFeeRepository repo) => _repo = repo;

    private static void Id(int value, string name) { if (value <= 0) throw new ArgumentException($"{name} must be greater than zero."); }
    private static string Text(string? value, string name) { if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{name} is required."); return value.Trim(); }
    private static void DiscountType(string? type) { var v = Text(type, "DiscountType"); if (!v.Equals("Percentage", StringComparison.OrdinalIgnoreCase) && !v.Equals("Fixed", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("DiscountType must be Percentage or Fixed."); }
    private static void Category(string? category) { var v = Text(category, "Category"); var allowed = new[] { "Admission", "Academic", "Examination", "Transport", "Hostel", "Activities", "Miscellaneous" }; if (!allowed.Contains(v, StringComparer.OrdinalIgnoreCase)) throw new ArgumentException("Category must be Admission, Academic, Examination, Transport, Hostel, Activities or Miscellaneous."); }

    public Task<FeeTypeResponse?> CreateFeeTypeAsync(CreateFeeTypeRequest r) { Text(r.FeeTypeName, "FeeTypeName"); Category(r.Category); return _repo.CreateFeeTypeAsync(r); }
    public Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync() => _repo.GetFeeTypesAsync();
    public Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int id) { Id(id, "FeeTypeId"); return _repo.GetFeeTypeByIdAsync(id); }
    public Task<FeeTypeResponse?> UpdateFeeTypeAsync(int id, UpdateFeeTypeRequest r) { Id(id, "FeeTypeId"); Text(r.FeeTypeName, "FeeTypeName"); Category(r.Category); return _repo.UpdateFeeTypeAsync(id, r); }
    public Task<bool> DeleteFeeTypeAsync(int id) { Id(id, "FeeTypeId"); return _repo.DeleteFeeTypeAsync(id); }

    public async Task<FeeStructureResponse?> CreateFeeStructureAsync(CreateFeeStructureRequest r)
    {
        Id(r.BoardId, "BoardId"); Id(r.AcademicYearId, "AcademicYearId"); Id(r.GroupId, "GroupId");
        if (r.Items.Count == 0) throw new ArgumentException("At least one fee type is required.");
        if (r.Items.Any(x => x.Amount <= 0)) throw new ArgumentException("All fee amounts must be greater than zero.");
        foreach (var item in r.Items) { Id(item.FeeTypeId, "FeeTypeId"); item.Rule = Text(item.Rule, "Rule"); if (!item.Rule.Equals("Mandatory", StringComparison.OrdinalIgnoreCase) && !item.Rule.Equals("Optional", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("Rule must be Mandatory or Optional."); }
        return await _repo.CreateFeeStructureAsync(r);
    }
    public Task<IEnumerable<FeeStructureResponse>> GetFeeStructuresAsync() => _repo.GetFeeStructuresAsync();
    public Task<FeeStructureResponse?> GetFeeStructureByIdAsync(int id) { Id(id, "FeeStructureId"); return _repo.GetFeeStructureByIdAsync(id); }
    public Task<FeeStructureResponse?> UpdateFeeStructureAsync(int id, UpdateFeeStructureRequest r) { Id(id, "FeeStructureId"); return _repo.UpdateFeeStructureAsync(id, r); }
    public Task<bool> DeleteFeeStructureAsync(int id) { Id(id, "FeeStructureId"); return _repo.DeleteFeeStructureAsync(id); }
    public Task<FeeStructureItemResponse?> AddFeeStructureItemAsync(int id, CreateFeeStructureItemRequest r) { Id(id, "FeeStructureId"); Id(r.FeeTypeId, "FeeTypeId"); if (r.Amount <= 0) throw new ArgumentException("Amount must be greater than zero."); r.Rule = Text(r.Rule, "Rule"); return _repo.AddFeeStructureItemAsync(id, r); }
    public Task<IEnumerable<FeeStructureItemResponse>> GetFeeStructureItemsAsync(int id) { Id(id, "FeeStructureId"); return _repo.GetFeeStructureItemsAsync(id); }
    public Task<FeeStructureItemResponse?> UpdateFeeStructureItemAsync(int id, UpdateFeeStructureItemRequest r) { Id(id, "FeeStructureItemId"); if (r.Amount <= 0) throw new ArgumentException("Amount must be greater than zero."); r.Rule = Text(r.Rule, "Rule"); return _repo.UpdateFeeStructureItemAsync(id, r); }
    public Task<bool> DeleteFeeStructureItemAsync(int id) { Id(id, "FeeStructureItemId"); return _repo.DeleteFeeStructureItemAsync(id); }

    public Task<ScholarshipResponse?> CreateScholarshipAsync(CreateScholarshipRequest r) { Text(r.ScholarshipName, "ScholarshipName"); DiscountType(r.DiscountType); if (r.DiscountValue <= 0 || (r.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) && r.DiscountValue > 100)) throw new ArgumentException("Invalid discount value."); return _repo.CreateScholarshipAsync(r); }
    public Task<IEnumerable<ScholarshipResponse>> GetScholarshipsAsync() => _repo.GetScholarshipsAsync();
    public Task<ScholarshipResponse?> GetScholarshipByIdAsync(int id) { Id(id, "ScholarshipId"); return _repo.GetScholarshipByIdAsync(id); }
    public Task<ScholarshipResponse?> UpdateScholarshipAsync(int id, UpdateScholarshipRequest r) { Id(id, "ScholarshipId"); Text(r.ScholarshipName, "ScholarshipName"); DiscountType(r.DiscountType); if (r.DiscountValue <= 0 || (r.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) && r.DiscountValue > 100)) throw new ArgumentException("Invalid discount value."); return _repo.UpdateScholarshipAsync(id, r); }
    public Task<bool> DeleteScholarshipAsync(int id) { Id(id, "ScholarshipId"); return _repo.DeleteScholarshipAsync(id); }

    public Task<StudentFeeResponse?> AssignStudentFeeAsync(AssignStudentFeeRequest r) { Id(r.StudentId, "StudentId"); Id(r.FeeStructureId, "FeeStructureId"); return _repo.AssignStudentFeeAsync(r); }
    public Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int id) { Id(id, "StudentFeeId"); return _repo.GetStudentFeeAsync(id); }
    public Task<IEnumerable<StudentFeeLedgerResponse>> GetStudentFeeLedgerAsync(int? ay, int? group, int? section, string? plan, string? status, string? search) => _repo.GetStudentFeeLedgerAsync(ay, group, section, plan, status, search);
    public Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int id) { Id(id, "StudentId"); return _repo.GetStudentFeeDetailsByStudentAsync(id); }

    public Task<FeeConcessionResponse?> ApplyFeeConcessionAsync(ApplyFeeConcessionRequest r)
    {
        Id(r.StudentId, "StudentId"); Id(r.StudentFeeId, "StudentFeeId");
        if (!r.ScholarshipId.HasValue && string.IsNullOrWhiteSpace(r.DiscountType)) throw new ArgumentException("ScholarshipId or DiscountType is required.");
        if (r.DiscountType != null) DiscountType(r.DiscountType);
        if (r.DiscountValue.HasValue && r.DiscountValue.Value < 0) throw new ArgumentException("DiscountValue cannot be negative.");
        return _repo.ApplyFeeConcessionAsync(r);
    }

    public Task<PaymentPlanResponse?> CreatePaymentPlanAsync(
     CreatePaymentPlanRequest r)
    {
        Id(r.StudentFeeId, "StudentFeeId");
        Text(r.PlanName, "PlanName");

        if (r.NumberOfInstallments <= 0)
            throw new ArgumentException(
                "NumberOfInstallments must be greater than zero.");

        return _repo.CreatePaymentPlanAsync(r);
    }
    public Task<FeeScheduleResponse?> AddPaymentPlanInstallmentAsync(int id, CreateInstallmentRequest r) { Id(id, "PaymentPlanId"); Id(r.InstallmentNumber, "InstallmentNumber"); if (r.Amount <= 0) throw new ArgumentException("Installment amount must be greater than zero."); return _repo.AddPaymentPlanInstallmentAsync(id, r); }

    public Task<FeePaymentResponse?> CreateFeePaymentAsync(CreateFeePaymentRequest r)
    {
        Id(r.StudentId, "StudentId"); Id(r.StudentFeeId, "StudentFeeId");
        if (r.FeeInstallmentId.HasValue) Id(r.FeeInstallmentId.Value, "FeeInstallmentId");
        if (r.Amount <= 0) throw new ArgumentException("Payment amount must be greater than zero.");
        Text(r.PaymentMode, "PaymentMode");
        if (r.Discount < 0 || r.Fine < 0) throw new ArgumentException("Discount and Fine cannot be negative.");
        return _repo.CreateFeePaymentAsync(r);
    }
    public Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int id) { Id(id, "StudentId"); return _repo.GetFeePaymentsAsync(id); }
    public Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int id) { Id(id, "FeePaymentId"); return _repo.GetFeePaymentByIdAsync(id); }
    public Task<FeeReceiptResponse?> GetReceiptAsync(string number) { Text(number, "ReceiptNumber"); return _repo.GetReceiptAsync(number.Trim()); }
    public Task<IEnumerable<FeeCollectionResponse>> GetFeeCollectionAsync(string? search) => _repo.GetFeeCollectionAsync(search?.Trim());
    public Task<IEnumerable<FeeDueResponse>> GetDueAsync() => _repo.GetDueAsync();
    public Task<FeeDashboardResponse> GetDashboardAsync() => _repo.GetDashboardAsync();
    public Task<FeeReportResponse> GetDailyReportAsync(DateTime? date) => _repo.GetDailyReportAsync(date);
    public Task<FeeReportResponse> GetMonthlyReportAsync(int? year, int? month) { if (year.HasValue && (year < 2000 || year > 2100)) throw new ArgumentException("Invalid year."); if (month.HasValue && (month < 1 || month > 12)) throw new ArgumentException("Invalid month."); return _repo.GetMonthlyReportAsync(year, month); }
}
