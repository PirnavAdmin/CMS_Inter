using System.Data;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.Payroll;
using CollegeManagement.API.Repositories.Interfaces.Payroll;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Payroll
{
    public class PayrollRepository : IPayrollRepository
    {
        private readonly IDbConnection _dbConnection;

        public PayrollRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }



        public async Task<int> CreateSalaryStructureAsync(
            CreateSalaryStructureRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StructureName", request.StructureName);
            parameters.Add("p_StaffType", request.StaffType);
            parameters.Add("p_DepartmentId", request.DepartmentId);
            parameters.Add("p_DesignationId", request.DesignationId);
            parameters.Add("p_BasicPay", request.BasicPay);
            parameters.Add("p_HRA", request.HRA);
            parameters.Add("p_DA", request.DA);
            parameters.Add(
                "p_ConveyanceAllowance",
                request.ConveyanceAllowance);
            parameters.Add(
                "p_MedicalAllowance",
                request.MedicalAllowance);
            parameters.Add(
                "p_OtherAllowance",
                request.OtherAllowance);
            parameters.Add("p_PF", request.PF);
            parameters.Add(
                "p_ProfessionalTax",
                request.ProfessionalTax);
            parameters.Add("p_TDS", request.TDS);
            parameters.Add("p_ESI", request.ESI);
            parameters.Add(
                "p_InsuranceOtherDeduction",
                request.InsuranceOtherDeduction);
            parameters.Add("p_Status", request.Status);

            return await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollSalaryStructure_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<SalaryStructureDto>>
            GetSalaryStructuresAsync(
                string? staffType,
                string? search)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffType", staffType);
            parameters.Add("p_Search", search);

            return await _dbConnection.QueryAsync<SalaryStructureDto>(
                "sp_PayrollSalaryStructure_GetAll",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<SalaryStructureDto?>
            GetSalaryStructureByIdAsync(int id)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_Id", id);

            return await _dbConnection
                .QueryFirstOrDefaultAsync<SalaryStructureDto>(
                    "sp_PayrollSalaryStructure_GetById",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateSalaryStructureAsync(
            int id,
            UpdateSalaryStructureRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_Id", id);
            parameters.Add("p_StructureName", request.StructureName);
            parameters.Add("p_StaffType", request.StaffType);
            parameters.Add("p_DepartmentId", request.DepartmentId);
            parameters.Add("p_DesignationId", request.DesignationId);
            parameters.Add("p_BasicPay", request.BasicPay);
            parameters.Add("p_HRA", request.HRA);
            parameters.Add("p_DA", request.DA);
            parameters.Add(
                "p_ConveyanceAllowance",
                request.ConveyanceAllowance);
            parameters.Add(
                "p_MedicalAllowance",
                request.MedicalAllowance);
            parameters.Add(
                "p_OtherAllowance",
                request.OtherAllowance);
            parameters.Add("p_PF", request.PF);
            parameters.Add(
                "p_ProfessionalTax",
                request.ProfessionalTax);
            parameters.Add("p_TDS", request.TDS);
            parameters.Add("p_ESI", request.ESI);
            parameters.Add(
                "p_InsuranceOtherDeduction",
                request.InsuranceOtherDeduction);
            parameters.Add("p_Status", request.Status);

            var affectedRows =
                await _dbConnection.QuerySingleAsync<int>(
                    "sp_PayrollSalaryStructure_Update",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteSalaryStructureAsync(int id)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_Id", id);

            var affectedRows =
                await _dbConnection.QuerySingleAsync<int>(
                    "sp_PayrollSalaryStructure_Delete",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }



        public async Task<IEnumerable<PayrollEmployeeDto>>
            GetEmployeesAsync(
                string? staffType,
                string? search,
                int? campusId = null)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffType", staffType);
            parameters.Add("p_Search", search);
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryAsync<PayrollEmployeeDto>(
                "sp_PayrollEmployee_GetAll",
                parameters,
                commandType: CommandType.StoredProcedure);
        }



        public async Task<IEnumerable<SalaryAssignmentDto>>
            GetSalaryAssignmentsAsync(int? staffId, string? status, int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_Status", status);
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryAsync<SalaryAssignmentDto>(
                "sp_PayrollStaffSalary_GetAll",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<SalaryAssignmentDto?> GetSalaryAssignmentByIdAsync(int id)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            return await _dbConnection.QueryFirstOrDefaultAsync<SalaryAssignmentDto>(
                "sp_PayrollStaffSalary_GetById",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> AssignSalaryStructureAsync(
            AssignSalaryStructureRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", request.StaffId);
            parameters.Add(
                "p_SalaryStructureId",
                request.SalaryStructureId);
            parameters.Add(
                "p_EffectiveFrom",
                request.EffectiveFrom.Date);
            parameters.Add("p_PaymentMode", request.PaymentMode);
            parameters.Add("p_BankName", request.BankName);
            parameters.Add("p_AccountNumber", request.AccountNumber);
            parameters.Add("p_IFSCCode", request.IFSCCode ?? request.IfscCode);
            parameters.Add("p_PANNumber", request.PANNumber ?? request.PanNumber);
            parameters.Add("p_UANNumber", request.UANNumber ?? request.UanNumber);

            return await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollStaffSalary_Assign",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateSalaryAssignmentAsync(
            int id,
            UpdateSalaryAssignmentRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_Id", id);
            parameters.Add(
                "p_SalaryStructureId",
                request.SalaryStructureId);
            parameters.Add(
                "p_EffectiveFrom",
                request.EffectiveFrom.Date);
            parameters.Add("p_PaymentMode", request.PaymentMode);
            parameters.Add("p_BankName", request.BankName);
            parameters.Add("p_AccountNumber", request.AccountNumber);
            parameters.Add("p_IFSCCode", request.IFSCCode ?? request.IfscCode);
            parameters.Add("p_PANNumber", request.PANNumber ?? request.PanNumber);
            parameters.Add("p_UANNumber", request.UANNumber ?? request.UanNumber);

            var affectedRows =
                await _dbConnection.QuerySingleAsync<int>(
                    "sp_PayrollStaffSalary_Update",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> DeleteSalaryAssignmentAsync(int id)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_Id", id);

            var affectedRows =
                await _dbConnection.QuerySingleAsync<int>(
                    "sp_PayrollStaffSalary_Delete",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }

        public async Task<bool> UpdateSalaryAssignmentStatusAsync(
            int id,
            string status)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_Id", id);
            parameters.Add("p_Status", status);

            var affectedRows =
                await _dbConnection.QuerySingleAsync<int>(
                    "sp_PayrollStaffSalary_UpdateStatus",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }



        public async Task<int> GeneratePayslipAsync(
            GeneratePayslipRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", request.StaffId);
            parameters.Add(
                "p_PayrollMonth",
                request.PayrollMonth);
            parameters.Add(
                "p_PayrollYear",
                request.PayrollYear);

            return await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollPayslip_Generate",
                parameters,
                commandType: CommandType.StoredProcedure);
        }



        public async Task<IEnumerable<int>> GenerateBulkPayslipsAsync(
            GenerateBulkPayslipRequest request)
        {
            var payslipIds = new List<int>();

            foreach (var staffId in request.StaffIds.Distinct())
            {
                var parameters = new DynamicParameters();

                parameters.Add("p_StaffId", staffId);
                parameters.Add(
                    "p_PayrollMonth",
                    request.PayrollMonth);
                parameters.Add(
                    "p_PayrollYear",
                    request.PayrollYear);

                var payslipId =
                    await _dbConnection.QuerySingleAsync<int>(
                        "sp_PayrollPayslip_Generate",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                payslipIds.Add(payslipId);
            }

            return payslipIds;
        }



        public async Task<bool> UpdatePayslipStatusAsync(
            int id,
            string status)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_Id", id);
            parameters.Add("p_Status", status);

            var affectedRows =
                await _dbConnection.QuerySingleAsync<int>(
                    "sp_PayrollPayslip_UpdateStatus",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return affectedRows > 0;
        }



        public async Task<PayslipEmailDetailsDto?>
            GetPayslipEmailDetailsAsync(int payslipId)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_PayslipId", payslipId);

            return await _dbConnection
                .QueryFirstOrDefaultAsync<PayslipEmailDetailsDto>(
                    "sp_PayrollPayslip_GetEmailDetails",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<int?> ResolvePayslipIdAsync(string rawId)
        {
            if (string.IsNullOrWhiteSpace(rawId))
                return null;

            // 1. Direct integer check (safe 32-bit int)
            if (int.TryParse(rawId, out int directId) && directId > 0 && directId <= 2000000000)
            {
                var exists = await _dbConnection.ExecuteScalarAsync<int?>(
                    "SELECT PayslipId FROM payroll_payslips WHERE PayslipId = @id LIMIT 1;",
                    new { id = directId });
                if (exists.HasValue) return exists.Value;
            }

            string? staffStr = null;
            int? year = null;
            int? month = null;

            // 2. Format: slip-{staff}-{year}-{month}-{timestamp}
            var m = Regex.Match(rawId, @"^slip-([^-]+)-(\d{4})-(\d{1,2})", RegexOptions.IgnoreCase);
            if (m.Success)
            {
                staffStr = m.Groups[1].Value;
                if (int.TryParse(m.Groups[2].Value, out int y)) year = y;
                if (int.TryParse(m.Groups[3].Value, out int mo)) month = mo;
            }
            // 3. Numeric concatenated: {staff}{year:4}{month:2}{timestamp:13} (e.g. 372026091790666200000)
            else if (rawId.Length >= 19 && Regex.IsMatch(rawId, @"^\d+$"))
            {
                try
                {
                    string monthPart = rawId.Substring(rawId.Length - 15, 2);
                    string yearPart = rawId.Substring(rawId.Length - 19, 4);
                    string staffPart = rawId.Substring(0, rawId.Length - 19);

                    int parsedMonth = int.Parse(monthPart);
                    int parsedYear = int.Parse(yearPart);

                    if (parsedMonth >= 1 && parsedMonth <= 12 && parsedYear >= 2000 && parsedYear <= 2100)
                    {
                        month = parsedMonth;
                        year = parsedYear;
                        staffStr = staffPart;
                    }
                }
                catch
                {
                    // Ignore parse failures
                }
            }

            if (year.HasValue && month.HasValue)
            {
                int.TryParse(staffStr, out int numericStaff);

                string sql = @"
                    SELECT pp.PayslipId 
                    FROM payroll_payslips pp
                    JOIN Staffs s ON s.Id = pp.StaffId
                    WHERE pp.PayrollYear = @year 
                      AND pp.PayrollMonth = @month
                      AND (
                          (@numericStaff > 0 AND s.Id = @numericStaff)
                          OR (@staffStr IS NOT NULL AND s.EmployeeId = @staffStr)
                          OR (@staffStr IS NOT NULL AND s.EmployeeId LIKE CONCAT('%', @staffStr))
                      )
                    ORDER BY pp.PayslipId DESC
                    LIMIT 1;";

                var found = await _dbConnection.ExecuteScalarAsync<int?>(sql, new { year = year.Value, month = month.Value, staffStr, numericStaff });
                if (found.HasValue) return found.Value;

                // Fallback: If only 1 payslip exists for that year & month, or most recent
                var fallback = await _dbConnection.ExecuteScalarAsync<int?>(
                    "SELECT pp.PayslipId FROM payroll_payslips pp WHERE pp.PayrollYear = @year AND pp.PayrollMonth = @month ORDER BY pp.PayslipId DESC LIMIT 1;",
                    new { year = year.Value, month = month.Value });
                if (fallback.HasValue) return fallback.Value;
            }

            return null;
        }



        public async Task<IEnumerable<PayslipDto>>
            GetPayslipHistoryAsync(
                int? payrollMonth,
                int? payrollYear,
                string? staffType,
                string? search,
                int? campusId = null)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_PayrollMonth", payrollMonth);
            parameters.Add("p_PayrollYear", payrollYear);
            parameters.Add("p_StaffType", staffType);
            parameters.Add("p_Search", search);
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryAsync<PayslipDto>(
                "sp_PayrollPayslip_GetHistory",
                parameters,
                commandType: CommandType.StoredProcedure);
        }



        public async Task<PayslipDto?> GetPayslipByIdAsync(
            int payslipId)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_PayslipId", payslipId);

            return await _dbConnection
                .QueryFirstOrDefaultAsync<PayslipDto>(
                    "sp_PayrollPayslip_GetById",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }



        // CREATE SALARY REVISION
        public async Task<int> CreateSalaryRevisionAsync(
            CreateSalaryRevisionRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", request.StaffId);
            parameters.Add(
                "p_CurrentSalaryStructureId",
                request.CurrentSalaryStructureId);
            parameters.Add(
                "p_ProposedSalaryStructureId",
                request.ProposedSalaryStructureId);
            parameters.Add(
                "p_EffectiveFrom",
                request.EffectiveFrom.Date);
            parameters.Add("p_Reason", request.Reason);

            return await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollSalaryRevision_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        // GET SALARY REVISION HISTORY
        public async Task<IEnumerable<SalaryRevisionDto>>
            GetSalaryRevisionsAsync(
                int? staffId,
                string? status,
                int? campusId = null)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_Status", status);
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection
                .QueryAsync<SalaryRevisionDto>(
                    "sp_PayrollSalaryRevision_GetAll",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }

        // APPROVE SALARY REVISION
        public async Task<bool> ApproveSalaryRevisionAsync(
            int revisionId,
            int approvedBy)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_RevisionId", revisionId);
            parameters.Add("p_ApprovedBy", approvedBy);

            var result =
                await _dbConnection.QuerySingleAsync<int>(
                    "sp_PayrollSalaryRevision_Approve",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return result == 1;
        }


        // =========================================================
        // BONUSES
        // =========================================================

        public async Task<int> CreateBonusAsync(
            CreateBonusRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", request.StaffId);
            parameters.Add("p_BonusType", request.BonusType);
            parameters.Add("p_Amount", request.Amount);
            parameters.Add("p_BonusMonth", request.BonusMonth);
            parameters.Add("p_BonusYear", request.BonusYear);
            parameters.Add("p_Reason", request.Reason);

            return await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollBonus_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<BonusDto>> GetBonusesAsync(
            int? staffId,
            string? status,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_Status", status);
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryAsync<BonusDto>(
                "sp_PayrollBonus_GetAll",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        // GET BONUS BY ID
        public async Task<BonusDto?> GetBonusByIdAsync(int id)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);

            return await _dbConnection.QueryFirstOrDefaultAsync<BonusDto>(
                "sp_PayrollBonus_GetById",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ApproveBonusAsync(
            int bonusId,
            int approvedBy)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_BonusId", bonusId);
            parameters.Add("p_ApprovedBy", approvedBy);

            var result = await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollBonus_Approve",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        // =========================================================
        // ADVANCES / LOANS
        // =========================================================

        public async Task<int> CreateAdvanceAsync(
            CreateAdvanceRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", request.StaffId);
            parameters.Add("p_AdvanceType", request.AdvanceType);
            parameters.Add("p_Amount", request.Amount);
            parameters.Add("p_Reason", request.Reason);
            parameters.Add("p_RepaymentMonths", request.RepaymentMonths);
            parameters.Add("p_StartMonth", request.StartMonth);
            parameters.Add("p_StartYear", request.StartYear);

            return await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollAdvance_Create",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<AdvanceDto>> GetAdvancesAsync(
            int? staffId,
            string? status,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_Status", status);
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryAsync<AdvanceDto>(
                "sp_PayrollAdvance_GetAll",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<AdvanceDto?> GetAdvanceByIdAsync(int id)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);

            return await _dbConnection.QueryFirstOrDefaultAsync<AdvanceDto>(
                "sp_PayrollAdvance_GetById",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ApproveAdvanceAsync(
            int advanceId,
            int approvedBy)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_AdvanceId", advanceId);
            parameters.Add("p_ApprovedBy", approvedBy);

            var result = await _dbConnection.QuerySingleAsync<int>(
                "sp_PayrollAdvance_Approve",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        // ADVANCE / LOAN BALANCES
        public async Task<IEnumerable<AdvanceBalanceDto>> GetAdvanceBalancesAsync(
            int? staffId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);

            return await _dbConnection.QueryAsync<AdvanceBalanceDto>(
                "sp_PayrollAdvance_GetBalance",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        // ADVANCE / LOAN REPAYMENT HISTORY
        public async Task<IEnumerable<AdvanceRepaymentDto>> GetAdvanceRepaymentHistoryAsync(
            int? staffId,
            int? advanceId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_AdvanceId", advanceId);

            return await _dbConnection.QueryAsync<AdvanceRepaymentDto>(
                "sp_PayrollAdvance_GetRepaymentHistory",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        // Annual payroll summary for one staff member
        public async Task<StaffPayrollSummaryDto> GetStaffPayrollSummaryAsync(int staffId, int year)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_PayrollYear", year);

            return await _dbConnection.QuerySingleAsync<StaffPayrollSummaryDto>(
                "sp_Payroll_GetStaffSummary", parameters,
                commandType: CommandType.StoredProcedure);
        }

        // Monthly payroll summary
        public async Task<MonthlyPayrollSummaryDto> GetMonthlyPayrollSummaryAsync(int month, int year, int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_PayrollMonth", month);
            parameters.Add("p_PayrollYear", year);
            parameters.Add("p_CampusId", campusId);
            return await _dbConnection.QuerySingleAsync<MonthlyPayrollSummaryDto>(
                "sp_Payroll_GetMonthlySummary", parameters,
                commandType: CommandType.StoredProcedure);
        }

        // API 34: Advance repayments for a payslip
        public async Task<IEnumerable<PayslipAdvanceRepaymentDto>> GetAdvanceRepaymentsByPayslipAsync(int payslipId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_PayslipId", payslipId);
            return await _dbConnection.QueryAsync<PayslipAdvanceRepaymentDto>(
                "sp_PayrollAdvance_GetByPayslip",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

    }
}
