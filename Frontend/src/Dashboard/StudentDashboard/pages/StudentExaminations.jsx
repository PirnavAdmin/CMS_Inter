import { useEffect, useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import { getStudentExaminations } from "../services/studentAcademicService.js";

const dateValue = (value) => {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const formatDate = (value) => dateValue(value)?.toLocaleDateString("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
}) || "—";

const formatTime = (value) => {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  if (!match) return value || "—";
  return new Date(2000, 0, 1, Number(match[1]), Number(match[2])).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
};

const PAGE_SIZE = 5;

function Pagination({ page, total, label, onChange }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  return <footer className="sp-pagination"><span>Showing {start}-{end} of {total} {label}</span><div><button className="sp-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button><strong>Page {page} of {pages}</strong><button className="sp-btn" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button></div></footer>;
}

export default function StudentExaminations() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [examinations, setExaminations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!student?.studentId) return;
        const rows = await getStudentExaminations(student);
        if (active) {
          setExaminations(rows);
          setUpcomingPage(1);
          setSchedulePage(1);
          setCompletedPage(1);
        }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    if (!profileLoading && student?.studentId) load();
    return () => { active = false; };
  }, [profileLoading, student]);

  const { upcoming, completed, schedules } = useMemo(() => {
    const today = dateValue(new Date().toISOString());
    const upcomingRows = [];
    const completedRows = [];
    const scheduleRows = [];
    examinations.forEach((exam) => {
      const status = String(exam.status || "").toUpperCase();
      const endDate = dateValue(exam.endDate || exam.startDate);
      (status === "COMPLETED" || (endDate && endDate < today) ? completedRows : upcomingRows).push(exam);
      exam.schedules.forEach((schedule) => scheduleRows.push({ exam, schedule }));
    });
    scheduleRows.sort((left, right) => String(left.schedule.examDate || "").localeCompare(String(right.schedule.examDate || "")));
    return { upcoming: upcomingRows, completed: completedRows, schedules: scheduleRows };
  }, [examinations]);

  const examRows = (items) => items.map((exam) => [exam.examName, exam.examType || exam.assessmentTypeName, `${formatDate(exam.startDate)} - ${formatDate(exam.endDate)}`, exam.status]);
  const scheduleRows = schedules.map(({ exam, schedule }) => [
    exam.examName,
    exam.examType || exam.assessmentTypeName,
    schedule.subjectName,
    formatDate(schedule.examDate),
    `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`,
    schedule.roomNumber || schedule.hall || "—",
    schedule.maxMarks ?? "—",
    schedule.status || exam.status,
  ]);
  const pageRows = (rows, page) => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const upcomingRows = examRows(upcoming);
  const completedRows = examRows(completed);

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={6} rows={6}/></div>;

  return <div className="sp-page">
    <StudentPageHeader title="Examinations" subtitle="View published examination schedules and instructions."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!loading && !error && !examinations.length ? <StudentCard><StudentEmptyState icon={CalendarX} title="No examinations available" text="There are no scheduled or published examinations for your academic context."/></StudentCard> : null}
    {!loading && !error && examinations.length ? <>
      <StudentCard title="Upcoming Exams" subtitle="Scheduled and published examinations"><StudentDataTable columns={["Exam Name", "Exam Type", "Dates", "Status"]} rows={pageRows(upcomingRows, upcomingPage)} statusColumns={[3]} empty="No upcoming examinations."/><Pagination page={upcomingPage} total={upcomingRows.length} label="examinations" onChange={setUpcomingPage}/></StudentCard>
      <StudentCard title="Exam Timetable / Schedule"><StudentDataTable columns={["Exam Name", "Exam Type", "Subject", "Exam Date", "Time", "Room / Hall", "Maximum Marks", "Status"]} rows={pageRows(scheduleRows, schedulePage)} statusColumns={[7]} empty="No examination schedule is available."/><Pagination page={schedulePage} total={scheduleRows.length} label="schedules" onChange={setSchedulePage}/></StudentCard>
      <StudentCard title="Completed Exams"><StudentDataTable columns={["Exam Name", "Exam Type", "Dates", "Status"]} rows={pageRows(completedRows, completedPage)} statusColumns={[3]} empty="No completed examinations."/><Pagination page={completedPage} total={completedRows.length} label="examinations" onChange={setCompletedPage}/></StudentCard>
    </> : null}
    <StudentCard title="Examination Instructions"><ul className="sp-list"><li>Report to the examination hall at least 20 minutes before the scheduled time.</li><li>Carry your college identity card and required stationery.</li><li>Electronic devices are not permitted inside the hall.</li></ul></StudentCard>
  </div>;
}
