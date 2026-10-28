using System;

namespace CollegeManagement.API.DTOs.Staff;

public class StaffPayrollDetailsDto
{
    public int StaffId { get; set; }
    public string EmployeeId { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? AccountHolderName { get; set; }
    public string? AccountNumber { get; set; }
    public string? IfscCode { get; set; }
    public string? Branch { get; set; }
    public string? AccountType { get; set; }
    public decimal? BasicSalary { get; set; }
    public decimal? GrossSalary { get; set; }
    public string? PanNumber { get; set; }
    public string? Aadhaar { get; set; }
    public string? PfNumber { get; set; }
    public string? EsiNumber { get; set; }
    public string? UanNumber { get; set; }
    public string? SalaryStructureName { get; set; }
    public DateTime? EffectiveFrom { get; set; }
    public string Status { get; set; } = "Active";
}
