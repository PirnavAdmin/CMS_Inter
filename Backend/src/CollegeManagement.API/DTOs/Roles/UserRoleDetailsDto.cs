using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Roles
{
    public class UserInfoDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string UserCode { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public string RoleName { get; set; } = string.Empty;

        // Frontend compatibility aliases
        public string Id => UserId.ToString();
        public string Name => FullName;
        public string RoleCode => string.IsNullOrWhiteSpace(RoleName) ? "" : RoleName.ToUpperInvariant().Replace(" ", "_").Replace("/", "_").Replace("-", "_");
        public List<string> RoleCodes => string.IsNullOrWhiteSpace(RoleCode) ? new() : new() { RoleCode };
    }

    public class RoleInfoDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string RoleStatus { get; set; } = "Active";

        public string Id => RoleId.ToString();
        public string Name => RoleName;
        public string Code => RoleName.ToUpperInvariant().Replace(" ", "_").Replace("/", "_").Replace("-", "_");
    }

    public class UserPermissionStatusDto
    {
        public string Module { get; set; } = string.Empty;
        public string SubModule { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool ViewEnabled { get; set; }
        public bool AddEnabled { get; set; }
        public bool EditEnabled { get; set; }
        public bool DeleteEnabled { get; set; }
        public bool HasMemberOverride { get; set; }

        public string ModuleId => ModulePermissionMatrixDto.NormalizeToKebabCase(SubModule);
        public string ModuleKey => ModuleId;

        public List<string> Actions
        {
            get
            {
                var list = new List<string>();
                if (ViewEnabled) list.Add("view");
                if (AddEnabled)
                {
                    list.Add("create");
                    list.Add("add");
                }
                if (EditEnabled) list.Add("edit");
                if (DeleteEnabled) list.Add("delete");
                return list;
            }
        }
    }

    public class UserRoleDetailsDto
    {
        public UserInfoDto User { get; set; } = new();
        public RoleInfoDto Role { get; set; } = new();
        public List<UserPermissionStatusDto> Permissions { get; set; } = new();

        // Direct flat user properties for frontend getUserRoleDetails(userId) returning data directly
        public string Id => User.Id;
        public string Name => User.Name;
        public string UserId => User.UserCode;
        public string UserType => User.UserType;
        public string Department => User.Department;
        public string Designation => User.Designation;
        public string Status => User.Status;
        public List<string> RoleCodes => User.RoleCodes;
    }
}
