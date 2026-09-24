import { useEffect, useMemo, useState } from "react";
import { Award, BookOpenCheck, CalendarClock, IndianRupee } from "lucide-react";
import { Link } from "react-router-dom";
import { SkeletonDashboard } from "@/components/common/Ui.jsx";
import StudentCard from "./components/StudentCard.jsx";
import StudentDataTable from "./components/StudentDataTable.jsx";
import StudentPageHeader from "./components/StudentPageHeader.jsx";
import StudentSummaryCard from "./components/StudentSummaryCard.jsx";
import { attendance, fees, results } from "./data/studentMockData.js";
import { useStudentProfile } from "./context/StudentProfileContext.jsx";
import { getStudentExaminations } from "./services/studentAcademicService.js";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function StudentDashboard() {
  const { profile, loading, error } = useStudentProfile();
  const [examinations, setExaminations] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState("");
  const studentName = profile?.studentName || "Student";
  const initials = studentName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST";
  useEffect(() => {
    let active = true;
    if (!profile?.studentId) {
      if (!loading) setExamsLoading(false);
      return undefined;
    }
    setExamsLoading(true);
    setExamsError("");
    getStudentExaminations(profile)
      .then((rows) => { if (active) setExaminations(rows); })
      .catch(() => { if (active) setExamsError("Unable to load upcoming examinations."); })
      .finally(() => { if (active) setExamsLoading(false); });
    return () => { active = false; };
  }, [loading, profile]);
  const upcomingSchedules = useMemo(() => examinations
    .flatMap((exam) => exam.schedules.map((schedule) => ({ exam, schedule })))
    .filter(({ schedule }) => String(schedule.examDate || "").slice(0, 10) >= new Date().toISOString().slice(0, 10))
    .sort((left, right) => String(left.schedule.examDate).localeCompare(String(right.schedule.examDate))), [examinations]);
  const formatExamDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const formatExamTime = (value) => String(value || "").slice(0, 5) || "—";
  if (error && !profile) return <div className="sp-page"><div className="sp-api-state is-error">{error}</div></div>;
  if (loading || examsLoading) return <div className="sp-page"><SkeletonDashboard cards={4} tableColumns={4}/></div>;
  return (
    <div className="sp-page">
      <StudentPageHeader
        title={`Good Morning, ${studentName.split(" ")[0]}`}
        subtitle="Welcome back! Here's what's happening with your academics today."
      />
      <section className="sp-student-strip">
        <span className="sp-avatar is-large">{initials}</span>
        <div className="sp-student-name"><strong>{studentName}</strong><small>{profile?.studentId}</small></div>
        {[
          ["Roll No", profile?.rollNo || "Not Assigned"],
          ["Admission No", profile?.admissionNo || "Not Assigned"],
          ["Academic Level", profile?.academicLevelName || "Not Assigned"],
          ["Group / Section", `${profile?.groupName || "Not Assigned"} • ${profile?.sectionName || "Not Assigned"}`],
        ].map(([label, value]) => <div className="sp-student-detail" key={label}><small>{label}</small><strong>{value}</strong></div>)}
      </section>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={BookOpenCheck} label="Overall Attendance" value={`${attendance.percentage}%`} note="Good standing" />
        <StudentSummaryCard icon={IndianRupee} label="Fee Due" value={money(fees.due)} note={`Due ${fees.nextDueDate}`} tone="orange" />
        <StudentSummaryCard icon={CalendarClock} label="Upcoming Exams" value={upcomingSchedules.length} note={upcomingSchedules[0] ? `Next on ${formatExamDate(upcomingSchedules[0].schedule.examDate)}` : "No upcoming exams"} tone="purple" />
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
          {examsError ? <div className="sp-empty">{examsError}</div> : <StudentDataTable columns={["Subject", "Date", "Time"]} rows={upcomingSchedules.slice(0, 5).map(({ schedule }) => [schedule.subjectName, formatExamDate(schedule.examDate), `${formatExamTime(schedule.startTime)} - ${formatExamTime(schedule.endTime)}`])} empty="No upcoming examinations." />}
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
