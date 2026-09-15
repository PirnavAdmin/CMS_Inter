import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, ChevronDown, Settings, User, LogOut, CheckCircle2, ArrowLeft,
} from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useSidebar } from "@/hooks/useSidebar.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { clearAuthSession, getAuthUser } from "@/features/authStorage.js";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import boardAcademicYearIcon from "@/assets/sidebar-3d/board-academic-year.png";
import subjectsIcon from "@/assets/sidebar-3d/subjects.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
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
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import "./DashboardLayout.css";

const generatedSidebarIcons = {
  department: { src: managementIconsSprite, position: "0% 0%" },
  staffAttendance: { src: managementIconsSprite, position: "50% 0%" },
  staffLeave: { src: managementIconsSprite, position: "100% 0%" },
  payroll: { src: managementIconsSprite, position: "0% 100%" },
  admission: { src: managementIconsSprite, position: "50% 100%" },
  groups: { src: managementIconsSprite, position: "100% 100%" },
};

const PAGE_TITLE_ICON_OVERRIDES = Object.freeze({
  "board & academic year management": settingsBoardAcademicYearIcon,
  "id & number series": settingsNumberSeriesIcon,
  templates: settingsTemplatesIcon,
  "audit logs": settingsAuditLogsIcon,
});

const PAGE_ICON_ROUTE_ALIASES = [
  { path: "/dashboard/board-academic-year", icon: settingsBoardAcademicYearIcon },
  { path: "/dashboard/settings/number-series", icon: settingsNumberSeriesIcon },
  { path: "/dashboard/settings/templates", icon: settingsTemplatesIcon },
  { path: "/dashboard/settings/audit-logs", icon: settingsAuditLogsIcon },
  { path: "/dashboard/designations", icon: generatedSidebarIcons.department },
  { path: "/dashboard/promotions", icon: promotionIcon },
];

function SidebarIcon({ icon, sub = false }) {
  if (typeof icon === "string") {
    return <img className={`cms-nav-3d-icon${sub ? " cms-nav-3d-icon-sub" : ""}`} src={icon} alt="" aria-hidden="true" />;
  }

  return (
    <span
      className={`cms-nav-3d-icon cms-nav-generated-icon${sub ? " cms-nav-3d-icon-sub" : ""}`}
      style={{ backgroundImage: `url(${icon.src})`, backgroundPosition: icon.position }}
      aria-hidden="true"
    />
  );
}

function PageTitleIcon({ icon }) {
  if (typeof icon === "string") {
    return <img className="cms-page-title-icon" src={icon} alt="" aria-hidden="true" />;
  }

  return (
    <span
      className="cms-page-title-icon cms-nav-generated-icon"
      style={{ backgroundImage: `url(${icon.src})`, backgroundPosition: icon.position }}
      aria-hidden="true"
    />
  );
}

function NavbarIcon({ src }) {
  return <img className="cms-navbar-3d-icon" src={src} alt="" aria-hidden="true" />;
}

export const menu = [
  {
    section: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: dashboardIcon },
    ],
  },
  {
    section: "Academic",
    items: [
      { to: "/dashboard/courses", label: "Group Management", icon: generatedSidebarIcons.groups },
      { to: "/dashboard/subjects", label: "Subject Management", icon: subjectsIcon },
      { to: "/dashboard/sections", label: "Section & Room", icon: sectionsIcon },
      { to: "/dashboard/timetable", label: "Timetable", icon: timetableIcon },
    ],
  },
  {
    section: "Student",
    items: [
      { to: "/dashboard/admission", label: "Student Admission", icon: generatedSidebarIcons.admission },
      { to: "/dashboard/students", label: "Student Management", icon: studentsIcon },
      { to: "/dashboard/section-allocation", label: "Section Allocation", icon: allocateSectionIcon },
      { to: "/dashboard/attendance/student", label: "Attendance", icon: attendanceIcon },
      { to: "/dashboard/promotion", label: "Promotion", icon: promotionIcon },
    ],
  },
  {
    section: "Staff",
    items: [
      { to: "/dashboard/staff", label: "Staff Management", icon: staffIcon },
      { to: "/dashboard/departments", label: "Department Management", icon: generatedSidebarIcons.department },
      { to: "/dashboard/attendance/staff", label: "Staff Attendance", icon: generatedSidebarIcons.staffAttendance },
      { to: "/dashboard/leave-management?tab=staff", label: "Staff Leave Management", icon: generatedSidebarIcons.staffLeave },
    ],
  },
  {
    section: "Examinations",
    items: [
      { to: "/dashboard/examinations", label: "Examination", icon: examinationIcon },
      { to: "/dashboard/marks-entry", label: "Marks Evaluation", icon: marksEvaluationIcon },
      { to: "/dashboard/results", label: "Results", icon: resultsIcon },
    ],
  },
  {
    section: "Finance",
    items: [
      { to: "/dashboard/fee-structure", label: "Fee Management", icon: feeManagementIcon },
    ],
  },
  {
    section: "Documents & Reports",
    items: [
      { to: "/dashboard/certificates", label: "Certificates", icon: certificatesIcon },
      { to: "/dashboard/reports", label: "Reports & Analytics", icon: reportsAnalyticsIcon },
    ],
  },
  {
    section: "Administration",
    items: [
      { to: "/dashboard/settings", label: "Settings", icon: boardAcademicYearIcon },
    ],
  },
];

const SIDEBAR_SCROLL_KEY = "cms_sidebar_scroll_top";
const NOTIFICATION_REFRESH_INTERVAL = 60_000;
const EMPTY_NOTIFICATION_SOURCES = [];
const MOCK_NOTIFICATIONS = [];
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

const searchIndex = menu.flatMap((g) =>
  g.items.flatMap((item) => [
    { to: item.to, label: item.label, section: g.section },
    ...(item.children || []).map((c) => ({ to: c.to, label: c.label, section: item.label })),
  ]),
);
const breadcrumbLinkForLabel = (label) =>
  searchIndex.find((item) => item.label.toLowerCase() === String(label).toLowerCase())?.to;

const normalizeBreadcrumbLabel = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const breadcrumbKey = (value) => normalizeBreadcrumbLabel(value).toLowerCase();

const menuBreadcrumbForPath = (pathname) => {
  let bestMatch = null;
  const consider = (to, labels, icon) => {
    const [path] = to.split("?");
    let matches = false;
    if (path === "/dashboard") {
      matches = pathname === "/dashboard";
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

  menu.forEach((group) => {
    group.items.forEach((item) => {
      consider(item.to, [group.section, item.label], item.icon);
      (item.children || []).forEach((child) => {
        if (child.to !== item.to) consider(child.to, [group.section, item.label, child.label], child.icon);
      });
    });
  });

  return bestMatch;
};

const menuIconForTitle = (title) => {
  const titleKey = breadcrumbKey(title);
  for (const group of menu) {
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

function initials(name = "CMS Admin") {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}



export default function DashboardLayout({
  title,
  subtitle,
  breadcrumb = [],
  actions,
  children,
  excludeNotificationSources = EMPTY_NOTIFICATION_SOURCES,
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

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const actionsRef = useRef(null);
  const searchRef = useRef(null);
  const boardRef = useRef(null);
  const yearRef = useRef(null);
  const sidebarNavRef = useRef(null);
  const savedScrollTopRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const pageMenuItem = useMemo(() => menuBreadcrumbForPath(pathname), [pathname]);
  const pageIcon = PAGE_TITLE_ICON_OVERRIDES[breadcrumbKey(title)] ?? pageIconForPathAlias(pathname) ?? menuIconForTitle(title) ?? pageMenuItem?.icon;






  const resolvedBreadcrumb = useMemo(() => {
    const provided = Array.isArray(breadcrumb) ? breadcrumb : [];
    const menuLabels = pageMenuItem?.labels ?? [];
    return uniqueBreadcrumbLabels(provided.length ? provided : menuLabels, title);
  }, [breadcrumb, pageMenuItem, title]);
  const user = readUser();
  const profileName = user?.name && user.name !== user?.email ? user.name : "CMS Admin";
  const profileEmail = user?.email || "Admin@CMS.com";
  const profileRole = user?.role || "admin";
  const pendingActionCount = MOCK_NOTIFICATIONS.reduce((total, item) => total + item.count, 0);

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
    if (pathname.startsWith("/dashboard/attendance/")) setAttendanceOpen(true);
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
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
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
    const list = q ? searchIndex.filter((i) => i.label.toLowerCase().includes(q)) : searchIndex;
    return list.slice(0, 8);
  }, [query]);

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
          <img className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges" />
        </div>
        <nav className="cms-nav" ref={sidebarNavRef} onScroll={rememberSidebarScroll}>
          {menu.map((group) => (
            <div key={group.section}>
              <div className="cms-nav-group">{group.section}</div>
              {group.items.map((item) => {
                const active = isActive(item.to);
                if (item.children) {
                  const isFacultyMenu = item.to === "/dashboard/faculty";
                  const isAttendanceMenu = item.to === "/dashboard/attendance";
                  const isSettingsMenu = item.to === "/dashboard/settings";
                  const isOpen = isFacultyMenu ? facultyOpen : isAttendanceMenu ? attendanceOpen : isSettingsMenu ? settingsOpen : false;
                  const setOpen = isFacultyMenu ? setFacultyOpen : isAttendanceMenu ? setAttendanceOpen : setSettingsOpen;
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
                              event.preventDefault();
                              setOpen((v) => !v);
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
              {/* Board Selector */}
              <div className="cms-academic-dropdown-wrap" ref={boardRef}>
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

                {boardOpen && (
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
                    <div className="cms-academic-panel-footer">
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
                    </div>
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
                  </div>
                )}
              </div>
            </div>
            <ThemeToggle variant="dashboard" />
            <button className="cms-icon-btn" aria-label={`${pendingActionCount} sample notifications`} aria-expanded={notifOpen} onClick={() => { setNotifOpen((open) => !open); setProfileOpen(false); }}>
              <NavbarIcon src={navbarNotificationsIcon} />{pendingActionCount > 0 ? <span className="cms-notification-badge">{pendingActionCount > 99 ? "99+" : pendingActionCount}</span> : null}
            </button>
            <button className="cms-profile-btn" onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}>
              <span className="cms-avatar">{initials(profileName)}</span>
              <span className="cms-profile-meta"><strong>{profileName}</strong><span>{profileRole}</span></span>
            </button>

            {notifOpen ? (
              <div className="cms-dropdown cms-notifications-dropdown">
                <div className="cms-dropdown-head cms-notifications-head">
                  <div><strong>Notifications</strong><small>Sample activity</small></div>
                </div>
                {MOCK_NOTIFICATIONS.map((notification) => (
                  <button key={notification.id} type="button" className="cms-notif-item" onClick={() => { setNotifOpen(false); goTo(notification.to); }}>
                    <span className="cms-notif-count">{notification.count}</span>
                    <span><p>{notification.title}</p><small>Open {notification.label}s</small></span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}

            {profileOpen ? (
              <div className="cms-dropdown">
                <div className="cms-dropdown-head"><strong>{profileName}</strong><div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{profileEmail}</div><div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 3 }}>{profileRole}</div></div>
                <button className="cms-dropdown-item" onClick={() => { setProfileOpen(false); navigate("/dashboard/settings"); }}><User size={15} /> My Profile</button>
                <button className="cms-dropdown-item" onClick={() => { setProfileOpen(false); navigate("/dashboard/settings"); }}><Settings size={15} /> Settings</button>
                <button type="button" className="cms-dropdown-item danger" onClick={logout}><LogOut size={15} /> Logout</button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="cms-content">
          <div className="cms-page-head">
            <div className="cms-page-title">{title && pageIcon ? <PageTitleIcon icon={pageIcon} /> : null}<div className="cms-page-title-copy"><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div></div>
            {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
