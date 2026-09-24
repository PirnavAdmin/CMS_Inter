using System;

namespace CollegeManagement.API.DTOs.Roles
{
    public class RoleResponse
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsSystemRole { get; set; }
        public bool IsActive { get; set; } = true;
        public int UserCount { get; set; }
        public int PermissionsCount { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Frontend compatibility properties
        public string Id => RoleId.ToString();
        public string Name => RoleName;
        public string Code => RoleCode;
        public string RoleCode => RoleName.ToUpperInvariant().Replace(" ", "_").Replace("/", "_").Replace("-", "_");
        public bool IsProtected => RoleName.Equals("Super Admin", StringComparison.OrdinalIgnoreCase);
        public int AssignedUserCount => UserCount;
    }
}
