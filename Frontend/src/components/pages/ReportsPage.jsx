import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Activity,
  Award,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Eye,
  Percent,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldX,
  Trophy,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
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

const summaryCardConfig = [
  { key: "admissions", sourceKey: "admissions", reportType: "admissions", label: "Total Admissions", icon: GraduationCap, image: admissionsImage, tone: "blue", endpoint: REPORTS_API.details.admissions },
  { key: "attendance", sourceKey: "attendance", reportType: "attendance", label: "Average Attendance", icon: CalendarCheck, image: attendanceImage, tone: "green", suffix: "%", endpoint: REPORTS_API.details.attendance },
  { key: "feeCollection", sourceKey: "feeCollection", reportType: "fee-collection", label: "Total Fee Collection", icon: WalletCards, image: feeCollectionImage, tone: "violet", currency: true, endpoint: REPORTS_API.details.feeCollection },
  { key: "dueFees", sourceKey: "feeOutstanding", reportType: "due-fees", label: "Outstanding Due Fees", icon: AlertCircle, image: dueFeesImage, tone: "amber", currency: true, endpoint: REPORTS_API.details.dueFees },
  { key: "examinations", sourceKey: "examinations", reportType: "examinations", label: "Examinations Conducted", icon: FileSpreadsheet, image: examinationsImage, tone: "blue", endpoint: REPORTS_API.details.examinations },
  { key: "results", sourceKey: "results", reportType: "results", label: "Results Published", icon: Award, image: resultsImage, tone: "green", endpoint: REPORTS_API.details.results },
  { key: "facultyWorkload", sourceKey: "facultyWorkload", reportType: "faculty-workload", label: "Faculty Workload", icon: BriefcaseBusiness, image: facultyWorkloadImage, tone: "violet", suffix: " hrs/wk", endpoint: REPORTS_API.details.staffWorkload },
  { key: "studentStrength", sourceKey: "studentStrength", reportType: "student-strength", label: "Student Strength", icon: Users, image: studentStrengthImage, tone: "blue", endpoint: REPORTS_API.details.studentStrength },
  { key: "passPercentage", sourceKey: "passPercentage", reportType: "pass-percentage", label: "Pass Percentage", icon: Percent, image: passPercentageImage, tone: "green", suffix: "%", endpoint: REPORTS_API.details.passPercentage },
  { key: "toppers", sourceKey: "toppers", reportType: "toppers", label: "Toppers Identified", icon: Trophy, image: toppersImage, tone: "amber", endpoint: REPORTS_API.details.toppers },
];

const AUDIT_PAGE_SIZES = [10, 25, 50, 100];
const DETAIL_PAGE_SIZES = [10, 25, 50, 100];
const AUDIT_SEARCH_SAMPLES = ["Super Admin", "Student Management", "Login", "Export", "Success", "STU-1001"];

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

function read(item, ...keys) {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
}

function dataNode(payload) {
  let node = payload;
  const visited = new Set();
  while (node && typeof node === "object" && !Array.isArray(node) && !visited.has(node)) {
    visited.add(node);
    const wrapped = node.data ?? node.Data ?? node.result ?? node.Result ?? node.details ?? node.Details;
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
  for (const key of ["items", "Items", "results", "Results", "records", "Records", "details", "Details", "$values"]) {
    if (Array.isArray(node?.[key])) return node[key];
  }
  return [];
}

function activeOption(item) {
  const marker = read(item, "isActive", "IsActive", "active", "Active", "status", "Status", "isCurrent", "IsCurrent");
  if (marker === undefined || marker === null || marker === "") return true;
  if (marker === false) return false;
  return !["false", "inactive", "disabled"].includes(String(marker).trim().toLowerCase());
}

function activeFilterOptions(payload, preferredKeys, idKeys, labelKeys) {
  const unique = new Map();
  collection(payload, preferredKeys).forEach((item) => {
    if (!activeOption(item)) return;
    const value = read(item, ...idKeys, "value", "Value");
    if (value === undefined || value === null || value === "") return;
    const id = positiveId(value);
    if (!id || unique.has(id)) return;
    const label = String(read(item, ...labelKeys, "label", "Label", "text", "Text", "name", "Name") ?? value);
    unique.set(id, { value: String(id), label });
  });
  return Array.from(unique.values());
}

function activeAcademicYearOptions(payload) {
  const unique = new Map();
  collection(payload, ["academicYears", "AcademicYears", "years", "Years"]).forEach((item) => {
    if (!activeOption(item)) return;
    const id = positiveId(read(item, "academicYearId", "AcademicYearId", "id", "Id", "value", "Value"));
    if (!id || unique.has(id)) return;
    const label = String(read(item, "academicYearName", "AcademicYearName", "name", "Name", "label", "Label") ?? id);
    const boardId = positiveId(read(item, "boardId", "BoardId"));
    unique.set(id, { value: String(id), label, boardId: boardId ? String(boardId) : "" });
  });
  return Array.from(unique.values());
}

function formatMetric(value, { currency = false, suffix = "" } = {}) {
  if (value === undefined || value === null || Number.isNaN(value)) return "0";
  if (currency) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
  }
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
  return `${formatted}${suffix}`;
}

function formatColHeader(col) {
  const map = {
    admissionId: "Admission ID",
    applicationNumber: "App No",
    admissionNumber: "Admission No",
    admissionDate: "Admission Date",
    rollNumber: "Roll No",
    studentName: "Student Name",
    fatherName: "Father's Name",
    mobileNumber: "Mobile",
    gender: "Gender",
    boardName: "Board",
    academicYearName: "Academic Year",
    groupName: "Group",
    sectionName: "Section",
    maximumStrength: "Capacity",
    totalStudents: "Total Students",
    maleStudents: "Male",
    femaleStudents: "Female",
    otherStudents: "Other",
    present: "Present",
    absent: "Absent",
    late: "Late",
    leave: "Leave",
    attendancePercentage: "Attendance %",
    staffId: "Staff ID",
    employeeCode: "Emp Code",
    staffName: "Staff Name",
    department: "Department",
    designation: "Designation",
    totalWorkingDays: "Working Days",
    presentDays: "Present Days",
    absentDays: "Absent Days",
    leaveDays: "Leave Days",
    paymentId: "Payment ID",
    receiptNumber: "Receipt No",
    paymentDate: "Payment Date",
    feeHead: "Fee Head",
    paidAmount: "Paid Amount",
    paymentMode: "Payment Mode",
    transactionReference: "Txn Ref",
    feeId: "Fee ID",
    totalFee: "Total Fee",
    discountAmount: "Discount",
    fineAmount: "Fine",
    dueAmount: "Due Amount",
    dueDate: "Due Date",
    examinationId: "Exam ID",
    examCode: "Exam Code",
    examName: "Exam Name",
    examType: "Exam Type",
    startDate: "Start Date",
    endDate: "End Date",
    totalSubjects: "Subjects",
    resultId: "Result ID",
    subjectName: "Subject",
    marksObtained: "Marks",
    maxMarks: "Max Marks",
    maxTotalMarks: "Max Marks",
    totalMarks: "Total Marks",
    percentage: "Percentage",
    grade: "Grade",
    resultStatus: "Result",
    rank: "Rank",
    assignedSectionsCount: "Sections",
    assignedSubjectsCount: "Subjects",
    totalPeriodsPerWeek: "Periods/Wk",
    weeklyHours: "Weekly Hrs",
    workloadStatus: "Status",
  };
  return map[col] || col.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatCellVal(col, val) {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") {
    return val ? (
      <span className="cms-badge cms-badge-active"><CheckCircle2 size={12} /> Yes</span>
    ) : (
      <span className="cms-badge cms-badge-inactive"><XCircle size={12} /> No</span>
    );
  }
  if (typeof val === "number" && (/amount|fee|collection|paid|due|discount|fine/i.test(col))) {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }
  if (typeof val === "number" && (/percentage|rate|percent/i.test(col))) {
    return `${val.toFixed(1)}%`;
  }
  if (typeof val === "number" && (/hours|weeklyhours/i.test(col))) {
    return `${val.toFixed(1)} hrs/wk`;
  }
  if (String(col).toLowerCase() === "status" || String(col).toLowerCase() === "resultstatus") {
    const s = String(val).toLowerCase();
    const isSuccess = s === "approved" || s === "paid" || s === "pass" || s === "passed" || s === "promoted" || s === "optimal" || s === "completed";
    const isDanger = s === "rejected" || s === "failed" || s === "fail" || s === "cancelled" || s === "overloaded";
    return (
      <span className={`cms-badge ${isSuccess ? "cms-badge-active" : isDanger ? "cms-badge-danger" : "cms-badge-inactive"}`}>
        {String(val)}
      </span>
    );
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val) && (col.toLowerCase().includes("date") || col.toLowerCase().includes("at"))) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  return String(val);
}


function buildFilterQuery(values = {}) {
  const params = {};
  for (const key of ["boardId", "academicYearId", "academicLevelId", "groupId"]) {
    const id = positiveId(values[key]);
    if (id) params[key] = id;
  }
  return params;
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

function exportCsv(rows, columns, filename) {
  const headerLine = columns.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  const dataLines = rows.map((row) => columns.map((c) => `"${String(row[c] ?? "—").replace(/"/g, '""')}"`).join(","));
  const csvContent = [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
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
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return { rows, columns };
}

function mapAuditLogs(payload) {
  return collection(payload, ["auditLogs", "AuditLogs", "logs", "Logs"])
    .map((item, index) => ({
      id: read(item, "auditLogId", "AuditLogId", "logId", "LogId", "id", "Id") ?? index,
      timestamp: read(item, "timestamp", "Timestamp", "createdAt", "CreatedAt", "createdDate", "CreatedDate", "dateTime", "DateTime"),
      user: String(read(item, "userName", "UserName", "fullName", "FullName", "performedBy", "PerformedBy") ?? "System"),
      role: String(read(item, "roleName", "RoleName", "role", "Role", "userRole", "UserRole") ?? "—"),
      module: String(read(item, "module", "Module", "moduleName", "ModuleName", "entityName", "EntityName") ?? "—"),
      action: String(read(item, "action", "Action", "actionType", "ActionType", "operation", "Operation") ?? "—"),
      description: String(read(item, "description", "Description", "details", "Details", "message", "Message") ?? "—"),
      recordId: read(item, "recordId", "RecordId", "entityId", "EntityId", "referenceId", "ReferenceId"),
      status: String(read(item, "status", "Status", "result", "Result", "outcome", "Outcome") ?? "Success"),
      previousValue: read(item, "oldValue", "OldValue", "previousValue", "PreviousValue"),
      newValue: read(item, "newValue", "NewValue", "updatedValue", "UpdatedValue"),
      ipAddress: read(item, "ipAddress", "IpAddress", "clientIp", "ClientIp"),
      device: read(item, "userAgent", "UserAgent", "device", "Device", "browser", "Browser"),
    }))
    .filter((item) => [item.timestamp, item.user, item.module, item.action, item.description].some(Boolean));
}

function formatAuditDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export default function ReportsPage() {
  const {
    boards: contextBoards = [],
    academicYears: contextAcademicYears = [],
    selectedBoard,
    selectedAcademicYear,
    selectedBoardId,
    selectedAcademicYearId,
    boardsLoading: contextBoardsLoading = false,
    academicYearsLoading: contextYearsLoading = false,
  } = useAcademicContext();

  const [activeTab, setActiveTab] = useState("reports");
  const [filters, setFilters] = useState(() => ({
    board: selectedBoardId ? String(selectedBoardId) : (selectedBoard?.id ? String(selectedBoard.id) : ""),
    year: selectedAcademicYearId ? String(selectedAcademicYearId) : (selectedAcademicYear?.id ? String(selectedAcademicYear.id) : ""),
    level: "",
    group: "",
    section: "",
    from: `${new Date().getFullYear()}-01-01`,
    to: new Date().toISOString().slice(0, 10),
  }));

  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedCardKey, setSelectedCardKey] = useState("admissions");
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);

  const [reportGenerated, setReportGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [boardsLoading, setBoardsLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [levelLoading, setLevelLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [previewing, setPreviewing] = useState("");
  const [exportingOverview, setExportingOverview] = useState("");
  const [exportingCards, setExportingCards] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [pdfPreviewLoaded, setPdfPreviewLoaded] = useState(false);

  // Audit tab
  const [auditFilters, setAuditFilters] = useState({});
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  const initialized = useRef(false);
  const mountedRef = useRef(true);
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

  const loadMasterOptions = useCallback(async () => {
    const controller = beginRequest("masterOptions");
    setBoardsLoading(true);
    setYearsLoading(true);
    try {
      const [boardsRes, yearsRes] = await Promise.allSettled([
        apiClient.get(REPORTS_API.filters.boards, { signal: controller.signal, skipGlobalLoader: true }),
        apiClient.get(REPORTS_API.filters.academicYears, { signal: controller.signal, skipGlobalLoader: true }),
      ]);
      if (!mountedRef.current || controller.signal.aborted) return;
      if (boardsRes.status === "fulfilled") {
        const boards = activeFilterOptions(boardsRes.value.data, ["boards", "Boards"], ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]);
        setMasterOptions((curr) => ({ ...curr, boards }));
      }
      if (yearsRes.status === "fulfilled") {
        const years = activeAcademicYearOptions(yearsRes.value.data);
        setMasterOptions((curr) => ({ ...curr, years }));
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setBoardsLoading(false);
        setYearsLoading(false);
      }
      finishRequest("masterOptions", controller);
    }
  }, [beginRequest, finishRequest]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      Object.values(requestControllersRef.current).forEach((c) => c.abort());
    };
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadMasterOptions();
  }, [loadMasterOptions]);

  // Sync with global academic context whenever changed
  useEffect(() => {
    if (selectedBoardId) {
      setFilters((prev) => {
        if (prev.board === String(selectedBoardId)) return prev;
        return { ...prev, board: String(selectedBoardId), level: "", group: "", section: "" };
      });
    }
  }, [selectedBoardId]);

  useEffect(() => {
    if (selectedAcademicYearId) {
      setFilters((prev) => {
        if (prev.year === String(selectedAcademicYearId)) return prev;
        return { ...prev, year: String(selectedAcademicYearId), group: "", section: "" };
      });
    }
  }, [selectedAcademicYearId]);

  // Load Levels when Board changes (or all levels if no board selected)
  useEffect(() => {
    const boardId = positiveId(filters.board);
    const cacheKey = boardId ? String(boardId) : "all";
    const cached = cachedFilterOptions(filterOptionsCacheRef.current.academicLevels, cacheKey);
    if (cached) {
      setMasterOptions((curr) => ({ ...curr, levels: cached }));
      setLevelLoading(false);
      return;
    }
    const controller = beginRequest("academicLevels");
    setLevelLoading(true);
    const params = boardId ? { boardId } : {};
    apiClient.get(REPORTS_API.filters.academicLevels, {
      params,
      signal: controller.signal,
      skipGlobalLoader: true,
    }).then((res) => {
      if (controller.signal.aborted) return;
      const levels = activeFilterOptions(res.data, ["academicLevels", "AcademicLevels"], ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "name", "Name", "academicLevelName"]);
      cacheFilterOptions(filterOptionsCacheRef.current.academicLevels, cacheKey, levels);
      setMasterOptions((curr) => ({ ...curr, levels }));
    }).catch((err) => {
      if (!controller.signal.aborted && !isCanceledRequest(err)) setToast("Failed to load Academic Levels.");
    }).finally(() => {
      if (!controller.signal.aborted) setLevelLoading(false);
      finishRequest("academicLevels", controller);
    });
  }, [beginRequest, filters.board, finishRequest]);

  // Load Groups when Board, Year, or Level changes
  useEffect(() => {
    const boardId = positiveId(filters.board);
    const academicYearId = positiveId(filters.year);
    const academicLevelId = positiveId(filters.level);
    const cacheKey = `${boardId || 0}:${academicYearId || 0}:${academicLevelId || 0}`;
    const cached = cachedFilterOptions(filterOptionsCacheRef.current.groups, cacheKey);
    if (cached) {
      setMasterOptions((curr) => ({ ...curr, groups: cached }));
      setGroupsLoading(false);
      return;
    }
    const controller = beginRequest("groups");
    setGroupsLoading(true);
    const params = {};
    if (boardId) params.boardId = boardId;
    if (academicYearId) params.academicYearId = academicYearId;
    if (academicLevelId) params.academicLevelId = academicLevelId;
    apiClient.get(REPORTS_API.filters.groups, {
      params,
      signal: controller.signal,
      skipGlobalLoader: true,
    }).then((res) => {
      if (controller.signal.aborted) return;
      const groups = activeFilterOptions(res.data, ["groups", "Groups"], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]);
      cacheFilterOptions(filterOptionsCacheRef.current.groups, cacheKey, groups);
      setMasterOptions((curr) => ({ ...curr, groups }));
    }).catch((err) => {
      if (!controller.signal.aborted && !isCanceledRequest(err)) setToast("Failed to load Groups.");
    }).finally(() => {
      if (!controller.signal.aborted) setGroupsLoading(false);
      finishRequest("groups", controller);
    });
  }, [beginRequest, filters.board, filters.level, filters.year, finishRequest]);

  // Load Sections when Group (or Board/Year/Level) changes
  useEffect(() => {
    const groupId = positiveId(filters.group);
    const boardId = positiveId(filters.board);
    const academicYearId = positiveId(filters.year);
    const academicLevelId = positiveId(filters.level);
    const cacheKey = `${groupId || 0}:${boardId || 0}:${academicYearId || 0}:${academicLevelId || 0}`;
    const cached = cachedFilterOptions(filterOptionsCacheRef.current.sections, cacheKey);
    if (cached) {
      setMasterOptions((curr) => ({ ...curr, sections: cached }));
      setSectionsLoading(false);
      return;
    }
    const controller = beginRequest("sections");
    setSectionsLoading(true);
    const params = {};
    if (groupId) params.groupId = groupId;
    if (boardId) params.boardId = boardId;
    if (academicYearId) params.academicYearId = academicYearId;
    if (academicLevelId) params.academicLevelId = academicLevelId;
    apiClient.get(REPORTS_API.filters.sections, {
      params,
      signal: controller.signal,
      skipGlobalLoader: true,
    }).then((res) => {
      if (controller.signal.aborted) return;
      const sections = activeFilterOptions(res.data, ["sections", "Sections"], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
      cacheFilterOptions(filterOptionsCacheRef.current.sections, cacheKey, sections);
      setMasterOptions((curr) => ({ ...curr, sections }));
    }).catch((err) => {
      if (!controller.signal.aborted && !isCanceledRequest(err)) setToast("Failed to load Sections.");
    }).finally(() => {
      if (!controller.signal.aborted) setSectionsLoading(false);
      finishRequest("sections", controller);
    });
  }, [beginRequest, filters.board, filters.group, filters.level, filters.year, finishRequest]);

  const availableBoards = useMemo(() => {
    if (masterOptions.boards.length > 0) return masterOptions.boards;
    return (contextBoards || []).map((b) => ({
      value: String(b.id ?? b.boardId ?? b.value),
      label: String(b.boardName || b.name || b.label || b.code || `Board #${b.id}`),
    }));
  }, [masterOptions.boards, contextBoards]);

  const availableYears = useMemo(() => {
    const list = masterOptions.years.length > 0 ? masterOptions.years : (contextAcademicYears || []).map((y) => ({
      value: String(y.id ?? y.academicYearId ?? y.value),
      label: String(y.academicYearName || y.label || y.name || y.code || `Year #${y.id}`),
      boardId: y.boardId ? String(y.boardId) : "",
    }));
    const filtered = list.filter((item) => (
      !filters.board || !item.boardId || item.boardId === String(filters.board)
    ));
    return uniqueAcademicYearsByName(filtered, (item) => item.label);
  }, [filters.board, masterOptions.years, contextAcademicYears]);

  const filterFields = useMemo(() => [
    {
      name: "board",
      label: boardsLoading && !availableBoards.length ? "Board (Loading...)" : "Board",
      type: "select",
      options: [{ value: "", label: "All Boards" }, ...availableBoards],
      disabled: boardsLoading && !availableBoards.length,
    },
    {
      name: "year",
      label: yearsLoading && !availableYears.length ? "Academic Year (Loading...)" : "Academic Year",
      type: "select",
      options: [{ value: "", label: "All Academic Years" }, ...availableYears],
      disabled: yearsLoading && !availableYears.length,
    },
    {
      name: "level",
      label: levelLoading ? "Academic Level (Loading...)" : "Academic Level",
      type: "select",
      options: [{ value: "", label: "All Academic Levels" }, ...masterOptions.levels],
      disabled: levelLoading,
    },
    {
      name: "group",
      label: groupsLoading ? "Group (Loading...)" : "Group",
      type: "select",
      options: [{ value: "", label: "All Groups" }, ...masterOptions.groups],
      disabled: groupsLoading,
    },
    {
      name: "section",
      label: sectionsLoading ? "Section (Loading...)" : "Section",
      type: "select",
      options: [{ value: "", label: "All Sections" }, ...masterOptions.sections],
      disabled: sectionsLoading,
    },
    { name: "from", label: "From Date", type: "date" },
    { name: "to", label: "To Date", type: "date" },
  ], [availableBoards, availableYears, boardsLoading, groupsLoading, levelLoading, masterOptions.groups, masterOptions.levels, masterOptions.sections, sectionsLoading, yearsLoading]);

  const handleFilterChange = (name, value) => {
    setReportGenerated(false);
    setPreviewFile(null);
    setDashboardData(null);
    setDetailData({});
    setError("");
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "board") {
        Object.assign(next, { year: "", level: "", group: "", section: "" });
        setMasterOptions((o) => ({ ...o, levels: [], groups: [], sections: [] }));
      }
      if (name === "year" || name === "level") {
        Object.assign(next, { group: "", section: "" });
        setMasterOptions((o) => ({ ...o, groups: [], sections: [] }));
      }
      if (name === "group") {
        next.section = "";
        setMasterOptions((o) => ({ ...o, sections: [] }));
      }
      return next;
    });
  };

  // Load active detail report for selected card
  const loadDetailReport = useCallback(async (cardKey, currentFilters) => {
    const card = summaryCardConfig.find((c) => c.key === cardKey);
    if (!card || !card.endpoint) return;
    setDetailLoading(true);
    setDetailPage(1);
    setDetailSearch("");
    try {
      const params = { ...buildReportQuery(currentFilters), PageNumber: 1, PageSize: 10000 };
      const res = await apiClient.get(card.endpoint, { params });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.details || raw?.items || raw?.results || raw?.records || raw?.data || []);
      setDetailData((prev) => ({ ...prev, [cardKey]: list }));
    } catch (err) {
      if (!isCanceledRequest(err)) setToast(`Could not load details for ${card.label}.`);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (customFilters = null) => {
    if (loading) return;
    const activeFilters = customFilters || filters;
    if (activeFilters.from && activeFilters.to && validDateInput(activeFilters.from) && validDateInput(activeFilters.to)) {
      if (activeFilters.from > activeFilters.to) {
        setToast("From Date must be earlier than or equal to To Date.");
        return;
      }
    }
    setLoading(true);
    setError("");
    setPreviewFile(null);
    try {
      const params = buildReportQuery(activeFilters);
      const res = await apiClient.get(REPORTS_API.dashboard, { params });
      setDashboardData(res.data);
      setReportGenerated(true);
      // Automatically load the active selected card detail
      await loadDetailReport(selectedCardKey || "admissions", activeFilters);
    } catch (err) {
      setError(getApiErrorMessage(err) || "Failed to generate report overview.");
    } finally {
      setLoading(false);
    }
  }, [filters, loadDetailReport, loading, selectedCardKey]);

  const handleCardClick = (cardKey) => {
    setSelectedCardKey(cardKey);
    if (reportGenerated && (!detailData[cardKey] || !detailData[cardKey].length)) {
      loadDetailReport(cardKey, filters);
    }
  };

  const resetReports = () => {
    const defaultFilters = {
      board: selectedBoardId ? String(selectedBoardId) : (selectedBoard?.id ? String(selectedBoard.id) : ""),
      year: selectedAcademicYearId ? String(selectedAcademicYearId) : (selectedAcademicYear?.id ? String(selectedAcademicYear.id) : ""),
      level: "",
      group: "",
      section: "",
      from: `${new Date().getFullYear()}-01-01`,
      to: new Date().toISOString().slice(0, 10),
    };
    setFilters(defaultFilters);
    setMasterOptions((o) => ({ ...o, levels: [], groups: [], sections: [] }));
    setDashboardData(null);
    setDetailData({});
    setReportGenerated(false);
    setPreviewFile(null);
    setError("");
    setToast("Filters reset. Click 'Generate Report' to view metrics.");
  };


  // Export Overview handlers
  const exportOverview = async (format) => {
    if (exportingOverview) return;
    setExportingOverview(format);
    try {
      if (format === "csv") {
        if (!dashboardData) return;
        const rows = [
          { Metric: "Total Admissions", Value: dashboardData.admissions },
          { Metric: "Average Attendance", Value: `${dashboardData.attendance?.toFixed(2)}%` },
          { Metric: "Total Fee Collection", Value: `₹${dashboardData.feeCollection?.toFixed(2)}` },
          { Metric: "Outstanding Due Fees", Value: `₹${dashboardData.dueFees?.toFixed(2)}` },
          { Metric: "Examinations Conducted", Value: dashboardData.examinations },
          { Metric: "Results Published", Value: dashboardData.resultsPublished },
          { Metric: "Faculty Workload", Value: `${dashboardData.facultyWorkload?.toFixed(1)} hrs/wk` },
          { Metric: "Total Student Strength", Value: dashboardData.studentStrength },
          { Metric: "Overall Pass Percentage", Value: `${dashboardData.passPercentage?.toFixed(1)}%` },
          { Metric: "Toppers Identified", Value: dashboardData.toppersIdentified },
        ];
        exportCsv(rows, ["Metric", "Value"], `Reports-Overview-${new Date().toISOString().slice(0, 10)}.csv`);
        setToast("Overview CSV exported successfully.");
      } else {
        const endpoint = format === "pdf" ? REPORTS_API.exportPdf : REPORTS_API.exportExcel;
        const res = await apiClient.get(endpoint, {
          params: { ...buildReportQuery(filters), reportType: OVERVIEW_REPORT_TYPE },
          responseType: "blob",
        });
        const blob = responseBlob(res);
        const filename = responseFilename(res, `Reports-Overview-${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`);
        downloadBlob(blob, filename);
        setToast(`Reports Overview ${format.toUpperCase()} exported successfully.`);
      }
    } catch (err) {
      setToast(getApiErrorMessage(err) || "Export failed.");
    } finally {
      setExportingOverview("");
    }
  };

  const previewReport = async (format) => {
    setPreviewing(format);
    setPdfPreviewLoaded(false);
    try {
      const endpoint = format === "pdf" ? REPORTS_API.exportPdf : REPORTS_API.exportExcel;
      const res = await apiClient.get(endpoint, {
        params: { ...buildReportQuery(filters), reportType: OVERVIEW_REPORT_TYPE },
        responseType: "blob",
      });
      const blob = responseBlob(res);
      const filename = responseFilename(res, `Reports-Overview-${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`);
      const file = { blob, filename, format, title: "Reports Overview" };
      if (format === "excel") Object.assign(file, await excelPreview(blob));
      setPreviewFile({ ...file, url: format === "pdf" ? URL.createObjectURL(blob) : "" });
    } catch (err) {
      setToast(getApiErrorMessage(err) || "Preview failed.");
    } finally {
      setPreviewing("");
    }
  };

  const printBackendReport = async () => {
    const printWindow = window.open("", "reports-print", "width=960,height=720");
    if (!printWindow) {
      setToast("The print window was blocked. Allow pop-ups and try again.");
      return;
    }
    printWindow.document.write("<p style='font-family:Arial,sans-serif;padding:24px'>Preparing report for printing...</p>");
    try {
      const res = await apiClient.get(REPORTS_API.exportPdf, {
        params: { ...buildReportQuery(filters), reportType: OVERVIEW_REPORT_TYPE },
        responseType: "blob",
      });
      const blob = responseBlob(res);
      const url = URL.createObjectURL(blob);
      printWindow.location.href = url;
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }, { once: true });
    } catch (err) {
      printWindow.close();
      setToast(getApiErrorMessage(err) || "Print failed.");
    }
  };

  // Card-specific export
  const exportCardReport = async (card, format) => {
    const reqKey = `${card.key}-${format}`;
    if (exportingCards[reqKey]) return;
    setExportingCards((prev) => ({ ...prev, [reqKey]: true }));
    try {
      if (format === "csv") {
        const endpoint = card.endpoint;
        const res = await apiClient.get(endpoint, {
          params: { ...buildReportQuery(filters), PageNumber: 1, PageSize: 10000 },
        });
        const raw = res.data;
        const rows = Array.isArray(raw) ? raw : (raw?.details || raw?.items || raw?.results || raw?.records || raw?.data || []);
        if (!rows.length) throw new Error(`No detailed records returned for ${card.label}.`);
        const columns = Object.keys(rows[0] || {});
        exportCsv(rows, columns, `${card.reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`);
        setToast(`${card.label} CSV exported.`);
      } else {
        const endpoint = format === "pdf" ? REPORTS_API.exportPdf : REPORTS_API.exportExcel;
        const res = await apiClient.get(endpoint, {
          params: { ...buildReportQuery(filters), reportType: card.reportType },
          responseType: "blob",
        });
        const blob = responseBlob(res);
        const filename = responseFilename(res, `${card.reportType}-report-${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`);
        downloadBlob(blob, filename);
        setToast(`${card.label} ${format.toUpperCase()} exported successfully.`);
      }
    } catch (err) {
      setToast(getApiErrorMessage(err) || "Export failed.");
    } finally {
      setExportingCards((prev) => {
        const next = { ...prev };
        delete next[reqKey];
        return next;
      });
    }
  };


  // Audit Logs fetch
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await apiClient.get(REPORTS_API.details.auditLogs, {
        params: buildReportQuery(filters),
      });
      setAuditData(res.data);
      setAuditPage(1);
    } catch (err) {
      setAuditError(getApiErrorMessage(err) || "Failed to fetch audit logs.");
    } finally {
      setAuditLoading(false);
    }
  };

  const auditRows = useMemo(() => mapAuditLogs(auditData), [auditData]);
  const filteredAuditRows = useMemo(() => {
    const search = String(auditFilters.search ?? "").trim().toLowerCase();
    return auditRows.filter((row) => {
      if (["user", "role", "module", "action", "status"].some((key) => auditFilters[key] && row[key] !== auditFilters[key])) return false;
      if (!search) return true;
      return [row.user, row.role, row.module, row.action, row.description, row.recordId]
        .some((val) => String(val ?? "").toLowerCase().includes(search));
    });
  }, [auditFilters, auditRows]);

  const auditPageCount = Math.max(1, Math.ceil(filteredAuditRows.length / auditPageSize));
  const visibleAuditRows = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return filteredAuditRows.slice(start, start + auditPageSize);
  }, [auditPage, auditPageSize, filteredAuditRows]);

  const activeCard = summaryCardConfig.find((c) => c.key === selectedCardKey) || summaryCardConfig[0];
  const activeDetailRows = detailData[selectedCardKey] || [];
  const filteredDetailRows = useMemo(() => {
    const s = detailSearch.trim().toLowerCase();
    if (!s) return activeDetailRows;
    return activeDetailRows.filter((row) => Object.values(row).some((val) => String(val ?? "").toLowerCase().includes(s)));
  }, [activeDetailRows, detailSearch]);

  const detailPageCount = Math.max(1, Math.ceil(filteredDetailRows.length / detailPageSize));
  const visibleDetailRows = useMemo(() => {
    const start = (detailPage - 1) * detailPageSize;
    return filteredDetailRows.slice(start, start + detailPageSize);
  }, [detailPage, detailPageSize, filteredDetailRows]);

  const activeDetailColumns = useMemo(() => {
    if (!activeDetailRows.length) return [];
    return Object.keys(activeDetailRows[0]);
  }, [activeDetailRows]);

  // Card summary values mapping
  const cardValues = useMemo(() => {
    if (!dashboardData) return {};
    return {
      admissions: dashboardData.admissions,
      attendance: dashboardData.attendance,
      feeCollection: dashboardData.feeCollection,
      dueFees: dashboardData.dueFees,
      examinations: dashboardData.examinations,
      results: dashboardData.resultsPublished,
      facultyWorkload: dashboardData.facultyWorkload,
      studentStrength: dashboardData.studentStrength,
      passPercentage: dashboardData.passPercentage,
      toppers: dashboardData.toppersIdentified,
    };
  }, [dashboardData]);

  return (
    <DashboardLayout
      title={activeTab === "reports" ? "Reports & Analytics" : "Audit Logs"}
      subtitle={activeTab === "reports" ? "Live institution-wide analytics and performance reports." : "Security and operational activity logs."}
      breadcrumb={["Reports", activeTab === "reports" ? "Analytics" : "Audit Logs"]}
    >
      <Toast message={toast} onClose={() => setToast("")} />

      {/* Tabs */}
      <div className="reports-tabs" role="tablist">
        <button
          className={`reports-tab ${activeTab === "reports" ? "is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        >
          Reports & Analytics
        </button>
        <button
          className={`reports-tab ${activeTab === "audit" ? "is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "audit"}
          onClick={() => {
            setActiveTab("audit");
            if (!auditData && !auditLoading) fetchAuditLogs();
          }}
        >
          Audit Logs
        </button>
      </div>

      {activeTab === "reports" ? (
        <>
          {/* Cascading Filter Bar */}
          <section className="cms-card reports-filter-card">
            <div className="cms-card-body">
              <div className="cms-filters">
                {filterFields.map((field) => (
                  <Field key={field.name} field={field} value={filters[field.name]} onChange={handleFilterChange} />
                ))}
              </div>
              <div className="reports-filter-actions">
                <button className="cms-btn cms-btn-primary" onClick={generateReport} disabled={loading}>
                  {loading ? "Generating Report..." : "Generate Report"}
                </button>
                <button className="cms-btn cms-btn-ghost" onClick={resetReports} disabled={loading}>
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </div>
          </section>

          {error ? (
            <div className="reports-error-banner" role="alert">
              <span>{error}</span>
              <button className="cms-btn cms-btn-ghost" type="button" onClick={generateReport} disabled={loading}>
                Retry
              </button>
            </div>
          ) : null}

          {/* 10 Summary KPI Cards */}
          <section className="reports-summary-panel" aria-labelledby="reports-summary-title">
            <div className="reports-summary-panel-head">
              <div>
                <h2 id="reports-summary-title">Reports Overview (10 Metrics)</h2>
                <p>Click any card below to inspect its detailed report data table</p>
              </div>
              {reportGenerated ? (
                <div className="reports-summary-actions">
                  <button className="cms-btn cms-btn-ghost" type="button" onClick={() => previewReport("pdf")} disabled={previewing === "pdf"}>
                    <Eye size={14} /> {previewing === "pdf" ? "Loading PDF..." : "Review PDF"}
                  </button>
                  <button className="cms-btn cms-btn-ghost" type="button" onClick={() => previewReport("excel")} disabled={previewing === "excel"}>
                    <Eye size={14} /> {previewing === "excel" ? "Loading Excel..." : "Review Excel"}
                  </button>
                  <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportOverview("pdf")} disabled={Boolean(exportingOverview)}>
                    <Download size={14} /> {exportingOverview === "pdf" ? "Exporting..." : "Export PDF"}
                  </button>
                  <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportOverview("excel")} disabled={Boolean(exportingOverview)}>
                    <FileSpreadsheet size={14} /> {exportingOverview === "excel" ? "Exporting..." : "Export Excel"}
                  </button>
                  <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportOverview("csv")} disabled={Boolean(exportingOverview)}>
                    <FileText size={14} /> CSV
                  </button>
                  <button className="cms-btn cms-btn-ghost" type="button" onClick={printBackendReport}>
                    <Printer size={14} /> Print
                  </button>
                </div>
              ) : null}
            </div>

            {!reportGenerated && !loading ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "12px 0 16px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "var(--cms-subtle, #f5f8fc)",
                border: "1px dashed var(--cms-border, #d7e0ec)",
                color: "var(--cms-text-secondary, #486581)",
                fontSize: "13px"
              }}>
                <AlertCircle size={16} color="var(--cms-primary, #2758e8)" />
                <span>Select your filter criteria above and click <strong>Generate Report</strong> to calculate and view live metrics.</span>
              </div>
            ) : null}

            <div className="reports-summary-grid">
              {summaryCardConfig.map((card) => {
                const { key, label, icon: Icon, image, tone, currency, suffix } = card;
                const format = { currency, suffix };
                const val = cardValues[key];
                const displayVal = val !== undefined ? formatMetric(val, format) : "—";
                const isSelected = selectedCardKey === key;

                return (
                  <article
                    key={key}
                    className={`reports-summary-card reports-summary-card-expanded ${isSelected && reportGenerated ? "is-active" : ""}`}
                    onClick={() => handleCardClick(key)}
                    style={{
                      cursor: reportGenerated ? "pointer" : "default",
                      borderColor: isSelected && reportGenerated ? "var(--cms-primary, #2758e8)" : undefined,
                      boxShadow: isSelected && reportGenerated ? "0 0 0 2px rgba(39, 88, 232, 0.25)" : undefined,
                    }}
                  >
                    <div className="reports-summary-card-head">
                      <span className={`reports-summary-icon reports-summary-icon-${tone}`} aria-hidden="true">
                        {image ? <img className="reports-summary-image" src={image} alt="" /> : <Icon size={20} strokeWidth={2} />}
                      </span>
                      <div className="reports-summary-content">
                        <span>{label}</span>
                        <strong>{displayVal}</strong>
                      </div>
                    </div>

                    {reportGenerated ? (
                      <div className="reports-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="cms-btn cms-btn-ghost"
                          type="button"
                          title={`Export ${label} PDF`}
                          onClick={() => exportCardReport(card, "pdf")}
                          disabled={Boolean(exportingCards[`${key}-pdf`])}
                        >
                          <Download size={12} /> PDF
                        </button>
                        <button
                          className="cms-btn cms-btn-ghost"
                          type="button"
                          title={`Export ${label} Excel`}
                          onClick={() => exportCardReport(card, "excel")}
                          disabled={Boolean(exportingCards[`${key}-excel`])}
                        >
                          <FileSpreadsheet size={12} /> Excel
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          {/* Detailed Data Table for Selected Card */}
          {reportGenerated ? (
            <section className="cms-card" style={{ marginTop: "24px" }}>
              <div className="cms-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                    {activeCard.label} — Detailed Report
                  </h3>
                  <p style={{ margin: "4px 0 0", color: "#687791", fontSize: "12px" }}>
                    Showing live database records filtered by the selected criteria ({filteredDetailRows.length} records)
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="reports-search-box" style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--cms-subtle, #f5f8fc)", border: "1px solid var(--cms-border, #d7e0ec)", borderRadius: "8px", padding: "4px 10px" }}>
                    <Search size={14} color="#687791" />
                    <input
                      type="search"
                      placeholder="Search records..."
                      value={detailSearch}
                      onChange={(e) => {
                        setDetailSearch(e.target.value);
                        setDetailPage(1);
                      }}
                      style={{ border: "none", background: "transparent", outline: "none", fontSize: "12px", color: "inherit" }}
                    />
                  </div>
                  <button className="cms-btn cms-btn-ghost" type="button" onClick={() => exportCardReport(activeCard, "csv")}>
                    <FileText size={13} /> Export CSV
                  </button>
                  <button className="cms-btn cms-btn-primary" type="button" onClick={() => exportCardReport(activeCard, "excel")}>
                    <FileSpreadsheet size={13} /> Export Excel
                  </button>
                </div>
              </div>

              <div className="cms-card-body" style={{ padding: "0" }}>
                {detailLoading ? (
                  <div style={{ padding: "40px 0" }}>
                    <Loader label={`Loading ${activeCard.label} records...`} />
                  </div>
                ) : visibleDetailRows.length ? (
                  <div className="reports-table-wrap" style={{ overflowX: "auto" }}>
                    <table className="reports-top-students" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "60px", textAlign: "center" }}>S.No</th>
                          {activeDetailColumns.map((col) => (
                            <th key={col}>{formatColHeader(col)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDetailRows.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "center", color: "#687791" }}>
                              {(detailPage - 1) * detailPageSize + idx + 1}
                            </td>
                            {activeDetailColumns.map((col) => (
                              <td key={col}>{formatCellVal(col, row[col])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="reports-empty" style={{ padding: "40px 20px" }}>
                    No records found for {activeCard.label} matching the selected filters.
                  </div>
                )}



                {/* Pagination */}
                {filteredDetailRows.length ? (
                  <div className="cms-pagination" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="cms-page-info">
                      Showing {(detailPage - 1) * detailPageSize + 1}–{Math.min(detailPage * detailPageSize, filteredDetailRows.length)} of {filteredDetailRows.length}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label className="reports-page-size">
                        Rows:{" "}
                        <select
                          value={detailPageSize}
                          onChange={(e) => {
                            setDetailPageSize(Number(e.target.value));
                            setDetailPage(1);
                          }}
                        >
                          {DETAIL_PAGE_SIZES.map((sz) => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </select>
                      </label>
                      <button className="cms-page-btn" disabled={detailPage === 1} onClick={() => setDetailPage((p) => p - 1)}>
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span>{detailPage} / {detailPageCount}</span>
                      <button className="cms-page-btn" disabled={detailPage === detailPageCount} onClick={() => setDetailPage((p) => p + 1)}>
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        /* Audit Logs Tab */
        <section className="reports-audit-section">
          <div className="reports-chart-head">
            <div>
              <h2>System Security & Audit Logs</h2>
              <p>Chronological system activity logs recorded for compliance and auditing</p>
            </div>
            <button className="cms-btn cms-btn-primary" type="button" onClick={fetchAuditLogs} disabled={auditLoading}>
              {auditLoading ? "Refreshing..." : "Refresh Logs"}
            </button>
          </div>

          <div className="reports-audit-filters" style={{ margin: "16px 0" }}>
            <div className="cms-filters">
              <div className="cms-field reports-audit-search-field">
                <label htmlFor="audit-search">Search Audit Logs</label>
                <span className="reports-audit-search">
                  <Search3DIcon size={16} aria-hidden="true" />
                  <input
                    id="audit-search"
                    type="search"
                    list="audit-search-samples"
                    value={auditFilters.search ?? ""}
                    placeholder="User, module, action, description..."
                    onChange={(e) => setAuditFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                </span>
                <datalist id="audit-search-samples">
                  {AUDIT_SEARCH_SAMPLES.map((val) => (
                    <option key={val} value={val} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {auditLoading ? (
            <div className="reports-audit-loader">
              <Loader label="Fetching audit logs..." />
            </div>
          ) : null}

          {auditError ? (
            <div className="reports-error-banner" role="alert">
              {auditError}
            </div>
          ) : null}

          {!auditLoading ? (
            <>
              <div className="reports-audit-summary" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", margin: "16px 0" }}>
                <article className="reports-summary-card">
                  <span className="reports-summary-icon reports-summary-icon-blue"><Activity size={20} /></span>
                  <div className="reports-summary-content"><span>Total Activities</span><strong>{auditRows.length}</strong></div>
                </article>
                <article className="reports-summary-card">
                  <span className="reports-summary-icon reports-summary-icon-green"><ShieldCheck size={20} /></span>
                  <div className="reports-summary-content"><span>Successful</span><strong>{auditRows.filter((r) => r.status.toLowerCase().includes("succ")).length}</strong></div>
                </article>
                <article className="reports-summary-card">
                  <span className="reports-summary-icon reports-summary-icon-amber"><ShieldX size={20} /></span>
                  <div className="reports-summary-content"><span>Failed / Errors</span><strong>{auditRows.filter((r) => r.status.toLowerCase().includes("fail") || r.status.toLowerCase().includes("err")).length}</strong></div>
                </article>
                <article className="reports-summary-card">
                  <span className="reports-summary-icon reports-summary-icon-violet"><Users size={20} /></span>
                  <div className="reports-summary-content"><span>Active Users</span><strong>{new Set(auditRows.map((r) => r.user)).size}</strong></div>
                </article>
              </div>

              <div className="reports-table-wrap">
                <table className="reports-top-students">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Module</th>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAuditRows.length ? (
                      visibleAuditRows.map((log) => (
                        <tr key={log.id}>
                          <td>{formatAuditDate(log.timestamp)}</td>
                          <td><strong>{log.user}</strong></td>
                          <td>{log.role}</td>
                          <td>{log.module}</td>
                          <td>{log.action}</td>
                          <td className="reports-audit-description" title={log.description}>{log.description}</td>
                          <td>
                            <span className={`cms-badge ${log.status.toLowerCase().includes("succ") ? "cms-badge-active" : log.status.toLowerCase().includes("fail") ? "cms-badge-danger" : "cms-badge-inactive"}`}>
                              {log.status}
                            </span>
                          </td>
                          <td>
                            <button className="cms-btn cms-btn-ghost reports-view-btn" type="button" onClick={() => setSelectedAuditLog(log)}>
                              <Eye size={14} /> View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8}>
                          <div className="cms-empty">No audit logs available for the selected filters.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredAuditRows.length ? (
                <div className="cms-pagination">
                  <span className="cms-page-info">
                    Showing {(auditPage - 1) * auditPageSize + 1}–{Math.min(auditPage * auditPageSize, filteredAuditRows.length)} of {filteredAuditRows.length}
                  </span>
                  <button className="cms-page-btn" disabled={auditPage === 1} onClick={() => setAuditPage((p) => p - 1)}>
                    Previous
                  </button>
                  <span>Page {auditPage} of {auditPageCount}</span>
                  <button className="cms-page-btn" disabled={auditPage === auditPageCount} onClick={() => setAuditPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      )}

      {/* PDF / Excel Preview Modals */}
      {previewFile?.format === "pdf" ? (
        <Modal
          title="PDF Preview"
          className="reports-preview-modal"
          onClose={() => setPreviewFile(null)}
          footer={
            <>
              {pdfPreviewLoaded ? (
                <button className="cms-btn cms-btn-ghost" type="button" onClick={printBackendReport}>
                  <Printer size={15} /> Print PDF
                </button>
              ) : null}
              {pdfPreviewLoaded ? (
                <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}>
                  <Download size={15} /> Download PDF
                </button>
              ) : null}
              <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>
                Close
              </button>
            </>
          }
        >
          <div className="reports-pdf-preview">
            <iframe
              src={`${previewFile.url}#toolbar=0&navpanes=0`}
              title="Generated report PDF preview"
              onLoad={() => setPdfPreviewLoaded(true)}
            />
          </div>
        </Modal>
      ) : null}

      {previewFile?.format === "excel" ? (
        <Modal
          title="Excel Preview"
          className="reports-preview-modal"
          onClose={() => setPreviewFile(null)}
          footer={
            <>
              <button className="cms-btn cms-btn-primary" type="button" onClick={() => downloadBlob(previewFile.blob, previewFile.filename)}>
                <Download size={15} /> Download Excel
              </button>
              <button className="cms-btn cms-btn-ghost" type="button" onClick={() => setPreviewFile(null)}>
                Close
              </button>
            </>
          }
        >
          <div className="reports-excel-preview">
            <table className="reports-top-students">
              <thead>
                <tr>
                  {previewFile.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewFile.rows.map((row, idx) => (
                  <tr key={idx}>
                    {previewFile.columns.map((col) => (
                      <td key={col}>{String(row[col] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      ) : null}

      {/* Audit Log Detail Modal */}
      {selectedAuditLog ? (
        <Modal
          title="Audit Log Details"
          onClose={() => setSelectedAuditLog(null)}
          footer={
            <button className="cms-btn cms-btn-primary" type="button" onClick={() => setSelectedAuditLog(null)}>
              Close
            </button>
          }
        >
          <dl className="reports-audit-details">
            <div><dt>Date & Time</dt><dd>{formatAuditDate(selectedAuditLog.timestamp)}</dd></div>
            <div><dt>User</dt><dd>{selectedAuditLog.user}</dd></div>
            <div><dt>Role</dt><dd>{selectedAuditLog.role}</dd></div>
            <div><dt>Module</dt><dd>{selectedAuditLog.module}</dd></div>
            <div><dt>Action</dt><dd>{selectedAuditLog.action}</dd></div>
            <div><dt>Status</dt><dd>{selectedAuditLog.status}</dd></div>
            <div><dt>IP Address</dt><dd>{selectedAuditLog.ipAddress || "—"}</dd></div>
            <div><dt>Device / Browser</dt><dd>{selectedAuditLog.device || "—"}</dd></div>
            <div className="full"><dt>Description</dt><dd>{selectedAuditLog.description}</dd></div>
            {selectedAuditLog.previousValue ? <div className="full"><dt>Previous Value</dt><dd><pre>{selectedAuditLog.previousValue}</pre></dd></div> : null}
            {selectedAuditLog.newValue ? <div className="full"><dt>New Value</dt><dd><pre>{selectedAuditLog.newValue}</pre></dd></div> : null}
          </dl>
        </Modal>
      ) : null}
    </DashboardLayout>
  );
}
