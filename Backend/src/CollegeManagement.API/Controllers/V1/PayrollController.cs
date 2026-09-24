using CollegeManagement.API.DTOs.Payroll;
using CollegeManagement.API.Services.Interfaces.Payroll;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize]
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollService _payrollService;

        public PayrollController(IPayrollService payrollService)
        {
            _payrollService = payrollService;
        }



        // GET: api/payroll/salary-structures
        [HttpGet("salary-structures")]
        public async Task<IActionResult> GetSalaryStructures(
            [FromQuery] string? staffType,
            [FromQuery] string? search)
        {
            var result =
                await _payrollService.GetSalaryStructuresAsync(
                    staffType,
                    search);

            return Ok(result);
        }

        // GET: api/payroll/salary-structures/5
        [HttpGet("salary-structures/{id:int}")]
        public async Task<IActionResult> GetSalaryStructure(int id)
        {
            var result =
                await _payrollService.GetSalaryStructureByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    Message = "Salary structure not found."
                });
            }

            return Ok(result);
        }

        // POST: api/payroll/salary-structures
        [HttpPost("salary-structures")]
        public async Task<IActionResult> CreateSalaryStructure(
            [FromBody] CreateSalaryStructureRequest request)
        {
            var id =
                await _payrollService.CreateSalaryStructureAsync(request);

            return Ok(new
            {
                Id = id,
                Message = "Salary structure created successfully."
            });
        }

        // PUT: api/payroll/salary-structures/5
        [HttpPut("salary-structures/{id:int}")]
        public async Task<IActionResult> UpdateSalaryStructure(
            int id,
            [FromBody] UpdateSalaryStructureRequest request)
        {
            var updated =
                await _payrollService.UpdateSalaryStructureAsync(
                    id,
                    request);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Salary structure not found."
                });
            }

            return Ok(new
            {
                Message = "Salary structure updated successfully."
            });
        }

        // DELETE: api/payroll/salary-structures/5
        [HttpDelete("salary-structures/{id:int}")]
        public async Task<IActionResult> DeleteSalaryStructure(int id)
        {
            var deleted =
                await _payrollService.DeleteSalaryStructureAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    Message = "Salary structure not found."
                });
            }

            return Ok(new
            {
                Message = "Salary structure deleted successfully."
            });
        }



        // GET: api/payroll/employees
        [HttpGet("employees")]
        public async Task<IActionResult> GetEmployees(
            [FromQuery] string? staffType,
            [FromQuery] string? search)
        {
            var result =
                await _payrollService.GetEmployeesAsync(
                    staffType,
                    search);

            return Ok(result);
        }



        // GET: api/payroll/salary-assignments?staffId=10&status=Active
        [HttpGet("salary-assignments")]
        public async Task<IActionResult> GetSalaryAssignments(
            [FromQuery] int? staffId,
            [FromQuery] string? status)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Active" && status != "On Hold")
                return BadRequest(new
                {
                    Message = "Status must be Active or On Hold."
                });

            var result = await _payrollService
                .GetSalaryAssignmentsAsync(staffId, status);
            return Ok(result);
        }

        // GET: api/payroll/salary-assignments/4
        [HttpGet("salary-assignments/{id:int}")]
        public async Task<IActionResult> GetSalaryAssignmentById(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid assignment Id is required." });

            var result = await _payrollService.GetSalaryAssignmentByIdAsync(id);
            if (result == null)
                return NotFound(new { Message = "Salary assignment not found." });

            return Ok(result);
        }

        // POST: api/payroll/salary-assignments
        [HttpPost("salary-assignments")]
        public async Task<IActionResult> AssignSalaryStructure(
            [FromBody] AssignSalaryStructureRequest request)
        {
            if (request.StaffId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid StaffId is required."
                });
            }

            if (request.SalaryStructureId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid SalaryStructureId is required."
                });
            }

            var assignmentId =
                await _payrollService.AssignSalaryStructureAsync(request);

            return Ok(new
            {
                AssignmentId = assignmentId,
                Message = "Salary structure assigned successfully."
            });
        }

        // PUT: api/payroll/salary-assignments/5
        [HttpPut("salary-assignments/{id:int}")]
        public async Task<IActionResult> UpdateSalaryAssignment(
            int id,
            [FromBody] UpdateSalaryAssignmentRequest request)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid assignment Id is required."
                });
            }

            if (request.SalaryStructureId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid SalaryStructureId is required."
                });
            }

            var updated =
                await _payrollService.UpdateSalaryAssignmentAsync(
                    id,
                    request);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Salary assignment not found."
                });
            }

            return Ok(new
            {
                Message = "Salary assignment updated successfully."
            });
        }

        // DELETE: api/payroll/salary-assignments/5
        [HttpDelete("salary-assignments/{id:int}")]
        public async Task<IActionResult> DeleteSalaryAssignment(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid assignment Id is required."
                });
            }

            var deleted =
                await _payrollService.DeleteSalaryAssignmentAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    Message = "Salary assignment not found."
                });
            }

            return Ok(new
            {
                Message = "Salary assignment deleted successfully."
            });
        }

        // PATCH: api/payroll/salary-assignments/5/status
        [HttpPatch("salary-assignments/{id:int}/status")]
        public async Task<IActionResult> UpdateSalaryAssignmentStatus(
            int id,
            [FromQuery] string status)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid assignment Id is required."
                });
            }

            if (string.IsNullOrWhiteSpace(status) ||
                (status != "Active" && status != "On Hold"))
            {
                return BadRequest(new
                {
                    Message = "Status must be 'Active' or 'On Hold'."
                });
            }

            var updated =
                await _payrollService.UpdateSalaryAssignmentStatusAsync(
                    id,
                    status);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Salary assignment not found."
                });
            }

            return Ok(new
            {
                Message =
                    $"Salary assignment status updated to {status}."
            });
        }



        // POST: api/payroll/payslips/generate
        [HttpPost("payslips/generate")]
        public async Task<IActionResult> GeneratePayslip(
            [FromBody] GeneratePayslipRequest request)
        {
            if (request.StaffId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid StaffId is required."
                });
            }

            if (request.PayrollMonth < 1 ||
                request.PayrollMonth > 12)
            {
                return BadRequest(new
                {
                    Message =
                        "Payroll month must be between 1 and 12."
                });
            }

            if (request.PayrollYear <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid payroll year is required."
                });
            }

            var payslipId =
                await _payrollService.GeneratePayslipAsync(request);

            return Ok(new
            {
                PayslipId = payslipId,
                Message = "Payslip generated successfully."
            });
        }



        // POST: api/payroll/payslips/generate-bulk
        [HttpPost("payslips/generate-bulk")]
        public async Task<IActionResult> GenerateBulkPayslips(
            [FromBody] GenerateBulkPayslipRequest request)
        {
            if (request.StaffIds == null ||
                request.StaffIds.Count == 0)
            {
                return BadRequest(new
                {
                    Message = "At least one StaffId is required."
                });
            }

            if (request.StaffIds.Any(id => id <= 0))
            {
                return BadRequest(new
                {
                    Message = "All StaffIds must be valid."
                });
            }

            if (request.PayrollMonth < 1 ||
                request.PayrollMonth > 12)
            {
                return BadRequest(new
                {
                    Message =
                        "Payroll month must be between 1 and 12."
                });
            }

            if (request.PayrollYear <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid payroll year is required."
                });
            }

            var payslipIds =
                (await _payrollService
                    .GenerateBulkPayslipsAsync(request))
                .ToList();

            return Ok(new
            {
                PayslipIds = payslipIds,
                GeneratedCount = payslipIds.Count,
                Message = "Bulk payslips generated successfully."
            });
        }



        // PATCH: api/payroll/payslips/5/status
        [HttpPatch("payslips/{id:int}/status")]
        public async Task<IActionResult> UpdatePayslipStatus(
            int id,
            [FromQuery] string status)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid payslip Id is required."
                });
            }

            if (string.IsNullOrWhiteSpace(status) ||
                (status != "Generated" &&
                 status != "Paid" &&
                 status != "On Hold"))
            {
                return BadRequest(new
                {
                    Message =
                        "Status must be 'Generated', 'Paid' or 'On Hold'."
                });
            }

            var updated =
                await _payrollService.UpdatePayslipStatusAsync(
                    id,
                    status);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            return Ok(new
            {
                Message =
                    $"Payslip status updated to {status}."
            });
        }



        // POST: api/payroll/payslips/5/send-email
        [HttpPost("payslips/{id:int}/send-email")]
        public async Task<IActionResult> SendPayslipEmail(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid payslip Id is required."
                });
            }

            var sent =
                await _payrollService.SendPayslipEmailAsync(id);

            if (!sent)
            {
                return NotFound(new
                {
                    Message =
                        "Payslip or staff email not found."
                });
            }

            return Ok(new
            {
                Message = "Payslip email sent successfully."
            });
        }



        // GET: api/payroll/payslips
        [HttpGet("payslips")]
        public async Task<IActionResult> GetPayslipHistory(
            [FromQuery] int? payrollMonth,
            [FromQuery] int? payrollYear,
            [FromQuery] string? staffType,
            [FromQuery] string? search)
        {
            var result =
                await _payrollService.GetPayslipHistoryAsync(
                    payrollMonth,
                    payrollYear,
                    staffType,
                    search);

            return Ok(result);
        }

        // GET: api/payroll/payslips/5
        [HttpGet("payslips/{id:int}")]
        public async Task<IActionResult> GetPayslipById(int id)
        {
            var result =
                await _payrollService.GetPayslipByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    Message = "Payslip not found."
                });
            }

            return Ok(result);
        }



        // GET: api/payroll/revisions?staffId=10&status=Pending
        [HttpGet("revisions")]
        public async Task<IActionResult> GetSalaryRevisions(
            [FromQuery] int? staffId,
            [FromQuery] string? status)
        {
            if (staffId.HasValue && staffId.Value <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid StaffId is required."
                });
            }

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Pending" &&
                status != "Approved" &&
                status != "Rejected")
            {
                return BadRequest(new
                {
                    Message = "Status must be Pending, Approved or Rejected."
                });
            }

            var result = await _payrollService
                .GetSalaryRevisionsAsync(staffId, status);

            return Ok(result);
        }

        // POST: api/payroll/revisions
        [HttpPost("revisions")]
        public async Task<IActionResult> CreateSalaryRevision(
            [FromBody] CreateSalaryRevisionRequest request)
        {
            if (request.StaffId <= 0 ||
                request.CurrentSalaryStructureId <= 0 ||
                request.ProposedSalaryStructureId <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid staff and salary structure IDs are required."
                });
            }

            if (request.CurrentSalaryStructureId ==
                request.ProposedSalaryStructureId)
            {
                return BadRequest(new
                {
                    Message = "Proposed salary structure must be different."
                });
            }

            if (request.EffectiveFrom == default)
            {
                return BadRequest(new
                {
                    Message = "Valid EffectiveFrom date is required."
                });
            }

            var revisionId = await _payrollService
                .CreateSalaryRevisionAsync(request);

            return Ok(new
            {
                RevisionId = revisionId,
                Message = "Salary revision requested successfully."
            });
        }

        // PATCH: api/payroll/revisions/5/approve
        // The approver ID is taken from the authenticated JWT, not request input.
        [HttpPatch("revisions/{id:int}/approve")]
        public async Task<IActionResult> ApproveSalaryRevision(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    Message = "Valid revision Id is required."
                });
            }

            var approverClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(approverClaim, out var approvedBy) ||
                approvedBy <= 0)
            {
                return Forbid();
            }

            var approved = await _payrollService
                .ApproveSalaryRevisionAsync(id, approvedBy);

            if (!approved)
            {
                return NotFound(new
                {
                    Message = "Salary revision not found or could not be approved."
                });
            }

            return Ok(new
            {
                Message = "Salary revision approved successfully."
            });
        }




        // GET: api/payroll/bonuses?staffId=10&status=Pending
        [HttpGet("bonuses")]
        public async Task<IActionResult> GetBonuses(
            [FromQuery] int? staffId,
            [FromQuery] string? status)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Pending" &&
                status != "Approved" &&
                status != "Rejected")
                return BadRequest(new
                {
                    Message = "Status must be Pending, Approved or Rejected."
                });

            var result = await _payrollService.GetBonusesAsync(staffId, status);
            return Ok(result);
        }

        // GET: api/payroll/bonuses/1
        [HttpGet("bonuses/{id:int}")]
        public async Task<IActionResult> GetBonusById(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid bonus Id is required." });

            var bonus = await _payrollService.GetBonusByIdAsync(id);
            if (bonus == null)
                return NotFound(new { Message = "Bonus not found." });

            return Ok(bonus);
        }

        // POST: api/payroll/bonuses
        [HttpPost("bonuses")]
        public async Task<IActionResult> CreateBonus(
            [FromBody] CreateBonusRequest request)
        {
            if (request.StaffId <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (string.IsNullOrWhiteSpace(request.BonusType))
                return BadRequest(new { Message = "BonusType is required." });

            if (request.Amount <= 0)
                return BadRequest(new { Message = "Amount must be greater than zero." });

            if (request.BonusMonth < 1 || request.BonusMonth > 12)
                return BadRequest(new { Message = "BonusMonth must be between 1 and 12." });

            if (request.BonusYear < 2000)
                return BadRequest(new { Message = "Valid BonusYear is required." });

            var bonusId = await _payrollService.CreateBonusAsync(request);
            return Ok(new
            {
                BonusId = bonusId,
                Message = "Bonus requested successfully."
            });
        }

        // PATCH: api/payroll/bonuses/5/approve
        // Approver ID comes from the authenticated JWT, not request input.
        [HttpPatch("bonuses/{id:int}/approve")]
        public async Task<IActionResult> ApproveBonus(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid bonus Id is required." });

            var approverClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(approverClaim, out var approvedBy) || approvedBy <= 0)
                return Forbid();

            var approved = await _payrollService.ApproveBonusAsync(id, approvedBy);

            if (!approved)
                return NotFound(new
                {
                    Message = "Bonus not found or could not be approved."
                });

            return Ok(new { Message = "Bonus approved successfully." });
        }



        // GET: api/payroll/advances?staffId=10&status=Pending
        [HttpGet("advances")]
        public async Task<IActionResult> GetAdvances(
            [FromQuery] int? staffId,
            [FromQuery] string? status)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (!string.IsNullOrWhiteSpace(status) &&
                status != "Pending" &&
                status != "Approved" &&
                status != "Rejected" &&
                status != "Closed")
                return BadRequest(new
                {
                    Message = "Status must be Pending, Approved, Rejected or Closed."
                });

            var result = await _payrollService.GetAdvancesAsync(staffId, status);
            return Ok(result);
        }

        // GET: api/payroll/advances/1
        [HttpGet("advances/{id:int}")]
        public async Task<IActionResult> GetAdvanceById(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid advance Id is required." });

            var advance = await _payrollService.GetAdvanceByIdAsync(id);
            if (advance == null)
                return NotFound(new { Message = "Advance not found." });

            return Ok(advance);
        }

        // POST: api/payroll/advances
        [HttpPost("advances")]
        public async Task<IActionResult> CreateAdvance(
            [FromBody] CreateAdvanceRequest request)
        {
            if (request == null)
                return BadRequest(new { Message = "Request body is required." });

            if (request.StaffId <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (request.AdvanceType != "Salary Advance" &&
                request.AdvanceType != "Staff Loan")
                return BadRequest(new
                {
                    Message = "AdvanceType must be 'Salary Advance' or 'Staff Loan'."
                });

            if (request.Amount <= 0)
                return BadRequest(new { Message = "Amount must be greater than zero." });

            if (request.RepaymentMonths <= 0)
                return BadRequest(new { Message = "RepaymentMonths must be greater than zero." });

            if (Math.Round(request.Amount / request.RepaymentMonths, 2) <= 0)
                return BadRequest(new { Message = "Monthly deduction must be greater than zero." });

            if (request.StartMonth < 1 || request.StartMonth > 12)
                return BadRequest(new { Message = "StartMonth must be between 1 and 12." });

            if (request.StartYear < 2000)
                return BadRequest(new { Message = "Valid StartYear is required." });

            var advanceId = await _payrollService.CreateAdvanceAsync(request);
            return Ok(new
            {
                AdvanceId = advanceId,
                Message = "Advance or loan requested successfully."
            });
        }

        // PATCH: api/payroll/advances/5/approve
        // Approver ID is taken from the authenticated JWT.
        [HttpPatch("advances/{id:int}/approve")]
        public async Task<IActionResult> ApproveAdvance(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid advance Id is required." });

            var approverClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(approverClaim, out var approvedBy) || approvedBy <= 0)
                return Forbid();

            var approved = await _payrollService.ApproveAdvanceAsync(id, approvedBy);

            if (!approved)
                return NotFound(new
                {
                    Message = "Advance or loan not found or could not be approved."
                });

            return Ok(new { Message = "Advance or loan approved successfully." });
        }

        // GET: api/payroll/advances/balances?staffId=10
        [HttpGet("advances/balances")]
        public async Task<IActionResult> GetAdvanceBalances([FromQuery] int? staffId)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            var result = await _payrollService.GetAdvanceBalancesAsync(staffId);
            return Ok(result);
        }

        // GET: api/payroll/advances/repayment-history?staffId=10&advanceId=1
        [HttpGet("advances/repayment-history")]
        public async Task<IActionResult> GetAdvanceRepaymentHistory(
            [FromQuery] int? staffId, [FromQuery] int? advanceId)
        {
            if (staffId.HasValue && staffId.Value <= 0)
                return BadRequest(new { Message = "Valid StaffId is required." });

            if (advanceId.HasValue && advanceId.Value <= 0)
                return BadRequest(new { Message = "Valid AdvanceId is required." });

            var result = await _payrollService.GetAdvanceRepaymentHistoryAsync(staffId, advanceId);
            return Ok(result);
        }

        // GET: api/payroll/staff/10/summary?year=2027
        [HttpGet("staff/{staffId:int}/summary")]
        public async Task<IActionResult> GetStaffPayrollSummary(int staffId, [FromQuery] int year)
        {
            if (staffId <= 0 || year < 2000)
                return BadRequest(new { Message = "Valid staff ID and year (>= 2000) are required." });

            var result = await _payrollService.GetStaffPayrollSummaryAsync(staffId, year);
            return Ok(result);
        }

        // GET: api/payroll/summary?month=3&year=2027
        [HttpGet("summary")]
        public async Task<IActionResult> GetMonthlyPayrollSummary(
            [FromQuery] int month, [FromQuery] int year)
        {
            if (month < 1 || month > 12 || year < 2000)
                return BadRequest(new { Message = "Valid month (1-12) and year (>= 2000) are required." });

            var result = await _payrollService.GetMonthlyPayrollSummaryAsync(month, year);
            return Ok(result);
        }

        // GET: api/payroll/payslips/10/advance-repayments
        [HttpGet("payslips/{id:int}/advance-repayments")]
        public async Task<IActionResult> GetAdvanceRepaymentsByPayslip(int id)
        {
            if (id <= 0)
                return BadRequest(new { Message = "Valid payslip Id is required." });

            var payslip = await _payrollService.GetPayslipByIdAsync(id);
            if (payslip == null)
                return NotFound(new { Message = "Payslip not found." });

            var repayments = await _payrollService.GetAdvanceRepaymentsByPayslipAsync(id);
            return Ok(repayments);
        }

    }
}
