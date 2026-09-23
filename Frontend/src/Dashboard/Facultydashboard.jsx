import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutDashboard, User, Calendar, BookOpen, UserCheck,
  ClipboardCheck, Wallet, FileText, Receipt,
  Bell, Search, Menu, ChevronRight, ChevronLeft, Download, Printer,
  Eye, CheckCircle, AlertCircle, Plus, LogOut, Building2,
  Users, Check, X, Award, Clock, TrendingUp,
  ArrowLeft, Briefcase, FileSpreadsheet, RefreshCw,
  Edit3, Save, UploadCloud, Trash2, FileCheck, Phone, Mail,
  MapPin, Landmark, Camera, Upload, ShieldCheck, Loader2,
  ChevronDown, CheckCircle2, Send, Paperclip, CalendarClock,
  ExternalLink, UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { clearAuthSession, getAuthUser } from "@/features/authStorage.js";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import staffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import marksEvaluationIcon from "@/assets/sidebar-3d/marks-evaluation.png";
import examinationIcon from "@/assets/dashboard-3d/create-exam.png";
import feeManagementIcon from "@/assets/sidebar-3d/fee-management.png";
import managementIconsSprite from "@/assets/sidebar-3d/management-icons-sprite.png";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import MarksEntryPage from "@/components/pages/MarksEntryPage.jsx";
import "@/components/layout/DashboardLayout.css";
import "@/cms.css";
import "./facultydashboard.css";

const generatedSidebarIcons = {
  staffAttendance: { src: managementIconsSprite, position: "50% 0%" },
  staffLeave: { src: managementIconsSprite, position: "100% 0%" },
  payroll: { src: managementIconsSprite, position: "0% 100%" },
};

function SidebarIcon({ icon, sub = false }) {
  if (!icon) return null;
  if (typeof icon === "string") {
    return <img className={`cms-nav-3d-icon${sub ? " cms-nav-3d-icon-sub" : ""}`} src={icon} alt="" aria-hidden="true" />;
  }
  if (icon.src) {
    return (
      <span
        className={`cms-nav-3d-icon cms-nav-generated-icon${sub ? " cms-nav-3d-icon-sub" : ""}`}
        style={{ backgroundImage: `url(${icon.src})`, backgroundPosition: icon.position }}
        aria-hidden="true"
      />
    );
  }
  const IconComponent = icon;
  return <IconComponent className={`cms-nav-3d-icon${sub ? " cms-nav-3d-icon-sub" : ""}`} size={sub ? 15 : 18} aria-hidden="true" />;
}

function NavbarIcon({ src }) {
  return <img className="cms-navbar-3d-icon" src={src} alt="" aria-hidden="true" />;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const normalizeId = (v) => String(v ?? "");
const eq = (a, b) => normalizeId(a) === normalizeId(b);
const editableStatuses = ["NOT STARTED", "DRAFT", "REJECTED"];
const gradeOf = (pct) =>
  pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F";
const numericMark = (v) =>
  v !== "" && v !== null && v !== undefined &&
  /^(?:\d+|\d+\.\d{1,2})$/.test(String(v)) &&
  Number.isFinite(Number(v));

const unwrapRecords = (res) => {
  if (!res) return [];
  const p = res.data ?? res;
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.items)) return p.items;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.records)) return p.records;
  if (Array.isArray(p?.results)) return p.results;
  return [];
};

const evaluationKey = (item) => `${item.examinationId}:${item.sectionId}:${item.subjectId}`;

// ─────────────────────────────────────────────────────────────
// MOCK DATA FALLBACKS
// ─────────────────────────────────────────────────────────────
const mockStaff = {
  id: 1, employeeId: "P345", firstName: "Devendra Kumar", middleName: "", lastName: "Gummadi",
  fullName: "Devendra Kumar Gummadi", role: "Staff", staffType: "Teaching",
  department: "IT", designation: "Associate Software Engineer", board: "BIEAP",
  academicYear: "2025-2026", dateOfJoining: "2026-04-01", gender: "Male",
  dob: "2003-04-29", bloodGroup: "O-", maritalStatus: "Single", nationality: "Indian",
  religion: "Hindu", motherTongue: "Telugu", mobile: "9951604989", altMobile: "",
  email: "gummadi.devendrakumar@pirnav.com", personalEmail: "gummadi.devendrakumar@gmail.com", status: "Active",
  houseNumber: "15-18-387", street: "Brindavan Gardens", city: "Guntur", district: "Guntur",
  state: "Andhra Pradesh", country: "India", pin: "522007",
  address: "15-18-387, Brindavan Gardens",
  employmentType: "Full Time", subjectsTaught: "Computer Science 1, Computer Science 2",
  bankName: "State Bank of India", accountHolder: "Devendra Kumar Gummadi",
  accountNumber: "38920194823482", accountMasked: "XXXXXX3482", ifsc: "SBIN0001234",
  branch: "Guntur Main Branch", accountType: "Salary Account",
  pfNumber: "200982349812", uanNumber: "200982349812", esiNumber: "",
  aadhaar: "243440489147", pan: "EHKPG8558N", photoUrl: "",
  experience: [
    { id: 1, institution: "PIRNAV Software Solutions", designation: "Associate Software Engineer", fromDate: "2024-06-10", toDate: "Present", isCurrent: true, subjectsTeached: "Computer Science 1", totalExp: "1 Year", status: "Active" },
  ],
  documents: [
    { id: "doc-1", name: "Aadhaar Card Copy", type: "Aadhaar Card Copy", format: "PDF", size: "1.2 MB", date: "2026-04-01", status: "Verified" },
    { id: "doc-2", name: "PAN Card Copy", type: "PAN Card Copy", format: "PDF", size: "840 KB", date: "2026-04-01", status: "Verified" },
  ],
};

const MOCK_TT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MOCK_TT_SLOTS = [
  {
    time: "09:00–10:00 AM",
    Mon: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Tue: null,
    Wed: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Thu: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Fri: null,
    Sat: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" }
  },
  {
    time: "10:00–11:00 AM",
    Mon: null,
    Tue: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Wed: null,
    Thu: { sub: "Commercial Maths", code: "CM101", cls: "1st Year - Section A", group: "MEC", sectionId: "3", room: "Room 104", floor: "1st Floor", block: "Commerce Block" },
    Fri: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Sat: null
  },
  {
    time: "11:15–12:15 PM",
    Mon: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Tue: { sub: "Commercial Maths", code: "CM101", cls: "1st Year - Section A", group: "MEC", sectionId: "3", room: "Room 104", floor: "1st Floor", block: "Commerce Block" },
    Wed: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Thu: null,
    Fri: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Sat: null
  },
  {
    time: "02:00–03:00 PM",
    Mon: null,
    Tue: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Wed: { sub: "Commercial Maths", code: "CM101", cls: "1st Year - Section A", group: "MEC", sectionId: "3", room: "Room 104", floor: "1st Floor", block: "Commerce Block" },
    Thu: null,
    Fri: null,
    Sat: null
  },
  {
    time: "03:00–04:00 PM",
    Mon: { sub: "Tutorial Doubt Clearing", code: "MATH-TUT", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Tue: null,
    Wed: null,
    Thu: null,
    Fri: null,
    Sat: null
  },
];

const MOCK_ATT_STUDENTS = [
  { studentId: 1, rollNo: "25MPC001", admissionNo: "ADM2025001", name: "Aarav Sharma", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 45, attendancePct: 93.8, remarks: "" },
  { studentId: 2, rollNo: "25MPC002", admissionNo: "ADM2025002", name: "Ananya Reddy", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 47, attendancePct: 97.9, remarks: "" },
  { studentId: 3, rollNo: "25MPC003", admissionNo: "ADM2025003", name: "Bhavya Rao", morningStatus: "Absent", afternoonStatus: "Absent", totalClasses: 48, presentCount: 34, attendancePct: 70.8, remarks: "Medical" },
  { studentId: 4, rollNo: "25MPC004", admissionNo: "ADM2025004", name: "Devendra Verma", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 44, attendancePct: 91.7, remarks: "" },
  { studentId: 5, rollNo: "25MPC005", admissionNo: "ADM2025005", name: "Gautam Krishna", morningStatus: "Half Day", afternoonStatus: "Absent", totalClasses: 48, presentCount: 32, attendancePct: 66.7, remarks: "Sick" },
  { studentId: 6, rollNo: "25MPC006", admissionNo: "ADM2025006", name: "Ishita Nair", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 46, attendancePct: 95.8, remarks: "" },
];

const MOCK_PAYSLIPS = [
  { id: 258, month: "January 2026", year: 2026, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "26 Jan 2026", status: "Paid" },
  { id: 257, month: "December 2025", year: 2025, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "28 Dec 2025", status: "Paid" },
  { id: 256, month: "November 2025", year: 2025, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "29 Nov 2025", status: "Paid" },
  { id: 255, month: "October 2025", year: 2025, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "30 Oct 2025", status: "Paid" },
];

const MOCK_LEAVES = [
  { id: 1, type: "Casual Leave (CL)", fromDate: "2025-05-14", toDate: "2025-05-14", totalDays: 1, reason: "Personal family emergency", appliedOn: "12 May 2025", status: "Approved", approvedBy: "Principal Office" },
  { id: 2, type: "Sick Leave (SL)", fromDate: "2025-04-02", toDate: "2025-04-03", totalDays: 2, reason: "Viral fever", appliedOn: "01 Apr 2025", status: "Approved", approvedBy: "HOD Mathematics" },
];

const MOCK_DUTIES = [
  {
    id: 1,
    category: "board",
    examName: "BIEAP IPE Board Theory Examination 2026",
    examCode: "BIEAP-IPE-2026",
    dutyType: "Invigilator (Hall Superintendent)",
    subject: "Mathematics Paper I-A",
    date: "25 Sep 2026",
    session: "Morning Session",
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    venue: "Main Block — Hall 204 (2nd Floor)",
    reportingTime: "08:15 AM (Mandatory 45 mins prior)",
    candidates: "30 Candidates (HT: 2601001 – 2601030)",
    status: "Upcoming",
    sops: [
      "Collect sealed Question Paper packets from Chief Superintendent room.",
      "Verify Student Hall Tickets and prohibit mobile phones/smart watches.",
      "Cross-verify candidate signature on Nominal Roll & OMR Barcode.",
      "Hand over signed absentee statement within 30 minutes of start.",
    ],
  },
  {
    id: 2,
    category: "practical",
    examName: "BIEAP Intermediate Practical Examination 2026",
    examCode: "PRAC-PHY-2026",
    dutyType: "External Practical Examiner",
    subject: "Physics Practical Lab - Batch 01",
    date: "28 Sep 2026",
    session: "Morning Session",
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    venue: "Physics Central Lab — Room 102",
    reportingTime: "08:30 AM",
    candidates: "25 Candidates",
    status: "Upcoming",
    sops: [
      "Verify laboratory apparatus calibration and experiment chits.",
      "Conduct viva-voce and evaluate student lab records/observations.",
      "Enter practical marks directly on BIEAP Confidential portal.",
    ],
  },
  {
    id: 3,
    category: "internal",
    examName: "College Pre-Final Examination 2026",
    examCode: "PRE-FINAL-2026",
    dutyType: "Chief Invigilator",
    subject: "MPC & BiPC Common Session",
    date: "02 Oct 2026",
    session: "Afternoon Session",
    startTime: "02:00 PM",
    endTime: "05:00 PM",
    venue: "Academic Block — Auditorium Hall A",
    reportingTime: "01:15 PM",
    candidates: "60 Students",
    status: "Upcoming",
    sops: [
      "Oversee hall invigilators and manage extra main answer booklets.",
      "Maintain exam decorum and check for unauthorized paper slips.",
    ],
  },
  {
    id: 4,
    category: "internal",
    examName: "Unit Test II Central Evaluation Camp",
    examCode: "UT-II-EVAL",
    dutyType: "Answer Script Evaluator",
    subject: "Mathematics II-A (Calculus & Vectors)",
    date: "15 Sep 2026",
    session: "Full Day Evaluation Camp",
    startTime: "10:00 AM",
    endTime: "04:30 PM",
    venue: "Central Evaluation Cell — Room 305",
    reportingTime: "09:45 AM",
    candidates: "90 Answer Scripts",
    status: "Completed",
    sops: [
      "Follow scheme of valuation and sample answer keys strictly.",
      "Total marks re-verification before bundle closure.",
    ],
  },
];

const MOCK_REIMB = [
  { id: 1, claimId: "CLM250501", type: "Books & Journals", claimed: 1800, approved: 1800, date: "05 May 2025", status: "Approved", proofName: "Receipt_BookStore.pdf" },
  { id: 2, claimId: "CLM250412", type: "Academic Conference", claimed: 3500, approved: 3500, date: "12 Apr 2025", status: "Approved", proofName: "Ticket_Conference.pdf" },
];

// ─────────────────────────────────────────────────────────────
// SIDEBAR CONFIG — Core Modules for Staff Portal (3D Assets)
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: dashboardIcon, group: "MAIN" },
  { id: "profile", label: "My Profile", icon: staffIcon, group: "MAIN" },
  { id: "timetable", label: "My Timetable", icon: timetableIcon, group: "ACADEMICS" },
  { id: "attendance", label: "Student Attendance", icon: attendanceIcon, group: "ACADEMICS" },
  { id: "marks", label: "Marks Entry", icon: marksEvaluationIcon, group: "ACADEMICS" },
  { id: "examduties", label: "Exam Duties", icon: examinationIcon, group: "ACADEMICS" },
  { id: "myattendance", label: "My Attendance", icon: generatedSidebarIcons.staffAttendance, group: "HR & FINANCE" },
  { id: "leave", label: "Leave Management", icon: generatedSidebarIcons.staffLeave, group: "HR & FINANCE" },
  { id: "salary", label: "Salary & Payslips", icon: generatedSidebarIcons.payroll, group: "HR & FINANCE" },
  { id: "reimbursements", label: "Reimbursements", icon: feeManagementIcon, group: "HR & FINANCE" },
];

const STAFF_SEARCH_INDEX = [
  { id: "dashboard", label: "Dashboard", group: "MAIN", moduleId: "dashboard", keywords: "home overview summary live clock stats biometric check in staff portal punch attendance" },
  { id: "profile", label: "My Profile", group: "MAIN", moduleId: "profile", keywords: "profile details download pdf resume verification identity employee" },
  { id: "profile-personal", label: "Personal Information", group: "MY PROFILE", moduleId: "profile", step: 1, keywords: "first name last name dob aadhaar pan mobile email gender marital status blood group photo" },
  { id: "profile-bank", label: "Bank Details", group: "MY PROFILE", moduleId: "profile", step: 2, keywords: "bank salary account ifsc branch account number uan pf statutory passbook" },
  { id: "profile-address", label: "Address Information", group: "MY PROFILE", moduleId: "profile", step: 3, keywords: "house street village city pincode district state country contact residential address permanent" },
  { id: "profile-experience", label: "Experience Details", group: "MY PROFILE", moduleId: "profile", step: 4, keywords: "teaching academic experience history institution designation subjects teached past work college" },
  { id: "profile-documents", label: "Uploaded Documents", group: "MY PROFILE", moduleId: "profile", step: 5, keywords: "certificates pdf files verification id proof attachments degree pan aadhaar upload" },
  { id: "profile-preview", label: "Profile Preview & Submit", group: "MY PROFILE", moduleId: "profile", step: 6, keywords: "preview review submit final submission verification summary review employee details" },
  { id: "timetable", label: "My Timetable", group: "ACADEMICS", moduleId: "timetable", keywords: "schedule classes routine periods lecture room slot monday tuesday wednesday thursday friday saturday weekly timetable" },
  { id: "attendance", label: "Student Attendance", group: "ACADEMICS", moduleId: "attendance", keywords: "roll call mark attendance students present absent morning afternoon daily register student attendance student management" },
  { id: "marks", label: "Marks Entry", group: "ACADEMICS", moduleId: "marks", keywords: "marks evaluation exam marks entry evaluation score grades examination results test student marks subject test" },
  { id: "examduties", label: "Exam Duties", group: "ACADEMICS", moduleId: "examduties", keywords: "invigilation hall superintendent exam duty evaluation camp practical external chief invigilator bieap duties center" },
  { id: "myattendance", label: "My Attendance", group: "HR & FINANCE", moduleId: "myattendance", keywords: "biometric punch logs clock in check in history hours worked faculty attendance daily log punch status biometric machine" },
  { id: "leave", label: "Leave Management", group: "HR & FINANCE", moduleId: "leave", keywords: "apply leave casual leave sick leave earned leave on duty od balance leave history cl sl el leave request permissions" },
  { id: "salary", label: "Salary & Payslips", group: "HR & FINANCE", moduleId: "salary", keywords: "payslip download salary slip ctc gross net pay deductions hra da pf allowances earnings payroll tax tds" },
  { id: "reimbursements", label: "Reimbursements", group: "HR & FINANCE", moduleId: "reimbursements", keywords: "claim reimbursement expenses bills receipts claim proof approval books conference medical travel claims fuel" },
];

const STATUS_BADGE = {
  Approved: "cms-badge-active", Active: "cms-badge-active", Paid: "cms-badge-active",
  Pending: "cms-badge-warn", Upcoming: "cms-badge-info",
  Rejected: "cms-badge-danger", Completed: "cms-badge-inactive",
  DRAFT: "cms-badge-warn", SUBMITTED: "cms-badge-info",
  VERIFIED: "cms-badge-info", APPROVED: "cms-badge-active",
  "NOT STARTED": "cms-badge-inactive", REJECTED: "cms-badge-danger",
};

export default function StaffDashboard() {
  const navigate = useNavigate();
  const {
    selectedBoard,
    setSelectedBoard,
    selectedAcademicYear,
    setSelectedAcademicYear,
    boards = [],
    academicYears = [],
    boardsLoading = false,
    academicYearsLoading = false,
  } = useAcademicContext();

  // Navigation State
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropOpen, setProfileDropOpen] = useState(false);

  // Topbar Board & Academic Year Dropdown State
  const [boardOpen, setBoardOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const boardRef = useRef(null);
  const yearRef = useRef(null);

  // Topbar Search State (Pages and Modules Filter)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const profileDropRef = useRef(null);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return STAFF_SEARCH_INDEX.slice(0, 8);
    return STAFF_SEARCH_INDEX.filter((item) =>
      item.label.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery]);

  const handleSelectSearchResult = (item) => {
    setActiveModule(item.moduleId);
    if (item.step) {
      setProfileStep(item.step);
    }
    setSearchOpen(false);
    setSearchQuery("");
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (profileDropRef.current && !profileDropRef.current.contains(e.target)) setProfileDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Profile View / Edit Mode (starts false in viewing mode; edit enabled on Edit button click)
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = (text, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const getStaffStorageKey = (profileOrAuth) => {
    const rawId = profileOrAuth?.staffId || (profileOrAuth?.role !== "Admin" && profileOrAuth?.role !== "Super Admin" ? profileOrAuth?.id : null);
    const empId = profileOrAuth?.employeeId;
    const rawEmail = profileOrAuth?.email;
    const email = Array.isArray(rawEmail)
      ? String(rawEmail[0] || "").toLowerCase().trim()
      : String(rawEmail || "").toLowerCase().trim();
    if (rawId) return `staff_profile_${rawId}`;
    if (empId) return `staff_profile_${empId}`;
    if (email) return `staff_profile_${email}`;
    return null;
  };

  const persistStaffProfile = (data) => {
    try {
      const key = getStaffStorageKey(data) || getStaffStorageKey(getAuthUser());
      if (key) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {}
  };

  // Staff Profile Data (Safe Name Extraction & Clean Initial State)
  const [profileData, setProfileData] = useState(() => {
    try {
      const auth = getAuthUser();
      const rawEmail = auth?.email;
      const authEmail = Array.isArray(rawEmail)
        ? String(rawEmail[0] || "").toLowerCase().trim()
        : String(rawEmail || "").toLowerCase().trim();
      const currentId = auth?.employeeId || (auth?.staffId ? `STAFF${auth.staffId}` : "");
      const authStaffId = auth?.staffId ? String(auth.staffId) : "";
      const savedKey = getStaffStorageKey(auth);

      // Clean up legacy non-namespaced cache to avoid cross-user data leakage
      try {
        localStorage.removeItem("staff_profile_data");
        sessionStorage.removeItem("staff_profile_data");
      } catch {}

      if (savedKey) {
        const saved = localStorage.getItem(savedKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed) {
            const parsedEmailRaw = parsed?.email;
            const parsedEmail = Array.isArray(parsedEmailRaw)
              ? String(parsedEmailRaw[0] || "").toLowerCase().trim()
              : String(parsedEmailRaw || "").toLowerCase().trim();
            const parsedId = parsed?.id || parsed?.staffId ? String(parsed.id || parsed.staffId) : "";
            const isOwner = (authEmail && parsedEmail === authEmail) || (authStaffId && parsedId === authStaffId);
            if (isOwner) {
              return {
                ...parsed,
                email: parsedEmail,
              };
            }
          }
        }
      }

      if (auth) {
        const full = String(auth.fullName || auth.name || "").trim();
        const parts = full.split(/\s+/);
        const fName = auth.firstName || parts[0] || "Staff";
        const lName = auth.lastName || parts.slice(1).join(" ") || "";
        return {
          id: auth.staffId || null,
          employeeId: auth.employeeId || currentId || "",
          fullName: full || `${fName} ${lName}`.trim() || "Staff Member",
          firstName: fName,
          middleName: auth.middleName || "",
          lastName: lName,
          role: auth.role || "Faculty",
          staffType: auth.staffType || "Teaching",
          department: auth.department || "",
          designation: auth.designation || "Faculty",
          board: auth.board || "BIEAP",
          academicYear: auth.academicYear || "2026-2027",
          dateOfJoining: auth.dateOfJoining || new Date().toISOString().split("T")[0],
          gender: auth.gender || "Male",
          dob: auth.dob || "",
          bloodGroup: "",
          maritalStatus: "",
          mobile: String(auth.mobile || auth.phoneNumber || "").trim(),
          email: authEmail,
          aadhaar: "",
          pan: "",
          photoUrl: "",
          houseNumber: "",
          street: "",
          city: "",
          district: "",
          state: "",
          country: "India",
          pin: "",
          address: "",
          bankName: "",
          accountHolder: "",
          accountNumber: "",
          ifsc: "",
          branch: "",
          accountType: "Salary Account",
          pfNumber: "",
          uanNumber: "",
          experience: [],
          documents: [],
        };
      }
    } catch (e) {
      console.error("Failed to initialize profileData:", e);
    }
    return mockStaff;
  });

  // Live Staff Profile Loader from Backend
  useEffect(() => {
    const auth = getAuthUser();
    // CRITICAL: auth.staffId is the staff table ID! auth.id is Users.UserId!
    // NEVER use auth.id to query /api/v1/staff/{id} because UserId 1 is NOT Staff 1!
    const staffId = auth?.staffId || null;
    const rawEmail = auth?.email;
    const authEmail = Array.isArray(rawEmail)
      ? String(rawEmail[0] || "").toLowerCase().trim()
      : String(rawEmail || "").toLowerCase().trim();
    const employeeId = auth?.employeeId || null;

    if (!staffId && !authEmail && !employeeId) return;

    let isMounted = true;

    const fetchLiveProfile = async () => {
      try {
        let staffRecord = null;
        if (staffId) {
          try {
            const res = await apiClient.get(apiEndpoints.faculty.getById(staffId));
            staffRecord = res?.data?.data || res?.data || res;
          } catch {}
        }
        if (!staffRecord && employeeId) {
          try {
            const res = await apiClient.get(apiEndpoints.faculty.getByEmployeeId(employeeId));
            staffRecord = res?.data?.data || res?.data || res;
          } catch {}
        }
        if (!staffRecord && authEmail) {
          try {
            const res = await apiClient.get(apiEndpoints.faculty.getAll);
            const list = unwrapRecords(res);
            staffRecord = list.find((s) => {
              const sEmail = String(s.email || "").toLowerCase().trim();
              return sEmail && sEmail === authEmail;
            });
          } catch {}
        }

        if (!isMounted || !staffRecord) return;

        const full = (staffRecord.fullName || `${staffRecord.firstName || ""} ${staffRecord.lastName || ""}`).trim();
        const parts = full.split(/\s+/);
        const fName = staffRecord.firstName || parts[0] || "Staff";
        const lName = staffRecord.lastName || parts.slice(1).join(" ") || "";
        const sEmailRaw = staffRecord.email || authEmail;
        const sEmail = Array.isArray(sEmailRaw)
          ? String(sEmailRaw[0] || "").trim()
          : String(sEmailRaw || "").trim();

        setProfileData((prev) => {
          const updated = {
            ...prev,
            id: staffRecord.id || staffRecord.staffId || prev.id,
            employeeId: staffRecord.employeeId || prev.employeeId,
            fullName: full || prev.fullName,
            firstName: fName,
            middleName: staffRecord.middleName || prev.middleName || "",
            lastName: lName,
            email: sEmail,
            mobile: String(staffRecord.mobile || staffRecord.alternateMobile || prev.mobile || "").trim(),
            designation: staffRecord.designation || prev.designation,
            department: staffRecord.department || prev.department,
            staffType: staffRecord.staffType || staffRecord.facultyType || prev.staffType,
            gender: staffRecord.gender || prev.gender,
            dob: staffRecord.dateOfBirth ? staffRecord.dateOfBirth.split("T")[0] : prev.dob,
            aadhaar: staffRecord.aadhaar || prev.aadhaar,
            pan: staffRecord.pan || staffRecord.panNumber || prev.pan,
            bloodGroup: staffRecord.bloodGroup || prev.bloodGroup,
            maritalStatus: staffRecord.maritalStatus || prev.maritalStatus,
            dateOfJoining: staffRecord.dateOfJoining ? staffRecord.dateOfJoining.split("T")[0] : (staffRecord.joiningDate ? staffRecord.joiningDate.split("T")[0] : prev.dateOfJoining),
            qualification: staffRecord.qualification || staffRecord.highestQualification || prev.qualification,
            houseNumber: staffRecord.currentAddress || staffRecord.address || prev.houseNumber,
            city: staffRecord.city || prev.city,
            district: staffRecord.district || prev.district,
            state: staffRecord.state || prev.state,
            pin: staffRecord.pin || staffRecord.pincode || prev.pin,
            bankName: staffRecord.bankName || staffRecord.bankDetails?.bankName || prev.bankName,
            accountHolder: staffRecord.accountHolder || staffRecord.accountHolderName || staffRecord.bankDetails?.accountHolderName || prev.accountHolder,
            accountNumber: staffRecord.accountNumber || staffRecord.bankDetails?.accountNumber || prev.accountNumber,
            ifsc: staffRecord.ifsc || staffRecord.ifscCode || staffRecord.bankDetails?.ifscCode || prev.ifsc,
            branch: staffRecord.branch || staffRecord.branchName || staffRecord.bankDetails?.branch || prev.branch,
            accountType: staffRecord.accountType || staffRecord.bankDetails?.accountType || prev.accountType,
            photoUrl: staffRecord.photoUrl || staffRecord.photoPath || prev.photoUrl,
            experience: (Array.isArray(staffRecord.experienceList) && staffRecord.experienceList.length) ? staffRecord.experienceList : (prev.experience || []),
            documents: (Array.isArray(staffRecord.documentsList) && staffRecord.documentsList.length) ? staffRecord.documentsList : (prev.documents || []),
          };
          persistStaffProfile(updated);
          return updated;
        });
      } catch (err) {
        console.error("Failed to load live staff profile:", err);
      }
    };

    fetchLiveProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Profile Wizard Steps (1 to 6)
  const [profileStep, setProfileStep] = useState(1);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const avatarRef = useRef(null);
  const docFileRef = useRef(null);

  // Live intermediate subjects from Admin portal / database
  const [availableSubjects, setAvailableSubjects] = useState([
    "Mathematics 1A", "Mathematics 1B", "Mathematics 2A", "Mathematics 2B",
    "Physics 1", "Physics 2", "Chemistry 1", "Chemistry 2",
    "Botany 1", "Botany 2", "Zoology 1", "Zoology 2",
    "English 1", "English 2", "Sanskrit 1", "Sanskrit 2",
    "Telugu 1", "Telugu 2", "Hindi 1", "Hindi 2",
    "Commerce 1", "Commerce 2", "Economics 1", "Economics 2",
    "Civics 1", "Civics 2", "History 1", "History 2",
    "Computer Science 1", "Computer Science 2",
  ]);

  useEffect(() => {
    apiClient
      .get(apiEndpoints.subjects?.getAll || "/api/v1/subjects")
      .catch(() => apiClient.get("/api/v1/subjects"))
      .then((res) => {
        const records = unwrapRecords(res);
        if (records && records.length > 0) {
          const names = records
            .map((s) => s.subjectName || s.name || s.subjectCode)
            .filter(Boolean);
          if (names.length > 0) {
            setAvailableSubjects(Array.from(new Set(names)));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Clean blank experience form state
  const [newExp, setNewExp] = useState({
    institution: "",
    designation: "",
    fromDate: "",
    toDate: "",
    subjectsTeached: "",
    totalExp: "",
  });

  // Document upload form state
  const [newDoc, setNewDoc] = useState({
    type: "Aadhaar Card Copy",
    title: "",
    file: null,
  });

  // PIN code auto-fill state and handler
  const [isFetchingPin, setIsFetchingPin] = useState(false);

  const PIN_LOOKUP = {
    "522": { district: "Guntur", state: "Andhra Pradesh", country: "India" },
    "520": { district: "NTR (Krishna)", state: "Andhra Pradesh", country: "India" },
    "521": { district: "Krishna", state: "Andhra Pradesh", country: "India" },
    "523": { district: "Prakasam", state: "Andhra Pradesh", country: "India" },
    "524": { district: "SPSR Nellore", state: "Andhra Pradesh", country: "India" },
    "517": { district: "Tirupati / Chittoor", state: "Andhra Pradesh", country: "India" },
    "518": { district: "Kurnool", state: "Andhra Pradesh", country: "India" },
    "515": { district: "Anantapur", state: "Andhra Pradesh", country: "India" },
    "516": { district: "YSR Kadapa", state: "Andhra Pradesh", country: "India" },
    "530": { district: "Visakhapatnam", state: "Andhra Pradesh", country: "India" },
    "531": { district: "Anakapalli", state: "Andhra Pradesh", country: "India" },
    "532": { district: "Srikakulam", state: "Andhra Pradesh", country: "India" },
    "533": { district: "Kakinada / East Godavari", state: "Andhra Pradesh", country: "India" },
    "534": { district: "Eluru / West Godavari", state: "Andhra Pradesh", country: "India" },
    "535": { district: "Vizianagaram", state: "Andhra Pradesh", country: "India" },
    "500": { district: "Hyderabad", state: "Telangana", country: "India" },
    "501": { district: "Ranga Reddy", state: "Telangana", country: "India" },
    "502": { district: "Sangareddy / Medak", state: "Telangana", country: "India" },
    "505": { district: "Karimnagar", state: "Telangana", country: "India" },
    "506": { district: "Warangal", state: "Telangana", country: "India" },
    "560": { district: "Bengaluru", state: "Karnataka", country: "India" },
    "600": { district: "Chennai", state: "Tamil Nadu", country: "India" },
    "110": { district: "New Delhi", state: "Delhi", country: "India" },
    "400": { district: "Mumbai", state: "Maharashtra", country: "India" },
  };

  const handlePincodeChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setProfileData((prev) => ({ ...prev, pin: clean, pincode: clean }));

    if (clean.length === 6) {
      // Instant prefix-based auto-fill
      const pfx = clean.slice(0, 3);
      if (PIN_LOOKUP[pfx]) {
        const item = PIN_LOOKUP[pfx];
        setProfileData((prev) => ({
          ...prev,
          pin: clean,
          pincode: clean,
          district: item.district,
          state: item.state,
          country: item.country,
        }));
      }

      // Online lookup from Indian Postal PIN API
      setIsFetchingPin(true);
      fetch(`https://api.postalpincode.in/pincode/${clean}`)
        .then((res) => res.json())
        .then((data) => {
          setIsFetchingPin(false);
          if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length) {
            const po = data[0].PostOffice[0];
            setProfileData((prev) => ({
              ...prev,
              pin: clean,
              pincode: clean,
              district: po.District || prev.district,
              state: po.State || prev.state,
              country: po.Country || "India",
              city: prev.city || po.Name || po.Block || prev.city,
            }));
            notify(`Address details auto-filled for PIN ${clean}`);
          }
        })
        .catch(() => {
          setIsFetchingPin(false);
        });
    }
  };

  // Profile Photo Upload Handlers (always feasible)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please select a valid image file (PNG, JPG, JPEG).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setProfileData((prev) => {
          const updated = { ...prev, photoUrl: base64 };
          persistStaffProfile(updated);
          return updated;
        });
        notify("Profile photo updated successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setProfileData((prev) => {
      const updated = { ...prev, photoUrl: "" };
      persistStaffProfile(updated);
      return updated;
    });
    notify("Profile photo removed.");
  };

  const hasVal = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "number") return true;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return Boolean(val);
  };

  const profileCompletion = useMemo(() => {
    const checklist = [
      // 1. Personal Information (14 items)
      hasVal(profileData.firstName),
      hasVal(profileData.lastName),
      hasVal(profileData.dob),
      hasVal(profileData.gender),
      hasVal(profileData.maritalStatus),
      hasVal(profileData.mobile),
      hasVal(profileData.email),
      hasVal(profileData.aadhaar),
      hasVal(profileData.pan),
      hasVal(profileData.department),
      hasVal(profileData.designation),
      hasVal(profileData.dateOfJoining),
      hasVal(profileData.bloodGroup),
      hasVal(profileData.photoUrl),

      // 2. Bank Details (7 items)
      hasVal(profileData.bankName),
      hasVal(profileData.accountHolder),
      hasVal(profileData.accountNumber),
      hasVal(profileData.ifsc),
      hasVal(profileData.branch),
      hasVal(profileData.accountType),
      hasVal(profileData.uanNumber || profileData.pfNumber),

      // 3. Address Information (6 items)
      hasVal(profileData.houseNumber || profileData.address),
      hasVal(profileData.street || profileData.streetArea),
      hasVal(profileData.city || profileData.cityVillage),
      hasVal(profileData.pin || profileData.pincode),
      hasVal(profileData.district),
      hasVal(profileData.state),

      // 4. Experience (1 item)
      hasVal(profileData.experience),

      // 5. Uploaded Documents (1 item)
      hasVal(profileData.documents),
    ];

    const filledCount = checklist.filter(Boolean).length;
    return Math.min(100, Math.round((filledCount / checklist.length) * 100));
  }, [profileData]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadProfile = async () => {
    try {
      setIsDownloadingPdf(true);
      notify("Generating official profile PDF...", "info");

      const [{ default: jsPDFModule, jsPDF: jsPDFNamed }, { default: autoTableModule, autoTable: autoTableNamed }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const jsPDF = jsPDFNamed || (typeof jsPDFModule === "function" ? jsPDFModule : jsPDFModule.jsPDF);
      const autoTable = autoTableNamed || autoTableModule.default || autoTableModule;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      // 1. Top Olive Institution Banner
      doc.setFillColor(111, 132, 0);
      doc.roundedRect(36, 20, 523, 46, 4, 4, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("PIRNAV JUNIOR COLLEGES", 48, 39);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(235, 240, 210);
      doc.text("OFFICIAL STAFF PROFILE & SERVICE RECORD", 48, 52);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`ACADEMIC YEAR: ${profileData.academicYear || "2025-2026"}`, 547, 39, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(235, 240, 210);
      doc.text(`BOARD: ${profileData.board || "BIEAP"}  |  STATUS: ${(profileData.status || "ACTIVE").toUpperCase()}`, 547, 52, { align: "right" });

      // 2. Staff Identity Summary Card
      doc.setFillColor(248, 250, 242);
      doc.setDrawColor(218, 224, 195);
      doc.setLineWidth(0.75);
      doc.roundedRect(36, 74, 523, 62, 4, 4, "FD");

      // Avatar / Staff Photo
      let photoRendered = false;
      if (profileData.photoUrl && typeof profileData.photoUrl === "string" && profileData.photoUrl.startsWith("data:image/")) {
        try {
          const match = profileData.photoUrl.match(/data:image\/([a-zA-Z]+);base64,/);
          const format = match ? match[1].toUpperCase() : "JPEG";
          doc.addImage(profileData.photoUrl, format === "PNG" ? "PNG" : "JPEG", 46, 80, 50, 50);
          doc.setDrawColor(218, 224, 195);
          doc.setLineWidth(1);
          doc.rect(46, 80, 50, 50);
          photoRendered = true;
        } catch {
          photoRendered = false;
        }
      }

      if (!photoRendered) {
        doc.setFillColor(111, 132, 0);
        doc.roundedRect(46, 80, 50, 50, 4, 4, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        const staffInitials = `${profileData.firstName?.[0] || profileData.fullName?.[0] || "S"}${profileData.lastName?.[0] || ""}`.toUpperCase();
        doc.text(staffInitials, 71, 112, { align: "center" });
      }

      // Staff Metadata
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(profileData.fullName || "Staff Member", 108, 95);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${profileData.designation || "Designation"}  ·  Department of ${profileData.department || "General"}`, 108, 109);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(111, 132, 0);
      doc.text(`ID: ${profileData.employeeId || "—"}`, 108, 123);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(` ·  Date of Joining: ${profileData.dateOfJoining || "—"}  ·  Staff Type: ${profileData.staffType || "Teaching"} Staff`, 172, 123);

      // Profile Completion Widget
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Profile Completed: ${profileCompletion}%`, 547, 95, { align: "right" });

      doc.setFillColor(220, 225, 210);
      doc.roundedRect(447, 101, 100, 5, 2, 2, "F");
      doc.setFillColor(111, 132, 0);
      doc.roundedRect(447, 101, Math.max(5, 100 * (profileCompletion / 100)), 5, 2, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        547,
        123,
        { align: "right" }
      );

      // Reusable cell formatters
      const labelCell = (text) => ({
        content: text,
        styles: { fontStyle: "bold", fillColor: [246, 248, 240], textColor: [70, 80, 50], fontSize: 8 },
      });
      const valCell = (text, colSpan = 1) => ({
        content: text || "—",
        colSpan,
        styles: { textColor: [20, 25, 30], fontSize: 8 },
      });

      const aadhaarFmt = profileData.aadhaar
        ? (profileData.aadhaar.length >= 12 ? `XXXX XXXX ${profileData.aadhaar.slice(-4)}` : profileData.aadhaar)
        : "—";

      const fullAddr = [
        profileData.houseNumber || profileData.address,
        profileData.street || profileData.streetArea,
        profileData.city || profileData.cityVillage,
        profileData.district,
        profileData.state,
        profileData.country || "India",
        (profileData.pin || profileData.pincode) ? `PIN: ${profileData.pin || profileData.pincode}` : null,
      ].filter(Boolean).join(", ");

      const baseTableStyles = {
        theme: "plain",
        tableWidth: 523,
        styles: {
          lineColor: [218, 224, 195],
          lineWidth: 0.5,
          cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
        },
        columnStyles: {
          0: { cellWidth: 95 },
          1: { cellWidth: 166.5 },
          2: { cellWidth: 95 },
          3: { cellWidth: 166.5 },
        },
        margin: { left: 36, right: 36.28 },
      };

      // SECTION 1: Personal & Contact Information
      autoTable(doc, {
        ...baseTableStyles,
        startY: 144,
        head: [[
          {
            content: "1. PERSONAL & CONTACT INFORMATION",
            colSpan: 4,
            styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          },
        ]],
        body: [
          [labelCell("Employee ID"), valCell(profileData.employeeId), labelCell("Full Name"), valCell(profileData.fullName)],
          [labelCell("Date of Birth"), valCell(profileData.dob), labelCell("Gender"), valCell(profileData.gender)],
          [labelCell("Marital Status"), valCell(profileData.maritalStatus), labelCell("Blood Group"), valCell(profileData.bloodGroup)],
          [labelCell("Mobile Number"), valCell(profileData.mobile), labelCell("Official Email"), valCell(profileData.email)],
          [labelCell("Aadhaar Number"), valCell(aadhaarFmt), labelCell("PAN Card Number"), valCell(profileData.pan)],
          [labelCell("Department"), valCell(profileData.department), labelCell("Designation"), valCell(profileData.designation)],
          [labelCell("Date of Joining"), valCell(profileData.dateOfJoining), labelCell("Staff Type"), valCell(`${profileData.staffType || "Teaching"} Staff`)],
          [labelCell("Residential Address"), valCell(fullAddr, 3)],
        ],
      });

      // SECTION 2: Bank Details
      const maskedAcc = profileData.accountNumber
        ? (profileData.accountNumber.length > 4 ? `••••••••${profileData.accountNumber.slice(-4)}` : profileData.accountNumber)
        : "—";

      autoTable(doc, {
        ...baseTableStyles,
        startY: doc.lastAutoTable.finalY + 12,
        head: [[
          {
            content: "2. BANK & SALARY ACCOUNT DETAILS",
            colSpan: 4,
            styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          },
        ]],
        body: [
          [labelCell("Bank Name"), valCell(profileData.bankName), labelCell("Account Holder"), valCell(profileData.accountHolder)],
          [labelCell("Account Number"), valCell(maskedAcc), labelCell("Account Type"), valCell(profileData.accountType || "Salary Account")],
          [labelCell("IFSC Code"), valCell(profileData.ifsc), labelCell("Branch Name"), valCell(profileData.branch)],
          [labelCell("PF / UAN Number"), valCell(profileData.uanNumber || profileData.pfNumber || "—", 3)],
        ],
      });

      // SECTION 3: Address Information
      autoTable(doc, {
        ...baseTableStyles,
        startY: doc.lastAutoTable.finalY + 12,
        head: [[
          {
            content: "3. ADDRESS INFORMATION",
            colSpan: 4,
            styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          },
        ]],
        body: [
          [labelCell("House / Flat No."), valCell(profileData.houseNumber || profileData.address), labelCell("Street / Area"), valCell(profileData.street || profileData.streetArea)],
          [labelCell("City / Village"), valCell(profileData.city || profileData.cityVillage), labelCell("Pincode"), valCell(profileData.pin || profileData.pincode)],
          [labelCell("District"), valCell(profileData.district), labelCell("State"), valCell(profileData.state)],
          [labelCell("Country"), valCell(profileData.country || "India", 3)],
        ],
      });

      // SECTION 4: Professional Academic Experience
      const expRows = (profileData.experience && profileData.experience.length > 0)
        ? profileData.experience.map((e, idx) => [
            { content: String(idx + 1), styles: { halign: "center" } },
            e.institution || "—",
            e.designation || "—",
            `${e.fromDate || "—"} to ${e.toDate || "—"}`,
            e.subjectsTeached || e.subjectsTaught || "—",
            { content: e.totalExp || "—", styles: { halign: "center" } },
          ])
        : [[{ content: "—", styles: { halign: "center" } }, { content: "No prior experience records provided.", colSpan: 5, styles: { halign: "center", fontStyle: "italic", textColor: [120, 120, 120] } }]];

      autoTable(doc, {
        theme: "plain",
        tableWidth: 523,
        startY: doc.lastAutoTable.finalY + 12,
        margin: { left: 36, right: 36.28 },
        styles: {
          lineColor: [218, 224, 195],
          lineWidth: 0.5,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
          fontSize: 8,
          textColor: [20, 25, 30],
        },
        head: [
          [
            {
              content: "4. PROFESSIONAL ACADEMIC & TEACHING EXPERIENCE",
              colSpan: 6,
              styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            },
          ],
          [
            { content: "#", styles: { halign: "center", cellWidth: 25 } },
            { content: "Institution / College", styles: { cellWidth: 135 } },
            { content: "Designation", styles: { cellWidth: 100 } },
            { content: "Period (From – To)", styles: { cellWidth: 85 } },
            { content: "Subjects Teached", styles: { cellWidth: 118 } },
            { content: "Total Exp", styles: { halign: "center", cellWidth: 60 } },
          ],
        ],
        headStyles: {
          fillColor: [246, 248, 240],
          textColor: [70, 80, 50],
          fontStyle: "bold",
          fontSize: 8,
        },
        body: expRows,
      });

      // SECTION 5: Uploaded Documents
      const docRows = (profileData.documents && profileData.documents.length > 0)
        ? profileData.documents.map((d, idx) => [
            { content: String(idx + 1), styles: { halign: "center" } },
            d.name || "—",
            d.type || "—",
            { content: d.format || d.type || "PDF", styles: { halign: "center" } },
            { content: d.size || "—", styles: { halign: "center" } },
            { content: d.status || "Verified", styles: { halign: "center", textColor: [34, 139, 34], fontStyle: "bold" } },
          ])
        : [[{ content: "—", styles: { halign: "center" } }, { content: "No documents uploaded.", colSpan: 5, styles: { halign: "center", fontStyle: "italic", textColor: [120, 120, 120] } }]];

      autoTable(doc, {
        theme: "plain",
        tableWidth: 523,
        startY: doc.lastAutoTable.finalY + 12,
        margin: { left: 36, right: 36.28 },
        styles: {
          lineColor: [218, 224, 195],
          lineWidth: 0.5,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
          fontSize: 8,
          textColor: [20, 25, 30],
        },
        head: [
          [
            {
              content: "5. UPLOADED VERIFICATION DOCUMENTS",
              colSpan: 6,
              styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            },
          ],
          [
            { content: "#", styles: { halign: "center", cellWidth: 25 } },
            { content: "Document Name", styles: { cellWidth: 165 } },
            { content: "Document Type", styles: { cellWidth: 135 } },
            { content: "Format", styles: { halign: "center", cellWidth: 55 } },
            { content: "Size", styles: { halign: "center", cellWidth: 65 } },
            { content: "Status", styles: { halign: "center", cellWidth: 78 } },
          ],
        ],
        headStyles: {
          fillColor: [246, 248, 240],
          textColor: [70, 80, 50],
          fontStyle: "bold",
          fontSize: 8,
        },
        body: docRows,
      });

      // SECTION 6: Declaration & Signatures
      let declY = doc.lastAutoTable.finalY + 16;
      if (declY > 720) {
        doc.addPage();
        declY = 46;
      }

      doc.setFillColor(250, 252, 246);
      doc.setDrawColor(218, 224, 195);
      doc.setLineWidth(0.5);
      doc.roundedRect(36, declY, 523, 36, 3, 3, "FD");

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(80, 90, 70);
      doc.text(
        "Declaration: I hereby declare and confirm that the particulars furnished above are authentic, true and complete to the best of my knowledge and institutional records.",
        46,
        declY + 15,
        { maxWidth: 503 }
      );
      doc.text(
        "System Verified on submission · Pirnav Junior Colleges HRMS Portal.",
        46,
        declY + 28
      );

      // Signature Lines
      declY += 46;
      if (declY > 750) {
        doc.addPage();
        declY = 50;
      }

      doc.setDrawColor(180, 190, 160);
      doc.setLineWidth(0.75);
      doc.line(48, declY + 24, 188, declY + 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(50, 60, 40);
      doc.text("Signature of Faculty / Staff", 48, declY + 36);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 110);
      doc.text(profileData.fullName || "", 48, declY + 46);

      doc.line(395, declY + 24, 535, declY + 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(50, 60, 40);
      doc.text("Authorized Signatory / Principal", 395, declY + 36);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 110);
      doc.text("Pirnav Junior Colleges", 395, declY + 46);

      // Running Headers and Footers across all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(218, 224, 195);
        doc.setLineWidth(0.5);
        doc.line(36, 810, 559, 810);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(110, 120, 100);
        doc.text("Pirnav Junior Colleges · HRMS & Staff Portal · Confidential Official Document", 36, 822);
        doc.text(`Page ${i} of ${totalPages}`, 559, 822, { align: "right" });

        if (i > 1) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(111, 132, 0);
          doc.text("PIRNAV JUNIOR COLLEGES — OFFICIAL STAFF PROFILE", 36, 24);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120, 130, 110);
          doc.text(`${profileData.fullName || ""} (${profileData.employeeId || ""})`, 559, 24, { align: "right" });
          doc.setDrawColor(218, 224, 195);
          doc.setLineWidth(0.5);
          doc.line(36, 28, 559, 28);
        }
      }

      const safeFileName = (profileData.fullName || "Staff").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeEmpId = (profileData.employeeId || "Staff").replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`Staff_Profile_${safeEmpId}_${safeFileName}.pdf`);

      notify("Staff Profile PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      notify("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Biometric Check-in state & Live Clock
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [punchState, setPunchState] = useState(() => {
    try {
      const saved = localStorage.getItem("staff_punch_state");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { isPunchedIn: true, inTime: "08:45 AM", outTime: null, hoursWorked: "4 hrs 32 mins" };
  });

  const togglePunch = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!punchState.isPunchedIn) {
      const next = { isPunchedIn: true, inTime: timeStr, outTime: null, hoursWorked: "Just punched in" };
      setPunchState(next);
      localStorage.setItem("staff_punch_state", JSON.stringify(next));
      notify(`Punched IN successfully at ${timeStr}`);
    } else {
      const next = { ...punchState, isPunchedIn: false, outTime: timeStr };
      setPunchState(next);
      localStorage.setItem("staff_punch_state", JSON.stringify(next));
      notify(`Punched OUT successfully at ${timeStr}`);
    }
  };

  // Staff Self Attendance State
  const [punchShift, setPunchShift] = useState("Morning Shift (08:30 AM – 04:30 PM)");
  const [punchLocation, setPunchLocation] = useState("Main Campus Gate 01 - Bio Terminal");
  const [punchNotes, setPunchNotes] = useState("");
  const [punchLogs, setPunchLogs] = useState([
    { id: 1, date: "21 Sep 2026", day: "Monday", shift: "Morning (08:30–16:30)", inTime: "08:45 AM", outTime: "--", hours: "4h 32m (Active)", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: 2, date: "20 Sep 2026", day: "Sunday", shift: "General", inTime: "--", outTime: "--", hours: "0h 00m", device: "--", status: "Holiday", canRegularize: false },
    { id: 3, date: "19 Sep 2026", day: "Saturday", shift: "Morning (08:30–16:30)", inTime: "08:35 AM", outTime: "04:32 PM", hours: "7h 57m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: 4, date: "18 Sep 2026", day: "Friday", shift: "Morning (08:30–16:30)", inTime: "08:55 AM", outTime: "04:30 PM", hours: "7h 35m", device: "Bio-Station 02 (Academic Block)", status: "Late", canRegularize: true },
    { id: 5, date: "17 Sep 2026", day: "Thursday", shift: "Morning (08:30–16:30)", inTime: "08:30 AM", outTime: "04:35 PM", hours: "8h 05m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: 6, date: "16 Sep 2026", day: "Wednesday", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 00m", device: "--", status: "Leave", canRegularize: false },
    { id: 7, date: "15 Sep 2026", day: "Tuesday", shift: "Morning (08:30–16:30)", inTime: "08:31 AM", outTime: "01:00 PM", hours: "4h 29m", device: "Bio-Station 01 (Main Gate)", status: "Half Day", canRegularize: true },
    { id: 8, date: "14 Sep 2026", day: "Monday", shift: "Morning (08:30–16:30)", inTime: "08:28 AM", outTime: "04:31 PM", hours: "8h 03m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
  ]);
  const [showRegularizeModal, setShowRegularizeModal] = useState(false);
  const [regularizeForm, setRegularizeForm] = useState({ date: "", reason: "Forgot Biometric Punch", inTime: "08:30 AM", outTime: "04:30 PM", notes: "" });

  // ─────────────────────────────────────────────────────────────
  // TIMETABLE & MERGED CLASS DRAWER
  // ─────────────────────────────────────────────────────────────
  const [timetable, setTimetable] = useState(MOCK_TT_SLOTS);
  const [selectedClassSlot, setSelectedClassSlot] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // STUDENT ATTENDANCE MODULE (Admin Replica & Active Cascading)
  // ─────────────────────────────────────────────────────────────
  const [attView, setAttView] = useState("daily"); // "daily" | "monthly" | "defaulters"
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attBoard, setAttBoard] = useState("");
  const [attYear, setAttYear] = useState("");
  const [attLevel, setAttLevel] = useState("");
  const [attGroup, setAttGroup] = useState("");
  const [attProgram, setAttProgram] = useState("");
  const [attSection, setAttSection] = useState("");
  const [attStudents, setAttStudents] = useState(MOCK_ATT_STUDENTS);
  const [attDirty, setAttDirty] = useState(false);
  const [attSaving, setAttSaving] = useState(false);

  // Cascading Academic Lists for Attendance
  const [attBoards, setAttBoards] = useState([]);
  const [attYears, setAttYears] = useState([]);
  const [attLevels, setAttLevels] = useState([]);
  const [attGroups, setAttGroups] = useState([]);
  const [attPrograms, setAttPrograms] = useState([]);
  const [attSections, setAttSections] = useState([]);

  // Leave Categories from Admin Settings
  const [leaveCategories, setLeaveCategories] = useState([
    { code: "CL", name: "Casual Leave (CL)" },
    { code: "SL", name: "Sick Leave (SL)" },
    { code: "EL", name: "Earned Leave (EL)" },
    { code: "OD", name: "On-Duty (OD) / Academic Duty" },
    { code: "ML", name: "Maternity / Paternity Leave" },
    { code: "CO", name: "Compensatory Off (CO)" },
  ]);

  useEffect(() => {
    apiClient.get("/api/v1/leave-categories").then((res) => {
      const list = unwrapRecords(res);
      if (list.length) {
        setLeaveCategories(list.map((c) => ({
          code: c.categoryCode || c.code || "LEAVE",
          name: `${c.categoryName || c.name} (${c.categoryCode || c.code || ""})`.replace(" ()", ""),
        })));
      }
    }).catch(() => {});
  }, []);

  const toggleSessionStatus = (studentId, session, status) => {
    setAttStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, [`${session}Status`]: status } : s))
    );
    setAttDirty(true);
  };

  const markAllPresent = () => {
    setAttStudents((prev) =>
      prev.map((s) => ({ ...s, morningStatus: "Present", afternoonStatus: "Present" }))
    );
    setAttDirty(true);
    notify("All students marked Present for both sessions.");
  };

  const saveAttendance = async () => {
    setAttSaving(true);
    try {
      await apiClient.post(apiEndpoints.attendance.studentAdminBulk || "/api/v1/attendance/student/admin/bulk", {
        attendanceDate: attDate,
        sectionId: Number(attSection || "1"),
        students: attStudents.map((s) => ({
          studentId: s.studentId,
          morningStatus: s.morningStatus === "Present" ? 1 : s.morningStatus === "Half Day" ? 4 : 2,
          afternoonStatus: s.afternoonStatus === "Present" ? 1 : s.afternoonStatus === "Half Day" ? 4 : 2,
          remarks: s.remarks || "",
        })),
      }).catch(() => {});
      setAttDirty(false);
      notify("Student attendance saved successfully!");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setAttSaving(false);
    }
  };

  const handleExportAttendanceSheet = () => {
    if (!attStudents.length) return notify("No attendance records to export.", "error");
    const exportData = attStudents.map((s, idx) => ({
      "S.No": idx + 1,
      "Roll No": s.rollNo,
      "Admission No": s.admissionNo,
      "Student Name": s.name,
      "Date": attDate,
      "Morning Session": s.morningStatus,
      "Afternoon Session": s.afternoonStatus,
      "Total Classes": s.totalClasses || 48,
      "Classes Attended": s.presentCount || 45,
      "Attendance %": `${s.attendancePct || 90}%`,
      "Remarks": s.remarks || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Attendance");
    XLSX.writeFile(workbook, `Student_Attendance_${attDate}_Section_${attSection || "1"}.xlsx`);
    notify("Class attendance sheet downloaded as Excel file.");
  };

  const handleDownloadStudentSlip = (student) => {
    const slipText = [
      "================================================================================",
      "                    PIRNAV COLLEGES - STUDENT ATTENDANCE SLIP                   ",
      "================================================================================",
      `Date of Record   : ${attDate}`,
      `Generated Time   : ${new Date().toLocaleTimeString()}`,
      "",
      "STUDENT DETAILS:",
      "--------------------------------------------------------------------------------",
      `Student Name     : ${student.name}`,
      `Roll Number      : ${student.rollNo}`,
      `Admission Number : ${student.admissionNo}`,
      `Section / Class  : Section ${attSection || "A"}`,
      `Academic Year    : 2025-2026`,
      "",
      "DAILY SESSION STATUS:",
      "--------------------------------------------------------------------------------",
      `Morning Session  : ${student.morningStatus}`,
      `Afternoon Session: ${student.afternoonStatus}`,
      `Daily Remarks    : ${student.remarks || "Regular Attendance"}`,
      "",
      "MONTHLY CUMULATIVE METRICS:",
      "--------------------------------------------------------------------------------",
      `Total Classes    : ${student.totalClasses || 48}`,
      `Classes Present  : ${student.presentCount || 45}`,
      `Overall Attendance: ${student.attendancePct || 90}%`,
      `Hall Ticket Eligibility: ${(student.attendancePct || 90) >= 75 ? "ELIGIBLE (>= 75%)" : "SHORTAGE CONDONATION REQUIRED"}`,
      "",
      "Authorized Signatory / Faculty In-Charge: ______________________",
      "================================================================================",
    ].join("\n");
    const blob = new Blob([slipText.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Slip_${student.rollNo}_${attDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Attendance slip downloaded for ${student.name}.`);
  };

  // Load Active Boards on Mount for Student Attendance
  useEffect(() => {
    apiClient.get(apiEndpoints.boards.active).catch(() => apiClient.get(apiEndpoints.boards.list))
      .then((res) => {
        const list = unwrapRecords(res).map((b) => ({
          id: normalizeId(b.boardId ?? b.id),
          name: b.boardName ?? b.name,
          code: b.boardCode ?? b.code,
          isActive: b.isActive !== false,
        })).filter((b) => b.isActive);
        setAttBoards(list);
        if (list.length) {
          setAttBoard(list[0].id);
        }
      }).catch(() => {});
  }, []);

  // Cascading Academic Context for Student Attendance
  useEffect(() => {
    if (!attBoard) return;
    apiClient.get(apiEndpoints.academicYears.active, { params: { boardId: attBoard, isActive: true } })
      .catch(() => apiClient.get(apiEndpoints.academicYears.getAll))
      .then((res) => {
        const list = unwrapRecords(res).map((y) => ({
          id: normalizeId(y.academicYearId ?? y.id),
          name: y.academicYearName ?? y.name,
          boardId: normalizeId(y.boardId),
          isActive: y.isActive !== false && y.status !== false && y.status !== "Inactive" && !String(y.name || "").includes("2028") && !String(y.name || "").includes("2029"),
        })).filter((y) => y.isActive && (!y.boardId || eq(y.boardId, attBoard)));
        setAttYears(list);
        if (list.length) {
          const matchContext = selectedAcademicYear && list.find((y) => eq(y.id, selectedAcademicYear.id));
          setAttYear(matchContext ? matchContext.id : list[0].id);
        }
      }).catch(() => setAttYears([]));

    apiClient.get(`/api/v1/academic-levels?boardId=${attBoard}`)
      .catch(() => apiClient.get("/api/v1/academic-levels"))
      .then((res) => {
        const list = unwrapRecords(res).map((l) => ({
          id: normalizeId(l.academicLevelId ?? l.id),
          name: l.levelName ?? l.name,
          isActive: l.isActive !== false,
        })).filter((l) => l.isActive);
        setAttLevels(list);
        if (list.length) setAttLevel(list[0].id);
      }).catch(() => setAttLevels([]));

    apiClient.get(apiEndpoints.groups.list, { params: { boardId: attBoard, isActive: true } })
      .catch(() => apiClient.get(apiEndpoints.groups.getByBoard(attBoard), { params: { isActive: true } }))
      .then((res) => {
        const list = unwrapRecords(res).map((g) => ({
          id: normalizeId(g.groupId ?? g.id),
          name: g.groupName ?? g.name,
          isActive: g.isActive !== false,
        })).filter((g) => g.isActive);
        setAttGroups(list);
        if (list.length) setAttGroup(list[0].id);
      }).catch(() => setAttGroups([]));
  }, [attBoard]);

  useEffect(() => {
    if (!attGroup) { setAttPrograms([]); return; }
    apiClient.get(apiEndpoints.groups.getPrograms(attGroup))
      .catch(() => apiClient.get(apiEndpoints.groups.programs(attGroup)))
      .then((res) => {
        const list = unwrapRecords(res).map((p) => ({
          id: normalizeId(p.programId ?? p.id),
          name: p.programName ?? p.name,
          isActive: p.isActive !== false,
        })).filter((p) => p.isActive);
        setAttPrograms(list);
        if (list.length) setAttProgram(list[0].id);
      }).catch(() => setAttPrograms([]));
  }, [attGroup]);

  useEffect(() => {
    if (!attBoard || !attGroup) { setAttSections([]); return; }
    const params = {
      BoardId: attBoard,
      GroupId: attGroup,
      IsActive: true,
    };
    if (attYear) params.AcademicYearId = attYear;
    if (attLevel) params.AcademicLevelId = attLevel;
    if (attProgram) params.ProgramId = attProgram;

    apiClient.get(apiEndpoints.sections.list, { params })
      .catch(() => apiClient.get(apiEndpoints.sections.getAll, { params }))
      .then((res) => {
        const list = unwrapRecords(res).map((s) => ({
          id: normalizeId(s.sectionId ?? s.id),
          name: s.sectionName ?? s.name,
          isActive: s.isActive !== false,
        })).filter((s) => s.isActive);
        setAttSections(list);
        if (list.length) setAttSection(list[0].id);
      }).catch(() => setAttSections([]));
  }, [attBoard, attYear, attLevel, attGroup, attProgram]);



  // ─────────────────────────────────────────────────────────────
  // SALARY & PAYSLIPS (Mirrored from Pirnav HRMS UserPayslip)
  // ─────────────────────────────────────────────────────────────
  const [payslipList, setPayslipList] = useState(MOCK_PAYSLIPS);
  const [viewingPayslip, setViewingPayslip] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // LEAVE MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  const [leaveList, setLeaveList] = useState(MOCK_LEAVES);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: "Casual Leave (CL)", fromDate: "", toDate: "", reason: ""
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const applyLeave = async () => {
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      return notify("Please complete all required fields.", "error");
    }
    setLeaveSubmitting(true);
    const start = new Date(leaveForm.fromDate);
    const end = new Date(leaveForm.toDate);
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    try {
      await apiClient.post(apiEndpoints.staffAttendance.leave || "/api/v1/staff-attendance/leave", {
        staffId: profileData.id,
        leaveType: leaveForm.type,
        startDate: leaveForm.fromDate,
        endDate: leaveForm.toDate,
        reason: leaveForm.reason,
      }).catch(() => {});

      const newLeave = {
        id: Date.now(),
        type: leaveForm.type,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        totalDays: days,
        reason: leaveForm.reason,
        appliedOn: new Date().toLocaleDateString("en-GB"),
        status: "Pending",
        approvedBy: "Principal Office",
      };
      setLeaveList((p) => [newLeave, ...p]);
      setShowLeaveModal(false);
      setLeaveForm({ type: "Casual Leave (CL)", fromDate: "", toDate: "", reason: "" });
      notify("Leave application submitted successfully!");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // REIMBURSEMENTS (With Proof Upload)
  // ─────────────────────────────────────────────────────────────
  const [reimbList, setReimbList] = useState(MOCK_REIMB);
  const [showReimbModal, setShowReimbModal] = useState(false);
  const [reimbForm, setReimbForm] = useState({ type: "Books & Journals", amount: "", desc: "", file: null });
  const [reimbSubmitting, setReimbSubmitting] = useState(false);
  const reimbFileInputRef = useRef(null);

  const submitReimbursement = () => {
    if (!reimbForm.amount || !reimbForm.desc.trim()) {
      return notify("Please fill amount and description.", "error");
    }
    setReimbSubmitting(true);
    setTimeout(() => {
      const item = {
        id: Date.now(),
        claimId: `CLM${Date.now().toString().slice(-6)}`,
        type: reimbForm.type,
        claimed: Number(reimbForm.amount),
        approved: 0,
        date: new Date().toLocaleDateString("en-GB"),
        status: "Pending",
        proofName: reimbForm.file?.name || "None",
      };
      setReimbList((p) => [item, ...p]);
      setShowReimbModal(false);
      setReimbForm({ type: "Books & Journals", amount: "", desc: "", file: null });
      notify("Expense claim submitted with proof attachment!");
      setReimbSubmitting(false);
    }, 600);
  };

  // ─────────────────────────────────────────────────────────────
  // EXAM DUTIES
  // ─────────────────────────────────────────────────────────────
  const [dutiesList, setDutiesList] = useState(MOCK_DUTIES);

  // Logout
  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  const initials = `${profileData.firstName?.[0] || profileData.fullName?.[0] || "S"}${profileData.lastName?.[0] || ""}`.toUpperCase();

  // ─────────────────────────────────────────────────────────────
  // MODULE RENDERERS
  // ─────────────────────────────────────────────────────────────

  // 1. DASHBOARD
  const renderDashboard = () => (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Staff Dashboard</h1>
          <p>Welcome back, <strong>{profileData.firstName} {profileData.lastName}</strong>! Here is your daily overview.</p>
        </div>
      </div>

      {/* Staff Biometric & Identity Status Widget */}
      <div className="sp-punch-card">
        <div className="sp-punch-meta">
          <div className="sp-punch-avatar">{initials}</div>
          <div>
            <div className="sp-punch-title">{profileData.fullName}</div>
            <div className="sp-punch-subtitle">
              ID: <strong style={{ color: "var(--cms-primary)" }}>{profileData.employeeId}</strong> · {profileData.designation} ({profileData.department})
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className={`sp-punch-status-badge ${punchState.isPunchedIn ? "in" : "out"}`}>
                ● {punchState.isPunchedIn ? `Checked In (${punchState.inTime})` : "Checked Out"}
              </span>
              <span className="sp-punch-logged-text">
                Logged Today: <strong>{punchState.hoursWorked}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active / Next Lecture Alert Card */}
      <div className="sp-hero-lecture">
        <div>
          <span className="sp-hero-tag">NEXT UPCOMING LECTURE (10:00 AM – 11:00 AM)</span>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--cms-text)" }}>
            {profileData.department ? `${profileData.department} — Section A` : "Mathematics I-A — Section A (MPC 1st Year)"}
          </div>
          <div style={{ fontSize: 13, color: "var(--cms-muted)", marginTop: 3 }}>
            📍 Lecture Hall 203 · 45 Enrolled Students · {profileData.department ? `Department of ${profileData.department}` : "Syllabus: Unit 3 (Calculus & Functions)"}
          </div>
        </div>
        <button
          className="cms-btn cms-btn-primary"
          onClick={() => {
            setActiveModule("attendance");
            setAttSection("1");
          }}
        >
          <UserCheck size={16} /> Take Attendance for this Class
        </button>
      </div>

      {/* 4 Key Academic & Workload Metric Cards */}
      <div className="sp-stat-grid">
        <div className="cms-stat">
          <div className="cms-stat-icon tone-blue"><Users size={22} /></div>
          <div>
            <div className="cms-stat-label">Assigned Classes</div>
            <div className="cms-stat-value">3 Sections</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>MPC 1A, MPC 2B, MEC 1A</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><CalendarClock size={22} /></div>
          <div>
            <div className="cms-stat-label">Today's Lectures</div>
            <div className="cms-stat-value">3 Scheduled</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>1 Completed · 2 Remaining</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-amber"><ClipboardCheck size={22} /></div>
          <div>
            <div className="cms-stat-label">Pending Marks Entries</div>
            <div className="cms-stat-value">1 Evaluation</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Unit Test II (Draft)</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-violet"><Briefcase size={22} /></div>
          <div>
            <div className="cms-stat-label">Leave Balance</div>
            <div className="cms-stat-value">15 Days</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>8 CL · 7 SL Available</div>
          </div>
        </div>
      </div>

      {/* Quick Actions Hub */}
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Quick Actions Hub</h2>
        <div className="sp-quick-actions">
          <div className="sp-quick-btn" onClick={() => setActiveModule("myattendance")}>
            <div className="sp-quick-icon tone-green"><Clock size={20} /></div>
            <div><strong style={{ display: "block", fontSize: 13 }}>My Attendance</strong><span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Biometric punch logs</span></div>
          </div>
          <div className="sp-quick-btn" onClick={() => setActiveModule("attendance")}>
            <div className="sp-quick-icon tone-blue"><UserCheck size={20} /></div>
            <div><strong style={{ display: "block", fontSize: 13 }}>Student Attendance</strong><span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Mark class attendance</span></div>
          </div>
          <div className="sp-quick-btn" onClick={() => setActiveModule("marks")}>
            <div className="sp-quick-icon tone-amber"><ClipboardCheck size={20} /></div>
            <div><strong style={{ display: "block", fontSize: 13 }}>Enter Marks</strong><span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Exam evaluations</span></div>
          </div>
          <div className="sp-quick-btn" onClick={() => setShowLeaveModal(true)}>
            <div className="sp-quick-icon tone-violet"><Plus size={20} /></div>
            <div><strong style={{ display: "block", fontSize: 13 }}>Apply Leave</strong><span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Submit CL/SL request</span></div>
          </div>
          <div className="sp-quick-btn" onClick={() => setActiveModule("salary")}>
            <div className="sp-quick-icon tone-green"><Wallet size={20} /></div>
            <div><strong style={{ display: "block", fontSize: 13 }}>View Payslip</strong><span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Download January 2026</span></div>
          </div>
        </div>
      </div>

      {/* Monthly Punch & Staff Attendance Record */}
      <div className="cms-card">
        <div className="cms-card-head">
          <div>
            <h2>My Monthly Attendance Summary (May 2025)</h2>
            <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>Biometric punch logs & overall staff attendance rate</div>
          </div>
          <span className="cms-badge cms-badge-active">95.4% Punctuality</span>
        </div>
        <div className="cms-card-body">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div><span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Working Days</span><div style={{ fontSize: 20, fontWeight: 800 }}>22</div></div>
            <div><span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Present Days</span><div style={{ fontSize: 20, fontWeight: 800, color: "var(--cms-green)" }}>21</div></div>
            <div><span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Leaves Taken</span><div style={{ fontSize: 20, fontWeight: 800, color: "var(--cms-amber)" }}>1</div></div>
            <div><span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Holidays / Sundays</span><div style={{ fontSize: 20, fontWeight: 800, color: "var(--cms-muted)" }}>8</div></div>
            <div><span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Shift Timings</span><div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>09:00 AM – 04:30 PM</div></div>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. MY TIMETABLE (Merged with Class Details Drawer)
  const renderTimetable = () => (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>My Timetable</h1>
          <p>Click on any period slot to view class syllabus, enrolled students, and attendance.</p>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-table-wrap">
          <table className="sp-tt-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                {MOCK_TT_DAYS.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {timetable.map((slot, i) => (
                <tr key={i}>
                  <td className="time-col">{slot.time}</td>
                  {MOCK_TT_DAYS.map((d) => {
                    const item = slot[d];
                    return (
                      <td key={d}>
                        {item ? (
                          <div className="sp-tt-cell" onClick={() => setSelectedClassSlot({ ...item, day: d, time: slot.time })}>
                            <strong>{item.sub}</strong>
                            <span>{item.cls}</span>
                            <span style={{ display: "block", fontSize: 10, color: "var(--cms-muted)" }}>{item.room}</span>
                          </div>
                        ) : (
                          <div className="sp-tt-free">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Details Centered Modal Dialog (Replacing Side Drawer) */}
      {/* Merged Class Allocation & Venue Details Modal */}
      {selectedClassSlot && (
        <div className="cms-overlay" onClick={() => setSelectedClassSlot(null)}>
          <div className="cms-modal sp-class-modal-card" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Class & Venue Allocation</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>{selectedClassSlot.day} · {selectedClassSlot.time}</span>
              </div>
              <button className="cms-icon-btn" onClick={() => setSelectedClassSlot(null)}><X size={18} /></button>
            </div>
            <div className="cms-modal-body" style={{ padding: 22 }}>
              <div style={{ background: "var(--cms-primary-soft)", padding: "16px 18px", borderRadius: 12, marginBottom: 18, border: "1px solid var(--cms-primary-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="cms-badge cms-badge-info" style={{ fontWeight: 800 }}>{selectedClassSlot.code}</span>
                  <span className="cms-badge cms-badge-active">{selectedClassSlot.group} — {selectedClassSlot.cls}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--cms-primary-dark)", marginTop: 8 }}>{selectedClassSlot.sub}</div>
                <div style={{ fontSize: 12.5, color: "var(--cms-text-secondary)", marginTop: 4 }}>
                  Intermediate / +2 Junior College · Scheduled Lecture
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div style={{ padding: "12px 14px", border: "1px solid var(--cms-border)", borderRadius: 10, background: "var(--cms-surface)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Classroom / Venue</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>📍 {selectedClassSlot.room}</div>
                </div>
                <div style={{ padding: "12px 14px", border: "1px solid var(--cms-border)", borderRadius: 10, background: "var(--cms-surface)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Floor Location</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>🏢 {selectedClassSlot.floor || "2nd Floor"}</div>
                </div>
                <div style={{ padding: "12px 14px", border: "1px solid var(--cms-border)", borderRadius: 10, background: "var(--cms-surface)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Block / Building</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>🏛️ {selectedClassSlot.block || "Main Academic Block"}</div>
                </div>
                <div style={{ padding: "12px 14px", border: "1px solid var(--cms-border)", borderRadius: 10, background: "var(--cms-surface)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Academic Group</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>📚 {selectedClassSlot.group || "MPC"}</div>
                </div>
                <div style={{ padding: "12px 14px", border: "1px solid var(--cms-border)", borderRadius: 10, background: "var(--cms-surface)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Faculty In-Charge</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>👤 {profileData.fullName} ({profileData.employeeId})</div>
                </div>
                <div style={{ padding: "12px 14px", border: "1px solid var(--cms-border)", borderRadius: 10, background: "var(--cms-surface)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Room Setup & Capacity</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>🪑 Lecture Hall (60 Seater)</div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="cms-btn cms-btn-ghost"
                  style={{ minWidth: 100, justifyContent: "center" }}
                  onClick={() => setSelectedClassSlot(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 3. STUDENT ATTENDANCE (Exact Replica of Admin AttendancePage.jsx)
  const renderAttendance = () => (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Student Attendance Entry</h1>
          <p>Replicated from Admin Operations: mark daily session attendance, view monthly reports and defaulters.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {attView === "daily" && (
            <>
              <button className="cms-btn cms-btn-ghost" onClick={markAllPresent}>
                <CheckCircle size={15} /> Mark All Present
              </button>
              <button className="cms-btn cms-btn-primary" onClick={saveAttendance} disabled={attSaving}>
                {attSaving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save Attendance
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="sp-att-views-bar">
        <button className={`sp-att-view-btn ${attView === "daily" ? "active" : ""}`} onClick={() => setAttView("daily")}>
          Daily Attendance
        </button>
        <button className={`sp-att-view-btn ${attView === "monthly" ? "active" : ""}`} onClick={() => setAttView("monthly")}>
          Monthly Report
        </button>
        <button className={`sp-att-view-btn ${attView === "defaulters" ? "active" : ""}`} onClick={() => setAttView("defaulters")}>
          Defaulters List (&lt; 75%)
        </button>
      </div>

      {/* Cascading Filter Card (Admin Replica) */}
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            <div className="cms-field">
              <label>Attendance Date</label>
              <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
            </div>
            <div className="cms-field">
              <label>Board</label>
              <select value={attBoard} onChange={(e) => setAttBoard(e.target.value)}>
                {attBoards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name || b.code}</option>
                ))}
              </select>
            </div>
            <div className="cms-field">
              <label>Academic Year</label>
              <select value={attYear} onChange={(e) => setAttYear(e.target.value)}>
                {attYears.length ? attYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                )) : <option value="">Loading active years...</option>}
              </select>
            </div>
            <div className="cms-field">
              <label>Academic Level</label>
              <select value={attLevel} onChange={(e) => setAttLevel(e.target.value)}>
                {attLevels.length ? attLevels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                )) : (
                  <>
                    <option value="1">Intermediate 1st Year (+1)</option>
                    <option value="2">Intermediate 2nd Year (+2)</option>
                  </>
                )}
              </select>
            </div>
            <div className="cms-field">
              <label>Group</label>
              <select value={attGroup} onChange={(e) => setAttGroup(e.target.value)}>
                {attGroups.length ? attGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                )) : (
                  <>
                    <option value="1">MPC (Maths, Physics, Chem)</option>
                    <option value="2">BiPC (Biology, Physics, Chem)</option>
                    <option value="3">MEC (Maths, Econ, Commerce)</option>
                  </>
                )}
              </select>
            </div>
            <div className="cms-field">
              <label>Section</label>
              <select value={attSection} onChange={(e) => setAttSection(e.target.value)}>
                {attSections.length ? attSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                )) : (
                  <>
                    <option value="1">Section A</option>
                    <option value="2">Section B</option>
                    <option value="3">Section C</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* View 1: Daily Attendance Table */}
      {attView === "daily" && (
        <div className="cms-card">
          <div className="cms-card-head">
            <h2>Student Attendance Sheet — {attDate}</h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {attDirty && <span style={{ fontSize: 12, color: "var(--cms-amber)", fontWeight: 700 }}>● Unsaved Changes</span>}
              <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>
                {attStudents.filter((s) => s.morningStatus === "Present").length} / {attStudents.length} Present
              </span>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ padding: "5px 12px", fontSize: 12.5 }}
                onClick={handleExportAttendanceSheet}
                title="Download whole class attendance sheet as Excel file"
              >
                <FileSpreadsheet size={14} /> Export Sheet
              </button>
            </div>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Morning Session</th>
                  <th>Afternoon Session</th>
                  <th>Remarks</th>
                  <th style={{ width: 60, textAlign: "center" }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {attStudents.map((s, idx) => (
                  <tr key={s.studentId} className={s.morningStatus === "Absent" && s.afternoonStatus === "Absent" ? "sp-absent-row" : ""}>
                    <td className="cms-strong">{idx + 1}</td>
                    <td className="cms-strong">{s.rollNo}</td>
                    <td>{s.admissionNo}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>
                      <div className="sp-session-toggle">
                        {["Present", "Absent", "Half Day"].map((st) => (
                          <button
                            key={st}
                            className={`sp-session-btn ${st.toLowerCase().replace(" ", "")}${s.morningStatus === st ? " active" : ""}`}
                            style={s.morningStatus === st ? { transform: "scale(1.05)", fontWeight: 800 } : { opacity: 0.6 }}
                            onClick={() => toggleSessionStatus(s.studentId, "morning", st)}
                          >
                            {st === "Half Day" ? "HD" : st[0]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="sp-session-toggle">
                        {["Present", "Absent", "Half Day"].map((st) => (
                          <button
                            key={st}
                            className={`sp-session-btn ${st.toLowerCase().replace(" ", "")}${s.afternoonStatus === st ? " active" : ""}`}
                            style={s.afternoonStatus === st ? { transform: "scale(1.05)", fontWeight: 800 } : { opacity: 0.6 }}
                            onClick={() => toggleSessionStatus(s.studentId, "afternoon", st)}
                          >
                            {st === "Half Day" ? "HD" : st[0]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        style={{ border: "1px solid var(--cms-border)", borderRadius: 6, padding: "4px 8px", fontSize: 12, width: 130 }}
                        value={s.remarks}
                        placeholder="Optional"
                        onChange={(e) => {
                          const val = e.target.value;
                          setAttStudents((prev) => prev.map((x) => x.studentId === s.studentId ? { ...x, remarks: val } : x));
                          setAttDirty(true);
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="cms-action-btn"
                        onClick={() => handleDownloadStudentSlip(s)}
                        title={`Download Attendance Slip for ${s.name}`}
                      >
                        <Download size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Monthly Report */}
      {attView === "monthly" && (
        <div className="cms-card">
          <div className="cms-card-head">
            <h2>Monthly Attendance Report</h2>
            <button className="cms-btn cms-btn-ghost" onClick={() => notify("Exporting monthly attendance CSV...")}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Total Classes</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attStudents.map((s) => (
                  <tr key={s.studentId}>
                    <td className="cms-strong">{s.rollNo}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.totalClasses}</td>
                    <td style={{ color: "var(--cms-green)", fontWeight: 700 }}>{s.presentCount}</td>
                    <td style={{ color: "var(--cms-red)", fontWeight: 700 }}>{s.totalClasses - s.presentCount}</td>
                    <td style={{ fontWeight: 800 }}>{s.attendancePct}%</td>
                    <td>
                      <span className={`cms-badge ${s.attendancePct >= 75 ? "cms-badge-active" : "cms-badge-danger"}`}>
                        {s.attendancePct >= 75 ? "Eligible" : "Shortage"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Defaulters */}
      {attView === "defaulters" && (
        <div className="cms-card">
          <div className="cms-card-head">
            <div>
              <h2>Attendance Defaulters (&lt; 75% Attendance)</h2>
              <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>Students not meeting the board exam hall-ticket criteria</div>
            </div>
            <span className="cms-badge cms-badge-danger">{attStudents.filter((s) => s.attendancePct < 75).length} Defaulters</span>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Classes Attended</th>
                  <th>Attendance %</th>
                  <th>Shortage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attStudents.filter((s) => s.attendancePct < 75).map((s) => (
                  <tr key={s.studentId}>
                    <td className="cms-strong">{s.rollNo}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.presentCount} / {s.totalClasses}</td>
                    <td style={{ color: "var(--cms-red)", fontWeight: 800 }}>{s.attendancePct}%</td>
                    <td style={{ color: "var(--cms-red)" }}>{(75 - s.attendancePct).toFixed(1)}% Shortage</td>
                    <td>
                      <button className="cms-btn cms-btn-ghost" style={{ fontSize: 11.5, padding: "4px 8px" }} onClick={() => notify(`Notice SMS sent to parent of ${s.name}`)}>
                        Send Notice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // 4. MARKS ENTRY & EVALUATION (1:1 Admin Replica via embedded MarksEntryPage)
  const renderMarks = () => (
    <MarksEntryPage embedded={true} />
  );

  // 5. EXAM DUTIES (Intermediate College Public & Internal Exams)
  const [examDutyTab, setExamDutyTab] = useState("all");

  const renderExamDuties = () => {
    const filteredDuties = dutiesList.filter((d) => {
      if (examDutyTab === "all") return true;
      return d.category === examDutyTab;
    });

    return (
      <div>
        <div className="cms-page-head">
          <div>
            <h1>Examination Duties</h1>
            <p>Assigned BIEAP/TSBIE Board examinations, practical examiner duties & internal unit tests.</p>
          </div>
          <button className="cms-btn cms-btn-ghost" onClick={() => notify("Exam duties schedule downloaded.")}>
            <Download size={14} /> Download Schedule
          </button>
        </div>

        {/* Category Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {[
            ["all", "All Duties"],
            ["board", "Board Theory (IPE)"],
            ["practical", "Practical Exams"],
            ["internal", "Internal Tests"],
          ].map(([k, lbl]) => (
            <button
              key={k}
              className={`cms-btn ${examDutyTab === k ? "cms-btn-primary" : "cms-btn-ghost"}`}
              onClick={() => setExamDutyTab(k)}
              style={{ fontSize: 13 }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="cms-grid-2">
          {filteredDuties.map((d) => (
            <div key={d.id} className="sp-duty-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span className={`cms-badge ${d.dutyType.includes("Invigilator") || d.dutyType.includes("Superintendent") ? "cms-badge-info" : "cms-badge-warn"}`}>
                  {d.dutyType}
                </span>
                <span className={`cms-badge ${d.status === "Completed" ? "cms-badge-active" : "cms-badge-warn"}`}>
                  {d.status}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{d.examName}</div>
              <div style={{ fontSize: 13, color: "var(--cms-primary-dark)", fontWeight: 700, marginBottom: 6 }}>
                📖 {d.subject} · Code: {d.examCode}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--cms-text-secondary)", marginBottom: 12 }}>
                <div>📅 Date & Session: <strong>{d.date} ({d.session})</strong></div>
                <div>⏰ Exam Hours: <strong>{d.startTime} – {d.endTime}</strong></div>
                <div>🚨 Reporting Time: <strong style={{ color: "var(--cms-red, #dc2626)" }}>{d.reportingTime}</strong></div>
                <div>📍 Venue: <strong>{d.venue}</strong></div>
                <div>👥 Candidates: <strong>{d.candidates}</strong></div>
              </div>

              {/* SOP Checklist */}
              {d.sops && (
                <div style={{ background: "var(--cms-subtle, #f9fafb)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--cms-border)", marginBottom: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "var(--cms-muted)", marginBottom: 6 }}>
                    Duty Guidelines & SOPs:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--cms-text-secondary)", lineHeight: 1.5 }}>
                    {d.sops.map((sop, sIdx) => <li key={sIdx}>{sop}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="cms-btn cms-btn-primary"
                  style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}
                  onClick={() => notify(`Allotment order for ${d.examCode} downloaded.`)}
                >
                  <Download size={13} /> Duty Order
                </button>
                <button
                  className="cms-btn cms-btn-ghost"
                  style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}
                  onClick={() => notify(`Duty acknowledged for ${d.examCode}`)}
                >
                  <Check size={13} /> Acknowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 6. MY ATTENDANCE (Staff Self-Punch & Monthly Attendance Calendar)
  const renderMyAttendance = () => {
    const handlePunchIn = () => {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const next = { isPunchedIn: true, inTime: timeStr, outTime: null, hoursWorked: "Just punched in" };
      setPunchState(next);
      localStorage.setItem("staff_punch_state", JSON.stringify(next));
      notify(`Checked In Successfully at ${timeStr}`, "success");
    };

    const handlePunchOut = () => {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const next = { ...punchState, isPunchedIn: false, outTime: timeStr };
      setPunchState(next);
      localStorage.setItem("staff_punch_state", JSON.stringify(next));
      notify(`Punched Out Successfully at ${timeStr}`, "success");
    };

    return (
      <div>
        <div className="cms-page-head">
          <div>
            <h1>My Attendance & Biometric Punch</h1>
            <p>Daily biometric check-in, punch times, shift logs & monthly attendance calendar.</p>
          </div>
          <button className="cms-btn cms-btn-primary" onClick={() => setShowRegularizeModal(true)}>
            <Clock size={14} /> Request Attendance Regularization
          </button>
        </div>

        {/* Punch In / Out Grid */}
        <div className="sp-attendance-punch-grid">
          {/* Live Digital Clock Card (High Contrast Bombproof) */}
          <div
            className="sp-live-clock-card"
            style={{
              background: "linear-gradient(135deg, #090d16 0%, #111827 100%)",
              color: "#ffffff",
              border: "1px solid #1f2937",
              boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
              padding: "24px 26px",
              borderRadius: 14,
            }}
          >
            <div>
              <span
                className="sp-live-badge"
                style={{
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  fontWeight: 800,
                }}
              >
                CAMPUS BIOMETRIC CLOCK
              </span>
              <div
                className="sp-live-clock-time"
                style={{
                  color: "#ffffff",
                  fontSize: 40,
                  fontWeight: 800,
                  textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                  margin: "12px 0 6px",
                  fontFamily: "monospace",
                }}
              >
                {liveClock}
              </div>
              <div
                className="sp-live-clock-date"
                style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 600 }}
              >
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            <div
              className="sp-clock-status-box"
              style={{
                marginTop: 20,
                padding: "14px 16px",
                background: "rgba(255, 255, 255, 0.06)",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="sp-clock-sublabel" style={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 600 }}>Punch Status:</span>
                <span className={`sp-punch-status-badge ${punchState.isPunchedIn ? "in" : "out"}`} style={{ fontWeight: 800 }}>
                  ● {punchState.isPunchedIn ? `Checked In (${punchState.inTime})` : "Checked Out"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span className="sp-clock-sublabel" style={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 600 }}>Shift Timings:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>08:30 AM – 04:30 PM (Morning Shift)</span>
              </div>
            </div>
          </div>

          {/* Punch Actions Form Card - Simplified */}
          <div className="sp-punch-form-card">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Punch Terminal Action</h3>
              <p style={{ fontSize: 12.5, color: "var(--cms-muted)", marginBottom: 16 }}>
                Click below to record your campus entry or exit timestamp. Instant biometric verification enabled.
              </p>

              <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--cms-surface)", border: "1px solid var(--cms-border)", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>Current Punch Status</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: punchState.isPunchedIn ? "var(--cms-green)" : "var(--cms-text)", marginTop: 4 }}>
                  {punchState.isPunchedIn ? `Active — Punched In at ${punchState.inTime}` : "Inactive — Currently Punched Out"}
                </div>
                <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 4 }}>
                  Terminal: <strong>Main Campus Gate 01 Bio-Station</strong>
                </div>
              </div>
            </div>

            <div className="sp-punch-actions-row">
              <button
                className="cms-btn cms-btn-primary"
                style={{ flex: 1, justifyContent: "center", padding: "13px 18px", fontSize: 14 }}
                disabled={punchState.isPunchedIn}
                onClick={handlePunchIn}
              >
                <Clock size={16} /> Punch In (Check-In)
              </button>
              <button
                className="cms-btn"
                style={{ flex: 1, justifyContent: "center", padding: "13px 18px", fontSize: 14, background: "#dc2626", color: "#fff" }}
                disabled={!punchState.isPunchedIn}
                onClick={handlePunchOut}
              >
                <LogOut size={16} /> Punch Out (Check-Out)
              </button>
            </div>
          </div>
        </div>

        {/* 4 Essential Monthly Attendance Metric Cards */}
        <div className="sp-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="cms-stat">
            <div className="cms-stat-icon tone-blue"><Calendar size={22} /></div>
            <div>
              <div className="cms-stat-label">Working Days</div>
              <div className="cms-stat-value">24 Days</div>
              <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Current Month</div>
            </div>
          </div>
          <div className="cms-stat">
            <div className="cms-stat-icon tone-green"><CheckCircle2 size={22} /></div>
            <div>
              <div className="cms-stat-label">Present Days</div>
              <div className="cms-stat-value" style={{ color: "var(--cms-green)" }}>22 Days</div>
              <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Biometric verified</div>
            </div>
          </div>
          <div className="cms-stat">
            <div className="cms-stat-icon tone-violet"><Briefcase size={22} /></div>
            <div>
              <div className="cms-stat-label">Approved Leaves</div>
              <div className="cms-stat-value">1 Day</div>
              <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>1 CL applied</div>
            </div>
          </div>
          <div className="cms-stat">
            <div className="cms-stat-icon tone-green"><Award size={22} /></div>
            <div>
              <div className="cms-stat-label">Punctuality Rate</div>
              <div className="cms-stat-value" style={{ color: "var(--cms-green)" }}>95.8%</div>
              <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Target: &ge; 90%</div>
            </div>
          </div>
        </div>

        {/* Daily Punch History Table */}
        <div className="cms-card">
          <div className="cms-card-head">
            <div>
              <h2>Biometric Punch History & Daily Attendance Logs</h2>
              <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>
                Records recorded from Campus Bio-Terminals & Web Punch
              </div>
            </div>
            <span className="cms-badge cms-badge-active">Verified Records</span>
          </div>

          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Shift</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Logged Hours</th>
                  <th>Biometric Device</th>
                  <th>Status</th>
                  <th>Regularization</th>
                </tr>
              </thead>
              <tbody>
                {punchLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="cms-strong">{log.date}</td>
                    <td>{log.day}</td>
                    <td>{log.shift}</td>
                    <td><strong style={{ color: log.inTime !== "--" ? "var(--cms-green)" : "inherit" }}>{log.inTime}</strong></td>
                    <td><strong>{log.outTime}</strong></td>
                    <td>{log.hours}</td>
                    <td style={{ fontSize: 12, color: "var(--cms-muted)" }}>{log.device}</td>
                    <td>
                      <span className={`cms-badge ${
                        log.status === "Present" ? "cms-badge-active" :
                        log.status === "Late" || log.status === "Half Day" ? "cms-badge-warn" :
                        log.status === "Leave" ? "cms-badge-danger" : "cms-badge-inactive"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      {log.canRegularize ? (
                        <button
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => {
                            setRegularizeForm(p => ({ ...p, date: log.date }));
                            setShowRegularizeModal(true);
                          }}
                        >
                          Regularize
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Regularization Modal */}
        {showRegularizeModal && (
          <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setShowRegularizeModal(false)}>
            <div className="cms-modal sm">
              <div className="cms-modal-head">
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Request Attendance Regularization</h3>
                  <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Submit adjustment for missed or late punch</span>
                </div>
                <button className="cms-icon-btn" onClick={() => setShowRegularizeModal(false)}><X size={16} /></button>
              </div>
              <div className="cms-modal-body">
                <div className="cms-form-grid">
                  <div className="cms-field full">
                    <label>Date of Incident <span className="req">*</span></label>
                    <input
                      type="date"
                      value={regularizeForm.date || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setRegularizeForm({ ...regularizeForm, date: e.target.value })}
                    />
                  </div>
                  <div className="cms-field full">
                    <label>Reason for Regularization <span className="req">*</span></label>
                    <select
                      value={regularizeForm.reason}
                      onChange={(e) => setRegularizeForm({ ...regularizeForm, reason: e.target.value })}
                    >
                      <option>Forgot Biometric Punch</option>
                      <option>Biometric Scanner / Power Outage</option>
                      <option>On-Duty / Board Examination Duty</option>
                      <option>Official Campus Assignment</option>
                      <option>Emergency Late Arrival</option>
                    </select>
                  </div>
                  <div className="cms-field">
                    <label>Proposed Punch In</label>
                    <input
                      type="text"
                      value={regularizeForm.inTime}
                      onChange={(e) => setRegularizeForm({ ...regularizeForm, inTime: e.target.value })}
                    />
                  </div>
                  <div className="cms-field">
                    <label>Proposed Punch Out</label>
                    <input
                      type="text"
                      value={regularizeForm.outTime}
                      onChange={(e) => setRegularizeForm({ ...regularizeForm, outTime: e.target.value })}
                    />
                  </div>
                  <div className="cms-field full">
                    <label>Explanation & Notes <span className="req">*</span></label>
                    <textarea
                      rows={2}
                      placeholder="Briefly state reason for attendance adjustment..."
                      value={regularizeForm.notes}
                      onChange={(e) => setRegularizeForm({ ...regularizeForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="cms-modal-foot">
                <button className="cms-btn cms-btn-ghost" onClick={() => setShowRegularizeModal(false)}>Cancel</button>
                <button
                  className="cms-btn cms-btn-primary"
                  onClick={() => {
                    notify("Attendance Regularization request submitted to Principal office!");
                    setShowRegularizeModal(false);
                  }}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 6. LEAVE MANAGEMENT
  const renderLeave = () => (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Leave Management</h1>
          <p>Apply for casual, sick, or earned leave and track approval status.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setShowLeaveModal(true)}>
          <Plus size={14} /> Apply Leave
        </button>
      </div>

      {/* Leave Balances Strip (Aligned with Admin Settings) */}
      <div className="sp-stat-grid" style={{ marginBottom: 16 }}>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">Casual Leave (CL)</div><div className="cms-stat-value">8 / 12 Days</div></div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-blue"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">Sick Leave (SL)</div><div className="cms-stat-value">7 / 10 Days</div></div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-amber"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">Earned Leave (EL)</div><div className="cms-stat-value">15 / 15 Days</div></div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-violet"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">On-Duty (OD)</div><div className="cms-stat-value">6 / 8 Days</div></div>
        </div>
      </div>

      {/* History Table */}
      <div className="cms-card">
        <div className="cms-card-head"><h2>Leave Applications History</h2></div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>Approver</th>
              </tr>
            </thead>
            <tbody>
              {leaveList.map((l) => (
                <tr key={l.id}>
                  <td className="cms-strong">{l.type}</td>
                  <td>{l.fromDate}</td>
                  <td>{l.toDate}</td>
                  <td><strong>{l.totalDays}</strong></td>
                  <td>{l.reason}</td>
                  <td style={{ color: "var(--cms-muted)" }}>{l.appliedOn}</td>
                  <td><span className={`cms-badge ${STATUS_BADGE[l.status]}`}>{l.status}</span></td>
                  <td>{l.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setShowLeaveModal(false)}>
          <div className="cms-modal sm">
            <div className="cms-modal-head">
              <h3>Apply for Staff Leave</h3>
              <button className="cms-icon-btn" onClick={() => setShowLeaveModal(false)}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label>Leave Type <span className="req">*</span></label>
                  <select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                    {leaveCategories.map((c) => (
                      <option key={c.code || c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="cms-field">
                  <label>From Date <span className="req">*</span></label>
                  <input type="date" value={leaveForm.fromDate} onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })} />
                </div>
                <div className="cms-field">
                  <label>To Date <span className="req">*</span></label>
                  <input type="date" value={leaveForm.toDate} onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })} />
                </div>
                <div className="cms-field full">
                  <label>Reason for Leave <span className="req">*</span></label>
                  <textarea rows={3} value={leaveForm.reason} placeholder="State reason clearly..." onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button className="cms-btn cms-btn-primary" onClick={applyLeave} disabled={leaveSubmitting}>
                {leaveSubmitting ? <Loader2 size={14} className="spin" /> : null} Submit Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 7. SALARY & PAYSLIPS (Mirrored from Pirnav HRMS UserPayslip)
  const renderSalary = () => {
    const current = payslipList[0];
    const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
    return (
      <div className="payslip-container">
        {/* Header */}
        <div className="payslip-header">
          <div>
            <h1 className="main-title">My Payslips</h1>
            <p className="subtitle">Track your salary, deductions and downloads</p>
          </div>
          <div className="header-badge">
            <Wallet size={15} />
            <span>{payslipList.length} Records</span>
          </div>
        </div>

        {/* Current Payslip Card */}
        {current && (
          <div className="payslip-card current-card">
            <div className="card-top">
              <div className="section-title-wrap">
                <Wallet size={18} color="var(--cms-primary)" />
                <h2>Current Payslip</h2>
              </div>
              <div className="month-badge">
                <Calendar size={13} />
                <span>{current.month}</span>
              </div>
            </div>

            {/* 3 Salary Boxes */}
            <div className="salary-cards">
              <div className="salary-box gross-box">
                <p>Gross Salary</p>
                <h3>{fmt(current.grossSalary)}</h3>
              </div>
              <div className="salary-box deduction-box">
                <p>Deductions</p>
                <h3>{fmt(current.totalDeductions)}</h3>
              </div>
              <div className="salary-box net-box">
                <p>Net Pay</p>
                <h3>{fmt(current.netSalary)}</h3>
              </div>
            </div>

            <div className="action-buttons">
              <button className="view-btn" onClick={() => setViewingPayslip(current)}>
                <Eye size={15} /> View Payslip
              </button>
              <button className="download-btn" onClick={() => notify(`Downloading payslip for ${current.month}...`)}>
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        )}

        {/* Past Payslips Card */}
        <div className="payslip-card">
          <div className="past-header">
            <div className="section-title-wrap">
              <CalendarClock size={18} color="var(--cms-muted)" />
              <h2>Past Payslips</h2>
            </div>
          </div>

          <div>
            {payslipList.slice(1).map((p) => (
              <div key={p.id} className="past-item">
                <div className="past-left">
                  <div style={{ background: "var(--cms-primary-soft)", padding: 8, borderRadius: 8, color: "var(--cms-primary)" }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h4>{p.month}</h4>
                    <p>Net Salary: <strong>{fmt(p.netSalary)}</strong></p>
                  </div>
                </div>
                <div className="icons">
                  <button className="icon-btn" title="View Payslip" onClick={() => setViewingPayslip(p)}>
                    <Eye size={15} />
                  </button>
                  <button className="icon-btn" title="Download PDF" onClick={() => notify(`Downloading payslip for ${p.month}...`)}>
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Itemized Payslip Modal */}
        {viewingPayslip && (
          <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setViewingPayslip(null)}>
            <div className="cms-modal">
              <div className="cms-modal-head">
                <div>
                  <h3 style={{ margin: 0 }}>Payslip — {viewingPayslip.month}</h3>
                  <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Employee ID: {profileData.employeeId} · {profileData.fullName}</span>
                </div>
                <button className="cms-icon-btn" onClick={() => setViewingPayslip(null)}><X size={16} /></button>
              </div>
              <div className="cms-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {/* Earnings */}
                  <div>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--cms-green)", fontSize: 13, fontWeight: 800 }}>EARNINGS</h4>
                    <table className="sp-payslip-table">
                      <tbody>
                        <tr><td>Basic Pay</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.basicPay)}</td></tr>
                        <tr><td>House Rent Allowance (HRA)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.hra)}</td></tr>
                        <tr><td>Dearness Allowance (DA)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.da)}</td></tr>
                        <tr><td>Special Allowance</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.specialAllowance)}</td></tr>
                        <tr style={{ background: "var(--cms-primary-soft)" }}>
                          <td><strong>Gross Earnings</strong></td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "var(--cms-primary-dark)" }}>{fmt(viewingPayslip.grossSalary)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--cms-red)", fontSize: 13, fontWeight: 800 }}>DEDUCTIONS</h4>
                    <table className="sp-payslip-table">
                      <tbody>
                        <tr><td>Provident Fund (PF)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.pf)}</td></tr>
                        <tr><td>Professional Tax (PT)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.pt)}</td></tr>
                        <tr><td>TDS (Income Tax)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.tds)}</td></tr>
                        <tr style={{ background: "var(--cms-red-soft)" }}>
                          <td><strong>Total Deductions</strong></td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "var(--cms-red)" }}>{fmt(viewingPayslip.totalDeductions)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sp-payslip-total" style={{ marginTop: 20 }}>
                  <span>NET SALARY PAYABLE</span>
                  <span>{fmt(viewingPayslip.netSalary)}</span>
                </div>
              </div>
              <div className="cms-modal-foot">
                <button className="cms-btn cms-btn-ghost" onClick={() => setViewingPayslip(null)}>Close</button>
                <button className="cms-btn cms-btn-primary" onClick={() => notify("Printing payslip...")}>
                  <Printer size={14} /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 8. REIMBURSEMENTS (With Proof Upload Field)
  const renderReimbursements = () => (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Reimbursements</h1>
          <p>Submit and track expense claims with supporting bills or proof documents.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setShowReimbModal(true)}>
          <Plus size={14} /> New Claim
        </button>
      </div>

      <div className="cms-card">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Type</th>
                <th>Claimed Amount</th>
                <th>Approved Amount</th>
                <th>Date</th>
                <th>Proof Document</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reimbList.map((r) => (
                <tr key={r.id}>
                  <td className="cms-strong">{r.claimId}</td>
                  <td>{r.type}</td>
                  <td>₹{Number(r.claimed || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>₹{Number(r.approved || 0).toLocaleString()}</td>
                  <td>{r.date}</td>
                  <td>
                    {r.proofName && r.proofName !== "None" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--cms-primary)" }}>
                        <Paperclip size={13} /> {r.proofName}
                      </span>
                    ) : (
                      <span style={{ color: "var(--cms-muted)", fontSize: 12 }}>None</span>
                    )}
                  </td>
                  <td><span className={`cms-badge ${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Claim Modal */}
      {showReimbModal && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setShowReimbModal(false)}>
          <div className="cms-modal sm">
            <div className="cms-modal-head">
              <h3>New Reimbursement Claim</h3>
              <button className="cms-icon-btn" onClick={() => setShowReimbModal(false)}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label>Claim Category <span className="req">*</span></label>
                  <select value={reimbForm.type} onChange={(e) => setReimbForm({ ...reimbForm, type: e.target.value })}>
                    {["Books & Journals", "Academic Conference", "Travel & Field Trip", "Medical Expense", "Stationery & Supplies", "Other"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="cms-field">
                  <label>Amount (₹) <span className="req">*</span></label>
                  <input type="number" min={0} value={reimbForm.amount} placeholder="0" onChange={(e) => setReimbForm({ ...reimbForm, amount: e.target.value })} />
                </div>
                <div className="cms-field full">
                  <label>Proof / Receipt Attachment (Photo, Screenshot or PDF) <span className="req">*</span></label>
                  <div
                    className="sp-proof-upload-box"
                    onClick={() => reimbFileInputRef.current?.click()}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Upload size={17} color="var(--cms-primary)" />
                      <span style={{ fontSize: 13, color: reimbForm.file ? "var(--cms-text)" : "var(--cms-muted)" }}>
                        {reimbForm.file ? reimbForm.file.name : "Choose receipt image (PNG, JPG) or PDF file..."}
                      </span>
                    </div>
                    <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }}>
                      Browse File
                    </button>
                    <input
                      ref={reimbFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setReimbForm((p) => ({ ...p, file }));
                      }}
                    />
                  </div>
                  {reimbForm.file && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="sp-proof-chip">
                        <Paperclip size={13} /> {reimbForm.file.name} ({(reimbForm.file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        className="cms-action-btn danger"
                        onClick={() => setReimbForm((p) => ({ ...p, file: null }))}
                        title="Remove file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="cms-field full">
                  <label>Description & Purpose <span className="req">*</span></label>
                  <textarea rows={2} value={reimbForm.desc} placeholder="Detail the expenditure..." onChange={(e) => setReimbForm({ ...reimbForm, desc: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setShowReimbModal(false)}>Cancel</button>
              <button className="cms-btn cms-btn-primary" onClick={submitReimbursement} disabled={reimbSubmitting}>
                {reimbSubmitting ? <Loader2 size={14} className="spin" /> : null} Submit Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 9. MY PROFILE (Guided Step-by-Step Wizard: Steps 1 to 6)
  const PROFILE_STEPS = [
    { id: 1, title: "Personal Info", subtitle: "Personal Information" },
    { id: 2, title: "Bank Info", subtitle: "Bank Details" },
    { id: 3, title: "Address Info", subtitle: "Address Information" },
    { id: 4, title: "Experience", subtitle: "Experience Details" },
    { id: 5, title: "Documents", subtitle: "Upload Documents" },
    { id: 6, title: "Preview", subtitle: "Review & Confirmation" },
  ];

  const handleSaveAndNext = () => {
    if (isEditingProfile) {
      persistStaffProfile(profileData);
      notify(`Step ${profileStep} (${PROFILE_STEPS[profileStep - 1].title}) updated!`);
    }
    if (profileStep < 6) {
      setProfileStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    if (profileStep < 6) {
      setProfileStep((s) => s + 1);
    }
  };

  const handleFinalProfileSave = () => {
    setIsSavingProfile(true);
    setTimeout(() => {
      persistStaffProfile(profileData);
      try {
        localStorage.setItem("staff_profile_submitted", "true");
      } catch {}
      setIsSavingProfile(false);
      setIsEditingProfile(false);
      notify("Complete staff profile updated and verified successfully!");
    }, 400);
  };

  const renderProfile = () => (
    <div>
      {/* Page Header */}
      <div className="cms-page-head">
        <div>
          <h1>My Profile</h1>
          <p>{isEditingProfile ? "You can now edit your profile details" : "Complete your profile step by step"}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--cms-primary, #6F8400)",
              background: "var(--cms-primary-soft, #f7f9ee)",
              border: "1px solid var(--cms-primary-soft-border, #e2e8b8)",
              padding: "6px 14px",
              borderRadius: "20px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {profileCompletion}% Profile Completed
          </span>
          <button
            type="button"
            className="cms-btn cms-btn-secondary"
            onClick={handleDownloadProfile}
            disabled={isDownloadingPdf}
            title="Download PDF"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 size={14} className="spin" /> Generating PDF...
              </>
            ) : (
              <>
                <Download size={14} /> Download PDF
              </>
            )}
          </button>
          <button
            type="button"
            className={`cms-btn ${isEditingProfile ? "cms-btn-secondary" : "cms-btn-primary"}`}
            onClick={() => setIsEditingProfile((prev) => !prev)}
            title={isEditingProfile ? "Cancel Edit" : "Edit Profile"}
          >
            <Edit3 size={14} /> {isEditingProfile ? "Cancel Edit" : "Edit"}
          </button>
        </div>
      </div>

      {/* Staff Identity Strip with Instagram-style Profile Photo Edit */}
      <div className="cms-card" style={{ marginBottom: 18 }}>
        <div className="cms-card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            {/* Instagram-style Avatar with Camera Edit Badge */}
            <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
              <div
                className="sp-profile-avatar"
                onClick={() => {
                  if (isEditingProfile) avatarRef.current?.click();
                }}
                title={isEditingProfile ? "Click to Change Profile Photo" : profileData.fullName}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  cursor: isEditingProfile ? "pointer" : "default",
                  overflow: "hidden",
                  border: "3px solid var(--cms-primary-soft, #e9edc9)",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, var(--cms-primary), #4e5f00)",
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: 800,
                  position: "relative",
                }}
              >
                {profileData.photoUrl ? (
                  <img
                    src={profileData.photoUrl}
                    alt={profileData.fullName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Instagram-style Camera Icon Badge directly on photo bottom-right corner - ONLY when isEditingProfile */}
              {isEditingProfile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    avatarRef.current?.click();
                  }}
                  title="Change Photo"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--cms-primary, #6F8400)",
                    color: "#ffffff",
                    border: "2.5px solid #ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Camera size={14} strokeWidth={2.5} />
                </button>
              )}

              <input
                ref={avatarRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />
            </div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{profileData.fullName}</div>
              <div style={{ color: "var(--cms-text-secondary)", fontSize: 13.5, marginTop: 2 }}>
                {profileData.designation} · {profileData.department}
              </div>
              <div style={{ color: "var(--cms-muted)", fontSize: 12.5, marginTop: 2 }}>
                ID: <strong style={{ color: "var(--cms-primary)" }}>{profileData.employeeId}</strong> · {profileData.staffType || "Teaching"} Staff · Board: {profileData.board || "BIEAP"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Wizard Stepper (Steps 1 to 6 - Non-clickable navigation via Save & Next) */}
      <div className="sp-wizard-stepper">
        {PROFILE_STEPS.map((step) => {
          const isActive = profileStep === step.id;
          const isCompleted = profileStep > step.id;
          return (
            <div
              key={step.id}
              className={`sp-wizard-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              style={{ cursor: "default" }}
              title={`Step ${step.id}: ${step.title}`}
            >
              <div className="sp-wizard-num">
                {isCompleted ? <Check size={14} /> : step.id}
              </div>
              <span className="sp-wizard-title">{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* Step Form Card */}
      <div className={`cms-card ${isEditingProfile ? "sp-profile-edit-mode" : "sp-profile-view-mode"}`}>
        <div className="cms-card-body" style={{ padding: "24px" }}>
          {/* STEP 1: PERSONAL INFORMATION */}
          {profileStep === 1 && (
            <div>
              <div className="cms-card-head" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Personal Information</h3>
                <span className="cms-badge cms-badge-info">Step 1 of 6</span>
              </div>
              <div className="cms-form-grid">
                <div className="cms-field">
                  <label>Employee ID <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.employeeId || ""}
                    readOnly
                    disabled
                    style={{ background: "var(--cms-subtle, #f8f9fa)", cursor: "not-allowed", fontWeight: 700 }}
                  />
                </div>
                <div className="cms-field">
                  <label>First Name <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.firstName || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => {
                      const f = e.target.value;
                      setProfileData({ ...profileData, firstName: f, fullName: `${f} ${profileData.lastName || ""}`.trim() });
                    }}
                    placeholder="e.g. Devendra Kumar"
                  />
                </div>

                <div className="cms-field">
                  <label>Middle Name</label>
                  <input
                    type="text"
                    value={profileData.middleName || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, middleName: e.target.value })}
                    placeholder="Middle Name (Optional)"
                  />
                </div>
                <div className="cms-field">
                  <label>Last Name <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.lastName || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => {
                      const l = e.target.value;
                      setProfileData({ ...profileData, lastName: l, fullName: `${profileData.firstName || ""} ${l}`.trim() });
                    }}
                    placeholder="e.g. Gummadi"
                  />
                </div>

                <div className="cms-field">
                  <label>Gender <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <select
                    value={profileData.gender || "Male"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="cms-field">
                  <label>Marital Status <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <select
                    value={profileData.maritalStatus || "Single"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, maritalStatus: e.target.value })}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="cms-field">
                  <label>Date of Birth <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="date"
                    value={profileData.dob || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                  />
                </div>
                <div className="cms-field">
                  <label>Phone Number <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="tel"
                    value={profileData.mobile || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                    placeholder="e.g. 9951604989"
                  />
                </div>

                <div className="cms-field">
                  <label>Email <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="email"
                    value={profileData.email || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="e.g. gummadi.devendrakumar@pirnav.com"
                  />
                </div>
                <div className="cms-field">
                  <label>Aadhaar Number <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    maxLength={14}
                    value={profileData.aadhaar || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, aadhaar: e.target.value })}
                    placeholder="e.g. 243440489147"
                  />
                </div>

                <div className="cms-field">
                  <label>PAN Number <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    maxLength={10}
                    value={profileData.pan || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. EHKPG8558N"
                  />
                </div>
                <div className="cms-field">
                  <label>Department <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <select
                    value={profileData.department || "IT"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  >
                    {[
                      "IT", "Mathematics", "Physics", "Chemistry", "English",
                      "Botany", "Zoology", "Commerce", "Economics", "Civics",
                      "Administration", "Accounts", "Library", "Physical Education"
                    ].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="cms-field">
                  <label>Designation <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <select
                    value={profileData.designation || "Associate Software Engineer"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                  >
                    {[
                      "Associate Software Engineer",
                      "Software Engineer",
                      "Junior Lecturer",
                      "Senior Lecturer",
                      "Lecturer",
                      "Head of Department (HOD)",
                      "Assistant Professor",
                      "Associate Professor",
                      "Professor",
                      "Lab Technician",
                      "Office Assistant",
                    ].map((des) => (
                      <option key={des} value={des}>{des}</option>
                    ))}
                  </select>
                </div>
                <div className="cms-field">
                  <label>Date of Joining <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="date"
                    value={profileData.dateOfJoining || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, dateOfJoining: e.target.value })}
                  />
                </div>

                <div className="cms-field">
                  {/* Blood Group without star mandatory mark */}
                  <label>Blood Group</label>
                  <select
                    value={profileData.bloodGroup || "O-"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, bloodGroup: e.target.value })}
                  >
                    {["O-", "O+", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BANK DETAILS */}
          {profileStep === 2 && (
            <div>
              <div className="cms-card-head" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bank Details</h3>
                <span className="cms-badge cms-badge-info">Step 2 of 6</span>
              </div>
              <div className="cms-form-grid">
                <div className="cms-field">
                  <label>Bank Name</label>
                  <select
                    value={profileData.bankName || "State Bank of India"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, bankName: e.target.value })}
                  >
                    {[
                      "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank",
                      "Canara Bank", "Union Bank of India", "Punjab National Bank",
                      "Bank of Baroda", "Kotak Mahindra Bank", "Other",
                    ].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="cms-field">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    value={profileData.accountHolder || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, accountHolder: e.target.value })}
                    placeholder="e.g. Devendra Kumar Gummadi"
                  />
                </div>
                <div className="cms-field">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={profileData.accountNumber || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, accountNumber: e.target.value })}
                    placeholder="e.g. 38920194823482"
                  />
                </div>
                <div className="cms-field">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={profileData.ifsc || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, ifsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                  />
                </div>
                <div className="cms-field">
                  <label>Branch Name</label>
                  <input
                    type="text"
                    value={profileData.branch || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, branch: e.target.value })}
                    placeholder="e.g. Guntur Main Branch"
                  />
                </div>
                <div className="cms-field">
                  <label>Account Type</label>
                  <select
                    value={profileData.accountType || "Salary Account"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, accountType: e.target.value })}
                  >
                    <option value="Salary Account">Salary Account</option>
                    <option value="Savings Account">Savings Account</option>
                    <option value="Current Account">Current Account</option>
                  </select>
                </div>
                <div className="cms-field">
                  <label>PF Number / UAN</label>
                  <input
                    type="text"
                    value={profileData.uanNumber || profileData.pfNumber || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, uanNumber: e.target.value, pfNumber: e.target.value })}
                    placeholder="e.g. 200982349812"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS INFO (Pincode in place of District with auto-fetch of District, State, Country) */}
          {profileStep === 3 && (
            <div>
              <div className="cms-card-head" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Address Information</h3>
                <span className="cms-badge cms-badge-info">Step 3 of 6</span>
              </div>
              <div className="cms-form-grid">
                <div className="cms-field">
                  <label>House Number <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.houseNumber || profileData.address || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, houseNumber: e.target.value, address: e.target.value })}
                    placeholder="e.g. 15-18-387"
                  />
                </div>
                <div className="cms-field">
                  <label>Street / Area <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.street || profileData.streetArea || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, street: e.target.value, streetArea: e.target.value })}
                    placeholder="e.g. Brindavan Gardens"
                  />
                </div>
                <div className="cms-field">
                  <label>City / Village <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.city || profileData.cityVillage || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value, cityVillage: e.target.value })}
                    placeholder="e.g. Guntur"
                  />
                </div>

                {/* Pincode moved to District's position with auto-fetch */}
                <div className="cms-field">
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Pincode <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></span>
                    {isFetchingPin && (
                      <span style={{ fontSize: 11, color: "var(--cms-primary)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Loader2 size={11} className="spin" /> Auto-fetching location...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={profileData.pin || profileData.pincode || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Enter 6-digit PIN (e.g. 522007)"
                  />
                </div>

                <div className="cms-field">
                  <label>District <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.district || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, district: e.target.value })}
                    placeholder="Auto-filled from PIN (e.g. Guntur)"
                  />
                </div>
                <div className="cms-field">
                  <label>State <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.state || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                    placeholder="Auto-filled from PIN (e.g. Andhra Pradesh)"
                  />
                </div>
                <div className="cms-field">
                  <label>Country <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                  <input
                    type="text"
                    value={profileData.country || "India"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                    placeholder="e.g. India"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EXPERIENCE */}
          {profileStep === 4 && (
            <div>
              <div className="cms-card-head" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Experience</h3>
                  <p style={{ margin: "4px 0 0", color: "var(--cms-muted)", fontSize: 12 }}>
                    Add your previous or current teaching &amp; academic experience below.
                  </p>
                </div>
                <span className="cms-badge cms-badge-info">Step 4 of 6</span>
              </div>

              {/* Blank input form for adding new experience */}
              <div style={{ background: "var(--cms-subtle, #f8f9fa)", padding: "18px", borderRadius: "10px", border: "1px solid var(--cms-border)", marginBottom: "20px" }}>
                <div className="cms-form-grid">
                  <div className="cms-field">
                    <label>Institution / College Name</label>
                    <input
                      type="text"
                      value={newExp.institution}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, institution: e.target.value })}
                      placeholder="e.g. Sri Chaitanya Junior College"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Designation</label>
                    <input
                      type="text"
                      value={newExp.designation}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, designation: e.target.value })}
                      placeholder="e.g. Lecturer Mathematics"
                    />
                  </div>
                  <div className="cms-field">
                    <label>From Date</label>
                    <input
                      type="date"
                      value={newExp.fromDate}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, fromDate: e.target.value })}
                    />
                  </div>
                  <div className="cms-field">
                    <label>To Date</label>
                    <input
                      type="date"
                      value={newExp.toDate || ""}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, toDate: e.target.value })}
                    />
                  </div>
                  <div className="cms-field">
                    <label>Subjects Teached</label>
                    <select
                      value={newExp.subjectsTeached}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, subjectsTeached: e.target.value })}
                    >
                      <option value="">-- Select Subject Teached --</option>
                      {availableSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div className="cms-field">
                    <label>Total Experience</label>
                    <input
                      type="text"
                      value={newExp.totalExp}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, totalExp: e.target.value })}
                      placeholder="e.g. 2 Years 6 Months"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    disabled={!isEditingProfile}
                    onClick={() => {
                      if (!isEditingProfile) {
                        notify("Please click 'Edit' in the top right corner to add experience.", "warning");
                        return;
                      }
                      if (!newExp.institution.trim()) {
                        notify("Please enter the institution name.", "error");
                        return;
                      }
                      if (!newExp.designation.trim()) {
                        notify("Please enter your designation.", "error");
                        return;
                      }
                      const record = {
                        id: Date.now(),
                        institution: newExp.institution.trim(),
                        designation: newExp.designation.trim(),
                        fromDate: newExp.fromDate || "—",
                        toDate: newExp.toDate || "—",
                        subjectsTeached: newExp.subjectsTeached || "—",
                        totalExp: newExp.totalExp || "1 Year",
                        status: "Verified",
                      };
                      const updatedExp = [...(profileData.experience || []), record];
                      setProfileData({ ...profileData, experience: updatedExp });
                      persistStaffProfile({ ...profileData, experience: updatedExp });
                      setNewExp({
                        institution: "",
                        designation: "",
                        fromDate: "",
                        toDate: "",
                        subjectsTeached: "",
                        totalExp: "",
                      });
                      notify("Experience record added successfully!");
                    }}
                  >
                    Add Experience
                  </button>
                </div>
              </div>

              {/* Added Experiences List */}
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 10px" }}>
                Experience History ({profileData.experience?.length || 0})
              </h4>
              {(!profileData.experience || !profileData.experience.length) ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--cms-muted)", background: "var(--cms-subtle, #f8f9fa)", borderRadius: 8, border: "1px dashed var(--cms-border)" }}>
                  No experience records added yet. Fill out the form above and click "Add Experience".
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>Institution</th>
                        <th>Designation</th>
                        <th>From Date</th>
                        <th>To Date</th>
                        <th>Subjects Teached</th>
                        <th>Total Exp</th>
                        <th>Status</th>
                        {isEditingProfile && <th style={{ textAlign: "center" }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.experience.map((x) => (
                        <tr key={x.id}>
                          <td className="cms-strong">{x.institution}</td>
                          <td>{x.designation}</td>
                          <td>{x.fromDate}</td>
                          <td>{x.toDate}</td>
                          <td><span className="cms-badge cms-badge-info">{x.subjectsTeached || x.subjectsTaught || "—"}</span></td>
                          <td>{x.totalExp}</td>
                          <td><span className={`cms-badge ${x.status === "Active" ? "cms-badge-active" : "cms-badge-info"}`}>{x.status || "Verified"}</span></td>
                          {isEditingProfile && (
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="cms-action-btn"
                                style={{ color: "var(--cms-red)" }}
                                onClick={() => {
                                  const updated = profileData.experience.filter((item) => item.id !== x.id);
                                  setProfileData({ ...profileData, experience: updated });
                                  persistStaffProfile({ ...profileData, experience: updated });
                                  notify("Experience record removed.");
                                }}
                                title="Delete Experience"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DOCUMENTS */}
          {profileStep === 5 && (
            <div>
              <div className="cms-card-head" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Upload Documents</h3>
                  <p style={{ margin: "4px 0 0", color: "var(--cms-muted)", fontSize: 12 }}>
                    Upload identity cards, educational certificates, and employment proofs.
                  </p>
                </div>
                <span className="cms-badge cms-badge-info">Step 5 of 6</span>
              </div>

              {/* Upload Form */}
              <div style={{ background: "var(--cms-subtle, #f8f9fa)", padding: "18px", borderRadius: "10px", border: "1px solid var(--cms-border)", marginBottom: "20px" }}>
                <div className="cms-form-grid">
                  <div className="cms-field">
                    <label>Document Type <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                    <select
                      value={newDoc.type}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value, title: newDoc.title || e.target.value })}
                    >
                      {[
                        "Aadhaar Card Copy",
                        "PAN Card Copy",
                        "Degree Certificate",
                        "Post Graduation Certificate",
                        "Experience Certificate",
                        "Relieving Letter",
                        "Passport Photo",
                        "Resume / CV",
                        "Bank Passbook / Cheque",
                        "Other Document",
                      ].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="cms-field">
                    <label>Document Title / Description</label>
                    <input
                      type="text"
                      value={newDoc.title}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      placeholder="e.g. Degree Certificate (Original Copy)"
                    />
                  </div>
                  <div className="cms-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Select Document File <span style={{ color: "var(--cms-red, #dc2626)" }}>*</span></label>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        ref={docFileRef}
                        type="file"
                        disabled={!isEditingProfile}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                      />
                      <button
                        type="button"
                        className="cms-btn cms-btn-primary"
                        disabled={!isEditingProfile}
                        onClick={() => {
                          if (!isEditingProfile) {
                            notify("Please click 'Edit' in the top right corner to upload documents.", "warning");
                            return;
                          }
                          if (!newDoc.file) {
                            notify("Please select a file to upload.", "error");
                            return;
                          }
                          const docRecord = {
                            id: `doc-${Date.now()}`,
                            name: newDoc.title.trim() || newDoc.type,
                            type: newDoc.type,
                            format: newDoc.file.name.split('.').pop().toUpperCase(),
                            size: `${(newDoc.file.size / 1024).toFixed(1)} KB`,
                            date: new Date().toISOString().split("T")[0],
                            status: "Uploaded",
                            url: URL.createObjectURL(newDoc.file),
                          };
                          const updatedDocs = [...(profileData.documents || []), docRecord];
                          setProfileData({ ...profileData, documents: updatedDocs });
                          persistStaffProfile({ ...profileData, documents: updatedDocs });
                          setNewDoc({ type: "Aadhaar Card Copy", title: "", file: null });
                          if (docFileRef.current) docFileRef.current.value = "";
                          notify("Document uploaded successfully!");
                        }}
                      >
                        <UploadCloud size={14} /> Upload Document
                      </button>
                    </div>
                    <small style={{ color: "var(--cms-muted)", marginTop: 6, display: "block" }}>
                      Supported formats: PDF, JPG, PNG, DOCX (Max 5MB)
                    </small>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 10px" }}>
                Uploaded Documents ({profileData.documents?.length || 0})
              </h4>
              {(!profileData.documents || !profileData.documents.length) ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--cms-muted)", background: "var(--cms-subtle, #f8f9fa)", borderRadius: 8, border: "1px dashed var(--cms-border)" }}>
                  No documents uploaded yet. Use the form above to upload required documents.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>Document Name</th>
                        <th>Type</th>
                        <th>Format</th>
                        <th>File Size</th>
                        <th>Upload Date</th>
                        <th>Verification</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.documents.map((d) => (
                        <tr key={d.id}>
                          <td className="cms-strong">{d.name}</td>
                          <td>{d.type}</td>
                          <td><span className="cms-badge cms-badge-info">{d.format || d.type}</span></td>
                          <td>{d.size}</td>
                          <td>{d.date || "—"}</td>
                          <td><span className="cms-badge cms-badge-active">{d.status || "Verified"}</span></td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                type="button"
                                className="cms-action-btn"
                                onClick={() => {
                                  if (d.url) window.open(d.url, "_blank");
                                  else notify(`Viewing ${d.name}...`);
                                }}
                                title="View Document"
                              >
                                <Eye size={13} />
                              </button>
                              {isEditingProfile && (
                                <button
                                  type="button"
                                  className="cms-action-btn"
                                  style={{ color: "var(--cms-red)" }}
                                  onClick={() => {
                                    const updated = profileData.documents.filter((item) => item.id !== d.id);
                                    setProfileData({ ...profileData, documents: updated });
                                    persistStaffProfile({ ...profileData, documents: updated });
                                    notify("Document removed.");
                                  }}
                                  title="Delete Document"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: PREVIEW (Review & Submit - Exact replica of HRMS design & structure) */}
          {profileStep === 6 && (
            <div>
              {/* Review & Submit Header */}
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "var(--cms-text, #0f172a)" }}>
                  Review &amp; Submit
                </h3>
                <p style={{ margin: 0, color: "var(--cms-muted, #64748b)", fontSize: 13 }}>
                  Review the saved employee details below before final submission.
                </p>
              </div>

              {/* 1. Personal Information Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Personal Information</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(1);
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EMPLOYEE ID</div>
                    <div className="sp-preview-value">{profileData.employeeId || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">FULL NAME</div>
                    <div className="sp-preview-value">{profileData.fullName || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DATE OF BIRTH</div>
                    <div className="sp-preview-value">{profileData.dob || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">GENDER</div>
                    <div className="sp-preview-value">{profileData.gender || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">MARITAL STATUS</div>
                    <div className="sp-preview-value">{profileData.maritalStatus || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PHONE NUMBER</div>
                    <div className="sp-preview-value">{profileData.mobile || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EMAIL</div>
                    <div className="sp-preview-value">{profileData.email || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">AADHAAR NUMBER</div>
                    <div className="sp-preview-value">
                      {profileData.aadhaar ? (profileData.aadhaar.length >= 12 ? `XXXX XXXX ${profileData.aadhaar.slice(-4)}` : profileData.aadhaar) : "—"}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PAN NUMBER</div>
                    <div className="sp-preview-value">{profileData.pan || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DEPARTMENT</div>
                    <div className="sp-preview-value">{profileData.department || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DESIGNATION</div>
                    <div className="sp-preview-value">{profileData.designation || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DATE OF JOINING</div>
                    <div className="sp-preview-value">{profileData.dateOfJoining || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EXPERIENCE (YEARS)</div>
                    <div className="sp-preview-value">
                      {profileData.experience?.length ? `${profileData.experience.length} Entries` : "0"}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BLOOD GROUP</div>
                    <div className="sp-preview-value">{profileData.bloodGroup || "—"}</div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">ADDRESS</div>
                    <div className="sp-preview-value">
                      {[
                        profileData.houseNumber || profileData.address,
                        profileData.street || profileData.streetArea,
                        profileData.city || profileData.cityVillage,
                        profileData.district,
                        profileData.state,
                        profileData.country || "India",
                        profileData.pin || profileData.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Bank Details Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Bank Details</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(2);
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT HOLDER NAME</div>
                    <div className="sp-preview-value">{profileData.accountHolder || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BANK NAME</div>
                    <div className="sp-preview-value">{profileData.bankName || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT NUMBER</div>
                    <div className="sp-preview-value">
                      {profileData.accountNumber ? `••••••${String(profileData.accountNumber).slice(-4)}` : "—"}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT TYPE</div>
                    <div className="sp-preview-value">{profileData.accountType || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">IFSC CODE</div>
                    <div className="sp-preview-value">{profileData.ifsc || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BRANCH NAME</div>
                    <div className="sp-preview-value">{profileData.branch || "—"}</div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">PF NUMBER / UAN</div>
                    <div className="sp-preview-value">{profileData.uanNumber || profileData.pfNumber || "—"}</div>
                  </div>
                </div>
              </section>

              {/* 3. Address Information Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Address Information</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(3);
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">HOUSE NUMBER</div>
                    <div className="sp-preview-value">{profileData.houseNumber || profileData.address || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">STREET / AREA</div>
                    <div className="sp-preview-value">{profileData.street || profileData.streetArea || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">CITY / VILLAGE</div>
                    <div className="sp-preview-value">{profileData.city || profileData.cityVillage || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PINCODE</div>
                    <div className="sp-preview-value">{profileData.pin || profileData.pincode || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DISTRICT</div>
                    <div className="sp-preview-value">{profileData.district || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">STATE</div>
                    <div className="sp-preview-value">{profileData.state || "—"}</div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">COUNTRY</div>
                    <div className="sp-preview-value">{profileData.country || "India"}</div>
                  </div>
                </div>
              </section>

              {/* 4. Experience Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Experience</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(4);
                    }}
                  >
                    Edit
                  </button>
                </div>
                {(!profileData.experience || !profileData.experience.length) ? (
                  <div style={{ padding: "18px", textAlign: "center", color: "var(--cms-muted)", background: "var(--cms-subtle, #f8fafc)", borderRadius: 12, border: "1px dashed var(--cms-border)" }}>
                    No experience records added.
                  </div>
                ) : (
                  profileData.experience.map((exp, idx) => (
                    <div key={exp.id || idx} className="sp-preview-subcard">
                      <div className="sp-preview-subcard-title">Experience {idx + 1}</div>
                      <div className="sp-preview-grid">
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">COMPANY / INSTITUTION NAME</div>
                          <div className="sp-preview-value">{exp.institution || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">DESIGNATION</div>
                          <div className="sp-preview-value">{exp.designation || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">FROM DATE</div>
                          <div className="sp-preview-value">{exp.fromDate || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">TO DATE</div>
                          <div className="sp-preview-value">{exp.toDate || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">SUBJECTS TEACHED</div>
                          <div className="sp-preview-value">{exp.subjectsTeached || exp.subjectsTaught || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">YEARS / TOTAL EXPERIENCE</div>
                          <div className="sp-preview-value">{exp.totalExp || "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* 5. Uploaded Documents Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">
                    Uploaded Documents ({profileData.documents?.length || 0})
                  </h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(5);
                    }}
                  >
                    Edit
                  </button>
                </div>
                {(!profileData.documents || !profileData.documents.length) ? (
                  <div style={{ padding: "18px", textAlign: "center", color: "var(--cms-muted)", background: "var(--cms-subtle, #f8fafc)", borderRadius: 12, border: "1px dashed var(--cms-border)" }}>
                    No documents uploaded.
                  </div>
                ) : (
                  profileData.documents.map((doc, idx) => (
                    <div key={doc.id || idx} className="sp-preview-subcard">
                      <div className="sp-preview-subcard-title">Document {idx + 1}</div>
                      <div className="sp-preview-grid">
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">DOCUMENT TYPE</div>
                          <div className="sp-preview-value">{doc.type || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">FILE NAME</div>
                          <div className="sp-preview-value">{doc.name || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">FILE TYPE</div>
                          <div className="sp-preview-value">{doc.format || doc.type || "PDF"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">SIZE</div>
                          <div className="sp-preview-value">{doc.size || "—"}</div>
                        </div>
                        <div className="sp-preview-box full">
                          <div className="sp-preview-label">FILE</div>
                          <div>
                            <a
                              href={doc.url || "#"}
                              onClick={(e) => {
                                if (!doc.url) {
                                  e.preventDefault();
                                  notify(`Viewing document ${doc.name}...`);
                                } else {
                                  window.open(doc.url, "_blank");
                                }
                              }}
                              style={{
                                color: "var(--cms-primary, #6F8400)",
                                fontWeight: 700,
                                textDecoration: "none",
                                fontSize: 14,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                              }}
                            >
                              <Eye size={15} /> View Document
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Preview Footer (Screenshot 5: Back and Final Submit) */}
              <div className="sp-preview-footer" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  className="sp-btn-back"
                  onClick={() => setProfileStep(5)}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  className="sp-btn-submit"
                  onClick={handleFinalProfileSave}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Final Submit
                </button>
              </div>
            </div>
          )}

          {/* Stepper Footer for Steps 1 through 5: Only appears after clicking Edit */}
          {profileStep < 6 && isEditingProfile && (
            (profileStep === 2 || profileStep === 4) ? (
              <div
                className="sp-wizard-footer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: "1px solid var(--cms-border)",
                }}
              >
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{
                    background: "var(--cms-surface, #ffffff)",
                    border: "1px solid var(--cms-border, #d1d5db)",
                    color: "var(--cms-text, #1e293b)",
                    padding: "0 22px",
                    height: "38px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => setProfileStep((s) => s - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{
                      background: "var(--cms-surface, #ffffff)",
                      border: "1px solid var(--cms-border, #d1d5db)",
                      color: "var(--cms-text, #1e293b)",
                      padding: "0 26px",
                      height: "38px",
                      fontWeight: 600,
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    onClick={handleSkip}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{
                      padding: "0 22px",
                      height: "38px",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                    onClick={handleSaveAndNext}
                  >
                    Update &amp; Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="sp-wizard-footer"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: "1px solid var(--cms-border)",
                }}
              >
                {profileStep > 1 && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => setProfileStep((s) => s - 1)}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                )}
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleSaveAndNext}
                >
                  Update &amp; Next <ChevronRight size={16} />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );

  const moduleMap = {
    dashboard: renderDashboard,
    timetable: renderTimetable,
    attendance: renderAttendance,
    marks: renderMarks,
    examduties: renderExamDuties,
    myattendance: renderMyAttendance,
    leave: renderLeave,
    salary: renderSalary,
    reimbursements: renderReimbursements,
    profile: renderProfile,
  };

  const navGroups = ["MAIN", "ACADEMICS", "HR & FINANCE"];

  return (
    <div className={`cms-shell ${sidebarOpen ? "" : "nav-closed"}`}>
      {/* Sidebar with Pirnav Colleges Logo and Core Modules */}
      <aside className={`cms-sidebar ${sidebarOpen ? "open is-open" : ""}`}>
        <div className="cms-brand">
          <img className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges" />
        </div>

        <nav className="cms-nav">
          {navGroups.map((grp) => {
            const items = NAV_ITEMS.filter((n) => n.group === grp);
            if (!items.length) return null;
            return (
              <div key={grp}>
                <div className="cms-nav-group">{grp}</div>
                {items.map((item) => {
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`cms-nav-link ${active ? "is-active" : ""}`}
                      onClick={() => {
                        setActiveModule(item.id);
                        if (window.innerWidth <= 768) setSidebarOpen(false);
                      }}
                    >
                      <SidebarIcon icon={item.icon} />
                      <span className="cms-nav-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer Peer Profile Card */}
        <div className="cms-sidebar-footer" style={{ padding: "12px 14px", borderTop: "1px solid var(--cms-border, rgba(0, 0, 0, 0.08))", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="cms-avatar" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--cms-text)" }}>{profileData.fullName}</div>
            <div style={{ fontSize: 11, color: "var(--cms-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profileData.designation}</div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="cms-main">
        {/* Topbar with 3-bar Hamburger Toggle, Search Filter, Academic Selectors & Theme Toggle (Matching Admin Portal 1:1) */}
        <header className="cms-topbar">
          <button
            className="cms-icon-btn cms-menu-toggle"
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <NavbarIcon src={navbarMenuIcon} />
          </button>

          {/* Search Bar for Pages & Modules matching Admin Portal */}
          <div className="cms-search-wrap" ref={searchRef}>
            <div className="cms-search-top">
              <NavbarIcon src={navbarSearchIcon} />
              <input
                placeholder="Search pages and modules..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                aria-label="Search pages and modules"
              />
            </div>
            {searchOpen && (
              <div className="cms-search-panel">
                {searchSuggestions.length ? (
                  searchSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="cms-search-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSearchResult(s)}
                    >
                      <span>{s.label}</span>
                      <small>{s.group}</small>
                    </button>
                  ))
                ) : (
                  <div className="cms-search-empty">No matching modules found</div>
                )}
              </div>
            )}
          </div>

          <div className="cms-top-actions">
            {/* Topbar Academic Selectors (1:1 Admin Replica) */}
            <div className="cms-academic-selectors">
              {/* Board Selector */}
              <div className="cms-academic-dropdown-wrap" ref={boardRef}>
                <button
                  type="button"
                  className={`cms-academic-btn ${boardOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setBoardOpen((v) => !v);
                    setYearOpen(false);
                    setProfileDropOpen(false);
                  }}
                  disabled={boardsLoading || !boards.length}
                  aria-label="Select Board"
                  aria-expanded={boardOpen}
                >
                  <div className="cms-academic-btn-icon">
                    <NavbarIcon src={navbarBoardIcon} />
                  </div>
                  <div className="cms-academic-btn-text">
                    <span className="cms-academic-btn-label">Board</span>
                    <span className="cms-academic-btn-value" title={selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code}>
                      {selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || (boardsLoading ? "Loading boards..." : "No active boards available")}
                    </span>
                  </div>
                  <ChevronDown size={12} className="cms-academic-btn-arrow" />
                </button>

                {boardOpen && (
                  <div className="cms-academic-dropdown-panel">
                    <div className="cms-academic-panel-header">Select Board</div>
                    <div className="cms-academic-panel-list">
                      {boardsLoading ? (
                        <div className="cms-academic-panel-empty">Loading boards...</div>
                      ) : !boards.length ? (
                        <div className="cms-academic-panel-empty">No active boards available</div>
                      ) : (
                        boards.map((b) => {
                          const isSelected =
                            selectedBoard?.code === b.code || selectedBoard?.id === b.id || selectedBoard?.name === b.name || selectedBoard?.boardName === b.boardName;
                          return (
                            <button
                              key={b.id || b.code}
                              type="button"
                              className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                              onClick={() => {
                                setSelectedBoard(b);
                                setBoardOpen(false);
                              }}
                            >
                              <span className="cms-academic-item-name" title={b.name || b.boardName || b.code}>
                                {b.name || b.boardName || b.code}
                              </span>
                              {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Academic Year Selector */}
              <div className="cms-academic-dropdown-wrap" ref={yearRef}>
                <button
                  type="button"
                  className={`cms-academic-btn ${yearOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setYearOpen((v) => !v);
                    setBoardOpen(false);
                    setProfileDropOpen(false);
                  }}
                  disabled={academicYearsLoading || !academicYears.length}
                  aria-label="Select Academic Year"
                  aria-expanded={yearOpen}
                >
                  <div className="cms-academic-btn-icon">
                    <NavbarIcon src={navbarAcademicYearIcon} />
                  </div>
                  <div className="cms-academic-btn-text">
                    <span className="cms-academic-btn-label">Academic Year</span>
                    <span className="cms-academic-btn-value">
                      {selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || (academicYearsLoading ? "Loading years..." : "No active academic years")}
                    </span>
                  </div>
                  <ChevronDown size={12} className="cms-academic-btn-arrow" />
                </button>

                {yearOpen && (
                  <div className="cms-academic-dropdown-panel">
                    <div className="cms-academic-panel-header">Select Academic Year</div>
                    <div className="cms-academic-panel-list">
                      {academicYearsLoading ? (
                        <div className="cms-academic-panel-empty">Loading academic years...</div>
                      ) : !academicYears.length ? (
                        <div className="cms-academic-panel-empty">No active academic years available</div>
                      ) : (
                        academicYears.map((y) => {
                          const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
                          const isSelected =
                            normalize(selectedAcademicYear?.code) === normalize(y.code) ||
                            normalize(selectedAcademicYear?.name) === normalize(y.name) ||
                            normalize(selectedAcademicYear?.label) === normalize(y.label);
                          return (
                            <button
                              key={y.id || y.code}
                              type="button"
                              className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                              onClick={() => {
                                setSelectedAcademicYear(y);
                                setYearOpen(false);
                              }}
                            >
                              <span className="cms-academic-item-name">{y.name || y.label || y.code}</span>
                              {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Theme Toggle (matching Admin Portal 1:1) */}
            <ThemeToggle variant="dashboard" />

            {/* Notifications Button (matching Admin Portal 1:1 with 3D icon) */}
            <button className="cms-icon-btn" onClick={() => notify("No new notifications")} title="Notifications">
              <NavbarIcon src={navbarNotificationsIcon} />
            </button>

            {/* Profile Avatar & Dropdown */}
            <div style={{ position: "relative" }} ref={profileDropRef}>
              <button className="cms-profile-btn" onClick={() => setProfileDropOpen((p) => !p)}>
                <div className="cms-avatar">{initials}</div>
                <div className="cms-profile-meta">
                  <strong>{profileData.fullName || `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() || "Staff Member"}</strong>
                  <span>{profileData.designation || profileData.role || "Staff"}</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {profileDropOpen && (
                <div className="cms-dropdown" onClick={() => setProfileDropOpen(false)}>
                  <div className="cms-dropdown-head">
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{profileData.fullName || `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() || "Staff Member"}</div>
                    <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{typeof profileData.email === "string" ? profileData.email : (Array.isArray(profileData.email) ? profileData.email[0] : "")}</div>
                    <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>ID: {profileData.employeeId || profileData.id || "—"}</div>
                  </div>
                  <button
                    className="cms-dropdown-item"
                    onClick={() => {
                      setActiveModule("profile");
                      setProfileDropOpen(false);
                    }}
                  >
                    <User size={14} /> My Profile
                  </button>
                  <button className="cms-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="cms-content">
          {(moduleMap[activeModule] || renderDashboard)()}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="cms-backdrop-mobile is-open"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 55 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </div>
      )}

      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
