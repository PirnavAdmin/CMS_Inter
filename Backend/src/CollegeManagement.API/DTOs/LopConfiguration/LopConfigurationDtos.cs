using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.LopConfiguration
{
    public class LopPolicyDto
    {
        [JsonPropertyName("policyId")]
        public int PolicyId { get; set; } = 1;

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("campusName")]
        public string? CampusName { get; set; }

        [JsonPropertyName("staffType")]
        public string StaffType { get; set; } = "All";

        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; } = true;

        [JsonPropertyName("appliesTo")]
        public string AppliesTo { get; set; } = "All college staff — all departments";

        [JsonPropertyName("useShiftTimingConfig")]
        public bool UseShiftTimingConfig { get; set; } = true;

        [JsonPropertyName("shiftStart")]
        public string ShiftStart { get; set; } = "09:00";

        [JsonPropertyName("graceMinutes")]
        public int GraceMinutes { get; set; } = 10;

        [JsonPropertyName("allowedLateLogins")]
        public int AllowedLateLogins { get; set; } = 2;

        [JsonPropertyName("lateLoginsPerPenalty")]
        public int LateLoginsPerPenalty { get; set; } = 3;

        [JsonPropertyName("penaltyDays")]
        public decimal PenaltyDays { get; set; } = 0.5m;

        [JsonPropertyName("missedCheckoutLopEnabled")]
        public bool MissedCheckoutLopEnabled { get; set; } = true;

        [JsonPropertyName("allowedMissedCheckouts")]
        public int AllowedMissedCheckouts { get; set; } = 0;

        [JsonPropertyName("missedCheckoutsPerPenalty")]
        public int MissedCheckoutsPerPenalty { get; set; } = 1;

        [JsonPropertyName("missedCheckoutPenaltyDays")]
        public decimal MissedCheckoutPenaltyDays { get; set; } = 0.5m;

        [JsonPropertyName("weeklyMissedCheckoutRuleEnabled")]
        public bool WeeklyMissedCheckoutRuleEnabled { get; set; } = true;

        [JsonPropertyName("weeklyMissedCheckoutThreshold")]
        public int WeeklyMissedCheckoutThreshold { get; set; } = 2;

        [JsonPropertyName("weeklyMissedCheckoutPenaltyDays")]
        public decimal WeeklyMissedCheckoutPenaltyDays { get; set; } = 1.0m;

        [JsonPropertyName("absentLopEnabled")]
        public bool AbsentLopEnabled { get; set; } = true;

        [JsonPropertyName("absentPenaltyDays")]
        public decimal AbsentPenaltyDays { get; set; } = 1.0m;

        [JsonPropertyName("countUnmarkedWorkingDaysAsAbsent")]
        public bool CountUnmarkedWorkingDaysAsAbsent { get; set; } = true;

        [JsonPropertyName("halfDayLopEnabled")]
        public bool HalfDayLopEnabled { get; set; } = true;

        [JsonPropertyName("halfDayPenaltyDays")]
        public decimal HalfDayPenaltyDays { get; set; } = 0.5m;

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar"; // "calendar" | "fixed30" | "working26"

        [JsonPropertyName("deductionComponent")]
        public string DeductionComponent { get; set; } = "Gross"; // "Gross" | "Basic"

        [JsonPropertyName("roundingMode")]
        public string RoundingMode { get; set; } = "Exact"; // "Exact" | "HalfDay" | "WholeDay"

        [JsonPropertyName("maxLopDaysPerMonth")]
        public decimal? MaxLopDaysPerMonth { get; set; }

        [JsonPropertyName("autoApplyToPayroll")]
        public bool AutoApplyToPayroll { get; set; } = true;

        [JsonPropertyName("effectiveFrom")]
        public string EffectiveFrom { get; set; } = DateTime.UtcNow.ToString("yyyy-MM");

        [JsonPropertyName("createdAt")]
        public DateTime? CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }

    public class SaveLopPolicyRequest
    {
        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("staffType")]
        public string StaffType { get; set; } = "All";

        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; } = true;

        [JsonPropertyName("useShiftTimingConfig")]
        public bool UseShiftTimingConfig { get; set; } = true;

        [JsonPropertyName("shiftStart")]
        public string ShiftStart { get; set; } = "09:00";

        [JsonPropertyName("graceMinutes")]
        public int GraceMinutes { get; set; } = 10;

        [JsonPropertyName("allowedLateLogins")]
        public int AllowedLateLogins { get; set; } = 2;

        [JsonPropertyName("lateLoginsPerPenalty")]
        public int LateLoginsPerPenalty { get; set; } = 3;

        [JsonPropertyName("penaltyDays")]
        public decimal PenaltyDays { get; set; } = 0.5m;

        [JsonPropertyName("missedCheckoutLopEnabled")]
        public bool MissedCheckoutLopEnabled { get; set; } = true;

        [JsonPropertyName("allowedMissedCheckouts")]
        public int AllowedMissedCheckouts { get; set; } = 0;

        [JsonPropertyName("missedCheckoutsPerPenalty")]
        public int MissedCheckoutsPerPenalty { get; set; } = 1;

        [JsonPropertyName("missedCheckoutPenaltyDays")]
        public decimal MissedCheckoutPenaltyDays { get; set; } = 0.5m;

        [JsonPropertyName("weeklyMissedCheckoutRuleEnabled")]
        public bool WeeklyMissedCheckoutRuleEnabled { get; set; } = true;

        [JsonPropertyName("weeklyMissedCheckoutThreshold")]
        public int WeeklyMissedCheckoutThreshold { get; set; } = 2;

        [JsonPropertyName("weeklyMissedCheckoutPenaltyDays")]
        public decimal WeeklyMissedCheckoutPenaltyDays { get; set; } = 1.0m;

        [JsonPropertyName("absentLopEnabled")]
        public bool AbsentLopEnabled { get; set; } = true;

        [JsonPropertyName("absentPenaltyDays")]
        public decimal AbsentPenaltyDays { get; set; } = 1.0m;

        [JsonPropertyName("countUnmarkedWorkingDaysAsAbsent")]
        public bool CountUnmarkedWorkingDaysAsAbsent { get; set; } = true;

        [JsonPropertyName("halfDayLopEnabled")]
        public bool HalfDayLopEnabled { get; set; } = true;

        [JsonPropertyName("halfDayPenaltyDays")]
        public decimal HalfDayPenaltyDays { get; set; } = 0.5m;

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("deductionComponent")]
        public string DeductionComponent { get; set; } = "Gross";

        [JsonPropertyName("roundingMode")]
        public string RoundingMode { get; set; } = "Exact";

        [JsonPropertyName("maxLopDaysPerMonth")]
        public decimal? MaxLopDaysPerMonth { get; set; }

        [JsonPropertyName("autoApplyToPayroll")]
        public bool AutoApplyToPayroll { get; set; } = true;

        [JsonPropertyName("effectiveFrom")]
        public string EffectiveFrom { get; set; } = string.Empty;
    }

    public class LopStaffRecordDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("staffId")]
        public string StaffId { get; set; } = string.Empty;

        [JsonPropertyName("employeeId")]
        public string EmployeeId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("department")]
        public string Department { get; set; } = string.Empty;

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("campusName")]
        public string CampusName { get; set; } = string.Empty;

        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary { get; set; }

        [JsonPropertyName("lopDays")]
        public decimal LopDays { get; set; }

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("deductionComponent")]
        public string DeductionComponent { get; set; } = "Gross";

        [JsonPropertyName("periodDays")]
        public int PeriodDays { get; set; } = 30;

        [JsonPropertyName("deduction")]
        public decimal Deduction { get; set; }

        [JsonPropertyName("salaryAfterLOP")]
        public decimal SalaryAfterLop { get; set; }

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("source")]
        public string Source { get; set; } = "Manual";

        [JsonPropertyName("latePenaltyDays")]
        public decimal LatePenaltyDays { get; set; }

        [JsonPropertyName("missedCheckoutPenaltyDays")]
        public decimal MissedCheckoutPenaltyDays { get; set; }

        [JsonPropertyName("absentDays")]
        public decimal AbsentDays { get; set; }

        [JsonPropertyName("halfDays")]
        public int HalfDays { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Active";

        [JsonPropertyName("createdAt")]
        public DateTime? CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }

    public class SaveLopStaffRecordRequest
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("staffId")]
        public string StaffId { get; set; } = string.Empty;

        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("days")]
        public decimal Days { get; set; }

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("deductionComponent")]
        public string DeductionComponent { get; set; } = "Gross";

        [JsonPropertyName("source")]
        public string Source { get; set; } = "Manual";

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateLopStaffRecordRequest
    {
        [JsonPropertyName("days")]
        public decimal Days { get; set; }

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("deductionComponent")]
        public string DeductionComponent { get; set; } = "Gross";

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateLopRecordStatusRequest
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = "Waived";

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }

    public class LopKpisDto
    {
        [JsonPropertyName("staffWithLop")]
        public int StaffWithLop { get; set; }

        [JsonPropertyName("totalLopDays")]
        public decimal TotalLopDays { get; set; }

        [JsonPropertyName("totalDeduction")]
        public decimal TotalDeduction { get; set; }
    }

    public class LopRecordsResponseDto
    {
        [JsonPropertyName("kpis")]
        public LopKpisDto Kpis { get; set; } = new LopKpisDto();

        [JsonPropertyName("records")]
        public List<LopStaffRecordDto> Records { get; set; } = new List<LopStaffRecordDto>();
    }

    public class LopDeductionPreviewDto
    {
        [JsonPropertyName("staffId")]
        public string StaffId { get; set; } = string.Empty;

        [JsonPropertyName("employeeId")]
        public string EmployeeId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("department")]
        public string Department { get; set; } = string.Empty;

        [JsonPropertyName("staffType")]
        public string StaffType { get; set; } = "Teaching";

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("campusName")]
        public string CampusName { get; set; } = string.Empty;

        [JsonPropertyName("salaryStructureName")]
        public string SalaryStructureName { get; set; } = string.Empty;

        [JsonPropertyName("hasSalaryStructure")]
        public bool HasSalaryStructure { get; set; }

        [JsonPropertyName("shiftInfo")]
        public string ShiftInfo { get; set; } = string.Empty;

        [JsonPropertyName("presentCount")]
        public int PresentCount { get; set; }

        [JsonPropertyName("leaveCount")]
        public int LeaveCount { get; set; }

        [JsonPropertyName("lateCount")]
        public int LateCount { get; set; }

        [JsonPropertyName("missedCheckoutCount")]
        public int MissedCheckoutCount { get; set; }

        [JsonPropertyName("absentCount")]
        public int AbsentCount { get; set; }

        [JsonPropertyName("halfDayCount")]
        public int HalfDayCount { get; set; }

        [JsonPropertyName("latePenaltyDays")]
        public decimal LatePenaltyDays { get; set; }

        [JsonPropertyName("missedCheckoutPenaltyDays")]
        public decimal MissedCheckoutPenaltyDays { get; set; }

        [JsonPropertyName("absentLopDays")]
        public decimal AbsentLopDays { get; set; }

        [JsonPropertyName("halfDayLopDays")]
        public decimal HalfDayLopDays { get; set; }

        [JsonPropertyName("weeklyMissedCheckoutTriggerCount")]
        public int WeeklyMissedCheckoutTriggerCount { get; set; }

        [JsonPropertyName("weeklyMissedCheckoutPenaltyDays")]
        public decimal WeeklyMissedCheckoutPenaltyDays { get; set; }

        [JsonPropertyName("policyLopDays")]
        public decimal PolicyLopDays { get; set; }

        [JsonPropertyName("manualLopDays")]
        public decimal ManualLopDays { get; set; }

        [JsonPropertyName("isOverridden")]
        public bool IsOverridden { get; set; }

        [JsonPropertyName("isWaived")]
        public bool IsWaived { get; set; }

        [JsonPropertyName("lopDays")]
        public decimal LopDays { get; set; }

        [JsonPropertyName("deductionComponent")]
        public string DeductionComponent { get; set; } = "Gross";

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("periodDays")]
        public int PeriodDays { get; set; }

        [JsonPropertyName("perDayRate")]
        public decimal PerDayRate { get; set; }

        [JsonPropertyName("deduction")]
        public decimal Deduction { get; set; }

        [JsonPropertyName("salaryAfterLOP")]
        public decimal SalaryAfterLop { get; set; }

        [JsonPropertyName("basicPay")]
        public decimal BasicPay { get; set; }

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary { get; set; }

        [JsonPropertyName("baseSalary")]
        public decimal BaseSalary { get; set; }
    }

    public class LopPreviewSummaryDto
    {
        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("totalStaff")]
        public int TotalStaff { get; set; }

        [JsonPropertyName("staffWithSalary")]
        public int StaffWithSalary { get; set; }

        [JsonPropertyName("staffWithoutSalary")]
        public int StaffWithoutSalary { get; set; }

        [JsonPropertyName("impactedStaffCount")]
        public int ImpactedStaffCount { get; set; }

        [JsonPropertyName("totalPolicyLopDays")]
        public decimal TotalPolicyLopDays { get; set; }

        [JsonPropertyName("totalManualLopDays")]
        public decimal TotalManualLopDays { get; set; }

        [JsonPropertyName("totalLopDays")]
        public decimal TotalLopDays { get; set; }

        [JsonPropertyName("totalDeduction")]
        public decimal TotalDeduction { get; set; }
    }

    public class LopPreviewResponseDto
    {
        [JsonPropertyName("policy")]
        public LopPolicyDto Policy { get; set; } = new LopPolicyDto();

        [JsonPropertyName("summary")]
        public LopPreviewSummaryDto Summary { get; set; } = new LopPreviewSummaryDto();

        [JsonPropertyName("items")]
        public List<LopDeductionPreviewDto> Items { get; set; } = new List<LopDeductionPreviewDto>();
    }

    public class LopSyncRecordsRequest
    {
        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }
    }

    public class LopSyncRecordsResponseDto
    {
        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("syncedCount")]
        public int SyncedCount { get; set; }

        [JsonPropertyName("totalLopDays")]
        public decimal TotalLopDays { get; set; }

        [JsonPropertyName("totalDeduction")]
        public decimal TotalDeduction { get; set; }
    }

    public class LopStaffDropdownDto
    {
        [JsonPropertyName("id")]
        public string Id => StaffId;

        [JsonPropertyName("staffId")]
        public string StaffId { get; set; } = string.Empty;

        [JsonPropertyName("employeeId")]
        public string EmployeeId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("department")]
        public string Department { get; set; } = string.Empty;

        [JsonPropertyName("departmentId")]
        public int? DepartmentId { get; set; }

        [JsonPropertyName("staffType")]
        public string StaffType { get; set; } = "Teaching";

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [JsonPropertyName("campusName")]
        public string CampusName { get; set; } = string.Empty;

        [JsonPropertyName("joiningDate")]
        public DateTime? JoiningDate { get; set; }

        [JsonPropertyName("hasSalaryStructure")]
        public bool HasSalaryStructure { get; set; }

        [JsonPropertyName("salaryStructureName")]
        public string SalaryStructureName { get; set; } = string.Empty;

        [JsonPropertyName("basicPay")]
        public decimal BasicPay { get; set; }

        [JsonPropertyName("salary")]
        public decimal Salary { get; set; }

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary => Salary;
    }

    public class LopCalculateRequest
    {
        [JsonPropertyName("salary")]
        public decimal Salary { get; set; }

        [JsonPropertyName("basicPay")]
        public decimal BasicPay { get; set; }

        [JsonPropertyName("deductionComponent")]
        public string DeductionComponent { get; set; } = "Gross";

        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("days")]
        public decimal Days { get; set; }

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("roundingMode")]
        public string RoundingMode { get; set; } = "Exact";
    }

    public class LopCalculateResponseDto
    {
        [JsonPropertyName("periodDays")]
        public int PeriodDays { get; set; }

        [JsonPropertyName("baseSalary")]
        public decimal BaseSalary { get; set; }

        [JsonPropertyName("perDayRate")]
        public decimal PerDayRate { get; set; }

        [JsonPropertyName("lopDays")]
        public decimal LopDays { get; set; }

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary { get; set; }

        [JsonPropertyName("deduction")]
        public decimal Deduction { get; set; }

        [JsonPropertyName("salaryAfterLOP")]
        public decimal SalaryAfterLop { get; set; }
    }

    public class StaffMonthlyAttendanceMetric
    {
        public int StaffId { get; set; }
        public int PresentCount { get; set; }
        public int LeaveCount { get; set; }
        public int AbsentCount { get; set; }
        public int HalfDayCount { get; set; }
        public int LateCount { get; set; }
        public int MissedCheckoutCount { get; set; }
        public int WeeklyMissedCheckoutTriggerCount { get; set; }
        public decimal WeeklyMissedCheckoutPenaltyDays { get; set; }
        public string ShiftInfo { get; set; } = string.Empty;
    }
}
