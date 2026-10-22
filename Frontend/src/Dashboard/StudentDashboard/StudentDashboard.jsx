import { useEffect, useMemo, useState } from "react";
import {  Award, BookOpenCheck, CalendarClock, CalendarDays, IndianRupee, CheckCircle2, GraduationCap, Users, FileText, X , Sun, Clock3, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import studentApiEndpoints from "./api/studentApiEndpoints.js";
import "./StudentDashboard.css";
import { SkeletonDashboard } from "@/components/common/Ui.jsx";
import StudentCard from "./components/StudentCard.jsx";
import StudentDataTable from "./components/StudentDataTable.jsx";
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

const getUpcomingDashboardExams = (examinations, today) => {
  const dateOnly = (value) => {
    const date = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ? date : "";
  };
  const upcoming = new Map();
  examinations.forEach((exam) => {
    if (!["SCHEDULED", "PUBLISHED", "ONGOING"].includes(String(exam.status || "").trim().toUpperCase())) return;
    const scheduleDates = (exam.schedules || []).map((schedule) => dateOnly(schedule.examDate)).filter(Boolean).sort();
    const firstDate = dateOnly(exam.startDate) || scheduleDates[0];
    const lastDate = dateOnly(exam.endDate) || scheduleDates[scheduleDates.length - 1] || firstDate;
    // Upcoming exams exist independently of whether subjects have been scheduled.
    if (!firstDate || !lastDate || lastDate < today) return;
    const nextDate = firstDate >= today ? firstDate : scheduleDates.find((date) => date >= today) || today;
    const key = exam.examinationId || exam.examId || exam.id || exam.examCode || exam;
    upcoming.set(key, { exam, firstDate, lastDate, nextDate });
  });
  return [...upcoming.values()].sort((left, right) => left.nextDate.localeCompare(right.nextDate));
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
  const { profile, loading, error, activeAlerts = [], markAsRead, dismissNotification } = useStudentProfile() || {};
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
  const dashboardToday = dateKey(new Date());
  const upcomingExams = useMemo(() => getUpcomingDashboardExams(examinations, dashboardToday), [examinations, dashboardToday]);
  const formatExamDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  if (error && !profile) return <div className="sp-page"><div className="sp-api-state is-error">{error}</div></div>;
  if (loading || examsLoading) return <div className="sp-page"><SkeletonDashboard cards={4} tableColumns={4}/></div>;
  const feeValue = (key) => feeLoading ? "..." : feeSummary ? money(feeSummary[key]) : "-";
  const feeDate = feeLoading ? "Loading..." : feeSummary?.nextDueDate || "-";
  const attendance = attendanceData || { percentage: "—", present: "—", absent: "—", workingDays: "—" };
  const resultRows = latestResult && read(latestResult, "isPublished", "IsPublished") !== false
    ? [[read(latestResult, "examName", "ExamName") || "Latest Exam", `${Number(read(latestResult, "percentage", "Percentage") || 0)}%`, read(latestResult, "overallGrade", "OverallGrade", "grade", "Grade") || "—", read(latestResult, "finalResult", "FinalResult", "resultStatus", "ResultStatus", "status", "Status") || "Published"]]
    : [];
  return (
    <div className="sp-page sp-dashboard-page">

      <div className="sp-dashboard-greeting">
        <h1 className="sp-dashboard-greeting-title"><span className="sp-dashboard-greeting-emoji" aria-hidden="true">{greeting === "Good Morning" ? "🌅" : greeting === "Good Afternoon" ? "☀️" : "🌙"}</span> {greeting}, {studentName.split(" ")[0]}!</h1>
        <p className="sp-dashboard-greeting-sub">Welcome back! Here's what's happening with your academics today.</p>
      </div>
      {activeAlerts?.length > 0 && (
        <div className={`sp-cert-alert-card is-${String(activeAlerts[0].status).toLowerCase()}`} role="alert">
          <div className="sp-cert-alert-icon">
            <Award size={22} />
          </div>
          <div className="sp-cert-alert-body">
            <div className="sp-cert-alert-title">
              <strong>Certificate ${activeAlerts[0].status}!</strong>
              <span className="sp-cert-alert-tag">${activeAlerts[0].certificateType}</span>
            </div>
            <p>${activeAlerts[0].message}</p>
          </div>
          <div className="sp-cert-alert-actions">
            <Link
              to={activeAlerts[0].to || "/student-dashboard/certificates"}
              className="sp-btn primary"
              onClick={() => markAsRead?.(activeAlerts[0].id)}
            >
              {activeAlerts[0].status === "Issued" ? "Download Certificate" : "View Status"}
            </Link>
            <button
              type="button"
              className="sp-icon-btn sp-alert-close-btn"
              title="Dismiss notification"
              aria-label="Dismiss notification"
              onClick={() => dismissNotification?.(activeAlerts[0].id)}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
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

        <StudentSummaryCard icon={CalendarClock} label="Upcoming Exams" value={upcomingExams.length} note={upcomingExams[0] ? `Next on ${formatExamDate(upcomingExams[0].nextDate)}` : "No upcoming exams"} tone="purple" />
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
          ].map(([title, description, route, icon, tone]) => <Link key={route} className={`sp-dashboard-action tone-${tone}`} to={route} state={route === "certificates" ? { openRequestCertificate: true } : undefined}><img src={icon} alt="" aria-hidden="true" /><strong>{title}</strong><small>{description}</small></Link>)}
        </div>
      </StudentCard>

      <StudentDashboardHighlights student={profile} upcomingExams={upcomingExams} examsError={examsError} formatExamDate={formatExamDate} />
      <div className="sp-dashboard-grid">
        <StudentCard className="sp-dashboard-results" title="Recent Results" action={<Link className="sp-text-link" to="results">View All →</Link>}>
          <div className="sp-dashboard-results-scroll" role="region" aria-label="Recent results" tabIndex={0}>
            <StudentDataTable columns={["Exam", "Percentage", "Grade", "Status"]} rows={resultRows} statusColumns={[3]} empty={resultError || "No published results available."} />
          </div>
        </StudentCard>
        <StudentCard className="sp-dashboard-fees" title="Fee Summary" action={<Link className="sp-text-link" to="fees">View Details →</Link>}>
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


// Dashboard home: monthly attendance, upcoming holidays and examinations.
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const highlightRead = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const status = (value) => ({ 1: "Present", 2: "Absent", 4: "Half Day", 5: "Holiday", P: "Present", A: "Absent" }[value] || value);
const holidayTone = (type) => /national/i.test(String(type)) ? "orange" : /festival/i.test(String(type)) ? "violet" : "cyan";
const examTone = (exam) => /objective/i.test(String(exam.examCategory || exam.category || "")) ? "blue" : "violet";
const rowsFrom = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(data) ? data : data?.items || data?.Items || data?.records || data?.holidays || data?.Holidays || [];
};

function StudentDashboardHighlights({ student, upcomingExams, examsError, formatExamDate }) {
  const [attendance, setAttendance] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [holidayError, setHolidayError] = useState("");
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const today = dateKey(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  useEffect(() => {
    let active = true;
    if (!student?.studentId) return;
    setLoading(true); setAttendance(null); setAttendanceError(""); setHolidayError(""); setHolidays([]);
    Promise.allSettled([
      getStudentAttendance(student.studentId, monthStart, today),
      apiClient.get(studentApiEndpoints.holidays.list, { params: { CampusId: student.campusId, AcademicYearId: student.academicYearId, BoardId: student.boardId, Page: 1, PageSize: 100 } }),
    ]).then(([attendanceResponse, holidaysResponse]) => {
      if (!active) return;
      if (attendanceResponse.status === "fulfilled") {
        const counts = { present: 0, absent: 0, halfDay: 0 };
        const days = new Map(rowsFrom(attendanceResponse.value).map((row) => [String(highlightRead(row, "attendanceDate", "date") || "").slice(0, 10), row]));
        days.forEach((row, date) => {
          if (!date || date < monthStart || date > today) return;
          const morning = status(highlightRead(row, "morningStatus", "morningAttendanceStatus", "morningSessionStatus", "morning", "morningAttendance", "MorningStatus"));
          const afternoon = status(highlightRead(row, "afternoonStatus", "afternoonAttendanceStatus", "afternoonSessionStatus", "afternoon", "afternoonAttendance", "AfternoonStatus"));
          if (morning === "Present" && afternoon === "Present") counts.present += 1;
          else if (morning === "Absent" && afternoon === "Absent") counts.absent += 1;
          else if ((morning === "Present" && afternoon === "Absent") || (morning === "Absent" && afternoon === "Present") || morning === "Half Day" || afternoon === "Half Day") counts.halfDay += 1;
        });
        counts.days = counts.present + counts.absent + counts.halfDay;
        counts.percentage = counts.days ? Math.round((counts.present + counts.halfDay * .5) / counts.days * 100) : null;
        setAttendance(counts);
      } else setAttendanceError("Unable to load monthly attendance.");
      if (holidaysResponse.status === "fulfilled") setHolidays(rowsFrom(holidaysResponse.value));
      else setHolidayError("Unable to load upcoming holidays.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [student, monthStart, today]);
  const upcomingHolidays = holidays.map((row) => ({
    name: highlightRead(row, "holidayName", "HolidayName", "name", "Name", "title", "Title") || "Holiday",
    date: String(highlightRead(row, "startDate", "StartDate", "holidayDate", "HolidayDate", "date", "Date", "fromDate", "FromDate") || "").slice(0, 10),
    endDate: String(highlightRead(row, "endDate", "EndDate", "toDate", "ToDate") || "").slice(0, 10),
    type: highlightRead(row, "holidayType", "HolidayType", "type", "Type"),
  })).filter((row) => row.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const daysUntil = (date) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  const holidayDuration = (row) => {
    const duration = Math.round((Date.parse(`${row.endDate || row.date}T00:00:00Z`) - Date.parse(`${row.date}T00:00:00Z`)) / 86400000) + 1;
    return Number.isFinite(duration) && duration > 0 ? `${duration} ${duration === 1 ? "Day" : "Days"}` : "";
  };
  const holidayWeekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
  const segments = [["Present", attendance?.present || 0, "#1aa54b"], ["Absent", attendance?.absent || 0, "#ef4560"], ["Half Day", attendance?.halfDay || 0, "#f59e0b"]];
  let offset = 0;
  return <div className="sp-dashboard-highlights">
    <StudentCard title="Monthly Attendance" subtitle={now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} action={<Link className="sp-text-link" to="attendance">View Details →</Link>}>
      {loading || attendanceError ? <p className="sp-highlight-empty" role="status">{loading ? "Loading attendance…" : attendanceError}</p> : <>
        <div className="sp-monthly-chart"><svg viewBox="0 0 120 120" role="img" aria-label={attendance?.days ? `Monthly attendance ${attendance.percentage} percent; ${attendance.present} present, ${attendance.absent} absent, ${attendance.halfDay} half days` : "No marked attendance this month"}>
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--sp-border)" strokeWidth="12" />
          {segments.map(([label, count, color]) => { const length = attendance?.days ? count / attendance.days * 100 : 0; const start = offset; offset += length; return <circle key={label} cx="60" cy="60" r="44" fill="none" stroke={color} strokeWidth="12" pathLength="100" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />; })}
          <text x="60" y="59" textAnchor="middle" className="sp-chart-value">{attendance?.percentage != null ? `${attendance.percentage}%` : "—"}</text><text x="60" y="74" textAnchor="middle" className="sp-chart-label">ATTENDANCE</text>
        </svg><div className="sp-chart-legend">{segments.map(([label, count, color]) => <div key={label}><i style={{ background: color }} /><span>{label}</span><strong>{count}</strong></div>)}</div></div>
        <div className="sp-monthly-chart-counts">{[["Marked Days", attendance?.days || 0], ...segments.map(([label, count]) => [label, count])].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
        {!attendance?.days && <p className="sp-highlight-empty">No complete attendance records for this month.</p>}
      </>}
    </StudentCard>
    <StudentCard className="sp-upcoming-card" title={`Upcoming Holidays${!loading && !holidayError ? ` (${upcomingHolidays.length})` : ""}`} action={<Link className="sp-text-link" to="holidays">View All →</Link>}>
      <div className="sp-highlight-list">{loading || holidayError ? <p className="sp-highlight-empty">{loading ? "Loading holidays…" : holidayError}</p> : upcomingHolidays.length ? upcomingHolidays.map((row, index) => <article data-tone={holidayTone(row.type)} key={`${row.date}-${row.name}-${index}`}><CalendarDays className="sp-highlight-holiday-icon" size={20} /><div><div className="sp-highlight-title"><strong>{row.name}</strong>{row.type && <span className="sp-highlight-tag">{row.type}</span>}</div><p className="sp-highlight-meta"><span>{row.date} · {holidayWeekday(row.date)}</span>{holidayDuration(row) ? <span className="sp-highlight-duration">{holidayDuration(row)}</span> : null}</p></div><small>{daysUntil(row.date) ? `In ${daysUntil(row.date)} Days` : "Today"}</small></article>) : <p className="sp-highlight-empty">No upcoming holidays.</p>}</div>
    </StudentCard>
    <StudentCard className="sp-upcoming-card" title={`Upcoming Examinations${!examsError ? ` (${upcomingExams.length})` : ""}`} action={<Link className="sp-text-link" to="examinations">View All →</Link>}>
      <div className="sp-highlight-list">{examsError ? <p className="sp-highlight-empty">{examsError}</p> : upcomingExams.length ? upcomingExams.map(({ exam, nextDate, firstDate, lastDate }, index) => <article data-tone={examTone(exam)} key={exam.examinationId || exam.examId || exam.id || exam.examCode || index}><CalendarDays size={20} /><div><div className="sp-highlight-title"><strong>{exam.examName || exam.examinationName}</strong>{(exam.examCode || exam.code) ? <span className="sp-highlight-tag">{exam.examCode || exam.code}</span> : null}</div><p>{student?.groupName ? `${student.groupName} · ` : ""}{formatExamDate(exam.startDate || firstDate)} - {formatExamDate(exam.endDate || lastDate)}</p></div><small>{daysUntil(nextDate) ? `In ${daysUntil(nextDate)} Days` : "Today"}</small></article>) : <p className="sp-highlight-empty">No upcoming examinations.</p>}</div>
    </StudentCard>
  </div>;
}
