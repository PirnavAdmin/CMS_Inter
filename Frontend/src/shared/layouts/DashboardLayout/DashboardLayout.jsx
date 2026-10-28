import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, ChevronDown, Settings, User, LogOut, CheckCircle2, Building, ShieldCheck,
  Building2, LayoutDashboard, Users, BarChart3, BedDouble, AlertTriangle, ArrowLeftRight,
  ReceiptIndianRupee, Boxes, KeyRound,
} from "lucide-react";
import ChangePasswordModal from "@/modules/exam-cell/components/ChangePasswordModal.jsx";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
import TransparentAvatar from "@/shared/components/TransparentAvatar.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useSidebar } from "@/hooks/useSidebar.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import CampusContext from "@/context/CampusContext.jsx";
import { clearAuthSession, getAuthUser, getAuthToken } from "@/modules/auth/authStorage.js";
import { env } from "@/config/env.js";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { isWardenRole, isNonTeachingRole } from "@/routes/ProtectedRoute.jsx";
import { isExamCellRole } from "@/modules/exam-cell/navigation.js";
import { SHOW_HALL_TICKETS } from "@/modules/exam-cell/hallTicketsConfig.js";
import { can, hasRole } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";
import { ACTIONS } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.constants.js";
import { reimbursementApi } from "@/api/staffApi";
import { getCurrentUserPermissions } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.service.js";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
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
import hostelManagementIcon from "@/assets/sidebar-3d/hostel-management.svg";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
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
  "inventory management": Boxes,
});

const PAGE_ICON_ROUTE_ALIASES = [
  { path: "/dashboard/board-academic-year", icon: settingsBoardAcademicYearIcon },
  { path: "/dashboard/settings/number-series", icon: settingsNumberSeriesIcon },
  { path: "/dashboard/settings/templates", icon: settingsTemplatesIcon },
  { path: "/dashboard/settings/audit-logs", icon: settingsAuditLogsIcon },
  { path: "/dashboard/settings/roles-permissions", icon: ShieldCheck },
  { path: "/dashboard/designations", icon: generatedSidebarIcons.department },
  { path: "/dashboard/promotions", icon: promotionIcon },
  { path: "/dashboard/payroll", icon: generatedSidebarIcons.payroll },
  { path: "/dashboard/staff-salary", icon: generatedSidebarIcons.payroll },
  { path: "/dashboard/reimbursement", icon: reimbursementIcon },
  { path: "/dashboard/finance/reimbursement", icon: reimbursementIcon },
  { path: "/dashboard/inventory-management", icon: Boxes },
  { path: "/dashboard/inventory", icon: Boxes },
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
  if (typeof icon === "string") {
    return <img className={`cms-nav-3d-icon${sub ? " cms-nav-3d-icon-sub" : ""}`} src={icon} alt="" aria-hidden="true" />;
  }

  if (icon.src) {
    return (
      <span
        className={`cms-nav-3d-icon cms-nav-generated-icon${sub ? " cms-nav-3d-icon-sub" : ""}`}
        style={{ backgroundImage: `url(${icon.src})`, backgroundPosition: icon.position }}
        aria-hidden="true"
      />
    );
  }

  const IconComponent = icon;
  return <IconComponent className={`cms-nav-3d-icon${sub ? " cms-nav-3d-icon-sub" : ""}`} size={sub ? 15 : 18} aria-hidden="true" />;
}

function PageTitleIcon({ icon }) {
  if (!icon) return null;
  if (typeof icon === "string") {
    return <img className="cms-page-title-icon" src={icon} alt="" aria-hidden="true" />;
  }

  if (icon.src) {
    return (
      <span
        className="cms-page-title-icon cms-nav-generated-icon"
        style={{ backgroundImage: `url(${icon.src})`, backgroundPosition: icon.position }}
        aria-hidden="true"
      />
    );
  }

  const IconComponent = icon;
  return <IconComponent className="cms-page-title-icon" size={24} aria-hidden="true" />;
}

function NavbarIcon({ src }) {
  return <img className="cms-navbar-3d-icon" src={src} alt="" aria-hidden="true" />;
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
      { to: "/dashboard/inventory-management", label: "Inventory Management", icon: Boxes, moduleKey: "inventory-management" },
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
    ],
  },
  {
    section: "Residents & Analytics",
    items: [
      { to: "/warden-dashboard/students", label: "Resident Students", icon: studentsIcon },
      { to: "/warden-dashboard/reports", label: "Hostel Reports", icon: reportsAnalyticsIcon },
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
      ...(SHOW_HALL_TICKETS
        ? [{ to: "/exam-cell-dashboard/hall-tickets", label: "Hall Tickets", icon: certificatesIcon, moduleKey: "examinations", screenKey: "hall-tickets" }]
        : []),
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
  { id: "admin-notif-1", title: "New Staff Reimbursement Request", count: 1, to: "/dashboard/reimbursement", label: "reimbursements" }
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

// Module-level notifications cache to prevent duplicate backend requests on route navigation
let cachedLiveNotifications = [];
let lastNotifFetchTimestamp = 0;
let lastNotifCampus = null;
const NOTIF_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

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
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
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
            } catch { }
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
        apiClient.get("/api/Admin/1").then(res => {
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
              } catch { }
              setCurrentUser(updated);
            }
          }
        }).catch(() => { });
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
              } catch { }
              setCurrentUser(updated);
            }
          }
        }).catch(() => { });
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
  const isParent = !isWarden && (String(user?.role || "").toLowerCase() === "parent" || pathname.startsWith("/parent-dashboard"));
  const isPrincipal = !isWarden && (isPrincipalRole(user?.role) || pathname.startsWith("/principal-dashboard"));
  const isExamCell = !isWarden && (isExamCellRole(user?.role) || pathname.startsWith("/exam-cell-dashboard"));
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
  const userRoleStr = String(user?.role || "").trim().toLowerCase();
  const canReviewReimbursements = !isParent && ["admin", "super admin", "accountant", "principal"].includes(userRoleStr);
  const canReviewCertificates = !isParent && ["admin", "super admin", "principal", "exam cell", "examination cell", "clerk", "staff"].includes(userRoleStr);
  const hubConnectionRef = useRef(null);
  const fetchLiveNotifsRef = useRef(null);

  // Fetch live notifications count for badges
  useEffect(() => {
    let disposed = false;
    if (canReviewReimbursements || canReviewCertificates) {
      const fetchLiveNotifications = async (force = false) => {
        const now = Date.now();
        if (
          !force &&
          lastNotifCampus === reimbursementCampusId &&
          now - lastNotifFetchTimestamp < NOTIF_CACHE_TTL_MS
        ) {
          if (!disposed && cachedLiveNotifications.length > 0) {
            setLiveNotifications(cachedLiveNotifications);
          }
          return;
        }

        const notifs = [];
        try {
          if (canReviewReimbursements) {
            const fetchFn = reimbursementApi?.getAllReimbursements || reimbursementApi?.getReimbursements;
            if (fetchFn) {
              const res = await fetchFn({ status: "Pending", campusId: reimbursementCampusId || undefined });
              if (!disposed) {
                const payload = res?.data?.data ?? res?.data?.Data ?? res?.data;
                const claims = Array.isArray(payload) ? payload : payload?.items ?? payload?.Items ?? [];
                if (claims.length > 0) {
                  notifs.push({
                    id: "admin-notif-reimbursement",
                    title: "New Staff Reimbursement Request",
                    count: claims.length,
                    to: "/dashboard/reimbursement",
                    label: "reimbursements"
                  });
                }
              }
            }
          }
        } catch {
          // Gracefully handle offline or pending notification counter without console noise
        }

        try {
          if (canReviewCertificates) {
            const certRes = await apiClient.get("/api/v1/certificates/workflow-stats", { skipGlobalLoader: true });
            if (!disposed) {
              const data = certRes?.data?.data ?? certRes?.data?.Data ?? certRes?.data ?? {};
              const reqCount = Number(data.requestedCount ?? data.RequestedCount) || 0;
              const isCurrentlyOnCertPage = window.location.pathname.startsWith("/dashboard/certificates");
              if (reqCount > 0 && !isCurrentlyOnCertPage) {
                notifs.push({
                  id: "admin-notif-certificate",
                  title: "Student Certificate Requests",
                  count: reqCount,
                  to: "/dashboard/certificates?tab=actions&status=Requested",
                  label: "certificates"
                });
              }
            }
          }
        } catch {
          // Gracefully handle offline or pending notification counter without console noise
        }

        if (!disposed) {
          cachedLiveNotifications = notifs;
          lastNotifFetchTimestamp = Date.now();
          lastNotifCampus = reimbursementCampusId;
          setLiveNotifications(notifs);
        }
      };

      fetchLiveNotifsRef.current = fetchLiveNotifications;
      fetchLiveNotifications();

      // Listen for cross-tab notifications (e.g. from Faculty tab submitting a claim or student requesting certificate)
      let channel = null;
      try {
        channel = new BroadcastChannel("cms_notifications");
        channel.onmessage = (event) => {
          if (
            event.data?.type === "NEW_REIMBURSEMENT" ||
            event.data?.type === "NEW_CERTIFICATE_REQUEST" ||
            event.data?.type === "CERTIFICATE_STATUS_UPDATED" ||
            event.data?.type === "REIMBURSEMENT_STATUS_UPDATED"
          ) {
            setHasViewedNotifications(false);
            fetchLiveNotifications(true);
          }
        };
      } catch {
        // Fallback
      }

      // Listen for same-tab local events so badges update immediately upon action
      const handleLocalAction = () => {
        setHasViewedNotifications(false);
        fetchLiveNotifications(true);
      };
      window.addEventListener("cms-reimbursements-updated", handleLocalAction);
      window.addEventListener("cms-certificates-updated", handleLocalAction);

      return () => {
        disposed = true;
        if (channel) channel.close();
        window.removeEventListener("cms-reimbursements-updated", handleLocalAction);
        window.removeEventListener("cms-certificates-updated", handleLocalAction);
      };
    }
    setLiveNotifications([]);
  }, [canReviewReimbursements, canReviewCertificates, reimbursementCampusId]);

  // SignalR Push Connection: Persistent across campus changes with safe reconnect backoff
  useEffect(() => {
    let disposed = false;
    if (!canReviewReimbursements && !canReviewCertificates) {
      if (hubConnectionRef.current) {
        hubConnectionRef.current.stop().catch(() => { });
        hubConnectionRef.current = null;
      }
      return;
    }

    const token = (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return;

    const base = env.useDevProxy ? "" : (env.apiBaseUrl || "").replace(/\/$/, "");
    const connection = new HubConnectionBuilder()
      .withUrl(`${base}/hubs/notifications`, {
        accessTokenFactory: () => (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim(),
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .withAutomaticReconnect([2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.None)
      .build();

    hubConnectionRef.current = connection;

    connection.on("NotificationReceived", () => {
      if (!disposed) {
        setHasViewedNotifications(false);
        fetchLiveNotifsRef.current?.(true);
      }
    });

    connection.start()
      .then(() => {
        if (!disposed && reimbursementCampusId && connection.state === "Connected") {
          connection.invoke("JoinCampus", Number(reimbursementCampusId)).catch(() => { });
        }
      })
      .catch(() => {
        // Graceful catch: withAutomaticReconnect will retry with backoff if server is restarting
      });

    return () => {
      disposed = true;
      if (hubConnectionRef.current) {
        const conn = hubConnectionRef.current;
        hubConnectionRef.current = null;
        conn.stop().catch(() => { });
      }
    };
  }, [canReviewReimbursements, canReviewCertificates]);

  // Synchronize Campus Join/Leave dynamically without tearing down SignalR socket
  useEffect(() => {
    if (reimbursementCampusId && hubConnectionRef.current?.state === "Connected") {
      hubConnectionRef.current.invoke("JoinCampus", Number(reimbursementCampusId)).catch(() => { });
    }
  }, [reimbursementCampusId]);

  const currentNotifications = isParent ? PARENT_NOTIFICATIONS : liveNotifications;

  const rawEmail = user?.email;
  const profileEmail = Array.isArray(rawEmail) ? (rawEmail[0] || "Admin@CMS.com") : (rawEmail || "Admin@CMS.com");
  const profileName = user?.name && user.name !== user?.email ? user.name : (user?.fullName || (isWarden ? "Hostel Warden" : isExamCell ? "Exam Cell" : "CMS Admin"));
  const profileRole = isWarden ? (user?.designation || "Hostel Warden") : isExamCell ? (user?.designation || "Exam Cell") : (user?.designation || user?.role || "admin");

  const totalNotifCount = currentNotifications.reduce((total, item) => total + item.count, 0);
  const pendingActionCount = hasViewedNotifications ? 0 : totalNotifCount;

  const [adminPhotoError, setAdminPhotoError] = useState(false);
  const activeAdminPhoto = useMemo(() => {
    let savedAdminProfile = null;
    try {
      savedAdminProfile = JSON.parse(localStorage.getItem("cms_admin_profile") || "null");
    } catch { }
    const rawPhoto = (
      user?.photoUrl ||
      user?.photoPath ||
      user?.photo ||
      savedAdminProfile?.photo ||
      (typeof window !== "undefined" ? localStorage.getItem("cms_admin_photo") : null) ||
      null
    );
    if (!rawPhoto || typeof rawPhoto !== "string") return null;
    const trimmed = rawPhoto.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    const apiBase = (env.apiBaseUrl || "http://localhost:5167").replace(/\/$/, "");
    return `${apiBase}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
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
    if (pathname.startsWith("/dashboard/certificates")) {
      setLiveNotifications((prev) => prev.filter((n) => n.id !== "admin-notif-certificate"));
    }
    if (/^\/dashboard\/(?:finance\/)?reimbursements?(?:\/|$)/.test(pathname)) {
      setLiveNotifications((prev) => prev.filter((n) => n.id !== "admin-notif-reimbursement"));
    }
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
    clearAuthSession();
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  const isActive = (to) => {
    const [basePath, searchStr] = to.split("?");
    if (basePath === "/dashboard") return pathname === "/dashboard";
    if (basePath === "/accountant-dashboard") return pathname === "/accountant-dashboard";
    if (basePath === "/parent-dashboard") return pathname === "/parent-dashboard";
    if (basePath === "/exam-cell-dashboard") return pathname === "/exam-cell-dashboard";
    if (basePath === "/non-teaching-dashboard") return pathname === "/non-teaching-dashboard" || pathname === "/non-teaching-dashboard/";
    if (basePath === "/dashboard/settings") {
      return pathname === "/dashboard/settings" || pathname === "/dashboard/settings/general";
    }
    if (basePath === "/hostel" || basePath === "/dashboard/hostel") {
      return pathname.startsWith("/hostel") || pathname.startsWith("/dashboard/hostel");
    }
    if (to === "/exam-cell-dashboard/exams") {
      return (
        pathname === "/exam-cell-dashboard/exams" ||
        pathname.startsWith("/exam-cell-dashboard/exams/") ||
        pathname === "/exam-cell-dashboard/exam-timetable"
      );
    }
    if (to === "/exam-cell-dashboard/marks-entry") {
      return (
        pathname === "/exam-cell-dashboard/marks-entry" ||
        pathname.startsWith("/exam-cell-dashboard/marks-entry/") ||
        pathname === "/exam-cell-dashboard/marks-verification"
      );
    }
    if (to === "/exam-cell-dashboard/results") {
      return (
        pathname === "/exam-cell-dashboard/results" ||
        pathname.startsWith("/exam-cell-dashboard/results/") ||
        pathname === "/exam-cell-dashboard/publish-results"
      );
    }
    if (to === "/exam-cell-dashboard/attendance") {
      return (
        pathname === "/exam-cell-dashboard/attendance" ||
        pathname.startsWith("/exam-cell-dashboard/attendance/")
      );
    }
    if (to === "/exam-cell-dashboard/check-in-out") {
      return pathname === "/exam-cell-dashboard/check-in-out" || pathname === "/exam-cell-dashboard/my-attendance";
    }
    if (searchStr && !location.search.includes(searchStr)) return false;

    if (basePath === "/dashboard/attendance" || basePath === "/dashboard/attendance/student") {
      if (pathname.startsWith("/dashboard/attendance/staff")) return false;
      return (
        pathname === "/dashboard/attendance" ||
        pathname === "/dashboard/attendance/student" ||
        pathname.startsWith("/dashboard/attendance/student/")
      );
    }

    if (basePath === "/dashboard/attendance/staff") {
      return (
        pathname === "/dashboard/attendance/staff" ||
        pathname.startsWith("/dashboard/attendance/staff/")
      );
    }

    const pathMatch = pathname === basePath || pathname.startsWith(`${basePath}/`);
    if (!pathMatch) return false;
    return true;
  };

  return (
    <div className={`cms-shell ${ready ? "is-ready" : ""} ${navOpen ? "" : "nav-closed"}`}>
      <aside className={`cms-sidebar ${ready && navOpen ? "is-open" : ""}`}>
        <div className="cms-brand">
          <CampusBrandImage className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges" />
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
                  const setOpen = isFacultyMenu ? setFacultyOpen : isAttendanceMenu ? setAttendanceOpen : isSettingsMenu ? setSettingsOpen : () => { };
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
                    <Building2 size={16} color="var(--cms-primary)" />
                  </div>
                  <div className="cms-academic-btn-text">
                    <span className="cms-academic-btn-label">Campus</span>
                    <span className="cms-academic-btn-value" title={selectedCampus?.name || selectedCampus?.code}>
                      {selectedCampus?.name || selectedCampus?.code || "Main Campus"}
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
                        <Settings size={14} /> Manage Campuses
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
                        title={selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || "Board of Intermediate Education, Andhra Pradesh"}
                      >
                        {selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || "Board of Intermediate Education, Andhra Pradesh"}
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
                        <Settings size={14} /> Manage Boards
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
                          <Settings size={14} /> Manage Academic Years
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <ThemeToggle variant="dashboard" />
            {isParent ? (
              <Link
                to="/parent-dashboard/notifications"
                className="cms-icon-btn"
                style={{ textDecoration: "none" }}
                aria-label={`${pendingActionCount} notifications`}
                onClick={() => {
                  setNotifOpen(false);
                  setProfileOpen(false);
                  closeOnMobile();
                }}
              >
                <NavbarIcon src={navbarNotificationsIcon} />
                {pendingActionCount > 0 ? (
                  <span className="cms-notification-badge">
                    {pendingActionCount > 99 ? "99+" : pendingActionCount}
                  </span>
                ) : null}
              </Link>
            ) : (
              <button
                type="button"
                className="cms-icon-btn"
                aria-label={`${pendingActionCount} sample notifications`}
                aria-expanded={notifOpen}
                onClick={() => {
                  setNotifOpen((open) => !open);
                  setProfileOpen(false);
                  if (!notifOpen) {
                    setHasViewedNotifications(true);
                  }
                }}
              >
                <NavbarIcon src={navbarNotificationsIcon} />
                {pendingActionCount > 0 ? (
                  <span className="cms-notification-badge">
                    {pendingActionCount > 99 ? "99+" : pendingActionCount}
                  </span>
                ) : null}
              </button>
            )}
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

            {!isParent && notifOpen ? (
              <div className="cms-dropdown cms-notifications-dropdown">
                <div className="cms-dropdown-head cms-notifications-head">
                  <div><strong>Notifications</strong><small>Sample activity</small></div>
                </div>
                {currentNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className="cms-notif-item"
                    onClick={() => {
                      setNotifOpen(false);
                      setLiveNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                      navigate(notification.to);
                    }}
                  >
                    <span className="cms-notif-count">{notification.count}</span>
                    <span><p>{notification.title}</p><small>Open {notification.label}</small></span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}

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
