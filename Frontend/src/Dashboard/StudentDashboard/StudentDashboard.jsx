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
import { attendance, results } from "./data/studentMockData.js";
import { useStudentProfile } from "./context/StudentProfileContext.jsx";
import { getStudentExaminations } from "./services/studentAcademicService.js";

const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

const getObject = (payload) => {
  let value = payload?.data ?? payload?.Data ?? payload;
  if (value?.data && !Array.isArray(value.data)) value = value.data;
  if (value?.Data && !Array.isArray(value.Data)) value = value.Data;
  return value && !Array.isArray(value) ? value : {};
};

const getRows = (payload) => {
  const value = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
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
        <StudentSummaryCard icon={IndianRupee} label="Fee Due" value={feeValue("due")} note={feeError ? "Unable to load fee data" : `Due ${feeDate}`} tone="orange" />
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
