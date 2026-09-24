using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Models.Fee;
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
                        p_CampusId = request.CampusId,
                        p_BoardId = request.BoardId,
                        p_AcademicYearId = request.AcademicYearId,
                        p_GroupId = request.GroupId,
                        p_ProgramId = request.ProgramId
                    },
                    tx,
                    commandType: CommandType.StoredProcedure);

            if (created == null)
            {
                // Fallback to direct EF insertion
                var entity = new FeeStructure
                {
                    CampusId = request.CampusId,
                    BoardId = request.BoardId,
                    AcademicYearId = request.AcademicYearId,
                    AcademicLevelId = 1,
                    GroupId = request.GroupId,
                    ProgramId = request.ProgramId,
                    StructureName = $"Fee Structure {request.GroupId}-{request.AcademicYearId}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _db.FeeStructures.Add(entity);
                await _db.SaveChangesAsync();

                foreach (var item in request.Items)
                {
                    _db.FeeStructureComponents.Add(new FeeStructureComponent
                    {
                        FeeStructureId = entity.FeeStructureId,
                        FeeTypeId = item.FeeTypeId,
                        Rule = item.Rule,
                        Amount = item.Amount,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                await _db.SaveChangesAsync();
                return await GetFeeStructureByIdAsync(entity.FeeStructureId);
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
     GetFeeStructuresAsync(int? campusId = null)
    {
        try
        {
            var query = _db.FeeStructures
                .AsNoTracking()
                .Include(f => f.Board)
                .Include(f => f.AcademicYear)
                .Include(f => f.Group)
                .Include(f => f.Program)
                .Include(f => f.Campus)
                .Include(f => f.Components)
                .Where(f => f.IsActive);

            if (campusId.HasValue && campusId.Value > 0)
            {
                query = query.Where(f => f.CampusId == null || f.CampusId == campusId.Value);
            }

            var list = await query.ToListAsync();
            return list.Select(f => new FeeStructureResponse
            {
                FeeStructureId = f.FeeStructureId,
                CampusId = f.CampusId,
                CampusName = f.Campus != null ? f.Campus.CampusName : (f.CampusId.HasValue ? $"Campus {f.CampusId}" : "All Campuses"),
                BoardId = f.BoardId,
                BoardName = f.Board?.BoardName ?? string.Empty,
                AcademicYearId = f.AcademicYearId,
                AcademicYearName = f.AcademicYear?.AcademicYearName ?? string.Empty,
                GroupId = f.GroupId,
                GroupName = f.Group?.GroupName ?? string.Empty,
                ProgramId = f.ProgramId,
                ProgramName = f.Program?.ProgramName,
                StructureName = f.StructureName,
                TotalAmount = f.Components.Where(c => c.IsActive).Sum(c => c.Amount),
                IsActive = f.IsActive,
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt,
                Items = f.Components.Select(c => new FeeStructureItemResponse
                {
                    FeeStructureComponentId = c.FeeStructureComponentId,
                    FeeStructureId = c.FeeStructureId,
                    FeeTypeId = c.FeeTypeId,
                    Rule = c.Rule,
                    Amount = c.Amount,
                    IsActive = c.IsActive
                }).ToList()
            }).ToList();
        }
        catch
        {
            using var c = Connection();
            using var multi = await c.QueryMultipleAsync(
                "sp_GetFeeStructures",
                new { p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);

            var structures =
                (await multi.ReadAsync<FeeStructureResponse>())
                .ToList();

            if (!multi.IsConsumed)
            {
                var items =
                    (await multi.ReadAsync<FeeStructureItemResponse>())
                    .ToList();

                foreach (var structure in structures)
                {
                    structure.Items = items
                        .Where(x => x.FeeStructureId == structure.FeeStructureId)
                        .ToList();
                }
            }

            if (campusId.HasValue && campusId.Value > 0)
            {
                structures = structures.Where(s => s.CampusId == null || s.CampusId == campusId.Value).ToList();
            }

            return structures;
        }
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

        if (string.IsNullOrWhiteSpace(request.StructureName))
        {
            var existing = await GetFeeStructureByIdAsync(id);
            if (!string.IsNullOrWhiteSpace(existing?.StructureName))
                request.StructureName = existing.StructureName;
        }

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
                p_Description = request.Description,
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
                p_Description = request.Description,
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

        // Resolve studentId: id could be a StudentFeeId or a StudentId directly
        var studentFee = await c.QueryFirstOrDefaultAsync<StudentFeeDetailsResponse>(
            "sp_GetStudentFeeDetails",
            new { p_StudentFeeId = id },
            commandType: CommandType.StoredProcedure);

        var targetStudentId = (studentFee != null && studentFee.StudentId > 0) ? studentFee.StudentId : id;

        return await GetStudentFeeDetailsByStudentAsync(targetStudentId);
    }


    // =========================================================
    // STUDENT FEE BY STUDENT ID
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

        // Result Set 2: Fee Breakdown (safely check if consumed)
        if (!multi.IsConsumed)
        {
            studentDetails.Breakdown =
                (await multi.ReadAsync<StudentFeeBreakdownResponse>())
                .ToList();
        }

        // Result Set 3: Payment Schedules (safely check if consumed)
        if (!multi.IsConsumed)
        {
            studentDetails.Schedules =
                (await multi.ReadAsync<FeeScheduleResponse>())
                .ToList();
        }

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
        int? campusId = null,
        int? academicYearId = null,
        int? groupId = null,
        int? sectionId = null,
        string? paymentPlan = null,
        string? status = null,
        string? search = null)
    {
        try
        {
            var query = _db.StudentFees
                .Include(sf => sf.Student)
                    .ThenInclude(s => s.Campus)
                .Include(sf => sf.Student)
                    .ThenInclude(s => s.AcademicYear)
                .Include(sf => sf.Student)
                    .ThenInclude(s => s.Group)
                .Include(sf => sf.Student)
                    .ThenInclude(s => s.Section)
                .Include(sf => sf.FeeStructure)
                .Include(sf => sf.PaymentPlans)
                    .ThenInclude(p => p.Installments)
                .Include(sf => sf.Payments)
                .AsQueryable();

            if (campusId.HasValue && campusId.Value > 0)
            {
                query = query.Where(sf => sf.Student.CampusId == campusId.Value);
            }
            if (academicYearId.HasValue && academicYearId.Value > 0)
            {
                query = query.Where(sf => sf.Student.AcademicYearId == academicYearId.Value);
            }
            if (groupId.HasValue && groupId.Value > 0)
            {
                query = query.Where(sf => sf.Student.GroupId == groupId.Value);
            }
            if (sectionId.HasValue && sectionId.Value > 0)
            {
                query = query.Where(sf => sf.Student.SectionId == sectionId.Value);
            }
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(sf => sf.Status == status);
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(sf => sf.Student.StudentName.ToLower().Contains(s) ||
                                          sf.Student.AdmissionNo.ToLower().Contains(s) ||
                                          (sf.Student.RollNo != null && sf.Student.RollNo.ToLower().Contains(s)));
            }

            var list = await query.ToListAsync();
            return list.Select(sf => new StudentFeeLedgerResponse
            {
                StudentFeeId = sf.StudentFeeId,
                StudentId = sf.StudentId,
                CampusId = sf.Student.CampusId,
                CampusName = sf.Student.Campus?.CampusName ?? (sf.Student.CampusId.HasValue ? $"Campus {sf.Student.CampusId}" : "Main Campus"),
                AdmissionNumber = sf.Student.AdmissionNo,
                StudentName = sf.Student.StudentName,
                GroupName = sf.Student.Group?.GroupName ?? string.Empty,
                SectionName = sf.Student.Section?.SectionName ?? string.Empty,
                TotalPayable = sf.PayableAmount,
                TotalPaid = sf.PaidAmount,
                Balance = sf.BalanceAmount,
                PaymentPlan = sf.PaymentPlan ?? "Standard",
                Status = sf.Status
            }).ToList();
        }
        catch
        {
            using var c = Connection();

            return await c.QueryAsync<StudentFeeLedgerResponse>(
                "sp_GetStudentFeeLedger",
                new
                {
                    p_CampusId = campusId,
                    p_AcademicYearId = academicYearId,
                    p_GroupId = groupId,
                    p_SectionId = sectionId,
                    p_PaymentPlan = paymentPlan,
                    p_Status = status,
                    p_Search = search
                },
                commandType: CommandType.StoredProcedure);
        }
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
        GetFeeCollectionAsync(int? campusId = null, string? search = null)
    {
        try
        {
            var query = _db.StudentFees
                .Include(sf => sf.Student)
                    .ThenInclude(s => s.Campus)
                .Include(sf => sf.Student)
                    .ThenInclude(s => s.Group)
                .Include(sf => sf.Student)
                    .ThenInclude(s => s.Section)
                .Include(sf => sf.PaymentPlans)
                    .ThenInclude(p => p.Installments)
                .Include(sf => sf.Payments)
                .AsQueryable();

            if (campusId.HasValue && campusId.Value > 0)
            {
                query = query.Where(sf => sf.Student.CampusId == campusId.Value);
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(sf => sf.Student.StudentName.ToLower().Contains(s) ||
                                          sf.Student.AdmissionNo.ToLower().Contains(s) ||
                                          (sf.Student.RollNo != null && sf.Student.RollNo.ToLower().Contains(s)));
            }

            var list = await query.ToListAsync();
            return list.Select(sf => new FeeCollectionResponse
            {
                StudentId = sf.StudentId,
                StudentFeeId = sf.StudentFeeId,
                CampusId = sf.Student.CampusId,
                CampusName = sf.Student.Campus?.CampusName ?? (sf.Student.CampusId.HasValue ? $"Campus {sf.Student.CampusId}" : "Main Campus"),
                AdmissionNumber = sf.Student.AdmissionNo,
                StudentName = sf.Student.StudentName,
                GroupName = sf.Student.Group?.GroupName ?? string.Empty,
                SectionName = sf.Student.Section?.SectionName ?? string.Empty,
                Payable = sf.PayableAmount,
                Paid = sf.PaidAmount,
                Balance = sf.BalanceAmount,
                NextDue = sf.PaymentPlans.SelectMany(p => p.Installments).Where(i => i.Status != "Paid" && i.DueDate != default).OrderBy(i => i.DueDate).Select(i => (DateTime?)i.DueDate).FirstOrDefault(),
                Status = sf.Status
            }).ToList();
        }
        catch
        {
            using var c = Connection();

            return await c.QueryAsync<FeeCollectionResponse>(
                "sp_GetFeeCollection",
                new
                {
                    p_CampusId = campusId,
                    p_Search = search
                },
                commandType: CommandType.StoredProcedure);
        }
    }


    public async Task<IEnumerable<FeeDueResponse>>
        GetDueAsync(int? campusId = null)
    {
        try
        {
            var query = _db.FeeInstallments
                .Include(i => i.FeePaymentPlan)
                    .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                            .ThenInclude(s => s.Campus)
                .Include(i => i.FeePaymentPlan)
                    .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                            .ThenInclude(s => s.Group)
                .Include(i => i.FeePaymentPlan)
                    .ThenInclude(p => p.StudentFee)
                        .ThenInclude(sf => sf.Student)
                            .ThenInclude(s => s.Section)
                .Where(i => i.Status != "Paid" && i.BalanceAmount > 0);

            if (campusId.HasValue && campusId.Value > 0)
            {
                query = query.Where(i => i.FeePaymentPlan.StudentFee.Student.CampusId == campusId.Value);
            }

            var list = await query.ToListAsync();
            return list.Select(i => new FeeDueResponse
            {
                StudentFeeId = i.FeePaymentPlan.StudentFee.StudentFeeId,
                StudentId = i.FeePaymentPlan.StudentFee.StudentId,
                CampusId = i.FeePaymentPlan.StudentFee.Student.CampusId,
                CampusName = i.FeePaymentPlan.StudentFee.Student.Campus?.CampusName,
                AdmissionNumber = i.FeePaymentPlan.StudentFee.Student.AdmissionNo,
                StudentName = i.FeePaymentPlan.StudentFee.Student.StudentName,
                GroupName = i.FeePaymentPlan.StudentFee.Student.Group?.GroupName ?? string.Empty,
                SectionName = i.FeePaymentPlan.StudentFee.Student.Section?.SectionName ?? string.Empty,
                FeeSchedule = $"Installment {i.InstallmentNumber}",
                DueDate = i.DueDate,
                Amount = i.Amount,
                Balance = i.BalanceAmount,
                Status = i.Status
            }).ToList();
        }
        catch
        {
            using var c = Connection();

            return await c.QueryAsync<FeeDueResponse>(
                "sp_GetDueFees",
                new { p_CampusId = campusId },
                commandType: CommandType.StoredProcedure);
        }
    }


    // =========================================================
    // DASHBOARD
    // =========================================================

    public async Task<FeeDashboardResponse>
        GetDashboardAsync(int? campusId = null)
    {
        try
        {
            using var c = Connection();

            using var multi =
                await c.QueryMultipleAsync(
                    "sp_GetFeeDashboard",
                    new { p_CampusId = campusId },
                    commandType: CommandType.StoredProcedure);

            var r =
                await multi.ReadFirstAsync<FeeDashboardResponse>();

            if (!multi.IsConsumed)
            {
                r.GroupWiseCollection =
                    (await multi.ReadAsync<GroupCollectionResponse>())
                    .ToList();
            }

            if (!multi.IsConsumed)
            {
                r.UpcomingSchedules =
                    (await multi.ReadAsync<FeeDueResponse>())
                    .ToList();
            }

            if (!multi.IsConsumed)
            {
                r.RecentPayments =
                    (await multi.ReadAsync<FeePaymentResponse>())
                    .ToList();
            }

            return r;
        }
        catch
        {
            var feesQuery = _db.StudentFees
                .Include(sf => sf.Student)
                .AsQueryable();

            if (campusId.HasValue && campusId.Value > 0)
            {
                feesQuery = feesQuery.Where(sf => sf.Student.CampusId == campusId.Value);
            }

            var fees = await feesQuery.ToListAsync();
            var totalExpected = fees.Sum(f => f.PayableAmount);
            var totalCollected = fees.Sum(f => f.PaidAmount);
            var totalOutstanding = fees.Sum(f => f.BalanceAmount);

            return new FeeDashboardResponse
            {
                TotalExpected = totalExpected,
                TotalCollected = totalCollected,
                TotalOutstanding = totalOutstanding,
                CollectionPercentage = totalExpected > 0 ? Math.Round((totalCollected / totalExpected) * 100, 2) : 0,
                TotalStudents = fees.Count,
                PendingStudents = fees.Count(f => f.Status == "Pending" || f.Status == "Partial"),
                OverdueStudents = fees.Count(f => f.Status == "Overdue")
            };
        }
    }


    // =========================================================
    // DAILY REPORT
    // =========================================================

    public async Task<FeeReportResponse>
        GetDailyReportAsync(int? campusId = null, DateTime? date = null)
    {
        var targetDate = (date ?? DateTime.Today).Date;
        try
        {
            using var c = Connection();

            using var multi =
                await c.QueryMultipleAsync(
                    "sp_GetDailyFeeReport",
                    new
                    {
                        p_CampusId = campusId,
                        p_ReportDate = targetDate
                    },
                    commandType: CommandType.StoredProcedure);

            var r =
                await multi.ReadFirstAsync<FeeReportResponse>();

            if (!multi.IsConsumed)
            {
                r.Transactions =
                    (await multi.ReadAsync<FeePaymentResponse>())
                    .ToList();
            }

            return r;
        }
        catch
        {
            var paymentsQuery = _db.FeePayments
                .Include(p => p.Student)
                .Where(p => p.PaymentDate.Date == targetDate);

            if (campusId.HasValue && campusId.Value > 0)
            {
                paymentsQuery = paymentsQuery.Where(p => p.Student.CampusId == campusId.Value);
            }

            var payments = await paymentsQuery.ToListAsync();
            var totalAmount = payments.Sum(p => p.Amount);

            return new FeeReportResponse
            {
                FromDate = targetDate,
                ToDate = targetDate,
                TotalCollected = totalAmount,
                TransactionCount = payments.Count,
                Transactions = payments.Select(p => new FeePaymentResponse
                {
                    FeePaymentId = p.FeePaymentId,
                    StudentId = p.StudentId,
                    StudentName = p.Student?.StudentName ?? string.Empty,
                    StudentFeeId = p.StudentFeeId,
                    ReceiptNumber = p.ReceiptNumber ?? string.Empty,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMode,
                    TransactionReference = p.TransactionReference,
                    Remarks = p.Remarks,
                    Status = p.Status
                }).ToList()
            };
        }
    }


    // =========================================================
    // MONTHLY REPORT
    // =========================================================

    public async Task<FeeReportResponse>
        GetMonthlyReportAsync(
            int? campusId = null,
            int? year = null,
            int? month = null)
    {
        var d = new DateTime(
            year ?? DateTime.Today.Year,
            month ?? DateTime.Today.Month,
            1);

        try
        {
            using var c = Connection();

            using var multi =
                await c.QueryMultipleAsync(
                    "sp_GetMonthlyFeeReport",
                    new
                    {
                        p_CampusId = campusId,
                        p_Year = d.Year,
                        p_Month = d.Month
                    },
                    commandType: CommandType.StoredProcedure);

            var r =
                await multi.ReadFirstAsync<FeeReportResponse>();

            if (!multi.IsConsumed)
            {
                r.Transactions =
                    (await multi.ReadAsync<FeePaymentResponse>())
                    .ToList();
            }

            return r;
        }
        catch
        {
            var paymentsQuery = _db.FeePayments
                .Include(p => p.Student)
                .Where(p => p.PaymentDate.Year == d.Year && p.PaymentDate.Month == d.Month);

            if (campusId.HasValue && campusId.Value > 0)
            {
                paymentsQuery = paymentsQuery.Where(p => p.Student.CampusId == campusId.Value);
            }

            var payments = await paymentsQuery.ToListAsync();
            var totalAmount = payments.Sum(p => p.Amount);

            return new FeeReportResponse
            {
                FromDate = d,
                ToDate = d.AddMonths(1).AddDays(-1),
                TotalCollected = totalAmount,
                TransactionCount = payments.Count,
                Transactions = payments.Select(p => new FeePaymentResponse
                {
                    FeePaymentId = p.FeePaymentId,
                    StudentId = p.StudentId,
                    StudentName = p.Student?.StudentName ?? string.Empty,
                    StudentFeeId = p.StudentFeeId,
                    ReceiptNumber = p.ReceiptNumber ?? string.Empty,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMode,
                    TransactionReference = p.TransactionReference,
                    Remarks = p.Remarks,
                    Status = p.Status
                }).ToList()
            };
        }
    }
}