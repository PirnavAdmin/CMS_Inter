import { useEffect, useMemo, useState } from "react";
import { Award, BookOpenCheck, CalendarClock, IndianRupee, CheckCircle2, GraduationCap, Users, FileText, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonDashboard } from "@/components/common/Ui.jsx";
import StudentDashboardHighlights from "./components/StudentDashboardHighlights.jsx";
import StudentCard from "./components/StudentCard.jsx";
import StudentDataTable from "./components/StudentDataTable.jsx";
import StudentPageHeader from "./components/StudentPageHeader.jsx";
import StudentSummaryCard from "./components/StudentSummaryCard.jsx";
import { useStudentProfile } from "./context/StudentProfileContext.jsx";
import { getStudentAttendance, getStudentExaminations, getStudentResult } from "./services/studentAcademicService.js";
import profileIcon from "@/assets/dashboard-3d/total-students.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import examinationIcon from "@/assets/dashboard-3d/create-exam.png";
import resultsIcon from "@/assets/sidebar-3d/results.png";
import feeIcon from "@/assets/sidebar-3d/fee-management.png";
import certificateIcon from "@/assets/sidebar-3d/certificates.png";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;
const getGreeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
};

const getObject = (payload) => {
  let value = payload?.data ?? payload?.Data ?? payload;
  if (value?.data && !Array.isArray(value.data)) value = value.data;
  if (value?.Data && !Array.isArray(value.Data)) value = value.Data;
  return value && !Array.isArray(value) ? value : {};
};

const getRows = (payload) => {
  let value = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    const nested = value?.data ?? value?.Data ?? value?.result ?? value?.Result;
    if (nested == null || typeof nested !== "object" || nested === value) break;
    value = nested;
  }
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "attendanceRecords", "AttendanceRecords", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const read = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const unwrap = (payload) => {
  let value = payload;
  for (let depth = 0; depth < 4; depth += 1) {
    const nested = value?.data ?? value?.Data ?? value?.result ?? value?.Result;
    if (nested == null || typeof nested !== "object" || nested === value) break;
    value = nested;
  }
  return value;
};
const summarizeAttendance = (payload) => {
  const data = unwrap(payload) || {};
  const rows = getRows(data);
  let present = 0; let absent = 0; let half = 0;
  rows.forEach((row) => {
    const status = String(read(row, "status", "Status", "attendanceStatus", "AttendanceStatus") ?? "").toLowerCase();
    if (status === "1" || status.includes("present")) present += 1;
    else if (status === "2" || status.includes("absent")) absent += 1;
    else if (status === "4" || status.includes("half")) half += 1;
  });
  const sessions = present + absent + half;
  return {
    percentage: getNumber(data, ["percentage", "Percentage", "attendancePercentage", "AttendancePercentage"]) ?? (sessions ? Math.round(((present + half * 0.5) / sessions) * 100) : 0),
    present: getNumber(data, ["present", "Present", "presentCount", "PresentCount"]) ?? present,
    absent: getNumber(data, ["absent", "Absent", "absentCount", "AbsentCount"]) ?? absent,
    workingDays: getNumber(data, ["workingDays", "WorkingDays", "totalDays", "TotalDays"]) ?? new Set(rows.map((row) => String(read(row, "attendanceDate", "AttendanceDate", "date", "Date") || "").slice(0, 10)).filter(Boolean)).size,
  };
};

const getNumber = (item, keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
};

const normalizeFeeSummary = (detailsPayload, ledgerPayload) => {
  const details = getObject(detailsPayload);
  const account = { ...(details.studentFee || details.feeAccount || details.account || {}), ...details };
  const rows = getRows(ledgerPayload);
  const total = getNumber(account, ["totalAmount", "TotalAmount", "totalFee", "TotalFee", "totalPayable", "TotalPayable", "payableAmount", "PayableAmount"])
    ?? rows.reduce((sum, row) => sum + (getNumber(row, ["amount", "Amount", "totalAmount", "TotalAmount", "payableAmount", "PayableAmount"]) || 0), 0);
  const paid = getNumber(account, ["totalPaid", "TotalPaid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "collectedAmount", "CollectedAmount"])
    ?? rows.reduce((sum, row) => sum + (getNumber(row, ["paid", "Paid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid"]) || 0), 0);
  const due = getNumber(account, ["balance", "Balance", "outstanding", "Outstanding", "outstandingAmount", "OutstandingAmount", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount"])
    ?? Math.max(total - paid, 0);
  return {
    total,
    paid,
    due,
    nextDueDate: account.nextDueDate || account.NextDueDate || account.nextPaymentDate || account.NextPaymentDate || "-",
  };
};

export default function StudentDashboard() {
  const [greeting, setGreeting] = useState(getGreeting);
  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    const timer = window.setInterval(updateGreeting, 60000);
    window.addEventListener("focus", updateGreeting);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateGreeting);
    };
  }, []);
  const { profile, loading, error } = useStudentProfile();
  const [examinations, setExaminations] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examsError, setExamsError] = useState("");
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceError, setAttendanceError] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [resultError, setResultError] = useState("");
  const [feeSummary, setFeeSummary] = useState(null);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeError, setFeeError] = useState("");
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
  useEffect(() => {
    let active = true;
    const loadSummaryData = async () => {
      if (!profile?.studentId) return;
      const year = String(profile.academicYearName || "").match(/^(\d{4})/);
      const fromDate = String(profile.admissionDate || "").slice(0, 10) || `${year?.[1] || new Date().getFullYear()}-01-01`;
      const toDate = new Date().toISOString().slice(0, 10);
      const [attendanceResult, resultResponse] = await Promise.allSettled([
        getStudentAttendance(profile.studentId, fromDate, toDate),
        getStudentResult(profile),
      ]);
      if (!active) return;
      if (attendanceResult.status === "fulfilled") setAttendanceData(summarizeAttendance(attendanceResult.value));
      else setAttendanceError("Unable to load attendance summary.");
      if (resultResponse.status === "fulfilled") setLatestResult(unwrap(resultResponse.value));
      else setResultError("Unable to load latest result.");
    };
    if (!loading && profile?.studentId) loadSummaryData();
    return () => { active = false; };
  }, [loading, profile]);
  useEffect(() => {
    let active = true;
    const loadFees = async () => {
      if (!profile?.studentId) {
        if (!loading) setFeeLoading(false);
        return;
      }
      setFeeLoading(true);
      setFeeError("");
      const results = await Promise.allSettled([
        apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(profile.studentId)),
        apiClient.get(apiEndpoints.fee.studentFeeLedger(profile.studentId)),
      ]);
      if (!active) return;
      const [detailsResult, ledgerResult] = results;
      if (results.some((result) => result.status === "fulfilled")) {
        setFeeSummary(normalizeFeeSummary(
          detailsResult.status === "fulfilled" ? detailsResult.value.data : null,
          ledgerResult.status === "fulfilled" ? ledgerResult.value.data : null,
        ));
      } else {
        setFeeError("Unable to load fee summary.");
      }
      setFeeLoading(false);
    };
    if (!loading) loadFees();
    return () => { active = false; };
  }, [loading, profile?.studentId]);
  const upcomingSchedules = useMemo(() => examinations
    .flatMap((exam) => exam.schedules.map((schedule) => ({ exam, schedule })))
    .filter(({ schedule }) => String(schedule.examDate || "").slice(0, 10) >= new Date().toISOString().slice(0, 10))
    .sort((left, right) => String(left.schedule.examDate).localeCompare(String(right.schedule.examDate))), [examinations]);
  const formatExamDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const formatExamTime = (value) => String(value || "").slice(0, 5) || "—";
  if (error && !profile) return <div className="sp-page"><div className="sp-api-state is-error">{error}</div></div>;
  if (loading || examsLoading) return <div className="sp-page"><SkeletonDashboard cards={4} tableColumns={4}/></div>;
  const feeValue = (key) => feeLoading ? "..." : feeSummary ? money(feeSummary[key]) : "-";
  const feeDate = feeLoading ? "Loading..." : feeSummary?.nextDueDate || "-";
  const attendance = attendanceData || { percentage: "—", present: "—", absent: "—", workingDays: "—" };
  const publishedFlag = read(latestResult, "isPublished", "IsPublished");
  const resultPublished = publishedFlag != null ? publishedFlag === true : /^published$/i.test(String(read(latestResult, "status", "Status", "resultStatus", "ResultStatus") || ""));
  const resultRows = latestResult && resultPublished
    ? [[read(latestResult, "examName", "ExamName") || "Latest Exam", `${Number(read(latestResult, "percentage", "Percentage") || 0)}%`, read(latestResult, "overallGrade", "OverallGrade", "grade", "Grade") || "—", read(latestResult, "finalResult", "FinalResult", "resultStatus", "ResultStatus", "result", "Result", "status", "Status") || "Published"]]
    : [];
  return (
    <div className="sp-page sp-dashboard-page">
      <div className="sp-dashboard-greeting"><Sun size={42} aria-hidden="true" />
      <StudentPageHeader
        title={`${greeting}, ${studentName.split(" ")[0]}`}
        subtitle="Welcome back! Here's what's happening with your academics today."
      />
      </div>
      <section className="sp-student-strip">
        <span className="sp-avatar is-large">{initials}</span>
        <div className="sp-student-name"><strong>{studentName}</strong><small>Admission No: <b>{profile?.admissionNo || "Not Assigned"}</b></small></div>
        {[
          ["Roll No", profile?.rollNo || "Not Assigned", FileText],
          ["Academic Level", profile?.academicLevelName || "Not Assigned", GraduationCap],
          ["Group / Section", `${profile?.groupName || "Not Assigned"} • ${profile?.sectionName || "Not Assigned"}`, Users],
        ].map(([label, value, Icon]) => <div className="sp-student-detail" key={label}><span className="sp-dashboard-detail-icon"><Icon size={22} aria-hidden="true" /></span><div><small>{label}</small><strong>{value}</strong></div></div>)}
      </section>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={BookOpenCheck} label="Overall Attendance" value={attendanceData ? `${attendance.percentage}%` : "—"} note={attendanceError ? "Unable to load" : `${attendance.present} present · ${attendance.absent} absent`} />
        <StudentSummaryCard icon={IndianRupee} label="Fee Due" value={feeValue("due")} note={feeError ? "Unable to load fee data" : `Due ${feeDate}`} tone="orange" />
        <StudentSummaryCard icon={CalendarClock} label="Upcoming Exams" value={upcomingSchedules.length} note={upcomingSchedules[0] ? `Next on ${formatExamDate(upcomingSchedules[0].schedule.examDate)}` : "No upcoming exams"} tone="purple" />
        <StudentSummaryCard icon={Award} label="Latest Result" value={resultPublished ? `${Number(read(latestResult, "percentage", "Percentage") || 0)}%` : "—"} note={resultError ? "Unable to load" : resultPublished ? `Grade ${read(latestResult, "overallGrade", "OverallGrade", "grade", "Grade") || "—"}` : "No published result"} tone="red" />
      </section>
      <StudentCard title="Quick Actions" className="sp-dashboard-quick-actions">
        <div className="sp-dashboard-action-grid">
          {[
            ["My Profile", "View & update profile", "profile", profileIcon, "blue"],
            ["My Timetable", "View class schedule", "timetable", timetableIcon, "blue"],
            ["My Attendance", "Check attendance", "attendance", attendanceIcon, "green"],
            ["Examinations", "View exam schedule", "examinations", examinationIcon, "red"],
            ["Results", "View performance", "results", resultsIcon, "orange"],
            ["Fees", "View fee details", "fees", feeIcon, "blue"],
            ["Request Certificate", "Request certificates", "certificates", certificateIcon, "purple"],
          ].map(([title, description, route, icon, tone]) => <Link key={route} className={`sp-dashboard-action tone-${tone}`} title={description} to={route} state={route === "certificates" ? { openRequestCertificate: true } : undefined}><img src={icon} alt="" aria-hidden="true" /><strong>{title}</strong></Link>)}
        </div>
      </StudentCard>
      <StudentDashboardHighlights student={profile} upcomingSchedules={upcomingSchedules} examsError={examsError} formatExamDate={formatExamDate} formatExamTime={formatExamTime} />
      <div className="sp-dashboard-grid">
        <StudentCard title="Recent Results" action={<Link className="sp-text-link" to="results">View All →</Link>}>
          <StudentDataTable columns={["Exam", "Percentage", "Grade", "Status"]} rows={resultRows} statusColumns={[3]} empty={resultError || "No published results available."} />
        </StudentCard>
        <StudentCard title="Fee Summary" action={<Link className="sp-text-link" to="fees">View Details →</Link>}>
          <div className="sp-fee-overview">
            <div><span>Total Fee</span><strong>{feeValue("total")}</strong></div>
            <div><span>Paid</span><strong>{feeValue("paid")}</strong></div>
            <div><span>Due</span><strong>{feeValue("due")}</strong></div>
          </div>
          <p className="sp-muted">Next due date: {feeDate}</p>
        </StudentCard>
      </div>
    </div>
  );
}
