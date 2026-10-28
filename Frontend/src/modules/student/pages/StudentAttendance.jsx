import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CalendarDays, CalendarX, Clock3, Cloud, FileText, Sun, UserCheck, UserX } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/shared/components/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import { getStudentAttendance } from "../services/studentAcademicService.js";

const STATUS = { 1: "Present", 2: "Absent", 4: "Half Day", 5: "Holiday" };
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const todayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Calcutta", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const get = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const recordsFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  for (const key of ["records", "items", "attendanceRecords", "data"]) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};
const statusName = (value) => STATUS[value] || String(value || "—").replace("Half-Day", "Half Day");
const dateKey = (record) => String(get(record, "attendanceDate", "date") || "").slice(0, 10);
const sessionName = (record) => String(get(record, "sessionName", "session", "attendanceSession", "sessionType", "periodName") || "").toLowerCase();
const sessionStatus = (record, session) => get(record,
  `${session}Status`, `${session}AttendanceStatus`, `${session}SessionStatus`, session, `${session}Attendance`,
  `${session[0].toUpperCase() + session.slice(1)}Status`,
);
const recordSession = (record) => {
  const name = sessionName(record).trim();
  const id = String(get(record, "sessionId", "SessionId") ?? "");
  if (name.includes("morning") || name === "am" || name === "1" || id === "1") return "morning";
  if (name.includes("afternoon") || name === "pm" || name === "2" || id === "2") return "afternoon";
  return null;
};
const formatDate = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};
const tone = (status) => status === "Present" ? "is-present" : status === "Absent" ? "is-absent" : status === "Half Day" ? "is-half-day" : "";
const calendarStatus = (row) => {
  const sessions = [row?.morning, row?.afternoon].filter((status) => status && status !== "—");
  if (!sessions.length) return "-";
  if (sessions.every((status) => status === "Holiday")) return "Holiday";
  if (sessions.every((status) => status === "Present")) return "Present";
  if (sessions.every((status) => status === "Absent")) return "Absent";
  return "Half Day";
};

function AttendancePill({ value, compact = false }) {
  const label = compact ? ({ Present: "P", Absent: "A" }[value] || value) : value;
  return <span className={`sp-attendance-pill ${tone(value)}`} title={value} aria-label={value}>{label}</span>;
}

export default function StudentAttendance() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshVersion((version) => version + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!student?.studentId) return;
        const year = String(student.academicYearName || "").match(/^(\d{4})/);
        const admissionDate = String(student.admissionDate || "").slice(0, 10);
        const fromDate = view === "monthly"
          ? `${selectedMonth}-01`
          : admissionDate || `${year?.[1] || new Date().getFullYear()}-01-01`;
        const selectedYear = Number(selectedMonth.slice(0, 4));
        const selectedMonthNumber = Number(selectedMonth.slice(5, 7));
        const lastDay = String(new Date(selectedYear, selectedMonthNumber, 0).getDate()).padStart(2, "0");
        const monthEnd = `${selectedMonth}-${lastDay}`;
        const toDate = view === "monthly" ? monthEnd : new Date().toISOString().slice(0, 10);
        const response = await getStudentAttendance(student.studentId, fromDate, toDate);
        if (active) { setPayload(response); }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!profileLoading && student?.studentId) load();
    return () => { active = false; };
  }, [profileLoading, selectedMonth, student, view, refreshVersion]);

  const records = useMemo(() => recordsFrom(payload), [payload]);
  const dailyRows = useMemo(() => {
    const grouped = new Map();
    records.forEach((record) => {
      const date = dateKey(record);
      if (!date) return;
      if (!grouped.has(date)) grouped.set(date, { date, morning: null, afternoon: null, unknown: [], remarks: [] });
      const row = grouped.get(date);
      const session = recordSession(record);
      const status = statusName(get(record, "status", "attendanceStatus"));
      // Named session fields take precedence; response order does not identify a session.
      for (const key of ["morning", "afternoon"]) {
        const explicit = sessionStatus(record, key);
        if (explicit !== undefined) row[key] = statusName(explicit);
        else if (session === key) row[key] = status;
      }
      const remarks = get(record, "remarks", "remark");
      if (remarks && !row.remarks.includes(remarks)) row.remarks.push(remarks);
    });
    return [...grouped.values()].map((row) => ({
      ...row,
      morning: row.morning || "—",
      afternoon: row.afternoon || "—",
    })).sort((left, right) => right.date.localeCompare(left.date));
  }, [records]);

  const totals = useMemo(() => {
    let present = 0; let absent = 0; let halfDay = 0; let sessions = 0;
    dailyRows.forEach((row) => [row.morning, row.afternoon].forEach((status) => {
      if (status === "—" || status === "Holiday") return;
      sessions += 1;
      if (status === "Present") present += 1;
      else if (status === "Absent") absent += 1;
      else if (status === "Half Day") halfDay += 1;
    }));
    return { present, absent, days: dailyRows.length, percentage: sessions ? Math.round(((present + halfDay * 0.5) / sessions) * 100) : 0 };
  }, [dailyRows]);

  const calendarDays = useMemo(() => {
    const year = Number(selectedMonth.slice(0, 4));
    const month = Number(selectedMonth.slice(5, 7));
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendanceByDate = new Map(dailyRows.map((row) => [row.date, calendarStatus(row)]));
    const cells = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const isSunday = new Date(year, month - 1, day).getDay() === 0;
      cells.push({ day, status: isSunday ? "-" : attendanceByDate.get(date) || "-" });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [dailyRows, selectedMonth]);

  const halfDayTotal = useMemo(() => dailyRows.reduce((count, row) => count + [row.morning, row.afternoon].filter((status) => status === "Half Day").length, 0), [dailyRows]);
  const selectedDay = dailyRows.find((row) => row.date === selectedDate);
  const recentRows = dailyRows.slice(0, 5);
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const selectedStatuses = selectedDay
    ? [...new Set([selectedDay.morning, selectedDay.afternoon].filter((status) => status && status !== "—"))]
    : [];
  const sessionRemarks = (session) => {
    const dayRecords = records.filter((record) => dateKey(record) === selectedDate);
    const matchesSession = (record, nameToMatch) => recordSession(record) === nameToMatch || sessionStatus(record, nameToMatch) !== undefined;
    const explicitRecords = dayRecords.filter((record) => matchesSession(record, session));
    const remarks = explicitRecords.map((record) => get(record, `${session}Remarks`, `${session}Remark`, "remarks", "remark")).filter(Boolean);
    return [...new Set(remarks)].join(" • ") || "—";
  };

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={4} rows={6}/></div>;

  return <div className="sp-page sp-my-attendance-page">
    <StudentPageHeader title="Student Attendance" subtitle="View your daily and monthly attendance."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!profileLoading && !loading && !profileError && !error ? <>
      <div className="sp-summary-grid four"><StudentSummaryCard icon={BookOpenCheck} label="Overall Attendance" value={`${totals.percentage}%`}/><StudentSummaryCard icon={UserCheck} label="Present Sessions" value={totals.present} tone="blue"/><StudentSummaryCard icon={UserX} label="Absent Sessions" value={totals.absent} tone="red"/><StudentSummaryCard icon={CalendarDays} label="Attendance Days" value={totals.days} tone="orange"/></div>
      <div className="sp-attendance-tabs"><button className={view === "daily" ? "is-active" : ""} onClick={() => { setView("daily"); }}>Daily Attendance</button><button className={view === "monthly" ? "is-active" : ""} onClick={() => { setView("monthly"); }}>Attendance Calendar</button></div>
      <StudentCard
        title={view === "daily" ? "Daily Attendance" : "Attendance Calendar"}
        className={view === "daily" ? "sp-selected-attendance" : ""}
        subtitle={view === "daily" ? "View your attendance for the selected date." : "Daily attendance for the selected month."}
        action={view === "monthly" ? <label className="sp-attendance-month-filter"><span>Month</span><input type="month" value={selectedMonth} max={CURRENT_MONTH} onChange={(event) => { setSelectedMonth(event.target.value || CURRENT_MONTH); }}/></label> : <div className="sp-attendance-date-controls"><label><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value || todayKey())}/></label><button type="button" className="sp-btn" onClick={() => setSelectedDate(todayKey())}>Today</button></div>}
      >
        {view === "daily" ? <>
          <div className="sp-selected-attendance-heading">
            <h3><CalendarDays size={22}/>{selectedDateLabel}</h3>
            {selectedDay && selectedStatuses.length ? <div className="sp-attendance-overall"><span>Overall Status:</span><AttendancePill value={selectedStatuses.join(" / ")}/></div> : null}
          </div>
          {selectedDay ? <div className="sp-attendance-sessions">
            {[{ key: "morning", title: "Morning Session", Icon: Sun }, { key: "afternoon", title: "Afternoon Session", Icon: Cloud }].map(({ key, title, Icon }) => <article className="sp-attendance-session" key={key}>
              <div className="sp-attendance-session-heading"><span className={"sp-attendance-session-icon is-" + key}><Icon size={30}/></span><div><h3>{title}</h3><AttendancePill value={selectedDay[key]}/></div></div>
              <p><FileText size={16}/><span>Remarks</span><span>{sessionRemarks(key)}</span></p>
            </article>)}
          </div> : <StudentEmptyState icon={CalendarX} title="No attendance record available for this date."/>}
        </> : <div className="sp-attendance-calendar-wrap"><div className="sp-attendance-calendar"><div className="sp-attendance-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="sp-attendance-calendar-grid">{calendarDays.map((cell, index) => cell ? <div className={`sp-attendance-calendar-day ${tone(cell.status)} ${cell.status === "Holiday" ? "is-holiday" : ""}`} key={`${selectedMonth}-${cell.day}`}><strong>{cell.day}</strong><span>{cell.status}</span></div> : <div className="sp-attendance-calendar-day is-empty" key={`empty-${index}`} aria-hidden="true"/>)}</div></div><div className="sp-attendance-month-summary"><div><span>Working / Attendance Days</span><strong>{totals.days}</strong></div><div><span>Present</span><strong>{totals.present}</strong></div><div><span>Absent</span><strong>{totals.absent}</strong></div><div><span>Half Day</span><strong>{halfDayTotal}</strong></div><div><span>Attendance %</span><strong>{totals.percentage}%</strong></div></div></div>}
      </StudentCard>
      {view === "daily" ? <StudentCard className="sp-recent-attendance" title={<><Clock3 size={20}/>Recent Attendance</>} subtitle="Your last 5 attendance records.">
        {recentRows.length ? <div className="sp-table-wrap"><table className="sp-table"><thead><tr><th>Date</th><th>Morning</th><th>Afternoon</th><th>Remarks</th></tr></thead><tbody>{recentRows.map((row) => <tr key={row.date}><td>{formatDate(row.date)}</td><td><AttendancePill value={row.morning} compact/></td><td><AttendancePill value={row.afternoon} compact/></td><td>{row.remarks.join(" • ") || "—"}</td></tr>)}</tbody></table></div> : <StudentEmptyState icon={CalendarX} title="No attendance available" text="No attendance records were returned for your academic period."/>}
      </StudentCard> : null}
    </> : null}
  </div>;
}
