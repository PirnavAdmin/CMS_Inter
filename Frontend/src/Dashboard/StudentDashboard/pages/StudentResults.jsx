import { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Download, Percent, Sigma } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";
import { getStudentResult } from "../services/studentAcademicService.js";

const unwrap = (input) => {
  let value = input;
  for (let i = 0; i < 4; i += 1) {
    const nested = value?.data ?? value?.Data ?? value?.result ?? value?.Result;
    if (nested == null || nested === value) break;
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
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [memo, setMemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!student?.studentId) throw new Error("Student ID is unavailable.");
        const data = await getStudentResult(student);
        if (active) setMemo(unwrap(data));
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError));
      } finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student]);

  const subjects = useMemo(() => rowsFrom(memo).filter((row) => read(row, "isPublished", "IsPublished") !== false).map((row) => {
    const theory = Number(read(row, "theoryMarks", "TheoryMarks", "theory", "Theory") || 0);
    const practical = Number(read(row, "practicalMarks", "PracticalMarks", "practical", "Practical") || 0);
    const internal = Number(read(row, "internalMarks", "InternalMarks", "internal", "Internal") || 0);
    const obtained = Number(read(row, "obtainedMarks", "ObtainedMarks", "totalMarks", "TotalMarks") ?? theory + practical + internal);
    const maximum = Number(read(row, "maximumMarks", "MaximumMarks", "maxMarks", "MaxMarks") || 0);
    return [read(row, "subjectName", "SubjectName", "name", "Name") || "—", internal, practical, theory, obtained, maximum, read(row, "grade", "Grade") || "—", read(row, "resultStatus", "ResultStatus", "result", "Result") || "—"];
  }), [memo]);
  const percentage = Number(read(memo, "percentage", "Percentage") ?? 0);
  const obtained = Number(read(memo, "grandTotal", "GrandTotal", "total", "Total") ?? subjects.reduce((sum, row) => sum + Number(row[4] || 0), 0));
  const maximum = Number(read(memo, "maximumMarks", "MaximumMarks", "maximum", "Maximum") ?? subjects.reduce((sum, row) => sum + Number(row[5] || 0), 0));
  const publishedFlag = read(memo, "isPublished", "IsPublished");
  const published = publishedFlag != null
    ? publishedFlag === true
    : /published/i.test(String(read(memo, "status", "Status", "resultStatus", "ResultStatus") || "")) || subjects.length > 0;

  const downloadMemo = async () => {
    if (!student?.studentId || downloading) return;
    setDownloading(true);
    try {
      const response = await apiClient.get(studentApiEndpoints.results.studentMemoPdf, {
        params: { studentId: student.studentId, boardId: student.boardId, academicYearId: student.academicYearId, academicLevelId: student.academicLevelId, groupId: student.groupId, examId: read(memo, "examId", "ExamId") },
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
    {!error && !published ? <StudentEmptyState icon={Award} title="No published results" text="Your published examination results will appear here when available."/> : null}
    {published ? <>
      <div className="sp-summary-grid five"><StudentSummaryCard icon={Sigma} label="Total Marks" value={maximum}/><StudentSummaryCard icon={CheckCircle2} label="Obtained" value={obtained} tone="blue"/><StudentSummaryCard icon={Percent} label="Percentage" value={`${percentage}%`} tone="orange"/><StudentSummaryCard icon={Award} label="Grade" value={read(memo, "overallGrade", "OverallGrade", "grade", "Grade") || "—"} tone="purple"/><StudentSummaryCard icon={CheckCircle2} label="Result" value={read(memo, "finalResult", "FinalResult", "resultStatus", "ResultStatus", "result", "Result") || "—"} tone="green"/></div>
      <StudentCard title={read(memo, "examName", "ExamName") || "Examination Results"} subtitle={read(memo, "publishedDate", "PublishedDate") ? `Published ${dateLabel(read(memo, "publishedDate", "PublishedDate"))}` : "Published marks by subject."}>
        <StudentDataTable columns={["Subject", "Internal", "Practical", "External", "Total", "Max Marks", "Grade", "Result"]} rows={subjects} statusColumns={[7]} empty="No published subject marks are available." />
      </StudentCard>
    </> : null}
  </div>;
}
