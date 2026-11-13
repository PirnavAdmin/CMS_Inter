using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.LopConfiguration;
using CollegeManagement.API.Repositories.Interfaces.LopConfiguration;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations.LopConfiguration
{
    public class LopConfigurationRepository : ILopConfigurationRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LopConfigurationRepository> _logger;
        private static bool _schemaAligned = false;

        public LopConfigurationRepository(AppDbContext context, ILogger<LopConfigurationRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        private async Task<DbConnection> GetOpenConnectionAsync(CancellationToken ct = default)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync(ct);
            }
            await EnsureSchemaAlignedAsync(conn, ct);
            return conn;
        }

        private async Task EnsureSchemaAlignedAsync(DbConnection conn, CancellationToken ct)
        {
            if (_schemaAligned) return;
            try
            {
                var colCount = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_schema = DATABASE() AND table_name = 'LopPolicies' AND column_name = 'WeeklyMissedCheckoutRuleEnabled';
                ");
                if (colCount == 0)
                {
                    await conn.ExecuteAsync(@"
                        ALTER TABLE `LopPolicies` 
                        ADD COLUMN `WeeklyMissedCheckoutRuleEnabled` TINYINT(1) NOT NULL DEFAULT 1,
                        ADD COLUMN `WeeklyMissedCheckoutThreshold` INT NOT NULL DEFAULT 2,
                        ADD COLUMN `WeeklyMissedCheckoutPenaltyDays` DECIMAL(3,1) NOT NULL DEFAULT 1.0;
                    ");
                }
                _schemaAligned = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Schema alignment check for WeeklyMissedCheckoutRule columns failed or already exists.");
            }
        }

        public async Task<LopPolicyDto> GetPolicyAsync(int? campusId = null, string? staffType = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                LopPolicyDto? result;

                if (campusId.HasValue && campusId.Value > 0 || !string.IsNullOrWhiteSpace(staffType))
                {
                    result = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                        new CommandDefinition(
                            "sp_LopPolicy_GetByScope",
                            new { p_CampusId = campusId ?? 0, p_StaffType = string.IsNullOrWhiteSpace(staffType) ? "All" : staffType.Trim() },
                            commandType: CommandType.StoredProcedure,
                            cancellationToken: ct));
                }
                else
                {
                    result = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                        new CommandDefinition(
                            "sp_LopPolicy_Get",
                            commandType: CommandType.StoredProcedure,
                            cancellationToken: ct));
                }

                if (result != null)
                {
                    try
                    {
                        var extra = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
                            SELECT 
                                COALESCE(WeeklyMissedCheckoutRuleEnabled, 1) AS WeeklyRule,
                                COALESCE(WeeklyMissedCheckoutThreshold, 2) AS WeeklyThreshold,
                                COALESCE(WeeklyMissedCheckoutPenaltyDays, 1.0) AS WeeklyPenalty
                            FROM `LopPolicies`
                            WHERE PolicyId = @PolicyId;
                        ", new { PolicyId = result.PolicyId });

                        if (extra != null)
                        {
                            result.WeeklyMissedCheckoutRuleEnabled = Convert.ToInt32(extra.WeeklyRule ?? 1) == 1;
                            result.WeeklyMissedCheckoutThreshold = Convert.ToInt32(extra.WeeklyThreshold ?? 2);
                            result.WeeklyMissedCheckoutPenaltyDays = Convert.ToDecimal(extra.WeeklyPenalty ?? 1.0m);
                        }
                    }
                    catch
                    {
                        result.WeeklyMissedCheckoutRuleEnabled = true;
                        result.WeeklyMissedCheckoutThreshold = 2;
                        result.WeeklyMissedCheckoutPenaltyDays = 1.0m;
                    }
                }

                return result ?? throw new InvalidOperationException("LOP policy configuration is missing in database.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve LOP policy");
                throw;
            }
        }

        public async Task<IEnumerable<LopPolicyDto>> GetAllPoliciesAsync(CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var rows = await conn.QueryAsync<LopPolicyDto>(
                    new CommandDefinition(
                        "sp_LopPolicy_GetAll",
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));
                return rows ?? Enumerable.Empty<LopPolicyDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopPolicy_GetAll");
                throw;
            }
        }

        public async Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? updatedByUserId = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_CampusId", request.CampusId);
                parameters.Add("p_StaffType", string.IsNullOrWhiteSpace(request.StaffType) ? "All" : request.StaffType.Trim());
                parameters.Add("p_IsEnabled", request.Enabled ? 1 : 0);
                parameters.Add("p_ShiftStart", request.ShiftStart ?? "09:00");
                parameters.Add("p_GraceMinutes", request.GraceMinutes);
                parameters.Add("p_AllowedLateLogins", request.AllowedLateLogins);
                parameters.Add("p_LateLoginsPerPenalty", Math.Max(1, request.LateLoginsPerPenalty));
                parameters.Add("p_PenaltyDays", request.PenaltyDays);
                parameters.Add("p_Basis", request.Basis ?? "calendar");
                parameters.Add("p_EffectiveFrom", request.EffectiveFrom ?? DateTime.UtcNow.ToString("yyyy-MM"));
                parameters.Add("p_UpdatedByUserId", updatedByUserId);
                parameters.Add("p_MissedCheckoutLopEnabled", request.MissedCheckoutLopEnabled ? 1 : 0);
                parameters.Add("p_AllowedMissedCheckouts", request.AllowedMissedCheckouts);
                parameters.Add("p_MissedCheckoutsPerPenalty", Math.Max(1, request.MissedCheckoutsPerPenalty));
                parameters.Add("p_MissedCheckoutPenaltyDays", request.MissedCheckoutPenaltyDays);
                parameters.Add("p_UseShiftTimingConfig", request.UseShiftTimingConfig ? 1 : 0);
                parameters.Add("p_AbsentLopEnabled", request.AbsentLopEnabled ? 1 : 0);
                parameters.Add("p_AbsentPenaltyDays", request.AbsentPenaltyDays);
                parameters.Add("p_CountUnmarkedWorkingDaysAsAbsent", request.CountUnmarkedWorkingDaysAsAbsent ? 1 : 0);
                parameters.Add("p_HalfDayLopEnabled", request.HalfDayLopEnabled ? 1 : 0);
                parameters.Add("p_HalfDayPenaltyDays", request.HalfDayPenaltyDays);
                parameters.Add("p_DeductionComponent", string.IsNullOrWhiteSpace(request.DeductionComponent) ? "Gross" : request.DeductionComponent.Trim());
                parameters.Add("p_RoundingMode", string.IsNullOrWhiteSpace(request.RoundingMode) ? "Exact" : request.RoundingMode.Trim());
                parameters.Add("p_MaxLopDaysPerMonth", request.MaxLopDaysPerMonth);
                parameters.Add("p_AutoApplyToPayroll", request.AutoApplyToPayroll ? 1 : 0);

                var saved = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                    new CommandDefinition(
                        "sp_LopPolicy_Save",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                if (saved != null)
                {
                    try
                    {
                        await conn.ExecuteAsync(@"
                            UPDATE `LopPolicies` 
                            SET WeeklyMissedCheckoutRuleEnabled = @WeeklyRule,
                                WeeklyMissedCheckoutThreshold = @WeeklyThreshold,
                                WeeklyMissedCheckoutPenaltyDays = @WeeklyPenalty
                            WHERE PolicyId = @PolicyId;
                        ", new {
                            WeeklyRule = request.WeeklyMissedCheckoutRuleEnabled ? 1 : 0,
                            WeeklyThreshold = Math.Max(1, request.WeeklyMissedCheckoutThreshold),
                            WeeklyPenalty = request.WeeklyMissedCheckoutPenaltyDays > 0 ? request.WeeklyMissedCheckoutPenaltyDays : 1.0m,
                            PolicyId = saved.PolicyId
                        });
                        saved.WeeklyMissedCheckoutRuleEnabled = request.WeeklyMissedCheckoutRuleEnabled;
                        saved.WeeklyMissedCheckoutThreshold = Math.Max(1, request.WeeklyMissedCheckoutThreshold);
                        saved.WeeklyMissedCheckoutPenaltyDays = request.WeeklyMissedCheckoutPenaltyDays > 0 ? request.WeeklyMissedCheckoutPenaltyDays : 1.0m;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to persist WeeklyMissedCheckout columns directly on LopPolicies.");
                    }
                }

                return saved ?? throw new InvalidOperationException("Failed to retrieve saved LOP policy from database.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopPolicy_Save");
                throw;
            }
        }

        public async Task<bool> DeletePolicyOverrideAsync(int policyId, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var affected = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_LopPolicy_DeleteOverride",
                    new { p_PolicyId = policyId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
            return affected > 0;
        }

        public async Task<IEnumerable<LopStaffRecordDto>> GetStaffRecordsAsync(string? month = null, string? searchTerm = null, int? campusId = null, string? source = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());
                parameters.Add("p_SearchTerm", string.IsNullOrWhiteSpace(searchTerm) ? null : searchTerm.Trim());
                parameters.Add("p_CampusId", campusId ?? 0);
                parameters.Add("p_Source", string.IsNullOrWhiteSpace(source) ? null : source.Trim());

                var rows = await conn.QueryAsync<LopStaffRecordDto>(
                    new CommandDefinition(
                        "sp_LopStaffRecords_GetAll",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return rows ?? Enumerable.Empty<LopStaffRecordDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffRecords_GetAll");
                throw;
            }
        }

        public async Task<LopStaffRecordDto?> GetStaffRecordByIdAsync(int id, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                return await conn.QueryFirstOrDefaultAsync<LopStaffRecordDto>(
                    new CommandDefinition(
                        "sp_LopStaffRecord_GetById",
                        new { p_Id = id },
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffRecord_GetById: {Id}", id);
                throw;
            }
        }

        public async Task<LopKpisDto> GetKpisAsync(string? month = null, int? campusId = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());
                parameters.Add("p_CampusId", campusId ?? 0);

                var kpi = await conn.QueryFirstOrDefaultAsync<LopKpisDto>(
                    new CommandDefinition(
                        "sp_LopStaffRecords_GetKpis",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return kpi ?? new LopKpisDto();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffRecords_GetKpis");
                throw;
            }
        }

        public async Task<int> SaveStaffRecordAsync(LopStaffRecordDto record, int? createdByUserId = null, CancellationToken ct = default)
        {
            int.TryParse(record.StaffId, out int staffNumericId);
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffNumericId);
            parameters.Add("p_EmployeeId", record.EmployeeId);
            parameters.Add("p_StaffName", record.Name);
            parameters.Add("p_Department", record.Department);
            parameters.Add("p_CampusId", record.CampusId);
            parameters.Add("p_Month", record.Month);
            parameters.Add("p_MonthlySalary", record.MonthlySalary);
            parameters.Add("p_LopDays", record.LopDays);
            parameters.Add("p_Basis", record.Basis);
            parameters.Add("p_DeductionComponent", string.IsNullOrWhiteSpace(record.DeductionComponent) ? "Gross" : record.DeductionComponent);
            parameters.Add("p_PeriodDays", record.PeriodDays);
            parameters.Add("p_Deduction", record.Deduction);
            parameters.Add("p_SalaryAfterLop", record.SalaryAfterLop);
            parameters.Add("p_Reason", record.Reason);
            parameters.Add("p_Source", string.IsNullOrWhiteSpace(record.Source) ? "Manual" : record.Source);
            parameters.Add("p_LatePenaltyDays", record.LatePenaltyDays);
            parameters.Add("p_MissedCheckoutPenaltyDays", record.MissedCheckoutPenaltyDays);
            parameters.Add("p_AbsentDays", record.AbsentDays);
            parameters.Add("p_HalfDays", record.HalfDays);
            parameters.Add("p_Status", string.IsNullOrWhiteSpace(record.Status) ? "Active" : record.Status);
            parameters.Add("p_CreatedByUserId", createdByUserId);

            return await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_LopStaffRecord_Save",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
        }

        public async Task<bool> UpdateStaffRecordAsync(
            int id,
            decimal days,
            string basis,
            string deductionComponent,
            int periodDays,
            decimal deduction,
            decimal salaryAfterLop,
            string reason,
            string? status,
            int? updatedByUserId = null,
            CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_LopDays", days);
            parameters.Add("p_Basis", basis);
            parameters.Add("p_DeductionComponent", string.IsNullOrWhiteSpace(deductionComponent) ? "Gross" : deductionComponent);
            parameters.Add("p_PeriodDays", periodDays);
            parameters.Add("p_Deduction", deduction);
            parameters.Add("p_SalaryAfterLop", salaryAfterLop);
            parameters.Add("p_Reason", reason);
            parameters.Add("p_Status", string.IsNullOrWhiteSpace(status) ? null : status.Trim());
            parameters.Add("p_UpdatedByUserId", updatedByUserId);

            var rowsAffected = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_LopStaffRecord_Update",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rowsAffected > 0;
        }

        public async Task<bool> UpdateStaffRecordStatusAsync(int id, string status, string? reason, int? updatedByUserId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_Status", status);
            parameters.Add("p_Reason", string.IsNullOrWhiteSpace(reason) ? null : reason.Trim());
            parameters.Add("p_UpdatedByUserId", updatedByUserId);

            var rowsAffected = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_LopStaffRecord_UpdateStatus",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rowsAffected > 0;
        }

        public async Task<bool> DeleteStaffRecordAsync(int id, int? deletedByUserId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_DeletedByUserId", deletedByUserId);

            var rowsAffected = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_LopStaffRecord_Delete",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rowsAffected > 0;
        }

        public async Task<IEnumerable<LopStaffDropdownDto>> GetStaffListForLopAsync(int? campusId = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var list = await conn.QueryAsync<LopStaffDropdownDto>(
                    new CommandDefinition(
                        "sp_LopStaffList_Get",
                        new { p_CampusId = campusId ?? 0 },
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return list ?? Enumerable.Empty<LopStaffDropdownDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffList_Get");
                throw;
            }
        }

        public async Task<Dictionary<int, StaffMonthlyAttendanceMetric>> GetMonthlyAttendanceMetricsAsync(
            string targetMonth,
            LopPolicyDto policy,
            IReadOnlyList<LopStaffDropdownDto> staffList,
            CancellationToken ct = default)
        {
            var result = new Dictionary<int, StaffMonthlyAttendanceMetric>();
            if (!DateTime.TryParseExact($"{targetMonth}-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var monthStart))
            {
                monthStart = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            }
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            var today = DateTime.Today;
            var nowTime = DateTime.Now.TimeOfDay;
            var effectiveEndDate = monthEnd < today ? monthEnd : today;

            const string sql = @"
SELECT
    sa.FacultyId,
    DATE(sas.AttendanceDate) AS AttDate,
    sa.Status,
    sa.InTime,
    sa.OutTime,
    COALESCE(sa.IsMissedCheckoutResolved, 0) AS IsMissedCheckoutResolved
FROM `StaffAttendances` sa
INNER JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
WHERE sa.IsActive = 1
  AND sas.IsActive = 1
  AND DATE(sas.AttendanceDate) >= @MonthStart
  AND DATE(sas.AttendanceDate) <= @MonthEnd;

SELECT
    Id,
    StaffType,
    DepartmentId,
    WorkStartTime,
    WorkEndTime,
    LateThreshold,
    GracePeriodMinutes
FROM `AttendanceTimingConfigs`
WHERE IsActive = 1
ORDER BY (DepartmentId IS NOT NULL) DESC, (StaffType IS NOT NULL) DESC, Id DESC;

SELECT
    COALESCE(StaffId, FacultyId) AS StaffId,
    DATE(AttendanceDate) AS AttDate,
    COALESCE(RequestType, 'Late Attendance') AS RequestType
FROM `StaffAttendanceRegularizations`
WHERE DATE(AttendanceDate) >= @MonthStart
  AND DATE(AttendanceDate) <= @MonthEnd
  AND LOWER(Status) = 'approved';

SELECT
    StaffId,
    DATE(StartDate) AS StartDate,
    DATE(EndDate) AS EndDate
FROM `StaffLeaveRequests`
WHERE IsActive = 1
  AND Status = 2
  AND DATE(EndDate) >= @MonthStart
  AND DATE(StartDate) <= @MonthEnd;

SELECT
    DATE(StartDate) AS StartDate,
    DATE(EndDate) AS EndDate,
    CampusId,
    AppliesTo
FROM `Holidays`
WHERE IsDeleted = 0
  AND LOWER(COALESCE(Status, 'Active')) = 'active'
  AND DATE(EndDate) >= @MonthStart
  AND DATE(StartDate) <= @MonthEnd;";

            var conn = await GetOpenConnectionAsync(ct);
            using var multi = await conn.QueryMultipleAsync(
                new CommandDefinition(
                    sql,
                    new { MonthStart = monthStart.Date, MonthEnd = monthEnd.Date },
                    cancellationToken: ct));

            var attRows = (await multi.ReadAsync<dynamic>()).ToList();
            var timingRows = (await multi.ReadAsync<dynamic>()).ToList();
            var regRows = (await multi.ReadAsync<dynamic>()).ToList();
            var leaveRows = (await multi.ReadAsync<dynamic>()).ToList();
            var holidayRows = (await multi.ReadAsync<dynamic>()).ToList();

            var attByStaffDate = new Dictionary<(int StaffId, DateTime Date), (byte Status, TimeSpan? InTime, TimeSpan? OutTime, bool Resolved)>();
            foreach (var row in attRows)
            {
                int fId = Convert.ToInt32(row.FacultyId);
                DateTime dt = Convert.ToDateTime(row.AttDate).Date;
                byte st = Convert.ToByte(row.Status);
                TimeSpan? inT = ParseTimeNullable(row.InTime);
                TimeSpan? outT = ParseTimeNullable(row.OutTime);
                bool resolved = Convert.ToInt32(row.IsMissedCheckoutResolved ?? 0) == 1;
                attByStaffDate[(fId, dt)] = (st, inT, outT, resolved);
            }

            var approvedLateSet = new HashSet<(int, DateTime)>();
            var approvedMissedSet = new HashSet<(int, DateTime)>();
            var approvedAbsentSet = new HashSet<(int, DateTime)>();
            foreach (var r in regRows)
            {
                int sId = Convert.ToInt32(r.StaffId ?? 0);
                if (sId <= 0) continue;
                DateTime dt = Convert.ToDateTime(r.AttDate).Date;
                string reqType = ((string?)r.RequestType ?? "").ToLowerInvariant();
                if (reqType.Contains("missed")) approvedMissedSet.Add((sId, dt));
                else if (reqType.Contains("absent")) approvedAbsentSet.Add((sId, dt));
                else approvedLateSet.Add((sId, dt));
            }

            var leaveDatesByStaff = new Dictionary<int, HashSet<DateTime>>();
            foreach (var lv in leaveRows)
            {
                int sId = Convert.ToInt32(lv.StaffId ?? 0);
                if (sId <= 0) continue;
                DateTime sDt = Convert.ToDateTime(lv.StartDate).Date;
                DateTime eDt = Convert.ToDateTime(lv.EndDate).Date;
                if (!leaveDatesByStaff.TryGetValue(sId, out var set))
                {
                    set = new HashSet<DateTime>();
                    leaveDatesByStaff[sId] = set;
                }
                for (var d = sDt < monthStart ? monthStart : sDt; d <= eDt && d <= monthEnd; d = d.AddDays(1))
                {
                    set.Add(d);
                }
            }

            var holidayDatesByCampus = new List<(DateTime Start, DateTime End, int? CampusId)>();
            foreach (var h in holidayRows)
            {
                string applies = ((string?)h.AppliesTo ?? "").ToLowerInvariant();
                if (applies.Contains("student") && !applies.Contains("staff") && !applies.Contains("all"))
                    continue;
                int? cId = h.CampusId == null ? (int?)null : Convert.ToInt32(h.CampusId);
                holidayDatesByCampus.Add((Convert.ToDateTime(h.StartDate).Date, Convert.ToDateTime(h.EndDate).Date, cId));
            }

            var customStart = TimeSpan.TryParse(policy.ShiftStart, out var parsedCustomStart) ? parsedCustomStart : new TimeSpan(9, 0, 0);
            var customLateCutoff = customStart.Add(TimeSpan.FromMinutes(Math.Clamp(policy.GraceMinutes, 0, 120)));

            foreach (var staff in staffList)
            {
                if (!int.TryParse(staff.StaffId, out int staffNumericId) || staffNumericId <= 0) continue;

                bool isNonTeaching = !string.IsNullOrWhiteSpace(staff.StaffType) &&
                    staff.StaffType.Contains("non", StringComparison.OrdinalIgnoreCase);
                byte staffTypeCode = isNonTeaching ? (byte)2 : (byte)1;

                var timing = timingRows.FirstOrDefault(t =>
                    (t.DepartmentId == null || (staff.DepartmentId.HasValue && Convert.ToInt32(t.DepartmentId) == staff.DepartmentId.Value)) &&
                    (t.StaffType == null || Convert.ToByte(t.StaffType) == staffTypeCode));

                TimeSpan workStart = timing != null ? ParseTime(timing.WorkStartTime, isNonTeaching ? new TimeSpan(8, 30, 0) : new TimeSpan(9, 0, 0))
                    : (isNonTeaching ? new TimeSpan(8, 30, 0) : new TimeSpan(9, 0, 0));
                TimeSpan workEnd = timing != null ? ParseTime(timing.WorkEndTime, isNonTeaching ? new TimeSpan(17, 30, 0) : new TimeSpan(15, 20, 0))
                    : (isNonTeaching ? new TimeSpan(17, 30, 0) : new TimeSpan(15, 20, 0));
                TimeSpan shiftLateThreshold = timing != null ? ParseTime(timing.LateThreshold, workStart.Add(TimeSpan.FromMinutes(15)))
                    : workStart.Add(TimeSpan.FromMinutes(15));
                int checkoutGrace = timing != null ? Convert.ToInt32(timing.GracePeriodMinutes ?? 15) : 15;

                TimeSpan effectiveLateCutoff = policy.UseShiftTimingConfig ? shiftLateThreshold : customLateCutoff;
                TimeSpan checkoutCutoff = workEnd.Add(TimeSpan.FromMinutes(checkoutGrace));

                string shiftInfo = policy.UseShiftTimingConfig
                    ? $"Shift {FormatTs(workStart)} · Late > {FormatTs(effectiveLateCutoff)}"
                    : $"Custom {FormatTs(customStart)} (+{policy.GraceMinutes}m)";

                var metric = new StaffMonthlyAttendanceMetric
                {
                    StaffId = staffNumericId,
                    ShiftInfo = shiftInfo
                };

                if (monthStart <= effectiveEndDate)
                {
                    var joinDate = staff.JoiningDate?.Date ?? monthStart;
                    var loopStart = joinDate > monthStart ? joinDate : monthStart;

                    leaveDatesByStaff.TryGetValue(staffNumericId, out var staffLeaves);

                    int currentWeekNum = -1;
                    int weeklyUnresolvedMissedCount = 0;
                    bool pendingNextWorkingDayPenalty = false;

                    for (var d = loopStart; d <= effectiveEndDate; d = d.AddDays(1))
                    {
                        if (d.DayOfWeek == DayOfWeek.Sunday) continue;

                        bool isHoliday = holidayDatesByCampus.Any(h =>
                            d >= h.Start && d <= h.End &&
                            (!h.CampusId.HasValue || h.CampusId.Value == 0 || !staff.CampusId.HasValue || h.CampusId.Value == staff.CampusId.Value));
                        if (isHoliday) continue;

                        bool isApprovedLeave = staffLeaves != null && staffLeaves.Contains(d);

                        int weekNum = CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(d, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
                        if (weekNum != currentWeekNum)
                        {
                            currentWeekNum = weekNum;
                            weeklyUnresolvedMissedCount = 0;
                        }

                        // Apply Weekly Missed Checkout Lockout / Next Working Day LOP Rule
                        if (pendingNextWorkingDayPenalty)
                        {
                            pendingNextWorkingDayPenalty = false;
                            metric.AbsentCount++;
                            metric.WeeklyMissedCheckoutTriggerCount++;
                            metric.WeeklyMissedCheckoutPenaltyDays += (policy.WeeklyMissedCheckoutPenaltyDays > 0 ? policy.WeeklyMissedCheckoutPenaltyDays : 1.0m);

                            // Even if staff checked in / checked out today, do NOT mark Present (penalized as Absent)
                            if (attByStaffDate.TryGetValue((staffNumericId, d), out var attPen))
                            {
                                bool resolvedMissed = attPen.Resolved || approvedMissedSet.Contains((staffNumericId, d));
                                bool cutoffPassed = d < today || (d == today && nowTime > checkoutCutoff);
                                bool isMissedCheckout = attPen.InTime.HasValue && !attPen.OutTime.HasValue && !resolvedMissed && cutoffPassed;
                                if (isMissedCheckout)
                                {
                                    metric.MissedCheckoutCount++;
                                    weeklyUnresolvedMissedCount++;
                                }
                            }
                            continue;
                        }

                        if (attByStaffDate.TryGetValue((staffNumericId, d), out var att))
                        {
                            bool resolvedMissed = att.Resolved || approvedMissedSet.Contains((staffNumericId, d));
                            if (att.Status == 5)
                            {
                                continue;
                            }
                            if (att.Status == 6 || isApprovedLeave)
                            {
                                metric.LeaveCount++;
                                continue;
                            }
                            if (att.Status == 2)
                            {
                                if (approvedAbsentSet.Contains((staffNumericId, d)))
                                    metric.PresentCount++;
                                else
                                    metric.AbsentCount++;
                                continue;
                            }
                            if (att.Status == 4)
                            {
                                metric.HalfDayCount++;
                                continue;
                            }

                            // Present (1) or Late (3)
                            metric.PresentCount++;
                            bool isLate = ((policy.UseShiftTimingConfig && att.Status == 3) ||
                                           (att.InTime.HasValue && att.InTime.Value > effectiveLateCutoff))
                                          && !approvedLateSet.Contains((staffNumericId, d));
                            if (isLate) metric.LateCount++;

                            bool cutoffPassed = d < today || (d == today && nowTime > checkoutCutoff);
                            bool isMissedCheckout = att.InTime.HasValue && !att.OutTime.HasValue && !resolvedMissed && cutoffPassed;
                            if (isMissedCheckout)
                            {
                                metric.MissedCheckoutCount++;
                                weeklyUnresolvedMissedCount++;
                                if (policy.WeeklyMissedCheckoutRuleEnabled && weeklyUnresolvedMissedCount >= Math.Max(1, policy.WeeklyMissedCheckoutThreshold))
                                {
                                    pendingNextWorkingDayPenalty = true;
                                    weeklyUnresolvedMissedCount = 0;
                                }
                            }
                        }
                        else if (isApprovedLeave)
                        {
                            metric.LeaveCount++;
                        }
                        else if (policy.CountUnmarkedWorkingDaysAsAbsent && (d < today || (d == today && nowTime > workEnd)))
                        {
                            if (approvedAbsentSet.Contains((staffNumericId, d)))
                                metric.PresentCount++;
                            else
                                metric.AbsentCount++;
                        }
                    }
                }

                result[staffNumericId] = metric;
            }

            return result;
        }

        private static TimeSpan? ParseTimeNullable(object? val)
        {
            if (val == null || val == DBNull.Value) return null;
            if (val is TimeSpan ts) return ts;
            var s = val.ToString();
            if (string.IsNullOrWhiteSpace(s)) return null;
            if (TimeSpan.TryParse(s, out var parsed)) return parsed;
            if (DateTime.TryParse(s, out var dt)) return dt.TimeOfDay;
            return null;
        }

        private static TimeSpan ParseTime(object? val, TimeSpan fallback) => ParseTimeNullable(val) ?? fallback;

        private static string FormatTs(TimeSpan ts)
        {
            var dt = DateTime.Today.Add(ts);
            return dt.ToString("hh:mm tt", CultureInfo.InvariantCulture);
        }
    }
}
