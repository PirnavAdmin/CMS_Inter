using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
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
            return conn;
        }

        public async Task<LopPolicyDto> GetPolicyAsync(CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var result = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                    new CommandDefinition(
                        "sp_LopPolicy_Get",
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return result ?? throw new InvalidOperationException("LOP policy configuration is missing in database.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopPolicy_Get");
                throw;
            }
        }

        public async Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? updatedByUserId = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_IsEnabled", request.Enabled ? 1 : 0);
                parameters.Add("p_ShiftStart", request.ShiftStart ?? "09:00");
                parameters.Add("p_GraceMinutes", request.GraceMinutes);
                parameters.Add("p_AllowedLateLogins", request.AllowedLateLogins);
                parameters.Add("p_LateLoginsPerPenalty", request.LateLoginsPerPenalty);
                parameters.Add("p_PenaltyDays", request.PenaltyDays);
                parameters.Add("p_Basis", request.Basis ?? "calendar");
                parameters.Add("p_EffectiveFrom", request.EffectiveFrom ?? DateTime.UtcNow.ToString("yyyy-MM"));
                parameters.Add("p_UpdatedByUserId", updatedByUserId);
                parameters.Add("p_MissedCheckoutLopEnabled", request.MissedCheckoutLopEnabled ? 1 : 0);
                parameters.Add("p_AllowedMissedCheckouts", request.AllowedMissedCheckouts);
                parameters.Add("p_MissedCheckoutsPerPenalty", Math.Max(1, request.MissedCheckoutsPerPenalty));
                parameters.Add("p_MissedCheckoutPenaltyDays", request.MissedCheckoutPenaltyDays);

                var saved = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                    new CommandDefinition(
                        "sp_LopPolicy_Save",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return saved ?? throw new InvalidOperationException("Failed to retrieve saved LOP policy from database.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopPolicy_Save");
                throw;
            }
        }

        public async Task<IEnumerable<LopStaffRecordDto>> GetStaffRecordsAsync(string? month = null, string? searchTerm = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());
                parameters.Add("p_SearchTerm", string.IsNullOrWhiteSpace(searchTerm) ? null : searchTerm.Trim());

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

        public async Task<LopKpisDto> GetKpisAsync(string? month = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());

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
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", record.StaffId);
            parameters.Add("p_EmployeeId", record.EmployeeId);
            parameters.Add("p_StaffName", record.Name);
            parameters.Add("p_Department", record.Department);
            parameters.Add("p_Month", record.Month);
            parameters.Add("p_MonthlySalary", record.MonthlySalary);
            parameters.Add("p_LopDays", record.LopDays);
            parameters.Add("p_Basis", record.Basis);
            parameters.Add("p_PeriodDays", record.PeriodDays);
            parameters.Add("p_Deduction", record.Deduction);
            parameters.Add("p_SalaryAfterLop", record.SalaryAfterLop);
            parameters.Add("p_Reason", record.Reason);
            parameters.Add("p_CreatedByUserId", createdByUserId);

            return await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_LopStaffRecord_Save",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
        }

        public async Task<bool> UpdateStaffRecordAsync(int id, decimal days, string basis, int periodDays, decimal deduction, decimal salaryAfterLop, string reason, int? updatedByUserId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_LopDays", days);
            parameters.Add("p_Basis", basis);
            parameters.Add("p_PeriodDays", periodDays);
            parameters.Add("p_Deduction", deduction);
            parameters.Add("p_SalaryAfterLop", salaryAfterLop);
            parameters.Add("p_Reason", reason);
            parameters.Add("p_UpdatedByUserId", updatedByUserId);

            var rowsAffected = await conn.ExecuteAsync(
                new CommandDefinition(
                    "sp_LopStaffRecord_Update",
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

            var rowsAffected = await conn.ExecuteAsync(
                new CommandDefinition(
                    "sp_LopStaffRecord_Delete",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rowsAffected > 0;
        }

        public async Task<Dictionary<int, (int LateCount, int MissedCheckoutCount, int AbsentCount)>> GetMonthlyAttendanceCountsAsync(
            string targetMonth,
            string shiftStart,
            int graceMinutes,
            CancellationToken ct = default)
        {
            var result = new Dictionary<int, (int LateCount, int MissedCheckoutCount, int AbsentCount)>();
            if (!DateTime.TryParseExact($"{targetMonth}-01", "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var monthStart))
            {
                monthStart = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            }
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            var today = DateTime.Today;
            var nowTime = DateTime.Now.TimeOfDay;

            var thresholdTime = TimeSpan.TryParse(shiftStart, out var parsedStart)
                ? parsedStart.Add(TimeSpan.FromMinutes(Math.Clamp(graceMinutes, 0, 120)))
                : new TimeSpan(9, 10, 0);

            const string sql = @"
SELECT
    sa.FacultyId,
    DATE(sas.AttendanceDate) AS AttDate,
    sa.Status,
    sa.InTime,
    sa.OutTime,
    COALESCE(sa.IsMissedCheckoutResolved, 0) AS IsMissedCheckoutResolved,
    COALESCE(tc.WorkEndTime, IF(LOWER(COALESCE(st.StaffType, 'Teaching')) LIKE '%non%', '17:30:00', '15:20:00')) AS WorkEndTime,
    COALESCE(tc.GracePeriodMinutes, 15) AS GracePeriodMinutes
FROM `StaffAttendances` sa
INNER JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
INNER JOIN `Staff` st ON st.Id = sa.FacultyId AND st.IsDeleted = 0
LEFT JOIN `AttendanceTimingConfigs` tc ON tc.Id = (
    SELECT tc2.Id FROM `AttendanceTimingConfigs` tc2
    WHERE tc2.IsActive = 1
      AND (tc2.StaffType IS NULL OR tc2.StaffType = IF(LOWER(COALESCE(st.StaffType, 'Teaching')) LIKE '%non%', 2, 1))
      AND (tc2.DepartmentId IS NULL OR tc2.DepartmentId = st.DepartmentId)
    ORDER BY (tc2.DepartmentId IS NOT NULL) DESC, (tc2.StaffType IS NOT NULL) DESC, tc2.Id DESC
    LIMIT 1
)
WHERE sa.IsActive = 1
  AND sas.IsActive = 1
  AND DATE(sas.AttendanceDate) >= @MonthStart
  AND DATE(sas.AttendanceDate) <= @MonthEnd;

SELECT
    COALESCE(StaffId, FacultyId) AS StaffId,
    DATE(AttendanceDate) AS AttDate,
    COALESCE(RequestType, 'Late Attendance') AS RequestType,
    Status
FROM `StaffAttendanceRegularizations`
WHERE DATE(AttendanceDate) >= @MonthStart
  AND DATE(AttendanceDate) <= @MonthEnd
  AND LOWER(Status) = 'approved';";

            var conn = await GetOpenConnectionAsync(ct);
            using var multi = await conn.QueryMultipleAsync(
                new CommandDefinition(
                    sql,
                    new { MonthStart = monthStart.Date, MonthEnd = monthEnd.Date },
                    cancellationToken: ct));

            var rows = (await multi.ReadAsync<dynamic>()).ToList();
            var approvedRegs = (await multi.ReadAsync<dynamic>()).ToList();

            var approvedLateSet = new HashSet<(int, DateTime)>();
            var approvedMissedSet = new HashSet<(int, DateTime)>();
            foreach (var r in approvedRegs)
            {
                int sId = Convert.ToInt32(r.StaffId ?? 0);
                if (sId <= 0) continue;
                DateTime dt = Convert.ToDateTime(r.AttDate).Date;
                string reqType = ((string?)r.RequestType ?? "").ToLowerInvariant();
                if (reqType.Contains("missed")) approvedMissedSet.Add((sId, dt));
                else approvedLateSet.Add((sId, dt));
            }

            foreach (var row in rows)
            {
                int facultyId = Convert.ToInt32(row.FacultyId);
                DateTime attDate = Convert.ToDateTime(row.AttDate).Date;
                byte status = Convert.ToByte(row.Status);
                TimeSpan? inTime = row.InTime == null ? null : (row.InTime is TimeSpan it ? it : TimeSpan.TryParse(row.InTime.ToString(), out TimeSpan itp) ? itp : (TimeSpan?)null);
                TimeSpan? outTime = row.OutTime == null ? null : (row.OutTime is TimeSpan ot ? ot : TimeSpan.TryParse(row.OutTime.ToString(), out TimeSpan otp) ? otp : (TimeSpan?)null);
                bool resolvedFlag = Convert.ToInt32(row.IsMissedCheckoutResolved ?? 0) == 1 || approvedMissedSet.Contains((facultyId, attDate));

                TimeSpan workEnd = row.WorkEndTime is TimeSpan we ? we : (TimeSpan.TryParse(row.WorkEndTime?.ToString(), out TimeSpan wep) ? wep : new TimeSpan(15, 20, 0));
                int checkoutGrace = Convert.ToInt32(row.GracePeriodMinutes ?? 15);
                var checkoutCutoff = workEnd.Add(TimeSpan.FromMinutes(checkoutGrace));

                if (!result.TryGetValue(facultyId, out var counts))
                {
                    counts = (0, 0, 0);
                }

                if (status == 2)
                {
                    counts.AbsentCount++;
                }
                else
                {
                    bool isLate = (status == 3 || (inTime.HasValue && inTime.Value > thresholdTime)) && !approvedLateSet.Contains((facultyId, attDate));
                    if (isLate) counts.LateCount++;

                    bool cutoffPassed = attDate < today || (attDate == today && nowTime > checkoutCutoff);
                    bool isMissedCheckout = inTime.HasValue && !outTime.HasValue && !resolvedFlag && cutoffPassed && status != 2 && status != 5 && status != 6;
                    if (isMissedCheckout) counts.MissedCheckoutCount++;
                }

                result[facultyId] = counts;
            }

            return result;
        }

        public async Task<IEnumerable<LopStaffDropdownDto>> GetStaffListForLopAsync(CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var list = await conn.QueryAsync<LopStaffDropdownDto>(
                    new CommandDefinition(
                        "sp_LopStaffList_Get",
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
    }
}
