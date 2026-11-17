using System;
using System.Collections.Generic;
using System.Linq;

namespace CollegeManagement.API.DTOs.Roles
{
    public class ModulePermissionUpdateItem
    {
        public string SubModule { get; set; } = string.Empty;
        public string? ScreenId { get; set; } = string.Empty;
        public string? ScreenName { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }

    public class FrontendPermissionInputItem
    {
        public string Module { get; set; } = string.Empty;
        public string? ModuleId { get; set; }
        public string ResolvedModule => !string.IsNullOrWhiteSpace(ModuleId) ? ModuleId : Module;
        public string? ScreenId { get; set; } = string.Empty;
        public string? ScreenName { get; set; } = string.Empty;
        public List<string> Actions { get; set; } = new();
    }

    public class UpdateRolePermissionsRequest
    {
        public int? RoleId { get; set; }
        public List<ModulePermissionUpdateItem> Modules { get; set; } = new();
        public List<FrontendPermissionInputItem> Permissions { get; set; } = new();

        /// <summary>
        /// Normalizes both { modules: [...] } and frontend-native { permissions: [...] } into ModulePermissionUpdateItem list.
        /// </summary>
        public List<ModulePermissionUpdateItem> GetNormalizedModules()
        {
            if (Modules != null && Modules.Count > 0)
            {
                return Modules;
            }

            if (Permissions != null && Permissions.Count > 0)
            {
                return Permissions.Select(p => new ModulePermissionUpdateItem
                {
                    SubModule = ModuleKeyResolver.ResolveToSubModule(p.ResolvedModule),
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
    }
}
