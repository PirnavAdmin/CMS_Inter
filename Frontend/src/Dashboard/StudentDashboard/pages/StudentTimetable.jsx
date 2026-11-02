import { useEffect, useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import { getStudentWeeklyTimetable } from "../services/studentAcademicService.js";

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const columnKey = (row) => row.isBreak
  ? `break:${row.periodId || row.periodName}:${row.startTime || ""}`
  : `period:${row.periodId || row.periodNumber || row.periodName}`;

const timeLabel = (value) => String(value || "").slice(0, 5);

export default function StudentTimetable() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setEntries([]);
      try {
        if (!student?.studentId) return;
        const timetable = await getStudentWeeklyTimetable(student, { signal: controller.signal });
        if (!active) return;
        setEntries(timetable);
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!profileLoading) load();
    return () => { active = false; controller.abort(); };
  }, [profileLoading, student]);

  const columns = useMemo(() => {
    const unique = new Map();
    entries.forEach((entry) => {
      const key = columnKey(entry);
      if (!unique.has(key)) unique.set(key, { key, label: entry.periodName,
        period: entry.periodNumber, startTime: entry.startTime, endTime: entry.endTime,
        breakType: entry.isBreak ? (/lunch/i.test(entry.periodName) ? "lunch" : "short") : "" });
    });
    return [...unique.values()].sort((left, right) => {
      if (left.startTime && right.startTime) return String(left.startTime).localeCompare(String(right.startTime));
      return (left.period || 0) - (right.period || 0);
    });
  }, [entries]);
  const days = useMemo(() => weekDays.filter((day) => day !== "Sunday" || entries.some((row) => row.dayName === day)), [entries]);
  const timetable = useMemo(() => {
    const rows = new Map(days.map((day) => [day, []]));
    entries.forEach((entry) => {
      if (rows.has(entry.dayName)) rows.get(entry.dayName).push(entry);
    });
    return rows;
  }, [entries, days]);
  const findEntry = (dayEntries, column) => dayEntries.find((row) => columnKey(row) === column.key);

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
            return <th key={column.key} scope="col" className={column.breakType ? "is-break-column" : ""}>{column.label}{column.startTime ? <small>{timeLabel(column.startTime)} - {timeLabel(column.endTime)}</small> : null}</th>;
          })}</tr></thead>
          <tbody>{days.map((day) => {
            const isToday = day === today;
            const dayEntries = timetable.get(day) || [];
            return <tr key={day} className={isToday ? "is-today" : ""}>
              <th scope="row">{day}</th>
              {columns.map((column) => {
                const entry = findEntry(dayEntries, column);
                if (column.breakType) return <td key={column.key} className={`sp-timetable-break is-${column.breakType}`}>{entry?.periodName || column.label}</td>;
                const isLab = /lab/i.test(`${entry?.slotType?.toLowerCase() === "leisure" ? "Leisure" : entry?.subjectName || ""} ${entry?.roomName || ""}`);
                return <td key={column.key} className="sp-timetable-period"><div className={isLab ? "is-lab" : "is-regular"}><strong>{entry?.subjectName || "—"}</strong><span>{entry?.staffName || entry?.facultyName || "—"}</span><small>{entry?.roomName || entry?.roomCode || "—"}</small></div></td>;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section> : null}
  </div>;
}
