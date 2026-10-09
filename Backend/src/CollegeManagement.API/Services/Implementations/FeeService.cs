using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;
using Microsoft.EntityFrameworkCore;
using Dapper;
using System.Data;
using System.Linq;

namespace CollegeManagement.API.Services.Implementations;

public class FeeService : IFeeService
{
    private readonly IFeeRepository _repo;
    private readonly INumberSeriesService _numberSeriesService;
    private readonly AppDbContext _context;

    public FeeService(IFeeRepository repo, INumberSeriesService numberSeriesService, AppDbContext context)
    {
        _repo = repo;
        _numberSeriesService = numberSeriesService;
        _context = context;
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
    public async Task<FeeStructureResponse?> GetMatchingFeeStructureAsync(int? campusId, int boardId, int academicYearId, int? academicLevelId, int groupId, int? programId = null)
    {
        var query = _context.FeeStructures
            .AsNoTracking()
            .Include(f => f.Board)
            .Include(f => f.AcademicYear)
            .Include(f => f.Group)
            .Include(f => f.Program)
            .Include(f => f.Campus)
            .Include(f => f.Components.Where(c => c.IsActive))
                .ThenInclude(c => c.FeeType)
            .Where(f => f.IsActive && f.BoardId == boardId && f.AcademicYearId == academicYearId && f.GroupId == groupId);

        if (academicLevelId.HasValue && academicLevelId.Value > 0)
        {
            query = query.Where(f => f.AcademicLevelId == academicLevelId.Value);
        }

        var list = await query.ToListAsync();
        if (!list.Any()) return null;

        var match = list.FirstOrDefault(f => (programId.HasValue && f.ProgramId == programId.Value) && (campusId.HasValue && f.CampusId == campusId.Value))
                 ?? list.FirstOrDefault(f => (programId.HasValue && f.ProgramId == programId.Value) && f.CampusId == null)
                 ?? list.FirstOrDefault(f => f.ProgramId == null && (campusId.HasValue && f.CampusId == campusId.Value))
                 ?? list.FirstOrDefault(f => f.ProgramId == null && f.CampusId == null)
                 ?? list.FirstOrDefault();

        if (match == null) return null;

        return new FeeStructureResponse
        {
            FeeStructureId = match.FeeStructureId,
            CampusId = match.CampusId,
            CampusName = match.Campus?.CampusName ?? (match.CampusId.HasValue ? $"Campus {match.CampusId}" : "All Campuses"),
            BoardId = match.BoardId,
            BoardName = match.Board?.BoardName ?? string.Empty,
            AcademicYearId = match.AcademicYearId,
            AcademicYearName = match.AcademicYear?.AcademicYearName ?? string.Empty,
            GroupId = match.GroupId,
            GroupName = match.Group?.GroupName ?? string.Empty,
            ProgramId = match.ProgramId,
            ProgramName = match.Program?.ProgramName,
            StructureName = match.StructureName,
            TotalAmount = match.Components.Where(c => c.IsActive).Sum(c => c.Amount),
            IsActive = match.IsActive,
            CreatedAt = match.CreatedAt,
            UpdatedAt = match.UpdatedAt,
            Items = match.Components.Where(c => c.IsActive).Select(c => new FeeStructureItemResponse
            {
                FeeStructureComponentId = c.FeeStructureComponentId,
                FeeStructureId = c.FeeStructureId,
                FeeTypeId = c.FeeTypeId,
                FeeTypeName = c.FeeType?.FeeTypeName ?? string.Empty,
                Category = c.FeeType?.Category ?? string.Empty,
                Rule = c.Rule,
                Amount = c.Amount,
                IsActive = c.IsActive
            }).ToList()
        };
    }

    public async Task<PromotionFeePreviewResponse> PreviewPromotionFeeAsync(PromotionFeePreviewRequest request)
    {
        int? levelId = request.TargetAcademicLevelId;
        if ((!levelId.HasValue || levelId <= 0) && !string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
        {
            var level = await _context.AcademicLevels.FirstOrDefaultAsync(l => l.LevelName == request.TargetAcademicLevel);
            if (level != null) levelId = level.AcademicLevelId;
        }

        int effectiveBoardId = request.BoardId > 0 ? request.BoardId : (request.TargetBoardId ?? 0);
        int? effectiveCampusId = request.CampusId ?? request.TargetCampusId;

        var match = await GetMatchingFeeStructureAsync(
            effectiveCampusId,
            effectiveBoardId,
            request.TargetAcademicYearId,
            levelId,
            request.TargetGroupId,
            request.TargetProgramId);

        var response = new PromotionFeePreviewResponse
        {
            FeeStructureId = match?.FeeStructureId,
            StructureName = match?.StructureName,
            TotalAmount = match?.TotalAmount ?? 0,
            Components = match?.Items ?? new List<FeeStructureItemResponse>(),
            StudentsCount = request.StudentIds?.Count ?? 0
        };

        if (request.StudentIds != null && request.StudentIds.Any())
        {
            var arrearsInfo = await _context.StudentFees
                .Where(sf => request.StudentIds.Contains(sf.StudentId) && sf.BalanceAmount > 0)
                .GroupBy(sf => sf.StudentId)
                .Select(g => new { StudentId = g.Key, Balance = g.Sum(x => x.BalanceAmount) })
                .ToListAsync();

            response.StudentsWithPriorArrears = arrearsInfo.Count;
            response.TotalPriorArrears = arrearsInfo.Sum(x => x.Balance);
        }

        return response;
    }

    public async Task<StudentFeeResponse?> AssignPromotionFeeAsync(int studentId, int feeStructureId, string? paymentPlan = "Full Payment", int numberOfInstallments = 1, string performedBy = "System")
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

        var studentFee = await _repo.AssignStudentFeeAsync(assignRequest);

        var student = await _context.Students.FindAsync(studentId);
        if (student != null)
        {
            student.FeeStructureId = feeStructureId;
            student.PaymentPlan = assignRequest.PlanName;
            student.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return studentFee;
    }

    public async Task<CampusTransferFeePreviewDto?> PreviewCampusTransferFeeAsync(int transferId)
    {
        var connection = _context.Database.GetDbConnection();
        var transfer = await connection.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT TransferId, StudentId, FromCampusId, ToCampusId FROM StudentCampusTransfers WHERE TransferId = @Id",
            new { Id = transferId });

        if (transfer == null) return null;

        int studentId = (int)transfer.StudentId;
        int fromCampusId = (int)transfer.FromCampusId;
        int toCampusId = (int)transfer.ToCampusId;

        var student = await _context.Students
            .Include(s => s.CampusNavigation)
            .Include(s => s.ProgramNavigation)
            .FirstOrDefaultAsync(s => s.StudentId == studentId);

        if (student == null) return null;

        var toCampus = await _context.Campuses.FindAsync(toCampusId);

        var currentStudentFee = await _context.StudentFees
            .Include(sf => sf.FeeStructure)
            .Where(sf => sf.StudentId == studentId)
            .OrderByDescending(sf => sf.StudentFeeId)
            .FirstOrDefaultAsync();

        var destStructure = await GetMatchingFeeStructureAsync(
            toCampusId,
            student.BoardId ?? 0,
            student.AcademicYearId ?? 0,
            student.AcademicLevelId,
            student.GroupId ?? 0,
            student.ProgramId);

        decimal currentPaid = currentStudentFee?.PaidAmount ?? 0m;
        decimal destTotal = destStructure?.TotalAmount ?? 0m;
        decimal transferableCredit = currentPaid;
        decimal estimatedBalance = Math.Max(0, destTotal - transferableCredit);

        return new CampusTransferFeePreviewDto
        {
            TransferId = transferId,
            StudentId = studentId,
            StudentName = student.StudentName,
            FromCampusId = fromCampusId,
            FromCampusName = student.CampusNavigation?.CampusName ?? $"Campus {fromCampusId}",
            ToCampusId = toCampusId,
            ToCampusName = toCampus?.CampusName ?? $"Campus {toCampusId}",
            CurrentFeeStructureId = currentStudentFee?.FeeStructureId,
            CurrentFeeStructureName = currentStudentFee?.FeeStructure?.StructureName,
            CurrentTotalAmount = currentStudentFee?.TotalAmount ?? 0m,
            CurrentPaidAmount = currentPaid,
            CurrentBalanceAmount = currentStudentFee?.BalanceAmount ?? 0m,
            DestinationFeeStructureId = destStructure?.FeeStructureId,
            DestinationFeeStructureName = destStructure?.StructureName,
            DestinationTotalAmount = destTotal,
            TransferableCredit = transferableCredit,
            EstimatedNewBalance = estimatedBalance
        };
    }

    public async Task ApplyCampusTransferFeeAsync(int studentId, int toCampusId, int? destinationFeeStructureId, bool transferPaidCredit = true, string performedBy = "System")
    {
        var student = await _context.Students.FindAsync(studentId);
        if (student == null) return;

        int? targetStructureId = destinationFeeStructureId;
        if (!targetStructureId.HasValue || targetStructureId <= 0)
        {
            var match = await GetMatchingFeeStructureAsync(
                toCampusId,
                student.BoardId ?? 0,
                student.AcademicYearId ?? 0,
                student.AcademicLevelId,
                student.GroupId ?? 0,
                student.ProgramId);
            targetStructureId = match?.FeeStructureId;
        }

        if (!targetStructureId.HasValue || targetStructureId <= 0)
        {
            student.CampusId = toCampusId;
            student.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return;
        }

        var targetStructure = await _context.FeeStructures
            .Include(fs => fs.Components.Where(c => c.IsActive))
            .FirstOrDefaultAsync(fs => fs.FeeStructureId == targetStructureId.Value);

        if (targetStructure == null) return;

        var currentStudentFee = await _context.StudentFees
            .Include(sf => sf.Components)
            .Include(sf => sf.PaymentPlans)
                .ThenInclude(p => p.Installments)
            .Where(sf => sf.StudentId == studentId)
            .OrderByDescending(sf => sf.StudentFeeId)
            .FirstOrDefaultAsync();

        if (currentStudentFee != null)
        {
            decimal creditPaid = transferPaidCredit ? currentStudentFee.PaidAmount : 0m;
            decimal newTotal = targetStructure.Components.Where(c => c.IsActive).Sum(c => c.Amount);
            decimal newPayable = Math.Max(0, newTotal - currentStudentFee.ConcessionAmount);
            decimal newBalance = Math.Max(0, newPayable - creditPaid);

            currentStudentFee.FeeStructureId = targetStructureId.Value;
            currentStudentFee.TotalAmount = newTotal;
            currentStudentFee.PayableAmount = newPayable;
            currentStudentFee.PaidAmount = creditPaid;
            currentStudentFee.BalanceAmount = newBalance;
            currentStudentFee.Status = newBalance == 0 ? "Paid" : (creditPaid > 0 ? "Partial" : "Pending");
            currentStudentFee.UpdatedAt = DateTime.UtcNow;

            if (currentStudentFee.Components != null)
            {
                _context.StudentFeeComponents.RemoveRange(currentStudentFee.Components);
                foreach (var comp in targetStructure.Components.Where(c => c.IsActive))
                {
                    _context.StudentFeeComponents.Add(new StudentFeeComponent
                    {
                        StudentFeeId = currentStudentFee.StudentFeeId,
                        FeeStructureComponentId = comp.FeeStructureComponentId,
                        Amount = comp.Amount,
                        ConcessionAmount = 0,
                        PayableAmount = comp.Amount,
                        PaidAmount = 0,
                        BalanceAmount = comp.Amount,
                        DueDate = comp.DueDate,
                        Status = "Pending"
                    });
                }
            }
        }
        else
        {
            await AssignPromotionFeeAsync(studentId, targetStructureId.Value, "Full Payment", 1, performedBy);
        }

        student.CampusId = toCampusId;
        student.FeeStructureId = targetStructureId.Value;
        student.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<ProgramFeeAdjustmentPreviewDto?> PreviewProgramFeeAdjustmentAsync(int studentId, int targetProgramId)
    {
        var student = await _context.Students
            .Include(s => s.ProgramNavigation)
            .FirstOrDefaultAsync(s => s.StudentId == studentId);

        if (student == null) return null;

        var targetProgram = await _context.Programs.FindAsync(targetProgramId);

        var currentStudentFee = await _context.StudentFees
            .Include(sf => sf.FeeStructure)
            .Where(sf => sf.StudentId == studentId)
            .OrderByDescending(sf => sf.StudentFeeId)
            .FirstOrDefaultAsync();

        var targetStructure = await GetMatchingFeeStructureAsync(
            student.CampusId,
            student.BoardId ?? 0,
            student.AcademicYearId ?? 0,
            student.AcademicLevelId,
            student.GroupId ?? 0,
            targetProgramId);

        decimal currentTotal = currentStudentFee?.TotalAmount ?? 0m;
        decimal currentPaid = currentStudentFee?.PaidAmount ?? 0m;
        decimal targetTotal = targetStructure?.TotalAmount ?? 0m;
        decimal diff = targetTotal - currentTotal;
        decimal revisedBalance = Math.Max(0, targetTotal - currentPaid);

        return new ProgramFeeAdjustmentPreviewDto
        {
            StudentId = studentId,
            StudentName = student.StudentName,
            CurrentProgramId = student.ProgramId,
            CurrentProgramName = student.ProgramNavigation?.ProgramName ?? "None",
            TargetProgramId = targetProgramId,
            TargetProgramName = targetProgram?.ProgramName ?? $"Program {targetProgramId}",
            CurrentFeeStructureId = currentStudentFee?.FeeStructureId,
            CurrentFeeStructureName = currentStudentFee?.FeeStructure?.StructureName,
            CurrentTotalAmount = currentTotal,
            CurrentPaidAmount = currentPaid,
            CurrentBalanceAmount = currentStudentFee?.BalanceAmount ?? 0m,
            TargetFeeStructureId = targetStructure?.FeeStructureId,
            TargetFeeStructureName = targetStructure?.StructureName,
            TargetTotalAmount = targetTotal,
            DifferentialAmount = diff,
            RevisedBalanceAmount = revisedBalance
        };
    }

    public async Task ApplyProgramFeeAdjustmentAsync(int studentId, int targetProgramId, int? targetFeeStructureId = null, string performedBy = "System")
    {
        var student = await _context.Students.FindAsync(studentId);
        if (student == null) return;

        int? structureId = targetFeeStructureId;
        if (!structureId.HasValue || structureId <= 0)
        {
            var match = await GetMatchingFeeStructureAsync(
                student.CampusId,
                student.BoardId ?? 0,
                student.AcademicYearId ?? 0,
                student.AcademicLevelId,
                student.GroupId ?? 0,
                targetProgramId);
            structureId = match?.FeeStructureId;
        }

        student.ProgramId = targetProgramId;

        if (structureId.HasValue && structureId > 0)
        {
            var targetStructure = await _context.FeeStructures
                .Include(fs => fs.Components.Where(c => c.IsActive))
                .FirstOrDefaultAsync(fs => fs.FeeStructureId == structureId.Value);

            if (targetStructure != null)
            {
                var currentFee = await _context.StudentFees
                    .Include(sf => sf.Components)
                    .Where(sf => sf.StudentId == studentId)
                    .OrderByDescending(sf => sf.StudentFeeId)
                    .FirstOrDefaultAsync();

                if (currentFee != null)
                {
                    decimal paid = currentFee.PaidAmount;
                    decimal newTotal = targetStructure.Components.Where(c => c.IsActive).Sum(c => c.Amount);
                    decimal newPayable = Math.Max(0, newTotal - currentFee.ConcessionAmount);
                    decimal newBalance = Math.Max(0, newPayable - paid);

                    currentFee.FeeStructureId = structureId.Value;
                    currentFee.TotalAmount = newTotal;
                    currentFee.PayableAmount = newPayable;
                    currentFee.BalanceAmount = newBalance;
                    currentFee.Status = newBalance == 0 ? "Paid" : (paid > 0 ? "Partial" : "Pending");
                    currentFee.UpdatedAt = DateTime.UtcNow;

                    if (currentFee.Components != null)
                    {
                        _context.StudentFeeComponents.RemoveRange(currentFee.Components);
                        foreach (var comp in targetStructure.Components.Where(c => c.IsActive))
                        {
                            _context.StudentFeeComponents.Add(new StudentFeeComponent
                            {
                                StudentFeeId = currentFee.StudentFeeId,
                                FeeStructureComponentId = comp.FeeStructureComponentId,
                                Amount = comp.Amount,
                                ConcessionAmount = 0,
                                PayableAmount = comp.Amount,
                                PaidAmount = 0,
                                BalanceAmount = comp.Amount,
                                DueDate = comp.DueDate,
                                Status = "Pending"
                            });
                        }
                    }
                }
                else
                {
                    await AssignPromotionFeeAsync(studentId, structureId.Value, "Full Payment", 1, performedBy);
                }

                student.FeeStructureId = structureId.Value;
            }
        }

        student.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}
