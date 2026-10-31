import axios from "axios";
import sharedApiClient from "@/api/axios.js";
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

// Match Admin Dashboard behavior: dashboard requests must use the live API,
// even when the shared client would otherwise select the demo/mock adapter.
const serverConfig = (config = {}) => ({
  ...config,
  _isMockFallback: true,
  transformRequest: [
    ...sharedApiClient.defaults.transformRequest,
    function requireServer(data) {
      this.adapter = axios.getAdapter(["xhr", "http", "fetch"]);
      return data;
    },
  ],
});
const apiClient = {
  get: (url, config) => sharedApiClient.get(url, serverConfig(config)),
  post: (url, data, config) => sharedApiClient.post(url, data, serverConfig(config)),
};

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

// Keep this in sync with DashboardPage.fetchSummary.
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
  if (campusId === undefined || campusId === null || campusId === "") {
    throw new Error("The principal's assigned campus is not available.");
  }
  const todayParams = contextParams({ campusId, boardId, academicYearId, date: endDate });
  const contextOnlyParams = contextParams({ campusId, boardId, academicYearId });

  // Consolidated principal dashboard snapshot: unified endpoint returns KPIs,
  // student/staff attendance, upcoming exams, fee collection summary & chart, notices, and stream metrics in 1 call.
  const results = await Promise.allSettled([
    apiClient.get(apiEndpoints.dashboard.principal, { params: todayParams }),
    apiClient.get(apiEndpoints.dashboard.recentActivity, { params: { ...contextOnlyParams, limit: 5 } }),
  ]);

  const [principalResult, activitiesResult] = results;
  const principalData = resolvedResult(principalResult, {}) || {};
  const summary = principalData.summary || {};

  const studentAttData = principalData.studentAttendance || {};
  const attendance = {
    present: studentAttData.present,
    absent: studentAttData.absent,
    leave: studentAttData.halfDay ?? studentAttData.late,
    total: studentAttData.totalStudents ?? studentAttData.total,
    percentage: studentAttData.attendancePercentage ?? studentAttData.percentage,
  };

  const staffAttData = principalData.staffAttendance || {};
  const staff = {
    present: staffAttData.present,
    absent: staffAttData.absent,
    late: staffAttData.late,
    leave: staffAttData.onLeave,
    total: staffAttData.totalStaff ?? staffAttData.total,
    percentage: staffAttData.attendancePercentage ?? staffAttData.percentage,
  };

  const studentTotal = principalData.studentCount ?? numberOf(summary, ["totalStudents", "TotalStudents", "studentCount", "StudentCount"]);
  const staffTotal = principalData.staffCount ?? (summary.totalStaff || (summary.teachingStaff + summary.nonTeachingStaff));

  const backendFee = principalData.fees || {};
  const feeCollected = numberOf(backendFee, ["collected", "totalCollected", "Collected", "totalPaid", "TotalPaid"], 0);
  const feePending = numberOf(backendFee, ["pending", "totalOutstanding", "Pending", "dueFees", "DueFees"], 0);
  const collectionRate = numberOf(backendFee, ["collectionRate", "collectionPercentage", "CollectionRate"],
    feeCollected + feePending > 0 ? (feeCollected / (feeCollected + feePending)) * 100 : 0
  );
  const feeChart = (Array.isArray(backendFee.chart) && backendFee.chart.length > 0)
    ? backendFee.chart
    : [];

  const passPercentage = principalData.passPercentage;
  const performanceStreams = rowsOf(principalData.performanceStreams);
  const performance = performanceStreams.length
    ? performanceStreams.map((stream) => ({
        label: textOf(stream, ["label", "Label", "streamName", "StreamName"]),
        current: numberOf(stream, ["current", "Current", "passPercentage", "PassPercentage"]),
        previous: numberOf(stream, ["previous", "Previous"]),
      })).filter((stream) => stream.current !== undefined)
    : (passPercentage === undefined ? [] : [{ label: "Overall", current: passPercentage }]);
  
  const exams = toExams(principalData.upcomingExaminations || []);
  const classes = toClasses(studentAttData.breakdown || []);

  return {
    partial: results.some((result) => result.status === "rejected"),
    studentCount: studentTotal,
    staffCount: staffTotal,
    studentsGrowth: numberOf(summary, ["studentsVsLastYearPercentage", "StudentsVsLastYearPercentage"]),
    staffGrowth: numberOf(summary, ["teachingStaffVsLastYearPercentage", "staffVsLastYearPercentage", "StaffVsLastYearPercentage"]),
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
      chart: feeChart,
    },
    activeClasses: principalData.activeClasses ?? numberOf(summary, ["totalSections", "TotalSections", "sectionsCount", "SectionsCount"]),
    upcomingExamCount: exams.length || principalData.upcomingExamCount || 0,
    admissions: principalData.admissions ?? numberOf(summary, ["admissions", "Admissions"]),
  };
}
