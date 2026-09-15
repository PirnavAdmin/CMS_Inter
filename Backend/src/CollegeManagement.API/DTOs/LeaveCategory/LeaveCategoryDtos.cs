using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.LeaveCategory
{
    public class CreateLeaveCategoryDto
    {
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryCode { get; set; } = string.Empty;
        public decimal AnnualQuota { get; set; }
        public string ApplicableStaffType { get; set; } = "All Staff";
        public bool AllowCarryForward { get; set; }
        public bool RequiresProof { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class UpdateLeaveCategoryDto
    {
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryCode { get; set; } = string.Empty;
        public decimal AnnualQuota { get; set; }
        public string ApplicableStaffType { get; set; } = "All Staff";
        public bool AllowCarryForward { get; set; }
        public bool RequiresProof { get; set; }
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class LeaveCategoryResponseDto
    {
        public int LeaveCategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryCode { get; set; } = string.Empty;
        public decimal AnnualQuota { get; set; }
        public string ApplicableStaffType { get; set; } = "All Staff";
        public bool AllowCarryForward { get; set; }
        public bool RequiresProof { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public int DisplayOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class LeaveCategoryBadgeDto
    {
        public string Code { get; set; } = string.Empty;
        public decimal Days { get; set; }
        public string Label { get; set; } = string.Empty;
    }

    public class LeaveCategorySummaryDto
    {
        public decimal StandardAnnualAllowance { get; set; }
        public int TotalCategories { get; set; }
        public List<LeaveCategoryBadgeDto> Badges { get; set; } = new();
    }
}
