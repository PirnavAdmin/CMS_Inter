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

// Date-only exams remain scheduled throughout their last day when no end time is supplied.
const effectiveStatus = (status, dates, now) => {
  const normalized = String(status || "Scheduled").trim().toUpperCase();
  if (["COMPLETED", "CANCELLED", "CANCELED"].includes(normalized)) return normalized;
  const endings = dates.map(({ date, endTime }) => {
    const ending = dateValue(date);
    if (!ending) return null;
    const time = String(endTime || "").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (time && Number(time[1]) < 24 && Number(time[2]) < 60) ending.setHours(Number(time[1]), Number(time[2]), Number(time[3] || 0), 0);
    else ending.setHours(23, 59, 59, 999);
    return ending.getTime();
  }).filter((value) => value != null);
  return endings.length && Math.max(...endings) < now ? "COMPLETED" : normalized;
};

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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

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
    const upcomingRows = [];
    const completedRows = [];
    const scheduleRows = [];
    examinations.forEach((exam) => {
      const examSchedules = exam.schedules || [];
      const status = effectiveStatus(exam.status, [
        { date: exam.endDate || exam.startDate },
        ...examSchedules.map((schedule) => ({ date: schedule.examDate, endTime: schedule.endTime })),
      ], now);
      const displayedExam = { ...exam, status };
      (status === "COMPLETED" ? completedRows : upcomingRows).push(displayedExam);
      examSchedules.forEach((schedule) => scheduleRows.push({ exam: displayedExam, schedule: {
        ...schedule,
        status: effectiveStatus(schedule.status || exam.status, [{ date: schedule.examDate, endTime: schedule.endTime }], now),
      } }));
    });
    scheduleRows.sort((left, right) => String(left.schedule.examDate || "").localeCompare(String(right.schedule.examDate || "")));
    return { upcoming: upcomingRows, completed: completedRows, schedules: scheduleRows };
  }, [examinations, now]);

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
  const currentPage = (rows, page) => Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pageRows = (rows, page) => rows.slice((currentPage(rows, page) - 1) * PAGE_SIZE, currentPage(rows, page) * PAGE_SIZE);
  const upcomingRows = examRows(upcoming);
  const completedRows = examRows(completed);

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={6} rows={6}/></div>;

  return <div className="sp-page">
    <StudentPageHeader title="Examinations" subtitle="View published examination schedules and instructions."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!loading && !error && !examinations.length ? <StudentCard><StudentEmptyState icon={CalendarX} title="No examinations available" text="There are no scheduled or published examinations for your academic context."/></StudentCard> : null}
    {!loading && !error && examinations.length ? <>
      <StudentCard title="Upcoming Exams" subtitle="Scheduled and published examinations"><StudentDataTable columns={["Exam Name", "Exam Type", "Dates", "Status"]} rows={pageRows(upcomingRows, upcomingPage)} statusColumns={[3]} empty="No upcoming examinations."/><Pagination page={currentPage(upcomingRows, upcomingPage)} total={upcomingRows.length} label="examinations" onChange={setUpcomingPage}/></StudentCard>
      <StudentCard title="Exam Timetable / Schedule"><StudentDataTable columns={["Exam Name", "Exam Type", "Subject", "Exam Date", "Time", "Room / Hall", "Maximum Marks", "Status"]} rows={pageRows(scheduleRows, schedulePage)} statusColumns={[7]} empty="No examination schedule is available."/><Pagination page={currentPage(scheduleRows, schedulePage)} total={scheduleRows.length} label="schedules" onChange={setSchedulePage}/></StudentCard>
      <StudentCard title="Completed Exams"><StudentDataTable columns={["Exam Name", "Exam Type", "Dates", "Status"]} rows={pageRows(completedRows, completedPage)} statusColumns={[3]} empty="No completed examinations."/><Pagination page={currentPage(completedRows, completedPage)} total={completedRows.length} label="examinations" onChange={setCompletedPage}/></StudentCard>
    </> : null}

  </div>;
}
