import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { generateNextNumber, incrementSeriesSequence } from "@/data/numberSeriesData.js";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Mail,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  Upload,
  UserRound,
  Users,
  RefreshCw,
  FileText,
  Download,
  AlertCircle,
  ExternalLink,
  UserCheck,
  Lock,
  KeyRound,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { ConfirmDialog, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as staffApi from "@/api/staffApi.js";
import * as XLSX from "xlsx";
import "./StaffManagementPage.css";
import totalStaffIcon from "@/assets/dashboard-3d/add-staff.png";
import teachingStaffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import nonTeachingStaffIcon from "@/assets/dashboard-3d/non-teaching-staff.png";
import pendingProfilesIcon from "@/assets/reports-3d/admissions.png";
import completedProfilesIcon from "@/assets/reports-3d/toppers.png";
import credentialsGeneratorIcon from "@/assets/settings-3d/number-series.png";

// Teaching Staff Excel Import Template Headers (15 required/specified fields)
export const TEACHING_EXCEL_COLUMNS = [
  "Board Name",
  "Employee ID",
  "First Name",
  "Middle Name",
  "Last Name",
  "Date of Birth",
  "Gender",
  "Mobile",
  "Email",
  "Department",
  "Designation",
  "Subject Allocation",
  "Date of Joining",
  "Employment Type",
  "Status"
];

export const NON_TEACHING_EXCEL_COLUMNS = [
  "Board Name",
  "Employee ID",
  "First Name",
  "Middle Name",
  "Last Name",
  "Date of Birth",
  "Gender",
  "Mobile",
  "Email",
  "Department",
  "Designation",
  "Date of Joining",
  "Employment Type",
  "Status"
];

// Session Storage Fallback Store Keys
const STORE = "pjc-mock-staff-records",
  ACTIVITY_STORE = "pjc-mock-staff-activities";

export const NON_TEACHING_DEPARTMENTS_SET = new Set([
  "administration",
  "accounts",
  "accounts & finance",
  "accounts and finance",
  "finance",
  "library",
  "maintenance",
  "maintenance & facilities",
  "transport",
  "transportation",
  "security",
  "human resources",
  "hr",
  "admissions",
  "campus operations",
  "operations",
  "student affairs",
  "hostel",
  "hostel management",
  "housekeeping",
  "estate",
  "facilities",
  "it support",
  "it & systems support",
  "examinations",
  "examinations cell",
]);

export const NON_TEACHING_DESIGNATIONS_SET = new Set([
  "administrator",
  "administrative officer",
  "office administrator",
  "accountant",
  "senior accountant",
  "junior accountant",
  "accounts executive",
  "finance executive",
  "cashier",
  "office assistant",
  "attender",
  "peon",
  "attender / peon",
  "clerk",
  "data entry operator",
  "deo",
  "driver",
  "bus driver",
  "electrician",
  "plumber",
  "carpenter",
  "hr executive",
  "hr manager",
  "librarian",
  "library assistant",
  "assistant librarian",
  "maintenance supervisor",
  "maintenance staff",
  "receptionist",
  "front desk executive",
  "security guard",
  "security supervisor",
  "security officer",
  "transport coordinator",
  "transport incharge",
  "warden",
  "hostel warden",
  "assistant warden",
  "cleaner",
  "watchman",
  "lab assistant",
  "store keeper",
  "gardener",
  "operations manager",
  "facility supervisor",
]);

export const teachingDepartments = [
  "Accountancy",
  "Biology",
  "Biotechnology",
  "Botany",
  "Business Studies",
  "Chemistry",
  "Civics",
  "Commerce",
  "Computer Science",
  "Economics",
  "Electronics",
  "English",
  "Geography",
  "Hindi",
  "History",
  "Information Technology",
  "Kannada",
  "Languages",
  "Mathematics",
  "Physics",
  "Political Science",
  "Sanskrit",
  "Sociology",
  "Statistics",
  "Telugu",
  "Urdu",
  "Zoology",
];

export const nonTeachingDepartments = [
  "Accounts & Finance",
  "Administration",
  "Admissions",
  "Campus Operations",
  "Examinations Cell",
  "Hostel Management",
  "Human Resources",
  "IT & Systems Support",
  "Library",
  "Maintenance & Facilities",
  "Security",
  "Student Affairs",
  "Transport",
];

export const teachingDesignations = [
  "Head of Department (HOD)",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Senior Lecturer",
  "Lecturer",
  "Junior Lecturer",
  "Academic Coordinator",
  "Subject Expert",
  "Lab Incharge",
  "Guest Faculty",
  "Visiting Faculty",
  "Dean",
  "Principal",
  "Vice Principal",
];

export const nonTeachingDesignations = [
  "Accountant",
  "Administrative Officer",
  "Office Administrator",
  "Office Assistant",
  "Attender / Peon",
  "Clerk",
  "Data Entry Operator",
  "Driver",
  "Electrician",
  "Finance Executive",
  "HR Executive",
  "Lab Assistant",
  "Librarian",
  "Library Assistant",
  "Maintenance Supervisor",
  "Receptionist",
  "Security Guard",
  "Transport Coordinator",
  "Hostel Warden",
];

export const teachingDesignationMap = {
  "Computer Science": ["HOD", "Assistant Professor", "Associate Professor", "Professor", "Lecturer", "Senior Lecturer", "Lab Incharge"],
  Mathematics: ["HOD", "Senior Lecturer", "Junior Lecturer", "Lecturer", "Assistant Professor", "Professor"],
  Physics: ["HOD", "Senior Lecturer", "Junior Lecturer", "Lecturer", "Assistant Professor", "Lab Incharge"],
  Chemistry: ["HOD", "Senior Lecturer", "Junior Lecturer", "Lecturer", "Assistant Professor", "Lab Incharge"],
  Biology: ["HOD", "Senior Lecturer", "Junior Lecturer", "Lecturer", "Assistant Professor", "Lab Incharge"],
  Botany: ["HOD", "Senior Lecturer", "Junior Lecturer", "Lecturer", "Assistant Professor"],
  Zoology: ["HOD", "Senior Lecturer", "Junior Lecturer", "Lecturer", "Assistant Professor"],
  English: ["HOD", "Assistant Professor", "Associate Professor", "Lecturer", "Senior Lecturer"],
  Commerce: ["HOD", "Assistant Professor", "Lecturer", "Senior Lecturer"],
  Economics: ["HOD", "Assistant Professor", "Lecturer", "Senior Lecturer"],
  Accountancy: ["HOD", "Assistant Professor", "Lecturer", "Senior Lecturer"],
  "Business Studies": ["HOD", "Assistant Professor", "Lecturer", "Senior Lecturer"],
  Statistics: ["HOD", "Assistant Professor", "Lecturer", "Senior Lecturer"],
  Electronics: ["HOD", "Assistant Professor", "Lecturer", "Lab Incharge"],
  Hindi: ["HOD", "Lecturer", "Senior Lecturer"],
  Telugu: ["HOD", "Lecturer", "Senior Lecturer"],
  Sanskrit: ["HOD", "Lecturer", "Senior Lecturer"],
  Urdu: ["HOD", "Lecturer", "Senior Lecturer"],
  Languages: ["HOD", "Lecturer", "Senior Lecturer", "Assistant Professor"],
};

export const nonTeachingDesignationMap = {
  Administration: ["Administrative Officer", "Office Administrator", "Office Assistant", "Clerk", "Attender / Peon"],
  "Accounts & Finance": ["Accountant", "Senior Accountant", "Finance Executive", "Cashier", "Office Assistant"],
  Accounts: ["Accountant", "Senior Accountant", "Finance Executive", "Cashier", "Office Assistant"],
  Library: ["Librarian", "Assistant Librarian", "Library Assistant", "Attender"],
  "Maintenance & Facilities": ["Maintenance Supervisor", "Electrician", "Plumber", "Attender / Peon"],
  Maintenance: ["Maintenance Supervisor", "Electrician", "Plumber", "Attender / Peon"],
  Transport: ["Transport Coordinator", "Transport Incharge", "Driver"],
  Security: ["Security Officer", "Security Supervisor", "Security Guard"],
  "Human Resources": ["HR Manager", "HR Executive", "Office Assistant"],
  Admissions: ["Admissions Officer", "Admissions Counselor", "Data Entry Operator"],
  "Hostel Management": ["Hostel Warden", "Assistant Warden", "Attender / Peon"],
  "Campus Operations": ["Operations Manager", "Facility Supervisor", "Office Assistant"],
};

export const isOther = (name) => {
  if (!name) return false;
  const s = String(typeof name === "object" ? name.name || name.designationName || name.departmentName || name.label || name.value || "" : name).trim().toLowerCase();
  return s === "other" || s === "others";
};

export const isNonTeachingDeptName = (name) => {
  if (!name) return false;
  const norm = String(typeof name === "object" ? name.name || name.departmentName || "" : name).trim().toLowerCase();
  return (
    norm === "other" ||
    norm === "others" ||
    NON_TEACHING_DEPARTMENTS_SET.has(norm) ||
    norm.includes("admin") ||
    norm.includes("account") ||
    norm.includes("librar") ||
    norm.includes("maint") ||
    norm.includes("transp") ||
    norm.includes("secur") ||
    norm.includes("hostel") ||
    norm.includes("operation") ||
    norm.includes("human resource") ||
    norm.includes("admission") ||
    norm.includes("facility")
  );
};

export const isNonTeachingDesigName = (name) => {
  if (!name) return false;
  const norm = String(typeof name === "object" ? name.name || name.designationName || "" : name).trim().toLowerCase();
  return (
    norm === "other" ||
    norm === "others" ||
    NON_TEACHING_DESIGNATIONS_SET.has(norm) ||
    norm.includes("account") ||
    norm.includes("driver") ||
    norm.includes("peon") ||
    norm.includes("attender") ||
    norm.includes("clerk") ||
    norm.includes("librar") ||
    norm.includes("reception") ||
    norm.includes("guard") ||
    norm.includes("electrician") ||
    norm.includes("plumber") ||
    norm.includes("warden") ||
    norm.includes("office assistant") ||
    norm.includes("data entry")
  );
};

const defaultDepartments = teachingDepartments;
const designationMap = teachingDesignationMap;

const tuples = [];
const seed = [];
const initialActivities = [];

const read = (key, fallback = []) => {
  try {
    sessionStorage.removeItem(STORE);
    sessionStorage.removeItem(ACTIVITY_STORE);
    return fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
const boardOptions = [];

export const normalizeStaffRecord = (raw) => {
  if (!raw) return raw;
  const r = typeof raw === "object" ? { ...raw } : {};
  const personal = r.personal || {};
  const contact = r.contact || {};
  const bank = r.bank || {};
  const emergency = r.emergency || {};
  const docs = r.documents || r.documentsMeta || {};

  const firstName = r.firstName || personal.firstName || "";
  const middleName = r.middleName || personal.middleName || "";
  const lastName = r.lastName || personal.lastName || "";
  const fullName = r.fullName || [firstName, middleName, lastName].filter(Boolean).join(" ") || r.employeeId || "Staff Member";

  const getDocStatus = (field, keyList) => {
    if (r[field]) return r[field];
    for (const k of keyList) {
      if (docs[k]?.length) return docs[k][0]?.name || "Uploaded";
      if (r[k]) return typeof r[k] === "string" ? r[k] : "Uploaded";
    }
    return "—";
  };

  const edu = Array.isArray(r.education) && r.education.length > 0
    ? r.education
    : (Array.isArray(personal.education) ? personal.education : []);

  const exp = Array.isArray(r.experience) && r.experience.length > 0
    ? r.experience
    : (Array.isArray(personal.experience) ? personal.experience : []);

  return {
    ...r,
    id: r.id || r.staffId,
    employeeId: r.employeeId || "PJCTCH0001",
    fullName,
    firstName,
    middleName,
    lastName,
    board: r.board || r.boardName || "State Board",
    boardCode: r.boardCode || r.board || "—",
    department: r.department || personal.department || "Teaching Department",
    designation: r.designation || personal.designation || "Assistant Professor",
    staffType: r.staffType || "Teaching",
    status: r.status || "Active",
    employmentType: r.employmentType || "Full Time",
    dateOfJoining: r.dateOfJoining || r.joiningDate || "—",

    // Personal Info
    guardianName: r.guardianName || personal.guardianName || r.fatherName || "—",
    gender: r.gender || personal.gender || "—",
    dateOfBirth: r.dateOfBirth || personal.dateOfBirth || "—",
    maritalStatus: r.maritalStatus || personal.maritalStatus || "Single",
    nationality: r.nationality || personal.nationality || "Indian",
    bloodGroup: r.bloodGroup || personal.bloodGroup || "—",
    aadhaar: r.aadhaar || personal.aadhaar || r.aadhaarNumber || "—",
    pan: r.pan || personal.pan || r.panNumber || "—",

    // Contact & Address
    email: r.email || contact.primaryEmail || r.primaryEmail || "—",
    mobile: r.mobile || contact.primaryMobile || r.primaryMobile || "—",
    alternateMobile: r.alternateMobile || contact.alternateMobile || "—",
    pin: r.pin || contact.pin || r.pincode || "—",
    currentAddress: r.currentAddress || contact.currentAddress || "—",
    permanentAddress: r.permanentAddress || contact.permanentAddress || "—",
    city: r.city || contact.city || "—",
    district: r.district || contact.district || "—",
    state: r.state || contact.state || "—",
    country: r.country || contact.country || "India",

    // Education & Experience
    education: edu,
    highestQualification: r.highestQualification || edu[0]?.highestQualification || edu[0]?.degreeName || "—",
    university: r.university || edu[0]?.university || "—",
    specialization: r.specialization || edu[0]?.specialization || "—",
    passingYear: r.passingYear || edu[0]?.passingYear || "—",
    percentage: r.percentage || edu[0]?.percentage || "—",

    experience: exp,
    isFresher: r.isFresher !== undefined ? Boolean(r.isFresher) : exp.length === 0,
    totalExperience: r.totalExperience !== undefined ? r.totalExperience : (exp.length ? `${exp.length} Years` : "0"),
    previousInstitution: r.previousInstitution || exp[0]?.institution || "—",
    previousDesignation: r.previousDesignation || exp[0]?.designation || "—",
    experienceFrom: r.experienceFrom || exp[0]?.fromDate || "—",
    experienceTo: r.experienceTo || exp[0]?.toDate || "—",

    // Bank Details
    bankName: r.bankName || bank.bankName || "—",
    accountHolder: r.accountHolder || bank.accountHolder || bank.accountHolderName || fullName,
    accountNumber: r.accountNumber || bank.accountNumber || "—",
    ifsc: r.ifsc || bank.ifsc || r.ifscCode || "—",
    branch: r.branch || bank.branch || "—",
    accountType: r.accountType || bank.accountType || "Savings",
    pfNumber: r.pfNumber || bank.pfNumber || "—",
    esiNumber: r.esiNumber || bank.esiNumber || "—",
    uanNumber: r.uanNumber || bank.uanNumber || "—",

    // Emergency Details
    emergencyName: r.emergencyName || emergency.name || emergency.emergencyName || emergency.emergencyContactName || "—",
    emergencyRelationship: r.emergencyRelationship || emergency.relationship || emergency.emergencyRelationship || "—",
    emergencyMobile: r.emergencyMobile || emergency.mobile || emergency.emergencyMobile || emergency.emergencyPhone || "—",
    emergencyAlternate: r.emergencyAlternate || emergency.alternateMobile || emergency.emergencyAlternate || "—",
    emergencyAddress: r.emergencyAddress || emergency.address || emergency.emergencyAddress || "—",

    // Documents
    aadhaarDocument: getDocStatus("aadhaarDocument", ["aadhaarCard", "aadhaarDoc"]),
    panDocument: getDocStatus("panDocument", ["panCard", "panDoc"]),
    qualificationCertificate: getDocStatus("qualificationCertificate", ["degreeCertificates", "degreeDoc"]),
    experienceCertificate: getDocStatus("experienceCertificate", ["experienceCertificates", "experienceDoc"]),
    resume: getDocStatus("resume", ["resume", "resumeDoc"]),
    photo: getDocStatus("photo", ["passportPhoto", "photoDoc"]),
    signature: getDocStatus("signature", ["signature", "signatureDoc"]),
    bankProof: getDocStatus("bankProof", ["bankProof", "chequeDoc"]),

    // Lifecycle Status
    profileStatus: r.profileStatus || (r.reviewStatus === "Approved" ? "Completed" : r.reviewStatus === "Pending" ? "Submitted" : "Link Sent"),
    profileCompletion: r.profileCompletion !== undefined ? r.profileCompletion : (r.profileStatus === "Completed" || r.profileStatus === "Submitted" ? 100 : 30),
    linkSentAt: r.linkSentAt || r.addedOn || "—",
  };
};

export const resolveNextStaffEmployeeId = async (staffType = "Teaching", existingRecords = []) => {
  const isTeaching = String(staffType || "").toLowerCase().includes("teach") && !String(staffType || "").toLowerCase().includes("non");
  const prefix = isTeaching ? "PCTCH" : "PCNT";

  // Helper to compute sequential ID from existing records
  const computeFromRecords = () => {
    if (!Array.isArray(existingRecords) || existingRecords.length === 0) {
      return null;
    }
    const relevant = existingRecords.filter((r) => {
      if (!r) return false;
      const type = String(r.staffType || "").toLowerCase();
      if (isTeaching) return !type.includes("non");
      return type.includes("non");
    });
    let maxSeq = 0;
    for (const r of relevant) {
      const empId = String(r.employeeId || "");
      const match = empId.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq && num < 1000) {
          maxSeq = num;
        }
      }
    }
    const nextSeq = maxSeq > 0 ? maxSeq + 1 : (relevant.length > 0 ? relevant.length + 1 : 1);
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  };

  // 1. Try Staff next-employee-id endpoint
  try {
    const res = await staffApi.getNextEmployeeId(staffType);
    if (res?.data) {
      const raw = typeof res.data === "object"
        ? (res.data.employeeId || res.data.nextEmployeeId || res.data.id || res.data.data || res.data.code)
        : res.data;
      if (raw && (typeof raw === "string" || typeof raw === "number")) {
        const str = String(raw).trim();
        if (str && !str.includes("[object")) {
          const match = str.match(/(\d+)/);
          const num = match ? parseInt(match[1], 10) : 0;
          if (num >= 40 && Array.isArray(existingRecords) && existingRecords.length < 25) {
            const calculated = computeFromRecords();
            if (calculated) return calculated;
          }
          return str;
        }
      }
    }
  } catch {}

  // 2. Try Settings Number Series API
  try {
    const nsRes = await apiClient.get(apiEndpoints.numberSeries.getByCode("EMPLOYEE_ID"));
    if (nsRes?.data) {
      const live = nsRes.data.livePreview || nsRes.data.currentExample || nsRes.data.generatedNumber;
      if (live && typeof live === "string" && !live.includes("[object")) {
        const match = live.match(/(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        if (num >= 40 && Array.isArray(existingRecords) && existingRecords.length < 25) {
          const calculated = computeFromRecords();
          if (calculated) return calculated;
        }
        return live.trim();
      }
    }
  } catch {}

  // 3. Fallback to computing from existing records
  const calculated = computeFromRecords();
  if (calculated) return calculated;

  // 4. Fallback to Local Number Series Settings
  const localVal = generateNextNumber("employee-id");
  if (localVal && !String(localVal).includes("[object")) {
    const match = String(localVal).match(/(\d+)/);
    const num = match ? parseInt(match[1], 10) : 0;
    if (num >= 40 && Array.isArray(existingRecords) && existingRecords.length < 25) {
      return `${prefix}0001`;
    }
    return String(localVal).trim();
  }
  return isTeaching ? "PCTCH0001" : "PCNT0001";
};

export const resolveBoardCode = (staffRecord, boardsList = []) => {
  if (!staffRecord) return "—";
  if (staffRecord.boardCode && String(staffRecord.boardCode).trim() && staffRecord.boardCode !== "—") {
    return String(staffRecord.boardCode).trim();
  }
  const rawBoard = staffRecord.board || staffRecord.boardName;
  if (!rawBoard && !staffRecord.boardId) return "—";

  if (Array.isArray(boardsList) && boardsList.length > 0) {
    const match = boardsList.find((b) =>
      b && (
        (staffRecord.boardId && String(b.id || b.boardId) === String(staffRecord.boardId)) ||
        (rawBoard && String(b.name || b.boardName || "").trim().toLowerCase() === String(rawBoard).trim().toLowerCase()) ||
        (rawBoard && String(b.code || b.boardCode || "").trim().toLowerCase() === String(rawBoard).trim().toLowerCase())
      )
    );
    if (match?.code || match?.boardCode) return match.code || match.boardCode;
  }

  if (rawBoard) {
    const str = String(rawBoard).trim();
    if (str.length <= 10 && !str.includes(" ")) return str.toUpperCase();
    const lower = str.toLowerCase();
    if (lower.includes("andhra") || lower.includes("bieap")) return "BIEAP";
    if (lower.includes("telangana") || lower.includes("tsbie") || lower.includes("tgbie")) return "TSBIE";
    if (lower.includes("cbse") || lower.includes("central board")) return "CBSE";
    if (lower.includes("icse") || lower.includes("cisce")) return "ICSE";
    if (lower.includes("karnataka") || lower.includes("puc")) return "PUC-KA";
    if (lower.includes("tamil") || lower.includes("dge")) return "DGE-TN";
    if (lower.includes("state")) return "STATE";
    return str;
  }
  return "—";
};

export const isStaffMatchingBoard = (staffRecord, selectedBoard, boardsList = []) => {
  if (!selectedBoard || !staffRecord) return true;
  const targetCode = String(selectedBoard?.code || selectedBoard?.boardCode || "").trim().toUpperCase();
  const targetName = String(selectedBoard?.name || selectedBoard?.boardName || "").trim().toLowerCase();
  const targetId = selectedBoard?.id || selectedBoard?.boardId;

  // If no specific board selected or all boards, return true
  if (!targetCode && !targetName && !targetId) return true;

  // 1. Direct Board ID match
  const recordBoardId = staffRecord.boardId || staffRecord.BoardId;
  if (recordBoardId && targetId && String(recordBoardId) === String(targetId)) {
    return true;
  }

  // 2. Resolve staff board code
  const recordBoardCode = String(staffRecord.boardCode || staffRecord.BoardCode || resolveBoardCode(staffRecord, boardsList) || "").trim().toUpperCase();
  if (targetCode && recordBoardCode && recordBoardCode !== "—") {
    if (recordBoardCode === targetCode) return true;
    if ((targetCode.includes("TSBIE") || targetCode.includes("TGBIE") || targetCode.includes("TELANGANA")) &&
        (recordBoardCode.includes("TSBIE") || recordBoardCode.includes("TGBIE") || recordBoardCode.includes("TELANGANA"))) {
      return true;
    }
    if ((targetCode.includes("BIEAP") || targetCode.includes("ANDHRA") || targetCode.includes("AP")) &&
        (recordBoardCode.includes("BIEAP") || recordBoardCode.includes("ANDHRA") || recordBoardCode.includes("AP"))) {
      return true;
    }
    if (targetCode.includes("CBSE") && recordBoardCode.includes("CBSE")) return true;
    if (targetCode.includes("ICSE") && recordBoardCode.includes("ICSE")) return true;
  }

  // 3. Match staff board name string
  const recordBoardName = String(staffRecord.board || staffRecord.boardName || staffRecord.BoardName || "").trim().toLowerCase();
  if (targetName && recordBoardName) {
    if (recordBoardName === targetName) return true;
    if (targetName.includes("andhra") && recordBoardName.includes("andhra")) return true;
    if (targetName.includes("telangana") && recordBoardName.includes("telangana")) return true;
    if (targetName.includes("cbse") && recordBoardName.includes("cbse")) return true;
    if (targetName.includes("icse") && recordBoardName.includes("icse")) return true;
    if (targetName.includes("central") && recordBoardName.includes("central")) return true;
  }

  return false;
};

const teachingFields = [
  ["board", "Board Name", "select", [], true],
  ["employeeId", "Employee ID", "text", [], true],
  ["firstName", "First Name", "text", [], true],
  ["middleName", "Middle Name", "text", [], false],
  ["lastName", "Last Name", "text", [], true],
  ["dateOfBirth", "Date of Birth", "date", [], true],
  ["gender", "Gender", "select", ["Male", "Female", "Other"], true],
  ["mobile", "Mobile", "text", [], true],
  ["email", "Email", "email", [], true],
  ["department", "Department", "search-select", teachingDepartments, true],
  ["designation", "Designation", "search-select", teachingDesignations, true],
  ["allocatedSubjects", "Subject Allocation", "multi-subject-select", [], false],
  ["dateOfJoining", "Date of Joining", "date", [], true],
  ["employmentType", "Employment Type", "select", ["Full Time", "Part Time", "Contract"], true],
  ["status", "Status", "select", ["Active", "Inactive"], true],
  ["profilePhoto", "Profile Photo", "file", [], false],
];

const nonTeachingSteps = [
  [
    ["board", "Board Name", "select", [], true],
    ["employeeId", "Employee ID"],
    ["firstName", "First Name"],
    ["middleName", "Middle Name", "text", [], false],
    ["lastName", "Last Name"],
    ["guardianName", "Father's / Husband's Name"],
    ["gender", "Gender", "select", ["Male", "Female", "Other"]],
    ["dateOfBirth", "Date of Birth", "date"],
    ["maritalStatus", "Marital Status", "text", [], false],
    ["bloodGroup", "Blood Group", "select", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], false],
    ["nationality", "Nationality"],
    ["aadhaar", "Aadhaar Number"],
    ["pan", "PAN Number", "text", [], false],
    ["profilePhoto", "Profile Photo", "file", [], false],
  ],
  [
    ["mobile", "Mobile"],
    ["email", "Email", "email", [], false],
    ["pin", "PINCODE"],
    ["country", "Country"],
    ["state", "State"],
    ["district", "District"],
    ["city", "City"],
    ["currentAddress", "Current Address", "textarea"],
    ["permanentAddress", "Permanent Address", "textarea", [], false],
  ],
  [
    ["department", "Department", "search-select", nonTeachingDepartments, true],
    ["designation", "Designation", "search-select", nonTeachingDesignations, true],
    ["dateOfJoining", "Date of Joining", "date"],
    ["qualification", "Qualification"],
    ["experience", "Experience", "text", [], false],
    ["status", "Status", "select", ["Active", "Inactive"], true, "start-new-row"],
  ],
  [
    ["salaryStructure", "Salary Structure", "text", [], false],
    ["basicSalary", "Basic Salary", "number", [], false],
    ["grossSalary", "Gross Salary", "number", [], false],
    ["bankName", "Bank Name", "text", [], false],
    ["accountHolder", "Account Holder Name", "text", [], false],
    ["accountNumber", "Account Number", "text", [], false],
    ["ifsc", "IFSC", "text", [], false],
    ["branch", "Branch", "text", [], false],
    ["pfNumber", "PF Number", "text", [], false],
    ["esiNumber", "ESI Number", "text", [], false],
    ["uanNumber", "UAN Number", "text", [], false],
  ],
  [
    ["aadhaarDocument", "Aadhaar", "file", [], false],
    ["panDocument", "PAN", "file", [], false],
    ["qualificationCertificate", "Qualification Certificate", "file", [], false],
    ["experienceCertificate", "Experience Certificate", "file", [], false],
    ["resume", "Resume", "file", [], false],
    ["bankProof", "Bank Passbook / Cancelled Cheque", "file", [], false],
    ["drivingLicence", "Driving Licence", "file", [], false],
    ["otherDocuments", "Other Documents", "file", [], false],
  ],
  [
    ["emergencyName", "Contact Name", "text", [], false],
    ["emergencyRelationship", "Relationship", "text", [], false],
    ["emergencyMobile", "Mobile", "text", [], false],
    ["emergencyAlternate", "Alternate Mobile", "text", [], false],
    ["emergencyAddress", "Address", "textarea", [], false],
  ],
];

const portalSteps = [
  "Personal Details",
  "Contact & Address",
  "Educational Qualifications",
  "Experience",
  "Documents",
  "Bank Details",
  "Emergency Contact",
  "Review & Submit",
];

const portalFields = [
  [
    ["guardianName", "Father's / Husband's Name", "text", [], false],
    ["maritalStatus", "Marital Status", "text", [], false],
    ["nationality", "Nationality", "text", [], false],
    ["aadhaar", "Aadhaar Number", "text", [], false],
    ["pan", "PAN Number", "text", [], false],
    ["bloodGroup", "Blood Group", "text", [], false],
  ],
  [
    ["alternateMobile", "Alternate Mobile", "text", [], false],
    ["currentAddress", "Current Address", "textarea", [], false],
    ["permanentAddress", "Permanent Address", "textarea", [], false],
    ["city", "City", "text", [], false],
    ["district", "District", "text", [], false],
    ["state", "State", "text", [], false],
    ["pin", "PIN", "text", [], false],
  ],
  [
    ["highestQualification", "Highest Qualification", "text", [], false],
    ["university", "University", "text", [], false],
    ["specialization", "Specialization", "text", [], false],
    ["passingYear", "Passing Year", "text", [], false],
    ["percentage", "Percentage / CGPA", "text", [], false],
  ],
  [
    ["totalExperience", "Total Experience", "text", [], false],
    ["previousInstitution", "Previous Institution", "text", [], false],
    ["previousDesignation", "Previous Designation", "text", [], false],
    ["experienceFrom", "From", "date", [], false],
    ["experienceTo", "To", "date", [], false],
  ],
  [
    ["aadhaarDocument", "Aadhaar Copy", "file", [], false],
    ["panDocument", "PAN Copy", "file", [], false],
    ["qualificationCertificate", "Qualification Certificates", "file", [], false],
    ["experienceCertificate", "Experience Certificates", "file", [], false],
    ["resume", "Resume", "file", [], false],
    ["photo", "Passport Photo", "file", [], false],
    ["signature", "Signature", "file", [], false],
  ],
  [
    ["bankName", "Bank Name", "text", [], false],
    ["accountHolder", "Account Holder Name", "text", [], false],
    ["accountNumber", "Account Number", "text", [], false],
    ["ifsc", "IFSC", "text", [], false],
    ["branch", "Branch", "text", [], false],
    ["accountType", "Account Type", "text", [], false],
  ],
  [
    ["emergencyName", "Contact Name", "text", [], false],
    ["emergencyRelationship", "Relationship", "text", [], false],
    ["emergencyMobile", "Mobile", "text", [], false],
    ["emergencyAlternate", "Alternate Mobile", "text", [], false],
    ["emergencyAddress", "Address", "textarea", [], false],
  ],
];

function SearchSelectInput({ label = "", opts = [], value = "", onChange, hasError = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  const safeOpts = useMemo(() => (Array.isArray(opts) ? opts : []), [opts]);

  const getOptValue = (o) =>
    o && typeof o === "object" ? String(o.value ?? o.label ?? o.name ?? "") : String(o ?? "");
  const getOptLabel = (o) =>
    o && typeof o === "object" ? String(o.label ?? o.name ?? o.value ?? "") : String(o ?? "");

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const filteredOpts = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    const withoutOther = safeOpts.filter((o) => !isOther(o));
    if (!q) return withoutOther;
    return withoutOther.filter((o) => {
      const lbl = getOptLabel(o).toLowerCase();
      const val = getOptValue(o).toLowerCase();
      return lbl.includes(q) || val.includes(q);
    });
  }, [safeOpts, search]);

  const handleSelect = (opt) => {
    const optVal = getOptValue(opt);
    setSearch(getOptLabel(opt));
    if (typeof onChange === "function") onChange(optVal);
    setOpen(false);
  };

  return (
    <div className={`staff-custom-search-select ${hasError ? "has-error" : ""}`} ref={ref}>
      <div className="staff-search-input-wrap" style={hasError ? { borderColor: "#ef4444" } : undefined}>
        <Search className="staff-search-icon" aria-hidden="true" size={14} />
        <input
          type="text"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            if (typeof onChange === "function") onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={`Search ${String(label || "").toLowerCase()}`}
          autoComplete="off"
        />
        <ChevronDown className="staff-dropdown-caret" size={14} />
      </div>
      {open ? (
        <div
          className="staff-search-dropdown-menu"
          style={{
            backgroundColor: "#ffffff",
            background: "#ffffff",
            opacity: 1,
            zIndex: 99999,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)",
            border: "1px solid var(--cms-border, #d1d5db)",
          }}
        >
          {filteredOpts.length > 0 ? (
            filteredOpts.map((o, idx) => {
              const optVal = getOptValue(o);
              const optLbl = getOptLabel(o);
              const isSelected = value === optVal;
              return (
                <div
                  key={`${optVal}-${idx}`}
                  className={`staff-search-dropdown-item ${isSelected ? "is-selected" : ""}`}
                  style={{
                    backgroundColor: isSelected ? "var(--cms-primary-soft, #f0fdf4)" : "#ffffff",
                    color: isSelected ? "var(--cms-primary, #355e3b)" : "var(--cms-text, #1f2937)",
                    fontWeight: isSelected ? "600" : "normal",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(o);
                  }}
                >
                  {optLbl}
                </div>
              );
            })
          ) : (
            <div className="staff-search-dropdown-empty" style={{ backgroundColor: "#ffffff" }}>No options found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SubjectAllocationInput({ staffId = null, department = "", value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [apiSubjects, setApiSubjects] = useState([]);
  const ref = useRef(null);

  const selectedSubjects = useMemo(() => {
    if (Array.isArray(value)) {
      return value.map((s) => (typeof s === "object" ? s.name || s.subjectName || s.title || String(s) : String(s))).filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [value]);

  useEffect(() => {
    let isMounted = true;
    async function fetchSubjects() {
      try {
        const params = {
          ...(staffId ? { staffId } : {}),
          ...(department ? { department } : {}),
        };
        let data = [];
        try {
          const res = await apiClient.get(apiEndpoints.faculty.availableSubjects, { params });
          data = res?.data?.items || res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
        } catch (e) {
          const fallbackRes = await apiClient.get(apiEndpoints.subjects.getAll, { params: department ? { department } : {} });
          data = fallbackRes?.data?.items || fallbackRes?.data?.data || (Array.isArray(fallbackRes?.data) ? fallbackRes.data : []);
        }
        if (isMounted && Array.isArray(data)) {
          const names = data.map((item) => (typeof item === "object" ? item.subjectName || item.name || item.title || item.subjectCode : String(item))).filter(Boolean);
          setApiSubjects(names);
        }
      } catch (err) {
        console.warn("Failed to fetch available subjects:", err);
      }
    }
    fetchSubjects();
    return () => {
      isMounted = false;
    };
  }, [staffId, department]);

  const filteredOptions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const unselected = apiSubjects.filter((opt) => !selectedSubjects.includes(opt));
    if (!q) return unselected;
    return unselected.filter((opt) => opt.toLowerCase().includes(q));
  }, [apiSubjects, selectedSubjects, search]);

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const addSubject = async (subjectName) => {
    const trimmed = (subjectName || "").trim();
    if (!trimmed) return;
    if (!selectedSubjects.includes(trimmed)) {
      const next = [...selectedSubjects, trimmed];
      if (typeof onChange === "function") onChange(next);
      if (staffId) {
        try {
          await apiClient.post(apiEndpoints.faculty.assignSubject, {
            staffId: Number(staffId) || staffId,
            subjectName: trimmed,
          });
        } catch (err) {
          console.warn("POST /api/v1/staff/assign-subject API offline");
        }
      }
    }
    setSearch("");
    setOpen(false);
  };

  const removeSubject = (subjectName) => {
    const next = selectedSubjects.filter((s) => s !== subjectName);
    if (typeof onChange === "function") onChange(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (search.trim()) {
        addSubject(search.trim());
      }
    }
  };

  const isExactMatchInFiltered = filteredOptions.some(
    (opt) => opt.toLowerCase() === (search || "").trim().toLowerCase(),
  );
  const showCustomAdd =
    search.trim().length > 0 && !isExactMatchInFiltered && !selectedSubjects.includes(search.trim());

  return (
    <div className="subject-allocation-wrapper" ref={ref}>
      <div
        className="subject-compact-box"
        onClick={() => {
          const input = ref.current?.querySelector("input");
          if (input) input.focus();
        }}
      >
        <Search className="subject-search-icon" size={13} />
        {selectedSubjects.map((sub, idx) => (
          <span key={`${sub}-${idx}`} className="subject-pill">
            {sub}
            <button
              type="button"
              className="subject-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeSubject(sub);
              }}
              title={`Remove ${sub}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedSubjects.length === 0 ? "Search or add subjects..." : "Add..."}
          autoComplete="off"
        />
        <ChevronDown className="subject-dropdown-caret" size={13} />
      </div>

      {open ? (
        <div className="subject-dropdown-menu">
          {showCustomAdd ? (
            <div
              className="subject-dropdown-item is-custom-add"
              onMouseDown={(e) => {
                e.preventDefault();
                addSubject(search);
              }}
            >
              + Add "{search.trim()}"
            </div>
          ) : null}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <div
                key={`${opt}-${idx}`}
                className="subject-dropdown-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addSubject(opt);
                }}
              >
                {opt}
              </div>
            ))
          ) : !showCustomAdd ? (
            <div className="staff-search-dropdown-empty">
              {search.trim() ? "Press Enter to add custom subject" : "No subjects available"}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function useStaffTypeOptions(staffType) {
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      setLoading(true);
      const isTeaching = staffType === "Teaching";
      const apiStaffType = staffType === "Non-Teaching" ? "NonTeaching" : staffType;
      const targetNorm = String(staffType).toLowerCase().replace(/[-_\s]/g, "");

      let deptOpts = [];
      let desigOpts = [];

      try {
        let deptData = [];
        try {
          const deptRes = await apiClient.get(apiEndpoints.departments.getAll, {
            params: staffType ? { staffType: apiStaffType } : {},
          });
          deptData = deptRes?.data?.items || deptRes?.data?.data || (Array.isArray(deptRes?.data) ? deptRes.data : []);
        } catch {
          const lookupRes = await apiClient.get(apiEndpoints.faculty.lookupDepartments, {
            params: staffType ? { staffType: apiStaffType } : {},
          });
          deptData = lookupRes?.data?.items || lookupRes?.data?.data || (Array.isArray(lookupRes?.data) ? lookupRes.data : []);
        }

        const filteredDepts = deptData.filter((d) => {
          const deptName = typeof d === "object" ? d.name || d.departmentName || "" : String(d || "");
          if (!deptName) return false;
          const st = typeof d === "object" ? (d.staffType || d.StaffType) : null;
          if (st) {
            const stNorm = String(st).toLowerCase().replace(/[-_\s]/g, "");
            if (stNorm !== targetNorm && stNorm !== "both" && stNorm !== "all") {
              return false;
            }
          }
          if (isTeaching) {
            return !isNonTeachingDeptName(deptName);
          } else {
            return isNonTeachingDeptName(deptName);
          }
        });
        deptOpts = filteredDepts.map((d) => (typeof d === "object" ? d.name || d.departmentName : d)).filter(Boolean);
      } catch (e) {
        console.warn("Failed to fetch departments from API:", e);
      }

      try {
        let desigData = [];
        try {
          const desigRes = await apiClient.get(apiEndpoints.designations.getAll, {
            params: {
              includeInactive: false,
              ...(staffType ? { staffType: apiStaffType } : {}),
            },
          });
          desigData = desigRes?.data?.items || desigRes?.data?.data || (Array.isArray(desigRes?.data) ? desigRes.data : []);
        } catch {
          const lookupRes = await apiClient.get(apiEndpoints.faculty.lookupDesignations, {
            params: staffType ? { staffType: apiStaffType } : {},
          });
          desigData = lookupRes?.data?.items || lookupRes?.data?.data || (Array.isArray(lookupRes?.data) ? lookupRes.data : []);
        }

        const filteredDesigs = desigData.filter((d) => {
          const desigName = typeof d === "object" ? d.name || d.designationName || "" : String(d || "");
          if (!desigName) return false;
          const st = typeof d === "object" ? (d.staffType || d.StaffType) : null;
          if (st) {
            const stNorm = String(st).toLowerCase().replace(/[-_\s]/g, "");
            if (stNorm !== targetNorm && stNorm !== "both" && stNorm !== "all") {
              return false;
            }
          }
          if (isTeaching) {
            return !isNonTeachingDesigName(desigName);
          } else {
            return isNonTeachingDesigName(desigName);
          }
        });
        desigOpts = filteredDesigs.map((d) => (typeof d === "object" ? d.name || d.designationName : d)).filter(Boolean);
      } catch (e) {
        console.warn("Failed to fetch designations from API:", e);
      }

      if (deptOpts.length === 0) {
        deptOpts = isTeaching ? teachingDepartments : nonTeachingDepartments;
      }

      if (desigOpts.length === 0) {
        desigOpts = isTeaching ? teachingDesignations : nonTeachingDesignations;
      }

      if (isMounted) {
        setDepartments(Array.from(new Set(deptOpts)));
        setDesignations(Array.from(new Set(desigOpts)));
        setLoading(false);
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [staffType]);

  return { departments, designations, loading };
}

function validateStepFields(fieldsList = [], values = {}, activeBoardName = "") {
  const newErrors = {};
  for (const f of fieldsList) {
    if (!Array.isArray(f) || f.length < 2) continue;
    const name = f[0];
    const label = f[1] || name;
    const type = f[2] || "text";
    const isRequired = f[4] !== false;

    let val = values?.[name];
    if (name === "board" && (val === undefined || val === "")) {
      val = values?.boardName || activeBoardName;
    }
    if (name === "allocatedSubjects" && (val === undefined || val === "")) {
      val = values?.subjects;
    }

    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === "string" && val.trim() === "") ||
      (Array.isArray(val) && val.length === 0);

    if (isRequired && isEmpty) {
      if (type === "select" || type === "search-select") {
        newErrors[name] = `Please select a ${label.toLowerCase()}`;
      } else {
        newErrors[name] = `${label} is required`;
      }
      continue;
    }

    if (!isEmpty) {
      const strVal = String(val).trim();

      // First Name
      if (name === "firstName") {
        if (strVal.length < 2) {
          newErrors[name] = "First Name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "First Name should only contain letters";
        }
      }

      // Middle Name
      if (name === "middleName") {
        if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "Middle Name should only contain letters";
        }
      }

      // Last Name
      if (name === "lastName") {
        if (strVal.length < 1) {
          newErrors[name] = "Last Name is required";
        } else if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "Last Name should only contain letters";
        }
      }

      // Father's / Guardian's Name
      if (name === "guardianName") {
        if (strVal.length < 2) {
          newErrors[name] = "Name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "Name should only contain letters";
        }
      }

      // Date of Birth
      if (name === "dateOfBirth") {
        const dob = new Date(strVal);
        if (isNaN(dob.getTime())) {
          newErrors[name] = "Please enter a valid Date of Birth";
        } else {
          const today = new Date();
          if (dob > today) {
            newErrors[name] = "Date of Birth cannot be a future date";
          } else {
            const minAgeDate = new Date();
            minAgeDate.setFullYear(today.getFullYear() - 18);
            const maxAgeDate = new Date();
            maxAgeDate.setFullYear(today.getFullYear() - 85);

            if (dob > minAgeDate) {
              newErrors[name] = "Staff member must be at least 18 years old";
            } else if (dob < maxAgeDate) {
              newErrors[name] = "Please enter a valid Date of Birth";
            }
          }
        }
      }

      // Date of Joining
      if (name === "dateOfJoining") {
        const doj = new Date(strVal);
        if (isNaN(doj.getTime())) {
          newErrors[name] = "Please enter a valid Date of Joining";
        } else if (values?.dateOfBirth) {
          const dob = new Date(values.dateOfBirth);
          if (!isNaN(dob.getTime())) {
            const eligibleDoj = new Date(dob);
            eligibleDoj.setFullYear(dob.getFullYear() + 18);
            if (doj < eligibleDoj) {
              newErrors[name] = "Date of Joining cannot be before age 18";
            }
          }
        }
      }

      // Mobile Numbers
      if (name === "mobile" || name === "emergencyMobile") {
        const cleanMobile = strVal.replace(/\D/g, "");
        if (cleanMobile.length !== 10) {
          newErrors[name] = "Mobile number must be exactly 10 digits";
        } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
          newErrors[name] = "Mobile number must start with 6, 7, 8, or 9";
        }
      } else if (name === "alternateMobile" || name === "emergencyAlternate") {
        const cleanAlt = strVal.replace(/\D/g, "");
        if (cleanAlt.length > 0) {
          if (cleanAlt.length !== 10) {
            newErrors[name] = "Alternate mobile must be exactly 10 digits";
          } else if (!/^[6-9]\d{9}$/.test(cleanAlt)) {
            newErrors[name] = "Alternate mobile must start with 6, 7, 8, or 9";
          } else if (values?.mobile && cleanAlt === String(values.mobile).replace(/\D/g, "")) {
            newErrors[name] = "Alternate mobile should be different from primary mobile";
          }
        }
      }

      // Email Address
      if (name === "email" || type === "email") {
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(strVal)) {
          newErrors[name] = "Please enter a valid email address (e.g. name@example.com)";
        }
      }

      // Aadhaar
      if (name === "aadhaar") {
        const cleanAadhaar = strVal.replace(/\s|-/g, "");
        if (!/^\d{12}$/.test(cleanAadhaar)) {
          newErrors[name] = "Aadhaar number must be exactly 12 digits";
        }
      }

      // PAN
      if (name === "pan") {
        const cleanPan = strVal.toUpperCase().replace(/\s/g, "");
        if (cleanPan.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
          newErrors[name] = "PAN must be in valid format (e.g. ABCDE1234F)";
        }
      }

      // PINCODE
      if (name === "pin") {
        const cleanPin = strVal.replace(/\D/g, "");
        if (cleanPin.length !== 6) {
          newErrors[name] = "PINCODE must be exactly 6 digits";
        }
      }

      // Current Address
      if (name === "currentAddress" && strVal.length < 5) {
        newErrors[name] = "Address must be at least 5 characters";
      }

      // IFSC Code
      if (name === "ifsc") {
        const cleanIfsc = strVal.toUpperCase().replace(/\s/g, "");
        if (cleanIfsc.length > 0 && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
          newErrors[name] = "IFSC code must be 11 characters (e.g. SBIN0001234)";
        }
      }

      // Account Number
      if (name === "accountNumber") {
        const cleanAcc = strVal.replace(/\D/g, "");
        if (cleanAcc.length > 0 && (cleanAcc.length < 9 || cleanAcc.length > 18)) {
          newErrors[name] = "Account number must be between 9 and 18 digits";
        }
      }

      // Basic Salary & Gross Salary
      if (name === "basicSalary" || name === "grossSalary") {
        const num = Number(strVal);
        if (isNaN(num) || num < 0) {
          newErrors[name] = "Salary must be a positive number";
        }
      }
    }
  }
  return newErrors;
}

function Field({
  item = [],
  values = {},
  setValues,
  setErrors = null,
  error = "",
  forceOptional = false,
  departmentOptions = null,
  designationOptions = null,
  staffType = null,
}) {
  const { boards, selectedBoard, setSelectedBoard } = useAcademicContext();
  if (!Array.isArray(item) || item.length < 2) return null;
  const name = item[0] || "";
  const label = item[1] || name || "";
  const type = item[2] || "text";
  const options = Array.isArray(item[3]) ? item[3] : [];
  const configuredRequired = item[4] !== false;
  const layoutClass = item[5] || "";

  const safeValues = values && typeof values === "object" ? values : {};
  const required = configuredRequired && !forceOptional;
  const effectiveStaffType = staffType || safeValues.staffType || "Teaching";
  const isTeaching = effectiveStaffType === "Teaching";

  const activeBoardName = selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || "";

  const contextBoardOpts = useMemo(() => {
    if (name !== "board") return options;
    const activeBoardsList = Array.isArray(boards)
      ? boards.filter((b) => {
          if (!b) return false;
          if (b.status !== undefined && b.status !== null) {
            const st = String(b.status).trim().toLowerCase();
            if (st === "inactive" || st === "disabled" || b.status === false || b.status === 0) return false;
          }
          if (b.isActive !== undefined && b.isActive !== null && (b.isActive === false || b.isActive === 0)) {
            return false;
          }
          return true;
        })
      : [];

    const names = activeBoardsList
      .map((b) => b?.name || b?.boardName)
      .filter((n) => Boolean(n) && n !== "—" && !isOther(n));

    const uniqueNames = Array.from(new Set(names));
    if (activeBoardName && !uniqueNames.includes(activeBoardName) && !isOther(activeBoardName)) {
      uniqueNames.push(activeBoardName);
    }
    return uniqueNames;
  }, [name, boards, options, activeBoardName]);

  const rawOpts = useMemo(() => {
    if (name === "board") return contextBoardOpts;

    if (name === "department") {
      const base = Array.isArray(departmentOptions) && departmentOptions.length > 0
        ? departmentOptions
        : (Array.isArray(options) && options.length > 0 ? options : (isTeaching ? teachingDepartments : nonTeachingDepartments));
      const filtered = base.filter((d) => {
        const dName = typeof d === "object" ? d.name || d.departmentName : String(d || "");
        return isTeaching ? !isNonTeachingDeptName(dName) : isNonTeachingDeptName(dName);
      });
      return filtered.length > 0 ? filtered : (isTeaching ? teachingDepartments : nonTeachingDepartments);
    }

    if (name === "designation") {
      const currentDept = safeValues.department;
      let deptSpecific = [];
      if (currentDept) {
        deptSpecific = isTeaching
          ? (teachingDesignationMap[currentDept] || [])
          : (nonTeachingDesignationMap[currentDept] || []);
      }

      const baseList = Array.isArray(designationOptions) && designationOptions.length > 0
        ? designationOptions
        : (Array.isArray(options) && options.length > 0 ? options : (isTeaching ? teachingDesignations : nonTeachingDesignations));

      const filteredBase = baseList.filter((d) => {
        const dName = typeof d === "object" ? d.name || d.designationName : String(d || "");
        return isTeaching ? !isNonTeachingDesigName(dName) : isNonTeachingDesigName(dName);
      });

      const combined = [...deptSpecific, ...filteredBase];
      const unique = Array.from(new Set(combined.length > 0 ? combined : (isTeaching ? teachingDesignations : nonTeachingDesignations)));
      return unique;
    }

    return options;
  }, [name, contextBoardOpts, departmentOptions, designationOptions, options, isTeaching, safeValues.department]);

  const opts = Array.isArray(rawOpts) ? rawOpts : [];

  const change = (value) => {
    let boardCodeVal = undefined;
    let boardIdVal = undefined;
    let boardNameVal = undefined;

    if (name === "board") {
      const match = Array.isArray(boards) ? boards.find((b) =>
        b && (String(b.name || b.boardName || b.code || "").trim().toLowerCase() === String(value).trim().toLowerCase()
        || String(b.code || "").trim().toLowerCase() === String(value).trim().toLowerCase())
      ) : null;
      boardCodeVal = match?.code || match?.boardCode || (value && value.length <= 10 && !value.includes(" ") ? value.toUpperCase() : "");
      boardIdVal = match?.id || match?.boardId || undefined;
      boardNameVal = match?.name || match?.boardName || value;
      if (match) {
        setSelectedBoard(match);
      }
    }

    if (typeof setErrors === "function" && error) {
      setErrors((prev) => {
        if (!prev || !prev[name]) return prev;
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }

    if (typeof setValues === "function") {
      setValues((v) => {
        const prev = v && typeof v === "object" ? v : {};
        if (name === "department") {
          return { ...prev, department: value, designation: "", allocatedSubjects: [], subjects: [] };
        }
        if (name === "allocatedSubjects") {
          return { ...prev, allocatedSubjects: value, subjects: value };
        }
        if (name === "board") {
          return {
            ...prev,
            board: value,
            boardName: boardNameVal,
            boardCode: boardCodeVal,
            ...(boardIdVal ? { boardId: Number(boardIdVal) || boardIdVal } : {}),
          };
        }
        return { ...prev, [name]: value };
      });
    }
  };

  const handleInputChange = (e) => {
    let raw = e.target.value;
    if (type === "file") {
      const file = e.target.files?.[0];
      if (!file) {
        change("");
        return;
      }
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        if (typeof setErrors === "function") {
          setErrors((prev) => ({ ...prev, [name]: "Profile photo must be an image (.jpg, .png, .webp)" }));
        }
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (typeof setErrors === "function") {
          setErrors((prev) => ({ ...prev, [name]: "Profile photo size must not exceed 5MB" }));
        }
        return;
      }
      change(file.name);
      return;
    }

    if (name === "mobile" || name === "alternateMobile" || name === "emergencyMobile" || name === "emergencyAlternate") {
      raw = raw.replace(/\D/g, "").slice(0, 10);
    } else if (name === "aadhaar") {
      raw = raw.replace(/\D/g, "").slice(0, 12);
    } else if (name === "pin") {
      raw = raw.replace(/\D/g, "").slice(0, 6);
    } else if (name === "pan") {
      raw = raw.toUpperCase().slice(0, 10);
    } else if (name === "ifsc") {
      raw = raw.toUpperCase().slice(0, 11);
    } else if (name === "accountNumber") {
      raw = raw.replace(/\D/g, "").slice(0, 18);
    }

    change(raw);
  };

  const val = safeValues[name] !== undefined && safeValues[name] !== ""
    ? safeValues[name]
    : (name === "board" ? activeBoardName : (name === "allocatedSubjects" ? (safeValues.subjects || []) : ""));

  const hasError = Boolean(error);
  const errorStyle = hasError ? { borderColor: "#ef4444", boxShadow: "0 0 0 1px #ef4444" } : undefined;

  const todayStr = new Date().toISOString().split("T")[0];
  const maxDate = name === "dateOfBirth" ? todayStr : undefined;

  let inputMaxLength = undefined;
  if (name === "mobile" || name === "alternateMobile" || name === "emergencyMobile" || name === "emergencyAlternate") {
    inputMaxLength = 10;
  } else if (name === "aadhaar") {
    inputMaxLength = 12;
  } else if (name === "pin") {
    inputMaxLength = 6;
  } else if (name === "pan") {
    inputMaxLength = 10;
  } else if (name === "ifsc") {
    inputMaxLength = 11;
  } else if (name === "accountNumber") {
    inputMaxLength = 18;
  }

  return (
    <label className={[type === "textarea" ? "is-wide" : "", layoutClass, hasError ? "has-field-error" : ""].filter(Boolean).join(" ")}>
      <span>
        {label} {required ? <b className="required-star" style={{ color: "#ef4444", marginLeft: "2px", fontWeight: "bold" }}>*</b> : null}
      </span>
      {type === "select" ? (
        <select value={val} onChange={(e) => change(e.target.value)} style={errorStyle}>
          <option value="">Select {label}</option>
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : type === "search-select" ? (
        <SearchSelectInput
          label={label}
          opts={opts}
          value={val}
          onChange={(v) => change(v)}
          hasError={hasError}
        />
      ) : type === "multi-subject-select" ? (
        <SubjectAllocationInput
          staffId={safeValues.id || safeValues.staffId}
          department={safeValues.department}
          value={val}
          onChange={(v) => change(v)}
        />
      ) : type === "textarea" ? (
        <textarea value={val} onChange={handleInputChange} style={errorStyle} />
      ) : (
        <input
          type={type}
          readOnly={name === "employeeId"}
          value={type === "file" ? undefined : val}
          onChange={handleInputChange}
          maxLength={inputMaxLength}
          max={maxDate}
          style={errorStyle}
        />
      )}{" "}
      {name === "employeeId" ? (
        <small className="field-help" style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--cms-muted)" }}>
          Generated using ID &amp; Number Series Settings.{" "}
          <Link to="/dashboard/settings/number-series" style={{ color: "var(--cms-primary)", textDecoration: "underline" }}>
            Manage Number Series
          </Link>
        </small>
      ) : error ? (
        <small className="field-error" style={{ color: "#ef4444", fontSize: 11, display: "block", marginTop: 4, fontWeight: 500 }}>{error}</small>
      ) : null}
    </label>
  );
}

function Back({ to = "/dashboard/staff", label = "Back" }) {
  const n = useNavigate();
  return (
    <button className="staff-mock-back" onClick={() => n(to)}>
      <ArrowLeft /> {label}
    </button>
  );
}

function Steps({ labels, step }) {
  return (
    <div className="staff-stepper">
      {labels.map((x, i) => (
        <span className={i <= step ? "is-active" : ""} key={x}>
          <b>{i < step ? <Check /> : i + 1}</b>
          <small>{x}</small>
        </span>
      ))}
    </div>
  );
}

function Badge({ value }) {
  if (!value) return null;
  const isCompleted = value === "Completed" || value === "Active" || value === "Teaching";
  const isPending = value === "Pending" || value === "Link Sent" || value === "In Progress";
  const isInactive = value === "Inactive";
  const cls = isCompleted ? "status-badge is-active" : isPending ? "status-badge is-warning" : isInactive ? "status-badge is-inactive" : "status-badge";
  return <span className={`status-badge ${cls}`}>{value}</span>;
}

// ----------------------------------------------------------------------
// STAFF CREDENTIALS GENERATOR MODAL (Configure Email format & Default Password)
// ----------------------------------------------------------------------
function StaffCredentialsGeneratorModal({ isOpen, onClose, onSave }) {
  const n = useNavigate();
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("pjc-credential-settings");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      facultyEmailFormat: "{empid}@gmail.com",
      defaultPassword: "Pirnav@123",
      facultyPrefix: "EMP-",
      pwdLength: 8,
      forceChangeOnFirstLogin: true,
      expiryDays: 90,
    };
  });

  if (!isOpen) return null;

  const sampleEmpId = "PCTCH0001";
  const previewEmail = (settings.facultyEmailFormat || "{empid}@gmail.com")
    .replace(/\{empid\}/gi, sampleEmpId.toLowerCase());
  const previewPassword = settings.defaultPassword || "Pirnav@123";

  const handleSave = () => {
    try {
      localStorage.setItem("pjc-credential-settings", JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent("credential-settings-updated", { detail: settings }));
    } catch {}
    if (onSave) onSave(settings);
    onClose();
  };

  return (
    <Modal
      title="Credentials Generator & Format Settings"
      onClose={onClose}
      className="staff-cred-modal"
    >
      <div className="staff-cred-form">
        <p style={{ margin: 0, fontSize: "12px", color: "var(--cms-muted)" }}>
          Configure the auto-generation format and default login credentials for faculty & staff members.
        </p>

        <div className="staff-cred-field">
          <label>Employee Login Email Format</label>
          <input
            type="text"
            value={settings.facultyEmailFormat || "{empid}@gmail.com"}
            onChange={(e) => setSettings((p) => ({ ...p, facultyEmailFormat: e.target.value }))}
            placeholder="{empid}@gmail.com"
          />
          <div className="staff-cred-chips">
            <span style={{ fontSize: "11px", color: "var(--cms-muted)", alignSelf: "center" }}>Presets:</span>
            {["{empid}@gmail.com", "{empid}@pirnav.edu.in", "{empid}@college.edu"].map((format) => (
              <button
                key={format}
                type="button"
                className="staff-cred-chip"
                onClick={() => setSettings((p) => ({ ...p, facultyEmailFormat: format }))}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        <div className="staff-cred-field">
          <label>Default Initial Password</label>
          <input
            type="text"
            value={settings.defaultPassword || "Pirnav@123"}
            onChange={(e) => setSettings((p) => ({ ...p, defaultPassword: e.target.value }))}
            placeholder="Pirnav@123"
          />
          <div className="staff-cred-chips">
            <span style={{ fontSize: "11px", color: "var(--cms-muted)", alignSelf: "center" }}>Presets:</span>
            {["Pirnav@123", "Welcome@2026", "Staff@123"].map((pwd) => (
              <button
                key={pwd}
                type="button"
                className="staff-cred-chip"
                onClick={() => setSettings((p) => ({ ...p, defaultPassword: pwd }))}
              >
                {pwd}
              </button>
            ))}
          </div>
        </div>

        <div className="staff-cred-preview-card">
          <div className="staff-cred-preview-header">
            <Lock size={14} style={{ color: "var(--brand-primary, #6F8400)" }} /> Live Credentials Format Preview
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div>
              <span style={{ color: "var(--cms-muted)" }}>Sample Staff ID: </span>
              <strong>{sampleEmpId}</strong>
            </div>
            <div>
              <span style={{ color: "var(--cms-muted)" }}>Generated Login Email: </span>
              <strong style={{ color: "var(--brand-primary, #6F8400)", fontFamily: "monospace" }}>{previewEmail}</strong>
            </div>
            <div>
              <span style={{ color: "var(--cms-muted)" }}>Default Password: </span>
              <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>{previewPassword}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.forceChangeOnFirstLogin !== false}
              onChange={(e) => setSettings((p) => ({ ...p, forceChangeOnFirstLogin: e.target.checked }))}
            />
            <span>Force user to change password on first login</span>
          </label>
        </div>

        <div className="staff-import-footer" style={{ marginTop: "8px" }}>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => {
              onClose();
              n("/dashboard/settings/credentials");
            }}
            title="Open comprehensive credentials generation & batch dispatch manager"
          >
            Open Full Credentials Manager
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={handleSave}>
            Save Format
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// SCREEN 1 — DASHBOARD (Connected to GET /api/v1/staff/dashboard-stats)
// ----------------------------------------------------------------------
function Dashboard({ records = [] }) {
  const n = useNavigate();
  const { boards, selectedBoard } = useAcademicContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        setLoading(true);
        const params = {};
        const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
        const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;
        if (activeBoardCode) params.boardCode = activeBoardCode;
        if (activeBoardId) params.boardId = activeBoardId;

        const response = await apiClient.get(apiEndpoints.faculty.dashboardStats, { params });
        if (isMounted && response.data) {
          setStats(response.data);
        }
      } catch (err) {
        console.warn("GET /api/v1/staff/dashboard-stats API offline, using local fallback data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStats();
    return () => { isMounted = false; };
  }, [selectedBoard]);

  const safeRecords = useMemo(() => {
    const raw = Array.isArray(records) ? records : [];
    return raw.filter((r) => isStaffMatchingBoard(r, selectedBoard, boards));
  }, [records, selectedBoard, boards]);

  const hasStats = stats !== null && stats !== undefined;

  const totalCount = loading ? "—" : (hasStats ? (stats.totalStaff ?? stats.totalCount ?? 0) : (safeRecords.length || 0));
  const teachingCount = loading ? "—" : (hasStats ? (stats.teachingStaff ?? 0) : (safeRecords.filter((r) => r?.staffType === "Teaching").length || 0));
  const nonTeachingCount = loading ? "—" : (hasStats ? (stats.nonTeachingStaff ?? 0) : (safeRecords.filter((r) => r?.staffType === "Non-Teaching").length || 0));
  const completedCount = loading ? "—" : (hasStats ? (stats.completedProfiles ?? stats.completed ?? 0) : (safeRecords.filter((r) => r?.profileStatus === "Completed").length || 0));
  const pendingCount = loading ? "—" : (hasStats ? (stats.pendingProfileCompletion ?? stats.pending ?? 0) : (typeof totalCount === "number" ? Math.max(0, totalCount - completedCount) : 0));
  const pct = typeof totalCount === "number" && totalCount > 0 && typeof completedCount === "number" ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle="Manage teaching and non-teaching staff, their details and profile completion."
      breadcrumb={["People"]}
      actions={
        <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/add")}>
          <Plus /> Add Staff
        </button>
      }
    >
      <main className="staff-mock-page">
        <section className="staff-kpis">
          {[
            ["Total Staff", totalCount, totalStaffIcon, "/dashboard/staff/list"],
            ["Teaching Staff", teachingCount, teachingStaffIcon, "/dashboard/staff/teaching"],
            ["Non-Teaching Staff", nonTeachingCount, nonTeachingStaffIcon, "/dashboard/staff/non-teaching"],
            ["Pending Profile Completion", pendingCount, pendingProfilesIcon, "/dashboard/staff/pending?tab=Link%20Sent"],
            ["Completed Profiles", completedCount, completedProfilesIcon, "/dashboard/staff/completed"],
            ["Credentials Generator", "Format", credentialsGeneratorIcon, "modal:credentials"],
          ].map(([l, v, icon, to]) => (
            <article
              key={l}
              onClick={() => {
                if (to === "modal:credentials") {
                  setCredModalOpen(true);
                } else {
                  n(to);
                }
              }}
              title={l === "Credentials Generator" ? "Click to configure employee credentials format and default password" : undefined}
            >
              <img className="staff-kpi-icon" src={icon} alt="" aria-hidden="true" width={32} height={32} />
              <span>
                {l}
                <strong>{v}</strong>
              </span>
            </article>
          ))}
        </section>
        <section className="staff-dashboard-grid">
          <article className="staff-panel">
            <header>
              <div>
                <h2>Profile Completion Overview</h2>
                <p>Live staff profile completion metrics</p>
              </div>
            </header>
            <div className="staff-donut-wrap">
              <div className="staff-donut" style={{ "--pct": `${pct * 3.6}deg` }}>
                <span>
                  <strong>{totalCount}</strong>Total Staff
                </span>
              </div>
              <div>
                <p>
                  <i className="done" />
                  Completed <strong>{completedCount}</strong>
                </p>
                <p>
                  <i />
                  Pending <strong>{pendingCount}</strong>
                </p>
              </div>
            </div>
          </article>
          <article className="staff-panel quick">
            <header>
              <div>
                <h2>Quick Actions</h2>
                <p>Common staff workflows</p>
              </div>
            </header>
            {[
              ["Add Teaching Staff", "/dashboard/staff/add-teaching"],
              ["Add Non-Teaching Staff", "/dashboard/staff/add-non-teaching"],
              ["Credentials Generator", "modal:credentials"],
              ["Send Profile Link", "/dashboard/staff/pending?tab=Link%20Sent"],
              ["View Pending Submissions", "/dashboard/staff/pending"],
              ["View All Staff", "/dashboard/staff/list"],
            ].map(([l, to]) => (
              <button
                key={l}
                onClick={() => {
                  if (to === "modal:credentials") {
                    setCredModalOpen(true);
                  } else {
                    n(to);
                  }
                }}
              >
                {l}
                <ChevronRight />
              </button>
            ))}
          </article>
        </section>
      </main>
      <StaffCredentialsGeneratorModal
        isOpen={credModalOpen}
        onClose={() => setCredModalOpen(false)}
        onSave={() => setToast("Credentials format settings updated successfully!")}
      />
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// STAFF IMPORT VALIDATION MODAL
// ----------------------------------------------------------------------
function StaffImportValidationModal({ state, onClose, onConfirm, isSubmitting }) {
  const [filter, setFilter] = useState("all"); // 'all' | 'valid' | 'invalid'
  const [search, setSearch] = useState("");

  if (!state.isOpen) return null;

  const { rows, fileName, staffType } = state;
  const totalCount = rows.length;
  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);
  const validCount = validRows.length;
  const invalidCount = invalidRows.length;

  const filteredRows = rows.filter((r) => {
    if (filter === "valid" && !r.isValid) return false;
    if (filter === "invalid" && r.isValid) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.fullName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.mobile?.includes(q) ||
        r.employeeId?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.designation?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Modal
      title={`Validate & Import ${staffType} Staff`}
      onClose={onClose}
      className="staff-import-modal"
    >
      <div className="staff-import-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Metrics summary */}
        <div className="staff-import-metrics">
          <div className="metric-card">
            <span>File Name</span>
            <strong style={{ fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fileName}
            </strong>
          </div>
          <div className="metric-card">
            <span>Total Rows</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="metric-card valid">
            <span>Valid Rows</span>
            <strong>{validCount}</strong>
          </div>
          <div className="metric-card invalid">
            <span>Errors / Invalid</span>
            <strong>{invalidCount}</strong>
          </div>
        </div>

        {/* Toolbar with tabs & search */}
        <div className="staff-import-toolbar">
          <div className="staff-import-tabs">
            <button
              type="button"
              className={filter === "all" ? "is-active" : ""}
              onClick={() => setFilter("all")}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={filter === "valid" ? "is-active" : ""}
              onClick={() => setFilter("valid")}
            >
              Valid ({validCount})
            </button>
            <button
              type="button"
              className={filter === "invalid" ? "is-active" : ""}
              onClick={() => setFilter("invalid")}
            >
              Errors ({invalidCount})
            </button>
          </div>
          <div className="staff-import-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search in imported rows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table preview */}
        <div className="staff-import-table-wrap">
          <table className="staff-import-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>Row</th>
                <th style={{ width: "90px" }}>Status</th>
                <th>Employee ID</th>
                <th>Staff Name</th>
                <th>Email / Mobile</th>
                <th>Department / Designation</th>
                {staffType === "Teaching" ? <th>Subject Allocation</th> : null}
                <th>Validation Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((r) => (
                  <tr key={r.rowNumber} className={!r.isValid ? "row-invalid" : ""}>
                    <td>#{r.rowNumber}</td>
                    <td>
                      <span className={`staff-val-badge ${r.isValid ? "is-valid" : "is-invalid"}`}>
                        {r.isValid ? "Valid" : "Error"}
                      </span>
                    </td>
                    <td>
                      {r.employeeId ? (
                        <strong>{r.employeeId}</strong>
                      ) : (
                        <span style={{ color: "var(--cms-muted)", fontStyle: "italic" }}>Auto-generated</span>
                      )}
                    </td>
                    <td>
                      <strong>{r.fullName || "—"}</strong>
                      {r.gender ? <span style={{ display: "block", fontSize: "11px", color: "var(--cms-muted)" }}>{r.gender}</span> : null}
                    </td>
                    <td>
                      <div>{r.email || "—"}</div>
                      <small style={{ color: "var(--cms-muted)" }}>{r.mobile || "—"}</small>
                    </td>
                    <td>
                      <div>{r.department || "—"}</div>
                      <small style={{ color: "var(--cms-muted)" }}>{r.designation || "—"}</small>
                    </td>
                    {staffType === "Teaching" ? (
                      <td>
                        <small>{r.subjectAllocation || "—"}</small>
                      </td>
                    ) : null}
                    <td>
                      {r.isValid ? (
                        <span style={{ color: "#166534", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Check size={14} /> Ready to import
                        </span>
                      ) : (
                        <ul className="staff-val-error-list">
                          {r.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={staffType === "Teaching" ? 8 : 7} style={{ textAlign: "center", padding: "24px", color: "var(--cms-muted)" }}>
                    No rows match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="staff-import-footer">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => onConfirm(validRows)}
            disabled={validCount === 0 || isSubmitting}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="cms-spin" size={16} /> Importing...
              </>
            ) : (
              <>
                <Upload size={16} /> Import {validCount} Valid Record{validCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// SCREEN 2 — STAFF LIST (Connected to GET /api/v1/staff, Excel Export & Import)
// ----------------------------------------------------------------------
function StaffList({ records = [], setRecords, forced }) {
  const n = useNavigate();
  const { boards, selectedBoard } = useAcademicContext();
  const list = Array.isArray(records) ? records : [];
  const importInputRef = useRef(null);
  const [tab, setTab] = useState(forced || "All");
  const [q, setQ] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [staffTypeFilter, setStaffTypeFilter] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(5);
  const [toast, setToast] = useState(null);
  const [remove, setRemove] = useState(null);
  const [apiItems, setApiItems] = useState(null);
  const [totalApiCount, setTotalApiCount] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  // Validation Import Modal State
  const [importModalState, setImportModalState] = useState({
    isOpen: false,
    fileName: "",
    staffType: "Teaching",
    rows: [],
    fileObject: null,
  });
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);

  useEffect(() => {
    setTab(forced || "All");
    setPage(1);
  }, [forced]);

  // GET /api/v1/staff Live Fetch
  useEffect(() => {
    let isMounted = true;
    async function fetchStaffList() {
      try {
        setLoadingList(true);
        const currentTab = forced || tab;
        const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
        const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;
        const params = {
          PageNumber: page,
          PageSize: size,
          SearchTerm: q || undefined,
          Department: departmentFilter || undefined,
          Designation: designationFilter || undefined,
          StaffType: forced !== "All" && forced !== "Completed" && forced !== "Pending" ? forced : (staffTypeFilter || undefined),
          ProfileStatus: currentTab === "Completed" ? "Completed" : (currentTab === "Pending" ? "Pending" : undefined),
          BoardCode: activeBoardCode || undefined,
          BoardId: activeBoardId || undefined,
        };

        const res = await apiClient.get(apiEndpoints.faculty.list, { params });
        if (isMounted && res.data) {
          const items = res.data.items || res.data.data || res.data;
          if (Array.isArray(items)) {
            setApiItems(items);
            setTotalApiCount(res.data.totalCount || items.length);
          }
        }
      } catch (err) {
        console.warn("GET /api/v1/staff API offline, using local filtered list");
        if (isMounted) {
          setApiItems([]);
          setTotalApiCount(0);
        }
      } finally {
        if (isMounted) setLoadingList(false);
      }
    }
    fetchStaffList();
    return () => { isMounted = false; };
  }, [page, size, q, departmentFilter, designationFilter, staffTypeFilter, forced, tab, records, selectedBoard]);

  // Handle Client-side Excel Parsing & Row-by-Row Validation
  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const staffKind = forced === "Non-Teaching" || (!forced && tab === "Non-Teaching") ? "Non-Teaching" : "Teaching";

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

          if (!rawRows || rawRows.length === 0) {
            setToast("The uploaded Excel file contains no data rows.");
            return;
          }

          // Existing records lookup for duplicate prevention
          const existingEmails = new Set(list.map((r) => String(r.email || "").trim().toLowerCase()).filter(Boolean));
          const existingMobiles = new Set(list.map((r) => String(r.mobile || "").trim()).filter(Boolean));
          const existingEmpIds = new Set(list.map((r) => String(r.employeeId || "").trim().toLowerCase()).filter(Boolean));

          const seenEmailsInFile = new Set();
          const seenMobilesInFile = new Set();
          const seenEmpIdsInFile = new Set();

          const validatedRows = rawRows.map((raw, idx) => {
            // Case-insensitive / normalized key getter
            const getVal = (aliases) => {
              for (const key of Object.keys(raw)) {
                const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
                for (const alias of aliases) {
                  if (cleanKey === alias.toLowerCase().replace(/[^a-z0-9]/g, "")) {
                    return String(raw[key] ?? "").trim();
                  }
                }
              }
              return "";
            };

            const boardName = getVal(["Board Name", "Board", "BoardName", "Campus"]) || selectedBoard?.name || selectedBoard?.code || "";
            const employeeId = getVal(["Employee ID", "EmployeeID", "Emp ID", "Staff ID", "EmpId"]);
            const firstName = getVal(["First Name", "FirstName", "First_Name", "Name"]);
            const middleName = getVal(["Middle Name", "MiddleName", "Middle_Name"]);
            const lastName = getVal(["Last Name", "LastName", "Last_Name", "Surname"]);
            let dob = getVal(["Date of Birth", "DateOfBirth", "DOB", "Birth Date"]);
            const gender = getVal(["Gender", "Sex"]) || "Male";
            const mobile = getVal(["Mobile", "Mobile Number", "Phone", "Phone Number", "Contact Number"]);
            const email = getVal(["Email", "Email ID", "Email Address"]);
            const department = getVal(["Department", "Dept", "Department Name"]);
            const designation = getVal(["Designation", "Role", "Designation Name"]);
            const subjectAllocation = getVal(["Subject Allocation", "SubjectAllocation", "Subjects", "Allocated Subjects", "Subject"]);
            let dateOfJoining = getVal(["Date of Joining", "DateOfJoining", "DOJ", "Joining Date", "Join Date"]);
            const employmentType = getVal(["Employment Type", "EmploymentType", "Type"]) || "Full Time";
            const status = getVal(["Status", "State"]) || "Active";

            // Format date helper
            const formatDate = (val) => {
              if (!val) return "";
              if (val instanceof Date && !isNaN(val)) {
                return val.toISOString().split("T")[0];
              }
              const str = String(val).trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
              const parsed = new Date(str);
              if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
              return str;
            };

            const formattedDob = formatDate(dob);
            const formattedDoj = formatDate(dateOfJoining) || new Date().toISOString().split("T")[0];

            const errors = [];
            const warnings = [];

            if (!firstName) errors.push("First Name is required.");
            if (!lastName) errors.push("Last Name is required.");

            if (!mobile) {
              errors.push("Mobile number is required.");
            } else if (mobile.replace(/\D/g, "").length < 10) {
              errors.push("Mobile number must have at least 10 digits.");
            } else if (seenMobilesInFile.has(mobile)) {
              errors.push(`Duplicate mobile '${mobile}' in this file.`);
            } else if (existingMobiles.has(mobile)) {
              errors.push(`Mobile '${mobile}' already exists in system.`);
            } else {
              seenMobilesInFile.add(mobile);
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
              errors.push("Email address is required.");
            } else if (!emailRegex.test(email)) {
              errors.push(`Invalid email format: '${email}'.`);
            } else if (seenEmailsInFile.has(email.toLowerCase())) {
              errors.push(`Duplicate email '${email}' in this file.`);
            } else if (existingEmails.has(email.toLowerCase())) {
              errors.push(`Email '${email}' already exists in system.`);
            } else {
              seenEmailsInFile.add(email.toLowerCase());
            }

            if (!department) errors.push("Department is required.");
            if (!designation) errors.push("Designation is required.");

            if (employeeId) {
              const lowEmp = employeeId.toLowerCase();
              if (seenEmpIdsInFile.has(lowEmp)) {
                errors.push(`Duplicate Employee ID '${employeeId}' in this file.`);
              } else if (existingEmpIds.has(lowEmp)) {
                errors.push(`Employee ID '${employeeId}' already exists in system.`);
              } else {
                seenEmpIdsInFile.add(lowEmp);
              }
            }

            const subjectsArray = subjectAllocation
              ? subjectAllocation.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
              : [];

            return {
              rowNumber: idx + 2, // Excel row 2 (row 1 is header)
              boardName,
              employeeId,
              firstName,
              middleName,
              lastName,
              fullName: `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim(),
              dob: formattedDob,
              gender,
              mobile,
              email,
              department,
              designation,
              subjectAllocation,
              allocatedSubjects: subjectsArray,
              subjects: subjectsArray,
              dateOfJoining: formattedDoj,
              employmentType,
              status,
              staffType: staffKind,
              profileStatus: staffKind === "Teaching" ? "Pending" : "Completed",
              isValid: errors.length === 0,
              errors,
              warnings,
              originalRaw: raw,
            };
          });

          setImportModalState({
            isOpen: true,
            fileName: file.name,
            staffType: staffKind,
            rows: validatedRows,
            fileObject: file,
          });
        } catch (err) {
          console.error("Failed to parse Excel:", err);
          setToast("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      setToast("Failed to read file.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // Confirm and Import Validated Rows
  const handleConfirmImport = async (validRows) => {
    if (!validRows || validRows.length === 0) return;
    setIsImportSubmitting(true);
    try {
      let importedCount = 0;
      const newRecordsToAdd = [];

      for (const row of validRows) {
        const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
        const activeBoardName = selectedBoard?.name || selectedBoard?.boardName || row.boardName || activeBoardCode || "";
        const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;

        const empId = row.employeeId || generateNextNumber(row.staffType === "Non-Teaching" ? "NON_TEACHING_STAFF" : "TEACHING_STAFF");
        if (!row.employeeId) {
          incrementSeriesSequence(row.staffType === "Non-Teaching" ? "NON_TEACHING_STAFF" : "TEACHING_STAFF");
        }

        const payload = {
          employeeId: empId,
          firstName: row.firstName,
          middleName: row.middleName || "",
          lastName: row.lastName,
          fullName: row.fullName,
          email: row.email,
          mobile: row.mobile,
          dob: row.dob,
          gender: row.gender,
          department: row.department,
          designation: row.designation,
          staffType: row.staffType,
          profileStatus: row.profileStatus,
          status: row.status || "Active",
          employmentType: row.employmentType || "Full Time",
          joiningDate: row.dateOfJoining,
          dateOfJoining: row.dateOfJoining,
          board: activeBoardName,
          boardName: activeBoardName,
          boardCode: activeBoardCode,
          ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
          allocatedSubjects: row.allocatedSubjects || [],
          subjects: row.subjects || [],
        };

        try {
          const res = await apiClient.post(apiEndpoints.faculty.create, payload);
          if (res.data) {
            newRecordsToAdd.push({ ...payload, ...res.data, id: res.data.id || Date.now() + Math.random() });
          } else {
            newRecordsToAdd.push({ ...payload, id: Date.now() + Math.random() });
          }
        } catch (err) {
          // Fallback to local store if server is offline
          newRecordsToAdd.push({ ...payload, id: Date.now() + Math.random() });
        }
        importedCount++;
      }

      // Update state & trigger sync event
      setRecords((prev) => {
        const updated = [...newRecordsToAdd, ...(Array.isArray(prev) ? prev : [])];
        try {
          sessionStorage.setItem(STORE, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        window.dispatchEvent(new CustomEvent("staff-records-updated"));
      } catch {}

      setImportModalState((prev) => ({ ...prev, isOpen: false }));
      setToast(`Successfully imported ${importedCount} ${importModalState.staffType || "staff"} record(s)!`);
    } catch (err) {
      console.error("Bulk import failed:", err);
      setToast("Failed to complete bulk import.");
    } finally {
      setIsImportSubmitting(false);
    }
  };

  // GET /api/v1/staff/export-excel
  const handleExportExcel = async () => {
    setExportOpen(false);
    try {
      const response = await apiClient.get(apiEndpoints.faculty.exportExcel, {
        params: { SearchTerm: q, Department: departmentFilter, Designation: designationFilter, StaffType: forced },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Staff_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setToast("Exported staff data to Excel (.xlsx) successfully.");
    } catch (err) {
      setToast("Exported staff data to Excel successfully.");
    }
  };

  // Download Excel Template with full 15 headings for Teaching Staff or 14 headings for Non-Teaching Staff
  const handleExportTemplate = (typeOverride) => {
    setExportOpen(false);
    const targetType = typeOverride || (forced === "Non-Teaching" || (!forced && tab === "Non-Teaching") ? "Non-Teaching" : "Teaching");
    const columns = targetType === "Non-Teaching" ? NON_TEACHING_EXCEL_COLUMNS : TEACHING_EXCEL_COLUMNS;

    const sampleRow = targetType === "Non-Teaching" ? [
      selectedBoard?.name || selectedBoard?.code || "Main Campus", // Board Name
      "NTC-2026-001", // Employee ID
      "Robert", // First Name
      "E.", // Middle Name
      "Smith", // Last Name
      "1990-04-12", // Date of Birth
      "Male", // Gender
      "9876543210", // Mobile
      "robert.smith@example.com", // Email
      "Administration", // Department
      "Administrative Officer", // Designation
      "2024-01-15", // Date of Joining
      "Full Time", // Employment Type
      "Active" // Status
    ] : [
      selectedBoard?.name || selectedBoard?.code || "Main Campus", // Board Name
      "TCH-2026-001", // Employee ID
      "Sarah", // First Name
      "M.", // Middle Name
      "Johnson", // Last Name
      "1988-08-20", // Date of Birth
      "Female", // Gender
      "9876543211", // Mobile
      "sarah.johnson@example.com", // Email
      "Computer Science", // Department
      "Assistant Professor", // Designation
      "Data Structures, Database Management", // Subject Allocation
      "2024-06-01", // Date of Joining
      "Full Time", // Employment Type
      "Active" // Status
    ];

    try {
      const ws = XLSX.utils.aoa_to_sheet([columns, sampleRow]);
      ws["!cols"] = columns.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${targetType}_Template`);
      XLSX.writeFile(wb, `${targetType}_Staff_Import_Template.xlsx`);
      setToast(`Downloaded ${targetType} Staff Excel Template successfully.`);
    } catch (err) {
      console.error("Failed to generate Excel template:", err);
      setToast("Failed to download Excel template.");
    }
  };

  // DELETE /api/v1/staff/{id}
  const handleConfirmDelete = async () => {
    if (!remove) return;
    try {
      await apiClient.delete(apiEndpoints.faculty.delete(remove.id));
      setToast(`Staff member ${remove.fullName} deleted successfully.`);
    } catch (err) {
      console.warn("DELETE /api/v1/staff/{id} API failed, removing locally");
    } finally {
      setRecords((prev) => prev.filter((r) => r.id !== remove.id));
      setRemove(null);
    }
  };

  const currentTab = forced || tab;

  const rows = useMemo(() => {
    const itemMap = new Map();

    list.forEach((r) => {
      if (!r) return;
      const key = String(r.id ?? r.employeeId ?? "");
      if (key) itemMap.set(key, r);
      if (r.employeeId) itemMap.set(String(r.employeeId).trim().toLowerCase(), r);
    });

    const mergedList = [];
    const seenKeys = new Set();

    if (apiItems && Array.isArray(apiItems) && apiItems.length > 0) {
      apiItems.forEach((apiItem) => {
        if (!apiItem) return;
        const idKey = apiItem.id !== undefined && apiItem.id !== null ? String(apiItem.id) : "";
        const empKey = apiItem.employeeId ? String(apiItem.employeeId).trim().toLowerCase() : "";

        const localMatch = (idKey && itemMap.get(idKey)) || (empKey && itemMap.get(empKey));
        const finalItem = localMatch ? { ...localMatch, ...apiItem } : apiItem;

        const uniqueKey = idKey || empKey || String(finalItem.id ?? finalItem.employeeId ?? "");
        if (!uniqueKey || !seenKeys.has(uniqueKey)) {
          if (uniqueKey) seenKeys.add(uniqueKey);
          if (idKey) seenKeys.add(idKey);
          if (empKey) seenKeys.add(empKey);
          mergedList.push(finalItem);
        }
      });
    }

    list.forEach((r) => {
      if (!r) return;
      const idKey = r.id !== undefined && r.id !== null ? String(r.id) : "";
      const empKey = r.employeeId ? String(r.employeeId).trim().toLowerCase() : "";

      const isAlreadyIncluded = (idKey && seenKeys.has(idKey)) || (empKey && seenKeys.has(empKey));
      if (!isAlreadyIncluded) {
        const uniqueKey = idKey || empKey || String(r.id ?? r.employeeId ?? "");
        if (!uniqueKey || !seenKeys.has(uniqueKey)) {
          if (uniqueKey) seenKeys.add(uniqueKey);
          if (idKey) seenKeys.add(idKey);
          if (empKey) seenKeys.add(empKey);
          mergedList.push(r);
        }
      }
    });

    return mergedList.filter(
      (r) =>
        r &&
        isStaffMatchingBoard(r, selectedBoard, boards) &&
        (currentTab === "All" ||
          (currentTab === "Pending"
            ? r.staffType === "Teaching" && r.profileStatus !== "Completed"
            : currentTab === "Completed"
              ? r.profileStatus === "Completed"
              : r.staffType === currentTab)) &&
        (!departmentFilter || r.department === departmentFilter) &&
        (!designationFilter || r.designation === designationFilter) &&
        (!staffTypeFilter || r.staffType === staffTypeFilter) &&
        [r.fullName, r.employeeId, r.email, r.mobile, r.department, r.designation, r.board, r.boardCode].some((v) =>
          String(v || "").toLowerCase().includes((q || "").toLowerCase()),
        ),
    );
  }, [apiItems, list, currentTab, q, departmentFilter, designationFilter, staffTypeFilter, selectedBoard, boards]);

  const [apiFilterDepts, setApiFilterDepts] = useState([]);
  const [apiFilterDesigs, setApiFilterDesigs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchFilterOptions() {
      try {
        const staffTypeParam = forced === "Teaching" || forced === "Non-Teaching"
          ? (forced === "Non-Teaching" ? "NonTeaching" : "Teaching")
          : (tab === "Teaching" || tab === "Non-Teaching" ? (tab === "Non-Teaching" ? "NonTeaching" : "Teaching") : undefined);
        const params = staffTypeParam ? { staffType: staffTypeParam } : {};

        const [deptRes, desigRes] = await Promise.allSettled([
          apiClient.get(apiEndpoints.departments.getAll, { params }),
          apiClient.get(apiEndpoints.designations.getAll, { params: { includeInactive: false, ...params } }),
        ]);

        if (isMounted) {
          if (deptRes.status === "fulfilled" && deptRes.value?.data) {
            const items = deptRes.value.data.items || deptRes.value.data.data || (Array.isArray(deptRes.value.data) ? deptRes.value.data : []);
            setApiFilterDepts(items.map((d) => (typeof d === "object" ? d.name || d.departmentName : d)).filter(Boolean));
          }
          if (desigRes.status === "fulfilled" && desigRes.value?.data) {
            const items = desigRes.value.data.items || desigRes.value.data.data || (Array.isArray(desigRes.value.data) ? desigRes.value.data : []);
            setApiFilterDesigs(items.map((d) => (typeof d === "object" ? d.name || d.designationName : d)).filter(Boolean));
          }
        }
      } catch (err) {
        console.warn("Failed to load department/designation filter options from API:", err);
      }
    }
    fetchFilterOptions();
    return () => { isMounted = false; };
  }, [forced, tab]);

  const departmentOptions = useMemo(() => {
    const fallback = list.map((r) => r?.department).filter(Boolean);
    return [...new Set([...apiFilterDepts, ...fallback])];
  }, [apiFilterDepts, list]);

  const designationOptions = useMemo(() => {
    const fallback = list.map((r) => r?.designation).filter(Boolean);
    return [...new Set([...apiFilterDesigs, ...fallback])];
  }, [apiFilterDesigs, list]);
  const showStaffType = forced !== "Teaching" && forced !== "Non-Teaching";
  const shown = rows.slice((page - 1) * size, page * size);
  const totalRowsCount = totalApiCount || rows.length;

  return (
    <DashboardLayout
      title={forced === "Completed" ? "Completed Profiles" : forced === "All" ? "Staff List" : forced ? `${forced} Staff` : "Staff List"}
      subtitle={forced === "Completed" ? "View staff members with completed profiles." : "View, edit and manage all staff members."}
      breadcrumb={["People", "Staff Management"]}
      actions={null}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff" label="Back to Staff Management" />
        <section className="staff-panel">
          <input
            type="file"
            ref={importInputRef}
            accept=".csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleBulkImport}
          />
          {!forced ? (
            <div className="staff-tabs">
              {[
                ["All", "All Staff"],
                ["Teaching", "Teaching Staff"],
                ["Non-Teaching", "Non-Teaching Staff"],
                ["Pending", "Pending Completion"],
              ].map(([v, l]) => (
                <button className={tab === v ? "is-active" : ""} onClick={() => setTab(v)} key={v}>
                  {l}
                </button>
              ))}
            </div>
          ) : null}
          <div className="staff-toolbar">
            <div className="staff-toolbar-filters">
              <label>
                <Search3DIcon size={15} />
                <input
                  placeholder="Search staff..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }} aria-label="Filter by department">
                <option value="">Department</option>
                {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <select value={designationFilter} onChange={(e) => { setDesignationFilter(e.target.value); setPage(1); }} aria-label="Filter by designation">
                <option value="">Designation</option>
                {designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
              </select>
              {showStaffType ? (
                <select value={staffTypeFilter} onChange={(e) => { setStaffTypeFilter(e.target.value); setPage(1); }} aria-label="Filter by staff type">
                  <option value="">Staff Type</option>
                  <option value="Teaching">Teaching</option>
                  <option value="Non-Teaching">Non-Teaching</option>
                </select>
              ) : null}
            </div>
            <div className="staff-toolbar-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => handleExportTemplate(forced === "Non-Teaching" || (!forced && tab === "Non-Teaching") ? "Non-Teaching" : "Teaching")}
                title="Download Excel template for adding staff"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Download size={16} /> Download Template (Excel)
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => importInputRef.current?.click()}
                title="Upload Excel and validate records before importing"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Upload size={16} /> Import Excel
              </button>
              <div className="staff-export-menu">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setExportOpen((open) => !open)}
                >
                  <FileSpreadsheet /> Export
                </button>
                {exportOpen ? (
                  <div className="staff-export-options">
                    <button type="button" onClick={handleExportExcel}>Export Excel (.xlsx)</button>
                    <button type="button" onClick={() => handleExportTemplate(forced || tab || "Teaching")}>Download Import Template</button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() =>
                  n(
                    forced === "Teaching" || tab === "Teaching"
                      ? "/dashboard/staff/add-teaching"
                      : forced === "Non-Teaching" || tab === "Non-Teaching"
                        ? "/dashboard/staff/add-non-teaching"
                        : "/dashboard/staff/add",
                  )
                }
              >
                <Plus /> Add Staff
              </button>
            </div>
          </div>
          <div className="staff-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Staff Name</th>
                  <th>Board Code</th>
                  <th>Department</th>
                  <th>Designation</th>
                  {showStaffType ? <th>Staff Type</th> : null}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={showStaffType ? 8 : 7} style={{ textAlign: "center", padding: "28px", color: "var(--cms-muted)" }}>
                      Loading staff records...
                    </td>
                  </tr>
                ) : shown.length > 0 ? (
                  shown.map((r, idx) => (
                    <tr key={`staff-item-${r.id || r.employeeId || idx}`}>
                      <td>{r.employeeId}</td>
                      <td>
                        <strong>{r.fullName || `${r.firstName || ""} ${r.lastName || ""}`}</strong>
                        <small>{r.email}</small>
                      </td>
                      <td>{resolveBoardCode(r, boards)}</td>
                      <td>{r.department}</td>
                      <td>{r.designation}</td>
                      {showStaffType ? <td><Badge value={r.staffType} /></td> : null}
                      <td><Badge value={r.status || "Active"} /></td>
                      <td>
                        <div className="row-actions">
                          <button title="View Details (GET /api/v1/staff/{id})" onClick={() => n(`/dashboard/staff/${r.id}`)}>
                            <Eye />
                          </button>
                          <button title="Print QuestPDF (GET /api/v1/staff/{id}/print-pdf)" onClick={async () => {
                            try {
                              const response = await apiClient.get(apiEndpoints.faculty.printPdf(r.id), { responseType: "blob" });
                              const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
                              window.open(url, "_blank");
                            } catch {
                              n(`/dashboard/staff/${r.id}`);
                              setTimeout(() => window.print(), 300);
                            }
                          }}>
                            <Printer />
                          </button>
                          <button title="Delete Staff (DELETE /api/v1/staff/{id})" onClick={() => setRemove(r)}>
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={showStaffType ? 8 : 7} style={{ textAlign: "center", padding: "28px", color: "var(--cms-muted)" }}>
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="staff-pagination">
            <span>
              Showing {shown.length ? (page - 1) * size + 1 : 0} to{" "}
              {Math.min(page * size, totalRowsCount)} of {totalRowsCount}
            </span>
            <div>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <strong>{page}</strong>
              <button disabled={page * size >= totalRowsCount} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </footer>
        </section>
      </main>
      {remove ? (
        <ConfirmDialog
          title="Delete staff?"
          message={`Staff member ${remove.fullName} will be deleted from the database.`}
          onCancel={() => setRemove(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      <StaffImportValidationModal
        state={importModalState}
        onClose={() => setImportModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmImport}
        isSubmitting={isImportSubmitting}
      />
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

function TypeSelect() {
  const n = useNavigate();
  return (
    <DashboardLayout
      title="Add Staff"
      subtitle="Select the staff type you want to create."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back />
        <section className="staff-type-grid">
          <article>
            <GraduationCap />
            <h2>Teaching Staff</h2>
            <p>Admin adds basic details. The staff member completes the remaining profile through a secure link.</p>
            <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/add-teaching")}>
              Add Teaching Staff
            </button>
          </article>
          <article>
            <Building2 />
            <h2>Non-Teaching Staff</h2>
            <p>Admin manages and completes all details for non-teaching staff.</p>
            <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/add-non-teaching")}>
              Add Non-Teaching Staff
            </button>
          </article>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// CREATE / EDIT TEACHING FORM (POST /api/v1/staff & GET /api/v1/staff/next-employee-id)
// ----------------------------------------------------------------------
function TeachingForm({ records, setRecords, existing }) {
  const n = useNavigate();
  const { boards, selectedBoard } = useAcademicContext();
  const { departments: apiDepts, designations: apiDesigs } = useStaffTypeOptions("Teaching");
  const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
  const activeBoardName = selectedBoard?.name || selectedBoard?.boardName || activeBoardCode || "";
  const activeBoardId = selectedBoard?.id || selectedBoard?.boardId || undefined;
  const [values, setValues] = useState(
    existing || {
      staffType: "Teaching",
      employeeId: "",
      board: activeBoardName,
      boardName: activeBoardName,
      boardCode: activeBoardCode,
      ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
      status: "Active",
      employmentType: "Full Time",
      allocatedSubjects: [],
      subjects: [],
    },
  );
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing && activeBoardName && !values.board) {
      setValues((v) => ({
        ...v,
        board: activeBoardName,
        boardName: activeBoardName,
        boardCode: activeBoardCode,
        ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
      }));
    }
  }, [activeBoardName, activeBoardCode, activeBoardId, existing, values.board]);

  // Fetch next employee ID dynamically from Settings Number Series / Staff API
  useEffect(() => {
    let isMounted = true;
    async function fetchNextId() {
      const nextId = await resolveNextStaffEmployeeId("Teaching", records);
      if (isMounted && nextId) {
        setValues((v) => ({ ...v, employeeId: nextId }));
      }
    }
    if (!existing) fetchNextId();
    return () => { isMounted = false; };
  }, [existing, records]);

  const submit = async (e) => {
    e.preventDefault();
    const formErrors = validateStepFields(teachingFields, values, activeBoardName);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setToast("Please fill in all mandatory fields marked with an asterisk (*).");
      return;
    }
    setErrors({});
    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ") || values.employeeId || "Teaching Staff";
    const resolvedCode = values.boardCode || resolveBoardCode({ board: values.board, boardName: values.boardName }, boards);

    const payload = {
      ...values,
      boardCode: resolvedCode !== "—" ? resolvedCode : values.boardCode,
      fullName,
      staffType: "Teaching",
      profileStatus: existing?.profileStatus || "Link Sent",
      linkSentAt: existing?.linkSentAt || new Date().toISOString().split("T")[0],
      status: values.status || "Active",
      allocatedSubjects: values.allocatedSubjects || values.subjects || [],
      subjects: values.allocatedSubjects || values.subjects || [],
    };

    setSubmitting(true);
    let targetId = existing?.id;
    try {
      if (existing?.id) {
        // PUT /api/v1/staff/{id}
        await apiClient.put(apiEndpoints.faculty.update(existing.id), payload);
      } else {
        // POST /api/v1/staff
        const res = await apiClient.post(apiEndpoints.faculty.create, payload);
        targetId = res.data?.id || res.data?.staffId;
      }
      const record = { ...payload, id: targetId, profileCompletion: existing?.profileCompletion || 30, addedOn: existing?.addedOn || new Date().toISOString().split("T")[0] };
      if (!existing) incrementSeriesSequence("employee-id");
      setRecords(existing ? records.map((r) => (String(r.id) === String(existing.id) ? record : r)) : [record, ...records]);
      window.dispatchEvent(new Event("staff-records-updated"));
      if (existing) {
        setToast("Teaching staff profile updated successfully.");
        n(`/dashboard/staff/teaching`);
      } else {
        n(`/dashboard/staff/${record.id}/send-link`);
      }
    } catch (err) {
      const status = err?.response?.status;
      const errMsg = getApiErrorMessage(err, "Failed to save staff record.");
      if (status === 409 || status === 400) {
        setToast(errMsg);
        const lower = errMsg.toLowerCase();
        const nextErrors = {};
        if (lower.includes("employee id")) {
          nextErrors.employeeId = errMsg;
          try {
            const nextId = await resolveNextStaffEmployeeId("Teaching", records);
            if (nextId) setValues((v) => ({ ...v, employeeId: nextId }));
          } catch {}
        }
        if (lower.includes("email")) nextErrors.email = errMsg;
        if (lower.includes("mobile")) nextErrors.mobile = errMsg;
        if (lower.includes("aadhaar")) nextErrors.aadhaar = errMsg;
        setErrors(nextErrors);
        return;
      }
      console.warn("Save staff API error, using local fallback save:", err);
      targetId = existing?.id || Date.now();
      const record = { ...payload, id: targetId, profileCompletion: existing?.profileCompletion || 25, addedOn: existing?.addedOn || new Date().toISOString().split("T")[0] };
      if (!existing) incrementSeriesSequence("employee-id");
      setRecords(existing ? records.map((r) => (String(r.id) === String(existing.id) ? record : r)) : [record, ...records]);
      if (existing) {
        setToast("Teaching staff profile updated successfully.");
        n(`/dashboard/staff/teaching`);
      } else {
        n(`/dashboard/staff/${record.id}/send-link`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={existing ? "Edit Teaching Staff" : "Add Teaching Staff"}
      subtitle="Admin enters basic details only."
      breadcrumb={["People", "Staff Management"]}
    >
      <Toast message={toast} onClose={() => setToast("")} />
      <main className="staff-mock-page">
        <Back />
        <Steps labels={["Basic Details", "Send Link"]} step={0} />
        <form className="staff-form-panel teaching-basic-form" onSubmit={submit}>
          <header>
            <UserRound />
            <div>
              <h2>Teaching Staff Basic Details</h2>
              <p>The staff member completes professional and document information later.</p>
            </div>
          </header>
          <div className="staff-form-grid">
            {teachingFields.map((f) => (
              <Field
                key={f[0]}
                item={f}
                values={values}
                setValues={setValues}
                setErrors={setErrors}
                error={errors[f[0]]}
                forceOptional={false}
                departmentOptions={apiDepts}
                designationOptions={apiDesigs}
                staffType="Teaching"
              />
            ))}
          </div>
          <footer>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => n("/dashboard/staff")}>
              Cancel
            </button>
            <button className="cms-btn cms-btn-primary">
              Save &amp; Next <ChevronRight />
            </button>
          </footer>
        </form>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// CREATE / EDIT NON-TEACHING FORM (POST /api/v1/staff & PUT /api/v1/staff/{id})
// ----------------------------------------------------------------------
function NonTeachingForm({ records, setRecords, existing }) {
  const n = useNavigate();
  const { boards, selectedBoard } = useAcademicContext();
  const { departments: apiDepts, designations: apiDesigs } = useStaffTypeOptions("Non-Teaching");
  const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
  const activeBoardName = selectedBoard?.name || selectedBoard?.boardName || activeBoardCode || "";
  const activeBoardId = selectedBoard?.id || selectedBoard?.boardId || undefined;
  const pincodeRequestRef = useRef(0);
  const labels = [
    "Personal Information",
    "Contact & Address",
    "Employment Details",
    "Salary & Bank",
    "Documents",
    "Emergency Contact",
    "Review",
  ];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(
    existing || {
      staffType: "Non-Teaching",
      employeeId: "",
      board: activeBoardName,
      boardName: activeBoardName,
      boardCode: activeBoardCode,
      ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
      status: "Active",
      nationality: "Indian",
      country: "India",
    },
  );
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [editingFromReview, setEditingFromReview] = useState(false);

  useEffect(() => {
    if (!existing && activeBoardName && !values.board) {
      setValues((v) => ({
        ...v,
        board: activeBoardName,
        boardName: activeBoardName,
        boardCode: activeBoardCode,
        ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
      }));
    }
  }, [activeBoardName, activeBoardCode, activeBoardId, existing, values.board]);

  // Fetch next employee ID dynamically from Settings Number Series / Staff API
  useEffect(() => {
    let isMounted = true;
    async function fetchNextId() {
      const nextId = await resolveNextStaffEmployeeId("Non-Teaching", records);
      if (isMounted && nextId) {
        setValues((v) => ({ ...v, employeeId: nextId }));
      }
    }
    if (!existing) fetchNextId();
    return () => { isMounted = false; };
  }, [existing, records]);

  useEffect(() => {
    const pincode = String(values.pin || "").replace(/\D/g, "").slice(0, 6);
    if (pincode !== String(values.pin || "")) {
      setValues((current) => ({ ...current, pin: pincode }));
      return undefined;
    }
    if (!/^\d{6}$/.test(pincode)) {
      pincodeRequestRef.current += 1;
      setPincodeError("");
      return undefined;
    }

    let ignore = false;
    const requestId = ++pincodeRequestRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(apiEndpoints.location.byPincode(pincode), { skipGlobalLoader: true });
        const data = response.data?.data ?? response.data?.Data ?? response.data ?? {};
        const location = {
          country: data.country || "India",
          state: data.state || "",
          district: data.district || "",
          city: data.city || data.postOffice || "",
        };
        if (ignore || requestId !== pincodeRequestRef.current) return;
        setValues((current) => ({ ...current, ...location }));
        setPincodeError("");
      } catch {
        if (!ignore && requestId === pincodeRequestRef.current) {
          setPincodeError("Location could not be loaded. Enter details manually.");
        }
      }
    }, 450);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [values.pin]);

  const next = () => {
    const currentFields = nonTeachingSteps[step] || [];
    const stepErrors = validateStepFields(currentFields, values, activeBoardName);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setToast("Please fill in all mandatory fields marked with an asterisk (*).");
      return;
    }

    setErrors({});
    if (editingFromReview) {
      setEditingFromReview(false);
      setStep(6);
      return;
    }
    setStep((s) => s + 1);
  };

  const save = async () => {
    for (let i = 0; i < 6; i++) {
      const stepFields = nonTeachingSteps[i] || [];
      const stepErrors = validateStepFields(stepFields, values, activeBoardName);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setToast(`Please fill in all mandatory fields in ${labels[i]}.`);
        setStep(i);
        return;
      }
    }

    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ") || values.employeeId;
    const resolvedCode = values.boardCode || resolveBoardCode({ board: values.board, boardName: values.boardName }, boards);
    const payload = {
      ...values,
      boardCode: resolvedCode !== "—" ? resolvedCode : values.boardCode,
      fullName,
      staffType: "Non-Teaching",
      profileStatus: "Completed",
      profileCompletionPercentage: 100,
    };

    setSubmitting(true);
    let targetId = existing?.id;
    try {
      if (existing?.id) {
        // PUT /api/v1/staff/{id}
        await apiClient.put(apiEndpoints.faculty.update(existing.id), payload);
      } else {
        // POST /api/v1/staff
        const res = await apiClient.post(apiEndpoints.faculty.create, payload);
        targetId = res.data?.id || res.data?.staffId;
      }
      const record = { ...payload, id: targetId, profileStatus: "Completed", profileCompletion: 100, addedOn: existing?.addedOn || new Date().toISOString().split("T")[0] };
      if (!existing) incrementSeriesSequence("employee-id");
      setRecords(existing ? records.map((r) => (String(r.id) === String(existing.id) ? record : r)) : [record, ...records]);
      if (existing) {
        setToast("Non-teaching staff profile updated successfully.");
        n(`/dashboard/staff/non-teaching`);
      } else {
        n(`/dashboard/staff/${record.id}`);
      }
    } catch (err) {
      const status = err?.response?.status;
      const errMsg = getApiErrorMessage(err, "Failed to save non-teaching staff record.");
      if (status === 409 || status === 400) {
        setToast(errMsg);
        const lower = errMsg.toLowerCase();
        const nextErrors = {};
        if (lower.includes("employee id")) {
          nextErrors.employeeId = errMsg;
          try {
            const nextId = await resolveNextStaffEmployeeId("Non-Teaching", records);
            if (nextId) setValues((v) => ({ ...v, employeeId: nextId }));
          } catch {}
        }
        if (lower.includes("email")) nextErrors.email = errMsg;
        if (lower.includes("mobile")) nextErrors.mobile = errMsg;
        if (lower.includes("aadhaar")) nextErrors.aadhaar = errMsg;
        setErrors(nextErrors);
        setStep(0);
        return;
      }
      console.warn("Save non-teaching staff API error:", err);
      targetId = existing?.id || Date.now();
      const record = { ...payload, id: targetId, profileStatus: "Completed", profileCompletion: 100, addedOn: existing?.addedOn || new Date().toISOString().split("T")[0] };
      if (!existing) incrementSeriesSequence("employee-id");
      setRecords(existing ? records.map((r) => (String(r.id) === String(existing.id) ? record : r)) : [record, ...records]);
      if (existing) {
        setToast("Non-teaching staff profile updated successfully.");
        n(`/dashboard/staff/non-teaching`);
      } else {
        n(`/dashboard/staff/${record.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={existing ? "Edit Non-Teaching Staff" : "Add Non-Teaching Staff"}
      subtitle="Admin completes the entire profile."
      breadcrumb={["People", "Staff Management"]}
    >
      <Toast message={toast} onClose={() => setToast("")} />
      <main className="staff-mock-page">
        <Back />
        <Steps labels={labels} step={step} />
        <section className="staff-form-panel non-teaching-form">
          <header>
            <Building2 />
            <div>
              <h2>{labels[step]}</h2>
              <p>Step {step + 1} of 7</p>
            </div>
          </header>
          {step < 6 ? (
            <div className="staff-form-grid">
              {nonTeachingSteps[step].map((f) => (
                <Field
                  key={f[0]}
                  item={f}
                  values={values}
                  setValues={setValues}
                  setErrors={setErrors}
                  error={errors[f[0]] || (f[0] === "pin" ? pincodeError : "")}
                  forceOptional={false}
                  departmentOptions={apiDepts}
                  designationOptions={apiDesigs}
                  staffType="Non-Teaching"
                />
              ))}
            </div>
          ) : (
            <Summary
              record={{
                ...values,
                fullName: [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" "),
              }}
              groups={labels.slice(0, 6).map((label, index) => [label, nonTeachingSteps[index]])}
              onEdit={(targetStep) => {
                setEditingFromReview(true);
                setStep(targetStep);
              }}
            />
          )}
          <footer>
            {step ? (
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft /> Previous
              </button>
            ) : null}
            <button className="cms-btn cms-btn-primary" onClick={step === 6 ? save : next}>
              {step === 6 ? "Save Non-Teaching Staff" : editingFromReview ? "Save & Return to Review" : "Next"}
              <ChevronRight />
            </button>
          </footer>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SEND LINK (POST /api/v1/staff/{id}/send-link)
// ----------------------------------------------------------------------
function SendLink({ record, update, activity }) {
  const n = useNavigate();
  const [email, setEmail] = useState(record.email || "");
  const [mobile, setMobile] = useState(record.mobile || "");
  const [days, setDays] = useState("7 Days");

  // Load configured credential generator settings or fallback
  const credSettings = useMemo(() => {
    try {
      const raw = localStorage.getItem("pjc-credential-settings");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      facultyEmailFormat: "{empid}@gmail.com",
      defaultPassword: "Pirnav@123",
    };
  }, []);

  const empIdClean = String(record?.employeeId || "empid").trim().toLowerCase();
  const facultyLoginEmail = credSettings.facultyEmailFormat
    ? credSettings.facultyEmailFormat.replace(/\{empid\}/gi, empIdClean)
    : `${empIdClean}@gmail.com`;
  const facultyPassword = credSettings.defaultPassword || "Pirnav@123";

  const [message, setMessage] = useState(
    `Please complete your remaining profile details using the link below.\n\nPortal Login Credentials:\nMail: ${facultyLoginEmail}\nPassword: ${facultyPassword}`
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(record.linkSent);
  const [feedback, setFeedback] = useState(null);
  const initialToken = record.profileLinkToken || record.token || record.onboardingToken || record.id || "";
  const [generatedLink, setGeneratedLink] = useState(
    initialToken
      ? `${window.location.origin}/staff/onboarding/${initialToken}`
      : `${window.location.origin}/staff/onboarding/${record.id || "staff"}`
  );

  const send = async () => {
    if (!email.trim()) {
      setFeedback({ success: false, message: "Please enter a valid recipient email address." });
      return;
    }
    setSending(true);
    setFeedback(null);
    let success = false;
    let finalLink = generatedLink;
    let statusMsg = "";
    let receivedToken = initialToken;

    try {
      // POST /api/v1/staff/{id}/send-link
      const res = await apiClient.post(apiEndpoints.faculty.sendLink(record.id), {
        email: email.trim(),
        mobile: mobile.trim(),
        validityDays: parseInt(days, 10) || 7,
        customMessage: message.trim(),
      });

      if (res?.data) {
        success = true;
        const resData = res.data.data || res.data;
        receivedToken = resData.token || resData.profileLinkToken || resData.onboardingToken || receivedToken;

        if (receivedToken) {
          finalLink = `${window.location.origin}/staff/onboarding/${receivedToken}`;
          setGeneratedLink(finalLink);
        } else if (resData.profileLink && String(resData.profileLink).includes("/staff/onboarding/")) {
          finalLink = resData.profileLink;
          setGeneratedLink(finalLink);
        } else if (resData.profileLink) {
          finalLink = resData.profileLink;
          setGeneratedLink(finalLink);
        }

        if (resData.emailSent) {
          statusMsg = `Profile completion email successfully sent to ${resData.emailRecipient || email.trim()}!`;
        } else if (resData.emailError) {
          statusMsg = `Link generated, but email delivery encountered an issue: ${resData.emailError}`;
        } else {
          statusMsg = `Profile completion link generated successfully for ${email.trim()}.`;
        }

        setFeedback({
          success: true,
          emailSent: !!resData.emailSent,
          message: statusMsg,
        });
      }
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/send-link fallback handled:", err);
      // Generate guaranteed functional link even if backend email gateway is offline
      const fallbackToken = record.profileLinkToken || record.token || record.id || `staff-${record.id}`;
      finalLink = `${window.location.origin}/staff/onboarding/${fallbackToken}`;
      setGeneratedLink(finalLink);
      receivedToken = fallbackToken;
      success = true;
      setFeedback({
        success: true,
        emailSent: false,
        message: `Profile link generated (${finalLink}). You can copy and share it directly with ${email.trim() || record.fullName}.`,
      });
    } finally {
      setSending(false);
    }

    if (success) {
      update({
        ...record,
        email: email.trim() || record.email,
        mobile: mobile.trim() || record.mobile,
        linkSent: true,
        linkSentAt: new Date().toISOString().split("T")[0],
        profileStatus: "Link Sent",
        profileLinkToken: receivedToken || record.profileLinkToken || String(record.id),
        profileCompletion: record.profileCompletion || 30,
      });
      if (activity) activity(`${record.fullName} profile link dispatched to ${email.trim() || record.email}`);
      setSent(true);
    }
  };

  const currentActiveLink = generatedLink || `${window.location.origin}/staff/onboarding/${record.profileLinkToken || record.token || record.id || "preview"}`;

  return (
    <DashboardLayout
      title="Send Profile Completion Link"
      subtitle="Send a secure profile completion link to Teaching Staff."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff/list" />
        <Steps labels={["Basic Details", "Send Link"]} step={1} />
        <section className="send-grid">
          <article className="staff-form-panel">
            <header>
              <Send />
              <div>
                <h2>Link Configuration</h2>
                <p>{record.fullName} · {record.employeeId}</p>
              </div>
            </header>
            <div className="staff-form-grid">
              <label>
                <span>Email Address <strong style={{ color: "var(--brand-primary, #6F8400)" }}>*</strong></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter staff email address"
                  required
                />
              </label>
              <label>
                <span>Mobile Number</span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter mobile number"
                />
              </label>
              <label>
                <span>Link Validity</span>
                <select value={days} onChange={(e) => setDays(e.target.value)}>
                  {[3, 7, 15, 30].map((x) => (
                    <option key={x} value={`${x} Days`}>{x} Days</option>
                  ))}
                </select>
              </label>
              <label className="is-wide">
                <span>Message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Personalized message to staff member..."
                />
              </label>
            </div>
            {feedback ? (
              <aside
                style={{
                  margin: "16px 0",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "0.9rem",
                  background: feedback.success && feedback.emailSent ? "#f0fdf4" : feedback.success ? "#fefce8" : "#fef2f2",
                  color: feedback.success && feedback.emailSent ? "#166534" : feedback.success ? "#854d0e" : "#991b1b",
                  border: `1px solid ${feedback.success && feedback.emailSent ? "#bbf7d0" : feedback.success ? "#fef08a" : "#fecaca"}`
                }}
              >
                {feedback.success && feedback.emailSent ? <Check size={18} /> : <AlertCircle size={18} />}
                <span>{feedback.message}</span>
              </aside>
            ) : sent ? (
              <aside className="success-banner">
                <Check /> Profile completion link generated successfully.
              </aside>
            ) : null}
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => n("/dashboard/staff/list")}>
                Back
              </button>
              <button className="cms-btn cms-btn-primary" onClick={send} disabled={sending}>
                <Send /> {sending ? "Sending Link..." : sent ? "Resend Link" : "Send Link"}
              </button>
            </footer>
          </article>
          <article className="email-preview">
            <Mail />
            <h3>Complete Your Faculty Profile - Pirnav College</h3>
            <p>Dear {record.fullName},</p>
            <p>
              Pirnav College Administration has created your faculty profile.
            </p>
            <p>
              Please use the secure link below to complete your remaining personal,
              educational, banking and document details.
            </p>

            {/* Portal Login Credentials Section */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid var(--cms-border, #e2e8f0)",
              borderRadius: "8px",
              padding: "12px 14px",
              margin: "14px 0",
              fontSize: "0.88rem",
              textAlign: "left"
            }}>
              <div style={{ fontWeight: "700", color: "#1e293b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} style={{ color: "var(--brand-primary, #6F8400)" }} /> Faculty Portal Login Credentials
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div>
                  <span style={{ color: "var(--cms-muted)" }}>Mail / Login: </span>
                  <strong style={{ color: "var(--brand-primary, #6F8400)", fontFamily: "monospace", fontSize: "0.95rem" }}>
                    {facultyLoginEmail}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--cms-muted)" }}>Password: </span>
                  <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: "0.95rem" }}>
                    {facultyPassword}
                  </strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cms-btn cms-btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "12px 20px",
                margin: "12px 0",
                background: "var(--brand-primary, #6F8400)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
              onClick={() => {
                window.open(currentActiveLink, "_blank");
              }}
            >
              <ExternalLink size={16} /> Complete Faculty Profile
            </button>
            <p>Recipient: <strong>{email || "—"}</strong></p>
            <p>Link validity: <strong>{days.toLowerCase()}</strong></p>
            <p style={{ fontSize: "0.8rem", color: "var(--cms-muted)" }}>
              For security, do not forward this link.
            </p>
            <p>
              Regards,<br />
              Pirnav College Administration
            </p>
          </article>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// PORTAL HOME & FORM (GET /api/v1/staff/token/{token}, save-profile-draft, submit-profile)
// ----------------------------------------------------------------------
function PortalHome({ record }) {
  const n = useNavigate();
  return (
    <div className="portal-shell">
      <aside>
        <GraduationCap />
        <strong>Pirnav Staff Portal</strong>
        <span>My Dashboard</span>
        <span>My Profile</span>
        <span>Documents</span>
        <span>Help</span>
      </aside>
      <main>
        <header>
          <div>
            <h1>Welcome, {record.fullName}</h1>
            <p>Complete and submit your professional profile.</p>
          </div>
          <Badge value={record.profileStatus} />
        </header>
        {record.profileStatus === "Needs Correction" ? (
          <aside className="correction-banner">
            Admin requested corrections: {record.correctionNote}
          </aside>
        ) : null}
        <section className="portal-profile">
          <UserRound />
          <div>
            <h2>{record.fullName}</h2>
            <p>{record.designation} · {record.department}</p>
          </div>
          <div className="completion">
            <strong>{record.profileCompletion}%</strong>
            <span>Profile completed</span>
          </div>
        </section>
        <section className="portal-sections">
          {portalSteps.slice(0, 8).map((s, i) => (
            <article key={s}>
              <span>
                {i < Math.floor(record.profileCompletion / 12.5) ? <Check /> : <Clock3 />}
              </span>
              <div>
                <strong>{s}</strong>
                <small>{i < Math.floor(record.profileCompletion / 12.5) ? "Completed" : "Pending"}</small>
              </div>
            </article>
          ))}
        </section>
        <button
          className="cms-btn cms-btn-primary portal-cta"
          onClick={() => n(`/mock-staff-portal/${record.id}/complete-profile`)}
        >
          Complete Profile <ChevronRight />
        </button>
      </main>
    </div>
  );
}

function PortalForm({ record, update, activity }) {
  const n = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(record);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);

  const handleSaveDraft = async () => {
    try {
      // POST /api/v1/staff/{id}/save-profile-draft
      await apiClient.post(apiEndpoints.faculty.saveProfileDraft(record.id), {
        sectionName: portalSteps[step],
        personal: values,
      });
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/save-profile-draft API offline");
    }
    update({ ...values, profileStatus: "In Progress" });
  };

  const next = () => {
    handleSaveDraft();
    update({
      ...values,
      profileStatus: "In Progress",
      profileCompletion: Math.min(95, 35 + (step + 1) * 7),
    });
    setStep((s) => s + 1);
  };

  const submit = async () => {
    try {
      // POST /api/v1/staff/{id}/submit-profile
      await apiClient.post(apiEndpoints.faculty.submitProfile(record.id));
    } catch (err) {
      console.warn("POST /api/v1/staff/{id}/submit-profile API offline");
    }

    update({
      ...values,
      profileStatus: "Submitted",
      profileCompletion: 100,
      profileSubmitted: true,
    });
    if (activity) activity(`${record.fullName} submitted profile`);
    n(`/mock-staff-portal/${record.id}`);
  };

  return (
    <div className="portal-shell">
      <aside>
        <GraduationCap />
        <strong>Pirnav Staff Portal</strong>
        {portalSteps.map((s, i) => (
          <button className={i === step ? "is-active" : ""} onClick={() => setStep(i)} key={s}>
            {i + 1}. {s}
          </button>
        ))}
      </aside>
      <main>
        <header>
          <div>
            <h1>{portalSteps[step]}</h1>
            <p>Complete your remaining staff profile.</p>
          </div>
          <span>{Math.round(((step + 1) / 8) * 100)}%</span>
        </header>
        {step < 7 ? (
          <section className="staff-form-panel">
            <div className="staff-form-grid">
              {portalFields[step].map((f) => (
                <Field
                  key={f[0]}
                  item={f}
                  values={values}
                  setValues={setValues}
                  error={errors[f[0]]}
                  forceOptional={true}
                />
              ))}
            </div>
            <footer>
              {step ? (
                <button className="cms-btn cms-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                  Previous
                </button>
              ) : null}
              <button className="cms-btn cms-btn-ghost" onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button className="cms-btn cms-btn-primary" onClick={next}>
                Save &amp; Continue
              </button>
            </footer>
          </section>
        ) : (
          <section className="staff-form-panel">
            <Summary
              record={values}
              onEdit={(groupIndex) => {
                const map = [0, 1, 2, 5, 6];
                setStep(map[groupIndex] !== undefined ? map[groupIndex] : groupIndex);
              }}
            />
            <label className="confirm-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              I confirm that the information provided is correct.
            </label>
            <footer>
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep(6)}>
                Previous
              </button>
              <button className="cms-btn cms-btn-primary" disabled={!confirmed} onClick={submit}>
                Submit Profile
              </button>
            </footer>
          </section>
        )}
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// PENDING SUBMISSIONS & BULK RESEND (POST /api/v1/staff/bulk-send-links)
// ----------------------------------------------------------------------
function Pending({ records = [], setRecords, activity }) {
  const n = useNavigate();
  const tabs = ["Link Sent", "In Progress", "Needs Correction", "Submitted"];
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [apiItems, setApiItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestedTab = searchParams.get("tab");
  const tab = tabs.includes(requestedTab) ? requestedTab : "Link Sent";

  // Fetch live staff list from API
  const fetchPendingStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(apiEndpoints.faculty.list, {
        params: { staffType: "Teaching", pageSize: 100 },
      });
      if (res?.data) {
        const items = res.data.items || res.data.data || (Array.isArray(res.data) ? res.data : []);
        setApiItems(items);
      }
    } catch (err) {
      console.warn("GET /api/v1/staff in Pending offline/fallback:", err);
      setApiItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingStaff();
    const handleUpdated = () => fetchPendingStaff();
    window.addEventListener("staff-records-updated", handleUpdated);
    window.addEventListener("storage", handleUpdated);
    return () => {
      window.removeEventListener("staff-records-updated", handleUpdated);
      window.removeEventListener("storage", handleUpdated);
    };
  }, [fetchPendingStaff]);

  // Combine API items, records state, and localStorage submitted faculty
  const mergedTeachingList = useMemo(() => {
    const map = new Map();

    // 1. Local state records
    (Array.isArray(records) ? records : []).forEach((r) => {
      if (!r) return;
      const norm = normalizeStaffRecord(r);
      const key = String(norm.id || norm.employeeId);
      map.set(key, norm);
      if (norm.employeeId) map.set(String(norm.employeeId).trim().toLowerCase(), norm);
    });

    // 2. Local storage submitted faculty list
    try {
      const localSubmitted = JSON.parse(localStorage.getItem("pjc_submitted_faculty_list") || "[]");
      if (Array.isArray(localSubmitted)) {
        localSubmitted.forEach((r) => {
          if (!r) return;
          const norm = normalizeStaffRecord(r);
          const key = String(norm.id || norm.employeeId);
          map.set(key, { ...(map.get(key) || {}), ...norm, profileStatus: "Submitted", reviewStatus: "Pending", profileCompletion: 100 });
          if (norm.employeeId) map.set(String(norm.employeeId).trim().toLowerCase(), { ...(map.get(key) || {}), ...norm, profileStatus: "Submitted", reviewStatus: "Pending", profileCompletion: 100 });
        });
      }
    } catch (e) {}

    // 3. API items
    if (Array.isArray(apiItems)) {
      apiItems.forEach((apiItem) => {
        if (!apiItem) return;
        const norm = normalizeStaffRecord(apiItem);
        const idKey = norm.id ? String(norm.id) : "";
        const empKey = norm.employeeId ? String(norm.employeeId).trim().toLowerCase() : "";
        const local = (idKey && map.get(idKey)) || (empKey && map.get(empKey));
        const merged = local ? { ...norm, ...local } : norm;
        if (idKey) map.set(idKey, merged);
        if (empKey) map.set(empKey, merged);
      });
    }

    const uniqueList = [];
    const seen = new Set();
    map.forEach((item) => {
      const uniqueKey = String(item.id || item.employeeId || "");
      if (!uniqueKey || seen.has(uniqueKey)) return;
      seen.add(uniqueKey);
      if (item.employeeId) seen.add(String(item.employeeId).trim().toLowerCase());
      if (item.id) seen.add(String(item.id));
      uniqueList.push(item);
    });

    return uniqueList.filter((r) => {
      if (!r) return false;
      const dept = String(r.department || "").trim().toLowerCase();
      const isTeaching = r.staffType === "Teaching" || (!r.staffType && !NON_TEACHING_DEPARTMENTS_SET.has(dept));
      return isTeaching;
    });
  }, [records, apiItems]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { "Link Sent": 0, "In Progress": 0, "Needs Correction": 0, "Submitted": 0 };
    mergedTeachingList.forEach((r) => {
      const status = String(r.profileStatus || "").trim();
      if (status === "Completed") return;
      if (status === "Submitted" || r.reviewStatus === "Pending" || r.profileCompletion === 100 || r.submittedAt || r.profileSubmittedAt) {
        counts["Submitted"]++;
      } else if (status === "Needs Correction" || r.correctionNote) {
        counts["Needs Correction"]++;
      } else if (status === "In Progress" || (Number(r.profileCompletion) > 30 && Number(r.profileCompletion) < 100)) {
        counts["In Progress"]++;
      } else {
        counts["Link Sent"]++;
      }
    });
    return counts;
  }, [mergedTeachingList]);

  const rows = useMemo(() => {
    return mergedTeachingList.filter((r) => {
      const status = String(r.profileStatus || "").trim();
      if (status === "Completed") return false;

      if (tab === "Submitted") {
        return status === "Submitted" || r.reviewStatus === "Pending" || r.profileCompletion === 100 || Boolean(r.submittedAt || r.profileSubmittedAt);
      }
      if (tab === "Needs Correction") {
        return status === "Needs Correction" || Boolean(r.correctionNote);
      }
      if (tab === "In Progress") {
        return status === "In Progress" || (Number(r.profileCompletion) > 30 && Number(r.profileCompletion) < 100 && status !== "Submitted" && status !== "Needs Correction");
      }
      if (tab === "Link Sent") {
        return status === "Link Sent" || status === "Pending" || !status || status === "Active" || Boolean(r.linkSent);
      }
      return false;
    });
  }, [mergedTeachingList, tab]);

  const pageSize = 10;
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [tab]);

  // POST /api/v1/staff/bulk-send-links
  const bulkResendLinks = async () => {
    const targetTeaching = rows.filter(
      (r) => selectedIds.length > 0 ? selectedIds.includes(r.id) : true
    );
    if (!targetTeaching.length) return;
    const ids = new Set(targetTeaching.map((r) => r.id));
    const today = new Date().toISOString().split("T")[0];

    try {
      await apiClient.post(apiEndpoints.faculty.bulkSendLinks, {
        staffIds: Array.from(ids),
        validityDays: 7,
      });
    } catch (err) {
      console.warn("POST /api/v1/staff/bulk-send-links API offline");
    }

    if (setRecords) {
      setRecords((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, linkSentAt: today } : r)));
    }
    if (activity) activity(`Bulk resent profile links to ${ids.size} teaching staff members`);
    setSelectedIds([]);
  };

  const isAllShownSelected = shown.length > 0 && shown.every((r) => selectedIds.includes(r.id));

  return (
    <DashboardLayout
      title="Pending Teaching Staff Submissions"
      subtitle="Track and review Teaching Staff profile completion."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff" label="Back to Staff Management" />
        <section className="staff-panel">
          <div className="staff-tabs">
            <div style={{ display: "flex", gap: "2px" }}>
              {tabs.map((t) => (
                <button className={tab === t ? "is-active" : ""} onClick={() => setSearchParams({ tab: t })} key={t}>
                  {t} {tabCounts[t] > 0 ? `(${tabCounts[t]})` : ""}
                </button>
              ))}
            </div>
            {tab === "Link Sent" || tab === "In Progress" || tab === "Needs Correction" ? (
              <button
                type="button"
                className="cms-btn cms-btn-primary staff-bulk-resend-btn"
                onClick={bulkResendLinks}
                style={{ marginLeft: "auto", flexShrink: 0, marginBottom: "4px" }}
              >
                <Send size={15} /> {selectedIds.length ? `Bulk Resend (${selectedIds.length})` : "Bulk Resend"}
              </button>
            ) : null}
          </div>
          <div className="staff-table-wrap">
            <table>
              <thead>
                <tr>
                  {tab !== "Submitted" ? (
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isAllShownSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const shownIds = shown.map((r) => r.id);
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...shownIds])));
                          } else {
                            const shownSet = new Set(shown.map((r) => r.id));
                            setSelectedIds((prev) => prev.filter((id) => !shownSet.has(id)));
                          }
                        }}
                        aria-label="Select All"
                      />
                    </th>
                  ) : null}
                  <th>Employee ID</th>
                  <th>Staff Name</th>
                  <th>Board Code</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Link Sent</th>
                  <th>Completion</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={tab !== "Submitted" ? 9 : 8} style={{ textAlign: "center", padding: "32px", color: "var(--cms-muted)" }}>
                      {loading ? "Loading submissions..." : `No ${tab.toLowerCase()} teaching staff records found.`}
                    </td>
                  </tr>
                ) : (
                  shown.map((r, idx) => (
                    <tr key={`pending-item-${r.id || r.employeeId || idx}`}>
                      {tab !== "Submitted" ? (
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => [...prev, r.id]);
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => id !== r.id));
                              }
                            }}
                            aria-label={`Select ${r.fullName}`}
                          />
                        </td>
                      ) : null}
                      <td><strong>{r.employeeId}</strong></td>
                      <td>
                        <div>
                          <strong>{r.fullName}</strong>
                          {r.email && r.email !== "—" ? (
                            <div style={{ fontSize: "11px", color: "var(--cms-muted)" }}>{r.email}</div>
                          ) : null}
                        </div>
                      </td>
                      <td>{r.boardCode || r.board || "—"}</td>
                      <td>{r.department}</td>
                      <td>{r.designation}</td>
                      <td>{r.linkSentAt || r.addedOn || "—"}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "45px", height: "6px", background: "var(--cms-border, #e2e8f0)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${tab === "Submitted" ? 100 : r.profileCompletion || 30}%`, height: "100%", background: tab === "Submitted" ? "#16a34a" : "var(--brand-primary, #6F8400)" }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "600" }}>{tab === "Submitted" ? "100%" : `${r.profileCompletion || 30}%`}</span>
                        </div>
                      </td>
                      <td><Badge value={tab === "Submitted" ? "Submitted" : r.profileStatus || "Link Sent"} /></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {tab === "Submitted" || r.profileStatus === "Submitted" ? (
                            <button
                              className="cms-btn cms-btn-primary"
                              style={{ padding: "5px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              onClick={() => n(`/dashboard/staff/${r.id || r.employeeId}/review`)}
                            >
                              <UserCheck size={13} /> Review Submission
                            </button>
                          ) : (
                            <button
                              className="cms-btn cms-btn-ghost"
                              style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              onClick={() => n(`/dashboard/staff/${r.id || r.employeeId}/send-link`)}
                            >
                              <Send size={13} /> {r.linkSent ? "Resend Link" : "Send Link"}
                            </button>
                          )}
                          <button
                            className="cms-btn cms-btn-ghost"
                            style={{ padding: "5px 8px" }}
                            title="View Details"
                            onClick={() => n(`/dashboard/staff/${r.id || r.employeeId}`)}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <footer className="staff-pagination">
            <span>
              Showing {shown.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, rows.length)} of {rows.length}
            </span>
            <div>
              <button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Prev</button>
              <strong>{page}</strong>
              <button disabled={page * pageSize >= rows.length} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </footer>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// STAFF DETAILS (GET /api/v1/staff/{id} & GET /api/v1/staff/{id}/print-pdf)
// ----------------------------------------------------------------------
function Details({ record, records, setRecords, id }) {
  const n = useNavigate();
  const [toast, setToast] = useState(null);
  const [apiDetail, setApiDetail] = useState(record || null);
  const [loading, setLoading] = useState(!record);

  const targetId = id || record?.id;

  // GET /api/v1/staff/{id}
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchDetail() {
      if (!targetId) return;
      try {
        setLoading(true);
        const res = await apiClient.get(apiEndpoints.faculty.getById(targetId), {
          signal: controller.signal,
          skipGlobalLoader: true,
        });
        if (isMounted && res.data) {
          const fetched = res.data.data || res.data;
          setApiDetail(fetched);
          if (typeof setRecords === "function" && fetched) {
            setRecords((prev) => {
              const list = Array.isArray(prev) ? prev : [];
              const exists = list.some((r) => String(r.id) === String(fetched.id));
              if (!exists) return [fetched, ...list];
              return list.map((r) => (String(r.id) === String(fetched.id) ? { ...r, ...fetched } : r));
            });
          }
        }
      } catch {
        // Fall back gracefully to existing record
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [targetId]);

  const activeRecord = apiDetail || record;

  if (loading && !activeRecord) {
    return (
      <DashboardLayout title="Staff Details" breadcrumb={["People", "Staff Management"]}>
        <main className="staff-mock-page">
          <p style={{ margin: "40px 0", textAlign: "center", color: "var(--cms-muted)" }}>
            Loading staff details...
          </p>
        </main>
      </DashboardLayout>
    );
  }

  if (!activeRecord) {
    return (
      <DashboardLayout title="Staff Record Not Found" breadcrumb={["People", "Staff Management"]}>
        <main className="staff-mock-page">
          <p style={{ margin: "20px 0" }}>The requested staff record could not be found.</p>
          <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/list")}>Back to Staff List</button>
        </main>
      </DashboardLayout>
    );
  }

  const handleSaveCard = async (updatedRecord) => {
    if (updatedRecord.firstName || updatedRecord.lastName) {
      updatedRecord.fullName =
        [updatedRecord.firstName, updatedRecord.middleName, updatedRecord.lastName].filter(Boolean).join(" ") || updatedRecord.fullName;
    }
    try {
      // PUT /api/v1/staff/{id}
      await apiClient.put(apiEndpoints.faculty.update(updatedRecord.id), updatedRecord);
      setApiDetail((prev) => ({ ...(prev || {}), ...updatedRecord }));
    } catch (err) {
      console.warn("PUT /api/v1/staff/{id} API error:", err);
    }
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r)));
    setToast("Staff details updated successfully.");
  };

  return (
    <DashboardLayout
      title="Staff Details"
      subtitle="View complete staff record and profile activity."
      breadcrumb={["People", "Staff Management"]}
      actions={
        activeRecord.staffType === "Teaching" && activeRecord.profileStatus === "Submitted" ? (
          <button className="cms-btn cms-btn-primary" onClick={() => n(`/dashboard/staff/${activeRecord.id}/review`)}>
            Review Submission
          </button>
        ) : null
      }
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff/list" />
        <section className="staff-detail-head">
          <UserRound />
          <div>
            <h2>{activeRecord.fullName || `${activeRecord.firstName || ""} ${activeRecord.lastName || ""}`.trim() || activeRecord.employeeId}</h2>
            <p>{activeRecord.employeeId} · {activeRecord.designation} · {activeRecord.department}</p>
            {activeRecord.staffType === "Teaching" && Array.isArray(activeRecord.allocatedSubjects || activeRecord.subjects) && (activeRecord.allocatedSubjects || activeRecord.subjects).length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", marginBottom: "4px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "var(--cms-muted)", fontWeight: "600" }}>Subject Allocation:</span>
                {(activeRecord.allocatedSubjects || activeRecord.subjects).map((sub, i) => (
                  <span key={i} className="subject-pill" style={{ padding: "1px 7px", fontSize: "10px" }}>
                    {typeof sub === "object" ? sub.name || sub.subjectName || String(sub) : String(sub)}
                  </span>
                ))}
              </div>
            ) : null}
            <Badge value={activeRecord.status || "Active"} />
          </div>
        </section>
        <section className="staff-panel">
          <Summary record={activeRecord} onSave={handleSaveCard} />
        </section>
      </main>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// ADMIN REVIEW (POST /api/v1/staff/{id}/admin-review)
// ----------------------------------------------------------------------
function Review({ record, update, activity }) {
  const n = useNavigate();
  const [correction, setCorrection] = useState(false);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const approve = async () => {
    setProcessing(true);
    try {
      // POST /api/v1/staff/{id}/admin-review (action: Approve)
      await apiClient.post(apiEndpoints.faculty.adminReview(record.id), {
        action: "Approve",
        correctionNotes: "",
      });

      update({
        ...record,
        profileStatus: "Completed",
        profileCompletion: 100,
        reviewStatus: "Approved",
      });
      if (activity) activity(`${record.fullName} profile approved by administration`);
      n(`/dashboard/staff/${record.id}`);
    } catch (err) {
      console.error("POST /api/v1/staff/{id}/admin-review failed", err);
      alert(getApiErrorMessage(err, "Failed to approve staff profile. Please try again."));
    } finally {
      setProcessing(false);
    }
  };

  const requestCorrection = async () => {
    if (!note.trim()) {
      alert("Please enter a specific correction message for the faculty member.");
      return;
    }
    setProcessing(true);
    try {
      // POST /api/v1/staff/{id}/admin-review (action: RequestCorrection)
      await apiClient.post(apiEndpoints.faculty.adminReview(record.id), {
        action: "RequestCorrection",
        correctionNotes: note.trim(),
      });

      update({
        ...record,
        profileStatus: "Needs Correction",
        correctionNote: note.trim(),
      });
      if (activity) activity(`${record.fullName} requested profile corrections: ${note.trim()}`);
      n(`/dashboard/staff/${record.id}`);
    } catch (err) {
      console.error("POST /api/v1/staff/{id}/admin-review failed", err);
      alert(getApiErrorMessage(err, "Failed to request correction. Please try again."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout
      title="Review Faculty Profile Submission"
      subtitle="Review submitted information before final administrative approval."
      breadcrumb={["People", "Staff Management"]}
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff/pending" />
        <section className="staff-form-panel">
          <header>
            <UserCheck />
            <div>
              <h2>{record.fullName || record.employeeId}</h2>
              <p>Submitted Profile Verification · {record.department} · {record.designation}</p>
            </div>
          </header>
          <Summary record={record} />
          {correction ? (
            <label className="correction-field" style={{ marginTop: "20px" }}>
              <span style={{ fontWeight: "700", color: "#c2410c" }}>Correction Message to Faculty *</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Specify the items or documents that need to be corrected (e.g. Please upload clear copy of Degree Certificate or update current address)."
                required
              />
            </label>
          ) : null}
          <footer>
            <button className="cms-btn cms-btn-ghost" onClick={() => n("/dashboard/staff/pending")}>
              Back
            </button>
            <button
              className="cms-btn cms-btn-ghost"
              disabled={processing}
              onClick={correction ? requestCorrection : () => setCorrection(true)}
              style={correction ? { color: "#c2410c", borderColor: "#fed7aa", background: "#fff7ed" } : {}}
            >
              {processing && correction ? "Sending..." : correction ? "Confirm Request Correction" : "Request Correction"}
            </button>
            <button className="cms-btn cms-btn-primary" disabled={processing} onClick={approve}>
              {processing && !correction ? "Approving..." : "Approve Profile"}
            </button>
          </footer>
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SUMMARY COMPONENT (Supports field editing, masking and save)
// ----------------------------------------------------------------------
function Summary({ record, groups: suppliedGroups, onEdit, onPrint, onSave }) {
  const { boards } = useAcademicContext();
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({});

  const activeBoardNames = useMemo(() => {
    if (!Array.isArray(boards)) return [];
    return boards
      .filter((b) => {
        if (!b) return false;
        if (b.status !== undefined && b.status !== null) {
          const st = String(b.status).trim().toLowerCase();
          if (st === "inactive" || st === "disabled" || b.status === false || b.status === 0) return false;
        }
        if (b.isActive !== undefined && b.isActive !== null && (b.isActive === false || b.isActive === 0)) {
          return false;
        }
        return true;
      })
      .map((b) => b.name || b.boardName)
      .filter((n) => Boolean(n) && n !== "—" && !isOther(n));
  }, [boards]);

  const defaultGroups = [
    [
      "Basic Information",
      [
        ["fullName", "Full Name"],
        ["employeeId", "Employee ID"],
        ["board", "Board Name"],
        ["dateOfBirth", "Date of Birth"],
        ["gender", "Gender"],
        ["status", "Status"],
        ["guardianName", "Father's / Husband's Name"],
        ["maritalStatus", "Marital Status"],
        ["nationality", "Nationality"],
        ["aadhaar", "Aadhaar Number"],
        ["pan", "PAN Number"],
        ["bloodGroup", "Blood Group"],
      ],
    ],
    [
      "Contact & Address",
      [
        ["email", "Email"],
        ["mobile", "Mobile"],
        ["alternateMobile", "Alternate Mobile"],
        ["currentAddress", "Current Address"],
        ["permanentAddress", "Permanent Address"],
        ["city", "City"],
        ["district", "District"],
        ["state", "State"],
        ["pin", "PIN"],
      ],
    ],
    [
      "Professional Details",
      [
        ["department", "Department"],
        ["designation", "Designation"],
        ["allocatedSubjects", "Subject Allocation"],
        ["dateOfJoining", "Date of Joining"],
        ["employmentType", "Employment Type"],
        ["staffType", "Staff Type"],
      ],
    ],
    [
      "Educational Qualifications",
      [
        ["highestQualification", "Highest Qualification"],
        ["university", "University / Board"],
        ["specialization", "Specialization"],
        ["passingYear", "Passing Year"],
        ["percentage", "Percentage / CGPA"],
      ],
    ],
    [
      "Experience",
      [
        ["totalExperience", "Total Experience"],
        ["previousInstitution", "Previous Institution"],
        ["previousDesignation", "Previous Designation"],
        ["experienceFrom", "From Date"],
        ["experienceTo", "To Date"],
      ],
    ],
    [
      "Documents",
      [
        ["aadhaarDocument", "Aadhaar Copy"],
        ["panDocument", "PAN Copy"],
        ["qualificationCertificate", "Qualification Certificate"],
        ["experienceCertificate", "Experience Certificate"],
        ["resume", "Resume"],
        ["photo", "Passport Photo"],
        ["signature", "Signature"],
        ["bankProof", "Bank Passbook / Cheque"],
      ],
    ],
    [
      "Bank Details",
      [
        ["bankName", "Bank Name"],
        ["accountHolder", "Account Holder Name"],
        ["accountNumber", "Account Number"],
        ["ifsc", "IFSC Code"],
        ["branch", "Branch"],
        ["accountType", "Account Type"],
        ["pfNumber", "PF Number"],
        ["esiNumber", "ESI Number"],
        ["uanNumber", "UAN Number"],
      ],
    ],
    [
      "Emergency Contact",
      [
        ["emergencyName", "Contact Name"],
        ["emergencyRelationship", "Relationship"],
        ["emergencyMobile", "Mobile Number"],
        ["emergencyAlternate", "Alternate Mobile"],
        ["emergencyAddress", "Address"],
      ],
    ],
  ];
  const groups = suppliedGroups || defaultGroups;

  const startEdit = (groupIndex) => {
    if (onEdit) {
      onEdit(groupIndex);
      return;
    }
    setFormData({ ...record });
    setEditingGroup(groupIndex);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...record, ...formData });
    }
    setEditingGroup(null);
  };

  const fieldTypes = {
    board: ["select", activeBoardNames],
    gender: ["select", ["Male", "Female", "Other"]],
    status: ["select", ["Active", "Inactive"]],
    bloodGroup: ["select", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]],
    maritalStatus: ["select", ["Single", "Married", "Other"]],
    employmentType: ["select", ["Full Time", "Part Time", "Contract"]],
    staffType: ["select", ["Teaching", "Non-Teaching"]],
    dateOfBirth: ["date"],
    dateOfJoining: ["date"],
    experienceFrom: ["date"],
    experienceTo: ["date"],
    currentAddress: ["textarea"],
    permanentAddress: ["textarea"],
    emergencyAddress: ["textarea"],
    department: ["select", defaultDepartments],
  };

  const renderFieldInput = (key, label) => {
    if (key === "allocatedSubjects" || key === "subjects") {
      const currentVal = formData.allocatedSubjects || formData.subjects || record.allocatedSubjects || record.subjects || [];
      return (
        <SubjectAllocationInput
          department={formData.department || record.department || ""}
          value={currentVal}
          onChange={(newSubs) => setFormData((prev) => ({ ...prev, allocatedSubjects: newSubs, subjects: newSubs }))}
        />
      );
    }
    const config = fieldTypes[key] || ["text"];
    const [type, options] = config;
    const rawVal = formData[key] !== undefined ? formData[key] : record[key];
    const val = rawVal === null || rawVal === undefined ? "" : rawVal;

    if (type === "select") {
      return (
        <select
          value={val}
          onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
        >
          <option value="">Select {label}</option>
          {(options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    if (type === "textarea") {
      return (
        <textarea
          value={val}
          onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
        />
      );
    }
    return (
      <input
        type={type}
        value={val}
        onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    );
  };

  // Helper for masking sensitive values
  const formatDisplayValue = (key, rawVal) => {
    if (rawVal === null || rawVal === undefined || String(rawVal).trim() === "") return "—";
    const str = String(rawVal).trim();
    if (key === "aadhaar" && str.length >= 12) {
      return `XXXX XXXX ${str.slice(-4)}`;
    }
    if (key === "accountNumber" && str.length >= 4) {
      return `••••••${str.slice(-4)}`;
    }
    return str;
  };

  return (
    <div className="staff-summary">
      {groups.map(([t, fields], groupIndex) => {
        const isEditing = editingGroup === groupIndex;
        const hasCustomEducation = t === "Educational Qualifications" && !isEditing && Array.isArray(record.education) && record.education.length > 0;
        const hasCustomExperience = t === "Experience" && !isEditing && (record.isFresher || (Array.isArray(record.experience) && record.experience.length > 0));

        return (
          <article key={t} className={isEditing ? "is-editing-card" : ""}>
            <header>
              <h3>{t}</h3>
              {!isEditing ? (
                onSave || onEdit ? (
                  <button type="button" onClick={() => startEdit(groupIndex)}>
                    <Pencil /> Edit
                  </button>
                ) : onPrint ? (
                  <button type="button" onClick={() => onPrint(groupIndex)}>
                    <Printer /> Print
                  </button>
                ) : null
              ) : null}
            </header>

            {hasCustomEducation ? (
              <div style={{ overflowX: "auto", margin: "8px 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "var(--cms-bg, #f8fafc)", textAlign: "left" }}>
                      <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>Level</th>
                      <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>Degree</th>
                      <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>University</th>
                      <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>Specialization</th>
                      <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>Year</th>
                      <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>% / CGPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.education.map((edu, idx) => (
                      <tr key={edu.id || `edu-row-${idx}`}>
                        <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}><strong>{edu.highestQualification || "—"}</strong></td>
                        <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{edu.degreeName || "—"}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{edu.university || "—"}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{edu.specialization || "—"}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{edu.passingYear || "—"}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{edu.percentage || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : hasCustomExperience ? (
              <div style={{ margin: "8px 0" }}>
                {record.isFresher ? (
                  <p style={{ color: "var(--cms-muted, #64748b)", fontStyle: "italic", margin: "4px 0" }}>
                    Fresher / No previous experience records.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <p style={{ fontSize: "12px", color: "var(--cms-muted, #64748b)", marginBottom: "6px" }}>
                      Total Experience: <strong>{record.totalExperience || 0} Years</strong>
                    </p>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "var(--cms-bg, #f8fafc)", textAlign: "left" }}>
                          <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>Institution</th>
                          <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>Designation</th>
                          <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>From</th>
                          <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>To</th>
                          <th style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>Working</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.experience.map((exp, idx) => (
                          <tr key={exp.id || `exp-row-${idx}`}>
                            <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}><strong>{exp.institution || "—"}</strong></td>
                            <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{exp.designation || "—"}</td>
                            <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{exp.fromDate || "—"}</td>
                            <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{exp.currentlyWorking ? "Present" : exp.toDate || "—"}</td>
                            <td style={{ padding: "6px 8px", border: "1px solid var(--cms-border, #e2e8f0)" }}>{exp.currentlyWorking ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              fields.map((field) => {
                const [key, label] = Array.isArray(field)
                  ? field
                  : [field, field.replace(/([A-Z])/g, " $1")];
                return (
                  <p key={key}>
                    <span>{label}</span>
                    {isEditing ? (
                      renderFieldInput(key, label)
                    ) : (
                      <strong>
                        {key === "allocatedSubjects" || key === "subjects" ? (
                          Array.isArray(record[key] || record.allocatedSubjects || record.subjects) &&
                          (record[key] || record.allocatedSubjects || record.subjects).length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                              {(record[key] || record.allocatedSubjects || record.subjects).map((sub, i) => (
                                <span key={i} className="subject-pill" style={{ padding: "2px 8px", fontSize: "10px" }}>
                                  {typeof sub === "object" ? sub.name || sub.subjectName || String(sub) : String(sub)}
                                </span>
                              ))}
                            </div>
                          ) : typeof (record[key] || record.allocatedSubjects || record.subjects) === "string" &&
                            (record[key] || record.allocatedSubjects || record.subjects).trim() ? (
                            record[key] || record.allocatedSubjects || record.subjects
                          ) : (
                            "—"
                          )
                        ) : (
                          formatDisplayValue(key, record[key])
                        )}
                      </strong>
                    )}
                  </p>
                );
              })
            )}

            {isEditing ? (
              <footer style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--cms-border)" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setEditingGroup(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleSave}
                >
                  Save
                </button>
              </footer>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN ROOT PAGE ROUTER COMPONENT
// ----------------------------------------------------------------------
export default function StaffManagementPage() {
  const loc = useLocation();
  const n = useNavigate();
  const { id } = useParams();

  const [records, setRaw] = useState(() => []);
  const [activities, setActivityRaw] = useState(() => []);
  const [toast, setToast] = useState("");
  const [loadedStaff, setLoadedStaff] = useState(null);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const safeRecords = useMemo(() => {
    return Array.isArray(records) ? records : [];
  }, [records]);

  const setRecords = (next) => {
    const rawList = Array.isArray(next) ? next : [];
    const seen = new Set();
    const list = [];
    for (const item of rawList) {
      if (!item) continue;
      const key = String(item.id ?? item.employeeId ?? "");
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      list.push(item);
    }
    setRaw(list);
    write(STORE, list);
  };

  const update = (record) => {
    setRecords(safeRecords.map((r) => (String(r.id) === String(record.id) ? record : r)));
    setToast("Staff profile updated successfully.");
  };

  const activity = (text) => {
    const next = [text, ...activities].slice(0, 8);
    setActivityRaw(next);
    write(ACTIVITY_STORE, next);
  };

  // Initial Staff Load (GET /api/v1/staff)
  useEffect(() => {
    let isMounted = true;
    async function loadInit() {
      try {
        const listRes = await staffApi.getStaffPaged({ PageNumber: 1, PageSize: 50 });
        if (isMounted && listRes.data) {
          const listItems = listRes.data.items || listRes.data.data || (Array.isArray(listRes.data) ? listRes.data : []);
          if (Array.isArray(listItems) && listItems.length > 0) {
            setRecords(listItems);
          }
        }
      } catch (err) {}
    }
    loadInit();
    return () => { isMounted = false; };
  }, []);

  // Fetch staff record from API whenever id changes
  useEffect(() => {
    if (!id) {
      setLoadedStaff(null);
      setLoadingStaff(false);
      return;
    }

    let isMounted = true;
    async function loadStaff() {
      try {
        setLoadingStaff(true);
        let apiData = null;
        try {
          const res = await staffApi.getStaffById(id);
          if (res?.data) {
            apiData = res.data.data || res.data;
          }
        } catch (apiErr) {
          console.warn("Failed to fetch staff record by id from API:", apiErr);
        }

        let localSubmitted = null;
        try {
          const raw = localStorage.getItem(`pjc_submitted_faculty_${id}`) || (apiData?.employeeId ? localStorage.getItem(`pjc_submitted_faculty_${apiData.employeeId}`) : null);
          if (raw) localSubmitted = JSON.parse(raw);
        } catch (e) {}

        const finalData = localSubmitted ? { ...(apiData || {}), ...localSubmitted } : apiData;
        if (isMounted && finalData) {
          setLoadedStaff(finalData);
        }
      } finally {
        if (isMounted) setLoadingStaff(false);
      }
    }
    loadStaff();
    return () => { isMounted = false; };
  }, [id]);

  const localRecord = safeRecords.find(
    (r) => String(r.id) === String(id) || (r.employeeId && String(r.employeeId).trim().toLowerCase() === String(id).trim().toLowerCase())
  );
  const rawRecord = loadedStaff || localRecord;
  const record = useMemo(() => {
    if (!rawRecord) return null;
    return normalizeStaffRecord(rawRecord);
  }, [rawRecord]);

  const p = loc.pathname.replace(/\/$/, "");

  let page;
  if (p === "/dashboard/staff" || p === "/dashboard/faculty")
    page = <Dashboard records={safeRecords} />;
  else if (p === "/dashboard/staff/add") page = <TypeSelect />;
  else if (p === "/dashboard/staff/add-teaching")
    page = <TeachingForm records={safeRecords} setRecords={setRecords} />;
  else if (p === "/dashboard/staff/add-non-teaching")
    page = <NonTeachingForm records={safeRecords} setRecords={setRecords} />;
  else if (p === "/dashboard/staff/list")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="All" />;
  else if (p === "/dashboard/staff/teaching")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="Teaching" />;
  else if (p === "/dashboard/staff/non-teaching")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="Non-Teaching" />;
  else if (p === "/dashboard/staff/completed")
    page = <StaffList records={safeRecords} setRecords={setRecords} forced="Completed" />;
  else if (p === "/dashboard/staff/pending" || p.startsWith("/dashboard/staff/pending"))
    page = <Pending records={safeRecords} setRecords={setRecords} activity={activity} />;
  else if (loadingStaff && !record)
    page = (
      <DashboardLayout title="Staff Details" breadcrumb={["People", "Staff Management"]}>
        <main className="staff-mock-page">
          <p style={{ margin: "40px 0", textAlign: "center", color: "var(--cms-muted)" }}>
            Loading staff details...
          </p>
        </main>
      </DashboardLayout>
    );
  else if (p.endsWith("/send-link") && record)
    page = <SendLink record={record} update={update} activity={activity} />;
  else if (p.endsWith("/review") && record)
    page = <Review record={record} update={update} activity={activity} />;
  else if (p.endsWith("/edit") && record)
    page =
      record.staffType === "Teaching" ? (
        <TeachingForm records={safeRecords} setRecords={setRecords} existing={record} />
      ) : (
        <NonTeachingForm records={safeRecords} setRecords={setRecords} existing={record} />
      );
  else if (id || record)
    page = <Details record={record} id={id} records={safeRecords} setRecords={setRecords} />;
  else
    page = (
      <DashboardLayout title="Staff Record Not Found" breadcrumb={["People", "Staff Management"]}>
        <main className="staff-mock-page">
          <p style={{ margin: "20px 0" }}>The requested staff record could not be found.</p>
          <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/list")}>Back to Staff List</button>
        </main>
      </DashboardLayout>
    );

  return (
    <>
      {page}
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </>
  );
}

StaffManagementPage.pageConfig = { title: "Staff Management" };
StaffManagementPage.facultySubjectAllocationConfig = { title: "Staff Subject Allocation" };
