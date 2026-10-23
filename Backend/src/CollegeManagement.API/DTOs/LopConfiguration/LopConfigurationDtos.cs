using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.LopConfiguration
{
    public class LopPolicyDto
    {
        [JsonPropertyName("policyId")]
        public int PolicyId { get; set; } = 1;

        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; } = true;

        [JsonPropertyName("appliesTo")]
        public string AppliesTo { get; set; } = "All college staff — all departments";

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

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar"; // "calendar" | "fixed30"

        [JsonPropertyName("effectiveFrom")]
        public string EffectiveFrom { get; set; } = DateTime.UtcNow.ToString("yyyy-MM");
    }

    public class SaveLopPolicyRequest
    {
        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; } = true;

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

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

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

        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary { get; set; }

        [JsonPropertyName("lopDays")]
        public decimal LopDays { get; set; }

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("periodDays")]
        public int PeriodDays { get; set; } = 30;

        [JsonPropertyName("deduction")]
        public decimal Deduction { get; set; }

        [JsonPropertyName("salaryAfterLOP")]
        public decimal SalaryAfterLop { get; set; }

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("createdAt")]
        public DateTime? CreatedAt { get; set; }
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

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateLopStaffRecordRequest
    {
        [JsonPropertyName("days")]
        public decimal Days { get; set; }

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
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

        [JsonPropertyName("lateCount")]
        public int LateCount { get; set; }

        [JsonPropertyName("lopDays")]
        public decimal LopDays { get; set; }

        [JsonPropertyName("deduction")]
        public decimal Deduction { get; set; }

        [JsonPropertyName("salaryAfterLOP")]
        public decimal SalaryAfterLop { get; set; }

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary { get; set; }
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

        [JsonPropertyName("salary")]
        public decimal Salary { get; set; }

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary => Salary;
    }

    public class LopCalculateRequest
    {
        [JsonPropertyName("salary")]
        public decimal Salary { get; set; }

        [JsonPropertyName("month")]
        public string Month { get; set; } = string.Empty;

        [JsonPropertyName("days")]
        public decimal Days { get; set; }

        [JsonPropertyName("basis")]
        public string Basis { get; set; } = "calendar";
    }

    public class LopCalculateResponseDto
    {
        [JsonPropertyName("periodDays")]
        public int PeriodDays { get; set; }

        [JsonPropertyName("lopDays")]
        public decimal LopDays { get; set; }

        [JsonPropertyName("monthlySalary")]
        public decimal MonthlySalary { get; set; }

        [JsonPropertyName("deduction")]
        public decimal Deduction { get; set; }

        [JsonPropertyName("salaryAfterLOP")]
        public decimal SalaryAfterLop { get; set; }
    }
}
