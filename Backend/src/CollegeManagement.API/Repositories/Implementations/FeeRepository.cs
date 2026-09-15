using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CollegeManagement.API.Repositories.Implementations;

public class FeeRepository : IFeeRepository
{
    private readonly AppDbContext _db;

    public FeeRepository(AppDbContext db)
    {
        _db = db;
    }

    private IDbConnection Connection()
    {
        return _db.Database.GetDbConnection();
    }


    // =========================================================
    // FEE TYPES
    // =========================================================

    public async Task<FeeTypeResponse?> CreateFeeTypeAsync(
        CreateFeeTypeRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeTypeResponse>(
            "sp_CreateFeeType",
            new
            {
                p_FeeTypeName = request.FeeTypeName,
                p_Category = request.Category,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<IEnumerable<FeeTypeResponse>> GetFeeTypesAsync()
    {
        using var c = Connection();

        return await c.QueryAsync<FeeTypeResponse>(
            "sp_GetFeeTypes",
            commandType: CommandType.StoredProcedure);
    }


    public async Task<FeeTypeResponse?> GetFeeTypeByIdAsync(int feeTypeId)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeTypeResponse>(
            "sp_GetFeeTypeById",
            new
            {
                p_FeeTypeId = feeTypeId
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<FeeTypeResponse?> UpdateFeeTypeAsync(
        int id,
        UpdateFeeTypeRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeTypeResponse>(
            "sp_UpdateFeeType",
            new
            {
                p_FeeTypeId = id,
                p_FeeTypeName = request.FeeTypeName,
                p_Category = request.Category,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<bool> DeleteFeeTypeAsync(int id)
    {
        using var c = Connection();

        return await c.ExecuteAsync(
            "sp_DeleteFeeType",
            new
            {
                p_FeeTypeId = id
            },
            commandType: CommandType.StoredProcedure) > 0;
    }


    // =========================================================
    // FEE STRUCTURES
    // =========================================================

    public async Task<FeeStructureResponse?> CreateFeeStructureAsync(
        CreateFeeStructureRequest request)
    {
        using var c = Connection();

        c.Open();

        using var tx = c.BeginTransaction();

        try
        {
            var created =
                await c.QueryFirstOrDefaultAsync<FeeStructureResponse>(
                    "sp_CreateFeeStructure",
                    new
                    {
                        p_BoardId = request.BoardId,
                        p_AcademicYearId = request.AcademicYearId,
                        p_GroupId = request.GroupId,
                        p_ProgramId = request.ProgramId
                    },
                    tx,
                    commandType: CommandType.StoredProcedure);

            if (created == null)
            {
                tx.Rollback();
                return null;
            }

            foreach (var item in request.Items)
            {
                await c.ExecuteAsync(
                    "sp_AddFeeStructureItem",
                    new
                    {
                        p_FeeStructureId = created.FeeStructureId,
                        p_FeeTypeId = item.FeeTypeId,
                        p_Rule = item.Rule,
                        p_Amount = item.Amount
                    },
                    tx,
                    commandType: CommandType.StoredProcedure);
            }

            tx.Commit();

            return await GetFeeStructureByIdAsync(
                created.FeeStructureId);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }


    public async Task<IEnumerable<FeeStructureResponse>>
     GetFeeStructuresAsync()
    {
        using var c = Connection();

        using var multi = await c.QueryMultipleAsync(
            "sp_GetFeeStructures",
            commandType: CommandType.StoredProcedure);

        var structures =
            (await multi.ReadAsync<FeeStructureResponse>())
            .ToList();

        var items =
            (await multi.ReadAsync<FeeStructureItemResponse>())
            .ToList();

        foreach (var structure in structures)
        {
            structure.Items = items
                .Where(x => x.FeeStructureId == structure.FeeStructureId)
                .ToList();
        }

        return structures;
    }


    public async Task<FeeStructureResponse?> GetFeeStructureByIdAsync(
        int id)
    {
        using var c = Connection();

        using var multi = await c.QueryMultipleAsync(
            "sp_GetFeeStructureById",
            new
            {
                p_FeeStructureId = id
            },
            commandType: CommandType.StoredProcedure);

        var result =
            await multi.ReadFirstOrDefaultAsync<FeeStructureResponse>();

        if (result == null)
            return null;

        result.Items =
            (await multi.ReadAsync<FeeStructureItemResponse>())
            .ToList();

        return result;
    }


    public async Task<FeeStructureResponse?> UpdateFeeStructureAsync(
    int id,
    UpdateFeeStructureRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeStructureResponse>(
            "sp_UpdateFeeStructure",
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
        using var c = Connection();

        return await c.ExecuteAsync(
            "sp_DeleteFeeStructure",
            new
            {
                p_FeeStructureId = id
            },
            commandType: CommandType.StoredProcedure) > 0;
    }


    public async Task<FeeStructureItemResponse?>
        AddFeeStructureItemAsync(
            int id,
            CreateFeeStructureItemRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeStructureItemResponse>(
            "sp_AddFeeStructureItem",
            new
            {
                p_FeeStructureId = id,
                p_FeeTypeId = request.FeeTypeId,
                p_Rule = request.Rule,
                p_Amount = request.Amount
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<IEnumerable<FeeStructureItemResponse>>
        GetFeeStructureItemsAsync(int id)
    {
        using var c = Connection();

        return await c.QueryAsync<FeeStructureItemResponse>(
            "sp_GetFeeStructureItems",
            new
            {
                p_FeeStructureId = id
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<FeeStructureItemResponse?>
        UpdateFeeStructureItemAsync(
            int id,
            UpdateFeeStructureItemRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeStructureItemResponse>(
            "sp_UpdateFeeStructureItem",
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
        using var c = Connection();

        return await c.ExecuteAsync(
            "sp_DeleteFeeStructureItem",
            new
            {
                p_FeeStructureComponentId = id
            },
            commandType: CommandType.StoredProcedure) > 0;
    }


    // =========================================================
    // SCHOLARSHIPS
    // =========================================================

    public async Task<ScholarshipResponse?> CreateScholarshipAsync(
        CreateScholarshipRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<ScholarshipResponse>(
            "sp_CreateScholarship",
            new
            {
                p_ScholarshipName = request.ScholarshipName,
                p_DiscountType = request.DiscountType,
                p_DiscountValue = request.DiscountValue,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<IEnumerable<ScholarshipResponse>>
        GetScholarshipsAsync()
    {
        using var c = Connection();

        return await c.QueryAsync<ScholarshipResponse>(
            "sp_GetScholarships",
            commandType: CommandType.StoredProcedure);
    }


    public async Task<ScholarshipResponse?> GetScholarshipByIdAsync(
        int id)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<ScholarshipResponse>(
            "sp_GetScholarshipById",
            new
            {
                p_ScholarshipId = id
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<ScholarshipResponse?> UpdateScholarshipAsync(
        int id,
        UpdateScholarshipRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<ScholarshipResponse>(
            "sp_UpdateScholarship",
            new
            {
                p_ScholarshipId = id,
                p_ScholarshipName = request.ScholarshipName,
                p_DiscountType = request.DiscountType,
                p_DiscountValue = request.DiscountValue,
                p_IsActive = request.IsActive
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<bool> DeleteScholarshipAsync(int id)
    {
        using var c = Connection();

        return await c.ExecuteAsync(
            "sp_DeleteScholarship",
            new
            {
                p_ScholarshipId = id
            },
            commandType: CommandType.StoredProcedure) > 0;
    }


    // =========================================================
    // STUDENT FEES
    // =========================================================
    public async Task<StudentFeeResponse?> AssignStudentFeeAsync(
    AssignStudentFeeRequest request)
    {
        using var c = Connection();

        using var multi = await c.QueryMultipleAsync(
            "sp_AssignStudentFee",
            new
            {
                p_StudentId = request.StudentId,
                p_FeeStructureId = request.FeeStructureId,
                p_PlanName = request.PlanName,
                p_NumberOfInstallments = request.NumberOfInstallments
            },
            commandType: CommandType.StoredProcedure);

        // Result Set 1:
        // sp_AutoCreatePaymentPlan -> FeePaymentPlans
        var paymentPlan =
            await multi.ReadFirstOrDefaultAsync<PaymentPlanResponse>();

        // Result Set 2:
        // sp_AutoCreatePaymentPlan -> FeeInstallments
        var schedules =
            (await multi.ReadAsync<FeeScheduleResponse>())
            .ToList();

        // Result Set 3:
        // sp_AssignStudentFee -> StudentFees
        var studentFee =
            await multi.ReadFirstOrDefaultAsync<StudentFeeResponse>();

        if (studentFee == null)
            return null;

        // Attach payment plan information to response
        if (paymentPlan != null)
        {
            studentFee.PaymentPlan = paymentPlan.PlanName;
        }

        // Attach installments/schedules
        studentFee.Schedules = schedules;

        return studentFee;
    }


    // =========================================================
    // STUDENT FEE BY STUDENT FEE ID
    // =========================================================

    public async Task<StudentFeeDetailsResponse?> GetStudentFeeAsync(int id)
    {
        using var c = Connection();

        const string sql = @"
        CALL sp_GetStudentFeeDetailsByStudent(
            @p_StudentId
        );";

        using var multi = await c.QueryMultipleAsync(
            sql,
            new
            {
                p_StudentId = id
            });

        // Result Set 1: Student Fee Summary
        var result =
            await multi.ReadFirstOrDefaultAsync<StudentFeeDetailsResponse>();

        if (result == null)
            return null;

        // Result Set 2: Fee Breakdown
        result.Breakdown =
            (await multi.ReadAsync<StudentFeeBreakdownResponse>())
            .ToList();

        // Result Set 3: Payment Schedules
        result.Schedules =
            (await multi.ReadAsync<FeeScheduleResponse>())
            .ToList();

        return result;
    }


    // =========================================================
    // STUDENT FEE BY STUDENT ID
    //
    // IMPORTANT:
    // sp_GetStudentFeeDetailsByStudent returns ONLY 2 result sets:
    //
    // 1. Student fee summary
    // 2. Student fee components
    //
    // =========================================================
    public async Task<StudentFeeDetailsResponse?>
    GetStudentFeeDetailsByStudentAsync(int studentId)
    {
        using var c = Connection();

        using var multi = await c.QueryMultipleAsync(
            "sp_GetStudentFeeDetailsByStudent",
            new
            {
                p_StudentId = studentId
            },
            commandType: CommandType.StoredProcedure);

        // Result Set 1: Student Fee Summary
        var studentDetails =
            await multi.ReadFirstOrDefaultAsync<StudentFeeDetailsResponse>();

        if (studentDetails == null)
            return null;

        // Result Set 2: Fee Breakdown
        studentDetails.Breakdown =
            (await multi.ReadAsync<StudentFeeBreakdownResponse>())
            .ToList();

        // Result Set 3: Payment Schedules
        studentDetails.Schedules =
            (await multi.ReadAsync<FeeScheduleResponse>())
            .ToList();

        return studentDetails;
    }

    // =========================================================
    // COMMON STUDENT FEE READER
    //
    // Used by sp_GetStudentFeeDetails.
    // This SP should return its expected result sets.
    // =========================================================

    private async Task<StudentFeeDetailsResponse?>
        ReadStudentDetails(SqlMapper.GridReader multi)
    {
        var result =
            await multi.ReadFirstOrDefaultAsync<StudentFeeDetailsResponse>();

        if (result == null)
            return null;

        result.Breakdown =
            (await multi.ReadAsync<StudentFeeBreakdownResponse>())
            .ToList();

        return result;
    }


    // =========================================================
    // STUDENT FEE LEDGER
    //
    // Current SP signature:
    // sp_GetStudentFeeLedger(IN p_StudentId INT)
    //
    // Therefore repository accepts studentId.
    // =========================================================

    public async Task<IEnumerable<StudentFeeLedgerResponse>>
    GetStudentFeeLedgerAsync(
        int? academicYearId,
        int? groupId,
        int? sectionId,
        string? paymentPlan,
        string? status,
        string? search)
    {
        using var c = Connection();

        const string sql = @"
        CALL sp_GetStudentFeeLedger(
            @p_AcademicYearId,
            @p_GroupId,
            @p_SectionId,
            @p_PaymentPlan,
            @p_Status,
            @p_Search
        );";

        return await c.QueryAsync<StudentFeeLedgerResponse>(
            sql,
            new
            {
                p_AcademicYearId = academicYearId,
                p_GroupId = groupId,
                p_SectionId = sectionId,
                p_PaymentPlan = paymentPlan,
                p_Status = status,
                p_Search = search
            },
            commandType: CommandType.Text);
    }

    // =========================================================
    // FEE CONCESSION
    // =========================================================

    public async Task<FeeConcessionResponse?>
        ApplyFeeConcessionAsync(
            ApplyFeeConcessionRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeConcessionResponse>(
            "sp_ApplyFeeConcession",
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
    // PAYMENT PLAN
    // =========================================================

    public async Task<PaymentPlanResponse?>
        CreatePaymentPlanAsync(
            CreatePaymentPlanRequest request)
    {
        using var c = Connection();

        c.Open();

        using var tx = c.BeginTransaction();

        try
        {
            var plan =
                await c.QueryFirstOrDefaultAsync<PaymentPlanResponse>(
                    "sp_CreatePaymentPlan",
                    new
                    {
                        p_StudentFeeId = request.StudentFeeId,
                        p_PlanName = request.PlanName,
                        p_NumberOfInstallments =
                            request.NumberOfInstallments
                    },
                    tx,
                    commandType: CommandType.StoredProcedure);

            if (plan == null)
            {
                tx.Rollback();
                return null;
            }

           

            tx.Commit();

            using var c2 = Connection();

            using var multi =
                await c2.QueryMultipleAsync(
                    "sp_GetPaymentPlan",
                    new
                    {
                        p_FeePaymentPlanId =
                            plan.FeePaymentPlanId
                    },
                    commandType: CommandType.StoredProcedure);

            var response =
                await multi.ReadFirstOrDefaultAsync<PaymentPlanResponse>();

            if (response != null)
            {
                response.Installments =
                    (await multi.ReadAsync<FeeScheduleResponse>())
                    .ToList();
            }

            return response;
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }


    public async Task<FeeScheduleResponse?>
        AddPaymentPlanInstallmentAsync(
            int planId,
            CreateInstallmentRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeScheduleResponse>(
            "sp_AddPaymentPlanInstallment",
            new
            {
                p_FeePaymentPlanId = planId,
                p_InstallmentNumber =
                    request.InstallmentNumber,
                p_Amount = request.Amount,
                p_DueDate = request.DueDate
            },
            commandType: CommandType.StoredProcedure);
    }


    // =========================================================
    // PAYMENTS
    // =========================================================

    public async Task<FeePaymentResponse?>
        CreateFeePaymentAsync(
            CreateFeePaymentRequest request)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeePaymentResponse>(
            "sp_CollectFeePayment",
            new
            {
                p_StudentId = request.StudentId,
                p_StudentFeeId = request.StudentFeeId,
                p_FeeInstallmentId =
                    request.FeeInstallmentId,
                p_Amount = request.Amount,
                p_PaymentDate =
                    request.PaymentDate ?? DateTime.UtcNow,
                p_PaymentMode = request.PaymentMode,
                p_Discount = request.Discount,
                p_Fine = request.Fine,
                p_TransactionReference =
                    request.TransactionReference,
                p_Note = request.Note,
                p_CollectedBy = request.CollectedBy
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<IEnumerable<FeePaymentResponse>>
        GetFeePaymentsAsync(int studentId)
    {
        using var c = Connection();

        return await c.QueryAsync<FeePaymentResponse>(
            "sp_GetPaymentHistoryByStudent",
            new
            {
                p_StudentId = studentId
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<FeePaymentResponse?>
        GetFeePaymentByIdAsync(int id)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeePaymentResponse>(
            "sp_GetFeePaymentById",
            new
            {
                p_FeePaymentId = id
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<FeeReceiptResponse?>
        GetReceiptAsync(string receiptNumber)
    {
        using var c = Connection();

        return await c.QueryFirstOrDefaultAsync<FeeReceiptResponse>(
            "sp_GetFeeReceipt",
            new
            {
                p_ReceiptNumber = receiptNumber
            },
            commandType: CommandType.StoredProcedure);
    }


    // =========================================================
    // COLLECTION
    // =========================================================

    public async Task<IEnumerable<FeeCollectionResponse>>
        GetFeeCollectionAsync(string? search)
    {
        using var c = Connection();

        return await c.QueryAsync<FeeCollectionResponse>(
            "sp_GetFeeCollection",
            new
            {
                p_Search = search
            },
            commandType: CommandType.StoredProcedure);
    }


    public async Task<IEnumerable<FeeDueResponse>>
        GetDueAsync()
    {
        using var c = Connection();

        return await c.QueryAsync<FeeDueResponse>(
            "sp_GetDueFees",
            commandType: CommandType.StoredProcedure);
    }


    // =========================================================
    // DASHBOARD
    // =========================================================

    public async Task<FeeDashboardResponse>
        GetDashboardAsync()
    {
        using var c = Connection();

        using var multi =
            await c.QueryMultipleAsync(
                "sp_GetFeeDashboard",
                commandType: CommandType.StoredProcedure);

        var r =
            await multi.ReadFirstAsync<FeeDashboardResponse>();

        r.GroupWiseCollection =
            (await multi.ReadAsync<GroupCollectionResponse>())
            .ToList();

        r.UpcomingSchedules =
            (await multi.ReadAsync<FeeDueResponse>())
            .ToList();

        r.RecentPayments =
            (await multi.ReadAsync<FeePaymentResponse>())
            .ToList();

        return r;
    }


    // =========================================================
    // DAILY REPORT
    // =========================================================

    public async Task<FeeReportResponse>
        GetDailyReportAsync(DateTime? date)
    {
        using var c = Connection();

        using var multi =
            await c.QueryMultipleAsync(
                "sp_GetDailyFeeReport",
                new
                {
                    p_ReportDate =
                        (date ?? DateTime.Today).Date
                },
                commandType: CommandType.StoredProcedure);

        var r =
            await multi.ReadFirstAsync<FeeReportResponse>();

        r.Transactions =
            (await multi.ReadAsync<FeePaymentResponse>())
            .ToList();

        return r;
    }


    // =========================================================
    // MONTHLY REPORT
    // =========================================================

    public async Task<FeeReportResponse>
        GetMonthlyReportAsync(
            int? year,
            int? month)
    {
        var d = new DateTime(
            year ?? DateTime.Today.Year,
            month ?? DateTime.Today.Month,
            1);

        using var c = Connection();

        using var multi =
            await c.QueryMultipleAsync(
                "sp_GetMonthlyFeeReport",
                new
                {
                    p_Year = d.Year,
                    p_Month = d.Month
                },
                commandType: CommandType.StoredProcedure);

        var r =
            await multi.ReadFirstAsync<FeeReportResponse>();

        r.Transactions =
            (await multi.ReadAsync<FeePaymentResponse>())
            .ToList();

        return r;
    }
}