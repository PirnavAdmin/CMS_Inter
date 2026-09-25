using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class DesignationResponseDto
    {
        public int Id { get; set; }
        public int DesignationId => Id;
        public string Name { get; set; } = string.Empty;
        public string DesignationName => Name;
        private string? _code;
        public string DesignationCode
        {
            get => !string.IsNullOrWhiteSpace(_code) ? _code : (!string.IsNullOrWhiteSpace(Name) ? $"DES_{Name.ToUpper().Replace(" ", "_")}" : string.Empty);
            set => _code = value;
        }
        public string Code => DesignationCode;
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public string DepartmentCode { get; set; } = string.Empty;
        public string StaffType { get; set; } = "Both";
        public bool IsActive { get; set; } = true;
        public string Status => IsActive ? "Active" : "Inactive";
        public int AssignedStaffCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateDesignationDto
    {
        [Required(ErrorMessage = "Designation name is required.")]
        [StringLength(100, ErrorMessage = "Designation name cannot exceed 100 characters.")]
        public string Name { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Designation code cannot exceed 50 characters.")]
        public string? DesignationCode { get; set; }

        public string? Code
        {
            get => DesignationCode;
            set => DesignationCode = value;
        }

        public int? DepartmentId { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Both";

        public bool IsActive { get; set; } = true;
    }

    public class UpdateDesignationDto
    {
        [Required(ErrorMessage = "Designation name is required.")]
        [StringLength(100, ErrorMessage = "Designation name cannot exceed 100 characters.")]
        public string Name { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Designation code cannot exceed 50 characters.")]
        public string? DesignationCode { get; set; }

        public string? Code
        {
            get => DesignationCode;
            set => DesignationCode = value;
        }

        public int? DepartmentId { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Both";

        public bool IsActive { get; set; } = true;
    }

    public class DesignationSummaryDto
    {
        public int TotalDesignations { get; set; }
        public int ActiveDesignations { get; set; }
        public int InactiveDesignations { get; set; }
        public int AssignedStaffCount { get; set; }
    }
}
