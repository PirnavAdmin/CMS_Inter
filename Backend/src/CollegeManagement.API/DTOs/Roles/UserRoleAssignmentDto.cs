using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Roles
{
    public class UserRoleAssignmentDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string UserCode { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty; // Staff, Faculty, Operational
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public int OverridesCount { get; set; }

        // Frontend compatibility properties
        public string Id => UserId.ToString();
        public string Name => FullName;
        public string RoleCode => string.IsNullOrWhiteSpace(RoleName) ? "" : RoleName.ToUpperInvariant().Replace(" ", "_").Replace("/", "_").Replace("-", "_");
        public List<string> RoleCodes => string.IsNullOrWhiteSpace(RoleCode) ? new() : new() { RoleCode };
    }

    public class UserRoleAssignmentsResponseDto
    {
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public List<UserRoleAssignmentDto> Items { get; set; } = new();

        // Frontend pagination aliases
        public int Total => TotalCount;
        public int Page => PageNumber;
    }

    public class GetUserRoleAssignmentsRequestDto
    {
        public string? Search { get; set; }
        public int? RoleId { get; set; }
        public string? UserType { get; set; } // "all", "Staff", "Faculty", "Operational"
        public int? Page { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public int EffectivePageNumber => Page.HasValue && Page.Value > 0 ? Page.Value : (PageNumber > 0 ? PageNumber : 1);
    }
}
