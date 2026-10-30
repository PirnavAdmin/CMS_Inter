using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Implementations;

public class FeeService : IFeeService
{
    private readonly IFeeRepository _repo;
    private readonly INumberSeriesService _numberSeriesService;

    public FeeService(IFeeRepository repo, INumberSeriesService numberSeriesService)
    {
        _repo = repo;
        _numberSeriesService = numberSeriesService;
    }

    private static void Id(int value, string name) { if (value <= 0) throw new ArgumentException($"{name} must be greater than zero."); }
    private static string Text(string? value, string name) { if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{name} is required."); return value.Trim(); }
    private static void DiscountType(string? type) { var v = Text(type, "DiscountType"); if (!v.Equals("Percentage", StringComparison.OrdinalIgnoreCase) && !v.Equals("Fixed", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("DiscountType must be Percentage or Fixed."); }
    private static void Category(string? category) { var v = Text(category, "Category"); var allowed = new[] { "Admission", "Academic", "Examination", "Transport", "Hostel", "Activities", "Activity", "Facility", "Other", "Miscellaneous" }; if (!allowed.Contains(v, StringComparer.OrdinalIgnoreCase)) throw new ArgumentException("Category must be Admission, Academic, Examination, Transport, Hostel, Activities, Activity, Facility, Other or Miscellaneous."); }

    public Task<FeeTypeResponse?> CreateFeeTypeAsync(CreateFeeTypeRequest r) { Text(r.FeeTypeName, "FeeTypeName"); Category(r.Category); return _repo.CreateFeeTypeAsync(r); }
    public Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync(int? campusId = null, int? boardId = null, int? academicYearId = null) => _repo.GetFeeTypesAsync(campusId, boardId, academicYearId);
    public Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int id) { Id(id, "FeeTypeId"); return _repo.GetFeeTypeByIdAsync(id); }
    public Task<FeeTypeResponse?> UpdateFeeTypeAsync(int id, UpdateFeeTypeRequest r) { Id(id, "FeeTypeId"); Text(r.FeeTypeName, "FeeTypeName"); Category(r.Category); return _repo.UpdateFeeTypeAsync(id, r); }
    public Task<bool> DeleteFeeTypeAsync(int id) { Id(id, "FeeTypeId"); return _repo.DeleteFeeTypeAsync(id); }

    public async Task<FeeStructureResponse?> CreateFeeStructureAsync(CreateFeeStructureRequest r)
    {
        Id(r.BoardId, "BoardId"); Id(r.AcademicYearId, "AcademicYearId"); Id(r.GroupId, "GroupId");
        if (r.Items == null || r.Items.Count == 0) throw new ArgumentException("At least one fee type is required.");
        if (r.Items.Any(x => x.Amount <= 0)) throw new ArgumentException("All fee amounts must be greater than zero.");
        foreach (var item in r.Items) { Id(item.FeeTypeId, "FeeTypeId"); item.Rule = Text(item.Rule, "Rule"); if (!item.Rule.Equals("Mandatory", StringComparison.OrdinalIgnoreCase) && !item.Rule.Equals("Optional", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("Rule must be Mandatory or Optional."); }
        return await _repo.CreateFeeStructureAsync(r);
    }
    public Task<IEnumerable<FeeStructureResponse>> GetFeeStructuresAsync(int? campusId = null) => _repo.GetFeeStructuresAsync(campusId);
    public Task<FeeStructureResponse?> GetFeeStructureByIdAsync(int id) { Id(id, "FeeStructureId"); return _repo.GetFeeStructureByIdAsync(id); }
    public Task<FeeStructureResponse?> UpdateFeeStructureAsync(int id, UpdateFeeStructureRequest r) { Id(id, "FeeStructureId"); return _repo.UpdateFeeStructureAsync(id, r); }
    public Task<bool> DeleteFeeStructureAsync(int id) { Id(id, "FeeStructureId"); return _repo.DeleteFeeStructureAsync(id); }
    public Task<FeeStructureItemResponse?> AddFeeStructureItemAsync(int id, CreateFeeStructureItemRequest r) { Id(id, "FeeStructureId"); Id(r.FeeTypeId, "FeeTypeId"); if (r.Amount <= 0) throw new ArgumentException("Amount must be greater than zero."); r.Rule = Text(r.Rule, "Rule"); return _repo.AddFeeStructureItemAsync(id, r); }
    public Task<IEnumerable<FeeStructureItemResponse>> GetFeeStructureItemsAsync(int id) { Id(id, "FeeStructureId"); return _repo.GetFeeStructureItemsAsync(id); }
    public Task<FeeStructureItemResponse?> UpdateFeeStructureItemAsync(int id, UpdateFeeStructureItemRequest r) { Id(id, "FeeStructureItemId"); if (r.Amount <= 0) throw new ArgumentException("Amount must be greater than zero."); r.Rule = Text(r.Rule, "Rule"); return _repo.UpdateFeeStructureItemAsync(id, r); }
    public Task<bool> DeleteFeeStructureItemAsync(int id) { Id(id, "FeeStructureItemId"); return _repo.DeleteFeeStructureItemAsync(id); }

    public Task<ScholarshipResponse?> CreateScholarshipAsync(CreateScholarshipRequest r) { Text(r.ScholarshipName, "ScholarshipName"); DiscountType(r.DiscountType); if (r.DiscountValue <= 0 || (r.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) && r.DiscountValue > 100)) throw new ArgumentException("Invalid discount value."); return _repo.CreateScholarshipAsync(r); }
    public Task<IEnumerable<ScholarshipResponse>> GetScholarshipsAsync(int? campusId = null, int? boardId = null, int? academicYearId = null) => _repo.GetScholarshipsAsync(campusId, boardId, academicYearId);
    public Task<ScholarshipResponse?> GetScholarshipByIdAsync(int id) { Id(id, "ScholarshipId"); return _repo.GetScholarshipByIdAsync(id); }
    public Task<ScholarshipResponse?> UpdateScholarshipAsync(int id, UpdateScholarshipRequest r) { Id(id, "ScholarshipId"); Text(r.ScholarshipName, "ScholarshipName"); DiscountType(r.DiscountType); if (r.DiscountValue <= 0 || (r.DiscountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase) && r.DiscountValue > 100)) throw new ArgumentException("Invalid discount value."); return _repo.UpdateScholarshipAsync(id, r); }
    public Task<bool> DeleteScholarshipAsync(int id) { Id(id, "ScholarshipId"); return _repo.DeleteScholarshipAsync(id); }

    public Task<StudentFeeResponse?> AssignStudentFeeAsync(AssignStudentFeeRequest r) { Id(r.StudentId, "StudentId"); Id(r.FeeStructureId, "FeeStructureId"); return _repo.AssignStudentFeeAsync(r); }
    public Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int id) { Id(id, "StudentFeeId"); return _repo.GetStudentFeeAsync(id); }
    public Task<IEnumerable<StudentFeeLedgerResponse>> GetStudentFeeLedgerAsync(int? campusId, int? ay, int? group, int? section, string? plan, string? status, string? search, int? boardId = null) => _repo.GetStudentFeeLedgerAsync(campusId, ay, group, section, plan, status, search, boardId);
    public Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int id) { Id(id, "StudentId"); return _repo.GetStudentFeeDetailsByStudentAsync(id); }
    public Task<Dictionary<int, StudentFeeDetailsResponse?>> GetBulkStudentFeeDetailsAsync(IEnumerable<int> studentIds) => _repo.GetBulkStudentFeeDetailsAsync(studentIds);

    public Task<FeeConcessionResponse?> ApplyFeeConcessionAsync(ApplyFeeConcessionRequest r)
    {
        Id(r.StudentId, "StudentId"); Id(r.StudentFeeId, "StudentFeeId");
        if (!r.ScholarshipId.HasValue && string.IsNullOrWhiteSpace(r.DiscountType)) throw new ArgumentException("ScholarshipId or DiscountType is required.");
        if (r.DiscountType != null) DiscountType(r.DiscountType);
        if (r.DiscountValue.HasValue && r.DiscountValue.Value < 0) throw new ArgumentException("DiscountValue cannot be negative.");
        return _repo.ApplyFeeConcessionAsync(r);
    }

    public Task<PaymentPlanResponse?> CreatePaymentPlanAsync(CreatePaymentPlanRequest r)
    {
        Id(r.StudentFeeId, "StudentFeeId");
        Text(r.PlanName, "PlanName");
        if (r.NumberOfInstallments <= 0) throw new ArgumentException("NumberOfInstallments must be greater than zero.");
        return _repo.CreatePaymentPlanAsync(r);
    }
    public Task<FeeScheduleResponse?> AddPaymentPlanInstallmentAsync(int id, CreateInstallmentRequest r) { Id(id, "PaymentPlanId"); Id(r.InstallmentNumber, "InstallmentNumber"); if (r.Amount <= 0) throw new ArgumentException("Installment amount must be greater than zero."); return _repo.AddPaymentPlanInstallmentAsync(id, r); }

    public Task<FeePaymentResponse?> CreateFeePaymentAsync(CreateFeePaymentRequest r)
    {
        Id(r.StudentId, "StudentId"); Id(r.StudentFeeId, "StudentFeeId");
        if (r.FeeInstallmentIds != null && r.FeeInstallmentIds.Any())
        {
            foreach (var id in r.FeeInstallmentIds) Id(id, "FeeInstallmentId");
        }
        if (r.Amount <= 0) throw new ArgumentException("Payment amount must be greater than zero.");
        Text(r.PaymentMode, "PaymentMode");
        if (r.Discount < 0 || r.Fine < 0) throw new ArgumentException("Discount and Fine cannot be negative.");
        return _repo.CreateFeePaymentAsync(r);
    }

    public Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int id) { Id(id, "StudentId"); return _repo.GetFeePaymentsAsync(id); }
    public Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int id) { Id(id, "FeePaymentId"); return _repo.GetFeePaymentByIdAsync(id); }
    public Task<FeeReceiptResponse?> GetReceiptAsync(string number) { Text(number, "ReceiptNumber"); return _repo.GetReceiptAsync(number.Trim()); }
    public Task<IEnumerable<FeeCollectionResponse>> GetFeeCollectionAsync(int? campusId, string? search, int? boardId = null, int? academicYearId = null) => _repo.GetFeeCollectionAsync(campusId, search?.Trim(), boardId, academicYearId);
    public Task<IEnumerable<FeeDueResponse>> GetDueAsync(int? campusId = null, int? boardId = null, int? academicYearId = null) => _repo.GetDueAsync(campusId, boardId, academicYearId);
    public Task<FeeDashboardResponse> GetDashboardAsync(int? campusId = null, int? boardId = null, int? academicYearId = null) => _repo.GetDashboardAsync(campusId, boardId, academicYearId);
    public Task<FeeReportResponse> GetDailyReportAsync(int? campusId, DateTime? date) => _repo.GetDailyReportAsync(campusId, date);
    public Task<FeeReportResponse> GetMonthlyReportAsync(int? campusId, int? year, int? month) { if (year.HasValue && (year < 2000 || year > 2100)) throw new ArgumentException("Invalid year."); if (month.HasValue && (month < 1 || month > 12)) throw new ArgumentException("Invalid month."); return _repo.GetMonthlyReportAsync(campusId, year, month); }

    // ---------------- Fee Transition & Lifecycle Helpers ----------------

    public Task<FeeStructureResponse?> GetMatchingFeeStructureAsync(int? campusId, int boardId, int academicYearId, int? academicLevelId, int groupId, int? programId = null)
    {
        return _repo.GetMatchingFeeStructureAsync(campusId, boardId, academicYearId, academicLevelId, groupId, programId);
    }

    public async Task<PromotionFeePreviewResponse> PreviewPromotionFeeAsync(PromotionFeePreviewRequest request)
    {
        int effectiveBoardId = request.BoardId > 0 ? request.BoardId : (request.TargetBoardId ?? 0);
        int? effectiveCampusId = request.CampusId ?? request.TargetCampusId;

        var match = await _repo.GetMatchingFeeStructureAsync(
            effectiveCampusId,
            effectiveBoardId,
            request.TargetAcademicYearId,
            request.TargetAcademicLevelId,
            request.TargetGroupId,
            request.TargetProgramId);

        var structures = await _repo.GetFeeStructuresAsync(effectiveCampusId);
        var availableFeeStructures = structures
            .Where(f => (effectiveBoardId <= 0 || f.BoardId == effectiveBoardId) && f.GroupId == request.TargetGroupId)
            .ToList();

        var response = new PromotionFeePreviewResponse
        {
            FeeStructureId = match?.FeeStructureId,
            StructureName = match?.StructureName,
            TotalAmount = match?.TotalAmount ?? 0,
            Components = match?.Items ?? new List<FeeStructureItemResponse>(),
            AvailableFeeStructures = availableFeeStructures,
            StudentsCount = request.StudentIds?.Count ?? 0
        };

        if (request.StudentIds != null && request.StudentIds.Any())
        {
            var studentFeeDict = await _repo.GetBulkStudentFeeDetailsAsync(request.StudentIds);
            var arrearsStudents = studentFeeDict.Values.Where(s => s != null && s.BalanceAmount > 0).ToList();
            response.StudentsWithPriorArrears = arrearsStudents.Count;
            response.TotalPriorArrears = arrearsStudents.Sum(x => x!.BalanceAmount);
        }

        return response;
    }

    public Task<StudentFeeResponse?> AssignPromotionFeeAsync(int studentId, int feeStructureId, string? paymentPlan = "Full Payment", int numberOfInstallments = 1, string performedBy = "System")
    {
        Id(studentId, "StudentId");
        Id(feeStructureId, "FeeStructureId");

        var assignRequest = new AssignStudentFeeRequest
        {
            StudentId = studentId,
            FeeStructureId = feeStructureId,
            PlanName = string.IsNullOrWhiteSpace(paymentPlan) ? "Full Payment" : paymentPlan,
            NumberOfInstallments = numberOfInstallments > 0 ? numberOfInstallments : 1
        };

        return _repo.AssignStudentFeeAsync(assignRequest);
    }

    public async Task<CampusTransferFeePreviewDto?> PreviewCampusTransferFeeAsync(int transferId)
    {
        var preview = await _repo.PreviewCampusTransferFeeAsync(transferId);
        if (preview == null) return null;

        var studentFee = await _repo.GetStudentFeeDetailsByStudentAsync(preview.StudentId);
        if (studentFee != null)
        {
            preview.CurrentFeeStructureId = studentFee.FeeStructureId;
            preview.CurrentFeeStructureName = studentFee.StructureName;
            preview.CurrentTotalAmount = studentFee.TotalAmount;
            preview.CurrentPaidAmount = studentFee.PaidAmount;
            preview.CurrentBalanceAmount = studentFee.BalanceAmount;
        }

        var destStructure = await _repo.GetMatchingFeeStructureAsync(
            preview.ToCampusId,
            0,
            0,
            null,
            studentFee?.GroupId ?? 0,
            studentFee?.ProgramId);

        if (destStructure != null)
        {
            preview.DestinationFeeStructureId = destStructure.FeeStructureId;
            preview.DestinationFeeStructureName = destStructure.StructureName;
            preview.DestinationTotalAmount = destStructure.TotalAmount;
            preview.TransferableCredit = preview.CurrentPaidAmount;
            preview.EstimatedNewBalance = Math.Max(0, destStructure.TotalAmount - preview.TransferableCredit);
        }

        return preview;
    }

    public async Task ApplyCampusTransferFeeAsync(int studentId, int toCampusId, int? destinationFeeStructureId, bool transferPaidCredit = true, string performedBy = "System")
    {
        await _repo.ApplyCampusTransferFeeAsync(studentId, toCampusId, destinationFeeStructureId, transferPaidCredit, performedBy);
    }

    public async Task<ProgramFeeAdjustmentPreviewDto?> PreviewProgramFeeAdjustmentAsync(int studentId, int targetProgramId)
    {
        var preview = await _repo.PreviewProgramFeeAdjustmentAsync(studentId, targetProgramId);
        if (preview == null) return null;

        var studentFee = await _repo.GetStudentFeeDetailsByStudentAsync(studentId);
        var targetStructure = await _repo.GetMatchingFeeStructureAsync(
            preview.CampusId,
            0,
            0,
            null,
            studentFee?.GroupId ?? 0,
            targetProgramId);

        decimal currentTotal = preview.CurrentTotalAmount;
        decimal currentPaid = preview.CurrentPaidAmount;
        decimal targetTotal = targetStructure?.TotalAmount ?? 0m;
        decimal diff = targetTotal - currentTotal;
        decimal revisedBalance = Math.Max(0, targetTotal - currentPaid);

        preview.TargetFeeStructureId = targetStructure?.FeeStructureId;
        preview.TargetFeeStructureName = targetStructure?.StructureName;
        preview.TargetTotalAmount = targetTotal;
        preview.DifferentialAmount = diff;
        preview.RevisedBalanceAmount = revisedBalance;

        return preview;
    }

    public async Task ApplyProgramFeeAdjustmentAsync(int studentId, int targetProgramId, int? targetFeeStructureId = null, string performedBy = "System")
    {
        int? structureId = targetFeeStructureId;
        if (!structureId.HasValue || structureId <= 0)
        {
            var studentFee = await _repo.GetStudentFeeDetailsByStudentAsync(studentId);
            var match = await _repo.GetMatchingFeeStructureAsync(
                studentFee?.CampusId,
                0,
                0,
                null,
                studentFee?.GroupId ?? 0,
                targetProgramId);
            structureId = match?.FeeStructureId;
        }

        if (structureId.HasValue && structureId > 0)
        {
            var studentFee = await _repo.GetStudentFeeDetailsByStudentAsync(studentId);
            await _repo.ApplyCampusTransferFeeAsync(studentId, studentFee?.CampusId ?? 1, structureId.Value, true, performedBy);
        }
    }
}
