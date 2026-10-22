using System;
using System.Collections.Generic;
using System.Linq;

namespace CollegeManagement.API.DTOs.Roles
{
    public class SaveUserPermissionOverridesRequest
    {
        public int? UserId { get; set; }
        public int? RoleId { get; set; }
        public string? RoleCode { get; set; }
        public List<ModulePermissionUpdateItem> Overrides { get; set; } = new();
        public List<FrontendPermissionInputItem> Permissions { get; set; } = new();
        public string? Notes { get; set; }

        public List<ModulePermissionUpdateItem> GetNormalizedOverrides()
        {
            if (Overrides != null && Overrides.Count > 0)
            {
                return Overrides;
            }

            if (Permissions != null && Permissions.Count > 0)
            {
                return Permissions.Select(p => new ModulePermissionUpdateItem
                {
                    SubModule = MapModuleIdToSubModule(p.Module),
                    ScreenId = p.ScreenId ?? string.Empty,
                    ScreenName = p.ScreenName ?? string.Empty,
                    CanView = p.Actions.Any(a => a.Equals("view", StringComparison.OrdinalIgnoreCase)),
                    CanAdd = p.Actions.Any(a => a.Equals("create", StringComparison.OrdinalIgnoreCase) || a.Equals("add", StringComparison.OrdinalIgnoreCase)),
                    CanEdit = p.Actions.Any(a => a.Equals("edit", StringComparison.OrdinalIgnoreCase)),
                    CanDelete = p.Actions.Any(a => a.Equals("delete", StringComparison.OrdinalIgnoreCase))
                }).ToList();
            }

            return new List<ModulePermissionUpdateItem>();
        }

        private static string MapModuleIdToSubModule(string moduleId)
        {
            return UpdateRolePermissionsRequest.MapModuleIdToSubModule(moduleId);
        }
    }
}
