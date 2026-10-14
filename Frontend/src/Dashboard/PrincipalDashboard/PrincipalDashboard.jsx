import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, ArrowUpRight, Award, BookOpen, CalendarDays, CalendarRange, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardCheck, FileBarChart, FileText, GraduationCap, Landmark, Megaphone, MoreHorizontal, Plus,
  Receipt, Search, ShieldCheck, Sparkles, UserCheck, UserPlus, Users, WalletCards, X,
} from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import pirnavCollegeCrest from "@/assets/pirnav-college-crest.png";
import { principalDashboardData, principalPeriodSnapshots, principalQuickActions, principalReports } from "./data/principalDashboardMockData.js";
import "./PrincipalDashboard.css";

const ICONS = { users: Users, staff: UserCheck, attendance: ClipboardCheck, staffAttendance: ShieldCheck, classes: GraduationCap, fees: WalletCards, exams: CalendarDays, admissions: UserPlus, student: UserPlus, exam: CalendarDays, result: Award, report: FileBarChart, performance: Activity };
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const PERIOD_OPTIONS = ["Today", "Yesterday", "This Week", "This Month", "Custom Date Range"];

function formatDateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatRangeLabel(range) {
  if (!range.start || !range.end) return "Custom Date Range";
  return `${formatDateLabel(range.start)} - ${formatDateLabel(range.end)}`;
}

function attendancePercent(attendance) {
  const total = Number(attendance?.total || 0);
  return total ? `${((Number(attendance.present || 0) / total) * 100).toFixed(1)}%` : "0.0%";
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
  return (
    <div className="principal-donut-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={data} dataKey="value" innerRadius="68%" outerRadius="92%" paddingAngle={3} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value, name) => [`${value} people`, name]} /></PieChart>
      </ResponsiveContainer>
      <div className="principal-donut-center"><strong>{Math.round((present / total) * 100)}%</strong><span>{label}</span></div>
    </div>
  );
}

function PrincipalDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("Today");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [draftCustomRange, setDraftCustomRange] = useState({ start: "", end: "" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [classFilter, setClassFilter] = useState("All classes");
  const [toast, setToast] = useState("");
  const periodControlRef = useRef(null);
  const data = principalDashboardData;

  const selectedPeriodLabel = period === "Custom Date Range" ? formatRangeLabel(customRange) : period;
  const periodSnapshot = principalPeriodSnapshots[period] || principalPeriodSnapshots["This Week"];
  const periodSummary = useMemo(
    () => data.summary.map((item) => (item.id === "admissions" ? { ...item, ...periodSnapshot.admissions } : item)),
    [data.summary, periodSnapshot.admissions],
  );

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
          <div><p className="principal-eyebrow">{data.principal.college} <span>•</span> Academic Year {data.principal.academicYear}</p><h1>Principal Dashboard</h1><p className="principal-page-subtitle">A clear view of your college, from attendance to academic progress.</p></div>
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
            <span className="principal-period-status" aria-live="polite">{isRefreshing ? "Updating..." : ""}</span>
          </div>
        </header>

        <section className="principal-welcome">
          <div className="principal-welcome-copy"><span className="principal-welcome-badge"><Sparkles size={14} /> Campus snapshot</span><h2>Good morning, {data.principal.name}</h2><p>Every number tells a story about your students. Here is what is happening across Pirnav today.</p><div className="principal-welcome-meta"><span><CheckCircle2 size={15} /> Campus operations are on track</span><span>Last updated 10:30 AM</span></div></div>
          <img src={pirnavCollegeCrest} alt="Pirnav College crest" className="principal-crest" />
          <div className="principal-welcome-side"><span>{period === "Today" ? "Today's attendance" : `${selectedPeriodLabel} attendance`}</span><strong>{attendancePercent(periodSnapshot.attendance)}</strong><small>+2.8% from previous period</small><Link to="/dashboard/attendance/student">View details <ArrowUpRight size={14} /></Link></div>
        </section>

        <section className="principal-kpi-grid" aria-label="College summary">
          {periodSummary.map((item) => <Link key={item.id} to={item.to} className={`principal-kpi principal-tone-${item.tone}`}><span className="principal-kpi-icon"><Icon name={item.icon} size={19} /></span><span className="principal-kpi-content"><span className="principal-kpi-label">{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></span><span className="principal-kpi-trend">{item.trend}</span></Link>)}
        </section>

        <section className="principal-analytics-grid">
          <article className="principal-card principal-attendance-card"><SectionHeader title="Student Attendance" subtitle={`${selectedPeriodLabel} across all sections`} action={<Link to="/dashboard/attendance/student" className="principal-card-link">View details <ChevronRight size={14} /></Link>} /><div className="principal-attendance-main"><Donut present={periodSnapshot.attendance.present} absent={periodSnapshot.attendance.absent} leave={periodSnapshot.attendance.leave} label="Present" /><div className="principal-legend"><div><span className="principal-dot is-present" />Present<strong>{periodSnapshot.attendance.present.toLocaleString("en-IN")}</strong></div><div><span className="principal-dot is-absent" />Absent<strong>{periodSnapshot.attendance.absent}</strong></div><div><span className="principal-dot is-leave" />On leave<strong>{periodSnapshot.attendance.leave}</strong></div></div></div><div className="principal-class-bars">{periodSnapshot.attendance.classes.map((item) => <div key={item.name} className="principal-class-bar"><div><span>{item.name}</span><strong>{item.value}%</strong></div><div className="principal-progress"><span style={{ width: `${item.value}%` }} /></div></div>)}</div></article>
          <article className="principal-card principal-performance-card"><SectionHeader title="Academic Performance" subtitle="Pass percentage by stream" action={<Link to="/dashboard/reports" className="principal-card-link">View report <ChevronRight size={14} /></Link>} /><div className="principal-performance-stat"><strong>84.6%</strong><span><ArrowUpRight size={14} /> 4.2% vs previous exam</span></div><div className="principal-chart principal-line-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.performance} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="#e5eee8" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#789083" }} /><YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><Tooltip formatter={(value) => [`${value}%`, "Pass rate"]} /><Line type="monotone" dataKey="previous" stroke="#b9cbbb" strokeWidth={2} strokeDasharray="5 5" dot={false} /><Line type="monotone" dataKey="current" stroke="#168a52" strokeWidth={3} dot={{ r: 4, fill: "#168a52", stroke: "#fff", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div><div className="principal-chart-key"><span><i className="key-current" />Current exam</span><span><i className="key-previous" />Previous exam</span></div></article>
          <article className="principal-card principal-staff-card"><SectionHeader title="Staff Attendance" subtitle={`${selectedPeriodLabel} for teaching and support staff`} action={<Link to="/dashboard/attendance/staff" className="principal-card-link">View details <ChevronRight size={14} /></Link>} /><div className="principal-staff-overview"><Donut present={periodSnapshot.staffAttendance.present} absent={periodSnapshot.staffAttendance.absent} leave={periodSnapshot.staffAttendance.leave} label="Present" /><div className="principal-staff-stat"><strong>{attendancePercent(periodSnapshot.staffAttendance)}</strong><span>{periodSnapshot.staffAttendance.present} of {periodSnapshot.staffAttendance.total} staff present</span><div className="principal-mini-stats"><span><b className="is-present" />Present <strong>{periodSnapshot.staffAttendance.present}</strong></span><span><b className="is-absent" />Absent <strong>{periodSnapshot.staffAttendance.absent}</strong></span><span><b className="is-leave" />Leave <strong>{periodSnapshot.staffAttendance.leave}</strong></span></div></div></div><Link className="principal-soft-button" to="/dashboard/leave-management">Review leave requests <ArrowUpRight size={14} /></Link></article>
        </section>

        <section className="principal-middle-grid">
          <article className="principal-card principal-table-card"><SectionHeader title="Class-wise Student Overview" subtitle="Attendance by class and section" action={<label className="principal-filter"><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filter classes"><option>All classes</option><option>1st Year</option><option>2nd Year</option></select><ChevronDown size={13} /></label>} /><div className="principal-table-wrap"><table><thead><tr><th>Class</th><th>Students</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead><tbody>{filteredClasses.map((item) => <tr key={item.className}><td><span className={`principal-table-dot tone-${item.tone}`} />{item.className}</td><td>{item.students}</td><td className="is-green">{item.present}</td><td className="is-red">{item.absent}</td><td><span className="principal-rate-pill">{Math.round((item.present / item.students) * 100)}%</span></td></tr>)}</tbody></table></div><Link className="principal-table-footer" to="/dashboard/sections">View all classes <ChevronRight size={14} /></Link></article>
          <article className="principal-card principal-exams-card"><SectionHeader title="Upcoming Examinations" subtitle="Next scheduled assessments" action={<Link to="/dashboard/examinations" className="principal-card-link">View all <ChevronRight size={14} /></Link>} /><div className="principal-exam-list">{data.exams.map((exam, index) => <Link to="/dashboard/examinations" className="principal-exam-row" key={exam.subject}><span className={`principal-exam-date tone-${["green", "violet", "amber"][index]}`}><strong>{exam.date.split(" ")[0]}</strong><small>{exam.date.split(" ").slice(1).join(" ")}</small></span><span className="principal-exam-copy"><strong>{exam.subject}</strong><small>{exam.time} <span>•</span> {exam.classes}</small><small>{exam.room} <span>•</span> {exam.students} students</small></span><ChevronRight size={15} /></Link>)}</div></article>
        </section>

        <section className="principal-lower-grid">
          <article className="principal-card principal-activity-card"><SectionHeader title="Recent College Activities" subtitle={`${selectedPeriodLabel} movement across campus`} action={<Link to="/dashboard/reports" className="principal-card-link">View all <ChevronRight size={14} /></Link>} /><div className="principal-activity-list">{periodSnapshot.activities.map((item) => <Link to={item.to} key={item.id} className="principal-activity-row"><span className={`principal-activity-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.title}</strong><small>{item.description}</small></span><time>{item.time}</time></Link>)}</div></article>
          <article className="principal-card principal-notices-card"><SectionHeader title="Notices & Announcements" subtitle={`${selectedPeriodLabel} notices`} action={<Link to="/dashboard/reports" className="principal-card-link">View all <ChevronRight size={14} /></Link>} /><div className="principal-notice-list">{periodSnapshot.notices.map((notice) => <Link to="/dashboard/reports" className="principal-notice-row" key={notice.id}><span className={`principal-notice-mark tone-${notice.tone}`}><Megaphone size={15} /></span><span><strong>{notice.title}</strong><small>{notice.description}</small><time>{notice.date}</time></span><em className={`priority-${notice.priority.toLowerCase()}`}>{notice.priority}</em></Link>)}</div></article>
          <article className="principal-card principal-fee-card"><SectionHeader title="Fee Collection" subtitle={`${selectedPeriodLabel} collection in lakhs`} action={<Link to="/dashboard/fee-structure" className="principal-card-link">Details <ChevronRight size={14} /></Link>} /><div className="principal-fee-total"><strong>{money(periodSnapshot.feeTotal)}</strong><span><ArrowUpRight size={13} /> 8.3% from previous period</span></div><div className="principal-chart principal-fee-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={periodSnapshot.feeCollection} margin={{ top: 8, right: 0, left: -27, bottom: 0 }}><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#789083" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#789083" }} /><Tooltip formatter={(value) => [`INR ${value}L`, "Collected"]} /><Bar dataKey="value" fill="#54b679" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="principal-fee-footer"><span>Pending <strong>INR 7.45L</strong></span><span>Collection rate <strong>{periodSnapshot.collectionRate}%</strong></span></div></article>
        </section>

        <section className="principal-bottom-grid"><article className="principal-card principal-actions-card"><SectionHeader title="Quick Actions" subtitle="Common principal workflows" /><div className="principal-actions-list">{principalQuickActions.map((item) => <Link to={item.to} className={`principal-action tone-${item.tone}`} key={item.label}><span><Icon name={item.icon} size={18} /></span><strong>{item.label}</strong><ChevronRight size={14} /></Link>)}</div></article><article className="principal-card principal-reports-card"><SectionHeader title="Reports Overview" subtitle="Access the information behind your decisions" /><div className="principal-reports-list">{principalReports.map((item) => <Link to={item.to} className="principal-report-row" key={item.label}><span className={`principal-report-icon tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span><strong>{item.label}</strong><small>{item.meta}</small></span><ArrowUpRight size={15} /></Link>)}</div></article></section>
        <footer className="principal-footer"><span>© 2026 Pirnav Junior College Management System</span><span>Principal workspace <span className="principal-footer-dot" /> All systems operational</span></footer>
        {toast ? <div className="principal-toast"><CheckCircle2 size={16} />{toast}</div> : null}
      </main>
    </DashboardLayout>
  );
}

export default PrincipalDashboard;
