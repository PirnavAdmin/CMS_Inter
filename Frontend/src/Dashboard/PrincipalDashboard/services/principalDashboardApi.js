import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import {
  getAdmissionsDetails,
  getAttendanceDetails,
  getDueFeesDetails,
  getExaminationsDetails,
  getFeeCollectionDetails,
  getResultsDetails,
  getStaffAttendanceDetails,
  getStudentStrengthDetails,
  getReportsDashboard,
} from "@/api/reportApi.js";
import { principalDashboardData, principalPeriodSnapshots } from "../data/principalDashboardMockData.js";

const REPORTS_API_VERSION = "1.0";
const PAGE_SIZE = 1000;

export const principalDashboardFallbackData = {
  ...principalDashboardData,
  periodSnapshots: principalPeriodSnapshots,
};

const unwrap = (payload) => {
  let node = payload?.data ?? payload?.Data ?? payload;
  const visited = new Set();
  while (node && typeof node === "object" && !Array.isArray(node) && !visited.has(node)) {
    visited.add(node);
    const wrapped = node.data ?? node.Data ?? node.result ?? node.Result ?? node.details ?? node.Details;
    if (wrapped === undefined || wrapped === node) break;
    node = wrapped;
  }
  return node;
};

const rows = (payload, preferredKeys = []) => {
  const node = unwrap(payload);
  if (Array.isArray(node)) return node;
  for (const key of preferredKeys) {
    if (Array.isArray(node?.[key])) return node[key];
  }
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "rows", "Rows", "details", "Details", "$values", "payments", "Payments", "dues", "Dues"]) {
    if (Array.isArray(node?.[key])) return node[key];
  }
  return [];
};

const read = (item, keys, fallback = undefined) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const number = (item, keys, fallback = undefined) => {
  const value = read(item, keys);
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const positiveId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const formatCompactMoney = (value) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 10000000) return `INR ${(amount / 10000000).toFixed(2)}Cr`;
  if (Math.abs(amount) >= 100000) return `INR ${(amount / 100000).toFixed(2)}L`;
  return `INR ${formatNumber(amount)}`;
};

const percent = (part, total) => {
  const denominator = Number(total || 0);
  if (!denominator) return 0;
  return Number(((Number(part || 0) / denominator) * 100).toFixed(1));
};

const normalizeDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const dateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const addDays = (iso, days) => {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const startOfWeek = (iso) => {
  const date = new Date(`${iso}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
};

const startOfMonth = (iso) => `${iso.slice(0, 8)}01`;

const periodRange = (period, customRange = {}) => {
  const today = todayIso();
  if (period === "Yesterday") {
    const yesterday = addDays(today, -1);
    return { fromDate: yesterday, toDate: yesterday };
  }
  if (period === "This Week") return { fromDate: startOfWeek(today), toDate: today };
  if (period === "This Month") return { fromDate: startOfMonth(today), toDate: today };
  if (period === "Custom Date Range" && customRange.start && customRange.end) {
    return { fromDate: customRange.start, toDate: customRange.end };
  }
  return { fromDate: today, toDate: today };
};

const reportParams = (context = {}, range = {}) => {
  const params = { "api-version": REPORTS_API_VERSION };
  if (positiveId(context.campusId)) params.CampusId = positiveId(context.campusId);
  if (positiveId(context.boardId)) params.BoardId = positiveId(context.boardId);
  if (positiveId(context.academicYearId)) params.AcademicYearId = positiveId(context.academicYearId);
  if (range.fromDate) params.FromDate = `${range.fromDate}T00:00:00`;
  if (range.toDate) params.ToDate = `${range.toDate}T23:59:59`;
  return params;
};

const moduleParams = (context = {}, range = {}) => {
  const params = { pageNumber: 1, pageSize: PAGE_SIZE, PageNumber: 1, PageSize: PAGE_SIZE };
  if (positiveId(context.campusId)) params.campusId = positiveId(context.campusId);
  if (positiveId(context.boardId)) params.boardId = positiveId(context.boardId);
  if (positiveId(context.academicYearId)) params.academicYearId = positiveId(context.academicYearId);
  if (range.fromDate) params.fromDate = range.fromDate;
  if (range.toDate) params.toDate = range.toDate;
  return params;
};

const requestMap = async (entries) => {
  const settled = await Promise.allSettled(entries.map(([, request]) => request));
  return entries.reduce((acc, [key], index) => {
    const result = settled[index];
    acc[key] = result.status === "fulfilled"
      ? { ok: true, data: result.value?.data ?? result.value }
      : { ok: false, error: getApiErrorMessage(result.reason) };
    return acc;
  }, {});
};

const findMetric = (dashboard, keys, fallback) => number(unwrap(dashboard), keys, fallback);

const summarizeAttendanceRows = (items, fallback) => {
  if (!items.length) return fallback;
  const present = items.reduce((sum, item) => sum + (number(item, ["present", "Present", "presentCount", "PresentCount"]) || 0), 0);
  const absent = items.reduce((sum, item) => sum + (number(item, ["absent", "Absent", "absentCount", "AbsentCount"]) || 0), 0);
  const leave = items.reduce((sum, item) => sum + (number(item, ["leave", "Leave", "onLeave", "OnLeave", "leaveCount", "LeaveCount"]) || 0), 0);
  const totalFromRows = items.reduce((sum, item) => sum + (number(item, ["total", "Total", "totalStudents", "TotalStudents", "strength", "Strength"]) || 0), 0);
  const total = Math.max(totalFromRows, present + absent + leave, fallback.total || 0);
  const classes = items
    .map((item) => {
      const name = String(read(item, ["sectionName", "SectionName", "className", "ClassName", "groupName", "GroupName", "name", "Name"], "")).trim();
      if (!name) return null;
      const rowTotal = number(item, ["total", "Total", "totalStudents", "TotalStudents", "strength", "Strength"], 0);
      const rowPresent = number(item, ["present", "Present", "presentCount", "PresentCount"], 0);
      const value = number(item, ["attendancePercentage", "AttendancePercentage", "percentage", "Percentage"], percent(rowPresent, rowTotal));
      return { name, value: Math.round(value || 0) };
    })
    .filter(Boolean)
    .slice(0, 6);

  return {
    total,
    present: present || Math.round((number(items[0], ["attendancePercentage", "AttendancePercentage", "percentage", "Percentage"], 0) / 100) * total) || fallback.present,
    absent: absent || Math.max(total - (present || fallback.present) - leave, 0),
    leave,
    classes: classes.length ? classes : fallback.classes,
  };
};

const summarizeStaffAttendanceRows = (items, staffTotal, fallback) => {
  if (!items.length) return { ...fallback, total: staffTotal || fallback.total };
  const present = items.reduce((sum, item) => sum + (number(item, ["present", "Present", "presentCount", "PresentCount"]) || 0), 0);
  const absent = items.reduce((sum, item) => sum + (number(item, ["absent", "Absent", "absentCount", "AbsentCount"]) || 0), 0);
  const leave = items.reduce((sum, item) => sum + (number(item, ["leave", "Leave", "onLeave", "OnLeave", "leaveCount", "LeaveCount"]) || 0), 0);
  const total = Math.max(staffTotal || 0, items.reduce((sum, item) => sum + (number(item, ["total", "Total", "totalStaff", "TotalStaff"]) || 0), 0), present + absent + leave);
  return {
    total: total || fallback.total,
    present: present || Math.max((total || fallback.total) - absent - leave, 0),
    absent,
    leave,
  };
};

const buildClassOverview = (attendanceRows, strengthRows, sectionRows, fallback) => {
  const source = attendanceRows.length ? attendanceRows : (strengthRows.length ? strengthRows : sectionRows);
  const overview = source.map((item, index) => {
    const className = String(read(item, ["sectionName", "SectionName", "className", "ClassName", "groupName", "GroupName", "name", "Name"], "")).trim();
    if (!className) return null;
    const students = number(item, ["totalStudents", "TotalStudents", "students", "Students", "strength", "Strength", "currentStrength", "CurrentStrength"], 0);
    const present = number(item, ["present", "Present", "presentCount", "PresentCount"], Math.round(students * ((number(item, ["attendancePercentage", "AttendancePercentage", "percentage", "Percentage"], 0) || 0) / 100)));
    const absent = number(item, ["absent", "Absent", "absentCount", "AbsentCount"], Math.max(students - present, 0));
    return { className, students, present, absent, tone: ["green", "blue", "violet", "amber", "teal"][index % 5] };
  }).filter((item) => item && item.students > 0).slice(0, 8);
  return overview.length ? overview : fallback;
};

const buildPerformance = (resultRows, dashboard, fallback) => {
  const byStream = new Map();
  resultRows.forEach((item) => {
    const label = String(read(item, ["groupName", "GroupName", "stream", "Stream", "programName", "ProgramName", "sectionName", "SectionName"], "")).trim();
    if (!label) return;
    const value = number(item, ["passPercentage", "PassPercentage", "percentage", "Percentage"], undefined);
    if (value === undefined) return;
    const current = byStream.get(label) || [];
    current.push(value);
    byStream.set(label, current);
  });
  const chart = Array.from(byStream.entries()).slice(0, 6).map(([label, values]) => {
    const current = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    return { label, current, previous: Math.max(current - 4, 0) };
  });
  if (chart.length) return chart;
  const pass = findMetric(dashboard, ["passPercentage", "PassPercentage"], null);
  if (pass !== null && fallback.length) {
    return fallback.map((item) => ({ ...item, current: Math.round(pass), previous: Math.max(Math.round(pass) - 4, 0) }));
  }
  return fallback;
};

const buildFeeCollection = (collectionRows, fallback) => {
  if (!collectionRows.length) return fallback;
  const grouped = new Map();
  collectionRows.forEach((item) => {
    const rawDate = read(item, ["paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt"], "");
    const date = new Date(rawDate);
    const label = Number.isNaN(date.getTime())
      ? String(read(item, ["monthName", "MonthName", "month", "Month"], "Other"))
      : date.toLocaleDateString("en-IN", { month: "short" });
    const amount = number(item, ["amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"], 0);
    grouped.set(label, (grouped.get(label) || 0) + amount);
  });
  return Array.from(grouped.entries()).slice(-6).map(([label, value]) => ({ label, value: Number((value / 100000).toFixed(2)) }));
};

const buildExams = (examRows, fallback) => {
  const exams = examRows.map((item) => {
    const date = read(item, ["startDate", "StartDate", "examDate", "ExamDate", "date", "Date"], "");
    const name = String(read(item, ["examName", "ExamName", "subjectName", "SubjectName", "name", "Name"], "Examination"));
    return {
      subject: name,
      date: dateLabel(date) || "TBA",
      time: String(read(item, ["startTime", "StartTime", "time", "Time"], "TBA")),
      classes: String(read(item, ["sectionName", "SectionName", "groupName", "GroupName", "classes", "Classes"], "All classes")),
      room: String(read(item, ["roomName", "RoomName", "room", "Room", "venue", "Venue"], "Room TBA")),
      students: number(item, ["students", "Students", "totalStudents", "TotalStudents", "appeared", "Appeared"], 0),
      isoDate: normalizeDate(date),
    };
  }).filter((item) => item.subject).sort((a, b) => String(a.isoDate).localeCompare(String(b.isoDate))).slice(0, 3);
  return exams.length ? exams : fallback;
};

const buildActivities = ({ admissions, collection, exams, leaveRequests }, fallback) => {
  const activities = [];
  const admission = admissions[0];
  if (admission) {
    activities.push({
      id: "admission-api",
      title: "New student admission",
      description: `${read(admission, ["studentName", "StudentName", "name", "Name"], "Student")} joined ${read(admission, ["groupName", "GroupName", "sectionName", "SectionName"], "the college")}.`,
      time: dateLabel(read(admission, ["admissionDate", "AdmissionDate", "createdAt", "CreatedAt"], "")) || "Recent",
      icon: "user",
      tone: "green",
      to: "/dashboard/students",
      moduleKey: "student-management",
    });
  }
  const payment = collection[0];
  if (payment) {
    activities.push({
      id: "payment-api",
      title: "Fee payment received",
      description: `${read(payment, ["studentName", "StudentName", "name", "Name"], "Student")} paid ${formatCompactMoney(number(payment, ["amount", "Amount", "paidAmount", "PaidAmount"], 0))}.`,
      time: dateLabel(read(payment, ["paymentDate", "PaymentDate", "paidDate", "PaidDate"], "")) || "Recent",
      icon: "fees",
      tone: "violet",
      to: "/dashboard/fee-structure",
      moduleKey: "fee-management",
    });
  }
  const exam = exams[0];
  if (exam) {
    activities.push({
      id: "exam-api",
      title: "Examination scheduled",
      description: `${exam.subject} is scheduled for ${exam.date}.`,
      time: exam.date,
      icon: "exam",
      tone: "amber",
      to: "/dashboard/examinations",
      moduleKey: "examination",
    });
  }
  const leave = leaveRequests[0];
  if (leave) {
    activities.push({
      id: "leave-api",
      title: "Leave request submitted",
      description: `${read(leave, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"], "Staff")} requested leave.`,
      time: dateLabel(read(leave, ["createdAt", "CreatedAt", "fromDate", "FromDate"], "")) || "Recent",
      icon: "leave",
      tone: "blue",
      to: "/dashboard/leave-management",
      moduleKey: "staff-leave-management",
    });
  }
  return activities.length ? activities.slice(0, 4) : fallback;
};

const countByText = (items, keys, matcher) => items.filter((item) => matcher(String(read(item, keys, "")).toLowerCase())).length;

export async function fetchPrincipalDashboardData({ period = "Today", customRange = {}, context = {} } = {}) {
  const range = periodRange(period, customRange);

  // 1. Primary: Optimized single backend aggregator endpoint
  try {
    const principalQuery = {
      period,
      campusId: positiveId(context.campusId),
      boardId: positiveId(context.boardId),
      academicYearId: positiveId(context.academicYearId),
    };
    if (range.fromDate) principalQuery.fromDate = `${range.fromDate}T00:00:00`;
    if (range.toDate) principalQuery.toDate = `${range.toDate}T23:59:59`;

    const aggRes = await apiClient.get(apiEndpoints.dashboard.principal, {
      params: principalQuery,
      skipGlobalLoader: true,
    });

    const aggData = unwrap(aggRes?.data);
    if (aggData && aggData.summary && Array.isArray(aggData.summary) && aggData.summary.length > 0) {
      const pSnapshot = aggData.periodSnapshots?.[period] || {
        attendance: aggData.attendance || { total: 0, present: 0, absent: 0, leave: 0, classes: [] },
        staffAttendance: aggData.staffAttendance || { total: 0, present: 0, absent: 0, leave: 0 },
        feeCollection: aggData.feeCollection || [],
        feeTotal: aggData.feeTotal || 0,
        pendingFees: aggData.pendingFees || 0,
        collectionRate: aggData.collectionRate || 0,
        admissions: aggData.summary.find((s) => s.id === "admissions") || {
          value: "0",
          detail: "0 applications pending",
          trend: "Live",
        },
        activities: aggData.activities || [],
        notices: aggData.notices || [],
      };

      return {
        data: {
          principal: aggData.principal || principalDashboardData.principal,
          summary: aggData.summary,
          attendance: aggData.attendance || pSnapshot.attendance,
          staffAttendance: aggData.staffAttendance || pSnapshot.staffAttendance,
          performance: aggData.performance || [],
          classOverview: aggData.classOverview || [],
          exams: aggData.exams || [],
          feeCollection: aggData.feeCollection || [],
          activities: aggData.activities || [],
          notices: aggData.notices || [],
          periodSnapshots: {
            ...principalPeriodSnapshots,
            ...(aggData.periodSnapshots || {}),
            [period]: pSnapshot,
          },
        },
        partial: false,
        errors: [],
        loadedAt: aggData.loadedAt || new Date().toISOString(),
      };
    }
  } catch (aggErr) {
    console.warn("Principal aggregator API unavailable, falling back to multi-endpoint collection:", aggErr);
  }

  // 2. Fallback: Multi-endpoint collection
  const reportsQuery = reportParams(context, range);
  const apiQuery = moduleParams(context, range);
  const monthQuery = { ...apiQuery, month: new Date(`${range.toDate}T00:00:00`).getMonth() + 1, year: new Date(`${range.toDate}T00:00:00`).getFullYear() };

  const response = await requestMap([
    ["reportsDashboard", getReportsDashboard(reportsQuery)],
    ["admissionsDetails", getAdmissionsDetails(reportsQuery)],
    ["studentStrengthDetails", getStudentStrengthDetails(reportsQuery)],
    ["attendanceDetails", getAttendanceDetails(reportsQuery)],
    ["staffAttendanceDetails", getStaffAttendanceDetails(reportsQuery)],
    ["feeCollectionDetails", getFeeCollectionDetails(reportsQuery)],
    ["dueFeesDetails", getDueFeesDetails(reportsQuery)],
    ["examinationsDetails", getExaminationsDetails(reportsQuery)],
    ["resultsDetails", getResultsDetails(reportsQuery)],
    ["students", apiClient.get(apiEndpoints.students.getAll, { params: apiQuery, skipGlobalLoader: true })],
    ["staffStats", apiClient.get(apiEndpoints.faculty.dashboardStats, { params: apiQuery, skipGlobalLoader: true })],
    ["staff", apiClient.get(apiEndpoints.faculty.list, { params: apiQuery, skipGlobalLoader: true })],
    ["sections", apiClient.get(apiEndpoints.sections.list, { params: apiQuery, skipGlobalLoader: true })],
    ["admissions", apiClient.get(apiEndpoints.admissions.getAll, { params: apiQuery, skipGlobalLoader: true })],
    ["exams", apiClient.get(apiEndpoints.examinations.getAll, { params: apiQuery, skipGlobalLoader: true })],
    ["feeDashboard", apiClient.get(apiEndpoints.fee.dashboard, { params: apiQuery, skipGlobalLoader: true })],
    ["feeCollection", apiClient.get(apiEndpoints.fee.collection, { params: apiQuery, skipGlobalLoader: true })],
    ["feeDue", apiClient.get(apiEndpoints.fee.due || apiEndpoints.fee.getDue, { params: apiQuery, skipGlobalLoader: true })],
    ["attendanceSummary", apiClient.get(apiEndpoints.attendance.summary, { params: apiQuery, skipGlobalLoader: true })],
    ["attendancePercentage", apiClient.get(apiEndpoints.attendance.percentage, { params: apiQuery, skipGlobalLoader: true })],
    ["staffAttendance", apiClient.get(apiEndpoints.staffAttendance.monthlyReport, { params: monthQuery, skipGlobalLoader: true })],
    ["leaveRequests", apiClient.get(apiEndpoints.staffAttendance.leave, { params: apiQuery, skipGlobalLoader: true })],
  ]);

  const fallbackSnapshot = principalPeriodSnapshots[period] || principalPeriodSnapshots.Today;
  const dashboard = response.reportsDashboard.data || {};
  const students = rows(response.students.data, ["students", "Students"]);
  const staff = rows(response.staff.data, ["staff", "Staff", "faculty", "Faculty"]);
  const admissions = rows(response.admissions.data, ["admissions", "Admissions"]);
  const admissionsDetails = rows(response.admissionsDetails.data, ["admissions", "Admissions"]);
  const strengthRows = rows(response.studentStrengthDetails.data, ["studentStrength", "StudentStrength", "sections", "Sections"]);
  const attendanceRows = rows(response.attendanceDetails.data, ["attendance", "Attendance"]);
  const staffAttendanceRows = [
    ...rows(response.staffAttendanceDetails.data, ["staffAttendance", "StaffAttendance", "facultyAttendance", "FacultyAttendance"]),
    ...rows(response.staffAttendance.data, ["attendance", "Attendance", "staffAttendance", "StaffAttendance"]),
  ];
  const collectionRows = [
    ...rows(response.feeCollectionDetails.data, ["feeCollection", "FeeCollection", "payments", "Payments"]),
    ...rows(response.feeCollection.data, ["payments", "Payments", "collections", "Collections"]),
  ];
  const dueRows = [
    ...rows(response.dueFeesDetails.data, ["dueFees", "DueFees", "dues", "Dues"]),
    ...rows(response.feeDue.data, ["dues", "Dues", "items", "Items"]),
  ];
  const sectionRows = rows(response.sections.data, ["sections", "Sections"]);
  const examRows = [
    ...rows(response.examinationsDetails.data, ["examinations", "Examinations", "exams", "Exams"]),
    ...rows(response.exams.data, ["examinations", "Examinations", "exams", "Exams"]),
  ];
  const resultRows = rows(response.resultsDetails.data, ["results", "Results"]);
  const leaveRequests = rows(response.leaveRequests.data, ["leaves", "Leaves", "requests", "Requests"]);
  const feeDashboard = unwrap(response.feeDashboard.data) || {};
  const staffStats = unwrap(response.staffStats.data) || {};

  const totalStudents = findMetric(dashboard, ["studentStrength", "StudentStrength", "totalStudents", "TotalStudents"], undefined)
    ?? number(unwrap(response.students.data), ["totalCount", "TotalCount", "total", "Total"], undefined)
    ?? students.length
    ?? fallbackSnapshot.attendance.total;
  const maleStudents = countByText(students, ["gender", "Gender", "sex", "Sex"], (value) => value.startsWith("m"));
  const femaleStudents = countByText(students, ["gender", "Gender", "sex", "Sex"], (value) => value.startsWith("f"));
  const totalStaff = number(staffStats, ["totalStaff", "TotalStaff", "total", "Total"], undefined)
    ?? number(unwrap(response.staff.data), ["totalCount", "TotalCount", "total", "Total"], undefined)
    ?? staff.length
    ?? fallbackSnapshot.staffAttendance.total;
  const teachingStaff = number(staffStats, ["teachingStaff", "TeachingStaff", "totalTeaching", "TotalTeaching"], undefined)
    ?? countByText(staff, ["staffType", "StaffType", "type", "Type"], (value) => value.includes("teaching") && !value.includes("non"));
  const supportStaff = Math.max(totalStaff - (teachingStaff || 0), 0);

  const attendanceFromSummary = unwrap(response.attendanceSummary.data) || {};
  const attendanceFromPercentage = unwrap(response.attendancePercentage.data) || {};
  const attendance = summarizeAttendanceRows(attendanceRows, {
    ...fallbackSnapshot.attendance,
    total: totalStudents || fallbackSnapshot.attendance.total,
    present: number(attendanceFromSummary, ["present", "Present", "presentCount", "PresentCount"], undefined) ?? fallbackSnapshot.attendance.present,
    absent: number(attendanceFromSummary, ["absent", "Absent", "absentCount", "AbsentCount"], undefined) ?? fallbackSnapshot.attendance.absent,
    leave: number(attendanceFromSummary, ["leave", "Leave", "leaveCount", "LeaveCount"], undefined) ?? fallbackSnapshot.attendance.leave,
  });
  const rawAttendanceVal = number(attendanceFromPercentage, ["percentage", "Percentage", "attendancePercentage", "AttendancePercentage"], percent(attendance.present, attendance.total));
  const attendanceValue = Math.min(100, Math.max(0, rawAttendanceVal));
  const staffAttendance = summarizeStaffAttendanceRows(staffAttendanceRows, totalStaff, fallbackSnapshot.staffAttendance);
  const activeSections = number(unwrap(response.sections.data), ["totalCount", "TotalCount", "total", "Total"], undefined) ?? sectionRows.length ?? principalDashboardData.classOverview.length;
  const totalCollected = number(feeDashboard, ["totalCollected", "TotalCollected", "collected", "Collected", "totalPaid", "TotalPaid"], undefined)
    ?? collectionRows.reduce((sum, item) => sum + (number(item, ["amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"], 0) || 0), 0);
  const pendingFees = number(feeDashboard, ["totalOutstanding", "TotalOutstanding", "outstanding", "Outstanding", "pendingAmount", "PendingAmount"], undefined)
    ?? dueRows.reduce((sum, item) => sum + (number(item, ["balance", "Balance", "outstandingAmount", "OutstandingAmount", "pendingAmount", "PendingAmount", "dueAmount", "DueAmount", "amount", "Amount"], 0) || 0), 0);
  const collectionRate = Number((totalCollected + pendingFees ? (totalCollected / (totalCollected + pendingFees)) * 100 : fallbackSnapshot.collectionRate).toFixed(1));
  const exams = buildExams(examRows, principalDashboardData.exams);
  const upcomingExamCount = findMetric(dashboard, ["examinations", "Examinations", "upcomingExams", "UpcomingExams"], undefined) ?? examRows.length ?? exams.length;
  const admissionCount = findMetric(dashboard, ["admissions", "Admissions", "totalAdmissions", "TotalAdmissions"], undefined)
    ?? number(unwrap(response.admissions.data), ["totalCount", "TotalCount", "total", "Total"], undefined)
    ?? admissions.length
    ?? admissionsDetails.length;
  const pendingAdmissions = admissions.filter((item) => ["pending", "submitted", "verified"].includes(String(read(item, ["status", "Status", "admissionStatus", "AdmissionStatus"], "")).toLowerCase())).length;

  const effTotal = attendance.total || totalStudents || 0;
  const effPresent = Math.min(effTotal, Math.round((attendanceValue / 100) * effTotal) || attendance.present);
  const periodSnapshot = {
    attendance: { ...attendance, total: effTotal, present: effPresent, attendanceRate: attendanceValue },
    staffAttendance,
    feeCollection: buildFeeCollection(collectionRows, fallbackSnapshot.feeCollection),
    feeTotal: totalCollected,
    pendingFees,
    collectionRate,
    admissions: {
      value: formatNumber(admissionCount),
      detail: `${formatNumber(pendingAdmissions)} applications pending`,
      trend: "Live",
    },
    activities: buildActivities({ admissions: admissions.length ? admissions : admissionsDetails, collection: collectionRows, exams, leaveRequests }, fallbackSnapshot.activities),
    notices: fallbackSnapshot.notices,
  };

  const summary = principalDashboardData.summary.map((item) => {
    if (item.id === "students") {
      const detail = maleStudents || femaleStudents
        ? `${formatNumber(maleStudents)} male / ${formatNumber(femaleStudents)} female`
        : "Live student records";
      return { ...item, value: formatNumber(totalStudents), detail, trend: "Live" };
    }
    if (item.id === "staff") return { ...item, value: formatNumber(totalStaff), detail: `${formatNumber(teachingStaff)} teaching / ${formatNumber(supportStaff)} support`, trend: "Live" };
    if (item.id === "attendance") return { ...item, value: `${attendanceValue.toFixed(1)}%`, detail: `${formatNumber(periodSnapshot.attendance.present)} present`, trend: "Live" };
    if (item.id === "staffAttendance") return { ...item, value: `${percent(staffAttendance.present, staffAttendance.total).toFixed(1)}%`, detail: `${formatNumber(staffAttendance.present)} staff present`, trend: "Live" };
    if (item.id === "classes") return { ...item, value: formatNumber(activeSections), detail: "Active sections", trend: "Live" };
    if (item.id === "fees") return { ...item, value: formatCompactMoney(pendingFees), detail: `${formatNumber(dueRows.length)} due records`, trend: "Live" };
    if (item.id === "exams") return { ...item, value: formatNumber(upcomingExamCount), detail: exams[0]?.subject ? `Next: ${exams[0].subject}` : "Scheduled exams", trend: "Live" };
    if (item.id === "admissions") return { ...item, ...periodSnapshot.admissions };
    return item;
  });

  const failedMessages = Object.values(response).filter((item) => !item.ok).map((item) => item.error).filter(Boolean);

  return {
    data: {
      ...principalDashboardData,
      summary,
      attendance: periodSnapshot.attendance,
      staffAttendance,
      performance: buildPerformance(resultRows, dashboard, principalDashboardData.performance),
      classOverview: buildClassOverview(attendanceRows, strengthRows, sectionRows, principalDashboardData.classOverview),
      exams,
      feeCollection: periodSnapshot.feeCollection,
      activities: periodSnapshot.activities,
      notices: periodSnapshot.notices,
      periodSnapshots: {
        ...principalPeriodSnapshots,
        [period]: periodSnapshot,
      },
    },
    partial: failedMessages.length > 0,
    errors: failedMessages,
    loadedAt: new Date().toISOString(),
  };
}
