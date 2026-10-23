import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getStudentOverviewMetrics } from "@/api/studentApi.js";
import { summarizeStudentAttendance } from "@/components/pages/dashboardStudentAttendance.js";

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

const resolvedResult = (result, fallback = null) => (
  result.status === "fulfilled" ? unwrap(result.value?.data) ?? fallback : fallback
);

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

const toClasses = (breakdownList = []) => breakdownList.map((item, index) => ({
  className: textOf(item, ["name", "sectionName", "categoryName", "groupName", "label"], "Unassigned"),
  students: numberOf(item, ["total", "totalStudents", "studentsCount"], 0),
  present: numberOf(item, ["present", "presentCount"], 0),
  absent: numberOf(item, ["absent", "absentCount"], 0),
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

const activeStaffCount = (payload) => rowsOf(payload)
  .filter((row) => !row?.status || row.status === "Active").length;

const summarizeStaffAttendance = (payload) => {
  if (payload?.success === false || payload?.Success === false) {
    throw new Error(payload.message || payload.Message || "Unable to load staff attendance.");
  }
  const data = payload?.data ?? payload?.Data ?? payload;
  const rows = Array.isArray(data) ? data : data?.items ?? data?.Items ?? data?.records;
  if (!Array.isArray(rows)) throw new Error("The staff attendance API returned an unsupported response.");

  const labels = { 1: "Present", 2: "Absent", 3: "Late", 4: "Leave", 5: "Holiday" };
  const statusOf = (value) => labels[value] ?? ({ present: "Present", absent: "Absent", late: "Late", leave: "Leave", onleave: "Leave", holiday: "Holiday" })[
    String(value ?? "").toLowerCase().replace(/[\s_-]/g, "")
  ];

  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;
  rows.forEach((row) => {
    const status = statusOf(row.status ?? row.Status);
    if (status === "Present") present += 1;
    else if (status === "Absent") absent += 1;
    else if (status === "Late") late += 1;
    else if (status === "Leave") leave += 1;
  });
  const total = rows.length;
  return { present, absent, late, leave, total, percentage: total ? Math.round(((present + 0.5 * late) * 100) / total) : 0 };
};

const toNotices = (value) => rowsOf(value).map((notice, index) => ({
  id: textOf(notice, ["id", "Id"], `notice-${index}`),
  title: textOf(notice, ["title", "Title"], "Notice"),
  description: textOf(notice, ["description", "Description"], ""),
  date: textOf(notice, ["date", "Date"], ""),
  type: textOf(notice, ["type", "Type"], "Notice"),
  priority: textOf(notice, ["priority", "Priority"], "Normal").toLowerCase(),
}));

export async function getPrincipalDashboardData({ campusId, boardId, academicYearId, endDate }) {
  const todayParams = contextParams({ campusId, boardId, academicYearId, date: endDate });
  const contextOnlyParams = contextParams({ campusId, boardId, academicYearId });
  const staffParams = {
    BoardId: boardId || undefined,
    CampusId: campusId || undefined,
    PageNumber: 1,
    PageSize: 10000,
  };

  // Common metrics use the same sources and calculations as Admin Dashboard.
  const results = await Promise.allSettled([
    apiClient.get(apiEndpoints.dashboard.principal, { params: todayParams }),
    apiClient.get(apiEndpoints.dashboard.summary, { params: todayParams }),
    getStudentOverviewMetrics({ campusId, boardId, academicYearId }),
    apiClient.get("/api/v1/attendance/admin/students", { params: todayParams }),
    apiClient.post("/api/v1/staff-attendance/load", todayParams),
    apiClient.get("/api/v1/staff", { params: staffParams }),
    apiClient.get(apiEndpoints.dashboard.upcomingExaminations, { params: contextOnlyParams }),
    apiClient.get(apiEndpoints.dashboard.highlights, { params: todayParams }),
    apiClient.get(apiEndpoints.dashboard.recentActivity, { params: { ...contextOnlyParams, limit: 5 } }),
    apiClient.get(apiEndpoints.fee.dashboard, { params: contextOnlyParams }),
    apiClient.get(apiEndpoints.fee.collection, { params: contextOnlyParams }),
    apiClient.get(apiEndpoints.results.statistics, { params: contextOnlyParams }),
  ]);

  const [principalResult, summaryResult, studentsResult, studentAttendanceResult, staffAttendanceResult, staffResult, examsResult, highlightsResult, activitiesResult, feeResult, paymentsResult, resultStatsResult] = results;
  const principalData = resolvedResult(principalResult, {}) || {};
  const summary = resolvedResult(summaryResult, {}) || {};
  const studentMetrics = studentsResult.status === "fulfilled" ? studentsResult.value : null;
  const highlights = resolvedResult(highlightsResult, {}) || {};
  const fee = resolvedResult(feeResult, {}) || {};
  const resultStats = resolvedResult(resultStatsResult, {}) || {};

  let studentAttendance = null;
  if (studentAttendanceResult.status === "fulfilled") {
    try {
      studentAttendance = summarizeStudentAttendance(studentAttendanceResult.value.data, "Section");
    } catch {
      studentAttendance = null;
    }
  }

  let staffAttendance = null;
  if (staffAttendanceResult.status === "fulfilled") {
    try {
      staffAttendance = summarizeStaffAttendance(staffAttendanceResult.value.data);
    } catch {
      staffAttendance = null;
    }
  }

  const studentTotal = studentMetrics?.totalStudents ?? numberOf(summary, ["totalStudents", "TotalStudents", "studentCount", "StudentCount"], 0);
  const staffTotal = staffResult.status === "fulfilled"
    ? activeStaffCount(staffResult.value.data)
    : numberOf(summary, ["totalStaff", "TotalStaff"], 0);
  const fallbackStudentAttendance = unwrap(principalData.studentAttendance) || {};
  const fallbackStaffAttendance = unwrap(principalData.staffAttendance) || {};
  const attendance = studentAttendance ? {
    present: studentAttendance.present,
    absent: studentAttendance.absent,
    leave: studentAttendance.halfDay,
    total: studentAttendance.total,
    percentage: studentAttendance.percentage,
  } : {
    present: numberOf(fallbackStudentAttendance, ["present", "Present", "presentCount", "PresentCount"], 0),
    absent: numberOf(fallbackStudentAttendance, ["absent", "Absent", "absentCount", "AbsentCount"], 0),
    leave: numberOf(fallbackStudentAttendance, ["halfDay", "HalfDay", "late", "Late", "halfDayCount", "HalfDayCount"], 0),
    total: numberOf(fallbackStudentAttendance, ["totalStudents", "TotalStudents", "total", "Total", "totalCount", "TotalCount"], 0),
    percentage: numberOf(fallbackStudentAttendance, ["attendancePercentage", "AttendancePercentage", "percentage", "Percentage"]),
  };
  const staff = staffAttendance ? {
    present: staffAttendance.present,
    absent: staffAttendance.absent,
    leave: staffAttendance.leave + staffAttendance.late,
    total: staffAttendance.total,
    percentage: staffAttendance.percentage,
  } : {
    present: numberOf(fallbackStaffAttendance, ["present", "Present", "presentCount", "PresentCount"], 0),
    absent: numberOf(fallbackStaffAttendance, ["absent", "Absent", "absentCount", "AbsentCount"], 0),
    leave: numberOf(fallbackStaffAttendance, ["onLeave", "OnLeave", "leaveCount", "LeaveCount"], 0),
    total: numberOf(fallbackStaffAttendance, ["totalStaff", "TotalStaff", "total", "Total", "totalCount", "TotalCount"], 0),
    percentage: numberOf(fallbackStaffAttendance, ["attendancePercentage", "AttendancePercentage", "percentage", "Percentage"]),
  };

  const feeCollected = numberOf(fee, ["totalCollected", "TotalCollected", "collected", "Collected", "totalPaid", "TotalPaid"]);
  const feePending = numberOf(fee, ["totalOutstanding", "TotalOutstanding", "outstanding", "Outstanding", "pendingAmount", "PendingAmount", "dueFees", "DueFees"]);
  const collectionRate = feeCollected !== undefined && feePending !== undefined && feeCollected + feePending > 0
    ? (feeCollected / (feeCollected + feePending)) * 100
    : numberOf(fee, ["collectionPercentage", "CollectionPercentage"]);
  const passPercentage = numberOf(resultStats, ["passPercentage", "PassPercentage", "overallPassPercentage", "OverallPassPercentage"]);
  const performanceStreams = rowsOf(principalData.performanceStreams);
  const performance = performanceStreams.length
    ? performanceStreams.map((stream) => ({
        label: textOf(stream, ["label", "Label", "streamName", "StreamName"]),
        current: numberOf(stream, ["current", "Current", "passPercentage", "PassPercentage"], 85),
        previous: numberOf(stream, ["previous", "Previous"], 80),
      }))
    : (passPercentage === undefined ? [] : [{ label: "Overall", current: passPercentage }]);
  const exams = toExams(resolvedResult(examsResult, []));
  const classes = studentAttendance ? toClasses(studentAttendance.breakdownList) : [];

  return {
    partial: results.some((result) => result.status === "rejected"),
    studentCount: studentTotal,
    staffCount: staffTotal,
    studentsGrowth: numberOf(summary, ["studentsVsLastYearPercentage", "StudentsVsLastYearPercentage"]),
    staffGrowth: numberOf(summary, ["staffVsLastYearPercentage", "StaffVsLastYearPercentage"]),
    attendance,
    staffAttendance: staff,
    passPercentage,
    performance,
    classOverview: classes,
    exams,
    activities: toActivities(resolvedResult(activitiesResult, [])),
    notices: toNotices(principalData.notices),
    fees: {
      collected: feeCollected,
      pending: feePending,
      collectionRate,
      chart: groupFeeCollection(rowsOf(resolvedResult(paymentsResult, []))),
    },
    activeClasses: numberOf(summary, ["totalSections", "TotalSections", "sectionsCount", "SectionsCount"], classes.length),
    upcomingExamCount: numberOf(summary, ["upcomingExams", "UpcomingExams", "upcomingExaminations", "UpcomingExaminations"], exams.length),
    admissions: numberOf(highlights, ["admissionsToday", "AdmissionsToday", "admissions", "Admissions"], 0),
  };
}
