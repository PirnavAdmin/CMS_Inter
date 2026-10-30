using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
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
    public FeeController(IFeeService service) => _service = service;

    private bool IsPrivilegedStaff()
    {
        return User.IsInRole("Admin") || User.IsInRole("Super Admin") || User.IsInRole("SuperAdmin") ||
               User.IsInRole("Principal") || User.IsInRole("Accountant") || User.IsInRole("Finance") ||
               User.IsInRole("Teacher") || User.IsInRole("Staff");
    }

    private int? GetCallerStudentId()
    {
        var claim = User.FindFirst("StudentId")?.Value 
            ?? User.FindFirst("studentId")?.Value 
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(claim, out int id) ? id : null;
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
    public async Task<IActionResult> AssignStudentFee(AssignStudentFeeRequest request) => Ok(await _service.AssignStudentFeeAsync(request));

    /// <summary>Get the complete student fee details, breakdown, schedules and payment history.</summary>
    [HttpGet("student-fees/{id:int}")]
    public async Task<IActionResult> GetStudentFee(int id)
    {
        var result = await _service.GetStudentFeeAsync(id);
        return result == null ? NotFound(new { message = "Student fee record not found." }) : Ok(result);
    }

    /// <summary>Get student fee details by student ID.</summary>
    [HttpGet("students/{studentId:int}/fee-details")]
    [Authorize(Roles = "Admin,Teacher,Student,Parent")]
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
        => Ok(await _service.GetStudentFeeLedgerAsync(campusId, academicYearId, groupId, sectionId, paymentPlan, status, search, boardId));

    /// <summary>Compatibility route for student-specific fee ledger.</summary>
    [HttpGet("students/{studentId:int}/fee-ledger")]
    [Authorize(Roles = "Admin,Teacher,Student,Parent")]
    [BypassPermission]
    [ParentStudentAuthorization("studentId")]
    public async Task<IActionResult> GetStudentLedger(int studentId) => Ok(await _service.GetStudentFeeDetailsByStudentAsync(studentId));

    // ---------------- Concession ----------------
    /// <summary>Apply a student-specific concession or scholarship after fee assignment.</summary>
    [HttpPost("concession")]
    public async Task<IActionResult> ApplyConcession(ApplyFeeConcessionRequest request) => Ok(await _service.ApplyFeeConcessionAsync(request));

    // ---------------- Collection ----------------
    /// <summary>List student accounts with payable, paid, balance, next due and status.</summary>
    [HttpGet("collection")]
    public async Task<IActionResult> GetCollection([FromQuery] int? campusId, [FromQuery] string? search, [FromQuery] int? boardId, [FromQuery] int? academicYearId) => Ok(await _service.GetFeeCollectionAsync(campusId, search, boardId, academicYearId));

    /// <summary>Collect full or partial payment against a selected fee schedule.</summary>
    [HttpPost("collect")]
    public async Task<IActionResult> Collect(CreateFeePaymentRequest request) => Ok(await _service.CreateFeePaymentAsync(request));

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
            var callerId = GetCallerStudentId();
            if (callerId.HasValue && callerId.Value != studentId)
            {
                return Forbid();
            }
        }
        return Ok(await _service.GetFeePaymentsAsync(studentId));
    }

    [HttpPost("bulk-history")]
    public async Task<IActionResult> GetBulkHistory([FromBody] List<int> studentIds)
    {
        if (studentIds == null || !studentIds.Any()) return Ok(new Dictionary<int, object>());
        var result = new Dictionary<int, IEnumerable<FeePaymentResponse>>();
        foreach (var id in studentIds.Distinct())
        {
            result[id] = await _service.GetFeePaymentsAsync(id);
        }
        return Ok(result);
    }

    /// <summary>Fetch one payment transaction by payment ID.</summary>
    [HttpGet("payments/{id:int}")]
    public async Task<IActionResult> GetPayment(int id) => Ok(await _service.GetFeePaymentByIdAsync(id));

    /// <summary>Fetch one payment receipt by receipt number. Enforces caller ID check to prevent IDOR.</summary>
    [HttpGet("receipt/{receiptNumber}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Teacher,Staff,Student,Parent")]
    [BypassPermission]
    public async Task<IActionResult> GetReceipt(string receiptNumber)
    {
        var result = await _service.GetReceiptAsync(receiptNumber);
        if (result == null) return NotFound(new { message = "Receipt not found." });

        if (!IsPrivilegedStaff())
        {
            var callerId = GetCallerStudentId();
            if (callerId.HasValue && callerId.Value != result.StudentId)
            {
                return Forbid();
            }
        }
        return Ok(result);
    }

    // ---------------- Due / Dashboard / Reports ----------------
    /// <summary>List students and fee schedules with outstanding fees.</summary>
    [HttpGet("due")]
    public async Task<IActionResult> GetDue([FromQuery] int? campusId, [FromQuery] int? boardId, [FromQuery] int? academicYearId) => Ok(await _service.GetDueAsync(campusId, boardId, academicYearId));

    /// <summary>Fee dashboard data for overview cards, upcoming schedules, recent payments and group-wise collection charts.</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] int? campusId, [FromQuery] int? boardId, [FromQuery] int? academicYearId) => Ok(await _service.GetDashboardAsync(campusId, boardId, academicYearId));

    /// <summary>Return daily fee collection report.</summary>
    [HttpGet("reports/daily")]
    public async Task<IActionResult> DailyReport([FromQuery] int? campusId, [FromQuery] DateTime? date) => Ok(await _service.GetDailyReportAsync(campusId, date));

    /// <summary>Return monthly fee collection report.</summary>
    [HttpGet("reports/monthly")]
    public async Task<IActionResult> MonthlyReport([FromQuery] int? campusId, [FromQuery] int? year, [FromQuery] int? month) => Ok(await _service.GetMonthlyReportAsync(campusId, year, month));
}
