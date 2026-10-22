import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Award, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, FileBarChart, GraduationCap, Sparkles, UserCheck, UserPlus, Users, WalletCards, X, Plus, Megaphone } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import pirnavCollegeCrest from "@/assets/pirnav-college-crest.png";
import { getPrincipalDashboardData } from "./services/principalDashboardApi.js";
import { announcementService, TARGET_AUDIENCES, ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES } from "@/services/announcementService.js";
import "./PrincipalDashboard.css";

const ICONS = { users: Users, staff: UserCheck, attendance: ClipboardCheck, staffAttendance: UserCheck, classes: GraduationCap, fees: WalletCards, exams: CalendarDays, admissions: UserPlus, student: UserPlus, exam: CalendarDays, result: Award, report: FileBarChart, performance: Activity };
const PERIOD_OPTIONS = ["Today", "Yesterday", "This Week", "This Month", "Custom Date Range"];
const QUICK_ACTIONS = [{ label: "Add Student", to: "/dashboard/admission", icon: "student", tone: "green" }, { label: "Add Staff", to: "/dashboard/staff/add", icon: "staff", tone: "blue" }, { label: "Mark Attendance", to: "/dashboard/attendance/student", icon: "attendance", tone: "violet" }, { label: "Create Exam", to: "/dashboard/examinations/add", icon: "exam", tone: "amber" }, { label: "Publish Result", to: "/dashboard/results", icon: "result", tone: "teal" }, { label: "Generate Report", to: "/dashboard/reports", icon: "report", tone: "rose" }];
const REPORTS = [{ label: "Student Attendance", meta: "Daily overview", to: "/dashboard/attendance/student", icon: "attendance", tone: "green" }, { label: "Academic Performance", meta: "Published result statistics", to: "/dashboard/reports", icon: "performance", tone: "violet" }, { label: "Fee Collection", meta: "Collection summary", to: "/dashboard/fee-structure", icon: "fees", tone: "amber" }, { label: "Student Strength", meta: "Class distribution", to: "/dashboard/reports", icon: "users", tone: "blue" }];
const EMPTY_DASHBOARD = { attendance: { present: 0, absent: 0, leave: 0, total: 0 }, staffAttendance: { present: 0, absent: 0, leave: 0, total: 0 }, performance: [], classOverview: [], exams: [], activities: [], notices: [], fees: { chart: [] } };

const money = (value) => value === undefined || value === null ? "-" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const number = (value) => value === undefined || value === null ? "-" : Number(value).toLocaleString("en-IN");
const percent = (value) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "-";
const currentDateKey = () => { const now = new Date(); const offset = now.getTimezoneOffset() * 60000; return new Date(now.getTime() - offset).toISOString().slice(0, 10); };
const formatDateLabel = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "";
const formatRangeLabel = (range) => range.start && range.end ? `${formatDateLabel(range.start)} - ${formatDateLabel(range.end)}` : "Custom Date Range";

function periodRange(period, customRange) {
  const end = currentDateKey();
  const start = new Date(`${end}T00:00:00`);
  if (period === "Custom Date Range") return { startDate: customRange.start, endDate: customRange.end };
  if (period === "Yesterday") { start.setDate(start.getDate() - 1); const yesterday = start.toISOString().slice(0, 10); return { startDate: yesterday, endDate: yesterday }; }
  if (period === "This Week") { start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return { startDate: start.toISOString().slice(0, 10), endDate: end }; }
  if (period === "This Month") { start.setDate(1); return { startDate: start.toISOString().slice(0, 10), endDate: end }; }
  return { startDate: end, endDate: end };
}

function attendancePercent(attendance) {
  if (Number.isFinite(Number(attendance?.percentage))) return percent(attendance.percentage);
  const total = Number(attendance?.total || 0);
  return total ? `${((Number(attendance.present || 0) / total) * 100).toFixed(1)}%` : "-";
}

function Icon({ name, size = 18 }) { const Component = ICONS[name] || Activity; return <Component size={size} strokeWidth={2.1} aria-hidden="true" />; }
function SectionHeader({ title, subtitle, action, icon: HeaderIcon = Activity }) { return <div className="principal-section-head"><div className="principal-section-title"><span className="principal-section-icon"><HeaderIcon size={17} /></span><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div>{action}</div>; }
function Empty({ children }) { return <p className="principal-empty-row">{children}</p>; }
function Donut({ present = 0, absent = 0, leave = 0, label }) {
  const total = present + absent + leave;
  const data = [{ name: "Present", value: present, color: "#168a52" }, { name: "Absent", value: absent, color: "#ef6b62" }, { name: "Leave", value: leave, color: "#e8b938" }];
  return <div className="principal-donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius="68%" outerRadius="92%" paddingAngle={total ? 3 : 0} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie>{total ? <Tooltip formatter={(value, name) => [`${value} people`, name]} /> : null}</PieChart></ResponsiveContainer><div className="principal-donut-center"><strong>{total ? `${Math.round((present / total) * 100)}%` : "-"}</strong><span>{label}</span></div></div>;
}

export default function PrincipalDashboard() {
  const { selectedCampus, selectedCampusId } = useCampusContext();
  const { selectedBoardId, selectedAcademicYear, selectedAcademicYearId } = useAcademicContext();
  const [period, setPeriod] = useState("Today");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [draftCustomRange, setDraftCustomRange] = useState({ start: "", end: "" });
  const [classFilter, setClassFilter] = useState("All classes");
  const [toast, setToast] = useState("");
  const [notices, setNotices] = useState(() => announcementService.getAllAnnouncements());
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    targetAudience: "Non-Teaching Staff",
    category: "Administrative",
    priority: "Normal",
    publisher: "Principal Office",
    content: "",
  });
  const [noticeError, setNoticeError] = useState("");

  useEffect(() => {
    const unsub = announcementService.subscribeAnnouncements(() => {
      setNotices(announcementService.getAllAnnouncements());
    });
    return unsub;
  }, []);

  const handleOpenNoticeModal = () => {
    setNoticeForm({
      title: "",
      targetAudience: "Non-Teaching Staff",
      category: "Administrative",
      priority: "Normal",
      publisher: "Principal Office",
      content: "",
    });
    setNoticeError("");
    setShowNoticeModal(true);
  };

  const handleCreateNotice = (e) => {
    e.preventDefault();
    if (!noticeForm.title.trim()) {
      setNoticeError("Please enter a notice title.");
      return;
    }
    if (!noticeForm.content.trim()) {
      setNoticeError("Please enter notice content.");
      return;
    }

    announcementService.createAnnouncement({
      title: noticeForm.title,
      content: noticeForm.content,
      category: noticeForm.category,
      priority: noticeForm.priority,
      targetAudience: noticeForm.targetAudience,
      publisher: noticeForm.publisher || "Principal Office",
      publisherRole: "Principal",
    });

    setShowNoticeModal(false);
    notify(`Notice published for ${noticeForm.targetAudience}!`);
  };

  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const periodControlRef = useRef(null);
  const selectedPeriodLabel = period === "Custom Date Range" ? formatRangeLabel(customRange) : period;
  const range = useMemo(() => periodRange(period, customRange), [period, customRange]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getPrincipalDashboardData({ campusId: selectedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId, ...range })
      .then((nextData) => { if (active) setData(nextData); })
      .catch(() => { if (active) { setData(EMPTY_DASHBOARD); setLoadError("Unable to load the live principal dashboard data."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId, range.startDate, range.endDate, refreshToken]);

  useEffect(() => {
    const closeMenus = (event) => { if (!periodControlRef.current?.contains(event.target)) { setPeriodOpen(false); setCustomRangeOpen(false); } };
    const closeOnEscape = (event) => { if (event.key === "Escape") { setPeriodOpen(false); setCustomRangeOpen(false); } };
    document.addEventListener("mousedown", closeMenus); document.addEventListener("touchstart", closeMenus); document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeMenus); document.removeEventListener("touchstart", closeMenus); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  const classFilters = useMemo(() => ["All classes", ...new Set(data.classOverview.map((item) => item.className.split(" ").slice(0, 3).join(" ")))], [data.classOverview]);
  const filteredClasses = useMemo(() => classFilter === "All classes" ? data.classOverview : data.classOverview.filter((item) => item.className.startsWith(classFilter)), [classFilter, data.classOverview]);
  const classAttendance = useMemo(() => data.classOverview.map((item) => ({ name: item.className, value: item.students ? Math.round((item.present / item.students) * 100) : 0 })), [data.classOverview]);
  const periodSummary = useMemo(() => [
    { id: "students", label: "Total Students", value: number(data.studentCount), detail: "Current student records", trend: "Live", tone: "green", icon: "users", to: "/dashboard/students" },
    { id: "staff", label: "Total Staff", value: number(data.staffCount), detail: "Current staff records", trend: "Live", tone: "violet", icon: "staff", to: "/dashboard/staff" },
    { id: "attendance", label: "Student Attendance", value: attendancePercent(data.attendance), detail: `${number(data.attendance.total)} records marked`, trend: "Live", tone: "blue", icon: "attendance", to: "/dashboard/attendance/student" },
    { id: "staffAttendance", label: "Staff Attendance", value: attendancePercent(data.staffAttendance), detail: `${number(data.staffAttendance.total)} records marked`, trend: "Live", tone: "teal", icon: "staffAttendance", to: "/dashboard/attendance/staff" },
    { id: "classes", label: "Active Classes", value: number(data.activeClasses), detail: "Classes with current students", trend: "Live", tone: "indigo", icon: "classes", to: "/dashboard/sections" },
    { id: "fees", label: "Pending Fees", value: money(data.fees.pending), detail: "Current outstanding amount", trend: "Live", tone: "amber", icon: "fees", to: "/dashboard/fee-structure" },
    { id: "exams", label: "Upcoming Exams", value: number(data.upcomingExamCount), detail: "Available examination schedules", trend: "Live", tone: "rose", icon: "exams", to: "/dashboard/examinations" },
    { id: "admissions", label: "New Admissions", value: number(data.admissions), detail: "Today's admission records", trend: "Live", tone: "mint", icon: "admissions", to: "/dashboard/admission" },
  ], [data, selectedPeriodLabel]);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const refreshForPeriod = (nextPeriod) => { setPeriod(nextPeriod); setPeriodOpen(false); setCustomRangeOpen(false); setRefreshToken((value) => value + 1); };
  const selectPeriod = (nextPeriod) => { if (nextPeriod === "Custom Date Range") { setPeriodOpen(false); setDraftCustomRange(customRange); setCustomRangeOpen(true); return; } refreshForPeriod(nextPeriod); };
  const applyCustomRange = () => { if (!draftCustomRange.start || !draftCustomRange.end) return notify("Select both a start date and an end date."); if (draftCustomRange.start > draftCustomRange.end) return notify("The end date must be on or after the start date."); setCustomRange(draftCustomRange); refreshForPeriod("Custom Date Range"); };
  const campusName = selectedCampus?.name || selectedCampus?.campusName || "Selected campus";
  const academicYearName = selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "Not selected";
  const currentUser = getAuthUser() || {};
  const principalName = currentUser.fullName || currentUser.name || currentUser.userName || currentUser.displayName || [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || "Principal";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return <DashboardLayout title={null} subtitle={null} breadcrumb={["Overview"]}><main className="principal-page">
    <header className="principal-page-head"><div><p className="principal-eyebrow">{campusName} <span>-</span> Academic Year {academicYearName}</p><h1>Principal Dashboard</h1><p className="principal-page-subtitle">Live data for your college, from attendance to academic progress.</p></div><div className="principal-head-actions"><div className="principal-period-control" ref={periodControlRef}><button type="button" className="principal-date-picker" aria-haspopup="menu" aria-expanded={periodOpen || customRangeOpen} onClick={() => { setPeriodOpen((open) => !open); setCustomRangeOpen(false); }}><CalendarDays size={16} /><span>{selectedPeriodLabel}</span><ChevronDown size={14} className={periodOpen ? "is-open" : ""} /></button>{periodOpen ? <div className="principal-period-menu" role="menu" aria-label="Dashboard reporting period">{PERIOD_OPTIONS.map((option) => <button type="button" role="menuitem" className={`principal-period-option ${option === period ? "is-selected" : ""}`} key={option} onClick={() => selectPeriod(option)}>{option}{option === period ? <CheckCircle2 size={14} /> : null}</button>)}</div> : null}{customRangeOpen ? <div className="principal-custom-period" role="dialog" aria-label="Choose custom date range"><div className="principal-custom-period-head"><div><strong>Custom Date Range</strong><small>Choose the reporting start and end dates.</small></div><button type="button" aria-label="Close custom date range" onClick={() => setCustomRangeOpen(false)}><X size={15} /></button></div><div className="principal-custom-period-fields"><label>Start date<input type="date" value={draftCustomRange.start} onChange={(event) => setDraftCustomRange((value) => ({ ...value, start: event.target.value }))} /></label><label>End date<input type="date" min={draftCustomRange.start || undefined} value={draftCustomRange.end} onChange={(event) => setDraftCustomRange((value) => ({ ...value, end: event.target.value }))} /></label></div><div className="principal-custom-period-actions"><button type="button" className="principal-custom-cancel" onClick={() => setCustomRangeOpen(false)}>Cancel</button><button type="button" className="principal-custom-apply" onClick={applyCustomRange}>Apply range</button></div></div> : null}</div><span className="principal-period-status" aria-live="polite">{loading ? "Updating..." : ""}</span></div></header>
    {loadError ? <div className="principal-data-status is-error">{loadError}</div> : null}{data.partial && !loadError ? <div className="principal-data-status">Some live dashboard sources are unavailable. Available data is shown below.</div> : null}
    <section className="principal-welcome"><div className="principal-welcome-copy"><span className="principal-welcome-badge"><Sparkles size={14} /> Campus snapshot</span><h2>{greeting}, {principalName}</h2><p>Every number on this page is loaded from the current campus, board, academic year, and reporting range.</p><div className="principal-welcome-meta"><span><CheckCircle2 size={15} /> Live dashboard data</span><span>Updated {new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date())}</span></div></div><img src={pirnavCollegeCrest} alt="College crest" className="principal-crest" /><div className="principal-welcome-side"><span>{period === "Today" ? "Today's attendance" : `${selectedPeriodLabel} attendance`}</span><strong>{attendancePercent(data.attendance)}</strong><small>{data.attendance.total ? `${number(data.attendance.present)} present records` : "No attendance records"}</small><Link to="/dashboard/attendance/student">View details <ArrowUpRight size={14} /></Link></div></section>
    <section className="principal-kpi-grid" aria-label="College summary">{periodSummary.map((item) => <Link key={item.id} to={item.to} className={`principal-kpi principal-tone-${item.tone}`}><span className="principal-kpi-icon"><Icon name={item.icon} size={19} /></span><span className="principal-kpi-content"><span className="principal-kpi-label">{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></span><span className="principal-kpi-trend">{item.trend}</span></Link>)}</section>
    <section className="principal-analytics-grid"><article className="principal-card principal-attendance-card"><SectionHeader title="Student Attendance" subtitle="Current attendance snapshot" action={<Link to="/dashboard/attendance/student" className="principal-card-link">View details <ChevronRight size={14} /></Link>} /><div className="principal-attendance-main"><Donut {...data.attendance} label="Present" /><div className="principal-legend"><div><span className="principal-dot is-present" />Present<strong>{number(data.attendance.present)}</strong></div><div><span className="principal-dot is-absent" />Absent<strong>{number(data.attendance.absent)}</strong></div><div><span className="principal-dot is-leave" />Half day<strong>{number(data.attendance.leave)}</strong></div></div></div>{classAttendance.length ? <div className="principal-class-bars">{classAttendance.map((item) => <div key={item.name} className="principal-class-bar"><div><span>{item.name}</span><strong>{item.value}%</strong></div><div className="principal-progress"><span style={{ width: `${item.value}%` }} /></div></div>)}</div> : <Empty>No class attendance data is available for today.</Empty>}</article><article className="principal-card principal-performance-card"><SectionHeader title="Academic Performance" subtitle="Published pass percentage" action={<Link to="/dashboard/reports" className="principal-card-link">View report <ChevronRight size={14} /></Link>} /><div className="principal-performance-stat"><strong>{percent(data.passPercentage)}</strong><span>{data.passPercentage === undefined ? "No published result statistics" : "Current result statistics"}</span></div>{data.performance.length ? <><div className="principal-chart principal-line-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.performance} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="#e5eee8" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#789083" }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><Tooltip formatter={(value) => [`${value}%`, "Pass rate"]} /><Line type="monotone" dataKey="current" stroke="#168a52" strokeWidth={3} dot={{ r: 4, fill: "#168a52", stroke: "#fff", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div><div className="principal-chart-key"><span><i className="key-current" />Published result</span></div></> : <Empty>Publish result statistics to see performance data.</Empty>}</article><article className="principal-card principal-staff-card"><SectionHeader title="Staff Attendance" subtitle={`Attendance snapshot for ${formatDateLabel(range.endDate)}`} action={<Link to="/dashboard/attendance/staff" className="principal-card-link">View details <ChevronRight size={14} /></Link>} /><div className="principal-staff-overview"><Donut {...data.staffAttendance} label="Present" /><div className="principal-staff-stat"><strong>{attendancePercent(data.staffAttendance)}</strong><span>{number(data.staffAttendance.present)} of {number(data.staffAttendance.total)} staff present</span><div className="principal-mini-stats"><span><b className="is-present" />Present <strong>{number(data.staffAttendance.present)}</strong></span><span><b className="is-absent" />Absent <strong>{number(data.staffAttendance.absent)}</strong></span><span><b className="is-leave" />Leave <strong>{number(data.staffAttendance.leave)}</strong></span></div></div></div><Link className="principal-soft-button" to="/dashboard/leave-management">Review leave requests <ArrowUpRight size={14} /></Link></article></section>
    <section className="principal-middle-grid"><article className="principal-card principal-table-card"><SectionHeader title="Class-wise Student Overview" subtitle="Current students and attendance by class" action={<label className="principal-filter"><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filter classes">{classFilters.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={13} /></label>} /><div className="principal-table-wrap"><table><thead><tr><th>Class</th><th>Students</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead><tbody>{filteredClasses.length ? filteredClasses.map((item) => <tr key={item.className}><td><span className={`principal-table-dot tone-${item.tone}`} />{item.className}</td><td>{item.students}</td><td className="is-green">{item.present}</td><td className="is-red">{item.absent}</td><td><span className="principal-rate-pill">{item.students ? Math.round((item.present / item.students) * 100) : 0}%</span></td></tr>) : <tr><td colSpan="5"><Empty>No class records are available for the selected context.</Empty></td></tr>}</tbody></table></div><Link className="principal-table-footer" to="/dashboard/sections">View all classes <ChevronRight size={14} /></Link></article><article className="principal-card principal-exams-card"><SectionHeader title="Upcoming Examinations" subtitle="Next scheduled assessments" action={<Link to="/dashboard/examinations" className="principal-card-link">View all <ChevronRight size={14} /></Link>} /><div className="principal-exam-list">{data.exams.length ? data.exams.map((exam, index) => <Link to="/dashboard/examinations" className="principal-exam-row" key={exam.id}><span className={`principal-exam-date tone-${["green", "violet", "amber"][index % 3]}`}><strong>{exam.date.split(" ")[0]}</strong><small>{exam.date.split(" ").slice(1).join(" ")}</small></span><span className="principal-exam-copy"><strong>{exam.subject}</strong><small>{[exam.time, exam.classes].filter(Boolean).join(" - ")}</small><small>{[exam.room, exam.students === undefined ? "" : `${exam.students} students`].filter(Boolean).join(" - ")}</small></span><ChevronRight size={15} /></Link>) : <Empty>No upcoming examination schedules are available.</Empty>}</div></article></section>
    <section className="principal-lower-grid"><article className="principal-card principal-activity-card"><SectionHeader title="Recent College Activities" subtitle="Latest activity from live records" action={<Link to="/dashboard/reports" className="principal-card-link">View reports <ChevronRight size={14} /></Link>} /><div className="principal-activity-list">{data.activities.length ? data.activities.map((item) => <Link to={item.to} key={item.id} className="principal-activity-row"><span className={`principal-activity-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.title}</strong><small>{item.description}</small></span><time>{item.time}</time></Link>) : <Empty>No recent activity is available.</Empty>}</div></article><article className="principal-card principal-notices-card"><SectionHeader title="Notices & Announcements" subtitle="Campus notices" action={<button type="button" className="principal-soft-button" onClick={handleOpenNoticeModal} style={{ cursor: "pointer", border: "1px solid #c2e0cf", background: "#e8f7ee", color: "#168a52", fontWeight: 700 }}><Plus size={13} /> Post Notice</button>} /><div className="principal-notice-list">{notices.length ? notices.slice(0, 4).map((item) => <div key={item.id} className="principal-notice-row"><span className={`principal-notice-mark tone-${item.priority === "High" || item.priority === "Urgent" ? "rose" : item.priority === "Medium" ? "amber" : "green"}`}><Megaphone size={14} /></span><span><strong>{item.title}</strong><small>Audience: <b>{item.targetAudience || "All Staff"}</b> • {item.publisher || "Principal Office"}</small></span><time>{item.date}</time></div>) : <Empty>No notices published yet. Click '+ Post Notice' to dispatch campus notices.</Empty>}</div></article><article className="principal-card principal-fee-card"><SectionHeader title="Fee Collection" subtitle="Available collection data" action={<Link to="/dashboard/fee-structure" className="principal-card-link">Details <ChevronRight size={14} /></Link>} /><div className="principal-fee-total"><strong>{money(data.fees.collected)}</strong><span>{data.fees.collected === undefined ? "No collection total available" : "Collected amount"}</span></div>{data.fees.chart.length ? <div className="principal-chart principal-fee-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.fees.chart} margin={{ top: 8, right: 0, left: -27, bottom: 0 }}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#789083" }} /><Tooltip formatter={(value) => [money(value), "Collected"]} /><Bar dataKey="value" fill="#54b679" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty>No fee collection records are available.</Empty>}<div className="principal-fee-footer"><span>Pending <strong>{money(data.fees.pending)}</strong></span><span>Collection rate <strong>{percent(data.fees.collectionRate)}</strong></span></div></article></section>
    <section className="principal-bottom-grid"><article className="principal-card principal-actions-card"><SectionHeader title="Quick Actions" subtitle="Common principal workflows" /><div className="principal-actions-list">{QUICK_ACTIONS.map((item) => <Link to={item.to} className={`principal-action tone-${item.tone}`} key={item.label}><span><Icon name={item.icon} size={18} /></span><strong>{item.label}</strong><ChevronRight size={14} /></Link>)}</div></article><article className="principal-card principal-reports-card"><SectionHeader title="Reports Overview" subtitle="Access the information behind your decisions" /><div className="principal-reports-list">{REPORTS.map((item) => <Link to={item.to} className="principal-report-row" key={item.label}><span className={`principal-report-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.label}</strong><small>{item.meta}</small></span><ArrowUpRight size={15} /></Link>)}</div></article></section>
    <footer className="principal-footer"><span>Copyright {new Date().getFullYear()} College Management System</span><span>Principal workspace <span className="principal-footer-dot" /> Live data view</span></footer>{toast ? <div className="principal-toast"><CheckCircle2 size={16} />{toast}</div> : null}
    {showNoticeModal && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 1000, padding: 16 }} onClick={() => setShowNoticeModal(false)}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, width: "100%", maxWidth: 540, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #edf2f7", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Megaphone size={18} style={{ color: "#168a52" }} /><h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Post Campus Notice / Circular</h3></div>
            <button type="button" onClick={() => setShowNoticeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
          </div>
          <form onSubmit={handleCreateNotice}>
            <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 14 }}>
              {noticeError && <div style={{ padding: "8px 12px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 8, fontSize: 12.5 }}>{noticeError}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Target Audience <span style={{ color: "#ef4444" }}>*</span></label>
                <select value={noticeForm.targetAudience} onChange={(e) => setNoticeForm({ ...noticeForm, targetAudience: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}>
                  {TARGET_AUDIENCES.map((aud) => <option key={aud.value} value={aud.value}>{aud.label}</option>)}
                </select>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {noticeForm.targetAudience === "Non-Teaching Staff" || noticeForm.targetAudience === "All Staff" || noticeForm.targetAudience === "General / Campus-wide" ? <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ This notice will appear on the Non-Teaching Staff Dashboard announcements page.</span> : <span style={{ color: "#d97706", fontWeight: 600 }}>ⓘ This notice targets {noticeForm.targetAudience} and will not be displayed to Non-Teaching Staff.</span>}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Notice Title <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="e.g. Annual Campus Maintenance & Duty Instructions" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Category</label>
                  <select value={noticeForm.category} onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}>
                    {ANNOUNCEMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Priority</label>
                  <select value={noticeForm.priority} onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}>
                    {ANNOUNCEMENT_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Notice Body / Content <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea rows={4} value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} placeholder="Write circular details, directions, or notices for staff..." style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} required />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid #edf2f7", background: "#f8fafc" }}>
              <button type="button" onClick={() => setShowNoticeModal(false)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}>Cancel</button>
              <button type="submit" style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#168a52", color: "#ffffff", cursor: "pointer", fontWeight: 700, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} /> Publish Notice</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </main></DashboardLayout>;
}
