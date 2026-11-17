import NotificationBell from '@/components/common/NotificationBell.jsx';
import CampusBrandImage from "@/components/common/CampusBrandImage.jsx";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, ChevronDown, Settings, User, LogOut, CheckCircle2, Building, ShieldCheck,
  Building2, LayoutDashboard, Users, BarChart3, BedDouble, AlertTriangle, ArrowLeftRight,
  ReceiptIndianRupee, Boxes, KeyRound,
} from "lucide-react";
import ChangePasswordModal from "@/modules/exam-cell/components/ChangePasswordModal.jsx";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import TransparentAvatar from "@/components/common/TransparentAvatar.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useSidebar } from "@/hooks/useSidebar.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import CampusContext from "@/context/CampusContext.jsx";
import { clearAuthSession, getAuthUser, getAuthToken } from "@/features/authStorage.js";
import { env } from "@/config/env.js";
import notificationHubService from "@/services/notificationHubService.js";
import { isWardenRole, isNonTeachingRole } from "@/routes/ProtectedRoute.jsx";
import { isExamCellRole } from "@/modules/exam-cell/navigation.js";
import { can, hasRole } from "@/features/rolesPermissions/permissionUtils.jsx";
import { ACTIONS } from "@/features/rolesPermissions/rolesPermissions.constants.js";
import { reimbursementApi } from "@/api/staffApi";
import { getCurrentUserPermissions } from "@/features/rolesPermissions/rolesPermissions.service.js";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import pirnavCollegeCrest from "@/assets/pirnav-college-crest.png";
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import boardAcademicYearIcon from "@/assets/sidebar-3d/board-academic-year.png";
import subjectsIcon from "@/assets/sidebar-3d/subjects.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
import transportBusIcon from "@/assets/sidebar-3d/transport-bus.png";
import marksEvaluationIcon from "@/assets/sidebar-3d/marks-evaluation.png";
import resultsIcon from "@/assets/sidebar-3d/results.png";
import promotionIcon from "@/assets/sidebar-3d/promotion.png";
import feeManagementIcon from "@/assets/sidebar-3d/fee-management.png";
import certificatesIcon from "@/assets/sidebar-3d/certificates.png";
import reportsAnalyticsIcon from "@/assets/sidebar-3d/reports-analytics.png";
import sectionsIcon from "@/assets/dashboard-3d/total-sections.png";
import staffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import allocateSectionIcon from "@/assets/dashboard-3d/create-section.png";
import studentsIcon from "@/assets/dashboard-3d/total-students.png";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import examinationIcon from "@/assets/dashboard-3d/create-exam.png";
import managementIconsSprite from "@/assets/sidebar-3d/management-icons-sprite.png";
import settingsBoardAcademicYearIcon from "@/assets/settings-3d/board-academic-year.png";
import settingsNumberSeriesIcon from "@/assets/settings-3d/number-series.png";
import settingsTemplatesIcon from "@/assets/settings-3d/templates.png";
import settingsAuditLogsIcon from "@/assets/settings-3d/audit-logs.png";
import settingsRolesPermissionsIcon from "@/assets/settings-3d/roles-permissions.png";
import hostelManagementIcon from "@/assets/sidebar-3d/hostel-management.svg";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import "./DashboardLayout.css";

export const generatedSidebarIcons = {
  department: { src: managementIconsSprite, position: "0% 0%" },
  staffAttendance: { src: managementIconsSprite, position: "50% 0%" },
  staffLeave: { src: managementIconsSprite, position: "100% 0%" },
  payroll: { src: managementIconsSprite, position: "0% 100%" },
  admission: { src: managementIconsSprite, position: "50% 100%" },
  groups: { src: managementIconsSprite, position: "100% 100%" },
};

export const adminIconAssets = {
  dashboard: dashboardIcon,
  feeManagement: feeManagementIcon,
  paymentHistory: feeManagementIcon,
  payroll: generatedSidebarIcons.payroll,
  attendanceImpact: generatedSidebarIcons.staffAttendance,
  financialReports: reportsAnalyticsIcon,
  profile: studentsIcon,
  notifications: navbarNotificationsIcon,
  menu: navbarMenuIcon,
  search: navbarSearchIcon,
  board: navbarBoardIcon,
  academicYear: navbarAcademicYearIcon,
};

const PAGE_TITLE_ICON_OVERRIDES = Object.freeze({
  "board & academic year management": settingsBoardAcademicYearIcon,
  "id & number series": settingsNumberSeriesIcon,
  templates: settingsTemplatesIcon,
  "audit logs": settingsAuditLogsIcon,
  "faculty reimbursement": reimbursementIcon,
  reimbursement: reimbursementIcon,
  "inventory management": sectionsIcon,
});

const PAGE_ICON_ROUTE_ALIASES = [
  { path: "/dashboard/board-academic-year", icon: settingsBoardAcademicYearIcon },
  { path: "/dashboard/settings/number-series", icon: settingsNumberSeriesIcon },
  { path: "/dashboard/settings/templates", icon: settingsTemplatesIcon },
  { path: "/dashboard/settings/audit-logs", icon: settingsAuditLogsIcon },
  { path: "/dashboard/settings/roles-permissions", icon: settingsRolesPermissionsIcon },
  { path: "/dashboard/designations", icon: generatedSidebarIcons.department },
  { path: "/dashboard/promotions", icon: promotionIcon },
  { path: "/dashboard/payroll", icon: generatedSidebarIcons.payroll },
  { path: "/dashboard/staff-salary", icon: generatedSidebarIcons.payroll },
  { path: "/dashboard/reimbursement", icon: reimbursementIcon },
  { path: "/dashboard/finance/reimbursement", icon: reimbursementIcon },
  { path: "/dashboard/inventory-management", icon: sectionsIcon },
  { path: "/dashboard/inventory", icon: sectionsIcon },
  { path: "/warden-dashboard/blocks", icon: hostelManagementIcon },
  { path: "/warden-dashboard/transfers", icon: promotionIcon },
  { path: "/warden-dashboard/wardens", icon: staffIcon },
  { path: "/warden-dashboard/students", icon: studentsIcon },
  { path: "/warden-dashboard/rooms", icon: sectionsIcon },
  { path: "/warden-dashboard/beds", icon: sectionsIcon },
  { path: "/warden-dashboard/allocations", icon: allocateSectionIcon },
  { path: "/warden-dashboard/leave-requests", icon: generatedSidebarIcons.staffLeave },
  { path: "/warden-dashboard/complaints", icon: settingsAuditLogsIcon },
  { path: "/warden-dashboard/attendance", icon: attendanceIcon },
  { path: "/warden-dashboard/reports", icon: reportsAnalyticsIcon },
  { path: "/warden-dashboard/profile", icon: staffIcon },
  { path: "/warden-dashboard", icon: dashboardIcon },
  { path: "/exam-cell-dashboard/exams", icon: examinationIcon },
  { path: "/exam-cell-dashboard/exam-timetable", icon: timetableIcon },
  { path: "/exam-cell-dashboard/hall-allocation", icon: sectionsIcon },
  { path: "/exam-cell-dashboard/hall-tickets", icon: certificatesIcon },
  { path: "/exam-cell-dashboard/marks-entry", icon: marksEvaluationIcon },
  { path: "/exam-cell-dashboard/marks-verification", icon: reportsAnalyticsIcon },
  { path: "/exam-cell-dashboard/results", icon: resultsIcon },
  { path: "/exam-cell-dashboard/publish-results", icon: promotionIcon },
  { path: "/exam-cell-dashboard/attendance", icon: attendanceIcon },
  { path: "/exam-cell-dashboard/check-in-out", icon: generatedSidebarIcons.staffAttendance },
  { path: "/exam-cell-dashboard/my-attendance", icon: generatedSidebarIcons.staffAttendance },
  { path: "/exam-cell-dashboard/certificates", icon: certificatesIcon },
  { path: "/exam-cell-dashboard/promotions", icon: promotionIcon },
  { path: "/exam-cell-dashboard/holidays", icon: holidayManagementIcon },
  { path: "/exam-cell-dashboard/reports", icon: reportsAnalyticsIcon },
  { path: "/exam-cell-dashboard/profile", icon: staffIcon },
  { path: "/exam-cell-dashboard", icon: dashboardIcon },
];

function SidebarIcon({ icon, sub = false }) {
  if (!icon) return null;
  return <ThreeDIcon icon={icon} size={sub ? 17 : 20} className={sub ? "cms-nav-3d-icon-sub" : ""} />;
}

function PageTitleIcon({ icon }) {
  if (!icon) return null;
  return <ThreeDIcon icon={icon} size={26} className="cms-page-title-icon" />;
}

function NavbarIcon({ src, name, size = 20 }) {
  return <ThreeDIcon icon={src || name} size={size} className="cms-navbar-3d-icon" />;
}

export const menu = [
  {
    section: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: dashboardIcon, moduleKey: "dashboard" },
    ],
  },
  {
    section: "Academic",
    items: [
      { to: "/dashboard/courses", label: "Group Management", icon: generatedSidebarIcons.groups, moduleKey: "group-management", screenKey: "courses" },
      { to: "/dashboard/subjects", label: "Subject Management", icon: subjectsIcon, moduleKey: "subject-management" },
      { to: "/dashboard/sections", label: "Section & Room", icon: sectionsIcon, moduleKey: "section-room" },
      { to: "/dashboard/timetable", label: "Timetable", icon: timetableIcon, moduleKey: "timetable" },
      { to: "/dashboard/academic-calendar", label: "Academic Calendar", icon: timetableIcon },
      { to: "/dashboard/holidays", label: "Holiday Management", icon: holidayManagementIcon, moduleKey: "holiday-management" },
      { to: "/dashboard/inventory-management", label: "Inventory Management", icon: sectionsIcon, moduleKey: "inventory-management" },
    ],
  },
  {
    section: "Student",
    items: [
      { to: "/dashboard/admission", label: "Student Admission", icon: generatedSidebarIcons.admission, moduleKey: "student-admission" },
      { to: "/dashboard/students", label: "Student Management", icon: studentsIcon, moduleKey: "student-management" },
      { to: "/dashboard/section-allocation", label: "Section Allocation", icon: allocateSectionIcon, moduleKey: "section-allocation" },
      { to: "/dashboard/attendance/student", label: "Attendance", icon: attendanceIcon, moduleKey: "attendance" },
      { to: "/dashboard/promotion", label: "Promotion", icon: promotionIcon, moduleKey: "promotion" },
      { to: "/dashboard/transport", label: "Transport", icon: transportBusIcon, moduleKey: "transport" },
    ],
  },
  {
    section: "Staff",
    items: [
      { to: "/dashboard/staff", label: "Staff Management", icon: staffIcon, moduleKey: "staff-management" },
      { to: "/dashboard/departments", label: "Department & Designation", icon: generatedSidebarIcons.department, moduleKey: "department-designation" },
      { to: "/dashboard/attendance/staff", label: "Staff Attendance", icon: generatedSidebarIcons.staffAttendance, moduleKey: "staff-attendance" },
      { to: "/dashboard/leave-management?tab=staff", label: "Staff Leave Management", icon: generatedSidebarIcons.staffLeave, moduleKey: "staff-leave-management" },
      { to: "/dashboard/reimbursements", label: "Staff Reimbursements", icon: generatedSidebarIcons.payroll, moduleKey: "reimbursement" },
    ],
  },
  {
    section: "Examinations",
    items: [
      { to: "/dashboard/examinations", label: "Examination", icon: examinationIcon, moduleKey: "examination" },
      { to: "/dashboard/marks-entry", label: "Marks Evaluation", icon: marksEvaluationIcon, moduleKey: "marks-evaluation" },
      { to: "/dashboard/results", label: "Results", icon: resultsIcon, moduleKey: "results" },
    ],
  },
  {
    section: "Finance",
    items: [
      { to: "/dashboard/fee-structure", label: "Fee Management", icon: feeManagementIcon, moduleKey: "fee-management" },
      { to: "/dashboard/payroll", label: "Payroll", icon: generatedSidebarIcons.payroll, moduleKey: "payroll" },
      { to: "/dashboard/reimbursement", label: "Reimbursement", icon: reimbursementIcon, moduleKey: "reimbursement" },
    ],
  },
  {
    section: "Documents & Reports",
    items: [
      { to: "/dashboard/certificates", label: "Certificates", icon: certificatesIcon, moduleKey: "certificates" },
      { to: "/dashboard/reports", label: "Reports & Analytics", icon: reportsAnalyticsIcon, moduleKey: "reports-analytics" },
    ],
  },
  {
    section: "Hostel Management",
    items: [
      { to: "/hostel", label: "Hostel Management", icon: hostelManagementIcon, moduleKey: "hostel-management" },
    ],
  },
  {
    section: "Enquiry Management",
    items: [
      {
        to: "/dashboard/enquiry-management",
        label: "Enquiry Management",
        icon: settingsTemplatesIcon,
        moduleKey: "enquiry-management",
      },
    ],
  },
  {
    section: "Administration",
    items: [
      {
        to: "/dashboard/settings",
        label: "Settings",
        icon: boardAcademicYearIcon,
        moduleKey: "settings",
      },
    ],
  },
];

export const parentMenu = [
  {
    section: "Main",
    items: [
      { to: "/parent-dashboard", label: "Dashboard", icon: dashboardIcon },
    ],
  },
  {
    section: "Student & Academics",
    items: [
      { to: "/parent-dashboard/children", label: "My Children", icon: studentsIcon },
      { to: "/parent-dashboard/attendance", label: "Attendance", icon: attendanceIcon },
      { to: "/parent-dashboard/academics", label: "Academics & Results", icon: subjectsIcon },
      { to: "/parent-dashboard/examinations", label: "Examinations", icon: examinationIcon },
      { to: "/parent-dashboard/fees", label: "Fees & Payments", icon: feeManagementIcon },
      { to: "/parent-dashboard/timetable", label: "Timetable", icon: timetableIcon },
      { to: "/parent-dashboard/communication", label: "Communication", icon: marksEvaluationIcon },
      { to: "/parent-dashboard/announcements", label: "Announcements & Events", icon: reportsAnalyticsIcon },
      { to: "/parent-dashboard/documents", label: "Documents", icon: certificatesIcon },
    ],
  },
];

export const wardenMenu = [
  {
    section: "Overview",
    items: [
      { to: "/warden-dashboard", label: "Dashboard", icon: dashboardIcon },
    ],
  },
  {
    section: "Hostel Operations",
    items: [
      { to: "/warden-dashboard/rooms", label: "Rooms & Beds", icon: sectionsIcon },
      { to: "/warden-dashboard/allocations", label: "Student Allocations", icon: allocateSectionIcon },
      { to: "/warden-dashboard/attendance", label: "Hostel Attendance", icon: attendanceIcon },
      { to: "/warden-dashboard/leave-requests", label: "Outpass & Leaves", icon: generatedSidebarIcons.staffLeave },
      { to: "/warden-dashboard/students", label: "Resident Students", icon: studentsIcon },
      { to: "/warden-dashboard/reports", label: "Hostel Reports", icon: reportsAnalyticsIcon },
    ],
  },
  {
    section: "My Workspace",
    items: [
      { to: "/warden-dashboard/my-attendance", label: "My Attendance", icon: attendanceIcon },
      { to: "/warden-dashboard/my-leaves", label: "Staff Leave Management", icon: generatedSidebarIcons.staffLeave },
      { to: "/warden-dashboard/holidays", label: "Holidays", icon: holidayManagementIcon },
      { to: "/warden-dashboard/expenses", label: "Expenses & Reimbursements", icon: reimbursementIcon },
    ],
  },
];

export const principalMenu = menu.map((group) => (
  group.section === "Overview"
    ? { ...group, items: [{ ...group.items[0], to: "/principal-dashboard" }] }
    : group
));

export const examCellMenu = [
  {
    section: "Overview",
    items: [{ to: "/exam-cell-dashboard", label: "Dashboard", icon: dashboardIcon, moduleKey: "dashboard" }],
  },
  {
    section: "Examinations",
    items: [
      { to: "/exam-cell-dashboard/exams", label: "Examination", icon: examinationIcon, moduleKey: "examinations" },
      { to: "/exam-cell-dashboard/hall-allocation", label: "Hall Allocation", icon: sectionsIcon, moduleKey: "examinations", screenKey: "hall-allocation" },
      { to: "/exam-cell-dashboard/hall-tickets", label: "Hall Tickets", icon: certificatesIcon, moduleKey: "examinations", screenKey: "hall-tickets" },
    ],
  },
  {
    section: "Marks & Results",
    items: [
      { to: "/exam-cell-dashboard/marks-entry", label: "Marks Entry", icon: marksEvaluationIcon, moduleKey: "marks-evaluation" },
      { to: "/exam-cell-dashboard/results", label: "Results", icon: resultsIcon, moduleKey: "results" },
    ],
  },
  {
    section: "Student Operations",
    items: [
      { to: "/exam-cell-dashboard/attendance", label: "Attendance", icon: attendanceIcon, moduleKey: "attendance" },
      { to: "/exam-cell-dashboard/check-in-out", label: "My Attendance", icon: generatedSidebarIcons.staffAttendance, moduleKey: "staff-attendance", screenKey: "my-attendance" },
      { to: "/exam-cell-dashboard/certificates", label: "Certificates", icon: certificatesIcon, moduleKey: "certificates" },
      { to: "/exam-cell-dashboard/promotions", label: "Promotions", icon: promotionIcon, moduleKey: "promotion" },
      { to: "/exam-cell-dashboard/holidays", label: "Holiday Management", icon: holidayManagementIcon, moduleKey: "holiday-management" },
    ],
  },
  {
    section: "Reports & Account",
    items: [
      { to: "/exam-cell-dashboard/reports", label: "Exam Reports", icon: reportsAnalyticsIcon, moduleKey: "reports-analytics" },
      { to: "/exam-cell-dashboard/profile", label: "My Profile", icon: staffIcon, moduleKey: "profile" },
      { to: "/exam-cell-dashboard/settings", label: "Settings", icon: settingsBoardAcademicYearIcon, moduleKey: "settings" },
    ],
  },
];

export { isExamCellRole };

const SIDEBAR_SCROLL_KEY = "cms_sidebar_scroll_top";
const NOTIFICATION_REFRESH_INTERVAL = 60_000;
const EMPTY_NOTIFICATION_SOURCES = [];
const EMPTY_CAMPUS_CONTEXT = Object.freeze({
  campuses: [],
  activeCampuses: [],
  selectedCampus: null,
  setSelectedCampus: () => undefined,
});
const MOCK_NOTIFICATIONS = [
  { id: "admin-notif-1", title: "New Staff Reimbursement Request", count: 1, to: "/dashboard/reimbursements", label: "reimbursements" }
];
const PARENT_NOTIFICATIONS = [
  { id: "pn-1", title: "Fee Balance Reminder", count: 1, to: "/parent-dashboard/fees", label: "fee payment" },
  { id: "pn-2", title: "Upcoming Examinations", count: 5, to: "/parent-dashboard/examinations", label: "exam timetable" },
];
const PENDING_STATUSES = new Set(["pending", "draft", "requested", "generated", "reviewed", "new", "created", "incomplete", "unpublished"]);

const unwrapNotificationPayload = (payload) => {
  let value = payload;
  const seen = new Set();
  while (value && typeof value === "object" && !Array.isArray(value) && !seen.has(value)) {
    seen.add(value);
    const next = value.data ?? value.Data ?? value.result ?? value.Result;
    if (next === undefined || next === value) break;
    value = next;
  }
  return value;
};

const notificationRows = (payload) => {
  const value = unwrapNotificationPayload(payload);
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const notificationStatus = (item = {}) => String(item.status ?? item.Status ?? item.workflowStatus ?? item.WorkflowStatus ?? "").trim().toLowerCase();
const pendingRowCount = (payload, predicate = (item) => PENDING_STATUSES.has(notificationStatus(item))) => notificationRows(payload).filter(predicate).length;

const createSearchIndex = (items) => items.flatMap((g) =>
  g.items.flatMap((item) => [
    { to: item.to, label: item.label, section: g.section },
    ...(item.children || []).map((c) => ({ to: c.to, label: c.label, section: item.label })),
  ]),
);

const searchIndex = createSearchIndex(menu);

const parentSearchIndex = [
  ...parentMenu.flatMap((g) =>
    g.items.flatMap((item) => [
      { to: item.to, label: item.label, section: g.section },
    ]),
  ),
  { to: "/parent-dashboard/academics", label: "Results & Marks Memo", section: "Student & Academics" },
  { to: "/parent-dashboard/notifications", label: "Notifications", section: "Student & Academics" },
  { to: "/parent-dashboard/profile", label: "Profile", section: "Account" },
  { to: "/parent-dashboard/settings", label: "Settings", section: "Account" },
];

const wardenSearchIndex = [
  ...wardenMenu.flatMap((g) =>
    g.items.flatMap((item) => [
      { to: item.to, label: item.label, section: g.section },
    ]),
  ),
  { to: "/warden-dashboard/overview", label: "Overview", section: "Overview" },
  { to: "/warden-dashboard/beds", label: "Bed Allocation", section: "Hostel Operations" },
  { to: "/warden-dashboard/profile", label: "My Profile", section: "Account" },
];

const examCellSearchIndex = createSearchIndex(examCellMenu);

const breadcrumbLinkForLabel = (label) =>
  searchIndex.find((item) => item.label.toLowerCase() === String(label).toLowerCase())?.to;

const normalizeBreadcrumbLabel = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const breadcrumbKey = (value) => normalizeBreadcrumbLabel(value).toLowerCase();

const menuBreadcrumbForPath = (pathname, sourceMenu = menu) => {
  let bestMatch = null;
  const consider = (to, labels, icon) => {
    const [path] = to.split("?");
    let matches = false;
    if (path === "/dashboard") {
      matches = pathname === "/dashboard";
    } else if (path === "/parent-dashboard") {
      matches = pathname === "/parent-dashboard";
    } else if (path === "/dashboard/attendance" || path === "/dashboard/attendance/student") {
      matches =
        !pathname.startsWith("/dashboard/attendance/staff") &&
        (pathname === "/dashboard/attendance" ||
          pathname === "/dashboard/attendance/student" ||
          pathname.startsWith("/dashboard/attendance/student/"));
    } else if (path === "/dashboard/attendance/staff") {
      matches =
        pathname === "/dashboard/attendance/staff" ||
        pathname.startsWith("/dashboard/attendance/staff/");
    } else {
      matches = pathname === path || pathname.startsWith(`${path}/`);
    }
    if (!matches) return;
    const score = path.length + (pathname === path ? 10_000 : 0);
    if (!bestMatch || score > bestMatch.score) bestMatch = { to, labels, icon, score };
  };

  const activeMenus = pathname.startsWith("/parent-dashboard")
    ? parentMenu
    : pathname.startsWith("/principal-dashboard")
    ? principalMenu
    : pathname.startsWith("/warden")
    ? wardenMenu
    : pathname.startsWith("/exam-cell-dashboard")
    ? examCellMenu
    : menu;
  activeMenus.forEach((group) => {
    group.items.forEach((item) => {
      consider(item.to, [group.section, item.label], item.icon);
      (item.children || []).forEach((child) => {
        if (child.to !== item.to) consider(child.to, [group.section, item.label, child.label], child.icon);
      });
    });
  });

  return bestMatch;
};

const menuIconForTitle = (title, sourceMenu = menu) => {
  const titleKey = breadcrumbKey(title);
  for (const group of sourceMenu) {
    for (const item of group.items) {
      if (breadcrumbKey(item.label) === titleKey) return item.icon;
      for (const child of item.children || []) {
        if (breadcrumbKey(child.label) === titleKey) return child.icon;
      }
    }
  }
  return undefined;
};

const pageIconForPathAlias = (pathname) => {
  let match;
  PAGE_ICON_ROUTE_ALIASES.forEach((alias) => {
    if (pathname !== alias.path && !pathname.startsWith(`${alias.path}/`)) return;
    if (!match || alias.path.length > match.path.length) match = alias;
  });
  return match?.icon;
};

const uniqueBreadcrumbLabels = (labels, currentTitle) => {
  const titleKey = breadcrumbKey(currentTitle);
  const seen = new Set();
  return labels.flatMap((label) => {
    const normalized = normalizeBreadcrumbLabel(label);
    const key = breadcrumbKey(normalized);
    if (!key || key === "home" || key === titleKey || seen.has(key)) return [];
    seen.add(key);
    return [normalized];
  });
};

function readUser() {
  return getAuthUser();
}

function isPrincipalRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "principal" || normalized.includes("principal");
}

function initials(name = "CMS Admin") {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export default function DashboardLayout({
  title,
  subtitle,
  breadcrumb = [],
  backLink,
  backLinkPosition = "above",
  actions,
  children,
  excludeNotificationSources = EMPTY_NOTIFICATION_SOURCES,
  menuOverride,
  searchIndexOverride,
  profilePath,
  settingsPath,
  showSettingsAction = true,
  showCampusSelector = true,
  showBoardSelector = true,
  showAcademicYearSelector = true,
}) {
  const { ready, navOpen, setNavOpen, facultyOpen, setFacultyOpen } = useSidebar();
  const {
    boards,
    boardsLoading,
    boardsError,
    academicYears,
    academicYearsLoading,
    academicYearsError,
    selectedBoard,
    selectedAcademicYear,
    setSelectedBoard,
    setSelectedAcademicYear,
  } = useAcademicContext();
  const campusContext = useContext(CampusContext) || EMPTY_CAMPUS_CONTEXT;
  const { campuses, activeCampuses, selectedCampus, setSelectedCampus } = campusContext;

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const actionsRef = useRef(null);
  const searchRef = useRef(null);
  const campusRef = useRef(null);
  const boardRef = useRef(null);
  const yearRef = useRef(null);
  const sidebarNavRef = useRef(null);
  const savedScrollTopRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [currentUser, setCurrentUser] = useState(() => readUser());
  const user = currentUser;

  useEffect(() => {
    if (!currentUser || hasRole("SUPER_ADMIN", currentUser)) return;

    let isMounted = true;
    const fetchPerms = () => {
      getCurrentUserPermissions()
        .then((res) => {
          if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const updated = { ...currentUser, permissions: res.data };
            try {
              for (const storage of [window.localStorage, window.sessionStorage]) {
                if (storage.getItem("user")) storage.setItem("user", JSON.stringify(updated));
              }
            } catch {}
            setCurrentUser(updated);
          }
        })
        .catch((err) => {
          console.warn("Could not load current user permissions:", err?.message);
        });
    };

    fetchPerms();

    const handleUpdate = () => fetchPerms();
    window.addEventListener("roles-updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("roles-updated", handleUpdate);
    };
  }, []);

  // Live profile photo and storage synchronization across sessions and tabs
  useEffect(() => {
    let active = true;

    const fetchLiveUserPhoto = () => {
      const u = readUser();
      if (!u) return;
      const isAdminUser = u.isAdmin || String(u.role || "").toLowerCase().includes("admin") || u.roleType === "admin";
      if (isAdminUser) {
        apiClient.get("/api/Admin/profile").then(res => {
          if (!active) return;
          const dataObj = res.data?.data || res.data?.Data || res.data;
          const photo = dataObj?.photoPath || dataObj?.PhotoPath || dataObj?.photoUrl || dataObj?.PhotoUrl;
          if (photo) {
            const current = readUser() || u;
            if (current.photoUrl !== photo) {
              const updated = { ...current, photoUrl: photo, photoPath: photo, photo: photo };
              try {
                if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updated));
                if (sessionStorage.getItem("user")) sessionStorage.setItem("user", JSON.stringify(updated));
              } catch {}
              setCurrentUser(updated);
            }
          }
        }).catch(() => {});
      } else if (u.staffId) {
        apiClient.get(`/api/v1/staff/${u.staffId}`).then(res => {
          if (!active) return;
          const dataObj = res.data?.data || res.data?.Data || res.data;
          const photo = dataObj?.photoUrl || dataObj?.PhotoUrl || dataObj?.profilePhoto || dataObj?.ProfilePhoto || dataObj?.photoPath || dataObj?.PhotoPath;
          if (photo) {
            const current = readUser() || u;
            if (current.photoUrl !== photo) {
              const updated = { ...current, photoUrl: photo, photoPath: photo, photo: photo };
              try {
                if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updated));
                if (sessionStorage.getItem("user")) sessionStorage.setItem("user", JSON.stringify(updated));
              } catch {}
              setCurrentUser(updated);
            }
          }
        }).catch(() => {});
      }
    };

    fetchLiveUserPhoto();

    const handleStorageUpdate = () => {
      if (!active) return;
      setCurrentUser(readUser());
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("user-profile-updated", handleStorageUpdate);

    return () => {
      active = false;
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("user-profile-updated", handleStorageUpdate);
    };
  }, []);
  const isWarden = isWardenRole(user?.role, user) || pathname.startsWith("/warden");
  const isAdmin = Boolean(user?.isAdmin || String(user?.role || "").toLowerCase().includes("admin"));
  const isWardenDashboard = pathname.startsWith("/warden") || (isWarden && !isAdmin);
  const isParent = !isWarden && (String(user?.role || "").toLowerCase() === "parent" || pathname.startsWith("/parent-dashboard"));
  const isPrincipal = !isWarden && (isPrincipalRole(user?.role) || pathname.startsWith("/principal-dashboard"));
  const isPrincipalDashboard = pathname.startsWith("/principal-dashboard") || (isPrincipal && !isAdmin && !isWardenDashboard);
  const isExamCell = !isWarden && (isExamCellRole(user?.role) || pathname.startsWith("/exam-cell-dashboard"));

  useEffect(() => {
    document.documentElement.removeAttribute("data-theme-role");
    try {
      localStorage.removeItem("cms-accent-theme");
    } catch {}
  }, []);

  const activeMenu = useMemo(() => {
    let base = menuOverride;
    if (!base) {
      if (isWarden) base = wardenMenu;
      else if (isParent) base = parentMenu;
      else if (isPrincipal) base = principalMenu;
      else if (isExamCell) base = examCellMenu;
      else base = menu;
    }
    if (user && !hasRole("SUPER_ADMIN", user) && !isExamCell && (user.permissions || user.rolePermissions)) {
      return base
        .map((group) => ({
          ...group,
          items: (group.items || []).filter((item) => {
            if (!item.moduleKey || item.moduleKey === "dashboard") return true;
            if (item.moduleKey === "enquiry-management" && (hasRole("ADMIN", user) || hasRole("PRINCIPAL", user))) return true;
            return can(item.moduleKey, ACTIONS.VIEW, user?.permissions, user, item.screenKey);
          }),
        }))
        .filter((group) => group.items.length > 0);
    }
    return base;
  }, [isWarden, isParent, isPrincipal, isExamCell, menuOverride, user]);
  const currentSearchIndex = searchIndexOverride || (menuOverride ? createSearchIndex(activeMenu) : isWarden ? wardenSearchIndex : isParent ? parentSearchIndex : isPrincipal ? createSearchIndex(activeMenu) : isExamCell ? examCellSearchIndex : searchIndex);
  const resolvedProfilePath = profilePath || (isWarden ? "/warden-dashboard/profile" : isParent ? "/parent-dashboard/profile" : isExamCell ? "/exam-cell-dashboard/profile" : "/dashboard/settings/my-profile");
  const resolvedSettingsPath = settingsPath === undefined ? (isWarden ? "/warden-dashboard" : isParent ? "/parent-dashboard/settings" : isExamCell ? "/exam-cell-dashboard/settings" : "/dashboard/settings") : settingsPath;
  const canManageAcademicContext = !isParent && !isWarden && !isExamCell && !menuOverride;
  const pageMenuItem = useMemo(() => menuBreadcrumbForPath(pathname, activeMenu), [pathname, activeMenu]);
  const pageIcon = PAGE_TITLE_ICON_OVERRIDES[breadcrumbKey(title)] ?? pageIconForPathAlias(pathname) ?? menuIconForTitle(title, activeMenu) ?? pageMenuItem?.icon;
  const pageTitleNode = title ? <div className="cms-page-title">{pageIcon ? <PageTitleIcon icon={pageIcon} /> : null}<div className="cms-page-title-copy"><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div></div> : null;

  const navbarCampuses = useMemo(() => {
    if (Array.isArray(activeCampuses) && activeCampuses.length > 0) return activeCampuses;
    return (campuses || []).filter((c) => c && c.isActive !== false && String(c.status || "").toLowerCase() !== "inactive");
  }, [activeCampuses, campuses]);

  const resolvedBreadcrumb = useMemo(() => {
    const provided = Array.isArray(breadcrumb) ? breadcrumb : [];
    const menuLabels = pageMenuItem?.labels ?? [];
    return uniqueBreadcrumbLabels(provided.length ? provided : menuLabels, title);
  }, [breadcrumb, pageMenuItem, title]);
  const reimbursementCampusId = selectedCampus?.campusId ?? selectedCampus?.id;


  // Synchronize Campus Join dynamically without tearing down SignalR socket
  useEffect(() => {
    if (reimbursementCampusId) {
      notificationHubService.joinCampus(reimbursementCampusId);
    }
  }, [reimbursementCampusId]);

  const rawEmail = user?.email;
  const profileEmail = Array.isArray(rawEmail) ? (rawEmail[0] || "Admin@CMS.com") : (rawEmail || "Admin@CMS.com");
  const profileName = user?.name && user.name !== user?.email ? user.name : (user?.fullName || (isWarden ? "Hostel Warden" : isExamCell ? "Exam Cell" : "CMS Admin"));
  const profileRole = isWarden ? (user?.designation || "Hostel Warden") : isExamCell ? (user?.designation || "Exam Cell") : (user?.designation || user?.role || "admin");

  const [adminPhotoError, setAdminPhotoError] = useState(false);
  const activeAdminPhoto = useMemo(() => {
    const isTenantCollege = Boolean(user?.collegeId && Number(user.collegeId) > 1);
    let savedAdminProfile = null;
    if (!isTenantCollege) {
      try {
        savedAdminProfile = JSON.parse(localStorage.getItem("cms_admin_profile") || "null");
      } catch {}
    }
    const rawPhoto = (
      user?.photoUrl ||
      user?.photoPath ||
      user?.photo ||
      (!isTenantCollege ? savedAdminProfile?.photo : null) ||
      (!isTenantCollege && typeof window !== "undefined" ? localStorage.getItem("cms_admin_photo") : null) ||
      null
    );
    if (!rawPhoto || typeof rawPhoto !== "string") return null;
    const trimmed = rawPhoto.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      if (env.useDevProxy && trimmed.includes("/uploads/")) {
        return trimmed.slice(trimmed.indexOf("/uploads/"));
      }
      return trimmed;
    }
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    const uploadPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (env.useDevProxy && uploadPath.startsWith("/uploads/")) {
      return uploadPath;
    }
    const apiBase = (env.apiBaseUrl || "http://localhost:5167").replace(/\/$/, "");
    return `${apiBase}${uploadPath}`;
  }, [user]);

  useEffect(() => {
    setAdminPhotoError(false);
  }, [activeAdminPhoto]);

  const rememberSidebarScroll = () => {
    const scrollTop = sidebarNavRef.current?.scrollTop || 0;
    savedScrollTopRef.current = scrollTop;
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(scrollTop));
    } catch {
      // Session storage can be unavailable in private browsing modes.
    }
  };

  useEffect(() => {
    let storedScrollTop = savedScrollTopRef.current;
    try {
      const stored = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY));
      storedScrollTop = Number.isFinite(stored) ? stored : storedScrollTop;
    } catch {
      storedScrollTop = savedScrollTopRef.current;
    }
    savedScrollTopRef.current = storedScrollTop;
    const frame = requestAnimationFrame(() => {
      if (sidebarNavRef.current) sidebarNavRef.current.scrollTop = savedScrollTopRef.current;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  useEffect(() => {
    if (pathname.startsWith("/dashboard/faculty")) setFacultyOpen(true);
  }, [pathname, setFacultyOpen]);
  useEffect(() => {
    if (
      pathname.startsWith("/dashboard/attendance/") ||
      pathname.startsWith("/exam-cell-dashboard/attendance") ||
      pathname.startsWith("/exam-cell-dashboard/check-in-out")
    ) {
      setAttendanceOpen(true);
    }
  }, [pathname]);
  useEffect(() => {
    if (pathname.startsWith("/dashboard/settings")) setSettingsOpen(true);
  }, [pathname]);

  useEffect(() => {
    const onPointer = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (campusRef.current && !campusRef.current.contains(e.target)) setCampusOpen(false);
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
        setCampusOpen(false);
        setBoardOpen(false);
        setYearOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? currentSearchIndex.filter((i) => i.label.toLowerCase().includes(q)) : currentSearchIndex;
    return list.slice(0, 8);
  }, [query, currentSearchIndex]);

  const goTo = (to) => {
    rememberSidebarScroll();
    setSearchOpen(false);
    setQuery("");
    navigate(to);
  };

  const closeOnMobile = () => {
    rememberSidebarScroll();
    if (typeof window !== "undefined" && window.innerWidth <= 992) setNavOpen(false);
  };

  const logout = () => {
    notificationHubService.disconnect();
    clearAuthSession();
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  const bestActiveTo = useMemo(() => {
    let best = null;
    let highestScore = -1;

    const DASHBOARD_ROOTS = [
      "/dashboard",
      "/warden-dashboard",
      "/principal-dashboard",
      "/accountant-dashboard",
      "/parent-dashboard",
      "/exam-cell-dashboard",
      "/non-teaching-dashboard",
      "/driver-dashboard",
      "/driver",
      "/student-dashboard",
      "/inventory-dashboard",
      "/transport-manager",
    ];

    const evaluate = (targetTo) => {
      if (!targetTo) return;
      const [base, searchStr] = targetTo.split("?");
      let score = -1;

      if (searchStr && !location.search.includes(searchStr)) {
        return;
      }

      const isDashboardRoot = DASHBOARD_ROOTS.includes(base);

      if (isDashboardRoot) {
        if (pathname === base || pathname === `${base}/` || pathname === `${base}/overview`) {
          score = 600 + base.length;
        } else {
          score = -1;
        }
      } else if (pathname === base) {
        score = searchStr ? 1200 + targetTo.length : 1000 + base.length;
      } else if (
        (base === "/warden-dashboard/rooms" && (pathname === "/warden-dashboard/beds" || pathname.startsWith("/warden-dashboard/beds/") || pathname === "/warden/rooms" || pathname === "/warden/beds")) ||
        (base === "/warden-dashboard/leave-requests" && (pathname === "/warden-dashboard/complaints" || pathname.startsWith("/warden-dashboard/complaints/") || pathname === "/warden/leave-requests")) ||
        (base === "/warden-dashboard/transfers" && (pathname.startsWith("/warden-dashboard/transfers/") || pathname.includes("vacat") || pathname === "/warden/transfers")) ||
        (base === "/warden-dashboard/blocks" && pathname === "/warden/blocks") ||
        (base === "/warden-dashboard/allocations" && pathname === "/warden/allocations") ||
        (base === "/warden-dashboard/attendance" && pathname === "/warden/attendance") ||
        (base === "/warden-dashboard/students" && pathname === "/warden/students") ||
        (base === "/warden-dashboard/wardens" && pathname === "/warden/wardens") ||
        (base === "/dashboard/settings" && (pathname === "/dashboard/settings/general" || pathname === "/settings")) ||
        (base === "/dashboard/courses" && pathname.startsWith("/dashboard/courses")) ||
        (targetTo === "/exam-cell-dashboard/exams" && (pathname === "/exam-cell-dashboard/exam-timetable" || pathname.startsWith("/exam-cell-dashboard/exams/"))) ||
        (targetTo === "/exam-cell-dashboard/marks-entry" && (pathname === "/exam-cell-dashboard/marks-verification" || pathname.startsWith("/exam-cell-dashboard/marks-entry/"))) ||
        (targetTo === "/exam-cell-dashboard/results" && (pathname === "/exam-cell-dashboard/publish-results" || pathname.startsWith("/exam-cell-dashboard/results/"))) ||
        (targetTo === "/exam-cell-dashboard/attendance" && pathname.startsWith("/exam-cell-dashboard/attendance/")) ||
        (targetTo === "/exam-cell-dashboard/check-in-out" && pathname === "/exam-cell-dashboard/my-attendance")
      ) {
        score = 800 + base.length;
      } else if (pathname.startsWith(`${base}/`)) {
        if (base === "/dashboard/attendance/student" && pathname.startsWith("/dashboard/attendance/staff")) {
          score = -1;
        } else {
          score = base.length;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        best = targetTo;
      }
    };

    activeMenu.forEach((group) => {
      (group.items || []).forEach((item) => {
        evaluate(item.to);
        (item.children || []).forEach((child) => {
          evaluate(child.to);
        });
      });
    });

    return best;
  }, [pathname, location.search, activeMenu]);

  const isActive = (to) => {
    if (!to) return false;
    if (bestActiveTo) {
      if (to === bestActiveTo) return true;
      const [targetBase] = to.split("?");
      const [bestBase] = bestActiveTo.split("?");
      if (targetBase === bestBase && !to.includes("?")) return true;
      return false;
    }
    const [basePath] = to.split("?");
    return pathname === basePath;
  };

  return (
    <div className={`cms-shell ${ready ? "is-ready" : ""} ${navOpen ? "" : "nav-closed"}`}>
      <aside className={`cms-sidebar ${ready && navOpen ? "is-open" : ""}`}>
        <div className="cms-brand">
          <CampusBrandImage className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges"  />
        </div>
        <nav className="cms-nav" ref={sidebarNavRef} onScroll={rememberSidebarScroll}>
          {activeMenu.map((group) => (
            <div key={group.section}>
              <div className="cms-nav-group">{group.section}</div>
              {group.items.map((item) => {
                const active = isActive(item.to);
                if (item.isLogout) {
                  return (
                    <button
                      key={item.to}
                      type="button"
                      className="cms-nav-link"
                      style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit" }}
                      onClick={() => {
                        closeOnMobile();
                        logout();
                      }}
                    >
                      <SidebarIcon icon={item.icon} />
                      <span className="cms-nav-label">{item.label}</span>
                    </button>
                  );
                }
                if (item.children) {
                  const isFacultyMenu = item.to === "/dashboard/faculty";
                  const isAttendanceMenu = item.to === "/dashboard/attendance" || item.to === "/exam-cell-dashboard/attendance" || item.to.includes("attendance");
                  const isSettingsMenu = item.to === "/dashboard/settings";
                  const isOpen = isFacultyMenu ? facultyOpen : isAttendanceMenu ? attendanceOpen : isSettingsMenu ? settingsOpen : false;
                  const setOpen = isFacultyMenu ? setFacultyOpen : isAttendanceMenu ? setAttendanceOpen : isSettingsMenu ? setSettingsOpen : () => {};
                  const childIsActive = (child) => isActive(child.to);
                  return (
                    <div key={item.to} className={isAttendanceMenu || isSettingsMenu ? "cms-nav-branch cms-attendance-branch" : "cms-nav-branch"}>
                      <div className="cms-nav-parent">
                        <Link
                          to={item.to}
                          title={navOpen ? undefined : item.label}
                          className={`cms-nav-link ${active || item.children.some(childIsActive) ? "is-active" : ""}`}
                          onClick={(event) => {
                            if (isAttendanceMenu) {
                              if (item.to === "/dashboard/attendance") {
                                event.preventDefault();
                                setOpen((v) => !v);
                              } else {
                                if (pathname === item.to) {
                                  setOpen((v) => !v);
                                } else {
                                  setOpen(true);
                                }
                              }
                            } else {
                              setAttendanceOpen(false);
                            }
                            closeOnMobile();
                          }}
                        >
                          <SidebarIcon icon={item.icon} />
                          <span className="cms-nav-label">{item.label}</span>
                        </Link>
                        <button type="button" className={`cms-nav-caret ${isOpen ? "is-open" : ""}`} aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`} aria-expanded={isOpen} onClick={() => { if (!isAttendanceMenu) setAttendanceOpen(false); setOpen((v) => !v); }}>
                          <ChevronDown size={15} />
                        </button>
                      </div>
                      {isOpen
                        ? item.children.map((child) => {
                            return (
                              <Link
                                key={child.to}
                                to={child.to}
                                title={navOpen ? undefined : child.label}
                                className={`cms-nav-link cms-nav-sub ${childIsActive(child) ? "is-active" : ""}`}
                                onClick={closeOnMobile}
                              >
                                <SidebarIcon icon={child.icon} sub />
                                <span className="cms-nav-label">{child.label}</span>
                              </Link>
                            );
                          })
                        : null}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={navOpen ? undefined : item.label}
                    className={`cms-nav-link ${active ? "is-active" : ""}`}
                    onClick={() => { setAttendanceOpen(false); closeOnMobile(); }}
                  >
                    <SidebarIcon icon={item.icon} />
                    <span className="cms-nav-label">
                      {item.to === "/dashboard/board-academic-year" ? <>Board &amp; Academic Year<br />Management</> : item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className={`cms-backdrop-mobile ${ready && navOpen ? "is-open" : ""}`} onClick={() => setNavOpen(false)} />

      <div className="cms-main">
        <header className="cms-topbar">
          <button
            className="cms-icon-btn cms-menu-toggle"
            type="button"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={navOpen}
          >
            <NavbarIcon src={navbarMenuIcon} />
          </button>
          <div className="cms-search-wrap" ref={searchRef}>
            <div className="cms-search-top">
              <NavbarIcon src={navbarSearchIcon} />
              <input placeholder="Search pages and modules..." value={query} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} aria-label="Search pages" />
            </div>
            {searchOpen ? (
              <div className="cms-search-panel">
                {suggestions.length ? suggestions.map((s) => (
                  <button key={s.to} type="button" className="cms-search-item" onMouseDown={(e) => e.preventDefault()} onClick={() => goTo(s.to)}>
                    <span>{s.label}</span><small>{s.section}</small>
                  </button>
                )) : <div className="cms-search-empty">No matching pages</div>}
              </div>
            ) : null}
          </div>

          <div className="cms-top-actions" ref={actionsRef}>
            <div className="cms-academic-selectors">
              {/* Campus Selector */}
              <div className="cms-academic-dropdown-wrap" ref={campusRef}>
                <button
                  type="button"
                  className={`cms-academic-btn ${campusOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setCampusOpen((v) => !v);
                    setBoardOpen(false);
                    setYearOpen(false);
                    setNotifOpen(false);
                    setProfileOpen(false);
                  }}
                  disabled={!navbarCampuses?.length}
                  aria-label="Select Campus"
                  aria-expanded={campusOpen}
                >
                  <div className="cms-academic-btn-icon">
                    <ThreeDIcon name="building" size={18} />
                  </div>
                  <div className="cms-academic-btn-text">
                    <span className="cms-academic-btn-label">Campus</span>
                    <span className="cms-academic-btn-value" title={selectedCampus?.name || selectedCampus?.code || "No Campus Configured"}>
                      {selectedCampus?.name || selectedCampus?.code || "No Campus Configured"}
                    </span>
                  </div>
                  <ChevronDown size={12} className="cms-academic-btn-arrow" />
                </button>

                {campusOpen && (
                  <div className="cms-academic-dropdown-panel">
                    <div className="cms-academic-panel-header">Select Campus Branch</div>
                    <div className="cms-academic-panel-list">
                      {!navbarCampuses?.length ? (
                        <div className="cms-academic-panel-empty">No active campuses available</div>
                      ) : (
                        navbarCampuses.map((c) => {
                          const isSelected =
                            String(selectedCampus?.id) === String(c.id) ||
                            String(selectedCampus?.campusId) === String(c.campusId) ||
                            (selectedCampus?.code && selectedCampus.code === c.code);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                              onClick={() => {
                                setSelectedCampus(c);
                                setCampusOpen(false);
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                                <span className="cms-academic-item-name" title={c.name}>{c.name}</span>
                                <span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>{c.code}</span>
                              </div>
                              {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                    {canManageAcademicContext ? <div className="cms-academic-panel-footer">
                      <button
                        type="button"
                        className="cms-academic-manage-btn"
                        onClick={() => {
                          setCampusOpen(false);
                          navigate("/dashboard/settings/campus-configuration");
                        }}
                      >
                        <ThreeDIcon name="settings" size={16} /> Manage Campuses
                      </button>
                    </div> : null}
                  </div>
                )}
              </div>

              {/* Board Selector */}
              <div className="cms-academic-dropdown-wrap" ref={boardRef}>
                {isParent || isWarden ? (
                  <div
                    className="cms-academic-btn"
                    style={{ cursor: "default", userSelect: "none" }}
                    aria-label="Board"
                  >
                    <div className="cms-academic-btn-icon">
                      <NavbarIcon src={navbarBoardIcon} />
                    </div>
                    <div className="cms-academic-btn-text">
                      <span className="cms-academic-btn-label">Board</span>
                      <span
                        className="cms-academic-btn-value"
                        title={selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || "No Board Configured"}
                      >
                        {selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || "No Board Configured"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`cms-academic-btn ${boardOpen ? "is-open" : ""}`}
                    onClick={() => {
                      setBoardOpen((v) => !v);
                      setYearOpen(false);
                      setNotifOpen(false);
                      setProfileOpen(false);
                    }}
                    disabled={boardsLoading || !boards.length}
                    aria-label="Select Board"
                    aria-expanded={boardOpen}
                  >
                    <div className="cms-academic-btn-icon">
                      <NavbarIcon src={navbarBoardIcon} />
                    </div>
                    <div className="cms-academic-btn-text">
                      <span className="cms-academic-btn-label">Board</span>
                      <span className="cms-academic-btn-value" title={selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code}>
                        {selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || (boardsLoading ? "Loading boards..." : boardsError ? "Unable to load boards" : "No active boards available")}
                      </span>
                    </div>
                    <ChevronDown size={12} className="cms-academic-btn-arrow" />
                  </button>
                )}

                {!isParent && !isWarden && boardOpen && (
                  <div className="cms-academic-dropdown-panel">
                    <div className="cms-academic-panel-header">Select Board</div>
                    <div className="cms-academic-panel-list">
                      {boardsLoading ? <div className="cms-academic-panel-empty">Loading boards...</div> : !boards.length ? <div className="cms-academic-panel-empty">{boardsError || "No active boards available"}</div> : boards.map((b) => {
                        const isSelected =
                          selectedBoard?.code === b.code || selectedBoard?.id === b.id || selectedBoard?.name === b.name || selectedBoard?.boardName === b.boardName;
                        return (
                          <button
                            key={b.id || b.code}
                            type="button"
                            className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                            onClick={() => {
                              setSelectedBoard(b);
                              setBoardOpen(false);
                            }}
                          >
                            <span className="cms-academic-item-name" title={b.name || b.boardName || b.code}>{b.name || b.boardName || b.code}</span>
                            {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                          </button>
                        );
                      })}
                    </div>
                    {canManageAcademicContext ? <div className="cms-academic-panel-footer">
                      <button
                        type="button"
                        className="cms-academic-manage-btn"
                        onClick={() => {
                          setBoardOpen(false);
                          navigate("/dashboard/board-academic-year?tab=boards");
                        }}
                      >
                        <ThreeDIcon name="settings" size={16} /> Manage Boards
                      </button>
                    </div> : null}
                  </div>
                )}
              </div>

              {/* Academic Year Selector */}
              <div className="cms-academic-dropdown-wrap" ref={yearRef}>
                <button
                  type="button"
                  className={`cms-academic-btn ${yearOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setYearOpen((v) => !v);
                    setBoardOpen(false);
                    setNotifOpen(false);
                    setProfileOpen(false);
                  }}
                  disabled={academicYearsLoading || !academicYears.length}
                  aria-label="Select Academic Year"
                  aria-expanded={yearOpen}
                >
                  <div className="cms-academic-btn-icon">
                    <NavbarIcon src={navbarAcademicYearIcon} />
                  </div>
                  <div className="cms-academic-btn-text">
                    <span className="cms-academic-btn-label">Academic Year</span>
                    <span className="cms-academic-btn-value">{selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || (academicYearsLoading ? "Loading years..." : academicYearsError ? "Unable to load years" : "No active academic years")}</span>
                  </div>
                  <ChevronDown size={12} className="cms-academic-btn-arrow" />
                </button>

                {yearOpen && (
                  <div className="cms-academic-dropdown-panel">
                    <div className="cms-academic-panel-header">Select Academic Year</div>
                    <div className="cms-academic-panel-list">
                      {academicYearsLoading ? <div className="cms-academic-panel-empty">Loading academic years...</div> : !academicYears.length ? <div className="cms-academic-panel-empty">{academicYearsError || "No active academic years available"}</div> : academicYears.map((y) => {
                        const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
                        const isSelected =
                          normalize(selectedAcademicYear?.code) === normalize(y.code) ||
                          normalize(selectedAcademicYear?.name) === normalize(y.name) ||
                          normalize(selectedAcademicYear?.label) === normalize(y.label);
                        return (
                          <button
                            key={y.id || y.code}
                            type="button"
                            className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                            onClick={() => {
                              setSelectedAcademicYear(y);
                              setYearOpen(false);
                            }}
                          >
                            <span className="cms-academic-item-name">{y.name || y.label || y.code}</span>
                            {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                          </button>
                        );
                      })}
                    </div>
                    {canManageAcademicContext && (
                      <div className="cms-academic-panel-footer">
                        <button
                          type="button"
                          className="cms-academic-manage-btn"
                          onClick={() => {
                            setYearOpen(false);
                            navigate("/dashboard/board-academic-year?tab=academic-years");
                          }}
                        >
                          <ThreeDIcon name="settings" size={16} /> Manage Academic Years
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <ThemeToggle variant="dashboard" />
            <NotificationBell />
            <button className="cms-profile-btn" onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}>
              {activeAdminPhoto && !adminPhotoError ? (
                <img
                  src={activeAdminPhoto}
                  alt={profileName}
                  className="cms-avatar"
                  style={{ objectFit: 'cover' }}
                  onError={() => setAdminPhotoError(true)}
                />
              ) : (
                <TransparentAvatar size={34} className="cms-avatar" />
              )}
              <span className="cms-profile-meta"><strong>{profileName}</strong><span>{profileRole}</span></span>
            </button>

            {/* Universal NotificationBell active */}

            {profileOpen ? (
              <div className="cms-dropdown">
                <div className="cms-dropdown-head"><strong title={profileName}>{profileName}</strong><div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{profileEmail}</div><div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 3 }}>{profileRole}</div></div>
                <button
                  type="button"
                  className="cms-dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    closeOnMobile();
                    navigate(resolvedProfilePath);
                  }}
                >
                  <User size={15} /> My Profile
                </button>
                {isExamCell ? (
                  <button
                    type="button"
                    className="cms-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      closeOnMobile();
                      setChangePasswordOpen(true);
                    }}
                  >
                    <KeyRound size={15} /> Change Password
                  </button>
                ) : null}
                {showSettingsAction && resolvedSettingsPath ? <button
                  type="button"
                  className="cms-dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    closeOnMobile();
                    navigate(resolvedSettingsPath);
                  }}
                >
                  <Settings size={15} /> Settings
                </button> : null}
                <button
                  type="button"
                  className="cms-dropdown-item danger"
                  onClick={() => {
                    setProfileOpen(false);
                    closeOnMobile();
                    logout();
                  }}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="cms-content">
          <div className="cms-page-head">
            {backLink ? (
              <div className="cms-page-heading-with-back">
                {backLinkPosition === "below" ? <>{pageTitleNode}{backLink}</> : <>{backLink}{pageTitleNode}</>}
              </div>
            ) : pageTitleNode}
            {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
          </div>

          {children}
        </main>
      </div>

      {changePasswordOpen && (
        <ChangePasswordModal
          isOpen={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
        />
      )}
    </div>
  );
}
