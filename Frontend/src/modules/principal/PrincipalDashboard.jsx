import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Award, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, FileBarChart, GraduationCap, Sparkles, UserCheck, UserPlus, Users, WalletCards, X, Plus, Megaphone } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import pirnavCollegeCrest from "@/assets/pirnav-college-crest.png";
import { getPrincipalDashboardData } from "./services/principalDashboardApi.js";
import { announcementService } from "@/services/announcementService.js";
import PrincipalNoticeModal from "./components/PrincipalNoticeModal.jsx";
import "./PrincipalDashboard.css";

const ICONS = { users: Users, staff: UserCheck, attendance: ClipboardCheck, staffAttendance: UserCheck, classes: GraduationCap, fees: WalletCards, exams: CalendarDays, admissions: UserPlus, student: UserPlus, exam: CalendarDays, result: Award, report: FileBarChart, performance: Activity };
const QUICK_ACTIONS = [{ label: "Add Student", to: "/dashboard/admission", icon: "student", tone: "green" }, { label: "Add Staff", to: "/dashboard/staff/add", icon: "staff", tone: "blue" }, { label: "Mark Attendance", to: "/dashboard/attendance/student", icon: "attendance", tone: "violet" }, { label: "Create Exam", to: "/dashboard/examinations/add", icon: "exam", tone: "amber" }, { label: "Publish Result", to: "/dashboard/results", icon: "result", tone: "teal" }, { label: "Generate Report", to: "/dashboard/reports", icon: "report", tone: "rose" }];
const REPORTS = [{ label: "Student Attendance", meta: "Daily overview", to: "/dashboard/attendance/student", icon: "attendance", tone: "green" }, { label: "Academic Performance", meta: "Published result statistics", to: "/dashboard/reports", icon: "performance", tone: "violet" }, { label: "Fee Collection", meta: "Collection summary", to: "/dashboard/fee-structure", icon: "fees", tone: "amber" }, { label: "Student Strength", meta: "Class distribution", to: "/dashboard/reports", icon: "users", tone: "blue" }];
const EMPTY_DASHBOARD = { attendance: {}, staffAttendance: {}, performance: [], classOverview: [], exams: [], activities: [], notices: [], fees: { chart: [] } };

const money = (value) => value === undefined || value === null ? "-" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const number = (value) => value === undefined || value === null ? "-" : Number(value).toLocaleString("en-IN");
const percent = (value) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "-";
const currentDateKey = () => { const now = new Date(); const offset = now.getTimezoneOffset() * 60000; return new Date(now.getTime() - offset).toISOString().slice(0, 10); };
const formatDateLabel = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "";
function todayRange() {
  const today = currentDateKey();
  return { startDate: today, endDate: today };
}

function attendancePercent(attendance) {
  if (Number.isFinite(Number(attendance?.percentage))) return percent(attendance.percentage);
  const total = Number(attendance?.total || 0);
  return total ? `${((Number(attendance.present || 0) / total) * 100).toFixed(1)}%` : "-";
}

function Icon({ name, size = 18 }) { const Component = ICONS[name] || Activity; return <Component size={size} strokeWidth={2.1} aria-hidden="true" />; }
function SectionHeader({ title, subtitle, action, icon: HeaderIcon = Activity }) { return <div className="principal-section-head"><div className="principal-section-title"><span className="principal-section-icon"><HeaderIcon size={17} /></span><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div>{action}</div>; }
function Empty({ children }) { return <p className="principal-empty-row">{children}</p>; }
function Donut({ present = 0, absent = 0, late = 0, leave = 0, percentage, label }) {
  const total = present + absent + late + leave;
  const chartData = [{ name: "Present", value: present, color: "#168a52" }, { name: "Absent", value: absent, color: "#ef6b62" }, ...(late ? [{ name: "Late", value: late, color: "#e8b938" }] : []), { name: "Leave", value: leave, color: "#7c3aed" }];
  const rate = Number.isFinite(Number(percentage)) ? `${Number(percentage)}%` : total ? `${Math.round((present / total) * 100)}%` : "-";
  return <div className="principal-donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" innerRadius="68%" outerRadius="92%" paddingAngle={total ? 3 : 0} stroke="none">{chartData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie>{total ? <Tooltip formatter={(value, name) => [`${value} people`, name]} /> : null}</PieChart></ResponsiveContainer><div className="principal-donut-center"><strong>{rate}</strong><span>{label}</span></div></div>;
}

export default function PrincipalDashboard() {
  const { selectedCampus, selectedCampusId, activeCampuses } = useCampusContext();
  const { selectedBoardId, selectedAcademicYear, selectedAcademicYearId } = useAcademicContext();
  const currentUser = getAuthUser() || {};
  const assignedCampusIds = Array.isArray(currentUser.assignedCampusIds) && currentUser.assignedCampusIds.length
    ? currentUser.assignedCampusIds.map(String)
    : currentUser.campusId != null ? [String(currentUser.campusId)] : [];
  const selectedAssignedCampusId = assignedCampusIds.find((id) => id === String(selectedCampusId));
  const assignedCampus = selectedAssignedCampusId
    ? activeCampuses.find((campus) => String(campus.id ?? campus.campusId) === selectedAssignedCampusId)
    : activeCampuses.find((campus) => assignedCampusIds.includes(String(campus.id ?? campus.campusId))) || null;
  const assignedCampusId = assignedCampus?.id ?? assignedCampus?.campusId ?? null;
  const [classFilter, setClassFilter] = useState("All classes");
  const [toast, setToast] = useState("");
  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };
  const [notices, setNotices] = useState(() => announcementService.getAllAnnouncements());
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  useEffect(() => {
    if (assignedCampusId) {
      announcementService.fetchAnnouncements(null, assignedCampusId);
    }
    const unsub = announcementService.subscribeAnnouncements(() => {
      setNotices(announcementService.getAllAnnouncements());
    });
    return unsub;
  }, [assignedCampusId]);

  const handleOpenNoticeModal = () => {
    setShowNoticeModal(true);
  };

  const handleCreateNotice = async (noticePayload) => {
    await announcementService.createAnnouncement({
      ...noticePayload,
      campusId: assignedCampusId,
    });
    notify(`Notice published for ${noticePayload.targetAudience}!`);
  };
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const range = useMemo(todayRange, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    if (assignedCampusId == null || assignedCampusId === "") {
      setData(EMPTY_DASHBOARD);
      setLoadError("Your assigned campus is not available. Dashboard data cannot be loaded.");
      setLoading(false);
      return () => { active = false; };
    }
    getPrincipalDashboardData({ campusId: assignedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId, ...range })
      .then((nextData) => { if (active) setData(nextData); })
      .catch((error) => { if (active) { setData(EMPTY_DASHBOARD); setLoadError(error?.message || "Unable to load the live principal dashboard data."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignedCampusId, selectedBoardId, selectedAcademicYearId, range]);

  const classFilters = useMemo(() => ["All classes", ...new Set(data.classOverview.map((item) => item.className.split(" ").slice(0, 3).join(" ")))], [data.classOverview]);
  const filteredClasses = useMemo(() => classFilter === "All classes" ? data.classOverview : data.classOverview.filter((item) => item.className.startsWith(classFilter)), [classFilter, data.classOverview]);
  const classAttendance = useMemo(() => data.classOverview.map((item) => ({ name: item.className, value: item.students ? Math.round((item.present / item.students) * 100) : 0 })), [data.classOverview]);
  const periodSummary = useMemo(() => [
    { id: "students", label: "Total Students", value: number(data.studentCount), detail: "Current student records", trend: Number.isFinite(data.studentsGrowth) ? `${data.studentsGrowth > 0 ? "+" : ""}${data.studentsGrowth.toFixed(1)}%` : "Live", tone: "green", icon: "users", to: "/dashboard/students" },
    { id: "staff", label: "Total Staff", value: number(data.staffCount), detail: "Current staff records", trend: Number.isFinite(data.staffGrowth) ? `${data.staffGrowth > 0 ? "+" : ""}${data.staffGrowth.toFixed(1)}%` : "Live", tone: "violet", icon: "staff", to: "/dashboard/staff" },
    { id: "attendance", label: "Student Attendance", value: attendancePercent(data.attendance), detail: `${number(data.attendance.total)} records marked`, trend: "Live", tone: "blue", icon: "attendance", to: "/dashboard/attendance/student" },
    { id: "staffAttendance", label: "Staff Attendance", value: attendancePercent(data.staffAttendance), detail: `${number(data.staffAttendance.total)} records marked`, trend: "Live", tone: "teal", icon: "staffAttendance", to: "/dashboard/attendance/staff" },
    { id: "classes", label: "Active Classes", value: number(data.activeClasses), detail: "Classes with current students", trend: "Live", tone: "indigo", icon: "classes", to: "/dashboard/sections" },
    { id: "fees", label: "Pending Fees", value: money(data.fees.pending), detail: "Current outstanding amount", trend: "Live", tone: "amber", icon: "fees", to: "/dashboard/fee-structure" },
    { id: "exams", label: "Upcoming Exams", value: number(data.upcomingExamCount), detail: "Available examination schedules", trend: "Live", tone: "rose", icon: "exams", to: "/dashboard/examinations" },
    { id: "admissions", label: "New Admissions", value: number(data.admissions), detail: "Today's admission records", trend: "Live", tone: "mint", icon: "admissions", to: "/dashboard/admission" },
  ], [data]);
  const campusName = assignedCampus?.name || assignedCampus?.campusName || selectedCampus?.name || "Assigned campus";
  const academicYearName = selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "Not selected";
  const principalName = currentUser.fullName || currentUser.name || currentUser.userName || currentUser.displayName || [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || "Principal";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return <DashboardLayout title={null} subtitle={null} breadcrumb={["Overview"]}><main className="principal-page">
    <header className="principal-page-head"><div><p className="principal-eyebrow">{campusName} <span>-</span> Academic Year {academicYearName}</p><h1>Principal Dashboard</h1><p className="principal-page-subtitle">Live data for your college, from attendance to academic progress.</p></div></header>
    {loadError ? <div className="principal-data-status is-error">{loadError}</div> : null}{data.partial && !loadError ? <div className="principal-data-status">Some live dashboard sources are unavailable. Available data is shown below.</div> : null}
    <section className="principal-welcome"><div className="principal-welcome-copy"><span className="principal-welcome-badge"><Sparkles size={14} /> Campus snapshot</span><h2>{greeting}, {principalName}</h2><p>Every number on this page is loaded from the current campus, board, academic year, and reporting date.</p><div className="principal-welcome-meta"><span><CheckCircle2 size={15} /> Live dashboard data</span><span>Updated {new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date())}</span></div></div><img src={pirnavCollegeCrest} alt="College crest" className="principal-crest" /><div className="principal-welcome-side"><span>Today's attendance</span><strong>{attendancePercent(data.attendance)}</strong><small>{data.attendance.total ? `${number(data.attendance.present)} present records` : "No attendance records"}</small><Link to="/dashboard/attendance/student">View details <ArrowUpRight size={14} /></Link></div></section>
    <section className="principal-kpi-grid" aria-label="College summary">{periodSummary.map((item) => <Link key={item.id} to={item.to} className={`principal-kpi principal-tone-${item.tone}`}><span className="principal-kpi-icon"><Icon name={item.icon} size={19} /></span><span className="principal-kpi-content"><span className="principal-kpi-label">{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></span><span className="principal-kpi-trend">{item.trend}</span></Link>)}</section>
    <section className="principal-analytics-grid"><article className="principal-card principal-attendance-card"><SectionHeader title="Student Attendance" subtitle="Current attendance snapshot" action={<Link to="/dashboard/attendance/student" className="principal-card-link">View details <ChevronRight size={14} /></Link>} /><div className="principal-attendance-main"><Donut {...data.attendance} label="Present" /><div className="principal-legend"><div><span className="principal-dot is-present" />Present<strong>{number(data.attendance.present)}</strong></div><div><span className="principal-dot is-absent" />Absent<strong>{number(data.attendance.absent)}</strong></div><div><span className="principal-dot is-leave" />Half day<strong>{number(data.attendance.leave)}</strong></div></div></div>{classAttendance.length ? <div className="principal-class-bars">{classAttendance.map((item) => <div key={item.name} className="principal-class-bar"><div><span>{item.name}</span><strong>{item.value}%</strong></div><div className="principal-progress"><span style={{ width: `${item.value}%` }} /></div></div>)}</div> : <Empty>No class attendance data is available for today.</Empty>}</article><article className="principal-card principal-performance-card"><SectionHeader title="Academic Performance" subtitle="Published pass percentage" action={<Link to="/dashboard/reports" className="principal-card-link">View report <ChevronRight size={14} /></Link>} /><div className="principal-performance-stat"><strong>{percent(data.passPercentage)}</strong><span>{data.passPercentage === undefined ? "No published result statistics" : "Current result statistics"}</span></div>{data.performance.length ? <><div className="principal-chart principal-line-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.performance} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="#e5eee8" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#789083" }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><Tooltip formatter={(value) => [`${value}%`, "Pass rate"]} /><Line type="monotone" dataKey="current" stroke="#168a52" strokeWidth={3} dot={{ r: 4, fill: "#168a52", stroke: "#fff", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div><div className="principal-chart-key"><span><i className="key-current" />Published result</span></div></> : <Empty>Publish result statistics to see performance data.</Empty>}</article><article className="principal-card principal-staff-card"><SectionHeader title="Staff Attendance" subtitle={`Attendance snapshot for ${formatDateLabel(range.endDate)}`} action={<Link to="/dashboard/attendance/staff" className="principal-card-link">View details <ChevronRight size={14} /></Link>} /><div className="principal-staff-overview"><Donut {...data.staffAttendance} label="Present" /><div className="principal-staff-stat"><strong>{attendancePercent(data.staffAttendance)}</strong><span>{number(data.staffAttendance.present)} of {number(data.staffAttendance.total)} staff present</span><div className="principal-mini-stats"><span><b className="is-present" />Present <strong>{number(data.staffAttendance.present)}</strong></span><span><b className="is-absent" />Absent <strong>{number(data.staffAttendance.absent)}</strong></span><span><b className="is-late" />Late <strong>{number(data.staffAttendance.late)}</strong></span><span><b className="is-leave" />On Leave <strong>{number(data.staffAttendance.leave)}</strong></span></div></div></div><Link className="principal-soft-button" to="/dashboard/leave-management">Review leave requests <ArrowUpRight size={14} /></Link></article></section>
    <section className="principal-middle-grid"><article className="principal-card principal-table-card"><SectionHeader title="Class-wise Student Overview" subtitle="Current students and attendance by class" action={<label className="principal-filter"><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filter classes">{classFilters.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={13} /></label>} /><div className="principal-table-wrap"><table><thead><tr><th>Class</th><th>Students</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead><tbody>{filteredClasses.length ? filteredClasses.map((item) => <tr key={item.className}><td><span className={`principal-table-dot tone-${item.tone}`} />{item.className}</td><td>{item.students}</td><td className="is-green">{item.present}</td><td className="is-red">{item.absent}</td><td><span className="principal-rate-pill">{item.students ? Math.round((item.present / item.students) * 100) : 0}%</span></td></tr>) : <tr><td colSpan="5"><Empty>No class records are available for the selected context.</Empty></td></tr>}</tbody></table></div><Link className="principal-table-footer" to="/dashboard/sections">View all classes <ChevronRight size={14} /></Link></article><article className="principal-card principal-exams-card"><SectionHeader title="Upcoming Examinations" subtitle="Next scheduled assessments" action={<Link to="/dashboard/examinations" className="principal-card-link">View all <ChevronRight size={14} /></Link>} /><div className="principal-exam-list">{data.exams.length ? data.exams.map((exam, index) => <Link to="/dashboard/examinations" className="principal-exam-row" key={exam.id}><span className={`principal-exam-date tone-${["green", "violet", "amber"][index % 3]}`}><strong>{exam.date.split(" ")[0]}</strong><small>{exam.date.split(" ").slice(1).join(" ")}</small></span><span className="principal-exam-copy"><strong>{exam.subject}</strong><small>{[exam.time, exam.classes].filter(Boolean).join(" - ")}</small><small>{[exam.room, exam.students === undefined ? "" : `${exam.students} students`].filter(Boolean).join(" - ")}</small></span><ChevronRight size={15} /></Link>) : <Empty>No upcoming examination schedules are available.</Empty>}</div></article></section>
    <section className="principal-lower-grid"><article className="principal-card principal-activity-card"><SectionHeader title="Recent College Activities" subtitle="Latest activity from live records" action={<Link to="/dashboard/reports" className="principal-card-link">View reports <ChevronRight size={14} /></Link>} /><div className="principal-activity-list">{data.activities.length ? data.activities.map((item) => <Link to={item.to} key={item.id} className="principal-activity-row"><span className={`principal-activity-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.title}</strong><small>{item.description}</small></span><time>{item.time}</time></Link>) : <Empty>No recent activity is available.</Empty>}</div></article><article className="principal-card principal-notices-card"><SectionHeader title="Notices & Announcements" subtitle="Campus notices" action={<button type="button" className="principal-soft-button" onClick={handleOpenNoticeModal} style={{ cursor: "pointer", border: "1px solid #c2e0cf", background: "#e8f7ee", color: "#168a52", fontWeight: 700 }}><Plus size={13} /> Post Notice</button>} /><div className="principal-notice-list">{notices.length ? notices.slice(0, 4).map((item) => <div key={item.id} className="principal-notice-row"><span className={`principal-notice-mark tone-${item.priority === "High" || item.priority === "Urgent" ? "rose" : item.priority === "Medium" ? "amber" : "green"}`}><Megaphone size={14} /></span><span><strong>{item.title}</strong><small>Audience: <b>{item.targetAudience || "All Staff"}</b> • {item.publisher || "Principal Office"}</small></span><time>{item.date}</time></div>) : data.notices && data.notices.length ? data.notices.map((notice, idx) => { const tone = notice.type === "Holiday" ? "green" : notice.type === "Exam" ? "rose" : notice.type === "Fee" ? "amber" : "green"; const icon = notice.type === "Holiday" ? "attendance" : notice.type === "Exam" ? "exam" : notice.type === "Fee" ? "fees" : "report"; return <div key={`${notice.id || notice.title}-${idx}`} className="principal-notice-row"><span className={`principal-notice-mark tone-${tone}`}><Icon name={icon} size={16} /></span><span><strong>{notice.title}</strong><small>{notice.description}</small></span>{notice.date ? <time>{notice.date}</time> : null}<em className={`priority-${notice.priority || "normal"}`}>{(notice.priority || "Normal").toUpperCase()}</em></div>; }) : <Empty>No active notices or announcements for this campus.</Empty>}</div></article><article className="principal-card principal-fee-card"><SectionHeader title="Fee Collection" subtitle="Available collection data" action={<Link to="/dashboard/fee-structure" className="principal-card-link">Details <ChevronRight size={14} /></Link>} /><div className="principal-fee-total"><strong>{money(data.fees.collected)}</strong><span>{data.fees.collected === undefined ? "No collection total available" : "Collected amount"}</span></div>{data.fees.chart.length ? <div className="principal-chart principal-fee-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.fees.chart} margin={{ top: 8, right: 0, left: -27, bottom: 0 }}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#789083" }} /><Tooltip formatter={(value) => [money(value), "Collected"]} /><Bar dataKey="value" fill="#54b679" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty>No fee collection records are available.</Empty>}<div className="principal-fee-footer"><span>Pending <strong>{money(data.fees.pending)}</strong></span><span>Collection rate <strong>{percent(data.fees.collectionRate)}</strong></span></div></article></section>
    <section className="principal-bottom-grid"><article className="principal-card principal-actions-card"><SectionHeader title="Quick Actions" subtitle="Common principal workflows" /><div className="principal-actions-list">{QUICK_ACTIONS.map((item) => <Link to={item.to} className={`principal-action tone-${item.tone}`} key={item.label}><span><Icon name={item.icon} size={18} /></span><strong>{item.label}</strong><ChevronRight size={14} /></Link>)}</div></article><article className="principal-card principal-reports-card"><SectionHeader title="Reports Overview" subtitle="Access the information behind your decisions" /><div className="principal-reports-list">{REPORTS.map((item) => <Link to={item.to} className="principal-report-row" key={item.label}><span className={`principal-report-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.label}</strong><small>{item.meta}</small></span><ArrowUpRight size={15} /></Link>)}</div></article></section>
    <footer className="principal-footer"><span>Copyright {new Date().getFullYear()} College Management System</span><span>Principal workspace <span className="principal-footer-dot" /> Live data view</span></footer>{toast ? <div className="principal-toast"><CheckCircle2 size={16} />{toast}</div> : null}
    <PrincipalNoticeModal
      isOpen={showNoticeModal}
      onClose={() => setShowNoticeModal(false)}
      onSubmit={handleCreateNotice}
    />
  </main></DashboardLayout>;
}
