using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class DepartmentResponseDto
    {
        public int DepartmentId { get; set; }
        public int Id => DepartmentId;
        public string DepartmentName { get; set; } = string.Empty;
        public string Name => DepartmentName;
        public string DepartmentCode { get; set; } = string.Empty;
        public string Code => DepartmentCode;
        public string StaffType { get; set; } = "Both";
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public string Status => IsActive ? "Active" : "Inactive";
        public int DesignationCount { get; set; }
        public int StaffCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateDepartmentDto
    {
        [Required(ErrorMessage = "Department name is required.")]
        [StringLength(100, ErrorMessage = "Department name cannot exceed 100 characters.")]
        public string DepartmentName { get; set; } = string.Empty;

        [StringLength(20, ErrorMessage = "Department code cannot exceed 20 characters.")]
        public string? DepartmentCode { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Both";

        [StringLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdateDepartmentDto
    {
        [Required(ErrorMessage = "Department name is required.")]
        [StringLength(100, ErrorMessage = "Department name cannot exceed 100 characters.")]
        public string DepartmentName { get; set; } = string.Empty;

        [StringLength(20, ErrorMessage = "Department code cannot exceed 20 characters.")]
        public string? DepartmentCode { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Both";

        [StringLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class DepartmentSummaryDto
    {
        public int TotalDepartments { get; set; }
        public int ActiveDepartments { get; set; }
        public int InactiveDepartments { get; set; }
        public int TotalDesignations { get; set; }
        public int TotalStaff { get; set; }
    }

    public class MasterImportResultDto
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public int TotalRowsRead { get; set; }
        public int SuccessCount { get; set; }
        public int UpdatedCount { get; set; }
        public int FailedRowsCount { get; set; }
        public System.Collections.Generic.List<MasterImportRowError> Errors { get; set; } = new();
        public System.Collections.Generic.List<object> ImportedItems { get; set; } = new();
    }

    public class MasterImportRowError
    {
        public int RowNumber { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public class DepartmentImportExcelRequestDto
    {
        public Microsoft.AspNetCore.Http.IFormFile? File { get; set; }
        public string? DefaultStaffType { get; set; }
    }

    public class DesignationImportExcelRequestDto
    {
        public Microsoft.AspNetCore.Http.IFormFile? File { get; set; }
        public string? DefaultStaffType { get; set; }
        public int? DefaultDepartmentId { get; set; }
    }

    public class DepartmentBulkImportRequestDto
    {
        public System.Collections.Generic.List<CreateDepartmentDto> Departments { get; set; } = new();
        public string? DefaultStaffType { get; set; }
    }

    public class DesignationBulkImportRequestDto
    {
        public System.Collections.Generic.List<CreateDesignationDto> Designations { get; set; } = new();
        public string? DefaultStaffType { get; set; }
    }
}
