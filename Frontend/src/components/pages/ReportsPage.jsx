import { Pagination as AdminPagination } from "../common/Ui.jsx";
import PaginatedTable from "../common/PaginatedTable.jsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Percent,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
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
import "./ReportsAnalyticsPage.css";

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
  details: {
    admissions: "/api/v1/reports/details/admissions",
    attendance: "/api/v1/reports/details/attendance",
    feeCollection: "/api/v1/reports/details/fee-collection",
    dueFees: "/api/v1/reports/details/due-fees",
    examinations: "/api/v1/reports/details/examinations",
    results: "/api/v1/reports/details/results",
    facultyWorkload: "/api/v1/reports/details/staff-workload",
    studentStrength: "/api/v1/reports/details/student-strength",
    passPercentage: "/api/v1/reports/details/pass-percentage",
    toppers: "/api/v1/reports/details/toppers",
    auditLogs: "/api/v1/reports/details/audit-logs",
  },
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
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "No Data";
  const num = Number(value);
  if (currency) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
  }
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(num);
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
    campus: "CampusId",
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

  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
  if (!matrix || matrix.length === 0) return { rows: [], columns: [] };

  // Find the header row: first row with 2 or more non-empty cells
  let headerRowIdx = matrix.findIndex(
    (row) => Array.isArray(row) && row.filter((c) => String(c).trim() !== "").length >= 2
  );
  if (headerRowIdx === -1) headerRowIdx = 0;

  const headerRow = matrix[headerRowIdx] || [];
  const columns = headerRow.map((c, i) => String(c).trim() || `Column_${i + 1}`);

  const rows = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const rawRow = matrix[r];
    if (!rawRow || !rawRow.some((c) => String(c).trim() !== "")) continue;
    const rowObj = {};
    columns.forEach((col, colIdx) => {
      rowObj[col] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : "";
    });
    rows.push(rowObj);
  }

  return { rows, columns };
}

function StatusPill({ value }) {
  if (value === undefined || value === null || value === "") return <span>—</span>;
  const s = String(value).trim();
  const lower = s.toLowerCase();

  let tone = "info";
  if (
    lower.includes("eligible") ||
    lower.includes("approved") ||
    lower.includes("pass") ||
    lower.includes("paid") ||
    lower.includes("active") ||
    lower.includes("completed")
  ) {
    tone = "success";
  } else if (
    lower.includes("condonation") ||
    lower.includes("partial") ||
    lower.includes("pending") ||
    lower.includes("scheduled")
  ) {
    tone = "warning";
  } else if (
    lower.includes("detained") ||
    lower.includes("overdue") ||
    lower.includes("fail") ||
    lower.includes("rejected") ||
    lower.includes("due")
  ) {
    tone = "danger";
  }

  return <span className={`reports-badge reports-badge-${tone}`}>{s}</span>;
}

function DetailDataTable({
  cardKey,
  cardConfig,
  items,
  loading,
  error,
  searchQuery,
  onSearchChange,
  page,
  onPageChange,
  pageSize,
  onExport,
  exportingPdf,
  exportingExcel,
}) {
  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [items, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const renderTableContent = () => {
    if (loading) {
      return (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)" }}>
          <div className="cms-spinner" style={{ margin: "0 auto 12px" }} />
          <p>Loading {cardConfig?.label || "detail"} records...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: "30px 20px", textAlign: "center", color: "#dc2626" }}>
          <AlertCircle size={24} style={{ margin: "0 auto 8px" }} />
          <p>{error}</p>
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)" }}>
          <p>No matching {cardConfig?.label || "records"} found for the applied filter.</p>
        </div>
      );
    }

    let headers = [];
    let renderRow = (item, idx) => null;

    if (cardKey === "dueFees") {
      headers = ["Admission No", "Roll No", "Student Name", "Group", "Section", "Fee Structure", "Total Fee", "Paid", "Due Amount", "Fee Status"];
      renderRow = (item, idx) => (
        <tr key={item.studentFeeId || item.studentId || idx}>
          <td>{item.admissionNo || "—"}</td>
          <td>{item.rollNo || "—"}</td>
          <td><strong>{item.studentName || "—"}</strong></td>
          <td>{item.groupName || "—"}</td>
          <td>{item.sectionName || "—"}</td>
          <td>{item.feeStructureName || "Standard Fee"}</td>
          <td>₹{(item.totalAmount || 0).toLocaleString("en-IN")}</td>
          <td>₹{(item.paidAmount || 0).toLocaleString("en-IN")}</td>
          <td><strong style={{ color: (item.dueAmount || 0) > 0 ? "#dc2626" : "#16a34a" }}>₹{(item.dueAmount || 0).toLocaleString("en-IN")}</strong></td>
          <td><StatusPill value={item.feeStatus || ((item.dueAmount || 0) > 0 ? "Due" : "Paid")} /></td>
        </tr>
      );
    } else if (cardKey === "feeCollection") {
      headers = ["Receipt No", "Student Name", "Admission No", "Group", "Section", "Paid Amount", "Payment Mode", "Payment Date", "Status"];
      renderRow = (item, idx) => (
        <tr key={item.paymentId || idx}>
          <td>{item.receiptNo || "—"}</td>
          <td><strong>{item.studentName || "—"}</strong></td>
          <td>{item.admissionNo || "—"}</td>
          <td>{item.groupName || "—"}</td>
          <td>{item.sectionName || "—"}</td>
          <td><strong>₹{(item.paidAmount || item.collected || 0).toLocaleString("en-IN")}</strong></td>
          <td>{item.paymentMode || "Online"}</td>
          <td>{item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("en-IN") : "—"}</td>
          <td><StatusPill value={item.status || "Paid"} /></td>
        </tr>
      );
    } else if (cardKey === "attendance") {
      headers = ["Attendance Date", "Group", "Section", "Subject", "Total Students", "Present", "Absent", "Attendance %", "Compliance Status"];
      renderRow = (item, idx) => (
        <tr key={idx}>
          <td>{item.attendanceDate ? new Date(item.attendanceDate).toLocaleDateString("en-IN") : (item.period || "—")}</td>
          <td>{item.groupName || "—"}</td>
          <td>{item.sectionName || "—"}</td>
          <td>{item.subjectName || "All Subjects"}</td>
          <td>{item.totalStudents ?? "—"}</td>
          <td>{item.present ?? "—"}</td>
          <td>{item.absent ?? "—"}</td>
          <td><strong>{(item.attendancePercentage || 0).toFixed(1)}%</strong></td>
          <td><StatusPill value={item.statusCategory || ((item.attendancePercentage || 0) >= 75 ? "Eligible (>=75%)" : (item.attendancePercentage || 0) >= 65 ? "Condonation (65-74%)" : "Detained (<65%)")} /></td>
        </tr>
      );
    } else if (cardKey === "admissions") {
      headers = ["Admission No", "Student Name", "Roll No", "Group", "Section", "Board", "Admission Date", "Father's Name", "Status"];
      renderRow = (item, idx) => (
        <tr key={item.admissionId || idx}>
          <td>{item.admissionNo || "—"}</td>
          <td><strong>{item.studentName || `${item.firstName || ""} ${item.lastName || ""}`.trim() || "—"}</strong></td>
          <td>{item.rollNo || "—"}</td>
          <td>{item.groupName || item.group || "—"}</td>
          <td>{item.sectionName || item.section || "—"}</td>
          <td>{item.boardName || item.board || "—"}</td>
          <td>{item.admissionDate ? new Date(item.admissionDate).toLocaleDateString("en-IN") : "—"}</td>
          <td>{item.fatherName || "—"}</td>
          <td><StatusPill value={item.status || (item.isApproved ? "Approved" : "Pending")} /></td>
        </tr>
      );
    } else if (cardKey === "examinations") {
      headers = ["Exam Code", "Exam Name", "Board", "Group", "Exam Type", "Start Date", "End Date", "Eligible Students", "Status"];
      renderRow = (item, idx) => (
        <tr key={item.examinationId || idx}>
          <td>{item.examCode || "—"}</td>
          <td><strong>{item.examName || "—"}</strong></td>
          <td>{item.boardName || "—"}</td>
          <td>{item.groupName || "—"}</td>
          <td>{item.examType || "Theory"}</td>
          <td>{item.startDate || "—"}</td>
          <td>{item.endDate || "—"}</td>
          <td>{item.totalEligibleStudents ?? item.totalEligibleSubjects ?? "—"}</td>
          <td><StatusPill value={item.status || "Completed"} /></td>
        </tr>
      );
    } else if (cardKey === "results") {
      headers = ["Student Name", "Roll No", "Exam Name", "Subject", "Total Marks", "Marks Obtained", "Grade", "Result"];
      renderRow = (item, idx) => (
        <tr key={item.resultId || idx}>
          <td><strong>{item.studentName || "—"}</strong></td>
          <td>{item.rollNo || "—"}</td>
          <td>{item.examName || "—"}</td>
          <td>{item.subjectName || "—"}</td>
          <td>{item.totalMarks ?? "—"}</td>
          <td><strong>{item.marksObtained ?? "—"}</strong></td>
          <td>{item.grade || "—"}</td>
          <td><StatusPill value={item.resultStatus || "Pass"} /></td>
        </tr>
      );
    } else if (cardKey === "facultyWorkload") {
      headers = ["Emp ID", "Faculty Name", "Department", "Designation", "Assigned Periods", "Weekly Hours", "Subjects"];
      renderRow = (item, idx) => (
        <tr key={item.facultyId || idx}>
          <td>{item.facultyEmployeeId || item.facultyId || "—"}</td>
          <td><strong>{item.facultyName || "—"}</strong></td>
          <td>{item.departmentName || "—"}</td>
          <td>{item.designation || "Lecturer"}</td>
          <td>{item.periodCount ?? "—"}</td>
          <td><strong>{(item.hoursPerWeek || 0).toFixed(1)} hrs</strong></td>
          <td>{item.subjectNames || "—"}</td>
        </tr>
      );
    } else if (cardKey === "studentStrength") {
      headers = ["Group", "Section", "Board", "Maximum Capacity", "Total Enrolled", "Male", "Female", "Utilization %"];
      renderRow = (item, idx) => (
        <tr key={item.sectionId || item.groupId || idx}>
          <td><strong>{item.groupName || "—"}</strong></td>
          <td>{item.sectionName || "—"}</td>
          <td>{item.boardName || "—"}</td>
          <td>{item.maximumStrength ?? "—"}</td>
          <td><strong>{item.totalStudents ?? "—"}</strong></td>
          <td>{item.maleStudents ?? "—"}</td>
          <td>{item.femaleStudents ?? "—"}</td>
          <td><strong>{(item.utilizationPercentage || 0).toFixed(1)}%</strong></td>
        </tr>
      );
    } else if (cardKey === "passPercentage") {
      headers = ["Exam Name", "Academic Year", "Group", "Section", "Total Appeared", "Passed", "Failed", "Pass Percentage"];
      renderRow = (item, idx) => (
        <tr key={item.examId || idx}>
          <td><strong>{item.examName || "—"}</strong></td>
          <td>{item.academicYear || "—"}</td>
          <td>{item.groupName || "—"}</td>
          <td>{item.sectionName || "—"}</td>
          <td>{item.totalAppeared ?? "—"}</td>
          <td>{item.passed ?? "—"}</td>
          <td>{item.failed ?? "—"}</td>
          <td><strong style={{ color: (item.passPercentage || 0) >= 70 ? "#059669" : "#d97706" }}>{(item.passPercentage || 0).toFixed(1)}%</strong></td>
        </tr>
      );
    } else if (cardKey === "toppers") {
      headers = ["Rank", "Student Name", "Roll No", "Group", "Section", "Passed Subjects", "Total Marks", "Max Marks", "Percentage"];
      renderRow = (item, idx) => (
        <tr key={item.studentId || idx}>
          <td><span className={`reports-rank rank-${item.rank}`}>{item.rank}</span></td>
          <td><strong>{item.studentName || "—"}</strong></td>
          <td>{item.rollNo || item.admissionNo || "—"}</td>
          <td>{item.groupName || "—"}</td>
          <td>{item.sectionName || "—"}</td>
          <td>{item.passedSubjects ?? item.subjects ?? "—"}</td>
          <td><strong>{item.totalMarks ?? "—"}</strong></td>
          <td>{item.maxMarks ?? "—"}</td>
          <td><span className="reports-score">{(item.percentage || 0).toFixed(1)}%</span></td>
        </tr>
      );
    } else {
      const first = filteredItems[0] || {};
      const keys = Object.keys(first).filter((k) => !k.toLowerCase().endsWith("id") && typeof first[k] !== "object");
      headers = keys.map(formatColHeader);
      renderRow = (item, idx) => (
        <tr key={idx}>
          {keys.map((k) => (
            <td key={k}>{String(item[k] ?? "—")}</td>
          ))}
        </tr>
      );
    }

    return (
      <div className="reports-table-wrap">
        <table className="reports-top-students">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, idx) => renderRow(item, idx))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="reports-detail-section">
      <div className="reports-detail-head">
        <div className="reports-detail-title-group">
          <h3>{cardConfig?.label || "Report Records"} — Detailed Records</h3>
          <p>
            Showing {filteredItems.length} records matching applied filters
          </p>
        </div>

        <div className="reports-detail-search-bar">
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", color: "var(--cms-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              className="reports-search-input"
              style={{ paddingLeft: "32px" }}
              placeholder={`Search ${cardConfig?.label || "records"}...`}
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
            />
          </div>

          <button
            className="cms-btn cms-btn-ghost"
            type="button"
            onClick={() => onExport("pdf")}
            disabled={exportingPdf}
            title="Export filtered records to PDF"
          >
            <Download size={13} /> {exportingPdf ? "Exporting..." : "PDF"}
          </button>
          <button
            className="cms-btn cms-btn-ghost"
            type="button"
            onClick={() => onExport("excel")}
            disabled={exportingExcel}
            title="Export filtered records to Excel"
          >
            <FileSpreadsheet size={13} /> {exportingExcel ? "Exporting..." : "Excel"}
          </button>
          <button
            className="cms-btn cms-btn-ghost"
            type="button"
            onClick={() => {
              if (filteredItems.length === 0) return;
              const sample = filteredItems[0] || {};
              const cols = Object.keys(sample).filter(
                (k) => !k.toLowerCase().endsWith("id") && typeof sample[k] !== "object"
              );
              exportCsv(filteredItems, cols.length ? cols : Object.keys(sample), `${cardKey}-report.csv`);
            }}
            disabled={filteredItems.length === 0}
            title="Export filtered records to CSV"
          >
            <FileText size={13} /> CSV
          </button>
        </div>
      </div>

      {renderTableContent()}

      {filteredItems.length > 0 ? (
        <AdminPagination currentPage={safePage} totalRecords={filteredItems.length} pageSize={5} onPageChange={onPageChange} />
      ) : null}
    </section>
  );
}

export default function ReportsPage() {
  const {
    campuses: contextCampuses = [],
    activeCampuses = [],
    selectedCampus,
    selectedCampusId,
  } = useCampusContext();

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
    campus: selectedCampusId ? String(selectedCampusId) : (selectedCampus?.id ? String(selectedCampus.id) : ""),
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

  // Detail Drilldown & Trends states
  const [selectedCardKey, setSelectedCardKey] = useState("dueFees");
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(5);
  const hasAutoGeneratedRef = useRef(false);

  // Top Tabs & Audit Log states
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [auditLogData, setAuditLogData] = useState([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogError, setAuditLogError] = useState("");
  const [auditLogSearch, setAuditLogSearch] = useState("");
  const [auditLogPage, setAuditLogPage] = useState(1);
  const auditLogPageSize = 12;

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
    const controllers = requestControllersRef.current;
    return () => {
      mountedRef.current = false;
      Object.values(controllers).forEach((c) => c.abort());
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

  const availableCampuses = useMemo(() => {
    const list = (activeCampuses && activeCampuses.length > 0)
      ? activeCampuses
      : (contextCampuses || []);
    return list.map((c) => ({
      value: String(c.id ?? c.campusId ?? c.value),
      label: String(c.campusName || c.name || c.label || c.campusCode || c.code || `Campus #${c.id}`),
    }));
  }, [activeCampuses, contextCampuses]);

  // Sync Campus from global campus context
  useEffect(() => {
    const rawCampusId = selectedCampusId || selectedCampus?.id || selectedCampus?.campusId;
    if (rawCampusId) {
      setFilters((prev) => {
        if (prev.campus === String(rawCampusId)) return prev;
        return { ...prev, campus: String(rawCampusId) };
      });
    }
  }, [selectedCampusId, selectedCampus]);

  const availableBoards = useMemo(() => {
    let list = masterOptions.boards.length > 0
      ? masterOptions.boards
      : (contextBoards || []).map((b) => ({
          value: String(b.id ?? b.boardId ?? b.value),
          label: String(b.boardName || b.name || b.label || b.code || `Board #${b.id}`),
        }));

    if (filters.campus) {
      const allCampusesList = activeCampuses?.length ? activeCampuses : (contextCampuses || []);
      const chosenCampus = allCampusesList.find(
        (c) => String(c.id ?? c.campusId) === String(filters.campus)
      );
      if (chosenCampus) {
        const campusBoardIds = (chosenCampus.affiliatedBoards || [])
          .map((b) => String(b.boardId ?? b.id))
          .concat((chosenCampus.boardIds || []).map(String));
        if (campusBoardIds.length > 0) {
          const filtered = list.filter((b) => campusBoardIds.includes(String(b.value)));
          if (filtered.length > 0) {
            list = filtered;
          }
        }
      }
    }

    return list;
  }, [masterOptions.boards, contextBoards, filters.campus, activeCampuses, contextCampuses]);

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

    if (match) {
      setFilters((prev) => (prev.year === String(match.value) ? prev : { ...prev, year: String(match.value) }));
    } else if (availableYears.length > 0 && filters.board) {
      const stillValid = availableYears.some((y) => String(y.value) === String(filters.year));
      if (!stillValid) {
        setFilters((prev) => ({ ...prev, year: String(availableYears[0].value) }));
      }
    } else if (rawYearId) {
      setFilters((prev) => (prev.year === String(rawYearId) ? prev : { ...prev, year: String(rawYearId) }));
    }
  }, [selectedAcademicYearId, selectedAcademicYear, availableYears, filters.board, filters.year]);

  const filterFields = useMemo(() => [
    {
      name: "campus",
      label: "Campus",
      type: "select",
      options: [{ value: "", label: "All Campuses" }, ...availableCampuses],
    },
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
  ], [availableCampuses, availableBoards, availableYears, boardsLoading, groupsLoading, levelLoading, masterOptions.groups, masterOptions.levels, masterOptions.sections, sectionsLoading, yearsLoading]);

  const handleFilterChange = (name, value) => {
    setReportGenerated(false);
    setPreviewFile(null);
    setDashboardData(null);
    setError("");
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "campus") {
        Object.assign(next, { board: "", level: "", group: "", section: "" });
      }
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

  const loadDetailData = useCallback(async (cardKey, activeFilters = null) => {
    const card = summaryCardConfig.find((c) => c.key === cardKey);
    if (!card) return;
    const endpoint = REPORTS_API.details[card.key] || REPORTS_API.details[card.reportType];
    if (!endpoint) return;

    setSelectedCardKey(cardKey);
    setDetailLoading(true);
    setDetailError("");
    setDetailPage(1);
    setDetailSearch("");
    try {
      const params = buildReportQuery(activeFilters || filters);
      const res = await apiClient.get(endpoint, { params });
      const rawList = res.data?.details || res.data?.results || res.data?.toppers || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setDetailData(rawList);
    } catch (err) {
      setDetailError(getApiErrorMessage(err) || `Failed to load ${card.label} records.`);
      setDetailData([]);
    } finally {
      setDetailLoading(false);
    }
  }, [filters]);

  const loadAuditLogs = useCallback(async (customFilters = null) => {
    setAuditLogLoading(true);
    setAuditLogError("");
    setAuditLogPage(1);
    try {
      const params = buildReportQuery(customFilters || filters);
      const res = await apiClient.get(REPORTS_API.details.auditLogs, { params });
      const list = res.data?.records || res.data?.details || (Array.isArray(res.data) ? res.data : []);
      setAuditLogData(list);
    } catch (err) {
      setAuditLogError(getApiErrorMessage(err) || "Failed to load audit logs.");
      setAuditLogData([]);
    } finally {
      setAuditLogLoading(false);
    }
  }, [filters]);

  const filteredAuditLogs = useMemo(() => {
    if (!Array.isArray(auditLogData)) return [];
    if (!auditLogSearch.trim()) return auditLogData;
    const q = auditLogSearch.toLowerCase().trim();
    return auditLogData.filter((item) =>
      Object.values(item).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [auditLogData, auditLogSearch]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / auditLogPageSize));
  const safeAuditPage = Math.min(Math.max(1, auditLogPage), totalAuditPages);
  const auditStartIndex = (safeAuditPage - 1) * auditLogPageSize;
  const pageAuditLogs = filteredAuditLogs.slice(auditStartIndex, auditStartIndex + auditLogPageSize);

  const selectDetailCard = (card) => {
    loadDetailData(card.key);
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
    if (activeMainTab === "auditLogs") {
      loadAuditLogs(activeFilters);
      return;
    }
    setLoading(true);
    setError("");
    setPreviewFile(null);
    try {
      const params = buildReportQuery(activeFilters);
      const res = await apiClient.get(REPORTS_API.dashboard, { params });
      setDashboardData(res.data);
      setReportGenerated(true);
      loadDetailData(selectedCardKey || "dueFees", activeFilters);
    } catch (err) {
      setError(getApiErrorMessage(err) || "Failed to generate report overview.");
    } finally {
      setLoading(false);
    }
  }, [activeMainTab, filters, loadAuditLogs, loadDetailData, loading, selectedCardKey]);

  // Auto-generate overview on initial load once academic year is resolved
  useEffect(() => {
    if (!hasAutoGeneratedRef.current && availableYears.length > 0 && filters.year) {
      hasAutoGeneratedRef.current = true;
      generateReport();
    }
  }, [availableYears, filters.year, generateReport]);

  const resetReports = () => {
    const defaultFilters = {
      campus: selectedCampusId ? String(selectedCampusId) : (selectedCampus?.id ? String(selectedCampus.id) : ""),
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
    setSelectedCardKey("dueFees");
    setDetailData(null);
    setPreviewFile(null);
    setAuditLogData([]);
    setAuditLogError("");
    setAuditLogSearch("");
    setAuditLogPage(1);
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
    try {
      setToast("Preparing document for printing...");
      const res = await apiClient.get(REPORTS_API.exportPdf, {
        params: { ...buildReportQuery(filters), reportType: OVERVIEW_REPORT_TYPE },
        responseType: "blob",
      });
      const blob = responseBlob(res);
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error(e);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(url);
          }, 60000);
        }, 500);
      };
    } catch (err) {
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

      {/* Navigation Tabs: Reports Overview vs Audit Logs */}
      <div className="reports-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeMainTab === "overview"}
          className={`reports-tab ${activeMainTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveMainTab("overview")}
        >
          Reports Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMainTab === "auditLogs"}
          className={`reports-tab ${activeMainTab === "auditLogs" ? "is-active" : ""}`}
          onClick={() => {
            setActiveMainTab("auditLogs");
            if (auditLogData.length === 0) {
              loadAuditLogs();
            }
          }}
        >
          Audit Logs
        </button>
      </div>

      {/* Cascading Filter Bar */}
      <section className="cms-card reports-filter-card">
        <div className="cms-card-body">
          <div className="cms-filters">
            {filterFields.map((field) => (
              <Field key={field.name} field={field} value={filters[field.name]} onChange={handleFilterChange} />
            ))}
          </div>
          <div className="reports-filter-actions">
            <button className="cms-btn cms-btn-primary" onClick={() => generateReport()} disabled={loading || auditLogLoading}>
              {loading || auditLogLoading ? "Loading Data..." : activeMainTab === "auditLogs" ? "Filter Logs" : "Generate Report"}
            </button>
            <button className="cms-btn cms-btn-ghost" onClick={resetReports} disabled={loading || auditLogLoading}>
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

      {/* Audit Logs Tab View */}
      {activeMainTab === "auditLogs" ? (
        <section className="reports-detail-section" style={{ marginTop: "16px" }}>
          <div className="reports-detail-head">
            <div className="reports-detail-title-group">
              <h3>System Audit &amp; Activity Logs</h3>
              <p>Showing {filteredAuditLogs.length} audit trail records matching active filters</p>
            </div>
            <div className="reports-detail-search-bar">
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", color: "var(--cms-muted)", pointerEvents: "none" }} />
                <input
                  type="text"
                  className="reports-search-input"
                  style={{ paddingLeft: "32px" }}
                  placeholder="Search audit logs..."
                  value={auditLogSearch}
                  onChange={(e) => {
                    setAuditLogSearch(e.target.value);
                    setAuditLogPage(1);
                  }}
                />
              </div>
              <button
                className="cms-btn cms-btn-ghost"
                type="button"
                onClick={() => {
                  if (filteredAuditLogs.length === 0) return;
                  const cols = ["id", "time", "actor", "role", "action", "module", "target", "status", "ip"];
                  exportCsv(filteredAuditLogs, cols, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
                }}
                disabled={filteredAuditLogs.length === 0}
                title="Export audit logs to CSV"
              >
                <FileText size={13} /> CSV
              </button>
            </div>
          </div>

          {auditLogLoading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)" }}>
              <div className="cms-spinner" style={{ margin: "0 auto 12px" }} />
              <p>Loading audit trail records...</p>
            </div>
          ) : auditLogError ? (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#dc2626" }}>
              <AlertCircle size={24} style={{ margin: "0 auto 8px" }} />
              <p>{auditLogError}</p>
            </div>
          ) : filteredAuditLogs.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)" }}>
              <p>No audit trail records found for the applied filter.</p>
            </div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-top-students">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {pageAuditLogs.map((log, idx) => (
                    <tr key={log.auditLogId || log.id || idx}>
                      <td><code>{log.id || `AUD-${log.auditLogId}`}</code></td>
                      <td>{log.time || (log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "—")}</td>
                      <td><strong>{log.actor || log.userName || "System"}</strong></td>
                      <td><span className="reports-badge reports-badge-info">{log.role || "User"}</span></td>
                      <td><strong>{log.action || "—"}</strong></td>
                      <td>{log.module || "—"}</td>
                      <td>{log.target || "—"}</td>
                      <td><StatusPill value={log.status || "Success"} /></td>
                      <td><small>{log.ip || log.remoteIpAddress || "—"}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredAuditLogs.length > 0 ? (
            <div className="reports-detail-footer">
              <span>
                Showing {auditStartIndex + 1} to {Math.min(auditStartIndex + auditLogPageSize, filteredAuditLogs.length)} of {filteredAuditLogs.length} logs
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  className="cms-btn cms-btn-ghost"
                  type="button"
                  disabled={safeAuditPage <= 1}
                  onClick={() => setAuditLogPage(safeAuditPage - 1)}
                  style={{ padding: "4px 8px" }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>
                  Page {safeAuditPage} of {totalAuditPages}
                </span>
                <button
                  className="cms-btn cms-btn-ghost"
                  type="button"
                  disabled={safeAuditPage >= totalAuditPages}
                  onClick={() => setAuditLogPage(safeAuditPage + 1)}
                  style={{ padding: "4px 8px" }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 10 Summary KPI Cards - Only visible in Overview tab after user clicks Generate Report */}
      {activeMainTab === "overview" && reportGenerated ? (
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
              const isSelected = selectedCardKey === key;

              return (
                <article
                  key={key}
                  className={`reports-summary-card reports-summary-card-expanded ${isSelected ? "is-selected" : ""}`}
                  onClick={() => selectDetailCard(card)}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectDetailCard(card);
                    }
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

                  <div className="reports-card-actions">
                    <button
                      className="cms-btn cms-btn-ghost"
                      type="button"
                      title={`Export ${label} PDF`}
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCardReport(card, "pdf");
                      }}
                      disabled={Boolean(exportingCards[`${key}-pdf`])}
                    >
                      <Download size={12} /> PDF
                    </button>
                    <button
                      className="cms-btn cms-btn-ghost"
                      type="button"
                      title={`Export ${label} Excel`}
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCardReport(card, "excel");
                      }}
                      disabled={Boolean(exportingCards[`${key}-excel`])}
                    >
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Intermediate Board Compliance & Exam Eligibility Norms */}
          <section className="reports-compliance-section" style={{ marginTop: "24px" }}>
            <div className="reports-compliance-banner-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "16px", fontWeight: 700 }}>
                <ShieldCheck size={20} style={{ color: "#2563eb" }} />
                Board Compliance &amp; Exam Eligibility (BIEAP / TGBIE Norms)
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--cms-muted)" }}>
                Official 75% attendance condonation threshold &amp; fee clearance status for IPE Hall Ticket dispatch
              </p>
            </div>
            <div className="reports-compliance-grid" style={{ marginTop: "12px" }}>
              <div className="reports-compliance-card tone-success">
                <span>Board Exam Eligible (&ge;75%)</span>
                <strong>{dashboardData.attendanceEligibleCount ?? 0} Students</strong>
              </div>
              <div className="reports-compliance-card tone-warning">
                <span>Condonation Range (65-74.9%)</span>
                <strong>{dashboardData.attendanceCondonationCount ?? 0} Students</strong>
              </div>
              <div className="reports-compliance-card tone-danger">
                <span>Attendance Detained (&lt;65%)</span>
                <strong>{dashboardData.attendanceDetainedCount ?? 0} Students</strong>
              </div>
              <div className="reports-compliance-card tone-blue">
                <span>Hall Ticket Clearance (No Dues)</span>
                <strong>{dashboardData.studentsClearedCount ?? 0} Students</strong>
              </div>
              <div className="reports-compliance-card tone-warning">
                <span>Pending Fee Defaulters</span>
                <strong>{dashboardData.studentsWithDuesCount ?? 0} Students</strong>
              </div>
            </div>
          </section>

          {/* Visual Analytics Trends */}
          <div className="reports-charts-container" style={{ marginTop: "24px" }}>
            {/* Monthly Admissions Intake Bar Chart */}
            <div className="cms-card reports-chart-card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--cms-heading, #172844)" }}>
                    Monthly Admissions Intake
                  </h4>
                  <span style={{ fontSize: "12px", color: "var(--cms-muted, #687791)" }}>
                    Enrollment volume trend across academic cycles
                  </span>
                </div>
                <span className="reports-badge reports-badge-info" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <TrendingUp size={12} /> {dashboardData.admissions} Total
                </span>
              </div>
              <div style={{ width: "100%", height: "240px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      dashboardData.admissionsVsTarget?.length > 0
                        ? dashboardData.admissionsVsTarget
                        : [{ label: "Current", value: dashboardData.admissions }]
                    }
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                      formatter={(val) => [`${val} Admissions`, "Intake"]}
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} name="Admissions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Student Attendance Rate with 75% Board Threshold */}
            <div className="cms-card reports-chart-card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--cms-heading, #172844)" }}>
                    Student Attendance Rate vs Board Threshold
                  </h4>
                  <span style={{ fontSize: "12px", color: "var(--cms-muted, #687791)" }}>
                    Minimum 75% required for IPE Board Exam hall ticket
                  </span>
                </div>
                <span
                  className={`reports-badge ${
                    (dashboardData.attendance || 0) >= 75 ? "reports-badge-success" : "reports-badge-warning"
                  }`}
                >
                  Avg: {(dashboardData.attendance || 0).toFixed(1)}%
                </span>
              </div>
              <div style={{ width: "100%", height: "240px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={
                      dashboardData.attendanceTrend?.length > 0
                        ? dashboardData.attendanceTrend
                        : [
                            { label: "Cycle 1", value: dashboardData.attendance || 85 },
                            { label: "Cycle 2", value: Math.max(0, (dashboardData.attendance || 85) - 3) },
                            { label: "Current", value: dashboardData.attendance || 85 },
                          ]
                    }
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} unit="%" />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                      formatter={(val) => [`${Number(val).toFixed(1)}%`, "Attendance"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#attendanceGradient)"
                      name="Attendance %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Interactive In-Page Drilldown Table */}
          <DetailDataTable
            cardKey={selectedCardKey}
            cardConfig={summaryCardConfig.find((c) => c.key === selectedCardKey) || summaryCardConfig[3]}
            items={detailData}
            loading={detailLoading}
            error={detailError}
            searchQuery={detailSearch}
            onSearchChange={setDetailSearch}
            page={detailPage}
            onPageChange={setDetailPage}
            pageSize={detailPageSize}
            onExport={(fmt) => {
              const card = summaryCardConfig.find((c) => c.key === selectedCardKey);
              if (card) exportCardReport(card, fmt);
            }}
            exportingPdf={Boolean(exportingCards[`${selectedCardKey}-pdf`])}
            exportingExcel={Boolean(exportingCards[`${selectedCardKey}-excel`])}
          />
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
            <PaginatedTable className="reports-top-students">
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
            </PaginatedTable>
          </div>
        </Modal>
      ) : null}
    </DashboardLayout>
  );
}
