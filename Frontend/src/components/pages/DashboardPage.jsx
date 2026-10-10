import { summarizeStudentAttendance } from "./dashboardStudentAttendance.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  Info,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonCard, SkeletonText, Toast } from "@/components/common/Ui.jsx";
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

const DASHBOARD_API = {
  filters: "/api/v1/dashboard/filters",
  summary: "/api/v1/dashboard/summary",
  studentsOverview: "/api/v1/dashboard/students-overview",
  admissionTrend: "/api/v1/dashboard/admission-trend",
  groupDistribution: "/api/v1/dashboard/group-distribution",
  studentsAttendanceToday: "/api/v1/dashboard/students-attendance-today",
  staffAttendanceToday: "/api/v1/dashboard/staff-attendance-today",
  upcomingHolidays: "/api/v1/dashboard/upcoming-holidays",
  holidaysList: "/api/v1/holidays",
  certificateRequests: "/api/v1/dashboard/certificate-requests",
  upcomingExaminations: "/api/v1/dashboard/upcoming-examinations",
  todaysHighlights: "/api/v1/dashboard/todays-highlights",
  weeklyAttendance: "/api/v1/dashboard/weekly-attendance",
  recentActivity: "/api/v1/dashboard/recent-activity",
  facultyWorkload: "/api/v1/dashboard/faculty-workload",
  testVerifyAll: "/api/v1/dashboard/test-verify-all",
};

const QUICK_ACTIONS = [
  { label: "Add Student", to: "/dashboard/admission", icon: addStudentIcon, tone: "green" },
  { label: "Add Staff", to: "/dashboard/staff/add", icon: addStaffIcon, tone: "blue" },
  { label: "Create Group", to: "/dashboard/courses/add", icon: createGroupIcon, tone: "violet" },
  { label: "Create Section", to: "/dashboard/sections", icon: createSectionIcon, tone: "cyan" },
  { label: "Create Exam", to: "/dashboard/examinations/add", icon: createExamIcon, tone: "orange" },
  { label: "Mark Attendance", to: "/dashboard/attendance/student", icon: markAttendanceIcon, tone: "green" },
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
  if (value === undefined || value === null || value === "") return "Unavailable";
  const num = Number(value);
  if (!Number.isFinite(num)) return "Unavailable";
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
    const regex = new RegExp(`(?:${shortName}|${fullName})[\\s,.-]+(\\d{4})`, "i");
    const mMatch = str.match(regex);
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

function resolveKpiMetric(summaryData, cardKey, rawCurrentKeys, rawPrevKeys, rawPctKeys) {
  const cardObj = summaryData?.[cardKey] || summaryData?.[`${cardKey}Card`] || summaryData?.[`${cardKey}Metric`];
  
  let current = cardObj?.currentCount ?? cardObj?.CurrentCount ?? metric(summaryData, rawCurrentKeys);
  let previous = cardObj?.previousCount ?? cardObj?.PreviousCount ?? cardObj?.lastYearCount ?? cardObj?.LastYearCount ?? metric(summaryData, rawPrevKeys) ?? 0;
  let rawGrowth = cardObj?.growthPercentage ?? cardObj?.GrowthPercentage ?? cardObj?.percentageChange ?? cardObj?.PercentageChange ?? metric(summaryData, rawPctKeys);
  let status = String(cardObj?.growthStatus ?? cardObj?.GrowthStatus ?? cardObj?.status ?? cardObj?.Status ?? "").toUpperCase();

  const isAvailable = current !== undefined && current !== null && current !== "";
  const numCurrent = Number(current ?? 0);
  const numPrevious = Number(previous ?? 0);

  if (!status) {
    if (numPrevious === 0) {
      status = numCurrent > 0 ? "NEW" : "NO DATA";
    } else {
      status = numCurrent > numPrevious ? "GROWTH" : (numCurrent < numPrevious ? "DECLINE" : "NEUTRAL");
    }
  }

  let badge = "—";
  let label = "vs last year";

  if (status === "NEW" || numPrevious === 0) {
    if (numCurrent === 0) {
      badge = "No Data";
      label = "No records";
    } else {
      badge = "NEW";
      label = "First recorded year";
    }
  } else if (rawGrowth !== undefined && rawGrowth !== null) {
    const numPct = Number(rawGrowth);
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
  } else {
    badge = "NEW";
    label = "vs last year";
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
  const formattedPrev = isAvailable && previousValue !== undefined && previousValue !== null ? formatNumber(previousValue) : "0";
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
            <strong className="dashboard-kpi-value">{loading ? "—" : formatNumber(value)}</strong>
            <span className="dashboard-kpi-trend">{isAvailable ? changePct : "—"}</span>
          </div>
          <span className="dashboard-kpi-subtext">{isAvailable ? changeLabel : "No data available"}</span>
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

  const campusId = selectedCampusId || selectedCampus?.id || selectedCampus?.campusId;
  const boardId = selectedBoard?.id || selectedBoard?.code || selectedBoard?.boardId;
  const academicYearId = selectedAcademicYear?.id || selectedAcademicYear?.code || selectedAcademicYear?.academicYearId;
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
  const [certState, setCertState] = useState({ loading: true, error: null, data: null });
  const [examState, setExamState] = useState({ loading: true, error: null, data: null });
  const initialLoading = summaryState.loading || overviewState.loading || groupState.loading || studentAttState.loading || staffAttState.loading || holidayState.loading || examState.loading;
  // Sequence ref counters for race condition protection
  const summarySeq = useRef(0);
  const overviewSeq = useRef(0);
  const groupSeq = useRef(0);
  const studentAttSeq = useRef(0);
  const staffAttSeq = useRef(0);
  const holidaySeq = useRef(0);
  const certSeq = useRef(0);
  const examSeq = useRef(0);

  // Hourly time trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // 1. GET /api/v1/dashboard/summary & GET /api/v1/staff
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
      
      const staffParams = {
        BoardId: boardId || undefined,
        CampusId: campusId || undefined,
        PageNumber: 1,
        PageSize: 10000
      };
      
      const [res, staffRes] = await Promise.all([
        apiClient.get(DASHBOARD_API.summary, { params }),
        apiClient.get("/api/v1/staff", { params: staffParams }).catch(() => ({ data: { items: [] } }))
      ]);

      if (summarySeq.current === seq) {
        const summaryData = unwrap(res.data) || {};
        
        let staffRecords = [];
        if (staffRes?.data?.items && Array.isArray(staffRes.data.items)) {
          staffRecords = staffRes.data.items;
        } else if (staffRes?.data?.data && Array.isArray(staffRes.data.data)) {
          staffRecords = staffRes.data.data;
        } else if (Array.isArray(staffRes?.data)) {
          staffRecords = staffRes.data;
        }
        
        // Exact logic from StaffManagementPage
        const totalCount = staffRecords.filter((r) => !r?.status || r?.status === "Active").length;
        const teachingCount = staffRecords.filter((r) => {
          if (r?.status && r.status !== "Active") return false;
          const s = String(r?.staffType || "").toLowerCase();
          return s.includes("teach") && !s.includes("non");
        }).length;
        const nonTeachingCount = Math.max(0, totalCount - teachingCount);

        // Merge teaching/non-teaching staff counts from staff endpoint to override dashboard summary
        const mergedData = {
          ...summaryData,
          teachingStaff: teachingCount,
          teachingStaffCount: teachingCount,
          nonTeachingStaff: nonTeachingCount,
          nonTeachingStaffCount: nonTeachingCount,
        };

        setSummaryState({ loading: false, error: null, data: mergedData });
      }
    } catch (err) {
      if (summarySeq.current === seq) {
        setSummaryState({ loading: false, error: getApiErrorMessage(err, "Failed to load summary metrics"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId, todayDate]);

  // 2. GET /api/v1/dashboard/students-overview & GET /api/v1/dashboard/admission-trend
  const fetchStudentsOverview = useCallback(async () => {
    const seq = ++overviewSeq.current;
    setOverviewState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
        date: todayDate,
      };
      const trendParams = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
      };

      const [overviewRes, trendRes] = await Promise.allSettled([
        apiClient.get(DASHBOARD_API.studentsOverview, { params }),
        apiClient.get(DASHBOARD_API.admissionTrend, { params: trendParams }),
      ]);

      if (overviewSeq.current === seq) {
        const overviewData = overviewRes.status === "fulfilled" ? unwrap(overviewRes.value?.data) : null;
        const trendData = trendRes.status === "fulfilled" ? unwrap(trendRes.value?.data) : null;

        if (overviewRes.status === "rejected" && trendRes.status === "rejected") {
          setOverviewState({ loading: false, error: getApiErrorMessage(overviewRes.reason, "Failed to load students overview"), data: null });
          return;
        }

        const mergedData = {
          ...(overviewData && typeof overviewData === "object" ? overviewData : {}),
          trend: trendData?.trend || trendData?.items || trendData?.admissionTrend || overviewData?.trend || overviewData?.items || [],
        };
        setOverviewState({ loading: false, error: null, data: mergedData });
      }
    } catch (err) {
      if (overviewSeq.current === seq) {
        setOverviewState({ loading: false, error: getApiErrorMessage(err, "Failed to load students overview"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId, todayDate]);

  // 3. GET /api/v1/dashboard/group-distribution
  const fetchGroupDistribution = useCallback(async () => {
    const seq = ++groupSeq.current;
    setGroupState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
      };
      const res = await apiClient.get(DASHBOARD_API.groupDistribution, { params });
      if (groupSeq.current === seq) {
        setGroupState({ loading: false, error: null, data: unwrap(res.data) });
      }
    } catch (err) {
      if (groupSeq.current === seq) {
        setGroupState({ loading: false, error: getApiErrorMessage(err, "Failed to load group distribution"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  // 4. GET /api/v1/attendance/admin/students
  const fetchStudentAttendance = useCallback(async () => {
    const seq = ++studentAttSeq.current;
    setStudentAttState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
        date: todayDate,
      };

      const res = await apiClient.get("/api/v1/attendance/admin/students", { params });

      if (studentAttSeq.current === seq) {
        const attendance = summarizeStudentAttendance(res.data, "Overall");
        setStudentAttState({ loading: false, error: null, data: attendance, timestamp: "Today" });
      }
    } catch (err) {
      if (studentAttSeq.current === seq) {
        setStudentAttState((prev) => ({ ...prev, loading: false, error: getApiErrorMessage(err, "Failed to load student attendance"), data: null }));
      }
    }
  }, [campusId, boardId, academicYearId, todayDate]);

  // 5. POST /api/v1/staff-attendance/load
  const fetchStaffAttendance = useCallback(async () => {
    const seq = ++staffAttSeq.current;
    setStaffAttState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const payload = {
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
        date: todayDate,
      };

      const res = await apiClient.post("/api/v1/staff-attendance/load", payload);

      if (staffAttSeq.current === seq) {
        if (res.data?.success === false || res.data?.Success === false) {
          throw new Error(res.data.message || res.data.Message || "Unable to load staff attendance.");
        }
        const resData = res.data?.data ?? res.data?.Data ?? res.data;
        const rows = Array.isArray(resData) ? resData : resData?.items ?? resData?.Items ?? resData?.records;
        if (!Array.isArray(rows)) throw new Error("The staff attendance API returned an unsupported response.");

        const STAFF_LABEL = { 1: "Present", 2: "Absent", 3: "Late", 4: "Leave", 5: "Holiday" };
        const staffStatus = (v) => STAFF_LABEL[v] ?? ({ present: "Present", absent: "Absent", late: "Late", leave: "Leave", onleave: "Leave", holiday: "Holiday" })[String(v ?? "").toLowerCase().replace(/[\s_-]/g, "")];

        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let onLeaveCount = 0;

        rows.forEach(r => {
           const st = staffStatus(r.status ?? r.Status);
           if (st === "Present") presentCount++;
           else if (st === "Absent") absentCount++;
           else if (st === "Late") lateCount++;
           else if (st === "Leave") onLeaveCount++;
        });

        const totalCount = rows.length;
        const percentage = totalCount ? Math.round(((presentCount + 0.5 * lateCount) * 100) / totalCount) : 0;

        setStaffAttState({
          loading: false,
          error: null,
          data: {
            total: totalCount,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            onLeave: onLeaveCount,
            percentage: percentage
          },
          timestamp: "Today"
        });
      }
    } catch (err) {
      if (staffAttSeq.current === seq) {
        setStaffAttState((prev) => ({ ...prev, loading: false, error: getApiErrorMessage(err, "Failed to load staff attendance"), data: null }));
      }
    }
  }, [campusId, boardId, academicYearId, todayDate]);

  // 6. GET /api/v1/dashboard/upcoming-holidays (with fallback to /api/v1/holidays)
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
      let res;
      try {
        res = await apiClient.get(DASHBOARD_API.upcomingHolidays, { params });
      } catch {
        res = await apiClient.get(DASHBOARD_API.holidaysList, { params: { ...params, pageSize: 20, status: "Active" } });
      }
      if (holidaySeq.current === seq) {
        setHolidayState({ loading: false, error: null, data: unwrap(res.data) });
      }
    } catch (err) {
      if (holidaySeq.current === seq) {
        setHolidayState({ loading: false, error: getApiErrorMessage(err, "Failed to load upcoming holidays"), data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  // 7. GET /api/v1/dashboard/upcoming-examinations
  const fetchUpcomingExaminations = useCallback(async () => {
    const seq = ++examSeq.current;
    setExamState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
      };
      const res = await apiClient.get(DASHBOARD_API.upcomingExaminations, { params });
      if (examSeq.current === seq) {
        setExamState({ loading: false, error: null, data: unwrap(res.data) });
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
    fetchUpcomingHolidays();
    fetchUpcomingExaminations();
  }, [fetchSummary, fetchStudentsOverview, fetchGroupDistribution, fetchUpcomingHolidays, fetchUpcomingExaminations]);

  // Refresh both overall attendance cards when their scope changes or this tab regains focus.
  useEffect(() => {
    const refreshAttendance = () => {
      fetchStudentAttendance();
      fetchStaffAttendance();
    };
    refreshAttendance();
    window.addEventListener("focus", refreshAttendance);
    return () => window.removeEventListener("focus", refreshAttendance);
  }, [fetchStudentAttendance, fetchStaffAttendance]);

  // Full Refresh Dashboard handler
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchSummary(),
      fetchStudentsOverview(),
      fetchGroupDistribution(),
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
  const studentsKpi = resolveKpiMetric(summaryState.data, "totalStudents", ["totalStudents", "totalStudentCount", "studentCount"], ["lastYearTotalStudents", "lastYearStudentCount"], ["studentsVsLastYearPercentage"]);
  const teachingKpi = resolveKpiMetric(summaryState.data, "teachingStaff", ["teachingStaff", "teachingStaffCount"], ["lastYearTeachingStaff", "lastYearTeachingStaffCount"], ["teachingStaffVsLastYearPercentage"]);
  const nonTeachingKpi = resolveKpiMetric(summaryState.data, "nonTeachingStaff", ["nonTeachingStaff", "nonTeachingStaffCount"], ["lastYearNonTeachingStaff", "lastYearNonTeachingStaffCount"], ["nonTeachingStaffVsLastYearPercentage"]);
  const groupsKpi = resolveKpiMetric(summaryState.data, "totalGroups", ["totalGroups", "groupCount"], ["lastYearTotalGroups", "lastYearGroupCount"], ["groupsVsLastYearPercentage"]);
  const sectionsKpi = resolveKpiMetric(summaryState.data, "totalSections", ["totalSections", "sectionCount"], ["lastYearTotalSections", "lastYearSectionCount"], ["sectionsVsLastYearPercentage"]);

  const kpis = [
    {
      label: "Total Students",
      value: studentsKpi.value,
      previousValue: studentsKpi.previousValue,
      icon: totalStudentsIcon,
      tone: "green",
      changeLabel: studentsKpi.label,
      changePct: studentsKpi.badge,
      to: "/dashboard/students",
    },
    {
      label: "Teaching Staff",
      value: teachingKpi.value,
      previousValue: teachingKpi.previousValue,
      icon: teachingStaffIcon,
      tone: "blue",
      changeLabel: teachingKpi.label,
      changePct: teachingKpi.badge,
      to: "/dashboard/staff/teaching",
    },
    {
      label: "Non-Teaching Staff",
      value: nonTeachingKpi.value,
      previousValue: nonTeachingKpi.previousValue,
      icon: nonTeachingStaffIcon,
      tone: "orange",
      changeLabel: nonTeachingKpi.label,
      changePct: nonTeachingKpi.badge,
      to: "/dashboard/staff/non-teaching",
    },
    {
      label: "Total Groups",
      value: groupsKpi.value,
      previousValue: groupsKpi.previousValue,
      icon: totalGroupsIcon,
      tone: "violet",
      changeLabel: groupsKpi.label,
      changePct: groupsKpi.badge,
      to: "/dashboard/courses",
    },
    {
      label: "Total Sections",
      value: sectionsKpi.value,
      previousValue: sectionsKpi.previousValue,
      icon: totalSectionsIcon,
      tone: "cyan",
      changeLabel: sectionsKpi.label,
      changePct: sectionsKpi.badge,
      to: "/dashboard/sections",
    },
  ];

  // Students Overview chart scroll ref and drag handlers
  const chartScrollRef = useRef(null);
  const isDraggingChartRef = useRef(false);
  const chartStartXRef = useRef(0);
  const chartScrollStartRef = useRef(0);

  // Students Overview Normalized Trend Data (Consecutive months from Academic Year start up to present month)
  const overviewChartData = useMemo(() => {
    const raw = overviewState.data?.trend || overviewState.data?.admissionTrend || overviewState.data?.items || (Array.isArray(overviewState.data) ? overviewState.data : []);
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

    if (maxCount <= 5) {
      return { yMax: 5, yTicks: [0, 1, 2, 3, 4, 5] };
    }
    if (maxCount <= 15) {
      const ceilMax = Math.ceil(maxCount / 5) * 5;
      const ticks = [];
      const step = ceilMax <= 10 ? 2 : 5;
      for (let i = 0; i <= ceilMax; i += step) ticks.push(i);
      return { yMax: ceilMax, yTicks: ticks };
    }
    if (maxCount <= 30) {
      const ceilMax = Math.ceil(maxCount / 5) * 5;
      const ticks = [0, 5, 10, 15, 20, 25, 30].filter((t) => t <= ceilMax);
      if (ticks[ticks.length - 1] < ceilMax) ticks.push(ceilMax);
      return { yMax: ceilMax, yTicks: ticks };
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

  // Auto-scroll Students Overview chart to the far right (present month & latest 4 months in view) on data load
  useEffect(() => {
    if (overviewChartData.length > 5) {
      const scrollToEnd = () => {
        if (chartScrollRef.current) {
          const maxScroll = chartScrollRef.current.scrollWidth - chartScrollRef.current.clientWidth;
          if (maxScroll > 0) {
            chartScrollRef.current.scrollLeft = maxScroll + 1000; // force it all the way
          }
        }
      };

      // Execute immediately and also re-try a few times to allow Recharts to finish rendering
      scrollToEnd();
      
      let attempts = 0;
      const interval = setInterval(() => {
        scrollToEnd();
        attempts++;
        if (attempts > 30) clearInterval(interval); // 30 * 100ms = 3.0s
      }, 100);

      return () => clearInterval(interval);
    }
  }, [overviewChartData]);

  const handleChartMouseDown = (e) => {
    if (!chartScrollRef.current) return;
    isDraggingChartRef.current = true;
    chartStartXRef.current = e.pageX - chartScrollRef.current.offsetLeft;
    chartScrollStartRef.current = chartScrollRef.current.scrollLeft;
  };

  const handleChartMouseMove = (e) => {
    if (!isDraggingChartRef.current || !chartScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartScrollRef.current.offsetLeft;
    const walk = (x - chartStartXRef.current) * 1.2;
    chartScrollRef.current.scrollLeft = chartScrollStartRef.current - walk;
  };

  const handleChartMouseUp = () => {
    isDraggingChartRef.current = false;
  };

  const handleChartMouseLeave = () => {
    isDraggingChartRef.current = false;
  };

  const handleChartWheel = (e) => {
    if (!chartScrollRef.current) return;
    if (e.deltaY !== 0) {
      chartScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // Group Distribution Normalized Data
  const groupChartData = useMemo(() => {
    const raw = groupState.data?.items || groupState.data?.groups || (Array.isArray(groupState.data) ? groupState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      name: item.name || item.groupName || item.code || "Group",
      value: Number(item.value ?? item.studentCount ?? item.count ?? 0),
    }));
  }, [groupState.data]);

  // Student Attendance Normalized Values
  const studentAttData = useMemo(() => {
    const data = studentAttState.data || {};
    const total = Number(metric(data, ["total", "totalStudents", "totalCount"]) ?? 0);
    const present = Number(metric(data, ["present", "presentCount"]) ?? 0);
    let absent = metric(data, ["absent", "absentCount"]);
    const halfDay = Number(metric(data, ["halfDay", "halfDayCount", "halfDays", "late", "lateCount"]) ?? 0);
    let percentage = metric(data, ["percentage", "attendancePercentage"]);

    if ((absent === undefined || absent === null || (present === 0 && Number(absent) === 0 && halfDay === 0) || (present + Number(absent) + halfDay < total)) && total > 0) {
      absent = Math.max(0, total - present - halfDay);
    } else {
      absent = Number(absent ?? 0);
    }

    if (percentage === undefined || percentage === null || percentage === 0) {
      percentage = total > 0 ? Number((((present + 0.5 * halfDay) / total) * 100).toFixed(1)) : 0;
    }

    const chartData = [
      { name: "Present", value: present, color: "#22a447" },
      { name: "Absent", value: absent, color: "#ef4444" },
      { name: "Half-day", value: halfDay, color: "#f59e0b" },
    ];

    const breakdownList = data.breakdownList || data.items || data.list || data.breakdown || (Array.isArray(data) ? data : []);

    return { total, present, absent, halfDay, late: halfDay, percentage, chartData, breakdownList };
  }, [studentAttState.data]);

  // Staff Attendance Normalized Values
  const staffAttData = useMemo(() => {
    const data = staffAttState.data || {};
    const total = Number(metric(data, ["total", "totalStaff", "totalCount"]) ?? 0);
    const present = Number(metric(data, ["present", "presentCount"]) ?? 0);
    const absent = Number(metric(data, ["absent", "absentCount"]) ?? 0);
    const late = Number(metric(data, ["late", "lateCount"]) ?? 0);
    const onLeave = Number(metric(data, ["onLeave", "onLeaveCount", "leaveCount"]) ?? 0);
    let percentage = metric(data, ["percentage", "attendancePercentage"]);
    const teachingCount = metric(data, ["teachingCount", "teachingStaffCount"]);
    const nonTeachingCount = metric(data, ["nonTeachingCount", "nonTeachingStaffCount"]);

    if (percentage === undefined || percentage === null || percentage === 0) {
      percentage = total > 0 ? Number((((present + 0.5 * late) / total) * 100).toFixed(1)) : 0;
    }

    const chartData = [
      { name: "Present", value: present, color: "#22a447" },
      { name: "Absent", value: absent, color: "#ef4444" },
      { name: "Late", value: late, color: "#f59e0b" },
      { name: "On Leave", value: onLeave, color: "#7c3aed" },
    ];

    return { total, present, absent, late, onLeave, percentage, teachingCount, nonTeachingCount, chartData };
  }, [staffAttState.data]);

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

  return (
    <DashboardLayout title={null} subtitle={null} actions={null} breadcrumb={["Overview"]}>
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
            <div className="dashboard-last-updated-badge">
              <Clock size={14} />
              <span>Last updated <strong>{lastUpdated}</strong></span>
            </div>
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

        {/* Global Context Viewing Banner */}
        <div className="dashboard-viewing-banner">
          <Info size={16} className="dashboard-banner-icon" />
          <span>
            You are viewing data for {selectedCampus?.name ? <><strong>{selectedCampus.name}</strong> • </> : null}
            <strong>{selectedBoard?.name || selectedBoard?.code || "BIEAP"}</strong> •{" "}
            <strong>Academic Year {selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "2026–2027"}</strong>. Change Campus, Board or Academic Year to view corresponding records.
          </span>
        </div>

        {/* 5 KPI Cards with 3D Icons */}
        <section className="dashboard-kpi-grid" aria-label="College metrics">
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} loading={summaryState.loading} />
          ))}
        </section>

        {/* Quick Actions Bar with 3D Icons */}
        <nav className="dashboard-quick-actions" aria-label="Quick Actions">
          <h2>Quick Actions</h2>
          <div className="dashboard-quick-actions-list">
            {QUICK_ACTIONS.map(({ label, to, icon, tone }) => (
              <Link key={label} to={to} className={`dashboard-quick-action tone-${tone}`}>
                <span className="dashboard-quick-action-icon">
                  <img src={icon} alt="" aria-hidden="true" />
                </span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Second Row Grid: Students Overview | Students by Group | Student Attendance Today */}
        <section className="dashboard-grid-row dashboard-row-three" aria-label="Main Analytics">
          {/* Card 1: Students Overview */}
          <article className="dashboard-card dashboard-students-overview-card">
            <CardHeader title="Students Overview" action={<Link to="/dashboard/students" className="dashboard-view-link">View All <ChevronRight size={14} /></Link>} />
            {overviewState.loading ? (
              <LoadingState label="Loading overview..." />
            ) : overviewState.error ? (
              <ErrorState message={overviewState.error} onRetry={fetchStudentsOverview} />
            ) : overviewChartData.length === 0 ? (
              <EmptyState message="No students overview data available." />
            ) : (
              <div className="dashboard-card-body">
                <div className="dashboard-area-chart-container">
                  {/* Fixed Y-Axis column (pinned on the left) */}
                  <div className="dashboard-area-chart-yaxis" style={{ width: yMax >= 1000 ? 40 : yMax >= 100 ? 34 : 28, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height={142}>
                      <AreaChart data={overviewChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                        <YAxis
                          width={yMax >= 1000 ? 36 : yMax >= 100 ? 30 : 24}
                          domain={[0, yMax]}
                          ticks={yTicks}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10, fill: "var(--cms-muted, #64748b)" }}
                        />
                        <XAxis height={22} tick={false} axisLine={false} tickLine={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Scrollable Area Chart */}
                  <div
                    ref={chartScrollRef}
                    className="dashboard-chart dashboard-area-chart-wrap"
                    onMouseDown={handleChartMouseDown}
                    onMouseMove={handleChartMouseMove}
                    onMouseUp={handleChartMouseUp}
                    onMouseLeave={handleChartMouseLeave}
                    onWheel={handleChartWheel}
                  >
                    <div
                      style={{
                        width: overviewChartData.length > 5 ? `${Math.round((overviewChartData.length / 5) * 100)}%` : "100%",
                        minWidth: "100%",
                        height: 142,
                        position: "relative"
                      }}
                    >
                      <ResponsiveContainer width="100%" height={142}>
                        <AreaChart data={overviewChartData} margin={{ top: 8, right: 0, left: 15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="admissionGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22a447" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#22a447" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cms-border)" />
                          <XAxis
                            dataKey="period"
                            tickLine={false}
                            axisLine={false}
                            height={22}
                            tick={{ fontSize: 10, fill: "var(--cms-muted, #64748b)" }}
                            interval={0}
                            padding={{ left: 20, right: 20 }}
                          />
                          <YAxis hide domain={[0, yMax]} ticks={yTicks} />
                          <Tooltip formatter={(val) => [formatNumber(val), "Students"]} />
                          <Area
                            type="monotone"
                            dataKey="studentsJoined"
                            stroke="#22a447"
                            strokeWidth={2.5}
                            fill="url(#admissionGradient)"
                            dot={{ r: 3, fill: "#22a447" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="dashboard-students-chips">
                  <div className="dashboard-student-chip chip-total">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(metric(overviewState.data, ["totalStudents", "totalCount"]) ?? studentsKpi.value)}</strong>
                      <small>Total Students</small>
                    </div>
                  </div>
                  <div className="dashboard-student-chip chip-boys">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(metric(overviewState.data, ["boys", "boysCount", "male", "maleCount"]))}</strong>
                      <small>Boys</small>
                    </div>
                  </div>
                  <div className="dashboard-student-chip chip-girls">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(metric(overviewState.data, ["girls", "girlsCount", "female", "femaleCount"]))}</strong>
                      <small>Girls</small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </article>

          {/* Card 2: Students by Group */}
          <article className="dashboard-card dashboard-group-card">
            <CardHeader title="Students by Group" action={<Link to="/dashboard/courses" className="dashboard-view-link">View All <ChevronRight size={14} /></Link>} />
            {groupState.loading ? (
              <LoadingState label="Loading groups..." />
            ) : groupState.error ? (
              <ErrorState message={groupState.error} onRetry={fetchGroupDistribution} />
            ) : groupChartData.length === 0 ? (
              <EmptyState message="No group distribution data available." />
            ) : (
              <div className="dashboard-card-body">
                <div className="dashboard-chart dashboard-bar-chart-wrap">
                  <ResponsiveContainer width="100%" height={175}>
                    <BarChart data={groupChartData} margin={{ top: 15, right: 5, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cms-border)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} height={20} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(val) => [formatNumber(val), "Students"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {groupChartData.map((entry, index) => (
                          <Cell key={entry.name || index} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </article>

          {/* Card 3: Students Attendance Overview (Today) */}
          <article className="dashboard-card dashboard-attendance-today-card">
            <CardHeader title="Students Attendance Overview (Today)" />

            {studentAttState.loading ? (
              <LoadingState label="Updating attendance..." />
            ) : studentAttState.error ? (
              <ErrorState message={studentAttState.error} onRetry={fetchStudentAttendance} />
            ) : (
              <div className="dashboard-card-body dashboard-attendance-body">
                {studentAttData.total === 0 ? (
                    <EmptyState message="No marked student attendance available for today." />
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
                                    : [{ name: "Absent", value: 1, color: "#ef4444" }]
                                }
                                dataKey="value"
                                nameKey="name"
                                innerRadius="65%"
                                outerRadius="90%"
                                paddingAngle={studentAttData.chartData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                                stroke="var(--cms-surface)"
                                strokeWidth={2}
                              >
                                {(studentAttData.chartData.some((d) => d.value > 0)
                                  ? studentAttData.chartData.filter((d) => d.value > 0)
                                  : [{ name: "Absent", value: 1, color: "#ef4444" }]
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
                            <strong>{studentAttData.percentage ?? 0}%</strong>
                            <span>Attendance</span>
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
                        <div className="att-kpi-chip">
                          <small>Marked Students</small>
                          <strong>{formatNumber(studentAttData.total)}</strong>
                        </div>
                        <div className="att-kpi-chip text-present">
                          <small>Present</small>
                          <strong>{formatNumber(studentAttData.present)}</strong>
                        </div>
                        <div className="att-kpi-chip text-absent">
                          <small>Absent</small>
                          <strong>{formatNumber(studentAttData.absent)}</strong>
                        </div>
                        <div className="att-kpi-chip text-halfday text-late">
                          <small>Half-day</small>
                          <strong>{formatNumber(studentAttData.halfDay)}</strong>
                        </div>
                        <div className="att-kpi-chip">
                          <small>Attendance</small>
                          <strong>{formatNumber(studentAttData.percentage)}%</strong>
                        </div>
                      </div>
                    </>
                  )
                }

                {/* Footer */}
                <div className="dashboard-card-footer">

                  <Link to="/dashboard/attendance/student?view=details" className="dashboard-footer-btn">
                    View Attendance Details <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>
        </section>

        {/* Third Row Grid: Staff Attendance Today | Certificate Requests | Upcoming Examinations */}
        <section className="dashboard-grid-row dashboard-row-three" aria-label="Secondary Analytics">
          {/* Card 1: Staff Attendance Overview (Today) */}
          <article className="dashboard-card dashboard-staff-attendance-card">
            <CardHeader title="Staff Attendance Overview (Today)" />

            {staffAttState.loading ? (
              <LoadingState label="Updating staff attendance..." />
            ) : staffAttState.error ? (
              <ErrorState message={staffAttState.error} onRetry={fetchStaffAttendance} />
            ) : staffAttData.total === 0 ? (
              <EmptyState message="No staff attendance data available for today." />
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
                              : [{ name: "Absent", value: 1, color: "#ef4444" }]
                          }
                          dataKey="value"
                          nameKey="name"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={staffAttData.chartData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                          stroke="var(--cms-surface)"
                          strokeWidth={2}
                        >
                          {(staffAttData.chartData.some((d) => d.value > 0)
                            ? staffAttData.chartData.filter((d) => d.value > 0)
                            : [{ name: "Absent", value: 1, color: "#ef4444" }]
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
                      <strong>{staffAttData.percentage ?? 0}%</strong>
                      <span>Attendance</span>
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

                {/* Staff Summary Metrics & Split Note */}
                <div className="dashboard-staff-kpi-wrap">
                  <div className="dashboard-staff-kpis">
                    <div className="staff-chip">
                      <small>Total Staff</small>
                      <strong>{formatNumber(staffAttData.total)}</strong>
                    </div>
                    <div className="staff-chip text-present">
                      <small>Present</small>
                      <strong>{formatNumber(staffAttData.present)}</strong>
                    </div>
                    <div className="staff-chip text-absent">
                      <small>Absent</small>
                      <strong>{formatNumber(staffAttData.absent)}</strong>
                    </div>
                    <div className="staff-chip text-late">
                      <small>Late</small>
                      <strong>{formatNumber(staffAttData.late)}</strong>
                    </div>
                    <div className="staff-chip text-leave">
                      <small>On Leave</small>
                      <strong>{formatNumber(staffAttData.onLeave)}</strong>
                    </div>
                  </div>

                  {(staffAttData.teachingCount !== undefined || staffAttData.nonTeachingCount !== undefined) ? (
                    <div className="dashboard-staff-split-note">
                      <span>Teaching: <strong>{formatNumber(staffAttData.teachingCount)}</strong></span>
                      <span className="split-divider">|</span>
                      <span>Non-Teaching: <strong>{formatNumber(staffAttData.nonTeachingCount)}</strong></span>
                    </div>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="dashboard-card-footer">

                  <Link to="/dashboard/attendance/staff" className="dashboard-footer-btn">
                    View Staff Attendance <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 2: Upcoming Holidays & College Breaks */}
          <article className="dashboard-card dashboard-holiday-card">
            <CardHeader
              title={`Upcoming Holidays (${holidaysList.length})`}
              action={<Link to="/dashboard/holidays" className="dashboard-view-link">View All <ChevronRight size={14} /></Link>}
            />
            {holidayState.loading ? (
              <LoadingState label="Loading holidays..." />
            ) : holidayState.error ? (
              <ErrorState message={holidayState.error} onRetry={fetchUpcomingHolidays} />
            ) : holidaysList.length === 0 ? (
              <EmptyState message="No upcoming holidays scheduled." />
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
              </div>
            )}
          </article>

          {/* Card 3: Upcoming Examinations */}
          <article className="dashboard-card dashboard-exams-card">
            <CardHeader
              title={`Upcoming Examinations (${examsList.length})`}
              action={<Link to="/dashboard/examinations" className="dashboard-view-link">View All <ChevronRight size={14} /></Link>}
            />
            {examState.loading ? (
              <LoadingState label="Loading exams..." />
            ) : examState.error ? (
              <ErrorState message={examState.error} onRetry={fetchUpcomingExaminations} />
            ) : examsList.length === 0 ? (
              <EmptyState message="No upcoming examinations scheduled." />
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
              </div>
            )}
          </article>
        </section>
      </main>}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </DashboardLayout>
  );
}
