using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Implementations;

public class FeeRepository : IFeeRepository
{
    private readonly AppDbContext _db;
    private readonly CollegeManagement.API.Services.Interfaces.INumberSeriesService _numberSeriesService;

    public FeeRepository(AppDbContext db, CollegeManagement.API.Services.Interfaces.INumberSeriesService numberSeriesService)
    {
        _db = db;
        _numberSeriesService = numberSeriesService;
    }

    private IDbConnection Connection()
    {
        return _db.Database.GetDbConnection();
    }

    // =========================================================
    // SECTION 1: FEE TYPES
    // =========================================================

    public async Task<FeeTypeResponse?> CreateFeeTypeAsync(CreateFeeTypeRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeTypeResponse>(
            "sp_FeeType_Create",
            new
            {
                p_FeeTypeName = request.FeeTypeName,
                p_Category = request.Category,
                p_CampusId = (int?)null,
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
    {
        var c = Connection();
        return await c.QueryAsync<FeeTypeResponse>(
            "sp_FeeType_GetAll",
            new
            {
                p_CampusId = campusId,
                p_BoardId = boardId,
                p_AcademicYearId = academicYearId
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int feeTypeId)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeTypeResponse>(
            "sp_FeeType_GetById",
            new { p_FeeTypeId = feeTypeId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<FeeTypeResponse?> UpdateFeeTypeAsync(int id, UpdateFeeTypeRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeTypeResponse>(
            "sp_FeeType_Update",
            new
            {
                p_FeeTypeId = id,
                p_FeeTypeName = request.FeeTypeName,
                p_Category = request.Category,
                p_CampusId = (int?)null,
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> DeleteFeeTypeAsync(int id)
    {
        var c = Connection();
        return await c.ExecuteAsync(
            "sp_FeeType_Delete",
            new { p_FeeTypeId = id },
            commandType: CommandType.StoredProcedure) > 0;
    }

    // =========================================================
    // SECTION 2: FEE STRUCTURES & COMPONENTS
    // =========================================================

    public async Task<FeeStructureResponse?> CreateFeeStructureAsync(CreateFeeStructureRequest request)
    {
        var c = Connection();
        string itemsJson = JsonSerializer.Serialize(request.Items ?? new List<CreateFeeStructureItemRequest>());

        using var multi = await c.QueryMultipleAsync(
            "sp_FeeStructure_Create",
            new
            {
                p_CampusId = request.CampusId,
                p_BoardId = request.BoardId,
                p_AcademicYearId = request.AcademicYearId,
                p_AcademicLevelId = request.AcademicLevelId ?? 1,
                p_GroupId = request.GroupId,
                p_ProgramId = request.ProgramId,
                p_StructureName = request.StructureName,
                p_Description = (string?)null,
                p_YearFeeMode = request.YearFeeMode,
                p_IncrementType = request.IncrementType,
                p_IncrementValue = request.IncrementValue,
                p_ItemsJson = itemsJson
            },
            commandType: CommandType.StoredProcedure);

        var structure = await multi.ReadFirstOrDefaultAsync<FeeStructureResponse>();
        if (structure != null && !multi.IsConsumed)
        {
            structure.Items = (await multi.ReadAsync<FeeStructureItemResponse>()).ToList();
        }
        return structure;
    }

    public async Task<IEnumerable<FeeStructureResponse>> GetFeeStructuresAsync(int? campusId = null)
    {
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_FeeStructure_GetAll",
            new { p_CampusId = campusId ?? 0 },
            commandType: CommandType.StoredProcedure);

        var structures = (await multi.ReadAsync<FeeStructureResponse>()).ToList();
        var items = !multi.IsConsumed
            ? (await multi.ReadAsync<FeeStructureItemResponse>()).ToList()
            : new List<FeeStructureItemResponse>();

        foreach (var structure in structures)
        {
            structure.Items = items.Where(x => x.FeeStructureId == structure.FeeStructureId).ToList();
        }
        return structures;
    }

    public async Task<FeeStructureResponse?> GetFeeStructureByIdAsync(int id)
    {
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_FeeStructure_GetById",
            new { p_FeeStructureId = id },
            commandType: CommandType.StoredProcedure);

        var structure = await multi.ReadFirstOrDefaultAsync<FeeStructureResponse>();
        if (structure != null && !multi.IsConsumed)
        {
            structure.Items = (await multi.ReadAsync<FeeStructureItemResponse>()).ToList();
        }
        return structure;
    }

    public async Task<FeeStructureResponse?> UpdateFeeStructureAsync(int id, UpdateFeeStructureRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeStructureResponse>(
            "sp_FeeStructure_Update",
            new
            {
                p_FeeStructureId = id,
                p_StructureName = request.StructureName,
                p_Description = request.Description,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> DeleteFeeStructureAsync(int id)
    {
        var c = Connection();
        return await c.ExecuteAsync(
            "sp_FeeStructure_Delete",
            new { p_FeeStructureId = id },
            commandType: CommandType.StoredProcedure) > 0;
    }

    public async Task<FeeStructureItemResponse?> AddFeeStructureItemAsync(int id, CreateFeeStructureItemRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeStructureItemResponse>(
            "sp_FeeStructureComponent_Add",
            new
            {
                p_FeeStructureId = id,
                p_FeeTypeId = request.FeeTypeId,
                p_Rule = request.Rule,
                p_Amount = request.Amount
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<FeeStructureItemResponse>> GetFeeStructureItemsAsync(int id)
    {
        var c = Connection();
        return await c.QueryAsync<FeeStructureItemResponse>(
            "sp_FeeStructureComponent_GetAll",
            new { p_FeeStructureId = id },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<FeeStructureItemResponse?> UpdateFeeStructureItemAsync(int id, UpdateFeeStructureItemRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeStructureItemResponse>(
            "sp_FeeStructureComponent_Update",
            new
            {
                p_FeeStructureComponentId = id,
                p_Rule = request.Rule,
                p_Amount = request.Amount,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> DeleteFeeStructureItemAsync(int id)
    {
        var c = Connection();
        return await c.ExecuteAsync(
            "sp_FeeStructureComponent_Delete",
            new { p_FeeStructureComponentId = id },
            commandType: CommandType.StoredProcedure) > 0;
    }

    // =========================================================
    // SECTION 3: SCHOLARSHIPS
    // =========================================================

    public async Task<ScholarshipResponse?> CreateScholarshipAsync(CreateScholarshipRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<ScholarshipResponse>(
            "sp_Scholarship_Create",
            new
            {
                p_ScholarshipName = request.ScholarshipName,
                p_DiscountType = request.DiscountType,
                p_DiscountValue = request.DiscountValue,
                p_Description = request.Description,
                p_CampusId = (int?)null,
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<ScholarshipResponse>> GetScholarshipsAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
    {
        var c = Connection();
        return await c.QueryAsync<ScholarshipResponse>(
            "sp_Scholarship_GetAll",
            new
            {
                p_CampusId = campusId,
                p_BoardId = boardId,
                p_AcademicYearId = academicYearId
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<ScholarshipResponse?> GetScholarshipByIdAsync(int id)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<ScholarshipResponse>(
            "sp_Scholarship_GetById",
            new { p_ScholarshipId = id },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<ScholarshipResponse?> UpdateScholarshipAsync(int id, UpdateScholarshipRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<ScholarshipResponse>(
            "sp_Scholarship_Update",
            new
            {
                p_ScholarshipId = id,
                p_ScholarshipName = request.ScholarshipName,
                p_DiscountType = request.DiscountType,
                p_DiscountValue = request.DiscountValue,
                p_Description = request.Description,
                p_CampusId = (int?)null,
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> DeleteScholarshipAsync(int id)
    {
        var c = Connection();
        return await c.ExecuteAsync(
            "sp_Scholarship_Delete",
            new { p_ScholarshipId = id },
            commandType: CommandType.StoredProcedure) > 0;
    }

    // =========================================================
    // SECTION 4: STUDENT FEES & ASSIGNMENT
    // =========================================================

    public async Task<StudentFeeResponse?> AssignStudentFeeAsync(AssignStudentFeeRequest request)
    {
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_StudentFee_Assign",
            new
            {
                p_StudentId = request.StudentId,
                p_FeeStructureId = request.FeeStructureId,
                p_PlanName = request.PlanName,
                p_NumberOfInstallments = request.NumberOfInstallments
            },
            commandType: CommandType.StoredProcedure);

        var paymentPlan = await multi.ReadFirstOrDefaultAsync<PaymentPlanResponse>();
        var schedules = !multi.IsConsumed ? (await multi.ReadAsync<FeeScheduleResponse>()).ToList() : new List<FeeScheduleResponse>();
        var studentFee = !multi.IsConsumed ? await multi.ReadFirstOrDefaultAsync<StudentFeeResponse>() : null;

        if (studentFee == null) return null;

        if (paymentPlan != null) studentFee.PaymentPlan = paymentPlan.PlanName;
        studentFee.Schedules = schedules;
        return studentFee;
    }

    public async Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int id)
    {
        // ID could be StudentFeeId or StudentId directly; resolve via GetStudentFeeDetailsByStudentAsync
        return await GetStudentFeeDetailsByStudentAsync(id);
    }

    public async Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int studentId)
    {
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_StudentFee_GetDetailsByStudent",
            new { p_StudentId = studentId },
            commandType: CommandType.StoredProcedure);

        var studentDetails = await multi.ReadFirstOrDefaultAsync<StudentFeeDetailsResponse>();
        if (studentDetails == null) return null;

        if (!multi.IsConsumed)
        {
            studentDetails.Breakdown = (await multi.ReadAsync<StudentFeeBreakdownResponse>()).ToList();
        }
        if (!multi.IsConsumed)
        {
            studentDetails.Schedules = (await multi.ReadAsync<FeeScheduleResponse>()).ToList();
        }
        return studentDetails;
    }

    public async Task<Dictionary<int, StudentFeeDetailsResponse?>> GetBulkStudentFeeDetailsAsync(IEnumerable<int> studentIds)
    {
        var c = Connection();
        var distinctIds = studentIds.Distinct().ToList();
        string json = JsonSerializer.Serialize(distinctIds);

        using var multi = await c.QueryMultipleAsync(
            "sp_StudentFee_GetBulkDetails",
            new { p_StudentIdsJson = json },
            commandType: CommandType.StoredProcedure);

        var summaries = (await multi.ReadAsync<StudentFeeDetailsResponse>()).ToList();
        var breakdowns = !multi.IsConsumed ? (await multi.ReadAsync<StudentFeeBreakdownResponse>()).ToList() : new List<StudentFeeBreakdownResponse>();
        var schedules = !multi.IsConsumed ? (await multi.ReadAsync<FeeScheduleResponse>()).ToList() : new List<FeeScheduleResponse>();

        var dict = new Dictionary<int, StudentFeeDetailsResponse?>();
        foreach (var sid in distinctIds)
        {
            var summary = summaries.FirstOrDefault(s => s.StudentId == sid);
            if (summary != null)
            {
                summary.Breakdown = breakdowns.Where(b => b.StudentFeeId == summary.StudentFeeId).ToList();
                summary.Schedules = schedules.Where(s => s.StudentFeeId == summary.StudentFeeId).ToList();
            }
            dict[sid] = summary;
        }
        return dict;
    }

    public async Task<IEnumerable<StudentFeeLedgerResponse>> GetStudentFeeLedgerAsync(
        int? campusId = null,
        int? academicYearId = null,
        int? groupId = null,
        int? sectionId = null,
        string? paymentPlan = null,
        string? status = null,
        string? search = null,
        int? boardId = null)
    {
        var c = Connection();
        return await c.QueryAsync<StudentFeeLedgerResponse>(
            "sp_StudentFee_GetLedger",
            new
            {
                p_CampusId = campusId,
                p_AcademicYearId = academicYearId,
                p_GroupId = groupId,
                p_SectionId = sectionId,
                p_PaymentPlan = paymentPlan,
                p_Status = status,
                p_Search = search,
                p_BoardId = boardId
            },
            commandType: CommandType.StoredProcedure);
    }

    // =========================================================
    // SECTION 5: FEE CONCESSION
    // =========================================================

    public async Task<FeeConcessionResponse?> ApplyFeeConcessionAsync(ApplyFeeConcessionRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeConcessionResponse>(
            "sp_FeeConcession_Apply",
            new
            {
                p_StudentId = request.StudentId,
                p_StudentFeeId = request.StudentFeeId,
                p_ScholarshipId = request.ScholarshipId,
                p_ScholarshipName = request.ScholarshipName,
                p_DiscountType = request.DiscountType,
                p_DiscountValue = request.DiscountValue,
                p_Reason = request.Reason,
                p_ApprovedBy = request.ApprovedBy
            },
            commandType: CommandType.StoredProcedure);
    }

    // =========================================================
    // SECTION 6: PAYMENT PLANS & INSTALLMENTS
    // =========================================================

    public async Task<PaymentPlanResponse?> CreatePaymentPlanAsync(CreatePaymentPlanRequest request)
    {
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_PaymentPlan_Create",
            new
            {
                p_StudentFeeId = request.StudentFeeId,
                p_PlanName = request.PlanName,
                p_NumberOfInstallments = request.NumberOfInstallments
            },
            commandType: CommandType.StoredProcedure);

        var plan = await multi.ReadFirstOrDefaultAsync<PaymentPlanResponse>();
        if (plan != null && !multi.IsConsumed)
        {
            plan.Installments = (await multi.ReadAsync<FeeScheduleResponse>()).ToList();
        }
        return plan;
    }

    public async Task<FeeScheduleResponse?> AddPaymentPlanInstallmentAsync(int planId, CreateInstallmentRequest request)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeScheduleResponse>(
            "sp_PaymentPlan_AddInstallment",
            new
            {
                p_FeePaymentPlanId = planId,
                p_InstallmentNumber = request.InstallmentNumber,
                p_Amount = request.Amount,
                p_DueDate = request.DueDate
            },
            commandType: CommandType.StoredProcedure);
    }

    // =========================================================
    // SECTION 7: PAYMENTS & RECEIPTS (WITH CONCURRENCY LOCK)
    // =========================================================

    public async Task<FeePaymentResponse?> CreateFeePaymentAsync(CreateFeePaymentRequest request)
    {
        var c = Connection();
        string? instJson = request.FeeInstallmentIds != null && request.FeeInstallmentIds.Any()
            ? JsonSerializer.Serialize(request.FeeInstallmentIds)
            : null;

        // Auto-generate receipt number if requested
        string? finalReceiptNo = request.ReceiptNumber?.Trim();
        if (string.IsNullOrWhiteSpace(finalReceiptNo))
        {
            try
            {
                var reqDto = new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto();
                var generatedDto = await _numberSeriesService.GenerateNextNumberAsync("RECEIPT_NO", reqDto, 1);
                if (generatedDto != null && !string.IsNullOrWhiteSpace(generatedDto.GeneratedNumber))
                {
                    finalReceiptNo = generatedDto.GeneratedNumber;
                }
            }
            catch
            {
                // Fallback to procedure generation
            }
        }

        int collectedById = request.CollectedBy ?? 0;

        return await c.QueryFirstOrDefaultAsync<FeePaymentResponse>(
            "sp_FeePayment_Collect",
            new
            {
                p_StudentId = request.StudentId,
                p_StudentFeeId = request.StudentFeeId,
                p_FeeInstallmentIdsJson = instJson,
                p_Amount = request.Amount,
                p_Discount = request.Discount,
                p_Fine = request.Fine,
                p_PaymentMode = request.PaymentMode,
                p_TransactionReference = request.TransactionReference,
                p_Note = request.Note,
                p_PaymentDate = request.PaymentDate ?? DateTime.UtcNow,
                p_ReceiptNumber = finalReceiptNo,
                p_CollectedBy = collectedById
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int studentId)
    {
        var c = Connection();
        return await c.QueryAsync<FeePaymentResponse>(
            "sp_FeePayment_GetHistoryByStudent",
            new { p_StudentId = studentId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int id)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeePaymentResponse>(
            "sp_FeePayment_GetById",
            new { p_FeePaymentId = id },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<FeeReceiptResponse?> GetReceiptAsync(string receiptNumber)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeeReceiptResponse>(
            "sp_FeeReceipt_GetByNumber",
            new { p_ReceiptNumber = receiptNumber.Trim() },
            commandType: CommandType.StoredProcedure);
    }

    // =========================================================
    // SECTION 8: COLLECTION, DUE, DASHBOARD & REPORTS
    // =========================================================

    public async Task<IEnumerable<FeeCollectionResponse>> GetFeeCollectionAsync(int? campusId = null, string? search = null, int? boardId = null, int? academicYearId = null)
    {
        var c = Connection();
        return await c.QueryAsync<FeeCollectionResponse>(
            "sp_FeeCollection_Get",
            new
            {
                p_CampusId = campusId,
                p_Search = search,
                p_BoardId = boardId,
                p_AcademicYearId = academicYearId
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<FeeDueResponse>> GetDueAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
    {
        var c = Connection();
        return await c.QueryAsync<FeeDueResponse>(
            "sp_FeeDue_Get",
            new
            {
                p_CampusId = campusId,
                p_BoardId = boardId,
                p_AcademicYearId = academicYearId
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<FeeDashboardResponse> GetDashboardAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
    {
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_FeeDashboard_Get",
            new
            {
                p_CampusId = campusId,
                p_BoardId = boardId,
                p_AcademicYearId = academicYearId
            },
            commandType: CommandType.StoredProcedure);

        var r = await multi.ReadFirstOrDefaultAsync<FeeDashboardResponse>() ?? new FeeDashboardResponse();
        if (!multi.IsConsumed) r.GroupWiseCollection = (await multi.ReadAsync<GroupCollectionResponse>()).ToList();
        if (!multi.IsConsumed) r.UpcomingSchedules = (await multi.ReadAsync<FeeDueResponse>()).ToList();
        if (!multi.IsConsumed) r.RecentPayments = (await multi.ReadAsync<FeePaymentResponse>()).ToList();
        return r;
    }

    public async Task<FeeReportResponse> GetDailyReportAsync(int? campusId = null, DateTime? date = null)
    {
        var targetDate = (date ?? DateTime.Today).Date;
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_FeeReport_Daily",
            new
            {
                p_CampusId = campusId,
                p_ReportDate = targetDate
            },
            commandType: CommandType.StoredProcedure);

        var r = await multi.ReadFirstOrDefaultAsync<FeeReportResponse>() ?? new FeeReportResponse
        {
            FromDate = targetDate,
            ToDate = targetDate
        };
        if (!multi.IsConsumed)
        {
            r.Transactions = (await multi.ReadAsync<FeePaymentResponse>()).ToList();
        }
        return r;
    }

    public async Task<FeeReportResponse> GetMonthlyReportAsync(int? campusId = null, int? year = null, int? month = null)
    {
        var d = new DateTime(year ?? DateTime.Today.Year, month ?? DateTime.Today.Month, 1);
        var c = Connection();
        using var multi = await c.QueryMultipleAsync(
            "sp_FeeReport_Monthly",
            new
            {
                p_CampusId = campusId,
                p_Year = d.Year,
                p_Month = d.Month
            },
            commandType: CommandType.StoredProcedure);

        var r = await multi.ReadFirstOrDefaultAsync<FeeReportResponse>() ?? new FeeReportResponse
        {
            FromDate = d,
            ToDate = d.AddMonths(1).AddDays(-1)
        };
        if (!multi.IsConsumed)
        {
            r.Transactions = (await multi.ReadAsync<FeePaymentResponse>()).ToList();
        }
        return r;
    }

    // =========================================================
    // SECTION 9: TRANSITION & LIFECYCLE HELPERS
    // =========================================================

    public async Task<FeeStructureResponse?> GetMatchingFeeStructureAsync(int? campusId, int boardId, int academicYearId, int? academicLevelId, int groupId, int? programId = null)
    {
        var c = Connection();
        var match = await c.QueryFirstOrDefaultAsync<FeeStructureResponse>(
            "sp_FeeTransition_GetMatchingStructure",
            new
            {
                p_CampusId = campusId ?? 0,
                p_BoardId = boardId,
                p_AcademicYearId = academicYearId,
                p_AcademicLevelId = academicLevelId ?? 0,
                p_GroupId = groupId,
                p_ProgramId = programId ?? 0
            },
            commandType: CommandType.StoredProcedure);

        if (match != null && match.FeeStructureId > 0)
        {
            var full = await GetFeeStructureByIdAsync(match.FeeStructureId);
            return full ?? match;
        }
        return null;
    }

    public async Task<CampusTransferFeePreviewDto?> PreviewCampusTransferFeeAsync(int transferId)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<CampusTransferFeePreviewDto>(
            "sp_FeeTransition_PreviewTransfer",
            new { p_TransferId = transferId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<bool> ApplyCampusTransferFeeAsync(int studentId, int toCampusId, int? destinationFeeStructureId, bool transferPaidCredit, string performedBy)
    {
        var c = Connection();
        int rows = await c.ExecuteAsync(
            "sp_FeeTransition_ApplyTransfer",
            new
            {
                p_StudentId = studentId,
                p_ToCampusId = toCampusId,
                p_DestinationFeeStructureId = destinationFeeStructureId,
                p_TransferPaidCredit = transferPaidCredit,
                p_PerformedBy = performedBy
            },
            commandType: CommandType.StoredProcedure);
        return rows > 0;
    }

    public async Task<ProgramFeeAdjustmentPreviewDto?> PreviewProgramFeeAdjustmentAsync(int studentId, int targetProgramId)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<ProgramFeeAdjustmentPreviewDto>(
            "sp_FeeTransition_PreviewProgramAdjustment",
            new
            {
                p_StudentId = studentId,
                p_TargetProgramId = targetProgramId
            },
            commandType: CommandType.StoredProcedure);
    }
}
