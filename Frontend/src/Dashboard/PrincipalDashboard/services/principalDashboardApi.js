import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const unwrap = (value, depth = 0) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 5) return value;
  for (const key of ["data", "Data", "result", "Result", "payload", "Payload"]) {
    if (value[key] !== undefined && value[key] !== value) return unwrap(value[key], depth + 1);
  }
  return value;
};

const rowsOf = (value) => {
  const payload = unwrap(value);
  if (Array.isArray(payload)) return payload;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "rows", "Rows", "$values"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const valueOf = (item, keys, fallback = undefined) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const numberOf = (item, keys, fallback = undefined) => {
  const value = valueOf(item, keys);
  return value !== undefined && Number.isFinite(Number(value)) ? Number(value) : fallback;
};

const textOf = (item, keys, fallback = "") => String(valueOf(item, keys, fallback) ?? fallback).trim();

const contextParams = ({ campusId, boardId, academicYearId, date }) => ({
  ...(campusId ? { campusId: Number(campusId) || campusId } : {}),
  ...(boardId ? { boardId: Number(boardId) || boardId } : {}),
  ...(academicYearId ? { academicYearId: Number(academicYearId) || academicYearId } : {}),
  ...(date ? { date } : {}),
});

const groupFeeCollection = (rows) => {
  const groups = new Map();
  rows.forEach((row) => {
    const rawDate = valueOf(row, ["paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt"]);
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
    const amount = numberOf(row, ["amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"], 0);
    groups.set(key, { label, value: (groups.get(key)?.value || 0) + amount });
  });
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, item]) => item).slice(-8);
};

const toClasses = (attendance) => rowsOf(attendance?.breakdown ?? attendance?.Breakdown).map((item, index) => ({
  className: textOf(item, ["categoryName", "CategoryName", "sectionName", "SectionName", "groupName", "GroupName", "label", "Label"], "Unassigned"),
  students: numberOf(item, ["totalStudents", "TotalStudents", "total", "Total", "studentsCount", "StudentsCount"], 0),
  present: numberOf(item, ["present", "Present", "presentCount", "PresentCount"], 0),
  absent: numberOf(item, ["absent", "Absent", "absentCount", "AbsentCount"], 0),
  tone: ["green", "blue", "violet", "amber", "teal"][index % 5],
}));

const toExams = (value) => rowsOf(value).map((item) => ({
  id: String(valueOf(item, ["id", "Id", "scheduleId", "ScheduleId", "examId", "ExamId"])),
  subject: textOf(item, ["subject", "Subject", "subjectName", "SubjectName", "examName", "ExamName", "name", "Name"], "Examination"),
  date: textOf(item, ["formattedDate", "FormattedDate", "date", "Date", "examDate", "ExamDate"]),
  time: textOf(item, ["time", "Time", "examTime", "ExamTime"]),
  classes: [textOf(item, ["academicLevelName", "AcademicLevelName"]), textOf(item, ["groupName", "GroupName"])].filter(Boolean).join(" "),
  room: textOf(item, ["hall", "Hall", "hallName", "HallName", "roomName", "RoomName"]),
  students: numberOf(item, ["studentCount", "StudentCount", "totalStudents", "TotalStudents"]),
})).slice(0, 5);

const toActivities = (value) => rowsOf(value).map((item) => {
  const entity = textOf(item, ["entityName", "EntityName", "action", "Action"]).toLowerCase();
  const icon = entity.includes("fee") || entity.includes("payment") ? "fees" : entity.includes("exam") ? "exam" : entity.includes("staff") ? "staff" : "student";
  const to = icon === "fees" ? "/dashboard/fee-structure" : icon === "exam" ? "/dashboard/examinations" : icon === "staff" ? "/dashboard/staff" : "/dashboard/students";
  return {
    id: String(valueOf(item, ["id", "Id", "auditLogId", "AuditLogId"])),
    title: textOf(item, ["title", "Title", "action", "Action"], "Activity"),
    description: textOf(item, ["description", "Description"], ""),
    time: textOf(item, ["timeAgo", "TimeAgo", "time", "Time", "createdAt", "CreatedAt"]),
    icon,
    tone: icon === "fees" ? "violet" : icon === "exam" ? "amber" : icon === "staff" ? "blue" : "green",
    to,
  };
}).slice(0, 5);

const settled = (result, fallback) => result.status === "fulfilled" ? result.value.data : fallback;

export async function getPrincipalDashboardData({ campusId, boardId, academicYearId, endDate }) {
  const params = contextParams({ campusId, boardId, academicYearId, date: endDate });
  const responses = await Promise.allSettled([
    apiClient.get(apiEndpoints.dashboard.summary, { params }),
    apiClient.get(apiEndpoints.dashboard.studentAttendance, { params: { ...params, viewBy: "Section" } }),
    apiClient.get(apiEndpoints.dashboard.staffAttendance, { params: { ...params, staffType: "All Staff" } }),
    apiClient.get(apiEndpoints.dashboard.upcomingExaminations, { params }),
    apiClient.get(apiEndpoints.dashboard.highlights, { params }),
    apiClient.get(apiEndpoints.dashboard.recentActivity, { params: { limit: 5 } }),
    apiClient.get(apiEndpoints.fee.dashboard, { params: contextParams({ campusId, boardId, academicYearId }) }),
    apiClient.get(apiEndpoints.fee.collection, { params: contextParams({ campusId, boardId, academicYearId }) }),
    apiClient.get(apiEndpoints.results.statistics, { params: contextParams({ campusId, boardId, academicYearId }) }),
  ]);

  const [summaryResult, studentAttendanceResult, staffAttendanceResult, examsResult, highlightsResult, activitiesResult, feeResult, paymentsResult, resultStatsResult] = responses;
  const summary = unwrap(settled(summaryResult, {})) || {};
  const studentAttendance = unwrap(settled(studentAttendanceResult, {})) || {};
  const staffAttendance = unwrap(settled(staffAttendanceResult, {})) || {};
  const fee = unwrap(settled(feeResult, {})) || {};
  const highlights = unwrap(settled(highlightsResult, {})) || {};
  const resultStats = unwrap(settled(resultStatsResult, {})) || {};
  const present = numberOf(studentAttendance, ["present", "Present", "presentCount", "PresentCount"], 0);
  const absent = numberOf(studentAttendance, ["absent", "Absent", "absentCount", "AbsentCount"], 0);
  const halfDay = numberOf(studentAttendance, ["halfDay", "HalfDay", "late", "Late", "halfDayCount", "HalfDayCount"], 0);
  const staffPresent = numberOf(staffAttendance, ["present", "Present", "presentCount", "PresentCount"], 0);
  const staffAbsent = numberOf(staffAttendance, ["absent", "Absent", "absentCount", "AbsentCount"], 0);
  const staffLeave = numberOf(staffAttendance, ["onLeave", "OnLeave", "leaveCount", "LeaveCount"], 0);
  const exams = toExams(settled(examsResult, []));
  const classes = toClasses(studentAttendance);
  const feeCollected = numberOf(fee, ["totalCollected", "TotalCollected", "collected", "Collected", "totalPaid", "TotalPaid"]);
  const feePending = numberOf(fee, ["totalOutstanding", "TotalOutstanding", "outstanding", "Outstanding", "pendingAmount", "PendingAmount", "dueFees", "DueFees"]);
  const collectionRate = feeCollected !== undefined && feePending !== undefined && feeCollected + feePending > 0 ? (feeCollected / (feeCollected + feePending)) * 100 : undefined;
  const passPercentage = numberOf(resultStats, ["passPercentage", "PassPercentage", "overallPassPercentage", "OverallPassPercentage"]);

  return {
    partial: responses.some((result) => result.status === "rejected"),
    studentCount: numberOf(summary, ["totalStudents", "TotalStudents", "studentCount", "StudentCount"], 0),
    staffCount: numberOf(summary, ["totalStaff", "TotalStaff"], 0),
    attendance: {
      present,
      absent,
      leave: halfDay,
      total: numberOf(studentAttendance, ["totalStudents", "TotalStudents", "total", "Total", "totalCount", "TotalCount"], present + absent + halfDay),
      percentage: numberOf(studentAttendance, ["attendancePercentage", "AttendancePercentage", "percentage", "Percentage"]),
    },
    staffAttendance: {
      present: staffPresent,
      absent: staffAbsent,
      leave: staffLeave,
      total: numberOf(staffAttendance, ["totalStaff", "TotalStaff", "total", "Total", "totalCount", "TotalCount"], staffPresent + staffAbsent + staffLeave),
      percentage: numberOf(staffAttendance, ["attendancePercentage", "AttendancePercentage", "percentage", "Percentage"]),
    },
    passPercentage,
    performance: passPercentage === undefined ? [] : [{ label: "Overall", current: passPercentage }],
    classOverview: classes,
    exams,
    activities: toActivities(settled(activitiesResult, [])),
    notices: [],
    fees: { collected: feeCollected, pending: feePending, collectionRate, chart: groupFeeCollection(rowsOf(settled(paymentsResult, []))) },
    activeClasses: numberOf(summary, ["totalSections", "TotalSections", "sectionsCount", "SectionsCount"], classes.length),
    upcomingExamCount: numberOf(summary, ["upcomingExams", "UpcomingExams", "upcomingExaminations", "UpcomingExaminations"], exams.length),
    admissions: numberOf(highlights, ["admissionsToday", "AdmissionsToday", "admissions", "Admissions"], 0),
  };
}
