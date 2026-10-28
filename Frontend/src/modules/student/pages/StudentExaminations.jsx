import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarX, Eye, Search, X } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/shared/components/Ui.jsx";
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
const examKey = (exam) => String(exam.examinationId ?? exam.examId ?? exam.id ?? exam.examName ?? "");
const examText = (value) => Array.isArray(value)
  ? value.map((item) => typeof item === "object" ? item?.patternName || item?.name || "" : item).filter(Boolean).join(", ") || "—"
  : (typeof value === "string" || typeof value === "number") && value !== "" ? value : "—";

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
  const [completedPage, setCompletedPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const detailsRef = useRef(null);
  useEffect(() => {
    if (!selectedExam) return undefined;
    const dialog = detailsRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [selectedExam]);
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
      setSelectedExam("");
      setExaminations([]);
      try {
        if (!student?.studentId) return;
        const rows = await getStudentExaminations(student);
        if (active) {
          setExaminations(rows);
          setUpcomingPage(1);
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

  const matchesSearch = (exam) => `${exam.examName || ""} ${exam.examCode || exam.code || ""} ${exam.examType || exam.assessmentTypeName || ""}`.toLowerCase().includes(search.trim().toLowerCase());
  const viewSchedule = (exam) => { setSelectedExam(examKey(exam)); };
  const examRows = (items) => items.filter(matchesSearch).map((exam) => [
    examText(exam.examCode || exam.code), examText(exam.examName),
    examText(exam.examCategory || exam.category), examText(exam.examType || exam.assessmentTypeName),
    examText(exam.patternNames || exam.examPatternNames || exam.patternName || exam.examPatternName),
    `${formatDate(exam.startDate)} - ${formatDate(exam.endDate)}`, exam.status,
    <button type="button" className="sp-exam-view" aria-label={`View ${exam.examName || "examination"} schedule`} title="View schedule" onClick={() => viewSchedule(exam)}><Eye size={16}/><span>View</span></button>,
  ]);
  const selectedDetails = [...upcoming, ...completed].find((exam) => examKey(exam) === selectedExam);
  const scheduleRows = schedules.filter(({ exam }) => examKey(exam) === selectedExam).map(({ exam, schedule }) => [
    <div className="sp-exam-subject"><strong>{examText(schedule.patternName || schedule.subjectName)}</strong>{schedule.subjectCode ? <small>{schedule.subjectCode}</small> : null}</div>,
    formatDate(schedule.examDate),
    `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`,
    schedule.maxMarks ?? "—",
    schedule.passingMarks ?? (exam.passPercentage != null ? `${exam.passPercentage}%` : "—"),
    examText(schedule.roomNumber || schedule.hall || [...new Set((schedule.hallAssignments || []).map((hall) => hall.hallName || hall.roomNumber).filter(Boolean))].join(", ")),
    examText(schedule.invigilatorName || schedule.invigilator || [...new Set([...(schedule.invigilatorAssignments || []), ...(schedule.hallAssignments || [])].map((entry) => entry.invigilatorName || entry.invigilator).filter(Boolean))].join(", ")),
    examText(schedule.examMode),
    schedule.status || exam.status,
  ]);
  const currentPage = (rows, page) => Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const pageRows = (rows, page) => rows.slice((currentPage(rows, page) - 1) * PAGE_SIZE, currentPage(rows, page) * PAGE_SIZE);
  const upcomingRows = examRows(upcoming);
  const completedRows = examRows(completed);

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={6} rows={6}/></div>;

  const examColumns = ["Exam Code", "Exam Name", "Exam Category", "Exam Type", "Exam Pattern", "Exam Period", "Status", "View"];

  return <div className="sp-page sp-examinations-page">
    <StudentPageHeader title="Examinations" subtitle="View published examination schedules and instructions."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!loading && !error && !examinations.length ? <StudentCard><StudentEmptyState icon={CalendarX} title="No examinations available" text="There are no scheduled or published examinations for your academic context."/></StudentCard> : null}
    {!loading && !error && examinations.length ? <>
      <div className="sp-exam-panel">
        <label className="sp-exam-search"><Search size={17} aria-hidden="true"/><input type="search" aria-label="Search your examinations" placeholder="Search by exam code, name or type..." value={search} onChange={(event) => { setSearch(event.target.value); setUpcomingPage(1); setCompletedPage(1); }}/></label>
        <StudentCard title="Upcoming Exams" subtitle="Scheduled and published examinations"><StudentDataTable columns={examColumns} rows={pageRows(upcomingRows, upcomingPage)} statusColumns={[6]} empty="No upcoming examinations."/><Pagination page={currentPage(upcomingRows, upcomingPage)} total={upcomingRows.length} label="examinations" onChange={setUpcomingPage}/></StudentCard>
        <StudentCard title="Completed Exams"><StudentDataTable columns={examColumns} rows={pageRows(completedRows, completedPage)} statusColumns={[6]} empty="No completed examinations."/><Pagination page={currentPage(completedRows, completedPage)} total={completedRows.length} label="examinations" onChange={setCompletedPage}/></StudentCard>
      </div>
    </> : null}

    {selectedDetails ? <dialog ref={detailsRef} className="sp-exam-details" aria-labelledby="sp-exam-details-title" onCancel={(event) => { event.preventDefault(); setSelectedExam(""); }} onClick={(event) => { if (event.target === event.currentTarget) setSelectedExam(""); }}>
      <header className="sp-exam-details-header"><h2 id="sp-exam-details-title">Examination Details</h2><button type="button" className="sp-icon-btn" aria-label="Close examination details" onClick={() => setSelectedExam("")} autoFocus><X size={18}/></button></header>
      <div className="sp-exam-details-body">
        <section className="sp-exam-details-summary">
          <h3>{selectedDetails.examName}{selectedDetails.examCode || selectedDetails.code ? ` (${selectedDetails.examCode || selectedDetails.code})` : ""}</h3>
          <p>Category: {examText(selectedDetails.examCategory || selectedDetails.category)} · {student?.boardName || "—"} · {student?.academicYearName || "—"}</p>
          <p>Pattern: {examText(selectedDetails.patternNames || selectedDetails.examPatternNames || selectedDetails.patternName || selectedDetails.examPatternName)} · Type: {examText(selectedDetails.examType || selectedDetails.assessmentTypeName)}</p>
          <p>Period: {formatDate(selectedDetails.startDate)} – {formatDate(selectedDetails.endDate)}</p>
        </section>
        <StudentDataTable columns={["Subject / Pattern Session", "Exam Date", "Timing", "Total Marks", "Passing Marks / Pass %", "Room / Hall", "Invigilator", "Exam Mode", "Status"]} rows={scheduleRows} statusColumns={[8]} empty="No examination schedule is available."/>
      </div>
    </dialog> : null}

  </div>;
}
