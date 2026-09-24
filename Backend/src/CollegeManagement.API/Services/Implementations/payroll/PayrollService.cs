using CollegeManagement.API.DTOs.Payroll;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Repositories.Interfaces.Payroll;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Interfaces.Payroll;

namespace CollegeManagement.API.Services.Implementations.Payroll
{
    public class PayrollService : IPayrollService
    {
        private readonly IPayrollRepository _payrollRepository;
        private readonly IEmailService _emailService;

        public PayrollService(
            IPayrollRepository payrollRepository,
            IEmailService emailService)
        {
            _payrollRepository = payrollRepository;
            _emailService = emailService;
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
                string? search)
        {
            return await _payrollRepository
                .GetEmployeesAsync(staffType, search);
        }

        // Salary Assignments

        public async Task<IEnumerable<SalaryAssignmentDto>>
            GetSalaryAssignmentsAsync(int? staffId, string? status)
        {
            return await _payrollRepository
                .GetSalaryAssignmentsAsync(staffId, status);
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
                <body>
                    <h2>Payslip</h2>

                    <p>Dear {staffName},</p>

                    <p>
                        Your payslip for
                        <strong>
                            {monthName} {payslip.PayrollYear}
                        </strong>
                        is available.
                    </p>

                    <p>
                        <strong>Employee ID:</strong>
                        {employeeId}
                    </p>

                    <p>
                        <strong>Gross Salary:</strong>
                        ₹{payslip.GrossSalary:N2}
                    </p>

                    <p>
                        <strong>Total Deductions:</strong>
                        ₹{payslip.TotalDeductions:N2}
                    </p>

                    <p>
                        <strong>Net Salary:</strong>
                        ₹{payslip.NetSalary:N2}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        {payslipStatus}
                    </p>

                    <br/>

                    <p>
                        Regards,<br/>
                        College Management
                    </p>
                </body>
                </html>";

            await _emailService.SendEmailAsync(
                payslip.Email,
                subject,
                body);

            return true;
        }

        public async Task<IEnumerable<PayslipDto>>
            GetPayslipHistoryAsync(
                int? payrollMonth,
                int? payrollYear,
                string? staffType,
                string? search)
        {
            return await _payrollRepository
                .GetPayslipHistoryAsync(
                    payrollMonth,
                    payrollYear,
                    staffType,
                    search);
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
                string? status)
        {
            return await _payrollRepository
                .GetSalaryRevisionsAsync(staffId, status);
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
                string? status)
        {
            return await _payrollRepository
                .GetBonusesAsync(staffId, status);
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
                string? status)
        {
            return await _payrollRepository
                .GetAdvancesAsync(staffId, status);
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
        public async Task<MonthlyPayrollSummaryDto> GetMonthlyPayrollSummaryAsync(int month, int year)
        {
            return await _payrollRepository.GetMonthlyPayrollSummaryAsync(month, year);
        }

        // API 34: Advance repayments for a payslip
        public async Task<IEnumerable<PayslipAdvanceRepaymentDto>> GetAdvanceRepaymentsByPayslipAsync(int payslipId)
        {
            return await _payrollRepository.GetAdvanceRepaymentsByPayslipAsync(payslipId);
        }

    }
}