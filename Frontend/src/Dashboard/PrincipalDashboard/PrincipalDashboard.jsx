import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertCircle, ArrowUpRight, Award, CalendarDays, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardCheck, FileBarChart, GraduationCap, Megaphone,
  RefreshCw, ShieldCheck, Sparkles, UserCheck, UserPlus, Users, WalletCards, X,
} from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useEffectivePermissions } from "@/features/rolesPermissions/useEffectivePermissions.js";
import { getAuthUser } from "@/features/authStorage.js";
import pirnavCollegeCrest from "@/assets/pirnav-college-crest.png";
import { principalQuickActions, principalReports } from "./data/principalDashboardMockData.js";
import { fetchPrincipalDashboardData, principalDashboardFallbackData } from "./services/principalDashboardApi.js";
import "./PrincipalDashboard.css";

const ICONS = { users: Users, staff: UserCheck, attendance: ClipboardCheck, staffAttendance: ShieldCheck, classes: GraduationCap, fees: WalletCards, exams: CalendarDays, admissions: UserPlus, student: UserPlus, exam: CalendarDays, result: Award, report: FileBarChart, performance: Activity };
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const PERIOD_OPTIONS = ["Today", "Yesterday", "This Week", "This Month", "Custom Date Range"];

const parseNumericId = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

function formatDateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatRangeLabel(range) {
  if (!range.start || !range.end) return "Custom Date Range";
  return `${formatDateLabel(range.start)} - ${formatDateLabel(range.end)}`;
}

function attendancePercent(attendance) {
  if (attendance?.attendanceRate !== undefined && attendance?.attendanceRate !== null) {
    const rate = Math.min(100, Math.max(0, Number(attendance.attendanceRate)));
    return `${rate.toFixed(1)}%`;
  }
  const total = Number(attendance?.total || 0);
  const present = Number(attendance?.present || 0);
  if (!total || !present) return "0.0%";
  const pct = Math.min(100, Math.max(0, (present / total) * 100));
  return `${pct.toFixed(1)}%`;
}

function Icon({ name, size = 18 }) {
  const Component = ICONS[name] || Activity;
  return <Component size={size} strokeWidth={2.1} aria-hidden="true" />;
}

function SectionHeader({ title, subtitle, action, icon: HeaderIcon = Activity }) {
  return (
    <div className="principal-section-head">
      <div className="principal-section-title">
        <span className="principal-section-icon"><HeaderIcon size={17} /></span>
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      </div>
      {action}
    </div>
  );
}

function Donut({ present, absent, leave, label }) {
  const data = [{ name: "Present", value: present, color: "#168a52" }, { name: "Absent", value: absent, color: "#ef6b62" }, { name: "Leave", value: leave, color: "#e8b938" }];
  const total = present + absent + leave;
  const percentage = total ? Math.min(100, Math.max(0, Math.round((present / total) * 100))) : 0;
  return (
    <div className="principal-donut-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={data} dataKey="value" innerRadius="68%" outerRadius="92%" paddingAngle={3} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value, name) => [`${value} people`, name]} /></PieChart>
      </ResponsiveContainer>
      <div className="principal-donut-center"><strong>{percentage}%</strong><span>{label}</span></div>
    </div>
  );
}

function PrincipalDashboard() {
  const { selectedCampus, selectedCampusId } = useCampusContext();
  const { selectedBoard, selectedAcademicYear, selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const principalPermissions = useEffectivePermissions();
  const [period, setPeriod] = useState("Today");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [draftCustomRange, setDraftCustomRange] = useState({ start: "", end: "" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [classFilter, setClassFilter] = useState("All classes");
  const [toast, setToast] = useState("");
  const [dashboardState, setDashboardState] = useState({
    data: principalDashboardFallbackData,
    loading: true,
    error: "",
    partial: false,
    errors: [],
    loadedAt: "",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const periodControlRef = useRef(null);
  const data = dashboardState.data || principalDashboardFallbackData;
  const authUser = useMemo(() => getAuthUser(), []);
  const principalName = authUser?.fullName || authUser?.name || data.principal?.name || "Principal";
  const collegeName = selectedCampus?.campusName || selectedCampus?.name || data.principal?.college || "College Campus";
  const academicYearName = selectedAcademicYear?.academicYearName || selectedAcademicYear?.name || data.principal?.academicYear || "2026-2027";

  const campusId = useMemo(
    () => parseNumericId(selectedCampusId ?? selectedCampus?.id ?? selectedCampus?.campusId),
    [selectedCampusId, selectedCampus?.id, selectedCampus?.campusId],
  );
  const boardId = useMemo(
    () => parseNumericId(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId),
    [selectedBoardId, selectedBoard?.id, selectedBoard?.boardId],
  );
  const academicYearId = useMemo(
    () => parseNumericId(selectedAcademicYearId ?? selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId),
    [selectedAcademicYearId, selectedAcademicYear?.id, selectedAcademicYear?.academicYearId],
  );

  const selectedPeriodLabel = period === "Custom Date Range" ? formatRangeLabel(customRange) : period;
  const periodSnapshot = data.periodSnapshots?.[period] || data.periodSnapshots?.["This Week"] || principalDashboardFallbackData.periodSnapshots.Today;
  const canViewModule = useCallback((moduleKey) => principalPermissions.canView(moduleKey), [principalPermissions]);
  const canOpenItem = useCallback((item) => principalPermissions.canDo(item.moduleKey, item.action || "view"), [principalPermissions]);
  const reloadDashboard = useCallback(() => setReloadKey((value) => value + 1), []);
  const periodSummary = useMemo(
    () => data.summary
      .map((item) => (item.id === "admissions" ? { ...item, ...periodSnapshot.admissions } : item))
      .filter((item) => canViewModule(item.moduleKey)),
    [canViewModule, data.summary, periodSnapshot.admissions],
  );
  const visibleActivities = useMemo(
    () => periodSnapshot.activities.filter((item) => canViewModule(item.moduleKey)),
    [canViewModule, periodSnapshot.activities],
  );
  const visibleQuickActions = useMemo(
    () => principalQuickActions.filter(canOpenItem),
    [canOpenItem],
  );
  const visibleReports = useMemo(
    () => principalReports.filter(canOpenItem),
    [canOpenItem],
  );
  const performanceStats = useMemo(() => {
    const rows = data.performance || [];
    if (!rows.length) return { current: "0.0", delta: "0.0" };
    const current = rows.reduce((sum, item) => sum + Number(item.current || 0), 0) / rows.length;
    const previous = rows.reduce((sum, item) => sum + Number(item.previous || 0), 0) / rows.length;
    return {
      current: current.toFixed(1),
      delta: Math.abs(current - previous).toFixed(1),
      direction: current >= previous ? "up" : "down",
    };
  }, [data.performance]);

  const loadedAtLabel = useMemo(() => {
    if (!dashboardState.loadedAt) return "Loading live data";
    const date = new Date(dashboardState.loadedAt);
    if (Number.isNaN(date.getTime())) return "Live data loaded";
    return `Last updated ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }, [dashboardState.loadedAt]);

  useEffect(() => {
    let active = true;
    setDashboardState((current) => ({ ...current, loading: true, error: "" }));
    setIsRefreshing(true);
    fetchPrincipalDashboardData({ period, customRange, context: { campusId, boardId, academicYearId } })
      .then((response) => {
        if (!active) return;
        setDashboardState({
          data: response.data,
          loading: false,
          error: "",
          partial: response.partial,
          errors: response.errors || [],
          loadedAt: response.loadedAt,
        });
      })
      .catch((error) => {
        if (!active) return;
        setDashboardState((current) => ({
          ...current,
          loading: false,
          error: error?.message || "Unable to load Principal Dashboard data.",
          partial: true,
          errors: [error?.message || "Unable to load Principal Dashboard data."],
        }));
      })
      .finally(() => {
        if (active) setIsRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [campusId, boardId, academicYearId, customRange.start, customRange.end, period, reloadKey]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!periodControlRef.current?.contains(event.target)) {
        setPeriodOpen(false);
        setCustomRangeOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPeriodOpen(false);
        setCustomRangeOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredClasses = useMemo(() => {
    if (classFilter === "All classes") return data.classOverview;
    return data.classOverview.filter((item) => item.className.startsWith(classFilter));
  }, [classFilter, data.classOverview]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const refreshForPeriod = (nextPeriod) => {
    setPeriod(nextPeriod);
    setPeriodOpen(false);
    setCustomRangeOpen(false);
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 350);
  };

  const selectPeriod = (nextPeriod) => {
    if (nextPeriod === "Custom Date Range") {
      setPeriodOpen(false);
      setDraftCustomRange(customRange);
      setCustomRangeOpen(true);
      return;
    }
    refreshForPeriod(nextPeriod);
  };

  const applyCustomRange = () => {
    if (!draftCustomRange.start || !draftCustomRange.end) {
      notify("Select both a start date and an end date.");
      return;
    }
    if (draftCustomRange.start > draftCustomRange.end) {
      notify("The end date must be on or after the start date.");
      return;
    }
    setCustomRange(draftCustomRange);
    refreshForPeriod("Custom Date Range");
  };

  return (
    <DashboardLayout title={null} subtitle={null} breadcrumb={["Overview"]}>
      <main className="principal-page">
        <header className="principal-page-head">
          <div><p className="principal-eyebrow">{collegeName} <span>•</span> Academic Year {academicYearName}</p><h1>Principal Dashboard</h1><p className="principal-page-subtitle">A clear view of your college, from attendance to academic progress.</p></div>
          <div className="principal-head-actions">
            <div className="principal-period-control" ref={periodControlRef}>
              <button type="button" className="principal-date-picker" aria-haspopup="menu" aria-expanded={periodOpen || customRangeOpen} onClick={() => { setPeriodOpen((open) => !open); setCustomRangeOpen(false); }}>
                <CalendarDays size={16} /><span>{selectedPeriodLabel}</span><ChevronDown size={14} className={periodOpen ? "is-open" : ""} />
              </button>
              {periodOpen ? (
                <div className="principal-period-menu" role="menu" aria-label="Dashboard reporting period">
                  {PERIOD_OPTIONS.map((option) => <button type="button" role="menuitem" className={`principal-period-option ${option === period ? "is-selected" : ""}`} key={option} onClick={() => selectPeriod(option)}>{option}{option === period ? <CheckCircle2 size={14} /> : null}</button>)}
                </div>
              ) : null}
              {customRangeOpen ? (
                <div className="principal-custom-period" role="dialog" aria-label="Choose custom date range">
                  <div className="principal-custom-period-head"><div><strong>Custom Date Range</strong><small>Choose the reporting start and end dates.</small></div><button type="button" aria-label="Close custom date range" onClick={() => setCustomRangeOpen(false)}><X size={15} /></button></div>
                  <div className="principal-custom-period-fields"><label>Start date<input type="date" value={draftCustomRange.start} onChange={(event) => setDraftCustomRange((range) => ({ ...range, start: event.target.value }))} /></label><label>End date<input type="date" min={draftCustomRange.start || undefined} value={draftCustomRange.end} onChange={(event) => setDraftCustomRange((range) => ({ ...range, end: event.target.value }))} /></label></div>
                  <div className="principal-custom-period-actions"><button type="button" className="principal-custom-cancel" onClick={() => setCustomRangeOpen(false)}>Cancel</button><button type="button" className="principal-custom-apply" onClick={applyCustomRange}>Apply range</button></div>
                </div>
              ) : null}
            </div>
            <span className="principal-period-status" aria-live="polite">{isRefreshing || dashboardState.loading ? "Updating..." : ""}</span>
          </div>
        </header>
        {dashboardState.loading || dashboardState.error || dashboardState.partial ? (
          <div className={`principal-api-state ${dashboardState.error ? "is-error" : dashboardState.partial ? "is-warning" : ""}`} role="status">
            {dashboardState.loading ? <RefreshCw className="principal-spin" size={15} /> : <AlertCircle size={15} />}
            <span>
              {dashboardState.loading
                ? "Loading live Principal Dashboard data..."
                : dashboardState.error
                  ? dashboardState.error
                  : "Some live dashboard APIs did not respond. Showing available live data with cached fallbacks."}
            </span>
            {!dashboardState.loading ? <button type="button" onClick={reloadDashboard}>Retry</button> : null}
          </div>
        ) : null}
        {principalPermissions.loading || principalPermissions.error ? (
          <div className="principal-period-status" role="status">
            {principalPermissions.loading ? "Loading module permissions..." : "Permissions unavailable. Protected module links are hidden."}
          </div>
        ) : null}

        <section className="principal-welcome">
          <div className="principal-welcome-copy"><span className="principal-welcome-badge"><Sparkles size={14} /> Campus snapshot</span><h2>Good morning, {principalName}</h2><p>Every number tells a story about your students. Here is what is happening across {collegeName} today.</p><div className="principal-welcome-meta"><span><CheckCircle2 size={15} /> {dashboardState.partial ? "Live data partially loaded" : "Campus operations are on track"}</span><span>{loadedAtLabel}</span></div></div>
          <img src={pirnavCollegeCrest} alt="Pirnav College crest" className="principal-crest" />
          <div className="principal-welcome-side"><span>{period === "Today" ? "Today's attendance" : `${selectedPeriodLabel} attendance`}</span><strong>{attendancePercent(periodSnapshot.attendance)}</strong><small>{Number(periodSnapshot.attendance?.total || 0) > 0 ? `${periodSnapshot.attendance?.present || 0} students recorded present` : "No attendance recorded for this period"}</small>{canViewModule("attendance") ? <Link to="/dashboard/attendance/student">View details <ArrowUpRight size={14} /></Link> : null}</div>
        </section>

        <section className="principal-kpi-grid" aria-label="College summary">
          {periodSummary.map((item) => <Link key={item.id} to={item.to} className={`principal-kpi principal-tone-${item.tone}`}><span className="principal-kpi-icon"><Icon name={item.icon} size={19} /></span><span className="principal-kpi-content"><span className="principal-kpi-label">{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></span><span className="principal-kpi-trend">{item.trend}</span></Link>)}
        </section>

        <section className="principal-analytics-grid">
          <article className="principal-card principal-attendance-card"><SectionHeader title="Student Attendance" subtitle={`${selectedPeriodLabel} across all sections`} action={canViewModule("attendance") ? <Link to="/dashboard/attendance/student" className="principal-card-link">View details <ChevronRight size={14} /></Link> : null} /><div className="principal-attendance-main"><Donut present={periodSnapshot.attendance.present} absent={periodSnapshot.attendance.absent} leave={periodSnapshot.attendance.leave} label="Present" /><div className="principal-legend"><div><span className="principal-dot is-present" />Present<strong>{periodSnapshot.attendance.present.toLocaleString("en-IN")}</strong></div><div><span className="principal-dot is-absent" />Absent<strong>{periodSnapshot.attendance.absent}</strong></div><div><span className="principal-dot is-leave" />On leave<strong>{periodSnapshot.attendance.leave}</strong></div></div></div><div className="principal-class-bars">{periodSnapshot.attendance.classes.map((item) => <div key={item.name} className="principal-class-bar"><div><span>{item.name}</span><strong>{item.value}%</strong></div><div className="principal-progress"><span style={{ width: `${item.value}%` }} /></div></div>)}</div></article>
          <article className="principal-card principal-performance-card"><SectionHeader title="Academic Performance" subtitle="Pass percentage by stream" action={canViewModule("reports-analytics") ? <Link to="/dashboard/reports" className="principal-card-link">View report <ChevronRight size={14} /></Link> : null} /><div className="principal-performance-stat"><strong>{performanceStats.current}%</strong><span><ArrowUpRight size={14} /> {performanceStats.delta}% {performanceStats.direction === "up" ? "above" : "below"} previous exam</span></div><div className="principal-chart principal-line-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.performance} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="#e5eee8" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#789083" }} /><YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><Tooltip formatter={(value) => [`${value}%`, "Pass rate"]} /><Line type="monotone" dataKey="previous" stroke="#b9cbbb" strokeWidth={2} strokeDasharray="5 5" dot={false} /><Line type="monotone" dataKey="current" stroke="#168a52" strokeWidth={3} dot={{ r: 4, fill: "#168a52", stroke: "#fff", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div><div className="principal-chart-key"><span><i className="key-current" />Current exam</span><span><i className="key-previous" />Previous exam</span></div></article>
          <article className="principal-card principal-staff-card"><SectionHeader title="Staff Attendance" subtitle={`${selectedPeriodLabel} for teaching and support staff`} action={canViewModule("staff-attendance") ? <Link to="/dashboard/attendance/staff" className="principal-card-link">View details <ChevronRight size={14} /></Link> : null} /><div className="principal-staff-overview"><Donut present={periodSnapshot.staffAttendance.present} absent={periodSnapshot.staffAttendance.absent} leave={periodSnapshot.staffAttendance.leave} label="Present" /><div className="principal-staff-stat"><strong>{attendancePercent(periodSnapshot.staffAttendance)}</strong><span>{periodSnapshot.staffAttendance.present} of {periodSnapshot.staffAttendance.total} staff present</span><div className="principal-mini-stats"><span><b className="is-present" />Present <strong>{periodSnapshot.staffAttendance.present}</strong></span><span><b className="is-absent" />Absent <strong>{periodSnapshot.staffAttendance.absent}</strong></span><span><b className="is-leave" />Leave <strong>{periodSnapshot.staffAttendance.leave}</strong></span></div></div></div>{canViewModule("staff-leave-management") ? <Link className="principal-soft-button" to="/dashboard/leave-management">Review leave requests <ArrowUpRight size={14} /></Link> : null}</article>
        </section>

        <section className="principal-middle-grid">
          <article className="principal-card principal-table-card"><SectionHeader title="Class-wise Student Overview" subtitle="Attendance by class and section" action={<label className="principal-filter"><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filter classes"><option>All classes</option><option>1st Year</option><option>2nd Year</option></select><ChevronDown size={13} /></label>} /><div className="principal-table-wrap"><table><thead><tr><th>Class</th><th>Students</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead><tbody>{filteredClasses.map((item) => <tr key={item.className}><td><span className={`principal-table-dot tone-${item.tone}`} />{item.className}</td><td>{item.students}</td><td className="is-green">{item.present}</td><td className="is-red">{item.absent}</td><td><span className="principal-rate-pill">{item.students > 0 ? `${Math.min(100, Math.max(0, Math.round((item.present / item.students) * 100)))}%` : "0%"}</span></td></tr>)}</tbody></table></div>{canViewModule("section-room") ? <Link className="principal-table-footer" to="/dashboard/sections">View all classes <ChevronRight size={14} /></Link> : null}</article>
          <article className="principal-card principal-exams-card"><SectionHeader title="Upcoming Examinations" subtitle="Next scheduled assessments" action={canViewModule("examination") ? <Link to="/dashboard/examinations" className="principal-card-link">View all <ChevronRight size={14} /></Link> : null} /><div className="principal-exam-list">{data.exams.map((exam, index) => canViewModule("examination") ? <Link to="/dashboard/examinations" className="principal-exam-row" key={exam.subject}><span className={`principal-exam-date tone-${["green", "violet", "amber"][index]}`}><strong>{exam.date.split(" ")[0]}</strong><small>{exam.date.split(" ").slice(1).join(" ")}</small></span><span className="principal-exam-copy"><strong>{exam.subject}</strong><small>{exam.time} <span>•</span> {exam.classes}</small><small>{exam.room} <span>•</span> {exam.students} students</small></span><ChevronRight size={15} /></Link> : <div className="principal-exam-row" key={exam.subject}><span className={`principal-exam-date tone-${["green", "violet", "amber"][index]}`}><strong>{exam.date.split(" ")[0]}</strong><small>{exam.date.split(" ").slice(1).join(" ")}</small></span><span className="principal-exam-copy"><strong>{exam.subject}</strong><small>{exam.time} <span>•</span> {exam.classes}</small><small>{exam.room} <span>•</span> {exam.students} students</small></span></div>)}</div></article>
        </section>

        <section className="principal-lower-grid">
          <article className="principal-card principal-activity-card"><SectionHeader title="Recent College Activities" subtitle={`${selectedPeriodLabel} movement across campus`} action={canViewModule("reports-analytics") ? <Link to="/dashboard/reports" className="principal-card-link">View all <ChevronRight size={14} /></Link> : null} /><div className="principal-activity-list">{visibleActivities.map((item) => <Link to={item.to} key={item.id} className="principal-activity-row"><span className={`principal-activity-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.title}</strong><small>{item.description}</small></span><time>{item.time}</time></Link>)}</div></article>
          <article className="principal-card principal-notices-card"><SectionHeader title="Notices & Announcements" subtitle={`${selectedPeriodLabel} notices`} action={canViewModule("reports-analytics") ? <Link to="/dashboard/reports" className="principal-card-link">View all <ChevronRight size={14} /></Link> : null} /><div className="principal-notice-list">{periodSnapshot.notices.map((notice) => canViewModule("reports-analytics") ? <Link to="/dashboard/reports" className="principal-notice-row" key={notice.id}><span className={`principal-notice-mark tone-${notice.tone}`}><Megaphone size={15} /></span><span><strong>{notice.title}</strong><small>{notice.description}</small><time>{notice.date}</time></span><em className={`priority-${notice.priority.toLowerCase()}`}>{notice.priority}</em></Link> : <div className="principal-notice-row" key={notice.id}><span className={`principal-notice-mark tone-${notice.tone}`}><Megaphone size={15} /></span><span><strong>{notice.title}</strong><small>{notice.description}</small><time>{notice.date}</time></span><em className={`priority-${notice.priority.toLowerCase()}`}>{notice.priority}</em></div>)}</div></article>
          <article className="principal-card principal-fee-card"><SectionHeader title="Fee Collection" subtitle={`${selectedPeriodLabel} collection in lakhs`} action={canViewModule("fee-management") ? <Link to="/dashboard/fee-structure" className="principal-card-link">Details <ChevronRight size={14} /></Link> : null} /><div className="principal-fee-total"><strong>{money(periodSnapshot.feeTotal)}</strong><span><ArrowUpRight size={13} /> Live collection</span></div><div className="principal-chart principal-fee-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={periodSnapshot.feeCollection} margin={{ top: 8, right: 0, left: -27, bottom: 0 }}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#789083" }} /><Tooltip formatter={(value) => [`INR ${value}L`, "Collected"]} /><Bar dataKey="value" fill="#54b679" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="principal-fee-footer"><span>Pending <strong>{money(periodSnapshot.pendingFees || 0)}</strong></span><span>Collection rate <strong>{periodSnapshot.collectionRate}%</strong></span></div></article>
        </section>

        <section className="principal-bottom-grid"><article className="principal-card principal-actions-card"><SectionHeader title="Quick Actions" subtitle="Common principal workflows" /><div className="principal-actions-list">{visibleQuickActions.map((item) => <Link to={item.to} className={`principal-action tone-${item.tone}`} key={item.label}><span><Icon name={item.icon} size={18} /></span><strong>{item.label}</strong><ChevronRight size={14} /></Link>)}</div></article><article className="principal-card principal-reports-card"><SectionHeader title="Reports Overview" subtitle="Access the information behind your decisions" /><div className="principal-reports-list">{visibleReports.map((item) => <Link to={item.to} className="principal-report-row" key={item.label}><span className={`principal-report-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.label}</strong><small>{item.meta}</small></span><ArrowUpRight size={15} /></Link>)}</div></article></section>
        <footer className="principal-footer"><span>© 2026 Pirnav Junior College Management System</span><span>Principal workspace <span className="principal-footer-dot" /> All systems operational</span></footer>
        {toast ? <div className="principal-toast"><CheckCircle2 size={16} />{toast}</div> : null}
      </main>
    </DashboardLayout>
  );
}

export default PrincipalDashboard;
