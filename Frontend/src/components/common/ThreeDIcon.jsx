import React from "react";
import "./ThreeDIcon.css";

// ── 3D Asset Imports ──────────────────────────────────────────────────────────
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import boardAcademicYearIcon from "@/assets/sidebar-3d/board-academic-year.png";
import subjectsIcon from "@/assets/sidebar-3d/subjects.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
import transportBusIcon from "@/assets/sidebar-3d/transport-bus.png";
import marksEvaluationIcon from "@/assets/sidebar-3d/marks-evaluation.png";
import resultsIcon from "@/assets/sidebar-3d/results.png";
import promotionIcon from "@/assets/sidebar-3d/promotion.png";
import feeManagementIcon from "@/assets/sidebar-3d/fee-management.png";
import certificatesIcon from "@/assets/sidebar-3d/certificates.png";
import reportsAnalyticsIcon from "@/assets/sidebar-3d/reports-analytics.png";
import hostelManagementIcon from "@/assets/sidebar-3d/hostel-management.svg";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import generalSettingsIcon from "@/assets/sidebar-3d/general-settings.svg";
import rolesPermissionsSvg from "@/assets/sidebar-3d/roles-permissions.svg";
import managementIconsSprite from "@/assets/sidebar-3d/management-icons-sprite.png";

// Dashboard 3D
import sectionsIcon from "@/assets/dashboard-3d/total-sections.png";
import staffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import nonTeachingStaffIcon from "@/assets/dashboard-3d/non-teaching-staff.png";
import allocateSectionIcon from "@/assets/dashboard-3d/create-section.png";
import studentsIcon from "@/assets/dashboard-3d/total-students.png";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import examinationIcon from "@/assets/dashboard-3d/create-exam.png";
import addStudentIcon from "@/assets/dashboard-3d/add-student.png";
import addStaffIcon from "@/assets/dashboard-3d/add-staff.png";
import createGroupIcon from "@/assets/dashboard-3d/create-group.png";
import totalGroupsIcon from "@/assets/dashboard-3d/total-groups.png";

// Settings 3D
import settingsBoardAcademicYearIcon from "@/assets/settings-3d/board-academic-year.png";
import settingsNumberSeriesIcon from "@/assets/settings-3d/number-series.png";
import settingsTemplatesIcon from "@/assets/settings-3d/templates.png";
import settingsAuditLogsIcon from "@/assets/settings-3d/audit-logs.png";
import settingsRolesPermissionsIcon from "@/assets/settings-3d/roles-permissions.png";
import settingsCampusConfigIcon from "@/assets/settings-3d/campus-configuration.png";
import settingsLeaveTypesIcon from "@/assets/settings-3d/leave-types.png";
import settingsAttendanceTimingIcon from "@/assets/settings-3d/attendance-timing.png";

// Navbar 3D
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import navbarThemeDarkIcon from "@/assets/navbar-3d/theme-dark.png";
import navbarThemeLightIcon from "@/assets/navbar-3d/theme-light.png";

// Reports 3D
import reportsAdmissionsIcon from "@/assets/reports-3d/admissions.png";
import reportsAttendanceIcon from "@/assets/reports-3d/attendance.png";
import reportsDueFeesIcon from "@/assets/reports-3d/due-fees.png";
import reportsExaminationsIcon from "@/assets/reports-3d/examinations.png";
import reportsFacultyWorkloadIcon from "@/assets/reports-3d/faculty-workload.png";
import reportsFeeCollectionIcon from "@/assets/reports-3d/fee-collection.png";
import reportsPassPercentageIcon from "@/assets/reports-3d/pass-percentage.png";
import reportsResultsIcon from "@/assets/reports-3d/results.png";
import reportsStudentStrengthIcon from "@/assets/reports-3d/student-strength.png";
import reportsToppersIcon from "@/assets/reports-3d/toppers.png";

// ── Sprite Definitions (Exact positions matching screenshot) ──────────────────
export const spriteIconMap = {
  department: { src: managementIconsSprite, position: "0% 0%" },
  staffAttendance: { src: managementIconsSprite, position: "50% 0%" },
  staffLeave: { src: managementIconsSprite, position: "100% 0%" },
  payroll: { src: managementIconsSprite, position: "0% 100%" },
  admission: { src: managementIconsSprite, position: "50% 100%" },
  groups: { src: managementIconsSprite, position: "100% 100%" },
};

// ── Asset Name Registry ────────────────────────────────────────────────────────
const ASSET_REGISTRY = {
  // Navigation & Core Modules (Matching Screenshot Exactly)
  dashboard: dashboardIcon,
  groups: spriteIconMap.groups,
  "group-management": spriteIconMap.groups,
  courses: spriteIconMap.groups,
  course: spriteIconMap.groups,

  subjects: subjectsIcon,
  subject: subjectsIcon,
  "subject-management": subjectsIcon,

  sections: sectionsIcon,
  section: sectionsIcon,
  "section-room": sectionsIcon,
  rooms: sectionsIcon,
  room: sectionsIcon,

  timetable: timetableIcon,
  schedule: timetableIcon,
  "academic-calendar": timetableIcon,

  holidays: holidayManagementIcon,
  holiday: holidayManagementIcon,
  "holiday-management": holidayManagementIcon,

  admission: spriteIconMap.admission,
  "student-admission": spriteIconMap.admission,

  students: studentsIcon,
  student: studentsIcon,
  "student-management": studentsIcon,

  "section-allocation": allocateSectionIcon,
  allocation: allocateSectionIcon,

  attendance: attendanceIcon,
  "student-attendance": attendanceIcon,

  promotion: promotionIcon,
  promotions: promotionIcon,

  transport: transportBusIcon,
  bus: transportBusIcon,
  routes: transportBusIcon,
  trips: transportBusIcon,

  staff: staffIcon,
  "staff-management": staffIcon,
  faculty: staffIcon,
  teacher: staffIcon,
  "non-teaching": nonTeachingStaffIcon,
  nonteaching: nonTeachingStaffIcon,

  department: spriteIconMap.department,
  departments: spriteIconMap.department,
  designation: spriteIconMap.department,
  designations: spriteIconMap.department,
  "department-designation": spriteIconMap.department,

  "staff-attendance": spriteIconMap.staffAttendance,
  staffAttendance: spriteIconMap.staffAttendance,
  myattendance: spriteIconMap.staffAttendance,

  "staff-leave": spriteIconMap.staffLeave,
  staffLeave: spriteIconMap.staffLeave,
  leave: spriteIconMap.staffLeave,
  "leave-management": spriteIconMap.staffLeave,

  examination: examinationIcon,
  examinations: examinationIcon,
  exam: examinationIcon,
  exams: examinationIcon,
  examduties: examinationIcon,

  "marks-evaluation": marksEvaluationIcon,
  marks: marksEvaluationIcon,
  "marks-entry": marksEvaluationIcon,
  evaluation: marksEvaluationIcon,

  results: resultsIcon,
  result: resultsIcon,

  fee: feeManagementIcon,
  fees: feeManagementIcon,
  "fee-management": feeManagementIcon,
  "fee-structure": feeManagementIcon,
  finance: feeManagementIcon,
  payment: feeManagementIcon,
  payments: feeManagementIcon,

  payroll: spriteIconMap.payroll,
  salary: spriteIconMap.payroll,
  payslip: spriteIconMap.payroll,
  payslips: spriteIconMap.payroll,

  reimbursement: reimbursementIcon,
  reimbursements: reimbursementIcon,

  certificates: certificatesIcon,
  certificate: certificatesIcon,

  reports: reportsAnalyticsIcon,
  analytics: reportsAnalyticsIcon,
  "reports-analytics": reportsAnalyticsIcon,

  hostel: hostelManagementIcon,
  hostels: hostelManagementIcon,
  "hostel-management": hostelManagementIcon,
  warden: staffIcon,
  wardens: staffIcon,
  outpass: spriteIconMap.staffLeave,
  outpasses: spriteIconMap.staffLeave,
  transfer: promotionIcon,
  transfers: promotionIcon,
  vacate: promotionIcon,
  allocations: allocateSectionIcon,
  "student-allocations": allocateSectionIcon,
  "bed-allocation": allocateSectionIcon,

  settings: boardAcademicYearIcon,
  setting: boardAcademicYearIcon,
  "general-settings": generalSettingsIcon,

  // Settings Modules
  "board-academic-year": settingsBoardAcademicYearIcon,
  "number-series": settingsNumberSeriesIcon,
  templates: settingsTemplatesIcon,
  template: settingsTemplatesIcon,
  "audit-logs": settingsAuditLogsIcon,
  audit: settingsAuditLogsIcon,
  "roles-permissions": settingsRolesPermissionsIcon,
  roles: settingsRolesPermissionsIcon,
  permissions: settingsRolesPermissionsIcon,
  "campus-configuration": settingsCampusConfigIcon,
  campus: settingsCampusConfigIcon,
  "leave-types": settingsLeaveTypesIcon,
  "attendance-timing": settingsAttendanceTimingIcon,

  // Navbar
  menu: navbarMenuIcon,
  search: navbarSearchIcon,
  board: navbarBoardIcon,
  "academic-year": navbarAcademicYearIcon,
  notifications: navbarNotificationsIcon,
  notification: navbarNotificationsIcon,
  bell: navbarNotificationsIcon,
  "theme-dark": navbarThemeDarkIcon,
  "theme-light": navbarThemeLightIcon,

  // Dashboard KPI & Quick Actions
  "add-student": addStudentIcon,
  "add-staff": addStaffIcon,
  "create-group": createGroupIcon,
  "total-groups": totalGroupsIcon,
  "create-section": allocateSectionIcon,
  "total-sections": sectionsIcon,
  "create-exam": examinationIcon,
  "mark-attendance": attendanceIcon,
  "total-students": studentsIcon,
  "teaching-staff": staffIcon,

  // Inventory
  inventory: sectionsIcon,
  "inventory-management": sectionsIcon,
  boxes: sectionsIcon,
  items: sectionsIcon,
  "stock-in": allocateSectionIcon,
  "stock-out": promotionIcon,
  suppliers: transportBusIcon,
  categories: spriteIconMap.groups,
  orders: feeManagementIcon,
  returns: resultsIcon,

  // Reports
  "report-admissions": reportsAdmissionsIcon,
  "report-attendance": reportsAttendanceIcon,
  "report-due-fees": reportsDueFeesIcon,
  "report-examinations": reportsExaminationsIcon,
  "report-faculty-workload": reportsFacultyWorkloadIcon,
  "report-fee-collection": reportsFeeCollectionIcon,
  "report-pass-percentage": reportsPassPercentageIcon,
  "report-results": reportsResultsIcon,
  "report-student-strength": reportsStudentStrengthIcon,
  "report-toppers": reportsToppersIcon,
};

// ── Realistic 3D Miniature SVG Action Icons ────────────────────────────────────
// Rendered with rich gradients, dimensional bevels, and soft specular highlights
function Action3DView() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <radialGradient id="viewEyeBall" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>
        <radialGradient id="viewIris" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <linearGradient id="viewPupil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="viewLid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      {/* Sclera / eye shape */}
      <path
        d="M3 18C7.5 10 13.5 6 18 6C22.5 6 28.5 10 33 18C28.5 26 22.5 30 18 30C13.5 30 7.5 26 3 18Z"
        fill="url(#viewEyeBall)"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />
      {/* Iris */}
      <circle cx="18" cy="18" r="7.5" fill="url(#viewIris)" stroke="#1d4ed8" strokeWidth="0.8" />
      {/* Pupil */}
      <circle cx="18" cy="18" r="4.2" fill="url(#viewPupil)" />
      {/* Specular 3D Gloss Highlight */}
      <ellipse cx="16.2" cy="15.8" rx="2.2" ry="1.4" fill="#ffffff" />
      <circle cx="20" cy="19.5" r="0.8" fill="rgba(255,255,255,0.7)" />
      {/* Upper Eyelid Bevel */}
      <path
        d="M4.5 17.5C8.5 10.5 13.5 7.5 18 7.5C22.5 7.5 27.5 10.5 31.5 17.5"
        stroke="url(#viewLid)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Action3DEdit() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="pencilBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="pencilLead" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="pencilWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="pencilEraser" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="pencilMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <g transform="rotate(45 18 18)">
        {/* Eraser */}
        <rect x="15" y="3" width="6" height="5" rx="2" fill="url(#pencilEraser)" />
        {/* Metal Ferrule */}
        <rect x="14.8" y="7" width="6.4" height="3" rx="0.5" fill="url(#pencilMetal)" />
        {/* Main Pencil Body */}
        <rect x="15" y="10" width="6" height="15" fill="url(#pencilBody)" />
        {/* Highlight strip for 3D depth */}
        <rect x="15.8" y="10" width="1.6" height="15" fill="rgba(255,255,255,0.45)" />
        {/* Wood cone */}
        <polygon points="15,25 21,25 18,31" fill="url(#pencilWood)" />
        {/* Graphite tip */}
        <polygon points="17,29 19,29 18,32" fill="url(#pencilLead)" />
      </g>
    </svg>
  );
}

function Action3DDelete() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="binCan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="40%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="binLid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="60%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      {/* Bin Body */}
      <path
        d="M10 13L12 30C12.3 32 14 33 16 33H20C22 33 23.7 32 24 30L26 13"
        fill="url(#binCan)"
      />
      {/* Ribs on bin */}
      <line x1="15" y1="17" x2="15.5" y2="28" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="18" y1="17" x2="18" y2="28" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="21" y1="17" x2="20.5" y2="28" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round" />
      {/* Lid Rim */}
      <rect x="7" y="10" width="22" height="3.5" rx="1.7" fill="url(#binLid)" />
      {/* Lid Handle */}
      <path d="M14 10V6C14 4.8 15 4 16 4H20C21 4 22 4.8 22 6V10" stroke="url(#binLid)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Specular Highlight */}
      <ellipse cx="18" cy="11.5" rx="7" ry="0.8" fill="#ffffff" fillOpacity="0.5" />
    </svg>
  );
}

function Action3DPrint() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="prtBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="prtPaper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      {/* Top Paper Feed */}
      <rect x="11" y="4" width="14" height="11" rx="1.5" fill="url(#prtPaper)" stroke="#cbd5e1" strokeWidth="0.8" />
      <line x1="14" y1="8" x2="22" y2="8" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
      <line x1="14" y1="11" x2="19" y2="11" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
      {/* Printer Main Casing */}
      <rect x="6" y="12" width="24" height="15" rx="3.5" fill="url(#prtBody)" />
      {/* Status LED */}
      <circle cx="9.5" cy="16" r="1.2" fill="#22c55e" />
      {/* Output Paper Slot */}
      <rect x="9" y="19" width="18" height="2" rx="1" fill="#0f172a" />
      {/* Bottom Output Paper */}
      <rect x="10" y="20" width="16" height="11" rx="1.5" fill="url(#prtPaper)" stroke="#cbd5e1" strokeWidth="0.8" />
      <line x1="13" y1="24" x2="23" y2="24" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="27" x2="20" y2="27" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function Action3DExcel() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="xlsBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="xlsBadge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      {/* Sheet Sheet */}
      <rect x="8" y="4" width="21" height="27" rx="3" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1" />
      <rect x="8" y="4" width="21" height="8" rx="3" fill="url(#xlsBack)" />
      {/* Grid lines */}
      <line x1="12" y1="17" x2="25" y2="17" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="12" y1="21" x2="25" y2="21" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="12" y1="25" x2="25" y2="25" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="18" y1="13" x2="18" y2="28" stroke="#cbd5e1" strokeWidth="1" />
      {/* 3D X Badge */}
      <rect x="5" y="11" width="13" height="13" rx="2.5" fill="url(#xlsBadge)" />
      <text x="11.5" y="21.5" fill="#ffffff" fontWeight="bold" fontSize="10" textAnchor="middle" fontFamily="sans-serif">X</text>
    </svg>
  );
}

function Action3DPdf() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="pdfBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="pdfFold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      {/* Paper with folded corner */}
      <path d="M8 5C8 3.8 9 3 10.2 3H21L28 10V30C28 31.2 27 32 25.8 32H10.2C9 32 8 31.2 8 30V5Z" fill="#ffffff" stroke="#fecaca" strokeWidth="1" />
      <polygon points="21,3 28,10 21,10" fill="url(#pdfFold)" />
      {/* Red PDF banner */}
      <rect x="6" y="14" width="24" height="11" rx="2" fill="url(#pdfBack)" />
      <text x="18" y="22.5" fill="#ffffff" fontWeight="bold" fontSize="8" textAnchor="middle" fontFamily="sans-serif">PDF</text>
    </svg>
  );
}

function Action3DAdd() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="addGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#addGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      <rect x="16" y="10" width="4" height="16" rx="2" fill="#ffffff" />
      <rect x="10" y="16" width="16" height="4" rx="2" fill="#ffffff" />
    </svg>
  );
}

function Action3DUpload() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="upGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#upGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      {/* Up arrow */}
      <path d="M18 22V10M18 10L13 15M18 10L23 15" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 25H24" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function Action3DDownload() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="dlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#dlGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      {/* Down arrow */}
      <path d="M18 10V22M18 22L13 17M18 22L23 17" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 25H24" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function Action3DCheck() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="chkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#chkGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      <path d="M11 18L16 23L25 13" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Action3DCross() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="crsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#crsGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      <path d="M13 13L23 23M23 13L13 23" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Action3DWarning() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="warnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M18 4L32 29C32.8 30.5 31.8 32 30 32H6C4.2 32 3.2 30.5 4 29L18 4Z" fill="url(#warnGrad)" />
      <ellipse cx="18" cy="12" rx="4" ry="2" fill="#ffffff" fillOpacity="0.4" />
      <rect x="16.5" y="14" width="3" height="8" rx="1.5" fill="#ffffff" />
      <circle cx="18" cy="26" r="1.6" fill="#ffffff" />
    </svg>
  );
}

function Action3DInfo() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="infGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#infGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      <circle cx="18" cy="12" r="1.8" fill="#ffffff" />
      <rect x="16.5" y="16" width="3" height="9" rx="1.5" fill="#ffffff" />
    </svg>
  );
}

function Action3DEyeOff() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="eyeOffGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path
        d="M3 18C7.5 10 13.5 6 18 6C22.5 6 28.5 10 33 18C28.5 26 22.5 30 18 30C13.5 30 7.5 26 3 18Z"
        fill="#e2e8f0"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />
      <circle cx="18" cy="18" r="7.5" fill="#94a3b8" opacity="0.6" />
      <line x1="5" y1="5" x2="31" y2="31" stroke="#ef4444" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function Action3DLock() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="lockBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="lockShackle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path d="M12 16V10C12 6.5 14.5 4 18 4C21.5 4 24 6.5 24 10V16" stroke="url(#lockShackle)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="8" y="15" width="20" height="16" rx="3.5" fill="url(#lockBody)" />
      <ellipse cx="18" cy="17" rx="6" ry="1.2" fill="#ffffff" fillOpacity="0.4" />
      <circle cx="18" cy="22" r="2" fill="#78350f" />
      <rect x="17.2" y="22" width="1.6" height="4" fill="#78350f" />
    </svg>
  );
}

function Action3DRefresh() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="refGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#refGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      <path d="M25 18A7 7 0 1 1 23 13.1L25 11" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="21 11 25 11 25 15" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Action3DFilter() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="filtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="filtRim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d8b4fe" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path d="M6 8L15 19V28L21 31V19L30 8H6Z" fill="url(#filtGrad)" stroke="url(#filtRim)" strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="18" cy="8" rx="12" ry="3" fill="url(#filtRim)" />
      <ellipse cx="18" cy="8" rx="9" ry="1.8" fill="#ffffff" fillOpacity="0.45" />
    </svg>
  );
}

function Action3DBed() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="bedWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="bedDuvet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="bedPillow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      {/* Headboard */}
      <rect x="5" y="8" width="5" height="20" rx="1.5" fill="url(#bedWood)" />
      {/* Footboard */}
      <rect x="27" y="14" width="4" height="14" rx="1.2" fill="url(#bedWood)" />
      {/* Bed Base & Mattress */}
      <rect x="7" y="17" width="22" height="7" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
      {/* Pillow */}
      <rect x="8.5" y="13.5" width="6" height="5" rx="1.8" fill="url(#bedPillow)" stroke="#cbd5e1" strokeWidth="0.6" />
      {/* Duvet Blanket with 3D Fold */}
      <rect x="13.5" y="16" width="14" height="8" rx="2" fill="url(#bedDuvet)" />
      <path d="M13.5 18C15 16.5 17 16.5 18.5 18L27.5 18" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.2" />
      {/* Bed legs */}
      <rect x="6" y="27" width="2.5" height="4" rx="0.8" fill="url(#bedWood)" />
      <rect x="28" y="27" width="2.5" height="4" rx="0.8" fill="url(#bedWood)" />
    </svg>
  );
}

function Action3DBuilding() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="bldgWall" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="bldgRoof" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="bldgWin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
      </defs>
      {/* Main Building Body */}
      <rect x="8" y="9" width="20" height="23" rx="2" fill="url(#bldgWall)" />
      {/* Architectural Roof Cap */}
      <rect x="6" y="6" width="24" height="4" rx="1.5" fill="url(#bldgRoof)" />
      {/* Windows Row 1 */}
      <rect x="11" y="12" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      <rect x="16.2" y="12" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      <rect x="21.5" y="12" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      {/* Windows Row 2 */}
      <rect x="11" y="18" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      <rect x="16.2" y="18" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      <rect x="21.5" y="18" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      {/* Windows Row 3 & Door */}
      <rect x="11" y="24" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      <rect x="16" y="24" width="4" height="8" rx="1" fill="#f59e0b" />
      <rect x="21.5" y="24" width="3.5" height="4" rx="0.8" fill="url(#bldgWin)" />
      {/* Glass Highlight Line */}
      <line x1="9" y1="10" x2="9" y2="31" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
    </svg>
  );
}

function Action3DPhone() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="phGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#phGrad)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      <path
        d="M13 11C12 11 11 12 11 13.5C11 19.5 16.5 25 22.5 25C24 25 25 24 25 23L23.5 20C23 19 22 19 21 19.5L19.8 20.3C17.5 19 16 17.5 14.7 15.2L15.5 14C16 13 16 12 15 11.5L13 11Z"
        fill="#ffffff"
      />
    </svg>
  );
}

function Action3DMail() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="mailEnv" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      <rect x="6" y="9" width="24" height="18" rx="3" fill="url(#mailEnv)" stroke="#eab308" strokeWidth="0.8" />
      <polygon points="6,9 30,9 18,20" fill="#fef9c3" stroke="#eab308" strokeWidth="0.8" />
      <polygon points="6,27 18,17 30,27" fill="#ca8a04" fillOpacity="0.18" />
      <circle cx="18" cy="17.5" r="2.5" fill="#ef4444" />
      <circle cx="18" cy="17.5" r="1" fill="#ffffff" />
    </svg>
  );
}

function Action3DShield() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="shldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="shldGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
      <path d="M18 4L30 8V18C30 25.5 24.5 30.5 18 32C11.5 30.5 6 25.5 6 18V8L18 4Z" fill="url(#shldGrad)" stroke="url(#shldGold)" strokeWidth="1.8" />
      <ellipse cx="18" cy="10" rx="7" ry="2.5" fill="#ffffff" fillOpacity="0.4" />
      <path d="M12 17L16 21L24 13" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Action3DLogout() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="exitDoor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="url(#exitDoor)" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
      <path d="M14 11H19V25H14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M20 18H28M28 18L24 14M28 18L24 22" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Action3DStar() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>
      <polygon points="18,4 22.3,12.7 32,14.1 25,20.9 26.7,30.5 18,26 9.3,30.5 11,20.9 4,14.1 13.7,12.7" fill="url(#starGrad)" stroke="#ca8a04" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="15" cy="13" r="2" fill="#ffffff" fillOpacity="0.75" />
    </svg>
  );
}

function Action3DGraduation() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="capTassel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="bkRed" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="bkBlue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      {/* Stacked Book 1 (Bottom) */}
      <rect x="7" y="27" width="22" height="5" rx="1.5" fill="url(#bkRed)" stroke="#b91c1c" strokeWidth="0.6" />
      <rect x="9" y="28" width="18" height="3" fill="#ffffff" />
      {/* Stacked Book 2 (Middle) */}
      <rect x="9" y="22" width="18" height="5" rx="1.5" fill="url(#bkBlue)" stroke="#1d4ed8" strokeWidth="0.6" />
      <rect x="11" y="23" width="14" height="3" fill="#ffffff" />
      {/* Mortarboard Diamond */}
      <polygon points="18,5 31,11 18,17 5,11" fill="url(#capGrad)" stroke="#1e40af" strokeWidth="1" strokeLinejoin="round" />
      {/* Skullcap underneath */}
      <path d="M12 14.5V19C12 21.5 14.7 23.5 18 23.5C21.3 23.5 24 21.5 24 19V14.5" fill="#1e3a8a" />
      {/* Center Button and Golden Tassel */}
      <circle cx="18" cy="11" r="1.5" fill="url(#capTassel)" />
      <path d="M18 11C23 11 26 14 26 18.5" stroke="url(#capTassel)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="26" cy="19" r="1.3" fill="url(#capTassel)" />
    </svg>
  );
}

function Action3DClock() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="clkRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="#ffffff" stroke="url(#clkRim)" strokeWidth="2.5" />
      <ellipse cx="18" cy="9" rx="8" ry="3.5" fill="#ffffff" fillOpacity="0.5" />
      <line x1="18" y1="18" x2="18" y2="9" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="18" x2="24" y2="18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2" fill="#0f172a" />
    </svg>
  );
}

function Action3DCalendar() {
  return (
    <svg className="three-d-svg" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="calTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect x="6" y="8" width="24" height="22" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="6" y="8" width="24" height="7" rx="3" fill="url(#calTop)" />
      {/* Spiral binder loops */}
      <rect x="10" y="5" width="2.5" height="5" rx="1.2" fill="#94a3b8" />
      <rect x="17" y="5" width="2.5" height="5" rx="1.2" fill="#94a3b8" />
      <rect x="24" y="5" width="2.5" height="5" rx="1.2" fill="#94a3b8" />
      {/* Dates Grid */}
      <circle cx="11" cy="20" r="1.5" fill="#94a3b8" />
      <circle cx="18" cy="20" r="1.5" fill="#94a3b8" />
      <circle cx="25" cy="20" r="1.5" fill="#94a3b8" />
      <circle cx="11" cy="25" r="1.5" fill="#94a3b8" />
      <circle cx="18" cy="25" r="1.5" fill="#ef4444" />
      <circle cx="25" cy="25" r="1.5" fill="#94a3b8" />
    </svg>
  );
}

const ACTION_SVG_MAP = {
  view: Action3DView,
  eye: Action3DView,
  preview: Action3DView,

  edit: Action3DEdit,
  pencil: Action3DEdit,
  modify: Action3DEdit,

  delete: Action3DDelete,
  trash: Action3DDelete,
  remove: Action3DDelete,

  print: Action3DPrint,
  printer: Action3DPrint,

  excel: Action3DExcel,
  spreadsheet: Action3DExcel,
  "export-excel": Action3DExcel,

  pdf: Action3DPdf,
  "export-pdf": Action3DPdf,

  add: Action3DAdd,
  plus: Action3DAdd,
  create: Action3DAdd,

  download: Action3DDownload,
  export: Action3DDownload,

  upload: Action3DUpload,
  import: Action3DUpload,
  fileup: Action3DUpload,

  check: Action3DCheck,
  approve: Action3DCheck,
  success: Action3DCheck,

  cross: Action3DCross,
  reject: Action3DCross,
  cancel: Action3DCross,
  close: Action3DCross,
  x: Action3DCross,

  warning: Action3DWarning,
  alert: Action3DWarning,

  info: Action3DInfo,

  "eye-off": Action3DEyeOff,
  hide: Action3DEyeOff,

  lock: Action3DLock,
  password: Action3DLock,
  key: Action3DLock,

  refresh: Action3DRefresh,
  rotate: Action3DRefresh,
  "refresh-cw": Action3DRefresh,
  "rotate-cw": Action3DRefresh,
  "rotate-ccw": Action3DRefresh,

  filter: Action3DFilter,
  funnel: Action3DFilter,

  bed: Action3DBed,
  beds: Action3DBed,
  "bed-double": Action3DBed,

  building: Action3DBuilding,
  building2: Action3DBuilding,
  block: Action3DBuilding,
  blocks: Action3DBuilding,

  phone: Action3DPhone,
  call: Action3DPhone,

  mail: Action3DMail,
  email: Action3DMail,
  envelope: Action3DMail,

  shield: Action3DShield,
  "shield-check": Action3DShield,
  security: Action3DShield,

  logout: Action3DLogout,
  exit: Action3DLogout,
  signout: Action3DLogout,

  star: Action3DStar,
  sparkle: Action3DStar,
  sparkles: Action3DStar,

  graduation: Action3DGraduation,
  "graduation-cap": Action3DGraduation,
  cap: Action3DGraduation,

  clock: Action3DClock,
  time: Action3DClock,

  calendar: Action3DCalendar,
  cal: Action3DCalendar,
};

// ── Lucide Component Name to 3D Icon Mapping ──────────────────────────────────
export const LUCIDE_NAME_MAP = {
  // Navigation & Academics
  BookOpen: "subjects",
  BookOpenCheck: "attendance",
  GraduationCap: "students",
  Users: "students",
  UsersRound: "students",
  User: "students",
  UserRound: "students",
  UserCheck: "attendance",
  UserX: "cross",
  UserPlus: "add-student",
  Award: "certificates",
  Calendar: "holiday",
  CalendarDays: "holiday",
  CalendarClock: "timetable",
  CalendarCheck: "attendance",
  CalendarCheck2: "attendance",
  CalendarX: "cross",
  Clock: "attendance-timing",
  Clock3: "attendance-timing",
  ClipboardClock: "attendance-timing",
  ClipboardCheck: "attendance",
  ClipboardList: "attendance",
  PieChart: "reports",
  FileBarChart: "reports",
  BarChart3: "reports",
  TrendingUp: "reports",
  Activity: "reports",
  Sparkles: "reports",

  // Actions & Utilities
  Search: "search",
  Download: "download",
  Upload: "upload",
  FileUp: "upload",
  FileSpreadsheet: "excel",
  FileText: "pdf",
  Printer: "print",
  Pencil: "edit",
  Edit: "edit",
  Edit3: "edit",
  Trash2: "delete",
  Eye: "view",
  EyeOff: "eye-off",
  Plus: "add",
  Check: "check",
  CheckCircle: "check",
  CheckCircle2: "check",
  Save: "check",
  X: "cross",
  XCircle: "cross",
  AlertCircle: "warning",
  AlertTriangle: "warning",
  ShieldAlert: "warning",
  Info: "info",
  RefreshCw: "promotion",
  RotateCcw: "promotion",
  RotateCw: "promotion",
  Lock: "lock",
  LockKeyhole: "lock",
  KeyRound: "lock",
  ShieldCheck: "roles-permissions",
  Camera: "students",
  UserRound: "students",
  Heart: "leaves",
  Fingerprint: "security",
  Hash: "timetable",
  Percent: "reports",
  Globe: "timetable",

  // Finance
  IndianRupee: "fee",
  Wallet: "fee",
  WalletCards: "fee",
  CreditCard: "fee",
  Receipt: "reimbursement",
  ReceiptText: "fee",

  // Hostel & Campus
  Building: "blocks",
  Building2: "blocks",
  BedDouble: "beds",
  Bed: "beds",
  Hotel: "hostel",
  House: "hostel",
  Home: "hostel",
  ArrowRightLeft: "outpass",
  ArrowLeftRight: "outpass",
  RotateCcw: "refresh",
  RotateCw: "refresh",
  RefreshCw: "refresh",
  LogOut: "logout",
  Filter: "filter",
  PhoneCall: "phone",
  Phone: "phone",
  Mail: "mail",
  Sparkles: "sparkle",
  Layers: "sections",
  Boxes: "inventory",
  ShoppingCart: "inventory",
  Bus: "transport",
  Route: "transport",
  Landmark: "board-academic-year",
  School: "campus",
  MapPin: "campus",
  Phone: "department",
  Mail: "templates",
  Megaphone: "notifications",
  PartyPopper: "holiday",
  Flag: "holiday",
  Sun: "holiday",
  Moon: "holiday",
};

// ── Main ThreeDIcon Component ──────────────────────────────────────────────────
/**
 * ThreeDIcon renders realistic colorful 3D icons matching the screenshot.
 *
 * @param {string|object|function} name - Icon name string, component, or icon descriptor {src, position}
 * @param {number|string} size - Size in pixels (default 20)
 * @param {string} className - Optional additional CSS class
 * @param {object} style - Optional inline styles
 * @param {string} alt - Accessibility text
 */
export default function ThreeDIcon({
  name,
  icon,
  size = 20,
  className = "",
  style = {},
  alt = "",
  sub = false,
  ...props
}) {
  const iconRef = name || icon;
  if (!iconRef) return null;

  const numSize = typeof size === "number" ? size : parseInt(size, 10) || 20;
  const containerStyle = {
    width: numSize,
    height: numSize,
    ...style,
  };

  // Case 1: Direct Sprite descriptor object { src, position }
  if (typeof iconRef === "object" && iconRef.src) {
    return (
      <span
        {...props}
        className={`three-d-icon ${className}`.trim()}
        style={containerStyle}
        role={alt ? "img" : "presentation"}
        aria-label={alt || undefined}
        aria-hidden={!alt}
      >
        <span
          className="three-d-sprite"
          style={{
            backgroundImage: `url(${iconRef.src})`,
            backgroundPosition: iconRef.position || "0% 0%",
            backgroundSize: "300% 200%",
          }}
        />
      </span>
    );
  }

  // Case 2: Direct image asset string (e.g. imported .png/.svg)
  if (typeof iconRef === "string" && (iconRef.startsWith("data:") || iconRef.startsWith("/") || iconRef.includes("."))) {
    return (
      <span
        {...props}
        className={`three-d-icon ${className}`.trim()}
        style={containerStyle}
        role={alt ? "img" : "presentation"}
        aria-label={alt || undefined}
        aria-hidden={!alt}
      >
        <img
          className="three-d-icon-img"
          src={iconRef}
          alt={alt}
          draggable={false}
          loading="lazy"
        />
      </span>
    );
  }

  // Case 3: Identify key from string or Lucide Component
  let key = "";
  if (typeof iconRef === "string") {
    key = iconRef.toLowerCase().trim().replace(/[-_]+/g, "-");
  } else if (typeof iconRef === "function" || (typeof iconRef === "object" && iconRef.$$typeof)) {
    const rawName = iconRef.displayName || iconRef.name || iconRef.render?.displayName || iconRef.type?.displayName || iconRef.type?.name || "";
    if (rawName && LUCIDE_NAME_MAP[rawName]) {
      key = LUCIDE_NAME_MAP[rawName];
    } else if (rawName) {
      key = rawName.toLowerCase().replace(/[-_]+/g, "-");
    }
  }

  // Check Action SVG Icons
  const ActionComponent = ACTION_SVG_MAP[key];
  if (ActionComponent) {
    return (
      <span
        {...props}
        className={`three-d-icon ${className}`.trim()}
        style={containerStyle}
        role={alt ? "img" : "presentation"}
        aria-label={alt || undefined}
        aria-hidden={!alt}
      >
        <ActionComponent />
      </span>
    );
  }

  // Check Asset Registry
  const registered = ASSET_REGISTRY[key] || ASSET_REGISTRY[key.replace(/-/g, "")];
  if (registered) {
    // Registered Sprite object
    if (typeof registered === "object" && registered.src) {
      return (
        <span
          {...props}
          className={`three-d-icon ${className}`.trim()}
          style={containerStyle}
          role={alt ? "img" : "presentation"}
          aria-label={alt || undefined}
          aria-hidden={!alt}
        >
          <span
            className="three-d-sprite"
            style={{
              backgroundImage: `url(${registered.src})`,
              backgroundPosition: registered.position || "0% 0%",
              backgroundSize: "300% 200%",
            }}
          />
        </span>
      );
    }
    // Registered Image string
    return (
      <span
        {...props}
        className={`three-d-icon ${className}`.trim()}
        style={containerStyle}
        role={alt ? "img" : "presentation"}
        aria-label={alt || undefined}
        aria-hidden={!alt}
      >
        <img
          className="three-d-icon-img"
          src={registered}
          alt={alt}
          draggable={false}
          loading="lazy"
        />
      </span>
    );
  }

  // Case 4: React component fallback
  if (typeof iconRef === "function" || (typeof iconRef === "object" && iconRef.$$typeof)) {
    const FallbackComponent = iconRef;
    return (
      <span
        {...props}
        className={`three-d-icon ${className}`.trim()}
        style={containerStyle}
        role={alt ? "img" : "presentation"}
        aria-label={alt || undefined}
        aria-hidden={!alt}
      >
        <FallbackComponent size={numSize} aria-hidden={!alt} />
      </span>
    );
  }

  // Fallback to dashboard icon
  return (
    <span
      {...props}
      className={`three-d-icon ${className}`.trim()}
      style={containerStyle}
      role={alt ? "img" : "presentation"}
      aria-label={alt || undefined}
      aria-hidden={!alt}
    >
      <img
        className="three-d-icon-img"
        src={dashboardIcon}
        alt={alt}
        draggable={false}
        loading="lazy"
      />
    </span>
  );
}
