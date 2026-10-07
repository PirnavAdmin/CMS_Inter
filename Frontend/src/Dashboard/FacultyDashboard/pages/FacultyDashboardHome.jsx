import React, { useState, useMemo, useCallback } from "react";
import {
  Clock,
  RefreshCw,
  Info,
  ChevronRight,
  UserCheck,
  CalendarDays,
  Users,
  Award,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  GraduationCap,
  Plus,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useFaculty } from "../FacultyContext.jsx";
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
import "../styles/FacultyDashboardHome.css";

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

const SECTION_ATTENDANCE_DATA = {
  all: {
    label: "Overall",
    total: 115,
    present: 105,
    absent: 7,
    halfDay: 3,
    percentage: 91.3,
    chartData: [
      { name: "Present", value: 105, color: "#22a447" },
      { name: "Absent", value: 7, color: "#ef4444" },
      { name: "Half-day", value: 3, color: "#f59e0b" },
    ],
  },
  "MPC-1A": {
    label: "MPC 1A",
    total: 45,
    present: 42,
    absent: 2,
    halfDay: 1,
    percentage: 93.3,
    chartData: [
      { name: "Present", value: 42, color: "#22a447" },
      { name: "Absent", value: 2, color: "#ef4444" },
      { name: "Half-day", value: 1, color: "#f59e0b" },
    ],
  },
  "MPC-2B": {
    label: "MPC 2B",
    total: 40,
    present: 36,
    absent: 3,
    halfDay: 1,
    percentage: 90.0,
    chartData: [
      { name: "Present", value: 36, color: "#22a447" },
      { name: "Absent", value: 3, color: "#ef4444" },
      { name: "Half-day", value: 1, color: "#f59e0b" },
    ],
  },
  "MEC-1A": {
    label: "MEC 1A",
    total: 30,
    present: 27,
    absent: 2,
    halfDay: 1,
    percentage: 90.0,
    chartData: [
      { name: "Present", value: 27, color: "#22a447" },
      { name: "Absent", value: 2, color: "#ef4444" },
      { name: "Half-day", value: 1, color: "#f59e0b" },
    ],
  },
};

const SECTION_BREAKDOWN_LIST = [
  {
    name: "MPC 1st Year — Section A",
    subject: "Mathematics I-A",
    total: 45,
    present: 42,
    absent: 2,
    halfDay: 1,
    percentage: 93.3,
    color: "#22a447",
  },
  {
    name: "MPC 2nd Year — Section B",
    subject: "Mathematics II-A",
    total: 40,
    present: 36,
    absent: 3,
    halfDay: 1,
    percentage: 90.0,
    color: "#2563eb",
  },
  {
    name: "MEC 1st Year — Section A",
    subject: "Commercial Maths",
    total: 30,
    present: 27,
    absent: 2,
    halfDay: 1,
    percentage: 90.0,
    color: "#7c3aed",
  },
];

const SECTION_STUDENTS_DATA = [
  { name: "MPC 1A", students: 45, boys: 28, girls: 17, fill: "#2563eb" },
  { name: "MPC 2B", students: 40, boys: 22, girls: 18, fill: "#7c3aed" },
  { name: "MEC 1A", students: 30, boys: 16, girls: 14, fill: "#16a34a" },
];

const TODAY_LECTURES = [
  {
    id: 1,
    time: "09:00 – 10:00 AM",
    subject: "Mathematics I-A",
    code: "MATH101",
    section: "MPC 1A",
    room: "Room 203",
    enrolled: 45,
    status: "Completed",
    statusTone: "green",
    note: "Marked: 42/45",
  },
  {
    id: 2,
    time: "10:00 – 11:00 AM",
    subject: "Mathematics I-A",
    code: "MATH101",
    section: "MPC 1A",
    room: "Room 203",
    enrolled: 45,
    status: "In Progress",
    statusTone: "orange",
    note: "Active Lecture",
  },
  {
    id: 3,
    time: "11:15 – 12:15 PM",
    subject: "Mathematics II-A",
    code: "MATH201",
    section: "MPC 2B",
    room: "Room 205",
    enrolled: 40,
    status: "Upcoming",
    statusTone: "blue",
    note: "Hall 2 • Scheduled",
  },
];

const FACULTY_ATTENDANCE_DONUT = [
  { name: "Present", value: 21, color: "#22a447" },
  { name: "Leave", value: 1, color: "#f59e0b" },
  { name: "Holidays / Sundays", value: 8, color: "#94a3b8" },
];

const UPCOMING_HOLIDAYS = [
  {
    id: 1,
    name: "Gandhi Jayanti",
    type: "National Holiday",
    dateText: "02 Oct 2026",
    dayOfWeek: "Friday",
    durationText: "1 Day",
    badge: "In 2 Days",
    tone: "green",
  },
  {
    id: 2,
    name: "Dasara Holidays",
    type: "Festival Holiday",
    dateText: "19 Oct – 24 Oct 2026",
    dayOfWeek: "Mon – Sat",
    durationText: "6 Days",
    badge: "In 12 Days",
    tone: "violet",
  },
  {
    id: 3,
    name: "Diwali",
    type: "Festival Holiday",
    dateText: "08 Nov 2026",
    dayOfWeek: "Sunday",
    durationText: "1 Day",
    badge: "In 32 Days",
    tone: "violet",
  },
];

const UPCOMING_EXAMINATIONS = [
  {
    id: 1,
    name: "BIEAP IPE Board Theory Exam 2026",
    examCode: "BIEAP-IPE-2026",
    role: "Invigilator (Hall Supt.)",
    context: "Math I-A • Hall 204 • 09:00 AM – 12:00 PM",
    badge: "In 12 Days",
    tone: "blue",
  },
  {
    id: 2,
    name: "BIEAP Intermediate Practical Exam",
    examCode: "PRAC-PHY-2026",
    role: "External Examiner",
    context: "Physics Lab 102 • Batch 01 • 09:00 AM",
    badge: "In 15 Days",
    tone: "violet",
  },
  {
    id: 3,
    name: "College Pre-Final Examination 2026",
    examCode: "PRE-FINAL-2026",
    role: "Chief Invigilator",
    context: "Auditorium Hall A • MPC & BiPC • 02:00 PM",
    badge: "In 19 Days",
    tone: "orange",
  },
  {
    id: 4,
    name: "Unit Test II Evaluation Camp",
    examCode: "UT-II-EVAL",
    role: "Paper Evaluator",
    context: "Evaluation Cell Room 305 • 90 Scripts",
    badge: "In 25 Days",
    tone: "green",
  },
];

const QUICK_ACTIONS = [
  { label: "Mark Attendance", moduleId: "attendance", icon: markAttendanceIcon, tone: "green" },
  { label: "Enter Marks", moduleId: "marks", icon: createExamIcon, tone: "orange" },
  { label: "My Timetable", moduleId: "timetable", icon: createSectionIcon, tone: "blue" },
  { label: "My Attendance", moduleId: "myattendance", icon: teachingStaffIcon, tone: "green" },
  { label: "Apply Leave", moduleId: "leave", icon: addStaffIcon, tone: "violet" },
  { label: "Exam Duties", moduleId: "examduties", icon: totalGroupsIcon, tone: "cyan" },
];

function CardHeader({ title, action, children }) {
  return (
    <header className="dashboard-card-head">
      <h2>{title}</h2>
      {action || children ? <div className="dashboard-card-head-actions">{children}{action}</div> : null}
    </header>
  );
}

function CustomDonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="dashboard-custom-donut-tooltip">
        <span className="tooltip-dot" style={{ backgroundColor: data.payload.color || data.color }} />
        <span className="tooltip-name">{data.name}:</span>
        <span className="tooltip-val">{data.value}</span>
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="dashboard-custom-donut-tooltip">
        <span className="tooltip-dot" style={{ backgroundColor: data.fill }} />
        <span className="tooltip-name">{data.name}:</span>
        <span className="tooltip-val">{data.students} Students</span>
        {data.boys !== undefined && (
          <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}>
            ({data.boys} Boys, {data.girls} Girls)
          </span>
        )}
      </div>
    );
  }
  return null;
}

function KpiCard({ label, value, subtext, badge, tone, icon, tooltip, onClick }) {
  return (
    <article
      className={`dashboard-kpi dashboard-kpi-${tone}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="dashboard-kpi-pop">
        <span>{tooltip || label}</span>
      </div>
      <div className="dashboard-kpi-top">
        <div className="dashboard-kpi-icon">
          <img src={icon} alt="" aria-hidden="true" />
        </div>
        <div className="dashboard-kpi-title-wrap">
          <span className="dashboard-kpi-label">{label}</span>
          <div className="dashboard-kpi-value-row">
            <span className="dashboard-kpi-value">{value}</span>
            {badge ? <span className="dashboard-kpi-trend">{badge}</span> : null}
          </div>
          {subtext ? <span className="dashboard-kpi-subtext">{subtext}</span> : null}
        </div>
      </div>
    </article>
  );
}

export default function FacultyDashboardHome() {
  const { profileData, punchState, setActiveModule, notify } = useFaculty();

  const [studentAttView, setStudentAttView] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => formattedTimestamp());

  const currentHour = new Date().getHours();
  const greeting = greetingForHour(currentHour);

  const currentAttData = useMemo(() => {
    return SECTION_ATTENDANCE_DATA[studentAttView] || SECTION_ATTENDANCE_DATA.all;
  }, [studentAttView]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const nowStr = formattedTimestamp();
      setLastUpdated(nowStr);
      if (notify) {
        notify(`Faculty dashboard refreshed with latest data (${nowStr})`);
      }
    }, 600);
  }, [notify]);

  const kpis = [
    {
      label: "Total Students",
      value: "115",
      badge: "3 SECTIONS",
      subtext: "MPC 1A, MPC 2B, MEC 1A",
      tone: "green",
      icon: totalStudentsIcon,
      tooltip: "115 enrolled students across 3 assigned sections",
      onClick: () => setActiveModule("classes"),
    },
    {
      label: "Today's Lectures",
      value: "3",
      badge: "1 COMPLETED",
      subtext: "2 remaining lectures today",
      tone: "blue",
      icon: teachingStaffIcon,
      tooltip: "3 lecture periods scheduled on today's timetable",
      onClick: () => setActiveModule("timetable"),
    },
    {
      label: "Student Attendance",
      value: "91.3%",
      badge: "TODAY",
      subtext: "105 / 115 students present",
      tone: "green",
      icon: markAttendanceIcon,
      tooltip: "Overall attendance rate across your taught sections today",
      onClick: () => setActiveModule("attendance"),
    },
    {
      label: "Marks Evaluation",
      value: "1",
      badge: "DRAFT",
      subtext: "Unit Test II (Calculus)",
      tone: "orange",
      icon: createExamIcon,
      tooltip: "1 examination marks evaluation draft awaiting submission",
      onClick: () => setActiveModule("marks"),
    },
    {
      label: "Exam Duties",
      value: "3",
      badge: "ASSIGNED",
      subtext: "Next: BIEAP Theory (12 Oct)",
      tone: "violet",
      icon: totalSectionsIcon,
      tooltip: "3 upcoming invigilation and valuation exam duties",
      onClick: () => setActiveModule("examduties"),
    },
  ];

  return (
    <div className="faculty-dashboard-page">
      {/* Top Header Bar & Control Panel */}
      <div className="dashboard-header-bar">
        <div className="dashboard-greeting-wrap">
          <h1 className="dashboard-greeting-title">
            <span className="dashboard-greeting-emoji">{greeting.icon}</span> {greeting.message}, {profileData?.firstName || "Dr. Ananya"}!
          </h1>
          <p className="dashboard-greeting-sub">
            Here's what's happening with your classes and teaching schedule today.
          </p>
        </div>
        <div className="dashboard-header-controls">
          <span className={`dashboard-biometric-badge ${punchState.isPunchedIn ? "in" : "out"}`}>
            ● {punchState.isPunchedIn ? `Checked In (${punchState.inTime})` : "Checked Out"} • {punchState.hoursWorked}
          </span>
          <div className="dashboard-last-updated-badge">
            <Clock size={13} />
            <span>Last updated <strong>{lastUpdated}</strong></span>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary dashboard-refresh-btn"
            disabled={isRefreshing}
            onClick={handleRefresh}
            title="Click to refresh latest faculty dashboard metrics"
          >
            <RefreshCw size={13} className={isRefreshing ? "dashboard-spin" : ""} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Dashboard"}</span>
          </button>
        </div>
      </div>

      {/* Global Context Viewing Banner */}
      <div className="dashboard-viewing-banner">
        <Info size={15} className="dashboard-banner-icon" />
        <span>
          You are viewing data for <strong>Main Campus (HQ)</strong> •{" "}
          <strong>Board of Intermediate Education, Andhra Pradesh</strong> •{" "}
          <strong>Academic Year 2026-2027</strong> •{" "}
          <strong>Department of {profileData?.department || "Mathematics"} ({profileData?.employeeId || "EMP-1042"})</strong>.
        </span>
      </div>

      {/* 5 KPI Cards Row with 3D Icons */}
      <section className="dashboard-kpi-grid" aria-label="Faculty Metrics">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      {/* Quick Actions Bar directly below KPI cards (matching reference 3) */}
      <nav className="dashboard-quick-actions" aria-label="Quick Actions">
        <h2>Quick Actions</h2>
        <div className="dashboard-quick-actions-list">
          {QUICK_ACTIONS.map(({ label, moduleId, icon, tone }) => (
            <div
              key={label}
              className={`dashboard-quick-action tone-${tone}`}
              onClick={() => setActiveModule(moduleId)}
            >
              <span className="dashboard-quick-action-icon">
                <img src={icon} alt="" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Row 1 Grid (3 Cards): Section-wise Student Attendance | Students by Section | Today's Lecture Schedule */}
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Academic Analytics">
        {/* Card 1: Students Attendance Overview (Today) with Section-wise View */}
        <article className="dashboard-card dashboard-attendance-today-card">
          <CardHeader title="Student Attendance (Today)">
            <div className="dashboard-header-select-wrap">
              <span className="dashboard-select-label">View By:</span>
              <select
                className="dashboard-header-dropdown"
                value={studentAttView}
                onChange={(e) => setStudentAttView(e.target.value)}
                aria-label="Select Attendance Section View"
              >
                <option value="all">Overall</option>
                <option value="breakdown">Breakdown</option>
                <option value="MPC-1A">MPC 1A</option>
                <option value="MPC-2B">MPC 2B</option>
                <option value="MEC-1A">MEC 1A</option>
              </select>
            </div>
          </CardHeader>
          <div className="dashboard-card-body dashboard-attendance-body">
            {studentAttView === "breakdown" ? (
              <div className="dashboard-attendance-breakdown-list">
                {SECTION_BREAKDOWN_LIST.map((sec) => (
                  <div key={sec.name} className="att-breakdown-item">
                    <div className="att-breakdown-head">
                      <span className="att-breakdown-name">{sec.name}</span>
                      <span className="att-breakdown-pct">{sec.percentage}%</span>
                    </div>
                    <div className="att-progress-bar">
                      <div
                        className="att-progress-fill"
                        style={{ width: `${sec.percentage}%`, backgroundColor: sec.color }}
                      />
                    </div>
                    <div className="att-breakdown-meta">
                      <span>Present: <strong>{sec.present}</strong> / {sec.total}</span>
                      <span>Absent: <strong>{sec.absent}</strong></span>
                      <span>Half-day: <strong>{sec.halfDay}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Donut Chart & Side Status Legend */}
                <div className="dashboard-attendance-donut-row">
                  <div className="dashboard-donut-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentAttData.chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={3}
                          stroke="var(--cms-surface, #ffffff)"
                          strokeWidth={2}
                        >
                          {currentAttData.chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomDonutTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="dashboard-donut-center">
                      <strong>{currentAttData.percentage}%</strong>
                      <span>Attendance</span>
                    </div>
                  </div>

                  <div className="dashboard-attendance-legend-vertical">
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-present" /> Present ({currentAttData.present})
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-absent" /> Absent ({currentAttData.absent})
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-halfday" /> Half-day ({currentAttData.halfDay})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5 Summary KPI Chips */}
                <div className="dashboard-attendance-kpi-row">
                  <div className="att-kpi-chip">
                    <small>Total</small>
                    <strong>{currentAttData.total}</strong>
                  </div>
                  <div className="att-kpi-chip text-present">
                    <small>Present</small>
                    <strong>{currentAttData.present}</strong>
                  </div>
                  <div className="att-kpi-chip text-absent">
                    <small>Absent</small>
                    <strong>{currentAttData.absent}</strong>
                  </div>
                  <div className="att-kpi-chip text-halfday text-late">
                    <small>Half-day</small>
                    <strong>{currentAttData.halfDay}</strong>
                  </div>
                  <div className="att-kpi-chip">
                    <small>Rate</small>
                    <strong>{currentAttData.percentage}%</strong>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("attendance")}
              >
                View Attendance Details <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>

        {/* Card 2: Students by Assigned Section (Bar Chart) */}
        <article className="dashboard-card dashboard-group-card">
          <CardHeader
            title="Students by Assigned Section"
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("classes")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          <div className="dashboard-card-body">
            <div className="dashboard-chart dashboard-bar-chart-wrap" style={{ height: 138 }}>
              <ResponsiveContainer width="100%" height={138}>
                <BarChart data={SECTION_STUDENTS_DATA} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cms-border, #e2e8f0)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} height={18} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis domain={[0, 50]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                    {SECTION_STUDENTS_DATA.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-students-chips">
              <div className="dashboard-student-chip chip-total">
                <span className="chip-icon"><Users size={14} /></span>
                <div>
                  <strong>115</strong>
                  <small>Total Students</small>
                </div>
              </div>
              <div className="dashboard-student-chip chip-boys">
                <span className="chip-icon"><Users size={14} /></span>
                <div>
                  <strong>66</strong>
                  <small>Boys</small>
                </div>
              </div>
              <div className="dashboard-student-chip chip-girls">
                <span className="chip-icon"><Users size={14} /></span>
                <div>
                  <strong>49</strong>
                  <small>Girls</small>
                </div>
              </div>
            </div>
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("classes")}
              >
                View Section Details <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>

        {/* Card 3: Today's Lecture Schedule (3) */}
        <article className="dashboard-card dashboard-schedule-card">
          <CardHeader
            title="Today's Lecture Schedule (3)"
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("timetable")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          <div className="dashboard-card-body">
            <div className="dashboard-schedule-list">
              {TODAY_LECTURES.map((item) => (
                <div key={item.id} className={`schedule-item schedule-${item.statusTone}`}>
                  <div className="schedule-item-head">
                    <span className="schedule-time">{item.time}</span>
                    <span className={`schedule-status-pill pill-${item.statusTone}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="schedule-subject-row">
                    <strong>{item.subject}</strong>
                    <span className="schedule-section-tag">{item.section}</span>
                  </div>
                  <div className="schedule-item-meta">
                    <span>📍 {item.room}</span>
                    <span className="meta-sep">•</span>
                    <span>{item.enrolled} Enrolled</span>
                    <span className="meta-sep">•</span>
                    <span className="schedule-note">{item.note}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("timetable")}
              >
                View Full Timetable <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* Row 2 Grid (3 Cards): Faculty Biometric Attendance | Upcoming Holidays | Upcoming Examinations */}
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Operations and Schedule">
        {/* Card 4: My Attendance Overview (May 2025) */}
        <article className="dashboard-card dashboard-staff-attendance-card">
          <CardHeader title="My Attendance (May 2025)" />
          <div className="dashboard-card-body dashboard-attendance-body">
            {/* Donut Chart & Side Status Legend */}
            <div className="dashboard-attendance-donut-row">
              <div className="dashboard-donut-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={FACULTY_ATTENDANCE_DONUT}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="65%"
                      outerRadius="90%"
                      paddingAngle={3}
                      stroke="var(--cms-surface, #ffffff)"
                      strokeWidth={2}
                    >
                      {FACULTY_ATTENDANCE_DONUT.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dashboard-donut-center">
                  <strong>95.4%</strong>
                  <span>Punctual</span>
                </div>
              </div>

              <div className="dashboard-attendance-legend-vertical">
                <div className="legend-item">
                  <span className="legend-label">
                    <span className="dot dot-present" /> Present (21 Days)
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-label">
                    <span className="dot dot-late" /> Leave (1 Day)
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-label">
                    <span className="dot" style={{ background: "#94a3b8" }} /> Holidays (8 Days)
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Chips */}
            <div className="dashboard-staff-kpi-wrap">
              <div className="dashboard-staff-kpis">
                <div className="staff-chip">
                  <small>Working</small>
                  <strong>22 Days</strong>
                </div>
                <div className="staff-chip text-present">
                  <small>Present</small>
                  <strong>21 Days</strong>
                </div>
                <div className="staff-chip text-late">
                  <small>Leave</small>
                  <strong>1 Day</strong>
                </div>
                <div className="staff-chip">
                  <small>Holidays</small>
                  <strong>8 Days</strong>
                </div>
                <div className="staff-chip text-leave">
                  <small>Balance</small>
                  <strong>15 Days</strong>
                </div>
              </div>
              <div className="dashboard-staff-split-note">
                <span>Shift: <strong>09:00 AM – 04:30 PM</strong></span>
                <span className="split-divider">|</span>
                <span>Status: <strong style={{ color: "#22a447" }}>Checked In (08:45 AM)</strong></span>
              </div>
            </div>

            {/* Footer */}
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("myattendance")}
              >
                View Punch Logs <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>

        {/* Card 5: Upcoming Holidays (3) */}
        <article className="dashboard-card dashboard-holiday-card">
          <CardHeader
            title={`Upcoming Holidays (${UPCOMING_HOLIDAYS.length})`}
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("holidays")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          <div className="dashboard-card-body">
            <div className="dashboard-info-list">
              {UPCOMING_HOLIDAYS.map((item) => (
                <div key={`holiday-${item.id}`} className="dashboard-info-item dashboard-holiday-item">
                  <span className={`dashboard-list-icon tone-${item.tone}`}>
                    <CalendarDays size={14} />
                  </span>
                  <div className="dashboard-info-content">
                    <div className="dashboard-holiday-title-row">
                      <strong>{item.name}</strong>
                      <span className={`holiday-type-pill pill-${item.tone}`}>{item.type}</span>
                    </div>
                    <small className="dashboard-holiday-meta">
                      <span>{item.dateText}</span>
                      {item.dayOfWeek ? <span className="holiday-meta-dot">• {item.dayOfWeek}</span> : null}
                      <span className="holiday-duration-badge">{item.durationText}</span>
                    </small>
                  </div>
                  <span className={`dashboard-days-badge holiday-badge badge-${item.tone}`}>{item.badge}</span>
                </div>
              ))}
            </div>
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("holidays")}
              >
                View Holiday Calendar <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>

        {/* Card 6: Upcoming Examinations & Duties (4) */}
        <article className="dashboard-card dashboard-exams-card">
          <CardHeader
            title={`Upcoming Examinations (${UPCOMING_EXAMINATIONS.length})`}
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("examduties")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          <div className="dashboard-card-body">
            <div className="dashboard-info-list">
              {UPCOMING_EXAMINATIONS.map((item) => (
                <div key={`exam-${item.id}`} className="dashboard-info-item dashboard-exam-item">
                  <span className={`dashboard-list-icon tone-${item.tone}`}>
                    <CalendarDays size={14} />
                  </span>
                  <div className="dashboard-info-content">
                    <div className="dashboard-exam-title-row">
                      <strong>{item.name}</strong>
                      <span className={`exam-type-pill pill-${item.tone}`}>{item.examCode}</span>
                    </div>
                    <small className="dashboard-exam-meta">
                      <span className="exam-role-text">{item.role}</span>
                      <span className="meta-sep">•</span>
                      <span>{item.context}</span>
                    </small>
                  </div>
                  <span className={`dashboard-days-badge exam-badge badge-${item.tone}`}>{item.badge}</span>
                </div>
              ))}
            </div>
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("examduties")}
              >
                View Exam Duties <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
