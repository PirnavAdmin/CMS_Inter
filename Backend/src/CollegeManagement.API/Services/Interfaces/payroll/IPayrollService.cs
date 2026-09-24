using CollegeManagement.API.DTOs.Payroll;

namespace CollegeManagement.API.Services.Interfaces.Payroll
{
    public interface IPayrollService
    {
        // Salary Structures
        Task<int> CreateSalaryStructureAsync(CreateSalaryStructureRequest request);
        Task<IEnumerable<SalaryStructureDto>> GetSalaryStructuresAsync(string? staffType, string? search);
        Task<SalaryStructureDto?> GetSalaryStructureByIdAsync(int id);
        Task<bool> UpdateSalaryStructureAsync(int id, UpdateSalaryStructureRequest request);
        Task<bool> DeleteSalaryStructureAsync(int id);

        // Employees
        Task<IEnumerable<PayrollEmployeeDto>> GetEmployeesAsync(string? staffType, string? search);

        // Salary Assignments
        Task<IEnumerable<SalaryAssignmentDto>> GetSalaryAssignmentsAsync(int? staffId, string? status);
        Task<SalaryAssignmentDto?> GetSalaryAssignmentByIdAsync(int id);

        Task<int> AssignSalaryStructureAsync(
AssignSalaryStructureRequest request);
        Task<bool> UpdateSalaryAssignmentAsync(int id, UpdateSalaryAssignmentRequest request);
        Task<bool> DeleteSalaryAssignmentAsync(int id);
        Task<bool> UpdateSalaryAssignmentStatusAsync(int id, string status);

        // Payslips
        Task<int> GeneratePayslipAsync(GeneratePayslipRequest request);
        Task<IEnumerable<int>> GenerateBulkPayslipsAsync(GenerateBulkPayslipRequest request);
        Task<bool> UpdatePayslipStatusAsync(int id, string status);
        Task<bool> SendPayslipEmailAsync(int payslipId);
        Task<IEnumerable<PayslipDto>> GetPayslipHistoryAsync(int? payrollMonth, int? payrollYear, string? staffType, string? search);
        Task<PayslipDto?> GetPayslipByIdAsync(int payslipId);

        // Salary Revisions
        Task<int> CreateSalaryRevisionAsync(CreateSalaryRevisionRequest request);
        Task<IEnumerable<SalaryRevisionDto>> GetSalaryRevisionsAsync(int? staffId, string? status);
        Task<bool> ApproveSalaryRevisionAsync(int revisionId, int approvedBy);

        // Bonuses
        Task<int> CreateBonusAsync(CreateBonusRequest request);
        Task<IEnumerable<BonusDto>> GetBonusesAsync(int? staffId, string? status);
        Task<BonusDto?> GetBonusByIdAsync(int id);
        Task<bool> ApproveBonusAsync(int bonusId, int approvedBy);

        // Advances and Loans
        Task<int> CreateAdvanceAsync(CreateAdvanceRequest request);
        Task<IEnumerable<AdvanceDto>> GetAdvancesAsync(int? staffId, string? status);
        Task<AdvanceDto?> GetAdvanceByIdAsync(int id);
        Task<bool> ApproveAdvanceAsync(int advanceId, int approvedBy);
        Task<IEnumerable<AdvanceBalanceDto>> GetAdvanceBalancesAsync(int? staffId);
        Task<IEnumerable<AdvanceRepaymentDto>> GetAdvanceRepaymentHistoryAsync(int? staffId, int? advanceId);
        // Annual payroll summary for one staff member
        Task<StaffPayrollSummaryDto> GetStaffPayrollSummaryAsync(int staffId, int year);

        // Monthly payroll summary
        Task<MonthlyPayrollSummaryDto> GetMonthlyPayrollSummaryAsync(int month, int year);
        Task<IEnumerable<PayslipAdvanceRepaymentDto>> GetAdvanceRepaymentsByPayslipAsync(int payslipId);

    }
}
