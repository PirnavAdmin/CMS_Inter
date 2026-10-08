import { useEffect, useMemo, useState } from "react";
import { Award, BookOpenCheck, CalendarClock, IndianRupee } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonDashboard } from "@/components/common/Ui.jsx";
import StudentCard from "./components/StudentCard.jsx";
import StudentDataTable from "./components/StudentDataTable.jsx";
import StudentPageHeader from "./components/StudentPageHeader.jsx";
import StudentSummaryCard from "./components/StudentSummaryCard.jsx";
import { useStudentProfile } from "./context/StudentProfileContext.jsx";
import { getStudentAttendance, getStudentExaminations, getStudentResult } from "./services/studentAcademicService.js";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

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
    if (nested == null || nested === value) break;
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
    if (nested == null || nested === value) break;
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
  const resultRows = latestResult && read(latestResult, "isPublished", "IsPublished") !== false
    ? [[read(latestResult, "examName", "ExamName") || "Latest Exam", `${Number(read(latestResult, "percentage", "Percentage") || 0)}%`, read(latestResult, "overallGrade", "OverallGrade", "grade", "Grade") || "—", read(latestResult, "finalResult", "FinalResult", "resultStatus", "ResultStatus", "status", "Status") || "Published"]]
    : [];
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
        <StudentSummaryCard icon={BookOpenCheck} label="Overall Attendance" value={attendanceData ? `${attendance.percentage}%` : "—"} note={attendanceError ? "Unable to load" : `${attendance.present} present · ${attendance.absent} absent`} />
        <StudentSummaryCard icon={IndianRupee} label="Fee Due" value={feeValue("due")} note={feeError ? "Unable to load fee data" : `Due ${feeDate}`} tone="orange" />
        <StudentSummaryCard icon={CalendarClock} label="Upcoming Exams" value={upcomingSchedules.length} note={upcomingSchedules[0] ? `Next on ${formatExamDate(upcomingSchedules[0].schedule.examDate)}` : "No upcoming exams"} tone="purple" />
        <StudentSummaryCard icon={Award} label="Latest Result" value={latestResult ? `${Number(read(latestResult, "percentage", "Percentage") || 0)}%` : "—"} note={resultError ? "Unable to load" : latestResult ? `Grade ${read(latestResult, "overallGrade", "OverallGrade", "grade", "Grade") || "—"}` : "No published result"} tone="red" />
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
          <StudentDataTable columns={["Exam", "%", "Grade", "Status"]} rows={resultRows} statusColumns={[3]} empty={resultError || "No published results available."} />
        </StudentCard>
        <StudentCard title="Fee Summary">
          <div className="sp-fee-overview">
            <div><span>Total</span><strong>{feeValue("total")}</strong></div>
            <div><span>Paid</span><strong>{feeValue("paid")}</strong></div>
            <div><span>Due</span><strong>{feeValue("due")}</strong></div>
          </div>
          <p className="sp-muted">Next due date: {feeDate}</p>
          <Link className="sp-text-link" to="fees">View fee details →</Link>
        </StudentCard>
      </div>
    </div>
  );
}
