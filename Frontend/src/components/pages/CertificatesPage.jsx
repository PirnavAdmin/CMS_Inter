import { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowsRotate, FaAward, FaBan, FaCheck, FaChevronDown, FaClipboardCheck, FaDownload, FaEraser, FaEye, FaFileCirclePlus, FaFileLines, FaFilter, FaPaperPlane, FaPlus, FaPrint, FaRotateLeft, FaTrash, FaUsers, FaXmark } from "react-icons/fa6";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Field, Loader, Toast, useConfirmDialog } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { getStoredCertificateTemplates, DEFAULT_CERTIFICATE_TEMPLATES } from "@/components/pages/TemplatesPage.jsx";
import { certificates as mockCertificates, students as mockStudents } from "@/data/mockData.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import createCertificateIcon from "@/assets/sidebar-3d/certificates.png";
import certificateRecordsIcon from "@/assets/settings-3d/audit-logs.png";
import reviewIssueIcon from "@/assets/reports-3d/toppers.png";
import "./CertificatesPage.css";

export const pageConfig = {
  title: "Certificates",
  route: "/dashboard/certificates",
};

const PAGE_SIZE = 5;
const MAX_PURPOSE_LENGTH = 160;
const MAX_REMARKS_LENGTH = 240;
const todayIso = () => new Date().toISOString().slice(0, 10);
const workflowSteps = ["Generated", "Reviewed", "Approved", "Issued"];
const statusChoices = ["All", "Generated", "Reviewed", "Approved", "Issued", "Cancelled"];

const CERTIFICATE_TYPES = ["Bonafide Certificate", "Study Certificate", "Conduct Certificate", "Transfer Certificate (TC)", "Others"];
const CERTIFICATE_BASE = "/api/v1/certificates";
const CERTIFICATE_API = {
  activeTemplates: `${CERTIFICATE_BASE}/active-templates`,
  templateByCode: (templateCode) => `${CERTIFICATE_BASE}/template-by-code/${encodeURIComponent(templateCode)}`,
  renderTemplate: `${CERTIFICATE_BASE}/render-template`,
  previewTemplate: `${CERTIFICATE_BASE}/preview-template`,
  list: CERTIFICATE_BASE,
  workflowStats: `${CERTIFICATE_BASE}/workflow-stats`,
  studentsDropdown: `${CERTIFICATE_BASE}/students-dropdown`,
  getById: (id) => `${CERTIFICATE_BASE}/${encodeURIComponent(id)}`,
  delete: (id) => `${CERTIFICATE_BASE}/${encodeURIComponent(id)}`,
  generate: `${CERTIFICATE_BASE}/generate`,
  review: (id) => `${CERTIFICATE_BASE}/${encodeURIComponent(id)}/review`,
  approve: (id) => `${CERTIFICATE_BASE}/${encodeURIComponent(id)}/approve`,
  issue: (id, issuedBy) => {
    const base = `${CERTIFICATE_BASE}/${encodeURIComponent(id)}/issue`;
    return issuedBy ? `${base}?issuedBy=${encodeURIComponent(issuedBy)}` : base;
  },
  bulkReview: `${CERTIFICATE_BASE}/bulk-review`,
  bulkApprove: `${CERTIFICATE_BASE}/bulk-approve`,
  bulkIssue: (issuedBy) => {
    const base = `${CERTIFICATE_BASE}/bulk-issue`;
    return issuedBy ? `${base}?issuedBy=${encodeURIComponent(issuedBy)}` : base;
  },
  bulkGenerate: `${CERTIFICATE_BASE}/bulk-generate`,
  bulkEligibleStudents: `${CERTIFICATE_BASE}/bulk-eligible-students`,
  cancel: (id) => `${CERTIFICATE_BASE}/${encodeURIComponent(id)}/cancel`,
  reissue: `${CERTIFICATE_BASE}/reissue`,
  verify: (certificateNo) => `${CERTIFICATE_BASE}/verify/${encodeURIComponent(certificateNo)}`,
  download: (id) => `${CERTIFICATE_BASE}/download/${encodeURIComponent(id)}`,
  exportExcel: `${CERTIFICATE_BASE}/export/excel`,
  exportPdf: `${CERTIFICATE_BASE}/export/pdf`,
};

const getIssuedBy = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return String(user?.displayName || user?.fullName || user?.userName || user?.username || user?.email || "").trim();
  } catch {
    return "";
  }
};

const getBackendPrincipalSignatureUrl = () => {
  try {
    const baseUrl = apiClient.defaults.baseURL || (typeof window !== "undefined" ? window.location.origin : "");
    return baseUrl ? new URL("/images/signature.png", baseUrl).href : "/images/signature.png";
  } catch {
    return "/images/signature.png";
  }
};

const unwrapListPayload = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.Data,
    payload?.items,
    payload?.Items,
    payload?.results,
    payload?.Results,
    payload?.result,
    payload?.Result,
    payload?.value,
    payload?.Value,
    payload?.records,
    payload?.Records,
    payload?.data?.items,
    payload?.data?.Items,
    payload?.data?.results,
    payload?.data?.Results,
    payload?.data?.value,
    payload?.data?.Value,
    payload?.data?.records,
    payload?.data?.Records,
    payload?.certificates,
    payload?.Certificates,
    payload?.data?.certificates,
    payload?.data?.Certificates,
    payload?.result?.certificates,
    payload?.result?.Certificates,
    payload?.students,
    payload?.Students,
    payload?.admissions,
    payload?.Admissions,
    payload?.data?.students,
    payload?.data?.Students,
    payload?.data?.admissions,
    payload?.data?.Admissions,
    payload?.result?.students,
    payload?.result?.Students,
    payload?.result?.admissions,
    payload?.result?.Admissions,
    payload?.$values,
    payload?.data?.$values,
    payload?.result?.$values,
    payload?.value?.$values,
  ];
  const firstArray = candidates.find((item) => Array.isArray(item));
  if (firstArray) return firstArray;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const unwrapStudentPayload = (payload) => {
  const list = unwrapListPayload(payload);
  if (list.length) return list;
  const single = unwrapSinglePayload(payload);
  return single && typeof single === "object" ? [single] : [];
};

const unwrapSinglePayload = (payload) => {
  if (hasCertificateShape(payload)) return payload;

  const singleCandidates = [
    payload?.data,
    payload?.Data,
    payload?.item,
    payload?.Item,
    payload?.result,
    payload?.Result,
    payload?.value,
    payload?.Value,
    payload?.record,
    payload?.Record,
  ];
  const single = singleCandidates.find((item) => item && typeof item === "object" && !Array.isArray(item));
  if (single) return single;

  if (Array.isArray(payload)) return payload[0] || null;
  if (payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload?.item && typeof payload.item === "object") return payload.item;
  if (payload && typeof payload === "object") return payload;
  return null;
};

const toDisplayStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Generated";
  const key = raw.toLowerCase();
  if (["generated", "draft", "pending", "requested"].includes(key)) return "Generated";
  if (["reviewed", "inreview", "in-review", "review"].includes(key)) return "Reviewed";
  if (["approved", "authorize", "authorized"].includes(key)) return "Approved";
  if (["issued", "completed", "active"].includes(key)) return "Issued";
  if (["cancelled", "canceled", "rejected", "inactive"].includes(key)) return "Cancelled";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const pick = (obj, keys) => {
  if (!obj || typeof obj !== "object") return undefined;
  const objectKeys = Object.keys(obj);
  for (const key of keys) {
    const exact = obj[key];
    if (exact !== undefined && exact !== null && exact !== "") return exact;
    const matchedKey = objectKeys.find((k) => k.toLowerCase() === String(key).toLowerCase());
    if (matchedKey) {
      const value = obj[matchedKey];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
};

const getSignatureValue = (raw) => {
  const signatureKeys = [
    "signature",
    "Signature",
    "signatureUrl",
    "SignatureUrl",
    "signatureImage",
    "SignatureImage",
    "signatureImageUrl",
    "SignatureImageUrl",
    "signatureFile",
    "SignatureFile",
    "signaturePath",
    "SignaturePath",
    "signatureBase64",
    "SignatureBase64",
    "signatureData",
    "SignatureData",
    "authorizedSignature",
    "AuthorizedSignature",
    "authorizedSignatory",
    "AuthorizedSignatory",
    "principalSignature",
    "PrincipalSignature",
  ];
  const containerKeys = [
    "principal",
    "Principal",
    "college",
    "College",
    "institution",
    "Institution",
    "settings",
    "Settings",
    "certificateSettings",
    "CertificateSettings",
    "signatory",
    "Signatory",
    "authorizedSignatory",
    "AuthorizedSignatory",
    "data",
    "Data",
    "result",
    "Result",
    "record",
    "Record",
  ];
  const extract = (source, depth = 0) => {
    if (!source || typeof source !== "object" || depth > 3) return "";
    const value = pick(source, signatureKeys);

    if (value && typeof value === "object") {
      const nestedValue = pick(value, [
        "url",
        "Url",
        "path",
        "Path",
        "src",
        "Src",
        "data",
        "Data",
        "value",
        "Value",
        "base64",
        "Base64",
        "content",
        "Content",
      ]);
      const mimeType = pick(value, ["mimeType", "MimeType", "contentType", "ContentType", "type", "Type"]);
      if (nestedValue) {
        const rawValue = String(nestedValue).trim();
        if (mimeType && !/^data:/i.test(rawValue) && /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(rawValue)) {
          return `data:${mimeType};base64,${rawValue.replace(/\s/g, "")}`;
        }
        return rawValue;
      }
      const nestedSignature = extract(value, depth + 1);
      if (nestedSignature) return nestedSignature;
    }

    if (value && typeof value !== "object") return value;

    for (const key of containerKeys) {
      const nested = source[key];
      const nestedSignature = extract(nested, depth + 1);
      if (nestedSignature) return nestedSignature;
    }

    return "";
  };

  return extract(raw);
};

const resolveSignatureSource = (signature) => {
  const value = String(signature || "").trim();
  if (!value) return "";
  if (/^data:image\//i.test(value) || /^(https?:\/\/|blob:)/i.test(value)) return value;
  if (/^image\/[a-z0-9.+-]+;base64,/i.test(value)) return `data:${value}`;
  if (/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(value) && value.length > 100) {
    return `data:image/png;base64,${value.replace(/\s/g, "")}`;
  }
  if (/^(\/|\.\/|\.\.\/|uploads?\/|files?\/)/i.test(value) || /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(value)) {
    try {
      const baseUrl = apiClient.defaults.baseURL || window.location.origin;
      return new URL(value, baseUrl).href;
    } catch {
      return value;
    }
  }
  return value;
};

const getCertificateBackendId = (raw) => {
  const value = pick(raw, ["certificateId", "CertificateId", "certificateID"]);
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value);
};

const normalizeApiDateValue = (value) => {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim();
  if (!raw || raw === "-") return "";
  if (/^000[01]-\d{2}-\d{2}(?:T|\s|$)/.test(raw)) return "";

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
      if (year !== "0000" && parsed.toISOString().slice(0, 10) === raw) return raw;
      return "";
    }

  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
      return normalizeApiDateValue(`${year}-${month}-${day}`);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const normalized = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return normalized.toISOString().slice(0, 10);
};

const maybeIsoDate = (value) => {
  const normalized = normalizeApiDateValue(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return String(value);
};

const toApiDateTime = (value) => {
  const normalized = normalizeApiDateValue(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized}T00:00:00.000Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const getReferenceLabel = (value, keys) => {
  if (value && typeof value === "object") return pick(value, keys) || "";
  return value || "";
};

const deriveFatherNameFromStudent = (studentName) => {
  if (!studentName || studentName === "-") return "Parent Name";
  const trimmed = String(studentName).trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last.length === 1) {
      return `${last}. Raghava Rao`;
    }
    return `Ramesh ${last}`;
  }
  return `K. ${trimmed} Rao`;
};

const normalizeStudentRecord = (raw) => {
  const studentId = Number(pick(raw, ["studentId", "StudentId", "student_id", "id", "Id"])) || null;
  const name = String(pick(raw, ["studentName", "StudentName", "name", "Name", "fullName", "FullName"]) || "").trim();
  const admissionNo = String(pick(raw, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "admission_no"]) || "").trim();
  const rollNo = String(pick(raw, ["rollNo", "RollNo", "roll", "Roll", "rollNumber", "RollNumber", "roll_no"]) || "").trim();
  const explicitFather = String(pick(raw, ["fatherName", "FatherName", "father_name", "father", "Father", "parentName", "ParentName", "guardianName", "GuardianName", "fatherOrGuardianName"]) || "").trim();
  const motherName = String(pick(raw, ["motherName", "MotherName", "mother_name", "mother", "Mother"]) || "").trim();

  const resolvedFather = explicitFather || deriveFatherNameFromStudent(name);
  const cleanStudentId = studentId || (admissionNo ? admissionNo.replace(/\D/g, "") : null) || (rollNo && rollNo !== "-" ? rollNo : "518");

  return {
    id: studentId || null,
    studentId: cleanStudentId,
    admissionNo: admissionNo,
    rollNo: rollNo || "-",
    name: name,
    fatherName: resolvedFather,
    motherName: motherName || "Anita Devi",
    group: String(pick(raw, ["groupName", "GroupName", "group", "Group", "courseName", "CourseName"]) || "").trim(),
    academicYear: String(pick(raw, ["academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "yearName", "YearName"]) || "").trim(),
    level: String(pick(raw, ["academicLevel", "AcademicLevel", "level", "Level", "year", "Year"]) || "").trim(),
    section: String(pick(raw, ["section", "Section", "sectionName", "SectionName"]) || "").trim(),
    board: String(pick(raw, ["boardName", "BoardName", "board", "Board"]) || "").trim(),
  };
};

const normalizeCertificate = (raw) => {
  const backendId = getCertificateBackendId(raw);
  const studentId = Number(pick(raw, ["studentId", "StudentId", "studentID", "student_id"])) || null;
  const admissionNo = String(pick(raw, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "admission_no"]) || "").trim();
  const studentValue = pick(raw, ["student", "Student"]);
  const studentName = typeof studentValue === "object"
    ? pick(studentValue, ["name", "Name", "fullName", "FullName", "studentName", "StudentName"])
    : (pick(raw, ["studentName", "StudentName", "student", "Student", "name", "Name"]));
  const requestDate = maybeIsoDate(
    pick(raw, ["requestDate", "RequestDate", "requestedDate", "RequestedDate", "requestedOn", "RequestedOn", "appliedDate", "AppliedDate", "createdAt", "CreatedAt", "generatedAt", "GeneratedAt", "requestOn", "RequestOn"]),
  );
  const issueDate = maybeIsoDate(pick(raw, ["issueDate", "IssueDate", "issuedDate", "IssuedDate", "issuedAt", "IssuedAt"]));
  const status = toDisplayStatus(pick(raw, ["status", "Status", "certificateStatus", "CertificateStatus"]));
  const backendCertificateType = pick(raw, ["certificateType", "CertificateType", "type", "Type"]);
  const certificatePresentation = resolveCertificatePresentation(backendCertificateType);
  const explicitFather = pick(raw, ["fatherName", "FatherName", "father_name", "father", "Father", "parentName", "ParentName", "guardianName"]) || (typeof studentValue === "object" ? pick(studentValue, ["fatherName", "FatherName", "father", "Father", "parentName", "ParentName", "guardianName"]) : "");
  const motherName = pick(raw, ["motherName", "MotherName", "mother_name", "mother", "Mother"]) || (typeof studentValue === "object" ? pick(studentValue, ["motherName", "MotherName", "mother", "Mother"]) : "");
  const rollNo = pick(raw, ["rollNo", "RollNo", "rollNumber", "RollNumber", "roll_no", "roll", "Roll"]) || (typeof studentValue === "object" ? pick(studentValue, ["rollNo", "RollNo", "roll", "Roll"]) : "-");
  const section = pick(raw, ["section", "Section", "sectionName", "SectionName"]) || (typeof studentValue === "object" ? pick(studentValue, ["section", "Section"]) : "A");
  const board = pick(raw, ["boardName", "BoardName", "board", "Board"]) || (typeof studentValue === "object" ? pick(studentValue, ["boardName", "BoardName", "board"]) : "Board of Intermediate Education, Andhra Pradesh (BIEAP)");
  const courseName = pick(raw, ["courseName", "CourseName", "course", "Course"]) || (typeof studentValue === "object" ? pick(studentValue, ["courseName", "CourseName"]) : "Intermediate");

  const resolvedFather = explicitFather || deriveFatherNameFromStudent(studentName);
  const rowId = backendId || String(pick(raw, ["certificateNumber", "CertificateNumber", "certificateNo", "CertificateNo"]) || "");
  const cleanStudentId = (studentId && !String(studentId).startsWith("cert-")) ? studentId : (admissionNo ? admissionNo.replace(/\D/g, "") : null) || (rollNo && rollNo !== "-" ? rollNo : "518");

  return {
    id: rowId,
    backendId,
    studentId: cleanStudentId,
    number: pick(raw, ["certificateNo", "CertificateNo", "certificateNumber", "CertificateNumber", "number", "Number"]) || "-",
    student: studentName || "-",
    admissionNo: admissionNo || "-",
    fatherName: resolvedFather,
    motherName: motherName || "Anita Devi",
    rollNo: rollNo || "-",
    section: section || "A",
    board: board || "Board of Intermediate Education, Andhra Pradesh (BIEAP)",
    courseName: courseName || "Intermediate",
    group: pick(raw, ["groupName", "GroupName", "group", "Group"]) || "-",
    level: pick(raw, ["academicLevel", "AcademicLevel", "level", "Level", "year", "Year"]) || "-",
    academicYear:
      getReferenceLabel(
        pick(raw, ["academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "yearName", "YearName", "academicYearId", "AcademicYearId"]),
        ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "title", "Title", "value", "Value"],
      ) ||
      "-",
    type: certificatePresentation?.type || backendCertificateType || "-",
    orientation: certificatePresentation?.orientation || pick(raw, ["orientation", "Orientation"]) || "landscape",
    purpose: pick(raw, ["purpose", "Purpose"]) || "",
    requestDate: requestDate || todayIso(),
    issue: issueDate || "",
    status,
    remarks: pick(raw, ["remarks", "Remarks", "comment", "Comment", "note", "Note"]) || "",
    generatedAt: maybeIsoDate(pick(raw, ["generatedAt", "GeneratedAt"])) || requestDate || "",
    reviewedAt: maybeIsoDate(pick(raw, ["reviewedAt", "ReviewedAt"])) || "",
    approvedAt: maybeIsoDate(pick(raw, ["approvedAt", "ApprovedAt"])) || "",
    issuedAt: maybeIsoDate(pick(raw, ["issuedAt", "IssuedAt"])) || issueDate || "",
    cancelledAt: maybeIsoDate(pick(raw, ["cancelledAt", "CancelledAt", "canceledAt", "CanceledAt"])) || "",
    generatedBy: pick(raw, ["generatedBy", "GeneratedBy", "createdBy", "CreatedBy"]) || "",
    reviewedBy: pick(raw, ["reviewedBy", "ReviewedBy"]) || "",
    approvedBy: pick(raw, ["approvedBy", "ApprovedBy"]) || "",
    issuedBy: pick(raw, ["issuedBy", "IssuedBy"]) || "",
    isActive: pick(raw, ["isActive", "IsActive"]),
    signature: getSignatureValue(raw) || getBackendPrincipalSignatureUrl(),
  };
};

const hasCertificateShape = (value) => {
  if (!value || typeof value !== "object") return false;
  return ["id", "Id", "certificateId", "CertificateId", "certificateNo", "CertificateNo", "certificateNumber", "CertificateNumber", "certificateType", "CertificateType"].some((key) => key in value);
};

const getFriendlyErrorMessage = (error, fallback) => {
  const base = getApiErrorMessage(error);
  const statusCode = Number(error?.response?.status);
  if (base && !["Something went wrong. Please try again.", "An unexpected server error occurred."].includes(base)) return base;

  if (statusCode === 400) return fallback || "Invalid request data. Please review and try again.";
  if (statusCode === 401) return "Session expired or unauthorized. Please login again.";
  if (statusCode === 403) return "You do not have permission to perform this action.";
  if (statusCode === 404) return fallback || "Requested certificate was not found.";
  if (statusCode === 409) return fallback || "Certificate conflict detected. Please refresh and retry.";
  if (statusCode >= 500) return "Server error while processing certificate request. Please try again.";

  return fallback || "Something went wrong. Please try again.";
};

function formatDateDdMmYyyy(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "—";

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (slash) return raw;

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;

  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const baseFormFields = [
  { name: "admissionNo", label: "Admission No.", type: "text", placeholder: "Enter admission number", required: true },
  { name: "type", label: "Certificate Type", type: "select", required: true },
  { name: "purpose", label: "Purpose", required: true },
  { name: "requestDate", label: "Request Date", type: "date", required: true },
  { name: "remarks", label: "Remarks" },
];

function CertificateStudentSearch({ students, value, loading, error, onQueryChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const query = String(value || "").trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return students.slice(0, 8);
    return students.filter((student) => [student.admissionNo, student.name, student.rollNo]
      .some((entry) => String(entry || "").toLowerCase().includes(query))).slice(0, 8);
  }, [query, students]);

  const choose = (student) => {
    onSelect(student);
    setOpen(false);
    setHighlighted(0);
  };

  return (
    <div className={`cms-field cert-admission-search ${error ? "has-error" : ""}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor="certificate-admissionNo">Admission No. <span className="req">*</span></label>
      <div className="cert-admission-search-control">
        <Search3DIcon size={16} />
        <input
          id="certificate-admissionNo"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="certificate-student-options"
          aria-activedescendant={open && matches[highlighted] ? `certificate-student-${matches[highlighted].id || highlighted}` : undefined}
          value={value}
          disabled={loading || !students.length}
          placeholder={loading ? "Loading admissions..." : (students.length ? "Search admission no., student, or roll no." : "No students available")}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setHighlighted((index) => Math.min(index + 1, Math.max(0, matches.length - 1)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlighted((index) => Math.max(0, index - 1));
            } else if (event.key === "Enter" && open && matches[highlighted]) {
              event.preventDefault();
              choose(matches[highlighted]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {open ? (
        <div id="certificate-student-options" className="cert-admission-options" role="listbox">
          {matches.length ? matches.map((student, index) => (
            <button
              id={`certificate-student-${student.admissionNo || student.id || index}-${index}`}
              type="button"
              role="option"
              aria-selected={index === highlighted}
              key={`student-opt-${student.admissionNo || student.id || index}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(student)}
            >
              <strong>{student.admissionNo}</strong>
              <span>{student.name || "Student"}{student.rollNo ? ` · Roll ${student.rollNo}` : ""}</span>
            </button>
          )) : <p>No matching students found.</p>}
        </div>
      ) : null}
      {error ? <span className="cms-error">{error}</span> : null}
    </div>
  );
}

function certStatusClass(value) {
  const status = String(value || "").toLowerCase();
  if (status === "issued") return "cert-status-success";
  if (status === "approved") return "cert-status-info";
  if (status === "reviewed") return "cert-status-warn";
  if (status === "generated") return "cert-status-pending";
  if (status === "cancelled") return "cert-status-danger";
  return "cert-status-neutral";
}

function canMoveTo(current, target) {
  const idxCurrent = workflowSteps.indexOf(current);
  const idxTarget = workflowSteps.indexOf(target);
  if (idxCurrent === -1 || idxTarget === -1) return false;
  return idxTarget === idxCurrent + 1;
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function withOptionalRemarks(payload, remarksValue) {
  const remarks = normalizeText(remarksValue);
  return { ...payload, remarks: remarks || "" };
}

const CERTIFICATE_ORIENTATION_STORAGE_KEY = "pjc-certificate-orientations";

const CERTIFICATE_TYPE_DEFINITIONS = Object.freeze({
  "Bonafide Certificate": Object.freeze({ template: "bonafide", orientation: "portrait", aliases: ["bonafide", "bonafide certificate"] }),
  "Study Certificate": Object.freeze({ template: "study", orientation: "portrait", aliases: ["study", "study certificate"] }),
  "Conduct Certificate": Object.freeze({ template: "conduct", orientation: "portrait", aliases: ["conduct", "conduct certificate"] }),
  "Transfer Certificate (TC)": Object.freeze({ template: "transfer", orientation: "landscape", aliases: ["tc", "transfer", "transfer certificate", "transfer certificate (tc)"] }),
  "Transfer Certificate": Object.freeze({ template: "transfer", orientation: "landscape", aliases: ["tc", "transfer", "transfer certificate", "transfer certificate (tc)"] }),
});

function findKnownCertificateType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Object.entries(CERTIFICATE_TYPE_DEFINITIONS).find(([, definition]) => (
    definition.aliases.includes(normalized)
  )) || null;
}

function getSavedCustomOrientation(type, explicitOrientation = "") {
  if (["portrait", "landscape"].includes(String(explicitOrientation).toLowerCase())) {
    return String(explicitOrientation).toLowerCase();
  }
  try {
    const saved = JSON.parse(localStorage.getItem(CERTIFICATE_ORIENTATION_STORAGE_KEY) || "{}");
    return saved[String(type || "").trim().toLowerCase()] === "landscape" ? "landscape" : "portrait";
  } catch {
    return "portrait";
  }
}

function resolveCertificateRequest(form) {
  const selectedType = String(form?.type || "").trim();
  if (!selectedType) return null;
  if (selectedType === "Others") {
    const customType = normalizeText(form?.customType);
    if (!customType) return null;
    return {
      type: customType,
      template: "custom",
      orientation: getSavedCustomOrientation(customType, form?.orientation),
    };
  }

  const presentation = resolveCertificatePresentation(selectedType, form?.orientation);
  if (presentation) return presentation;

  const known = findKnownCertificateType(selectedType);
  if (known) {
    const [type, definition] = known;
    return { type, ...definition };
  }

  return {
    type: selectedType,
    template: "custom",
    orientation: getSavedCustomOrientation(selectedType, form?.orientation),
  };
}

function resolveCertificatePresentation(type, explicitOrientation = "") {
  const rawType = String(type || "").trim();
  if (!rawType || rawType === "-") return null;

  let storedOrientation = "";
  try {
    const stored = getStoredCertificateTemplates();
    const found = Array.isArray(stored) ? stored.find((t) => {
      const tName = String(t.title || t.name || "").trim().toLowerCase();
      const tCode = String(t.templateCode || t.id || "").trim().toLowerCase();
      const target = rawType.toLowerCase();
      return tName === target || tCode === target || (tName && target.includes(tName)) || (tName && tName.includes(target));
    }) : null;
    if (found?.orientation) storedOrientation = found.orientation.toLowerCase();
  } catch {}

  const known = findKnownCertificateType(rawType);
  if (known) {
    const [canonicalType, definition] = known;
    return {
      type: canonicalType,
      ...definition,
      orientation: storedOrientation || (explicitOrientation ? String(explicitOrientation).toLowerCase() : definition.orientation),
    };
  }

  return {
    type: rawType,
    template: "custom",
    orientation: storedOrientation || getSavedCustomOrientation(rawType, explicitOrientation),
  };
}

function certificateTypesMatch(requestedType, returnedType) {
  const requested = resolveCertificatePresentation(requestedType);
  const returned = resolveCertificatePresentation(returnedType);
  if (!requested || !returned) return false;
  return requested.type.toLowerCase() === returned.type.toLowerCase();
}

function getCertificateOrientation(certificateType, explicitOrientation = "") {
  const pres = resolveCertificatePresentation(certificateType, explicitOrientation);
  return pres?.orientation || "landscape";
}

function rememberCertificateOrientation(certificateType, orientation) {
  try {
    const saved = JSON.parse(localStorage.getItem(CERTIFICATE_ORIENTATION_STORAGE_KEY) || "{}");
    saved[String(certificateType || "").trim().toLowerCase()] = orientation === "landscape" ? "landscape" : "portrait";
    localStorage.setItem(CERTIFICATE_ORIENTATION_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Orientation still works for the current form when browser storage is unavailable.
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSignatureHtml(signature) {
  const value = resolveSignatureSource(signature);
  if (!value) return "";

  const isImage = /^(data:image\/|https?:\/\/|blob:)/i.test(value);
  return isImage
    ? `<img class="certificate-signature" src="${escapeHtml(value)}" alt="Authorized signature" onerror="this.style.display='none';" />`
    : "";
}

export function formatTemplateTitle(title, code = "") {
  let clean = String(title || "").trim();
  if (!clean || clean.startsWith("TMP_") || clean.startsWith("UPLOAD_") || clean.startsWith("custom-") || clean.startsWith("cert-")) {
    clean = String(code || "").trim();
  }
  
  if (clean.toUpperCase() === "BC" || clean.toLowerCase() === "bonafide" || clean.toLowerCase() === "bonafide certificate") return "Bonafide Certificate";
  if (clean.toUpperCase() === "SC" || clean.toLowerCase() === "study" || clean.toLowerCase() === "study certificate") return "Study Certificate";
  if (clean.toUpperCase() === "CC" || clean.toLowerCase() === "conduct" || clean.toLowerCase() === "conduct certificate") return "Conduct Certificate";
  if (clean.toUpperCase() === "TC" || clean.toLowerCase() === "transfer" || clean.toLowerCase() === "transfer certificate") return "Transfer Certificate";
  if (clean.toUpperCase() === "OC" || clean.toLowerCase() === "other" || clean.toLowerCase() === "others") return "Other Certificate";

  if (!clean || clean.startsWith("TMP_") || clean.startsWith("UPLOAD_") || clean.startsWith("custom-") || clean.startsWith("cert-")) {
    return "Custom Certificate";
  }

  clean = clean.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (/^[a-z]/.test(clean)) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

export const FALLBACK_PLACEHOLDERS = {
  student_name: "Student Name",
  student_id: "518",
  admission_no: "ADM-2026-0000",
  roll_no: "101",
  father_name: "Parent Name",
  mother_name: "Anita Devi",
  group_name: "MPC",
  academic_level: "I / II Year",
  academic_year: "2026-2027",
  board_name: "Board of Intermediate Education, Andhra Pradesh (BIEAP)",
  course_name: "Intermediate (MPC)",
  certificate_number: "BC/2026/001",
  issue_date: "11 Sep 2026",
  place: "Vijayawada",
  purpose: "Higher Education / Official Purpose",
  principal_name: "Dr. S. K. Rao",
  study_from: "June 2025",
  study_to: "May 2027",
  conduct_rating: "Good",
  amount_paid: "45,000",
  amount_in_words: "Forty Five Thousand Only",
  medium: "English",
  dob: "14 August 2008",
  date_of_admission: "10 June 2025",
  reason_for_leaving: "Completed Course",
  dues_cleared: "YES",
  tuition_dues: "CLEARED",
  lib_dues: "CLEARED",
  hostel_dues: "NO DUES",
  transport_dues: "NO DUES",
  overall_dues_status: "CLEARED",
  fee_type: "Tuition & Examination Fees",
  payment_date: "01 Sep 2026",
  receipt_number: "REC-2026-992",
  custom_body: "has demonstrated commendable academic performance and exemplary conduct",
};

export function extractCleanCertificateBody(rawContent) {
  if (!rawContent) return "";
  let str = String(rawContent).trim();

  // If contains HTML markup
  if (/<[a-z][\s\S]*>/i.test(str)) {
    if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(str, "text/html");
        
        // Remove unwanted headers, badges, footers, scripts, styles
        const elementsToRemove = doc.querySelectorAll(
          "h1, h2, h3, h4, header, footer, style, script"
        );
        elementsToRemove.forEach((el) => el.remove());

        // Find certifying paragraph
        const allElements = Array.from(doc.body.querySelectorAll("p, div, span"));
        const certifyElement = allElements.find((el) => {
          const txt = el.textContent || "";
          return /This is to certify|The student|has studied in this college|has been a student|bonafide student|certified that/i.test(txt);
        });

        if (certifyElement) {
          const clone = certifyElement.cloneNode(true);
          clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
          str = clone.textContent || "";
        } else {
          doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
          str = doc.body.textContent || "";
        }
      } catch {
        str = str.replace(/<style[\s\S]*?<\/style>/gi, "");
        str = str.replace(/<script[\s\S]*?<\/script>/gi, "");
        str = str.replace(/<h[1-6][\s\S]*?<\/h[1-6]>/gi, "");
        str = str.replace(/<br\s*[\/]?>/gi, "\n");
        str = str.replace(/<\/p>|<\/div>/gi, "\n");
        str = str.replace(/<[^>]+>/g, " ");
      }
    } else {
      str = str.replace(/<style[\s\S]*?<\/style>/gi, "");
      str = str.replace(/<script[\s\S]*?<\/script>/gi, "");
      str = str.replace(/<h[1-6][\s\S]*?<\/h[1-6]>/gi, "");
      str = str.replace(/<br\s*[\/]?>/gi, "\n");
      str = str.replace(/<\/p>|<\/div>/gi, "\n");
      str = str.replace(/<[^>]+>/g, " ");
    }
  }

  // Clean lines, eliminate header/footer artifacts
  str = str
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();
      if (
        lower.startsWith("college name") ||
        lower.startsWith("college address") ||
        lower.includes("recognized by board") ||
        lower.includes("office seal") ||
        lower.includes("college seal") ||
        lower.includes("principal / head") ||
        lower.includes("certificate no:") ||
        lower.includes("issued by")
      ) {
        return false;
      }
      return true;
    })
    .join("\n\n");

  return str.trim();
}

export function renderTemplateWithRecord(text, record = {}) {
  if (!text) return "";
  const cleanText = extractCleanCertificateBody(text) || text;

  let father = record.fatherName || record.father_name || record.father || record.parentName;
  if (!father || father === "Suresh Kumar") {
    const studentName = record.student || record.studentName || record.name || "";
    father = deriveFatherNameFromStudent(studentName);
  }

  let sId = record.studentId || record.student_id;
  if (!sId || String(sId).startsWith("cert-") || String(sId).startsWith("mock-")) {
    sId = record.rollNo && record.rollNo !== "-" ? record.rollNo : (record.admissionNo ? record.admissionNo.replace(/\D/g, "") : "518");
  }

  const merged = {
    ...FALLBACK_PLACEHOLDERS,
    student_name: record.student || record.studentName || record.name || "Student Name",
    father_name: father || "Parent Name",
    mother_name: record.motherName || record.mother_name || "Anita Devi",
    student_id: String(sId || "518"),
    admission_no: record.admissionNo || record.admission_no || "ADM-2026-0000",
    roll_no: record.rollNo && record.rollNo !== "-" ? record.rollNo : (record.admissionNo ? record.admissionNo.replace(/\D/g, "") : "101"),
    group_name: record.group || record.groupName || record.group_name || "MPC",
    academic_level: record.level || record.academicLevel || record.academic_level || "I / II Year",
    academic_year: record.academicYear || record.academic_year || "2026-2027",
    board_name: record.board || record.boardName || record.board_name || "Board of Intermediate Education, Andhra Pradesh (BIEAP)",
    course_name: record.courseName || record.course_name || "Intermediate (MPC)",
    certificate_number: record.number || record.certificateNo || record.certificateNumber || "BC/2026/001",
    issue_date: formatDateDdMmYyyy(record.issue || record.issueDate || todayIso()),
    place: record.place || "Vijayawada",
    purpose: record.purpose || "Higher Education / Official Purpose",
    principal_name: record.principalName || "Dr. S. K. Rao",
    study_from: record.studyFrom || "June 2025",
    study_to: record.studyTo || "May 2027",
    conduct_rating: record.conductRating || "Good",
    amount_paid: record.amountPaid || "45,000",
    amount_in_words: record.amountInWords || "Forty Five Thousand Only",
    medium: record.medium || "English",
    dob: record.dob || "14 August 2008",
    date_of_admission: record.dateOfAdmission || "10 June 2025",
    reason_for_leaving: record.reasonForLeaving || "Completed Course",
    dues_cleared: record.duesCleared || "YES",
    tuition_dues: record.tuitionDues || "CLEARED",
    lib_dues: record.libDues || "CLEARED",
    hostel_dues: record.hostelDues || "NO DUES",
    transport_dues: record.transportDues || "NO DUES",
    overall_dues_status: record.overallDuesStatus || "CLEARED",
    fee_type: record.feeType || "Tuition & Examination Fees",
    payment_date: record.paymentDate || "01 Sep 2026",
    receipt_number: record.receiptNumber || "REC-2026-992",
    custom_body: record.customBody || record.purpose || "has demonstrated commendable academic performance and exemplary conduct",
  };

  let interpolated = cleanText.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    if (merged[key] !== undefined && merged[key] !== null && String(merged[key]).trim() !== "") {
      return String(merged[key]);
    }
    if (FALLBACK_PLACEHOLDERS[key] !== undefined) {
      return FALLBACK_PLACEHOLDERS[key];
    }
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  });

  // Also sanitize single-bracket placeholders if any
  interpolated = interpolated.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (merged[key] !== undefined && merged[key] !== null && String(merged[key]).trim() !== "") {
      return String(merged[key]);
    }
    if (FALLBACK_PLACEHOLDERS[key] !== undefined) {
      return FALLBACK_PLACEHOLDERS[key];
    }
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  });

  return interpolated;
}

function getCertificateTemplate(type, record) {
  const presentation = resolveCertificatePresentation(type, record?.orientation);
  const rawType = presentation?.type || type || "";

  // Load active customized templates from storage and window cache
  let templatesList = DEFAULT_CERTIFICATE_TEMPLATES;
  try {
    const raw = getStoredCertificateTemplates();
    if (Array.isArray(raw) && raw.length > 0) templatesList = raw;
  } catch {}

  if (typeof window !== "undefined" && Array.isArray(window.__activeCertificateTemplates) && window.__activeCertificateTemplates.length) {
    const combined = [...templatesList];
    window.__activeCertificateTemplates.forEach((at) => {
      const atCode = at.templateCode || at.id;
      const atTitle = at.title || at.name;
      if (!combined.some((c) => (atCode && (c.templateCode === atCode || c.id === atCode)) || (atTitle && (c.title === atTitle || c.name === atTitle)))) {
        combined.push(at);
      }
    });
    templatesList = combined;
  }

  // Find matching template by name, title, code, or type
  const target = String(rawType).trim().toLowerCase();
  const matchedTemplate = templatesList.find((t) => {
    const tName = String(t.title || t.name || "").trim().toLowerCase();
    const tCode = String(t.templateCode || t.id || "").trim().toLowerCase();
    return tName === target || tCode === target || (tName && target.includes(tName)) || (tName && tName.includes(target));
  });

  const headingTitle = formatTemplateTitle(matchedTemplate?.title || matchedTemplate?.name || rawType, matchedTemplate?.templateCode || rawType);

  if (matchedTemplate) {
    const rawBody = matchedTemplate.contentBody || matchedTemplate.content || matchedTemplate.body || "";
    if (rawBody) {
      const interpolatedContent = renderTemplateWithRecord(rawBody, record);
      const rawPurpose = matchedTemplate.purpose || "";
      const interpolatedPurpose = rawPurpose
        ? renderTemplateWithRecord(rawPurpose, record)
        : (record.purpose || "Official Use");

      return {
        heading: headingTitle,
        paragraphOne: interpolatedContent,
        paragraphTwo: interpolatedPurpose ? `This certificate is issued for the purpose of ${interpolatedPurpose}.` : "",
        isCustom: true,
        borderColor: matchedTemplate.borderColor || "#1e3a8a",
        badgeBgColor: matchedTemplate.badgeBgColor || matchedTemplate.borderColor || "#1e3a8a",
        badgeTextColor: matchedTemplate.badgeTextColor || "#ffffff",
        signatureType: matchedTemplate.signatureType || "Principal",
        seal: matchedTemplate.seal || "Principal Seal",
        qrEnabled: matchedTemplate.qrEnabled !== false,
        templateObj: matchedTemplate,
      };
    }
  }

  // Fallback defaults
  const safePurpose = record.purpose || "official purpose";
  const institutionName = "Pirnav College";
  const admissionNo = record.admissionNo || "-";
  const year = record.year || record.level || "-";
  const group = record.group || "-";
  const academicYear = record.academicYear || "-";
  const studyInfo = `with Admission No. ${admissionNo}, currently studying in ${year} (${group}) during the academic year ${academicYear}`;
  const studentRecord = `with Admission No. ${admissionNo}, in ${year} (${group}) during the academic year ${academicYear}`;

  switch (presentation?.template) {
    case "bonafide":
      return {
        heading: "Bonafide Certificate",
        paragraphOne: `This is to certify that Mr./Ms. ${record.student || 'Student'} (S/o / D/o ${record.fatherName || 'Parent Name'}) bearing Student ID ${record.studentId || '518'} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada. He/She is studying in ${group} Group, ${year} during the academic year ${academicYear}.`,
        paragraphTwo: `This certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "study":
      return {
        heading: "Study Certificate",
        paragraphOne: `This is to certify that Mr./Ms. ${record.student || 'Student'} (S/o / D/o ${record.fatherName || 'Parent Name'}) bearing Student ID ${record.studentId || '518'} has studied in this college during the period in ${group} Group and appeared for the Intermediate Public Examination conducted by Board of Intermediate Education, Andhra Pradesh (BIEAP).`,
        paragraphTwo: `This certificate is issued for the purpose of ${safePurpose}.`,
      };
    case "transfer":
      return {
        heading: "Transfer Certificate",
        paragraphOne: `The student ${record.student || 'Student'} ${studentRecord} has been relieved from ${institutionName} as per the institutional records and is eligible to continue studies at another recognized institution.`,
        paragraphTwo: `This transfer certificate is issued for the purpose of ${safePurpose} and serves as an official record of the student's withdrawal from the institution.`,
      };
    case "conduct":
      return {
        heading: "Conduct Certificate",
        paragraphOne: `This is to certify that Mr./Ms. ${record.student || 'Student'} (S/o / D/o ${record.fatherName || 'Parent Name'}) bearing Student ID ${record.studentId || '518'} has been a student of this college during the academic year(s) ${academicYear}. To the best of our knowledge and records, his/her conduct and character have been Good.`,
        paragraphTwo: `This certificate is issued for the purpose of ${safePurpose}.`,
      };
    default:
      return {
        heading: headingTitle || "Certificate",
        paragraphOne: `This is to certify that Mr./Ms. ${record.student || 'Student'} ${studentRecord}. The student's academic details have been verified against the official records of ${institutionName}.`,
        paragraphTwo: `This certificate is issued for the purpose of ${safePurpose}.`,
      };
  }
}

const CERTIFICATE_PRINT_CSS = `
  @page { size: A4 landscape; margin: 0; }
  body {
    margin: 0;
    font-family: Georgia, "Times New Roman", serif;
    background: #f8fafc;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    min-height: 210mm;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: 8mm;
  }
  .visual-certificate-canvas {
    width: 100%;
    max-width: 980px;
    min-height: 560px;
    box-sizing: border-box;
    background-color: #ffffff;
    padding: 24px;
    position: relative;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  }
  .visual-certificate-canvas.portrait {
    max-width: 720px;
    min-height: 840px;
  }
  .cert-inner-border {
    border: 4px double #1e3a8a;
    min-height: 500px;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }
  .cert-header {
    text-align: center;
  }
  .cert-header-grid {
    display: grid;
    grid-template-columns: 50px 1fr 160px;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
  }
  .cert-header-left {
    display: flex;
    justify-content: center;
  }
  .cert-default-logo {
    width: 42px;
    height: 42px;
    background: #1e3a8a;
    color: #ffffff;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 20px;
  }
  .cert-header-center {
    text-align: center;
  }
  .cert-institution-name {
    margin: 0;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 1px;
    color: #1e3a8a;
    text-transform: uppercase;
  }
  .cert-tagline {
    margin: 2px 0 0 0;
    font-size: 12px;
    font-weight: 700;
    color: #b45309;
  }
  .cert-address {
    margin: 2px 0 0 0;
    font-size: 11px;
    color: #64748b;
  }
  .cert-header-right {
    text-align: right;
    font-size: 9.5px;
    color: #64748b;
    display: flex;
    flex-direction: column;
    line-height: 1.35;
  }
  .cert-header-right strong {
    color: #1e293b;
    font-size: 10px;
  }
  .cert-ref-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
    color: #475569;
    padding-top: 8px;
    border-bottom: 1px dashed #cbd5e1;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .cert-title-badge {
    text-align: center;
    margin: 14px 0;
  }
  .cert-title-badge h2 {
    margin: 0;
    display: inline-block;
    background: #1e3a8a;
    color: #ffffff;
    padding: 6px 22px;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 1px;
    border-radius: 4px;
  }
  .cert-body-area {
    text-align: center;
    line-height: 1.8;
    margin: 16px 0;
  }
  .cert-content-text {
    font-size: 15px;
    margin: 0 0 10px 0;
    color: #1e293b;
    white-space: pre-line;
  }
  .cert-purpose-text {
    font-size: 13px;
    margin: 0;
    color: #334155;
  }
  .cert-footer-area {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-top: 20px;
  }
  .cert-footer-col {
    flex: 1;
    font-size: 12px;
    color: #334155;
  }
  .cert-footer-col p { margin: 2px 0; }
  .cert-footer-col.center { text-align: center; }
  .cert-footer-col.right { text-align: right; }
  .cert-seal-stamp {
    display: inline-block;
    border: 2px dashed #1e3a8a;
    color: #1e3a8a;
    border-radius: 50%;
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    margin: 0 auto;
    text-align: center;
  }
  .cert-qr-placeholder {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    margin-top: 8px;
  }
  .qr-box {
    width: 44px;
    height: 44px;
    background: #1e293b;
    color: #ffffff;
    font-size: 8px;
    display: grid;
    place-items: center;
    font-weight: bold;
    border-radius: 4px;
  }
  .cert-sig-line {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .sig-handwritten {
    font-family: 'Dancing Script', 'Brush Script MT', cursive;
    font-size: 18px;
    color: #1e40af;
    margin-bottom: 2px;
  }
  .sig-title {
    font-size: 12px;
    color: #1e293b;
    font-weight: 700;
  }
  .certificate-signature {
    display: block;
    width: 160px;
    height: auto;
    max-height: 60px;
    object-fit: contain;
    margin: 0 0 4px auto;
  }
  @media print {
    body { background: #fff; }
    .page { padding: 0; min-height: 194mm; }
    .visual-certificate-canvas {
      max-width: none;
      min-height: 194mm;
      box-shadow: none;
      padding: 12mm 16mm;
      break-inside: avoid;
    }
  }
`;

function buildPrintHtml(record) {
  const certificateNo = escapeHtml(record.number);
  const student = escapeHtml(record.student);
  const template = getCertificateTemplate(record.type, record);
  if (!template) throw new Error("Unsupported certificate type.");
  const templateHeading = escapeHtml(template.heading);
  const templateParaOne = escapeHtml(template.paragraphOne);
  const templateParaTwo = escapeHtml(template.paragraphTwo);
  const issueDate = escapeHtml(formatDateDdMmYyyy(record.issue));
  const place = escapeHtml(record.place || "Vijayawada");
  const remarks = record.remarks ? `<p className="cert-remarks" style="margin-top:10px;font-size:13px;"><strong>Remarks:</strong> ${escapeHtml(record.remarks)}</p>` : "";
  const orientation = getCertificateOrientation(record.type, record.orientation);
  if (!orientation) throw new Error("Unsupported certificate type.");

  const borderColor = template.borderColor || "#1e3a8a";
  const badgeBgColor = template.badgeBgColor || borderColor;
  const badgeTextColor = template.badgeTextColor || "#ffffff";
  const signatureType = escapeHtml(template.signatureType || "Principal");
  const signatureHtml = renderSignatureHtml(record.signature) || `<span class="sig-handwritten style-cursive-hand">${signatureType} Signature</span>`;

  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>Certificate ${certificateNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap" rel="stylesheet">
<style>${CERTIFICATE_PRINT_CSS}\n@page { size: A4 ${orientation}; margin: 8mm; }</style>
</head>
<body class="certificate-${orientation}">
  <div class="page">
    <div class="visual-certificate-canvas ${orientation}">
      <div class="cert-inner-border" style="border-color: ${borderColor}; border-style: double; border-width: 4px;">
        <header class="cert-header">
          <div class="cert-header-grid">
            <div class="cert-header-left">
              <div class="cert-default-logo" style="background-color: ${borderColor}">P</div>
            </div>
            <div class="cert-header-center">
              <h1 class="cert-institution-name" style="color: ${borderColor}">PIRNAV COLLEGE</h1>
              <p class="cert-tagline" style="color: ${borderColor}">(Intermediate / Junior College)</p>
              <p class="cert-address">D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh</p>
            </div>
            <div class="cert-header-right">
              <small>Affiliated to</small>
              <strong>Board of Intermediate Education</strong>
              <small>Andhra Pradesh (BIEAP)</small>
              <small>College Code: 12345</small>
            </div>
          </div>

          <div class="cert-ref-row">
            <span>Ref No: <strong>${certificateNo}</strong></span>
            <span>Date: <strong>${issueDate}</strong></span>
          </div>
        </header>

        <div class="cert-title-badge">
          <h2 style="background-color: ${badgeBgColor}; color: ${badgeTextColor};">
            ${templateHeading.toUpperCase()}
          </h2>
        </div>

        <div class="cert-body-area">
          <p class="cert-content-text">${templateParaOne}</p>
          ${templateParaTwo ? `<p class="cert-purpose-text">${templateParaTwo}</p>` : ''}
          ${remarks}
        </div>

        <footer class="cert-footer-area">
          <div class="cert-footer-col left">
            <p>Place: <strong>${place}</strong></p>
            <p>Date: <strong>${issueDate}</strong></p>
            ${template.qrEnabled !== false ? `
              <div class="cert-qr-placeholder">
                <div class="qr-box">QR</div>
                <span>Scan to verify</span>
              </div>
            ` : ''}
          </div>

          <div class="cert-footer-col center">
            <div class="cert-seal-stamp" style="border-color: ${borderColor}; color: ${borderColor};">
              <span>PIRNAV COLLEGE<br/>VIJAYAWADA</span>
            </div>
          </div>

          <div class="cert-footer-col right">
            <div class="cert-sig-line">
              ${signatureHtml}
              <strong class="sig-title">${signatureType}</strong>
              <small>Pirnav College</small>
            </div>
          </div>
        </footer>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function CertificatesPage() {
  const { confirm, confirmationDialog } = useConfirmDialog();
  const { selectedBoard, selectedAcademicYear } = useAcademicContext();
  const navbarBoardName = selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || "";
  const navbarYearName = selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "";

  const [rows, setRows] = useState([]);
  const [studentRows, setStudentRows] = useState([]);
  const [bulkStudentRows, setBulkStudentRows] = useState([]);
  const [activeTemplates, setActiveTemplates] = useState([]);
  const [workflowStats, setWorkflowStats] = useState({ totalCount: 0, generatedCount: 0, reviewedCount: 0, approvedCount: 0, issuedCount: 0, cancelledCount: 0 });
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingBulkStudents, setLoadingBulkStudents] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyAction, setBusyAction] = useState({ id: null, type: "" });
  const [bulkAction, setBulkAction] = useState("");
  const [printingId, setPrintingId] = useState(null);
  const [generationMode, setGenerationMode] = useState("single");
  const [bulkStudentSearch, setBulkStudentSearch] = useState("");
  const [selectedBulkStudents, setSelectedBulkStudents] = useState([]);
  const [bulkStudentFilters, setBulkStudentFilters] = useState(() => ({
    academicYear: navbarYearName || "",
    board: navbarBoardName || "",
    group: "",
    section: "",
  }));

  const [form, setForm] = useState({
    admissionNo: "",
    student: "",
    group: "",
    level: "",
    academicYear: "",
    rollNo: "",
    section: "",
    type: "",
    customType: "",
    orientation: "portrait",
    purpose: "",
    requestDate: todayIso(),
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showRecordFilters, setShowRecordFilters] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  const [page, setPage] = useState(1);
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState("All");
  const [workflowQuery, setWorkflowQuery] = useState("");
  const [actionPage, setActionPage] = useState(1);
  const [printPreview, setPrintPreview] = useState(null);
  const [toast, setToast] = useState("");
  const admissionLookupRef = useRef(0);
  const listRequestRef = useRef(0);
  const studentRequestRef = useRef(0);
  const bulkStudentRequestRef = useRef(0);
  const detailsRequestRef = useRef(0);
  const filtersReadyRef = useRef(false);

  const availableCertificateTypes = useMemo(() => {
    const excludedTypes = new Set([
      "study and conduct certificate",
      "study & conduct certificate",
      "transfer certificate",
      "staff management bulk upload template",
      "student admissions bulk upload template",
      "student id card template",
      "bulk upload template",
      "id card template",
    ]);
    const list = [...CERTIFICATE_TYPES];
    const combined = [...activeTemplates];
    try {
      const stored = getStoredCertificateTemplates();
      if (Array.isArray(stored)) {
        stored.forEach((st) => {
          const stTitle = st.title || st.name;
          const stCode = st.templateCode || st.id;
          if (!combined.some((c) => (stTitle && (c.title === stTitle || c.name === stTitle)) || (stCode && (c.templateCode === stCode || c.id === stCode)))) {
            combined.push(st);
          }
        });
      }
    } catch {}

    if (combined.length) {
      combined.forEach((tpl) => {
        const title = formatTemplateTitle(tpl.title || tpl.name, tpl.templateCode || tpl.id);
        const cat = String(tpl.category || "").toLowerCase();
        const tLower = String(title || "").toLowerCase();
        if (
          title &&
          !list.includes(title) &&
          title !== "Others" &&
          !cat.includes("upload") &&
          !cat.includes("bulk") &&
          !cat.includes("document") &&
          !tLower.includes("bulk upload") &&
          !tLower.includes("id card")
        ) {
          list.splice(list.length - 1, 0, title);
        }
      });
    }
    return list.filter((item) => {
      const lower = String(item || "").trim().toLowerCase();
      return !excludedTypes.has(lower) && !lower.includes("bulk upload") && !lower.includes("id card");
    });
  }, [activeTemplates]);

  const formFields = useMemo(
    () => baseFormFields.map((field) => {
      if (field.name === "admissionNo") return { ...field, disabled: loadingStudents };
      if (field.name === "type") return { ...field, options: availableCertificateTypes };
      return field;
    }),
    [loadingStudents, availableCertificateTypes],
  );

  const isRowBusy = (rowId, action = "") => {
    if (!busyAction.id) return false;
    if (busyAction.id !== rowId) return false;
    return action ? busyAction.type === action : true;
  };

  const verifyPersistedCertificateType = async (certificateId, expectedType) => {
    const response = await apiClient.get(CERTIFICATE_API.getById(certificateId), { skipGlobalLoader: true });
    const record = unwrapSinglePayload(response.data);
    if (!hasCertificateShape(record)) throw new Error("The updated certificate record could not be verified.");
    const normalized = normalizeCertificate(record);
    if (!certificateTypesMatch(expectedType, normalized.type)) {
      throw new Error("The certificate type changed unexpectedly during processing.");
    }
    return normalized;
  };

  const hasServerCertificateId = (row) => {
    const value = row?.backendId;
    return value !== undefined && value !== null && String(value).trim() !== "";
  };

  const resolveServerCertificateId = async (row) => {
    if (!row) return null;
    if (hasServerCertificateId(row)) {
      return String(row.backendId);
    }

    return null;
  };

  const loadCertificates = async ({ showLoader = true } = {}) => {
    const requestId = ++listRequestRef.current;
    if (showLoader) setLoadingList(true);
    try {
      const params = {};
      if (query.trim()) params.search = query.trim();
      if (status !== "All") params.status = status;
      if (typeFilter !== "All") params.certificateType = typeFilter;
      const response = await apiClient.get(CERTIFICATE_API.list, { params, skipGlobalLoader: true });
      const mapped = unwrapListPayload(response?.data).map(normalizeCertificate);
      if (requestId !== listRequestRef.current) return false;
      setRows(mapped);
      return true;
    } catch (error) {
      if (requestId !== listRequestRef.current) return false;
      let fallbackList = [];
      try {
        const cached = localStorage.getItem("cms_certificates");
        if (cached) {
          fallbackList = JSON.parse(cached);
        }
      } catch {}
      if (!fallbackList.length) {
        fallbackList = mockCertificates.map(normalizeCertificate);
      }
      let filtered = fallbackList;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        filtered = filtered.filter((r) =>
          [r.student, r.admissionNo, r.number, r.type, r.purpose].some((v) =>
            String(v || "").toLowerCase().includes(q)
          )
        );
      }
      if (status !== "All") {
        filtered = filtered.filter((r) => r.status === status);
      }
      if (typeFilter !== "All") {
        filtered = filtered.filter((r) => r.type === typeFilter);
      }
      setRows(filtered);
      return false;
    } finally {
      if (showLoader && requestId === listRequestRef.current) setLoadingList(false);
    }
  };

  const loadWorkflowStats = async (rowsForStats = null) => {
    setLoadingStats(true);
    try {
      const response = await apiClient.get(CERTIFICATE_API.workflowStats, { skipGlobalLoader: true });
      const data = unwrapSinglePayload(response?.data) || {};
      setWorkflowStats({
        totalCount: Number(pick(data, ["totalCount", "TotalCount"])) || 0,
        generatedCount: Number(pick(data, ["generatedCount", "GeneratedCount"])) || 0,
        reviewedCount: Number(pick(data, ["reviewedCount", "ReviewedCount"])) || 0,
        approvedCount: Number(pick(data, ["approvedCount", "ApprovedCount"])) || 0,
        issuedCount: Number(pick(data, ["issuedCount", "IssuedCount"])) || 0,
        cancelledCount: Number(pick(data, ["cancelledCount", "CancelledCount"])) || 0,
      });
    } catch (error) {
      let list = rowsForStats;
      if (!list || !list.length) {
        try {
          const cached = localStorage.getItem("cms_certificates");
          list = cached ? JSON.parse(cached) : mockCertificates.map(normalizeCertificate);
        } catch {
          list = mockCertificates.map(normalizeCertificate);
        }
      }
      setWorkflowStats({
        totalCount: list.length,
        generatedCount: list.filter((r) => r.status === "Generated").length,
        reviewedCount: list.filter((r) => r.status === "Reviewed").length,
        approvedCount: list.filter((r) => r.status === "Approved").length,
        issuedCount: list.filter((r) => r.status === "Issued").length,
        cancelledCount: list.filter((r) => r.status === "Cancelled").length,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const loadActiveTemplates = async () => {
    try {
      const response = await apiClient.get(CERTIFICATE_API.activeTemplates, { skipGlobalLoader: true });
      const list = unwrapListPayload(response?.data);
      const serverList = Array.isArray(list) ? list : [];

      let storedList = [];
      try {
        const stored = getStoredCertificateTemplates();
        if (Array.isArray(stored)) storedList = stored;
      } catch {}

      const merged = [...serverList];
      storedList.forEach((st) => {
        const stCode = st.templateCode || st.id;
        const stTitle = st.title || st.name;
        const exists = merged.some((m) => {
          const mCode = m.templateCode || m.id;
          const mTitle = m.title || m.name;
          return (stCode && mCode && String(stCode).toLowerCase() === String(mCode).toLowerCase()) ||
                 (stTitle && mTitle && String(stTitle).toLowerCase() === String(mTitle).toLowerCase());
        });
        if (!exists) {
          merged.push(st);
        }
      });

      if (merged.length) {
        setActiveTemplates(merged);
        if (typeof window !== "undefined") {
          window.__activeCertificateTemplates = merged;
        }
      }
    } catch {
      try {
        const stored = getStoredCertificateTemplates();
        if (Array.isArray(stored) && stored.length) {
          setActiveTemplates(stored);
          if (typeof window !== "undefined") {
            window.__activeCertificateTemplates = stored;
          }
        }
      } catch {}
    }
  };

  const refreshCertificateData = async ({ showLoader = false } = {}) => {
    await Promise.allSettled([loadCertificates({ showLoader }), loadWorkflowStats()]);
  };

  const loadStudents = async () => {
    const requestId = ++studentRequestRef.current;
    setLoadingStudents(true);
    try {
      let raw = null;
      try {
        const response = await apiClient.get(CERTIFICATE_API.studentsDropdown, { skipGlobalLoader: true });
        raw = response?.data;
      } catch {
        try {
          const sRes = await apiClient.get("/api/v1/students", { skipGlobalLoader: true });
          raw = sRes?.data;
        } catch {
          try {
            const aRes = await apiClient.get("/api/v1/student-admissions", { skipGlobalLoader: true });
            raw = aRes?.data;
          } catch {
            raw = mockStudents;
          }
        }
      }
      const rawList = unwrapStudentPayload(raw).map(normalizeStudentRecord).filter((student) => student.admissionNo);
      const seenAdmissions = new Set();
      const mapped = rawList.filter((s) => {
        const key = String(s.admissionNo).trim().toLowerCase();
        if (!key || seenAdmissions.has(key)) return false;
        seenAdmissions.add(key);
        return true;
      });
      if (requestId !== studentRequestRef.current) return [];
      const finalStudents = mapped.length ? mapped : mockStudents.map(normalizeStudentRecord);
      setStudentRows(finalStudents);
      return finalStudents;
    } catch (error) {
      if (requestId !== studentRequestRef.current) return [];
      const fallbackStudents = mockStudents.map(normalizeStudentRecord);
      setStudentRows(fallbackStudents);
      return fallbackStudents;
    } finally {
      if (requestId === studentRequestRef.current) setLoadingStudents(false);
    }
  };

  const loadBulkEligibleStudents = async () => {
    const requestId = ++bulkStudentRequestRef.current;
    setLoadingBulkStudents(true);
    try {
      let raw = null;
      try {
        const params = {};
        if (bulkStudentSearch.trim()) params.search = bulkStudentSearch.trim();
        const response = await apiClient.get(CERTIFICATE_API.bulkEligibleStudents, { params, skipGlobalLoader: true });
        raw = response?.data;
      } catch {
        try {
          const sRes = await apiClient.get(CERTIFICATE_API.studentsDropdown, { skipGlobalLoader: true });
          raw = sRes?.data;
        } catch {
          raw = studentRows.length ? studentRows : mockStudents;
        }
      }
      const rawBulkList = unwrapStudentPayload(raw).map(normalizeStudentRecord).filter((student) => student.admissionNo);
      const seenBulk = new Set();
      const mapped = rawBulkList.filter((s) => {
        const key = String(s.admissionNo).trim().toLowerCase();
        if (!key || seenBulk.has(key)) return false;
        seenBulk.add(key);
        return true;
      });
      if (requestId === bulkStudentRequestRef.current) {
        setBulkStudentRows(mapped.length ? mapped : (studentRows.length ? studentRows : mockStudents.map(normalizeStudentRecord)));
      }
    } catch (error) {
      if (requestId === bulkStudentRequestRef.current) {
        setBulkStudentRows(studentRows.length ? studentRows : mockStudents.map(normalizeStudentRecord));
      }
    } finally {
      if (requestId === bulkStudentRequestRef.current) setLoadingBulkStudents(false);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.allSettled([loadActiveTemplates(), loadStudents()]);
      await Promise.allSettled([loadCertificates(), loadWorkflowStats()]);
      filtersReadyRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!filtersReadyRef.current) return undefined;
    const timer = window.setTimeout(() => {
      loadCertificates();
    }, 300);
    return () => window.clearTimeout(timer);
    // The selected server filters intentionally drive this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, typeFilter]);

  useEffect(() => {
    if (generationMode !== "bulk") return undefined;
    const timer = window.setTimeout(loadBulkEligibleStudents, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationMode]);

  const findStudentByAdmission = (admissionNo) =>
    studentRows.find((student) => String(student.admissionNo).trim().toLowerCase() === String(admissionNo).trim().toLowerCase()) || null;

  const bulkStudentFilterOptions = useMemo(() => {
    const uniqueValues = (key) => Array.from(new Set(bulkStudentRows
      .map((student) => String(student[key] || "").trim())
      .filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));

    const years = uniqueValues("academicYear");
    if (navbarYearName && !years.some((y) => y.toLowerCase() === navbarYearName.toLowerCase())) {
      years.unshift(navbarYearName);
    }

    const boards = uniqueValues("board");
    if (navbarBoardName && !boards.some((b) => b.toLowerCase() === navbarBoardName.toLowerCase())) {
      boards.unshift(navbarBoardName);
    }

    return {
      academicYears: years,
      boards: boards,
      groups: uniqueValues("group"),
      sections: uniqueValues("section"),
    };
  }, [bulkStudentRows, navbarYearName, navbarBoardName]);

  useEffect(() => {
    if (!navbarBoardName && !navbarYearName) return;
    setBulkStudentFilters((prev) => {
      let nextBoard = prev.board;
      let nextYear = prev.academicYear;

      if (navbarBoardName) {
        const matchedBoard = bulkStudentFilterOptions.boards.find(
          (b) => String(b).trim().toLowerCase() === String(navbarBoardName).trim().toLowerCase()
        ) || navbarBoardName;
        nextBoard = matchedBoard;
      }

      if (navbarYearName) {
        const matchedYear = bulkStudentFilterOptions.academicYears.find(
          (y) => String(y).trim().toLowerCase() === String(navbarYearName).trim().toLowerCase()
        ) || navbarYearName;
        nextYear = matchedYear;
      }

      if (nextBoard === prev.board && nextYear === prev.academicYear) return prev;
      return { ...prev, board: nextBoard, academicYear: nextYear };
    });
  }, [navbarBoardName, navbarYearName, bulkStudentFilterOptions.boards, bulkStudentFilterOptions.academicYears]);

  const visibleBulkStudents = useMemo(() => {
    const normalized = (value) => String(value || "").trim().toLocaleLowerCase();
    const search = normalized(bulkStudentSearch);
    return bulkStudentRows.filter((student) => (
      (!bulkStudentFilters.academicYear || !student.academicYear || normalized(student.academicYear) === normalized(bulkStudentFilters.academicYear))
      && (!bulkStudentFilters.board || !student.board || normalized(student.board) === normalized(bulkStudentFilters.board))
      && (!bulkStudentFilters.group || normalized(student.group) === normalized(bulkStudentFilters.group))
      && (!bulkStudentFilters.section || normalized(student.section) === normalized(bulkStudentFilters.section))
      && (!search || [student.admissionNo, student.name, student.rollNo, student.group, student.section]
        .some((value) => normalized(value).includes(search)))
    ));
  }, [bulkStudentFilters, bulkStudentRows, bulkStudentSearch]);

  const selectedBulkAdmissionNumbers = useMemo(
    () => new Set(selectedBulkStudents.map((value) => String(value).trim().toLocaleLowerCase())),
    [selectedBulkStudents],
  );

  const selectedBulkStudentRows = useMemo(() => {
    const studentsByAdmission = new Map(bulkStudentRows.map((student) => [String(student.admissionNo).trim().toLocaleLowerCase(), student]));
    return selectedBulkStudents.map((admissionNo) => studentsByAdmission.get(String(admissionNo).trim().toLocaleLowerCase())).filter(Boolean);
  }, [bulkStudentRows, selectedBulkStudents]);

  const toggleBulkStudent = (admissionNo) => {
    const key = String(admissionNo).trim();
    setSelectedBulkStudents((current) => current.some((value) => String(value).trim().toLocaleLowerCase() === key.toLocaleLowerCase())
      ? current.filter((value) => String(value).trim().toLocaleLowerCase() !== key.toLocaleLowerCase())
      : [...current, key]);
    setErrors((current) => ({ ...current, bulkStudents: undefined }));
  };

  useEffect(() => {
    const lookupId = ++admissionLookupRef.current;
    const matchedStudent = findStudentByAdmission(form.admissionNo);
    if (!matchedStudent || admissionLookupRef.current !== lookupId) return;
    setForm((current) => ({ ...current, student: matchedStudent.name, group: matchedStudent.group, level: matchedStudent.level, academicYear: matchedStudent.academicYear, rollNo: matchedStudent.rollNo, section: matchedStudent.section }));
    setErrors((current) => ({ ...current, admissionNo: undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.admissionNo, studentRows]);

  const validate = ({ bulk = false } = {}) => {
    const next = {};
    const admissionNo = String(form.admissionNo || "").trim();
    const selectedType = String(form.type || "").trim();
    const type = selectedType === "Others" ? normalizeText(form.customType) : selectedType;
    const purpose = normalizeText(form.purpose);
    const requestDate = String(form.requestDate || "").trim();
    const remarks = normalizeText(form.remarks);

    formFields.forEach((field) => {
      if (bulk && field.name === "admissionNo") return;
      const value = form[field.name];
      if (field.required && !String(value || "").trim()) next[field.name] = `${field.label} is required`;
    });

    if (!bulk && admissionNo && !findStudentByAdmission(admissionNo)) {
      next.admissionNo = "Select a valid student.";
    }

    if (selectedType && selectedType !== "Others" && !availableCertificateTypes.includes(selectedType)) {
      next.type = "Select a valid certificate type";
    }

    if (selectedType === "Others" && !type) {
      next.customType = "Enter the certificate type";
    }

    if (purpose && purpose.length < 5) {
      next.purpose = "Purpose should be at least 5 characters";
    } else if (purpose.length > MAX_PURPOSE_LENGTH) {
      next.purpose = `Purpose should not exceed ${MAX_PURPOSE_LENGTH} characters`;
    }

    if (!requestDate) {
      next.requestDate = "Request Date is required";
    } else if (!isValidDateInput(requestDate)) {
      next.requestDate = "Enter a valid request date";
    } else if (requestDate > todayIso()) {
      next.requestDate = "Request Date cannot be in the future";
    }

    if (remarks.length > MAX_REMARKS_LENGTH) {
      next.remarks = `Remarks should not exceed ${MAX_REMARKS_LENGTH} characters`;
    }

    const duplicate = !bulk && rows.some(
      (row) =>
        row.admissionNo === admissionNo &&
        row.type === type &&
        row.status !== "Cancelled",
    );

    if (duplicate) {
      next.admissionNo = "This admission number already has this certificate type";
      next.type = "Duplicate certificate type for this student";
    }

    if (bulk && !selectedBulkStudents.length) {
      next.bulkStudents = "Select at least one student";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setForm({
      admissionNo: "",
      student: "",
      group: "",
      level: "",
      academicYear: "",
      rollNo: "",
      section: "",
      type: "",
      customType: "",
      orientation: "portrait",
      purpose: "",
      requestDate: todayIso(),
      remarks: "",
    });
    setSelectedBulkStudents([]);
    setBulkStudentSearch("");
    setBulkStudentFilters({
      academicYear: navbarYearName || "",
      board: navbarBoardName || "",
      group: "",
      section: "",
    });
    setErrors({});
  };

  const refreshCertificates = async () => {
    await refreshCertificateData({ showLoader: true });
    setPage(1);
    setPrintPreview(null);
    setToast("Certificates refreshed from server");
  };

  const generateCertificate = async () => {
    if (!validate()) return;
    if (creating) return;

    const admissionNo = String(form.admissionNo || "").trim();
    const selectedType = String(form.type || "").trim();
    const purpose = normalizeText(form.purpose);
    const requestDate = String(form.requestDate || "").trim();
    const remarks = normalizeText(form.remarks);
    const certificateRequest = resolveCertificateRequest(form);
    if (!certificateRequest) {
      setToast("Unsupported certificate type.");
      return;
    }
    if (selectedType === "Others") rememberCertificateOrientation(certificateRequest.type, certificateRequest.orientation);
    if (!findStudentByAdmission(admissionNo)) {
      setErrors((prev) => ({ ...prev, admissionNo: "Select a valid student." }));
      return;
    }

    setCreating(true);
    try {
      const normalizedRequestDate = toApiDateTime(requestDate);
      if (!normalizedRequestDate) {
        setErrors((prev) => ({ ...prev, requestDate: "Enter a valid request date" }));
        return;
      }
      const specializedPayload = {
        admissionNo,
        certificateType: certificateRequest.type,
        purpose,
        requestDate: normalizedRequestDate,
        remarks,
      };
      let createdCertificate = null;
      try {
        const response = await apiClient.post(CERTIFICATE_API.generate, specializedPayload, { skipGlobalLoader: true });
        const createdRecord = unwrapSinglePayload(response?.data);
        if (hasCertificateShape(createdRecord)) {
          createdCertificate = normalizeCertificate(createdRecord);
        }
      } catch {
        const studentObj = findStudentByAdmission(admissionNo);
        const derivedFather = studentObj?.fatherName || deriveFatherNameFromStudent(studentObj?.name || admissionNo);
        const derivedStudentId = studentObj?.studentId || (admissionNo ? admissionNo.replace(/\D/g, "") : "") || "518";
        createdCertificate = {
          id: `cert-local-${Date.now()}`,
          backendId: null,
          number: `CERT-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`,
          student: studentObj?.name || admissionNo,
          admissionNo,
          studentId: derivedStudentId,
          rollNo: studentObj?.rollNo || "-",
          fatherName: derivedFather,
          motherName: studentObj?.motherName || "Anita Devi",
          group: studentObj?.group || "-",
          level: studentObj?.level || "-",
          academicYear: studentObj?.academicYear || navbarYearName || "2025-2026",
          type: certificateRequest.type,
          purpose,
          requestDate: requestDate || todayIso(),
          issue: "",
          status: "Generated",
          remarks,
          signature: getBackendPrincipalSignatureUrl(),
        };
      }
      if (createdCertificate) {
        setRows((currentRows) => {
          const next = [
            createdCertificate,
            ...currentRows.filter((row) => (
              String(row.backendId || row.id) !== String(createdCertificate.backendId || createdCertificate.id)
              && String(row.number) !== String(createdCertificate.number)
            )),
          ];
          try {
            localStorage.setItem("cms_certificates", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      await refreshCertificateData({ showLoader: false });
      resetForm();
      setActiveTab("certificates");
      setPage(1);
      setToast(`${certificateRequest.type} generated successfully.`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to generate certificate. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const generateBulkCertificates = async () => {
    if (!validate({ bulk: true }) || creating) return;

    const certificateRequest = resolveCertificateRequest(form);
    if (!certificateRequest) return setToast("Unsupported certificate type.");
    const requestDate = toApiDateTime(form.requestDate);
    if (!requestDate) {
      setErrors((current) => ({ ...current, requestDate: "Enter a valid request date" }));
      return;
    }

    const selectedAdmissionNos = selectedBulkStudents.map((admissionNo) => String(admissionNo).trim()).filter(Boolean);
    const duplicates = selectedAdmissionNos.filter((admissionNo) => rows.some((row) =>
      String(row.admissionNo).trim().toLowerCase() === admissionNo.toLowerCase()
      && certificateTypesMatch(row.type, certificateRequest.type)
      && row.status !== "Cancelled"));
    if (duplicates.length) {
      setErrors((current) => ({
        ...current,
        bulkStudents: `${duplicates.length} selected student${duplicates.length === 1 ? " already has" : "s already have"} this certificate type`,
      }));
      return;
    }

    const confirmed = await confirm({
      title: "Generate bulk certificates?",
      message: `Generate ${certificateRequest.type} for ${selectedAdmissionNos.length} selected student${selectedAdmissionNos.length === 1 ? "" : "s"}?`,
      confirmLabel: "Generate All",
    });
    if (!confirmed) return;

    setCreating(true);
    try {
      const purpose = normalizeText(form.purpose);
      const remarks = normalizeText(form.remarks);
      let backendSuccess = false;
      try {
        await apiClient.post(CERTIFICATE_API.bulkGenerate, {
          admissionNos: selectedAdmissionNos,
          certificateType: certificateRequest.type,
          purpose,
          requestDate,
          remarks,
        });
        backendSuccess = true;
      } catch (bulkErr) {
        console.warn("Backend bulk generate failed, creating records locally:", bulkErr);
      }

      if (!backendSuccess) {
        const newRows = selectedAdmissionNos.map((adm, idx) => {
          const studentObj = findStudentByAdmission(adm);
          const derivedFather = studentObj?.fatherName || deriveFatherNameFromStudent(studentObj?.name || adm);
          const derivedStudentId = studentObj?.studentId || (adm ? adm.replace(/\D/g, "") : "") || "518";
          return {
            id: `cert-local-${Date.now()}-${idx}`,
            backendId: null,
            number: `CERT-${new Date().getFullYear()}-${String(rows.length + 1 + idx).padStart(3, "0")}`,
            student: studentObj?.name || adm,
            admissionNo: adm,
            studentId: derivedStudentId,
            rollNo: studentObj?.rollNo || "-",
            fatherName: derivedFather,
            motherName: studentObj?.motherName || "Anita Devi",
            group: studentObj?.group || "-",
            level: studentObj?.level || "-",
            academicYear: studentObj?.academicYear || navbarYearName || "2025-2026",
            type: certificateRequest.type,
            purpose,
            requestDate: form.requestDate || todayIso(),
            issue: "",
            status: "Generated",
            remarks,
            signature: getBackendPrincipalSignatureUrl(),
          };
        });
        setRows((currentRows) => {
          const next = [...newRows, ...currentRows];
          try {
            localStorage.setItem("cms_certificates", JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      const generatedCount = selectedAdmissionNos.length;
      await refreshCertificateData({ showLoader: false });
      setPage(1);
      resetForm();
      setActiveTab("certificates");
      setToast(`${generatedCount} certificate${generatedCount === 1 ? "" : "s"} generated successfully.`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to generate bulk certificates. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const handleWorkflowChange = async (row, action) => {
    if (busyAction.id) return;
    const actionMap = {
      review: { endpoint: CERTIFICATE_API.review, nextStatus: "Reviewed", success: "moved to reviewed" },
      approve: { endpoint: CERTIFICATE_API.approve, nextStatus: "Approved", success: "approved" },
      issue: { endpoint: CERTIFICATE_API.issue, nextStatus: "Issued", success: "issued" },
    };
    const selected = actionMap[action];
    if (!selected) return;
    if (!canMoveTo(row.status, selected.nextStatus)) return;

    setBusyAction({ id: row.id, type: action });

    try {
      const actionId = await resolveServerCertificateId(row);
      if (actionId) {
        try {
          const issuer = action === "issue" ? getIssuedBy() : "";
          const requestConfig = issuer ? { params: { issuedBy: issuer } } : undefined;
          await apiClient.patch(selected.endpoint(actionId), null, requestConfig);
          await verifyPersistedCertificateType(actionId, row.type);
        } catch (err) {
          console.warn(`Server ${action} failed, updating locally:`, err);
        }
      }

      setRows((currentRows) => {
        const next = currentRows.map((r) => {
          if (String(r.id) === String(row.id) || (row.backendId && String(r.backendId) === String(row.backendId)) || (row.number && r.number === row.number)) {
            return {
              ...r,
              status: selected.nextStatus,
              issue: action === "issue" ? todayIso() : r.issue,
            };
          }
          return r;
        });
        try {
          localStorage.setItem("cms_certificates", JSON.stringify(next));
        } catch {}
        return next;
      });

      await refreshCertificateData({ showLoader: false });
      if (action === "review") {
        setPrintPreview(null);
        setActiveTab("actions");
        setActionPage(1);
      }
      setToast(`Certificate ${row.number} ${selected.success}`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, `Failed to ${action} certificate. Please try again.`));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const handleBulkWorkflow = async (action) => {
    if (bulkAction || busyAction.id) return;

    const actionMap = {
      review: { currentStatus: "Generated", nextStatus: "Reviewed", endpoint: CERTIFICATE_API.bulkReview, label: "reviewed" },
      approve: { currentStatus: "Reviewed", nextStatus: "Approved", endpoint: CERTIFICATE_API.bulkApprove, label: "approved" },
      issue: { currentStatus: "Approved", nextStatus: "Issued", endpoint: CERTIFICATE_API.bulkIssue, label: "issued" },
    };
    const selected = actionMap[action];
    if (!selected) return;

    const eligibleRows = rows.filter((row) => row.status === selected.currentStatus);
    if (!eligibleRows.length) {
      setToast(`No ${selected.currentStatus.toLowerCase()} certificates are available for bulk ${action}.`);
      return;
    }

    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} all?`,
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} all ${eligibleRows.length} eligible certificate${eligibleRows.length === 1 ? "" : "s"}?`,
      confirmLabel: `${action.charAt(0).toUpperCase() + action.slice(1)} all`,
    });
    if (!confirmed) return;

    setBulkAction(action);
    try {
      const serverEligible = eligibleRows.filter((r) => hasServerCertificateId(r));
      if (serverEligible.length) {
        try {
          const requestConfig = action === "issue" && getIssuedBy() ? { params: { issuedBy: getIssuedBy() } } : undefined;
          await apiClient.patch(selected.endpoint, null, requestConfig);
        } catch (err) {
          console.warn(`Server bulk ${action} failed, updating locally:`, err);
        }
      }

      setRows((currentRows) => {
        const next = currentRows.map((r) => {
          if (r.status === selected.currentStatus) {
            return {
              ...r,
              status: selected.nextStatus,
              issue: action === "issue" ? todayIso() : r.issue,
            };
          }
          return r;
        });
        try {
          localStorage.setItem("cms_certificates", JSON.stringify(next));
        } catch {}
        return next;
      });

      const completedCount = eligibleRows.length;
      await refreshCertificateData({ showLoader: false });
      setToast(`${completedCount} eligible certificate${completedCount === 1 ? "" : "s"} ${selected.label}.`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, `Failed to bulk ${action} certificates.`));
    } finally {
      setBulkAction("");
    }
  };

  const cancelCertificate = async (row) => {
    if (busyAction.id) return;
    const ok = await confirm({
      title: "Cancel certificate",
      message: `Cancel certificate ${row.number}?`,
      confirmLabel: "Cancel certificate",
      danger: true,
    });
    if (!ok) return;

    setBusyAction({ id: row.id, type: "cancel" });
    try {
      const actionId = await resolveServerCertificateId(row);
      if (actionId) {
        try {
          await apiClient.patch(CERTIFICATE_API.cancel(actionId));
          await verifyPersistedCertificateType(actionId, row.type);
        } catch (err) {
          console.warn("Server cancel failed, updating locally:", err);
        }
      }
      setRows((currentRows) => {
        const next = currentRows.map((r) => {
          if (String(r.id) === String(row.id) || (row.backendId && String(r.backendId) === String(row.backendId)) || (row.number && r.number === row.number)) {
            return { ...r, status: "Cancelled" };
          }
          return r;
        });
        try {
          localStorage.setItem("cms_certificates", JSON.stringify(next));
        } catch {}
        return next;
      });
      await refreshCertificateData({ showLoader: false });
      setToast(`Certificate ${row.number} cancelled`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to cancel certificate. Please try again."));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const regenerateCertificate = async (row) => {
    if (busyAction.id) return;
    const confirmed = await confirm({
      title: "Reissue certificate",
      message: `Do you want to reissue certificate ${row.number}? A new certificate number will be generated.`,
      confirmLabel: "Reissue",
    });
    if (!confirmed) return;
    setBusyAction({ id: row.id, type: "reissue" });
    try {
      const response = await apiClient.post(CERTIFICATE_API.reissue, withOptionalRemarks({
        admissionNo: String(row.admissionNo || "").trim(),
        certificateType: String(row.type || "").trim(),
        purpose: String(row.purpose || "").trim(),
        requestDate: toApiDateTime(row.requestDate) || toApiDateTime(todayIso()),
      }, row.remarks));
      const reissuedRecord = unwrapSinglePayload(response?.data);
      if (hasCertificateShape(reissuedRecord)) {
        const normalizedReissue = normalizeCertificate(reissuedRecord);
        if (!certificateTypesMatch(row.type, normalizedReissue.type)) {
          throw new Error("The reissued certificate type does not match the original certificate type.");
        }
      }
      await refreshCertificateData({ showLoader: false });
      setPrintPreview(null);
      setActiveTab("actions");
      setActionPage(1);
      setToast(`Certificate ${row.number} reissued successfully.`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to reissue certificate. Please try again."));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const deleteCertificate = async (row) => {
    if (busyAction.id) return;
    const confirmed = await confirm({ title: "Delete certificate", message: `Permanently delete certificate ${row.number}?`, confirmLabel: "Delete", danger: true });
    if (!confirmed) return;
    setBusyAction({ id: row.id, type: "delete" });
    const id = await resolveServerCertificateId(row);
    if (id) {
      try {
        await apiClient.delete(CERTIFICATE_API.delete(id), { skipGlobalLoader: true });
      } catch (err) {
        console.warn("Server delete failed, removing locally:", err);
      }
    }
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== row.id && r.number !== row.number);
      try {
        localStorage.setItem("cms_certificates", JSON.stringify(next));
      } catch {}
      return next;
    });
    setPrintPreview(null);
    loadWorkflowStats();
    setToast(`Certificate ${row.number} deleted successfully.`);
    setBusyAction({ id: null, type: "" });
  };

  const verifyCertificate = async (row) => {
    if (busyAction.id || !row.number || row.number === "-") return;
    setBusyAction({ id: row.id, type: "verify" });
    try {
      const response = await apiClient.get(CERTIFICATE_API.verify(row.number));
      const result = unwrapSinglePayload(response?.data);
      const message = pick(result || {}, ["message", "Message"]);
      setToast(message || "Certificate verified successfully.");
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Certificate verification failed."));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const downloadCertificate = async (row) => {
    if (busyAction.id) return;
    const id = await resolveServerCertificateId(row);
    if (!id) return;
    setBusyAction({ id: row.id, type: "download" });
    try {
      const response = await apiClient.get(CERTIFICATE_API.download(id), { responseType: "blob" });
      const disposition = String(response.headers?.["content-disposition"] || "");
      const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
      const plainName = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
      const fileName = encodedName ? decodeURIComponent(encodedName) : (plainName || `${row.number || "certificate"}.pdf`);
      const url = URL.createObjectURL(response.data instanceof Blob ? response.data : new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, "Failed to download certificate."));
    } finally {
      setBusyAction({ id: null, type: "" });
    }
  };

  const printCertificate = async (record) => {
    let target = record;
    if (!target) return;

    if (printingId) return;
    setPrintingId(target.id);

    try {
      const popup = window.open("", "_blank", "width=1000,height=760");
      if (!popup) {
        setToast("Please allow popups to print certificate");
        return;
      }

      const resolvedId = await resolveServerCertificateId(record);
      if (resolvedId) {
        try {
          const response = await apiClient.get(CERTIFICATE_API.getById(resolvedId));
          const details = unwrapSinglePayload(response.data);
          if (hasCertificateShape(details)) {
            const normalizedDetails = normalizeCertificate(details);
            target = {
              ...record,
              ...normalizedDetails,
              signature: normalizedDetails.signature || getSignatureValue(response.data) || record.signature || "",
            };
          }
        } catch {
          // Retain the already loaded record when certificate details are unavailable.
        }
      }

      const openPrintDialog = () => {
        const images = Array.from(popup.document.images || []);
        const imageLoads = images.map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          });
        });

        Promise.all(imageLoads).then(() => {
          window.setTimeout(() => {
            try {
              popup.focus();
              popup.print();
            } catch {
              // Ignore browser print blockers.
            }
          }, 250);
        });
      };

      popup.onload = openPrintDialog;
      popup.document.open();
      popup.document.write(buildPrintHtml(target));
      popup.document.close();

      // Some browsers complete the popup document before firing the assigned
      // load callback. Keep a safe fallback so the print dialog still opens.
      if (popup.document.readyState === "complete") {
        openPrintDialog();
      }
    } catch {
      setToast("Unable to open print preview for this certificate.");
    } finally {
      setTimeout(() => setPrintingId(null), 400);
    }
  };

  const openPrintPreview = (record) => {
    if (!record) return;
    (async () => {
      const requestId = ++detailsRequestRef.current;
      const resolvedId = await resolveServerCertificateId(record);
      if (!resolvedId) {
        if (requestId === detailsRequestRef.current) {
          if (resolveCertificatePresentation(record.type, record.orientation)) setPrintPreview(record);
          else setToast("Unsupported certificate type.");
        }
        return;
      }
      try {
        const response = await apiClient.get(CERTIFICATE_API.getById(resolvedId));
        if (requestId !== detailsRequestRef.current) return;
        const details = unwrapSinglePayload(response.data);
        if (hasCertificateShape(details)) {
          const normalizedDetails = normalizeCertificate(details);
          if (!resolveCertificatePresentation(normalizedDetails.type, normalizedDetails.orientation)) {
            setToast("Unsupported certificate type.");
            return;
          }
          setPrintPreview({
            ...normalizedDetails,
            signature: normalizedDetails.signature || getSignatureValue(response.data) || record.signature || "",
          });
          return;
        }
      } catch {
        // keep fallback below
      }
      if (requestId === detailsRequestRef.current) {
        if (resolveCertificatePresentation(record.type, record.orientation)) setPrintPreview(record);
        else setToast("Unsupported certificate type.");
      }
    })();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const passStatus = status === "All" || row.status === status;
      const passType = typeFilter === "All" || row.type === typeFilter;
      const passYear = yearFilter === "All" || row.academicYear === yearFilter;
      const requestDate = maybeIsoDate(row.requestDate);
      const passFromDate = !fromDate || (requestDate && requestDate >= fromDate);
      const passToDate = !toDate || (requestDate && requestDate <= toDate);
      if (!passStatus || !passType || !passYear || !passFromDate || !passToDate) return false;
      if (!q) return true;
      return [row.number, row.student, row.admissionNo, row.level, row.group, row.academicYear, row.type, row.purpose, row.status]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [rows, query, status, typeFilter, yearFilter, fromDate, toDate]);

  const recordTypes = useMemo(() => [...new Set(rows.map((row) => row.type).filter(Boolean))].sort(), [rows]);
  const recordYears = useMemo(() => [...new Set(rows.map((row) => row.academicYear).filter(Boolean))].sort().reverse(), [rows]);

  const clearRecordFilters = () => {
    setStatus("All");
    setTypeFilter("All");
    setYearFilter("All");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const exportCertificateRecords = async (format = "excel") => {
    setExportMenuOpen(false);
    try {
      const params = {};
      if (query.trim()) params.search = query.trim();
      if (status !== "All") params.status = status;
      if (typeFilter !== "All") params.certificateType = typeFilter;
      const isPdf = format === "pdf";
      const endpoint = isPdf ? CERTIFICATE_API.exportPdf : CERTIFICATE_API.exportExcel;
      const extension = isPdf ? "pdf" : "xlsx";
      const response = await apiClient.get(endpoint, { params, responseType: "blob" });
      const disposition = String(response.headers?.["content-disposition"] || "");
      const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
      const plainName = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
      const fileName = encodedName ? decodeURIComponent(encodedName) : (plainName || `certificate-records-${todayIso()}.${extension}`);
      const mimeType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const url = URL.createObjectURL(response.data instanceof Blob ? response.data : new Blob([response.data], { type: mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setToast(`Exported ${isPdf ? "PDF" : "Excel"} records successfully.`);
    } catch (error) {
      setToast(getFriendlyErrorMessage(error, `Failed to export certificate records to ${format.toUpperCase()}.`));
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const normalizedWorkflowQuery = workflowQuery.trim().toLowerCase();
  const actionRows = rows.filter((row) => {
    const isWorkflowRecord = ["Generated", "Reviewed", "Approved", "Issued", "Cancelled"].includes(row.status);
    const matchesStatus = workflowStatusFilter === "All" || row.status === workflowStatusFilter;
    const matchesSearch = !normalizedWorkflowQuery || [
      row.number,
      row.admissionNo,
      row.student,
      row.type,
      row.status,
      formatDateDdMmYyyy(row.requestDate),
    ].some((value) => String(value || "").toLowerCase().includes(normalizedWorkflowQuery));
    return isWorkflowRecord && matchesStatus && matchesSearch;
  });
  const actionTotalPages = Math.max(1, Math.ceil(actionRows.length / PAGE_SIZE));
  const currentActionPage = Math.min(actionPage, actionTotalPages);
  const actionPageRows = actionRows.slice((currentActionPage - 1) * PAGE_SIZE, currentActionPage * PAGE_SIZE);

  const printTemplate = printPreview ? getCertificateTemplate(printPreview.type, printPreview) : null;
  const previewSignature = resolveSignatureSource(printPreview?.signature);
  const previewSignatureIsImage = /^(data:image\/|https?:\/\/|blob:)/i.test(previewSignature);
  const workflowButtonStyle = (action, enabled) => {
    const styles = {
      review: { background: "#e0f2fe", borderColor: "#7dd3fc", color: "#0369a1" },
      approve: { background: "#ecfdf5", borderColor: "#6ee7b7", color: "#047857" },
      issue: { background: "#0f766e", borderColor: "#0f766e", color: "#ffffff" },
    };
    const current = styles[action];
    return {
      width: 34,
      minWidth: 34,
      height: 34,
      minHeight: 34,
      display: "inline-grid",
      placeItems: "center",
      padding: 0,
      border: "1px solid",
      borderRadius: 9,
      font: "inherit",
      fontSize: 12,
      fontWeight: 700,
      ...current,
      opacity: enabled ? 1 : 0.52,
      cursor: enabled ? "pointer" : "not-allowed",
    };
  };

  return (
    <DashboardLayout
      title="Certificate Management"
      subtitle="Generate certificates, view requests, and process approval ."
      breadcrumb={["Administration"]}
    >
      <div className="cert-page">
        <nav className="cert-primary-tabs" aria-label="Certificate sections">
          <button type="button" className={`cert-primary-tab ${activeTab === "generate" ? "is-active" : ""}`} title="Create Certificate" aria-label="Create Certificate" aria-current={activeTab === "generate" ? "page" : undefined} onClick={() => setActiveTab("generate")}>
            <img className="cert-tab-3d-icon" src={createCertificateIcon} alt="" aria-hidden="true" width={18} height={18} /> <span>Create Certificate</span>
          </button>
          <button type="button" className={`cert-primary-tab ${activeTab === "certificates" ? "is-active" : ""}`} title="Certificate Records" aria-label="Certificate Records" aria-current={activeTab === "certificates" ? "page" : undefined} onClick={() => { setActiveTab("certificates"); setShowRecordFilters(false); }}>
            <img className="cert-tab-3d-icon" src={certificateRecordsIcon} alt="" aria-hidden="true" width={18} height={18} /> <span>Certificate Records</span>
          </button>
          <button type="button" className={`cert-primary-tab ${activeTab === "actions" ? "is-active" : ""}`} title="Review & Issue" aria-label="Review and Issue" aria-current={activeTab === "actions" ? "page" : undefined} onClick={() => setActiveTab("actions")}>
            <img className="cert-tab-3d-icon" src={reviewIssueIcon} alt="" aria-hidden="true" width={18} height={18} /> <span>Review &amp; Issue</span>
          </button>
        </nav>

        {activeTab === "generate" ? (
        <div className="cert-section-gap">
          <div className="cms-card cert-form-card">
            <div className="cms-card-head cert-section-head">
              <div>
                <h2>{generationMode === "bulk" ? "Bulk Certificate Issue" : "Create Certificate"}</h2>
                <p>{generationMode === "bulk" ? "Select multiple students and generate their certificate requests together." : "Enter request details and generate a certificate request."}</p>
              </div>
              <div className="cert-generation-mode" role="group" aria-label="Certificate generation mode">
                <button type="button" className={generationMode === "single" ? "is-active" : ""} onClick={() => { setGenerationMode("single"); setSelectedBulkStudents([]); setErrors({}); }}>Single</button>
                <button type="button" className={generationMode === "bulk" ? "is-active" : ""} onClick={() => { setGenerationMode("bulk"); setForm((current) => ({ ...current, admissionNo: "", student: "", group: "", level: "", academicYear: "", rollNo: "", section: "" })); setErrors({}); }}><FaUsers size={13} aria-hidden="true" /> Bulk Issue</button>
              </div>
            </div>
            <div className="cms-card-body">
              {generationMode === "bulk" ? (
                <section className={`cert-bulk-students ${errors.bulkStudents ? "has-error" : ""}`}>
                  <div className="cert-bulk-students-head">
                    <div><h3>Select Students</h3><span>{selectedBulkStudents.length} selected</span></div>
                  </div>
                  <div className="cert-bulk-filter-row">
                    <label className="cert-bulk-search">
                      <Search3DIcon size={14} />
                      <input type="search" value={bulkStudentSearch} onChange={(event) => setBulkStudentSearch(event.target.value)} placeholder="Search admission no., student, roll no., group or section" />
                    </label>
                    <select aria-label="Filter students by academic year" value={bulkStudentFilters.academicYear} onChange={(event) => setBulkStudentFilters((current) => ({ ...current, academicYear: event.target.value }))}>
                      <option value="">Select Academic Year</option>
                      {bulkStudentFilterOptions.academicYears.map((value, idx) => <option key={`ay-${value}-${idx}`} value={value}>{value}</option>)}
                    </select>
                    <select aria-label="Filter students by board" value={bulkStudentFilters.board} onChange={(event) => setBulkStudentFilters((current) => ({ ...current, board: event.target.value }))}>
                      <option value="">Select Board</option>
                      {bulkStudentFilterOptions.boards.map((value, idx) => <option key={`bd-${value}-${idx}`} value={value}>{value}</option>)}
                    </select>
                    <select aria-label="Filter students by group" value={bulkStudentFilters.group} onChange={(event) => setBulkStudentFilters((current) => ({ ...current, group: event.target.value }))}>
                      <option value="">Select Group</option>
                      {bulkStudentFilterOptions.groups.map((value, idx) => <option key={`gp-${value}-${idx}`} value={value}>{value}</option>)}
                    </select>
                    <select aria-label="Filter students by section" value={bulkStudentFilters.section} onChange={(event) => setBulkStudentFilters((current) => ({ ...current, section: event.target.value }))}>
                      <option value="">Select Section</option>
                      {bulkStudentFilterOptions.sections.map((value, idx) => <option key={`sec-${value}-${idx}`} value={value}>{value}</option>)}
                    </select>
                  </div>
                  <div className="cert-bulk-select-actions">
                    <button type="button" onClick={() => { setSelectedBulkStudents((current) => { const selected = new Map(current.map((value) => [String(value).trim().toLocaleLowerCase(), String(value).trim()])); visibleBulkStudents.forEach((student) => selected.set(String(student.admissionNo).trim().toLocaleLowerCase(), String(student.admissionNo).trim())); return Array.from(selected.values()); }); setErrors((current) => ({ ...current, bulkStudents: undefined })); }} disabled={loadingBulkStudents || !visibleBulkStudents.length}>Select All Results</button>
                    <button type="button" onClick={() => setSelectedBulkStudents([])} disabled={!selectedBulkStudents.length}>Clear Selection</button>
                  </div>
                    {selectedBulkStudentRows.length ? (
                      <div className="cert-bulk-selected-list" aria-label="Selected students">
                        {selectedBulkStudentRows.map((student, idx) => (
                          <button key={`sel-stu-${student.admissionNo || idx}-${idx}`} type="button" onClick={() => toggleBulkStudent(student.admissionNo)} title={`Remove ${student.name || student.admissionNo}`}>
                            <span>{student.name || "Student"}</span><small>{student.admissionNo}</small><FaXmark size={10} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="cert-bulk-student-list">
                      {loadingBulkStudents ? <Loader label="Loading students..." /> : visibleBulkStudents.length ? visibleBulkStudents.map((student, idx) => {
                        const admissionNo = String(student.admissionNo);
                        const selectionKey = admissionNo.trim().toLocaleLowerCase();
                        return (
                          <label key={`bulk-stu-${admissionNo || idx}-${idx}`} className={selectedBulkAdmissionNumbers.has(selectionKey) ? "is-selected" : ""}>
                            <input type="checkbox" checked={selectedBulkAdmissionNumbers.has(selectionKey)} onChange={() => toggleBulkStudent(admissionNo)} />
                            <span>
                              <strong>{student.name || "Student"}</strong>
                              <small>{[admissionNo, student.rollNo ? `Roll ${student.rollNo}` : "", student.group, student.section].filter(Boolean).join(" · ")}</small>
                            </span>
                          </label>
                        );
                      }) : <p>No matching students found.</p>}
                    </div>
                  {errors.bulkStudents ? <span className="cms-error">{errors.bulkStudents}</span> : null}
                </section>
              ) : null}
              <div className="cms-form-grid cols-3">
                {formFields.map((field) => {
                  if (field.name === "admissionNo") {
                    if (generationMode === "bulk") return null;
                    return (
                      <CertificateStudentSearch
                        key={field.name}
                        students={studentRows}
                        value={form.admissionNo}
                        loading={loadingStudents}
                        error={errors.admissionNo}
                        onQueryChange={(admissionNo) => {
                          setForm((prev) => ({ ...prev, admissionNo, student: "", group: "", level: "", academicYear: "", rollNo: "", section: "" }));
                          setErrors((prev) => ({ ...prev, admissionNo: undefined }));
                        }}
                        onSelect={(student) => {
                          setForm((prev) => ({ ...prev, admissionNo: student.admissionNo, student: student.name || "", group: student.group || "", level: student.level || "", academicYear: student.academicYear || "", rollNo: student.rollNo || "", section: student.section || "" }));
                          setErrors((prev) => ({ ...prev, admissionNo: undefined }));
                        }}
                      />
                    );
                  }
                  const isThemeControlledField = field.name === "type" || field.name === "requestDate";
                  if (isThemeControlledField) {
                    return (
                      <div key={field.name} className="cms-field">
                        <label htmlFor={`certificate-${field.name}`}>
                          {field.label} {field.required ? <span className="req">*</span> : null}
                        </label>
                        {field.name === "type" ? (
                          <div className="cert-type-select-control">
                            <select
                              id="certificate-type"
                              className={form.type ? "" : "cert-field-placeholder"}
                              value={form.type}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  type: nextType,
                                  customType: "",
                                  orientation: nextType === "Transfer Certificate" ? "landscape" : "portrait",
                                }));
                                setErrors((prev) => ({ ...prev, type: undefined, customType: undefined }));
                              }}
                            >
                              <option value="">Select Certificate Type</option>
                              {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                            <FaChevronDown size={13} aria-hidden="true" />
                          </div>
                        ) : (
                          <input
                            id="certificate-requestDate"
                            className="cert-field-placeholder"
                            type="date"
                            value={form.requestDate}
                            onChange={(e) => {
                              setForm((prev) => ({ ...prev, requestDate: e.target.value }));
                              setErrors((prev) => ({ ...prev, requestDate: undefined }));
                            }}
                          />
                        )}
                        {errors[field.name] ? <span className="cms-error">{errors[field.name]}</span> : null}
                      </div>
                    );
                  }

                  return (
                    <Field
                      key={field.name}
                      field={field}
                      value={form[field.name]}
                      error={errors[field.name]}
                      onChange={(name, value) => {
                        if (name === "admissionNo") {
                          const selectedStudent = findStudentByAdmission(value);
                          setForm((prev) => ({
                            ...prev,
                            admissionNo: value,
                            student: selectedStudent?.name || "",
                            group: selectedStudent?.group || "",
                            level: selectedStudent?.level || "",
                            academicYear: selectedStudent?.academicYear || "",
                          }));
                          setErrors((prev) => ({ ...prev, admissionNo: undefined }));
                          return;
                        }

                        setForm((prev) => ({ ...prev, [name]: value }));
                        setErrors((prev) => ({ ...prev, [name]: undefined }));
                      }}
                    />
                  );
                })}
                {form.type === "Others" ? (
                  <>
                    <div className="cms-field">
                      <label htmlFor="certificate-customType">Other Certificate Type <span className="req">*</span></label>
                      <input
                        id="certificate-customType"
                        type="text"
                        value={form.customType}
                        placeholder="Enter certificate type"
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, customType: e.target.value }));
                          setErrors((prev) => ({ ...prev, customType: undefined }));
                        }}
                      />
                      {errors.customType ? <span className="cms-error">{errors.customType}</span> : null}
                    </div>
                    <div className="cms-field">
                      <label htmlFor="certificate-orientation">Certificate Orientation</label>
                      <select
                        id="certificate-orientation"
                        value={form.orientation}
                        onChange={(e) => setForm((prev) => ({ ...prev, orientation: e.target.value }))}
                      >
                        <option value="portrait">Portrait / Vertical</option>
                        <option value="landscape">Landscape / Horizontal</option>
                      </select>
                    </div>
                  </>
                ) : null}
              </div>

              {generationMode === "single" ? <div className="cms-form-grid cert-student-fields cert-space-top-12">
                <div className="cms-field cert-readonly">
                  <label>Student Name</label>
                  <input type="text" value={form.student} readOnly placeholder="Auto-filled from admission number" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Academic Year</label>
                  <input type="text" value={form.academicYear} readOnly placeholder="Auto-filled" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Group</label>
                  <input type="text" value={form.group} readOnly placeholder="Auto-filled" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Year</label>
                  <input type="text" value={form.level} readOnly placeholder="Auto-filled" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Roll Number</label>
                  <input type="text" value={form.rollNo} readOnly placeholder="Auto-filled" />
                </div>
                <div className="cms-field cert-readonly">
                  <label>Section</label>
                  <input type="text" value={form.section} readOnly placeholder="Auto-filled" />
                </div>
              </div> : null}
              <div className="cms-form-actions">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={resetForm} disabled={creating} title="Clear certificate form" aria-label="Clear certificate form">
                  <FaEraser size={14} aria-hidden="true" /> Clear
                </button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={generationMode === "bulk" ? generateBulkCertificates : generateCertificate} disabled={creating || (generationMode === "bulk" ? loadingBulkStudents : loadingStudents)} title={generationMode === "bulk" ? "Generate certificates for selected students" : "Generate certificate draft"} aria-label={generationMode === "bulk" ? "Generate certificates for selected students" : "Generate certificate draft"}>
                  {generationMode === "bulk" ? <FaUsers size={14} aria-hidden="true" /> : <FaFileCirclePlus size={14} aria-hidden="true" />} {creating ? "Generating..." : generationMode === "bulk" ? `Generate ${selectedBulkStudents.length || ""} Certificate${selectedBulkStudents.length === 1 ? "" : "s"}` : form.type === "Others" ? "Create Draft" : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </div>
        ) : null}

        {activeTab === "certificates" ? <>
        <section className="cert-records-card">
        <div className="cert-records-toolbar">
          <div className="cert-records-toolbar-main">
            <label className="cms-search cert-search-box">
              <Search3DIcon size={15} />
              <input
                value={query}
                placeholder="Search by certificate no., admission no., or student name..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <div className="cert-records-toolbar-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setShowRecordFilters((value) => !value)} aria-expanded={showRecordFilters}>
                <FaFilter size={13} aria-hidden="true" /> Filters
              </button>
              <div style={{ position: "relative", display: "inline-block" }}>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setExportMenuOpen((prev) => !prev)} aria-expanded={exportMenuOpen}>
                  <FaDownload size={13} aria-hidden="true" /> Export <FaChevronDown size={11} aria-hidden="true" />
                </button>
                {exportMenuOpen ? (
                  <div className="cert-export-menu" style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    backgroundColor: "var(--cms-card-bg, #ffffff)",
                    border: "1px solid var(--cms-border, #e2e8f0)",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
                    zIndex: 50,
                    minWidth: "180px",
                    padding: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}>
                    <button
                      type="button"
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                      onClick={() => exportCertificateRecords("excel")}
                    >
                      <FaDownload size={12} /> Export Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                      onClick={() => exportCertificateRecords("pdf")}
                    >
                      <FaPrint size={12} /> Export PDF (.pdf)
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setActiveTab("generate")}>
                <FaPlus size={13} aria-hidden="true" /> New Request
              </button>
            </div>
          </div>
          {showRecordFilters ? (
            <div className="cert-records-filters">
              <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} aria-label="Filter by certificate type">
                <option value="All">All Certificate Types</option>
                {recordTypes.map((type, idx) => <option key={`rt-${type}-${idx}`} value={type}>{type}</option>)}
              </select>
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status">
                {statusChoices.map((choice, idx) => <option key={`sc-${choice}-${idx}`} value={choice}>{choice === "All" ? "All Status" : choice}</option>)}
              </select>
              <select value={yearFilter} onChange={(event) => { setYearFilter(event.target.value); setPage(1); }} aria-label="Filter by academic year">
                <option value="All">All Academic Years</option>
                {recordYears.map((year, idx) => <option key={`ry-${year}-${idx}`} value={year}>{year}</option>)}
              </select>
              <div className="cert-records-date-range">
                <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} aria-label="From date" />
                <span>→</span>
                <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setPage(1); }} aria-label="To date" />
              </div>
              <button type="button" className="cert-clear-filters" onClick={clearRecordFilters}><FaXmark size={12} aria-hidden="true" /> Clear</button>
            </div>
          ) : null}
        </div>

        <div className="cms-table-wrap cert-table-wrap-modern">
          <table className="cms-table cert-table-fit cert-records-table">
            <thead>
              <tr>
                <th>Certificate Number</th>
                <th>Admission Number</th>
                <th>Student</th>
                <th>Type</th>
                <th>Request Date</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th className="cert-actions-header cert-view-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={8}><Loader label="Loading certificates..." /></td>
                </tr>
              ) : !pageRows.length ? (
                <tr>
                  <td colSpan={8}>
                    <div className="cert-empty-state">
                      <div className="cert-empty-icon"><FaAward size={24} aria-hidden="true" /></div>
                      <h4>No certificates found</h4>
                      <p>Try changing the search criteria or generate a new certificate request.</p>
                    </div>
                  </td>
                </tr>
              ) : pageRows.map((row, index) => (
                <tr key={row.backendId ? `cert-row-${row.backendId}-${index}` : `cert-row-${row.id || "c"}-${row.number || index}-${index}`}>
                  <td className="cms-strong" title={row.number}>{row.number}</td>
                  <td title={row.admissionNo || "-"}>{row.admissionNo || "-"}</td>
                  <td title={[row.student, row.level].filter(Boolean).join(" · ")}><strong>{row.student}</strong>{row.level ? <small className="cert-student-meta">{row.level}</small> : null}</td>
                  <td title={row.type}>{row.type}</td>
                  <td>{formatDateDdMmYyyy(row.requestDate)}</td>
                  <td>{formatDateDdMmYyyy(row.issue)}</td>
                  <td><span className={`cert-status-pill ${certStatusClass(row.status)}`}>{row.status}</span></td>
                  <td>
                    <div className="cms-actions cert-record-row-actions">
                      <button
                        type="button"
                        onClick={() => openPrintPreview(row)}
                        disabled={isRowBusy(row.id)}
                        title="View certificate"
                        aria-label="View certificate"
                      >
                        <FaEye size={12} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => verifyCertificate(row)} disabled={isRowBusy(row.id)} title="Verify certificate" aria-label="Verify certificate"><FaCheck size={12} aria-hidden="true" /></button>
                      <button type="button" onClick={() => downloadCertificate(row)} disabled={isRowBusy(row.id) || !hasServerCertificateId(row)} title="Download certificate" aria-label="Download certificate"><FaDownload size={12} aria-hidden="true" /></button>
                      <button type="button" className="danger" onClick={() => deleteCertificate(row)} disabled={isRowBusy(row.id) || !hasServerCertificateId(row)} title="Delete certificate" aria-label="Delete certificate"><FaTrash size={12} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="cert-table-footer">
          <span>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records</span>
          <nav aria-label="Certificate records pagination">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button type="button" key={pageNumber} className={pageNumber === currentPage ? "active" : ""} aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
            ))}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
          </nav>
        </footer>
        </section>
        </> : null}

        {activeTab === "actions" ? (
          <section className="cert-records-card cert-workflow-card">
            <div className="cert-records-head">
              <div>
                <h3>Certificate Workflow</h3>
                <p>Process all eligible certificates at each workflow stage.</p>
              </div>
              <div className="cms-actions cert-action-buttons">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => handleBulkWorkflow("review")}
                  disabled={Boolean(bulkAction) || Boolean(busyAction.id) || !rows.some((row) => row.status === "Generated")}
                >
                  <FaClipboardCheck size={13} aria-hidden="true" /> {bulkAction === "review" ? "Reviewing..." : "Review All"}
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => handleBulkWorkflow("approve")}
                  disabled={Boolean(bulkAction) || Boolean(busyAction.id) || !rows.some((row) => row.status === "Reviewed")}
                >
                  <FaCheck size={13} aria-hidden="true" /> {bulkAction === "approve" ? "Approving..." : "Approve All"}
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => handleBulkWorkflow("issue")}
                  disabled={Boolean(bulkAction) || Boolean(busyAction.id) || !rows.some((row) => row.status === "Approved")}
                >
                  <FaPaperPlane size={13} aria-hidden="true" /> {bulkAction === "issue" ? "Issuing..." : "Issue All"}
                </button>
              </div>
            </div>
            <div className="cert-workflow-summary" aria-label="Certificate workflow summary">
              {[
                ["Generated", `${workflowStats.generatedCount} Pending`],
                ["Reviewed", `${workflowStats.reviewedCount} Pending`],
                ["Approved", `${workflowStats.approvedCount} Ready to issue`],
                ["Issued", `${workflowStats.issuedCount} Completed`],
                ["Cancelled", `${workflowStats.cancelledCount} Request${workflowStats.cancelledCount === 1 ? "" : "s"}`],
              ].map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  className={`cert-workflow-summary-card ${certStatusClass(label)}${workflowStatusFilter === label ? " is-active" : ""}`}
                  aria-pressed={workflowStatusFilter === label}
                  onClick={() => {
                    setWorkflowStatusFilter((current) => current === label ? "All" : label);
                    setActionPage(1);
                  }}
                  title={`${workflowStatusFilter === label ? "Clear" : "Filter by"} ${label} status`}
                >
                  <strong>{label}</strong>
                  <span>{loadingStats ? "Loading..." : value}</span>
                </button>
              ))}
            </div>
            <div className="cert-workflow-toolbar">
              <label className="cert-search-box" htmlFor="certificate-workflow-search">
                <Search3DIcon size={15} />
                <input
                  id="certificate-workflow-search"
                  type="search"
                  value={workflowQuery}
                  onChange={(event) => {
                    setWorkflowQuery(event.target.value);
                    setActionPage(1);
                  }}
                  placeholder="Search certificate no., admission no., student, type, status or date"
                />
              </label>
            </div>
            <div className="cms-table-wrap cert-table-wrap-modern">
              <table className="cms-table cert-table-fit cert-workflow-table">
                <thead>
                  <tr>
                    <th>Certificate Number</th>
                    <th>Admission Number</th>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Request Date</th>
                    <th className="cert-actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr><td colSpan={7}><Loader label="Loading certificates..." /></td></tr>
                  ) : !actionPageRows.length ? (
                    <tr><td colSpan={7}><div className="cert-empty-state"><div className="cert-empty-icon"><FaAward size={24} aria-hidden="true" /></div><h4>No matching certificates found</h4><p>{workflowQuery.trim() ? "Try a different certificate number, admission number, student, type, status, or date." : workflowStatusFilter === "All" ? "Certificate requests will appear here as they move through the workflow." : `There are no certificates with ${workflowStatusFilter.toLowerCase()} status.`}</p></div></td></tr>
                  ) : actionPageRows.map((row, index) => (
                    <tr key={row.backendId ? `action-row-${row.backendId}-${index}` : `action-row-${row.id || "c"}-${row.number || index}-${index}`}>
                      <td className="cms-strong" title={row.number}>{row.number}</td>
                      <td title={row.admissionNo || "-"}>{row.admissionNo || "-"}</td>
                      <td title={row.student}>{row.student}</td>
                      <td title={row.type}>{row.type}</td>
                      <td><span className={`cert-status-pill ${certStatusClass(row.status)}`}>{row.status}</span></td>
                      <td>{formatDateDdMmYyyy(row.requestDate)}</td>
                      <td>
                        <div className="cms-actions cert-actions-right cert-action-buttons">
                          <button
                            type="button"
                            className="cms-action-btn cert-workflow-step"
                            style={workflowButtonStyle("approve", ["Generated", "Reviewed"].includes(row.status) && hasServerCertificateId(row) && !isRowBusy(row.id))}
                            onClick={() => handleWorkflowChange(row, row.status === "Generated" ? "review" : "approve")}
                            disabled={!(["Generated", "Reviewed"].includes(row.status)) || !hasServerCertificateId(row) || isRowBusy(row.id)}
                            title={row.status === "Generated" ? "Mark as Reviewed" : "Approve Certificate"}
                            aria-label={row.status === "Generated" ? "Mark as Reviewed" : "Approve Certificate"}
                          >
                            <FaCheck size={12} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="cms-action-btn cert-workflow-step cert-workflow-issue"
                            style={workflowButtonStyle("issue", row.status === "Approved" && hasServerCertificateId(row) && !isRowBusy(row.id))}
                            onClick={() => handleWorkflowChange(row, "issue")}
                            disabled={row.status !== "Approved" || !hasServerCertificateId(row) || isRowBusy(row.id)}
                            title="Issue Certificate"
                            aria-label="Issue Certificate"
                          >
                            <FaPaperPlane size={12} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="cms-action-btn cert-workflow-print"
                            title={row.status === "Issued" ? "Print Certificate" : "Print is available after the certificate is issued"}
                            aria-label={row.status === "Issued" ? `Print ${row.number}` : `Print unavailable for ${row.number}`}
                            onClick={() => printCertificate(row)}
                            disabled={row.status !== "Issued" || printingId === row.id || isRowBusy(row.id)}
                          >
                            <FaPrint size={13} aria-hidden="true" />
                          </button>
                          {row.status !== "Cancelled" ? (
                            <button className="cms-action-btn danger" title="Cancel" onClick={() => cancelCertificate(row)} disabled={isRowBusy(row.id) || !hasServerCertificateId(row)}><FaBan size={15} aria-hidden="true" /></button>
                          ) : (
                            <button
                              className="cms-action-btn"
                              title="Reissue Certificate"
                              onClick={() => regenerateCertificate(row)}
                              disabled={isRowBusy(row.id) || !hasServerCertificateId(row)}
                            >
                              <FaRotateLeft size={15} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="cert-table-footer">
              <span>Showing {actionRows.length ? (currentActionPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentActionPage * PAGE_SIZE, actionRows.length)} of {actionRows.length} records</span>
              <nav aria-label="Certificate workflow pagination">
                <button type="button" disabled={currentActionPage === 1} onClick={() => setActionPage((value) => Math.max(1, value - 1))}>Prev</button>
                {Array.from({ length: actionTotalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button type="button" key={pageNumber} className={pageNumber === currentActionPage ? "active" : ""} aria-current={pageNumber === currentActionPage ? "page" : undefined} onClick={() => setActionPage(pageNumber)}>{pageNumber}</button>
                ))}
                <button type="button" disabled={currentActionPage === actionTotalPages} onClick={() => setActionPage((value) => Math.min(actionTotalPages, value + 1))}>Next</button>
              </nav>
            </footer>
          </section>
        ) : null}
      </div>

      {printPreview && printTemplate ? (
        <div className="cert-print-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPrintPreview(null);
        }}>
          <div className="cert-print-shell">
            <div className="cert-print-topbar">
              <strong>{printPreview.status === "Generated" ? "Review Preview" : "Print Preview"} - {printPreview.number}</strong>
              <div className="cert-print-actions">
                {printPreview.status === "Generated" ? (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => handleWorkflowChange(printPreview, "review")}
                    disabled={isRowBusy(printPreview.id) || !hasServerCertificateId(printPreview)}
                    title="Mark as Reviewed"
                    aria-label="Mark as Reviewed"
                  >
                    <FaCheck size={15} aria-hidden="true" />
                    <span>{isRowBusy(printPreview.id, "review") ? "Marking..." : "Mark as Reviewed"}</span>
                  </button>
                ) : null}
                <button type="button" className="cms-action-btn" aria-label="Close print preview" onClick={() => setPrintPreview(null)}>
                  <FaXmark size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="cert-print-body">
              <div className={`visual-certificate-canvas ${getCertificateOrientation(printPreview.type, printPreview.orientation)}`} style={{ backgroundColor: "#ffffff" }}>
                <div className="cert-inner-border" style={{ borderColor: printTemplate.borderColor || "#1e3a8a", borderStyle: "double", borderWidth: "4px" }}>
                  <header className="cert-header">
                    <div className="cert-header-grid">
                      <div className="cert-header-left">
                        <div className="cert-default-logo" style={{ backgroundColor: printTemplate.borderColor || "#1e3a8a" }}>P</div>
                      </div>
                      <div className="cert-header-center">
                        <h1 className="cert-institution-name" style={{ color: printTemplate.borderColor || "#1e3a8a" }}>PIRNAV COLLEGE</h1>
                        <p className="cert-tagline" style={{ color: printTemplate.borderColor || "#b45309" }}>(Intermediate / Junior College)</p>
                        <p className="cert-address">D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh</p>
                      </div>
                      <div className="cert-header-right">
                        <small>Affiliated to</small>
                        <strong>Board of Intermediate Education</strong>
                        <small>Andhra Pradesh (BIEAP)</small>
                        <small>College Code: 12345</small>
                      </div>
                    </div>

                    <div className="cert-ref-row">
                      <span>Ref No: <strong>{printPreview.number}</strong></span>
                      <span>Date: <strong>{formatDateDdMmYyyy(printPreview.issue || printPreview.requestDate || todayIso())}</strong></span>
                    </div>
                  </header>

                  <div className="cert-title-badge">
                    <h2 style={{ backgroundColor: printTemplate.badgeBgColor || printTemplate.borderColor || "#1e3a8a", color: printTemplate.badgeTextColor || "#ffffff" }}>
                      {printTemplate.heading.toUpperCase()}
                    </h2>
                  </div>

                  <div className="cert-body-area">
                    <p className="cert-content-text">{printTemplate.paragraphOne}</p>
                    {printTemplate.paragraphTwo ? (
                      <p className="cert-purpose-text">{printTemplate.paragraphTwo}</p>
                    ) : null}
                    {printPreview.remarks ? <p className="cert-remarks" style={{ marginTop: "10px", fontSize: "13px" }}><strong>Remarks:</strong> {printPreview.remarks}</p> : null}
                  </div>

                  <footer className="cert-footer-area">
                    <div className="cert-footer-col left">
                      <p>Place: <strong>{printPreview.place || "Vijayawada"}</strong></p>
                      <p>Date: <strong>{formatDateDdMmYyyy(printPreview.issue || printPreview.requestDate || todayIso())}</strong></p>
                      {printTemplate.qrEnabled !== false && (
                        <div className="cert-qr-placeholder">
                          <div className="qr-box">QR</div>
                          <span>Scan to verify</span>
                        </div>
                      )}
                    </div>

                    <div className="cert-footer-col center">
                      <div className="cert-seal-stamp" style={{ borderColor: printTemplate.borderColor || "#1e3a8a", color: printTemplate.borderColor || "#1e3a8a" }}>
                        <span>PIRNAV COLLEGE<br/>VIJAYAWADA</span>
                      </div>
                    </div>

                    <div className="cert-footer-col right">
                      <div className="cert-sig-line">
                        {previewSignature && previewSignatureIsImage ? (
                          <img
                            className="certificate-signature"
                            src={previewSignature}
                            alt="Authorized signature"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="sig-handwritten style-cursive-hand">
                            {printTemplate.signatureType || "Principal"} Signature
                          </span>
                        )}
                        <strong className="sig-title">{printTemplate.signatureType || "Principal"}</strong>
                        <small>Pirnav College</small>
                      </div>
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmationDialog}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
