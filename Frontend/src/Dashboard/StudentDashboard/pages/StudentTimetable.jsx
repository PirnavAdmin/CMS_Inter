import { useEffect, useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import { getStudentWeeklyTimetable } from "../services/studentAcademicService.js";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const columns = [
  { key: "period-1", label: "Period 1", period: 1 },
  { key: "period-2", label: "Period 2", period: 2 },
  { key: "period-3", label: "Period 3", period: 3 },
  { key: "lunch", label: "Lunch Break", breakType: "lunch" },
  { key: "period-4", label: "Period 4", period: 4 },
  { key: "period-5", label: "Period 5", period: 5 },
  { key: "short-break", label: "Short Break", breakType: "short" },
  { key: "period-6", label: "Period 6", period: 6 },
  { key: "period-7", label: "Period 7", period: 7 },
];

const periodNumber = (row) => {
  const match = String(row?.periodName || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const timeLabel = (value) => String(value || "").slice(0, 5);

export default function StudentTimetable() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!student?.studentId) return;
        const timetable = await getStudentWeeklyTimetable(student.studentId);
        if (!active) return;
        setEntries(timetable.filter((row) => row.isPublished !== false));
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!profileLoading && student?.studentId) load();
    return () => { active = false; };
  }, [profileLoading, student?.studentId]);

  const timetable = useMemo(() => {
    const rows = new Map(days.map((day) => [day, []]));
    [...entries]
      .sort((left, right) => Number(left.dayOfWeek || 0) - Number(right.dayOfWeek || 0)
        || String(left.startTime || "").localeCompare(String(right.startTime || "")))
      .forEach((entry) => {
        if (rows.has(entry.dayName)) rows.get(entry.dayName).push(entry);
      });
    return rows;
  }, [entries]);

  const findEntry = (dayEntries, column) => {
    if (column.breakType) {
      return dayEntries.find((row) => row.isBreak && String(row.periodName || "").toLowerCase().includes(column.breakType));
    }
    return dayEntries.find((row) => !row.isBreak && periodNumber(row) === column.period);
  };

  const headerEntry = (column) => entries.find((row) => findEntry([row], column));
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const subtitle = student
    ? `${student.academicLevelName || "Not Assigned"} • ${student.groupName || "Not Assigned"} • Section ${student.sectionName || "Not Assigned"}`
    : "Your published weekly class schedule";

  if (profileLoading || loading) return <div className="sp-page sp-timetable-page"><SkeletonPage variant="table" columns={7} rows={6}/></div>;

  return <div className="sp-page sp-timetable-page">
    <StudentPageHeader title="My Timetable" subtitle={subtitle}/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!profileLoading && !loading && !profileError && !error && !entries.length ? <StudentCard><StudentEmptyState icon={CalendarX} title="No timetable available" text="A published timetable is not available for your academic section."/></StudentCard> : null}
    {!profileLoading && !loading && !profileError && !error && entries.length ? <section className="sp-timetable-card">
      <header className="sp-timetable-toolbar"><div><strong>Academic Year {student?.academicYearName || "—"}</strong><span>Weekly class schedule</span></div></header>
      <div className="sp-weekly-timetable-wrap">
        <table className="sp-weekly-timetable">
          <thead><tr><th scope="col">Day</th>{columns.map((column) => {
            const entry = headerEntry(column);
            return <th key={column.key} scope="col" className={column.breakType ? "is-break-column" : ""}>{column.label}{entry?.startTime ? <small>{timeLabel(entry.startTime)} - {timeLabel(entry.endTime)}</small> : null}</th>;
          })}</tr></thead>
          <tbody>{days.map((day) => {
            const isToday = day === today;
            const dayEntries = timetable.get(day) || [];
            return <tr key={day} className={isToday ? "is-today" : ""}>
              <th scope="row">{day}{isToday ? <small>Today</small> : null}</th>
              {columns.map((column) => {
                const entry = findEntry(dayEntries, column);
                if (column.breakType) return <td key={column.key} className={`sp-timetable-break is-${column.breakType}`}>{entry?.periodName || column.label}</td>;
                const isLab = /lab/i.test(`${entry?.subjectName || ""} ${entry?.roomName || ""}`);
                return <td key={column.key} className="sp-timetable-period"><div className={isLab ? "is-lab" : "is-regular"}><strong>{entry?.subjectName || "—"}</strong><span>{entry?.staffName || entry?.facultyName || "—"}</span><small>{entry?.roomName || entry?.roomCode || "—"}</small></div></td>;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section> : null}
  </div>;
}
