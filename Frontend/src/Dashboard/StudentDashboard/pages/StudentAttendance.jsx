import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CalendarDays, CalendarX, UserCheck, UserX } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import { getStudentAttendance } from "../services/studentAcademicService.js";

const STATUS = { 1: "Present", 2: "Absent", 4: "Half Day", 5: "Holiday" };
const PAGE_SIZE = 5;
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const get = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const recordsFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  for (const key of ["records", "items", "attendanceRecords", "data"]) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};
const statusName = (value) => STATUS[value] || String(value || "—").replace("Half-Day", "Half Day");
const dateKey = (record) => String(get(record, "attendanceDate", "date") || "").slice(0, 10);
const sessionName = (record) => String(get(record, "sessionName", "session", "attendanceSession", "sessionType", "periodName") || "").toLowerCase();
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

function AttendancePill({ value }) {
  return <span className={`sp-attendance-pill ${tone(value)}`}>{value}</span>;
}

function Pagination({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, total);
  return <footer className="sp-pagination"><span>Showing {start}-{end} of {total} records</span><div><button className="sp-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button><strong>Page {page} of {pages}</strong><button className="sp-btn" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button></div></footer>;
}

export default function StudentAttendance() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("daily");
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);

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
        if (active) { setPayload(response); setPage(1); }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!profileLoading && student?.studentId) load();
    return () => { active = false; };
  }, [profileLoading, selectedMonth, student, view]);

  const records = useMemo(() => recordsFrom(payload), [payload]);
  const dailyRows = useMemo(() => {
    const grouped = new Map();
    records.forEach((record) => {
      const date = dateKey(record);
      if (!date) return;
      if (!grouped.has(date)) grouped.set(date, { date, morning: null, afternoon: null, unknown: [], remarks: [] });
      const row = grouped.get(date);
      const session = sessionName(record);
      const status = statusName(get(record, "status", "attendanceStatus"));
      if (session.includes("morning") || session === "1" || get(record, "sessionId") === 1) row.morning = status;
      else if (session.includes("afternoon") || session === "2" || get(record, "sessionId") === 2) row.afternoon = status;
      else row.unknown.push(status);
      const remarks = get(record, "remarks", "remark");
      if (remarks && !row.remarks.includes(remarks)) row.remarks.push(remarks);
    });
    return [...grouped.values()].map((row) => ({
      ...row,
      morning: row.morning || row.unknown[0] || "—",
      afternoon: row.afternoon || row.unknown[1] || "—",
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
  const totalPages = Math.max(1, Math.ceil(dailyRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = dailyRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={4} rows={6}/></div>;

  return <div className="sp-page">
    <StudentPageHeader title="My Attendance" subtitle="View your daily and monthly attendance."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!profileLoading && !loading && !profileError && !error ? <>
      <div className="sp-summary-grid four"><StudentSummaryCard icon={BookOpenCheck} label="Overall Attendance" value={`${totals.percentage}%`}/><StudentSummaryCard icon={UserCheck} label="Present Sessions" value={totals.present} tone="blue"/><StudentSummaryCard icon={UserX} label="Absent Sessions" value={totals.absent} tone="red"/><StudentSummaryCard icon={CalendarDays} label="Attendance Days" value={totals.days} tone="orange"/></div>
      <div className="sp-attendance-tabs"><button className={view === "daily" ? "is-active" : ""} onClick={() => { setView("daily"); setPage(1); }}>Daily Attendance</button><button className={view === "monthly" ? "is-active" : ""} onClick={() => { setView("monthly"); setPage(1); }}>Attendance Calendar</button></div>
      <StudentCard
        title={view === "daily" ? "Daily Attendance" : "Attendance Calendar"}
        subtitle={view === "daily" ? "Morning and afternoon sessions are combined into one row per date." : "Daily attendance for the selected month."}
        action={view === "monthly" ? <label className="sp-attendance-month-filter"><span>Month</span><input type="month" value={selectedMonth} max={CURRENT_MONTH} onChange={(event) => { setSelectedMonth(event.target.value || CURRENT_MONTH); setPage(1); }}/></label> : null}
      >
        {view === "daily" ? (!dailyRows.length ? <StudentEmptyState icon={CalendarX} title="No attendance available" text="No attendance records were returned for your academic period."/> : <><div className="sp-table-wrap"><table className="sp-table"><thead><tr><th>Date</th><th>Morning</th><th>Afternoon</th><th>Remarks</th></tr></thead><tbody>{paged.map((row) => <tr key={row.date}><td>{formatDate(row.date)}</td><td><AttendancePill value={row.morning}/></td><td><AttendancePill value={row.afternoon}/></td><td>{row.remarks.join(" • ") || "—"}</td></tr>)}</tbody></table></div><Pagination page={currentPage} total={dailyRows.length} onChange={setPage}/></>) : <div className="sp-attendance-calendar-wrap"><div className="sp-attendance-calendar"><div className="sp-attendance-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="sp-attendance-calendar-grid">{calendarDays.map((cell, index) => cell ? <div className={`sp-attendance-calendar-day ${tone(cell.status)} ${cell.status === "Holiday" ? "is-holiday" : ""}`} key={`${selectedMonth}-${cell.day}`}><strong>{cell.day}</strong><span>{cell.status}</span></div> : <div className="sp-attendance-calendar-day is-empty" key={`empty-${index}`} aria-hidden="true"/>)}</div></div><div className="sp-attendance-month-summary"><div><span>Working / Attendance Days</span><strong>{totals.days}</strong></div><div><span>Present</span><strong>{totals.present}</strong></div><div><span>Absent</span><strong>{totals.absent}</strong></div><div><span>Half Day</span><strong>{halfDayTotal}</strong></div><div><span>Attendance %</span><strong>{totals.percentage}%</strong></div></div></div>}
      </StudentCard>
    </> : null}
  </div>;
}
