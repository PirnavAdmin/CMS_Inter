using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Roles
{
    public static class ModuleKeyResolver
    {
        public static readonly Dictionary<string, string> SubModuleMap = new(StringComparer.OrdinalIgnoreCase)
        {
            // Overview & Academic
            { "dashboard", "Dashboard" },
            { "board-academic-year", "Board & Academic Year" },
            { "board-academic-years", "Board & Academic Year" },
            { "group-management", "Group Management" },
            { "courses", "Group Management" },
            { "academics", "Group Management" },
            { "subject-management", "Subject Management" },
            { "classes", "Subject Management" },
            { "section-room", "Section & Room" },
            { "timetable", "Timetable" },
            { "parent-timetable", "Timetable" },
            { "holiday-management", "Holiday Management" },
            { "holidays", "Holiday Management" },
            { "warden-holidays", "Holiday Management" },
            { "driver-holidays", "Holiday Management" },
            { "accountant-holidays", "Holiday Management" },

            // Student & Admissions
            { "student-admission", "Student Admission" },
            { "student-management", "Student Management" },
            { "parent-children", "Student Management" },
            { "section-allocation", "Section Allocation" },
            { "attendance", "Attendance" },
            { "parent-attendance", "Attendance" },
            { "exam-cell-attendance", "Attendance" },
            { "promotion", "Promotion" },
            { "promotions", "Promotion" },
            { "exam-cell-promotions", "Promotion" },

            // Staff & HR
            { "staff-management", "Staff Management" },
            { "department-designation", "Department & Designation" },
            { "staff-attendance", "Staff Attendance" },
            { "myattendance", "Staff Attendance" },
            { "my-attendance", "Staff Attendance" },
            { "warden-my-attendance", "Staff Attendance" },
            { "driver-my-attendance", "Staff Attendance" },
            { "accountant-my-attendance", "Staff Attendance" },
            { "exam-cell-my-attendance", "Staff Attendance" },
            { "staff-leave-management", "Staff Leave Management" },
            { "leave", "Staff Leave Management" },
            { "staff-leave", "Staff Leave Management" },
            { "warden-staff-leave", "Staff Leave Management" },
            { "driver-leave-management", "Staff Leave Management" },
            { "accountant-staff-leave", "Staff Leave Management" },
            { "inventory-leave-management", "Staff Leave Management" },
            { "reimbursement", "Staff Reimbursements" },
            { "reimbursements", "Staff Reimbursements" },
            { "staff-reimbursement", "Staff Reimbursements" },
            { "staff-reimbursements", "Staff Reimbursements" },
            { "warden-reimbursements", "Staff Reimbursements" },
            { "accountant-reimbursements", "Staff Reimbursements" },

            // Examinations & Results
            { "examination", "Examination" },
            { "examinations", "Examination" },
            { "examduties", "Examination" },
            { "exam-duties", "Examination" },
            { "parent-examinations", "Examination" },
            { "exam-cell-examination", "Examination" },
            { "marks-evaluation", "Marks Evaluation" },
            { "marks", "Marks Evaluation" },
            { "exam-cell-marks-entry", "Marks Evaluation" },
            { "results", "Results" },
            { "parent-academics-results", "Results" },
            { "exam-cell-results", "Results" },

            // Finance & Payroll
            { "fee-management", "Fee Management" },
            { "fees", "Fee Management" },
            { "parent-fees-payments", "Fee Management" },
            { "accountant-fee-management", "Fee Management" },
            { "accountant-payment-history", "Fee Management" },
            { "payroll", "Payroll" },
            { "salary", "Payroll" },
            { "payslips", "Payroll" },
            { "driver-my-payslips", "Payroll" },
            { "accountant-payroll", "Payroll" },
            { "accountant-attendance-impact", "Payroll" },
            { "inventory-my-payslips", "Payroll" },

            // Transport & Fleet
            { "transport", "Transport" },
            { "driver-todays-trips", "Transport" },
            { "driver-route-stops", "Transport" },
            { "driver-live-navigation", "Transport" },
            { "driver-student-manifest", "Transport" },
            { "transport-manager-setup", "Transport" },
            { "transport-manager-operations", "Transport" },

            // Hostel
            { "hostel-management", "Hostel Management" },
            { "hostel", "Hostel Management" },
            { "warden-dashboard", "Dashboard" },
            { "warden-rooms-beds", "Hostel Management" },
            { "warden-student-allocations", "Hostel Management" },
            { "warden-hostel-attendance", "Hostel Management" },
            { "warden-outpass-leaves", "Hostel Management" },
            { "warden-resident-students", "Hostel Management" },
            { "warden-hostel-reports", "Hostel Management" },

            // Inventory
            { "inventory", "Inventory Management" },
            { "inventory-management", "Inventory Management" },
            { "inventory-dashboard", "Dashboard" },
            { "inventory-items", "Inventory Management" },
            { "inventory-stock-in", "Inventory Management" },
            { "inventory-stock-out", "Inventory Management" },
            { "inventory-suppliers", "Inventory Management" },
            { "inventory-categories", "Inventory Management" },
            { "inventory-purchase-orders", "Inventory Management" },
            { "inventory-returns", "Inventory Management" },
            { "inventory-reports", "Inventory Management" },

            // Documents, Reports, Account & Settings
            { "certificates", "Certificates" },
            { "documents", "Certificates" },
            { "parent-documents", "Certificates" },
            { "exam-cell-certificates", "Certificates" },
            { "reports", "Reports & Analytics" },
            { "reports-analytics", "Reports & Analytics" },
            { "parent-announcements-events", "Reports & Analytics" },
            { "parent-communication", "Reports & Analytics" },
            { "driver-trip-reports", "Reports & Analytics" },
            { "accountant-financial-reports", "Reports & Analytics" },
            { "settings", "Settings" },
            { "parent-settings", "Settings" },
            { "driver-settings", "Settings" },
            { "accountant-settings", "Settings" },
            { "exam-cell-settings", "Settings" },
            { "inventory-settings", "Settings" },
            { "roles-permissions", "Roles & Permissions" },
            { "profile", "Dashboard" },
            { "driver-profile", "Dashboard" },
            { "accountant-profile", "Dashboard" },
            { "exam-cell-profile", "Dashboard" },
            { "inventory-profile", "Dashboard" }
        };

        public static string ResolveToSubModule(string? moduleId)
        {
            if (string.IsNullOrWhiteSpace(moduleId)) return string.Empty;
            var clean = moduleId.Trim().ToLowerInvariant();
            return SubModuleMap.TryGetValue(clean, out var subModule) ? subModule : moduleId.Trim();
        }
    }
}
