import { summarizeStudentAttendance, normalizeStudentStatus } from "../AdminAttendance/dashboardStudentAttendance.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileEdit,
  FileText,
  GraduationCap,
  Info,
  Plus,
  RefreshCw,
  RotateCcw,
  Users,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  BarChart3,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import axios from "axios";
import sharedApiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthToken } from "@/modules/auth/authStorage.js";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import useLiveModuleSync from "@/hooks/useLiveModuleSync.js";
import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonCard, SkeletonText, Toast } from "@/shared/components/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import totalStudentsIcon from "@/assets/dashboard-3d/total-students.png";
import teachingStaffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import nonTeachingStaffIcon from "@/assets/dashboard-3d/non-teaching-staff.png";
import totalGroupsIcon from "@/assets/dashboard-3d/total-groups.png";
import totalSectionsIcon from "@/assets/dashboard-3d/total-sections.png";
import addStudentIcon from "@/assets/dashboard-3d/add-student.png";
import addStaffIcon from "@/assets/dashboard-3d/add-staff.png";
import createGroupIcon from "@/assets/dashboard-3d/create-group.png";
import createSectionIcon from "@/assets/dashboard-3d/create-section.png";
import createExamIcon from "@/assets/dashboard-3d/create-exam.png";
import markAttendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import "./DashboardPage.css";

const GROUP_COLORS = ["#2563eb", "#7c3aed", "#f59e0b", "#16a34a", "#e11d48", "#0891b2", "#64748b"];

// Direct authenticated API client without mock adapters
const apiClient = sharedApiClient;

const DASHBOARD_API = {
  summary: "/api/v1/dashboard/summary",
  studentsOverview: "/api/v1/dashboard/students-overview",
  groupDistribution: "/api/v1/dashboard/group-distribution",
  studentsAttendanceToday: "/api/v1/dashboard/students-attendance-today",
  staffAttendanceToday: "/api/v1/dashboard/staff-attendance-today",
  upcomingHolidays: "/api/v1/dashboard/upcoming-holidays",
  holidaysList: "/api/v1/holidays",
  upcomingExaminations: "/api/v1/dashboard/upcoming-examinations",
  staffStats: "/api/v1/staff/dashboard-stats",
};

const QUICK_SETUP = [
  { label: "+ Add Campus", to: "/admin-dashboard/settings/campus-configuration", isPlus: true, tone: "setup-green" },
  { label: "+ Add Board", to: "/admin-dashboard/board-academic-year?tab=boards", isPlus: true, tone: "setup-green" },
  { label: "+ Create Academic Year", to: "/admin-dashboard/board-academic-year?tab=academic-years", isPlus: true, tone: "setup-green" },
  { label: "Add Student", to: "/admin-dashboard/admission?view=new", icon: addStudentIcon, tone: "green" },
  { label: "Add Staff", to: "/admin-dashboard/staff/add", icon: addStaffIcon, tone: "blue" },
  { label: "Create Group", to: "/admin-dashboard/courses/add", icon: createGroupIcon, tone: "violet" },
  { label: "Create Section", to: "/admin-dashboard/sections?tab=sections&view=add", icon: createSectionIcon, tone: "cyan" },
];

function unwrap(payload) {
  let value = payload;
  const visited = new Set();
  while (value && typeof value === "object" && !Array.isArray(value) && !visited.has(value)) {
    visited.add(value);
    const next = value.data ?? value.Data ?? value.result ?? value.Result;
    if (next === undefined || next === value) break;
    value = next;
  }
  return value;
}

function read(item, ...keys) {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
}

function metric(payload, keys) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue = [unwrap(payload)];
  const visited = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || visited.has(node)) continue;
    visited.add(node);
    if (!Array.isArray(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (wanted.has(key.toLowerCase())) {
          const parsed = Number(value);
          if (value !== "" && Number.isFinite(parsed)) return parsed;
        }
        if (value && typeof value === "object") queue.push(value);
      }
    }
  }
  return undefined;
}

function formatNumber(value) {
  if (value === undefined || value === null || value === "") return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
}

function greetingForHour(hour) {
  if (hour < 12) return { message: "Good Morning", icon: "🌅" };
  if (hour < 17) return { message: "Good Afternoon", icon: "☀️" };
  return { message: "Good Evening", icon: "🌙" };
}

function formattedTimestamp(date = new Date()) {
  const dateStr = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
  return `${dateStr}, ${timeStr}`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseMonthYearKey(str) {
  if (!str) return null;
  if (typeof str !== "string") str = String(str);
  str = str.trim();

  // 1. Check "YYYY-MM" or "YYYY-MM-DD"
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    if (m >= 0 && m < 12) return { year: y, month: m, key: `${y}-${String(m + 1).padStart(2, "0")}` };
  }

  // 2. Check "Mon YYYY" or "Month YYYY" e.g. "Mar 2026" or "March 2026"
  for (let m = 0; m < 12; m++) {
    const shortName = MONTH_NAMES[m];
    const fullName = FULL_MONTH_NAMES[m];
    const regex = new RegExp(`^\\s*(?:${shortName}|${fullName})\\s*(\\d{4})`, "i");
    const mMatch = str.match(regex) || str.match(new RegExp(`(?:${shortName}|${fullName})\\s+(\\d{4})`, "i"));
    if (mMatch) {
      const y = parseInt(mMatch[1], 10);
      return { year: y, month: m, key: `${y}-${String(m + 1).padStart(2, "0")}` };
    }
  }

  // 3. Fallback to new Date(str)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = d.getMonth();
    return { year: y, month: m, key: `${y}-${String(m + 1).padStart(2, "0")}` };
  }

  return null;
}

function CardHeader({ title, action, children }) {
  return (
    <header className="dashboard-card-head">
      <h2>{title}</h2>
      {action || children ? <div className="dashboard-card-head-actions">{children}{action}</div> : null}
    </header>
  );
}

function LoadingState() { return <div className="dashboard-card-loading"><SkeletonText lines={2} /></div>; }

function DashboardCardSkeleton({ variant = "chart" }) {
  return (
    <article className="dashboard-card" aria-hidden="true">
      <div className="dashboard-card-head"><Skeleton style={{ width: "52%", height: 18 }} /></div>
      <div className="dashboard-card-body">
        {variant === "chart" ? <Skeleton className="dashboard-skeleton-chart" /> : null}
        {variant === "attendance" ? <><Skeleton className="dashboard-skeleton-donut" /><div className="dashboard-skeleton-chips">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} />)}</div></> : null}
        {variant === "list" ? <div className="dashboard-skeleton-list">{Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton className="dashboard-skeleton-list-icon" /><SkeletonText lines={2} widths={["72%", "48%"]} /></div>)}</div> : null}
      </div>
    </article>
  );
}

/** Mirrors the mounted dashboard layout while its required initial requests are pending. */
function DashboardSkeleton() {
  return (
    <main className="dashboard-page dashboard-page-skeleton" aria-label="Loading dashboard" aria-busy="true">
      <div className="dashboard-header-bar"><div className="dashboard-greeting-wrap"><Skeleton style={{ width: 280, height: 28 }} /><Skeleton style={{ width: 220, height: 14, marginTop: 10 }} /></div><SkeletonButton width={156} /></div>
      <div className="dashboard-viewing-banner"><Skeleton style={{ width: "78%", height: 14 }} /></div>
      <section className="dashboard-kpi-grid" aria-label="Loading statistics">{Array.from({ length: 5 }, (_, index) => <article className="dashboard-kpi-card" key={index}><SkeletonAvatar size={42} /><div><Skeleton style={{ width: 92, height: 13 }} /><Skeleton style={{ width: 64, height: 26, marginTop: 9 }} /><Skeleton style={{ width: 78, height: 10, marginTop: 8 }} /></div></article>)}</section>
      <nav className="dashboard-quick-actions" aria-label="Loading quick actions"><Skeleton style={{ width: 108, height: 18 }} /><div className="dashboard-quick-actions-list">{Array.from({ length: 6 }, (_, index) => <SkeletonButton key={index} width={124} />)}</div></nav>
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Loading student analytics"><DashboardCardSkeleton /><DashboardCardSkeleton /><DashboardCardSkeleton variant="attendance" /></section>
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Loading staff and upcoming events"><DashboardCardSkeleton variant="attendance" /><DashboardCardSkeleton variant="list" /><DashboardCardSkeleton variant="list" /></section>
    </main>
  );
}

function ErrorState({ message = "Unable to load data.", onRetry }) {
  return (
    <div className="dashboard-card-error">
      <AlertTriangle size={18} className="dashboard-error-icon" />
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="dashboard-retry-btn" onClick={onRetry}>
          <RotateCcw size={13} /> Retry
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ message = "No data available." }) {
  return (
    <div className="dashboard-card-empty">
      <Info size={18} className="dashboard-empty-icon" />
      <span>{message}</span>
    </div>
  );
}

function ZeroStateCard({ icon: Icon, title = "No data available", subtitle, actionLabel, actionTo, onAction }) {
  return (
    <div className="dashboard-card-zero-state">
      <div className="dashboard-zero-icon-wrap">
        <Icon size={44} strokeWidth={1.5} className="dashboard-zero-icon" />
      </div>
      <h3 className="dashboard-zero-title">{title}</h3>
      {subtitle && <p className="dashboard-zero-subtitle">{subtitle}</p>}
      {actionLabel && (
        actionTo ? (
          <Link to={actionTo} className="dashboard-zero-btn">
            {actionLabel}
          </Link>
        ) : (
          <button type="button" className="dashboard-zero-btn" onClick={onAction}>
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

function CustomDonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    const dotColor = data.payload?.color || data.color || "#22a447";
    return (
      <div className="dashboard-custom-donut-tooltip">
        <span className="tooltip-dot" style={{ backgroundColor: dotColor }} />
        <span className="tooltip-name">{data.name}:</span>
        <span className="tooltip-val">{formatNumber(data.value)}</span>
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    const dotColor = data.payload?.fill || data.color || "#2563eb";
    const boys = data.payload?.boys;
    const girls = data.payload?.girls;
    const hasGender = boys !== undefined && girls !== undefined;
    return (
      <div className="dashboard-custom-donut-tooltip" style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="tooltip-dot" style={{ backgroundColor: dotColor }} />
          <span className="tooltip-name">{data.payload?.name || data.name}:</span>
          <span className="tooltip-val">{formatNumber(data.value)} Students</span>
        </div>
        {hasGender && (
          <div style={{ fontSize: "10px", color: "var(--cms-muted, #64748b)", paddingLeft: 14 }}>
            Boys: <strong style={{ color: "var(--cms-text, #1e293b)" }}>{boys}</strong> • Girls: <strong style={{ color: "var(--cms-text, #1e293b)" }}>{girls}</strong>
          </div>
        )}
      </div>
    );
  }
  return null;
}

function resolveKpiMetric(summaryData, cardKey, rawCurrentKeys, rawPrevKeys, rawPctKeys) {
  const cardObj = summaryData?.[cardKey] || summaryData?.[`${cardKey}Card`] || summaryData?.[`${cardKey}Metric`];
  
  let current = cardObj?.currentCount ?? cardObj?.CurrentCount ?? metric(summaryData, rawCurrentKeys);
  let previous = cardObj?.previousCount ?? cardObj?.PreviousCount ?? cardObj?.lastYearCount ?? cardObj?.LastYearCount ?? metric(summaryData, rawPrevKeys) ?? 0;
  let rawGrowth = cardObj?.growthPercentage ?? cardObj?.GrowthPercentage ?? cardObj?.percentageChange ?? cardObj?.PercentageChange ?? metric(summaryData, rawPctKeys);
  let status = String(cardObj?.growthStatus ?? cardObj?.GrowthStatus ?? cardObj?.status ?? cardObj?.Status ?? "").toUpperCase();

  // If there is no prior academic year student enrollment baseline recorded (initial academic year), all cards must show NEW
  const noPriorAcademicYear = Number(summaryData?.lastYearTotalStudents ?? 0) === 0;

  if (noPriorAcademicYear || Number(previous) === 0) {
    previous = 0;
    rawGrowth = null;
    status = "NEW";
  }

  const isAvailable = current !== undefined && current !== null && current !== "";
  const numCurrent = Number(current ?? 0);
  const numPrevious = Number(previous ?? 0);

  let badge = "—";
  let label = "vs last year";

  if (status === "NEW" || numPrevious === 0 || noPriorAcademicYear) {
    if (numCurrent === 0) {
      badge = "No Data";
      label = "No records";
    } else {
      badge = "NEW";
      label = "First recorded year";
    }
  } else {
    // When prior academic year exists and had operational enrollment (> 0), calculate percentage difference
    let numPct = rawGrowth !== undefined && rawGrowth !== null 
      ? Number(rawGrowth) 
      : (((numCurrent - numPrevious) * 100) / numPrevious);

    if (isNaN(numPct)) numPct = 0;

    if (numPct > 0) {
      badge = `↑ ${numPct.toFixed(1)}%`;
      label = "vs last year";
    } else if (numPct < 0) {
      badge = `↓ ${Math.abs(numPct).toFixed(1)}%`;
      label = "vs last year";
    } else {
      badge = `→ 0.0%`;
      label = "vs last year";
    }
  }

  return {
    value: isAvailable ? numCurrent : undefined,
    previousValue: numPrevious,
    badge,
    label,
    status
  };
}

function KpiCard({ label, value, icon, tone, loading, changeLabel = "vs last year", changePct = "NEW", previousValue, to }) {
  const isAvailable = value !== undefined && value !== null && value !== "";
  const numVal = Number(value ?? 0);
  const formattedPrev = isAvailable && previousValue !== undefined && previousValue !== null ? formatNumber(previousValue) : "0";
  const isZeroState = !isAvailable || (numVal === 0 && Number(previousValue ?? 0) === 0);
  const content = (
    <article className={`dashboard-kpi dashboard-kpi-${tone} ${to ? "dashboard-kpi-clickable" : ""}`} style={to ? { cursor: "pointer" } : {}}>
      <div className="dashboard-kpi-pop" role="tooltip">
        <span>Last year: <strong>{formattedPrev}</strong></span>
      </div>
      <div className="dashboard-kpi-top">
        <span className="dashboard-kpi-icon">
          <img src={icon} alt="" aria-hidden="true" />
        </span>
        <div className="dashboard-kpi-title-wrap">
          <span className="dashboard-kpi-label">{label}</span>
          <div className="dashboard-kpi-value-row">
            <strong className="dashboard-kpi-value">{loading ? "—" : formatNumber(value ?? 0)}</strong>
            {!isZeroState && isAvailable && <span className="dashboard-kpi-trend">{changePct}</span>}
          </div>
          {!isZeroState && isAvailable && <span className="dashboard-kpi-subtext">{changeLabel}</span>}
        </div>
      </div>
    </article>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {content}
      </Link>
    );
  }
  return content;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { selectedCampus, selectedCampusId } = useCampusContext();
  const { selectedBoard, selectedAcademicYear } = useAcademicContext();

  const rawCampusId = selectedCampusId || selectedCampus?.campusId || selectedCampus?.id;
  const rawBoardId = selectedBoard?.boardId || selectedBoard?.id;
  const rawAcademicYearId = selectedAcademicYear?.academicYearId || selectedAcademicYear?.id;
  const campusId = Number.isFinite(Number(rawCampusId)) && Number(rawCampusId) > 0 ? Number(rawCampusId) : undefined;
  const boardId = Number.isFinite(Number(rawBoardId)) && Number(rawBoardId) > 0 ? Number(rawBoardId) : undefined;
  const academicYearId = Number.isFinite(Number(rawAcademicYearId)) && Number(rawAcademicYearId) > 0 ? Number(rawAcademicYearId) : undefined;
  const todayDate = useMemo(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }, []);

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [lastUpdated, setLastUpdated] = useState(() => formattedTimestamp());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // State objects for cards
  const [summaryState, setSummaryState] = useState({ loading: true, error: null, data: null });
  const [overviewState, setOverviewState] = useState({ loading: true, error: null, data: null });
  const [groupState, setGroupState] = useState({ loading: true, error: null, data: null });
  const [studentAttState, setStudentAttState] = useState({ loading: true, error: null, data: null, timestamp: formattedTimestamp() });
  const [staffAttState, setStaffAttState] = useState({ loading: true, error: null, data: null, timestamp: formattedTimestamp() });
  const [holidayState, setHolidayState] = useState({ loading: true, error: null, data: null });
  const [examState, setExamState] = useState({ loading: true, error: null, data: null });
  const [staffStatsState, setStaffStatsState] = useState({ loading: false, error: null, data: null });
  const summaryData = summaryState.data;
  const overviewData = overviewState.data;
  // Show full-page skeleton only on initial cold mount; card-level loaders handle subsequent filtering smoothly
  const initialLoading = !summaryState.data && (summaryState.loading || overviewState.loading || groupState.loading || studentAttState.loading || staffAttState.loading || holidayState.loading || examState.loading);
  // Sequence ref counters for race condition protection
  const summarySeq = useRef(0);
  const overviewSeq = useRef(0);
  const groupSeq = useRef(0);
  const studentAttSeq = useRef(0);
  const staffAttSeq = useRef(0);
  const holidaySeq = useRef(0);
  const examSeq = useRef(0);
  const staffStatsSeq = useRef(0);

  // Hourly time trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // 1. GET Summary & Live Student, Group, and Section Counts
  const fetchSummary = useCallback(async () => {
    const seq = ++summarySeq.current;
    setSummaryState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
        date: todayDate,
      };

      const studentListParams = {
        ...(campusId ? { campusId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
        pageNumber: 1,
        pageSize: 1,
      };

      const groupListParams = {
        ...(boardId ? { boardId: Number(boardId) } : {}),
      };

      const sectionListParams = {
        ...(campusId ? { campusId: Number(campusId) } : {}),
        ...(boardId ? { boardId: Number(boardId) } : {}),
        ...(academicYearId ? { academicYearId: Number(academicYearId) } : {}),
      };

      const [summaryRes, studentCountRes, groupsRes, sectionsRes] = await Promise.allSettled([
        apiClient.get(DASHBOARD_API.summary, { params }),
        apiClient.get(apiEndpoints.students.list, { params: studentListParams }),
        apiClient.get(apiEndpoints.masterGroups.list, { params: groupListParams }),
        apiClient.get(apiEndpoints.sections.getAll, { params: sectionListParams }),
      ]);

      if (summarySeq.current === seq) {
        const summaryData = summaryRes.status === "fulfilled" ? (unwrap(summaryRes.value?.data) || {}) : {};
        let liveStudentCount = undefined;
        if (studentCountRes.status === "fulfilled") {
          const raw = unwrap(studentCountRes.value?.data);
          const c = Number(raw?.totalCount ?? raw?.TotalCount ?? (Array.isArray(raw) ? raw.length : undefined));
          if (Number.isFinite(c)) liveStudentCount = c;
        }

        let liveGroupCount = undefined;
        if (groupsRes.status === "fulfilled") {
          const rawGroups = unwrap(groupsRes.value?.data);
          const gList = Array.isArray(rawGroups) ? rawGroups : (rawGroups?.items || rawGroups?.$values || rawGroups?.data || []);
          if (Array.isArray(gList) && gList.length > 0) {
            const activeGroups = gList.filter((g) => g.isActive !== false && g.status !== "Inactive");
            liveGroupCount = activeGroups.length;
          }
        }

        let liveSectionCount = undefined;
        if (sectionsRes.status === "fulfilled") {
          const rawSections = unwrap(sectionsRes.value?.data);
          const sList = Array.isArray(rawSections) ? rawSections : (rawSections?.items || rawSections?.$values || rawSections?.data || []);
          if (Array.isArray(sList) && sList.length > 0) {
            const activeSections = sList.filter((s) => s.isActive !== false && s.status !== "Inactive");
            liveSectionCount = activeSections.length;
          }
        }

        const teachingCount = summaryData.teachingStaff ?? summaryData.teachingStaffCount ?? 0;
        const nonTeachingCount = summaryData.nonTeachingStaff ?? summaryData.nonTeachingStaffCount ?? 0;
        const totalStudents = liveStudentCount !== undefined ? liveStudentCount : (summaryData.totalStudents ?? summaryData.studentCount ?? 0);
        const totalGroups = liveGroupCount !== undefined ? liveGroupCount : (summaryData.totalGroups ?? summaryData.groupCount ?? 0);
        const totalSections = liveSectionCount !== undefined ? liveSectionCount : (summaryData.totalSections ?? summaryData.sectionCount ?? 0);

        const mergedData = {
          ...summaryData,
          teachingStaff: teachingCount,
          teachingStaffCount: teachingCount,
          nonTeachingStaff: nonTeachingCount,
          nonTeachingStaffCount: nonTeachingCount,
          totalStudents,
          totalStudentCount: totalStudents,
          studentCount: totalStudents,
          totalGroups,
          groupCount: totalGroups,
          totalSections,
          sectionCount: totalSections,
          admissions: summaryData.admissions ?? totalStudents,
        };

        setSummaryState({ loading: false, error: null, data: mergedData });
      }
    } catch (err) {
      if (summarySeq.current === seq) {
        setSummaryState({ loading: false, error: getApiErrorMessage(err, "Failed to load summary metrics"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId, todayDate]);

  // 2. Admission Overview (Direct from Student Admissions Module Dependency API /api/v1/student-admissions)
  const fetchStudentsOverview = useCallback(async () => {
    const seq = ++overviewSeq.current;
    setOverviewState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const admissionParams = {
        ...(campusId ? { campusId } : {}),
      };

      const [admissionsRes, backendOverviewRes] = await Promise.allSettled([
        apiClient.get(apiEndpoints.admissions.getAll, { params: admissionParams }),
        apiClient.get(DASHBOARD_API.studentsOverview, {
          params: {
            ...(campusId ? { campusId } : {}),
            ...(boardId ? { boardId } : {}),
            ...(academicYearId ? { academicYearId } : {}),
          },
        }),
      ]);

      if (overviewSeq.current === seq) {
        let allAdmissions = [];
        if (admissionsRes.status === "fulfilled") {
          const rawAdm = unwrap(admissionsRes.value?.data);
          allAdmissions = (Array.isArray(rawAdm) ? rawAdm : (rawAdm?.items || rawAdm?.$values || [])).filter((adm) => {
            if (campusId && Number(adm.campusId ?? adm.CampusId) !== campusId) return false;
            if (boardId && Number(adm.boardId ?? adm.BoardId) !== boardId) return false;
            if (academicYearId && Number(adm.academicYearId ?? adm.AcademicYearId) !== academicYearId) return false;
            return true;
          });
        }

        const backendData = backendOverviewRes.status === "fulfilled" ? (unwrap(backendOverviewRes.value?.data) || {}) : {};

        const totalAdmissions = allAdmissions.length > 0
          ? allAdmissions.length
          : Number(backendData.totalStudents ?? backendData.totalCount ?? 0);

        let boysCount = 0;
        let girlsCount = 0;

        if (allAdmissions.length > 0) {
          allAdmissions.forEach((adm) => {
            const g = String(adm.gender ?? adm.Gender ?? "").toLowerCase().trim();
            if (g === "male" || g === "m" || g === "boy" || g === "boys") boysCount++;
            else if (g === "female" || g === "f" || g === "girl" || g === "girls") girlsCount++;
          });
        } else {
          boysCount = Number(backendData.maleStudents ?? backendData.boys ?? backendData.boysCount ?? 0);
          girlsCount = Number(backendData.femaleStudents ?? backendData.girls ?? backendData.girlsCount ?? 0);
        }

        // Generate actual monthly trend from admission dates
        const monthlyCounts = new Map();
        allAdmissions.forEach((adm) => {
          const dateVal = adm.admissionDate ?? adm.AdmissionDate ?? adm.createdAt ?? adm.CreatedAt;
          const parsed = parseMonthYearKey(dateVal);
          if (parsed) {
            monthlyCounts.set(parsed.key, (monthlyCounts.get(parsed.key) || 0) + 1);
          }
        });

        let calculatedTrend = [];
        if (monthlyCounts.size > 0) {
          monthlyCounts.forEach((count, key) => {
            const [y, m] = key.split("-").map(Number);
            calculatedTrend.push({
              period: `${MONTH_NAMES[m - 1]} ${y}`,
              month: `${MONTH_NAMES[m - 1]} ${y}`,
              sortDate: `${key}-01`,
              studentsJoined: count,
              count,
              value: count,
            });
          });
          calculatedTrend.sort((a, b) => a.sortDate.localeCompare(b.sortDate));
        } else {
          const rawTrend = backendData.monthlyTrend || backendData.trend || [];
          calculatedTrend = rawTrend.map((item) => ({
            ...item,
            period: item.period || item.month,
            month: item.month || item.period,
            studentsJoined: item.studentsJoined ?? item.count ?? item.value ?? 0,
            count: item.studentsJoined ?? item.count ?? item.value ?? 0,
            value: item.studentsJoined ?? item.count ?? item.value ?? 0,
          }));
        }

        const mergedData = {
          ...backendData,
          totalAdmissions,
          totalStudents: totalAdmissions,
          totalCount: totalAdmissions,
          boys: boysCount,
          boysCount,
          girls: girlsCount,
          girlsCount,
          trend: calculatedTrend,
          monthlyTrend: calculatedTrend,
        };

        setOverviewState({ loading: false, error: null, data: mergedData });
      }
    } catch (err) {
      if (overviewSeq.current === seq) {
        setOverviewState({ loading: false, error: getApiErrorMessage(err, "Failed to load admission overview"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  // 3. GET /api/v1/dashboard/group-distribution & Live Group & Student Management Integration
  const fetchGroupDistribution = useCallback(async () => {
    const seq = ++groupSeq.current;
    setGroupState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
      };

      const groupParams = {
        ...(boardId ? { boardId: Number(boardId) } : {}),
      };

      const studentListParams = {
        ...(campusId ? { campusId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
        pageNumber: 1,
        pageSize: 200,
      };

      const [groupDistRes, masterGroupsRes, studentsRes] = await Promise.allSettled([
        apiClient.get(DASHBOARD_API.groupDistribution, { params }),
        apiClient.get(apiEndpoints.masterGroups.list, { params: groupParams }),
        apiClient.get(apiEndpoints.students.list, { params: studentListParams }),
      ]);

      if (groupSeq.current === seq) {
        const backendData = groupDistRes.status === "fulfilled" ? (unwrap(groupDistRes.value?.data) || {}) : {};
        const rawBackendItems = backendData?.items || backendData?.groups || (Array.isArray(backendData) ? backendData : []);

        // 1. Extract Master Groups from Group Management dependency API
        let masterGroups = [];
        if (masterGroupsRes.status === "fulfilled") {
          const rawMG = unwrap(masterGroupsRes.value?.data);
          const mgList = Array.isArray(rawMG) ? rawMG : (rawMG?.items || rawMG?.$values || rawMG?.data || []);
          if (Array.isArray(mgList)) {
            masterGroups = mgList.filter((g) => g.isActive !== false && g.status !== "Inactive");
          }
        }

        // 2. Extract Students from Student Management dependency API
        let studentsList = [];
        if (studentsRes.status === "fulfilled") {
          const rawStudents = unwrap(studentsRes.value?.data);
          studentsList = Array.isArray(rawStudents) ? rawStudents : (rawStudents?.items || rawStudents?.$values || rawStudents?.data || []);
        }

        // 3. Aggregate live student counts, boys, and girls by Group
        const studentCountsByGroup = new Map();
        let totalLiveStudents = 0;
        let totalLiveBoys = 0;
        let totalLiveGirls = 0;

        if (Array.isArray(studentsList) && studentsList.length > 0) {
          studentsList.forEach((st) => {
            const gId = st.groupId ?? st.GroupId;
            const gName = String(st.groupName ?? st.GroupName ?? st.groupCode ?? st.GroupCode ?? "").trim();
            const gender = String(st.gender ?? st.Gender ?? "").toLowerCase().trim();
            const isBoy = gender === "male" || gender === "m" || gender === "boy" || gender === "boys";
            const isGirl = gender === "female" || gender === "f" || gender === "girl" || gender === "girls";

            totalLiveStudents++;
            if (isBoy) totalLiveBoys++;
            if (isGirl) totalLiveGirls++;

            const keys = [];
            if (gId != null && gId !== "") keys.push(String(gId));
            if (gName) keys.push(gName.toUpperCase());

            keys.forEach((key) => {
              if (!studentCountsByGroup.has(key)) {
                studentCountsByGroup.set(key, { count: 0, boys: 0, girls: 0 });
              }
              const entry = studentCountsByGroup.get(key);
              entry.count++;
              if (isBoy) entry.boys++;
              if (isGirl) entry.girls++;
            });
          });
        }

        // 4. Construct unified group items representing ALL active groups from Database & Group Management
        const groupMap = new Map();

        // Authoritative seed: Backend Items (from Groups & Students join for this Board and Campus)
        rawBackendItems.forEach((item) => {
          const id = item.groupId || item.id;
          const name = String(item.groupName || item.name || item.groupCode || item.code || "Group").trim();
          const code = String(item.groupCode || item.code || name).trim();
          const key = name.toUpperCase();

          const liveStats = studentCountsByGroup.get(String(id)) || studentCountsByGroup.get(key) || studentCountsByGroup.get(code.toUpperCase());
          const count = liveStats ? liveStats.count : Number(item.totalStudents ?? item.studentCount ?? item.value ?? item.count ?? 0);
          const boys = liveStats ? liveStats.boys : Number(item.boys ?? item.boysCount ?? 0);
          const girls = liveStats ? liveStats.girls : Number(item.girls ?? item.girlsCount ?? 0);

          groupMap.set(key, {
            ...item,
            id,
            groupId: id,
            name,
            groupName: name,
            code,
            groupCode: code,
            value: count,
            studentCount: count,
            count,
            totalStudents: count,
            boys,
            girls,
          });
        });

        // Add any additional active master groups from Group Management that were not in backend items
        masterGroups.forEach((mg) => {
          const id = mg.groupId ?? mg.masterGroupId ?? mg.id;
          const name = String(mg.groupName ?? mg.name ?? mg.groupCode ?? mg.code ?? "Group").trim();
          const code = String(mg.groupCode ?? mg.code ?? name).trim();
          const key = name.toUpperCase();

          if (!groupMap.has(key)) {
            const liveStats = studentCountsByGroup.get(String(id)) || studentCountsByGroup.get(key) || studentCountsByGroup.get(code.toUpperCase()) || { count: 0, boys: 0, girls: 0 };
            groupMap.set(key, {
              id,
              groupId: id,
              name,
              groupName: name,
              code,
              groupCode: code,
              value: liveStats.count,
              studentCount: liveStats.count,
              count: liveStats.count,
              totalStudents: liveStats.count,
              boys: liveStats.boys,
              girls: liveStats.girls,
            });
          }
        });

        const normalizedItems = Array.from(groupMap.values());
        normalizedItems.sort((a, b) => (b.value - a.value) || a.name.localeCompare(b.name));

        const totalEnrolled = totalLiveStudents > 0
          ? totalLiveStudents
          : (backendData?.totalStudents ?? normalizedItems.reduce((acc, curr) => acc + (curr.value || 0), 0));
        const enrolledBoys = totalLiveBoys > 0
          ? totalLiveBoys
          : (backendData?.boys ?? backendData?.boysCount ?? normalizedItems.reduce((acc, curr) => acc + (Number(curr.boys) || 0), 0));
        const enrolledGirls = totalLiveGirls > 0
          ? totalLiveGirls
          : (backendData?.girls ?? backendData?.girlsCount ?? normalizedItems.reduce((acc, curr) => acc + (Number(curr.girls) || 0), 0));

        const groupPayload = {
          items: normalizedItems,
          groups: normalizedItems,
          totalStudents: totalEnrolled,
          boys: enrolledBoys,
          boysCount: enrolledBoys,
          girls: enrolledGirls,
          girlsCount: enrolledGirls,
        };

        setGroupState({ loading: false, error: null, data: groupPayload });
      }
    } catch (err) {
      if (groupSeq.current === seq) {
        setGroupState({ loading: false, error: getApiErrorMessage(err, "Failed to load group distribution"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  // 3b. GET /api/v1/staff/dashboard-stats & Live Staff Management Counts (GET /api/v1/staff)
  const fetchStaffStats = useCallback(async () => {
    const seq = ++staffStatsSeq.current;
    setStaffStatsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
      const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;
      const activeCampusId = selectedCampusId || selectedCampus?.id || selectedCampus?.campusId;

      const baseParams = {
        ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
        ...(activeCampusId ? { campusId: Number(activeCampusId) || activeCampusId } : {}),
      };

      // Query staff/dashboard-stats and both Staff Management listing endpoints simultaneously
      const [statsRes, teachingRes, nonTeachingRes] = await Promise.allSettled([
        apiClient.get(DASHBOARD_API.staffStats, { params: baseParams }),
        apiClient.get(apiEndpoints.faculty.list, {
          params: {
            ...baseParams,
            PageNumber: 1,
            PageSize: 1,
            StaffType: "Teaching",
            ...(activeBoardCode ? { boardCode: activeBoardCode } : {}),
          },
        }),
        apiClient.get(apiEndpoints.faculty.list, {
          params: {
            ...baseParams,
            PageNumber: 1,
            PageSize: 1,
            StaffType: "Non-Teaching",
            ...(activeBoardCode ? { boardCode: activeBoardCode } : {}),
          },
        }),
      ]);

      if (staffStatsSeq.current === seq) {
        const statsData = statsRes.status === "fulfilled" ? (unwrap(statsRes.value?.data) || {}) : {};
        const teachingListCount = teachingRes.status === "fulfilled"
          ? (teachingRes.value?.data?.totalCount ?? teachingRes.value?.data?.TotalCount)
          : undefined;
        const nonTeachingListCount = nonTeachingRes.status === "fulfilled"
          ? (nonTeachingRes.value?.data?.totalCount ?? nonTeachingRes.value?.data?.TotalCount)
          : undefined;

        const resolvedTeaching = Number(statsData.teachingStaff ?? statsData.teachingCount ?? teachingListCount ?? 0);
        const resolvedNonTeaching = Number(statsData.nonTeachingStaff ?? statsData.nonTeachingCount ?? nonTeachingListCount ?? 0);

        const resolvedTotal = (typeof resolvedTeaching === "number" && typeof resolvedNonTeaching === "number")
          ? resolvedTeaching + resolvedNonTeaching
          : Number(statsData.totalStaff ?? statsData.totalCount ?? 0);

        setStaffStatsState({
          loading: false,
          error: null,
          data: {
            ...statsData,
            teachingStaff: resolvedTeaching,
            teachingStaffCount: resolvedTeaching,
            nonTeachingStaff: resolvedNonTeaching,
            nonTeachingStaffCount: resolvedNonTeaching,
            totalStaff: resolvedTotal,
            totalCount: resolvedTotal,
          },
        });
      }
    } catch (err) {
      if (staffStatsSeq.current === seq) {
        setStaffStatsState({ loading: false, error: getApiErrorMessage(err, "Failed to load staff stats"), data: null });
      }
    }
  }, [selectedBoard, selectedCampus, selectedCampusId, boardId, campusId]);


  // 4. Load student attendance from Student Attendance module endpoint with fallback to dashboard SP
  const fetchStudentAttendance = useCallback(async () => {
    const seq = ++studentAttSeq.current;
    setStudentAttState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId: Number(academicYearId) } : {}),
        ...(boardId ? { boardId: Number(boardId) } : {}),
        ...(campusId ? { campusId: Number(campusId) } : {}),
        date: todayDate,
      };

      let attendance = null;
      let lastUpdated = "Today";

      // 1. Primary: Student Attendance module endpoint (/api/v1/attendance/admin/students)
      try {
        const res = await apiClient.get(apiEndpoints.attendance.studentAdminDaily, { params });
        const raw = unwrap(res.data);
        const rows = Array.isArray(raw) ? raw : (raw?.items || raw?.$values || []);

        if (Array.isArray(rows) && rows.length > 0) {
          const totalEnrolled = rows.length;
          let present = 0;
          let absent = 0;
          let halfDay = 0;
          let markedCount = 0;

          rows.forEach((row) => {
            const mRaw = row.morningStatus ?? row.MorningStatus;
            const aRaw = row.afternoonStatus ?? row.AfternoonStatus;
            const fallbackRaw = row.status ?? row.Status;

            const morning = normalizeStudentStatus(mRaw ?? (aRaw == null ? fallbackRaw : null));
            const afternoon = normalizeStudentStatus(aRaw ?? (mRaw == null ? fallbackRaw : null));

            const rawNorm = (v) => String(v ?? "").toLowerCase().replace(/[\s_-]/g, "");
            const mNum = Number(mRaw);
            const aNum = Number(aRaw);
            const statusNum = Number(fallbackRaw);
            const mStr = rawNorm(mRaw);
            const aStr = rawNorm(aRaw);
            const statusStr = rawNorm(fallbackRaw);

            const isLateOrHalfDay =
              morning === "Half Day" || afternoon === "Half Day" ||
              (morning === "Present" && afternoon === "Absent") ||
              (afternoon === "Present" && morning === "Absent") ||
              mNum === 3 || mNum === 4 || aNum === 3 || aNum === 4 ||
              mStr === "late" || mStr === "halfday" ||
              aStr === "late" || aStr === "halfday" ||
              (mRaw == null && aRaw == null && (statusNum === 3 || statusNum === 4 || statusStr === "late" || statusStr === "halfday"));

            const isPresent =
              morning === "Present" || afternoon === "Present" ||
              (mRaw == null && aRaw == null && (statusNum === 1 || statusStr === "present"));

            const isAbsent =
              morning === "Absent" || afternoon === "Absent" ||
              mNum === 6 || aNum === 6 || mStr === "leave" || aStr === "leave" ||
              (mRaw == null && aRaw == null && (statusNum === 2 || statusNum === 6 || statusStr === "absent" || statusStr === "leave"));

            const isMarked =
              Boolean(row.isAttendanceMarked || row.IsAttendanceMarked) ||
              (morning !== null && morning !== undefined) ||
              (afternoon !== null && afternoon !== undefined) ||
              isLateOrHalfDay || isPresent || isAbsent;

            if (isMarked) {
              if (isLateOrHalfDay) {
                halfDay++;
                markedCount++;
              } else if (isPresent) {
                present++;
                markedCount++;
              } else if (isAbsent) {
                absent++;
                markedCount++;
              }
            }
          });

          const percentage = (markedCount > 0 && totalEnrolled > 0)
            ? Number((((present + 0.5 * halfDay) / totalEnrolled) * 100).toFixed(1))
            : 0;

          attendance = {
            total: totalEnrolled,
            marked: markedCount,
            markedStudents: markedCount,
            present,
            absent,
            halfDay,
            percentage,
            hasMarked: markedCount > 0,
          };
        }
      } catch (err) {
        // Fallback to Dashboard SP below
      }

      // 2. Fallback: Dashboard SP endpoint (/api/v1/dashboard/students-attendance-today)
      if (!attendance) {
        const res = await apiClient.get(DASHBOARD_API.studentsAttendanceToday, {
          params: { ...params, viewBy: "Overall" },
        });
        const att = unwrap(res.data) || {};
        const total = att.totalStudents ?? att.total ?? att.totalCount ?? 0;
        const present = att.present ?? att.presentCount ?? 0;
        const absent = att.absent ?? att.absentCount ?? 0;
        const halfDay = att.halfDay ?? att.halfDayCount ?? att.late ?? 0;
        const marked = (att.markedStudents != null && att.markedStudents > 0)
          ? att.markedStudents
          : (att.markedCount != null && att.markedCount > 0)
            ? att.markedCount
            : (present + absent + halfDay);
        const hasMarked = marked > 0 || (present + halfDay > 0);
        const percentage = att.attendancePercentage ?? att.percentage ?? (hasMarked && total > 0 ? Number((((present + 0.5 * halfDay) / total) * 100).toFixed(1)) : 0);

        attendance = {
          total,
          marked,
          markedStudents: marked,
          present,
          absent,
          halfDay,
          percentage: Number(Number(percentage).toFixed(1)),
          hasMarked,
        };
        lastUpdated = att.lastUpdated || att.lastUpdatedTime || "Today";
      }

      if (studentAttSeq.current === seq) {
        setStudentAttState({ loading: false, error: null, data: attendance, timestamp: lastUpdated });
      }
    } catch (err) {
      if (studentAttSeq.current === seq) {
        setStudentAttState((prev) => ({ ...prev, loading: false, error: getApiErrorMessage(err, "Failed to load student attendance"), data: null }));
      }
    }
  }, [campusId, boardId, academicYearId, todayDate]);

  // 5. Load staff attendance from Staff Attendance module endpoint with fallback to dashboard SP
  const fetchStaffAttendance = useCallback(async () => {
    const seq = ++staffAttSeq.current;
    setStaffAttState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const payload = {
        date: todayDate,
        attendanceDate: todayDate,
        ...(campusId ? { campusId: Number(campusId) } : {}),
        ...(boardId ? { boardId: Number(boardId) } : {}),
        ...(academicYearId ? { academicYearId: Number(academicYearId) } : {}),
      };

      let staffData = null;
      let lastUpdated = "Today";

      // 1. Primary: Staff Attendance module endpoint (/api/v1/staff-attendance/load)
      try {
        const res = await apiClient.post(apiEndpoints.staffAttendance.load, payload);
        const raw = unwrap(res.data);
        const rows = Array.isArray(raw) ? raw : (raw?.items || raw?.$values || []);

        if (Array.isArray(rows) && rows.length > 0) {
          const totalStaff = rows.length;
          let present = 0;
          let absent = 0;
          let late = 0;
          let onLeave = 0;
          let markedCount = 0;
          let teachingCount = 0;
          let nonTeachingCount = 0;

          rows.forEach((row) => {
            const sType = row.staffType ?? row.StaffType;
            const isTeaching = sType === 1 || sType === "Teaching" ||
              (String(sType || "").toLowerCase().includes("teaching") && !String(sType || "").toLowerCase().includes("non"));
            if (isTeaching) teachingCount++;
            else nonTeachingCount++;

            const statusVal = row.status ?? row.Status;
            const inTimeVal = row.inTime ?? row.InTime;
            const isMarked = Boolean(row.isAttendanceMarked || row.IsAttendanceMarked) || statusVal != null || Boolean(inTimeVal);
            if (isMarked) {
              const stNum = Number(statusVal);
              const stStr = String(statusVal ?? "").toLowerCase().replace(/[\s_-]/g, "");
              const isLateFlag = Boolean(row.isLate || row.IsLate);
              if (stNum === 3 || stStr === "late") {
                late++;
                markedCount++;
              } else if (stNum === 1 || stStr === "present") {
                if (isLateFlag) late++;
                else present++;
                markedCount++;
              } else if (stNum === 2 || stStr === "absent") {
                absent++;
                markedCount++;
              } else if (stNum === 4 || stNum === 6 || stStr === "leave" || stStr === "halfday") {
                onLeave++;
                markedCount++;
              } else if (inTimeVal && stNum !== 5 && stStr !== "holiday") {
                if (isLateFlag) late++;
                else present++;
                markedCount++;
              }
            }
          });

          // In Staff Attendance (biometric/HR):
          // Attendance % = ((Present + Late) / TotalStaff) * 100
          const percentage = (markedCount > 0 && totalStaff > 0)
            ? Number((((present + late) / totalStaff) * 100).toFixed(1))
            : 0;

          staffData = {
            total: totalStaff,
            marked: markedCount,
            markedStaff: markedCount,
            present,
            absent,
            late,
            onLeave,
            percentage,
            teachingCount,
            nonTeachingCount,
            hasMarked: markedCount > 0,
          };
        }
      } catch (err) {
        // Fallback to Dashboard SP below
      }

      // 2. Fallback: Dashboard SP endpoint (/api/v1/dashboard/staff-attendance-today)
      if (!staffData) {
        const params = {
          ...(boardId ? { boardId } : {}),
          ...(campusId ? { campusId } : {}),
          ...(academicYearId ? { academicYearId } : {}),
          date: todayDate,
          staffType: "all",
        };
        const res = await apiClient.get(DASHBOARD_API.staffAttendanceToday, { params });
        const stf = unwrap(res.data) || {};
        const total = stf.totalStaff ?? stf.total ?? stf.totalCount ?? 0;
        const present = stf.present ?? stf.presentCount ?? 0;
        const absent = stf.absent ?? stf.absentCount ?? 0;
        const late = stf.late ?? stf.lateCount ?? 0;
        const onLeave = stf.onLeave ?? stf.onLeaveCount ?? stf.leaveCount ?? 0;
        const marked = (stf.markedStaff != null && stf.markedStaff > 0)
          ? stf.markedStaff
          : (stf.markedCount != null && stf.markedCount > 0)
            ? stf.markedCount
            : (present + absent + late + onLeave);
        const hasMarked = (present + late + onLeave > 0) || marked > 0;
        const percentage = stf.attendancePercentage ?? stf.percentage ?? (hasMarked && total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 0);

        staffData = {
          total,
          marked,
          markedStaff: marked,
          present,
          absent,
          late,
          onLeave,
          percentage: Number(Number(percentage).toFixed(1)),
          teachingCount: stf.teachingCount,
          nonTeachingCount: stf.nonTeachingCount,
          hasMarked,
        };
        lastUpdated = stf.lastUpdated || stf.lastUpdatedTime || "Today";
      }

      if (staffAttSeq.current === seq) {
        setStaffAttState({
          loading: false,
          error: null,
          data: staffData,
          timestamp: lastUpdated,
        });
      }
    } catch (err) {
      if (staffAttSeq.current === seq) {
        setStaffAttState((prev) => ({ ...prev, loading: false, error: getApiErrorMessage(err, "Failed to load staff attendance"), data: null }));
      }
    }
  }, [campusId, boardId, academicYearId, todayDate]);

  // 6. GET /api/v1/dashboard/upcoming-holidays (with direct sync to Holiday Management /api/v1/holidays)
  const fetchUpcomingHolidays = useCallback(async () => {
    const seq = ++holidaySeq.current;
    setHolidayState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
        limit: 20,
      };
      let holidays = [];
      try {
        const res = await apiClient.get(DASHBOARD_API.upcomingHolidays, { params });
        const raw = unwrap(res.data);
        holidays = Array.isArray(raw) ? raw : (raw?.items || raw?.$values || raw?.holidays || []);
      } catch {
        // Fallback directly to Holiday Management dependency API
      }

      if (!holidays || holidays.length === 0) {
        try {
          const res = await apiClient.get(apiEndpoints.holidays.list, { params: { ...params, pageSize: 20, status: "Active" } });
          const raw = unwrap(res.data);
          holidays = Array.isArray(raw) ? raw : (raw?.items || raw?.$values || raw?.holidays || []);
        } catch {
          // ignore
        }
      }

      if (holidaySeq.current === seq) {
        setHolidayState({ loading: false, error: null, data: holidays });
      }
    } catch (err) {
      if (holidaySeq.current === seq) {
        setHolidayState({ loading: false, error: getApiErrorMessage(err, "Failed to load upcoming holidays"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  // 7. GET /api/v1/dashboard/upcoming-examinations (with direct sync to Examination module /api/v1/examinations)
  const fetchUpcomingExaminations = useCallback(async () => {
    const seq = ++examSeq.current;
    setExamState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
      };
      let exams = [];
      try {
        const res = await apiClient.get(DASHBOARD_API.upcomingExaminations, { params });
        const raw = unwrap(res.data);
        exams = Array.isArray(raw) ? raw : (raw?.items || raw?.$values || raw?.examinations || []);
      } catch {
        // Fallback directly to Examination module dependency API
      }

      if (!exams || exams.length === 0) {
        try {
          const res = await apiClient.get(apiEndpoints.examinations.list, { params });
          const raw = unwrap(res.data);
          exams = Array.isArray(raw) ? raw : (raw?.items || raw?.$values || raw?.examinations || []);
        } catch {
          // ignore
        }
      }

      if (examSeq.current === seq) {
        setExamState({ loading: false, error: null, data: exams });
      }
    } catch (err) {
      if (examSeq.current === seq) {
        setExamState({ loading: false, error: getApiErrorMessage(err, "Failed to load upcoming examinations"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  // Campus, Board & Academic Year Context change effect -> Refresh all applicable cards
  useEffect(() => {
    fetchSummary();
    fetchStudentsOverview();
    fetchGroupDistribution();
    fetchStaffStats();
    fetchUpcomingHolidays();
    fetchUpcomingExaminations();
  }, [fetchSummary, fetchStudentsOverview, fetchGroupDistribution, fetchStaffStats, fetchUpcomingHolidays, fetchUpcomingExaminations]);

  // Load attendance cards when their scope changes
  useEffect(() => {
    fetchStudentAttendance();
    fetchStaffAttendance();
  }, [fetchStudentAttendance, fetchStaffAttendance]);

  useLiveModuleSync({
    moduleName: "Admissions",
    campusId,
    debounceMs: 1000,
    onRefresh: () => {
      fetchSummary();
      fetchStudentsOverview();
    }
  });

  useLiveModuleSync({
    moduleName: "Attendance",
    campusId,
    debounceMs: 1000,
    onRefresh: () => {
      fetchStudentAttendance();
      fetchStaffAttendance();
    }
  });

  useLiveModuleSync({
    moduleName: "Examinations",
    campusId,
    debounceMs: 1000,
    onRefresh: () => {
      fetchUpcomingExaminations();
    }
  });

  // Full Refresh Dashboard handler
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchSummary(),
      fetchStudentsOverview(),
      fetchGroupDistribution(),
      fetchStaffStats(),
      fetchStudentAttendance(),
      fetchStaffAttendance(),
      fetchUpcomingHolidays(),
      fetchUpcomingExaminations(),
    ]);
    setIsRefreshing(false);
    const now = new Date();
    const formattedNow = formattedTimestamp(now);
    setLastUpdated(formattedNow);
    setToastMessage(`Dashboard refreshed with latest data (${formattedNow})`);
  }, [fetchSummary, fetchStudentsOverview, fetchGroupDistribution, fetchStudentAttendance, fetchStaffAttendance, fetchUpcomingHolidays, fetchUpcomingExaminations]);

  // Extracted KPI Values & Metrics dynamically resolved from Backend API
  // Reconcile Total Students strictly from live Student Management (apiEndpoints.students.list / summary)
  const studentManagementCount = useMemo(() => {
    const fromSummary = summaryState.data?.totalStudents ?? summaryState.data?.totalStudentCount ?? summaryState.data?.studentCount;
    if (fromSummary !== undefined && fromSummary !== null && !isNaN(Number(fromSummary))) {
      return Number(fromSummary);
    }
    const fromGroupState = Number(groupState.data?.totalStudents ?? 0);
    if (fromGroupState > 0) return fromGroupState;
    return null;
  }, [summaryState.data, groupState.data]);

  const reconciledSummaryData = useMemo(() => {
    if (!summaryState.data && !staffStatsState.data && !groupState.data) return summaryState.data;
    const base = summaryState.data ? { ...summaryState.data } : {};

    if (studentManagementCount && studentManagementCount > 0) {
      base.totalStudents = studentManagementCount;
      base.totalStudentCount = studentManagementCount;
      base.studentCount = studentManagementCount;
    }

    const groupCountFromGroupState = Array.isArray(groupState.data?.items) ? groupState.data.items.length : 0;
    if (base.totalGroups === undefined || base.totalGroups === null) {
      base.totalGroups = groupCountFromGroupState;
      base.groupCount = groupCountFromGroupState;
    } else {
      base.groupCount = base.totalGroups;
    }

    if (staffStatsState.data) {
      const t = Number(staffStatsState.data.teachingStaff ?? staffStatsState.data.teachingCount);
      const nt = Number(staffStatsState.data.nonTeachingStaff ?? staffStatsState.data.nonTeachingCount);
      if (!isNaN(t) && t >= 0) {
        base.teachingStaff = t;
        base.teachingStaffCount = t;
      }
      if (!isNaN(nt) && nt >= 0) {
        base.nonTeachingStaff = nt;
        base.nonTeachingStaffCount = nt;
      }
    }

    return base;
  }, [summaryState.data, studentManagementCount, staffStatsState.data, groupState.data]);

  const studentsKpi = resolveKpiMetric(reconciledSummaryData || summaryState.data, "totalStudents", ["totalStudents", "totalStudentCount", "studentCount"], ["lastYearTotalStudents", "lastYearStudentCount"], ["studentsVsLastYearPercentage"]);
  const teachingKpi = resolveKpiMetric(reconciledSummaryData || summaryState.data, "teachingStaff", ["teachingStaff", "teachingStaffCount"], ["lastYearTeachingStaff", "lastYearTeachingStaffCount"], ["teachingStaffVsLastYearPercentage"]);
  const nonTeachingKpi = resolveKpiMetric(reconciledSummaryData || summaryState.data, "nonTeachingStaff", ["nonTeachingStaff", "nonTeachingStaffCount"], ["lastYearNonTeachingStaff", "lastYearNonTeachingStaffCount"], ["nonTeachingStaffVsLastYearPercentage"]);
  const groupsKpi = resolveKpiMetric(reconciledSummaryData || summaryState.data, "totalGroups", ["totalGroups", "groupCount"], ["lastYearTotalGroups", "lastYearGroupCount"], ["groupsVsLastYearPercentage"]);
  const sectionsKpi = resolveKpiMetric(reconciledSummaryData || summaryState.data, "totalSections", ["totalSections", "sectionCount"], ["lastYearTotalSections", "lastYearSectionCount"], ["sectionsVsLastYearPercentage"]);

  const kpis = [
    {
      label: "Total Students",
      value: (studentManagementCount ?? studentsKpi.value) ?? 0,
      previousValue: studentsKpi.previousValue ?? 0,
      icon: totalStudentsIcon,
      tone: "green",
      changeLabel: studentsKpi.label,
      changePct: studentsKpi.badge,
      to: "/admin-dashboard/students",
    },
    {
      label: "Teaching Staff",
      value: (staffStatsState.data?.teachingStaff !== undefined ? staffStatsState.data.teachingStaff : teachingKpi.value) ?? 0,
      previousValue: teachingKpi.previousValue ?? 0,
      icon: teachingStaffIcon,
      tone: "blue",
      changeLabel: teachingKpi.label,
      changePct: teachingKpi.badge,
      to: "/admin-dashboard/staff/teaching",
    },
    {
      label: "Non-Teaching Staff",
      value: (staffStatsState.data?.nonTeachingStaff !== undefined ? staffStatsState.data.nonTeachingStaff : nonTeachingKpi.value) ?? 0,
      previousValue: nonTeachingKpi.previousValue ?? 0,
      icon: nonTeachingStaffIcon,
      tone: "orange",
      changeLabel: nonTeachingKpi.label,
      changePct: nonTeachingKpi.badge,
      to: "/admin-dashboard/staff/non-teaching",
    },
    {
      label: "Total Groups",
      value: groupsKpi.value ?? 0,
      previousValue: groupsKpi.previousValue ?? 0,
      icon: totalGroupsIcon,
      tone: "violet",
      changeLabel: groupsKpi.label,
      changePct: groupsKpi.badge,
      to: "/admin-dashboard/courses",
    },
    {
      label: "Total Sections",
      value: sectionsKpi.value ?? 0,
      previousValue: sectionsKpi.previousValue ?? 0,
      icon: totalSectionsIcon,
      tone: "cyan",
      changeLabel: sectionsKpi.label,
      changePct: sectionsKpi.badge,
      to: "/admin-dashboard/sections",
    },
  ];

  // Admission Overview container ref and responsive width tracking
  const overviewContainerRef = useRef(null);
  const [overviewWidth, setOverviewWidth] = useState(0);

  useEffect(() => {
    const el = overviewContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el) {
        setOverviewWidth(el.clientWidth || el.getBoundingClientRect().width || 0);
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        if (entries && entries[0] && entries[0].contentRect) {
          setOverviewWidth(entries[0].contentRect.width);
        } else {
          updateWidth();
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, []);

  // Students Overview Normalized Trend Data (Consecutive months from Academic Year start up to present month)
  const overviewChartData = useMemo(() => {
    const raw = overviewState.data?.monthlyTrend || overviewState.data?.trend || overviewState.data?.admissionTrend || overviewState.data?.items || (Array.isArray(overviewState.data) ? overviewState.data : []);
    if (!Array.isArray(raw)) return [];

    // 1. Build counts lookup from raw backend trend data
    const countsMap = new Map();
    let earliestRaw = null;
    let latestRaw = null;

    raw.forEach((item) => {
      const periodStr = item.period || item.Period || item.month || item.Month || item.label || item.sortDate || item.SortDate || item.date || "";
      const parsed = parseMonthYearKey(periodStr);
      const count = Number(item.studentsJoined ?? item.StudentsJoined ?? item.value ?? item.count ?? 0);
      if (parsed) {
        countsMap.set(parsed.key, (countsMap.get(parsed.key) || 0) + count);
        const parsedVal = parsed.year * 12 + parsed.month;
        if (!earliestRaw || parsedVal < earliestRaw.year * 12 + earliestRaw.month) {
          earliestRaw = parsed;
        }
        if (!latestRaw || parsedVal > latestRaw.year * 12 + latestRaw.month) {
          latestRaw = parsed;
        }
      }
    });

    // 2. Determine Academic Year start (Year & Month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11 (e.g. Sep = 8)

    const rawStartDate = selectedAcademicYear?.startDate || selectedAcademicYear?.StartDate;
    let startY = null;
    let startM = null;

    if (rawStartDate) {
      const sDate = new Date(rawStartDate);
      if (!isNaN(sDate.getTime())) {
        startY = sDate.getFullYear();
        startM = sDate.getMonth();
      }
    }

    if (startY === null) {
      const yearName = String(selectedAcademicYear?.name || selectedAcademicYear?.code || selectedAcademicYear?.label || "");
      const match = yearName.match(/(\d{4})/);
      if (match) {
        startY = parseInt(match[1], 10);
        // Always start from January (0) to show the full year trend and allow dragging back
        startM = 0;
      } else {
        startY = earliestRaw ? earliestRaw.year : currentYear;
        startM = earliestRaw ? earliestRaw.month : 0;
      }
    }

    // Ensure start date doesn't miss earlier recorded admissions
    if (earliestRaw) {
      const startVal = startY * 12 + startM;
      const earliestRawVal = earliestRaw.year * 12 + earliestRaw.month;
      if (earliestRawVal < startVal) {
        startY = earliestRaw.year;
        startM = earliestRaw.month;
      }
    }

    // 3. Determine End Year & End Month (Present month, or academic year end if past year, or latest raw date)
    let endY = currentYear;
    let endM = currentMonth;

    const rawEndDate = selectedAcademicYear?.endDate || selectedAcademicYear?.EndDate;
    if (rawEndDate) {
      const eDate = new Date(rawEndDate);
      if (!isNaN(eDate.getTime()) && eDate < now) {
        // Entire academic year is in the past
        endY = eDate.getFullYear();
        endM = eDate.getMonth();
      }
    }

    // If future admissions exist in raw, include up to latest raw date
    if (latestRaw) {
      const endVal = endY * 12 + endM;
      const latestRawVal = latestRaw.year * 12 + latestRaw.month;
      if (latestRawVal > endVal) {
        endY = latestRaw.year;
        endM = latestRaw.month;
      }
    }

    // Safety fallback: if start is after end, set start = end
    if (startY * 12 + startM > endY * 12 + endM) {
      startY = endY;
      startM = endM;
    }

    // 4. Generate every consecutive month with 0 for months without admissions
    const result = [];
    let curY = startY;
    let curM = startM;

    while (curY < endY || (curY === endY && curM <= endM)) {
      const key = `${curY}-${String(curM + 1).padStart(2, "0")}`;
      const periodLabel = `${MONTH_NAMES[curM]} ${curY}`;
      const count = countsMap.get(key) || 0;
      result.push({
        period: periodLabel,
        studentsJoined: count,
      });

      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }

    const finalData = result.length > 0 ? result : (raw.length > 0 ? raw.map((i) => ({ period: i.period || i.month || "", studentsJoined: Number(i.studentsJoined || 0) })) : []);
    
    return finalData;
  }, [overviewState.data, selectedAcademicYear]);

  // Dynamic Y-Axis scale calculation based on student admission numbers
  const { yMax, yTicks } = useMemo(() => {
    if (!overviewChartData || overviewChartData.length === 0) {
      return { yMax: 5, yTicks: [0, 1, 2, 3, 4, 5] };
    }

    const maxCount = Math.max(...overviewChartData.map((d) => Number(d.studentsJoined) || 0), 0);

    if (maxCount <= 10) {
      return { yMax: 10, yTicks: [0, 5, 10] };
    }
    if (maxCount <= 60) {
      const ceilMax = Math.ceil(maxCount / 10) * 10;
      const ticks = [];
      for (let i = 0; i <= ceilMax; i += 10) ticks.push(i);
      return { yMax: ceilMax, yTicks: ticks };
    }
    if (maxCount <= 120) {
      const ceilMax = Math.ceil(maxCount / 20) * 20;
      const ticks = [];
      for (let i = 0; i <= ceilMax; i += 20) ticks.push(i);
      return { yMax: ceilMax, yTicks: ticks };
    }

    // Larger counts (> 120)
    const roughStep = maxCount / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;
    let step = 1;
    if (normalizedStep <= 1) step = 1 * magnitude;
    else if (normalizedStep <= 2) step = 2 * magnitude;
    else if (normalizedStep <= 5) step = 5 * magnitude;
    else step = 10 * magnitude;

    const ceilMax = Math.ceil(maxCount / step) * step;
    const ticks = [];
    for (let i = 0; i <= ceilMax; i += step) ticks.push(i);
    return { yMax: ceilMax, yTicks: ticks };
  }, [overviewChartData]);

  // Dynamically calculate visible ticks and interval for Admission Overview X-Axis based on available container width
  const overviewXAxisInterval = useMemo(() => {
    const dataLen = overviewChartData?.length || 0;
    if (dataLen <= 2) return 0;

    // Available width for X-axis after accounting for Y-axis (~30px) and margins (~15px)
    const availableWidth = overviewWidth > 0 ? overviewWidth - 45 : 400;
    // Each month label (e.g. "Jan 2026") needs ~65px width including comfortable gap to avoid any collision
    const maxTicks = Math.max(2, Math.floor(availableWidth / 65));

    if (dataLen <= maxTicks) {
      return 0; // All labels fit comfortably without overlap
    }

    // Automatically preserve start and end labels while skipping intermediate overlapping ticks
    return "preserveStartEnd";
  }, [overviewChartData?.length, overviewWidth]);

  // Explicit custom tick renderer for Area Chart X-Axis so labels are never omitted by Recharts heuristics
  const renderAreaXAxisTick = useCallback(({ x, y, payload }) => {
    if (!payload || !payload.value) return null;
    return (
      <text
        x={x}
        y={y + 13}
        textAnchor="middle"
        fill="var(--cms-text, #334155)"
        fontSize={10}
        fontWeight={700}
        style={{ pointerEvents: "none" }}
      >
        {payload.value}
      </text>
    );
  }, []);

  // Group Distribution Normalized Data
  const groupChartData = useMemo(() => {
    const raw = groupState.data?.items || groupState.data?.groups || (Array.isArray(groupState.data) ? groupState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, index) => ({
      name: item.name || item.groupName || item.code || "Group",
      value: Number(item.value ?? item.studentCount ?? item.count ?? 0),
      students: Number(item.value ?? item.studentCount ?? item.count ?? 0),
      boys: Number(item.boys ?? item.boysCount ?? 0),
      girls: Number(item.girls ?? item.girlsCount ?? 0),
      fill: GROUP_COLORS[index % GROUP_COLORS.length],
    }));
  }, [groupState.data]);

  // Dynamic Y-Axis scale calculation for Students by Group (Matching Admission Overview: step of 10 for clean spacing)
  const { groupYMax, groupYTicks } = useMemo(() => {
    if (!groupChartData || groupChartData.length === 0) {
      return { groupYMax: 10, groupYTicks: [0, 10] };
    }

    const maxCount = Math.max(...groupChartData.map((d) => Number(d.value) || 0), 0);

    if (maxCount <= 10) {
      return { groupYMax: 10, groupYTicks: [0, 5, 10] };
    }
    if (maxCount <= 60) {
      const ceilMax = Math.ceil((maxCount + 3) / 10) * 10;
      const ticks = [];
      for (let i = 0; i <= ceilMax; i += 10) ticks.push(i);
      return { groupYMax: ceilMax, groupYTicks: ticks };
    }
    if (maxCount <= 120) {
      const ceilMax = Math.ceil((maxCount + 10) / 20) * 20;
      const ticks = [];
      for (let i = 0; i <= ceilMax; i += 20) ticks.push(i);
      return { groupYMax: ceilMax, groupYTicks: ticks };
    }

    const roughStep = maxCount / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;
    let step = 10;
    if (normalizedStep <= 1) step = 1 * magnitude;
    else if (normalizedStep <= 2) step = 2 * magnitude;
    else if (normalizedStep <= 5) step = 5 * magnitude;
    else step = 10 * magnitude;

    const ceilMax = Math.ceil((maxCount + step * 0.7) / step) * step;
    const ticks = [];
    for (let i = 0; i <= ceilMax; i += step) ticks.push(i);
    return { groupYMax: ceilMax, groupYTicks: ticks };
  }, [groupChartData]);

  // Group Summary Stats for Bottom Chips (Total Students, Boys, Girls)
  const groupStats = useMemo(() => {
    const totalGroupStudents = groupChartData.reduce((sum, g) => sum + (Number(g.value) || 0), 0) || Number(summaryState.data?.totalStudents ?? 0);
    const boys = Number(groupState.data?.boysCount ?? groupState.data?.boys ?? 0);
    const girls = Number(groupState.data?.girlsCount ?? groupState.data?.girls ?? 0);

    return {
      totalStudents: totalGroupStudents,
      boys,
      girls,
    };
  }, [groupChartData, groupState.data, summaryState.data]);

  // Student Attendance Normalized Values
  const studentAttData = useMemo(() => {
    const data = studentAttState.data || {};
    const total = Number(metric(data, ["total", "totalStudents", "totalCount"]) ?? 0);
    const marked = Number(metric(data, ["marked", "markedStudents", "markedCount"]) ?? 0);
    const present = Number(metric(data, ["present", "presentCount"]) ?? 0);
    const absent = Number(metric(data, ["absent", "absentCount"]) ?? 0);
    const halfDay = Number(metric(data, ["halfDay", "halfDayCount", "halfDays", "late", "lateCount"]) ?? 0);
    let percentage = metric(data, ["percentage", "attendancePercentage"]);

    const hasMarkedRecords = Boolean(data.hasMarked) || marked > 0 || (present + absent + halfDay > 0);

    if (hasMarkedRecords && total > 0) {
      percentage = Number((((present + 0.5 * halfDay) / total) * 100).toFixed(1));
    } else if (percentage === undefined || percentage === null || !hasMarkedRecords) {
      percentage = 0;
    } else {
      percentage = Number(Number(percentage).toFixed(1));
    }

    const chartData = hasMarkedRecords
      ? [
          { name: "Present", value: present, color: "#16a34a" },
          { name: "Absent", value: absent, color: "#ef4444" },
          { name: "Half-day", value: halfDay, color: "#f59e0b" },
        ]
      : [{ name: "Not marked today", value: total || 1, color: "#e2e8f0" }];

    const breakdownList = data.breakdownList || data.items || data.list || data.breakdown || (Array.isArray(data) ? data : []);

    return { total, marked, present, absent, halfDay, late: halfDay, percentage, hasMarkedRecords, chartData, breakdownList };
  }, [studentAttState.data]);

  // Staff Attendance Normalized Values
  const staffAttData = useMemo(() => {
    const data = staffAttState.data || {};
    let total = Number(metric(data, ["total", "totalStaff", "totalCount"]) ?? 0);
    const marked = Number(metric(data, ["marked", "markedStaff", "markedCount"]) ?? 0);
    const present = Number(metric(data, ["present", "presentCount"]) ?? 0);
    const absent = Number(metric(data, ["absent", "absentCount"]) ?? 0);
    const late = Number(metric(data, ["late", "lateCount"]) ?? 0);
    const onLeave = Number(metric(data, ["onLeave", "onLeaveCount", "leaveCount"]) ?? 0);
    let percentage = metric(data, ["percentage", "attendancePercentage"]);

    // Total staff dynamic calculation strictly from Staff Management stats
    const teachingFromStats = Number(staffStatsState.data?.teachingStaff ?? 0);
    const nonTeachingFromStats = Number(staffStatsState.data?.nonTeachingStaff ?? 0);
    const statsTotal = teachingFromStats + nonTeachingFromStats;
    if (statsTotal > 0) {
      total = statsTotal;
    }

    const teachingCount = typeof staffStatsState.data?.teachingStaff === "number"
      ? staffStatsState.data.teachingStaff
      : (metric(data, ["teachingCount", "teachingStaffCount"]) ?? teachingFromStats);
    const nonTeachingCount = typeof staffStatsState.data?.nonTeachingStaff === "number"
      ? staffStatsState.data.nonTeachingStaff
      : (metric(data, ["nonTeachingCount", "nonTeachingStaffCount"]) ?? nonTeachingFromStats);

    const hasMarkedRecords = Boolean(data.hasMarked) || marked > 0 || (present + absent + late + onLeave > 0);

    if (hasMarkedRecords && total > 0) {
      percentage = Number((((present + late) / total) * 100).toFixed(1));
    } else if (percentage === undefined || percentage === null || !hasMarkedRecords) {
      percentage = 0;
    } else {
      percentage = Number(Number(percentage).toFixed(1));
    }

    const chartData = hasMarkedRecords
      ? [
          { name: "Present", value: present, color: "#16a34a" },
          { name: "Absent", value: absent, color: "#ef4444" },
          { name: "Late", value: late, color: "#f59e0b" },
          { name: "On Leave", value: onLeave, color: "#7c3aed" },
        ]
      : [{ name: "Not marked today", value: total || 1, color: "#e2e8f0" }];

    return { total, marked, present, absent, late, onLeave, percentage, teachingCount, nonTeachingCount, hasMarkedRecords, chartData };
  }, [staffAttState.data, staffStatsState.data]);

  // Clean formatted percentage displays for center of Donut Charts
  const studentAttPercentageDisplay = useMemo(() => {
    const p = studentAttData.percentage;
    if (p === undefined || p === null) return "0%";
    const num = Number(p);
    if (isNaN(num)) return "0%";
    return num % 1 === 0 ? `${num}%` : `${num.toFixed(1)}%`;
  }, [studentAttData.percentage]);

  const staffAttPercentageDisplay = useMemo(() => {
    const p = staffAttData.percentage;
    if (p === undefined || p === null) return "0%";
    const num = Number(p);
    if (isNaN(num)) return "0%";
    return num % 1 === 0 ? `${num}%` : `${num.toFixed(1)}%`;
  }, [staffAttData.percentage]);

  // Upcoming Holidays Normalized List
  const holidaysList = useMemo(() => {
    const raw = holidayState.data?.items || holidayState.data?.holidays || (Array.isArray(holidayState.data) ? holidayState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, idx) => {
      const name = item.holidayName || item.name || item.title || "College Holiday";
      const type = item.holidayType || item.type || "Festival Holiday";
      const dateRangeText = item.formattedDateRange || item.dateRange || item.startDate || "Scheduled";
      const dayOfWeek = item.dayOfWeek || (item.startDate ? new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(`${String(item.startDate).split("T")[0]}T00:00:00`)) : "");
      const durationText = item.durationText || (item.totalDays ? (item.totalDays > 1 ? `${item.totalDays} Days` : "1 Day") : "1 Day");
      const badge = item.countdownText || item.badge || item.lifecycleStatus || "Upcoming";

      let tone = "violet";
      const lowerType = String(type).toLowerCase();
      if (lowerType.includes("national") || lowerType.includes("public") || lowerType.includes("gazetted")) tone = "orange";
      else if (lowerType.includes("festival") || lowerType.includes("religious") || lowerType.includes("cultural")) tone = "violet";
      else if (lowerType.includes("special") || lowerType.includes("institutional") || lowerType.includes("state") || lowerType.includes("restricted")) tone = "cyan";
      else if (lowerType.includes("vacation") || lowerType.includes("break") || lowerType.includes("term") || lowerType.includes("semester")) tone = "green";
      else tone = "blue";

      return {
        id: item.id || item.holidayCode || idx,
        name,
        type,
        dateRangeText,
        dayOfWeek,
        durationText,
        badge,
        tone,
        appliesTo: item.appliesTo || "All Students & Staff",
      };
    });
  }, [holidayState.data]);

  // Upcoming Examinations Normalized List
  const examsList = useMemo(() => {
    const raw = examState.data?.items || examState.data?.examinations || (Array.isArray(examState.data) ? examState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, idx) => {
      const name = item.examName || item.name || item.title || "Examination";
      const examCode = item.examCode || item.code || "";
      const groupName = item.groupName || item.academicLevelName || "";
      const dateText = item.formattedDate || item.dateRange || item.date || item.startDate || "";
      const badgeRaw = item.daysRemainingText || item.badge || item.daysLeft || item.status || "Upcoming";
      
      const badge = String(badgeRaw).replace(/(\d+)\s+days/i, "$1 Days");
      const isOngoing = String(badge).toLowerCase().includes("ongoing");
      const isToday = String(badge).toLowerCase().includes("today");

      let tone = "blue";
      if (isOngoing || isToday) tone = "green";
      else if (idx % 2 === 1) tone = "violet";
      else tone = "blue";

      const typeTag = isOngoing ? "ONGOING EXAM" : (examCode ? examCode : "EXAM");
      const context = item.context || (groupName && dateText ? `${groupName} • ${dateText}` : dateText || groupName || "Scheduled");

      return {
        id: item.id || item.examId || idx,
        name,
        examCode,
        typeTag,
        groupName,
        dateText,
        context,
        badge,
        tone,
      };
    });
  }, [examState.data]);

  const greeting = greetingForHour(currentHour);

  const isAccessDenied = (error) => {
    if (!error) return false;
    const str = String(error).toLowerCase();
    return str.includes("access denied") || str.includes("authorization") || str.includes("403") || str.includes("campus");
  };

  const hasActiveData = Boolean(
    campusId &&
    ((summaryState.data?.totalStudents > 0) ||
     (summaryState.data?.teachingStaff > 0) ||
     (studentManagementCount > 0) ||
     (overviewState.data?.totalAdmissions > 0))
  );

  const hasAdmissionData = Boolean(
    campusId &&
    overviewChartData.length > 0 &&
    (overviewChartData.some((d) => Number(d.studentsJoined || 0) > 0) || Number(overviewState.data?.totalAdmissions || 0) > 0)
  );

  const hasGroupData = Boolean(
    campusId &&
    groupChartData.length > 0 &&
    groupChartData.some((g) => Number(g.value || 0) > 0)
  );

  const hasStudentAttData = Boolean(
    campusId &&
    (studentAttData.total > 0 || Number(summaryState.data?.totalStudents || 0) > 0)
  );

  const hasStaffAttData = Boolean(
    campusId &&
    (staffAttData.total > 0 || Number(summaryState.data?.teachingStaff || 0) > 0 || Number(summaryState.data?.nonTeachingStaff || 0) > 0)
  );

  const hasHolidayData = Boolean(campusId && holidaysList.length > 0);
  const hasExamData = Boolean(campusId && examsList.length > 0);

  return (
    <DashboardLayout hidePageHeader contentClassName="cms-content-dashboard" title={null} subtitle={null} actions={null} breadcrumb={["Overview"]}>
      {initialLoading ? <DashboardSkeleton /> : <main className="dashboard-page">
        {/* Top Header Bar & Control Panel */}
        <div className="dashboard-header-bar">
          <div className="dashboard-greeting-wrap">
            <h1 className="dashboard-greeting-title">
              <span className="dashboard-greeting-emoji">{greeting.icon}</span> {greeting.message}, Admin!
            </h1>
            <p className="dashboard-greeting-sub">Here's what's happening in your college today.</p>
          </div>
          <div className="dashboard-header-controls">
            {!hasActiveData ? (
              <div className="dashboard-last-updated-badge dashboard-setup-badge">
                <Info size={14} />
                <span>Get started by setting up your college</span>
              </div>
            ) : (
              <div className="dashboard-last-updated-badge">
                <Clock size={14} />
                <span>Last updated <strong>{lastUpdated}</strong></span>
              </div>
            )}
            <button
              type="button"
              className="cms-btn cms-btn-primary dashboard-refresh-btn"
              disabled={isRefreshing}
              onClick={handleRefreshAll}
              title="Click to refresh latest dashboard metrics"
            >
              <RefreshCw size={14} className={isRefreshing ? "dashboard-spin" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Dashboard"}</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Cards with 3D Icons */}
        <section className="dashboard-kpi-grid" aria-label="College metrics">
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} loading={summaryState.loading} />
          ))}
        </section>

        {/* Quick Setup Bar */}
        <nav className="dashboard-quick-actions" aria-label="Quick Setup">
          <h2>Quick Setup</h2>
          <div className="dashboard-quick-actions-list">
            {QUICK_SETUP.map(({ label, to, icon, tone, isPlus }) => (
              <Link key={label} to={to} className={`dashboard-quick-action tone-${tone}`}>
                {isPlus ? (
                  <Plus size={13} strokeWidth={2.5} className="dashboard-plus-icon" />
                ) : (
                  <span className="dashboard-quick-action-icon">
                    <img src={icon} alt="" aria-hidden="true" />
                  </span>
                )}
                <span>{label.replace(/^\+\s*/, "")}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Unified 2x3 Grid for all 6 Analytics Cards: Strictly Equal Size across all cards */}
        <div className="dashboard-cards-grid" aria-label="Dashboard Analytics">
          {/* Card 1: Admission Overview */}
          <article className="dashboard-card dashboard-students-overview-card">
            <CardHeader title="Admission Overview" />
            {overviewState.loading ? (
              <LoadingState label="Loading overview..." />
            ) : (!hasAdmissionData || isAccessDenied(overviewState.error)) ? (
              <ZeroStateCard
                icon={FileText}
                title="No data available"
                subtitle="Add a campus and academic year to start admissions."
                actionLabel="+ Add Campus"
                actionTo="/admin-dashboard/settings/campus-configuration"
              />
            ) : overviewState.error ? (
              <ErrorState message={overviewState.error} onRetry={fetchStudentsOverview} />
            ) : (
              <div className="dashboard-card-body">
                <div
                  ref={overviewContainerRef}
                  className="dashboard-chart dashboard-area-chart-wrap"
                >
                  <div style={{ width: "100%", height: "100%", minWidth: 0, position: "relative" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overviewChartData} margin={{ top: 10, right: 10, left: -6, bottom: 2 }}>
                        <defs>
                          <linearGradient id="admissionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--cms-primary, #22a447)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--cms-primary, #22a447)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cms-border, #e2e8f0)" />
                        <XAxis
                          dataKey="period"
                          tickLine={false}
                          axisLine={{ stroke: "var(--cms-border, #cbd5e1)", strokeWidth: 1 }}
                          height={20}
                          tick={{ fontSize: 10, fontWeight: 700, fill: "var(--cms-text, #334155)", dy: 2 }}
                          interval={overviewXAxisInterval}
                          minTickGap={10}
                          padding={{ left: 16, right: 16 }}
                        />
                        <YAxis
                          domain={[0, yMax]}
                          ticks={yTicks}
                          interval={0}
                          allowDecimals={false}
                          width={yMax >= 1000 ? 36 : yMax >= 100 ? 30 : 26}
                          tickLine={false}
                          axisLine={{ stroke: "var(--cms-border, #cbd5e1)", strokeWidth: 1 }}
                          tick={{ fontSize: 9.5, fill: "var(--cms-muted, #64748b)" }}
                        />
                        <Tooltip formatter={(val) => [formatNumber(val), "Students Admitted"]} />
                        <Area
                          type="monotone"
                          dataKey="studentsJoined"
                          stroke="var(--cms-primary, #22a447)"
                          strokeWidth={2.5}
                          fill="url(#admissionGradient)"
                          dot={{ r: 3, fill: "var(--cms-primary, #22a447)" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="dashboard-students-chips">
                  <div className="dashboard-student-chip chip-total">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(overviewState.data?.totalAdmissions ?? overviewState.data?.totalStudents ?? 0)}</strong>
                      <small>Total Admissions</small>
                    </div>
                  </div>
                  <div className="dashboard-student-chip chip-boys">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(overviewState.data?.boysCount ?? 0)}</strong>
                      <small>Boys</small>
                    </div>
                  </div>
                  <div className="dashboard-student-chip chip-girls">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(overviewState.data?.girlsCount ?? 0)}</strong>
                      <small>Girls</small>
                    </div>
                  </div>
                </div>
                <div className="dashboard-card-footer">
                  <Link to="/admin-dashboard/admission" className="dashboard-footer-btn">
                    View Student Admissions <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 2: Students by Group */}
          <article className="dashboard-card dashboard-group-card">
            <CardHeader title="Students by Group" />
            {groupState.loading ? (
              <LoadingState label="Loading groups..." />
            ) : (!hasGroupData || isAccessDenied(groupState.error)) ? (
              <ZeroStateCard
                icon={Users}
                title="No data available"
                subtitle="Create a group to view student distribution."
                actionLabel="+ Create Group"
                actionTo="/admin-dashboard/courses/add"
              />
            ) : groupState.error ? (
              <ErrorState message={groupState.error} onRetry={fetchGroupDistribution} />
            ) : (
              <div className="dashboard-card-body">
                <div className="dashboard-chart dashboard-bar-chart-wrap" style={{ overflowX: groupChartData.length > 5 ? "auto" : "visible", width: "100%" }}>
                  <div style={{ width: groupChartData.length > 5 ? `${Math.max(100, Math.round((groupChartData.length / 5) * 100))}%` : "100%", minWidth: "100%", height: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={groupChartData} margin={{ top: 10, right: 10, left: -6, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cms-border, #e2e8f0)" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={{ stroke: "var(--cms-border, #cbd5e1)", strokeWidth: 1 }}
                          height={20}
                          tick={{ fontSize: 10, fontWeight: 700, fill: "var(--cms-text, #334155)", dy: 2 }}
                          interval={0}
                        />
                        <YAxis
                          domain={[0, groupYMax]}
                          ticks={groupYTicks}
                          interval={0}
                          allowDecimals={false}
                          width={26}
                          tickLine={false}
                          axisLine={{ stroke: "var(--cms-border, #cbd5e1)", strokeWidth: 1 }}
                          tick={{ fontSize: 9.5, fill: "var(--cms-muted, #64748b)" }}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="value" maxBarSize={38} radius={[4, 4, 0, 0]}>
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(val) => (val > 0 ? val : "0")}
                            style={{ fontSize: 10.5, fontWeight: 800, fill: "var(--cms-text, #334155)" }}
                            offset={4}
                          />
                          {groupChartData.map((entry, index) => (
                            <Cell key={entry.name || index} fill={entry.fill || GROUP_COLORS[index % GROUP_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="dashboard-students-chips">
                  <div className="dashboard-student-chip chip-total">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(groupStats.totalStudents)}</strong>
                      <small>Total Students</small>
                    </div>
                  </div>
                  <div className="dashboard-student-chip chip-boys">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(groupStats.boys)}</strong>
                      <small>Boys</small>
                    </div>
                  </div>
                  <div className="dashboard-student-chip chip-girls">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(groupStats.girls)}</strong>
                      <small>Girls</small>
                    </div>
                  </div>
                </div>
                <div className="dashboard-card-footer">
                  <Link to="/admin-dashboard/courses" className="dashboard-footer-btn">
                    View All Groups <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 3: Students Attendance Overview (Today) */}
          <article className="dashboard-card dashboard-attendance-today-card">
            <CardHeader title="Students Attendance Overview (Today)" />

            {studentAttState.loading ? (
              <LoadingState label="Updating attendance..." />
            ) : (!hasStudentAttData || isAccessDenied(studentAttState.error)) ? (
              <ZeroStateCard
                icon={CalendarCheck}
                title="No data available"
                subtitle="Add students and mark attendance to see today's overview."
                actionLabel="+ Add Student"
                actionTo="/admin-dashboard/admission?view=new"
              />
            ) : studentAttState.error ? (
              <ErrorState message={studentAttState.error} onRetry={fetchStudentAttendance} />
            ) : (
              <div className="dashboard-card-body dashboard-attendance-body">
                {studentAttData.total === 0 && !summaryState.data?.totalStudents ? (
                    <EmptyState message="No student attendance data available for today." />
                  ) : (
                    <>
                      {/* Donut Chart & Side Status Legend (Centered Together) */}
                      <div className="dashboard-attendance-donut-row">
                        <div className="dashboard-donut-chart-wrap">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={
                                  studentAttData.chartData.some((d) => d.value > 0)
                                    ? studentAttData.chartData.filter((d) => d.value > 0)
                                    : [{ name: "Not marked today", value: 1, color: "#e2e8f0" }]
                                }
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={51}
                                paddingAngle={studentAttData.chartData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                                stroke="var(--cms-surface)"
                                strokeWidth={2}
                              >
                                {(studentAttData.chartData.some((d) => d.value > 0)
                                  ? studentAttData.chartData.filter((d) => d.value > 0)
                                  : [{ name: "Not marked today", value: 1, color: "#e2e8f0" }]
                                ).map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={studentAttData.total > 0 ? <CustomDonutTooltip /> : () => null}
                                wrapperStyle={{ pointerEvents: "none", zIndex: 100 }}
                                allowEscapeViewBox={{ x: true, y: true }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="dashboard-donut-center">
                            <strong>{studentAttPercentageDisplay}</strong>
                            <span>{studentAttData.hasMarkedRecords ? "Attendance" : "Not Marked"}</span>
                          </div>
                        </div>

                        <div className="dashboard-attendance-legend-vertical">
                          <div className="legend-item">
                            <span className="legend-label">
                              <span className="dot dot-present" /> Present
                            </span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-label">
                              <span className="dot dot-absent" /> Absent
                            </span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-label">
                              <span className="dot dot-halfday" /> Half-day
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 5 Summary KPI Chips */}
                      <div className="dashboard-attendance-kpi-row">
                        <Link to="/admin-dashboard/attendance/student" className="att-kpi-chip">
                          <small>Total Students</small>
                          <strong>{formatNumber(studentAttData.total)}</strong>
                        </Link>
                        <Link to="/admin-dashboard/attendance/student" className="att-kpi-chip text-present">
                          <small>Present</small>
                          <strong>{formatNumber(studentAttData.present)}</strong>
                        </Link>
                        <Link to="/admin-dashboard/attendance/student" className="att-kpi-chip text-absent">
                          <small>Absent</small>
                          <strong>{formatNumber(studentAttData.absent)}</strong>
                        </Link>
                        <Link to="/admin-dashboard/attendance/student" className="att-kpi-chip text-halfday text-late">
                          <small>Half-day</small>
                          <strong>{formatNumber(studentAttData.halfDay)}</strong>
                        </Link>
                        <Link to="/admin-dashboard/attendance/student" className="att-kpi-chip">
                          <small>Attendance</small>
                          <strong>{formatNumber(studentAttData.percentage)}%</strong>
                        </Link>
                      </div>
                    </>
                  )}

                {/* Footer */}
                <div className="dashboard-card-footer">
                  <Link to="/admin-dashboard/attendance/student" className="dashboard-footer-btn">
                    View Attendance Details <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 4: Staff Attendance Overview (Today) */}
          <article className="dashboard-card dashboard-staff-attendance-card">
            <CardHeader title="Staff Attendance Overview (Today)" />

            {staffAttState.loading ? (
              <LoadingState label="Updating staff attendance..." />
            ) : (!hasStaffAttData || isAccessDenied(staffAttState.error)) ? (
              <ZeroStateCard
                icon={UserCheck}
                title="No data available"
                subtitle="Add staff and mark attendance to see today's overview."
                actionLabel="+ Add Staff"
                actionTo="/admin-dashboard/staff/add"
              />
            ) : staffAttState.error ? (
              <ErrorState message={staffAttState.error} onRetry={fetchStaffAttendance} />
            ) : (
              <div className="dashboard-card-body dashboard-attendance-body">
                {/* Donut Chart & Side Status Legend (Centered Together) */}
                <div className="dashboard-attendance-donut-row">
                  <div className="dashboard-donut-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={
                            staffAttData.chartData.some((d) => d.value > 0)
                              ? staffAttData.chartData.filter((d) => d.value > 0)
                              : [{ name: "Not marked today", value: 1, color: "#e2e8f0" }]
                          }
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={51}
                          paddingAngle={staffAttData.chartData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                          stroke="var(--cms-surface)"
                          strokeWidth={2}
                        >
                          {(staffAttData.chartData.some((d) => d.value > 0)
                            ? staffAttData.chartData.filter((d) => d.value > 0)
                            : [{ name: "Not marked today", value: 1, color: "#e2e8f0" }]
                          ).map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<CustomDonutTooltip />}
                          wrapperStyle={{ pointerEvents: "none", zIndex: 100 }}
                          allowEscapeViewBox={{ x: true, y: true }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="dashboard-donut-center">
                      <strong>{staffAttPercentageDisplay}</strong>
                      <span>{staffAttData.hasMarkedRecords ? "Attendance" : "Not Marked"}</span>
                    </div>
                  </div>

                  <div className="dashboard-attendance-legend-vertical">
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-present" /> Present
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-absent" /> Absent
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-late" /> Late
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-leave" /> On Leave
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staff Summary Metrics */}
                <div className="dashboard-attendance-kpi-row dashboard-staff-kpis">
                  <Link to="/admin-dashboard/attendance/staff?tab=staff-attendance" className="att-kpi-chip staff-chip">
                    <small>Total Staff</small>
                    <strong>{formatNumber(staffAttData.total)}</strong>
                  </Link>
                  <Link to="/admin-dashboard/attendance/staff?tab=staff-attendance" className="att-kpi-chip staff-chip text-present">
                    <small>Present</small>
                    <strong>{formatNumber(staffAttData.present)}</strong>
                  </Link>
                  <Link to="/admin-dashboard/attendance/staff?tab=staff-attendance" className="att-kpi-chip staff-chip text-absent">
                    <small>Absent</small>
                    <strong>{formatNumber(staffAttData.absent)}</strong>
                  </Link>
                  <Link to="/admin-dashboard/attendance/staff?tab=staff-attendance" className="att-kpi-chip staff-chip text-late">
                    <small>Late</small>
                    <strong>{formatNumber(staffAttData.late)}</strong>
                  </Link>
                  <Link to="/admin-dashboard/attendance/staff?tab=staff-attendance" className="att-kpi-chip staff-chip text-leave">
                    <small>On Leave</small>
                    <strong>{formatNumber(staffAttData.onLeave)}</strong>
                  </Link>
                </div>

                {/* Footer */}
                <div className="dashboard-card-footer">
                  {(staffAttData.teachingCount !== undefined || staffAttData.nonTeachingCount !== undefined) ? (
                    <span className="dashboard-footer-time" style={{ marginRight: "auto" }}>
                      Teaching: <strong>{formatNumber(staffAttData.teachingCount)}</strong> &bull; Non-Teaching: <strong>{formatNumber(staffAttData.nonTeachingCount)}</strong>
                    </span>
                  ) : null}
                  <Link to="/admin-dashboard/attendance/staff?tab=staff-attendance" className="dashboard-footer-btn">
                    View Staff Attendance <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 2: Upcoming Holidays & College Breaks */}
          <article className="dashboard-card dashboard-holiday-card">
            <CardHeader
              title={holidaysList.length > 0 ? `Upcoming Holidays (${holidaysList.length})` : "Upcoming Holidays"}
            />
            {holidayState.loading ? (
              <LoadingState label="Loading holidays..." />
            ) : (!hasHolidayData || isAccessDenied(holidayState.error)) ? (
              <ZeroStateCard
                icon={CalendarX}
                title="No holidays added"
                subtitle="Add holidays to manage academic breaks."
                actionLabel="+ Add Holiday"
                actionTo="/admin-dashboard/holidays"
              />
            ) : holidayState.error ? (
              <ErrorState message={holidayState.error} onRetry={fetchUpcomingHolidays} />
            ) : (
              <div className="dashboard-card-body">
                <div className="dashboard-info-list">
                  {holidaysList.map((item, index) => (
                    <div key={`holiday-${item.id}-${index}`} className="dashboard-info-item dashboard-holiday-item">
                      <span className={`dashboard-list-icon tone-${item.tone}`}>
                        <CalendarDays size={15} />
                      </span>
                      <div className="dashboard-info-content">
                        <div className="dashboard-holiday-title-row">
                          <strong>{item.name}</strong>
                          <span className={`holiday-type-pill pill-${item.tone}`}>{item.type}</span>
                        </div>
                        <small className="dashboard-holiday-meta">
                          <span>{item.dateRangeText}</span>
                          {item.dayOfWeek ? <span className="holiday-meta-dot">• {item.dayOfWeek}</span> : null}
                          <span className="holiday-duration-badge">{item.durationText}</span>
                        </small>
                      </div>
                      <span className={`dashboard-days-badge holiday-badge badge-${item.tone}`}>{item.badge}</span>
                    </div>
                  ))}
                </div>
                <div className="dashboard-card-footer">
                  <Link to="/admin-dashboard/holidays" className="dashboard-footer-btn">
                    View Holiday Calendar <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 3: Upcoming Examinations */}
          <article className="dashboard-card dashboard-exams-card">
            <CardHeader
              title={examsList.length > 0 ? `Upcoming Examinations (${examsList.length})` : "Upcoming Examinations"}
            />
            {examState.loading ? (
              <LoadingState label="Loading exams..." />
            ) : (!hasExamData || isAccessDenied(examState.error)) ? (
              <ZeroStateCard
                icon={FileEdit}
                title="No examinations scheduled"
                subtitle="Create an examination to see the upcoming list."
                actionLabel="+ Create Exam"
                actionTo="/admin-dashboard/examinations/add"
              />
            ) : examState.error ? (
              <ErrorState message={examState.error} onRetry={fetchUpcomingExaminations} />
            ) : (
              <div className="dashboard-card-body">
                <div className="dashboard-info-list">
                  {examsList.map((item, index) => (
                    <div key={`exam-${item.id}-${index}`} className="dashboard-info-item dashboard-exam-item">
                      <span className={`dashboard-list-icon tone-${item.tone}`}>
                        <CalendarDays size={15} />
                      </span>
                      <div className="dashboard-info-content">
                        <div className="dashboard-exam-title-row">
                          <strong>{item.name}</strong>
                          <span className={`exam-type-pill pill-${item.tone}`}>{item.typeTag}</span>
                        </div>
                        <small className="dashboard-exam-meta">
                          <span>{item.context}</span>
                        </small>
                      </div>
                      <span className={`dashboard-days-badge exam-badge badge-${item.tone}`}>{item.badge}</span>
                    </div>
                  ))}
                </div>
                <div className="dashboard-card-footer">
                  <Link to="/admin-dashboard/examinations" className="dashboard-footer-btn">
                    View Exam Schedule <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>
        </div>
      </main>}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </DashboardLayout>
  );
}
