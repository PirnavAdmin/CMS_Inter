import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  BriefcaseBusiness,
  CalendarCheck,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Eye,
  Percent,
  Printer,
  RotateCcw,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Modal, Toast } from "@/components/common/Ui.jsx";
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

const REPORTS_API_VERSION = "1.0";
const OVERVIEW_REPORT_TYPE = "dashboard";
const FILTER_CACHE_TTL_MS = 5 * 60 * 1000;

const REPORTS_API = {
  filters: {
    boards: "/api/v1/reports/filters/boards",
    academicYears: "/api/v1/reports/filters/academic-years",
    academicLevels: "/api/v1/reports/filters/academic-levels",
    groups: "/api/v1/reports/filters/groups",
    sections: "/api/v1/reports/filters/sections",
  },
  dashboard: "/api/v1/reports/dashboard",
  exportPdf: "/api/v1/reports/export/pdf",
  exportExcel: "/api/v1/reports/export/excel",
};

// 10 Summary Cards Configuration
const summaryCardConfig = [
  { key: "admissions", sourceKey: "admissions", reportType: "admissions", label: "Total Admissions", icon: GraduationCap, image: admissionsImage, tone: "blue" },
  { key: "attendance", sourceKey: "attendance", reportType: "attendance", label: "Average Attendance", icon: CalendarCheck, image: attendanceImage, tone: "green", suffix: "%" },
  { key: "feeCollection", sourceKey: "feeCollection", reportType: "fee-collection", label: "Total Fee Collection", icon: WalletCards, image: feeCollectionImage, tone: "violet", currency: true },
  { key: "dueFees", sourceKey: "dueFees", reportType: "due-fees", label: "Outstanding Due Fees", icon: AlertCircle, image: dueFeesImage, tone: "amber", currency: true },
  { key: "examinations", sourceKey: "examinations", reportType: "examinations", label: "Examinations Conducted", icon: FileSpreadsheet, image: examinationsImage, tone: "blue" },
  { key: "results", sourceKey: "resultsPublished", reportType: "results", label: "Results Published", icon: Award, image: resultsImage, tone: "green" },
  { key: "facultyWorkload", sourceKey: "facultyWorkload", reportType: "faculty-workload", label: "Faculty Workload", icon: BriefcaseBusiness, image: facultyWorkloadImage, tone: "violet", suffix: " hrs/wk" },
  { key: "studentStrength", sourceKey: "studentStrength", reportType: "student-strength", label: "Student Strength", icon: Users, image: studentStrengthImage, tone: "blue" },
  { key: "passPercentage", sourceKey: "passPercentage", reportType: "pass-percentage", label: "Pass Percentage", icon: Percent, image: passPercentageImage, tone: "green", suffix: "%" },
  { key: "toppers", sourceKey: "toppersIdentified", reportType: "toppers", label: "Toppers Identified", icon: Trophy, image: toppersImage, tone: "amber" },
];

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
    admissionNo: "Admission No",
    admissionDate: "Admission Date",
    rollNo: "Roll No",
    studentName: "Student Name",
    fatherName: "Father's Name",
    fatherMobile: "Father Mobile",
    mobileNumber: "Mobile",
    gender: "Gender",
    boardName: "Board",
    academicYear: "Academic Year",
    groupName: "Group",
    sectionName: "Section",
    maximumStrength: "Capacity",
    totalStudents: "Total Students",
    present: "Present",
    absent: "Absent",
    late: "Late",
    leave: "Leave",
    attendancePercentage: "Attendance %",
    facultyEmployeeId: "Emp ID",
    facultyName: "Faculty Name",
    departmentName: "Department",
    designation: "Designation",
    receiptNo: "Receipt No",
    paymentDate: "Payment Date",
    paidAmount: "Paid Amount",
    paymentMode: "Payment Mode",
    totalAmount: "Total Fee",
    dueAmount: "Due Amount",
    feeStatus: "Fee Status",
    examCode: "Exam Code",
    examName: "Exam Name",
    examType: "Exam Type",
    startDate: "Start Date",
    endDate: "End Date",
    subjectName: "Subject",
    totalMarks: "Total Marks",
    percentage: "Percentage",
    grade: "Grade",
    resultStatus: "Result",
    rank: "Rank",
    periodCount: "Assigned Periods",
    hoursPerWeek: "Weekly Hours",
    subjectNames: "Subjects",
    totalAppeared: "Appeared",
    passed: "Passed",
    failed: "Failed",
    passPercentage: "Pass %",
    passedSubjects: "Passed Subjects",
    totalEligibleStudents: "Eligible Students",
    status: "Status",
  };
  return map[col] || col.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
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
  const headerLine = columns.map((c) => `"${String(formatColHeader(c)).replace(/"/g, '""')}"`).join(",");
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

export default function ReportsPage() {
  const {
    boards: contextBoards = [],
    academicYears: contextAcademicYears = [],
    selectedBoard,
    selectedAcademicYear,
    selectedBoardId,
    selectedAcademicYearId,
  } = useAcademicContext();

  // Filters state with empty From Date and To Date by default (no prefilled 01-01 / today)
  const [filters, setFilters] = useState(() => ({
    board: selectedBoardId ? String(selectedBoardId) : (selectedBoard?.id ? String(selectedBoard.id) : ""),
    year: selectedAcademicYearId ? String(selectedAcademicYearId) : (selectedAcademicYear?.id ? String(selectedAcademicYear.id) : ""),
    level: "",
    group: "",
    section: "",
    from: "",
    to: "",
  }));

  const [masterOptions, setMasterOptions] = useState({ boards: [], years: [], levels: [], groups: [], sections: [] });
  const [dashboardData, setDashboardData] = useState(null);
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

  // Initial load of master options
  const loadMasterOptions = useCallback(async () => {
    const controller = beginRequest("masterOptions");
    setBoardsLoading(true);
    setYearsLoading(true);
    try {
      const [boardsRes, yearsRes, levelsRes, groupsRes, sectionsRes] = await Promise.allSettled([
        apiClient.get(REPORTS_API.filters.boards, { signal: controller.signal, skipGlobalLoader: true }),
        apiClient.get(REPORTS_API.filters.academicYears, { signal: controller.signal, skipGlobalLoader: true }),
        apiClient.get(REPORTS_API.filters.academicLevels, { signal: controller.signal, skipGlobalLoader: true }),
        apiClient.get(REPORTS_API.filters.groups, { signal: controller.signal, skipGlobalLoader: true }),
        apiClient.get(REPORTS_API.filters.sections, { signal: controller.signal, skipGlobalLoader: true }),
      ]);
      if (!mountedRef.current || controller.signal.aborted) return;
      
      const newOptions = {};
      if (boardsRes.status === "fulfilled") {
        newOptions.boards = activeFilterOptions(boardsRes.value.data, ["boards", "Boards"], ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]);
      }
      if (yearsRes.status === "fulfilled") {
        newOptions.years = activeAcademicYearOptions(yearsRes.value.data);
      }
      if (levelsRes.status === "fulfilled") {
        newOptions.levels = activeFilterOptions(levelsRes.value.data, ["academicLevels", "AcademicLevels"], ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "name", "Name", "academicLevelName"]);
      }
      if (groupsRes.status === "fulfilled") {
        newOptions.groups = activeFilterOptions(groupsRes.value.data, ["groups", "Groups"], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]);
      }
      if (sectionsRes.status === "fulfilled") {
        newOptions.sections = activeFilterOptions(sectionsRes.value.data, ["sections", "Sections"], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
      }

      setMasterOptions((curr) => ({ ...curr, ...newOptions }));
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

  // Load Academic Years when Board changes
  useEffect(() => {
    const boardId = positiveId(filters.board);
    const controller = beginRequest("academicYears");
    setYearsLoading(true);
    const params = boardId ? { boardId } : {};
    apiClient.get(REPORTS_API.filters.academicYears, {
      params,
      signal: controller.signal,
      skipGlobalLoader: true,
    }).then((res) => {
      if (controller.signal.aborted) return;
      const years = activeAcademicYearOptions(res.data);
      setMasterOptions((curr) => ({ ...curr, years }));
    }).catch((err) => {
      if (!controller.signal.aborted && !isCanceledRequest(err)) setToast("Failed to load Academic Years.");
    }).finally(() => {
      if (!controller.signal.aborted) setYearsLoading(false);
      finishRequest("academicYears", controller);
    });
  }, [beginRequest, filters.board, finishRequest]);

  // Sync Board from global academic context
  useEffect(() => {
    const rawBoardId = selectedBoardId || selectedBoard?.id || selectedBoard?.boardId;
    if (rawBoardId) {
      setFilters((prev) => {
        if (prev.board === String(rawBoardId)) return prev;
        return { ...prev, board: String(rawBoardId) };
      });
    }
  }, [selectedBoardId, selectedBoard]);

  // Load Levels when Board changes
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

  // Load Sections when Group or other filters change
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
    const list = (masterOptions.years.length > 0 ? masterOptions.years : (contextAcademicYears || []).map((y) => ({
      value: String(y.id ?? y.academicYearId ?? y.value),
      label: String(y.academicYearName || y.label || y.name || y.code || `Year #${y.id}`),
      boardId: y.boardId ? String(y.boardId) : "",
    })));

    const filtered = list.filter((item) => (
      !filters.board || !item.boardId || item.boardId === String(filters.board)
    ));

    // Deduplicate by name but prioritize matching selected Board
    const unique = new Map();
    filtered.forEach((item) => {
      const key = item.label;
      if (!unique.has(key)) {
        unique.set(key, item);
      } else if (filters.board && String(item.boardId) === String(filters.board)) {
        unique.set(key, item);
      }
    });

    return Array.from(unique.values());
  }, [filters.board, masterOptions.years, contextAcademicYears]);

  // Sync Academic Year from global academic context whenever context or availableYears changes
  useEffect(() => {
    const rawYearId = selectedAcademicYearId || selectedAcademicYear?.id || selectedAcademicYear?.academicYearId;
    const yearName = selectedAcademicYear?.name || selectedAcademicYear?.code || selectedAcademicYear?.label || selectedAcademicYear?.academicYearName;

    if (!rawYearId && !yearName) return;

    // Find best match in availableYears
    let match = null;
    if (availableYears.length > 0) {
      if (rawYearId) {
        match = availableYears.find((y) => String(y.value) === String(rawYearId));
      }
      if (!match && yearName) {
        match = availableYears.find((y) => String(y.label).trim().toLowerCase() === String(yearName).trim().toLowerCase());
      }
    }

    const targetYearValue = match ? String(match.value) : (rawYearId ? String(rawYearId) : "");

    if (targetYearValue) {
      setFilters((prev) => {
        if (prev.year === targetYearValue) return prev;
        return { ...prev, year: targetYearValue };
      });
    }
  }, [selectedAcademicYearId, selectedAcademicYear, availableYears]);

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
    setError("");
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "board") {
        Object.assign(next, { level: "", group: "", section: "" });
      }
      if (name === "level") {
        Object.assign(next, { group: "", section: "" });
      }
      if (name === "group") {
        next.section = "";
      }
      return next;
    });
  };

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
    } catch (err) {
      setError(getApiErrorMessage(err) || "Failed to generate report overview.");
    } finally {
      setLoading(false);
    }
  }, [filters, loading]);

  const resetReports = () => {
    const defaultFilters = {
      board: selectedBoardId ? String(selectedBoardId) : (selectedBoard?.id ? String(selectedBoard.id) : ""),
      year: selectedAcademicYearId ? String(selectedAcademicYearId) : (selectedAcademicYear?.id ? String(selectedAcademicYear.id) : ""),
      level: "",
      group: "",
      section: "",
      from: "",
      to: "",
    };
    setFilters(defaultFilters);
    setDashboardData(null);
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

  // Card-specific PDF / Excel export
  const exportCardReport = async (card, format) => {
    const reqKey = `${card.key}-${format}`;
    if (exportingCards[reqKey]) return;
    setExportingCards((prev) => ({ ...prev, [reqKey]: true }));
    try {
      const endpoint = format === "pdf" ? REPORTS_API.exportPdf : REPORTS_API.exportExcel;
      const res = await apiClient.get(endpoint, {
        params: { ...buildReportQuery(filters), reportType: card.reportType },
        responseType: "blob",
      });
      const blob = responseBlob(res);
      const filename = responseFilename(res, `${card.reportType}-report-${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`);
      downloadBlob(blob, filename);
      setToast(`${card.label} ${format.toUpperCase()} exported successfully.`);
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
      title="Reports & Analytics"
      subtitle="Live institution-wide analytics and performance reports."
      breadcrumb={["Reports", "Analytics"]}
    >
      <Toast message={toast} onClose={() => setToast("")} />

      {/* Cascading Filter Bar */}
      <section className="cms-card reports-filter-card">
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((field) => (
              <Field key={field.name} field={field} value={filters[field.name]} onChange={handleFilterChange} />
            ))}
          </div>
          <div className="reports-filter-actions">
            <button className="cms-btn cms-btn-primary" onClick={() => generateReport()} disabled={loading}>
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
          <button className="cms-btn cms-btn-ghost" type="button" onClick={() => generateReport()} disabled={loading}>
            Retry
          </button>
        </div>
      ) : null}

      {/* 10 Summary KPI Cards - Only visible after user clicks Generate Report */}
      {reportGenerated ? (
        <section className="reports-summary-panel" aria-labelledby="reports-summary-title">
          <div className="reports-summary-panel-head">
            <div>
              <h2 id="reports-summary-title">Reports Overview (10 Metrics)</h2>
              <p>Live calculated statistics based on your selected filter criteria</p>
            </div>
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
          </div>

          <div className="reports-summary-grid">
            {summaryCardConfig.map((card) => {
              const { key, label, icon: Icon, image, tone, currency, suffix } = card;
              const format = { currency, suffix };
              const val = cardValues[key];
              const displayVal = val !== undefined ? formatMetric(val, format) : "—";

              return (
                <article
                  key={key}
                  className="reports-summary-card reports-summary-card-expanded"
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

                  <div className="reports-card-actions">
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
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* PDF Preview Modal */}
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

      {/* Excel Preview Modal */}
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
    </DashboardLayout>
  );
}
