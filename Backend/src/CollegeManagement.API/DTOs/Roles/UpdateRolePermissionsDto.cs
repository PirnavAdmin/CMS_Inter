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
            if (string.IsNullOrWhiteSpace(moduleId)) return string.Empty;
            var clean = moduleId.Trim().ToLowerInvariant();

            var map = new Dictionary<string, string>
            {
                { "dashboard", "Dashboard" },
                { "board-academic-year", "Board & Academic Year" },
                { "group-management", "Group Management" },
                { "subject-management", "Subject Management" },
                { "section-room", "Section & Room" },
                { "timetable", "Timetable" },
                { "holiday-management", "Holiday Management" },
                { "student-admission", "Student Admission" },
                { "student-management", "Student Management" },
                { "section-allocation", "Section Allocation" },
                { "attendance", "Attendance" },
                { "promotion", "Promotion" },
                { "transport", "Transport" },
                { "staff-management", "Staff Management" },
                { "department-designation", "Department & Designation" },
                { "staff-attendance", "Staff Attendance" },
                { "staff-leave-management", "Staff Leave Management" },
                { "reimbursement", "Staff Reimbursements" },
                { "examination", "Examination" },
                { "marks-evaluation", "Marks Evaluation" },
                { "results", "Results" },
                { "fee-management", "Fee Management" },
                { "payroll", "Payroll" },
                { "certificates", "Certificates" },
                { "reports-analytics", "Reports & Analytics" },
                { "hostel-management", "Hostel Management" },
                { "library", "Library" },
                { "placement", "Placement" },
                { "settings", "Settings" },
                { "roles-permissions", "Roles & Permissions" },
                { "inventory-management", "Inventory Management" },
                { "inventory", "Inventory Management" }
            };

            return map.TryGetValue(clean, out var subModule) ? subModule : moduleId;
        }
    }
}
