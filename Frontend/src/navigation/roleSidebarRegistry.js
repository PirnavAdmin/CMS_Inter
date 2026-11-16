import { ACTIONS } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.constants.js";
import { studentMenuGroups } from "@/modules/student/layout/StudentSidebar.jsx";
import { NAV_GROUPS as transportManagerNavGroups } from "@/modules/transport-manager/layout/TransportManagerSidebar.jsx";
import { NAV_ITEMS as facultyNavItems } from "@/modules/faculty/layout/FacultySidebar.jsx";

const STUDENT_PERMISSION_KEY_ALIASES = Object.freeze({
  examinations: "examination",
});

// The Student portal hides either Transport or Hostel according to a student's
// active facility allocation. The role matrix uses the hostel branch as the
// standard Student sidebar set; individual student visibility remains driven
// by the StudentProfileContext facility check in StudentSidebar.
export const STUDENT_SIDEBAR_NAVIGATION = Object.freeze(
  studentMenuGroups.flatMap(([section, links]) =>
    links
      .filter(([, path]) => path !== "transport")
      .map(([label, path, , moduleKey]) => ({
        id: STUDENT_PERMISSION_KEY_ALIASES[moduleKey] || moduleKey,
        sidebarModuleKey: moduleKey,
        label,
        route: `/student-dashboard${path ? `/${path}` : ""}`,
        section,
        availableActions: [ACTIONS.VIEW],
      })),
  ),
);

// Canonical Parent portal navigation. The parent dashboard and permission
// matrix use these stable IDs rather than generic administration labels.
export const PARENT_SIDEBAR_NAVIGATION = Object.freeze([
  { id: "parent-dashboard", label: "Dashboard", route: "/parent-dashboard", section: "Main", legacyPermissionKeys: ["dashboard"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-children", label: "My Children", route: "/parent-dashboard/children", section: "Student & Academics", legacyPermissionKeys: ["student-management"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-attendance", label: "Attendance", route: "/parent-dashboard/attendance", section: "Student & Academics", legacyPermissionKeys: ["attendance"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-academics-results", label: "Academics & Results", route: "/parent-dashboard/academics", section: "Student & Academics", legacyPermissionKeys: ["results"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-examinations", label: "Examinations", route: "/parent-dashboard/examinations", section: "Student & Academics", legacyPermissionKeys: ["examination"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-fees-payments", label: "Fees & Payments", route: "/parent-dashboard/fees", section: "Student & Academics", legacyPermissionKeys: ["fee-management"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-timetable", label: "Timetable", route: "/parent-dashboard/timetable", section: "Student & Academics", legacyPermissionKeys: ["timetable"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-communication", label: "Communication", route: "/parent-dashboard/communication", section: "Student & Academics", availableActions: [ACTIONS.VIEW] },
  { id: "parent-announcements-events", label: "Announcements & Events", route: "/parent-dashboard/announcements", section: "Student & Academics", legacyPermissionKeys: ["reports-analytics"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-documents", label: "Documents", route: "/parent-dashboard/documents", section: "Student & Academics", legacyPermissionKeys: ["certificates"], availableActions: [ACTIONS.VIEW] },
  { id: "parent-settings", label: "Settings", route: "/parent-dashboard/settings", section: "Settings", legacyPermissionKeys: ["settings"], availableActions: [ACTIONS.VIEW] },
]);

export const getParentNavigationItem = (route) =>
  PARENT_SIDEBAR_NAVIGATION.find((item) => item.route === route);

const TRANSPORT_MANAGER_LEGACY_KEYS = Object.freeze({
  "transport-manager-setup": ["transport"],
  "transport-manager-operations": ["transport"],
});

// Derived from the live Transport Manager sidebar. Setup and Operations have
// distinct navigation IDs while retaining the legacy `transport` grant as a
// read-compatible source for already saved permissions.
export const TRANSPORT_MANAGER_SIDEBAR_NAVIGATION = Object.freeze(
  transportManagerNavGroups.flatMap((group) =>
    group.items.map((item) => ({
      id: item.moduleKey,
      label: item.label,
      route: item.to,
      section: group.label,
      legacyPermissionKeys: TRANSPORT_MANAGER_LEGACY_KEYS[item.moduleKey] || [],
      availableActions: item.moduleKey === "transport-manager-setup" || item.moduleKey === "transport-manager-operations"
        ? [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]
        : [ACTIONS.VIEW],
    })),
  ),
);

const FACULTY_LEGACY_KEYS = Object.freeze({
  marks: ["marks-evaluation"],
  examduties: ["examination"],
  myattendance: ["staff-attendance"],
  leave: ["staff-leave-management"],
  salary: ["payroll"],
  reimbursements: ["reimbursement"],
  holidays: ["holiday-management"],
});

const FACULTY_ROUTE_SEGMENTS = Object.freeze({
  examduties: "exam-duties",
  myattendance: "my-attendance",
});

// Derived from the live Faculty sidebar so labels, groups, and display order
// remain aligned with the Faculty dashboard.
export const FACULTY_SIDEBAR_NAVIGATION = Object.freeze(
  facultyNavItems.map((item) => ({
    id: item.id,
    label: item.label,
    route: `/faculty-dashboard${item.id === "dashboard" ? "" : `/${FACULTY_ROUTE_SEGMENTS[item.id] || item.id}`}`,
    section: item.group,
    legacyPermissionKeys: FACULTY_LEGACY_KEYS[item.id] || [],
    availableActions: ["attendance", "marks"].includes(item.id)
      ? [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT]
      : [ACTIONS.VIEW],
  })),
);

// Canonical navigable Warden entries. Both the dashboard sidebar and the
// Roles & Permissions matrix use these stable IDs instead of display labels.
export const HOSTEL_WARDEN_NAVIGATION = Object.freeze([
  { id: "warden-dashboard", label: "Dashboard", route: "/warden-dashboard", section: "Overview", availableActions: [ACTIONS.VIEW] },
  { id: "warden-rooms-beds", label: "Rooms & Beds", route: "/warden-dashboard/rooms", section: "Hostel Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "warden-student-allocations", label: "Student Allocations", route: "/warden-dashboard/allocations", section: "Hostel Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "warden-hostel-attendance", label: "Hostel Attendance", route: "/warden-dashboard/attendance", section: "Hostel Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "warden-outpass-leaves", label: "Outpass & Leaves", route: "/warden-dashboard/leave-requests", section: "Hostel Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "warden-resident-students", label: "Resident Students", route: "/warden-dashboard/students", section: "Hostel Operations", availableActions: [ACTIONS.VIEW] },
  { id: "warden-hostel-reports", label: "Hostel Reports", route: "/warden-dashboard/reports", section: "Hostel Operations", availableActions: [ACTIONS.VIEW] },
  { id: "warden-my-attendance", label: "My Attendance", route: "/warden-dashboard/my-attendance", section: "My Workspace", availableActions: [ACTIONS.VIEW] },
  { id: "warden-staff-leave", label: "Staff Leave Management", route: "/warden-dashboard/my-leaves", section: "My Workspace", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "warden-holidays", label: "Holidays", route: "/warden-dashboard/holidays", section: "My Workspace", availableActions: [ACTIONS.VIEW] },
  { id: "warden-reimbursements", label: "Reimbursements", route: "/warden-dashboard/expenses", section: "My Workspace", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE] },
]);

export const getHostelWardenNavigationItem = (route) =>
  HOSTEL_WARDEN_NAVIGATION.find((item) => item.route === route);

// Keep the Accountant permission matrix in the same order and grouping as the
// Accountant portal sidebar.  A few sidebar entries share a backend permission
// module; `permissionKey` preserves that real permission when a row is edited.
export const ACCOUNTANT_SIDEBAR_NAVIGATION = Object.freeze([
  { id: "accountant-dashboard", permissionKey: "dashboard", label: "Dashboard", route: "/accountant-dashboard", section: "Accountant Portal", availableActions: [ACTIONS.VIEW] },
  { id: "accountant-fee-management", permissionKey: "fee-management", label: "Fee Management", route: "/accountant-dashboard/fees", section: "Finance", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "accountant-payment-history", permissionKey: "fee-management", label: "Payment History", route: "/accountant-dashboard/payments", section: "Finance", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "accountant-reimbursements", permissionKey: "reimbursement", label: "Reimbursements", route: "/accountant-dashboard/reimbursements", section: "Finance", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "accountant-payroll", permissionKey: "payroll", label: "Payroll", route: "/accountant-dashboard/payroll", section: "Finance", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "accountant-attendance-impact", permissionKey: "payroll", label: "Attendance Impact", route: "/accountant-dashboard/payroll/attendance-impact", section: "Finance", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "accountant-financial-reports", permissionKey: "reports-analytics", label: "Financial Reports", route: "/accountant-dashboard/reports", section: "Finance", availableActions: [ACTIONS.VIEW] },
  { id: "accountant-my-attendance", permissionKey: "staff-attendance", label: "My Attendance", route: "/accountant-dashboard/my-attendance", section: "Account", availableActions: [ACTIONS.VIEW] },
  { id: "accountant-staff-leave", permissionKey: "staff-leave-management", label: "Staff Leave", route: "/accountant-dashboard/leave", section: "Account", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "accountant-holidays", permissionKey: "holiday-management", label: "Holidays", route: "/accountant-dashboard/holidays", section: "Account", availableActions: [ACTIONS.VIEW] },
  { id: "accountant-profile", permissionKey: "profile", label: "My Profile", route: "/accountant-dashboard/profile", section: "Account", availableActions: [ACTIONS.VIEW] },
  { id: "accountant-settings", permissionKey: "settings", label: "Settings", route: "/accountant-dashboard/settings", section: "Account", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
]);

// The Examination Cell matrix mirrors the portal sidebar. `permissionKey`
// retains the module used by route guards while the matrix uses the sidebar
// label that an Examination Cell user actually sees.
export const EXAMINATION_CELL_SIDEBAR_NAVIGATION = Object.freeze([
  { id: "exam-cell-dashboard", permissionKey: "dashboard", label: "Dashboard", route: "/exam-cell-dashboard", section: "Overview", availableActions: [ACTIONS.VIEW] },
  { id: "exam-cell-examination", permissionKey: "examination", label: "Examination", route: "/exam-cell-dashboard/exams", section: "Examinations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "exam-cell-marks-entry", permissionKey: "marks-evaluation", label: "Marks Entry", route: "/exam-cell-dashboard/marks-entry", section: "Marks & Results", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "exam-cell-results", permissionKey: "results", label: "Results", route: "/exam-cell-dashboard/results", section: "Marks & Results", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "exam-cell-attendance", permissionKey: "attendance", label: "Attendance", route: "/exam-cell-dashboard/attendance", section: "Student Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "exam-cell-my-attendance", permissionKey: "staff-attendance", label: "My Attendance", route: "/exam-cell-dashboard/check-in-out", section: "Student Operations", availableActions: [ACTIONS.VIEW] },
  { id: "exam-cell-certificates", permissionKey: "certificates", label: "Certificates", route: "/exam-cell-dashboard/certificates", section: "Student Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "exam-cell-promotions", permissionKey: "promotion", label: "Promotions", route: "/exam-cell-dashboard/promotions", section: "Student Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "exam-cell-holiday-management", permissionKey: "holiday-management", label: "Holiday Management", route: "/exam-cell-dashboard/holidays", section: "Student Operations", availableActions: [ACTIONS.VIEW] },
  { id: "exam-cell-profile", permissionKey: "profile", label: "My Profile", route: "/exam-cell-dashboard/profile", section: "Reports & Account", availableActions: [ACTIONS.VIEW] },
  { id: "exam-cell-settings", permissionKey: "settings", label: "Settings", route: "/exam-cell-dashboard/settings", section: "Reports & Account", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
]);

// Driver dashboard navigation is tab-based rather than route-based. These
// rows intentionally mirror those tabs so the permission matrix speaks the
// same language as the Driver portal.
export const DRIVER_SIDEBAR_NAVIGATION = Object.freeze([
  { id: "driver-dashboard", permissionKey: "dashboard", label: "Dashboard", section: "Daily Operations", availableActions: [ACTIONS.VIEW] },
  { id: "driver-todays-trips", permissionKey: "transport", label: "Today's Trips", section: "Daily Operations", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "driver-route-stops", permissionKey: "transport", label: "My Route & Stops", section: "Daily Operations", availableActions: [ACTIONS.VIEW] },
  { id: "driver-live-navigation", permissionKey: "transport", label: "Live Navigation", section: "Daily Operations", availableActions: [ACTIONS.VIEW] },
  { id: "driver-student-manifest", permissionKey: "transport", label: "Student Manifest", section: "Daily Operations", availableActions: [ACTIONS.VIEW] },
  { id: "driver-my-attendance", permissionKey: "staff-attendance", label: "My Attendance", section: "My Workspace", availableActions: [ACTIONS.VIEW] },
  { id: "driver-leave-management", permissionKey: "staff-leave-management", label: "Leave Management", section: "My Workspace", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "driver-my-payslips", permissionKey: "payroll", label: "My Payslips", section: "My Workspace", availableActions: [ACTIONS.VIEW] },
  { id: "driver-trip-reports", permissionKey: "reports-analytics", label: "Trip Reports", section: "My Workspace", availableActions: [ACTIONS.VIEW] },
  { id: "driver-holidays", permissionKey: "holiday-management", label: "Holidays", section: "My Workspace", availableActions: [ACTIONS.VIEW] },
  { id: "driver-profile", permissionKey: "profile", label: "Driver Profile", section: "Account", availableActions: [ACTIONS.VIEW] },
  { id: "driver-settings", permissionKey: "settings", label: "Settings", section: "Account", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
]);

// Inventory Manager has a single, compact sidebar. Keep each item visible in
// the matrix while mapping related stock workflows to their shared inventory
// permission module.
export const INVENTORY_MANAGER_SIDEBAR_NAVIGATION = Object.freeze([
  { id: "inventory-dashboard", permissionKey: "dashboard", label: "Dashboard", section: "Inventory Portal", availableActions: [ACTIONS.VIEW] },
  { id: "inventory-items", permissionKey: "inventory-management", label: "Items", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "inventory-stock-in", permissionKey: "inventory-management", label: "Stock In", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "inventory-stock-out", permissionKey: "inventory-management", label: "Stock Out", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "inventory-suppliers", permissionKey: "inventory-management", label: "Suppliers", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "inventory-categories", permissionKey: "inventory-management", label: "Categories", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
  { id: "inventory-purchase-orders", permissionKey: "inventory-management", label: "Purchase Orders", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "inventory-returns", permissionKey: "inventory-management", label: "Returns", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "inventory-reports", permissionKey: "inventory-management", label: "Reports", section: "Inventory Portal", availableActions: [ACTIONS.VIEW] },
  { id: "inventory-leave-management", permissionKey: "staff-leave-management", label: "Leave Management", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
  { id: "inventory-my-payslips", permissionKey: "payroll", label: "My Payslips", section: "Inventory Portal", availableActions: [ACTIONS.VIEW] },
  { id: "inventory-notifications", permissionKey: "dashboard", label: "Notifications", section: "Inventory Portal", availableActions: [ACTIONS.VIEW] },
  { id: "inventory-profile", permissionKey: "profile", label: "Profile", section: "Inventory Portal", availableActions: [ACTIONS.VIEW] },
  { id: "inventory-settings", permissionKey: "settings", label: "Settings", section: "Inventory Portal", availableActions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
]);

// Permission-matrix catalog selection for every role supported by the CMS.
// `null` means the role uses the complete main dashboard menu; an empty list
// means that role has no configurable dashboard navigation.
export const ROLE_SIDEBAR_MODULE_KEYS = Object.freeze({
  SUPER_ADMIN: null,
  ADMIN: null,
  PRINCIPAL: null,
  DEAN: null,
  HOD: ["dashboard", "profile", "timetable", "subject-management", "attendance", "marks-evaluation", "examination", "staff-attendance", "staff-leave-management", "payroll", "reimbursement", "holiday-management", "settings"],
  FACULTY: FACULTY_SIDEBAR_NAVIGATION.map((item) => item.id),
  STUDENT: STUDENT_SIDEBAR_NAVIGATION.map((item) => item.id),
  PARENT: PARENT_SIDEBAR_NAVIGATION.map((item) => item.id),
  ACCOUNTANT: ACCOUNTANT_SIDEBAR_NAVIGATION.map((item) => item.id),
  EXAMINATION_CELL: EXAMINATION_CELL_SIDEBAR_NAVIGATION.map((item) => item.id),
  HOSTEL_WARDEN: HOSTEL_WARDEN_NAVIGATION.map((item) => item.id),
  BUS_DRIVER: DRIVER_SIDEBAR_NAVIGATION.map((item) => item.id),
  OFFICE_STAFF: ["dashboard", "student-management", "staff-management", "certificates", "reports-analytics", "profile", "settings"],
  ADMISSION_STAFF: ["dashboard", "student-admission", "student-management", "certificates", "profile", "settings"],
  TRANSPORT_MANAGER: TRANSPORT_MANAGER_SIDEBAR_NAVIGATION.map((item) => item.id),
  LAB_ASSISTANT: ["dashboard", "inventory-management", "profile", "staff-attendance", "staff-leave-management", "holiday-management", "settings"],
  INVENTORY_MANAGER: INVENTORY_MANAGER_SIDEBAR_NAVIGATION.map((item) => item.id),
  UNASSIGNED: [],
});
