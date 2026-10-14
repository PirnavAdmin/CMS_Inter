import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarClock } from "lucide-react";
import apiClient from "@/api/axios.js";
import studentApiEndpoints from "../api/studentApiEndpoints.js";
import { getStudentAttendance } from "../services/studentAcademicService.js";
import StudentCard from "./StudentCard.jsx";
import "./StudentDashboardHighlights.css";

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const status = (value) => ({ 1: "Present", 2: "Absent", 4: "Half Day", 5: "Holiday", P: "Present", A: "Absent" }[value] || value);
const rowsFrom = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : data?.items || data?.Items || data?.records || data?.holidays || data?.Holidays || [];
};

export default function StudentDashboardHighlights({ student, upcomingSchedules, examsError, formatExamDate, formatExamTime }) {
  const [attendance, setAttendance] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [holidayError, setHolidayError] = useState("");
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const today = dateKey(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  useEffect(() => {
    let active = true;
    if (!student?.studentId) return;
    setLoading(true); setAttendance(null); setAttendanceError(""); setHolidayError(""); setHolidays([]);
    Promise.allSettled([
      getStudentAttendance(student.studentId, monthStart, today),
      apiClient.get(studentApiEndpoints.holidays.list, { params: { CampusId: student.campusId, AcademicYearId: student.academicYearId, BoardId: student.boardId, Page: 1, PageSize: 100 } }),
    ]).then(([attendanceResponse, holidaysResponse]) => {
      if (!active) return;
      if (attendanceResponse.status === "fulfilled") {
        const counts = { present: 0, absent: 0, halfDay: 0 };
        const days = new Map(rowsFrom(attendanceResponse.value).map((row) => [String(read(row, "attendanceDate", "date") || "").slice(0, 10), row]));
        days.forEach((row, date) => {
          if (!date || date < monthStart || date > today) return;
          const morning = status(read(row, "morningStatus", "morningAttendanceStatus", "morningSessionStatus", "morning", "morningAttendance", "MorningStatus"));
          const afternoon = status(read(row, "afternoonStatus", "afternoonAttendanceStatus", "afternoonSessionStatus", "afternoon", "afternoonAttendance", "AfternoonStatus"));
          if (morning === "Present" && afternoon === "Present") counts.present += 1;
          else if (morning === "Absent" && afternoon === "Absent") counts.absent += 1;
          else if ((morning === "Present" && afternoon === "Absent") || (morning === "Absent" && afternoon === "Present") || morning === "Half Day" || afternoon === "Half Day") counts.halfDay += 1;
        });
        counts.days = counts.present + counts.absent + counts.halfDay;
        counts.percentage = counts.days ? Math.round((counts.present + counts.halfDay * .5) / counts.days * 100) : null;
        setAttendance(counts);
      } else setAttendanceError("Unable to load monthly attendance.");
      if (holidaysResponse.status === "fulfilled") setHolidays(rowsFrom(holidaysResponse.value));
      else setHolidayError("Unable to load upcoming holidays.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [student, monthStart, today]);
  const upcomingHolidays = holidays.map((row) => ({
    name: read(row, "holidayName", "HolidayName", "name", "Name", "title", "Title") || "Holiday",
    date: String(read(row, "startDate", "StartDate", "holidayDate", "HolidayDate", "date", "Date", "fromDate", "FromDate") || "").slice(0, 10),
    type: read(row, "holidayType", "HolidayType", "type", "Type"),
  })).filter((row) => row.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const daysUntil = (date) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  const segments = [["Present", attendance?.present || 0, "#1aa54b"], ["Absent", attendance?.absent || 0, "#ef4560"], ["Half Day", attendance?.halfDay || 0, "#f59e0b"]];
  let offset = 0;
  return <div className="sp-dashboard-highlights">
    <StudentCard title="Monthly Attendance" subtitle={now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} action={<Link className="sp-text-link" to="attendance">View Details →</Link>}>
      {loading || attendanceError ? <p className="sp-highlight-empty" role="status">{loading ? "Loading attendance…" : attendanceError}</p> : <>
        <div className="sp-monthly-chart"><svg viewBox="0 0 120 120" role="img" aria-label={attendance?.days ? `Monthly attendance ${attendance.percentage} percent; ${attendance.present} present, ${attendance.absent} absent, ${attendance.halfDay} half days` : "No marked attendance this month"}>
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--sp-border)" strokeWidth="12" />
          {segments.map(([label, count, color]) => { const length = attendance?.days ? count / attendance.days * 100 : 0; const start = offset; offset += length; return <circle key={label} cx="60" cy="60" r="44" fill="none" stroke={color} strokeWidth="12" pathLength="100" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />; })}
          <text x="60" y="59" textAnchor="middle" className="sp-chart-value">{attendance?.percentage != null ? `${attendance.percentage}%` : "—"}</text><text x="60" y="74" textAnchor="middle" className="sp-chart-label">ATTENDANCE</text>
        </svg><div className="sp-chart-legend">{segments.map(([label, count, color]) => <div key={label}><i style={{ background: color }} /><span>{label}</span><strong>{count}</strong></div>)}</div></div>
        <div className="sp-monthly-chart-counts">{[["Marked Days", attendance?.days || 0], ...segments.map(([label, count]) => [label, count])].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
        {!attendance?.days && <p className="sp-highlight-empty">No complete attendance records for this month.</p>}
      </>}
    </StudentCard>
    <StudentCard title="Upcoming Holidays" action={<Link className="sp-text-link" to="holidays">View All →</Link>}>
      <div className="sp-highlight-list">{loading || holidayError ? <p className="sp-highlight-empty">{loading ? "Loading holidays…" : holidayError}</p> : upcomingHolidays.length ? upcomingHolidays.map((row, index) => <article key={`${row.date}-${row.name}-${index}`}><CalendarDays className="sp-highlight-holiday-icon" size={20} /><div><strong>{row.name}</strong>{row.type && <span className="sp-highlight-tag">{row.type}</span>}<p>{formatExamDate(row.date)}</p></div><small>{daysUntil(row.date) ? `In ${daysUntil(row.date)} days` : "Today"}</small></article>) : <p className="sp-highlight-empty">No upcoming holidays.</p>}</div>
    </StudentCard>
    <StudentCard title="Upcoming Examinations" action={<Link className="sp-text-link" to="examinations">View All →</Link>}>
      <div className="sp-highlight-list">{examsError ? <p className="sp-highlight-empty">{examsError}</p> : upcomingSchedules.length ? upcomingSchedules.map(({ exam, schedule }, index) => <article key={`${exam.examinationId || exam.id}-${schedule.examDate}-${index}`}><CalendarClock size={20} /><div><strong>{schedule.subjectName || exam.examName}</strong><p>{exam.examName || exam.examinationName}</p><p>{formatExamDate(schedule.examDate)} · {formatExamTime(schedule.startTime)} – {formatExamTime(schedule.endTime)}</p></div><small>{daysUntil(String(schedule.examDate).slice(0, 10)) ? `In ${daysUntil(String(schedule.examDate).slice(0, 10))} days` : "Today"}</small></article>) : <p className="sp-highlight-empty">No upcoming examinations.</p>}</div>
    </StudentCard>
  </div>;
}
