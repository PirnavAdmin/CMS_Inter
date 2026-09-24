using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Roles
{
    public class ModulePermissionMatrixDto
    {
        public string Module { get; set; } = string.Empty;
        public string SubModule { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool HasMemberOverride { get; set; }

        // Frontend compatibility properties
        public string ModuleId => NormalizeToKebabCase(SubModule);
        public string ModuleKey => ModuleId;

        public List<string> Actions
        {
            get
            {
                var list = new List<string>();
                if (CanView) list.Add("view");
                if (CanAdd)
                {
                    list.Add("create");
                    list.Add("add");
                }
                if (CanEdit) list.Add("edit");
                if (CanDelete) list.Add("delete");
                return list;
            }
        }

        public static string NormalizeToKebabCase(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;
            return name
                .Trim()
                .ToLowerInvariant()
                .Replace("&", "")
                .Replace("/", "-")
                .Replace("  ", " ")
                .Trim()
                .Replace(" ", "-");
        }
    }

    public class RolePermissionsMatrixResponseDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public int? TargetUserId { get; set; }
        public string? TargetUserName { get; set; }
        public bool IsMemberOverrideMode { get; set; }
        public List<ModulePermissionMatrixDto> Permissions { get; set; } = new();
    }
}
