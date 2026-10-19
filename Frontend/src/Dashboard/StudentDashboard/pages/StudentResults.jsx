import { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Download, Eye, Percent, Sigma } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";
import { getStudentResult, getStudentExaminations } from "../services/studentAcademicService.js";

const unwrap = (input) => {
  let value = input;
  for (let i = 0; i < 4; i += 1) {
    const nested = value?.data ?? value?.Data ?? value?.result ?? value?.Result;
    if (nested == null || typeof nested !== "object" || nested === value) break;
    value = nested;
  }
  return value;
};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const rowsFrom = (payload) => {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  for (const key of ["subjects", "Subjects", "subjectResults", "SubjectResults", "items", "Items"]) if (Array.isArray(value?.[key])) return value[key];
  return [];
};
const fileDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function StudentResults() {
  return <StudentResultsList renderDetails={(exam) => <StudentResultDetails key={exam.examinationId ?? exam.examId ?? exam.id} examination={exam}/>}/>;
}

function StudentResultDetails({ examination }) {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [memo, setMemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const examId = examination.examinationId ?? examination.examId ?? examination.id;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      setMemo(null);
      try {
        if (!student?.studentId) throw new Error("Student ID is unavailable.");
        const data = await getStudentResult(student, examId || undefined);
        if (active) setMemo(validateStudentMemo(data, student, examination));
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student, examId, examination]);

  const subjects = useMemo(() => rowsFrom(memo).filter((row) => !/^(false|0)$/i.test(String(read(row, "isPublished", "IsPublished")))).map((row) => {
    const theory = Number(read(row, "theoryMarks", "TheoryMarks", "theory", "Theory") || 0);
    const practical = Number(read(row, "practicalMarks", "PracticalMarks", "practical", "Practical") || 0);
    const internal = Number(read(row, "internalMarks", "InternalMarks", "internal", "Internal") || 0);
    const obtained = Number(read(row, "obtainedMarks", "ObtainedMarks", "totalMarks", "TotalMarks") ?? theory + practical + internal);
    const maximum = Number(read(row, "maximumMarks", "MaximumMarks", "maxMarks", "MaxMarks") || 0);
    return [read(row, "subjectName", "SubjectName", "name", "Name") || "—", internal, practical, theory, obtained, maximum, read(row, "grade", "Grade") || "—", read(row, "resultStatus", "ResultStatus", "result", "Result") || "—"];
  }), [memo]);
  const percentage = read(memo, "percentage", "Percentage");
  const obtained = Number(read(memo, "grandTotal", "GrandTotal", "total", "Total") ?? subjects.reduce((sum, row) => sum + Number(row[4] || 0), 0));
  const maximum = Number(read(memo, "maximumMarks", "MaximumMarks", "maximum", "Maximum") ?? subjects.reduce((sum, row) => sum + Number(row[5] || 0), 0));
  const published = resultState(examination, memo) === "Published";

  const downloadMemo = async () => {
    if (!student?.studentId || downloading) return;
    setDownloading(true);
    try {
      const response = await apiClient.get(studentApiEndpoints.results.studentMemoPdf, {
        params: { studentId: student.studentId, boardId: student.boardId, academicYearId: student.academicYearId, academicLevelId: student.academicLevelId, groupId: student.groupId, examId },
        responseType: "blob",
      });
      fileDownload(response.data, `marks-memo-${student.admissionNo || student.studentId}.pdf`);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setDownloading(false); }
  };

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={5} rows={5}/></div>;
  return <div className="sp-page">
    <StudentPageHeader title="Results" subtitle="Published academic results only." action={<button className="sp-btn" type="button" onClick={downloadMemo} disabled={!published || downloading}><Download size={16}/>{downloading ? " Downloading..." : " Download Marks Memo"}</button>}/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!error && !published ? <StudentEmptyState icon={Award} title={resultState(examination, memo)} text="Published marks are available only after the college releases your result."/> : null}
    {published ? <>
      <div className="sp-summary-grid five"><StudentSummaryCard icon={Sigma} label="Total Marks" value={maximum}/><StudentSummaryCard icon={CheckCircle2} label="Obtained" value={obtained} tone="blue"/><StudentSummaryCard icon={Percent} label="Percentage" value={percentage == null ? "—" : `${percentage}%`} tone="orange"/><StudentSummaryCard icon={Award} label="Grade" value={read(memo, "overallGrade", "OverallGrade", "grade", "Grade") || "—"} tone="purple"/><StudentSummaryCard icon={CheckCircle2} label="Result" value={read(memo, "finalResult", "FinalResult", "resultStatus", "ResultStatus", "result", "Result") || "—"} tone="green"/></div>
      <StudentCard title={read(memo, "examName", "ExamName") || "Examination Results"} subtitle={read(memo, "publishedDate", "PublishedDate") ? `Published ${dateLabel(read(memo, "publishedDate", "PublishedDate"))}` : "Published marks by subject."}>
        <StudentDataTable columns={["Subject", "Internal", "Practical", "External", "Total", "Max Marks", "Grade", "Result"]} rows={subjects} statusColumns={[7]} empty="No published subject marks are available." />
      </StudentCard>
    </> : null}
  </div>;
}

const resultRead = (row, ...keys) => keys.flatMap((key) => [key, key[0].toUpperCase() + key.slice(1)])
  .map((key) => row?.[key]).find((value) => value != null && value !== "");
const resultUnwrap = (input) => {
  let value = input;
  for (let i = 0; i < 6; i += 1) {
    const nested = value?.data ?? value?.Data ?? value?.result ?? value?.Result;
    if (nested == null || typeof nested !== "object" || nested === value) break;
    value = nested;
  }
  return value;
};
const examKey = (exam) => String(resultRead(exam, "examinationId", "examId", "id") ?? "");
const subjectRows = (memo) => {
  const value = resultUnwrap(memo);
  if (Array.isArray(value)) return value;
  return resultRead(value, "subjects", "subjectResults", "items") ?? [];
};
const flag = (value) => /^(true|1)$/i.test(String(value)) ? true
  : /^(false|0)$/i.test(String(value)) ? false : undefined;
const normalized = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
const absent = (row) => flag(resultRead(row, "isAbsent")) === true || flag(resultRead(row, "hasAppeared", "isAppeared")) === false
  || ["absent", "notappeared", "notappearedforexam", "ab"].includes(normalized(resultRead(row, "attendanceStatus", "resultStatus", "finalResult", "status")));
const published = (memo, exam) => {
  let confirmed = false;
  for (const source of [memo, exam]) {
    const value = flag(resultRead(source, "isResultPublished", "resultsPublished", "isPublished"));
    // An exam's generic isPublished/status can describe its schedule rather than its results.
    const reliable = source === memo ? value : flag(resultRead(source, "isResultPublished", "resultsPublished"));
    if (reliable === false) return false;
    if (reliable === true) confirmed = true;
    const status = normalized(resultRead(source, "publicationStatus", "resultPublicationStatus", ...(source === memo ? ["status", "resultStatus"] : [])));
    if (["published", "resultspublished"].includes(status)) confirmed = true;
    if (["unpublished", "notpublished", "resultsnotpublished", "draft", "pending"].includes(status)) return false;
  }
  return confirmed ? true : undefined;
};
const dateAt = (value, end = false) => {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T${end ? "23:59:59.999" : "00:00:00"}+05:30` : text);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};
function resultState(exam, memo, now = Date.now()) {
  const scheduleDates = (resultRead(exam, "schedules") || []).map((row) => dateAt(resultRead(row, "examDate"))).filter((value) => value != null);
  const start = dateAt(resultRead(exam, "startDate", "examDate")) ?? (scheduleDates.length ? Math.min(...scheduleDates) : null);
  const endings = [dateAt(resultRead(exam, "endDate", "startDate", "examDate"), true),
    ...(resultRead(exam, "schedules") || []).map((row) => dateAt(resultRead(row, "examDate"), true))].filter((value) => value != null);
  if (start != null && start > now) return "Upcoming Examination";
  const completed = normalized(resultRead(exam, "status")) === "completed" || (endings.length > 0 && Math.max(...endings) < now);
  if (!completed && start != null && start <= now) return "Examination in Progress";
  if (!completed) return "Examination status unavailable";
  const publication = published(memo, exam);
  if (publication === false) return "Results Not Published";
  if (publication !== true) return "Result status unavailable";
  const subjects = subjectRows(memo);
  if (absent(memo) || (subjects.length > 0 && subjects.every(absent))) return "Not Appeared for Exam";
  if (!memo || !subjects.length) return "Published result unavailable";
  return "Published";
}
function validateStudentMemo(input, student, exam) {
  const memo = resultUnwrap(input);
  if (!memo) return null;
  for (const [keys, expected] of [[ ["studentId"], student.studentId ], [["examId", "examinationId"], examKey(exam)],
    ...["campusId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId", "sectionId"].map((key) => [[key], student[key]])]) {
    const actual = resultRead(memo, ...keys);
    if (actual != null && expected != null && String(actual) !== String(expected)) throw new Error("The returned result does not match your examination or academic placement.");
  }
  const subjects = subjectRows(memo);
  if (!Array.isArray(subjects) || subjects.some((row) => resultRead(row, "studentId") != null && String(resultRead(row, "studentId")) !== String(student.studentId))) {
    throw new Error("The returned subject results do not match your student profile.");
  }
  return memo;
}

const listDateLabel = (value) => value && !Number.isNaN(new Date(value).getTime())
  ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const PAGE_SIZE = 10;
function StudentResultsList({ renderDetails }) {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(""); setEntries([]); setSelectedId(""); setPage(1);
      try {
        if (!["studentId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId", "sectionId"].every((key) => Number(student?.[key]) > 0)) throw new Error("Your student academic placement or section is unavailable. Please contact the college office.");
        const exams = await getStudentExaminations(student, { allPages: true });
        const unique = [...new Map(exams.filter((exam) => examKey(exam)).map((exam) => [examKey(exam), exam])).values()];
        const results = [];
        for (let offset = 0; offset < unique.length && active; offset += 5) {
          results.push(...await Promise.all(unique.slice(offset, offset + 5).map(async (exam) => {
            if (["Upcoming Examination", "Examination in Progress"].includes(resultState(exam, null))) return { exam, memo: null };
            try {
              const memo = validateStudentMemo(await getStudentResult(student, examKey(exam)), student, exam);
              return { exam, memo };
            } catch (requestError) { return { exam, memo: null, error: getApiErrorMessage(requestError) }; }
          })));
        }
        if (active) setEntries(results);
      } catch (requestError) { if (active) setError(getApiErrorMessage(requestError)); }
      finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student, refresh]);
  const classified = useMemo(() => entries.map((entry) => ({ ...entry, state: entry.error ? "Unable to load result" : resultState(entry.exam, entry.memo, now) })), [entries, now]);
  const visible = classified.filter(({ exam, state }) => (!filter || state === filter)
    && `${resultRead(exam, "examName", "examinationName", "name") || ""} ${resultRead(exam, "examCode", "code") || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const selected = classified.find(({ exam, state }) => examKey(exam) === selectedId && state === "Published");
  const statuses = [...new Set(classified.map((entry) => entry.state))];

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={7} rows={5}/></div>;
  return <div className="sp-page sp-results-page">
    <StudentPageHeader title="Results" subtitle="Examination results for your section." action={<button className="sp-btn" onClick={() => setRefresh((value) => value + 1)}>Refresh</button>}/>
    {profileError || error ? <div className="sp-api-state is-error" role="alert">{profileError || error}</div> : null}
    {!error && !entries.length ? <StudentEmptyState icon={Award} title="No Examinations Available" text="No examinations are assigned to your current academic placement and section."/> : null}
    {entries.length ? <StudentCard title="Examination Results" subtitle={[student?.academicYearName, student?.academicLevelName, student?.groupName, student?.programName, student?.sectionName].filter(Boolean).join(" · ")}>
      <div className="sp-results-toolbar">
        <input type="search" aria-label="Search examinations" placeholder="Search exam name or code..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/>
        <select aria-label="Filter result status" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="">All Examinations</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
      </div>
      <StudentDataTable columns={["Exam Name", "Group", "Program", "Section", "Academic Year", "Exam Period", "Status", "Actions"]} rows={visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(({ exam, state, error: rowError }) => [
        <strong>{resultRead(exam, "examName", "examinationName", "name") || resultRead(exam, "examCode", "code") || `Examination ${examKey(exam)}`}</strong>,
        student.groupName || "—", student.programName || "—", student.sectionName || "—", student.academicYearName || "—",
        `${listDateLabel(resultRead(exam, "startDate", "examDate"))} – ${listDateLabel(resultRead(exam, "endDate", "startDate", "examDate"))}`,
        <span className={`sp-result-status ${state === "Published" ? "is-published" : state === "Not Appeared for Exam" ? "is-absent" : "is-pending"}`}>{state}</span>,
        state === "Published" ? <button type="button" className="sp-btn" aria-expanded={selectedId === examKey(exam)} onClick={() => setSelectedId(examKey(exam))}><Eye size={16}/> View Results</button>
          : rowError ? <span className="sp-results-note">{rowError}</span>
            : /unavailable/.test(state) ? <span className="sp-results-note">The existing data does not confirm a published student result.</span> : "—",
      ])} empty="No examinations match your search."/>
      <footer className="sp-pagination"><span>{visible.length} examination{visible.length === 1 ? "" : "s"}</span><div><button className="sp-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><strong>Page {currentPage} of {pages}</strong><button className="sp-btn" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></footer>
    </StudentCard> : null}
    {selected ? <section className="sp-results-details" aria-label="Selected examination results"><button className="sp-btn" onClick={() => setSelectedId("")}>Close Result</button>{renderDetails(selected.exam)}</section> : null}
  </div>;
}
