using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MySqlConnector;
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
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public FeeRepository(AppDbContext db, CollegeManagement.API.Services.Interfaces.INumberSeriesService numberSeriesService)
    {
        _db = db;
        _numberSeriesService = numberSeriesService;
    }

    private IDbConnection Connection()
    {
        return _db.Database.GetDbConnection();
    }

    private static Exception TranslateMySqlException(MySqlException ex)
    {
        if (ex.SqlState == "45000")
        {
            if (ex.Message.StartsWith("CONFLICT:", StringComparison.OrdinalIgnoreCase))
                return new ConflictException(ex.Message["CONFLICT:".Length..].Trim());
            return new ArgumentException(ex.Message);
        }
        if (ex.Number == 1062)
            return new ConflictException("A conflicting fee record already exists for this combination.");
        if (ex.Number == 1452)
            return new ArgumentException("Referenced master record or FeeTypeId does not exist.");
        return ex;
    }

    private static async Task<FeeStructureResponse?> ReadFeeStructureWithItemsAsync(SqlMapper.GridReader multi)
    {
        var structure = await multi.ReadFirstOrDefaultAsync<FeeStructureResponse>();
        if (structure != null && !multi.IsConsumed)
        {
            structure.Items = (await multi.ReadAsync<FeeStructureItemResponse>()).ToList();
        }
        return structure;
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
        var ay = await _db.AcademicYears.AsNoTracking()
            .FirstOrDefaultAsync(y => y.AcademicYearId == request.AcademicYearId);
        if (ay == null)
            throw new ArgumentException($"AcademicYear {request.AcademicYearId} does not exist.");
        if (ay.BoardId.HasValue && ay.BoardId.Value != request.BoardId)
            throw new ArgumentException($"AcademicYear {request.AcademicYearId} belongs to Board {ay.BoardId.Value}, not Board {request.BoardId}.");
        if (ay.CampusId.HasValue && request.CampusId.HasValue && ay.CampusId.Value != request.CampusId.Value)
            throw new ArgumentException($"AcademicYear {request.AcademicYearId} belongs to Campus {ay.CampusId.Value}, not Campus {request.CampusId.Value}.");

        var c = Connection();
        string itemsJson = JsonSerializer.Serialize(request.Items ?? new List<CreateFeeStructureItemRequest>(), _jsonOptions);
        try
        {
            FeeStructureResponse? structure;
            using (var multi = await c.QueryMultipleAsync(
                "sp_FeeStructure_Create",
                new
                {
                    p_CampusId = request.CampusId,
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ProgramId = request.ProgramId,
                    p_StructureName = request.StructureName,
                    p_Description = (string?)null,
                    p_YearFeeMode = request.YearFeeMode,
                    p_IncrementType = request.IncrementType,
                    p_IncrementValue = request.IncrementValue,
                    p_ItemsJson = itemsJson
                },
                commandType: CommandType.StoredProcedure))
            {
                structure = await ReadFeeStructureWithItemsAsync(multi);
            }
            if (structure != null && (structure.Items == null || structure.Items.Count == 0))
            {
                var full = await GetFeeStructureByIdAsync(structure.FeeStructureId);
                if (full != null) return full;
            }
            return structure;
        }
        catch (MySqlException ex) { throw TranslateMySqlException(ex); }
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
        return await ReadFeeStructureWithItemsAsync(multi);
    }

    public async Task<FeeStructureResponse?> UpdateFeeStructureAsync(int id, UpdateFeeStructureRequest request)
    {
        var c = Connection();
        try
        {
            using var multi = await c.QueryMultipleAsync(
                "sp_FeeStructure_Update",
                new
                {
                    p_FeeStructureId = id,
                    p_CampusId = request.CampusId,
                    p_StructureName = request.StructureName,
                    p_Description = request.Description,
                    p_ProgramId = request.ProgramId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_YearFeeMode = request.YearFeeMode,
                    p_IncrementType = request.IncrementType,
                    p_IncrementValue = request.IncrementValue,
                    p_IsActive = request.IsActive
                },
                commandType: CommandType.StoredProcedure);
            return await ReadFeeStructureWithItemsAsync(multi);
        }
        catch (MySqlException ex) { throw TranslateMySqlException(ex); }
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
        try
        {
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
        catch (MySqlException ex) { throw TranslateMySqlException(ex); }
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
        var student = await _db.Students.AsNoTracking()
            .FirstOrDefaultAsync(s => s.StudentId == request.StudentId);
        var feeStructure = await _db.FeeStructures.AsNoTracking()
            .Include(fs => fs.AcademicYear)
            .FirstOrDefaultAsync(fs => fs.FeeStructureId == request.FeeStructureId);

        if (student == null)
            throw new ArgumentException($"Student {request.StudentId} was not found.");
        if (feeStructure == null)
            throw new ArgumentException($"FeeStructure {request.FeeStructureId} was not found.");
        if (student.CampusId.HasValue && feeStructure.CampusId.HasValue && student.CampusId.Value != feeStructure.CampusId.Value)
            throw new ArgumentException("Fee structure campus does not match the student's campus.");
        if (student.BoardId.HasValue && feeStructure.BoardId != student.BoardId.Value)
            throw new ArgumentException("Fee structure board does not match the student's board.");
        if (feeStructure.AcademicYear?.BoardId != null && student.BoardId.HasValue && feeStructure.AcademicYear.BoardId.Value != student.BoardId.Value)
            throw new ArgumentException("Fee structure academic year belongs to a different board than the student.");
        if (student.AcademicYearId.HasValue && feeStructure.AcademicYearId != student.AcademicYearId.Value)
            throw new ArgumentException("Fee structure academic year does not match the student's academic year.");

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

    private async Task<StudentFeeDetailsResponse?> ReadStudentFeeDetailsAsync(SqlMapper.GridReader multi)
    {
        var studentDetails = await multi.ReadFirstOrDefaultAsync<StudentFeeDetailsResponse>();
        if (studentDetails == null || studentDetails.StudentFeeId <= 0) return null;

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

    private async Task PopulatePaymentHistoryAsync(StudentFeeDetailsResponse? details)
    {
        if (details == null || details.StudentId <= 0) return;
        var payments = await GetFeePaymentsAsync(details.StudentId);
        details.PaymentHistory = payments
            .Where(p => p.StudentFeeId == details.StudentFeeId)
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.FeePaymentId)
            .ToList();
    }

    public async Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int id)
    {
        var c = Connection();
        StudentFeeDetailsResponse? details;
        using (var multi = await c.QueryMultipleAsync(
            "sp_StudentFee_GetDetailsById",
            new { p_StudentFeeId = id },
            commandType: CommandType.StoredProcedure))
        {
            details = await ReadStudentFeeDetailsAsync(multi);
        }
        await PopulatePaymentHistoryAsync(details);
        return details;
    }

    public async Task<StudentFeeDetailsResponse?> GetStudentFeeDetailsByStudentAsync(int studentId)
    {
        var c = Connection();
        StudentFeeDetailsResponse? details;
        using (var multi = await c.QueryMultipleAsync(
            "sp_StudentFee_GetDetailsByStudent",
            new { p_StudentId = studentId },
            commandType: CommandType.StoredProcedure))
        {
            details = await ReadStudentFeeDetailsAsync(multi);
        }
        await PopulatePaymentHistoryAsync(details);
        return details;
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
        try
        {
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
        catch (MySqlException ex) { throw TranslateMySqlException(ex); }
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
        var activeTx = _db.Database.CurrentTransaction?.GetDbTransaction();

        try
        {
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
                transaction: activeTx,
                commandType: CommandType.StoredProcedure);
        }
        catch (MySqlException ex) { throw TranslateMySqlException(ex); }
    }

    public async Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsAsync(int studentId)
    {
        var c = Connection();
        var list = (await GetFeePaymentsCoreAsync(studentId)).ToList();
        await EnrichGatewayMetadataAsync(c, list);
        return list;
    }

    private async Task<IEnumerable<FeePaymentResponse>> GetFeePaymentsCoreAsync(int studentId)
    {
        var c = Connection();
        return await c.QueryAsync<FeePaymentResponse>(
            "sp_FeePayment_GetHistoryByStudent",
            new { p_StudentId = studentId },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<Dictionary<int, IEnumerable<FeePaymentResponse>>> GetBulkFeePaymentsAsync(IEnumerable<int> studentIds)
    {
        var ids = studentIds?.Distinct().Where(id => id > 0).ToList() ?? new List<int>();
        var result = new Dictionary<int, IEnumerable<FeePaymentResponse>>();
        if (!ids.Any()) return result;

        var c = Connection();
        try
        {
            var payments = await c.QueryAsync<FeePaymentResponse>(
                "sp_FeePayment_GetBulkHistory",
                new { p_StudentIds = string.Join(",", ids) },
                commandType: CommandType.StoredProcedure);

            var paymentList = payments.ToList();
            await EnrichGatewayMetadataAsync(c, paymentList);
            var grouped = paymentList.GroupBy(p => p.StudentId).ToDictionary(g => g.Key, g => (IEnumerable<FeePaymentResponse>)g.ToList());
            foreach (var id in ids)
            {
                result[id] = grouped.TryGetValue(id, out var list) ? list : Enumerable.Empty<FeePaymentResponse>();
            }
            return result;
        }
        catch
        {
            foreach (var id in ids)
            {
                result[id] = await GetFeePaymentsAsync(id);
            }
            return result;
        }
    }

    public async Task<FeePaymentResponse?> GetFeePaymentByIdAsync(int id)
    {
        var payment = await GetFeePaymentByIdCoreAsync(id);
        if (payment != null)
            await EnrichGatewayMetadataAsync(Connection(), new[] { payment });
        return payment;
    }

    private async Task<FeePaymentResponse?> GetFeePaymentByIdCoreAsync(int id)
    {
        var c = Connection();
        return await c.QueryFirstOrDefaultAsync<FeePaymentResponse>(
            "sp_FeePayment_GetById",
            new { p_FeePaymentId = id },
            commandType: CommandType.StoredProcedure);
    }

    private async Task EnrichGatewayMetadataAsync(IDbConnection c, IEnumerable<FeePaymentResponse> payments)
    {
        var list = payments?.ToList();
        if (list == null || !list.Any()) return;

        var paymentIds = list.Select(p => p.FeePaymentId).Where(id => id > 0).Distinct().ToList();
        var studentFeeIds = list.Select(p => p.StudentFeeId).Where(id => id > 0).Distinct().ToList();
        if (!paymentIds.Any()) return;

        try
        {
            var activeTx = _db.Database.CurrentTransaction?.GetDbTransaction();
            var txns = await c.QueryAsync<(int FeePaymentId, int GatewayTransactionId, string GatewayStatus)>(
                "SELECT FeePaymentId, Id AS GatewayTransactionId, Status AS GatewayStatus FROM PaymentGatewayTransactions WHERE FeePaymentId IN @Ids",
                new { Ids = paymentIds },
                transaction: activeTx);

            var txnLookup = txns
                .GroupBy(t => t.FeePaymentId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.GatewayTransactionId).First());

            var receipts = await c.QueryAsync<(int FeePaymentId, int FeeReceiptId, string ReceiptNumber)>(
                "SELECT FeePaymentId, FeeReceiptId, ReceiptNumber FROM FeeReceipts WHERE FeePaymentId IN @Ids",
                new { Ids = paymentIds },
                transaction: activeTx);
            var receiptLookup = receipts
                .GroupBy(r => r.FeePaymentId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.FeeReceiptId).First());

            var balances = studentFeeIds.Any()
                ? (await c.QueryAsync<(int StudentFeeId, decimal BalanceAmount)>(
                    "SELECT StudentFeeId, BalanceAmount FROM StudentFees WHERE StudentFeeId IN @SfIds",
                    new { SfIds = studentFeeIds },
                    transaction: activeTx)).ToDictionary(x => x.StudentFeeId, x => x.BalanceAmount)
                : new Dictionary<int, decimal>();

            List<(int FeePaymentId, string Status, DateTime? SentAtUtc, string? LastError)> outboxRows = new();
            try
            {
                outboxRows = (await c.QueryAsync<(int FeePaymentId, string Status, DateTime? SentAtUtc, string? LastError)>(
                    @"SELECT FeePaymentId, Status, SentAtUtc, LastError
                      FROM FeePaymentEmailOutbox
                      WHERE FeePaymentId IN @Ids AND NotificationType = 'PAYMENT_SUCCESS_RECEIPT'",
                    new { Ids = paymentIds },
                    transaction: activeTx)).ToList();
            }
            catch
            {
                // Safe fallback before table migration
            }

            var emailLookup = outboxRows
                .GroupBy(r => r.FeePaymentId)
                .ToDictionary(g => g.Key, g =>
                {
                    var items = g.ToList();
                    if (items.Any(i => i.Status == "QUEUED"))
                        return ("QUEUED", items.Where(i => i.SentAtUtc.HasValue).Max(i => i.SentAtUtc), (string?)null);
                    if (items.Any(i => i.Status == "FAILED"))
                    {
                        var err = items.Where(i => i.Status == "FAILED" && !string.IsNullOrWhiteSpace(i.LastError))
                            .Select(i => i.LastError).FirstOrDefault() ?? "SMTP delivery failed.";
                        return ("FAILED", items.Where(i => i.SentAtUtc.HasValue).Max(i => i.SentAtUtc), err);
                    }
                    if (items.All(i => i.Status == "SENT"))
                        return ("SENT", items.Max(i => i.SentAtUtc), (string?)null);
                    return ("NOT_REQUESTED", (DateTime?)null, (string?)null);
                });

            foreach (var p in list)
            {
                bool isReversed = false;
                if (txnLookup.TryGetValue(p.FeePaymentId, out var meta))
                {
                    p.GatewayTransactionId = meta.GatewayTransactionId;
                    p.GatewayStatus = meta.GatewayStatus;
                    isReversed = string.Equals(meta.GatewayStatus, "Reversed", StringComparison.OrdinalIgnoreCase);
                }

                if (receiptLookup.TryGetValue(p.FeePaymentId, out var rec))
                {
                    p.ReceiptId = rec.FeeReceiptId;
                    if (string.IsNullOrWhiteSpace(p.ReceiptNumber))
                        p.ReceiptNumber = rec.ReceiptNumber;
                }

                if (balances.TryGetValue(p.StudentFeeId, out var bal))
                {
                    p.OutstandingBalance = bal;
                }

                bool isSuccess = string.Equals(p.Status, "Success", StringComparison.OrdinalIgnoreCase) && !isReversed;
                p.PaymentStatus = isReversed ? "Reversed" : (isSuccess ? "Settled" : p.Status);
                p.VerificationStatus = isReversed ? "Reversed" : (isSuccess ? "Verified" : (p.GatewayStatus ?? p.Status));
                p.ReceiptAvailable = isSuccess && p.ReceiptId.HasValue;

                if (emailLookup.TryGetValue(p.FeePaymentId, out var mail))
                {
                    p.EmailNotificationStatus = mail.Item1;
                    p.EmailDeliveryStatus = mail.Item1;
                    p.EmailSentAt = mail.Item2;
                    p.EmailFailureReason = mail.Item3;
                }
                else
                {
                    p.EmailNotificationStatus = "NOT_REQUESTED";
                    p.EmailDeliveryStatus = "NOT_REQUESTED";
                }
            }
        }
        catch
        {
            // Safe fallback if auxiliary tables haven't been initialized yet
        }
    }

    public async Task<FeeReceiptResponse?> GetReceiptAsync(string receiptNumber)
    {
        var c = Connection();
        var receipt = await c.QueryFirstOrDefaultAsync<FeeReceiptResponse>(
            "sp_FeeReceipt_GetByNumber",
            new { p_ReceiptNumber = receiptNumber.Trim() },
            commandType: CommandType.StoredProcedure);

        if (receipt == null)
            return null;

        var paymentState = await c.QueryFirstOrDefaultAsync<(string Status, string? GatewayStatus)>(
            @"SELECT fp.Status,
                     (SELECT pgt.Status FROM PaymentGatewayTransactions pgt
                      WHERE pgt.FeePaymentId = fp.FeePaymentId
                      ORDER BY pgt.Id DESC LIMIT 1) AS GatewayStatus
              FROM FeePayments fp
              WHERE fp.FeePaymentId = @FeePaymentId",
            new { FeePaymentId = receipt.FeePaymentId });

        if (!string.Equals(paymentState.Status, "Success", StringComparison.OrdinalIgnoreCase)
            || string.Equals(paymentState.GatewayStatus, "Reversed", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Official receipts are only available for verified, non-reversed payments.");
        }

        return receipt;
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
