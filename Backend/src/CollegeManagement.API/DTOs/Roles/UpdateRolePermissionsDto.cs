using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Roles
{
    public class ModulePermissionUpdateItem
    {
        [JsonPropertyName("module")]
        public string Module { get; set; } = string.Empty;

        [JsonPropertyName("subModule")]
        public string SubModule { get; set; } = string.Empty;

        [JsonPropertyName("screen")]
        public string? Screen { get; set; } = string.Empty;

        [JsonPropertyName("screenId")]
        public string? ScreenId { get; set; } = string.Empty;

        [JsonPropertyName("screenCode")]
        public string? ScreenCode { get; set; } = string.Empty;

        [JsonPropertyName("screenName")]
        public string? ScreenName { get; set; } = string.Empty;

        [JsonPropertyName("canView")]
        public bool CanView { get; set; }

        [JsonPropertyName("canAdd")]
        public bool CanAdd { get; set; }

        [JsonPropertyName("canEdit")]
        public bool CanEdit { get; set; }

        [JsonPropertyName("canDelete")]
        public bool CanDelete { get; set; }
    }

    public class FrontendPermissionInputItem
    {
        [JsonPropertyName("module")]
        public string Module { get; set; } = string.Empty;

        [JsonPropertyName("screenId")]
        public string? ScreenId { get; set; } = string.Empty;

        [JsonPropertyName("screenName")]
        public string? ScreenName { get; set; } = string.Empty;

        [JsonPropertyName("actions")]
        public List<string> Actions { get; set; } = new();
    }

    public class ScreenPermissionItemDto
    {
        [JsonPropertyName("screenId")]
        public string ScreenId { get; set; } = string.Empty;

        [JsonPropertyName("screenName")]
        public string? ScreenName { get; set; } = string.Empty;

        [JsonPropertyName("actions")]
        public List<string> Actions { get; set; } = new();
    }

    public class ModulePermissionItemDto
    {
        [JsonPropertyName("module")]
        public string? Module { get; set; }

        private string _moduleId = string.Empty;

        [JsonPropertyName("moduleId")]
        public string ModuleId
        {
            get => !string.IsNullOrEmpty(_moduleId) ? _moduleId : (Module ?? string.Empty);
            set => _moduleId = value;
        }

        [JsonPropertyName("screenId")]
        public string? ScreenId { get; set; } = string.Empty;

        [JsonPropertyName("screenName")]
        public string? ScreenName { get; set; } = string.Empty;

        [JsonPropertyName("actions")]
        public List<string> Actions { get; set; } = new();

        [JsonPropertyName("screens")]
        public List<ScreenPermissionItemDto> Screens { get; set; } = new();
    }

    public class UpdateRolePermissionsRequest
    {
        [JsonPropertyName("roleId")]
        public int? RoleId { get; set; }

        [JsonPropertyName("modules")]
        public List<ModulePermissionUpdateItem> Modules { get; set; } = new();

        [JsonPropertyName("frontendPermissions")]
        public List<FrontendPermissionInputItem> FrontendPermissions { get; set; } = new();

        [JsonPropertyName("permissions")]
        public List<ModulePermissionItemDto> Permissions { get; set; } = new();

        /// <summary>
        /// Normalizes both { modules: [...] }, { frontendPermissions: [...] }, and { permissions: [...] }
        /// </summary>
        public List<ModulePermissionUpdateItem> GetNormalizedModules()
        {
            if (Modules != null && Modules.Count > 0)
            {
                return Modules;
            }

            if (Permissions != null && Permissions.Count > 0)
            {
                return ToInternalUpdateItems();
            }

            if (FrontendPermissions != null && FrontendPermissions.Count > 0)
            {
                return FrontendPermissions.Select(p => new ModulePermissionUpdateItem
                {
                    Module = MapModuleIdToSubModule(p.Module),
                    SubModule = MapModuleIdToSubModule(p.Module),
                    Screen = p.ScreenId ?? string.Empty,
                    ScreenId = p.ScreenId ?? string.Empty,
                    ScreenCode = p.ScreenId ?? string.Empty,
                    ScreenName = p.ScreenName ?? string.Empty,
                    CanView = p.Actions.Any(a => a.Equals("view", StringComparison.OrdinalIgnoreCase)),
                    CanAdd = p.Actions.Any(a => a.Equals("create", StringComparison.OrdinalIgnoreCase) || a.Equals("add", StringComparison.OrdinalIgnoreCase)),
                    CanEdit = p.Actions.Any(a => a.Equals("edit", StringComparison.OrdinalIgnoreCase)),
                    CanDelete = p.Actions.Any(a => a.Equals("delete", StringComparison.OrdinalIgnoreCase))
                }).ToList();
            }

            return new List<ModulePermissionUpdateItem>();
        }

        public List<ModulePermissionUpdateItem> ToInternalUpdateItems()
        {
            if (Permissions == null || Permissions.Count == 0) return new List<ModulePermissionUpdateItem>();

            var items = new List<ModulePermissionUpdateItem>();

            foreach (var item in Permissions)
            {
                string targetIdentifier = !string.IsNullOrWhiteSpace(item.ModuleId) ? item.ModuleId : (item.Module ?? string.Empty);
                string subModule = MapModuleIdToSubModule(targetIdentifier);
                string screenCode = string.IsNullOrWhiteSpace(item.ScreenId) ? "all" : item.ScreenId.Trim();

                var actions = item.Actions ?? new List<string>();
                bool canView = actions.Any(a => a.Equals("view", StringComparison.OrdinalIgnoreCase));
                bool canAdd = actions.Any(a => a.Equals("create", StringComparison.OrdinalIgnoreCase) || a.Equals("add", StringComparison.OrdinalIgnoreCase));
                bool canEdit = actions.Any(a => a.Equals("edit", StringComparison.OrdinalIgnoreCase) || a.Equals("update", StringComparison.OrdinalIgnoreCase));
                bool canDelete = actions.Any(a => a.Equals("delete", StringComparison.OrdinalIgnoreCase));

                // Master row
                items.Add(new ModulePermissionUpdateItem
                {
                    Module = subModule,
                    SubModule = subModule,
                    Screen = screenCode,
                    ScreenId = screenCode,
                    ScreenCode = screenCode,
                    ScreenName = screenCode,
                    CanView = canView,
                    CanAdd = canAdd,
                    CanEdit = canEdit,
                    CanDelete = canDelete
                });

                // Screen level overrides if provided
                if (item.Screens != null && item.Screens.Count > 0)
                {
                    foreach (var s in item.Screens)
                    {
                        var sActions = s.Actions ?? new List<string>();
                        string sCode = string.IsNullOrWhiteSpace(s.ScreenId) ? "all" : s.ScreenId.Trim();

                        items.Add(new ModulePermissionUpdateItem
                        {
                            Module = subModule,
                            SubModule = subModule,
                            Screen = sCode,
                            ScreenId = sCode,
                            ScreenCode = sCode,
                            ScreenName = s.ScreenName ?? sCode,
                            CanView = sActions.Any(a => a.Equals("view", StringComparison.OrdinalIgnoreCase)),
                            CanAdd = sActions.Any(a => a.Equals("create", StringComparison.OrdinalIgnoreCase) || a.Equals("add", StringComparison.OrdinalIgnoreCase)),
                            CanEdit = sActions.Any(a => a.Equals("edit", StringComparison.OrdinalIgnoreCase) || a.Equals("update", StringComparison.OrdinalIgnoreCase)),
                            CanDelete = sActions.Any(a => a.Equals("delete", StringComparison.OrdinalIgnoreCase))
                        });
                    }
                }
            }

            return items;
        }

        private static readonly ConcurrentDictionary<string, string> _customModuleMap = new(StringComparer.OrdinalIgnoreCase);

        public static void RegisterCustomModule(string moduleId, string subModuleName)
        {
            if (!string.IsNullOrWhiteSpace(moduleId) && !string.IsNullOrWhiteSpace(subModuleName))
            {
                _customModuleMap[moduleId.Trim().ToLowerInvariant()] = subModuleName.Trim();
            }
        }

        public static string MapModuleIdToSubModule(string moduleId)
        {
            if (string.IsNullOrWhiteSpace(moduleId)) return string.Empty;
            var clean = moduleId.Trim().ToLowerInvariant();

            var map = new Dictionary<string, string>
            {
                { "dashboard", "Dashboard" },
                { "board-academic-year", "Board & Academic Year" },
                { "group-management", "Group Management" },
                { "subject-management", "Subject Management" },
                { "section-room", "Section & Room" },
                { "section-room-management", "Section & Room" },
                { "sections-rooms", "Section & Room" },
                { "timetable", "Timetable" },
                { "timetable-management", "Timetable" },
                { "holiday-management", "Holiday Management" },
                { "student-admission", "Student Admission" },
                { "student-management", "Student Management" },
                { "section-allocation", "Section Allocation" },
                { "attendance", "Attendance" },
                { "student-attendance", "Attendance" },
                { "promotion", "Promotion" },
                { "transport", "Transport" },
                { "staff-management", "Staff Management" },
                { "department-designation", "Department & Designation" },
                { "staff-attendance", "Staff Attendance" },
                { "staff-leave-management", "Staff Leave Management" },
                { "reimbursement", "Staff Reimbursements" },
                { "reimbursements", "Staff Reimbursements" },
                { "staff-reimbursement", "Staff Reimbursements" },
                { "staff-reimbursements", "Staff Reimbursements" },
                { "reports", "Reports & Analytics" },
                { "board-academic-years", "Board & Academic Year" },
                { "courses", "Group Management" },
                { "examination", "Examination" },
                { "examinations", "Examination" },
                { "marks-evaluation", "Marks Evaluation" },
                { "results", "Results" },
                { "fee-management", "Fee Management" },
                { "payroll", "Payroll" },
                { "certificates", "Certificates" },
                { "reports-analytics", "Reports & Analytics" },
                { "hostel-management", "Hostel Management" },
                { "settings", "Settings" },
                { "roles-permissions", "Roles & Permissions" },
                { "inventory-management", "Inventory Management" },
                { "inventory", "Inventory Management" }
            };

            if (map.TryGetValue(clean, out var subModule)) return subModule;
            if (_customModuleMap.TryGetValue(clean, out var customName)) return customName;

            // Fallback: convert kebab-case or snake_case to Title Case
            var parts = clean.Split(new[] { '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length > 0)
            {
                return string.Join(" ", parts.Select(p => char.ToUpperInvariant(p[0]) + (p.Length > 1 ? p.Substring(1) : "")));
            }

            return moduleId;
        }
    }
}
