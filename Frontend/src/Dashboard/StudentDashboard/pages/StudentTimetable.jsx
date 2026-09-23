import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { student, todaySchedule, weeklyTimetable } from "../data/studentMockData.js";

const timetableColumns = [
  { key: "period-1", label: "Period 1", periodIndex: 0 },
  { key: "period-2", label: "Period 2", periodIndex: 1 },
  { key: "period-3", label: "Period 3", periodIndex: 2 },
  { key: "lunch", label: "Lunch Break", breakType: "lunch" },
  { key: "period-4", label: "Period 4", periodIndex: 3 },
  { key: "period-5", label: "Period 5", periodIndex: 4 },
  { key: "short-break", label: "Short Break", breakType: "short" },
  { key: "period-6", label: "Period 6", periodIndex: 5 },
  { key: "period-7", label: "Period 7", periodIndex: 6 },
];

const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
const currentPeriodIndex = todaySchedule.findIndex((period) => period[5] === "Current");

export default function StudentTimetable() {
  return (
    <div className="sp-page sp-timetable-page">
      <StudentPageHeader
        title="My Timetable"
        subtitle={`${student.academicLevel} • ${student.group} • Section ${student.section}`}
      />

      <section className="sp-timetable-card">
        <header className="sp-timetable-toolbar">
          <div>
            <strong>Academic Year {student.academicYear}</strong>
            <span>Weekly class schedule</span>
          </div>
          <div className="sp-timetable-legend" aria-label="Timetable legend">
            <span className="is-current">Current Period</span>
            <span className="is-regular">Regular Class</span>
            <span className="is-lab">Lab</span>
            <span className="is-break">Break</span>
          </div>
        </header>

        <div className="sp-weekly-timetable-wrap">
          <table className="sp-weekly-timetable">
            <thead>
              <tr>
                <th scope="col">Day</th>
                {timetableColumns.map((column) => (
                  <th key={column.key} scope="col" className={column.breakType ? "is-break-column" : ""}>
                    {column.label}
                    {column.periodIndex !== undefined ? <small>{todaySchedule[column.periodIndex]?.[1]}</small> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyTimetable.map((day) => {
                const isToday = day.day === todayName;
                return (
                  <tr key={day.day} className={isToday ? "is-today" : ""}>
                    <th scope="row">
                      {day.day}
                      {isToday ? <small>Today</small> : null}
                    </th>
                    {timetableColumns.map((column) => {
                      if (column.breakType) {
                        return <td key={column.key} className={`sp-timetable-break is-${column.breakType}`}>{column.label}</td>;
                      }

                      const period = day.periods[column.periodIndex];
                      const isLab = /lab/i.test(`${period?.subject || ""} ${period?.room || ""}`);
                      const isCurrent = isToday && column.periodIndex === currentPeriodIndex;
                      return (
                        <td key={column.key} className="sp-timetable-period">
                          <div className={`${isLab ? "is-lab" : "is-regular"}${isCurrent ? " is-current" : ""}`}>
                            <strong>{period?.subject || "—"}</strong>
                            <span>{period?.faculty || "—"}</span>
                            <small>{period?.room || "—"}</small>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
