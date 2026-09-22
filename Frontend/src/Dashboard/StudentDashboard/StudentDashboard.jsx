import { Award, BookOpenCheck, CalendarClock, IndianRupee } from "lucide-react";
import { Link } from "react-router-dom";
import StudentCard from "./components/StudentCard.jsx";
import StudentDataTable from "./components/StudentDataTable.jsx";
import StudentPageHeader from "./components/StudentPageHeader.jsx";
import StudentSummaryCard from "./components/StudentSummaryCard.jsx";
import { attendance, exams, fees, results, student } from "./data/studentMockData.js";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function StudentDashboard() {
  return (
    <div className="sp-page">
      <StudentPageHeader
        title={`Good Morning, ${student.name}`}
        subtitle="Welcome back! Here's what's happening with your academics today."
      />
      <section className="sp-student-strip">
        <span className="sp-avatar is-large">{student.initials}</span>
        <div className="sp-student-name"><strong>{student.name} {student.lastName}</strong><small>{student.studentId}</small></div>
        {[
          ["Roll No", student.rollNo],
          ["Admission No", student.admissionNo],
          ["Academic Level", student.academicLevel],
          ["Group / Section", `${student.group} • ${student.section}`],
        ].map(([label, value]) => <div className="sp-student-detail" key={label}><small>{label}</small><strong>{value}</strong></div>)}
      </section>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={BookOpenCheck} label="Overall Attendance" value={`${attendance.percentage}%`} note="Good standing" />
        <StudentSummaryCard icon={IndianRupee} label="Fee Due" value={money(fees.due)} note={`Due ${fees.nextDueDate}`} tone="orange" />
        <StudentSummaryCard icon={CalendarClock} label="Upcoming Exams" value="3" note="Next on 28 Sep" tone="purple" />
        <StudentSummaryCard icon={Award} label="Latest Result" value="87%" note="Grade A" tone="red" />
      </section>
      <div className="sp-dashboard-grid">
        <StudentCard title="Attendance Overview">
          <div className="sp-metric-list">
            {[["Overall", `${attendance.percentage}%`], ["Present", attendance.present], ["Absent", attendance.absent], ["Working Days", attendance.workingDays]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
          <Link className="sp-text-link" to="attendance">View attendance details →</Link>
        </StudentCard>
        <StudentCard title="Upcoming Exams">
          <StudentDataTable columns={["Subject", "Date", "Time"]} rows={exams.map((row) => [row[1], row[2], row[3]])} />
        </StudentCard>
        <StudentCard title="Recent Results">
          <StudentDataTable columns={["Exam", "%", "Grade", "Status"]} rows={results} statusColumns={[3]} />
        </StudentCard>
        <StudentCard title="Fee Summary">
          <div className="sp-fee-overview">
            <div><span>Total</span><strong>{money(fees.total)}</strong></div>
            <div><span>Paid</span><strong>{money(fees.paid)}</strong></div>
            <div><span>Due</span><strong>{money(fees.due)}</strong></div>
          </div>
          <p className="sp-muted">Next due date: {fees.nextDueDate}</p>
          <Link className="sp-text-link" to="fees">View fee details →</Link>
        </StudentCard>
      </div>
    </div>
  );
}
