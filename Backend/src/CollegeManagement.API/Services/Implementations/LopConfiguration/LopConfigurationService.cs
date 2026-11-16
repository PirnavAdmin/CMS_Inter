using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;
using CollegeManagement.API.Repositories.Interfaces.LopConfiguration;
using CollegeManagement.API.Services.Interfaces.LopConfiguration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations.LopConfiguration
{
    public class LopConfigurationService : ILopConfigurationService
    {
        private readonly ILopConfigurationRepository _repository;
        private readonly ILogger<LopConfigurationService> _logger;

        public LopConfigurationService(ILopConfigurationRepository repository, ILogger<LopConfigurationService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<LopPolicyDto> GetPolicyAsync(int? campusId = null, string? staffType = null, CancellationToken ct = default)
        {
            return await _repository.GetPolicyAsync(campusId, staffType, ct);
        }

        public async Task<IEnumerable<LopPolicyDto>> GetAllPoliciesAsync(CancellationToken ct = default)
        {
            return await _repository.GetAllPoliciesAsync(ct);
        }

        public async Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? userId = null, CancellationToken ct = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            if (!request.UseShiftTimingConfig && string.IsNullOrWhiteSpace(request.ShiftStart))
                throw new ArgumentException("Shift start time is required when using custom shift timings.");

            if (request.GraceMinutes < 0 || request.GraceMinutes > 120)
                throw new ArgumentException("Grace period must be between 0 and 120 minutes.");

            if (request.AllowedLateLogins < 0 || request.AllowedLateLogins > 31)
                throw new ArgumentException("Allowed late logins must be between 0 and 31.");

            if (request.LateLoginsPerPenalty < 1 || request.LateLoginsPerPenalty > 31)
                throw new ArgumentException("Late logins per deduction must be between 1 and 31.");

            if (request.PenaltyDays <= 0 || request.PenaltyDays > 2m)
                request.PenaltyDays = 0.5m;

            if (request.AllowedMissedCheckouts < 0 || request.AllowedMissedCheckouts > 31)
                throw new ArgumentException("Allowed missed checkouts must be between 0 and 31.");

            if (request.MissedCheckoutsPerPenalty < 1 || request.MissedCheckoutsPerPenalty > 31)
                throw new ArgumentException("Missed checkouts per deduction must be between 1 and 31.");

            if (request.MissedCheckoutPenaltyDays <= 0 || request.MissedCheckoutPenaltyDays > 2m)
                request.MissedCheckoutPenaltyDays = 0.5m;

            if (request.WeeklyMissedCheckoutThreshold < 1 || request.WeeklyMissedCheckoutThreshold > 7)
                request.WeeklyMissedCheckoutThreshold = 2;

            if (request.WeeklyMissedCheckoutPenaltyDays <= 0 || request.WeeklyMissedCheckoutPenaltyDays > 2m)
                request.WeeklyMissedCheckoutPenaltyDays = 1.0m;

            if (request.AbsentPenaltyDays <= 0 || request.AbsentPenaltyDays > 2m)
                request.AbsentPenaltyDays = 1.0m;

            if (request.HalfDayPenaltyDays <= 0 || request.HalfDayPenaltyDays > 1m)
                request.HalfDayPenaltyDays = 0.5m;

            if (request.MaxLopDaysPerMonth.HasValue && (request.MaxLopDaysPerMonth.Value <= 0 || request.MaxLopDaysPerMonth.Value > 31))
                throw new ArgumentException("Monthly LOP cap must be between 0.5 and 31 days.");

            if (string.IsNullOrWhiteSpace(request.EffectiveFrom))
                request.EffectiveFrom = DateTime.UtcNow.ToString("yyyy-MM");

            if (string.IsNullOrWhiteSpace(request.ShiftStart))
                request.ShiftStart = "09:00";

            request.StaffType = NormalizeStaffType(request.StaffType);
            request.Basis = NormalizeBasis(request.Basis);
            request.DeductionComponent = string.Equals(request.DeductionComponent, "Basic", StringComparison.OrdinalIgnoreCase) ? "Basic" : "Gross";
            request.RoundingMode = NormalizeRoundingMode(request.RoundingMode);

            return await _repository.SavePolicyAsync(request, userId, ct);
        }

        public async Task<bool> DeletePolicyOverrideAsync(int policyId, CancellationToken ct = default)
        {
            return await _repository.DeletePolicyOverrideAsync(policyId, ct);
        }

        public async Task<LopRecordsResponseDto> GetRecordsWithKpisAsync(string? month = null, string? searchTerm = null, int? campusId = null, string? source = null, CancellationToken ct = default)
        {
            var records = (await _repository.GetStaffRecordsAsync(month, searchTerm, campusId, source, ct)).ToList();
            var kpis = await _repository.GetKpisAsync(month, campusId, ct);

            if (records.Count > 0 && kpis.StaffWithLop == 0)
            {
                var active = records.Where(r => !string.Equals(r.Status, "Waived", StringComparison.OrdinalIgnoreCase)).ToList();
                kpis.StaffWithLop = active.Select(r => r.StaffId).Distinct().Count();
                kpis.TotalLopDays = active.Sum(r => r.LopDays);
                kpis.TotalDeduction = active.Sum(r => r.Deduction);
            }

            return new LopRecordsResponseDto
            {
                Kpis = kpis,
                Records = records
            };
        }

        public async Task<LopStaffRecordDto?> GetRecordByIdAsync(int id, CancellationToken ct = default)
        {
            return await _repository.GetStaffRecordByIdAsync(id, ct);
        }

        public async Task<LopKpisDto> GetKpisAsync(string? month = null, int? campusId = null, CancellationToken ct = default)
        {
            return await _repository.GetKpisAsync(month, campusId, ct);
        }

        public async Task<LopStaffRecordDto> CreateRecordAsync(SaveLopStaffRecordRequest request, int? userId = null, CancellationToken ct = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (string.IsNullOrWhiteSpace(request.StaffId)) throw new ArgumentException("Staff member is required.");
            if (string.IsNullOrWhiteSpace(request.Month)) throw new ArgumentException("Payroll month is required.");
            if (request.Days <= 0) throw new ArgumentException("LOP days must be greater than 0.");
            if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("Reason is required.");

            var staffList = await _repository.GetStaffListForLopAsync(null, ct);
            var staff = staffList.FirstOrDefault(s => s.StaffId == request.StaffId || s.Id == request.StaffId)
                ?? throw new ArgumentException("Selected staff member was not found.");

            var basis = NormalizeBasis(request.Basis);
            var component = string.Equals(request.DeductionComponent, "Basic", StringComparison.OrdinalIgnoreCase) ? "Basic" : "Gross";
            var calc = CalculateLop(new LopCalculateRequest
            {
                Salary = staff.Salary,
                BasicPay = staff.BasicPay,
                DeductionComponent = component,
                Month = request.Month,
                Days = request.Days,
                Basis = basis
            });

            var record = new LopStaffRecordDto
            {
                StaffId = staff.StaffId,
                EmployeeId = staff.EmployeeId,
                Name = staff.Name,
                Department = staff.Department,
                CampusId = staff.CampusId,
                CampusName = staff.CampusName,
                Month = request.Month,
                MonthlySalary = calc.BaseSalary,
                LopDays = calc.LopDays,
                Basis = basis,
                DeductionComponent = component,
                PeriodDays = calc.PeriodDays,
                Deduction = calc.Deduction,
                SalaryAfterLop = calc.SalaryAfterLop,
                Reason = request.Reason.Trim(),
                Source = string.IsNullOrWhiteSpace(request.Source) ? "Manual" : request.Source.Trim(),
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            var newId = await _repository.SaveStaffRecordAsync(record, userId, ct);
            record.Id = newId;

            return record;
        }

        public async Task<bool> UpdateRecordAsync(int id, UpdateLopStaffRecordRequest request, int? userId = null, CancellationToken ct = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            var existing = await _repository.GetStaffRecordByIdAsync(id, ct);
            if (existing == null) throw new KeyNotFoundException($"Staff LOP record with ID {id} not found.");

            var basis = NormalizeBasis(request.Basis);
            var component = string.Equals(request.DeductionComponent, "Basic", StringComparison.OrdinalIgnoreCase) ? "Basic" : "Gross";
            var calc = CalculateLop(new LopCalculateRequest
            {
                Salary = existing.MonthlySalary,
                BasicPay = existing.MonthlySalary,
                DeductionComponent = component,
                Month = existing.Month,
                Days = request.Days,
                Basis = basis
            });

            return await _repository.UpdateStaffRecordAsync(
                id,
                calc.LopDays,
                basis,
                component,
                calc.PeriodDays,
                calc.Deduction,
                calc.SalaryAfterLop,
                request.Reason?.Trim() ?? existing.Reason,
                request.Status,
                userId,
                ct);
        }

        public async Task<bool> UpdateRecordStatusAsync(int id, UpdateLopRecordStatusRequest request, int? userId = null, CancellationToken ct = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            var normalized = string.Equals(request.Status, "Waived", StringComparison.OrdinalIgnoreCase) ? "Waived"
                : string.Equals(request.Status, "Applied", StringComparison.OrdinalIgnoreCase) ? "Applied"
                : "Active";

            return await _repository.UpdateStaffRecordStatusAsync(id, normalized, request.Reason, userId, ct);
        }

        public async Task<bool> DeleteRecordAsync(int id, int? userId = null, CancellationToken ct = default)
        {
            return await _repository.DeleteStaffRecordAsync(id, userId, ct);
        }

        public async Task<IEnumerable<LopStaffDropdownDto>> GetStaffListAsync(int? campusId = null, CancellationToken ct = default)
        {
            return await _repository.GetStaffListForLopAsync(campusId, ct);
        }

        // Backward-compatible signature used by StaffAttendanceRepository.GetMyAttendanceHistoryAsync
        public static (decimal LatePenaltyDays, decimal MissedCheckoutPenaltyDays, decimal TotalLopDays) CalculateAttendanceLop(
            LopPolicyDto policy,
            int lateDays,
            int unresolvedMissedCheckouts,
            int absentDays,
            string targetMonth,
            int maxPeriodDays)
        {
            var full = CalculateFullAttendanceLop(policy, lateDays, unresolvedMissedCheckouts, absentDays, 0, targetMonth, maxPeriodDays);
            return (full.LatePenaltyDays, full.MissedCheckoutPenaltyDays, full.TotalLopDays);
        }

        public static (decimal LatePenaltyDays, decimal MissedCheckoutPenaltyDays, decimal AbsentLopDays, decimal HalfDayLopDays, decimal TotalLopDays) CalculateFullAttendanceLop(
            LopPolicyDto policy,
            int lateDays,
            int unresolvedMissedCheckouts,
            int absentDays,
            int halfDays,
            string targetMonth,
            int maxPeriodDays)
        {
            var isEffective = policy.Enabled &&
                (string.IsNullOrWhiteSpace(policy.EffectiveFrom) ||
                 string.Compare(targetMonth, policy.EffectiveFrom, StringComparison.OrdinalIgnoreCase) >= 0);

            if (!isEffective)
            {
                return (0m, 0m, 0m, 0m, 0m);
            }

            decimal latePenalty = 0m;
            if (policy.LateLoginsPerPenalty > 0)
            {
                int penalizableLate = Math.Max(0, lateDays - policy.AllowedLateLogins);
                latePenalty = (penalizableLate / policy.LateLoginsPerPenalty) * policy.PenaltyDays;
            }

            decimal missedPenalty = 0m;
            if (policy.MissedCheckoutLopEnabled && policy.MissedCheckoutsPerPenalty > 0)
            {
                int penalizableMissed = Math.Max(0, unresolvedMissedCheckouts - policy.AllowedMissedCheckouts);
                missedPenalty = (penalizableMissed / policy.MissedCheckoutsPerPenalty) * policy.MissedCheckoutPenaltyDays;
            }

            decimal absentLop = policy.AbsentLopEnabled ? Math.Max(0, absentDays) * policy.AbsentPenaltyDays : 0m;
            decimal halfDayLop = policy.HalfDayLopEnabled ? Math.Max(0, halfDays) * policy.HalfDayPenaltyDays : 0m;

            decimal rawTotal = absentLop + halfDayLop + latePenalty + missedPenalty;
            if (policy.MaxLopDaysPerMonth.HasValue && policy.MaxLopDaysPerMonth.Value > 0)
            {
                rawTotal = Math.Min(rawTotal, policy.MaxLopDaysPerMonth.Value);
            }

            decimal rounded = ApplyRounding(rawTotal, policy.RoundingMode);
            decimal total = Math.Min(Math.Max(0, maxPeriodDays), rounded);
            return (latePenalty, missedPenalty, absentLop, halfDayLop, total);
        }

        public async Task<LopPreviewResponseDto> GetPreviewAsync(
            string? month = null,
            string? searchTerm = null,
            int? campusId = null,
            string? staffType = null,
            int? departmentId = null,
            bool impactedOnly = false,
            CancellationToken ct = default)
        {
            var targetMonth = string.IsNullOrWhiteSpace(month) ? DateTime.UtcNow.ToString("yyyy-MM") : month.Trim();
            var policy = await _repository.GetPolicyAsync(campusId, staffType, ct);
            var staffList = (await _repository.GetStaffListForLopAsync(campusId, ct)).ToList();

            if (!string.IsNullOrWhiteSpace(staffType) && !string.Equals(staffType, "All", StringComparison.OrdinalIgnoreCase))
            {
                staffList = staffList
                    .Where(s => string.Equals(s.StaffType, staffType, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            if (departmentId.HasValue && departmentId.Value > 0)
            {
                staffList = staffList.Where(s => s.DepartmentId == departmentId.Value).ToList();
            }

            var metricsMap = await _repository.GetMonthlyAttendanceMetricsAsync(targetMonth, policy, staffList, ct);
            var savedRecords = (await _repository.GetStaffRecordsAsync(targetMonth, null, campusId, null, ct)).ToList();
            var recordsByStaff = savedRecords
                .GroupBy(r => r.StaffId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var periodDays = GetPeriodDays(targetMonth, policy.Basis);
            var items = new List<LopDeductionPreviewDto>();

            foreach (var staff in staffList)
            {
                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    var term = searchTerm.Trim();
                    if (!staff.Name.Contains(term, StringComparison.OrdinalIgnoreCase) &&
                        !staff.EmployeeId.Contains(term, StringComparison.OrdinalIgnoreCase) &&
                        !staff.Department.Contains(term, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                }

                int.TryParse(staff.StaffId, out int staffNumericId);
                metricsMap.TryGetValue(staffNumericId, out var m);
                m ??= new StaffMonthlyAttendanceMetric { StaffId = staffNumericId, ShiftInfo = "Standard Shift" };

                var (latePen, missedPen, absentLop, halfDayLop, policyLopDays) = CalculateFullAttendanceLop(
                    policy,
                    m.LateCount,
                    m.MissedCheckoutCount,
                    m.AbsentCount,
                    m.HalfDayCount,
                    targetMonth,
                    periodDays);

                recordsByStaff.TryGetValue(staff.StaffId, out var staffRecs);
                staffRecs ??= new List<LopStaffRecordDto>();

                bool hasWaivedAuto = staffRecs.Any(r =>
                    string.Equals(r.Source, "AutoAttendance", StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(r.Status, "Waived", StringComparison.OrdinalIgnoreCase));

                var overrideRec = staffRecs.FirstOrDefault(r =>
                    string.Equals(r.Source, "Override", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(r.Status, "Waived", StringComparison.OrdinalIgnoreCase));

                decimal manualAdded = staffRecs
                    .Where(r => string.Equals(r.Source, "Manual", StringComparison.OrdinalIgnoreCase) &&
                                !string.Equals(r.Status, "Waived", StringComparison.OrdinalIgnoreCase))
                    .Sum(r => r.LopDays);

                decimal effectivePolicyDays = hasWaivedAuto ? 0m : policyLopDays;
                decimal finalLopDays = overrideRec != null
                    ? Math.Min(periodDays, overrideRec.LopDays)
                    : Math.Min(periodDays, effectivePolicyDays + manualAdded);

                decimal baseSalary = string.Equals(policy.DeductionComponent, "Basic", StringComparison.OrdinalIgnoreCase)
                    ? staff.BasicPay
                    : staff.Salary;

                decimal perDayRate = periodDays > 0 && baseSalary > 0 ? Math.Round(baseSalary / periodDays, 2) : 0m;
                decimal deduction = baseSalary > 0 ? Math.Round((baseSalary * finalLopDays) / periodDays, 2) : 0m;
                decimal salaryAfterLop = staff.Salary > 0 ? Math.Max(0m, Math.Round(staff.Salary - deduction, 2)) : 0m;

                if (impactedOnly && finalLopDays <= 0 && manualAdded <= 0)
                {
                    continue;
                }

                items.Add(new LopDeductionPreviewDto
                {
                    StaffId = staff.StaffId,
                    EmployeeId = staff.EmployeeId,
                    Name = staff.Name,
                    Department = staff.Department,
                    StaffType = staff.StaffType,
                    CampusId = staff.CampusId,
                    CampusName = staff.CampusName,
                    SalaryStructureName = staff.SalaryStructureName,
                    HasSalaryStructure = staff.HasSalaryStructure,
                    ShiftInfo = m.ShiftInfo,
                    PresentCount = m.PresentCount,
                    LeaveCount = m.LeaveCount,
                    LateCount = m.LateCount,
                    MissedCheckoutCount = m.MissedCheckoutCount,
                    AbsentCount = m.AbsentCount,
                    HalfDayCount = m.HalfDayCount,
                    LatePenaltyDays = latePen,
                    MissedCheckoutPenaltyDays = missedPen,
                    AbsentLopDays = absentLop,
                    HalfDayLopDays = halfDayLop,
                    WeeklyMissedCheckoutTriggerCount = m.WeeklyMissedCheckoutTriggerCount,
                    WeeklyMissedCheckoutPenaltyDays = m.WeeklyMissedCheckoutPenaltyDays,
                    PolicyLopDays = effectivePolicyDays,
                    ManualLopDays = overrideRec != null ? overrideRec.LopDays : manualAdded,
                    IsOverridden = overrideRec != null,
                    IsWaived = hasWaivedAuto,
                    LopDays = finalLopDays,
                    DeductionComponent = policy.DeductionComponent,
                    Basis = policy.Basis,
                    PeriodDays = periodDays,
                    PerDayRate = perDayRate,
                    Deduction = deduction,
                    SalaryAfterLop = salaryAfterLop,
                    BasicPay = staff.BasicPay,
                    MonthlySalary = staff.Salary,
                    BaseSalary = baseSalary
                });
            }

            var summary = new LopPreviewSummaryDto
            {
                Month = targetMonth,
                TotalStaff = items.Count,
                StaffWithSalary = items.Count(i => i.HasSalaryStructure),
                StaffWithoutSalary = items.Count(i => !i.HasSalaryStructure),
                ImpactedStaffCount = items.Count(i => i.LopDays > 0),
                TotalPolicyLopDays = items.Sum(i => i.PolicyLopDays),
                TotalManualLopDays = items.Sum(i => i.ManualLopDays),
                TotalLopDays = items.Sum(i => i.LopDays),
                TotalDeduction = items.Sum(i => i.Deduction)
            };

            return new LopPreviewResponseDto
            {
                Policy = policy,
                Summary = summary,
                Items = items
            };
        }

        public async Task<LopSyncRecordsResponseDto> SyncMonthlyRecordsAsync(LopSyncRecordsRequest request, int? userId = null, CancellationToken ct = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            var targetMonth = string.IsNullOrWhiteSpace(request.Month) ? DateTime.UtcNow.ToString("yyyy-MM") : request.Month.Trim();
            var preview = await GetPreviewAsync(targetMonth, null, request.CampusId, null, null, false, ct);

            int syncedCount = 0;
            decimal totalDays = 0m;
            decimal totalDeduction = 0m;

            foreach (var item in preview.Items)
            {
                if (item.PolicyLopDays <= 0 || item.IsWaived || item.IsOverridden)
                    continue;

                var reasonParts = new List<string>();
                if (item.AbsentLopDays > 0) reasonParts.Add($"{item.AbsentCount} absent ({item.AbsentLopDays:0.#}d)");
                if (item.HalfDayLopDays > 0) reasonParts.Add($"{item.HalfDayCount} half-day ({item.HalfDayLopDays:0.#}d)");
                if (item.LatePenaltyDays > 0) reasonParts.Add($"{item.LateCount} late ({item.LatePenaltyDays:0.#}d)");
                if (item.MissedCheckoutPenaltyDays > 0) reasonParts.Add($"{item.MissedCheckoutCount} missed checkout ({item.MissedCheckoutPenaltyDays:0.#}d)");

                var policyDeduction = item.BaseSalary > 0 && item.PeriodDays > 0
                    ? Math.Round((item.BaseSalary * item.PolicyLopDays) / item.PeriodDays, 2)
                    : 0m;

                var record = new LopStaffRecordDto
                {
                    StaffId = item.StaffId,
                    EmployeeId = item.EmployeeId,
                    Name = item.Name,
                    Department = item.Department,
                    CampusId = item.CampusId,
                    Month = targetMonth,
                    MonthlySalary = item.BaseSalary,
                    LopDays = item.PolicyLopDays,
                    Basis = item.Basis,
                    DeductionComponent = item.DeductionComponent,
                    PeriodDays = item.PeriodDays,
                    Deduction = policyDeduction,
                    SalaryAfterLop = item.MonthlySalary > 0 ? Math.Max(0m, Math.Round(item.MonthlySalary - policyDeduction, 2)) : 0m,
                    Reason = $"Auto Attendance Policy: {string.Join(", ", reasonParts)}",
                    Source = "AutoAttendance",
                    LatePenaltyDays = item.LatePenaltyDays,
                    MissedCheckoutPenaltyDays = item.MissedCheckoutPenaltyDays,
                    AbsentDays = item.AbsentLopDays,
                    HalfDays = item.HalfDayCount,
                    Status = "Active"
                };

                await _repository.SaveStaffRecordAsync(record, userId, ct);
                syncedCount++;
                totalDays += item.PolicyLopDays;
                totalDeduction += policyDeduction;
            }

            return new LopSyncRecordsResponseDto
            {
                Month = targetMonth,
                SyncedCount = syncedCount,
                TotalLopDays = totalDays,
                TotalDeduction = totalDeduction
            };
        }

        public async Task<(decimal LopDays, decimal LopDeduction)> CalculateStaffMonthlyLopForPayrollAsync(int staffId, int year, int month, CancellationToken ct = default)
        {
            var targetMonth = $"{year:D4}-{month:D2}";
            var allStaff = (await _repository.GetStaffListForLopAsync(null, ct)).ToList();
            var staff = allStaff.FirstOrDefault(s => int.TryParse(s.StaffId, out int id) && id == staffId);
            if (staff == null) return (0m, 0m);

            var policy = await _repository.GetPolicyAsync(staff.CampusId, staff.StaffType, ct);
            var metricsMap = await _repository.GetMonthlyAttendanceMetricsAsync(targetMonth, policy, new[] { staff }, ct);
            metricsMap.TryGetValue(staffId, out var m);

            var periodDays = GetPeriodDays(targetMonth, policy.Basis);
            decimal policyLopDays = 0m;

            if (policy.Enabled && policy.AutoApplyToPayroll && m != null)
            {
                var (_, _, _, _, calculated) = CalculateFullAttendanceLop(
                    policy,
                    m.LateCount,
                    m.MissedCheckoutCount,
                    m.AbsentCount,
                    m.HalfDayCount,
                    targetMonth,
                    periodDays);
                policyLopDays = calculated;
            }

            var savedRecords = (await _repository.GetStaffRecordsAsync(targetMonth, null, null, null, ct))
                .Where(r => r.StaffId == staff.StaffId)
                .ToList();

            bool hasWaivedAuto = savedRecords.Any(r =>
                string.Equals(r.Source, "AutoAttendance", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(r.Status, "Waived", StringComparison.OrdinalIgnoreCase));

            var overrideRec = savedRecords.FirstOrDefault(r =>
                string.Equals(r.Source, "Override", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(r.Status, "Waived", StringComparison.OrdinalIgnoreCase));

            decimal manualAdded = savedRecords
                .Where(r => string.Equals(r.Source, "Manual", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(r.Status, "Waived", StringComparison.OrdinalIgnoreCase))
                .Sum(r => r.LopDays);

            decimal totalLopDays = overrideRec != null
                ? Math.Min(periodDays, overrideRec.LopDays)
                : Math.Min(periodDays, (hasWaivedAuto ? 0m : policyLopDays) + manualAdded);

            decimal baseSalary = string.Equals(policy.DeductionComponent, "Basic", StringComparison.OrdinalIgnoreCase)
                ? staff.BasicPay
                : staff.Salary;

            if (totalLopDays <= 0 || baseSalary <= 0 || periodDays <= 0)
            {
                return (totalLopDays, 0m);
            }

            decimal deduction = Math.Round((baseSalary * totalLopDays) / periodDays, 2);
            return (Math.Round(totalLopDays, 2), deduction);
        }

        public LopCalculateResponseDto CalculateLop(LopCalculateRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var periodDays = GetPeriodDays(request.Month, request.Basis);
            var lopDays = Math.Min(periodDays, Math.Max(0, ApplyRounding(request.Days, request.RoundingMode)));
            var baseSalary = string.Equals(request.DeductionComponent, "Basic", StringComparison.OrdinalIgnoreCase) && request.BasicPay > 0
                ? request.BasicPay
                : Math.Max(0, request.Salary);
            var grossSalary = Math.Max(0, request.Salary > 0 ? request.Salary : baseSalary);

            var perDayRate = periodDays > 0 ? Math.Round(baseSalary / periodDays, 2) : 0m;
            var deduction = periodDays > 0 ? Math.Round((baseSalary * lopDays) / periodDays, 2) : 0m;
            var salaryAfterLop = Math.Max(0m, Math.Round(grossSalary - deduction, 2));

            return new LopCalculateResponseDto
            {
                PeriodDays = periodDays,
                BaseSalary = baseSalary,
                PerDayRate = perDayRate,
                LopDays = lopDays,
                MonthlySalary = grossSalary,
                Deduction = deduction,
                SalaryAfterLop = salaryAfterLop
            };
        }

        private static int GetPeriodDays(string month, string? basis)
        {
            if (string.Equals(basis, "fixed30", StringComparison.OrdinalIgnoreCase))
                return 30;
            if (string.Equals(basis, "working26", StringComparison.OrdinalIgnoreCase))
                return 26;

            if (DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                return DateTime.DaysInMonth(date.Year, date.Month);
            }

            return 30;
        }

        private static decimal ApplyRounding(decimal value, string? mode)
        {
            if (value <= 0) return 0m;
            if (string.Equals(mode, "HalfDay", StringComparison.OrdinalIgnoreCase))
                return Math.Ceiling(value * 2m) / 2m;
            if (string.Equals(mode, "WholeDay", StringComparison.OrdinalIgnoreCase))
                return Math.Ceiling(value);
            return Math.Round(value, 1, MidpointRounding.AwayFromZero);
        }

        private static string NormalizeStaffType(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "All";
            var t = raw.Trim();
            if (t.Contains("non", StringComparison.OrdinalIgnoreCase)) return "Non-Teaching";
            if (t.Contains("teach", StringComparison.OrdinalIgnoreCase)) return "Teaching";
            return "All";
        }

        private static string NormalizeBasis(string? raw)
        {
            if (string.Equals(raw, "fixed30", StringComparison.OrdinalIgnoreCase)) return "fixed30";
            if (string.Equals(raw, "working26", StringComparison.OrdinalIgnoreCase)) return "working26";
            return "calendar";
        }

        private static string NormalizeRoundingMode(string? raw)
        {
            if (string.Equals(raw, "HalfDay", StringComparison.OrdinalIgnoreCase)) return "HalfDay";
            if (string.Equals(raw, "WholeDay", StringComparison.OrdinalIgnoreCase)) return "WholeDay";
            return "Exact";
        }
    }
}
