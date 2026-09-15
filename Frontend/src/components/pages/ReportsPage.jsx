import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Activity,
  Award,
  BriefcaseBusiness,
  CalendarCheck,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Eye,
  Search,
  ShieldCheck,
  ShieldX,
  Percent,
  Printer,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Field, Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import admissionsImage from "@/assets/reports-3d/admissions.png";
import attendanceImage from "@/assets/reports-3d/attendance.png";
import feeCollectionImage from "@/assets/reports-3d/fee-collection.png";
import dueFeesImage from "@/assets/reports-3d/due-fees.png";
import examinationsImage from "@/assets/reports-3d/examinations.png";
import resultsImage from "@/assets/reports-3d/results.png";
import facultyWorkloadImage from "@/assets/reports-3d/faculty-workload.png";
import studentStrengthImage from "@/assets/reports-3d/student-strength.png";
import passPercentageImage from "@/assets/reports-3d/pass-percentage.png";
import toppersImage from "@/assets/reports-3d/toppers.png";

const EMPTY_REPORTS = {
  dashboard: {},
  overview: {},
  admissions: {},
  studentStrength: {},
  attendance: {},
  staffAttendance: {},
  facultyAttendance: {},
  feeCollection: {},
  feeOutstanding: {},
  examinations: {},
  results: {},
  passPercentage: {},
  toppers: {},
  staffWorkload: {},
  facultyWorkload: {},
};

const REPORTS_API_VERSION = "1.0";
const OVERVIEW_REPORT_TYPE = "dashboard";
const FILTER_CACHE_TTL_MS = 5 * 60 * 1000;

const REPORTS_API = {
  filters: {
    boards: "/api/v1/reports/filters/boards",
    academicYears: "/api/v1/reports/filters/academic-years",
    academicLevels: "/api/v1/reports/filters/academic-levels",
    groups: "/api/v1/reports/filters/groups",
    groupsSource: "/api/v1/groups",
    sections: "/api/v1/reports/filters/sections",
  },
  dashboard: "/api/v1/reports/dashboard",
  details: {
    admissions: "/api/v1/reports/details/admissions",
    attendance: "/api/v1/reports/details/attendance",
    staffAttendance: "/api/v1/reports/details/staff-attendance",
    feeCollection: "/api/v1/reports/details/fee-collection",
    dueFees: "/api/v1/reports/details/due-fees",
    examinations: "/api/v1/reports/details/examinations",
    results: "/api/v1/reports/details/results",
    staffWorkload: "/api/v1/reports/details/staff-workload",
    studentStrength: "/api/v1/reports/details/student-strength",
    passPercentage: "/api/v1/reports/details/pass-percentage",
    toppers: "/api/v1/reports/details/toppers",
    auditLogs: "/api/v1/reports/details/audit-logs",
  },
  exportPdf: "/api/v1/reports/export/pdf",
  exportExcel: "/api/v1/reports/export/excel",
};

const REPORT_REQUESTS = [
  { key: "admissions", endpoint: apiEndpoints.admissions.getAll, clientFilter: admissionReportRows },
  { key: "attendance", endpoint: REPORTS_API.details.attendance },
  { key: "facultyAttendance", endpoint: REPORTS_API.details.staffAttendance },
  { key: "feeCollection", endpoint: REPORTS_API.details.feeCollection },
  { key: "feeOutstanding", endpoint: REPORTS_API.details.dueFees },
  { key: "examinations", endpoint: REPORTS_API.details.examinations },
  { key: "results", endpoint: REPORTS_API.details.results },
  { key: "facultyWorkload", endpoint: REPORTS_API.details.staffWorkload },
  { key: "studentStrength", endpoint: REPORTS_API.details.studentStrength },
  { key: "passPercentage", endpoint: REPORTS_API.details.passPercentage },
  { key: "toppers", endpoint: REPORTS_API.details.toppers },
];

const REPORT_DETAIL_BY_TYPE = Object.freeze({
  admissions: REPORTS_API.details.admissions,
  attendance: REPORTS_API.details.attendance,
  "fee-collection": REPORTS_API.details.feeCollection,
  "due-fees": REPORTS_API.details.dueFees,
  examinations: REPORTS_API.details.examinations,
  results: REPORTS_API.details.results,
  "faculty-workload": REPORTS_API.details.staffWorkload,
  "student-strength": REPORTS_API.details.studentStrength,
  "pass-percentage": REPORTS_API.details.passPercentage,
  toppers: REPORTS_API.details.toppers,
});

const AUDIT_PAGE_SIZES = [10, 25, 50, 100];
const AUDIT_SEARCH_SAMPLES = ["Super Admin", "Student Management", "Login", "Export", "Success", "STU-1001"];

const summaryCardConfig = [
  { key: "admissions", sourceKey: "admissions", reportType: "admissions", label: "Admissions", icon: GraduationCap, image: admissionsImage, tone: "blue" },
  { key: "attendance", sourceKey: "attendance", reportType: "attendance", label: "Attendance", icon: CalendarCheck, image: attendanceImage, tone: "green", suffix: "%" },
  { key: "feeCollection", sourceKey: "feeCollection", reportType: "fee-collection", label: "Fee Collection", icon: WalletCards, image: feeCollectionImage, tone: "violet", currency: true },
  { key: "dueFees", sourceKey: "feeOutstanding", reportType: "due-fees", label: "Due Fees", icon: AlertCircle, image: dueFeesImage, tone: "amber", currency: true },
  { key: "examinations", sourceKey: "examinations", reportType: "examinations", label: "Examinations", icon: FileSpreadsheet, image: examinationsImage, tone: "blue" },
  { key: "results", sourceKey: "results", reportType: "results", label: "Results Published", icon: Award, image: resultsImage, tone: "green" },
  { key: "facultyWorkload", sourceKey: "facultyWorkload", reportType: "faculty-workload", label: "Faculty Workload", icon: BriefcaseBusiness, image: facultyWorkloadImage, tone: "violet", suffix: " hrs/wk" },
  { key: "studentStrength", sourceKey: "studentStrength", reportType: "student-strength", label: "Student Strength", icon: Users, image: studentStrengthImage, tone: "blue" },
  { key: "passPercentage", sourceKey: "passPercentage", reportType: "pass-percentage", label: "Pass Percentage", icon: Percent, image: passPercentageImage, tone: "green", suffix: "%" },
  { key: "toppers", sourceKey: "toppers", reportType: "toppers", label: "Toppers Identified", icon: Trophy, image: toppersImage, tone: "amber" },
];

const DETAIL_LABELS = {
  count: "Records", total: "Total", male: "Male", female: "Female", present: "Present", absent: "Absent",
  workingDays: "Working days", totalStudents: "Students", totalFaculty: "Faculty", totalExaminations: "Examinations",
  totalCollected: "Collected", collectedAmount: "Collected", totalOutstanding: "Outstanding", outstandingAmount: "Outstanding",
  passCount: "Passed", failCount: "Failed", appearedStudents: "Appeared", publishedResults: "Published",
  averageAttendance: "Average attendance", attendancePercentage: "Attendance", averageWorkload: "Average workload",
};

function readableLabel(key) {
  const normalized = String(key).replace(/^[A-Z]/, (letter) => letter.toLowerCase());
  return DETAIL_LABELS[normalized] ?? normalized.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function reportDetails(payload, mainValue, { currency = false } = {}) {
  const node = dataNode(payload);
  const details = [];
  const add = (label, value, format = {}) => {
    if (value === undefined || value === null || value === "" || typeof value === "object") return;
    if (Number(value) === Number(mainValue) && details.length === 0) return;
    const numeric = typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)));
    const display = numeric ? formatMetric(Number(value), format) : String(value);
    if (!details.some((item) => item.label === label && item.value === display)) details.push({ label, value: display });
  };

  if (node && !Array.isArray(node) && typeof node === "object") {
    const queue = [{ value: node, depth: 0 }];
    const visited = new Set();
    while (queue.length && details.length < 3) {
      const current = queue.shift();
      if (!current.value || typeof current.value !== "object" || visited.has(current.value)) continue;
      visited.add(current.value);
      Object.entries(current.value).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const valueFormat = { currency: currency || /amount|fee|collection|outstanding|due|paid/i.test(key), suffix: /percentage|rate/i.test(key) ? "%" : "" };
      if (/id$|date|created|updated|message|status/i.test(lowerKey)) return;
      if (Array.isArray(value)) add(readableLabel(key), value.length);
        else if (value && typeof value === "object" && current.depth < 2) queue.push({ value, depth: current.depth + 1 });
        else add(readableLabel(key), value, valueFormat);
      });
    }
  }

  const rows = collection(payload);
  if (rows.length) add("Records", rows.length);
  return details.slice(0, 3);
}

function dataNode(payload) {
  let node = payload;
  const visited = new Set();
  while (node && typeof node === "object" && !Array.isArray(node) && !visited.has(node)) {
    visited.add(node);
    const wrapped = node.data ?? node.Data ?? node.result ?? node.Result;
    if (wrapped === undefined || wrapped === node) break;
    node = wrapped;
  }
  return node;
}

function collection(payload, preferredKeys = []) {
  const node = dataNode(payload);
  if (Array.isArray(node)) return node;
  for (const key of preferredKeys) {
    if (Array.isArray(node?.[key])) return node[key];
  }
  for (const key of ["items", "Items", "results", "Results", "records", "Records", "$values"]) {
    if (Array.isArray(node?.[key])) return node[key];
  }
  return [];
}

function read(item, ...keys) {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
}

function numberValue(item, ...keys) {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function metric(payload, keys) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const root = dataNode(payload);
  if (typeof root === "number") return Number.isFinite(root) ? root : undefined;
  if (typeof root === "string" && root.trim() !== "") {
    const numeric = Number(root.replace(/[₹,%\s]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  const queue = [root];
  const visited = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || visited.has(node)) continue;
    visited.add(node);
    if (!Array.isArray(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (wanted.has(key.toLowerCase())) {
          const numeric = typeof value === "string" ? Number(value.replace(/[₹,%\s]/g, "")) : Number(value);
          if (value !== "" && Number.isFinite(numeric)) return numeric;
        }
      }
    }
    Object.values(node).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }
  return undefined;
}

function metricFromSources(sources, keys) {
  for (const source of sources) {
    const value = metric(source, keys);
    if (value !== undefined) return value;
  }
  return undefined;
}

function activeOption(item) {
  const marker = read(item, "isActive", "IsActive", "active", "Active", "status", "Status", "isCurrent", "IsCurrent");
  if (marker === undefined || marker === null || marker === "") return true;
  if (marker === false) return false;
  return !["false", "inactive", "disabled"].includes(String(marker).trim().toLowerCase());
}

function responseRecordCount(payload) {
  const node = dataNode(payload);
  if (Array.isArray(node)) return node.length;
  const records = collection(payload);
  return records.length ? records.length : undefined;
}

function activeFilterOptions(payload, preferredKeys, idKeys, labelKeys) {
  const unique = new Map();
  collection(payload, preferredKeys).forEach((item) => {
    if (!activeOption(item)) return;
    const normalized = optionFrom(item, [...idKeys, "value", "Value"], [...labelKeys, "label", "Label", "text", "Text"]);
    const id = positiveId(normalized?.value);
    if (normalized && id && !unique.has(id)) unique.set(id, { ...normalized, value: String(id) });
  });
  return Array.from(unique.values());
}

function activeAcademicYearOptions(payload) {
  const unique = new Map();
  collection(payload, ["academicYears", "AcademicYears", "years", "Years"]).forEach((item) => {
    if (!activeOption(item)) return;
    const normalized = optionFrom(
      item,
      ["academicYearId", "AcademicYearId", "id", "Id", "value", "Value"],
      ["academicYearName", "AcademicYearName", "name", "Name", "label", "Label", "text", "Text"],
    );
    const id = positiveId(normalized?.value);
    if (!normalized || !id || unique.has(id)) return;
    const boardId = positiveId(read(item, "boardId", "BoardId"));
    unique.set(id, { ...normalized, value: String(id), boardId: boardId ? String(boardId) : "" });
  });
  return Array.from(unique.values());
}

function positiveId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isCanceledRequest(error) {
  return error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";
}

function cachedFilterOptions(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt <= FILTER_CACHE_TTL_MS) return entry.options;
  cache.delete(key);
  return null;
}

function cacheFilterOptions(cache, key, options) {
  cache.set(key, { options, cachedAt: Date.now() });
}

function validDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function hasReportData(payload) {
  const node = dataNode(payload);
  if (Array.isArray(node)) return node.length > 0;
  if (!node || typeof node !== "object") return node !== undefined && node !== null && node !== "";
  return Object.values(node).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== "";
  });
}

function reportFailureMessage(failures) {
  if (!failures.length) return "";
  const reasons = failures.map(({ reason }) => reason);
  const messages = [...new Set(reasons.map(getApiErrorMessage).filter(Boolean))];
  const statuses = reasons.map((reason) => reason?.response?.status).filter(Boolean);
  const allUnavailable = failures.length === REPORT_REQUESTS.length + 1;
  const affected = failures.map(({ key }) => key.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ");
  const firstMessage = messages[0] || "Unknown Reports API error.";

  if (reasons.every((reason) => !reason?.response || reason?.message === "Network Error") || messages.some((message) => /backend is not reachable|network error|ngrok.*offline|err_ngrok/i.test(message))) {
    return "Reports API is unreachable. The configured backend server or ngrok tunnel is offline. Start the backend/tunnel and select Retry.";
  }
  if (statuses.includes(401)) return "Your Reports API session is unauthorized or expired. Please sign in again.";
  if (statuses.includes(403)) return "You do not have permission to access one or more reports.";
  if (statuses.every((status) => status === 404)) return "The configured backend does not expose the Reports API routes. Verify that the Reports controller is deployed.";
  if (messages.some((message) => /procedure.+does not exist|stored procedure/i.test(message))) {
    return `The backend database is missing a Reports stored procedure. Backend response: ${firstMessage}`;
  }
  if (allUnavailable) return `All Reports API requests failed. Backend response: ${firstMessage}`;
  return `${failures.length} report sections could not be loaded (${affected}). Backend response: ${firstMessage}`;
}

function optionFrom(item, idKeys, labelKeys, metadata = {}) {
  const value = read(item, ...idKeys);
  if (value === undefined || value === null || value === "") return null;
  return {
    value: String(value),
    label: String(read(item, ...labelKeys) ?? value),
    ...Object.fromEntries(Object.entries(metadata).map(([key, keys]) => [key, read(item, ...keys)])),
  };
}

function buildFilterQuery(values = {}) {
  const params = {};
  for (const key of ["boardId", "academicYearId", "academicLevelId", "groupId"]) {
    const id = positiveId(values[key]);
    if (id) params[key] = id;
  }
  return params;
}

function matchingGroupOptions(payload, boardId, academicYearId, academicLevelId, boards, levels) {
  const boardLabel = boards.find((option) => positiveId(option.value) === boardId)?.label;
  const levelLabel = levels.find((option) => positiveId(option.value) === academicLevelId)?.label;
  const normalizedBoard = String(boardLabel ?? "").trim().toLowerCase();
  const normalizedLevel = String(levelLabel ?? "").trim().toLowerCase();
  const rows = collection(payload, ["groups", "Groups"]);
  const matchingRows = rows.filter((item) => {
    const itemYearId = positiveId(read(item, "academicYearId", "AcademicYearId"));
    const itemBoard = String(read(item, "board", "Board", "boardName", "BoardName", "boardId", "BoardId") ?? "").trim().toLowerCase();
    const itemLevel = String(read(item, "academicLevel", "AcademicLevel", "academicLevelName", "AcademicLevelName", "academicLevelId", "AcademicLevelId") ?? "").trim().toLowerCase();
    const yearMatches = !itemYearId || itemYearId === academicYearId;
    const boardMatches = !itemBoard || itemBoard === String(boardId) || itemBoard === normalizedBoard;
    const levelMatches = !itemLevel || itemLevel === String(academicLevelId) || itemLevel === normalizedLevel;
    return yearMatches && boardMatches && levelMatches;
  });
  return activeFilterOptions(matchingRows, [], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"]);
}

function buildReportQuery(filters) {
  const mapping = {
    board: "BoardId",
    year: "AcademicYearId",
    level: "AcademicLevelId",
    group: "GroupId",
    section: "SectionId",
    from: "FromDate",
    to: "ToDate",
  };
  return Object.entries(mapping).reduce((params, [filterKey, queryKey]) => {
    const value = filters[filterKey];
    if (value === undefined || value === null || value === "") return params;
    if (["from", "to"].includes(filterKey)) {
      const normalized = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        params[queryKey] = `${normalized}T${filterKey === "from" ? "00:00:00" : "23:59:59"}`;
      }
      return params;
    }
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) params[queryKey] = id;
    return params;
  }, { "api-version": REPORTS_API_VERSION });
}

function mapFacultyWorkload(payload) {
  return collection(payload, ["facultyWorkload", "FacultyWorkload", "workload", "Workload", "faculty", "Faculty"])
    .map((item) => ({
      faculty: String(read(item, "facultyName", "FacultyName", "name", "Name") ?? ""),
      hours: numberValue(item, "totalWorkloadHours", "TotalWorkloadHours", "weeklyHours", "WeeklyHours", "hoursPerWeek", "HoursPerWeek", "workloadHours", "WorkloadHours", "hours", "Hours"),
    }))
    .filter((item) => item.faculty && item.hours !== undefined);
}

function mapToppers(payload) {
  return collection(payload, ["toppers", "Toppers", "students", "Students", "items", "Items"])
    .map((item, index) => ({
      id: read(item, "studentId", "StudentId", "id", "Id") ?? index,
      rank: numberValue(item, "rank", "Rank") ?? index + 1,
      name: String(read(item, "studentName", "StudentName", "name", "Name") ?? "—"),
      roll: String(read(item, "rollNumber", "RollNumber", "rollNo", "RollNo") ?? "—"),
      group: String(read(item, "groupName", "GroupName", "className", "ClassName") ?? "—"),
      level: String(read(item, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel") ?? ""),
      percentage: numberValue(item, "percentage", "Percentage", "score", "Score", "overallPercentage", "OverallPercentage"),
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);
}

function mapAuditLogs(payload) {
  return collection(payload, ["auditLogs", "AuditLogs", "logs", "Logs"])
    .map((item, index) => ({
      id: read(item, "auditLogId", "AuditLogId", "logId", "LogId", "id", "Id") ?? index,
      timestamp: read(item, "timestamp", "Timestamp", "createdAt", "CreatedAt", "createdDate", "CreatedDate", "dateTime", "DateTime", "auditDate", "AuditDate", "actionDate", "ActionDate"),
      user: String(read(item, "userName", "UserName", "fullName", "FullName", "performedBy", "PerformedBy", "actorName", "ActorName", "createdBy", "CreatedBy", "modifiedBy", "ModifiedBy") ?? "—"),
      role: String(read(item, "roleName", "RoleName", "role", "Role", "userRole", "UserRole") ?? "—"),
      module: String(read(item, "module", "Module", "moduleName", "ModuleName", "entityName", "EntityName", "tableName", "TableName") ?? "—"),
      action: String(read(item, "action", "Action", "actionType", "ActionType", "eventType", "EventType", "operation", "Operation", "activity", "Activity") ?? "—"),
      description: String(read(item, "description", "Description", "details", "Details", "message", "Message", "changes", "Changes") ?? "—"),
      recordId: read(item, "recordId", "RecordId", "entityId", "EntityId", "entityKey", "EntityKey", "referenceId", "ReferenceId", "studentId", "StudentId", "userId", "UserId", "feeId", "FeeId"),
      status: String(read(item, "status", "Status", "result", "Result", "outcome", "Outcome", "isSuccess", "IsSuccess", "success", "Success") ?? "—"),
      previousValue: read(item, "oldValue", "OldValue", "previousValue", "PreviousValue", "beforeValue", "BeforeValue"),
      newValue: read(item, "newValue", "NewValue", "updatedValue", "UpdatedValue", "afterValue", "AfterValue"),
      ipAddress: read(item, "ipAddress", "IpAddress", "IPAddress", "clientIp", "ClientIp"),
      device: read(item, "userAgent", "UserAgent", "device", "Device", "browser", "Browser"),
      raw: item,
    }))
    .filter((item) => [item.timestamp, item.user, item.module, item.action, item.description, item.recordId]
      .some((value) => value !== undefined && value !== null && value !== "" && value !== "—"));
}

function auditStatus(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (["true", "success", "successful", "succeeded", "completed"].includes(normalized)) return "success";
  if (["false", "fail", "failed", "failure", "error"].includes(normalized)) return "failed";
  return normalized;
}

function formatAuditDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function displayAuditValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const text = String(value);
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : text;
  } catch {
    return text;
  }
}

function uniqueOptions(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter((value) => value && value !== "—"))]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map((value) => ({ value, label: value }));
}

function auditOptions(rows, key) {
  return uniqueOptions(rows, key);
}

function formatMetric(value, { currency = false, suffix = "" } = {}) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (currency) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 2 }).format(value);
  }
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  return `${formatted}${suffix}`;
}

async function getExportErrorMessage(error) {
  const payload = error?.response?.data;
  if (!(payload instanceof Blob)) return getApiErrorMessage(error);
  try {
    const text = await payload.text();
    const parsed = JSON.parse(text);
    return parsed?.message || parsed?.Message || parsed?.title || "Report export failed.";
  } catch {
    return "Report export failed. Please try again.";
  }
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function responseFilename(response, fallbackName) {
  const disposition = response?.headers?.["content-disposition"] ?? "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
  const filename = utf8Name ? decodeURIComponent(utf8Name) : plainName;
  return String(filename || fallbackName).trim();
}

function responseBlob(response) {
  return response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: response.headers?.["content-type"] || "application/octet-stream" });
}

async function excelPreview(blob) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return { rows: [], columns: [] };
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  return { rows, columns: exportColumns(rows) };
}

function exportCell(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} records` : "—";
  return String(value);
}

function exportColumns(reportRows) {
  return [...new Set(reportRows.flatMap((row) => Object.keys(row)))];
}

function flattenReportRecord(record, prefix = "", target = {}) {
  Object.entries(record || {}).forEach(([key, value]) => {
    const label = prefix ? `${prefix} ${readableLabel(key)}` : readableLabel(key);
    if (Array.isArray(value)) {
      if (value.every((item) => item === null || typeof item !== "object")) target[label] = value.join(", ");
    } else if (value && typeof value === "object") {
      flattenReportRecord(value, label, target);
    } else {
      target[label] = value ?? "—";
    }
  });
  return target;
}

function detailedReportRows(payload) {
  const candidates = [];
  const queue = [{ value: dataNode(payload), path: "" }];
  const visited = new Set();
  while (queue.length) {
    const { value, path } = queue.shift();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    if (Array.isArray(value)) {
      const objectRows = value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
      if (objectRows.length) {
        const preferred = /student|attendance|admission|detail|record|result|faculty|fee|exam|topper/i.test(path) ? 100000 : 0;
        candidates.push({ score: preferred + objectRows.length, rows: objectRows });
      }
      value.forEach((item, index) => queue.push({ value: item, path: `${path}.${index}` }));
    } else {
      Object.entries(value).forEach(([key, child]) => queue.push({ value: child, path: path ? `${path}.${key}` : key }));
    }
  }
  const selected = candidates.sort((left, right) => right.score - left.score)[0]?.rows;
  if (selected?.length) return selected.map((row) => flattenReportRecord(row));
  const node = dataNode(payload);
  return node && typeof node === "object" && !Array.isArray(node) ? [flattenReportRecord(node)] : [];
}

function admissionReportRows(payload, filters = {}) {
  const matchesId = (actual, expected) => !expected || actual === undefined || actual === null || actual === "" || String(actual) === String(expected);
  return collection(payload, ["admissions", "Admissions", "students", "Students"]).filter((item) => {
    const admissionDate = String(read(item, "admissionDate", "AdmissionDate", "createdAt", "CreatedAt") || "").slice(0, 10);
    return matchesId(read(item, "boardId", "BoardId"), filters.board)
      && matchesId(read(item, "academicYearId", "AcademicYearId"), filters.year)
      && matchesId(read(item, "academicLevelId", "AcademicLevelId"), filters.level)
      && matchesId(read(item, "groupId", "GroupId"), filters.group)
      && matchesId(read(item, "sectionId", "SectionId"), filters.section)
      && (!filters.from || !admissionDate || admissionDate >= filters.from)
      && (!filters.to || !admissionDate || admissionDate <= filters.to);
  }).map((item) => {
    const student = read(item, "student", "Student") || {};
    const firstName = read(item, "firstName", "FirstName") || read(student, "firstName", "FirstName") || "";
    const lastName = read(item, "lastName", "LastName") || read(student, "lastName", "LastName") || "";
    const fullName = read(item, "studentName", "StudentName", "fullName", "FullName", "name", "Name")
      || read(student, "studentName", "StudentName", "fullName", "FullName", "name", "Name")
      || [firstName, lastName].filter(Boolean).join(" ");
    return {
      "Admission Number": read(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || "—",
      "Student Name": fullName || "—",
      "First Name": firstName || "—",
      "Last Name": lastName || "—",
      "Admission Date": String(read(item, "admissionDate", "AdmissionDate") || "—").slice(0, 10),
      Status: read(item, "status", "Status", "admissionStatus", "AdmissionStatus") || "—",
      Board: read(item, "boardName", "BoardName") || read(read(item, "board", "Board") || {}, "boardName", "BoardName", "name", "Name") || "—",
      "Academic Year": read(item, "academicYearName", "AcademicYearName") || read(read(item, "academicYear", "AcademicYear") || {}, "academicYearName", "AcademicYearName", "name", "Name") || "—",
      "Academic Level": read(item, "academicLevelName", "AcademicLevelName") || read(read(item, "academicLevel", "AcademicLevel") || {}, "academicLevelName", "AcademicLevelName", "name", "Name") || "—",
      Group: read(item, "groupName", "GroupName") || read(read(item, "group", "Group") || {}, "groupName", "GroupName", "name", "Name") || "—",
      Section: read(item, "sectionName", "SectionName") || read(read(item, "section", "Section") || {}, "sectionName", "SectionName", "name", "Name") || "—",
      "Roll Number": read(item, "rollNo", "RollNo", "rollNumber", "RollNumber") || "—",
      Mobile: read(item, "mobileNumber", "MobileNumber", "mobile", "Mobile") || read(student, "mobileNumber", "MobileNumber", "mobile", "Mobile") || "—",
      Email: read(item, "email", "Email") || read(student, "email", "Email") || "—",
    };
  });
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("reports");
  const [filters, setFilters] = useState({});
  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });
  const [reports, setReports] = useState(EMPTY_REPORTS);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportErrors, setReportErrors] = useState({});
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [levelLoading, setLevelLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [previewing, setPreviewing] = useState("");
  const [exportingOverview, setExportingOverview] = useState("");
  const [exportingCards, setExportingCards] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [pdfPreviewLoaded, setPdfPreviewLoaded] = useState(false);
  const [auditFilters, setAuditFilters] = useState({});
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const initialized = useRef(false);
  const mountedRef = useRef(true);
  const reportRequestRef = useRef(0);
  const auditRequestRef = useRef(0);
  const previewRequestRef = useRef(0);
  const requestControllersRef = useRef({});
  const filterOptionsCacheRef = useRef({
    academicLevels: new Map(),
    groups: new Map(),
    sections: new Map(),
  });

  const beginRequest = useCallback((key) => {
    requestControllersRef.current[key]?.abort();
    const controller = new AbortController();
    requestControllersRef.current[key] = controller;
    return controller;
  }, []);

  const finishRequest = useCallback((key, controller) => {
    if (requestControllersRef.current[key] === controller) {
      delete requestControllersRef.current[key];
    }
  }, []);

  const cancelRequest = useCallback((key) => {
    requestControllersRef.current[key]?.abort();
    delete requestControllersRef.current[key];
  }, []);

  const abortAllRequests = useCallback(() => {
    Object.entries(requestControllersRef.current).forEach(([key, controller]) => {
      if (key !== "masterOptions") controller.abort();
    });
    const masterOptionsController = requestControllersRef.current.masterOptions;
    requestControllersRef.current = masterOptionsController ? { masterOptions: masterOptionsController } : {};
  }, []);

  const loadMasterOptions = useCallback(async () => {
    const controller = beginRequest("masterOptions");
    setBoardsLoading(true);
    setYearsLoading(true);
    const boardsRequest = apiClient.get(REPORTS_API.filters.boards, {
      params: buildFilterQuery(), signal: controller.signal, skipGlobalLoader: true,
    }).then((response) => {
      if (!mountedRef.current || controller.signal.aborted) return;
      const boards = activeFilterOptions(response.data, ["boards", "Boards"], ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"]);
      setMasterOptions((current) => ({ ...current, boards }));
    }).finally(() => {
      if (mountedRef.current && !controller.signal.aborted) setBoardsLoading(false);
    });
    const yearsRequest = apiClient.get(REPORTS_API.filters.academicYears, {
      params: buildFilterQuery(), signal: controller.signal, skipGlobalLoader: true,
    }).then((response) => {
      if (!mountedRef.current || controller.signal.aborted) return;
      const years = activeAcademicYearOptions(response.data);
      setMasterOptions((current) => ({ ...current, years }));
    }).finally(() => {
      if (mountedRef.current && !controller.signal.aborted) setYearsLoading(false);
    });
    const results = await Promise.allSettled([boardsRequest, yearsRequest]);
    if (!mountedRef.current || controller.signal.aborted) return;
    const failures = results.filter((result) => result.status === "rejected" && !isCanceledRequest(result.reason));
    if (failures.length) setToast("One or more Reports dropdowns could not be loaded from the current backend.");
    finishRequest("masterOptions", controller);
  }, [beginRequest, finishRequest]);

  const loadReports = useCallback(async (selectedFilters) => {
    const requestId = ++reportRequestRef.current;
    const controller = beginRequest("reports");
    const params = buildReportQuery(selectedFilters);
    setReportGenerated(false);
    setPreviewFile(null);
    setLoading(true);
    setError("");
    setReportErrors({});
    const [dashboardResult, ...results] = await Promise.allSettled([
      apiClient.get(REPORTS_API.dashboard, { params, signal: controller.signal }),
      ...REPORT_REQUESTS.map((request) => apiClient.get(request.endpoint, {
        params: request.key === "admissions"
          ? { PageNumber: 1, PageSize: 10000 }
          : { ...params, PageNumber: 1, PageSize: 10000 },
        signal: controller.signal,
      })),
    ]);
    if (!mountedRef.current || controller.signal.aborted || requestId !== reportRequestRef.current) return;
    const nextReports = { ...EMPTY_REPORTS };
    const nextErrors = {};
    const failures = [];
    if (dashboardResult.status === "fulfilled") nextReports.dashboard = dashboardResult.value.data;
    else {
      failures.push({ key: "dashboard", reason: dashboardResult.reason });
      nextErrors.dashboard = getApiErrorMessage(dashboardResult.reason);
    }
    if (dashboardResult.status === "fulfilled") nextReports.overview = dashboardResult.value.data;
    results.forEach((result, index) => {
      const { key } = REPORT_REQUESTS[index];
      if (result.status === "fulfilled") {
        nextReports[key] = REPORT_REQUESTS[index].clientFilter
          ? REPORT_REQUESTS[index].clientFilter(result.value.data, selectedFilters)
          : result.value.data;
      }
      else {
        failures.push({ key, reason: result.reason });
        nextErrors[key] = getApiErrorMessage(result.reason);
      }
    });
    setReports(nextReports);
    setReportErrors(nextErrors);
    setReportGenerated([dashboardResult, ...results].some((result) => result.status === "fulfilled"));
    setAuditPage(1);
    setError(reportFailureMessage(failures));
    setLoading(false);
    finishRequest("reports", controller);
  }, [beginRequest, finishRequest]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      reportRequestRef.current += 1;
      auditRequestRef.current += 1;
      previewRequestRef.current += 1;
      abortAllRequests();
    };
  }, [abortAllRequests]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadMasterOptions();
  }, [loadMasterOptions]);

  useEffect(() => {
    const boardId = positiveId(filters.board);
    if (!boardId) {
      setLevelLoading(false);
      return undefined;
    }
    const cacheKey = String(boardId);
    const cachedLevels = cachedFilterOptions(filterOptionsCacheRef.current.academicLevels, cacheKey);
    if (cachedLevels !== null) {
      setMasterOptions((current) => ({ ...current, levels: cachedLevels }));
      setLevelLoading(false);
      return undefined;
    }
    const controller = beginRequest("academicLevels");
    setLevelLoading(true);
    apiClient.get(REPORTS_API.filters.academicLevels, {
      params: buildFilterQuery({ boardId }),
      signal: controller.signal,
      skipGlobalLoader: true,
    }).then((response) => {
      if (controller.signal.aborted) return;
      const levels = activeFilterOptions(response.data, ["academicLevels", "AcademicLevels", "levels", "Levels"], ["academicLevelId", "AcademicLevelId", "academicLevelID", "levelId", "LevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel", "levelName", "LevelName", "name", "Name"]);
      cacheFilterOptions(filterOptionsCacheRef.current.academicLevels, cacheKey, levels);
      setMasterOptions((current) => ({ ...current, levels }));
      if (!levels.length) setToast("No academic levels available for the selected Board.");
    }).catch((requestError) => {
      if (!controller.signal.aborted && !isCanceledRequest(requestError)) setToast(`Unable to load Academic Levels. ${getApiErrorMessage(requestError)}`);
    }).finally(() => {
      if (!controller.signal.aborted) setLevelLoading(false);
      finishRequest("academicLevels", controller);
    });
    return () => controller.abort();
  }, [beginRequest, filters.board, finishRequest]);

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level) return;
    const boardId = positiveId(filters.board);
    const academicYearId = positiveId(filters.year);
    const academicLevelId = positiveId(filters.level);
    if (!boardId || !academicYearId || !academicLevelId) return undefined;
    const cacheKey = `${boardId}:${academicYearId}:${academicLevelId}`;
    const cachedGroups = cachedFilterOptions(filterOptionsCacheRef.current.groups, cacheKey);
    if (cachedGroups !== null) {
      setMasterOptions((current) => ({ ...current, groups: cachedGroups }));
      setGroupsLoading(false);
      return undefined;
    }
    const controller = beginRequest("groups");
    setGroupsLoading(true);
    apiClient.get(REPORTS_API.filters.groups, {
      params: buildFilterQuery({ boardId, academicYearId, academicLevelId }),
      signal: controller.signal,
      skipGlobalLoader: true,
    }).then(async (response) => {
      if (controller.signal.aborted) return;
      let groups = matchingGroupOptions(
        response.data,
        boardId,
        academicYearId,
        academicLevelId,
        masterOptions.boards,
        masterOptions.levels,
      );
      if (!groups.length) {
        const sourceResponse = await apiClient.get(REPORTS_API.filters.groupsSource, {
          signal: controller.signal,
          skipGlobalLoader: true,
        });
        if (controller.signal.aborted) return;
        groups = matchingGroupOptions(
          sourceResponse.data,
          boardId,
          academicYearId,
          academicLevelId,
          masterOptions.boards,
          masterOptions.levels,
        );
      }
      cacheFilterOptions(filterOptionsCacheRef.current.groups, cacheKey, groups);
      setMasterOptions((current) => ({ ...current, groups }));
      if (!groups.length) setToast("No groups available for the selected filters.");
    }).catch((requestError) => {
      if (!controller.signal.aborted && !isCanceledRequest(requestError)) setToast(`Unable to load Groups. ${getApiErrorMessage(requestError)}`);
    }).finally(() => {
      if (!controller.signal.aborted) setGroupsLoading(false);
      finishRequest("groups", controller);
    });
    return () => controller.abort();
  }, [beginRequest, filters.board, filters.level, filters.year, finishRequest, masterOptions.boards, masterOptions.levels]);

  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group) return;
    const boardId = positiveId(filters.board);
    const academicYearId = positiveId(filters.year);
    const academicLevelId = positiveId(filters.level);
    const groupId = positiveId(filters.group);
    if (!boardId || !academicYearId || !academicLevelId || !groupId) return undefined;
    const cacheKey = `${boardId}:${academicYearId}:${academicLevelId}:${groupId}`;
    const cachedSections = cachedFilterOptions(filterOptionsCacheRef.current.sections, cacheKey);
    if (cachedSections !== null) {
      setMasterOptions((current) => ({ ...current, sections: cachedSections }));
      setSectionsLoading(false);
      return undefined;
    }
    const controller = beginRequest("sections");
    setSectionsLoading(true);
    apiClient.get(REPORTS_API.filters.sections, {
      params: { GroupId: groupId },
      signal: controller.signal,
      skipGlobalLoader: true,
    }).then((response) => {
      if (controller.signal.aborted) return;
      const sections = activeFilterOptions(response.data, ["sections", "Sections"], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
      cacheFilterOptions(filterOptionsCacheRef.current.sections, cacheKey, sections);
      setMasterOptions((current) => ({ ...current, sections }));
      if (!sections.length) setToast("No sections available for the selected filters.");
    }).catch((requestError) => {
      if (!controller.signal.aborted && !isCanceledRequest(requestError)) setToast(`Unable to load Sections. ${getApiErrorMessage(requestError)}`);
    }).finally(() => {
      if (!controller.signal.aborted) setSectionsLoading(false);
      finishRequest("sections", controller);
    });
    return () => controller.abort();
  }, [beginRequest, filters.board, filters.group, filters.level, filters.year, finishRequest]);

  const academicYearOptions = useMemo(() => uniqueAcademicYearsByName(
    masterOptions.years.filter((item) => (
      !filters.board || !item.boardId || item.boardId === String(filters.board)
    )),
    (item) => item.label,
  ), [filters.board, masterOptions.years]);

  const filterFields = useMemo(() => {
    return [
      { name: "board", label: boardsLoading ? "Board (Loading...)" : "Board", type: "select", options: masterOptions.boards, disabled: boardsLoading, required: true },
      { name: "year", label: yearsLoading ? "Academic Year (Loading...)" : "Academic Year", type: "select", options: academicYearOptions, disabled: yearsLoading, required: true },
      { name: "level", label: levelLoading ? "Academic Level (Loading...)" : "Academic Level", type: "select", options: masterOptions.levels, disabled: !positiveId(filters.board) || levelLoading, required: true },
      { name: "group", label: groupsLoading ? "Group (Loading...)" : "Group", type: "select", options: masterOptions.groups, disabled: !positiveId(filters.board) || !positiveId(filters.year) || !positiveId(filters.level) || groupsLoading, required: true },
      { name: "section", label: sectionsLoading ? "Section (Loading...)" : "Section", type: "select", options: masterOptions.sections, disabled: !positiveId(filters.board) || !positiveId(filters.year) || !positiveId(filters.level) || !positiveId(filters.group) || sectionsLoading, required: true },
      { name: "from", label: "From Date", type: "date", required: true },
      { name: "to", label: "To Date", type: "date", required: true },
    ];
  }, [academicYearOptions, boardsLoading, filters.board, filters.group, filters.level, filters.year, groupsLoading, levelLoading, masterOptions, sectionsLoading, yearsLoading]);

  const workloadData = useMemo(() => mapFacultyWorkload(reports.facultyWorkload), [reports.facultyWorkload]);
  const topperRows = useMemo(() => mapToppers(reports.toppers), [reports.toppers]);
  const auditRows = useMemo(() => mapAuditLogs(auditData), [auditData]);
  const auditFilterFields = useMemo(() => [
    { name: "user", label: "User", type: "select", options: auditOptions(auditRows, "user") },
    { name: "role", label: "Role", type: "select", options: auditOptions(auditRows, "role") },
    { name: "module", label: "Module", type: "select", options: auditOptions(auditRows, "module") },
    { name: "action", label: "Action Type", type: "select", options: auditOptions(auditRows, "action") },
    { name: "status", label: "Status", type: "select", options: auditOptions(auditRows, "status") },
  ], [auditRows]);
  const filteredAuditRows = useMemo(() => {
    const search = String(auditFilters.search ?? "").trim().toLowerCase();
    return auditRows.filter((row) => {
      if (["user", "role", "module", "action", "status"].some((key) => auditFilters[key] && row[key] !== auditFilters[key])) return false;
      if (!search) return true;
      return [row.user, row.role, row.module, row.action, row.description, row.recordId]
        .some((value) => String(value ?? "").toLowerCase().includes(search));
    });
  }, [auditFilters, auditRows]);
  const auditPageCount = Math.max(1, Math.ceil(filteredAuditRows.length / auditPageSize));
  const visibleAuditRows = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return filteredAuditRows.slice(start, start + auditPageSize);
  }, [auditPage, auditPageSize, filteredAuditRows]);
  const auditSummary = useMemo(() => {
    const successful = auditRows.filter((row) => auditStatus(row.status) === "success").length;
    const failed = auditRows.filter((row) => auditStatus(row.status) === "failed").length;
    const activeUsers = new Set(auditRows.map((row) => row.user).filter((user) => user && user !== "—")).size;
    return { total: auditRows.length, successful, failed, activeUsers };
  }, [auditRows]);

  const passRate = metric(reports.passPercentage, ["passPercentage", "PassPercentage", "percentage", "Percentage", "passRate", "PassRate"]);
  const summaryValues = useMemo(() => {
    const admissionCount = responseRecordCount(reports.admissions);
    const examinationCount = responseRecordCount(reports.examinations);
    const resultCount = responseRecordCount(reports.results);
    return {
      admissions: admissionCount
        ?? metric(reports.admissions, ["totalAdmissions", "admissions", "admissionsCount", "total", "count"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalAdmissions", "admissionsCount"]),
      attendance: metric(reports.attendance, ["attendancePercentage", "averageAttendance", "attendanceRate", "percentage"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["attendancePercentage", "averageAttendance", "attendanceRate"]),
      staffAttendance: metricFromSources([reports.staffAttendance], ["staffAttendancePercentage", "attendancePercentage", "averageAttendance", "attendanceRate", "percentage"]),
      facultyAttendance: metricFromSources([reports.facultyAttendance], ["facultyAttendancePercentage", "attendancePercentage", "averageAttendance", "attendanceRate", "percentage"]),
      feeCollection: metric(reports.feeCollection, ["collected", "totalCollected", "collectedAmount", "feeCollected", "totalFeeCollected", "amount"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalCollected", "collectedAmount", "feeCollected", "totalFeeCollected"]),
      dueFees: metric(reports.feeOutstanding, ["totalOutstanding", "outstandingAmount", "dueFees", "outstandingFees", "dueAmount", "amount"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalOutstanding", "outstandingAmount", "dueFees", "outstandingFees", "dueAmount"]),
      examinations: examinationCount
        ?? metric(reports.examinations, ["totalExaminations", "examinationCount", "total", "count"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalExaminations", "examinationCount"]),
      results: resultCount
        ?? metric(reports.results, ["published", "resultsPublished", "publishedResults", "resultCount", "total", "count"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["resultsPublished", "publishedResults", "resultCount"]),
      staffWorkload: metricFromSources([reports.staffWorkload], ["averageStaffWorkload", "averageWorkload", "staffWorkload", "weeklyHours", "hoursPerWeek", "totalWorkHours"]),
      facultyWorkload: metricFromSources([reports.facultyWorkload], ["averageFacultyWorkload", "averageWorkload", "facultyWorkload", "weeklyHours", "hoursPerWeek", "totalTeachingHours"]) ?? (workloadData.length ? workloadData.reduce((sum, item) => sum + item.hours, 0) : undefined),
      studentStrength: metric(reports.studentStrength, ["totalStudents", "studentStrength", "total", "count"])
        ?? metricFromSources([reports.overview, reports.dashboard], ["totalStudents", "studentStrength"]),
      passPercentage: passRate
        ?? metricFromSources([reports.overview, reports.dashboard], ["passPercentage", "passRate"]),
      toppers: metricFromSources([reports.toppers], ["identified", "toppersIdentified", "topperCount", "totalToppers", "count"]) ?? responseRecordCount(reports.toppers),
    };
  }, [passRate, reports, workloadData]);
  const handleFilterChange = (name, value) => {
    reportRequestRef.current += 1;
    auditRequestRef.current += 1;
    previewRequestRef.current += 1;
    cancelRequest("reports");
    cancelRequest("auditLogs");
    cancelRequest("preview");
    setReportGenerated(false);
    setPreviewFile(null);
    setReports(EMPTY_REPORTS);
    setReportErrors({});
    setError("");
    setLoading(false);
    setAuditData(null);
    setAuditError("");
    setAuditLoading(false);
    setAuditPage(1);
    setPreviewing("");
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "board") {
        Object.assign(next, { year: "", level: "", group: "", section: "" });
        setMasterOptions((options) => ({ ...options, levels: [], groups: [], sections: [] }));
        setLevelLoading(false);
        setGroupsLoading(false);
        setSectionsLoading(false);
      }
      if (name === "year" || name === "level") {
        Object.assign(next, { group: "", section: "" });
        setMasterOptions((options) => ({ ...options, groups: [], sections: [] }));
        setGroupsLoading(false);
        setSectionsLoading(false);
      }
      if (name === "group") next.section = "";
      if (name === "group") {
        setMasterOptions((options) => ({ ...options, sections: [] }));
        setSectionsLoading(false);
      }
      return next;
    });
  };

  const generateReport = () => {
    if (loading) return;
    const requiredIds = [filters.board, filters.year, filters.level, filters.group, filters.section];
    if (!requiredIds.every((value) => positiveId(value)) || !validDateInput(filters.from) || !validDateInput(filters.to)) {
      setReportGenerated(false);
      setPreviewFile(null);
      setToast("Complete all required report filters before generating the report.");
      return;
    }
    if (filters.from > filters.to) {
      setReportGenerated(false);
      setToast("From Date must be earlier than or equal to To Date.");
      return;
    }
    loadReports(filters);
  };

  const resetReports = () => {
    reportRequestRef.current += 1;
    auditRequestRef.current += 1;
    previewRequestRef.current += 1;
    abortAllRequests();
    setFilters({});
    setMasterOptions((options) => ({ ...options, levels: [], groups: [], sections: [] }));
    setReports(EMPTY_REPORTS);
    setReportErrors({});
    setReportGenerated(false);
    setPreviewFile(null);
    setError("");
    setToast("");
    setLevelLoading(false);
    setGroupsLoading(false);
    setSectionsLoading(false);
    setLoading(false);
    setAuditLoading(false);
    setPreviewing("");
    setExportingOverview("");
    setExportingCards({});
    setAuditFilters({});
    setAuditData(null);
    setAuditError("");
    setAuditPage(1);
  };

  const handleAuditFilterChange = (name, value) => {
    setAuditFilters((current) => ({ ...current, [name]: value }));
    setAuditPage(1);
  };

  const resetAuditFilters = () => {
    setAuditFilters({});
    setAuditPage(1);
  };

  const fetchAuditLogs = async () => {
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      setAuditError("From Date must be earlier than or equal to To Date.");
      return;
    }
    const requestId = ++auditRequestRef.current;
    const controller = beginRequest("auditLogs");
    setAuditLoading(true);
    setAuditError("");
    try {
      const response = await apiClient.get(REPORTS_API.details.auditLogs, {
        params: buildReportQuery(filters),
        signal: controller.signal,
      });
      if (!mountedRef.current || controller.signal.aborted || requestId !== auditRequestRef.current) return;
      setAuditData(response.data);
      setAuditPage(1);
    } catch (auditRequestError) {
      if (!mountedRef.current || controller.signal.aborted || isCanceledRequest(auditRequestError) || requestId !== auditRequestRef.current) return;
      setAuditData(null);
      setAuditError(getApiErrorMessage(auditRequestError));
    } finally {
      if (mountedRef.current && !controller.signal.aborted && requestId === auditRequestRef.current) setAuditLoading(false);
      finishRequest("auditLogs", controller);
    }
  };

  const requestReportFile = async (format, reportType, title, signal) => {
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      throw new Error("From Date must be earlier than or equal to To Date.");
    }
    const extension = format === "pdf" ? "pdf" : "xlsx";
    const response = await apiClient.get(
      format === "pdf" ? REPORTS_API.exportPdf : REPORTS_API.exportExcel,
      { params: { ...buildReportQuery(filters), reportType }, responseType: "blob", signal },
    );
    const blob = responseBlob(response);
    const contentType = String(response.headers?.["content-type"] || blob.type || "").toLowerCase();
    if (contentType.includes("json") || contentType.includes("text/plain")) {
      throw Object.assign(new Error("The Reports API returned an error instead of a report file."), { response: { ...response, data: blob } });
    }
    if (format === "pdf" && contentType && !contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      throw new Error(`The Reports API returned '${contentType}' instead of a PDF file.`);
    }
    const file = {
      blob,
      filename: responseFilename(response, `${reportType}-${new Date().toISOString().slice(0, 10)}.${extension}`),
      contentType,
      format,
      title,
    };
    if (format === "excel") Object.assign(file, await excelPreview(blob));
    return file;
  };

  const requestDetailedCardFile = async (card, format) => {
    const isAdmissionsReport = card.reportType === "admissions";
    const endpoint = isAdmissionsReport ? apiEndpoints.admissions.getAll : REPORT_DETAIL_BY_TYPE[card.reportType];
    if (!endpoint) throw new Error(`Detailed ${card.label} report is unavailable.`);
    const response = await apiClient.get(endpoint, {
      params: isAdmissionsReport
        ? { PageNumber: 1, PageSize: 10000 }
        : { ...buildReportQuery(filters), PageNumber: 1, PageSize: 10000 },
    });
    const rows = isAdmissionsReport ? admissionReportRows(response.data, filters) : detailedReportRows(response.data);
    if (!rows.length) throw new Error(`No detailed ${card.label.toLowerCase()} records were returned for the selected filters.`);
    const columns = exportColumns(rows);
    const exportDate = new Date().toISOString().slice(0, 10);
    const filenameBase = `${card.reportType}-detailed-${exportDate}`;

    if (format === "excel") {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => Object.fromEntries(
        columns.map((column) => [column, exportCell(row[column])]),
      )));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, card.label.slice(0, 31));
      const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      return { blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename: `${filenameBase}.xlsx` };
    }

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const document = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait", unit: "pt", format: "a4" });
    document.setFontSize(16);
    document.text(`${card.label} Detailed Report`, 30, 34);
    document.setFontSize(8);
    document.setTextColor(88, 97, 84);
    document.text(`${rows.length} record${rows.length === 1 ? "" : "s"} · Generated ${new Date().toLocaleString("en-IN")}`, 30, 49);
    autoTable(document, {
      startY: 60,
      head: [columns.map(readableLabel)],
      body: rows.map((row) => columns.map((column) => exportCell(row[column]))),
      styles: { fontSize: columns.length > 8 ? 6 : 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [247, 248, 239] },
      margin: { left: 20, right: 20 },
    });
    return { blob: document.output("blob"), filename: `${filenameBase}.pdf` };
  };

  const previewReport = async (format) => {
    const requestId = ++previewRequestRef.current;
    const controller = beginRequest("preview");
    setPreviewing(format);
    setPdfPreviewLoaded(false);
    try {
      const file = await requestReportFile(format, OVERVIEW_REPORT_TYPE, "Reports Overview", controller.signal);
      if (!mountedRef.current || controller.signal.aborted || requestId !== previewRequestRef.current) return;
      setPreviewFile({ ...file, url: format === "pdf" ? URL.createObjectURL(file.blob) : "" });
    } catch (previewError) {
      if (!mountedRef.current || controller.signal.aborted || isCanceledRequest(previewError) || requestId !== previewRequestRef.current) return;
      setPreviewFile(null);
      setToast(await getExportErrorMessage(previewError));
    } finally {
      if (mountedRef.current && !controller.signal.aborted && requestId === previewRequestRef.current) setPreviewing("");
      finishRequest("preview", controller);
    }
  };

  const exportCardReport = async (card, format) => {
    const requestKey = `${card.key}-${format}`;
    if (exportingCards[requestKey]) return;
    setExportingCards((current) => ({ ...current, [requestKey]: true }));
    try {
      const file = await requestDetailedCardFile(card, format);
      downloadBlob(file.blob, file.filename);
      if (mountedRef.current) setToast(`${card.label} ${format === "pdf" ? "PDF" : "Excel"} exported successfully.`);
    } catch (exportError) {
      if (mountedRef.current) setToast(await getExportErrorMessage(exportError));
    } finally {
      if (mountedRef.current) setExportingCards((current) => {
        const next = { ...current };
        delete next[requestKey];
        return next;
      });
    }
  };

  const exportOverview = async (format) => {
    if (exportingOverview) return;
    setExportingOverview(format);
    try {
      const file = await requestReportFile(format, OVERVIEW_REPORT_TYPE, "Reports Overview");
      downloadBlob(file.blob, file.filename);
      if (mountedRef.current) setToast(`Reports Overview ${format === "pdf" ? "PDF" : "Excel"} exported successfully.`);
    } catch (exportError) {
      if (mountedRef.current) setToast(await getExportErrorMessage(exportError));
    } finally {
      if (mountedRef.current) setExportingOverview("");
    }
  };

  const printBackendReport = async (reportType = OVERVIEW_REPORT_TYPE) => {
    const printWindow = window.open("", "reports-print", "width=960,height=720");
    if (!printWindow) {
      setToast("The print window was blocked. Allow pop-ups and try again.");
      return;
    }
    printWindow.document.write("<p style='font-family:Arial,sans-serif;padding:24px'>Preparing report for printing...</p>");
    try {
      const file = await requestReportFile("pdf", reportType, "Printable Report");
      const url = URL.createObjectURL(file.blob);
      printWindow.location.href = url;
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }, { once: true });
    } catch (printError) {
      printWindow.close();
      setToast(await getExportErrorMessage(printError));
    }
  };

  useEffect(() => () => {
    if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
  }, [previewFile]);

  return (
    <DashboardLayout
      title={activeTab === "reports" ? "Reports & Analytics" : "Audit Logs"}
      subtitle={activeTab === "reports" ? "Institution-wide insights across academics, fees and attendance." : "System activity recorded for the selected report period."}
      breadcrumb={["Administration"]}
    >
      <Toast message={toast} onClose={() => setToast("")} />
      <div className="reports-tabs" role="tablist" aria-label="Reports sections">
        <button className={`reports-tab ${activeTab === "reports" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "reports"} onClick={() => { setActiveTab("reports"); setSelectedAuditLog(null); }}>Reports & Analytics</button>
        <button className={`reports-tab ${activeTab === "audit" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "audit"} onClick={() => { setActiveTab("audit"); setPreviewFile(null); if (!auditData && !auditLoading) fetchAuditLogs(); }}>Audit Logs</button>
      </div>
      {activeTab === "reports" ? <>
      <section className="cms-card reports-filter-card">
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((field) => <Field key={field.name} field={field} value={filters[field.name]} onChange={handleFilterChange} />)}
          </div>
          <div className="reports-filter-actions">
            <button className="cms-btn cms-btn-primary" onClick={generateReport} disabled={loading}>Generate Report</button>
            <button className="cms-btn cms-btn-ghost" onClick={resetReports} disabled={loading}>Reset</button>
          </div>
        </div>
      </section>

      <>
          {error ? <div className="reports-error-banner" role="alert"><span>{error}</span><button className="cms-btn cms-btn-ghost" type="button" onClick={() => loadReports(filters)} disabled={loading}>Retry</button></div> : null}
          <section className="reports-summary-panel" aria-labelledby="reports-summary-title">
            <div className="reports-summary-panel-head">
              <div><h2 id="reports-summary-title">Reports Overview</h2><p>Key institution-wide report metrics</p></div>
              {reportGenerated ? <div className="reports-summary-actions" aria-label="Report file actions">
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("pdf")} disabled={previewing === "pdf"}><Eye size={14} />{previewing === "pdf" ? "Loading..." : "Review PDF"}</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => previewReport("excel")} disabled={previewing === "excel"}><Eye size={14} />{previewing === "excel" ? "Loading..." : "Review Excel"}</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportOverview("pdf")} disabled={Boolean(exportingOverview)}><Download size={14} />{exportingOverview === "pdf" ? "Exporting..." : "Export PDF"}</button>
                <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportOverview("excel")} disabled={Boolean(exportingOverview)}><FileSpreadsheet size={14} />{exportingOverview === "excel" ? "Exporting..." : "Export Excel"}</button>
              </div> : null}
            </div>
            <div className="reports-summary-grid" aria-label="Report summary">
              {summaryCardConfig.map((card) => {
                const { key, sourceKey, label, icon: Icon, image, tone, currency, suffix } = card;
                const format = { currency, suffix };
                const source = reports[sourceKey];
                const hasLiveData = hasReportData(source);
                const hasDisplayData = summaryValues[key] !== undefined || hasLiveData;
                const details = hasLiveData
                  ? reportDetails(source, summaryValues[key], format)
                  : [];
                const displayValue = hasDisplayData ? formatMetric(summaryValues[key], format) : reportErrors[sourceKey] ? "Unavailable" : "—";
                return <article className="reports-summary-card reports-summary-card-expanded" key={key}>
                  <div className="reports-summary-card-head">
                    <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true">{image ? <img className="reports-summary-image" src={image} alt="" /> : <Icon size={20} strokeWidth={2} />}</span>
                    <div className="reports-summary-content"><span>{label}</span><strong>{displayValue}</strong></div>
                  </div>
                  {details.length || reportErrors[sourceKey] ? <dl className="reports-summary-details">
                    {details.length
                      ? details.map((detail) => <div key={`${detail.label}-${detail.value}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)
                      : <div><dt>Details</dt><dd>{reportErrors[sourceKey]}</dd></div>}
                  </dl> : null}
                  {reportGenerated && hasDisplayData ? <div className="reports-card-actions">
                    <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportCardReport(card, "pdf")} disabled={Boolean(exportingCards[`${key}-pdf`])}><Download size={13} />{exportingCards[`${key}-pdf`] ? "Exporting..." : "Export PDF"}</button>
                    <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportCardReport(card, "excel")} disabled={Boolean(exportingCards[`${key}-excel`])}><FileSpreadsheet size={13} />{exportingCards[`${key}-excel`] ? "Exporting..." : "Export Excel"}</button>
                  </div> : null}
                </article>;
              })}
            </div>
          </section>
        </>
      </> :
          <section className="reports-audit-section" aria-labelledby="audit-logs-title">
            <div className="reports-chart-head reports-audit-head">
              <div><h2 id="audit-logs-title">Audit Logs</h2><p>System activity recorded for the selected report period</p></div>
            </div>

            <div className="reports-audit-filters">
              <div className="cms-filters">
                {auditFilterFields.map((field) => <Field key={field.name} field={field} value={auditFilters[field.name]} onChange={handleAuditFilterChange} />)}
                <div className="cms-field reports-audit-search-field">
                  <label htmlFor="audit-search">Search</label>
                  <span className="reports-audit-search"><Search3DIcon size={16} aria-hidden="true" /><input id="audit-search" type="search" list="audit-search-samples" value={auditFilters.search ?? ""} placeholder="User, module, action, record ID..." onChange={(event) => handleAuditFilterChange("search", event.target.value)} /></span>
                  <datalist id="audit-search-samples">{AUDIT_SEARCH_SAMPLES.map((value) => <option key={value} value={value} />)}</datalist>
                </div>
              </div>
              <div className="reports-filter-actions">
                <button className="cms-btn cms-btn-ghost" type="button" onClick={resetAuditFilters} disabled={auditLoading}>Reset Filters</button>
                <button className="cms-btn cms-btn-primary" type="button" onClick={fetchAuditLogs} disabled={auditLoading}>{auditLoading ? "Fetching..." : "Fetch Data"}</button>
              </div>
            </div>

            {auditLoading ? <div className="reports-audit-loader"><Loader label="Fetching audit logs..." /></div> : null}
            {auditError ? <div className="reports-error-banner reports-audit-error" role="alert">{auditError}</div> : null}
            {!auditLoading ? <>
            <div className="reports-audit-summary" aria-label="Audit log summary">
              {[
                { label: "Total Activities", value: auditSummary.total, icon: Activity, tone: "blue" },
                { label: "Successful Actions", value: auditSummary.successful, icon: ShieldCheck, tone: "green" },
                { label: "Failed Actions", value: auditSummary.failed, icon: ShieldX, tone: "amber" },
                { label: "Active Users", value: auditSummary.activeUsers, icon: Users, tone: "violet" },
              ].map(({ label, value, icon: Icon, tone }) => (
                <article className="reports-summary-card" key={label}>
                  <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true"><Icon size={20} /></span>
                  <div className="reports-summary-content"><span>{label}</span><strong>{value}</strong></div>
                </article>
              ))}
            </div>
            <div className="reports-table-wrap reports-audit-table-wrap">
              <table className="reports-top-students reports-audit-table">
                <thead><tr><th>Date & Time</th><th>User</th><th>Role</th><th>Module</th><th>Action</th><th>Description</th><th>Record ID</th><th>Status</th><th>Details</th></tr></thead>
                <tbody>{visibleAuditRows.length ? visibleAuditRows.map((log) => {
                  const status = auditStatus(log.status);
                  return <tr key={log.id}>
                    <td>{formatAuditDate(log.timestamp)}</td><td><strong>{log.user}</strong></td><td>{log.role}</td><td>{log.module}</td><td>{log.action}</td>
                    <td className="reports-audit-description" title={log.description}>{log.description}</td><td>{log.recordId ?? "—"}</td>
                    <td><span className={`cms-badge ${status === "success" ? "cms-badge-active" : status === "failed" ? "cms-badge-danger" : "cms-badge-inactive"}`}>{log.status}</span></td>
                    <td><button className="cms-btn cms-btn-ghost reports-view-btn" type="button" onClick={() => setSelectedAuditLog(log)}><Eye size={15} />View</button></td>
                  </tr>;
                }) : <tr><td colSpan={9}><div className="cms-empty">No audit logs available for the selected filters.</div></td></tr>}</tbody>
              </table>
            </div>

            {filteredAuditRows.length ? <div className="cms-pagination reports-audit-pagination">
              <span className="cms-page-info">Showing {(auditPage - 1) * auditPageSize + 1}–{Math.min(auditPage * auditPageSize, filteredAuditRows.length)} of {filteredAuditRows.length}</span>
              <label className="reports-page-size">Rows <select value={auditPageSize} onChange={(event) => { setAuditPageSize(Number(event.target.value)); setAuditPage(1); }}>{AUDIT_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
              <button className="cms-page-btn" type="button" disabled={auditPage === 1} onClick={() => setAuditPage((page) => page - 1)}>Previous</button>
              <span className="reports-page-number">Page {auditPage} of {auditPageCount}</span>
              <button className="cms-page-btn" type="button" disabled={auditPage === auditPageCount} onClick={() => setAuditPage((page) => page + 1)}>Next</button>
            </div> : null}
            </> : null}
          </section>
      }
      {previewFile?.format === "pdf" ? <Modal title="PDF Preview" className="reports-preview-modal" onClose={() => setPreviewFile(null)} footer={<>
        {pdfPreviewLoaded ? <button className="cms-btn cms-btn-ghost" type="button" onClick={() => printBackendReport()}><Printer size={15} />Print PDF</button> : null}
        {pdfPreviewLoaded ? <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}><Download size={15} />Download PDF</button> : null}
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>Close</button>
      </>}>
        <div className="reports-pdf-preview"><iframe src={`${previewFile.url}#toolbar=0&navpanes=0`} title="Generated report PDF preview" onLoad={() => setPdfPreviewLoaded(true)} /></div>
      </Modal> : null}
      {previewFile?.format === "excel" ? <Modal title="Excel Preview" className="reports-preview-modal" onClose={() => setPreviewFile(null)} footer={<>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => printBackendReport()}><Printer size={15} />Print Excel</button>
        <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}><Download size={15} />Download Excel</button>
        <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>Close</button>
      </>}>
        <div className="reports-excel-preview"><table className="reports-top-students"><thead><tr>{previewFile.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
          {previewFile.rows.map((row, index) => <tr key={index}>{previewFile.columns.map((column) => <td key={column}>{exportCell(row[column])}</td>)}</tr>)}
        </tbody></table></div>
      </Modal> : null}
      {selectedAuditLog ? <Modal title="Audit Log Details" onClose={() => setSelectedAuditLog(null)} footer={<button className="cms-btn cms-btn-primary" type="button" onClick={() => setSelectedAuditLog(null)}>Close</button>}>
        <dl className="reports-audit-details">
          {[
            ["Date & Time", formatAuditDate(selectedAuditLog.timestamp)], ["User", selectedAuditLog.user], ["Role", selectedAuditLog.role],
            ["Module", selectedAuditLog.module], ["Action", selectedAuditLog.action], ["Description", selectedAuditLog.description],
            ["Record ID / Entity", selectedAuditLog.recordId], ["Status", selectedAuditLog.status], ["IP Address", selectedAuditLog.ipAddress],
            ["Device / Browser", selectedAuditLog.device], ["Previous Value", selectedAuditLog.previousValue], ["New Value", selectedAuditLog.newValue],
          ].filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—").map(([label, value]) => <div className={label.includes("Value") || label === "Description" || label === "Device / Browser" ? "full" : ""} key={label}><dt>{label}</dt><dd>{label.includes("Value") ? <pre>{displayAuditValue(value)}</pre> : displayAuditValue(value)}</dd></div>)}
        </dl>
      </Modal> : null}
    </DashboardLayout>
  );
}
