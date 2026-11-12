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

        public async Task<LopPolicyDto> GetPolicyAsync(CancellationToken ct = default)
        {
            return await _repository.GetPolicyAsync(ct);
        }

        public async Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? userId = null, CancellationToken ct = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.ShiftStart))
                throw new ArgumentException("Shift start time is required.");

            if (request.GraceMinutes < 0 || request.GraceMinutes > 120)
                throw new ArgumentException("Grace period must be between 0 and 120 minutes.");

            if (request.AllowedLateLogins < 0 || request.AllowedLateLogins > 31)
                throw new ArgumentException("Allowed late logins must be between 0 and 31.");

            if (request.LateLoginsPerPenalty < 1 || request.LateLoginsPerPenalty > 31)
                throw new ArgumentException("Late logins per deduction must be between 1 and 31.");

            if (request.PenaltyDays != 0.5m && request.PenaltyDays != 1.0m)
                request.PenaltyDays = 0.5m;

            if (request.AllowedMissedCheckouts < 0 || request.AllowedMissedCheckouts > 31)
                throw new ArgumentException("Allowed missed checkouts must be between 0 and 31.");

            if (request.MissedCheckoutsPerPenalty < 1 || request.MissedCheckoutsPerPenalty > 31)
                throw new ArgumentException("Missed checkouts per deduction must be between 1 and 31.");

            if (request.MissedCheckoutPenaltyDays != 0.5m && request.MissedCheckoutPenaltyDays != 1.0m)
                request.MissedCheckoutPenaltyDays = 0.5m;

            if (string.IsNullOrWhiteSpace(request.EffectiveFrom))
                request.EffectiveFrom = DateTime.UtcNow.ToString("yyyy-MM");

            return await _repository.SavePolicyAsync(request, userId, ct);
        }

        public async Task<LopRecordsResponseDto> GetRecordsWithKpisAsync(string? month = null, string? searchTerm = null, CancellationToken ct = default)
        {
            var records = (await _repository.GetStaffRecordsAsync(month, searchTerm, ct)).ToList();
            var kpis = await _repository.GetKpisAsync(month, ct);

            if (records.Count > 0 && kpis.StaffWithLop == 0)
            {
                kpis.StaffWithLop = records.Select(r => r.StaffId).Distinct().Count();
                kpis.TotalLopDays = records.Sum(r => r.LopDays);
                kpis.TotalDeduction = records.Sum(r => r.Deduction);
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

        public async Task<LopKpisDto> GetKpisAsync(string? month = null, CancellationToken ct = default)
        {
            return await _repository.GetKpisAsync(month, ct);
        }

        public async Task<LopStaffRecordDto> CreateRecordAsync(SaveLopStaffRecordRequest request, int? userId = null, CancellationToken ct = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (string.IsNullOrWhiteSpace(request.StaffId)) throw new ArgumentException("Staff member is required.");
            if (string.IsNullOrWhiteSpace(request.Month)) throw new ArgumentException("Payroll month is required.");
            if (request.Days <= 0) throw new ArgumentException("LOP days must be greater than 0.");
            if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("Reason is required.");

            var staffList = await _repository.GetStaffListForLopAsync(ct);
            var staff = staffList.FirstOrDefault(s => s.StaffId == request.StaffId || s.Id == request.StaffId)
                ?? throw new ArgumentException("Selected staff member was not found.");

            var staffName = staff.Name;
            var employeeId = staff.EmployeeId;
            var department = staff.Department;
            var salary = staff.Salary;

            var calc = CalculateLop(new LopCalculateRequest
            {
                Salary = salary,
                Month = request.Month,
                Days = request.Days,
                Basis = request.Basis
            });

            var record = new LopStaffRecordDto
            {
                StaffId = request.StaffId,
                EmployeeId = employeeId,
                Name = staffName,
                Department = department,
                Month = request.Month,
                MonthlySalary = salary,
                LopDays = calc.LopDays,
                Basis = request.Basis ?? "calendar",
                PeriodDays = calc.PeriodDays,
                Deduction = calc.Deduction,
                SalaryAfterLop = calc.SalaryAfterLop,
                Reason = request.Reason.Trim(),
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

            var calc = CalculateLop(new LopCalculateRequest
            {
                Salary = existing.MonthlySalary,
                Month = existing.Month,
                Days = request.Days,
                Basis = request.Basis
            });

            return await _repository.UpdateStaffRecordAsync(
                id,
                calc.LopDays,
                request.Basis ?? "calendar",
                calc.PeriodDays,
                calc.Deduction,
                calc.SalaryAfterLop,
                request.Reason?.Trim() ?? existing.Reason,
                userId,
                ct);
        }

        public async Task<bool> DeleteRecordAsync(int id, int? userId = null, CancellationToken ct = default)
        {
            return await _repository.DeleteStaffRecordAsync(id, userId, ct);
        }

        public async Task<IEnumerable<LopStaffDropdownDto>> GetStaffListAsync(CancellationToken ct = default)
        {
            return await _repository.GetStaffListForLopAsync(ct);
        }

        public static (decimal LatePenaltyDays, decimal MissedCheckoutPenaltyDays, decimal TotalLopDays) CalculateAttendanceLop(
            LopPolicyDto policy,
            int lateDays,
            int unresolvedMissedCheckouts,
            int absentDays,
            string targetMonth,
            int maxPeriodDays)
        {
            var isEffective = policy.Enabled &&
                (string.IsNullOrWhiteSpace(policy.EffectiveFrom) ||
                 string.Compare(targetMonth, policy.EffectiveFrom, StringComparison.OrdinalIgnoreCase) >= 0);

            decimal latePenalty = 0m;
            decimal missedPenalty = 0m;

            if (isEffective)
            {
                if (policy.LateLoginsPerPenalty > 0)
                {
                    int penalizableLate = Math.Max(0, lateDays - policy.AllowedLateLogins);
                    latePenalty = (penalizableLate / policy.LateLoginsPerPenalty) * policy.PenaltyDays;
                }

                if (policy.MissedCheckoutLopEnabled && policy.MissedCheckoutsPerPenalty > 0)
                {
                    int penalizableMissed = Math.Max(0, unresolvedMissedCheckouts - policy.AllowedMissedCheckouts);
                    missedPenalty = (penalizableMissed / policy.MissedCheckoutsPerPenalty) * policy.MissedCheckoutPenaltyDays;
                }
            }

            decimal total = Math.Min(Math.Max(0, maxPeriodDays), absentDays + latePenalty + missedPenalty);
            return (latePenalty, missedPenalty, total);
        }

        public async Task<IEnumerable<LopDeductionPreviewDto>> GetPreviewAsync(string? month = null, string? searchTerm = null, CancellationToken ct = default)
        {
            var policy = await _repository.GetPolicyAsync(ct);
            var targetMonth = string.IsNullOrWhiteSpace(month) ? DateTime.UtcNow.ToString("yyyy-MM") : month.Trim();
            var staffList = (await _repository.GetStaffListForLopAsync(ct)).ToList();
            var attendanceCounts = await _repository.GetMonthlyAttendanceCountsAsync(targetMonth, policy.ShiftStart, policy.GraceMinutes, ct);

            var daysInMonth = GetPeriodDays(targetMonth, policy.Basis);
            var results = new List<LopDeductionPreviewDto>();

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
                attendanceCounts.TryGetValue(staffNumericId, out var counts);

                var (_, _, lopDays) = CalculateAttendanceLop(
                    policy,
                    counts.LateCount,
                    counts.MissedCheckoutCount,
                    counts.AbsentCount,
                    targetMonth,
                    daysInMonth);

                var deduction = Math.Round((staff.Salary * lopDays) / daysInMonth, 2);
                var salaryAfterLop = Math.Round(staff.Salary - deduction, 2);

                results.Add(new LopDeductionPreviewDto
                {
                    StaffId = staff.StaffId,
                    EmployeeId = staff.EmployeeId,
                    Name = staff.Name,
                    Department = staff.Department,
                    LateCount = counts.LateCount,
                    MissedCheckoutCount = counts.MissedCheckoutCount,
                    AbsentCount = counts.AbsentCount,
                    LopDays = lopDays,
                    Deduction = deduction,
                    SalaryAfterLop = salaryAfterLop,
                    MonthlySalary = staff.Salary
                });
            }

            return results;
        }

        public LopCalculateResponseDto CalculateLop(LopCalculateRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var periodDays = GetPeriodDays(request.Month, request.Basis);
            var lopDays = Math.Max(0, request.Days);
            var monthlySalary = Math.Max(0, request.Salary);

            var deduction = Math.Round((monthlySalary * lopDays) / periodDays, 2);
            var salaryAfterLop = Math.Round(monthlySalary - deduction, 2);

            return new LopCalculateResponseDto
            {
                PeriodDays = periodDays,
                LopDays = lopDays,
                MonthlySalary = monthlySalary,
                Deduction = deduction,
                SalaryAfterLop = salaryAfterLop
            };
        }

        private static int GetPeriodDays(string month, string? basis)
        {
            if (string.Equals(basis, "fixed30", StringComparison.OrdinalIgnoreCase))
                return 30;

            if (DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                return DateTime.DaysInMonth(date.Year, date.Month);
            }

            return 30;
        }
    }
}
