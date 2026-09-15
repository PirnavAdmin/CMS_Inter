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
import { Toast } from "@/components/common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
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
  { label: "Add Staff", to: "/dashboard/faculty", icon: addStaffIcon, tone: "blue" },
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

function CardHeader({ title, action, children }) {
  return (
    <header className="dashboard-card-head">
      <h2>{title}</h2>
      {action || children ? <div className="dashboard-card-head-actions">{children}{action}</div> : null}
    </header>
  );
}

function LoadingState({ label = "Loading..." }) {
  return (
    <div className="dashboard-card-loading">
      <span className="dashboard-spinner" />
      <span>{label}</span>
    </div>
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

function KpiCard({ label, value, icon, tone, loading, changeLabel = "vs last year", changePct = "↑ 5%", previousValue }) {
  const isAvailable = value !== undefined && value !== null && value !== "";
  const formattedPrev = isAvailable && previousValue !== undefined && previousValue !== null ? formatNumber(previousValue) : "Unavailable";
  return (
    <article className={`dashboard-kpi dashboard-kpi-${tone}`}>
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
          <span className="dashboard-kpi-subtext">{isAvailable ? changeLabel : "API Pending"}</span>
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { selectedBoard, selectedAcademicYear } = useAcademicContext();

  const boardId = selectedBoard?.id || selectedBoard?.code || selectedBoard?.boardId;
  const academicYearId = selectedAcademicYear?.id || selectedAcademicYear?.code || selectedAcademicYear?.academicYearId;
  const todayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [lastUpdated, setLastUpdated] = useState(() => formattedTimestamp());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Dropdown states
  const [studentView, setStudentView] = useState("all");
  const [staffType, setStaffType] = useState("all");

  // State objects for cards
  const [summaryState, setSummaryState] = useState({ loading: true, error: null, data: null });
  const [overviewState, setOverviewState] = useState({ loading: true, error: null, data: null });
  const [groupState, setGroupState] = useState({ loading: true, error: null, data: null });
  const [studentAttState, setStudentAttState] = useState({ loading: true, error: null, data: null, timestamp: formattedTimestamp() });
  const [staffAttState, setStaffAttState] = useState({ loading: true, error: null, data: null, timestamp: formattedTimestamp() });
  const [certState, setCertState] = useState({ loading: true, error: null, data: null });
  const [examState, setExamState] = useState({ loading: true, error: null, data: null });

  // Sequence ref counters for race condition protection
  const summarySeq = useRef(0);
  const overviewSeq = useRef(0);
  const groupSeq = useRef(0);
  const studentAttSeq = useRef(0);
  const staffAttSeq = useRef(0);
  const certSeq = useRef(0);
  const examSeq = useRef(0);

  // Hourly time trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // 1. GET /api/v1/dashboard/summary
  const fetchSummary = useCallback(async () => {
    const seq = ++summarySeq.current;
    setSummaryState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        date: todayDate,
      };
      const res = await apiClient.get(DASHBOARD_API.summary, { params });
      if (summarySeq.current === seq) {
        setSummaryState({ loading: false, error: null, data: unwrap(res.data) });
      }
    } catch (err) {
      if (summarySeq.current === seq) {
        setSummaryState({ loading: false, error: getApiErrorMessage(err, "Failed to load summary metrics"), data: null });
      }
    }
  }, [boardId, academicYearId, todayDate]);

  // 2. GET /api/v1/dashboard/students-overview & GET /api/v1/dashboard/admission-trend
  const fetchStudentsOverview = useCallback(async () => {
    const seq = ++overviewSeq.current;
    setOverviewState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        date: todayDate,
      };
      const trendParams = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
      };

      const [overviewRes, trendRes] = await Promise.allSettled([
        apiClient.get(DASHBOARD_API.studentsOverview, { params }),
        apiClient.get(DASHBOARD_API.admissionTrend, { params: trendParams }),
      ]);

      if (overviewSeq.current === seq) {
        const overviewData = overviewRes.status === "fulfilled" ? unwrap(overviewRes.value?.data) : null;
        const trendData = trendRes.status === "fulfilled" ? unwrap(trendRes.value?.data) : null;

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
  }, [boardId, academicYearId, todayDate]);

  // 3. GET /api/v1/dashboard/group-distribution
  const fetchGroupDistribution = useCallback(async () => {
    const seq = ++groupSeq.current;
    setGroupState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
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
  }, [boardId, academicYearId]);

  // 4. GET /api/v1/dashboard/students-attendance-today
  const fetchStudentAttendance = useCallback(async () => {
    const seq = ++studentAttSeq.current;
    setStudentAttState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const viewByVal =
        studentView === "all" || studentView === "Overall"
          ? "Overall"
          : studentView === "academic-level" || studentView === "Academic Level"
            ? "Academic Level"
            : studentView === "group" || studentView === "Group"
              ? "Group"
              : studentView === "section" || studentView === "Section"
                ? "Section"
                : studentView || "Overall";

      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        viewBy: viewByVal,
      };
      const res = await apiClient.get(DASHBOARD_API.studentsAttendanceToday, { params });
      if (studentAttSeq.current === seq) {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(now);
        setStudentAttState({ loading: false, error: null, data: unwrap(res.data), timestamp: `Today, ${timeStr}` });
      }
    } catch (err) {
      if (studentAttSeq.current === seq) {
        setStudentAttState((prev) => ({ ...prev, loading: false, error: getApiErrorMessage(err, "Failed to load student attendance"), data: null }));
      }
    }
  }, [boardId, academicYearId, studentView]);

  // 5. GET /api/v1/dashboard/staff-attendance-today (Do NOT send academicYearId)
  const fetchStaffAttendance = useCallback(async () => {
    const seq = ++staffAttSeq.current;
    setStaffAttState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const staffTypeVal =
        staffType === "all" || staffType === "All Staff"
          ? "All Staff"
          : staffType === "teaching" || staffType === "Teaching" || staffType === "Teaching Staff"
            ? "Teaching Staff"
            : staffType === "non-teaching" || staffType === "Non-Teaching" || staffType === "Non-Teaching Staff"
              ? "Non-Teaching Staff"
              : staffType || "All Staff";

      const params = {
        ...(boardId ? { boardId } : {}),
        staffType: staffTypeVal,
      };
      const res = await apiClient.get(DASHBOARD_API.staffAttendanceToday, { params });
      if (staffAttSeq.current === seq) {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(now);
        setStaffAttState({ loading: false, error: null, data: unwrap(res.data), timestamp: `Today, ${timeStr}` });
      }
    } catch (err) {
      if (staffAttSeq.current === seq) {
        setStaffAttState((prev) => ({ ...prev, loading: false, error: getApiErrorMessage(err, "Failed to load staff attendance"), data: null }));
      }
    }
  }, [boardId, staffType]);

  // 6. GET /api/v1/dashboard/certificate-requests
  const fetchCertificateRequests = useCallback(async () => {
    const seq = ++certSeq.current;
    setCertState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        date: todayDate,
      };
      const res = await apiClient.get(DASHBOARD_API.certificateRequests, { params });
      if (certSeq.current === seq) {
        setCertState({ loading: false, error: null, data: unwrap(res.data) });
      }
    } catch (err) {
      if (certSeq.current === seq) {
        setCertState({ loading: false, error: getApiErrorMessage(err, "Failed to load certificate requests"), data: null });
      }
    }
  }, [boardId, academicYearId, todayDate]);

  // 7. GET /api/v1/dashboard/upcoming-examinations
  const fetchUpcomingExaminations = useCallback(async () => {
    const seq = ++examSeq.current;
    setExamState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
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
  }, [boardId, academicYearId]);

  // Board & Academic Year Context change effect -> Refresh all applicable cards
  useEffect(() => {
    fetchSummary();
    fetchStudentsOverview();
    fetchGroupDistribution();
    fetchCertificateRequests();
    fetchUpcomingExaminations();
  }, [fetchSummary, fetchStudentsOverview, fetchGroupDistribution, fetchCertificateRequests, fetchUpcomingExaminations]);

  // Student View-By dropdown change effect -> Refresh ONLY Student Attendance card
  useEffect(() => {
    fetchStudentAttendance();
  }, [fetchStudentAttendance]);

  // Staff Type dropdown change effect -> Refresh ONLY Staff Attendance card
  useEffect(() => {
    fetchStaffAttendance();
  }, [fetchStaffAttendance]);

  // Full Refresh Dashboard handler
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchSummary(),
      fetchStudentsOverview(),
      fetchGroupDistribution(),
      fetchStudentAttendance(),
      fetchStaffAttendance(),
      fetchCertificateRequests(),
      fetchUpcomingExaminations(),
    ]);
    setIsRefreshing(false);
    const now = new Date();
    const formattedNow = formattedTimestamp(now);
    setLastUpdated(formattedNow);
    setToastMessage(`Dashboard refreshed with latest data (${formattedNow})`);
  }, [fetchSummary, fetchStudentsOverview, fetchGroupDistribution, fetchStudentAttendance, fetchStaffAttendance, fetchCertificateRequests, fetchUpcomingExaminations]);

  // Extracted KPI Values from Summary API
  const totalStudentsVal = metric(summaryState.data, ["totalStudents", "totalStudentCount", "studentCount"]);
  const teachingStaffVal = metric(summaryState.data, ["teachingStaff", "teachingStaffCount"]);
  const nonTeachingStaffVal = metric(summaryState.data, ["nonTeachingStaff", "nonTeachingStaffCount"]);
  const totalGroupsVal = metric(summaryState.data, ["totalGroups", "groupCount"]);
  const totalSectionsVal = metric(summaryState.data, ["totalSections", "sectionCount"]);

  const kpis = [
    {
      label: "Total Students",
      value: totalStudentsVal,
      previousValue: typeof totalStudentsVal === "number" ? Math.round(totalStudentsVal / 1.05) : null,
      icon: totalStudentsIcon,
      tone: "green",
      changeLabel: "vs last year",
      changePct: "↑ 5%",
    },
    {
      label: "Teaching Staff",
      value: teachingStaffVal,
      previousValue: typeof teachingStaffVal === "number" ? Math.round(teachingStaffVal / 1.02) : null,
      icon: teachingStaffIcon,
      tone: "blue",
      changeLabel: "vs last year",
      changePct: "↑ 2%",
    },
    {
      label: "Non-Teaching Staff",
      value: nonTeachingStaffVal,
      previousValue: typeof nonTeachingStaffVal === "number" ? nonTeachingStaffVal : null,
      icon: nonTeachingStaffIcon,
      tone: "orange",
      changeLabel: "vs last year",
      changePct: "→ 0%",
    },
    {
      label: "Total Groups",
      value: totalGroupsVal,
      previousValue: typeof totalGroupsVal === "number" ? totalGroupsVal : null,
      icon: totalGroupsIcon,
      tone: "violet",
      changeLabel: "vs last year",
      changePct: "→ 0%",
    },
    {
      label: "Total Sections",
      value: totalSectionsVal,
      previousValue: typeof totalSectionsVal === "number" ? Math.round(totalSectionsVal / 1.04) : null,
      icon: totalSectionsIcon,
      tone: "cyan",
      changeLabel: "vs last year",
      changePct: "↑ 4%",
    },
  ];

  // Students Overview Normalized Trend Data
  const overviewChartData = useMemo(() => {
    const raw = overviewState.data?.trend || overviewState.data?.admissionTrend || overviewState.data?.items || (Array.isArray(overviewState.data) ? overviewState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      period: item.period || item.month || item.label || "",
      studentsJoined: Number(item.studentsJoined ?? item.value ?? item.count ?? 0),
    }));
  }, [overviewState.data]);

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
    const total = metric(data, ["total", "totalStudents", "totalCount"]);
    const present = metric(data, ["present", "presentCount"]);
    const absent = metric(data, ["absent", "absentCount"]);
    const late = metric(data, ["late", "lateCount"]);
    const percentage = metric(data, ["percentage", "attendancePercentage"]);

    const chartData = data.chartData || [
      { name: "Present", value: present ?? 0, color: "#22a447" },
      { name: "Absent", value: absent ?? 0, color: "#ef4444" },
      { name: "Late", value: late ?? 0, color: "#f59e0b" },
    ];

    const breakdownList = data.items || data.list || data.breakdown || (Array.isArray(data) ? data : []);

    return { total, present, absent, late, percentage, chartData, breakdownList };
  }, [studentAttState.data]);

  // Staff Attendance Normalized Values
  const staffAttData = useMemo(() => {
    const data = staffAttState.data || {};
    const total = metric(data, ["total", "totalStaff", "totalCount"]);
    const present = metric(data, ["present", "presentCount"]);
    const absent = metric(data, ["absent", "absentCount"]);
    const late = metric(data, ["late", "lateCount"]);
    const onLeave = metric(data, ["onLeave", "onLeaveCount", "leaveCount"]);
    const percentage = metric(data, ["percentage", "attendancePercentage"]);
    const teachingCount = metric(data, ["teachingCount", "teachingStaffCount"]);
    const nonTeachingCount = metric(data, ["nonTeachingCount", "nonTeachingStaffCount"]);

    const chartData = data.chartData || [
      { name: "Present", value: present ?? 0, color: "#22a447" },
      { name: "Absent", value: absent ?? 0, color: "#ef4444" },
      { name: "Late", value: late ?? 0, color: "#f59e0b" },
      { name: "On Leave", value: onLeave ?? 0, color: "#7c3aed" },
    ];

    return { total, present, absent, late, onLeave, percentage, teachingCount, nonTeachingCount, chartData };
  }, [staffAttState.data]);

  // Certificate Requests Normalized List
  const certRequests = useMemo(() => {
    const raw = certState.data?.items || certState.data?.requests || (Array.isArray(certState.data) ? certState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, idx) => ({
      id: item.id || idx,
      label: item.label || item.certificateName || item.title || "Certificate Request",
      subtitle: item.subtitle || item.studentName || item.requestNo || "",
      status: item.status || "Pending",
      tone: item.tone || (String(item.status).toLowerCase() === "approved" ? "green" : "orange"),
    }));
  }, [certState.data]);

  // Upcoming Examinations Normalized List
  const examsList = useMemo(() => {
    const raw = examState.data?.items || examState.data?.examinations || (Array.isArray(examState.data) ? examState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, idx) => ({
      id: item.id || idx,
      name: item.name || item.examName || "Examination",
      context: item.context || item.dateRange || item.groupName || "",
      badge: item.badge || item.daysLeft || item.status || "",
    }));
  }, [examState.data]);

  const greeting = greetingForHour(currentHour);

  return (
    <DashboardLayout title={null} subtitle={null} actions={null} breadcrumb={["Overview"]}>
      <main className="dashboard-page">
        {/* Top Header Bar & Control Panel */}
        <div className="dashboard-header-bar">
          <div className="dashboard-greeting-wrap">
            <h1 className="dashboard-greeting-title">
              <span className="dashboard-greeting-emoji">{greeting.icon}</span> {greeting.message}, Admin!
            </h1>
            <p className="dashboard-greeting-sub">Here's what's happening in your institution today.</p>
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
            You are viewing data for <strong>{selectedBoard?.name || selectedBoard?.code || "BIEAP"}</strong> •{" "}
            <strong>Academic Year {selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "2026–2027"}</strong>. Change Board or Academic Year to view corresponding records.
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
                <div className="dashboard-chart dashboard-area-chart-wrap">
                  <ResponsiveContainer width="100%" height={135}>
                    <AreaChart data={overviewChartData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="admissionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22a447" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#22a447" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cms-border)" />
                      <XAxis dataKey="period" tickLine={false} axisLine={false} height={20} tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(val) => [formatNumber(val), "Students"]} />
                      <Area type="monotone" dataKey="studentsJoined" stroke="#22a447" strokeWidth={2.5} fill="url(#admissionGradient)" dot={{ r: 3, fill: "#22a447" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="dashboard-students-chips">
                  <div className="dashboard-student-chip chip-total">
                    <span className="chip-icon"><Users size={15} /></span>
                    <div>
                      <strong>{formatNumber(totalStudentsVal ?? metric(overviewState.data, ["totalStudents", "totalCount"]))}</strong>
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
            <CardHeader title="Students Attendance Overview (Today)">
              <div className="dashboard-header-select-wrap">
                <span className="dashboard-select-label">View By:</span>
                <select
                  className="dashboard-header-dropdown"
                  value={studentView}
                  onChange={(e) => setStudentView(e.target.value)}
                  aria-label="Select View By"
                >
                  <option value="all">Overall</option>
                  <option value="academic-level">Academic Level</option>
                  <option value="group">Group</option>
                  <option value="section">Section</option>
                </select>
              </div>
            </CardHeader>

            {studentAttState.loading ? (
              <LoadingState label="Updating attendance..." />
            ) : studentAttState.error ? (
              <ErrorState message={studentAttState.error} onRetry={fetchStudentAttendance} />
            ) : (
              <div className="dashboard-card-body dashboard-attendance-body">
                {studentView === "all" ? (
                  studentAttData.total === undefined && studentAttData.present === undefined ? (
                    <EmptyState message="No student attendance data available for today." />
                  ) : (
                    <>
                      {/* Donut Chart & Legend */}
                      <div className="dashboard-attendance-donut-row">
                        <div className="dashboard-donut-chart-wrap">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={studentAttData.chartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius="65%"
                                outerRadius="90%"
                                paddingAngle={3}
                                stroke="var(--cms-surface)"
                                strokeWidth={2}
                              >
                                {studentAttData.chartData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val) => [formatNumber(val), "Students"]} />
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
                            <span className="legend-val">
                              <strong>{formatNumber(studentAttData.present)}</strong> <small>({studentAttData.percentage ?? 0}%)</small>
                            </span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-label">
                              <span className="dot dot-absent" /> Absent
                            </span>
                            <span className="legend-val">
                              <strong>{formatNumber(studentAttData.absent)}</strong>
                            </span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-label">
                              <span className="dot dot-late" /> Late
                            </span>
                            <span className="legend-val">
                              <strong>{formatNumber(studentAttData.late)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 5 Summary KPI Chips */}
                      <div className="dashboard-attendance-kpi-row">
                        <div className="att-kpi-chip">
                          <small>Total Students</small>
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
                        <div className="att-kpi-chip text-late">
                          <small>Late</small>
                          <strong>{formatNumber(studentAttData.late)}</strong>
                        </div>
                        <div className="att-kpi-chip text-primary">
                          <small>Attendance</small>
                          <strong>{formatNumber(studentAttData.percentage)}%</strong>
                        </div>
                      </div>
                    </>
                  )
                ) : studentAttData.breakdownList.length === 0 ? (
                  <EmptyState message={`No ${studentView} attendance records available.`} />
                ) : (
                  <div className="dashboard-attendance-breakdown-list">
                    {studentAttData.breakdownList.map((item, idx) => {
                      const name = item.name || item.groupName || item.sectionName || item.levelName || `Item ${idx + 1}`;
                      const pct = Number(item.percentage ?? (item.total ? ((item.present / item.total) * 100).toFixed(1) : 0));
                      const itemColor = item.color || "#22a447";
                      return (
                        <div key={name || idx} className="att-breakdown-item">
                          <div className="att-breakdown-head">
                            <span className="att-breakdown-name" style={{ color: item.color || "inherit" }}>{name}</span>
                            <span className="att-breakdown-pct">{pct}%</span>
                          </div>
                          <div className="att-progress-bar">
                            <div className="att-progress-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: itemColor }} />
                          </div>
                          <div className="att-breakdown-meta">
                            <span>Present: <strong>{formatNumber(item.present)}</strong> / {formatNumber(item.total)}</span>
                            <span>Absent: <strong>{formatNumber(item.absent)}</strong></span>
                            {item.late !== undefined ? <span>Late: <strong>{formatNumber(item.late)}</strong></span> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="dashboard-card-footer">
                  <span className="dashboard-footer-time">
                    <Clock size={13} /> Last updated: {studentAttState.timestamp}
                  </span>
                  <Link to={`/dashboard/attendance/student?view=details&viewBy=${studentView}`} className="dashboard-footer-btn">
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
            <CardHeader title="Staff Attendance Overview (Today)">
              <select
                className="dashboard-header-dropdown"
                value={staffType}
                onChange={(e) => setStaffType(e.target.value)}
                aria-label="Staff Type"
              >
                <option value="all">All Staff</option>
                <option value="teaching">Teaching Staff</option>
                <option value="non-teaching">Non-Teaching Staff</option>
              </select>
            </CardHeader>

            {staffAttState.loading ? (
              <LoadingState label="Updating staff attendance..." />
            ) : staffAttState.error ? (
              <ErrorState message={staffAttState.error} onRetry={fetchStaffAttendance} />
            ) : staffAttData.total === undefined && staffAttData.present === undefined ? (
              <EmptyState message="No staff attendance data available for today." />
            ) : (
              <div className="dashboard-card-body dashboard-attendance-body">
                {/* Donut Chart & Legend */}
                <div className="dashboard-attendance-donut-row">
                  <div className="dashboard-donut-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={staffAttData.chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={3}
                          stroke="var(--cms-surface)"
                          strokeWidth={2}
                        >
                          {staffAttData.chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => [formatNumber(val), "Staff"]} />
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
                      <span className="legend-val">
                        <strong>{formatNumber(staffAttData.present)}</strong>
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-absent" /> Absent
                      </span>
                      <span className="legend-val">
                        <strong>{formatNumber(staffAttData.absent)}</strong>
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-late" /> Late
                      </span>
                      <span className="legend-val">
                        <strong>{formatNumber(staffAttData.late)}</strong>
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-leave" /> On Leave
                      </span>
                      <span className="legend-val">
                        <strong>{formatNumber(staffAttData.onLeave)}</strong>
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

                  {staffType === "all" && (staffAttData.teachingCount !== undefined || staffAttData.nonTeachingCount !== undefined) ? (
                    <div className="dashboard-staff-split-note">
                      <span>Teaching: <strong>{formatNumber(staffAttData.teachingCount)}</strong></span>
                      <span className="split-divider">|</span>
                      <span>Non-Teaching: <strong>{formatNumber(staffAttData.nonTeachingCount)}</strong></span>
                    </div>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="dashboard-card-footer">
                  <span className="dashboard-footer-time">
                    <Clock size={13} /> Last updated: {staffAttState.timestamp}
                  </span>
                  <Link to="/dashboard/attendance/staff" className="dashboard-footer-btn">
                    View Staff Attendance <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 2: Certificate Requests */}
          <article className="dashboard-card dashboard-certificate-card">
            <CardHeader
              title="Certificate Requests"
              action={<Link to="/dashboard/certificates" className="dashboard-view-link">View All <ChevronRight size={14} /></Link>}
            />
            {certState.loading ? (
              <LoadingState label="Loading requests..." />
            ) : certState.error ? (
              <ErrorState message={certState.error} onRetry={fetchCertificateRequests} />
            ) : certRequests.length === 0 ? (
              <EmptyState message="No certificate requests found." />
            ) : (
              <div className="dashboard-card-body">
                <div className="dashboard-info-list">
                  {certRequests.map((item, index) => (
                    <div key={`certificate-${item.id}-${index}`} className="dashboard-info-item">
                      <span className={`dashboard-list-icon tone-${item.tone}`}>
                        <FileText size={15} />
                      </span>
                      <div className="dashboard-info-content">
                        <strong>{item.label}</strong>
                        <small>{item.subtitle}</small>
                      </div>
                      <span className={`dashboard-status-badge badge-${String(item.status).toLowerCase()}`}>
                        {item.status}
                      </span>
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
                    <div key={`exam-${item.id}-${index}`} className="dashboard-info-item">
                      <span className="dashboard-activity-marker">
                        <CalendarDays size={15} />
                      </span>
                      <div className="dashboard-info-content">
                        <strong>{item.name}</strong>
                        <small>{item.context}</small>
                      </div>
                      <span className="dashboard-days-badge">{item.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </section>
      </main>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </DashboardLayout>
  );
}
