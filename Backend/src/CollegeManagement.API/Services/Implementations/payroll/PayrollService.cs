using CollegeManagement.API.DTOs.Payroll;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Repositories.Interfaces.Payroll;
using CollegeManagement.API.Services.Exports;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Interfaces.Payroll;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;

namespace CollegeManagement.API.Services.Implementations.Payroll
{
    public class PayrollService : IPayrollService
    {
        private readonly IPayrollRepository _payrollRepository;
        private readonly IEmailService _emailService;
        private readonly ILogger<PayrollService>? _logger;

        public PayrollService(
            IPayrollRepository payrollRepository,
            IEmailService emailService,
            ILogger<PayrollService>? logger = null)
        {
            _payrollRepository = payrollRepository;
            _emailService = emailService;
            _logger = logger;
        }

        // Salary Structures

        public async Task<int> CreateSalaryStructureAsync(
            CreateSalaryStructureRequest request)
        {
            return await _payrollRepository
                .CreateSalaryStructureAsync(request);
        }

        public async Task<IEnumerable<SalaryStructureDto>>
            GetSalaryStructuresAsync(
                string? staffType,
                string? search)
        {
            return await _payrollRepository
                .GetSalaryStructuresAsync(staffType, search);
        }

        public async Task<SalaryStructureDto?>
            GetSalaryStructureByIdAsync(int id)
        {
            return await _payrollRepository
                .GetSalaryStructureByIdAsync(id);
        }

        public async Task<bool> UpdateSalaryStructureAsync(
            int id,
            UpdateSalaryStructureRequest request)
        {
            return await _payrollRepository
                .UpdateSalaryStructureAsync(id, request);
        }

        public async Task<bool> DeleteSalaryStructureAsync(int id)
        {
            return await _payrollRepository
                .DeleteSalaryStructureAsync(id);
        }

        // Employees

        public async Task<IEnumerable<PayrollEmployeeDto>>
            GetEmployeesAsync(
                string? staffType,
                string? search,
                int? campusId = null)
        {
            return await _payrollRepository
                .GetEmployeesAsync(staffType, search, campusId);
        }

        // Salary Assignments

        public async Task<IEnumerable<SalaryAssignmentDto>>
            GetSalaryAssignmentsAsync(int? staffId, string? status, int? campusId = null)
        {
            return await _payrollRepository
                .GetSalaryAssignmentsAsync(staffId, status, campusId);
        }

        public async Task<SalaryAssignmentDto?> GetSalaryAssignmentByIdAsync(int id)
        {
            return await _payrollRepository.GetSalaryAssignmentByIdAsync(id);
        }

        public async Task<int> AssignSalaryStructureAsync(

            AssignSalaryStructureRequest request)
        {
            return await _payrollRepository
                .AssignSalaryStructureAsync(request);
        }

        public async Task<bool> UpdateSalaryAssignmentAsync(
            int id,
            UpdateSalaryAssignmentRequest request)
        {
            return await _payrollRepository
                .UpdateSalaryAssignmentAsync(id, request);
        }

        public async Task<bool> DeleteSalaryAssignmentAsync(int id)
        {
            return await _payrollRepository
                .DeleteSalaryAssignmentAsync(id);
        }

        public async Task<bool> UpdateSalaryAssignmentStatusAsync(
            int id,
            string status)
        {
            return await _payrollRepository
                .UpdateSalaryAssignmentStatusAsync(id, status);
        }

        // Payslips

        public async Task<int> GeneratePayslipAsync(
            GeneratePayslipRequest request)
        {
            return await _payrollRepository
                .GeneratePayslipAsync(request);
        }

        public async Task<IEnumerable<int>> GenerateBulkPayslipsAsync(
            GenerateBulkPayslipRequest request)
        {
            return await _payrollRepository
                .GenerateBulkPayslipsAsync(request);
        }

        public async Task<bool> UpdatePayslipStatusAsync(
            int id,
            string status)
        {
            return await _payrollRepository
                .UpdatePayslipStatusAsync(id, status);
        }

        public async Task<bool> SendPayslipEmailAsync(
            int payslipId)
        {
            var payslip = await _payrollRepository
                .GetPayslipEmailDetailsAsync(payslipId);

            if (payslip == null ||
                string.IsNullOrWhiteSpace(payslip.Email))
            {
                return false;
            }

            string monthName;

            try
            {
                monthName = new DateTime(
                    payslip.PayrollYear,
                    payslip.PayrollMonth,
                    1).ToString("MMMM");
            }
            catch (ArgumentOutOfRangeException)
            {
                return false;
            }

            var subject =
                $"Payslip - {monthName} {payslip.PayrollYear}";

            var staffName =
                string.IsNullOrWhiteSpace(payslip.StaffName)
                    ? "Employee"
                    : payslip.StaffName;

            var employeeId =
                string.IsNullOrWhiteSpace(payslip.EmployeeId)
                    ? "-"
                    : payslip.EmployeeId;

            var payslipStatus =
                string.IsNullOrWhiteSpace(payslip.PayslipStatus)
                    ? "Generated"
                    : payslip.PayslipStatus;

            var body = $@"
                <html>
                <body style=""font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;"">
                    <h2 style=""color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;"">Salary Payslip</h2>

                    <p>Dear <strong>{staffName}</strong>,</p>

                    <p>
                        Your salary payslip for
                        <strong>
                            {monthName} {payslip.PayrollYear}
                        </strong>
                        has been generated and is attached to this email as a PDF document.
                    </p>

                    <div style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; max-width: 480px;"">
                        <table style=""width: 100%; border-collapse: collapse; font-size: 14px;"">
                            <tr>
                                <td style=""padding: 4px 0; color: #64748b;"">Employee ID:</td>
                                <td style=""padding: 4px 0; font-weight: bold; text-align: right;"">{employeeId}</td>
                            </tr>
                            <tr>
                                <td style=""padding: 4px 0; color: #64748b;"">Period:</td>
                                <td style=""padding: 4px 0; font-weight: bold; text-align: right;"">{monthName} {payslip.PayrollYear}</td>
                            </tr>
                            <tr>
                                <td style=""padding: 4px 0; color: #64748b;"">Gross Salary:</td>
                                <td style=""padding: 4px 0; font-weight: bold; text-align: right;"">₹{payslip.GrossSalary:N2}</td>
                            </tr>
                            <tr>
                                <td style=""padding: 4px 0; color: #64748b;"">Total Deductions:</td>
                                <td style=""padding: 4px 0; font-weight: bold; text-align: right; color: #dc2626;"">₹{payslip.TotalDeductions:N2}</td>
                            </tr>
                            <tr style=""border-top: 1px solid #cbd5e1;"">
                                <td style=""padding: 8px 0 4px; font-weight: bold; color: #047857;"">Net Take-Home:</td>
                                <td style=""padding: 8px 0 4px; font-weight: bold; text-align: right; color: #047857; font-size: 16px;"">₹{payslip.NetSalary:N2}</td>
                            </tr>
                            <tr>
                                <td style=""padding: 4px 0; color: #64748b;"">Status:</td>
                                <td style=""padding: 4px 0; text-align: right;""><span style=""background: #ecfdf5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;"">{payslipStatus}</span></td>
                            </tr>
                        </table>
                    </div>

                    <p style=""font-size: 13px; color: #64748b;"">
                        Please find your detailed payslip attached to this email.
                    </p>

                    <br/>

                    <p>
                        Regards,<br/>
                        <strong>Accounts &amp; Payroll Department</strong><br/>
                        College Management System
                    </p>
                </body>
                </html>";

            try
            {
                byte[]? pdfBytes = null;
                try
                {
                    pdfBytes = await GeneratePayslipPdfAsync(payslipId);
                }
                catch (Exception pdfEx)
                {
                    _logger?.LogError(pdfEx, "Failed to generate PDF for payslip ID {PayslipId}. Sending email without attachment.", payslipId);
                }

                if (pdfBytes != null && pdfBytes.Length > 0)
                {
                    var safeStaffName = string.Join("_", (payslip.StaffName ?? "Employee").Split(System.IO.Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)).Replace(" ", "_");
                    var fileName = $"Payslip_{safeStaffName}_{monthName}_{payslip.PayrollYear}.pdf";

                    await _emailService.SendEmailWithAttachmentAsync(
                        payslip.Email,
                        subject,
                        body,
                        pdfBytes,
                        fileName,
                        "application/pdf");
                }
                else
                {
                    await _emailService.SendEmailAsync(
                        payslip.Email,
                        subject,
                        body);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to send payslip email for payslip ID {PayslipId} to {Email}", payslipId, payslip.Email);
                return false;
            }
        }

        public async Task<byte[]?> GeneratePayslipPdfAsync(int payslipId)
        {
            var payslip = await _payrollRepository.GetPayslipByIdAsync(payslipId);
            if (payslip == null)
            {
                return null;
            }

            string monthName;
            try
            {
                monthName = new DateTime(payslip.PayrollYear, payslip.PayrollMonth, 1).ToString("MMMM");
            }
            catch
            {
                monthName = $"Month {payslip.PayrollMonth}";
            }

            var model = new PayslipPdfModel
            {
                PayslipId = payslip.PayslipId,
                StaffId = payslip.StaffId,
                EmployeeId = string.IsNullOrWhiteSpace(payslip.EmployeeId) ? "-" : payslip.EmployeeId,
                StaffName = string.IsNullOrWhiteSpace(payslip.StaffName) ? "Employee" : payslip.StaffName,
                StaffType = payslip.StaffType ?? string.Empty,
                DepartmentName = payslip.DepartmentName ?? string.Empty,
                Designation = payslip.Designation ?? string.Empty,
                StructureName = payslip.StructureName ?? string.Empty,
                PayrollMonth = payslip.PayrollMonth,
                PayrollYear = payslip.PayrollYear,
                MonthName = monthName,

                BasicPay = payslip.BasicPay,
                HRA = payslip.HRA,
                DA = payslip.DA,
                ConveyanceAllowance = payslip.ConveyanceAllowance,
                MedicalAllowance = payslip.MedicalAllowance,
                OtherAllowance = payslip.OtherAllowance,

                PF = payslip.PF,
                ProfessionalTax = payslip.ProfessionalTax,
                TDS = payslip.TDS,
                ESI = payslip.ESI,
                InsuranceOtherDeduction = payslip.InsuranceOtherDeduction,

                GrossSalary = payslip.GrossSalary,
                TotalDeductions = payslip.TotalDeductions,
                NetSalary = payslip.NetSalary,

                PayslipStatus = string.IsNullOrWhiteSpace(payslip.PayslipStatus) ? "Generated" : payslip.PayslipStatus,
                GeneratedAt = payslip.GeneratedAt != default ? payslip.GeneratedAt : DateTime.UtcNow,

                InstitutionName = "PIRNAV JUNIOR COLLEGE",
                Subtitle = "Affiliated to State Board of Intermediate Education"
            };

            var document = new PayslipPdfDocument(model);
            return document.GeneratePdf();
        }

        public async Task<byte[]?> GeneratePayslipPdfAsync(string rawId)
        {
            var resolvedId = await _payrollRepository.ResolvePayslipIdAsync(rawId);
            if (!resolvedId.HasValue || resolvedId.Value <= 0)
            {
                return null;
            }

            return await GeneratePayslipPdfAsync(resolvedId.Value);
        }

        public async Task<int?> ResolvePayslipIdAsync(string rawId)
        {
            return await _payrollRepository.ResolvePayslipIdAsync(rawId);
        }

        public async Task<bool> SendPayslipEmailAsync(string rawId)
        {
            var resolvedId = await _payrollRepository.ResolvePayslipIdAsync(rawId);
            if (!resolvedId.HasValue || resolvedId.Value <= 0)
            {
                _logger?.LogWarning("Could not resolve payslip ID from identifier '{RawId}'.", rawId);
                return false;
            }

            return await SendPayslipEmailAsync(resolvedId.Value);
        }

        public async Task<IEnumerable<PayslipDto>>
            GetPayslipHistoryAsync(
                int? payrollMonth,
                int? payrollYear,
                string? staffType,
                string? search,
                int? campusId = null)
        {
            return await _payrollRepository
                .GetPayslipHistoryAsync(
                    payrollMonth,
                    payrollYear,
                    staffType,
                    search,
                    campusId);
        }

        public async Task<PayslipDto?>
            GetPayslipByIdAsync(int payslipId)
        {
            return await _payrollRepository
                .GetPayslipByIdAsync(payslipId);
        }

        // Salary Revisions

        public async Task<int> CreateSalaryRevisionAsync(
            CreateSalaryRevisionRequest request)
        {
            return await _payrollRepository
                .CreateSalaryRevisionAsync(request);
        }

        public async Task<IEnumerable<SalaryRevisionDto>>
            GetSalaryRevisionsAsync(
                int? staffId,
                string? status,
                int? campusId = null)
        {
            return await _payrollRepository
                .GetSalaryRevisionsAsync(staffId, status, campusId);
        }

        public async Task<bool> ApproveSalaryRevisionAsync(
            int revisionId,
            int approvedBy)
        {
            return await _payrollRepository
                .ApproveSalaryRevisionAsync(
                    revisionId,
                    approvedBy);
        }

        // Bonuses

        public async Task<int> CreateBonusAsync(
            CreateBonusRequest request)
        {
            return await _payrollRepository
                .CreateBonusAsync(request);
        }

        public async Task<IEnumerable<BonusDto>>
            GetBonusesAsync(
                int? staffId,
                string? status,
                int? campusId = null)
        {
            return await _payrollRepository
                .GetBonusesAsync(staffId, status, campusId);
        }

        public async Task<BonusDto?> GetBonusByIdAsync(int id)
        {
            return await _payrollRepository.GetBonusByIdAsync(id);
        }

        public async Task<bool> ApproveBonusAsync(
            int bonusId,
            int approvedBy)
        {
            return await _payrollRepository
                .ApproveBonusAsync(bonusId, approvedBy);
        }

        // Advances and Loans

        public async Task<int> CreateAdvanceAsync(
            CreateAdvanceRequest request)
        {
            return await _payrollRepository
                .CreateAdvanceAsync(request);
        }

        public async Task<IEnumerable<AdvanceDto>>
            GetAdvancesAsync(
                int? staffId,
                string? status,
                int? campusId = null)
        {
            return await _payrollRepository
                .GetAdvancesAsync(staffId, status, campusId);
        }

        public async Task<AdvanceDto?> GetAdvanceByIdAsync(int id)
        {
            return await _payrollRepository.GetAdvanceByIdAsync(id);
        }

        public async Task<bool> ApproveAdvanceAsync(
            int advanceId,
            int approvedBy)
        {
            return await _payrollRepository
                .ApproveAdvanceAsync(
                    advanceId,
                    approvedBy);
        }

        // Advance and Loan Balances

        public async Task<IEnumerable<AdvanceBalanceDto>>
            GetAdvanceBalancesAsync(int? staffId)
        {
            return await _payrollRepository
                .GetAdvanceBalancesAsync(staffId);
        }

        // Advance and Loan Repayment History

        public async Task<IEnumerable<AdvanceRepaymentDto>>
            GetAdvanceRepaymentHistoryAsync(
                int? staffId,
                int? advanceId)
        {
            return await _payrollRepository
                .GetAdvanceRepaymentHistoryAsync(
                    staffId,
                    advanceId);
        }
        // Annual payroll summary for one staff member
        public async Task<StaffPayrollSummaryDto> GetStaffPayrollSummaryAsync(int staffId, int year)
        {
            return await _payrollRepository.GetStaffPayrollSummaryAsync(staffId, year);
        }

        // Monthly payroll summary
        public async Task<MonthlyPayrollSummaryDto> GetMonthlyPayrollSummaryAsync(int month, int year, int? campusId = null)
        {
            return await _payrollRepository.GetMonthlyPayrollSummaryAsync(month, year, campusId);
        }

        // API 34: Advance repayments for a payslip
        public async Task<IEnumerable<PayslipAdvanceRepaymentDto>> GetAdvanceRepaymentsByPayslipAsync(int payslipId)
        {
            return await _payrollRepository.GetAdvanceRepaymentsByPayslipAsync(payslipId);
        }

    }
}