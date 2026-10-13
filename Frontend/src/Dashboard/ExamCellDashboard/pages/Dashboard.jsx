import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ArrowRight, CalendarDays } from "lucide-react";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { examCellBase, examCellMenu } from "../navigation.js";
import examImage from "@/assets/dashboard-3d/create-exam.png";
import timetableImage from "@/assets/sidebar-3d/timetable.png";
import marksImage from "@/assets/sidebar-3d/marks-evaluation.png";
import resultsImage from "@/assets/sidebar-3d/results.png";
import attendanceImage from "@/assets/dashboard-3d/mark-attendance.png";
import certificateImage from "@/assets/sidebar-3d/certificates.png";
import promotionImage from "@/assets/sidebar-3d/promotion.png";
import reportsImage from "@/assets/sidebar-3d/reports-analytics.png";
import clockImage from "@/assets/settings-3d/attendance-timing.png";
import verifyImage from "@/assets/settings-3d/audit-logs.png";
import "./Dashboard.css";

const dashboardImages = { exams: examImage, "exam-timetable": timetableImage, "marks-entry": marksImage, "marks-verification": verifyImage, results: resultsImage, attendance: attendanceImage, "check-in-out": clockImage, certificates: certificateImage, promotions: promotionImage, reports: reportsImage };
const actionLabels = { exams: "Create Exam", "exam-timetable": "Exam Timetable", "marks-entry": "Enter Marks", "marks-verification": "Verify Marks", attendance: "Mark Attendance", "check-in-out": "Check-In / Check-Out", certificates: "Certificate Requests", promotions: "Promotions", reports: "View Reports" };
const actionPaths = Object.keys(actionLabels);
const statusTone = (status) => /approved|ready|completed|issued|published/i.test(String(status)) ? "success" : /reject|cancel|absent/i.test(String(status)) ? "danger" : /scheduled|verified/i.test(String(status)) ? "info" : "pending";
const greetingForHour = (hour) => hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

export const payload = (response) => response?.data?.data ?? response?.data ?? response;
export const records = (response) => { const data = payload(response); return Array.isArray(data) ? data : data?.items || data?.records || data?.evaluations || data?.students || data?.results || []; };
export const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const displayDate = (date) => date ? new Date(date).toLocaleDateString("en-IN") : "—";

function Preview({ title, path, rows, columns, error }) {
  return <section className="ec-card"><header className="ec-card-heading"><h2><img src={dashboardImages[path] || resultsImage} alt="" aria-hidden="true" />{title}</h2><Link to={`${examCellBase}/${path}`}>View all <ArrowRight size={15} /></Link></header>{error ? <p className="ec-empty" role="alert">{error}</p> : <div className="ec-table-scroll"><table><thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.length ? rows.slice(0, 5).map((row, index) => <tr key={row.id || row.examinationId || row.evaluationId || row.certificateId || index}>{columns.map(([label, read]) => <td key={label}>{label === "Status" && read(row) != null ? <span className={`ec-home-status ${statusTone(read(row))}`}>{read(row)}</span> : read(row) ?? "—"}</td>)}</tr>) : <tr><td colSpan={columns.length}>No records available.</td></tr>}</tbody></table></div>}</section>;
}

export default function Dashboard() {
  const { selectedCampusId } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { campusId: selectedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId, pageNumber: 1, pageSize: 1000 };
    const requests = {
      exams: () => api.get(apiEndpoints.examinations.getAll, { params }),
      evaluations: () => api.post(apiEndpoints.evaluations.search, params),
      results: () => api.get("/api/v1/results/dashboard", { params }),
      attendance: () => api.get(apiEndpoints.attendance.studentAdminDaily, { params: { ...params, date: today(), attendanceDate: today(), fromDate: today(), toDate: today() } }),
      certificates: () => api.get("/api/v1/certificates", { params: { ...params, status: "Requested" } }),
      certificateStats: () => api.get("/api/v1/certificates/workflow-stats", { params }),
      promotions: () => api.get(apiEndpoints.promotions.eligible, { params }),
    };
    Promise.all(Object.entries(requests).map(async ([key, request]) => {
      try { const response = await request(); return [key, payload(response), null]; }
      catch (error) { return [key, null, getApiErrorMessage(error) || "Unable to load this section."]; }
    })).then(async (responses) => {
      const values = Object.fromEntries(responses.map(([key, value]) => [key, value]));
      const failures = Object.fromEntries(responses.filter(([, , error]) => error).map(([key, , error]) => [key, error]));
      const completed = records(values.exams).filter((exam) => /completed/i.test(String(exam.status || "")));
      const readiness = await Promise.all(completed.map(async (exam) => {
        try {
          const response = await api.get("/api/v1/results/readiness", { params: { ...params, examId: exam.examinationId || exam.id, academicLevelId: exam.academicLevelId, groupId: exam.groupId, programId: exam.programId } });
          return { ...exam, ...payload(response) };
        } catch { failures.readiness = "Readiness could not be loaded for all completed examinations."; return null; }
      }));
      values.readyExams = readiness.filter((exam) => exam?.canGenerateResults === true);
      if (active) { setData(values); setErrors(failures); setLoading(false); }
    });
    return () => { active = false; };
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId, refresh]);
  const exams = records(data.exams).filter((exam) => exam.startDate >= today() && !/cancel/i.test(exam.status || "")).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  const evaluations = records(data.evaluations);
  const evaluationStatus = (row) => row.evaluationStatus || ({ 1: "SUBMITTED", 2: "VERIFIED", 3: "APPROVED", 4: "REJECTED" }[row.status] ?? row.status);
  const pending = evaluations.filter((row) => /draft|submitted|verified|not started|rejected/i.test(String(evaluationStatus(row) || "")));
  const marked = records(data.attendance).filter((row) => row.isAttendanceMarked);
  const certificates = records(data.certificates).filter((row) => /^requested$/i.test(String(row.status || "")));
  const metrics = [["Upcoming Exams", errors.exams ? null : exams.length, "exams"], ["Marks Pending", errors.evaluations ? null : pending.length, "marks-entry"], ["Results Ready", errors.readiness || errors.exams ? null : data.readyExams?.length, "results"], ["Today's Attendance", errors.attendance ? null : marked.length, "attendance"], ["Pending Certificates", data.certificateStats?.requestedCount, "certificates"], ["Promotion Pending", errors.promotions ? null : (data.promotions?.totalCount ?? records(data.promotions).length), "promotions"]];
  const quick = actionPaths.map((path) => examCellMenu.flatMap(([, items]) => items).find(([itemPath]) => itemPath === path)).filter(Boolean);
  const currentDate = new Date();
  return <section className="ec-page ec-home">
    <header className="ec-home-hero">
      <div className="ec-home-welcome">
        <span className="ec-home-date"><CalendarDays size={14} />{currentDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
        <h1>{greetingForHour(currentDate.getHours())}, Exam Cell!</h1>
        <p>Manage examinations, marks, results and student operations.</p>
        <button className="ec-primary ec-home-refresh" disabled={loading} onClick={() => setRefresh(refresh + 1)}><RefreshCw size={15} />{loading ? "Loading…" : "Refresh Dashboard"}</button>
      </div>
      <div className="ec-home-illustration" aria-hidden="true">
        <span className="ec-home-orbit" />
        <img className="ec-home-hero-results" src={resultsImage} alt="" />
        <img className="ec-home-hero-exam" src={examImage} alt="" />
        <img className="ec-home-hero-calendar" src={timetableImage} alt="" />
      </div>
    </header>
    <div className="ec-metrics" aria-busy={loading}>{metrics.map(([label, value, path], index) => <Link className={`ec-metric ec-home-tone-${index}`} key={label} to={`${examCellBase}/${path}`}>
      <div className="ec-home-metric-image"><img src={dashboardImages[path]} alt="" aria-hidden="true" /></div>
      <div className="ec-home-metric-copy"><span>{label}</span><strong>{loading ? "…" : value ?? "—"}</strong><small>{value == null && !loading ? "Data unavailable" : "View details"}<ArrowRight size={12} /></small></div>
    </Link>)}</div>
    <section className="ec-card ec-quick"><h2><CalendarDays size={18} />Quick Actions</h2><div>{quick.map(([path], index) => <Link className={`ec-home-tone-${index % 6}`} key={path} to={`${examCellBase}/${path}`}><img src={dashboardImages[path]} alt="" aria-hidden="true" /><strong>{actionLabels[path]}</strong></Link>)}</div></section>
    <div className="ec-dashboard-grid">
      <Preview title="Upcoming Exams" path="exams" rows={exams} error={errors.exams} columns={[["Exam", (r) => r.examName], ["Academic Level", (r) => r.academicLevelName || r.academicLevel], ["Group", (r) => r.groupName], ["Start", (r) => displayDate(r.startDate)], ["End", (r) => displayDate(r.endDate)], ["Status", (r) => r.status]]} />
      <Preview title="Marks Entry Progress" path="marks-verification" rows={evaluations} error={errors.evaluations} columns={[["Exam", (r) => r.examName || r.examinationName], ["Subject", (r) => r.subjectName], ["Section", (r) => r.sectionName], ["Status", evaluationStatus]]} />
      <Preview title="Results Ready for Processing" path="publish-results" rows={data.readyExams || []} error={errors.readiness || errors.exams} columns={[["Exam", (r) => r.examinationName || r.examName], ["Group", (r) => r.groupName], ["Approved Evaluations", (r) => r.approvedEvaluationCount], ["Students", (r) => r.totalEligibleStudents]]} />
      <Preview title="Pending Certificate Requests" path="certificates" rows={certificates} error={errors.certificates} columns={[["Student", (r) => r.studentName], ["Type", (r) => r.certificateType || r.type], ["Requested", (r) => displayDate(r.requestDate || r.requestedDate)], ["Status", (r) => r.status]]} />
    </div>
  </section>;
}
