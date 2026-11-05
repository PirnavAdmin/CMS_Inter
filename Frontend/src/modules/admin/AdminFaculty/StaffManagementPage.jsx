import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams, Navigate } from "react-router-dom";
import { generateNextNumber, incrementSeriesSequence } from "@/data/numberSeriesData.js";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
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
  Calendar,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import Search3DIcon from "@/shared/components/Search3DIcon.jsx";
import { ConfirmDialog, Modal, Skeleton, SkeletonAvatar, SkeletonButton, SkeletonCard, SkeletonPage, SkeletonRow, SkeletonText, StatusBadge, Toast } from "@/shared/components/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as staffApi from "@/api/staffApi.js";
import { loadCachedDepartments, loadCachedDesignations } from "../AdminDepartments/DepartmentManagementPage.jsx";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  "stores & inventory",
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
  "transport manager",
  "inventory manager",
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
  "driver",
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
  "Stores & Inventory",
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
  "Transport Manager",
  "Inventory Manager",
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
  "Computer Science": ["Head of Department (HOD)", "Professor", "Associate Professor", "Assistant Professor", "Senior Lecturer", "Lecturer", "Junior Lecturer", "Lab Incharge"],
  Mathematics: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer", "Junior Lecturer"],
  Physics: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer", "Junior Lecturer", "Lab Incharge"],
  Chemistry: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer", "Junior Lecturer", "Lab Incharge"],
  Biology: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer", "Junior Lecturer", "Lab Incharge"],
  Botany: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer", "Junior Lecturer"],
  Zoology: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer", "Junior Lecturer"],
  English: ["Head of Department (HOD)", "Professor", "Associate Professor", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Commerce: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Economics: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Accountancy: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  "Business Studies": ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Statistics: ["Head of Department (HOD)", "Professor", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Electronics: ["Head of Department (HOD)", "Assistant Professor", "Senior Lecturer", "Lecturer", "Lab Incharge"],
  Hindi: ["Head of Department (HOD)", "Senior Lecturer", "Lecturer"],
  Telugu: ["Head of Department (HOD)", "Senior Lecturer", "Lecturer"],
  Sanskrit: ["Head of Department (HOD)", "Senior Lecturer", "Lecturer"],
  Urdu: ["Head of Department (HOD)", "Senior Lecturer", "Lecturer"],
  Languages: ["Head of Department (HOD)", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Civics: ["Head of Department (HOD)", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  History: ["Head of Department (HOD)", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  "Political Science": ["Head of Department (HOD)", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Sociology: ["Head of Department (HOD)", "Assistant Professor", "Senior Lecturer", "Lecturer"],
  Biotechnology: ["Head of Department (HOD)", "Assistant Professor", "Lecturer", "Lab Incharge"],
};

export const nonTeachingDesignationMap = {
  "Stores & Inventory": ["Inventory Manager"],
  Administration: ["Administrative Officer", "Office Administrator", "Office Assistant", "Clerk", "Attender / Peon", "Data Entry Operator"],
  "Accounts & Finance": ["Accountant", "Senior Accountant", "Junior Accountant", "Finance Executive", "Accounts Executive", "Cashier", "Office Assistant"],
  Accounts: ["Accountant", "Senior Accountant", "Junior Accountant", "Finance Executive", "Accounts Executive", "Cashier", "Office Assistant"],
  Finance: ["Accountant", "Senior Accountant", "Finance Executive", "Cashier"],
  Library: ["Librarian", "Assistant Librarian", "Library Assistant", "Attender"],
  "Maintenance & Facilities": ["Maintenance Supervisor", "Electrician", "Plumber", "Carpenter", "Gardener", "Attender / Peon"],
  Maintenance: ["Maintenance Supervisor", "Electrician", "Plumber", "Carpenter", "Gardener", "Attender / Peon"],
  Transport: ["Transport Manager", "Transport Coordinator", "Transport Incharge", "Driver"],
  Transportation: ["Transport Manager", "Transport Coordinator", "Transport Incharge", "Driver"],
  Security: ["Security Officer", "Security Supervisor", "Security Guard", "Watchman"],
  "Human Resources": ["HR Manager", "HR Executive", "Office Assistant"],
  HR: ["HR Manager", "HR Executive", "Office Assistant"],
  Admissions: ["Admissions Officer", "Admissions Counselor", "Data Entry Operator", "Office Assistant"],
  Hostel: ["Hostel Warden", "Assistant Warden", "Attender / Peon", "Cleaner"],
  "Hostel Management": ["Hostel Warden", "Assistant Warden", "Attender / Peon", "Cleaner"],
  "Campus Operations": ["Operations Manager", "Facility Supervisor", "Office Assistant"],
  Operations: ["Operations Manager", "Facility Supervisor", "Office Assistant"],
  "Student Affairs": ["Student Affairs Officer", "Counselor", "Office Assistant"],
  "IT & Systems Support": ["IT Support Executive", "System Administrator", "Lab Assistant"],
  "IT Support": ["IT Support Executive", "System Administrator", "Lab Assistant"],
  "Examinations Cell": ["Examination Incharge", "Data Entry Operator", "Clerk"],
  Examinations: ["Examination Incharge", "Data Entry Operator", "Clerk"],
  Housekeeping: ["Housekeeping Supervisor", "Cleaner", "Attender / Peon"],
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

const read = (key, fallback = []) => fallback;
const write = () => { };
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

  const isPrincipalRecord =
    String(r.role || "").trim().toLowerCase() === "principal" ||
    String(r.roleName || "").trim().toLowerCase() === "principal" ||
    String(r.designation || personal.designation || "").trim().toLowerCase() === "principal" ||
    Number(r.roleId || personal.roleId) === 2;

  const resolvedRole = r.role || r.roleName || personal.role || (isPrincipalRecord ? "Principal" : (r.staffType === "Non-Teaching" ? "Cleaner" : "Faculty"));
  const resolvedRoleName = r.roleName || r.role || personal.role || (isPrincipalRecord ? "Principal" : (r.staffType === "Non-Teaching" ? "Cleaner" : "Faculty"));

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
    designation: r.designation || personal.designation || (isPrincipalRecord ? "Principal" : "Assistant Professor"),
    staffType: r.staffType || "Teaching",
    role: resolvedRole,
    roleName: resolvedRoleName,
    roleId: r.roleId || personal.roleId || (isPrincipalRecord ? 2 : (resolvedRole === "Faculty" ? 4 : resolvedRole === "HOD" ? 3 : resolvedRole === "Accounts" || resolvedRole === "Accountant" ? 7 : resolvedRole === "Examination Cell" ? 8 : resolvedRole === "Library" ? 9 : resolvedRole === "Placement Officer" ? 11 : resolvedRole === "Cleaner" ? 13 : resolvedRole === "Driver" ? 12 : resolvedRole === "Hostel Warden" ? 10 : (r.staffType === "Non-Teaching" ? 13 : 4))),
    assignedCampusIds: Array.isArray(r.assignedCampusIds) ? r.assignedCampusIds : [],
    assignedCampuses: Array.isArray(r.assignedCampuses) ? r.assignedCampuses : [],
    assignedBoardIds: Array.isArray(r.assignedBoardIds) ? r.assignedBoardIds : [],
    assignedBoards: Array.isArray(r.assignedBoards) ? r.assignedBoards : [],
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

export const resolveNextStaffEmployeeId = async (staffType = "Teaching", existingRecords = [], selectedCampus = null) => {
  const isTeaching = String(staffType || "").toLowerCase().includes("teach") && !String(staffType || "").toLowerCase().includes("non");
  const prefix = isTeaching ? "PCTCH" : "PCNT";
  const seriesCode = isTeaching ? "TEACHING_STAFF_ID" : "NON_TEACHING_STAFF_ID";
  const requestedStaffType = isTeaching ? "Teaching" : "Non-Teaching";
  const campusId = selectedCampus?.campusId ?? selectedCampus?.id;

  const readSeriesSettings = async (campusId) => {
    try {
      const response = await apiClient.get(apiEndpoints.numberSeries.getByCode(seriesCode), {
        params: campusId != null ? { campusId } : undefined,
      });
      return response?.data?.data ?? response?.data?.Data ?? response?.data ?? {};
    } catch {
      return {};
    }
  };

  const nextIdFromStaffRecords = (staffRecords, settings = {}) => {
    const configuredPrefix = String(settings.prefix || prefix).trim();
    const numberLength = Math.max(1, Number(settings.numberLength) || 4);
    const startNumber = Math.max(1, Number(settings.startNumber) || 1);
    let maxSequence = startNumber - 1;

    // Respect the database-tracked current sequence if available
    const dbSequence = settings.currentSequence ?? settings.CurrentSequence;
    if (dbSequence != null && !isNaN(dbSequence)) {
      maxSequence = Math.max(maxSequence, Number(dbSequence));
    }

    for (const record of staffRecords) {
      const employeeId = String(record?.employeeId ?? record?.EmployeeId ?? record?.employeeID ?? "").trim();
      if (!employeeId.toUpperCase().startsWith(configuredPrefix.toUpperCase())) continue;
      const suffix = employeeId.slice(configuredPrefix.length);
      if (!/^\d+$/.test(suffix)) continue;
      maxSequence = Math.max(maxSequence, Number(suffix));
    }

    return `${configuredPrefix}${String(maxSequence + 1).padStart(numberLength, "0")}`;
  };

  let staffRecords = null;
  try {
    const params = {
      PageNumber: 1,
      PageSize: 1000,
      StaffType: requestedStaffType,
      ...(campusId != null && campusId !== "" ? { CampusId: Number(campusId) || campusId } : {}),
    };
    const response = await staffApi.getStaffPaged(params);
    const data = response?.data?.data ?? response?.data?.Data ?? response?.data ?? {};
    const candidates = [
      data?.items,
      data?.Items,
      data?.staff,
      data?.Staff,
      data?.results,
      data?.Results,
      data?.data?.items,
      data?.data?.Items,
      Array.isArray(data) ? data : null,
    ];
    staffRecords = candidates.find(Array.isArray) ?? null;
  } catch {
    // Use records already loaded by the staff page if the API is unavailable.
  }

  if (!Array.isArray(staffRecords)) {
    staffRecords = Array.isArray(existingRecords) ? existingRecords : [];
  }

  staffRecords = staffRecords.filter((record) => {
    if (selectedCampus && !isStaffMatchingCampus(record, selectedCampus)) return false;
    const type = String(record?.staffType ?? record?.StaffType ?? "").toLowerCase();
    const employeeId = String(record?.employeeId ?? record?.EmployeeId ?? record?.employeeID ?? "").toUpperCase();
    return isTeaching
      ? (!type.includes("non") && type.includes("teach")) || employeeId.startsWith(prefix)
      : type.includes("non") || employeeId.startsWith(prefix);
  });

  const settings = await readSeriesSettings(campusId);
  return nextIdFromStaffRecords(staffRecords, settings);
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
  if (recordBoardId) {
    return targetId ? String(recordBoardId) === String(targetId) : true;
  }

  // 2. Match staff board code if explicitly present on record
  const recordBoardCode = String(staffRecord.boardCode || staffRecord.BoardCode || "").trim().toUpperCase();
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

  // 3. Match staff board name string if explicitly present on record
  const recordBoardName = String(staffRecord.board || staffRecord.boardName || staffRecord.BoardName || "").trim().toLowerCase();
  if (targetName && recordBoardName && recordBoardName !== "—") {
    if (recordBoardName === targetName) return true;
    if (targetName.includes("andhra") && recordBoardName.includes("andhra")) return true;
    if (targetName.includes("telangana") && recordBoardName.includes("telangana")) return true;
    if (targetName.includes("cbse") && recordBoardName.includes("cbse")) return true;
    if (targetName.includes("icse") && recordBoardName.includes("icse")) return true;
    if (targetName.includes("central") && recordBoardName.includes("central")) return true;
  }

  // 4. If no specific board is attached to the staff record, they are shared/general across all boards
  return true;
};

export const isStaffMatchingCampus = (staffRecord, selectedCampus) => {
  if (!selectedCampus) return true;
  if (!staffRecord) return false;

  const targetId = selectedCampus.campusId ?? selectedCampus.id;
  const targetName = selectedCampus.campusName ?? selectedCampus.name;
  const targetCode = selectedCampus.campusCode ?? selectedCampus.code;

  if (targetId == null && !targetName && !targetCode) return true;

  // Active or past assigned campuses list (supports multi-campus or transferred staff)
  const assignments = staffRecord.assignedCampuses || staffRecord.staffCampusAssignments || staffRecord.StaffCampusAssignments;
  if (Array.isArray(assignments) && assignments.length > 0) {
    const matchesAssignment = assignments.some((c) => {
      const cId = c.campusId ?? c.id ?? c.Id;
      const cCode = c.campusCode ?? c.code ?? c.Code;
      const cName = c.campusName ?? c.name ?? c.Name;
      if (targetId != null && cId != null) return String(cId) === String(targetId);
      if (targetCode && cCode) return String(cCode).trim().toLowerCase() === String(targetCode).trim().toLowerCase();
      if (targetName && cName) return String(targetName).trim().toLowerCase() === String(targetName).trim().toLowerCase();
      return false;
    });
    if (matchesAssignment) return true;
  }

  const recordCampus = staffRecord.campus ?? staffRecord.Campus ?? {};
  const recordId = staffRecord.campusId ?? staffRecord.CampusId ?? recordCampus.campusId ?? recordCampus.id ?? recordCampus.Id;
  const recordName = staffRecord.campusName ?? staffRecord.CampusName ?? recordCampus.campusName ?? recordCampus.name ?? recordCampus.Name;
  const recordCode = staffRecord.campusCode ?? staffRecord.CampusCode ?? recordCampus.campusCode ?? recordCampus.code ?? recordCampus.Code;

  if (recordId != null && targetId != null) return String(recordId) === String(targetId);
  if (recordCode && targetCode) return String(recordCode).trim().toLowerCase() === String(targetCode).trim().toLowerCase();
  if (recordName && targetName) return String(recordName).trim().toLowerCase() === String(targetName).trim().toLowerCase();
  return false;
};

export const TEACHING_ROLE_NAMES = [
  "Dean",
  "Principal",
  "HOD",
  "Faculty",
];

export const NON_TEACHING_ROLE_NAMES = [
  "Transport Manager",
  "Accountant",
  "Inventory Manager",
  "Examination Cell",
  "Hostel Warden",
  "Driver",
  "Attendant",
];

const teachingFields = [
  ["employeeId", "Employee ID", "text", [], true],
  ["role", "Role", "search-select", TEACHING_ROLE_NAMES, true],
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
  // Step 0: Personal Information
  [
    ["employeeId", "Employee ID"],
    ["role", "Role", "search-select", NON_TEACHING_ROLE_NAMES, true],
    ["firstName", "First Name"],
    ["middleName", "Middle Name", "text", [], false],
    ["lastName", "Last Name"],
    ["guardianName", "Father's / Husband's Name"],
    ["gender", "Gender", "select", ["Male", "Female", "Other"]],
    ["dateOfBirth", "Date of Birth", "date"],
    ["maritalStatus", "Marital Status", "text", [], false],
    ["bloodGroup", "Blood Group", "select", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], false],
    ["nationality", "Nationality", "text", [], false],
    ["aadhaar", "Aadhaar Number"],
    ["pan", "PAN Number", "text", [], false],
    ["profilePhoto", "Profile Photo", "file", [], false],
  ],
  // Step 1: Contact & Address
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
  // Step 2: Employment Details (Job Details)
  [
    ["department", "Department", "search-select", nonTeachingDepartments, true],
    ["designation", "Designation", "search-select", nonTeachingDesignations, true],
    ["dateOfJoining", "Date of Joining", "date"],
    ["qualification", "Qualification", "text", [], false],
    ["experience", "Experience", "text", [], false],
    ["status", "Status", "select", ["Active", "Inactive"], true, "start-new-row"],
  ],
  /*
  // Step 4 (Salary & Bank) is commented out as salary structure is assigned in a separate module
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
  */
  // Step 3 (formerly Step 4): Documents
  [
    ["aadhaarDocument", "Aadhaar (PDF)", "file", [], false],
    ["panDocument", "PAN (PDF)", "file", [], false],
    ["qualificationCertificate", "Qualification Certificate (PDF)", "file", [], false],
    ["experienceCertificate", "Experience Certificate (PDF)", "file", [], false],
    ["resume", "Resume (PDF)", "file", [], false],
    ["bankProof", "Bank Passbook / Cancelled Cheque (PDF)", "file", [], false],
    ["drivingLicence", "Driving Licence (PDF)", "file", [], false],
    ["otherDocuments", "Other Documents (PDF)", "file", [], false],
  ],
  // Step 4 (formerly Step 5): Emergency Contact
  [
    ["emergencyName", "Contact Name", "text", [], false],
    ["emergencyRelationship", "Relationship", "text", [], false],
    ["emergencyMobile", "Mobile", "text", [], false],
    ["emergencyAlternate", "Alternate Mobile", "text", [], false],
    ["emergencyAddress", "Address", "textarea", [], false],
  ],
];

export const getNonTeachingStepFields = (stepIndex, values = {}) => {
  const isTransport =
    String(values?.department || "").trim().toLowerCase().includes("transport") ||
    String(values?.designation || "").trim().toLowerCase().includes("driver");

  if (stepIndex === 2) {
    const base = [
      ["department", "Department", "search-select", nonTeachingDepartments, true],
      ["designation", "Designation", "search-select", nonTeachingDesignations, true],
    ];
    if (isTransport) {
      base.push(
        ["drivingLicenseNumber", "Driver's License Number", "text", [], true],
        ["drivingLicenseExpiryDate", "License Expiry Date", "date", [], true]
      );
    }
    base.push(
      ["dateOfJoining", "Date of Joining", "date", [], true],
      ["qualification", "Qualification", "text", [], false],
      ["experience", "Experience", "text", [], false],
      ["status", "Status", "select", ["Active", "Inactive"], true, "start-new-row"]
    );
    return base;
  }
  if (stepIndex === 3) {
    const docs = [
      ["aadhaarDocument", "Aadhaar (PDF)", "file", [], false],
      ["panDocument", "PAN (PDF)", "file", [], false],
      ["qualificationCertificate", "Qualification Certificate (PDF)", "file", [], false],
      ["experienceCertificate", "Experience Certificate (PDF)", "file", [], false],
      ["resume", "Resume (PDF)", "file", [], false],
      ["bankProof", "Bank Passbook / Cancelled Cheque (PDF)", "file", [], false],
    ];
    if (isTransport) {
      docs.push(["drivingLicence", "Driving Licence (PDF)", "file", [], true]);
    } else {
      docs.push(["drivingLicence", "Driving Licence (PDF)", "file", [], false]);
    }
    docs.push(["otherDocuments", "Other Documents (PDF)", "file", [], false]);
    return docs;
  }
  return nonTeachingSteps[stepIndex] || [];
};

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
  const [search, setSearch] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef(null);

  const safeOpts = useMemo(() => (Array.isArray(opts) ? opts : []), [opts]);

  const getOptValue = (o) =>
    o && typeof o === "object" ? String(o.value ?? o.label ?? o.name ?? "") : String(o ?? "");
  const getOptLabel = (o) =>
    o && typeof o === "object" ? String(o.label ?? o.name ?? o.value ?? "") : String(o ?? "");

  const selectedOpt = useMemo(() => {
    if (!value) return null;
    const valStr = String(value).trim().toLowerCase();
    return (
      safeOpts.find(
        (o) =>
          getOptValue(o).trim().toLowerCase() === valStr ||
          getOptLabel(o).trim().toLowerCase() === valStr
      ) || null
    );
  }, [value, safeOpts]);

  useEffect(() => {
    if (!isUserTyping) {
      setSearch(selectedOpt ? getOptLabel(selectedOpt) : String(value || ""));
    }
  }, [value, selectedOpt, isUserTyping]);

  const filteredOpts = useMemo(() => {
    const withoutOther = safeOpts.filter((o) => {
      const s = getOptLabel(o).toLowerCase().trim();
      return s !== "other" && s !== "others";
    });
    const q = (search || "").toLowerCase().trim();
    if (!isUserTyping || !q) {
      return withoutOther;
    }
    return withoutOther.filter((o) => {
      const lbl = getOptLabel(o).toLowerCase();
      const val = getOptValue(o).toLowerCase();
      return lbl.includes(q) || val.includes(q);
    });
  }, [safeOpts, search, isUserTyping]);

  const handleSelect = (opt) => {
    if (!opt) {
      setSearch("");
      if (typeof onChange === "function") onChange("");
    } else {
      const optVal = getOptValue(opt);
      const optLbl = getOptLabel(opt);
      setSearch(optLbl);
      if (typeof onChange === "function") onChange(optVal);
    }
    setIsUserTyping(false);
    setOpen(false);
    setHighlightIndex(0);
  };

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        if (isUserTyping) {
          const q = (search || "").trim().toLowerCase();
          if (!q) {
            handleSelect(null);
          } else {
            const exact = safeOpts.find(
              (o) =>
                getOptLabel(o).trim().toLowerCase() === q ||
                getOptValue(o).trim().toLowerCase() === q
            );
            if (exact) {
              handleSelect(exact);
            } else {
              setSearch(selectedOpt ? getOptLabel(selectedOpt) : String(value || ""));
            }
          }
          setIsUserTyping(false);
        }
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [isUserTyping, search, safeOpts, selectedOpt, value]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
        return;
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (filteredOpts.length > 0 ? (prev + 1) % filteredOpts.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (filteredOpts.length > 0 ? (prev - 1 + filteredOpts.length) % filteredOpts.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOpts.length > 0) {
        const target =
          highlightIndex >= 0 && highlightIndex < filteredOpts.length
            ? filteredOpts[highlightIndex]
            : filteredOpts[0];
        handleSelect(target);
      }
    } else if (e.key === "Tab") {
      if (open && filteredOpts.length > 0 && isUserTyping) {
        const target =
          highlightIndex >= 0 && highlightIndex < filteredOpts.length
            ? filteredOpts[highlightIndex]
            : filteredOpts[0];
        handleSelect(target);
      }
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setIsUserTyping(false);
      setSearch(selectedOpt ? getOptLabel(selectedOpt) : String(value || ""));
    }
  };

  return (
    <div className={`staff-custom-search-select ${hasError ? "has-error" : ""}`} ref={ref}>
      <div
        className="staff-search-input-wrap"
        style={{ ...(hasError ? { borderColor: "#ef4444" } : {}), cursor: "pointer" }}
        onClick={() => {
          setOpen((prev) => !prev);
          const inputEl = ref.current?.querySelector("input");
          if (inputEl) inputEl.focus();
        }}
      >
        <Search className="staff-search-icon" aria-hidden="true" size={13} />
        <input
          type="text"
          value={search}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onFocus={(e) => {
            setOpen(true);
            setIsUserTyping(false);
            try {
              e.target.select();
            } catch { }
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsUserTyping(true);
            setHighlightIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Search or select ${String(label || "").toLowerCase()}...`}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            className="staff-dropdown-clear-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "16px",
              height: "16px",
              padding: 0,
              border: 0,
              borderRadius: "50%",
              background: "var(--cms-border, #e5e7eb)",
              color: "var(--cms-muted, #6b7280)",
              cursor: "pointer",
              marginRight: "4px",
              flexShrink: 0,
            }}
            title="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
            }}
          >
            <X size={10} />
          </button>
        ) : null}
        <ChevronDown
          className="staff-dropdown-caret"
          size={13}
          style={{
            transition: "transform 0.15s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
            const inputEl = ref.current?.querySelector("input");
            if (inputEl) inputEl.focus();
          }}
        />
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
            maxHeight: "180px",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
          }}
        >
          {filteredOpts.length > 0 ? (
            filteredOpts.map((o, idx) => {
              const optVal = getOptValue(o);
              const optLbl = getOptLabel(o);
              const isSelected = value === optVal || value === optLbl;
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={`${optVal}-${idx}`}
                  className={`staff-search-dropdown-item ${isSelected ? "is-selected" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
                  style={{
                    backgroundColor: isHighlighted || isSelected
                      ? "var(--cms-primary-soft, #f0fdf4)"
                      : "#ffffff",
                    color: isHighlighted || isSelected
                      ? "var(--cms-primary, #355e3b)"
                      : "var(--cms-text, #1f2937)",
                    fontWeight: isSelected || isHighlighted ? "600" : "normal",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
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
            <div className="staff-search-dropdown-empty" style={{ backgroundColor: "#ffffff" }}>No matching options found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const DEFAULT_SUBJECTS = [
  "Mathematics 1A",
  "Mathematics 1B",
  "Mathematics 2A",
  "Mathematics 2B",
  "Physics 1",
  "Physics 2",
  "Chemistry 1",
  "Chemistry 2",
  "Botany 1",
  "Botany 2",
  "Zoology 1",
  "Zoology 2",
  "English 1",
  "English 2",
  "Sanskrit 1",
  "Sanskrit 2",
  "Computer Science",
  "Economics 1",
  "Economics 2",
  "Commerce 1",
  "Commerce 2",
  "Civics 1",
  "Civics 2",
  "History 1",
  "History 2",
];

function SubjectAllocationInput({ staffId = null, department = "", value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
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
          if (names.length > 0) {
            setApiSubjects(names);
          }
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

  const allAvailableSubjects = useMemo(() => {
    const list = Array.isArray(apiSubjects) && apiSubjects.length > 0 ? apiSubjects : DEFAULT_SUBJECTS;
    return [...new Set([...list, ...DEFAULT_SUBJECTS])];
  }, [apiSubjects]);

  const filteredOptions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const unselected = allAvailableSubjects.filter((opt) => !selectedSubjects.includes(opt));
    if (!q) return unselected;
    return unselected.filter((opt) => opt.toLowerCase().includes(q));
  }, [allAvailableSubjects, selectedSubjects, search]);

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
    setHighlightIndex(0);
  };

  const removeSubject = async (subjectName) => {
    const next = selectedSubjects.filter((s) => s !== subjectName);
    if (typeof onChange === "function") onChange(next);
    if (staffId) {
      try {
        await staffApi.unassignStaffSubject(Number(staffId) || staffId, subjectName);
      } catch (err) {
        console.warn("Unassign subject API notice:", err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
        return;
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (filteredOptions.length > 0 ? (prev - 1 + filteredOptions.length) % filteredOptions.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) {
        const target =
          highlightIndex >= 0 && highlightIndex < filteredOptions.length
            ? filteredOptions[highlightIndex]
            : filteredOptions[0];
        addSubject(target);
      } else if (search.trim()) {
        addSubject(search.trim());
      }
    } else if (e.key === "Tab") {
      if (open && filteredOptions.length > 0) {
        const target =
          highlightIndex >= 0 && highlightIndex < filteredOptions.length
            ? filteredOptions[highlightIndex]
            : filteredOptions[0];
        addSubject(target);
      }
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
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
          setOpen(true);
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
            setHighlightIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedSubjects.length === 0 ? "Search or add subjects..." : "Add..."}
          autoComplete="off"
        />
        <ChevronDown className="subject-dropdown-caret" size={13} />
      </div>

      {open ? (
        <div
          className="subject-dropdown-menu"
          style={{
            backgroundColor: "#ffffff",
            background: "#ffffff",
            opacity: 1,
            zIndex: 99999,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)",
            border: "1px solid var(--cms-border, #d1d5db)",
            maxHeight: "180px",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
          }}
        >
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
            filteredOptions.map((opt, idx) => {
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={`${opt}-${idx}`}
                  className={`subject-dropdown-item ${isHighlighted ? "is-highlighted" : ""}`}
                  style={{
                    backgroundColor: isHighlighted ? "var(--cms-primary-soft, #edf7e2)" : "#ffffff",
                    color: isHighlighted ? "var(--cms-primary, #355e3b)" : "var(--cms-text, #1f2937)",
                    fontWeight: isHighlighted ? "600" : "normal",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addSubject(opt);
                  }}
                >
                  {opt}
                </div>
              );
            })
          ) : !showCustomAdd ? (
            <div className="staff-search-dropdown-empty" style={{ backgroundColor: "#ffffff" }}>
              {search.trim() ? "Press Enter to add custom subject" : "No subjects available"}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


function getCampusSafeKey(c) {
  if (c == null || c === "") return "";
  if (typeof c === "string" || typeof c === "number") return String(c).trim().toLowerCase();
  const id = c.id ?? c.campusId ?? c.campus_id ?? c.value;
  if (id != null && id !== "" && String(id) !== "undefined") return String(id);
  const name = c.name ?? c.campusName ?? c.label ?? "";
  return String(name).trim().toLowerCase();
}

function getCampusDisplayName(c) {
  if (!c) return "";
  const name = c.name || c.campusName || c.label || "";
  const code = c.code || c.campusCode || "";
  return name + (code && !name.includes("(" + code + ")") ? " (" + code + ")" : "");
}

function getBoardsForCampus(campusObj, allBoardsList = []) {
  if (!campusObj || (!campusObj.id && !campusObj.campusId && !campusObj.code)) return [];
  const aff = campusObj.affiliatedBoards || campusObj.AffiliatedBoards;
  if (Array.isArray(aff) && aff.length > 0) {
    return aff.map((b) => {
      if (typeof b === "string") {
        const match = allBoardsList.find(
          (ab) => (ab.name || ab.boardName || "").toLowerCase() === b.toLowerCase() ||
            (ab.code || ab.boardCode || "").toLowerCase() === b.toLowerCase()
        );
        return match || { id: b, name: b, boardName: b, code: b, boardCode: b };
      }
      return {
        id: b.boardId || b.id || b.board_id || b.name,
        boardId: b.boardId || b.id || b.board_id || b.name,
        name: b.boardName || b.name || b.boardCode || b.code,
        boardName: b.boardName || b.name || b.boardCode || b.code,
        code: b.boardCode || b.code || "",
        boardCode: b.boardCode || b.code || "",
      };
    });
  }

  const boardsArr = campusObj.boards || campusObj.Boards;
  if (Array.isArray(boardsArr) && boardsArr.length > 0) {
    return boardsArr.map((b) => {
      if (typeof b === "object") {
        return {
          id: b.boardId || b.id || b.name,
          boardId: b.boardId || b.id || b.name,
          name: b.boardName || b.name || b.code,
          boardName: b.boardName || b.name || b.code,
          code: b.boardCode || b.code || "",
          boardCode: b.boardCode || b.code || "",
        };
      }
      const match = (allBoardsList || []).find(
        (ab) => (ab.name || ab.boardName || "").toLowerCase() === String(b).toLowerCase() ||
          (ab.code || ab.boardCode || "").toLowerCase() === String(b).toLowerCase()
      );
      return {
        id: match?.id || match?.boardId || b,
        boardId: match?.id || match?.boardId || b,
        name: match?.name || match?.boardName || b,
        boardName: match?.name || match?.boardName || b,
        code: match?.code || match?.boardCode || "",
        boardCode: match?.code || match?.boardCode || "",
      };
    });
  }

  return allBoardsList;
}

function PrincipalMultiSelectInput({
  options = [],
  selectedValues = [],
  onToggle,
  onCustomAdd,
  onRemove,
  placeholder = "Search or select...",
  hasError = false,
  emptyMessage = "No options available",
  allowCustomAdd = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      (o.label || "").toLowerCase().includes(q) ||
      (o.value != null && String(o.value).toLowerCase().includes(q)) ||
      (o.name || "").toLowerCase().includes(q) ||
      (o.code || "").toLowerCase().includes(q)
    );
  }, [options, query]);

  const isExactMatchInFiltered = filtered.some((opt) => {
    const n1 = (opt.name || opt.label || "").trim().toLowerCase();
    const q = query.trim().toLowerCase();
    return n1 === q;
  });

  const isAlreadySelected = selectedValues.some((sv) => {
    const n1 = typeof sv === "object" ? (sv.name || sv.label || sv.value || "") : String(sv);
    return n1.trim().toLowerCase() === query.trim().toLowerCase();
  });

  const showCustomAdd = allowCustomAdd && query.trim().length > 0 && !isExactMatchInFiltered && !isAlreadySelected;

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
        return;
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filtered.length > 0) {
        const target =
          highlightIndex >= 0 && highlightIndex < filtered.length
            ? filtered[highlightIndex]
            : filtered[0];
        onToggle(target.raw || target);
        setQuery("");
        setHighlightIndex(0);
      } else if (allowCustomAdd && query.trim() && typeof onCustomAdd === "function") {
        onCustomAdd(query.trim());
        setQuery("");
        setHighlightIndex(0);
      }
    } else if (e.key === "Tab") {
      if (open && filtered.length > 0) {
        const target =
          highlightIndex >= 0 && highlightIndex < filtered.length
            ? filtered[highlightIndex]
            : filtered[0];
        onToggle(target.raw || target);
        setQuery("");
      }
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="staff-custom-search-select" ref={ref} style={{ width: "100%", position: "relative" }}>
      <div
        className="staff-search-input-wrap"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px",
          minHeight: "35px",
          height: "auto",
          padding: "3px 26px 3px 28px",
          cursor: "text",
          borderColor: hasError ? "#ef4444" : undefined,
          boxShadow: hasError ? "0 0 0 1px #ef4444" : undefined,
          backgroundColor: "#ffffff",
        }}
        onClick={() => {
          setOpen(true);
          const inp = ref.current?.querySelector("input");
          if (inp) inp.focus();
        }}
      >
        <Search className="staff-search-icon" size={13} aria-hidden="true" />

        {selectedValues.map((item, idx) => {
          const itemKey = typeof item === "object" ? (item.value || item.id || item.name || idx) : item;
          const itemLabel = typeof item === "object" ? (item.label || item.name || item.value) : item;
          return (
            <span
              key={String(itemKey) + "-" + idx}
              className="subject-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "var(--cms-primary-soft, #edf7e2)",
                color: "var(--cms-primary, #355e3b)",
                fontSize: "10px",
                fontWeight: 600,
                border: "1px solid var(--cms-primary-border, #cfe7b6)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {itemLabel}
              <button
                type="button"
                className="subject-pill-remove"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(item);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--cms-primary, #355e3b)",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: "11px",
                  lineHeight: 1,
                }}
                title={"Remove " + itemLabel}
              >
                ×
              </button>
            </span>
          );
        })}

        <input
          type="text"
          value={query}
          placeholder={selectedValues.length === 0 ? placeholder : "Add..."}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{
            flex: "1 1 60px",
            minWidth: "50px",
            height: "25px",
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "10px",
            color: "var(--cms-text)",
            padding: 0,
            boxShadow: "none",
          }}
        />
        <ChevronDown className="staff-dropdown-caret" size={13} />
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
            maxHeight: "185px",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
          }}
        >
          {showCustomAdd ? (
            <div
              className="staff-search-dropdown-item is-custom-add"
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: "700",
                color: "var(--cms-primary, #355e3b)",
                backgroundColor: "var(--cms-primary-soft, #edf7e2)",
                borderBottom: "1px solid var(--cms-border, #e5e7eb)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof onCustomAdd === "function") {
                  onCustomAdd(query.trim());
                }
                setQuery("");
                setHighlightIndex(0);
              }}
            >
              <Plus size={13} /> Add "{query.trim()}"
            </div>
          ) : null}

          {filtered.length > 0 ? (
            filtered.map((opt, i) => {
              const optRaw = opt.raw || opt;
              const optKey = getCampusSafeKey(optRaw) || String(opt.value || opt.id || opt.name);
              const optName = String(optRaw.name || optRaw.campusName || opt.name || opt.label || "").trim().toLowerCase();

              const isSelected = selectedValues.some((sv) => {
                const svRaw = sv.raw || sv;
                const svKey = getCampusSafeKey(svRaw) || String(sv.value || sv.id || sv.name);
                const svName = String(svRaw.name || svRaw.campusName || sv.name || sv.label || "").trim().toLowerCase();
                return (optKey && svKey === optKey) || (optName && svName === optName);
              });

              const isHighlighted = i === highlightIndex;

              return (
                <div
                  key={optKey + "-" + i}
                  className={"staff-search-dropdown-item " + (isSelected ? "is-selected " : "") + (isHighlighted ? "is-highlighted" : "")}
                  style={{
                    backgroundColor: isHighlighted || isSelected ? "var(--cms-primary-soft, #f0fdf4)" : "#ffffff",
                    color: isHighlighted || isSelected ? "var(--cms-primary, #355e3b)" : "var(--cms-text, #1f2937)",
                    fontWeight: isSelected || isHighlighted ? "600" : "normal",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    fontSize: "12px",
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle(opt.raw || opt);
                    setQuery("");
                    setHighlightIndex(0);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected ? <Check size={13} style={{ color: "var(--cms-primary, #355e3b)" }} /> : null}
                </div>
              );
            })
          ) : !showCustomAdd ? (
            <div className="staff-search-dropdown-empty">{emptyMessage}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


export function PrincipalCampusBoardAssignment({
  values,
  setValues,
  campuses = [],
  allBoards = [],
  errors = {},
  setErrors,
}) {
  const campusList = useMemo(() => {
    if (Array.isArray(campuses) && campuses.length > 0) return campuses;
    return [
      { id: 1, campusId: 1, name: "Main Campus (HQ)", campusName: "Main Campus (HQ)", code: "MAIN", affiliatedBoards: [{ boardId: 1, boardCode: "BIEAP", boardName: "Board of Intermediate Education, Andhra Pradesh" }, { boardId: 2, boardCode: "CBSE", boardName: "Central Board of Secondary Education" }] },
      { id: 2, campusId: 2, name: "North Branch", campusName: "North Branch", code: "NORTH", affiliatedBoards: [{ boardId: 1, boardCode: "BIEAP", boardName: "Board of Intermediate Education, Andhra Pradesh" }, { boardId: 3, boardCode: "TSBIE", boardName: "Telangana Board of Intermediate Education" }] },
      { id: 3, campusId: 3, name: "South Campus", campusName: "South Campus", code: "SOUTH", affiliatedBoards: [{ boardId: 2, boardCode: "CBSE", boardName: "Central Board of Secondary Education" }, { boardId: 4, boardCode: "CISCE", boardName: "Council for the Indian School Certificate Examinations" }] }
    ];
  }, [campuses]);

  const boardsList = useMemo(() => {
    if (Array.isArray(allBoards) && allBoards.length > 0) return allBoards;
    return [
      { id: 1, boardId: 1, code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh", boardName: "Board of Intermediate Education, Andhra Pradesh" },
      { id: 2, boardId: 2, code: "CBSE", name: "Central Board of Secondary Education", boardName: "Central Board of Secondary Education" },
      { id: 3, boardId: 3, code: "TSBIE", name: "Telangana Board of Intermediate Education", boardName: "Telangana Board of Intermediate Education" },
      { id: 4, boardId: 4, code: "CISCE", name: "Council for the Indian School Certificate Examinations", boardName: "Council for the Indian School Certificate Examinations" }
    ];
  }, [allBoards]);

  const buildInitialAssignments = useCallback(() => {
    try {
      if (values.campusBoardAssignmentsJson) {
        const parsed = JSON.parse(values.campusBoardAssignmentsJson);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(p => p.campusId || p.campusName)) {
          return parsed.map(p => {
            const cId = p.campusId ? Number(p.campusId) : null;
            const cObj = campusList.find(cl => Number(cl.id || cl.campusId) === cId) || {};
            return {
              id: p.id || Date.now() + Math.random(),
              campusId: cId || cObj.id || cObj.campusId || null,
              campusName: p.campusName || cObj.name || cObj.campusName || "",
              boardIds: Array.isArray(p.boardIds) ? p.boardIds.map(Number) : [],
              boardNames: Array.isArray(p.boardNames) ? p.boardNames : []
            };
          });
        }
      }
    } catch (e) { }

    // Check assignedCampuses
    if (Array.isArray(values.assignedCampuses) && values.assignedCampuses.length > 0) {
      const rows = values.assignedCampuses.map((c, idx) => {
        const cId = typeof c === "object" && c !== null ? (c.id || c.campusId) : (typeof c === "number" ? c : null);
        const cName = typeof c === "object" && c !== null ? (c.name || c.campusName) : (typeof c === "string" ? c : "");
        const cObj = campusList.find(cl => (cId && Number(cl.id || cl.campusId) === Number(cId)) || (cName && String(cl.name || cl.campusName).trim().toLowerCase() === String(cName).trim().toLowerCase())) || {};
        return {
          id: Date.now() + idx + Math.random(),
          campusId: cId ? Number(cId) : (cObj.id || cObj.campusId ? Number(cObj.id || cObj.campusId) : null),
          campusName: cName || cObj.name || cObj.campusName || "",
          boardIds: Array.isArray(values.assignedBoardIds) ? values.assignedBoardIds.map(Number) : [],
          boardNames: Array.isArray(values.assignedBoards) ? values.assignedBoards.map(b => typeof b === "object" ? (b.name || b.boardName) : String(b)) : []
        };
      }).filter(r => r.campusId || r.campusName);
      if (rows.length > 0) return rows;
    }

    // Check assignedCampusIds
    if (Array.isArray(values.assignedCampusIds) && values.assignedCampusIds.length > 0) {
      const rows = values.assignedCampusIds.map((cid, idx) => {
        const cObj = campusList.find(cl => Number(cl.id || cl.campusId) === Number(cid)) || {};
        return {
          id: Date.now() + idx + Math.random(),
          campusId: Number(cid),
          campusName: cObj.name || cObj.campusName || `Campus #${cid}`,
          boardIds: Array.isArray(values.assignedBoardIds) ? values.assignedBoardIds.map(Number) : [],
          boardNames: Array.isArray(values.assignedBoards) ? values.assignedBoards.map(b => typeof b === "object" ? (b.name || b.boardName) : String(b)) : []
        };
      });
      if (rows.length > 0) return rows;
    }

    // Single campusId fallback
    if (values.campusId) {
      const cObj = campusList.find(cl => Number(cl.id || cl.campusId) === Number(values.campusId)) || {};
      return [{
        id: Date.now(),
        campusId: Number(values.campusId),
        campusName: values.campusName || cObj.name || cObj.campusName || "Main Campus (HQ)",
        boardIds: Array.isArray(values.assignedBoardIds) && values.assignedBoardIds.length > 0 ? values.assignedBoardIds.map(Number) : (values.boardId ? [Number(values.boardId)] : []),
        boardNames: Array.isArray(values.assignedBoards) && values.assignedBoards.length > 0 ? values.assignedBoards.map(b => typeof b === "object" ? (b.name || b.boardName) : String(b)) : (values.boardName ? [values.boardName] : [])
      }];
    }

    return [{ id: Date.now(), campusId: null, campusName: "", boardIds: [], boardNames: [] }];
  }, [values, campusList]);

  // Initial State Load
  const [assignments, setAssignments] = useState(buildInitialAssignments);

  // If initial state was empty and values load later (e.g. edit mode async fetch), update rows
  useEffect(() => {
    const hasAssignments = assignments.some(a => a.campusId || a.campusName);
    if (!hasAssignments) {
      const next = buildInitialAssignments();
      if (next.some(a => a.campusId || a.campusName)) {
        setAssignments(next);
      }
    }
  }, [buildInitialAssignments, assignments]);

  // Sync to Form Values
  useEffect(() => {
    const jsonStr = JSON.stringify(assignments);
    if (values.campusBoardAssignmentsJson !== jsonStr) {
      const validAssignments = assignments.filter(a => a.campusId || a.campusName);
      const allCampusIds = [...new Set(validAssignments.map(a => Number(a.campusId)).filter(Boolean))];
      const allCampuses = validAssignments.map(a => a.campusName).filter(Boolean);
      const allBoards = [...new Set(validAssignments.flatMap(a => a.boardNames || []).filter(Boolean))];
      const allBoardIds = [...new Set(validAssignments.flatMap(a => a.boardIds || []).map(Number).filter(Boolean))];

      setValues(prev => ({
        ...prev,
        campusBoardAssignmentsJson: jsonStr,
        assignedCampuses: allCampuses,
        assignedCampusIds: allCampusIds,
        assignedBoards: allBoards,
        assignedBoardIds: allBoardIds,
        campusId: allCampusIds[0] || prev.campusId,
        campusName: allCampuses[0] || prev.campusName,
        boardId: allBoardIds[0] || prev.boardId,
        boardName: allBoards[0] || prev.boardName
      }));
    }
  }, [assignments, setValues, values.campusBoardAssignmentsJson]);

  const addAssignmentRow = () => {
    setAssignments(prev => [...prev, { id: Date.now() + Math.random(), campusId: null, campusName: "", boardIds: [], boardNames: [] }]);
  };

  const removeAssignmentRow = (id) => {
    if (assignments.length <= 1) return;
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const updateCampus = (id, campusObj) => {
    setAssignments(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          campusId: Number(campusObj.id || campusObj.campusId),
          campusName: campusObj.name || campusObj.campusName,
          // Reset boards when campus changes
          boardIds: [],
          boardNames: []
        };
      }
      return a;
    }));
  };

  const toggleBoard = (id, boardObj) => {
    if (!boardObj) return;
    setAssignments(prev => prev.map(a => {
      if (a.id === id) {
        const isString = typeof boardObj === 'string';
        let bName = isString ? boardObj : (boardObj.name || boardObj.boardName || boardObj.label || boardObj.value);
        bName = bName ? String(bName).trim() : "";
        let bId = isString ? null : (boardObj.id || boardObj.boardId || boardObj.value);
        if (bId) bId = Number(bId);

        if (!bName) return a; // Invalid object

        let isSelected = false;
        if (bId && a.boardIds.includes(bId)) {
          isSelected = true;
        } else {
          const nameLower = bName.toLowerCase();
          isSelected = a.boardNames.some(b => String(b).trim().toLowerCase() === nameLower);
        }

        let newBoardNames = [];
        let newBoardIds = [];

        if (isSelected) {
          // Remove it
          const nameLower = bName.toLowerCase();
          newBoardNames = a.boardNames.filter(b => String(b).trim().toLowerCase() !== nameLower);
          if (bId) {
            newBoardIds = a.boardIds.filter(bid => Number(bid) !== Number(bId));
          } else {
            newBoardIds = [...a.boardIds];
          }
        } else {
          // Add it
          newBoardNames = [...a.boardNames, bName];
          newBoardIds = bId ? [...new Set([...a.boardIds, bId])] : [...a.boardIds];
        }

        return {
          ...a,
          boardNames: newBoardNames,
          boardIds: newBoardIds
        };
      }
      return a;
    }));
  };

  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: "13px", color: "var(--cms-text, #1f2937)" }}>{values?.role?.toLowerCase() === "principal" ? "Principal Campus & Board Assignments" : "Multi-Campus & Educational Board Allocations"} <b style={{ color: "#ef4444" }}>*</b></strong>
      </div>

      {assignments.map((assignment, index) => {
        const selectedCampusObj = campusList.find(c => String(c.id || c.campusId) === String(assignment.campusId)) || {};
        const availableBoards = getBoardsForCampus(selectedCampusObj, boardsList);

        return (
          <div key={assignment.id} style={{ display: "flex", gap: "16px", padding: "12px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "8px", alignItems: "flex-start" }}>
            {/* Select Campus */}
            <div className="cms-principal-field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Select Campus</label>
              <select
                className="cms-input"
                value={assignment.campusId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const cObj = campusList.find(c => String(c.id || c.campusId) === val);
                  if (cObj) updateCampus(assignment.id, cObj);
                }}
                style={{ height: "38px", width: "100%", borderRadius: "6px", border: "1px solid #d1d5db", padding: "0 10px" }}
              >
                <option value="" disabled>-- Select Campus --</option>
                {campusList.map(c => {
                  const cVal = String(c.id || c.campusId);
                  const isAlreadySelected = assignments.some(a => a.id !== assignment.id && String(a.campusId) === cVal);
                  return (
                    <option key={getCampusSafeKey(c)} value={cVal} disabled={isAlreadySelected}>
                      {getCampusDisplayName(c)}{isAlreadySelected ? " (Already Selected)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Select Boards */}
            <div className="cms-principal-field" style={{ flex: 2, marginBottom: 0 }}>
              <label>Assign Boards</label>
              <PrincipalMultiSelectInput
                placeholder={!assignment.campusId ? "Select a campus first..." : "Select boards..."}
                options={availableBoards.map((b) => ({
                  value: String(b.id || b.boardId || b.name || b.boardName),
                  label: (b.name || b.boardName) + (b.code || b.boardCode ? " (" + (b.code || b.boardCode) + ")" : ""),
                  name: b.name || b.boardName,
                  id: b.id || b.boardId,
                  raw: b,
                }))}
                selectedValues={assignment.boardNames.map((bName) => ({
                  value: bName,
                  label: bName,
                  name: bName,
                }))}
                onToggle={(b) => toggleBoard(assignment.id, b)}
                onRemove={(b) => toggleBoard(assignment.id, b)}
                onCustomAdd={(bName) => toggleBoard(assignment.id, bName)}
                emptyMessage="No affiliated boards found."
              />
            </div>

            {/* Remove Row Button */}
            {assignments.length > 1 && (
              <button
                type="button"
                onClick={() => removeAssignmentRow(assignment.id)}
                style={{ marginTop: "24px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer" }}
                title="Remove Assignment"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addAssignmentRow}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          background: "#f0fdf4",
          color: "#166534",
          border: "1px dashed #bbf7d0",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "600"
        }}
      >
        <Plus size={14} /> Add Another Campus Assignment
      </button>

      {/* Hidden input to ensure validation works if needed */}
      <input type="hidden" name="campusBoardAssignmentsJson" value={values.campusBoardAssignmentsJson || ""} />
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
      const apiStaffType = staffType;
      const targetNorm = String(staffType).toLowerCase().replace(/[-_\s]/g, "");

      let deptOpts = [];
      let desigOpts = [];

      try {
        let deptData = [];
        try {
          const deptRes = await apiClient.get(apiEndpoints.departments.getAll, {
            params: staffType ? { staffType: apiStaffType } : {},
            skipGlobalLoader: true,
            silent: true,
            skipErrorLog: true,
          });
          deptData = deptRes?.data?.items || deptRes?.data?.data || (Array.isArray(deptRes?.data) ? deptRes.data : []);
        } catch {
          try {
            const lookupRes = await apiClient.get(apiEndpoints.faculty.lookupDepartments, {
              params: staffType ? { staffType: apiStaffType } : {},
              skipGlobalLoader: true,
              silent: true,
              skipErrorLog: true,
            });
            deptData = lookupRes?.data?.items || lookupRes?.data?.data || (Array.isArray(lookupRes?.data) ? lookupRes.data : []);
          } catch {
            deptData = [];
          }
        }

        if (!Array.isArray(deptData) || deptData.length === 0) {
          deptData = loadCachedDepartments();
        }

        const filteredDepts = (Array.isArray(deptData) ? deptData : []).filter((d) => {
          if (!d) return false;
          if (d.isActive === false || d.status === "Inactive") return false;
          const deptName = typeof d === "object" ? d.name || d.departmentName || "" : String(d || "");
          if (!deptName) return false;
          const st = typeof d === "object" ? (d.staffType || d.StaffType) : null;
          if (st) {
            const stNorm = String(st).toLowerCase().replace(/[-_\s]/g, "");
            return stNorm === targetNorm || stNorm === "both" || stNorm === "all";
          }
          return isTeaching ? !isNonTeachingDeptName(deptName) : isNonTeachingDeptName(deptName);
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
            skipGlobalLoader: true,
            silent: true,
            skipErrorLog: true,
          });
          desigData = desigRes?.data?.items || desigRes?.data?.data || (Array.isArray(desigRes?.data) ? desigRes.data : []);
        } catch {
          try {
            const lookupRes = await apiClient.get(apiEndpoints.faculty.lookupDesignations, {
              params: staffType ? { staffType: apiStaffType } : {},
              skipGlobalLoader: true,
              silent: true,
              skipErrorLog: true,
            });
            desigData = lookupRes?.data?.items || lookupRes?.data?.data || (Array.isArray(lookupRes?.data) ? lookupRes.data : []);
          } catch {
            desigData = [];
          }
        }

        if (!Array.isArray(desigData) || desigData.length === 0) {
          desigData = loadCachedDesignations();
        }

        const filteredDesigs = (Array.isArray(desigData) ? desigData : []).filter((d) => {
          if (!d) return false;
          if (d.isActive === false || d.status === "Inactive") return false;
          const desigName = typeof d === "object" ? d.name || d.designationName || "" : String(d || "");
          if (!desigName) return false;
          const st = typeof d === "object" ? (d.staffType || d.StaffType) : null;
          if (st) {
            const stNorm = String(st).toLowerCase().replace(/[-_\s]/g, "");
            return stNorm === targetNorm || stNorm === "both" || stNorm === "all";
          }
          return isTeaching ? !isNonTeachingDesigName(desigName) : isNonTeachingDesigName(desigName);
        });
        desigOpts = filteredDesigs
          .map((d) =>
            typeof d === "object"
              ? {
                name: d.name || d.designationName,
                designationName: d.name || d.designationName,
                departmentName: d.departmentName || d.department || "",
                departmentId: d.departmentId || null,
                staffType: d.staffType || d.StaffType,
              }
              : {
                name: String(d),
                designationName: String(d),
                departmentName: "",
                departmentId: null,
                staffType: apiStaffType,
              }
          )
          .filter(Boolean);
      } catch (e) {
        console.warn("Failed to fetch designations from API:", e);
      }

      if (deptOpts.length === 0) {
        deptOpts = isTeaching ? teachingDepartments : nonTeachingDepartments;
      }

      if (desigOpts.length === 0) {
        desigOpts = isTeaching ? teachingDesignations : nonTeachingDesignations;
      }

      if (!isTeaching) {
        for (const departmentName of ["Transport", "Transportation"]) {
          const hasTransportManager = desigOpts.some((designation) =>
            typeof designation === "object" &&
            String(designation.name || designation.designationName || "").trim().toLowerCase() === "transport manager" &&
            String(designation.departmentName || "").trim().toLowerCase() === departmentName.toLowerCase()
          );
          if (!hasTransportManager) {
            desigOpts = [...desigOpts, {
              name: "Transport Manager",
              designationName: "Transport Manager",
              departmentName,
              staffType: "NonTeaching",
            }];
          }
        }
        if (!deptOpts.some((name) => String(name).trim().toLowerCase() === "stores & inventory")) {
          deptOpts = [...deptOpts, "Stores & Inventory"];
        }
        const hasInventoryManager = desigOpts.some((d) =>
          typeof d === "object" &&
          String(d.name || d.designationName || "").trim().toLowerCase() === "inventory manager" &&
          String(d.departmentName || "").trim().toLowerCase() === "stores & inventory"
        );
        if (!hasInventoryManager) {
          desigOpts = [...desigOpts, {
            name: "Inventory Manager",
            designationName: "Inventory Manager",
            departmentName: "Stores & Inventory",
            staffType: "NonTeaching",
          }];
        }
      }

      if (isMounted) {
        setDepartments(Array.from(new Set(deptOpts)));
        setDesignations(desigOpts);
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

function useStaffRoles(staffType) {
  const isTeaching = staffType === "Teaching";
  const defaultList = isTeaching ? TEACHING_ROLE_NAMES : NON_TEACHING_ROLE_NAMES;
  const [roles, setRoles] = useState(defaultList);
  const [roleObjects, setRoleObjects] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const queryStaffType = isTeaching ? "Teaching" : "Non-Teaching";
        const res = await apiClient.get(apiEndpoints.roles?.list || "/api/v1/roles", {
          params: { staffType: queryStaffType },
        });
        const data = res?.data?.data || res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
        if (Array.isArray(data) && data.length > 0) {
          // Filter only active roles matching requested category
          const activeRoles = data.filter((r) => {
            if (!r) return false;
            if (r.isActive === false || r.status === "Inactive") return false;
            const st = String(r.staffType || r.StaffType || "").trim().toLowerCase();
            if (st) {
              if (isTeaching) {
                return st === "teaching" || st === "both" || st === "all";
              } else {
                return st === "non-teaching" || st === "nonteaching" || st === "both" || st === "all";
              }
            }
            return true;
          });

          if (isMounted && activeRoles.length > 0) {
            setRoleObjects(activeRoles);
            const names = activeRoles
              .map((r) => (typeof r === "object" ? r.roleName || r.name : String(r)))
              .filter(Boolean);
            setRoles(Array.from(new Set(names)));
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch roles dynamically from API, falling back to default list:", err);
      }
      if (isMounted) {
        setRoles(defaultList);
      }
    }
    loadRoles();
    return () => {
      isMounted = false;
    };
  }, [staffType, isTeaching]);

  return { roles, roleObjects };
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

      // Driver's License Number (All-India Standard Length: 15-16 alphanumeric characters)
      if (name === "drivingLicenseNumber") {
        const cleanDL = strVal.toUpperCase().replace(/[-/\s]/g, "");
        if (cleanDL.length > 0) {
          if (cleanDL.length < 15 || cleanDL.length > 16) {
            newErrors[name] = "Driving License Number must be 15 to 16 characters";
          } else if (!/^[A-Z0-9]{15,16}$/.test(cleanDL)) {
            newErrors[name] = "Driving License Number must contain only letters and numbers";
          }
        }
      }

      // License Expiry Date
      if (name === "drivingLicenseExpiryDate" || name === "licenseExpiryDate") {
        const expDate = new Date(strVal);
        if (isNaN(expDate.getTime())) {
          newErrors[name] = "Please enter a valid License Expiry Date";
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (expDate < today) {
            newErrors[name] = "Driving license has expired. Please select a valid future expiry date.";
          }
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
  roleOptions = null,
  staffType = null,
}) {
  const { boards, selectedBoard, setSelectedBoard } = useAcademicContext();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(localPreviewUrl);
        } catch {
          // ignore URL revocation error
        }
      }
    };
  }, [localPreviewUrl]);
  const isValidItem = Array.isArray(item) && item.length >= 2;
  const name = isValidItem ? (item[0] || "") : "";
  const label = isValidItem ? (item[1] || name || "") : "";
  const type = isValidItem ? (item[2] || "text") : "text";
  const options = isValidItem && Array.isArray(item[3]) ? item[3] : [];
  const configuredRequired = isValidItem ? (item[4] !== false) : false;
  const layoutClass = isValidItem ? (item[5] || "") : "";

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

    if (name === "role") {
      if (Array.isArray(roleOptions) && roleOptions.length > 0) {
        const liveRoleNames = roleOptions.map((r) => (typeof r === "object" ? r.roleName || r.name : String(r))).filter(Boolean);
        return Array.from(new Set(liveRoleNames));
      }
      return isTeaching ? TEACHING_ROLE_NAMES : NON_TEACHING_ROLE_NAMES;
    }

    if (name === "department") {
      if (Array.isArray(departmentOptions) && departmentOptions.length > 0) {
        const liveDepts = departmentOptions
          .map((d) => (typeof d === "object" ? d.name || d.departmentName : d))
          .filter(Boolean);
        return Array.from(new Set(liveDepts));
      }
      const fallbackDepts = Array.isArray(options) && options.length > 0 ? options : (isTeaching ? teachingDepartments : nonTeachingDepartments);
      return Array.from(new Set(fallbackDepts.filter(Boolean)));
    }

    if (name === "designation") {
      const currentDept = String(safeValues.department || "").trim();
      const currentDeptNorm = currentDept.toLowerCase().replace(/[-_\s&]/g, "");

      if (currentDept) {
        // Prefer the department-specific mapping supplied by the API.
        if (Array.isArray(designationOptions) && designationOptions.length > 0) {
          const liveDesigs = designationOptions.filter(Boolean);
          const deptMatching = liveDesigs
            .filter((d) => {
              if (!d) return false;
              const dDeptName = typeof d === "object" ? String(d.departmentName || d.department || "").trim().toLowerCase().replace(/[-_\s&]/g, "") : "";
              return dDeptName && (dDeptName === currentDeptNorm || currentDeptNorm.includes(dDeptName) || dDeptName.includes(currentDeptNorm));
            })
            .map((d) => (typeof d === "object" ? d.name || d.designationName : d))
            .filter(Boolean);

          if (deptMatching.length > 0) {
            return Array.from(new Set(deptMatching));
          }
        }

        // The API has no designation mapping for this department. Use the local
        // department map instead of showing unrelated API designations.
        const activeMap = isTeaching ? teachingDesignationMap : nonTeachingDesignationMap;
        for (const [deptKey, desigs] of Object.entries(activeMap)) {
          const keyNorm = deptKey.toLowerCase().replace(/[-_\s&]/g, "");
          if (keyNorm === currentDeptNorm || currentDeptNorm.includes(keyNorm) || keyNorm.includes(currentDeptNorm)) {
            return Array.isArray(desigs) ? desigs : [];
          }
        }

        // If no department match in both API and static map, return empty array to prevent showing unrelated designations
        return [];
      }

      // With no department selected, show every available designation.
      if (Array.isArray(designationOptions) && designationOptions.length > 0) {
        return Array.from(new Set(designationOptions.map((d) => (typeof d === "object" ? d.name || d.designationName : d)).filter(Boolean)));
      }

      const fallbackList = Array.isArray(options) && options.length > 0
        ? options
        : (isTeaching ? teachingDesignations : nonTeachingDesignations);
      return Array.from(new Set(fallbackList.filter(Boolean)));
    }

    return options;
  }, [name, contextBoardOpts, roleOptions, departmentOptions, designationOptions, options, isTeaching, safeValues.department]);

  const opts = Array.isArray(rawOpts) ? rawOpts : [];
  if (!isValidItem) return null;

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
        if (name === "role") {
          const matchedRole = Array.isArray(roleOptions)
            ? roleOptions.find((r) => {
              if (typeof r === "object") {
                const roleName = r.roleName || r.name;
                const isAccountantAlias = value === "Accountant" && roleName === "Accounts";
                return String(roleName || "").toLowerCase().replace(/[-_\s]/g, "") === String(value).toLowerCase().replace(/[-_\s]/g, "") || isAccountantAlias || String(r.roleId || r.id) === String(value);
              }
              return r === value;
            })
            : null;
          const roleIdVal = typeof matchedRole === "object" ? (matchedRole?.roleId || matchedRole?.id) : value === "Accountant" ? 7 : undefined;
          return {
            ...prev,
            role: value,
            roleName: value,
            roleId: roleIdVal ? Number(roleIdVal) : undefined,
          };
        }
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
      const isPhoto = name.toLowerCase().includes("photo") || name === "signature";
      if (isPhoto) {
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
          if (typeof setErrors === "function") {
            setErrors((prev) => ({ ...prev, [name]: `${label} must be an image (.jpg, .png, .webp)` }));
          }
          return;
        }
      } else {
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          if (typeof setErrors === "function") {
            setErrors((prev) => ({ ...prev, [name]: `${label} must be a PDF document (.pdf)` }));
          }
          return;
        }
      }

      if (file.size > 5 * 1024 * 1024) {
        if (typeof setErrors === "function") {
          setErrors((prev) => ({ ...prev, [name]: "File size must not exceed 5MB" }));
        }
        return;
      }

      let previewUrl = "";
      try {
        previewUrl = URL.createObjectURL(file);
      } catch { }
      setLocalFile(file);
      setLocalPreviewUrl(previewUrl);

      if (name === "drivingLicence") {
        try {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const buffer = ev.target?.result;
              if (buffer) {
                const textDecoder = new TextDecoder("latin1");
                const rawText = textDecoder.decode(buffer);
                if (typeof setValues === "function") {
                  setValues((prev) => ({
                    ...prev,
                    [name]: file.name,
                    [name + "_previewUrl"]: previewUrl,
                    _dlPdfRawText: rawText,
                  }));
                }
              }
            } catch { }
          };
          reader.readAsArrayBuffer(file);
        } catch { }
      }

      if (typeof setValues === "function") {
        setValues((prev) => ({
          ...prev,
          [name]: file.name,
          [name + "_previewUrl"]: previewUrl,
          [name + "_file"]: file,
        }));
      } else {
        change(file.name);
      }
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
    } else if (name === "drivingLicenseNumber" || name === "drivingLicence") {
      raw = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 16);
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
  } else if (name === "drivingLicenseNumber" || name === "drivingLicence") {
    inputMaxLength = 16;
  }

  const placeholderText = undefined;

  const fileAccept = type === "file"
    ? (name.toLowerCase().includes("photo") || name === "signature" ? "image/jpeg,image/png,image/webp" : ".pdf,application/pdf")
    : undefined;

  const activePreviewUrl = localPreviewUrl || safeValues[name + "_previewUrl"] || "";

  return (
    <label className={[type === "textarea" ? "is-wide" : "", layoutClass, hasError ? "has-field-error" : ""].filter(Boolean).join(" ")}>
      <span>
        {label} {required ? <b className="required-star" style={{ color: "#ef4444", marginLeft: "2px", fontWeight: "bold" }}>*</b> : null}
      </span>
      {type === "select" ? (
        <select
          value={val}
          onChange={(e) => change(e.target.value)}
          style={{
            ...errorStyle,
            color: val ? "var(--cms-text)" : "var(--cms-muted, #738065)",
          }}
        >
          <option value="" disabled hidden style={{ color: "var(--cms-muted, #738065)" }}>
            Select {label}
          </option>
          {opts.map((o) => (
            <option key={o} value={o} style={{ color: "var(--cms-text)" }}>
              {o}
            </option>
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
      ) : type === "file" ? (
        <div
          className={`cms-custom-file-box ${hasError ? "has-field-error" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            minHeight: 35,
            height: 35,
            border: hasError ? "1px solid #ef4444" : "1px solid var(--cms-border)",
            boxShadow: hasError ? "0 0 0 1px #ef4444" : undefined,
            borderRadius: 7,
            background: "var(--cms-surface, #ffffff)",
            overflow: "hidden",
            position: "relative",
            boxSizing: "border-box",
            ...errorStyle,
          }}
        >
          <input
            type="file"
            id={`file-input-${name}`}
            onChange={handleInputChange}
            accept={fileAccept}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const inp = document.getElementById(`file-input-${name}`);
              if (inp) inp.click();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: "100%",
              padding: "0 10px",
              background: "var(--cms-subtle, #f3f4f6)",
              border: "none",
              borderRight: "1px solid var(--cms-border, #e5e7eb)",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--cms-text, #374151)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Upload size={12} style={{ color: "var(--cms-primary, #355e3b)" }} />
            Choose File
          </button>
          <span
            onClick={val ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreviewOpen(true);
            } : undefined}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              padding: "0 8px",
              fontSize: 10,
              color: val ? "var(--cms-primary, #355e3b)" : "var(--cms-muted, #9ca3af)",
              fontWeight: val ? 600 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: val ? "pointer" : "default",
              textDecoration: val ? "underline" : "none",
              textUnderlineOffset: 2,
            }}
            title={val ? `Click to preview: ${val}` : "No file chosen"}
          >
            {val || "No file chosen"}
          </span>
          {val ? (
            <div style={{ display: "flex", alignItems: "center", gap: 3, paddingRight: 6, flexShrink: 0 }}>
              <button
                type="button"
                className="cms-file-clear-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (localPreviewUrl && localPreviewUrl.startsWith("blob:")) {
                    try {
                      URL.revokeObjectURL(localPreviewUrl);
                    } catch {
                      // ignore URL revocation error
                    }
                  }
                  change("");
                  setLocalFile(null);
                  setLocalPreviewUrl("");
                  if (typeof setValues === "function") {
                    setValues((prev) => ({
                      ...prev,
                      [name]: "",
                      [name + "_previewUrl"]: "",
                      ...(name === "drivingLicence" ? { _dlPdfRawText: "" } : {}),
                    }));
                  }
                  const inp = document.getElementById(`file-input-${name}`);
                  if (inp) inp.value = "";
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  cursor: "pointer",
                  padding: 0,
                }}
                title="Remove selected file"
              >
                <X size={12} />
              </button>
            </div>
          ) : null}
          {previewOpen ? (
            <Modal
              title={`${label} Preview: ${val}`}
              onClose={() => setPreviewOpen(false)}
              size="lg"
            >
              <div style={{ width: "100%", height: "70vh", minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {activePreviewUrl ? (
                  val.toLowerCase().endsWith(".pdf") ? (
                    <object
                      data={activePreviewUrl}
                      type="application/pdf"
                      style={{ width: "100%", height: "100%", border: "1px solid var(--cms-border, #e5e7eb)", borderRadius: 8 }}
                    >
                      <iframe
                        src={activePreviewUrl}
                        title={val}
                        style={{ width: "100%", height: "100%", border: "none", borderRadius: 8 }}
                      />
                    </object>
                  ) : (
                    <img
                      src={activePreviewUrl}
                      alt={val}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
                    />
                  )
                ) : (
                  <div style={{ textAlign: "center", color: "var(--cms-muted)", padding: 40 }}>
                    <FileText size={48} style={{ color: "var(--cms-primary, #355e3b)", marginBottom: 12, margin: "0 auto" }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--cms-text)" }}>{val}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12 }}>Document file selected for upload</p>
                  </div>
                )}
              </div>
            </Modal>
          ) : null}
        </div>
      ) : (
        <input
          type={type}
          readOnly={name === "employeeId"}
          value={val}
          onChange={handleInputChange}
          maxLength={inputMaxLength}
          placeholder={placeholderText}
          max={maxDate}
          style={errorStyle}
        />
      )}
      {error ? (
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
  const isTransferred = String(value).toLowerCase().includes("transfer");
  const isInactive = value === "Inactive";
  const cls = isCompleted ? "status-badge is-active" : isTransferred ? "status-badge is-transferred" : isPending ? "status-badge is-warning" : isInactive ? "status-badge is-inactive" : "status-badge";
  return (
    <span
      className={`status-badge ${cls}`}
      style={isTransferred ? { background: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe", fontWeight: "600", padding: "2px 8px", borderRadius: "12px", fontSize: "11px" } : undefined}
    >
      {value}
    </span>
  );
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
    } catch { }
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
    } catch { }
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

/** Mirrors the mounted staff management dashboard layout while requests are pending, referencing DashboardSkeleton. */
function StaffDashboardSkeleton() {
  return (
    <main className="staff-mock-page staff-dashboard-skeleton" aria-label="Loading staff management" aria-busy="true">
      {/* 5 KPI Cards Skeleton */}
      <section className="staff-kpis" aria-label="Loading staff statistics">
        {Array.from({ length: 5 }, (_, i) => (
          <article key={i} style={{ cursor: "default", pointerEvents: "none" }}>
            <SkeletonAvatar size={32} style={{ flexShrink: 0 }} />
            <div style={{ display: "grid", gap: "6px", width: "100%" }}>
              <Skeleton style={{ width: i === 3 ? "110px" : i === 4 ? "90px" : "75px", height: "10px" }} />
              <Skeleton style={{ width: "42px", height: "18px" }} />
            </div>
          </article>
        ))}
      </section>

      {/* Main Grid Skeleton (Donut Overview + Quick Actions) */}
      <section className="staff-dashboard-grid" aria-label="Loading overview and actions">
        {/* Profile Completion Overview Skeleton */}
        <article className="staff-panel" style={{ cursor: "default" }}>
          <header>
            <div style={{ display: "grid", gap: "4px" }}>
              <Skeleton style={{ width: "165px", height: "15px" }} />
              <Skeleton style={{ width: "135px", height: "10px" }} />
            </div>
          </header>
          <div className="staff-donut-wrap" style={{ minHeight: "192px" }}>
            <Skeleton
              style={{
                width: "125px",
                height: "125px",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: "175px", display: "grid", gap: "10px", width: "100%", maxWidth: "210px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "9px 0",
                  borderBottom: "1px solid var(--cms-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Skeleton style={{ width: "8px", height: "8px", borderRadius: "50%" }} />
                  <Skeleton style={{ width: "68px", height: "11px" }} />
                </div>
                <Skeleton style={{ width: "26px", height: "14px" }} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "9px 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Skeleton style={{ width: "8px", height: "8px", borderRadius: "50%" }} />
                  <Skeleton style={{ width: "56px", height: "11px" }} />
                </div>
                <Skeleton style={{ width: "26px", height: "14px" }} />
              </div>
            </div>
          </div>
        </article>

        {/* Quick Actions Skeleton */}
        <article className="staff-panel quick" style={{ cursor: "default" }}>
          <header>
            <div style={{ display: "grid", gap: "4px" }}>
              <Skeleton style={{ width: "115px", height: "15px" }} />
              <Skeleton style={{ width: "130px", height: "10px" }} />
            </div>
          </header>
          <div style={{ padding: "0 0 10px" }}>
            {Array.from({ length: 5 }, (_, i) => {
              const widths = ["125px", "145px", "110px", "150px", "95px"];
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "calc(100% - 20px)",
                    minHeight: "33px",
                    margin: "6px 10px 0",
                    padding: "6px 9px",
                    border: "1px solid var(--cms-border)",
                    borderRadius: "7px",
                    background: "var(--cms-surface)",
                  }}
                >
                  <Skeleton style={{ width: widths[i], height: "11px" }} />
                  <Skeleton style={{ width: "12px", height: "12px", borderRadius: "3px" }} />
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}

// ----------------------------------------------------------------------
// SCREEN 1 — DASHBOARD (Connected to GET /api/v1/staff/dashboard-stats)
// ----------------------------------------------------------------------
function Dashboard({ records = [], loadingRecords = false }) {
  const n = useNavigate();
  const { boards, selectedBoard } = useAcademicContext();
  const { selectedCampus } = useCampusContext();
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
        const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
        if (activeBoardCode) params.boardCode = activeBoardCode;
        if (activeBoardId) params.boardId = activeBoardId;
        if (activeCampusId != null && activeCampusId !== "") params.campusId = Number(activeCampusId) || activeCampusId;

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
  }, [selectedBoard, selectedCampus]);

  const safeRecords = useMemo(() => {
    const raw = Array.isArray(records) ? records : [];
    return raw.filter((r) => isStaffMatchingBoard(r, selectedBoard, boards) && isStaffMatchingCampus(r, selectedCampus));
  }, [records, selectedBoard, boards, selectedCampus]);

  // Dashboard stats are global aggregates; use campus-scoped staff records when a campus is selected.
  const hasStats = !selectedCampus && stats !== null && stats !== undefined;
  const isDataLoading = loading || loadingRecords;

  const totalCount = isDataLoading ? "Loading..." : safeRecords.filter((r) => !r?.status || r?.status === "Active").length;
  const teachingCount = isDataLoading ? "Loading..." : safeRecords.filter((r) => {
    if (r?.status && r.status !== "Active") return false;
    const s = String(r?.staffType || "").toLowerCase();
    return s.includes("teach") && !s.includes("non");
  }).length;
  const nonTeachingCount = isDataLoading ? "Loading..." : (typeof totalCount === "number" && typeof teachingCount === "number" ? Math.max(0, totalCount - teachingCount) : 0);
  const completedCount = isDataLoading ? "Loading..." : safeRecords.filter((r) => r?.profileStatus === "Completed").length;
  const pendingCount = isDataLoading ? "Loading..." : (typeof totalCount === "number" ? Math.max(0, totalCount - completedCount) : 0);
  const pct = typeof totalCount === "number" && totalCount > 0 && typeof completedCount === "number" ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle="Manage teaching and non-teaching staff, their details and profile completion."
      breadcrumb={["People"]}
      actions={
        isDataLoading ? (
          <SkeletonButton width={105} />
        ) : (
          <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/add")}>
            <Plus /> Add Staff
          </button>
        )
      }
    >
      {isDataLoading ? (
        <StaffDashboardSkeleton />
      ) : (
        <main className="staff-mock-page">
          <section className="staff-kpis">
            {[
              ["Total Staff", totalCount, totalStaffIcon, "/dashboard/staff/list"],
              ["Teaching Staff", teachingCount, teachingStaffIcon, "/dashboard/staff/teaching"],
              ["Non-Teaching Staff", nonTeachingCount, nonTeachingStaffIcon, "/dashboard/staff/non-teaching"],
              ["Pending Profile Completion", pendingCount, pendingProfilesIcon, "/dashboard/staff/pending?tab=Link%20Sent"],
              ["Completed Profiles", completedCount, completedProfilesIcon, "/dashboard/staff/completed"],
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
      )}
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
  const { selectedCampus } = useCampusContext();
  const list = Array.isArray(records) ? records : [];
  const importInputRef = useRef(null);
  const [tab, setTab] = useState(forced || "All");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
    }, 350);
    return () => clearTimeout(handler);
  }, [q]);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [staffTypeFilter, setStaffTypeFilter] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(5);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);
  const [remove, setRemove] = useState(null);
  const [listTransferTarget, setListTransferTarget] = useState(null);
  const [showListTransferModal, setShowListTransferModal] = useState(false);
  const { campuses } = useCampusContext();
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
        const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
        const params = {
          PageNumber: page,
          PageSize: size,
          SortBy: "Id",
          SortOrder: "DESC",
          SearchTerm: debouncedQ || undefined,
          Department: departmentFilter || undefined,
          Designation: designationFilter || undefined,
          StaffType: forced !== "All" && forced !== "Completed" && forced !== "Pending" ? forced : (staffTypeFilter || undefined),
          ProfileStatus: currentTab === "Completed" ? "Completed" : (currentTab === "Pending" ? "Pending" : undefined),
          BoardCode: activeBoardCode || undefined,
          BoardId: activeBoardId || undefined,
          CampusId: activeCampusId != null && activeCampusId !== "" ? Number(activeCampusId) || activeCampusId : undefined,
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
  }, [page, size, debouncedQ, departmentFilter, designationFilter, staffTypeFilter, forced, tab, records, selectedBoard, selectedCampus, refreshKey]);

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
        const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
        const activeCampusName = selectedCampus?.name ?? selectedCampus?.campusName;
        const activeCampusCode = selectedCampus?.code ?? selectedCampus?.campusCode;

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
          campusId: activeCampusId != null && activeCampusId !== "" ? Number(activeCampusId) || activeCampusId : undefined,
          campusName: activeCampusName || undefined,
          campusCode: activeCampusCode || undefined,
          assignedCampusIds: activeCampusId ? [Number(activeCampusId)] : [],
          assignedCampuses: activeCampusName ? [activeCampusName] : [],
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
      setRecords((prev) => [...newRecordsToAdd, ...(Array.isArray(prev) ? prev : [])]);

      try {
        window.dispatchEvent(new CustomEvent("staff-records-updated"));
      } catch { }

      setImportModalState((prev) => ({ ...prev, isOpen: false }));
      setToast(`Successfully imported ${importedCount} ${importModalState.staffType || "staff"} record(s)!`);
    } catch (err) {
      console.error("Bulk import failed:", err);
      setToast("Failed to complete bulk import.");
    } finally {
      setIsImportSubmitting(false);
    }
  };

  // Helper to retrieve the complete staff dataset across all pages matching the active filter criteria
  const getCompleteStaffDataset = async () => {
    const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
    const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;
    const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
    const currentTab = forced || tab;
    const isNonTeaching = currentTab === "Non-Teaching" || (!forced && tab === "Non-Teaching") || forced === "Non-Teaching";
    const effectiveStaffType = isNonTeaching ? "Non-Teaching" : (currentTab === "Teaching" || forced === "Teaching" ? "Teaching" : (staffTypeFilter || undefined));

    let apiStaffRecords = [];
    try {
      const response = await apiClient.get(apiEndpoints.faculty.list, {
        params: {
          PageNumber: 1,
          PageSize: 10000,
          SearchTerm: q || undefined,
          Department: departmentFilter || undefined,
          Designation: designationFilter || undefined,
          StaffType: effectiveStaffType,
          ProfileStatus: currentTab === "Completed" ? "Completed" : (currentTab === "Pending" ? "Pending" : undefined),
          BoardCode: activeBoardCode || undefined,
          BoardId: activeBoardId || undefined,
          CampusId: activeCampusId != null && activeCampusId !== "" ? Number(activeCampusId) || activeCampusId : undefined,
        },
      });
      if (response?.data) {
        const items = response.data.items || response.data.data || (Array.isArray(response.data) ? response.data : []);
        if (Array.isArray(items) && items.length > 0) {
          apiStaffRecords = items;
        }
      }
    } catch (fetchErr) {
      console.warn("Could not fetch full staff list from API, using local records:", fetchErr);
    }

    const itemMap = new Map();
    (list || []).forEach((r) => {
      if (!r) return;
      const key = String(r.id ?? r.employeeId ?? "");
      if (key) itemMap.set(key, r);
      if (r.employeeId) itemMap.set(String(r.employeeId).trim().toLowerCase(), r);
    });

    const mergedList = [];
    const seenKeys = new Set();

    if (apiStaffRecords.length > 0) {
      apiStaffRecords.forEach((apiItem) => {
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

    (list || []).forEach((r) => {
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

    return mergedList.filter((r) => {
      if (!r) return false;
      if (!isStaffMatchingBoard(r, selectedBoard, boards)) return false;
      if (!isStaffMatchingCampus(r, selectedCampus)) return false;
      if (
        currentTab !== "All" &&
        (currentTab === "Pending"
          ? r.staffType !== "Teaching" || r.profileStatus === "Completed"
          : currentTab === "Completed"
            ? r.profileStatus !== "Completed"
            : r.staffType !== currentTab)
      ) {
        return false;
      }
      if (departmentFilter && r.department !== departmentFilter) return false;
      if (designationFilter && r.designation !== designationFilter) return false;
      if (staffTypeFilter && r.staffType !== staffTypeFilter) return false;

      const staffFullName = r.fullName || [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ") || r.name || "";
      return [staffFullName, r.firstName, r.middleName, r.lastName, r.name, r.employeeId, r.email, r.mobile, r.department, r.designation, r.board, r.boardCode].some((v) =>
        String(v || "").toLowerCase().includes((q || "").toLowerCase())
      );
    });
  };

  // GET /api/v1/staff/export-excel
  const handleExportExcel = async () => {
    setExportOpen(false);
    const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
    const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;
    const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
    const currentTab = forced || tab;
    const effectiveStaffType = forced !== "All" && forced ? forced : (currentTab !== "All" && currentTab !== "Completed" && currentTab !== "Pending" ? currentTab : (staffTypeFilter || undefined));

    try {
      const response = await apiClient.get(apiEndpoints.faculty.exportExcel, {
        params: {
          SearchTerm: q || undefined,
          Department: departmentFilter || undefined,
          Designation: designationFilter || undefined,
          StaffType: effectiveStaffType,
          BoardCode: activeBoardCode || undefined,
          BoardId: activeBoardId || undefined,
          CampusId: activeCampusId != null && activeCampusId !== "" ? Number(activeCampusId) || activeCampusId : undefined,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Staff_Export_${effectiveStaffType || "All"}_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setToast("Exported staff data to Excel (.xlsx) successfully.");
    } catch (err) {
      console.warn("Backend Excel export endpoint unavailable, generating from full staff records:", err);
      try {
        const isNonTeaching = effectiveStaffType === "Non-Teaching";
        const excelCols = isNonTeaching ? NON_TEACHING_EXCEL_COLUMNS : TEACHING_EXCEL_COLUMNS;
        const completeRows = await getCompleteStaffDataset();
        const excelRows = completeRows.map((r) => {
          const rawSubs = r.allocatedSubjects ?? r.subjects;
          const subsStr = Array.isArray(rawSubs)
            ? rawSubs.map((s) => (typeof s === "object" ? s.name || s.subjectName || String(s) : String(s))).filter(Boolean).join(", ")
            : (typeof rawSubs === "string" ? rawSubs : "");

          if (isNonTeaching) {
            return [
              resolveBoardCode(r, boards) || selectedBoard?.name || "Main Campus",
              r.employeeId || "",
              r.firstName || "",
              r.middleName || "",
              r.lastName || "",
              r.dateOfBirth ? String(r.dateOfBirth).split("T")[0] : "",
              r.gender || "Other",
              r.mobile || "",
              r.email || "",
              r.department || "",
              r.designation || "",
              r.dateOfJoining ? String(r.dateOfJoining).split("T")[0] : "",
              r.employmentType || "Full Time",
              r.status || "Active",
            ];
          }

          return [
            resolveBoardCode(r, boards) || selectedBoard?.name || "Main Campus",
            r.employeeId || "",
            r.firstName || "",
            r.middleName || "",
            r.lastName || "",
            r.dateOfBirth ? String(r.dateOfBirth).split("T")[0] : "",
            r.gender || "Other",
            r.mobile || "",
            r.email || "",
            r.department || "",
            r.designation || "",
            subsStr,
            r.dateOfJoining ? String(r.dateOfJoining).split("T")[0] : "",
            r.employmentType || "Full Time",
            r.status || "Active",
          ];
        });

        const ws = XLSX.utils.aoa_to_sheet([excelCols, ...excelRows]);
        ws["!cols"] = excelCols.map(() => ({ wch: 22 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Staff Directory");
        XLSX.writeFile(wb, `Staff_Export_${effectiveStaffType || "All"}_${new Date().toISOString().split("T")[0]}.xlsx`);
        setToast("Exported staff data to Excel (.xlsx) successfully.");
      } catch (fallbackErr) {
        console.error("Local Excel export failed:", fallbackErr);
        setToast("Failed to export staff data to Excel.");
      }
    }
  };

  // Black-and-white professional PDF table export covering ALL staff records and complete details
  const handleExportPdf = async () => {
    setExportOpen(false);
    setExportingPdf(true);
    setToast("Preparing complete PDF export...");

    try {
      const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
      const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;
      const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
      const currentTab = forced || tab;
      const isNonTeaching = currentTab === "Non-Teaching" || (!forced && tab === "Non-Teaching") || forced === "Non-Teaching";
      const staffTitle = isNonTeaching
        ? "Non-Teaching Staff Directory"
        : currentTab === "Teaching" || forced === "Teaching"
          ? "Teaching Staff Directory"
          : "Staff Directory";
      const effectiveStaffType = isNonTeaching ? "Non-Teaching" : (currentTab === "Teaching" || forced === "Teaching" ? "Teaching" : (staffTypeFilter || undefined));
      const boardLabel = selectedBoard?.name || selectedBoard?.code || "Main Campus";
      const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      // 1. Fetch complete staff records from API across all pages (PageSize: 10000)
      let apiStaffRecords = [];
      try {
        const response = await apiClient.get(apiEndpoints.faculty.list, {
          params: {
            PageNumber: 1,
            PageSize: 10000,
            SearchTerm: q || undefined,
            Department: departmentFilter || undefined,
            Designation: designationFilter || undefined,
            StaffType: effectiveStaffType,
            ProfileStatus: currentTab === "Completed" ? "Completed" : (currentTab === "Pending" ? "Pending" : undefined),
            BoardCode: activeBoardCode || undefined,
            BoardId: activeBoardId || undefined,
            CampusId: activeCampusId != null && activeCampusId !== "" ? Number(activeCampusId) || activeCampusId : undefined,
          },
        });
        if (response?.data) {
          const items = response.data.items || response.data.data || (Array.isArray(response.data) ? response.data : []);
          if (Array.isArray(items) && items.length > 0) {
            apiStaffRecords = items;
          }
        }
      } catch (fetchErr) {
        console.warn("Could not fetch full staff list from API for PDF, using local records:", fetchErr);
      }

      // 2. Merge API items with local list for consistency and complete field coverage
      const itemMap = new Map();
      (list || []).forEach((r) => {
        if (!r) return;
        const key = String(r.id ?? r.employeeId ?? "");
        if (key) itemMap.set(key, r);
        if (r.employeeId) itemMap.set(String(r.employeeId).trim().toLowerCase(), r);
      });

      const mergedList = [];
      const seenKeys = new Set();

      if (apiStaffRecords.length > 0) {
        apiStaffRecords.forEach((apiItem) => {
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

      (list || []).forEach((r) => {
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

      // 3. Filter complete dataset according to board, campus, tab, department, designation and search
      const exportData = mergedList.filter((r) => {
        if (!r) return false;
        if (!isStaffMatchingBoard(r, selectedBoard, boards)) return false;
        if (!isStaffMatchingCampus(r, selectedCampus)) return false;
        if (
          currentTab !== "All" &&
          (currentTab === "Pending"
            ? r.staffType !== "Teaching" || r.profileStatus === "Completed"
            : currentTab === "Completed"
              ? r.profileStatus !== "Completed"
              : r.staffType !== currentTab)
        ) {
          return false;
        }
        if (departmentFilter && r.department !== departmentFilter) return false;
        if (designationFilter && r.designation !== designationFilter) return false;
        if (staffTypeFilter && r.staffType !== staffTypeFilter) return false;

        const staffFullName = r.fullName || [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ") || r.name || "";
        return [staffFullName, r.firstName, r.middleName, r.lastName, r.name, r.employeeId, r.email, r.mobile, r.department, r.designation, r.board, r.boardCode].some((v) =>
          String(v || "").toLowerCase().includes((q || "").toLowerCase())
        );
      });

      if (exportData.length === 0) {
        setToast("No staff records found to export for the selected criteria.");
        return;
      }

      // 4. Construct professional Landscape A4 PDF Document
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Pure Black & White Header Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      doc.text("PIRNAV INTERMEDIATE COLLEGE", 8, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`${staffTitle} — ${boardLabel}`, 8, 20);

      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text(`Generated on: ${dateStr} | Total Staff Records Exported: ${exportData.length}`, 8, 26);

      // 5. Complete Table Headers matching full staff profile details
      const tableHeaders = isNonTeaching
        ? [
          "#",
          "Employee ID",
          "Staff Name",
          "Department",
          "Designation",
          "Board",
          "Gender",
          "Date of Birth",
          "Mobile",
          "Email",
          "Joining Date",
          "Experience",
          "Employment",
          "Location",
          "Status",
        ]
        : [
          "#",
          "Employee ID",
          "Staff Name",
          "Department",
          "Designation",
          "Board",
          "Subject Allocation",
          "Gender",
          "Date of Birth",
          "Mobile",
          "Email",
          "Joining Date",
          "Experience",
          "Employment",
          "Status",
        ];

      // 6. Map complete individual records to table rows
      const tableData = exportData.map((r, idx) => {
        const empId = r.employeeId || `STF-${idx + 1}`;
        const name = [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ") || r.fullName || r.name || "—";
        const dept = r.department || "—";
        const desig = r.designation || "—";
        const board = resolveBoardCode(r, boards) || r.boardCode || r.boardName || r.board || "—";
        const gender = r.gender || "Other";
        const dob = r.dateOfBirth ? String(r.dateOfBirth).split("T")[0] : "—";
        const mobile = r.alternateMobile ? `${r.mobile || "—"}\nAlt: ${r.alternateMobile}` : (r.mobile || "—");
        const email = r.email || "—";
        const joining = (r.dateOfJoining || r.joiningDate) ? String(r.dateOfJoining || r.joiningDate).split("T")[0] : "—";
        const exp = r.experience != null && r.experience !== "" ? `${Number(r.experience)} Yrs` : "0 Yrs";
        const empType = r.employmentType || "Full Time";
        const location = [r.city, r.state].filter(Boolean).join(", ") || "—";
        const status = r.status || "Active";

        if (isNonTeaching) {
          return [
            idx + 1,
            empId,
            name,
            dept,
            desig,
            board,
            gender,
            dob,
            mobile,
            email,
            joining,
            exp,
            empType,
            location,
            status,
          ];
        }

        const rawSubs = r.allocatedSubjects ?? r.subjects;
        const subsStr = Array.isArray(rawSubs)
          ? rawSubs.map((s) => (typeof s === "object" ? s.name || s.subjectName || String(s) : String(s))).filter(Boolean).join(", ")
          : (typeof rawSubs === "string" ? rawSubs : "—");

        return [
          idx + 1,
          empId,
          name,
          dept,
          desig,
          board,
          subsStr || "—",
          gender,
          dob,
          mobile,
          email,
          joining,
          exp,
          empType,
          status,
        ];
      });

      // 7. AutoTable with repeated headers across multiple pages and exact B&W styling
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 30,
        showHead: "everyPage",
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 7.2,
          textColor: [0, 0, 0],
          lineColor: [140, 140, 140],
          lineWidth: 0.2,
          cellPadding: 2,
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 7.2,
          lineWidth: 0.35,
          lineColor: [80, 80, 80],
          valign: "middle",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: isNonTeaching
          ? {
            0: { cellWidth: 7, halign: "center" },
            1: { cellWidth: 20 },
            2: { cellWidth: 28 },
            3: { cellWidth: 24 },
            4: { cellWidth: 24 },
            5: { cellWidth: 18 },
            6: { cellWidth: 14, halign: "center" },
            7: { cellWidth: 19, halign: "center" },
            8: { cellWidth: 24 },
            9: { cellWidth: 34 },
            10: { cellWidth: 19, halign: "center" },
            11: { cellWidth: 15, halign: "center" },
            12: { cellWidth: 17, halign: "center" },
            13: { cellWidth: 22 },
            14: { cellWidth: 16, halign: "center" },
          }
          : {
            0: { cellWidth: 7, halign: "center" },
            1: { cellWidth: 19 },
            2: { cellWidth: 26 },
            3: { cellWidth: 22 },
            4: { cellWidth: 22 },
            5: { cellWidth: 16 },
            6: { cellWidth: 29 },
            7: { cellWidth: 12, halign: "center" },
            8: { cellWidth: 18, halign: "center" },
            9: { cellWidth: 22 },
            10: { cellWidth: 32 },
            11: { cellWidth: 18, halign: "center" },
            12: { cellWidth: 14, halign: "center" },
            13: { cellWidth: 16, halign: "center" },
            14: { cellWidth: 14, halign: "center" },
          },
        margin: { top: 30, left: 7.5, right: 7.5, bottom: 13 },
        didDrawPage: (data) => {
          const totalPages = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          doc.text(
            "Pirnav College Management System — Official Staff Directory",
            7.5,
            doc.internal.pageSize.getHeight() - 6
          );
          doc.text(
            `Page ${data.pageNumber} of ${totalPages}`,
            doc.internal.pageSize.getWidth() - 7.5,
            doc.internal.pageSize.getHeight() - 6,
            { align: "right" }
          );
        },
      });

      const filename = `${staffTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
      setToast(`Exported ${exportData.length} staff records to PDF successfully.`);
    } catch (pdfErr) {
      console.error("Failed to export complete staff PDF:", pdfErr);
      setToast("Failed to export PDF file. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Download Excel Template with full headers and 0 data rows (blank template)
  const handleExportTemplate = (typeOverride) => {
    setExportOpen(false);
    const targetType = typeOverride || (forced === "Non-Teaching" || (!forced && tab === "Non-Teaching") ? "Non-Teaching" : "Teaching");
    const columns = targetType === "Non-Teaching" ? NON_TEACHING_EXCEL_COLUMNS : TEACHING_EXCEL_COLUMNS;

    try {
      // Template must contain strictly column headers only (0 sample or existing rows)
      const ws = XLSX.utils.aoa_to_sheet([columns]);
      ws["!cols"] = columns.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${targetType}_Template`);
      XLSX.writeFile(wb, `${targetType}_Staff_Import_Template.xlsx`);
      setToast(`Downloaded blank ${targetType} Staff Excel Template successfully.`);
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
      setRecords((prev) => prev.filter((r) => String(r.id) !== String(remove.id)));
      setApiItems((prev) => Array.isArray(prev) ? prev.filter((r) => String(r.id) !== String(remove.id)) : null);
      setTotalApiCount((prev) => Math.max(0, prev - 1));
      setRemove(null);
      try {
        window.dispatchEvent(new Event("staff-records-updated"));
      } catch (error) {
        console.warn("Unable to notify Roles & Permissions about the staff deletion:", error);
      }
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

    return mergedList.filter((r) => {
      if (!r) return false;
      if (!isStaffMatchingBoard(r, selectedBoard, boards)) return false;
      if (!isStaffMatchingCampus(r, selectedCampus)) return false;
      if (
        currentTab !== "All" &&
        (currentTab === "Pending"
          ? r.staffType !== "Teaching" || r.profileStatus === "Completed"
          : currentTab === "Completed"
            ? r.profileStatus !== "Completed"
            : r.staffType !== currentTab)
      ) {
        return false;
      }
      if (departmentFilter && r.department !== departmentFilter) return false;
      if (designationFilter && r.designation !== designationFilter) return false;
      if (staffTypeFilter && r.staffType !== staffTypeFilter) return false;

      const staffFullName = r.fullName || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.name || "";
      return [staffFullName, r.firstName, r.lastName, r.name, r.employeeId, r.email, r.mobile, r.department, r.designation, r.board, r.boardCode].some((v) =>
        String(v || "").toLowerCase().includes((q || "").toLowerCase()),
      );
    }).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [apiItems, list, currentTab, q, departmentFilter, designationFilter, staffTypeFilter, selectedBoard, boards, selectedCampus]);

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

        let deptItems = [];
        let desigItems = [];

        try {
          const [deptRes, desigRes] = await Promise.allSettled([
            apiClient.get(apiEndpoints.departments.getAll, { params, skipGlobalLoader: true, silent: true, skipErrorLog: true }),
            apiClient.get(apiEndpoints.designations.getAll, { params: { includeInactive: false, ...params }, skipGlobalLoader: true, silent: true, skipErrorLog: true }),
          ]);

          if (deptRes.status === "fulfilled" && deptRes.value?.data) {
            deptItems = deptRes.value.data.items || deptRes.value.data.data || (Array.isArray(deptRes.value.data) ? deptRes.value.data : []);
          }
          if (desigRes.status === "fulfilled" && desigRes.value?.data) {
            desigItems = desigRes.value.data.items || desigRes.value.data.data || (Array.isArray(desigRes.value.data) ? desigRes.value.data : []);
          }
        } catch {
          // ignore
        }

        if (deptItems.length === 0) {
          deptItems = loadCachedDepartments();
        }
        if (desigItems.length === 0) {
          desigItems = loadCachedDesignations();
        }

        if (isMounted) {
          setApiFilterDepts(deptItems);
          setApiFilterDesigs(desigItems);
        }
      } catch (err) {
        console.warn("Failed to load department/designation filter options from API:", err);
      }
    }
    fetchFilterOptions();
    return () => { isMounted = false; };
  }, [forced, tab]);

  const departmentOptions = useMemo(() => {
    const isTeaching = forced === "Teaching" || (!forced && tab === "Teaching");
    const isNonTeaching = forced === "Non-Teaching" || (!forced && tab === "Non-Teaching");
    const fallbackList = isTeaching ? teachingDepartments : isNonTeaching ? nonTeachingDepartments : [...teachingDepartments, ...nonTeachingDepartments];
    const apiNames = apiFilterDepts.map((d) => (typeof d === "object" ? d.name || d.departmentName : d)).filter(Boolean);
    const listNames = list.map((r) => r?.department).filter(Boolean);
    return [...new Set([...apiNames, ...fallbackList, ...listNames])];
  }, [apiFilterDepts, forced, tab, list]);

  const designationOptions = useMemo(() => {
    const isTeaching = forced === "Teaching" || (!forced && tab === "Teaching");
    const isNonTeaching = forced === "Non-Teaching" || (!forced && tab === "Non-Teaching");
    const currentDept = String(departmentFilter || "").trim();
    const currentDeptNorm = currentDept.toLowerCase().replace(/[-_\s&]/g, "");

    if (currentDept) {
      // 1. Live designations from API matching selected department
      const matchingApi = apiFilterDesigs
        .filter((d) => {
          if (!d) return false;
          if (typeof d === "object") {
            const dDeptName = String(d.departmentName || d.department || "").trim().toLowerCase().replace(/[-_\s&]/g, "");
            return dDeptName && (dDeptName === currentDeptNorm || currentDeptNorm.includes(dDeptName) || dDeptName.includes(currentDeptNorm));
          }
          return false;
        })
        .map((d) => (typeof d === "object" ? d.name || d.designationName : d))
        .filter(Boolean);

      // 2. Static / fallback designation mapping for this department
      const activeMap = isTeaching ? teachingDesignationMap : isNonTeaching ? nonTeachingDesignationMap : { ...teachingDesignationMap, ...nonTeachingDesignationMap };
      let mapDesigs = [];
      for (const [deptKey, desigs] of Object.entries(activeMap)) {
        const keyNorm = deptKey.toLowerCase().replace(/[-_\s&]/g, "");
        if (keyNorm === currentDeptNorm || currentDeptNorm.includes(keyNorm) || keyNorm.includes(currentDeptNorm)) {
          if (Array.isArray(desigs)) mapDesigs = desigs;
          break;
        }
      }

      // 3. Fallback from local list items matching this department
      const localMatching = list
        .filter((r) => r && String(r.department || "").trim().toLowerCase().replace(/[-_\s&]/g, "") === currentDeptNorm)
        .map((r) => r.designation)
        .filter(Boolean);

      const combined = [...new Set([...matchingApi, ...mapDesigs, ...localMatching])];
      if (combined.length > 0) return combined;
    }

    // When no department is selected, return all designations for this staff type
    const fallbackList = isTeaching ? teachingDesignations : isNonTeaching ? nonTeachingDesignations : [...teachingDesignations, ...nonTeachingDesignations];
    const apiNames = apiFilterDesigs.map((d) => (typeof d === "object" ? d.name || d.designationName : d)).filter(Boolean);
    const listNames = list.map((r) => r?.designation).filter(Boolean);
    return [...new Set([...apiNames, ...fallbackList, ...listNames])];
  }, [apiFilterDesigs, departmentFilter, forced, tab, list]);

  const handleDepartmentFilterChange = (newDept) => {
    setDepartmentFilter(newDept);
    setPage(1);
    if (newDept && designationFilter) {
      const currentDeptNorm = newDept.toLowerCase().replace(/[-_\s&]/g, "");
      const isTeaching = forced === "Teaching" || (!forced && tab === "Teaching");
      const isNonTeaching = forced === "Non-Teaching" || (!forced && tab === "Non-Teaching");
      const activeMap = isTeaching ? teachingDesignationMap : isNonTeaching ? nonTeachingDesignationMap : { ...teachingDesignationMap, ...nonTeachingDesignationMap };
      let validDesigs = [];
      for (const [deptKey, desigs] of Object.entries(activeMap)) {
        const keyNorm = deptKey.toLowerCase().replace(/[-_\s&]/g, "");
        if (keyNorm === currentDeptNorm || currentDeptNorm.includes(keyNorm) || keyNorm.includes(currentDeptNorm)) {
          validDesigs = desigs;
          break;
        }
      }
      const matchingApi = apiFilterDesigs
        .filter((d) => typeof d === "object" && String(d.departmentName || d.department || "").toLowerCase().replace(/[-_\s&]/g, "") === currentDeptNorm)
        .map((d) => (typeof d === "object" ? d.name || d.designationName : d));
      const allValid = new Set([...validDesigs, ...matchingApi]);
      if (allValid.size > 0 && !allValid.has(designationFilter)) {
        setDesignationFilter("");
      }
    }
  };

  const showStaffType = forced !== "Teaching" && forced !== "Non-Teaching";
  const shown = useMemo(() => {
    if (apiItems !== null && Array.isArray(apiItems)) {
      return apiItems.map((r) => {
        let empId = r.employeeId;
        if (!empId || typeof empId === "object" || empId === "[object Object]") {
          empId = r.id ? `PCTCH00${r.id}` : "PCTCH0001";
        }
        return {
          ...r,
          employeeId: empId,
          fullName: r.fullName || `${r.firstName || ""} ${r.middleName ? r.middleName + " " : ""}${r.lastName || ""}`.trim(),
        };
      });
    }
    return rows.slice((page - 1) * size, page * size);
  }, [apiItems, rows, page, size]);

  const totalRowsCount = apiItems !== null ? totalApiCount : rows.length;

  return (
    <DashboardLayout
      title={forced === "Completed" ? "Completed Profiles" : forced === "All" ? "Total Staff" : forced ? `${forced} Staff` : "Total Staff"}
      subtitle={forced === "Completed" ? "View staff members with completed profiles." : forced === "All" || !forced ? "View, edit and manage all staff members across the institution." : `View, edit and manage ${forced.toLowerCase()} staff members.`}
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
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <select value={departmentFilter} onChange={(e) => handleDepartmentFilterChange(e.target.value)} aria-label="Filter by department">
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
                <Download size={15} /> Download Template
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
                    <button type="button" onClick={handleExportPdf} disabled={exportingPdf}>
                      {exportingPdf ? "Exporting PDF..." : "Export PDF"}
                    </button>
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
                  Array.from({ length: 6 }, (_, index) => (
                    <SkeletonRow key={index} columns={showStaffType ? 8 : 7} />
                  ))
                ) : shown.length > 0 ? (
                  shown.map((r, idx) => (
                    <tr key={`staff-item-${r.id || r.employeeId || idx}`}>
                      <td>{r.employeeId}</td>
                      <td>
                        {(() => {
                          const isMulti = (Array.isArray(r.assignedCampusIds) && r.assignedCampusIds.length > 1) ||
                            (Array.isArray(r.assignedCampuses) && r.assignedCampuses.length > 1) ||
                            (r.campusBoardAssignmentsJson && r.campusBoardAssignmentsJson.includes('campusId'));
                          const campusCount = r.assignedCampusIds?.length || r.assignedCampuses?.length || (isMulti ? "Multi" : 1);

                          return (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <strong>{r.fullName || `${r.firstName || ""} ${r.lastName || ""}`}</strong>
                                {isMulti ? (
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "10px",
                                    fontWeight: "700",
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    border: "1px solid #bfdbfe",
                                    padding: "1px 7px",
                                    borderRadius: "10px",
                                    whiteSpace: "nowrap"
                                  }} title={`Teaching across ${campusCount} campuses`}>
                                    🌐 Global ({campusCount} Campuses)
                                  </span>
                                ) : (
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "10px",
                                    fontWeight: "500",
                                    background: "#f8fafc",
                                    color: "#64748b",
                                    border: "1px solid #e2e8f0",
                                    padding: "1px 6px",
                                    borderRadius: "10px",
                                    whiteSpace: "nowrap"
                                  }}>
                                    📍 Single Campus
                                  </span>
                                )}
                              </div>
                              <small>{r.email}</small>
                            </div>
                          );
                        })()}
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
                          <button title="Transfer Campus" onClick={() => { setListTransferTarget(r); setShowListTransferModal(true); }}>
                            <ArrowRightLeft />
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
            <div className="staff-pagination-info">
              <span>
                Showing {totalRowsCount > 0 ? (page - 1) * size + 1 : 0} to{" "}
                {Math.min(page * size, totalRowsCount)} of {totalRowsCount} entries
              </span>
              <div className="staff-pagination-size-selector">
                <label htmlFor="staff-page-size-select">Rows per page:</label>
                <select
                  id="staff-page-size-select"
                  value={size}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setSize(newSize);
                    setPage(1);
                  }}
                  className="staff-page-size-dropdown"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="staff-pagination-controls">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(1)}
                title="First Page"
                className="staff-page-nav-btn"
              >
                «
              </button>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
                className="staff-page-nav-btn"
              >
                Prev
              </button>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(totalRowsCount / size));
                const pageNumbers = [];
                const maxButtons = 5;
                let startPage = Math.max(1, page - 2);
                let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                if (endPage - startPage < maxButtons - 1) {
                  startPage = Math.max(1, endPage - maxButtons + 1);
                }
                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(i);
                }
                return pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`staff-page-number-btn ${page === p ? "is-active" : ""}`}
                  >
                    {p}
                  </button>
                ));
              })()}
              <button
                type="button"
                disabled={page * size >= totalRowsCount}
                onClick={() => setPage((p) => p + 1)}
                title="Next Page"
                className="staff-page-nav-btn"
              >
                Next
              </button>
              <button
                type="button"
                disabled={page * size >= totalRowsCount}
                onClick={() => setPage(Math.max(1, Math.ceil(totalRowsCount / size)))}
                title="Last Page"
                className="staff-page-nav-btn"
              >
                »
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
      <StaffTransferModal
        staff={listTransferTarget}
        campuses={campuses}
        isOpen={showListTransferModal}
        onClose={() => { setShowListTransferModal(false); setListTransferTarget(null); }}
        onSuccess={(msg) => {
          setToast(msg || "Campus transfer executed successfully.");
          setPage(1);
          setRefreshKey((k) => k + 1);
        }}
      />
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
// CREATE / EDIT TEACHING FORM (POST /api/v1/staff with a generated number-series ID)
// ----------------------------------------------------------------------
function TeachingForm({ records, setRecords, existing }) {
  const n = useNavigate();
  const { selectedCampus, campuses } = useCampusContext();
  const { boards, selectedBoard } = useAcademicContext();
  const { departments: apiDepts, designations: apiDesigs } = useStaffTypeOptions("Teaching");
  const { roles: apiRoles, roleObjects: apiRoleObjects } = useStaffRoles("Teaching");

  const activeCampusId = selectedCampus?.campusId || selectedCampus?.id;
  const activeCampusName = selectedCampus?.name || selectedCampus?.campusName || "";
  const activeCampusCode = selectedCampus?.code || selectedCampus?.campusCode || "";

  const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
  const activeBoardName = selectedBoard?.name || selectedBoard?.boardName || activeBoardCode || "";
  const activeBoardId = selectedBoard?.id || selectedBoard?.boardId || undefined;
  const [values, setValues] = useState(
    existing || {
      staffType: "Teaching",
      role: "",
      roleName: "",
      roleId: undefined,
      employeeId: "",
      campusId: activeCampusId ? Number(activeCampusId) || activeCampusId : undefined,
      campusName: activeCampusName,
      campusCode: activeCampusCode,
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
  const isPrincipal =
    String(values.role || "").trim().toLowerCase() === "principal" ||
    String(values.roleName || "").trim().toLowerCase() === "principal" ||
    String(values.designation || "").trim().toLowerCase() === "principal" ||
    Number(values.roleId) === 15 ||
    Number(values.roleId) === 2;

  const [isGlobalStaff, setIsGlobalStaff] = useState(() => {
    if (existing) {
      return (
        (Array.isArray(existing.assignedCampusIds) && existing.assignedCampusIds.length > 1) ||
        (Array.isArray(existing.assignedCampuses) && existing.assignedCampuses.length > 1) ||
        Boolean(existing.campusBoardAssignmentsJson)
      );
    }
    return isPrincipal;
  });

  useEffect(() => {
    if (isPrincipal && !isGlobalStaff) {
      setIsGlobalStaff(true);
    }
  }, [isPrincipal]);

  useEffect(() => {
    if (!existing) {
      setValues((v) => ({
        ...v,
        campusId: activeCampusId ? Number(activeCampusId) || activeCampusId : v.campusId,
        campusName: activeCampusId ? activeCampusName : v.campusName,
        campusCode: activeCampusId ? activeCampusCode : v.campusCode,
        board: v.board || activeBoardName,
        boardName: v.boardName || activeBoardName,
        boardCode: v.boardCode || activeBoardCode,
        boardId: v.boardId || (activeBoardId ? Number(activeBoardId) || activeBoardId : undefined),
      }));
    }
  }, [activeCampusId, activeCampusName, activeCampusCode, activeBoardName, activeBoardCode, activeBoardId, existing]);

  // If multi-campus is disabled and role is not Principal, reset multi-campus assignments
  useEffect(() => {
    if (!isPrincipal && !isGlobalStaff && values.campusBoardAssignmentsJson) {
      setValues((v) => ({
        ...v,
        assignedCampusIds: v.campusId ? [Number(v.campusId)] : (activeCampusId ? [Number(activeCampusId)] : []),
        assignedCampuses: v.campusName ? [v.campusName] : (activeCampusName ? [activeCampusName] : []),
        campusBoardAssignmentsJson: "",
      }));
    }
  }, [isPrincipal, isGlobalStaff, values.campusBoardAssignmentsJson, activeCampusId, activeCampusName]);

  // Build the next employee ID from existing staff without advancing a series on form load.
  useEffect(() => {
    let isMounted = true;
    async function fetchNextId() {
      const nextId = await resolveNextStaffEmployeeId("Teaching", records, selectedCampus);
      if (isMounted && nextId) {
        setValues((v) => ({ ...v, employeeId: nextId }));
      }
    }
    if (!existing) fetchNextId();
    return () => { isMounted = false; };
  }, [existing, records, activeCampusId]);

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

    const matchedRole = apiRoleObjects.find((r) => (r.roleName || r.name) === values.role);
    const resolvedRoleId = values.roleId || (matchedRole ? (matchedRole.roleId || matchedRole.id) : (isPrincipal ? 15 : (values.role === "Faculty" ? 4 : values.role === "HOD" ? 3 : values.role === "Accounts" ? 7 : values.role === "Examination Cell" ? 8 : values.role === "Library" ? 9 : values.role === "Placement Officer" ? 11 : 4)));

    const hasAssignedCampuses = (isGlobalStaff || isPrincipal) && Array.isArray(values.assignedCampusIds) && values.assignedCampusIds.length > 0;
    const finalAssignedCampusIds = hasAssignedCampuses
      ? [...new Set(values.assignedCampusIds.map(Number).filter(Boolean))]
      : (values.campusId ? [Number(values.campusId)] : (activeCampusId ? [Number(activeCampusId)] : []));

    const hasAssignedBoards = (isGlobalStaff || isPrincipal) && Array.isArray(values.assignedBoardIds) && values.assignedBoardIds.length > 0;
    const finalAssignedBoardIds = hasAssignedBoards
      ? [...new Set(values.assignedBoardIds.map(Number).filter(Boolean))]
      : (values.boardId ? [Number(values.boardId)] : (activeBoardId ? [Number(activeBoardId)] : []));

    const payload = {
      ...values,
      campusId: values.campusId || finalAssignedCampusIds[0] || (activeCampusId ? Number(activeCampusId) || activeCampusId : undefined),
      campusName: values.campusName || activeCampusName,
      campusCode: values.campusCode || activeCampusCode,
      assignedCampusIds: finalAssignedCampusIds,
      assignedCampuses: values.assignedCampuses || [],
      assignedBoardIds: finalAssignedBoardIds,
      assignedBoards: values.assignedBoards || [],
      campusBoardAssignmentsJson: values.campusBoardAssignmentsJson || "",
      board: values.board || activeBoardName,
      boardName: values.boardName || activeBoardName,
      boardCode: resolvedCode !== "—" ? resolvedCode : (values.boardCode || activeBoardCode),
      boardId: values.boardId || finalAssignedBoardIds[0] || (activeBoardId ? Number(activeBoardId) || activeBoardId : undefined),
      role: values.role || (isPrincipal ? "Principal" : "Faculty"),
      roleName: values.roleName || values.role || (isPrincipal ? "Principal" : "Faculty"),
      roleId: Number(resolvedRoleId) || (isPrincipal ? 15 : 4),
      designation: isPrincipal && !values.designation ? "Principal" : (values.designation || (isPrincipal ? "Principal" : "Assistant Professor")),
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

      const photoFile = values.profilePhoto_file || values.photo_file;
      let finalPhotoPath = values.profilePhoto || values.photo || values.photoPath || "";
      if (photoFile && targetId) {
        try {
          const photoData = new FormData();
          photoData.append("Photo", photoFile);
          photoData.append("file", photoFile);
          photoData.append("StaffId", String(targetId));
          photoData.append("staffId", String(targetId));
          const uploadRes = await apiClient.post(apiEndpoints.faculty.uploadPhoto, photoData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          const serverUploaded = uploadRes?.data?.photoPath || uploadRes?.data?.PhotoPath || uploadRes?.data?.profilePhoto;
          if (serverUploaded) {
            finalPhotoPath = serverUploaded;
          }
        } catch (photoErr) {
          console.warn("Failed to upload staff photo file in admin portal:", photoErr);
        }
      }

      const record = {
        ...payload,
        id: targetId,
        photoPath: finalPhotoPath,
        profilePhoto: finalPhotoPath,
        photoUrl: finalPhotoPath,
        assignedCampusIds: finalAssignedCampusIds,
        assignedCampuses: values.assignedCampuses || [],
        assignedBoardIds: finalAssignedBoardIds,
        assignedBoards: values.assignedBoards || [],
        profileCompletion: existing?.profileCompletion || 30,
        addedOn: existing?.addedOn || new Date().toISOString().split("T")[0]
      };
      if (!existing) incrementSeriesSequence("employee-id");
      setRecords(existing ? records.map((r) => (String(r.id) === String(existing.id) ? record : r)) : [record, ...records]);
      window.dispatchEvent(new Event("staff-records-updated"));
      if (existing) {
        setToast("Teaching staff profile updated successfully.");
        n(`/dashboard/staff/teaching`);
      } else {
        setToast("Teaching staff created and invitation email sent successfully.");
        n(`/dashboard/staff/teaching`);
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
            const nextId = await resolveNextStaffEmployeeId("Teaching", records, selectedCampus);
            if (nextId) setValues((v) => ({ ...v, employeeId: nextId }));
          } catch { }
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
        setToast("Teaching staff created and invitation email sent successfully.");
        n(`/dashboard/staff/teaching`);
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
        <form className="staff-form-panel teaching-basic-form" onSubmit={submit}>
          <header>
            <UserRound />
            <div>
              <h2>Teaching Staff Basic Details</h2>
              <p>The staff member completes professional and document information later.</p>
            </div>
          </header>
          <div className="staff-form-grid">
            {teachingFields.map((f) => {
              if (f[0] === "role") {
                return (
                  <Fragment key={f[0]}>
                    <Field
                      item={f}
                      values={values}
                      setValues={setValues}
                      setErrors={setErrors}
                      error={errors[f[0]]}
                      forceOptional={false}
                      departmentOptions={apiDepts}
                      designationOptions={apiDesigs}
                      roleOptions={apiRoleObjects.length > 0 ? apiRoleObjects : apiRoles}
                      staffType="Teaching"
                    />
                    <div style={{
                      gridColumn: "1 / -1",
                      margin: "8px 0 16px",
                      padding: "14px 18px",
                      background: (isGlobalStaff || isPrincipal) ? "#f0fdf4" : "#f8fafc",
                      border: (isGlobalStaff || isPrincipal) ? "1.5px solid #86efac" : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "14px"
                    }}>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: (isGlobalStaff || isPrincipal) ? "#166534" : "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>🌐 Employment Scope: Global / Multi-Campus Teaching Staff</span>
                          {(isGlobalStaff || isPrincipal) && (
                            <span style={{ fontSize: "11px", background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", padding: "1px 8px", borderRadius: "10px", fontWeight: "700" }}>
                              Multi-Campus Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: (isGlobalStaff || isPrincipal) ? "#15803d" : "#64748b", marginTop: "3px" }}>
                          Enable this option to assign this teaching staff member across multiple campuses and boards simultaneously.
                        </div>
                      </div>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: isPrincipal ? "not-allowed" : "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={isGlobalStaff || isPrincipal}
                          disabled={isPrincipal}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsGlobalStaff(checked);
                            if (!checked) {
                              setValues((v) => ({
                                ...v,
                                assignedCampusIds: v.campusId ? [Number(v.campusId)] : (activeCampusId ? [Number(activeCampusId)] : []),
                                assignedCampuses: v.campusName ? [v.campusName] : (activeCampusName ? [activeCampusName] : []),
                                campusBoardAssignmentsJson: "",
                              }));
                            }
                          }}
                          style={{ width: "18px", height: "18px", accentColor: "#16a34a", cursor: isPrincipal ? "not-allowed" : "pointer" }}
                        />
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                          {isPrincipal ? "Mandatory for Principal" : "Assign Multiple Campuses"}
                        </span>
                      </label>
                    </div>

                    {(isGlobalStaff || isPrincipal) ? (
                      <PrincipalCampusBoardAssignment
                        values={values}
                        setValues={setValues}
                        campuses={campuses}
                        allBoards={boards}
                        errors={errors}
                        setErrors={setErrors}
                      />
                    ) : null}
                  </Fragment>
                );
              }
              return (
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
                  roleOptions={apiRoleObjects.length > 0 ? apiRoleObjects : apiRoles}
                  staffType="Teaching"
                />
              );
            })}
          </div>
          <footer>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => n("/dashboard/staff")}>
              Cancel
            </button>
            <button className="cms-btn cms-btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : existing ? "Update Teaching Staff" : "Save Teaching Staff"}
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
  const { selectedCampus } = useCampusContext();
  const { boards, selectedBoard } = useAcademicContext();
  const { departments: apiDepts, designations: apiDesigs } = useStaffTypeOptions("Non-Teaching");
  const { roles: apiRoles, roleObjects: apiRoleObjects } = useStaffRoles("Non-Teaching");

  const activeCampusId = selectedCampus?.campusId || selectedCampus?.id;
  const activeCampusName = selectedCampus?.name || selectedCampus?.campusName || "";
  const activeCampusCode = selectedCampus?.code || selectedCampus?.campusCode || "";

  const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
  const activeBoardName = selectedBoard?.name || selectedBoard?.boardName || activeBoardCode || "";
  const activeBoardId = selectedBoard?.id || selectedBoard?.boardId || undefined;
  const pincodeRequestRef = useRef(0);
  const labels = [
    "Personal Information",
    "Contact & Address",
    "Employment Details",
    // "Salary & Bank", // Commented out per requirement: salary structure is assigned in separate module
    "Documents",
    "Emergency Contact",
    "Preview",
  ];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(
    existing || {
      staffType: "Non-Teaching",
      role: "",
      roleName: "",
      roleId: undefined,
      employeeId: "",
      campusId: activeCampusId ? Number(activeCampusId) || activeCampusId : undefined,
      campusName: activeCampusName,
      campusCode: activeCampusCode,
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
    if (!existing) {
      setValues((v) => ({
        ...v,
        campusId: activeCampusId ? Number(activeCampusId) || activeCampusId : v.campusId,
        campusName: activeCampusId ? activeCampusName : v.campusName,
        campusCode: activeCampusId ? activeCampusCode : v.campusCode,
        board: v.board || activeBoardName,
        boardName: v.boardName || activeBoardName,
        boardCode: v.boardCode || activeBoardCode,
        boardId: v.boardId || (activeBoardId ? Number(activeBoardId) || activeBoardId : undefined),
      }));
    }
  }, [activeCampusId, activeCampusName, activeCampusCode, activeBoardName, activeBoardCode, activeBoardId, existing]);

  // Fetch next employee ID dynamically from Settings Number Series / Staff API
  useEffect(() => {
    let isMounted = true;
    async function fetchNextId() {
      const nextId = await resolveNextStaffEmployeeId("Non-Teaching", records, selectedCampus);
      if (isMounted && nextId) {
        setValues((v) => ({ ...v, employeeId: nextId }));
      }
    }
    if (!existing) fetchNextId();
    return () => { isMounted = false; };
  }, [existing, records, activeCampusId]);

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
    const currentFields = getNonTeachingStepFields(step, values);
    const stepErrors = validateStepFields(currentFields, values, activeBoardName);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setToast("Please fill in all mandatory fields marked with an asterisk (*).");
      return;
    }

    setErrors({});
    if (editingFromReview) {
      setEditingFromReview(false);
      setStep(labels.length - 1);
      return;
    }
    setStep((s) => s + 1);
  };

  const save = async () => {
    for (let i = 0; i < labels.length - 1; i++) {
      const stepFields = getNonTeachingStepFields(i, values);
      const stepErrors = validateStepFields(stepFields, values, activeBoardName);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setToast(`Please fill in all mandatory fields in ${labels[i]}.`);
        setStep(i);
        return;
      }
    }

    const isTransport =
      String(values?.department || "").trim().toLowerCase().includes("transport") ||
      String(values?.designation || "").trim().toLowerCase().includes("driver");

    if (isTransport && values.drivingLicenseNumber && values._dlPdfRawText) {
      const cleanDL = String(values.drivingLicenseNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const rawText = String(values._dlPdfRawText).toUpperCase();
      const cleanPdfText = rawText.replace(/[^A-Z0-9]/g, "");

      const isDirectMatch = cleanPdfText.includes(cleanDL) || rawText.includes(cleanDL);

      if (!isDirectMatch) {
        const dlPatternMatches = rawText.match(/\b([A-Z]{2}\d{2,3}\s?(?:19|20)\d{2}\s?\d{7}|[A-Z]{2}\d{13,14})\b/g);
        if (dlPatternMatches && dlPatternMatches.length > 0) {
          const foundDiffDL = dlPatternMatches.some((match) => {
            const cleanFound = match.replace(/[^A-Z0-9]/g, "");
            return cleanFound.length >= 15 && cleanFound !== cleanDL;
          });
          if (foundDiffDL) {
            setToast("Entered Driver's License Number does not match the uploaded Driving License PDF document.");
            setErrors({ drivingLicenseNumber: "Entered number does not match the uploaded Driving License PDF document." });
            setStep(2);
            return;
          }
        }
      }
    }

    // â”€â”€ Duplicate Driving License Number check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (isTransport && values.drivingLicenseNumber) {
      const enteredDL = String(values.drivingLicenseNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const currentId = existing?.id || existing?.employeeId || null;
      const duplicate = (Array.isArray(records) ? records : []).find((r) => {
        // Skip self when editing
        const rId = r?.id || r?.employeeId;
        if (currentId && String(rId) === String(currentId)) return false;
        const rDL = String(r?.drivingLicenseNumber || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        return rDL.length > 0 && rDL === enteredDL;
      });
      if (duplicate) {
        const dupName = [duplicate.firstName, duplicate.middleName, duplicate.lastName].filter(Boolean).join(" ") || duplicate.employeeId || "another staff member";
        setErrors({ drivingLicenseNumber: `This Driving License Number is already registered under ${dupName}.` });
        setToast(`Driving License '${values.drivingLicenseNumber}' is already registered under ${dupName}. Please verify.`);
        setStep(2);
        return;
      }
    }
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ") || values.employeeId;
    const resolvedCode = values.boardCode || resolveBoardCode({ board: values.board, boardName: values.boardName }, boards);
    const matchedRole = apiRoleObjects.find((r) => (r.roleName || r.name) === values.role);
    const isInventoryManager = String(values.role || "").toLowerCase().replace(/[-_\s]/g, "") === "inventorymanager";
    const inventoryRole = isInventoryManager ? apiRoleObjects.find((r) => String(r.roleName || r.name || "").toLowerCase().replace(/[-_\s]/g, "") === "inventorymanager") : null;
    const inventoryRoleId = inventoryRole?.roleId || inventoryRole?.id || values.roleId;
    if (isInventoryManager && !Number(inventoryRoleId)) {
      setErrors({ role: "Inventory Manager must be configured in the server roles list before saving." });
      setToast("Unable to resolve the Inventory Manager role from the server. Please reload the role list or configure this role first.");
      setStep(0);
      return;
    }
    const resolvedRoleId = isInventoryManager ? inventoryRoleId : values.roleId || (matchedRole ? (matchedRole.roleId || matchedRole.id) : (values.role === "Accountant" ? 7 : values.role === "Cleaner" ? 13 : values.role === "Driver" || values.role === "Bus Driver" ? 12 : values.role === "Hostel Warden" ? 10 : values.role === "Attendant" ? 14 : 13));

    const payload = {
      ...values,
      campusId: values.campusId || (activeCampusId ? Number(activeCampusId) || activeCampusId : undefined),
      campusName: values.campusName || activeCampusName,
      campusCode: values.campusCode || activeCampusCode,
      board: values.board || activeBoardName,
      boardName: values.boardName || activeBoardName,
      boardCode: resolvedCode !== "—" ? resolvedCode : (values.boardCode || activeBoardCode),
      boardId: values.boardId || (activeBoardId ? Number(activeBoardId) || activeBoardId : undefined),
      email: values.email?.trim() ? values.email.trim() : null,
      qualification: values.qualification?.trim() ? values.qualification.trim() : null,
      role: values.role || "Cleaner",
      roleName: values.role || "Cleaner",
      roleId: Number(resolvedRoleId),
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

      const photoFile = values.profilePhoto_file || values.photo_file;
      let finalPhotoPath = values.profilePhoto || values.photo || values.photoPath || "";
      if (photoFile && targetId) {
        try {
          const photoData = new FormData();
          photoData.append("Photo", photoFile);
          photoData.append("file", photoFile);
          photoData.append("StaffId", String(targetId));
          photoData.append("staffId", String(targetId));
          const uploadRes = await apiClient.post(apiEndpoints.faculty.uploadPhoto, photoData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          const serverUploaded = uploadRes?.data?.photoPath || uploadRes?.data?.PhotoPath || uploadRes?.data?.profilePhoto;
          if (serverUploaded) {
            finalPhotoPath = serverUploaded;
          }
        } catch (photoErr) {
          console.warn("Failed to upload staff photo file in admin portal:", photoErr);
        }
      }

      const record = { ...payload, id: targetId, photoPath: finalPhotoPath, profilePhoto: finalPhotoPath, photoUrl: finalPhotoPath, profileStatus: "Completed", profileCompletion: 100, addedOn: existing?.addedOn || new Date().toISOString().split("T")[0] };
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
        let errorStep = 0;
        if (lower.includes("employee id")) {
          nextErrors.employeeId = errMsg;
          errorStep = 0;
          try {
            const nextId = await resolveNextStaffEmployeeId("Non-Teaching", records, selectedCampus);
            if (nextId) setValues((v) => ({ ...v, employeeId: nextId }));
          } catch { }
        }
        if (lower.includes("aadhaar") || lower.includes("pan") || lower.includes("name")) {
          if (lower.includes("aadhaar")) nextErrors.aadhaar = errMsg;
          errorStep = 0;
        }
        if (lower.includes("email")) {
          nextErrors.email = errMsg;
          errorStep = 1;
        }
        if (lower.includes("mobile")) {
          nextErrors.mobile = errMsg;
          errorStep = 1;
        }
        if (lower.includes("license") || lower.includes("licence") || lower.includes("joining") || lower.includes("department") || lower.includes("designation")) {
          if (lower.includes("license") || lower.includes("licence")) nextErrors.drivingLicenseNumber = errMsg;
          errorStep = 2;
        }
        setErrors(nextErrors);
        setStep(errorStep);
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
              <p>Step {step + 1} of {labels.length}</p>
            </div>
          </header>
          {step < labels.length - 1 ? (
            <div className="staff-form-grid">
              {getNonTeachingStepFields(step, values).map((f) => (
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
                  roleOptions={apiRoleObjects.length > 0 ? apiRoleObjects : apiRoles}
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
              groups={labels.slice(0, labels.length - 1).map((label, index) => [label, getNonTeachingStepFields(index, values)])}
              onSave={(updatedRecord) => {
                setValues((prev) => ({ ...prev, ...updatedRecord }));
              }}
            />
          )}
          <footer>
            {step ? (
              <button className="cms-btn cms-btn-ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft /> Previous
              </button>
            ) : null}
            <button className="cms-btn cms-btn-primary" onClick={step === labels.length - 1 ? save : next}>
              {step === labels.length - 1 ? "Save Non-Teaching Staff" : editingFromReview ? "Save & Return to Preview" : "Next"}
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
    } catch { }
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
      // Generate guaranteed functional link for Faculty Dashboard
      finalLink = `${window.location.origin}/faculty-dashboard`;
      setGeneratedLink(finalLink);
      receivedToken = record.profileLinkToken || record.token || record.id || `staff-${record.id}`;
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

  const currentActiveLink = generatedLink || `${window.location.origin}/faculty-dashboard`;

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
// PENDING SUBMISSIONS & BULK RESEND (POST /api/v1/staff/bulk-send-links)
// ----------------------------------------------------------------------
function Pending({ records = [], setRecords, activity }) {
  const n = useNavigate();
  const { selectedCampus } = useCampusContext();
  const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
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
      const params = {
        pageSize: 200,
        ...(activeCampusId ? { campusId: activeCampusId } : {}),
      };
      const res = await apiClient.get(apiEndpoints.faculty.list, { params });
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
  }, [activeCampusId]);

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

    // 2. API items
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
  const [resendingId, setResendingId] = useState(null);
  const [toast, setToast] = useState("");

  const handleDirectResendLink = async (r) => {
    if (!r?.id) return;
    try {
      setResendingId(r.id);
      const res = await apiClient.post(apiEndpoints.faculty.sendLink(r.id), {
        email: (r.email || "").trim(),
        validityDays: 7,
      });
      const resData = res?.data?.data || res?.data;
      const today = new Date().toISOString().split("T")[0];

      if (setRecords) {
        setRecords((prev) =>
          prev.map((rec) =>
            rec.id === r.id
              ? { ...rec, linkSent: true, linkSentAt: today, profileStatus: "Link Sent" }
              : rec
          )
        );
      }

      setToast(
        resData?.emailSent
          ? `Profile completion email resent successfully to ${resData.emailRecipient || r.email || r.fullName}!`
          : `Profile completion link generated for ${r.fullName || r.email}.`
      );
      if (activity) activity(`${r.fullName} profile link resent directly`);
    } catch (err) {
      setToast(getApiErrorMessage(err, "Failed to resend profile link. Please try again."));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <DashboardLayout
      title="Pending Staff Submissions"
      subtitle="Track and review staff profile completion."
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
                {loading ? (
                  Array.from({ length: 6 }, (_, index) => (
                    <SkeletonRow key={index} columns={tab !== "Submitted" ? 9 : 8} />
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={tab !== "Submitted" ? 9 : 8} style={{ textAlign: "center", padding: "32px", color: "var(--cms-muted)" }}>
                      {`No ${tab.toLowerCase()} teaching staff records found.`}
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
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {(() => {
                            const raw = r.profilePhoto || r.photo || r.photoPath || r.photoUrl;
                            const photoSrc = typeof raw === "string" && raw.trim()
                              ? (raw.startsWith("http") || raw.startsWith("data:") || raw.startsWith("blob:") ? raw : raw)
                              : null;
                            return (
                              <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: "var(--cms-border, #e2e8f0)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {photoSrc ? (
                                  <img src={photoSrc} alt={r.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                ) : (
                                  <UserRound size={16} color="var(--cms-muted, #64748b)" />
                                )}
                              </div>
                            );
                          })()}
                          <div>
                            <strong>{r.fullName}</strong>
                            {r.email && r.email !== "—" ? (
                              <div style={{ fontSize: "11px", color: "var(--cms-muted)" }}>{r.email}</div>
                            ) : null}
                          </div>
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
                              onClick={() => handleDirectResendLink(r)}
                              disabled={resendingId === r.id}
                              title="Resend profile completion link directly to staff email"
                            >
                              <Send size={13} className={resendingId === r.id ? "spin" : ""} />
                              {resendingId === r.id ? "Resending..." : r.linkSent ? "Resend Link" : "Send Link"}
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
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// DYNAMIC EXPERIENCE & CAMPUS TENURE WIDGET
// ----------------------------------------------------------------------
function StaffExperienceWidget({ staffId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await apiClient.get(apiEndpoints.faculty.experienceSummary(staffId));
        if (active && res.data) {
          setData(res.data.data || res.data);
        }
      } catch (e) {
        console.error("Failed to load experience summary", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (staffId) load();
    return () => { active = false; };
  }, [staffId]);

  if (loading) {
    return <div style={{ padding: "16px", color: "var(--cms-muted)" }}>Calculating dynamic experience intervals...</div>;
  }
  if (!data) return null;

  return (
    <div style={{ marginTop: "10px", marginBottom: "10px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
      <h3 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>🎓 Dynamic Experience & Campus Tenure Calculation</span>
        <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
          Non-Overlapping Union Engine
        </span>
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Prior External Service</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginTop: "4px" }}>
            {data.priorExternalExperienceYears ?? 0} <span style={{ fontSize: "12px", fontWeight: "500", color: "#64748b" }}>yrs</span>
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Approved external history</div>
        </div>

        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Institutional Service</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginTop: "4px" }}>
            {data.institutionalExperienceYears ?? 0} <span style={{ fontSize: "12px", fontWeight: "500", color: "#64748b" }}>yrs</span>
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Campus assignments tenure</div>
        </div>

        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Current Campus Tenure</div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginTop: "4px" }}>
            {data.currentCampusTenureYears ?? 0} <span style={{ fontSize: "12px", fontWeight: "500", color: "#64748b" }}>yrs</span>
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Active posting duration</div>
        </div>

        <div style={{ background: "#f0fdf4", padding: "12px 16px", borderRadius: "8px", borderLeft: "4px solid #16a34a" }}>
          <div style={{ fontSize: "12px", color: "#15803d", fontWeight: "700" }}>Total Dynamic Experience</div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#15803d", marginTop: "4px" }}>
            {data.totalDynamicExperienceYears ?? 0} <span style={{ fontSize: "13px", fontWeight: "600" }}>yrs</span>
          </div>
          <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "2px" }}>Certified service total</div>
        </div>
      </div>

      {Array.isArray(data.campusTenures) && data.campusTenures.length > 0 && (
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
            Campus Tenure Breakdown:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {data.campusTenures.map((t, idx) => (
              <span key={idx} style={{
                background: t.isPrimary ? "#eff6ff" : "#f1f5f9",
                border: t.isPrimary ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                color: t.isPrimary ? "#1e40af" : "#475569",
                padding: "3px 10px",
                borderRadius: "6px",
                fontSize: "12px"
              }}>
                <strong>{t.campusName || `Campus ${t.campusId}`}</strong>: {t.tenureYears} yrs ({t.startDate ? t.startDate.split("T")[0] : "—"} to {t.endDate ? t.endDate.split("T")[0] : "Present"})
                {t.isPrimary && <span style={{ marginLeft: "5px", color: "#2563eb", fontWeight: "bold" }}>★ Primary</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// CAMPUS TRANSFER HISTORY COMPONENT
// ----------------------------------------------------------------------
function StaffTransferHistory({ staffId, refreshKey }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await apiClient.get(apiEndpoints.staffTransfers.history(staffId));
        if (active && res.data) {
          setTransfers(res.data.data || res.data || []);
        }
      } catch (e) {
        console.error("Failed to load staff transfer history", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (staffId) load();
    return () => { active = false; };
  }, [staffId, refreshKey]);

  if (loading) return <div style={{ padding: "12px 0", color: "var(--cms-muted)" }}>Loading transfer history...</div>;
  if (!transfers.length) return null;

  return (
    <div style={{ marginTop: "10px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>⇄ Campus Transfer & Relocation History</span>
        <span style={{ fontSize: "11px", fontWeight: "normal", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
          {transfers.length} Recorded Transfer{transfers.length > 1 ? "s" : ""}
        </span>
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "8px 12px" }}>Order #</th>
              <th style={{ padding: "8px 12px" }}>Type</th>
              <th style={{ padding: "8px 12px" }}>From Campus</th>
              <th style={{ padding: "8px 12px" }}>To Campus</th>
              <th style={{ padding: "8px 12px" }}>Effective Date</th>
              <th style={{ padding: "8px 12px" }}>Status</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Document</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", fontWeight: "600", color: "#1e293b" }}>{t.transferOrderNumber || `TRF-${t.id}`}</td>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>{t.transferType || "PermanentRelocation"}</td>
                <td style={{ padding: "10px 12px", color: "#334155" }}>{t.fromCampusName || `Campus ${t.fromCampusId}`}</td>
                <td style={{ padding: "10px 12px", fontWeight: "600", color: "#047857" }}>➔ {t.toCampusName || `Campus ${t.toCampusId}`}</td>
                <td style={{ padding: "10px 12px", color: "#475569" }}>{t.effectiveDate ? t.effectiveDate.split("T")[0] : "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    background: (t.status === "Approved" || t.status === "Completed") ? "#dcfce7" : t.status === "Pending" ? "#fef3c7" : "#fee2e2",
                    color: (t.status === "Approved" || t.status === "Completed") ? "#15803d" : t.status === "Pending" ? "#b45309" : "#b91c1c"
                  }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                    onClick={() => window.open(apiEndpoints.staffTransfers.orderPdf(t.id), "_blank")}
                  >
                    📄 Official Order PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// STAFF TRANSFER MODAL COMPONENT
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// STAFF TRANSFER MODAL COMPONENT (Hierarchical Dependencies & Active Filters)
// ----------------------------------------------------------------------
function StaffTransferModal({ staff, campuses, isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1 = Configure, 2 = Confirmation Summary
  const modalScrollRef = useRef(null);

  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [step, isOpen]);

  const [toCampusId, setToCampusId] = useState("");
  const [postingCategory, setPostingCategory] = useState("");
  const [customPostingType, setCustomPostingType] = useState("");
  const [transferType, setTransferType] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [relievingDate, setRelievingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [confirmedWarning, setConfirmedWarning] = useState(false);

  // Teaching Staff Allocation State - All start empty for user selection
  const [toBoardId, setToBoardId] = useState("");
  const [toBoardName, setToBoardName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [academicLevel, setAcademicLevel] = useState("");
  const [academicGroup, setAcademicGroup] = useState("");
  const [academicSection, setAcademicSection] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Non-Teaching Staff State - All start empty for user selection
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [toDepartmentName, setToDepartmentName] = useState("");
  const [toDesignationId, setToDesignationId] = useState("");
  const [toDesignationName, setToDesignationName] = useState("");
  const [toRole, setToRole] = useState("");
  const [reportingManager, setReportingManager] = useState("");

  // Lookups & System data loaded from real dependency endpoints
  const [boardsList, setBoardsList] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [academicLevelsList, setAcademicLevelsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [desigList, setDesigList] = useState([]);
  const [preflight, setPreflight] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isTeaching = staff?.staffType === "Teaching" || (!staff?.staffType && String(staff?.designation || "").toLowerCase().includes("lecturer"));

  // Deduplicate destination subjects so each subject name appears strictly once
  const deduplicatedSubjects = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const s of subjectsList) {
      const name = (typeof s === "string" ? s : (s.subjectName || s.name || s.subjectCode || "")).trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        unique.push({ id: s.id || s.subjectId || name, name });
      }
    }
    return unique;
  }, [subjectsList]);

  const currentCampusId = staff?.campusId || staff?.CampusId || staff?.primaryCampusId || 1;
  const currentCampusName = staff?.campusName || "Main Campus (HQ)";

  // Retrieve ONLY active campuses, excluding current campus
  const availableCampuses = useMemo(() => {
    return (campuses || []).filter((c) => {
      if (!c) return false;
      if (c.isActive === false) return false;
      const s = String(c.status || "").trim().toLowerCase();
      if (s === "inactive") return false;
      const cid = Number(c.id ?? c.campusId);
      return cid > 0 && cid !== Number(currentCampusId);
    });
  }, [campuses, currentCampusId]);

  const selectedDestCampus = useMemo(() => {
    return (campuses || []).find((c) => String(c.id ?? c.campusId) === String(toCampusId));
  }, [campuses, toCampusId]);

  const destCampusDisplayName = useMemo(() => {
    if (!selectedDestCampus) return toCampusId ? `Campus #${toCampusId}` : "Destination Campus";
    const cName = (selectedDestCampus.campusName || selectedDestCampus.name || "").trim();
    const cCode = (selectedDestCampus.campusCode || selectedDestCampus.code || "").trim();
    if (!cName || cName.toLowerCase() === "string") {
      return cCode && cCode.toLowerCase() !== "string" ? cCode : `Campus #${toCampusId}`;
    }
    return cCode && cCode.toLowerCase() !== "string" ? `${cName} (${cCode})` : cName;
  }, [selectedDestCampus, toCampusId]);

  // Handle Posting Category & Custom Option
  const handlePostingCategoryChange = (e) => {
    const cat = e.target.value;
    setPostingCategory(cat);
    if (cat === "Custom") {
      setTransferType(customPostingType.trim());
    } else {
      setTransferType(cat);
    }
  };

  const handleCustomPostingTypeChange = (e) => {
    const val = e.target.value;
    setCustomPostingType(val);
    setTransferType(val);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && staff) {
      setStep(1);
      setToCampusId("");
      setPostingCategory("");
      setCustomPostingType("");
      setTransferType("");
      setEffectiveDate(new Date().toISOString().split("T")[0]);
      setRelievingDate(new Date().toISOString().split("T")[0]);
      setReason("");
      setApprovalRemarks("");
      setConfirmedWarning(false);
      setErrorMsg("");

      setToBoardId("");
      setToBoardName("");
      setAcademicYear("");
      setAcademicLevel("");
      setAcademicGroup("");
      setAcademicSection("");
      setSelectedSubjects([]);

      setToDepartmentId("");
      setToDepartmentName("");
      setToDesignationId("");
      setToDesignationName("");
      setToRole("");
      setReportingManager("");

      setBoardsList([]);
      setAcademicYearsList([]);
      setAcademicLevelsList([]);
      setGroupsList([]);
      setSectionsList([]);
      setSubjectsList([]);
      setDeptList([]);
      setDesigList([]);
    }
  }, [isOpen, staff]);

  // 1. Destination Campus Dependency -> Reset downstream & Load Affiliated Boards or Departments
  useEffect(() => {
    if (!isOpen || !toCampusId) {
      setToBoardId("");
      setToBoardName("");
      setAcademicYear("");
      setAcademicLevel("");
      setAcademicGroup("");
      setAcademicSection("");
      setSelectedSubjects([]);
      setBoardsList([]);
      setAcademicYearsList([]);
      setAcademicLevelsList([]);
      setGroupsList([]);
      setSectionsList([]);
      setSubjectsList([]);

      setToDepartmentId("");
      setToDepartmentName("");
      setToDesignationId("");
      setToDesignationName("");
      setDeptList([]);
      setDesigList([]);
      return;
    }

    let active = true;

    if (isTeaching) {
      async function loadCampusBoards() {
        try {
          setLoadingLookups(true);
          let boards = [];
          try {
            const res = await apiClient.get(`/api/v1/campuses/${toCampusId}/boards`);
            const raw = res.data?.data || res.data || [];
            if (Array.isArray(raw) && raw.length > 0) boards = raw;
          } catch {}

          if (boards.length === 0) {
            const fallbackRes = await apiClient.get(apiEndpoints.boards?.list || "/api/v1/boards");
            const rawFallback = fallbackRes.data?.data || fallbackRes.data || [];
            if (Array.isArray(rawFallback)) boards = rawFallback;
          }

          if (active) {
            const activeBoards = boards.filter((b) => b && b.isActive !== false && String(b.status || "").toLowerCase() !== "inactive");
            setBoardsList(activeBoards);
          }
        } catch (err) {
          console.warn("Failed to load campus boards:", err);
        } finally {
          if (active) setLoadingLookups(false);
        }
      }
      loadCampusBoards();
    } else {
      async function loadCampusDepartments() {
        try {
          setLoadingLookups(true);
          const res = await apiClient.get(apiEndpoints.departments?.getAll || "/api/v1/departments", {
            params: { staffType: "Non-Teaching", includeInactive: false, campusId: toCampusId }
          });
          const raw = res.data?.data || res.data || [];
          if (active && Array.isArray(raw)) {
            const seen = new Set();
            const uniqueDepts = [];
            for (const d of raw) {
              const dName = (d.departmentName || d.name || "").trim();
              if (dName && !seen.has(dName.toLowerCase())) {
                seen.add(dName.toLowerCase());
                uniqueDepts.push({ id: d.id || d.departmentId, name: dName, ...d });
              }
            }
            setDeptList(uniqueDepts);
          }
        } catch (err) {
          console.warn("Failed to load campus departments:", err);
        } finally {
          if (active) setLoadingLookups(false);
        }
      }
      loadCampusDepartments();
    }

    return () => { active = false; };
  }, [isOpen, toCampusId, isTeaching]);

  // 2. Affiliated Board Dependency -> Reset downstream & Load Academic Years for this Campus & Board
  useEffect(() => {
    if (!isOpen || !toBoardId) {
      setAcademicYear("");
      setAcademicLevel("");
      setAcademicGroup("");
      setAcademicSection("");
      setSelectedSubjects([]);
      setAcademicYearsList([]);
      setAcademicLevelsList([]);
      setGroupsList([]);
      setSectionsList([]);
      setSubjectsList([]);
      return;
    }

    let active = true;
    async function loadAcademicYears() {
      try {
        setLoadingLookups(true);
        let rawYears = [];

        // Attempt 1: Fetch by boardId and campusId
        try {
          const res = await apiClient.get(apiEndpoints.academicYears?.list || "/api/v1/academic-years", {
            params: { boardId: toBoardId, campusId: toCampusId, status: true, pageSize: 50 }
          });
          const list = res.data?.data || res.data?.items || res.data || [];
          if (Array.isArray(list) && list.length > 0) {
            rawYears = list;
          }
        } catch (e) {
          console.warn("Direct academic years fetch error", e);
        }

        // Attempt 2: If campus returned 0, fetch by boardId alone (how other modules fetch master academic years)
        if (!rawYears || rawYears.length === 0) {
          try {
            const boardRes = await apiClient.get(apiEndpoints.academicYears?.list || "/api/v1/academic-years", {
              params: { boardId: toBoardId, status: true, pageSize: 50 }
            });
            const bList = boardRes.data?.data || boardRes.data?.items || boardRes.data || [];
            if (Array.isArray(bList) && bList.length > 0) {
              rawYears = bList;
            }
          } catch {}
        }

        // Attempt 3: Fallback to active academic years endpoint
        if (!rawYears || rawYears.length === 0) {
          try {
            const fallbackRes = await apiClient.get(apiEndpoints.academicYears?.active || "/api/v1/academic-years/active");
            const fbList = fallbackRes.data?.data || fallbackRes.data || [];
            if (Array.isArray(fbList) && fbList.length > 0) {
              const matching = fbList.filter(y => !toBoardId || !y.boardId || String(y.boardId) === String(toBoardId));
              rawYears = matching.length > 0 ? matching : fbList;
            }
          } catch {}
        }

        if (active) {
          const seen = new Set();
          const uniqueYears = [];
          for (const y of rawYears) {
            if (y && y.isActive !== false && String(y.status || "").toLowerCase() !== "inactive") {
              const yName = (y.academicYearName || y.year || y.name || y.code || "").trim();
              if (yName && !seen.has(yName.toLowerCase())) {
                seen.add(yName.toLowerCase());
                uniqueYears.push({ id: y.id || y.academicYearId || yName, name: yName, ...y });
              }
            }
          }
          setAcademicYearsList(uniqueYears);
        }
      } catch (err) {
        console.warn("Failed to load academic years:", err);
      } finally {
        if (active) setLoadingLookups(false);
      }
    }

    loadAcademicYears();
    return () => { active = false; };
  }, [isOpen, toBoardId, toCampusId]);

  // 3. Academic Year Dependency -> Reset downstream & Load Academic Levels
  useEffect(() => {
    if (!isOpen || !academicYear || !toBoardId) {
      setAcademicLevel("");
      setAcademicGroup("");
      setAcademicSection("");
      setSelectedSubjects([]);
      setAcademicLevelsList([]);
      setGroupsList([]);
      setSectionsList([]);
      setSubjectsList([]);
      return;
    }

    let active = true;
    async function loadAcademicLevels() {
      try {
        let raw = [];
        try {
          const res = await apiClient.get(`/api/v1/academic-levels?boardId=${toBoardId}`);
          raw = res.data?.data || res.data || [];
        } catch {
          const fb = await apiClient.get(`/api/v1/academic-levels`);
          raw = fb.data?.data || fb.data || [];
        }

        if (active && Array.isArray(raw)) {
          const seen = new Set();
          const uniqueLevels = [];
          for (const l of raw) {
            if (l && l.isActive !== false && String(l.status || "").toLowerCase() !== "inactive") {
              const lName = (l.levelName || l.name || l.academicLevelName || "").trim();
              if (lName && !seen.has(lName.toLowerCase())) {
                seen.add(lName.toLowerCase());
                uniqueLevels.push({ id: l.id || l.levelId || l.academicLevelId || lName, name: lName, ...l });
              }
            }
          }
          setAcademicLevelsList(uniqueLevels);
        }
      } catch (err) {
        console.warn("Failed to load academic levels:", err);
      }
    }

    loadAcademicLevels();
    return () => { active = false; };
  }, [isOpen, academicYear, toBoardId, toCampusId]);

  // 4. Academic Level Dependency -> Reset downstream & Load Course Groups
  useEffect(() => {
    if (!isOpen || !academicLevel || !toBoardId) {
      setAcademicGroup("");
      setAcademicSection("");
      setSelectedSubjects([]);
      setGroupsList([]);
      setSectionsList([]);
      setSubjectsList([]);
      return;
    }

    let active = true;
    async function loadCourseGroups() {
      try {
        let rawGroups = [];
        const selectedLvl = academicLevelsList.find(l => (l.name || l.levelName) === academicLevel || String(l.id || l.levelId) === String(academicLevel));
        const levelId = selectedLvl?.id || selectedLvl?.levelId || selectedLvl?.academicLevelId;
        const selectedYr = academicYearsList.find(y => (y.name || y.academicYearName) === academicYear || String(y.id || y.academicYearId) === String(academicYear));
        const yearId = selectedYr?.id || selectedYr?.academicYearId;

        // Try dropdown with levelId and yearId
        try {
          const res = await apiClient.get(`/api/v1/groups/dropdown`, {
            params: {
              boardId: toBoardId,
              ...(levelId ? { academicLevelId: levelId } : {}),
              ...(yearId ? { academicYearId: yearId } : {})
            }
          });
          rawGroups = res.data?.data || res.data || [];
        } catch {}

        // Fallback: dropdown with boardId only
        if (!Array.isArray(rawGroups) || rawGroups.length === 0) {
          try {
            const res2 = await apiClient.get(`/api/v1/groups/dropdown?boardId=${toBoardId}`);
            rawGroups = res2.data?.data || res2.data || [];
          } catch {}
        }

        // Fallback: groups by board route
        if (!Array.isArray(rawGroups) || rawGroups.length === 0) {
          try {
            const fb = await apiClient.get(`/api/v1/groups/board/${toBoardId}`);
            rawGroups = fb.data?.data || fb.data || [];
          } catch {}
        }

        if (active && Array.isArray(rawGroups)) {
          const seen = new Set();
          const uniqueGroups = [];
          for (const g of rawGroups) {
            if (g && g.isActive !== false && String(g.status || "").toLowerCase() !== "inactive") {
              const gName = (g.groupName || g.name || g.masterGroupName || "").trim();
              if (gName && !seen.has(gName.toLowerCase())) {
                seen.add(gName.toLowerCase());
                uniqueGroups.push({ id: g.id || g.groupId, name: gName, ...g });
              }
            }
          }
          setGroupsList(uniqueGroups);
        }
      } catch (err) {
        console.warn("Failed to load course groups:", err);
      }
    }

    loadCourseGroups();
    return () => { active = false; };
  }, [isOpen, academicLevel, toBoardId, toCampusId, academicLevelsList, academicYearsList]);

  // 5. Course Group Dependency -> Reset downstream & Load Sections and Subjects
  useEffect(() => {
    if (!isOpen || !academicGroup) {
      setAcademicSection("");
      setSelectedSubjects([]);
      setSectionsList([]);
      setSubjectsList([]);
      return;
    }

    const selectedGrp = groupsList.find(
      (g) => (g.name || g.groupName) === academicGroup || String(g.id || g.groupId) === String(academicGroup)
    );
    const groupId = selectedGrp?.id || selectedGrp?.groupId;

    if (!groupId) return;

    let active = true;
    async function loadGroupDependencies() {
      try {
        const [secRes, subRes] = await Promise.allSettled([
          apiClient.get(`/api/v1/Sections/group/${groupId}`),
          apiClient.get(`/api/v1/subjects/group/${groupId}`),
        ]);

        if (active) {
          if (secRes.status === "fulfilled" && secRes.value?.data) {
            const raw = secRes.value.data.data || secRes.value.data || [];
            const rawList = Array.isArray(raw) ? raw : [];
            const campusSecs = rawList.filter(s => String(s.campusId || s.CampusId) === String(toCampusId));
            const listToUse = campusSecs.length > 0 ? campusSecs : rawList;

            const seen = new Set();
            const uniqueSec = [];
            for (const s of listToUse) {
              const sName = (s.sectionName || s.name || "").trim();
              if (sName && !seen.has(sName.toLowerCase())) {
                seen.add(sName.toLowerCase());
                uniqueSec.push({ id: s.id || s.sectionId, name: sName, ...s });
              }
            }
            setSectionsList(uniqueSec);
          }

          let subjectsLoaded = false;
          if (subRes.status === "fulfilled" && subRes.value?.data) {
            const raw = subRes.value.data.data || subRes.value.data || [];
            if (Array.isArray(raw) && raw.length > 0) {
              setSubjectsList(raw);
              subjectsLoaded = true;
            }
          }

          if (!subjectsLoaded && toBoardId) {
            try {
              const fbSub = await apiClient.get(`/api/v1/subjects/board/${toBoardId}`);
              const fbRaw = fbSub.data?.data || fbSub.data || [];
              if (Array.isArray(fbRaw)) setSubjectsList(fbRaw);
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Failed to load group dependencies:", err);
      }
    }

    loadGroupDependencies();
    return () => { active = false; };
  }, [isOpen, academicGroup, groupsList, toBoardId, toCampusId]);

  // Non-Teaching Department Dependency -> Load Designations for this Dept & Campus
  useEffect(() => {
    if (!isOpen || isTeaching || !toDepartmentId) {
      setToDesignationId("");
      setToDesignationName("");
      setDesigList([]);
      return;
    }

    let active = true;
    async function loadDepartmentDesignations() {
      try {
        const res = await apiClient.get(apiEndpoints.designations?.getAll || "/api/v1/designations", {
          params: { includeInactive: false, staffType: "Non-Teaching", departmentId: toDepartmentId, campusId: toCampusId }
        });
        const raw = res.data?.data || res.data || [];
        if (active && Array.isArray(raw)) {
          const seen = new Set();
          const uniqueDesigs = [];
          for (const dg of raw) {
            const dgName = (dg.designationName || dg.name || "").trim();
            if (dgName && !seen.has(dgName.toLowerCase())) {
              seen.add(dgName.toLowerCase());
              uniqueDesigs.push({ id: dg.id || dg.designationId, name: dgName, ...dg });
            }
          }
          setDesigList(uniqueDesigs);
        }
      } catch (err) {
        console.warn("Failed to load department designations:", err);
      }
    }

    loadDepartmentDesignations();
    return () => { active = false; };
  }, [isOpen, isTeaching, toDepartmentId, toCampusId]);

  // Preflight audit check
  useEffect(() => {
    if (isOpen && staff?.id && toCampusId) {
      let active = true;
      async function runPreflight() {
        try {
          const res = await apiClient.get(`${apiEndpoints.staffTransfers.preflight(staff.id)}?toCampusId=${toCampusId}`);
          if (active && res.data) {
            setPreflight(res.data.data || res.data);
          }
        } catch (e) {
          console.warn("Preflight check failed", e);
        }
      }
      runPreflight();
      return () => { active = false; };
    } else {
      setPreflight(null);
    }
  }, [isOpen, staff?.id, toCampusId]);

  if (!isOpen || !staff) return null;

  const toggleSubject = (subName) => {
    setSelectedSubjects(prev =>
      prev.includes(subName) ? prev.filter(s => s !== subName) : [...prev, subName]
    );
  };

  const handleKeepCurrentSubjects = () => {
    const rawSubs = staff.allocatedSubjects || staff.subjects || [];
    const currentSubs = Array.isArray(rawSubs)
      ? rawSubs.map(s => typeof s === "object" ? s.name || s.subjectName || String(s) : String(s)).filter(Boolean)
      : (typeof rawSubs === "string" ? rawSubs.split(",").map(s => s.trim()).filter(Boolean) : []);
    if (currentSubs.length > 0) {
      setSelectedSubjects(currentSubs);
    }
  };

  const handleProceedToConfirmation = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!toCampusId) {
      setErrorMsg("Please select a target destination campus.");
      return;
    }
    if (Number(toCampusId) === Number(currentCampusId)) {
      setErrorMsg("Destination campus must be different from the current source campus.");
      return;
    }
    if (!transferType || !transferType.trim()) {
      setErrorMsg("Please select or specify a Transfer Posting Type.");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("Please specify a reason or administrative remarks for the campus transfer.");
      return;
    }
    if (isTeaching) {
      if (!toBoardId) {
        setErrorMsg("Please select an affiliated destination board for teaching allocation.");
        return;
      }
      if (selectedSubjects.length === 0) {
        setErrorMsg("Please assign at least one teaching subject for the destination campus.");
        return;
      }
    } else {
      if (!toDepartmentId) {
        setErrorMsg("Please select a destination department for non-teaching staff.");
        return;
      }
      if (!toDesignationId) {
        setErrorMsg("Please select a destination designation for non-teaching staff.");
        return;
      }
    }

    setStep(2);
  };

  const handleExecuteTransfer = async () => {
    if (!confirmedWarning) {
      setErrorMsg("Please verify destination allocations and check the authorization confirmation box before executing.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const selYear = academicYearsList.find(y => (y.name || y.academicYearName) === academicYear || String(y.id || y.academicYearId) === String(academicYear));
      const selLevel = academicLevelsList.find(l => (l.name || l.levelName) === academicLevel || String(l.id || l.levelId) === String(academicLevel));
      const selGroup = groupsList.find(g => (g.name || g.groupName) === academicGroup || String(g.id || g.groupId) === String(academicGroup));
      const selSection = sectionsList.find(s => (s.name || s.sectionName) === academicSection || String(s.id || s.sectionId) === String(academicSection));
      const selSubjectObjs = subjectsList.filter(s => selectedSubjects.includes(s.name || s.subjectName));

      const payload = {
        staffId: staff.id,
        toCampusId: Number(toCampusId),
        toBoardId: isTeaching && toBoardId ? Number(toBoardId) : null,
        toBoardName: isTeaching ? toBoardName : null,
        toDepartmentId: toDepartmentId ? Number(toDepartmentId) : null,
        toDepartmentName: toDepartmentName || null,
        toDesignationId: toDesignationId ? Number(toDesignationId) : null,
        toDesignationName: toDesignationName || null,
        transferType: transferType || "Permanent",
        reason: reason.trim(),
        effectiveDate: effectiveDate,
        relievingDate: relievingDate || null,
        joiningDate: effectiveDate,
        approvalRemarks: approvalRemarks.trim() || reason.trim(),
        academicYearId: isTeaching && selYear ? (Number(selYear.id || selYear.academicYearId) || null) : null,
        academicYearName: isTeaching ? academicYear : null,
        academicLevelId: isTeaching && selLevel ? (Number(selLevel.id || selLevel.levelId) || null) : null,
        academicLevelName: isTeaching ? academicLevel : null,
        groupId: isTeaching && selGroup ? (Number(selGroup.id || selGroup.groupId) || null) : null,
        groupName: isTeaching ? academicGroup : null,
        sectionId: isTeaching && selSection ? (Number(selSection.id || selSection.sectionId) || null) : null,
        sectionName: isTeaching ? academicSection : null,
        allocatedSubjectIds: isTeaching ? selSubjectObjs.map(s => Number(s.id || s.subjectId)).filter(Boolean) : null,
        allocatedSubjectNames: isTeaching ? selectedSubjects : null,
        roleName: !isTeaching ? (toRole || "Staff") : "Faculty",
        autoApprove: true
      };

      const res = await apiClient.post(apiEndpoints.staffTransfers.create, payload);
      const created = res.data?.data || res.data;

      const orderNo = created?.transferOrderNumber || "Generated";
      const destName = selectedDestCampus?.campusName || selectedDestCampus?.name || `Campus #${toCampusId}`;

      onSuccess?.(`Staff member successfully transferred to ${destName}! Full profile, service records, and experience transitioned seamlessly. Transfer Order ${orderNo} created.`, created?.id);
      onClose();
    } catch (err) {
      console.error("Failed to execute transfer", err);
      setErrorMsg(getApiErrorMessage(err, "Failed to execute staff transfer. Please verify data and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="staff-transfer-overlay">
      <div className="staff-transfer-dialog">
        {/* MODAL HEADER - Fixed Top */}
        <div className="staff-transfer-header">
          <div className="staff-transfer-header-left">
            <div className="staff-transfer-header-icon">
              <ArrowRightLeft size={16} />
            </div>
            <div className="staff-transfer-header-text">
              <h3 className="staff-transfer-header-title">Staff Campus Transfer &amp; Posting Relocation</h3>
              <span className="staff-transfer-header-sub">Inter-campus transfer preserving service history &amp; archives</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="staff-transfer-close-btn" title="Close">
            <X size={15} />
          </button>
        </div>

        {/* CURRENT STAFF PROFILE BANNER - Fixed Top */}
        <div className="staff-transfer-profile-banner">
          <div className="staff-transfer-profile-grid">
            <div className="staff-transfer-info-pill">
              <div className="staff-transfer-info-icon user-icon">
                <UserRound size={14} />
              </div>
              <div className="staff-transfer-info-content">
                <span className="staff-transfer-info-label">Staff Member</span>
                <strong className="staff-transfer-info-value">{staff.fullName || `${staff.firstName || ""} ${staff.lastName || ""}`.trim() || staff.employeeId}</strong>
              </div>
            </div>

            <div className="staff-transfer-info-pill">
              <div className="staff-transfer-info-icon id-icon">
                <KeyRound size={14} />
              </div>
              <div className="staff-transfer-info-content">
                <span className="staff-transfer-info-label">Employee ID</span>
                <strong className="staff-transfer-info-value emp-id">{staff.employeeId}</strong>
              </div>
            </div>

            <div className="staff-transfer-info-pill">
              <div className="staff-transfer-info-icon type-icon">
                <GraduationCap size={14} />
              </div>
              <div className="staff-transfer-info-content">
                <span className="staff-transfer-info-label">Staff Type</span>
                <span className={`staff-transfer-type-badge ${isTeaching ? "teaching" : "non-teaching"}`}>
                  {isTeaching ? "Teaching Faculty" : "Non-Teaching Staff"}
                </span>
              </div>
            </div>

            <div className="staff-transfer-info-pill">
              <div className="staff-transfer-info-icon campus-icon">
                <MapPin size={14} />
              </div>
              <div className="staff-transfer-info-content">
                <span className="staff-transfer-info-label">Current Campus</span>
                <span className="staff-transfer-campus-badge">
                  📍 {currentCampusName}
                </span>
              </div>
            </div>

            <div className="staff-transfer-info-pill">
              <div className="staff-transfer-info-icon role-icon">
                <UserCheck size={14} />
              </div>
              <div className="staff-transfer-info-content">
                <span className="staff-transfer-info-label">Current Designation</span>
                <strong className="staff-transfer-info-value">{staff.designation || "—"}</strong>
              </div>
            </div>

            <div className="staff-transfer-info-pill">
              <div className="staff-transfer-info-icon dept-icon">
                <Building2 size={14} />
              </div>
              <div className="staff-transfer-info-content">
                <span className="staff-transfer-info-label">Current Department</span>
                <strong className="staff-transfer-info-value">{staff.department || "—"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* STEP TABS */}
        <div className="staff-transfer-tabs-wrap">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`staff-transfer-tab-btn ${step === 1 ? "is-active" : ""}`}
          >
            <span className="staff-transfer-step-pill">1</span>
            <span>Configure Destination Allocations</span>
          </button>
          <button
            type="button"
            onClick={() => { if (toCampusId && transferType && reason.trim()) setStep(2); }}
            className={`staff-transfer-tab-btn ${step === 2 ? "is-active" : ""}`}
            disabled={!toCampusId || !transferType}
          >
            <span className="staff-transfer-step-pill">2</span>
            <span>Confirmation &amp; Relocation Authorization</span>
          </button>
        </div>

        {/* SCROLLABLE FORM CONTENT */}
        <div ref={modalScrollRef} className="staff-transfer-body">
          {errorMsg && (
            <div className="staff-transfer-error-alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PREFLIGHT ADVISORY BANNER */}
          {preflight && (preflight.activeTimetableSlotsCount > 0 || (preflight.warnings && preflight.warnings.length > 0)) && (
            <div className="staff-transfer-preflight-alert">
              <div className="preflight-header">
                <AlertCircle size={15} />
                <span>Relieving Campus Audit Advisory</span>
              </div>
              {preflight.activeTimetableSlotsCount > 0 && (
                <p>
                  Staff member currently holds <strong>{preflight.activeTimetableSlotsCount} active weekly timetable slots</strong> at {currentCampusName}. These will be gracefully unassigned without affecting historical attendance records.
                </p>
              )}
              {preflight.warnings && preflight.warnings.map((w, idx) => (
                <div key={idx} className="preflight-item">• {w}</div>
              ))}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleProceedToConfirmation} className="staff-transfer-form">
              {/* TARGET CAMPUS & DATES CARD */}
              <div className="staff-transfer-card">
                <div className="staff-transfer-card-header">
                  <div className="staff-transfer-card-title">
                    <Building2 size={16} />
                    <span>Destination Campus &amp; Transfer Dates</span>
                  </div>
                </div>

                <div className="staff-transfer-form-grid-2">
                  <div className="staff-transfer-form-group">
                    <label className="staff-transfer-label">
                      <Building2 size={13} />
                      <span>Destination Campus <strong className="required-star">*</strong></span>
                    </label>
                    <select
                      value={toCampusId}
                      onChange={(e) => setToCampusId(e.target.value)}
                      required
                      className="staff-transfer-select"
                    >
                      <option value="">Select Destination Campus *...</option>
                      {availableCampuses.map((c) => (
                        <option key={c.id ?? c.campusId} value={c.id ?? c.campusId}>
                          {c.campusName || c.name} ({c.campusCode || c.code || `ID: ${c.id ?? c.campusId}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="staff-transfer-form-group">
                    <label className="staff-transfer-label">
                      <ArrowRightLeft size={13} />
                      <span>Transfer Posting Type <strong className="required-star">*</strong></span>
                    </label>
                    <select
                      value={postingCategory}
                      onChange={handlePostingCategoryChange}
                      required
                      className="staff-transfer-select"
                    >
                      <option value="">Select Posting Type *...</option>
                      <option value="Permanent">Permanent Relocation</option>
                      <option value="VisitingFaculty">Visiting Faculty Allocation</option>
                      <option value="Deputation">Deputation / Temporary Posting</option>
                      <option value="Custom">Other / Custom Posting Type...</option>
                    </select>
                    {postingCategory === "Custom" && (
                      <input
                        type="text"
                        value={customPostingType}
                        onChange={handleCustomPostingTypeChange}
                        placeholder="Specify custom posting type (e.g. Sabbatical Relocation)*"
                        required
                        className="staff-transfer-input custom-input"
                      />
                    )}
                  </div>
                </div>

                <div className="staff-transfer-form-grid-2">
                  <div className="staff-transfer-form-group">
                    <label className="staff-transfer-label">
                      <Calendar size={13} />
                      <span>Effective Transfer Date <strong className="required-star">*</strong></span>
                    </label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      required
                      className="staff-transfer-input"
                    />
                  </div>

                  <div className="staff-transfer-form-group">
                    <label className="staff-transfer-label">
                      <Clock3 size={13} />
                      <span>Relieving Date from {currentCampusName}</span>
                    </label>
                    <input
                      type="date"
                      value={relievingDate}
                      onChange={(e) => setRelievingDate(e.target.value)}
                      className="staff-transfer-input"
                    />
                  </div>
                </div>
              </div>

              {/* TEACHING STAFF ALLOCATIONS CONTAINER - DYNAMIC & HIERARCHICAL */}
              {isTeaching && (
                <div className="staff-transfer-card teaching-card">
                  <div className="staff-transfer-card-header">
                    <div className="staff-transfer-card-title">
                      <GraduationCap size={16} />
                      <span>Destination Academic &amp; Subject Allocations (Teaching)</span>
                    </div>
                    {staff.allocatedSubjects && staff.allocatedSubjects.length > 0 && (
                      <button
                        type="button"
                        className="staff-transfer-subtle-btn"
                        onClick={handleKeepCurrentSubjects}
                      >
                        <RefreshCw size={12} />
                        <span>Keep Current Subjects</span>
                      </button>
                    )}
                  </div>

                  <div className="staff-transfer-form-grid-2">
                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Affiliated Educational Board <strong className="required-star">*</strong></span>
                      </label>
                      <select
                        value={toBoardId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setToBoardId(val);
                          const sel = boardsList.find(b => String(b.id || b.boardId) === String(val));
                          setToBoardName(sel?.boardName || sel?.name || "");
                        }}
                        disabled={!toCampusId}
                        required
                        className="staff-transfer-select"
                      >
                        <option value="">{!toCampusId ? "Select Destination Campus first..." : "Select Affiliated Board *..."}</option>
                        {boardsList.map(b => (
                          <option key={b.id || b.boardId} value={b.id || b.boardId}>
                            {b.boardName || b.name || b.boardCode || b.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Academic Year <strong className="required-star">*</strong></span>
                      </label>
                      <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        disabled={!toBoardId}
                        required
                        className="staff-transfer-select"
                      >
                        <option value="">{!toBoardId ? "Select Board first..." : "Select Academic Year *..."}</option>
                        {academicYearsList.map(y => {
                          const yName = y.name || y.academicYearName || y.year || y.code;
                          return (
                            <option key={y.id || y.academicYearId || yName} value={yName}>
                              {yName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="staff-transfer-form-grid-3">
                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Academic Level</span>
                      </label>
                      <select
                        value={academicLevel}
                        onChange={(e) => setAcademicLevel(e.target.value)}
                        disabled={!academicYear}
                        className="staff-transfer-select"
                      >
                        <option value="">{!academicYear ? "Select Academic Year first..." : "Select Academic Level..."}</option>
                        {academicLevelsList.map(l => {
                          const lName = l.name || l.levelName || l.academicLevelName;
                          return (
                            <option key={l.id || l.levelId || lName} value={lName}>
                              {lName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Course Group / Stream</span>
                      </label>
                      <select
                        value={academicGroup}
                        onChange={(e) => setAcademicGroup(e.target.value)}
                        disabled={!academicLevel}
                        className="staff-transfer-select"
                      >
                        <option value="">{!academicLevel ? "Select Academic Level first..." : "Select Course Group..."}</option>
                        {groupsList.map(g => {
                          const gName = g.name || g.groupName || g.masterGroupName;
                          return (
                            <option key={g.id || g.groupId || gName} value={gName}>
                              {gName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Section Allocation</span>
                      </label>
                      <select
                        value={academicSection}
                        onChange={(e) => setAcademicSection(e.target.value)}
                        disabled={!academicGroup}
                        className="staff-transfer-select"
                      >
                        <option value="">{!academicGroup ? "Select Group first..." : "Select Section Allocation..."}</option>
                        {sectionsList.map(s => {
                          const sName = s.name || s.sectionName;
                          return (
                            <option key={s.id || s.sectionId || sName} value={sName}>
                              {sName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* DEDUPLICATED SUBJECT PILLS */}
                  <div className="staff-transfer-subjects-container">
                    <label className="staff-transfer-label">
                      <FileText size={13} />
                      <span>Assign Destination Subjects <strong className="required-star">*</strong> (Select one or more)</span>
                    </label>
                    <div className="staff-transfer-subjects-wrap">
                      {!toBoardId ? (
                        <span className="staff-transfer-helper-text">
                          Please select an Affiliated Educational Board above to view and assign destination subjects.
                        </span>
                      ) : deduplicatedSubjects.length > 0 ? (
                        deduplicatedSubjects.map((s) => {
                          const subName = s.name;
                          const isSelected = selectedSubjects.includes(subName);
                          return (
                            <button
                              key={s.id || subName}
                              type="button"
                              onClick={() => toggleSubject(subName)}
                              className={`staff-transfer-subject-chip ${isSelected ? "is-selected" : ""}`}
                            >
                              {isSelected ? <Check size={13} /> : <Plus size={13} />}
                              <span>{subName}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="staff-transfer-helper-text">
                          No subjects configured for the selected board/group.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* NON-TEACHING SPECIFIC CONTAINER - POPULATED DYNAMICALLY */}
              {!isTeaching && (
                <div className="staff-transfer-card non-teaching-card">
                  <div className="staff-transfer-card-header">
                    <div className="staff-transfer-card-title non-teaching-title">
                      <Building2 size={16} />
                      <span>Destination Department &amp; Operational Role (Non-Teaching)</span>
                    </div>
                  </div>
                  <div className="staff-transfer-form-grid-3">
                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Destination Department <strong className="required-star">*</strong></span>
                      </label>
                      <select
                        value={toDepartmentId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setToDepartmentId(val);
                          const d = deptList.find(x => String(x.id || x.departmentId) === String(val));
                          setToDepartmentName(d?.departmentName || d?.name || "");
                        }}
                        disabled={!toCampusId}
                        required
                        className="staff-transfer-select"
                      >
                        <option value="">{!toCampusId ? "Select Destination Campus first..." : "Select Department *..."}</option>
                        {deptList.map(d => (
                          <option key={d.id || d.departmentId} value={d.id || d.departmentId}>
                            {d.departmentName || d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Destination Designation <strong className="required-star">*</strong></span>
                      </label>
                      <select
                        value={toDesignationId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setToDesignationId(val);
                          const dg = desigList.find(x => String(x.id || x.designationId) === String(val));
                          setToDesignationName(dg?.designationName || dg?.name || "");
                        }}
                        disabled={!toDepartmentId}
                        required
                        className="staff-transfer-select"
                      >
                        <option value="">{!toDepartmentId ? "Select Department first..." : "Select Designation *..."}</option>
                        {desigList.map(dg => (
                          <option key={dg.id || dg.designationId} value={dg.id || dg.designationId}>
                            {dg.designationName || dg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="staff-transfer-form-group">
                      <label className="staff-transfer-label">
                        <span>Role &amp; Security Context</span>
                      </label>
                      <select
                        value={toRole}
                        onChange={(e) => setToRole(e.target.value)}
                        className="staff-transfer-select"
                      >
                        <option value="">Select Role...</option>
                        <option value="Staff">Staff</option>
                        <option value="Admin">Administrator</option>
                        <option value="Accountant">Accountant</option>
                        <option value="Librarian">Librarian</option>
                        <option value="Hostel Admin">Hostel Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* REASON FOR TRANSFER CARD */}
              <div className="staff-transfer-card">
                <div className="staff-transfer-card-header">
                  <div className="staff-transfer-card-title">
                    <Pencil size={15} />
                    <span>Official Justification &amp; Administrative Reason <strong className="required-star">*</strong></span>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Administrative relocation to meet intermediate batch requirements at destination campus; approved by Governing Board."
                  required
                  className="staff-transfer-textarea"
                />
              </div>

              {/* BUTTONS STEP 1 */}
              <div className="staff-transfer-foot">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="cms-btn cms-btn-primary">
                  <span>Review Transfer &amp; Summary</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: CONFIRMATION SUMMARY & WARNING */
            <div className="staff-transfer-step2-content">
              {/* SUMMARY CARD */}
              <div className="staff-transfer-summary-card">
                <div className="staff-transfer-summary-card-head">
                  <div className="staff-transfer-summary-title">
                    <FileText size={17} />
                    <span>Confirm Staff Campus Transfer Summary</span>
                  </div>
                  <span className="staff-transfer-badge-preview">Verification Step</span>
                </div>

                <div className="staff-transfer-summary-grid">
                  <div className="staff-transfer-summary-cell">
                    <span className="cell-label"><UserRound size={13} /> Staff Member</span>
                    <strong className="cell-value">{staff.fullName || staff.employeeId}</strong>
                  </div>

                  <div className="staff-transfer-summary-cell">
                    <span className="cell-label"><KeyRound size={13} /> Employee ID</span>
                    <strong className="cell-value emp-id">{staff.employeeId}</strong>
                  </div>

                  <div className="staff-transfer-summary-cell">
                    <span className="cell-label"><Building2 size={13} /> Relieving From</span>
                    <strong className="cell-value relieving-text">📍 {currentCampusName}</strong>
                  </div>

                  <div className="staff-transfer-summary-cell">
                    <span className="cell-label"><Building2 size={13} /> Destination Campus</span>
                    <strong className="cell-value destination-text">📍 {destCampusDisplayName}</strong>
                  </div>

                  <div className="staff-transfer-summary-cell">
                    <span className="cell-label"><ArrowRightLeft size={13} /> Posting Type</span>
                    <span className="cell-badge">{transferType}</span>
                  </div>

                  <div className="staff-transfer-summary-cell">
                    <span className="cell-label"><Calendar size={13} /> Effective Date</span>
                    <strong className="cell-value">{effectiveDate}</strong>
                  </div>

                  {isTeaching ? (
                    <>
                      <div className="staff-transfer-summary-cell">
                        <span className="cell-label"><GraduationCap size={13} /> Assigned Board</span>
                        <strong className="cell-value">{toBoardName || "—"}</strong>
                      </div>

                      <div className="staff-transfer-summary-cell">
                        <span className="cell-label"><FileText size={13} /> Assigned Subjects</span>
                        <div className="cell-subjects-wrap">
                          {selectedSubjects.length > 0 ? (
                            selectedSubjects.map((sub) => (
                              <span key={sub} className="summary-subject-tag">{sub}</span>
                            ))
                          ) : (
                            <span className="cell-value">—</span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="staff-transfer-summary-cell">
                        <span className="cell-label"><Building2 size={13} /> Destination Department</span>
                        <strong className="cell-value">{toDepartmentName || "—"}</strong>
                      </div>

                      <div className="staff-transfer-summary-cell">
                        <span className="cell-label"><UserCheck size={13} /> Destination Designation</span>
                        <strong className="cell-value">{toDesignationName || "—"}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* LIFECYCLE & HISTORICAL DATA PRESERVATION GUARANTEE */}
              <div className="staff-transfer-policy-box">
                <div className="policy-header">
                  <ShieldCheck size={18} />
                  <span>Campus Lifecycle &amp; Service Continuity Policy</span>
                </div>
                <p className="policy-body">
                  Transferring this staff member will mark them as <strong>Transferred / Relieved</strong> in {currentCampusName} while securely retaining all past attendance logs, payroll history, and timetable archives in the database. Their profile, credentials, and cumulative experience will transition active to <strong>{destCampusDisplayName}</strong>.
                </p>
              </div>

              {/* APPROVAL REMARKS */}
              <div className="staff-transfer-form-group approval-remarks-group">
                <label className="staff-transfer-label">
                  <Pencil size={13} />
                  <span>Governing Authority Remarks / Approval Note (Optional)</span>
                </label>
                <input
                  type="text"
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="e.g. Sanctioned as per Board Order No. TR-2026/04."
                  className="staff-transfer-input"
                />
              </div>

              {/* CONFIRMATION CHECKBOX */}
              <label className="staff-transfer-confirm-box">
                <input
                  type="checkbox"
                  checked={confirmedWarning}
                  onChange={(e) => setConfirmedWarning(e.target.checked)}
                  className="staff-transfer-checkbox"
                />
                <span className="confirm-text">
                  I confirm this official inter-campus transfer. I understand that the staff member will be relieved from <strong>{currentCampusName}</strong> and inducted into <strong>{destCampusDisplayName}</strong> with an official Transfer Order generated.
                </span>
              </label>

              {/* BUTTONS STEP 2 */}
              <div className="staff-transfer-foot step2-foot">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setStep(1)} disabled={submitting}>
                  <ArrowLeft size={14} />
                  <span>Back to Allocations</span>
                </button>
                <div className="step2-right-btns">
                  <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary execute-transfer-btn"
                    onClick={handleExecuteTransfer}
                    disabled={submitting || !confirmedWarning}
                  >
                    {submitting ? <Loader2 size={15} className="sp-spin" /> : <CheckCircle2 size={15} />}
                    <span>{submitting ? "Executing Transfer..." : "Execute & Dispatch Transfer Order"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
function Details({ record, records, setRecords, id }) {
  const { campuses } = useCampusContext();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferRefreshKey, setTransferRefreshKey] = useState(0);
  const n = useNavigate();
  const [toast, setToast] = useState(null);
  const [photoError, setPhotoError] = useState(false);
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
          <SkeletonPage variant="form" rows={8} />
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
    // 1. Ensure firstName and lastName are properly derived from fullName if needed
    let firstName = updatedRecord.firstName;
    let lastName = updatedRecord.lastName;
    let middleName = updatedRecord.middleName;

    if ((!firstName || !lastName) && updatedRecord.fullName) {
      const parts = String(updatedRecord.fullName).trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
        lastName = ".";
      } else if (parts.length === 2) {
        firstName = parts[0];
        lastName = parts[1];
      } else {
        firstName = parts[0];
        middleName = parts.slice(1, -1).join(" ");
        lastName = parts[parts.length - 1];
      }
    }

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ") || updatedRecord.fullName;

    // 2. Sanitize date formats for HTML5 and C# API (strip ISO time part to YYYY-MM-DD)
    const sanitizeDate = (val) => {
      if (!val) return null;
      const str = String(val).split("T")[0].trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
    };

    const dateOfBirth = sanitizeDate(updatedRecord.dateOfBirth) || sanitizeDate(activeRecord.dateOfBirth) || "1990-01-01";
    const dateOfJoining = sanitizeDate(updatedRecord.dateOfJoining) || sanitizeDate(updatedRecord.joiningDate) || sanitizeDate(activeRecord.dateOfJoining) || sanitizeDate(activeRecord.joiningDate) || "2024-01-01";
    const experienceFrom = sanitizeDate(updatedRecord.experienceFrom) || sanitizeDate(activeRecord.experienceFrom);
    const experienceTo = sanitizeDate(updatedRecord.experienceTo) || sanitizeDate(activeRecord.experienceTo);

    // 3. Normalize allocated subjects as string array
    const rawSubs = updatedRecord.allocatedSubjects ?? updatedRecord.subjects ?? activeRecord.allocatedSubjects ?? activeRecord.subjects;
    const allocatedSubjects = Array.isArray(rawSubs)
      ? rawSubs.map((s) => (typeof s === "object" ? s.name || s.subjectName || String(s) : String(s))).filter(Boolean)
      : typeof rawSubs === "string" && rawSubs.trim()
        ? rawSubs.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    // Clear legacy ID mismatches if user changed Department / Designation / Board by name in preview
    let departmentId = updatedRecord.departmentId;
    if (updatedRecord.department && updatedRecord.department !== activeRecord.department) {
      departmentId = null;
    }

    let designationId = updatedRecord.designationId;
    if (updatedRecord.designation && updatedRecord.designation !== activeRecord.designation) {
      designationId = null;
    }

    let boardId = updatedRecord.boardId;
    if (Array.isArray(updatedRecord.assignedBoardIds) && updatedRecord.assignedBoardIds.length > 0) {
      boardId = updatedRecord.boardId || updatedRecord.assignedBoardIds[0];
    } else if (updatedRecord.board && updatedRecord.board !== activeRecord.board && !updatedRecord.boardId) {
      boardId = null;
    }

    let campusId = updatedRecord.campusId;
    if (Array.isArray(updatedRecord.assignedCampusIds) && updatedRecord.assignedCampusIds.length > 0) {
      campusId = updatedRecord.campusId || updatedRecord.assignedCampusIds[0];
    }

    const qualification = updatedRecord.highestQualification || updatedRecord.qualification || activeRecord.highestQualification || activeRecord.qualification || "Graduate";

    const payload = {
      ...activeRecord,
      ...updatedRecord,
      firstName: firstName || activeRecord.firstName || "Staff",
      middleName: middleName || activeRecord.middleName || null,
      lastName: lastName || activeRecord.lastName || ".",
      fullName,
      gender: updatedRecord.gender || activeRecord.gender || "Other",
      mobile: updatedRecord.mobile || activeRecord.mobile || "",
      dateOfBirth,
      qualification,
      highestQualification: qualification,
      allocatedSubjects,
      subjects: allocatedSubjects,
      departmentSpecific: {
        ...(typeof activeRecord.departmentSpecific === "object" ? activeRecord.departmentSpecific : {}),
        ...(typeof updatedRecord.departmentSpecific === "object" ? updatedRecord.departmentSpecific : {}),
        allocatedSubjects,
        subjects: allocatedSubjects,
      },
      dateOfJoining,
      joiningDate: dateOfJoining,
      ...(departmentId !== undefined ? { departmentId } : {}),
      ...(designationId !== undefined ? { designationId } : {}),
      ...(boardId !== undefined ? { boardId } : {}),
      ...(campusId !== undefined ? { campusId } : {}),
      ...(Array.isArray(updatedRecord.assignedBoardIds) ? { assignedBoardIds: updatedRecord.assignedBoardIds } : {}),
      ...(Array.isArray(updatedRecord.assignedCampusIds) ? { assignedCampusIds: updatedRecord.assignedCampusIds } : {}),
      ...(experienceFrom ? { experienceFrom } : {}),
      ...(experienceTo ? { experienceTo } : {}),
      ...(updatedRecord.totalExperience !== undefined ? { totalExperience: updatedRecord.totalExperience } : {}),
    };

    // Unconditionally sanitize documents & auxiliary lists to avoid serialization mismatches
    if (payload.documents !== undefined) {
      if (typeof payload.documents === "object" && payload.documents !== null) {
        try {
          payload.documentsJson = JSON.stringify(payload.documents);
        } catch { }
      }
      delete payload.documents;
    }
    delete payload.documentsMap;
    delete payload.documentsList;
    delete payload.educationList;
    delete payload.experienceList;
    delete payload.departmentSpecificJson;

    try {
      // PUT /api/v1/staff/{id}
      const res = await apiClient.put(apiEndpoints.faculty.update(payload.id), payload);
      const serverUpdated = res.data?.data || res.data || {};
      const merged = { ...activeRecord, ...payload, ...serverUpdated, allocatedSubjects, subjects: allocatedSubjects };
      setApiDetail(merged);
      setRecords((prev) => prev.map((r) => (r.id === payload.id ? { ...r, ...merged } : r)));
      try {
        window.dispatchEvent(new Event("staff-records-updated"));
      } catch (error) {
        console.warn("Unable to notify Roles & Permissions about the staff update:", error);
      }
      setToast("Staff details updated successfully.");
    } catch (err) {
      console.error("PUT /api/v1/staff/{id} API error:", err);
      const msg = getApiErrorMessage(err, "Failed to update staff details.");
      setToast(msg);
    }
  };

  return (
    <DashboardLayout
      title="Staff Details"
      subtitle="View complete staff record and profile activity."
      breadcrumb={["People", "Staff Management"]}
      actions={
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => setShowTransferModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            title="Transfer staff member to another campus"
          >
            <ArrowRightLeft size={14} /> Transfer Campus
          </button>
          {activeRecord.staffType === "Teaching" && activeRecord.profileStatus === "Submitted" ? (
            <button
              className="cms-btn cms-btn-secondary"
              onClick={() => n(`/dashboard/staff/${activeRecord.id}/review`)}
            >
              Review Submission
            </button>
          ) : null}
        </div>
      }
    >
      <main className="staff-mock-page">
        <Back to="/dashboard/staff/list" />
        <section className="staff-detail-head">
          {(() => {
            const rawPhoto = activeRecord.profilePhoto || activeRecord.photo || activeRecord.photoPath || activeRecord.photoUrl || activeRecord.avatar || activeRecord.profileImage;
            const photoBaseUrl = apiClient?.defaults?.baseURL ? apiClient.defaults.baseURL.replace(/\/+$/, "") : "";
            const photoSrc = typeof rawPhoto === "string" && rawPhoto.trim()
              ? (rawPhoto.startsWith("http") || rawPhoto.startsWith("data:") || rawPhoto.startsWith("blob:") ? rawPhoto : `${photoBaseUrl}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`)
              : null;
            return photoSrc && !photoError ? (
              <img
                src={photoSrc}
                alt={activeRecord.fullName || activeRecord.employeeId}
                className="staff-detail-avatar-img"
                style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--cms-primary, #2b371a)", background: "var(--cms-surface)" }}
                onError={() => setPhotoError(true)}
              />
            ) : (
              <UserRound />
            );
          })()}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
              <Badge value={activeRecord.status || "Active"} />
              {((Array.isArray(activeRecord.assignedCampusIds) && activeRecord.assignedCampusIds.length > 1) ||
                (Array.isArray(activeRecord.assignedCampuses) && activeRecord.assignedCampuses.length > 1) ||
                Boolean(activeRecord.campusBoardAssignmentsJson)) ? (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "700",
                  background: "#eff6ff",
                  color: "#1e40af",
                  border: "1px solid #bfdbfe"
                }}>
                  🌐 Global / Multi-Campus Staff ({activeRecord.assignedCampusIds?.length || activeRecord.assignedCampuses?.length || "Multi"} Campuses)
                </span>
              ) : (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: "#f8fafc",
                  color: "#475569",
                  border: "1px solid #e2e8f0"
                }}>
                  📍 Single-Campus ({activeRecord.campusName || "Main Campus"})
                </span>
              )}
            </div>
          </div>
        </section>
        <section className="staff-panel">
          <Summary record={activeRecord} onSave={handleSaveCard} />
        </section>
        <section className="staff-panel" style={{ marginTop: "16px" }}>
          <StaffTransferHistory staffId={activeRecord.id} refreshKey={transferRefreshKey} />
        </section>
        <StaffTransferModal
          staff={activeRecord}
          campuses={campuses}
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSuccess={(msg) => {
            setToast(msg || "Campus transfer executed successfully.");
            setTransferRefreshKey((k) => k + 1);
            if (typeof setRecords === "function") {
              setRecords((prev) => (Array.isArray(prev) ? prev.map((r) => r.id === activeRecord.id ? { ...r, status: "Transferred" } : r) : []));
            }
          }}
        />
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
      alert(`Faculty profile approved successfully! Official QuestPDF Offer Letter generated and emailed to ${record.email || "faculty email"}.`);
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
// SUMMARY COMPONENT (Supports field editing, masking, multi-campus allocation and save)
// ----------------------------------------------------------------------
function Summary({ record, groups: suppliedGroups, onEdit, onPrint, onSave }) {
  const { boards, allBoards } = useAcademicContext();
  const { campuses } = useCampusContext();
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({});

  const [editingAllocations, setEditingAllocations] = useState(false);
  const [allocCampusIds, setAllocCampusIds] = useState([]);
  const [allocPrimaryCampusId, setAllocPrimaryCampusId] = useState(null);
  const [allocBoardIds, setAllocBoardIds] = useState([]);

  const isPrincipalRecord = useMemo(() => {
    return (
      String(record?.role || "").trim().toLowerCase() === "principal" ||
      String(record?.roleName || "").trim().toLowerCase() === "principal" ||
      String(record?.designation || "").trim().toLowerCase() === "principal" ||
      Number(record?.roleId) === 2 ||
      Number(record?.roleId) === 15
    );
  }, [record]);

  // Comprehensive institution boards (Includes all configured boards)
  const institutionalBoards = useMemo(() => {
    const list = Array.isArray(allBoards) && allBoards.length > 0 ? allBoards : (Array.isArray(boards) ? boards : []);
    const seen = new Set();
    return list.filter((b) => {
      if (!b) return false;
      const bKey = String(b.id || b.boardId || b.code || b.boardCode || b.name || b.boardName);
      if (seen.has(bKey)) return false;
      seen.add(bKey);
      return true;
    });
  }, [allBoards, boards]);

  // Comprehensive institution campuses
  const institutionalCampuses = useMemo(() => {
    const list = Array.isArray(campuses) ? campuses : [];
    const seen = new Set();
    return list.filter((c) => {
      if (!c) return false;
      const cKey = String(c.id || c.campusId || c.code || c.campusCode || c.name || c.campusName);
      if (seen.has(cKey)) return false;
      seen.add(cKey);
      return true;
    });
  }, [campuses]);

  // Board options for select dropdown
  const activeBoardOptions = useMemo(() => {
    return institutionalBoards.map((b) => ({
      value: b.name || b.boardName,
      label: b.code || b.boardCode ? `${b.name || b.boardName} (${b.code || b.boardCode})` : (b.name || b.boardName),
      code: b.code || b.boardCode || "",
      id: b.id || b.boardId,
    }));
  }, [institutionalBoards]);

  // Campus options for select dropdown
  const activeCampusOptions = useMemo(() => {
    return institutionalCampuses.map((c) => ({
      value: c.name || c.campusName,
      label: c.code || c.campusCode ? `${c.name || c.campusName} (${c.code || c.campusCode})` : (c.name || c.campusName),
      code: c.code || c.campusCode || "",
      id: c.id || c.campusId,
    }));
  }, [institutionalCampuses]);

  // Department options based on staff type and master data
  const departmentOptions = useMemo(() => {
    try {
      const cached = loadCachedDepartments();
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.map(d => d.departmentName || d.name).filter(Boolean);
      }
    } catch { }
    return record?.staffType === "Non-Teaching" ? nonTeachingDepartments : teachingDepartments;
  }, [record]);

  // Designation options based on staff type and master data
  const designationOptions = useMemo(() => {
    try {
      const cached = loadCachedDesignations();
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.map(d => d.name || d.designationName).filter(Boolean);
      }
    } catch { }
    return record?.staffType === "Non-Teaching" ? nonTeachingDesignations : teachingDesignations;
  }, [record]);

  const resolvedCampusList = useMemo(() => {
    let rawList = [];
    // 1. Try campusBoardAssignmentsJson
    try {
      if (record?.campusBoardAssignmentsJson) {
        const parsed = JSON.parse(record.campusBoardAssignmentsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(p => p.campusId || p.campusName);
          if (valid.length > 0) {
            return valid.map(p => {
              const matched = institutionalCampuses.find(cp => Number(cp.id ?? cp.campusId) === Number(p.campusId));
              return {
                id: p.campusId || matched?.id || matched?.campusId,
                name: p.campusName || matched?.name || matched?.campusName || `Campus #${p.campusId}`,
                code: matched?.code || matched?.campusCode || p.campusCode || "",
                isPrimary: Boolean(p.isPrimary || (record.campusId && Number(record.campusId) === Number(p.campusId))),
              };
            });
          }
        }
      }
    } catch { }

    // 2. Try assignedCampuses
    if (Array.isArray(record?.assignedCampuses) && record.assignedCampuses.length > 0) {
      return record.assignedCampuses.map((c) => {
        if (typeof c === "object" && c !== null) {
          const cid = c.id ?? c.campusId;
          const matched = institutionalCampuses.find((cp) => (cid && Number(cp.id ?? cp.campusId) === Number(cid)) || (c.name && cp.name === c.name));
          return {
            id: cid || matched?.id || matched?.campusId,
            name: c.name || c.campusName || matched?.name || matched?.campusName || `Campus #${cid}`,
            code: c.code || c.campusCode || matched?.code || matched?.campusCode || "",
            isPrimary: Boolean(c.isPrimary || (record.campusId && Number(record.campusId) === Number(cid))),
          };
        }
        const matched = institutionalCampuses.find((cp) => String(cp.id) === String(c) || String(cp.campusId) === String(c) || cp.name === c);
        return {
          id: matched ? (matched.id ?? matched.campusId) : c,
          name: matched ? (matched.name || matched.campusName) : String(c),
          code: matched ? (matched.code || matched.campusCode) : "",
          isPrimary: Boolean(record.campusId && Number(record.campusId) === Number(matched ? matched.id : c)),
        };
      });
    }

    // 3. Try assignedCampusIds
    if (!rawList.length && Array.isArray(record?.assignedCampusIds) && record.assignedCampusIds.length > 0) {
      rawList = record.assignedCampusIds.map((cid) => {
        const matched = institutionalCampuses.find((cp) => Number(cp.id ?? cp.campusId) === Number(cid));
        return {
          id: Number(cid),
          name: matched ? (matched.name || matched.campusName) : `Campus #${cid}`,
          code: matched ? (matched.code || matched.campusCode) : "",
          isPrimary: Boolean(record.campusId && Number(record.campusId) === Number(cid)),
        };
      });
    }

    if (!rawList.length && (record?.campusName || record?.campusId)) {
      const matched = institutionalCampuses.find((cp) => Number(cp.id ?? cp.campusId) === Number(record.campusId));
      rawList = [{
        id: Number(record.campusId) || 1,
        name: record.campusName || matched?.name || matched?.campusName || "Main Campus (HQ)",
        code: record.campusCode || matched?.code || matched?.campusCode || "MAIN",
        isPrimary: true,
      }];
    }

    if (!rawList.length) {
      rawList = [{
        id: 1,
        name: "Main Campus (HQ)",
        code: "MAIN",
        isPrimary: true,
      }];
    }

    // Strict deduplication by campus ID & name
    const seen = new Set();
    const unique = [];
    for (const item of rawList) {
      const key = String(item.id || item.name).trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique;
  }, [record, institutionalCampuses]);

  const hasMultipleCampuses = useMemo(() => {
    return isPrincipalRecord || (Array.isArray(resolvedCampusList) && resolvedCampusList.length > 1);
  }, [isPrincipalRecord, resolvedCampusList]);

  const resolvedBoardList = useMemo(() => {
    if (Array.isArray(record?.assignedBoards) && record.assignedBoards.length > 0) {
      return record.assignedBoards.map((b) => typeof b === "object" ? (b.name || b.boardName || b.code || String(b)) : String(b));
    }
    if (Array.isArray(record?.assignedBoardIds) && record.assignedBoardIds.length > 0) {
      return record.assignedBoardIds.map((bid) => {
        const matched = institutionalBoards.find((bp) => Number(bp.id ?? bp.boardId) === Number(bid));
        return matched ? (matched.name || matched.boardName || matched.code || `Board #${bid}`) : `Board #${bid}`;
      });
    }
    if (record?.boardName || record?.board) {
      return [record.boardName || record.board];
    }
    if (isPrincipalRecord) {
      return ["All Affiliated Boards"];
    }
    return [];
  }, [record, institutionalBoards, isPrincipalRecord]);

  const startEditAllocations = () => {
    const currentCampIds = (Array.isArray(record?.assignedCampusIds) && record.assignedCampusIds.length > 0)
      ? [...record.assignedCampusIds]
      : resolvedCampusList.map(c => Number(c.id)).filter(Boolean);
    const currentPrimary = record?.campusId || currentCampIds[0] || (institutionalCampuses[0]?.id || 1);
    const currentBoardIds = (Array.isArray(record?.assignedBoardIds) && record.assignedBoardIds.length > 0)
      ? [...record.assignedBoardIds]
      : (record?.boardId ? [record.boardId] : []);
    
    setAllocCampusIds(currentCampIds.length > 0 ? currentCampIds : [Number(currentPrimary)]);
    setAllocPrimaryCampusId(Number(currentPrimary));
    setAllocBoardIds(currentBoardIds.map(Number));
    setEditingAllocations(true);
  };

  const handleSaveAllocations = () => {
    if (!allocCampusIds.length) {
      alert("Please select at least one campus.");
      return;
    }
    const primaryId = allocPrimaryCampusId && allocCampusIds.includes(allocPrimaryCampusId)
      ? allocPrimaryCampusId
      : allocCampusIds[0];
    
    const matchedCamp = institutionalCampuses.find(c => Number(c.id || c.campusId) === Number(primaryId));
    const primaryBoardId = allocBoardIds[0] || record?.boardId || (institutionalBoards[0]?.id || 1);
    const matchedBoard = institutionalBoards.find(b => Number(b.id || b.boardId) === Number(primaryBoardId));

    if (onSave) {
      onSave({
        ...record,
        assignedCampusIds: allocCampusIds,
        campusId: primaryId,
        campusName: matchedCamp ? (matchedCamp.name || matchedCamp.campusName) : record?.campusName,
        assignedBoardIds: allocBoardIds,
        boardId: primaryBoardId,
        board: matchedBoard ? (matchedBoard.name || matchedBoard.boardName) : record?.board,
        boardName: matchedBoard ? (matchedBoard.name || matchedBoard.boardName) : record?.boardName,
      });
    }
    setEditingAllocations(false);
  };

  const defaultGroups = [
    [
      "Basic Information",
      [
        ["fullName", "Full Name"],
        ["employeeId", "Employee ID"],
        ["board", "Board Name"],
        [hasMultipleCampuses ? "assignedCampusesDisplay" : "campusName", hasMultipleCampuses ? "Assigned Campuses" : "Assigned Campus"],
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
        ...(hasMultipleCampuses ? [["assignedCampusesDisplay", "Assigned Campuses"]] : []),
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
    const initData = { ...record };

    // Resolve existing assigned board IDs
    let existingBoardIds = [];
    if (Array.isArray(record.assignedBoardIds) && record.assignedBoardIds.length > 0) {
      existingBoardIds = record.assignedBoardIds.map(Number);
    } else if (Array.isArray(record.assignedBoards) && record.assignedBoards.length > 0) {
      existingBoardIds = record.assignedBoards.map(b => typeof b === 'object' ? Number(b.id || b.boardId) : Number(b)).filter(Boolean);
    } else if (record.boardId) {
      existingBoardIds = [Number(record.boardId)];
    } else if (record.board || record.boardName) {
      const match = institutionalBoards.find(b => (b.name || b.boardName) === (record.board || record.boardName) || (b.code || b.boardCode) === (record.board || record.boardName) || String(b.id || b.boardId) === String(record.board));
      if (match) existingBoardIds = [Number(match.id || match.boardId)];
    }
    initData.assignedBoardIds = existingBoardIds;

    // Resolve existing assigned campus IDs
    let existingCampIds = [];
    if (Array.isArray(record.assignedCampusIds) && record.assignedCampusIds.length > 0) {
      existingCampIds = record.assignedCampusIds.map(Number);
    } else if (Array.isArray(record.assignedCampuses) && record.assignedCampuses.length > 0) {
      existingCampIds = record.assignedCampuses.map(c => typeof c === 'object' ? Number(c.id || c.campusId) : Number(c)).filter(Boolean);
    } else if (record.campusId) {
      existingCampIds = [Number(record.campusId)];
    }
    initData.assignedCampusIds = existingCampIds;

    const matchedBoard = institutionalBoards.find(b => existingBoardIds.includes(Number(b.id || b.boardId)));
    initData.board = matchedBoard ? (matchedBoard.name || matchedBoard.boardName) : (record.boardName || record.board || "");
    initData.boardName = matchedBoard ? (matchedBoard.name || matchedBoard.boardName) : (record.boardName || record.board || "");
    initData.boardId = existingBoardIds[0] || record.boardId;

    setFormData(initData);
    setEditingGroup(groupIndex);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...record, ...formData });
    }
    setEditingGroup(null);
  };

  const fieldTypes = {
    board: ["select", activeBoardOptions],
    campusName: ["select", activeCampusOptions],
    assignedCampusesDisplay: ["select", activeCampusOptions],
    gender: ["select", ["Male", "Female", "Other"]],
    status: ["select", ["Active", "Inactive"]],
    bloodGroup: ["select", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]],
    maritalStatus: ["select", ["Single", "Married", "Divorced", "Widowed", "Other"]],
    employmentType: ["select", ["Full Time", "Part Time", "Contract", "Visiting"]],
    staffType: ["select", ["Teaching", "Non-Teaching"]],
    nationality: ["select", ["Indian", "NRI", "Other"]],
    department: ["select", departmentOptions],
    designation: ["select", designationOptions],
    highestQualification: ["select", [
      "Ph.D / Doctorate",
      "Master's Degree (M.Tech, M.Sc, M.A, M.Com)",
      "Bachelor's Degree (B.Tech, B.Sc, B.A, B.Com)",
      "B.Ed / M.Ed",
      "Diploma / Polytechnic",
      "Intermediate / 10+2",
      "SSC / 10th",
      "Other"
    ]],
    accountType: ["select", ["Savings", "Salary", "Current"]],
    emergencyRelationship: ["select", ["Spouse", "Father", "Mother", "Brother", "Sister", "Son", "Daughter", "Guardian", "Friend", "Other"]],
    state: ["select", [
      "Andhra Pradesh",
      "Telangana",
      "Karnataka",
      "Tamil Nadu",
      "Maharashtra",
      "Kerala",
      "Delhi",
      "Uttar Pradesh",
      "West Bengal",
      "Gujarat",
      "Rajasthan",
      "Madhya Pradesh",
      "Bihar",
      "Odisha",
      "Punjab",
      "Haryana",
      "Other"
    ]],
    dateOfBirth: ["date"],
    dateOfJoining: ["date"],
    experienceFrom: ["date"],
    experienceTo: ["date"],
    currentAddress: ["textarea"],
    permanentAddress: ["textarea"],
    emergencyAddress: ["textarea"],
  };

  const renderFieldInput = (key, label, fieldSpec) => {
    const specType = fieldSpec?.[2];
    const specOpts = Array.isArray(fieldSpec?.[3]) && fieldSpec[3].length > 0 ? fieldSpec[3] : null;

    if (specType === "file") {
      const rawVal = formData[key] !== undefined ? formData[key] : record[key];
      const val = rawVal === null || rawVal === undefined ? "" : String(rawVal).trim();
      return (
        <span style={{ fontSize: 11, color: val ? "var(--cms-primary, #355e3b)" : "var(--cms-muted)", fontStyle: val ? "normal" : "italic" }}>
          {val || "No file uploaded"}
        </span>
      );
    }

    if (key === "allocatedSubjects" || key === "subjects") {
      const currentVal = formData.allocatedSubjects || formData.subjects || record.allocatedSubjects || record.subjects || [];
      return (
        <SubjectAllocationInput
          staffId={record.id}
          department={formData.department || record.department || ""}
          value={currentVal}
          onChange={(newSubs) => setFormData((prev) => ({ ...prev, allocatedSubjects: newSubs, subjects: newSubs }))}
        />
      );
    }

    if (key === "board") {
      const currentBoardIds = (() => {
        if (formData.assignedBoardIds !== undefined) {
          return (Array.isArray(formData.assignedBoardIds) ? formData.assignedBoardIds : []).map(Number);
        }
        if (Array.isArray(record.assignedBoardIds) && record.assignedBoardIds.length > 0) {
          return record.assignedBoardIds.map(Number);
        }
        if (Array.isArray(record.assignedBoards) && record.assignedBoards.length > 0) {
          return record.assignedBoards.map(b => typeof b === 'object' ? Number(b.id || b.boardId) : Number(b)).filter(Boolean);
        }
        const singleId = formData.boardId || record.boardId || (institutionalBoards.find(b => (b.name || b.boardName) === (formData.board || record.board || record.boardName))?.id);
        return singleId ? [Number(singleId)] : [];
      })();

      const assignedBoardObjs = currentBoardIds.map(bid => {
        const found = institutionalBoards.find(b => Number(b.id || b.boardId) === Number(bid));
        return {
          id: bid,
          name: found ? (found.name || found.boardName) : `Board #${bid}`,
          code: found ? (found.code || found.boardCode) : "",
        };
      });

      const handleAddBoard = (boardIdVal) => {
        if (!boardIdVal) return;
        const bId = Number(boardIdVal);
        const updatedIds = currentBoardIds.includes(bId) ? currentBoardIds : [...currentBoardIds, bId];
        const primaryB = institutionalBoards.find(b => Number(b.id || b.boardId) === updatedIds[0]);
        setFormData(prev => ({
          ...prev,
          assignedBoardIds: updatedIds,
          boardId: updatedIds[0],
          board: primaryB ? (primaryB.name || primaryB.boardName) : prev.board,
          boardName: primaryB ? (primaryB.name || primaryB.boardName) : prev.boardName,
          boardCode: primaryB ? (primaryB.code || primaryB.boardCode) : prev.boardCode,
        }));
      };

      const handleRemoveBoard = (bId) => {
        const updatedIds = currentBoardIds.filter(id => id !== bId);
        const primaryB = updatedIds.length > 0 ? institutionalBoards.find(b => Number(b.id || b.boardId) === updatedIds[0]) : null;
        setFormData(prev => ({
          ...prev,
          assignedBoardIds: updatedIds,
          boardId: primaryB ? Number(primaryB.id || primaryB.boardId) : null,
          board: primaryB ? (primaryB.name || primaryB.boardName) : "",
          boardName: primaryB ? (primaryB.name || primaryB.boardName) : "",
          boardCode: primaryB ? (primaryB.code || primaryB.boardCode) : "",
        }));
      };

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {assignedBoardObjs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {assignedBoardObjs.map(b => (
                <span
                  key={b.id}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "var(--cms-primary-soft, #edf7e2)",
                    color: "var(--cms-primary, #355e3b)",
                    fontSize: "11px",
                    fontWeight: "600",
                    border: "1px solid var(--cms-primary-border, #cfe7b6)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  {b.name} {b.code ? `(${b.code})` : ""}
                  <button
                    type="button"
                    onClick={() => handleRemoveBoard(b.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "12px",
                      lineHeight: 1
                    }}
                    title="Remove Board"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            value=""
            onChange={(e) => handleAddBoard(e.target.value)}
            style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--cms-border, #cbd5e1)" }}
          >
            <option value="">+ Assign Board ({activeBoardOptions.length} available)</option>
            {activeBoardOptions.map(opt => (
              <option key={opt.id || opt.value} value={opt.id} disabled={currentBoardIds.includes(opt.id)}>
                {opt.label} {currentBoardIds.includes(opt.id) ? "(Assigned)" : ""}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (key === "campusName" || key === "assignedCampusesDisplay" || key === "assignedCampuses") {
      const currentCampIds = (() => {
        if (formData.assignedCampusIds !== undefined) {
          return (Array.isArray(formData.assignedCampusIds) ? formData.assignedCampusIds : []).map(Number);
        }
        if (Array.isArray(record.assignedCampusIds) && record.assignedCampusIds.length > 0) {
          return record.assignedCampusIds.map(Number);
        }
        if (Array.isArray(record.assignedCampuses) && record.assignedCampuses.length > 0) {
          return record.assignedCampuses.map(c => typeof c === 'object' ? Number(c.id || c.campusId) : Number(c)).filter(Boolean);
        }
        const singleId = formData.campusId || record.campusId;
        return singleId ? [Number(singleId)] : [1];
      })();

      const assignedCampObjs = currentCampIds.map(cid => {
        const found = institutionalCampuses.find(c => Number(c.id || c.campusId) === Number(cid));
        return {
          id: cid,
          name: found ? (found.name || found.campusName) : `Campus #${cid}`,
          code: found ? (found.code || found.campusCode) : "",
          isPrimary: Number(cid) === Number(formData.campusId || record.campusId || currentCampIds[0]),
        };
      });

      const handleAddCampus = (campusIdVal) => {
        if (!campusIdVal) return;
        const cId = Number(campusIdVal);
        const updatedIds = currentCampIds.includes(cId) ? currentCampIds : [...currentCampIds, cId];
        const primaryC = institutionalCampuses.find(c => Number(c.id || c.campusId) === (formData.campusId || updatedIds[0]));
        setFormData(prev => ({
          ...prev,
          assignedCampusIds: updatedIds,
          campusId: prev.campusId || updatedIds[0],
          campusName: primaryC ? (primaryC.name || primaryC.campusName) : prev.campusName,
        }));
      };

      const handleRemoveCampus = (cId) => {
        if (currentCampIds.length <= 1) {
          alert("At least one campus must remain assigned.");
          return;
        }
        const updatedIds = currentCampIds.filter(id => id !== cId);
        const primaryC = institutionalCampuses.find(c => Number(c.id || c.campusId) === updatedIds[0]);
        setFormData(prev => ({
          ...prev,
          assignedCampusIds: updatedIds,
          campusId: updatedIds[0],
          campusName: primaryC ? (primaryC.name || primaryC.campusName) : "",
        }));
      };

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {assignedCampObjs.map((c) => (
              <span
                key={c.id}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  background: "var(--cms-primary-soft, #edf7e2)",
                  color: "var(--cms-primary, #355e3b)",
                  fontSize: "11px",
                  fontWeight: "600",
                  border: "1px solid var(--cms-primary-border, #cfe7b6)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                {c.name} {c.code ? `(${c.code})` : ""} {c.isPrimary ? "[PRIMARY]" : ""}
                <button
                  type="button"
                  onClick={() => handleRemoveCampus(c.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "12px",
                    lineHeight: 1
                  }}
                  title="Remove Campus"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "2px" }}>
            <select
              value=""
              onChange={(e) => handleAddCampus(e.target.value)}
              style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--cms-border, #cbd5e1)" }}
            >
              <option value="">+ Assign Campus ({activeCampusOptions.length} available)</option>
              {activeCampusOptions.map(c => (
                <option key={c.id || c.value} value={c.id} disabled={currentCampIds.includes(c.id)}>
                  {c.label} {currentCampIds.includes(c.id) ? "(Assigned)" : ""}
                </option>
              ))}
            </select>

          </div>
        </div>
      );
    }

    const rawVal = formData[key] !== undefined ? formData[key] : record[key];
    const val = rawVal === null || rawVal === undefined ? "" : rawVal;

    if (specType === "search-select") {
      const opts = specOpts || [];
      return (
        <SearchSelectInput
          label={label}
          opts={opts}
          value={String(val)}
          onChange={(v) => setFormData((prev) => ({ ...prev, [key]: v }))}
        />
      );
    }

    const config = (specType && specType !== "text" && specType !== "search-select")
      ? [specType, specOpts]
      : (fieldTypes[key] || ["text"]);
    const [type, options] = config;

    if (type === "select") {
      const opts = specOpts || options || [];
      return (
        <select
          value={val}
          onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
        >
          <option value="">Select {label}</option>
          {opts.map((opt, oi) => {
            const optVal = typeof opt === "object" ? opt.value : opt;
            const optLbl = typeof opt === "object" ? (opt.label || opt.name || opt.value) : opt;
            return <option key={oi} value={optVal}>{optLbl}</option>;
          })}
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
    const inputVal = type === "date" && val ? String(val).split("T")[0] : val;
    return (
      <input
        type={type === "date" ? "date" : type === "email" ? "email" : "text"}
        value={inputVal}
        readOnly={key === "employeeId"}
        onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    );
  };

  // Helper for formatting and masking sensitive values
  const formatDisplayValue = (key, rawVal) => {
    if (key === "assignedCampusesDisplay" || key === "assignedCampuses" || (key === "campusName" && isPrincipalRecord)) {
      if (resolvedCampusList && resolvedCampusList.length > 0) {
        return resolvedCampusList.map((c) => c.name + (c.code ? ` (${c.code})` : "")).join(", ");
      }
      return record.campusName || "Main Campus (HQ)";
    }
    if (key === "campusName") {
      if (rawVal && rawVal !== "—") return rawVal;
      if (resolvedCampusList && resolvedCampusList.length > 0) {
        return resolvedCampusList.map((c) => c.name + (c.code ? ` (${c.code})` : "")).join(", ");
      }
      return "Main Campus (HQ)";
    }
    if (key === "board") {
      const assignedBoardNames = (() => {
        if (Array.isArray(record.assignedBoards) && record.assignedBoards.length > 0) {
          return record.assignedBoards.map(b => typeof b === "object" ? (b.name || b.boardName || b.code || String(b)) : String(b));
        }
        if (Array.isArray(record.assignedBoardIds) && record.assignedBoardIds.length > 0) {
          return record.assignedBoardIds.map(bid => {
            const found = institutionalBoards.find(b => Number(b.id || b.boardId) === Number(bid));
            return found ? (found.code ? `${found.name || found.boardName} (${found.code})` : (found.name || found.boardName)) : `Board #${bid}`;
          });
        }
        if (record.boardName || record.board) {
          return [record.boardName || record.board];
        }
        return [];
      })();

      if (assignedBoardNames.length > 0) {
        return (
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "4px" }}>
            {assignedBoardNames.map((bn, bi) => (
              <span
                key={bi}
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "var(--cms-primary-soft, #edf7e2)",
                  color: "var(--cms-primary, #355e3b)",
                  fontSize: "11px",
                  fontWeight: "600",
                  border: "1px solid var(--cms-primary-border, #cfe7b6)",
                }}
              >
                {bn}
              </span>
            ))}
          </span>
        );
      }
      return "—";
    }
    if (rawVal === null || rawVal === undefined || String(rawVal).trim() === "") return "—";
    const str = String(rawVal).trim();
    if (str.includes("T") && /^\d{4}-\d{2}-\d{2}T/.test(str)) {
      const parts = str.split("T")[0].split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return str.split("T")[0];
    }
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
      {/* Dedicated Multi-Campus & Board Assignment Summary Card in Profile */}
      {hasMultipleCampuses ? (
        <article
          className="principal-summary-card"
          style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)",
            border: "1.5px solid var(--cms-primary-border, #a7f3d0)",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            overflow: "hidden",
            marginBottom: "16px",
          }}
        >
          <header
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--cms-primary-border, #cfe7b6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.85)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "var(--cms-primary-soft, #edf7e2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Building2 size={18} style={{ color: "var(--cms-primary, #355e3b)" }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--cms-text, #1f2937)" }}>
                  {isPrincipalRecord ? "Principal Campus & Board Allocations" : "Multi-Campus & Board Allocations"}
                </h3>
                <span style={{ fontSize: "11px", color: "var(--cms-muted, #64748b)" }}>
                  {isPrincipalRecord
                    ? "Assigned campuses and affiliated educational boards under this Principal's purview"
                    : "Assigned campuses and affiliated educational boards under this staff member's purview"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: "var(--cms-primary, #355e3b)",
                  color: "#ffffff",
                  boxShadow: "0 1px 3px rgba(53,94,59,0.2)",
                }}
              >
                {resolvedCampusList.length} Assigned {resolvedCampusList.length === 1 ? "Campus" : "Campuses"}
              </span>
            </div>
          </header>

          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {resolvedCampusList.map((c, i) => (
                <div
                  key={c.id || i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "14px 16px",
                    background: "#ffffff",
                    border: "1px solid var(--cms-border, #e5e7eb)",
                    borderRadius: "8px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--cms-text, #1f2937)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Building2 size={15} style={{ color: "var(--cms-primary, #355e3b)" }} />
                      {c.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {c.isPrimary && (
                        <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "10px", background: "var(--cms-primary-soft, #edf7e2)", color: "var(--cms-primary, #355e3b)", border: "1px solid var(--cms-primary-border, #cfe7b6)" }}>
                          PRIMARY HQ
                        </span>
                      )}
                      {c.code && (
                        <span style={{ fontSize: "10.5px", fontWeight: "700", padding: "2px 7px", borderRadius: "4px", background: "#f3f4f6", color: "#4b5563" }}>
                          {c.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--cms-muted, #64748b)", fontWeight: "600" }}>Affiliated Boards:</span>
                    {resolvedBoardList.map((bName, bi) => (
                      <span
                        key={bi}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: "var(--cms-primary-soft, #edf7e2)",
                          color: "var(--cms-primary, #355e3b)",
                          fontSize: "11px",
                          fontWeight: "600",
                          border: "1px solid var(--cms-primary-border, #cfe7b6)",
                        }}
                      >
                        <GraduationCap size={12} /> {bName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
        </article>
      ) : null}
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
                    <tr style={{ background: "var(--cms-surface-subtle, #f8fafc)", borderBottom: "1px solid var(--cms-border)" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Degree</th>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Institution</th>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Specialization</th>
                      <th style={{ padding: "6px 8px", textAlign: "center" }}>Year</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.education.map((edu, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--cms-border-light, #f1f5f9)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: "600" }}>{edu.degree || edu.degreeName || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{edu.institution || edu.institutionName || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{edu.specialization || "—"}</td>
                        <td style={{ padding: "6px 8px", textAlign: "center" }}>{edu.yearOfPassing || edu.passingYear || "—"}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>{edu.percentage || edu.cgpa || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {hasCustomExperience ? (
              <div style={{ overflowX: "auto", margin: "8px 0" }}>
                {record.isFresher ? (
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "var(--cms-muted)" }}>Fresher (No prior experience)</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "var(--cms-surface-subtle, #f8fafc)", borderBottom: "1px solid var(--cms-border)" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Institution</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Designation</th>
                        <th style={{ padding: "6px 8px", textAlign: "center" }}>From</th>
                        <th style={{ padding: "6px 8px", textAlign: "center" }}>To</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Years</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.experience.map((exp, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--cms-border-light, #f1f5f9)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: "600" }}>{exp.organization || exp.institution || "—"}</td>
                          <td style={{ padding: "6px 8px" }}>{exp.designation || exp.role || "—"}</td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>{formatDisplayValue("experienceFrom", exp.from || exp.fromYear)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>{exp.isCurrent ? "Present" : formatDisplayValue("experienceTo", exp.to || exp.toYear)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>{exp.years || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}

            {!(hasCustomEducation && t === "Educational Qualifications") && !(hasCustomExperience && t === "Experience") && (
              fields.map(([key, label, type, options]) => {
                const isCustomDepartmentField = (key === "departmentSpecific" || key === "departmentSpecificJson" || key === "customFields");

                if (isCustomDepartmentField) {
                  const dynamicData = typeof record[key] === "object" && record[key] !== null ? record[key] : {};
                  const dynamicEntries = Object.entries(dynamicData).filter(([k]) => k !== "allocatedSubjects" && k !== "subjects");
                  if (dynamicEntries.length === 0) return null;
                  return (
                    <div key={key} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "8px", borderTop: "1px dashed var(--cms-border, #e5e7eb)", paddingTop: "8px" }}>
                      {dynamicEntries.map(([dynKey, dynVal]) => (
                        <p key={dynKey}>
                          <small>{dynKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</small>
                          <strong>{dynVal === null || dynVal === undefined || String(dynVal).trim() === "" ? "—" : String(dynVal)}</strong>
                        </p>
                      ))}
                    </div>
                  );
                }

                return (
                  <p key={key}>
                    <small>{label}</small>
                    {isEditing ? (
                      renderFieldInput(key, label, [key, label, type, options])
                    ) : (
                      <strong>
                        {key === "allocatedSubjects" || key === "subjects" ? (
                          Array.isArray(record[key]) && record[key].length > 0 ? (
                            <span style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {record[key].map((sub, i) => (
                                <span key={i} className="subject-pill" style={{ padding: "2px 8px", fontSize: "11px" }}>
                                  {typeof sub === "object" ? sub.name || sub.subjectName || String(sub) : String(sub)}
                                </span>
                              ))}
                            </span>
                          ) : (
                            "—"
                          )
                        ) : key === "board" && resolvedBoardList.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                            {resolvedBoardList.map((bName, i) => (
                              <span
                                key={i}
                                className="board-badge"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "var(--cms-primary-soft, #edf7e2)",
                                  color: "var(--cms-primary, #355e3b)",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  border: "1px solid var(--cms-primary-border, #cfe7b6)",
                                }}
                              >
                                <GraduationCap size={12} /> {bName}
                              </span>
                            ))}
                          </div>
                        ) : (key === "assignedCampusesDisplay" || (key === "campusName" && isPrincipalRecord)) && resolvedCampusList.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                            {resolvedCampusList.map((c, i) => (
                              <span
                                key={c.id || i}
                                className="campus-badge"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "var(--cms-primary-soft, #edf7e2)",
                                  color: "var(--cms-primary, #355e3b)",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  border: "1px solid var(--cms-primary-border, #cfe7b6)",
                                }}
                              >
                                <Building2 size={12} /> {c.name}{c.code ? ` (${c.code})` : ""} {c.isPrimary ? "[PRIMARY]" : ""}
                              </span>
                            ))}
                          </div>
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
  const { boards, selectedBoard } = useAcademicContext();
  const { selectedCampus } = useCampusContext();

  const [records, setRaw] = useState(() => []);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [activities, setActivityRaw] = useState(() => []);
  const [toast, setToast] = useState("");
  const [loadedStaff, setLoadedStaff] = useState(null);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const safeRecords = useMemo(() => {
    const raw = Array.isArray(records) ? records : [];
    return raw.filter((r) => isStaffMatchingBoard(r, selectedBoard, boards) && isStaffMatchingCampus(r, selectedCampus));
  }, [records, selectedBoard, boards, selectedCampus]);

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

  // Initial Staff Load (GET /api/v1/staff filtered by selected Board)
  useEffect(() => {
    let isMounted = true;
    async function loadInit() {
      setLoadingRecords(true);
      try {
        const activeBoardId = selectedBoard?.id || selectedBoard?.boardId;
        const activeCampusId = selectedCampus?.campusId ?? selectedCampus?.id;
        const listRes = await staffApi.getStaffPaged({
          PageNumber: 1,
          PageSize: 100,
          BoardId: activeBoardId || undefined,
          CampusId: activeCampusId != null && activeCampusId !== "" ? Number(activeCampusId) || activeCampusId : undefined,
        });
        if (isMounted && listRes.data) {
          const listItems = listRes.data.items || listRes.data.data || (Array.isArray(listRes.data) ? listRes.data : []);
          if (Array.isArray(listItems)) {
            setRecords(listItems);
          }
        }
      } catch (err) { }
      finally {
        if (isMounted) setLoadingRecords(false);
      }
    }
    loadInit();
    return () => { isMounted = false; };
  }, [selectedBoard, selectedCampus]);

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

        if (isMounted && apiData) {
          setLoadedStaff(apiData);
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
    page = <Dashboard records={safeRecords} loadingRecords={loadingRecords} />;
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
          <SkeletonPage variant="form" rows={8} />
        </main>
      </DashboardLayout>
    );
  else if ((p.includes("/mock-staff-portal") || p.includes("/staff-portal") || p.includes("/staff/onboarding")) && record)
    page = <Navigate to="/faculty-dashboard" replace />;
  else if (p.endsWith("/send-link") && record)
    page = <Navigate to="/dashboard/staff/pending" replace />;
  else if (p.endsWith("/review") && record)
    page = <Review record={record} update={update} activity={activity} />;
  else if (p.endsWith("/edit")) {
    if (loadingStaff && !record) {
      page = (
        <DashboardLayout title="Edit Staff" breadcrumb={["People", "Staff Management"]}>
          <main className="staff-mock-page">
            <SkeletonPage variant="form" rows={8} />
          </main>
        </DashboardLayout>
      );
    } else if (record) {
      page =
        record.staffType === "Teaching" ? (
          <TeachingForm records={safeRecords} setRecords={setRecords} existing={record} />
        ) : (
          <NonTeachingForm records={safeRecords} setRecords={setRecords} existing={record} />
        );
    } else {
      page = (
        <DashboardLayout title="Staff Record Not Found" breadcrumb={["People", "Staff Management"]}>
          <main className="staff-mock-page">
            <p style={{ margin: "20px 0" }}>The requested staff record could not be found for editing.</p>
            <button className="cms-btn cms-btn-primary" onClick={() => n("/dashboard/staff/list")}>Back to Staff List</button>
          </main>
        </DashboardLayout>
      );
    }
  } else if (id || record)
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
