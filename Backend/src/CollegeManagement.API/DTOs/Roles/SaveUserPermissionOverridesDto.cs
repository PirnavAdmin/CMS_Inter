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
                { "roles-permissions", "Roles & Permissions" }
            };

            return map.TryGetValue(clean, out var subModule) ? subModule : moduleId;
        }
    }
}
