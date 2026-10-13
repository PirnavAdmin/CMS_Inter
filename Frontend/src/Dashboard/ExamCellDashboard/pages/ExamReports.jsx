import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import Page from "../layout/ExamCellPageLayout.jsx";
import { payload, records } from "./Dashboard.jsx";

export default function ExamReports() {
  const { selectedCampusId: campusId } = useCampusContext();
  const { selectedBoardId: boardId, selectedAcademicYearId: academicYearId } = useAcademicContext();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const selectedExam = exams.find((exam) => String(exam.examinationId || exam.id) === examId);
  const params = { campusId, boardId, academicYearId, examId, groupId: selectedExam?.groupId, academicLevelId: selectedExam?.academicLevelId, programId: selectedExam?.programId };
  useEffect(() => {
    let active = true;
    setExams([]); setExamId(""); setAnalytics(null); setRanks([]); setError("");
    api.get(apiEndpoints.examinations.getAll, { params: { campusId, boardId, academicYearId, pageSize: 1000 } }).then((res) => { if (active) setExams(records(res)); }).catch((err) => { if (active) setError(getApiErrorMessage(err) || "Unable to load exams."); });
    return () => { active = false; };
  }, [campusId, boardId, academicYearId]);
  const load = async (event) => {
    event.preventDefault();
    if (!examId) return;
    setBusy(true); setError(""); setAnalytics(null); setRanks([]);
    try {
      const responses = await Promise.all([api.get("/api/v1/results/analytics", { params }), api.get("/api/v1/results/rank-list", { params })]);
      setAnalytics(payload(responses[0])); setRanks(records(responses[1]));
    } catch (err) { setError(getApiErrorMessage(err) || "Unable to load examination reports."); }
    finally { setBusy(false); }
  };
  const exportReport = async (format) => {
    setDownloading(true); setError("");
    try {
      const response = await api.get(format === "xlsx" ? "/api/v1/results/export-excel" : "/api/v1/results/download-pdf", { params, responseType: "blob" });
      const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `exam-results-${examId}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { setError(getApiErrorMessage(err) || "Export failed."); }
    finally { setDownloading(false); }
  };
  return <Page title="Exam Reports" subtitle="View backend result statistics, subject performance and student ranks.">
    <section className="ec-card ec-padding"><form className="ec-form-grid" onSubmit={load}><label>Examination<select required value={examId} onChange={(event) => { setExamId(event.target.value); setAnalytics(null); setRanks([]); }}><option value="">Select examination</option>{exams.map((exam) => <option key={exam.examinationId || exam.id} value={exam.examinationId || exam.id}>{exam.examName} · {exam.groupName}</option>)}</select></label><button className="ec-primary" disabled={busy || !examId}>{busy ? "Loading…" : "Load Reports"}</button><div className="ec-actions"><button type="button" disabled={!analytics || downloading} onClick={() => exportReport("xlsx")}>Export Excel</button><button type="button" disabled={!analytics || downloading} onClick={() => exportReport("pdf")}>Download PDF</button></div></form>{error && <p className="ec-error" role="alert">{error}</p>}</section>
    {analytics && <><div className="ec-metrics">{[["Total Students", analytics.totalStudents ?? analytics.total], ["Passed", analytics.passed], ["Failed", analytics.failed], ["Average Percentage", analytics.averagePercentage ?? analytics.average], ["Pass Percentage", analytics.passPercentage ?? analytics.pass]].map(([label, data]) => <div className="ec-metric" key={label}><span>{label}</span><strong>{data ?? "—"}</strong></div>)}</div>
      <section className="ec-card"><header className="ec-card-heading"><h2>Student Rank List</h2></header><div className="ec-table-scroll"><table><thead><tr><th>Rank</th><th>Student</th><th>Roll No.</th><th>Section</th><th>Total Marks</th><th>Percentage</th><th>Result</th></tr></thead><tbody>{ranks.length ? ranks.map((row) => <tr key={row.studentId}><td>{row.rank}</td><td>{row.studentName || row.student}</td><td>{row.rollNumber || row.rollNo || row.roll}</td><td>{row.sectionName || row.section}</td><td>{row.totalMarks ?? row.total}</td><td>{row.percentage}</td><td>{row.result}</td></tr>) : <tr><td colSpan="7">No ranked results available.</td></tr>}</tbody></table></div></section>
      <section className="ec-card"><header className="ec-card-heading"><h2>Subject Performance</h2></header><div className="ec-table-scroll"><table><thead><tr><th>Subject</th><th>Students</th><th>Average</th><th>Highest</th><th>Lowest</th><th>Pass Percentage</th></tr></thead><tbody>{(analytics.subjectPerformance || []).length ? analytics.subjectPerformance.map((row, index) => <tr key={row.subjectId || index}><td>{row.subjectName || "—"}</td><td>{row.students ?? "—"}</td><td>{row.average ?? "—"}</td><td>{row.highest ?? "—"}</td><td>{row.lowest ?? "—"}</td><td>{row.passPercentage ?? "—"}</td></tr>) : <tr><td colSpan="6">No subject performance data available.</td></tr>}</tbody></table></div></section>
    </>}
  </Page>;
}
