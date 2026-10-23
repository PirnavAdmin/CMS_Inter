using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
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

        public async Task<LopPolicyDto> GetPolicyAsync()
        {
            return await _repository.GetPolicyAsync();
        }

        public async Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? userId = null)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.ShiftStart))
                request.ShiftStart = "09:00";

            if (request.GraceMinutes < 0 || request.GraceMinutes > 120)
                throw new ArgumentException("Grace period must be between 0 and 120 minutes.");

            if (request.AllowedLateLogins < 0 || request.AllowedLateLogins > 31)
                throw new ArgumentException("Allowed late logins must be between 0 and 31.");

            if (request.LateLoginsPerPenalty < 1 || request.LateLoginsPerPenalty > 31)
                throw new ArgumentException("Late logins per deduction must be between 1 and 31.");

            if (request.PenaltyDays != 0.5m && request.PenaltyDays != 1.0m)
                request.PenaltyDays = 0.5m;

            if (string.IsNullOrWhiteSpace(request.EffectiveFrom))
                request.EffectiveFrom = DateTime.UtcNow.ToString("yyyy-MM");

            return await _repository.SavePolicyAsync(request, userId);
        }

        public async Task<LopRecordsResponseDto> GetRecordsWithKpisAsync(string? month = null, string? searchTerm = null)
        {
            var records = (await _repository.GetStaffRecordsAsync(month, searchTerm)).ToList();
            var kpis = await _repository.GetKpisAsync(month);

            // If repository KPIs returned 0 but records exist, calculate from records
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

        public async Task<LopStaffRecordDto?> GetRecordByIdAsync(int id)
        {
            return await _repository.GetStaffRecordByIdAsync(id);
        }

        public async Task<LopKpisDto> GetKpisAsync(string? month = null)
        {
            return await _repository.GetKpisAsync(month);
        }

        public async Task<LopStaffRecordDto> CreateRecordAsync(SaveLopStaffRecordRequest request, int? userId = null)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (string.IsNullOrWhiteSpace(request.StaffId)) throw new ArgumentException("Staff member is required.");
            if (string.IsNullOrWhiteSpace(request.Month)) throw new ArgumentException("Payroll month is required.");
            if (request.Days <= 0) throw new ArgumentException("LOP days must be greater than 0.");
            if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("Reason is required.");

            var staffList = await _repository.GetStaffListForLopAsync();
            var staff = staffList.FirstOrDefault(s => s.StaffId == request.StaffId || s.Id == request.StaffId);

            var staffName = staff?.Name ?? "Staff Member";
            var employeeId = staff?.EmployeeId ?? $"EMP{request.StaffId}";
            var department = staff?.Department ?? "General";
            var salary = staff?.Salary ?? 30000.00m;

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

            var newId = await _repository.SaveStaffRecordAsync(record, userId);
            record.Id = newId;

            return record;
        }

        public async Task<bool> UpdateRecordAsync(int id, UpdateLopStaffRecordRequest request, int? userId = null)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            var existing = await _repository.GetStaffRecordByIdAsync(id);
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
                userId);
        }

        public async Task<bool> DeleteRecordAsync(int id, int? userId = null)
        {
            return await _repository.DeleteStaffRecordAsync(id, userId);
        }

        public async Task<IEnumerable<LopStaffDropdownDto>> GetStaffListAsync()
        {
            return await _repository.GetStaffListForLopAsync();
        }

        public async Task<IEnumerable<LopDeductionPreviewDto>> GetPreviewAsync(string? month = null, string? searchTerm = null)
        {
            var policy = await _repository.GetPolicyAsync();
            var targetMonth = string.IsNullOrWhiteSpace(month) ? DateTime.UtcNow.ToString("yyyy-MM") : month.Trim();
            var staffList = (await _repository.GetStaffListForLopAsync()).ToList();

            var daysInMonth = GetPeriodDays(targetMonth, policy.Basis);

            // Mock / Sample check-in times for preview calculation (same sample times used in frontend preview)
            var sampleLogins = new Dictionary<string, List<string>>
            {
                { "1", new List<string> { "09:05", "09:11", "09:20", "09:25", "09:30", "09:15", "09:18" } },
                { "2", new List<string> { "08:55", "09:08", "09:09", "09:12" } },
                { "3", new List<string> { "09:15", "09:21", "09:30", "09:35", "09:12", "09:20", "09:25", "09:40" } }
            };

            var thresholdMinutes = ParseTimeToMinutes(policy.ShiftStart) + policy.GraceMinutes;

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

                // Get login times for this staff member (using sample or default distribution)
                var logins = sampleLogins.TryGetValue(staff.StaffId, out var times) ? times :
                    (sampleLogins.TryGetValue(staff.EmployeeId, out var empTimes) ? empTimes : new List<string> { "09:15", "09:20", "09:25" });

                // Calculate late logins (CheckIn > ShiftStart + GracePeriod)
                var lateCount = logins.Count(l => ParseTimeToMinutes(l) > thresholdMinutes);

                // Excess late logins beyond allowed monthly quota
                var excess = Math.Max(0, lateCount - policy.AllowedLateLogins);

                // Calculate penalty days
                decimal lopDays = 0;
                var isEffective = policy.Enabled && string.Compare(targetMonth, policy.EffectiveFrom, StringComparison.OrdinalIgnoreCase) >= 0;

                if (isEffective && policy.LateLoginsPerPenalty > 0)
                {
                    int penaltyGroups = excess / policy.LateLoginsPerPenalty;
                    lopDays = Math.Min(daysInMonth, penaltyGroups * policy.PenaltyDays);
                }

                // Salary deduction calculation
                var deduction = Math.Round((staff.Salary * lopDays) / daysInMonth, 2);
                var salaryAfterLop = Math.Round(staff.Salary - deduction, 2);

                results.Add(new LopDeductionPreviewDto
                {
                    StaffId = staff.StaffId,
                    EmployeeId = staff.EmployeeId,
                    Name = staff.Name,
                    Department = staff.Department,
                    LateCount = lateCount,
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

        private static int ParseTimeToMinutes(string? timeStr)
        {
            if (string.IsNullOrWhiteSpace(timeStr)) return 9 * 60; // 09:00 default
            if (TimeSpan.TryParse(timeStr, out var ts))
            {
                return (int)ts.TotalMinutes;
            }

            if (DateTime.TryParse(timeStr, out var dt))
            {
                return dt.Hour * 60 + dt.Minute;
            }

            return 9 * 60;
        }
    }
}
