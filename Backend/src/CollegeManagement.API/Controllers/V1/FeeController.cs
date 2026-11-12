using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Data;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1;

/// <summary>Fee Management APIs used by the Fee Management screens.</summary>
[ApiController]
[Route("api/v1/fees")]
[Authorize]
[RequirePermission("fee-management")]
public class FeeController : ControllerBase
{
    private readonly IFeeService _service;
    private readonly INotificationService? _notificationService;
    private readonly IPaymentSettlementService? _settlementService;
    private readonly AppDbContext? _dbContext;
    private readonly ICampusAuthorizationService? _campusAuthService;

    public FeeController(
        IFeeService service,
        INotificationService? notificationService = null,
        IPaymentSettlementService? settlementService = null,
        AppDbContext? dbContext = null,
        ICampusAuthorizationService? campusAuthService = null)
    {
        _service = service;
        _notificationService = notificationService;
        _settlementService = settlementService;
        _dbContext = dbContext;
        _campusAuthService = campusAuthService;
    }

    private bool IsPrivilegedStaff()
    {
        return User.IsInRole("Admin") || User.IsInRole("Super Admin") || User.IsInRole("SuperAdmin") ||
               User.IsInRole("Principal") || User.IsInRole("Accountant") || User.IsInRole("Finance") ||
               User.IsInRole("Teacher") || User.IsInRole("Staff");
    }

    private bool IsGlobalAdmin()
    {
        return User.IsInRole("Admin") || User.IsInRole("Super Admin") ||
               User.IsInRole("SuperAdmin") || User.IsInRole("Administrator");
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirst("UserId")?.Value
            ?? User.FindFirst("userId")?.Value
            ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out int id) ? id : null;
    }

    private int? GetCallerStudentId()
    {
        var claim = User.FindFirst("StudentId")?.Value
            ?? User.FindFirst("studentId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out int id) ? id : null;
    }

    private async Task<bool> IsAuthorizedForStudentAsync(int targetStudentId)
    {
        if (targetStudentId <= 0) return false;
        if (IsPrivilegedStaff()) return true;

        var userRole = User.FindFirstValue(ClaimTypes.Role);
        if (string.Equals(userRole, "Student", StringComparison.OrdinalIgnoreCase))
        {
            var callerStudentId = GetCallerStudentId();
            return callerStudentId.HasValue && callerStudentId.Value == targetStudentId;
        }

        if (string.Equals(userRole, "Parent", StringComparison.OrdinalIgnoreCase) && _dbContext != null)
        {
            var parentId = GetCurrentUserId();
            if (!parentId.HasValue) return false;
            var conn = _dbContext.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_CheckParentStudentMapping",
                new { p_ParentUserId = parentId.Value, p_StudentId = targetStudentId },
                commandType: System.Data.CommandType.StoredProcedure);
            return count > 0;
        }

        return false;
    }

    private async Task<(bool Authorized, int? EffectiveCampusId, IActionResult? ErrorResult)> ResolveCampusScopeAsync(int? requestedCampusId)
    {
        if (IsGlobalAdmin())
            return (true, requestedCampusId, null);

        if (_campusAuthService != null)
        {
            var access = await _campusAuthService.ResolveCampusAccessAsync(User, requestedCampusId);
            if (!access.IsAuthorized)
                return (false, null, StatusCode(403, new { success = false, message = access.ErrorMessage ?? "Cross-campus access is forbidden." }));
            return (true, requestedCampusId.HasValue && requestedCampusId.Value > 0 ? requestedCampusId : access.EffectiveCampusId, null);
        }

        try
        {
            var resolved = CampusContextResolver.ResolveAndValidateCampusId(User, requestedCampusId);
            return (true, resolved, null);
        }
        catch (ForbiddenException ex)
        {
            return (false, null, StatusCode(403, new { success = false, message = ex.Message }));
        }
    }

    private async Task<(bool Authorized, IActionResult? ErrorResult)> EnsureAuthorizedForStudentCampusAsync(int studentId)
    {
        if (IsGlobalAdmin() || _dbContext == null)
            return (true, null);

        var campusId = await _dbContext.Students.AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .Select(s => s.CampusId)
            .FirstOrDefaultAsync();

        var (ok, _, err) = await ResolveCampusScopeAsync(campusId);
        return (ok, err);
    }

    private async Task<(bool Authorized, IActionResult? ErrorResult)> EnsureAuthorizedForStudentFeeCampusAsync(int studentFeeId)
    {
        if (IsGlobalAdmin() || _dbContext == null)
            return (true, null);

        var info = await _dbContext.StudentFees.AsNoTracking()
            .Where(sf => sf.StudentFeeId == studentFeeId)
            .Select(sf => new { StudentCampusId = sf.Student != null ? sf.Student.CampusId : null, StructureCampusId = sf.FeeStructure != null ? sf.FeeStructure.CampusId : null })
            .FirstOrDefaultAsync();

        var campusId = info?.StudentCampusId ?? info?.StructureCampusId;
        var (ok, _, err) = await ResolveCampusScopeAsync(campusId);
        return (ok, err);
    }

    // ---------------- Fee Types ----------------
    /// <summary>Create a reusable fee type such as Admission Fee or Course Fee.</summary>
    [HttpPost("types")]
    public async Task<IActionResult> CreateFeeType(CreateFeeTypeRequest request) => Ok(await _service.CreateFeeTypeAsync(request));

    /// <summary>List active and inactive fee types for Fee Setup.</summary>
    [HttpGet("types")]
    public async Task<IActionResult> GetFeeTypes([FromQuery] int? campusId, [FromQuery] int? boardId, [FromQuery] int? academicYearId) => Ok(await _service.GetFeeTypesAsync(campusId, boardId, academicYearId));

    /// <summary>Get one fee type by ID.</summary>
    [HttpGet("types/{id:int}")]
    public async Task<IActionResult> GetFeeType(int id) => Ok(await _service.GetFeeTypeByIdAsync(id));

    /// <summary>Update fee type name, category or status.</summary>
    [HttpPut("types/{id:int}")]
    public async Task<IActionResult> UpdateFeeType(int id, UpdateFeeTypeRequest request) => Ok(await _service.UpdateFeeTypeAsync(id, request));

    /// <summary>Deactivate a fee type.</summary>
    [HttpDelete("types/{id:int}")]
    public async Task<IActionResult> DeleteFeeType(int id) => Ok(new { success = await _service.DeleteFeeTypeAsync(id) });

    // ---------------- Fee Structures ----------------
    /// <summary>Create a fee structure for Board, Academic Year, Group and optional Program.</summary>
    [HttpPost("structures")]
    public async Task<IActionResult> CreateFeeStructure(CreateFeeStructureRequest request) => Ok(await _service.CreateFeeStructureAsync(request));

    /// <summary>List configured fee structures with configured fee types and total fee.</summary>
    [HttpGet("structures")]
    public async Task<IActionResult> GetFeeStructures([FromQuery] int? campusId) => Ok(await _service.GetFeeStructuresAsync(campusId));

    /// <summary>Get one fee structure and all configured fee types.</summary>
    [HttpGet("structures/{id:int}")]
    public async Task<IActionResult> GetFeeStructure(int id) => Ok(await _service.GetFeeStructureByIdAsync(id));

    /// <summary>Update fee structure program or active status.</summary>
    [HttpPut("structures/{id:int}")]
    public async Task<IActionResult> UpdateFeeStructure(int id, UpdateFeeStructureRequest request) => Ok(await _service.UpdateFeeStructureAsync(id, request));

    /// <summary>Deactivate a fee structure.</summary>
    [HttpDelete("structures/{id:int}")]
    public async Task<IActionResult> DeleteFeeStructure(int id) => Ok(new { success = await _service.DeleteFeeStructureAsync(id) });

    /// <summary>Add a fee type and amount to an existing fee structure.</summary>
    [HttpPost("structures/{id:int}/items")]
    public async Task<IActionResult> AddStructureItem(int id, CreateFeeStructureItemRequest request) => Ok(await _service.AddFeeStructureItemAsync(id, request));

    /// <summary>Get configured fee types for one fee structure.</summary>
    [HttpGet("structures/{id:int}/items")]
    public async Task<IActionResult> GetStructureItems(int id) => Ok(await _service.GetFeeStructureItemsAsync(id));

    /// <summary>Update amount or Mandatory/Optional rule of a configured fee type.</summary>
    [HttpPut("items/{id:int}")]
    public async Task<IActionResult> UpdateStructureItem(int id, UpdateFeeStructureItemRequest request) => Ok(await _service.UpdateFeeStructureItemAsync(id, request));

    /// <summary>Deactivate a configured fee type from a structure.</summary>
    [HttpDelete("items/{id:int}")]
    public async Task<IActionResult> DeleteStructureItem(int id) => Ok(new { success = await _service.DeleteFeeStructureItemAsync(id) });

    // ---------------- Scholarships ----------------
    /// <summary>Add a scholarship or concession scheme to Fee Setup.</summary>
    [HttpPost("scholarships")]
    public async Task<IActionResult> CreateScholarship(CreateScholarshipRequest request) => Ok(await _service.CreateScholarshipAsync(request));

    /// <summary>List scholarship and concession schemes.</summary>
    [HttpGet("scholarships")]
    public async Task<IActionResult> GetScholarships([FromQuery] int? campusId, [FromQuery] int? boardId, [FromQuery] int? academicYearId) => Ok(await _service.GetScholarshipsAsync(campusId, boardId, academicYearId));

    /// <summary>Get one scholarship scheme.</summary>
    [HttpGet("scholarships/{id:int}")]
    public async Task<IActionResult> GetScholarship(int id) => Ok(await _service.GetScholarshipByIdAsync(id));

    /// <summary>Update scholarship name, discount type, value or status.</summary>
    [HttpPut("scholarships/{id:int}")]
    public async Task<IActionResult> UpdateScholarship(int id, UpdateScholarshipRequest request) => Ok(await _service.UpdateScholarshipAsync(id, request));

    /// <summary>Deactivate a scholarship scheme.</summary>
    [HttpDelete("scholarships/{id:int}")]
    public async Task<IActionResult> DeleteScholarship(int id) => Ok(new { success = await _service.DeleteScholarshipAsync(id) });

    // ---------------- Student Fee ----------------
    /// <summary>Assign a configured fee structure to an approved student.</summary>
    [HttpPost("student-fees/assign")]
    public async Task<IActionResult> AssignStudentFee(AssignStudentFeeRequest request)
    {
        var (ok, err) = await EnsureAuthorizedForStudentCampusAsync(request.StudentId);
        if (!ok) return err!;
        var result = await _service.AssignStudentFeeAsync(request);

        if (_notificationService != null && request.StudentId > 0 && result != null)
        {
            try
            {
                await _notificationService.SendToStudentAsync(
                    request.StudentId,
                    "Fee Structure Assigned",
                    $"Fee demand generated for your account. Total Payable Amount: ₹{result.PayableAmount:N0}. Status: {result.Status}.",
                    "Fee",
                    result.StudentFeeId,
                    "/student/fees");

                await _notificationService.SendToRolesAsync(
                    new[] { "Parent" },
                    null,
                    "Fee Structure Assigned",
                    $"Fee demand generated for student #{request.StudentId}. Total Amount: ₹{result.PayableAmount:N0}.",
                    "Fee",
                    result.StudentFeeId,
                    "/parent/fees");
            }
            catch { }
        }

        return Ok(result);
    }

    /// <summary>Get the complete student fee details, breakdown, schedules and payment history.</summary>
    [HttpGet("student-fees/{id:int}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Teacher,Staff,Student,Parent")]
    [BypassPermission]
    public async Task<IActionResult> GetStudentFee(int id)
    {
        var result = await _service.GetStudentFeeAsync(id);
        if (result == null) return NotFound(new { message = "Student fee record not found." });

        if (!IsPrivilegedStaff())
        {
            if (!await IsAuthorizedForStudentAsync(result.StudentId))
                return Forbid();
        }
        else
        {
            var (ok, err) = await EnsureAuthorizedForStudentCampusAsync(result.StudentId);
            if (!ok) return err!;
        }

        return Ok(result);
    }

    /// <summary>Get student fee details by student ID.</summary>
    [HttpGet("students/{studentId:int}/fee-details")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Teacher,Staff,Student,Parent")]
    [BypassPermission]
    [ParentStudentAuthorization("studentId")]
    public async Task<IActionResult> GetStudentFeeDetails(int studentId)
    {
        var result = await _service.GetStudentFeeDetailsByStudentAsync(studentId);
        return result == null ? NotFound(new { message = "Student fee record not found." }) : Ok(result);
    }

    /// <summary>Batch fetch student fee details to eliminate N+1 roundtrips.</summary>
    [HttpPost("students/bulk-fee-details")]
    public async Task<IActionResult> GetBulkStudentFeeDetails([FromBody] List<int> studentIds)
    {
        if (studentIds == null || !studentIds.Any()) return Ok(new Dictionary<int, object>());
        return Ok(await _service.GetBulkStudentFeeDetailsAsync(studentIds));
    }

    /// <summary>Student Fee Ledger with search and screen filters.</summary>
    [HttpGet("ledger")]
    public async Task<IActionResult> GetLedger([FromQuery] int? campusId, [FromQuery] int? academicYearId, [FromQuery] int? groupId, [FromQuery] int? sectionId, [FromQuery] string? paymentPlan, [FromQuery] string? status, [FromQuery] string? search, [FromQuery] int? boardId)
    {
        var (ok, effectiveCampusId, err) = await ResolveCampusScopeAsync(campusId);
        if (!ok) return err!;
        return Ok(await _service.GetStudentFeeLedgerAsync(effectiveCampusId, academicYearId, groupId, sectionId, paymentPlan, status, search, boardId));
    }

    /// <summary>Compatibility route for student-specific fee ledger.</summary>
    [HttpGet("students/{studentId:int}/fee-ledger")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Teacher,Staff,Student,Parent")]
    [BypassPermission]
    [ParentStudentAuthorization("studentId")]
    public async Task<IActionResult> GetStudentLedger(int studentId) => Ok(await _service.GetStudentFeeDetailsByStudentAsync(studentId));

    // ---------------- Concession ----------------
    /// <summary>Apply a student-specific concession or scholarship after fee assignment.</summary>
    [HttpPost("concession")]
    public async Task<IActionResult> ApplyConcession(ApplyFeeConcessionRequest request)
    {
        var result = await _service.ApplyFeeConcessionAsync(request);

        if (_notificationService != null && request.StudentId > 0 && result != null)
        {
            try
            {
                await _notificationService.SendToStudentAsync(
                    request.StudentId,
                    "Fee Concession Approved",
                    $"Fee concession of ₹{result.DiscountAmount:N0} ({result.ScholarshipName ?? "Concession"}) has been approved for your fee account.",
                    "Fee",
                    result.FeeConcessionId,
                    "/student/fees");
            }
            catch { }
        }

        return Ok(result);
    }

    // ---------------- Collection ----------------
    /// <summary>List student accounts with payable, paid, balance, next due and status.</summary>
    [HttpGet("collection")]
    public async Task<IActionResult> GetCollection([FromQuery] int? campusId, [FromQuery] string? search, [FromQuery] int? boardId, [FromQuery] int? academicYearId)
    {
        var (ok, effectiveCampusId, err) = await ResolveCampusScopeAsync(campusId);
        if (!ok) return err!;
        return Ok(await _service.GetFeeCollectionAsync(effectiveCampusId, search, boardId, academicYearId));
    }

    /// <summary>Collect full or partial cash/manual payment against a selected fee schedule with atomic receipt &amp; outbox email queuing.</summary>
    [HttpPost("collect")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> Collect(CreateFeePaymentRequest request)
    {
        var (ok, err) = await EnsureAuthorizedForStudentFeeCampusAsync(request.StudentFeeId);
        if (!ok) return err!;

        if (_settlementService != null)
        {
            var settlement = await _settlementService.SettleManualPaymentAsync(request, GetCurrentUserId());
            if (!settlement.Success)
            {
                bool isDup = !string.IsNullOrWhiteSpace(settlement.ErrorMessage) &&
                    settlement.ErrorMessage.Contains("duplicate", StringComparison.OrdinalIgnoreCase);
                return isDup
                    ? StatusCode(409, new { success = false, message = settlement.ErrorMessage })
                    : BadRequest(new { success = false, message = settlement.ErrorMessage ?? "Fee collection failed." });
            }

            if (settlement.FeePaymentId.HasValue)
            {
                var enriched = await _service.GetFeePaymentByIdAsync(settlement.FeePaymentId.Value);
                if (enriched != null)
                    return Ok(enriched);
            }

            return Ok(new FeePaymentResponse
            {
                FeePaymentId = settlement.FeePaymentId ?? 0,
                StudentId = request.StudentId,
                StudentFeeId = request.StudentFeeId,
                Amount = settlement.Amount,
                PaymentMethod = request.PaymentMode,
                TransactionReference = request.TransactionReference,
                PaymentDate = settlement.PaymentDate ?? DateTime.UtcNow,
                Status = "Success",
                ReceiptNumber = settlement.ReceiptNumber ?? string.Empty,
                PaymentStatus = settlement.PaymentStatus,
                VerificationStatus = settlement.VerificationStatus,
                OutstandingBalance = settlement.OutstandingBalance,
                ReceiptId = settlement.ReceiptId,
                ReceiptAvailable = settlement.ReceiptAvailable,
                EmailNotificationStatus = settlement.EmailNotificationStatus,
                EmailDeliveryStatus = settlement.EmailDeliveryStatus,
                EmailSentAt = settlement.EmailSentAt,
                EmailFailureReason = settlement.EmailFailureReason
            });
        }

        request.CollectedBy ??= GetCurrentUserId();
        var fallbackResult = await _service.CreateFeePaymentAsync(request);
        return Ok(fallbackResult);
    }

    // ---------------- Payment History / Receipt ----------------
    /// <summary>View payment history for one student. Enforces caller ID check to prevent IDOR.</summary>
    [HttpGet("history/{studentId:int}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Teacher,Staff,Student,Parent")]
    [BypassPermission]
    [ParentStudentAuthorization("studentId")]
    public async Task<IActionResult> GetHistory(int studentId)
    {
        if (!IsPrivilegedStaff())
        {
            if (!await IsAuthorizedForStudentAsync(studentId))
                return Forbid();
        }
        else
        {
            var (ok, err) = await EnsureAuthorizedForStudentCampusAsync(studentId);
            if (!ok) return err!;
        }
        return Ok(await _service.GetFeePaymentsAsync(studentId));
    }

    [HttpPost("bulk-history")]
    public async Task<IActionResult> GetBulkHistory([FromBody] List<int> studentIds)
    {
        if (studentIds == null || !studentIds.Any()) return Ok(new Dictionary<int, object>());
        var scopedIds = studentIds.Distinct().ToList();
        if (!IsGlobalAdmin() && _dbContext != null)
        {
            var (ok, effectiveCampusId, err) = await ResolveCampusScopeAsync(null);
            if (!ok) return err!;
            if (effectiveCampusId.HasValue)
            {
                scopedIds = await _dbContext.Students.AsNoTracking()
                    .Where(s => scopedIds.Contains(s.StudentId) && s.CampusId == effectiveCampusId.Value)
                    .Select(s => s.StudentId)
                    .ToListAsync();
            }
        }
        if (!scopedIds.Any()) return Ok(new Dictionary<int, object>());
        return Ok(await _service.GetBulkFeePaymentsAsync(scopedIds));
    }

    /// <summary>Fetch one payment transaction by payment ID with enriched status, receipt &amp; email delivery fields.</summary>
    [HttpGet("payments/{id:int}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Teacher,Staff,Student,Parent")]
    [BypassPermission]
    public async Task<IActionResult> GetPayment(int id)
    {
        var payment = await _service.GetFeePaymentByIdAsync(id);
        if (payment == null) return NotFound(new { message = "Payment not found." });

        if (!IsPrivilegedStaff())
        {
            if (!await IsAuthorizedForStudentAsync(payment.StudentId))
                return Forbid();
        }
        else
        {
            var (ok, err) = await EnsureAuthorizedForStudentCampusAsync(payment.StudentId);
            if (!ok) return err!;
        }

        return Ok(payment);
    }

    /// <summary>Fetch one payment receipt by receipt number. Enforces ownership/campus &amp; rejects reversed/unsettled receipts.</summary>
    [HttpGet("receipt/{receiptNumber}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Teacher,Staff,Student,Parent")]
    [BypassPermission]
    public async Task<IActionResult> GetReceipt(string receiptNumber)
    {
        try
        {
            var result = await _service.GetReceiptAsync(receiptNumber);
            if (result == null) return NotFound(new { message = "Receipt not found." });

            if (!IsPrivilegedStaff())
            {
                if (!await IsAuthorizedForStudentAsync(result.StudentId))
                    return Forbid();
            }
            else
            {
                var (ok, err) = await EnsureAuthorizedForStudentCampusAsync(result.StudentId);
                if (!ok) return err!;
            }
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(409, new { success = false, errorCode = "RECEIPT_UNAVAILABLE", message = ex.Message });
        }
    }

    // ---------------- Due / Dashboard / Reports ----------------
    /// <summary>List students and fee schedules with outstanding fees.</summary>
    [HttpGet("due")]
    public async Task<IActionResult> GetDue([FromQuery] int? campusId, [FromQuery] int? boardId, [FromQuery] int? academicYearId)
    {
        var (ok, effectiveCampusId, err) = await ResolveCampusScopeAsync(campusId);
        if (!ok) return err!;
        return Ok(await _service.GetDueAsync(effectiveCampusId, boardId, academicYearId));
    }

    /// <summary>Fee dashboard data for overview cards, upcoming schedules, recent payments and group-wise collection charts.</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] int? campusId, [FromQuery] int? boardId, [FromQuery] int? academicYearId)
    {
        var (ok, effectiveCampusId, err) = await ResolveCampusScopeAsync(campusId);
        if (!ok) return err!;
        return Ok(await _service.GetDashboardAsync(effectiveCampusId, boardId, academicYearId));
    }

    /// <summary>Return daily fee collection report.</summary>
    [HttpGet("reports/daily")]
    public async Task<IActionResult> DailyReport([FromQuery] int? campusId, [FromQuery] DateTime? date)
    {
        var (ok, effectiveCampusId, err) = await ResolveCampusScopeAsync(campusId);
        if (!ok) return err!;
        return Ok(await _service.GetDailyReportAsync(effectiveCampusId, date));
    }

    /// <summary>Return monthly fee collection report.</summary>
    [HttpGet("reports/monthly")]
    public async Task<IActionResult> MonthlyReport([FromQuery] int? campusId, [FromQuery] int? year, [FromQuery] int? month)
    {
        var (ok, effectiveCampusId, err) = await ResolveCampusScopeAsync(campusId);
        if (!ok) return err!;
        return Ok(await _service.GetMonthlyReportAsync(effectiveCampusId, year, month));
    }

    /// <summary>Send fee payment reminder to student and parents.</summary>
    [HttpPost("students/{studentId:int}/send-reminder")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> SendFeeReminder(
        int studentId,
        [FromQuery] decimal? amount = null,
        [FromQuery] string? dueDate = null)
    {
        if (studentId <= 0) return BadRequest(new { success = false, message = "Invalid student ID." });

        if (_notificationService != null)
        {
            try
            {
                var amountText = amount.HasValue && amount.Value > 0 ? $" of ₹{amount.Value:N2}" : "";
                var dueText = !string.IsNullOrWhiteSpace(dueDate) ? $" on or before {dueDate}" : "";

                await _notificationService.SendToStudentAsync(
                    studentId,
                    "Fee Payment Reminder",
                    $"Reminder: Pending fee balance{amountText} is due for payment{dueText}. Please pay via student portal or at the accounts office.",
                    "Fee",
                    studentId,
                    "/student/fees");

                await _notificationService.SendToRolesAsync(
                    new[] { "Parent" },
                    null,
                    "Fee Payment Reminder",
                    $"Fee Reminder: Pending college fee balance{amountText} for your ward is due{dueText}. Please complete the payment.",
                    "Fee",
                    studentId,
                    "/parent/fees");

                return Ok(new { success = true, message = "Fee payment reminder sent successfully to student and parent." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        return Ok(new { success = true, message = "Notification service unavailable." });
    }

    /// <summary>Send fee overdue alert to student and parents.</summary>
    [HttpPost("students/{studentId:int}/send-overdue-alert")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> SendFeeOverdueAlert(
        int studentId,
        [FromQuery] decimal? amount = null,
        [FromQuery] string? dueDate = null)
    {
        if (studentId <= 0) return BadRequest(new { success = false, message = "Invalid student ID." });

        if (_notificationService != null)
        {
            try
            {
                var amountText = amount.HasValue && amount.Value > 0 ? $" of ₹{amount.Value:N2}" : "";
                var dueText = !string.IsNullOrWhiteSpace(dueDate) ? $" (due was {dueDate})" : "";

                await _notificationService.SendToStudentAsync(
                    studentId,
                    "Fee Overdue Alert",
                    $"URGENT: Fee payment{amountText} is OVERDUE{dueText}. Please clear outstanding dues immediately to avoid penalties or hall ticket hold.",
                    "Fee",
                    studentId,
                    "/student/fees");

                await _notificationService.SendToRolesAsync(
                    new[] { "Parent" },
                    null,
                    "Fee Overdue Alert",
                    $"CRITICAL NOTICE: Fee payment{amountText} for your ward is OVERDUE{dueText}. Please clear pending dues immediately.",
                    "Fee",
                    studentId,
                    "/parent/fees");

                return Ok(new { success = true, message = "Fee overdue alert sent successfully to student and parent." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        return Ok(new { success = true, message = "Notification service unavailable." });
    }

    /// <summary>Send bulk fee payment reminders to multiple students.</summary>
    [HttpPost("send-bulk-due-reminders")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> SendBulkFeeReminders([FromBody] List<int> studentIds)
    {
        if (studentIds == null || !studentIds.Any())
            return BadRequest(new { success = false, message = "No student IDs provided." });

        var sent = 0;
        if (_notificationService != null)
        {
            foreach (var sId in studentIds.Distinct())
            {
                try
                {
                    await _notificationService.SendToStudentAsync(
                        sId,
                        "Fee Payment Reminder",
                        "Reminder: Outstanding fee payment is pending for your academic account. Please clear dues in the student portal.",
                        "Fee",
                        sId,
                        "/student/fees");

                    await _notificationService.SendToRolesAsync(
                        new[] { "Parent" },
                        null,
                        "Fee Payment Reminder",
                        "Fee Reminder: College fee payment is pending for your ward. Please complete payment at the earliest.",
                        "Fee",
                        sId,
                        "/parent/fees");

                    sent++;
                }
                catch { }
            }
        }

        return Ok(new { success = true, count = sent, message = $"Fee payment reminders sent to {sent} students and parents." });
    }
}
