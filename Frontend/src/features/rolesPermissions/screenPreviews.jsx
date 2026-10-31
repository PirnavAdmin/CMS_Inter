import React from "react";

// Asset references for 3D icons
import rolesIcon3D from "@/assets/settings-3d/roles-permissions.png";
import attendanceTiming3D from "@/assets/settings-3d/attendance-timing.png";
import auditLogs3D from "@/assets/settings-3d/audit-logs.png";
import boardYear3D from "@/assets/settings-3d/board-academic-year.png";
import campusConfig3D from "@/assets/settings-3d/campus-configuration.png";
import leaveTypes3D from "@/assets/settings-3d/leave-types.png";
import numberSeries3D from "@/assets/settings-3d/number-series.png";
import templates3D from "@/assets/settings-3d/templates.png";

// Sidebar 3D icons
import dashboard3D from "@/assets/sidebar-3d/dashboard.png";
import fee3D from "@/assets/sidebar-3d/fee-management.png";
import marks3D from "@/assets/sidebar-3d/marks-evaluation.png";
import promotion3D from "@/assets/sidebar-3d/promotion.png";
import reports3D from "@/assets/sidebar-3d/reports-analytics.png";
import results3D from "@/assets/sidebar-3d/results.png";
import subjects3D from "@/assets/sidebar-3d/subjects.png";
import timetable3D from "@/assets/sidebar-3d/timetable.png";
import transport3D from "@/assets/sidebar-3d/transport-bus.png";
import certificates3D from "@/assets/sidebar-3d/certificates.png";

// Action cards
import addStaff3D from "@/assets/dashboard-3d/add-staff.png";
import addStudent3D from "@/assets/dashboard-3d/add-student.png";
import createExam3D from "@/assets/dashboard-3d/create-exam.png";
import totalGroups3D from "@/assets/dashboard-3d/total-groups.png";
import totalSections3D from "@/assets/dashboard-3d/total-sections.png";

/**
 * Screen preview metadata definitions for all modules & screens.
 */
export const SCREEN_PREVIEWS = {
  // 1. Dashboard
  "dashboard:overview": {
    title: "Overview & Metrics",
    route: "/dashboard",
    section: "Overview",
    description: "Executive summary with live enrollment, fee collection, and attendance metrics.",
    layoutType: "analytics",
    accentColor: "#3b82f6",
    badgeIcon: dashboard3D,
    features: ["KPI Metrics", "Live Alerts", "Quick Shortcuts", "Campus Filter"],
  },
  "dashboard:analytics": {
    title: "Analytics & BI",
    route: "/dashboard/analytics",
    section: "Overview",
    description: "Statistical analytics, grade distributions, and department comparisons.",
    layoutType: "analytics",
    accentColor: "#2563eb",
    badgeIcon: reports3D,
    features: ["Grade Curves", "Attendance Trends", "Revenue Charts", "Export PDF"],
  },

  // 2. Board & Academic Year
  "board-academic-year:boards-master": {
    title: "Boards & Universities",
    route: "/dashboard/board-academic-year",
    section: "Academic",
    description: "Education boards, affiliation codes, and recognized authority credentials.",
    layoutType: "table",
    accentColor: "#6366f1",
    badgeIcon: boardYear3D,
    features: ["Affiliation Master", "Code Validator", "Status Toggle", "Audit Info"],
  },
  "board-academic-year:academic-years": {
    title: "Academic Years & Sessions",
    route: "/dashboard/board-academic-year?tab=years",
    section: "Academic",
    description: "Define annual academic calendars, semesters, terms, and set the active session.",
    layoutType: "table",
    accentColor: "#6366f1",
    badgeIcon: boardYear3D,
    features: ["Session Dates", "Term Config", "Active Session Toggle", "Term Breakdown"],
  },

  // 3. Group Management
  "group-management:courses": {
    title: "Courses & Groups",
    route: "/dashboard/courses",
    section: "Academic",
    description: "Manage degree courses, diploma programs, academic branches, and group intake.",
    layoutType: "cards",
    accentColor: "#0ea5e9",
    badgeIcon: totalGroups3D,
    features: ["Course Directory", "Intake Limits", "Degree Codes", "Status Filter"],
  },
  "group-management:batches": {
    title: "Batches & Streams",
    route: "/dashboard/courses?tab=batches",
    section: "Academic",
    description: "Manage year batches, specialized streams, and assign curriculum paths.",
    layoutType: "table",
    accentColor: "#0284c7",
    badgeIcon: totalGroups3D,
    features: ["Batch Years", "Student Counts", "Stream Mapping", "Section Links"],
  },

  // 4. Subject Management
  "subject-management:subjects": {
    title: "Subjects Directory",
    route: "/dashboard/subjects",
    section: "Academic",
    description: "Course subjects, unique course codes, theory/lab credits, and syllabus links.",
    layoutType: "table",
    accentColor: "#8b5cf6",
    badgeIcon: subjects3D,
    features: ["Credit Hours", "Elective / Core", "Lab Allocation", "Search by Code"],
  },
  "subject-management:subject-assignment": {
    title: "Faculty Subject Allocation",
    route: "/dashboard/subjects?tab=assignment",
    section: "Academic",
    description: "Allocate subject workloads, lecture hours, and lab in-charges to teaching faculty.",
    layoutType: "split-pane",
    accentColor: "#7c3aed",
    badgeIcon: subjects3D,
    features: ["Faculty Workload", "Batch Mapping", "Period Balancer", "Assignment Matrix"],
  },

  // 5. Section & Room
  "section-room:sections": {
    title: "Sections Directory",
    route: "/dashboard/sections",
    section: "Academic",
    description: "Class sections, divisions, room assignments, and student capacity limits.",
    layoutType: "cards",
    accentColor: "#10b981",
    badgeIcon: totalSections3D,
    features: ["Section Capacity", "Class Teacher", "Room Linkage", "Active Batches"],
  },
  "section-room:rooms": {
    title: "Classrooms & Labs",
    route: "/dashboard/sections?tab=rooms",
    section: "Academic",
    description: "Campus buildings, classrooms, science/computer labs, and seating capacities.",
    layoutType: "table",
    accentColor: "#059669",
    badgeIcon: totalSections3D,
    features: ["Building Blocks", "Floor Numbers", "Lab Equipment", "Capacity Status"],
  },

  // 6. Timetable
  "timetable:view-timetable": {
    title: "Weekly Timetable View",
    route: "/dashboard/timetable",
    section: "Academic",
    description: "Interactive master weekly timetable view by section, classroom, or faculty.",
    layoutType: "calendar",
    accentColor: "#f59e0b",
    badgeIcon: timetable3D,
    features: ["Interactive Grid", "Conflict Detector", "Day View / Week View", "PDF Print"],
  },
  "timetable:setup-timetable": {
    title: "Period Slots & Timetable Setup",
    route: "/dashboard/timetable/setup",
    section: "Academic",
    description: "Configure daily bell schedule, period durations, lunch breaks, and shift slots.",
    layoutType: "form",
    accentColor: "#d97706",
    badgeIcon: timetable3D,
    features: ["Bell Timings", "Break Intervals", "Period Multipliers", "Shift Types"],
  },
  "timetable:draft-timetable": {
    title: "Draft Schedules & Revisions",
    route: "/dashboard/timetable/drafts",
    section: "Academic",
    description: "Review, compare, and modify pending timetable schedules prior to publishing.",
    layoutType: "split-pane",
    accentColor: "#b45309",
    badgeIcon: timetable3D,
    features: ["Version Compare", "Approval Desk", "Faculty Checks", "Publish Button"],
  },
  "timetable:generate-timetable": {
    title: "Auto Schedule Generator",
    route: "/dashboard/timetable/generator",
    section: "Academic",
    description: "AI-assisted automated timetable generator with room and faculty conflict solver.",
    layoutType: "analytics",
    accentColor: "#f59e0b",
    badgeIcon: timetable3D,
    features: ["Rule Engine", "Auto Solve Conflicts", "Faculty Load Balance", "One-Click Draft"],
  },
  "timetable:faculty-timetable": {
    title: "Faculty Timetable & Substitutions",
    route: "/dashboard/timetable/faculty",
    section: "Academic",
    description: "Personalized faculty schedules and substitute teacher allocation for absent staff.",
    layoutType: "calendar",
    accentColor: "#d97706",
    badgeIcon: timetable3D,
    features: ["Substitute Allocator", "Free Period Finder", "SMS Alerts", "Workload Limits"],
  },

  // 7. Holiday Management
  "holiday-management:academic-holidays": {
    title: "Holidays Calendar",
    route: "/dashboard/holidays",
    section: "Academic",
    description: "Official institutional holidays, festival vacations, and declared semester breaks.",
    layoutType: "calendar",
    accentColor: "#ec4899",
    badgeIcon: timetable3D,
    features: ["Calendar View", "National / Regional", "Notification Sync", "Multi-Campus"],
  },

  // 8. Inventory Management
  "inventory-management:inventory-items": {
    title: "Items Catalog & Stocks",
    route: "/dashboard/inventory-management",
    section: "Academic",
    description: "Campus lab consumables, sports items, stationery stocks, and asset depreciation.",
    layoutType: "table",
    accentColor: "#14b8a6",
    badgeIcon: templates3D,
    features: ["Stock Levels", "SKU Barcodes", "Reorder Alerts", "Asset Categories"],
  },
  "inventory-management:stock-movements": {
    title: "Stock Movements & Issues",
    route: "/dashboard/inventory-management?tab=movements",
    section: "Academic",
    description: "Department stock requests, item issues, return inspections, and write-offs.",
    layoutType: "table",
    accentColor: "#0d9488",
    badgeIcon: templates3D,
    features: ["Issue Slips", "Dept Allocation", "Return Logs", "Damage Audit"],
  },
  "inventory-management:purchase-orders": {
    title: "Vendors & Purchase Orders",
    route: "/dashboard/inventory-management?tab=po",
    section: "Academic",
    description: "Vendor quotations, purchase approvals, invoice attachments, and deliveries.",
    layoutType: "form",
    accentColor: "#0f766e",
    badgeIcon: templates3D,
    features: ["Vendor Directory", "PO Approval Flow", "Invoice Matching", "Payment Status"],
  },

  // 9. Student Admission
  "student-admission:admission-pipeline": {
    title: "Admission Inquiries & Forms",
    route: "/dashboard/admission",
    section: "Student",
    description: "Online and counter admission inquiries, lead statuses, and application form tracker.",
    layoutType: "cards",
    accentColor: "#06b6d4",
    badgeIcon: addStudent3D,
    features: ["Kanban Pipeline", "Application Fee", "Document Upload", "Counseling Notes"],
  },
  "student-admission:admission-approval": {
    title: "Verification & Approval",
    route: "/dashboard/admission?tab=approval",
    section: "Student",
    description: "Principal / Admissions desk verification of certificates and final enrollment sign-off.",
    layoutType: "split-pane",
    accentColor: "#0891b2",
    badgeIcon: addStudent3D,
    features: ["KYC Verification", "Eligibility Check", "Fee Clearance", "Approve / Reject"],
  },

  // 10. Student Management
  "student-management:student-directory": {
    title: "Student Directory",
    route: "/dashboard/students",
    section: "Student",
    description: "Complete searchable roster of all enrolled students with campus and course filters.",
    layoutType: "table",
    accentColor: "#3b82f6",
    badgeIcon: addStudent3D,
    features: ["Multi-Filter Roster", "Live Search", "Export Excel", "Batch Actions"],
  },
  "student-management:student-profile": {
    title: "Student Profile & Bio",
    route: "/dashboard/students/profile",
    section: "Student",
    description: "Comprehensive 360-degree student record: academic history, guardian details, and fees.",
    layoutType: "split-pane",
    accentColor: "#2563eb",
    badgeIcon: addStudent3D,
    features: ["360 Bio Tab", "Fee Dues Pill", "Attendance Rate", "ID Card Generator"],
  },
  "student-management:student-enrollment": {
    title: "Enrollment & Documents",
    route: "/dashboard/students/enrollment",
    section: "Student",
    description: "Manage original certificates, transfer certificates, caste papers, and photo uploads.",
    layoutType: "form",
    accentColor: "#1d4ed8",
    badgeIcon: addStudent3D,
    features: ["Document Vault", "Status Checklist", "Expiry Tracking", "Safe Download"],
  },

  // 11. Section Allocation
  "section-allocation:student-allocation": {
    title: "Allocate Sections",
    route: "/dashboard/section-allocation",
    section: "Student",
    description: "Batch allocate newly admitted or unassigned students into designated sections.",
    layoutType: "split-pane",
    accentColor: "#6366f1",
    badgeIcon: totalSections3D,
    features: ["Drag & Drop", "Capacity Balancer", "Gender Ratio", "Instant Commit"],
  },
  "section-allocation:allocated-list": {
    title: "Allocated Students Register",
    route: "/dashboard/section-allocation?tab=allocated",
    section: "Student",
    description: "Section-wise student roll rosters, group distributions, and transfer requests.",
    layoutType: "table",
    accentColor: "#4f46e5",
    badgeIcon: totalSections3D,
    features: ["Section Switcher", "Student Count", "Export CSV", "Re-assign Section"],
  },
  "section-allocation:roll-numbers": {
    title: "Roll Numbers",
    route: "/dashboard/section-allocation?tab=roll-numbers",
    section: "Student",
    description: "Automated sequential roll number generator sorted alphabetically or by merit.",
    layoutType: "table",
    accentColor: "#4338ca",
    badgeIcon: numberSeries3D,
    features: ["Prefix Config", "Alpha / Merit Sort", "Preview Generator", "Lock Roll Nos"],
  },

  // 12. Attendance
  "attendance:student-attendance": {
    title: "Daily Attendance Entry",
    route: "/dashboard/attendance/student",
    section: "Student",
    description: "Period-wise and day-wise attendance recording with quick mark-all shortcuts.",
    layoutType: "table",
    accentColor: "#10b981",
    badgeIcon: attendanceTiming3D,
    features: ["Present / Absent / Late", "Mark All Present", "SMS Alert to Parents", "Period Selector"],
  },
  "attendance:attendance-overview": {
    title: "Student Attendance Overview",
    route: "/dashboard/attendance/student?tab=overview",
    section: "Student",
    description: "Student-wise percentage statistics, monthly heatmaps, and medical leave allowances.",
    layoutType: "analytics",
    accentColor: "#059669",
    badgeIcon: attendanceTiming3D,
    features: ["Percentage Gauge", "Monthly Heatmap", "Leave Records", "Student Drilldown"],
  },
  "attendance:attendance-reports": {
    title: "Attendance Reports & Defaulters",
    route: "/dashboard/attendance/student?tab=reports",
    section: "Student",
    description: "Identify students below mandatory attendance threshold (<75%) and export notices.",
    layoutType: "table",
    accentColor: "#047857",
    badgeIcon: attendanceTiming3D,
    features: ["Defaulter Flag (<75%)", "Hall Ticket Block", "Export CSV", "Notice Generator"],
  },

  // 13. Promotion
  "promotion:eligible": {
    title: "Promotion Eligibility",
    route: "/dashboard/promotion",
    section: "Student",
    description: "Evaluate students eligible for next year promotion based on GPA and attendance.",
    layoutType: "table",
    accentColor: "#8b5cf6",
    badgeIcon: promotion3D,
    features: ["Eligibility Filter", "Pass Thresholds", "Backlog Counter", "Bulk Qualify"],
  },
  "promotion:single": {
    title: "Single Student Promotion",
    route: "/dashboard/promotion?tab=single",
    section: "Student",
    description: "Individual student promotion override with special academic committee approval.",
    layoutType: "form",
    accentColor: "#7c3aed",
    badgeIcon: promotion3D,
    features: ["Override Justification", "Committee Signoff", "Custom Section", "Audit Log"],
  },
  "promotion:allocation": {
    title: "Section Allocation on Promotion",
    route: "/dashboard/promotion?tab=allocation",
    section: "Student",
    description: "Directly assign promoted students into their new higher-year class sections.",
    layoutType: "split-pane",
    accentColor: "#6d28d9",
    badgeIcon: promotion3D,
    features: ["Stream Placement", "Section Quota", "Roll Carryover", "Batch Commit"],
  },
  "promotion:history": {
    title: "Promotion History & Audits",
    route: "/dashboard/promotion?tab=history",
    section: "Student",
    description: "Archival record of promotions, detentions, and academic year rollover audits.",
    layoutType: "table",
    accentColor: "#5b21b6",
    badgeIcon: auditLogs3D,
    features: ["Historical Sessions", "Detained Lists", "Roll Reversals", "Timestamp Logs"],
  },
  "promotion:report": {
    title: "Promotion Analytics Report",
    route: "/dashboard/promotion?tab=report",
    section: "Student",
    description: "Macro-level statistical reports on promotion ratios, dropouts, and stream shifts.",
    layoutType: "analytics",
    accentColor: "#8b5cf6",
    badgeIcon: reports3D,
    features: ["Pass Rate KPI", "Cohort Comparison", "Drop-out Analysis", "Print Summary"],
  },

  // 14. Transport
  "transport:routes": {
    title: "Bus Routes & Stops",
    route: "/dashboard/transport",
    section: "Operations",
    description: "Manage transit routes, designated stops, pickup times, and distance fares.",
    layoutType: "table",
    accentColor: "#f59e0b",
    badgeIcon: transport3D,
    features: ["Stop Sequencing", "Pickup Timings", "Fare Stages", "Route Map"],
  },
  "transport:pickup-points": {
    title: "Pickup Points Master",
    route: "/dashboard/transport?tab=pickupPoints",
    section: "Operations",
    description: "Manage bus stop landmarks, GPS coordinates, morning pickup and evening drop timings.",
    layoutType: "table",
    accentColor: "#d97706",
    badgeIcon: transport3D,
    features: ["Landmark Tags", "Pickup & Drop Timings", "Stop Sequence No", "Distance from Campus"],
  },
  "transport:vehicles": {
    title: "Fleet & Vehicles",
    route: "/dashboard/transport?tab=vehicles",
    section: "Operations",
    description: "College bus fleet inventory, RC documents, fitness certificates, and insurance.",
    layoutType: "cards",
    accentColor: "#d97706",
    badgeIcon: transport3D,
    features: ["Seating Capacity", "Fitness Validity", "Insurance Expiry", "Maintenance Log"],
  },
  "transport:driver-assignment": {
    title: "Driver & Bus Allocations",
    route: "/dashboard/transport?tab=drivers",
    section: "Operations",
    description: "Assign licensed drivers and conductors to specific buses and morning/evening routes.",
    layoutType: "split-pane",
    accentColor: "#b45309",
    badgeIcon: transport3D,
    features: ["Driver License Check", "Emergency Contact", "Route Allocation", "Duty Roster"],
  },
  "transport:student-transport": {
    title: "Student Transport Passes",
    route: "/dashboard/transport?tab=passes",
    section: "Operations",
    description: "Issue bus passes, allocate student pickup stops, and calculate annual transport fees.",
    layoutType: "table",
    accentColor: "#f59e0b",
    badgeIcon: transport3D,
    features: ["Pass Card QR", "Stop Allocation", "Fee Clearance", "Seat Limit Check"],
  },
  "transport:live-tracking": {
    title: "Live GPS Tracking",
    route: "/dashboard/transport/tracking",
    section: "Operations",
    description: "Real-time telemetry map showing bus speeds, active route checkpoints, and delays.",
    layoutType: "analytics",
    accentColor: "#d97706",
    badgeIcon: transport3D,
    features: ["Live GPS Map", "Speed Alerts", "ETA Calculations", "Emergency SOS"],
  },
  "transport:maintenance": {
    title: "Fleet Maintenance & Service",
    route: "/dashboard/transport?tab=maintenance",
    section: "Operations",
    description: "Log vehicle servicing, spare parts replacement, fuel tracking, and fitness certificates.",
    layoutType: "table",
    accentColor: "#b45309",
    badgeIcon: transport3D,
    features: ["Service Work Orders", "Odometer & Fuel Logs", "Fitness Certificate Alerts", "Expense Tracking"],
  },

  // 15. Staff Management
  "staff-management:teaching-staff": {
    title: "Teaching Faculty Directory",
    route: "/dashboard/staff",
    section: "Staff",
    description: "Faculty directory with departments, designations, qualifications, and contacts.",
    layoutType: "table",
    accentColor: "#0284c7",
    badgeIcon: addStaff3D,
    features: ["Department Filter", "Designation Filter", "Workload Card", "Direct Message"],
  },
  "staff-management:non-teaching-staff": {
    title: "Non-Teaching Staff Directory",
    route: "/dashboard/staff?tab=non-teaching",
    section: "Staff",
    description: "Roster of administrative, finance, library, transport, and maintenance personnel.",
    layoutType: "table",
    accentColor: "#0369a1",
    badgeIcon: addStaff3D,
    features: ["Role Badges", "Shift Timings", "Contact Details", "Status Toggle"],
  },
  "staff-management:staff-onboarding": {
    title: "Staff Onboarding & Review",
    route: "/dashboard/staff/onboarding",
    section: "Staff",
    description: "Onboarding form processing, identity verification, resume checks, and contract sign.",
    layoutType: "split-pane",
    accentColor: "#075985",
    badgeIcon: addStaff3D,
    features: ["KYC Checklist", "Background Check", "Document Sign", "Issue Staff ID"],
  },
  "staff-management:staff-profile": {
    title: "Staff Profile & KYC Details",
    route: "/dashboard/staff/profile",
    section: "Staff",
    description: "Full employee personnel dossier: bank info, PF number, experience, and certificates.",
    layoutType: "form",
    accentColor: "#0c4a6e",
    badgeIcon: addStaff3D,
    features: ["Bank Account Details", "PF / ESI Numbers", "Educational Proofs", "Service Book"],
  },

  // 16. Department & Designation
  "department-designation:departments": {
    title: "Departments Directory",
    route: "/dashboard/departments",
    section: "Staff",
    description: "Manage academic departments (Science, Arts, Commerce) and administrative divisions.",
    layoutType: "cards",
    accentColor: "#3b82f6",
    badgeIcon: totalGroups3D,
    features: ["HOD In-Charge", "Faculty Count", "Budget Allocation", "Active Courses"],
  },
  "department-designation:designations": {
    title: "Designations Directory",
    route: "/dashboard/departments?tab=designations",
    section: "Staff",
    description: "Organizational hierarchy, pay-bands, and job titles (Professor, Assistant Prof, Clerk).",
    layoutType: "table",
    accentColor: "#2563eb",
    badgeIcon: totalGroups3D,
    features: ["Pay Scale Band", "Hierarchy Level", "Staff Count", "Role Defaults"],
  },

  // 17. Staff Attendance
  "staff-attendance:mark-staff-attendance": {
    title: "Mark Staff Attendance",
    route: "/dashboard/attendance/staff",
    section: "Staff",
    description: "Daily staff attendance register with biometric device sync and manual corrections.",
    layoutType: "table",
    accentColor: "#10b981",
    badgeIcon: attendanceTiming3D,
    features: ["In / Out Timestamps", "Biometric Sync", "Late Mark Rule", "Half-Day Toggle"],
  },
  "staff-attendance:staff-attendance-overview": {
    title: "Staff Attendance Overview",
    route: "/dashboard/attendance/staff?tab=overview",
    section: "Staff",
    description: "Monthly staff muster roll showing present, absent, on-duty, and leave totals.",
    layoutType: "analytics",
    accentColor: "#059669",
    badgeIcon: attendanceTiming3D,
    features: ["Monthly Muster Roll", "On-Duty Leaves", "Late Deductions", "Print Muster"],
  },
  "staff-attendance:staff-attendance-logs": {
    title: "Biometric Logs & Reports",
    route: "/dashboard/attendance/staff?tab=logs",
    section: "Staff",
    description: "Raw punch machine logs with device IP, reader timestamp, and failed sync alerts.",
    layoutType: "table",
    accentColor: "#047857",
    badgeIcon: auditLogs3D,
    features: ["Device Telemetry", "Raw Punch Timestamps", "Manual Override Flag", "Export CSV"],
  },

  // 18. Staff Leave Management
  "staff-leave-management:leave-applications": {
    title: "Leave Applications",
    route: "/dashboard/leave-management?tab=staff",
    section: "Staff",
    description: "Personal staff portal to apply for casual, sick, or maternity leave with attachments.",
    layoutType: "form",
    accentColor: "#ec4899",
    badgeIcon: leaveTypes3D,
    features: ["Leave Type Dropdown", "Day Count Calculator", "Medical Attachment", "Track Status"],
  },
  "staff-leave-management:leave-approvals": {
    title: "Leave Approvals",
    route: "/dashboard/leave-management?tab=approvals",
    section: "Staff",
    description: "HOD and Principal desk to review pending leave requests, balances, and substitute plans.",
    layoutType: "split-pane",
    accentColor: "#db2777",
    badgeIcon: leaveTypes3D,
    features: ["Approve / Reject Action", "Balance Checker", "Substitute Faculty", "Remarks Box"],
  },
  "staff-leave-management:leave-balances": {
    title: "Leave Balance & History",
    route: "/dashboard/leave-management?tab=balances",
    section: "Staff",
    description: "Staff annual leave ledger showing opening balance, used leaves, and remaining quota.",
    layoutType: "table",
    accentColor: "#be185d",
    badgeIcon: leaveTypes3D,
    features: ["Casual Quota", "Sick Quota", "Lapsed Leaves", "Annual Ledger"],
  },

  // 19. Staff Reimbursements
  "reimbursement:submit-claim": {
    title: "Submit Reimbursement Claim",
    route: "/dashboard/reimbursements",
    section: "Staff",
    description: "Staff expense claims for travel, academic paper publications, stationery, and seminars.",
    layoutType: "form",
    accentColor: "#14b8a6",
    badgeIcon: fee3D,
    features: ["Bill Upload", "Expense Category", "GST / Tax Breakdown", "Instant Calculation"],
  },
  "reimbursement:claim-approvals": {
    title: "Claim Approvals Desk",
    route: "/dashboard/reimbursements?tab=approvals",
    section: "Staff",
    description: "Accounts manager review of expense receipts, budget verification, and sanction.",
    layoutType: "split-pane",
    accentColor: "#0d9488",
    badgeIcon: fee3D,
    features: ["Receipt Zoom", "Sanction Amount", "Disallow Line Items", "Approve / Reject"],
  },
  "reimbursement:disbursement-history": {
    title: "Disbursement History",
    route: "/dashboard/reimbursements?tab=history",
    section: "Staff",
    description: "Paid claims audit ledger with bank transaction reference numbers and payment vouchers.",
    layoutType: "table",
    accentColor: "#0f766e",
    badgeIcon: auditLogs3D,
    features: ["Bank UTR No", "Payment Voucher", "Disbursed Date", "Export Ledger"],
  },

  // 20. Examination
  "examination:exam-schedules": {
    title: "Exam Schedules & Datesheets",
    route: "/dashboard/examinations",
    section: "Examinations",
    description: "Configure mid-term, quarterly, and annual exam datesheets, slots, and paper timings.",
    layoutType: "table",
    accentColor: "#f43f5e",
    badgeIcon: createExam3D,
    features: ["Subject Datesheet", "Session Timing", "Max Marks Config", "Print Datesheet"],
  },
  "examination:hall-allocation": {
    title: "Exam Hall Allocation",
    route: "/dashboard/examinations?tab=hall-allocation",
    section: "Examinations",
    description: "Auto-assign exam halls, classrooms, invigilators, and sequential desk seating.",
    layoutType: "split-pane",
    accentColor: "#e11d48",
    badgeIcon: createExam3D,
    features: ["Invigilator Duty", "Seating Plan", "Jumble Roll Numbers", "Door Chart Print"],
  },
  "examination:hall-tickets": {
    title: "Hall Tickets",
    route: "/dashboard/examinations?tab=hall-tickets",
    section: "Examinations",
    description: "Generate and download student examination admit cards with barcodes and fee checks.",
    layoutType: "cards",
    accentColor: "#be123c",
    badgeIcon: certificates3D,
    features: ["Barcode Admit Card", "Fee Dues Validation", "Bulk PDF Download", "Student QR"],
  },
  "examination:exam-reports": {
    title: "Exam Cell Reports",
    route: "/dashboard/examinations?tab=reports",
    section: "Examinations",
    description: "Exam room attendance slips, malpractice incident reports, and invigilator sheets.",
    layoutType: "table",
    accentColor: "#9f1239",
    badgeIcon: reports3D,
    features: ["Attendance Slips", "Duty Allowance Export", "Malpractice Ledger", "Exam Stats"],
  },

  // 21. Marks Evaluation
  "marks-evaluation:marks-entry": {
    title: "Enter Subject Marks",
    route: "/dashboard/marks-entry",
    section: "Examinations",
    description: "Teacher portal to enter theory, practical, internal assessment, and viva marks.",
    layoutType: "table",
    accentColor: "#8b5cf6",
    badgeIcon: marks3D,
    features: ["Fast Tab Entry", "Max Marks Validator", "Absent Marker", "Autosave"],
  },
  "marks-evaluation:marks-verification": {
    title: "Marks Verification & Lock",
    route: "/dashboard/marks-entry?tab=verify",
    section: "Examinations",
    description: "HOD and Exam Controller moderation, score normalization, and final ledger freeze.",
    layoutType: "split-pane",
    accentColor: "#7c3aed",
    badgeIcon: marks3D,
    features: ["Moderation Delta", "Lock Marks Button", "Statistical Bell Curve", "Audit Sign"],
  },

  // 22. Results
  "results:process-results": {
    title: "Process & Calculate GPA",
    route: "/dashboard/results",
    section: "Examinations",
    description: "Automated GPA/CGPA calculation engine with grade boundary configurations and ranking.",
    layoutType: "analytics",
    accentColor: "#10b981",
    badgeIcon: results3D,
    features: ["SGPA / CGPA Engine", "Grace Marks Policy", "Rank Allocator", "Re-eval Calculator"],
  },
  "results:publish-results": {
    title: "Publish Results & Memos",
    route: "/dashboard/results?tab=publish",
    section: "Examinations",
    description: "Publish semester result cards, send parent SMS blasts, and generate marks memos.",
    layoutType: "cards",
    accentColor: "#059669",
    badgeIcon: results3D,
    features: ["One-Click Publish", "Student Portal Sync", "Digital Marks Memo", "SMS Blaster"],
  },

  // 23. Fee Management
  "fee-management:fee-structure": {
    title: "Fee Structure",
    route: "/dashboard/fee-structure",
    section: "Finance",
    description: "Tuition, lab, library, hostel, and examination fee templates by batch and course.",
    layoutType: "table",
    accentColor: "#10b981",
    badgeIcon: fee3D,
    features: ["Fee Heads & Components", "Installment Plans", "Scholarship Rules", "Late Fee Penalties"],
  },
  "fee-management:student-fees": {
    title: "Student Fee Ledger",
    route: "/dashboard/fee-structure?tab=ledger",
    section: "Finance",
    description: "Individual student ledger showing paid installments, pending balance, and concessions.",
    layoutType: "split-pane",
    accentColor: "#059669",
    badgeIcon: fee3D,
    features: ["Ledger Breakdown", "Concession Approvals", "Payment History", "Demand Notice"],
  },
  "fee-management:hostel-fees": {
    title: "Hostel Fees",
    route: "/dashboard/fee-structure?tab=hostel",
    section: "Finance",
    description: "Hostel room rent, mess charges, caution deposits, and resident payment ledgers.",
    layoutType: "table",
    accentColor: "#047857",
    badgeIcon: fee3D,
    features: ["Mess Charges", "Caution Deposit", "Hostel Dues Roster", "Billing Cycle"],
  },
  "fee-management:transport-fees": {
    title: "Transport Fees",
    route: "/dashboard/fee-structure?tab=transport",
    section: "Finance",
    description: "Route and pickup-point based transport fare configuration with monthly and annual slabs.",
    layoutType: "table",
    accentColor: "#f59e0b",
    badgeIcon: transport3D,
    features: ["Route Fare Slabs", "Pickup Point Rates", "Monthly & Annual Slabs", "Distance-based Pricing"],
  },
  "fee-management:fee-types": {
    title: "Fee Types & Categories",
    route: "/dashboard/fee-structure?tab=types",
    section: "Finance",
    description: "Master fee categories for Admission, Tuition, Examination, Transport, and Activities.",
    layoutType: "table",
    accentColor: "#10b981",
    badgeIcon: fee3D,
    features: ["Fee Type Codes", "Category Grouping", "Frequency Rules", "Tax Exemption Tags"],
  },
  "fee-management:scholarships": {
    title: "Scholarships & Concessions",
    route: "/dashboard/fee-structure?tab=scholarships",
    section: "Finance",
    description: "Merit scholarships, sports quota, staff concessions, and government welfare schemes.",
    layoutType: "split-pane",
    accentColor: "#059669",
    badgeIcon: fee3D,
    features: ["Merit Waivers", "Quota Concessions", "Approval Workflow", "Discount Cap Limits"],
  },
  "fee-management:fine-rules": {
    title: "Fine & Late Fee Rules",
    route: "/dashboard/fee-structure?tab=fines",
    section: "Finance",
    description: "Automated penalty rules, grace period configurations, and overdue defaulter surcharges.",
    layoutType: "form",
    accentColor: "#ef4444",
    badgeIcon: fee3D,
    features: ["Grace Days Counter", "Daily Late Fine", "Flat vs Percentage", "Automated Application"],
  },
  "fee-management:payment-history": {
    title: "Payment History & Receipts",
    route: "/dashboard/fee-structure?tab=history",
    section: "Finance",
    description: "Historical transaction audit logs, payment mode reconciliation, and instant reprint desk.",
    layoutType: "table",
    accentColor: "#047857",
    badgeIcon: fee3D,
    features: ["Transaction Audit Trail", "Receipt Reprint", "Bank Settlement Ref", "Cashier Shift Records"],
  },
  "fee-management:fee-collection": {
    title: "Fee Collection & Receipts",
    route: "/dashboard/fee-structure?tab=collection",
    section: "Finance",
    description: "Cash/Card counter collection desk with thermal receipt print and online gateway sync.",
    layoutType: "form",
    accentColor: "#10b981",
    badgeIcon: fee3D,
    features: ["Instant Receipt Print", "UPI / Card / Cash", "Partial Payments", "Cashier Shift"],
  },
  "fee-management:fee-reports": {
    title: "Fee Defaulters & Reports",
    route: "/dashboard/fee-structure?tab=reports",
    section: "Finance",
    description: "Daily cashier collection reports, aging defaulter lists, and fee head summaries.",
    layoutType: "analytics",
    accentColor: "#059669",
    badgeIcon: reports3D,
    features: ["Aging Dues Analysis", "Cashier Reconciliation", "Export Defaulters", "Custom Date Filter"],
  },

  // 24. Payroll
  "payroll:salary-structures": {
    title: "Salary Structures",
    route: "/dashboard/payroll",
    section: "Finance",
    description: "Define base pay, HRA, DA, travel allowance, EPF, and tax deduction formulas.",
    layoutType: "table",
    accentColor: "#0284c7",
    badgeIcon: fee3D,
    features: ["Component Formula", "Tax Slab Rules", "EPF & ESI Ratios", "Grade Pay Bands"],
  },
  "payroll:payroll-assignments": {
    title: "Staff Salary Mapping",
    route: "/dashboard/payroll?tab=assignments",
    section: "Finance",
    description: "Map designated salary structures and bank account details to teaching and non-teaching staff.",
    layoutType: "split-pane",
    accentColor: "#0369a1",
    badgeIcon: fee3D,
    features: ["Individual CTC Mapping", "Bank Details Check", "Deduction Opt-ins", "Bulk Assign"],
  },
  "payroll:payroll-generation": {
    title: "Monthly Payroll Processing",
    route: "/dashboard/payroll?tab=processing",
    section: "Finance",
    description: "Monthly salary calculator incorporating staff attendance, unpaid leaves, and loans.",
    layoutType: "analytics",
    accentColor: "#075985",
    badgeIcon: fee3D,
    features: ["Attendance Deduction Sync", "Overtime Multiplier", "Advance Loan EMI", "Batch Compute"],
  },
  "payroll:payslips": {
    title: "Staff Payslips",
    route: "/dashboard/payroll?tab=payslips",
    section: "Finance",
    description: "Generate, review, and email digital monthly salary slips with college seal and signature.",
    layoutType: "cards",
    accentColor: "#0284c7",
    badgeIcon: certificates3D,
    features: ["PDF Download", "Email to Staff", "Tax Breakdown", "Digital Sign"],
  },
  "payroll:salary-revisions": {
    title: "Revisions, Bonuses & Overtime",
    route: "/dashboard/payroll?tab=revisions",
    section: "Finance",
    description: "Annual increments, festival bonuses, incentive approvals, and salary advances.",
    layoutType: "table",
    accentColor: "#0369a1",
    badgeIcon: fee3D,
    features: ["Increment % Calculator", "Bonus Approvals", "Staff Loan Ledger", "Effective Dates"],
  },
  "payroll:payroll-approvals": {
    title: "Payroll Approvals & Bank Files",
    route: "/dashboard/payroll?tab=approvals",
    section: "Finance",
    description: "Management sign-off and generate standard NEFT/RTGS bank disbursement text files.",
    layoutType: "split-pane",
    accentColor: "#0c4a6e",
    badgeIcon: auditLogs3D,
    features: ["Bank NACH / NEFT File", "Trustee Approval Desk", "Lock Monthly Payroll", "Summary Sheet"],
  },

  // 25. Certificates
  "certificates:issue-certificates": {
    title: "Generate & Issue Certificates",
    route: "/dashboard/certificates",
    section: "Documents & Reports",
    description: "Issue Bonafide, Study, Conduct, Fee Paid, and Transfer Certificates with QR stamps.",
    layoutType: "form",
    accentColor: "#6366f1",
    badgeIcon: certificates3D,
    features: ["Certificate Templates", "Live Preview", "QR Code Authenticator", "Batch Print"],
  },
  "certificates:certificate-history": {
    title: "Issued Certificates Register",
    route: "/dashboard/certificates?tab=history",
    section: "Documents & Reports",
    description: "Audit register of every certificate generated, issuance dates, and verify authenticity.",
    layoutType: "table",
    accentColor: "#4f46e5",
    badgeIcon: certificates3D,
    features: ["Dispatch Number Search", "Instant Re-print", "Revocation Flag", "Export Log"],
  },

  // 26. Reports & Analytics
  "reports-analytics:academic-reports": {
    title: "Academic & Performance Reports",
    route: "/dashboard/reports",
    section: "Documents & Reports",
    description: "Department pass statistics, top rankers, subject failure audits, and NAAC summaries.",
    layoutType: "analytics",
    accentColor: "#3b82f6",
    badgeIcon: reports3D,
    features: ["Pass % Chart", "Subject Wise Drilldown", "NAAC Metric Tables", "Export Word / PDF"],
  },
  "reports-analytics:administrative-reports": {
    title: "Enrollment & Administrative",
    route: "/dashboard/reports?tab=admin",
    section: "Documents & Reports",
    description: "Admissions census, student caste/category ratios, gender diversity, and dropout logs.",
    layoutType: "analytics",
    accentColor: "#2563eb",
    badgeIcon: reports3D,
    features: ["Demographic Split", "Quota Audits", "Staff Ratio KPIs", "Annual Census Report"],
  },
  "reports-analytics:custom-reports": {
    title: "Custom Exports & Data Dumps",
    route: "/dashboard/reports?tab=custom",
    section: "Documents & Reports",
    description: "Configurable dynamic query builder to extract custom spreadsheets with selective columns.",
    layoutType: "table",
    accentColor: "#1d4ed8",
    badgeIcon: reports3D,
    features: ["Column Selector", "Custom Date Filtering", "CSV / Excel Export", "Scheduled Emails"],
  },

  // 27. Hostel Management
  "hostel-management:hostel-rooms": {
    title: "Hostel Blocks, Rooms & Beds",
    route: "/dashboard/hostel",
    section: "Hostel Management",
    description: "Manage hostel buildings, floor rooms, AC/Non-AC types, and individual bed numbers.",
    layoutType: "cards",
    accentColor: "#0ea5e9",
    badgeIcon: campusConfig3D,
    features: ["Block Directory", "Room Capacity", "Vacancy Status", "Amenity Checklist"],
  },
  "hostel-management:bed-allocation": {
    title: "Resident Student Allocation",
    route: "/dashboard/hostel?tab=allocation",
    section: "Hostel Management",
    description: "Allocate vacant beds to admitted students, manage room transfers, and checkouts.",
    layoutType: "split-pane",
    accentColor: "#0284c7",
    badgeIcon: campusConfig3D,
    features: ["Drag & Drop Bed Assign", "Warden Signoff", "Checkout Clearance", "Resident Card"],
  },
  "hostel-management:hostel-attendance": {
    title: "Hostel Night Attendance",
    route: "/dashboard/hostel?tab=attendance",
    section: "Hostel Management",
    description: "Nightly roll-call check, biometric gate logs, and absent boarder notifications.",
    layoutType: "table",
    accentColor: "#0369a1",
    badgeIcon: attendanceTiming3D,
    features: ["Night Curfew Checklist", "Emergency Parent Alert", "Warden Signoff", "Biometric Sync"],
  },
  "hostel-management:hostel-complaints": {
    title: "Outpass, Leaves & Complaints",
    route: "/dashboard/hostel?tab=complaints",
    section: "Hostel Management",
    description: "Digital gate outpasses, weekend leave approvals, and student maintenance tickets.",
    layoutType: "table",
    accentColor: "#0ea5e9",
    badgeIcon: leaveTypes3D,
    features: ["Outpass QR Code", "Parent Consent SMS", "Maintenance Desk", "SLA Tracker"],
  },
  "hostel-management:hostel-reports": {
    title: "Hostel Occupancy & Mess Dues",
    route: "/dashboard/hostel?tab=reports",
    section: "Hostel Management",
    description: "Hostel room occupancy charts, mess bill balances, and resident register exports.",
    layoutType: "analytics",
    accentColor: "#0284c7",
    badgeIcon: reports3D,
    features: ["Occupancy Rate %", "Mess Bill Dues", "Resident Directory", "Export PDF"],
  },

  // 28. Settings
  "settings:landing-configuration": {
    title: "Landing Page Configuration",
    route: "/dashboard/settings/landing",
    section: "Administration",
    description: "Customize public website banner, hero headline, campus photos, and announcements.",
    layoutType: "form",
    accentColor: "#6366f1",
    badgeIcon: campusConfig3D,
    features: ["Hero Image Slider", "Campus Announcement", "Contact Information", "Live Preview"],
  },
  "settings:login-configuration": {
    title: "Login Page Configuration",
    route: "/dashboard/settings/login",
    section: "Administration",
    description: "Configure portal login screen branding, background imagery, and security advisories.",
    layoutType: "form",
    accentColor: "#4f46e5",
    badgeIcon: campusConfig3D,
    features: ["Background Wallpaper", "Help Desk Text", "2FA Setting", "Brand Logo"],
  },
  "settings:campus-configuration": {
    title: "Campus Configuration & Branches",
    route: "/dashboard/settings/campus",
    section: "Administration",
    description: "Manage multiple college campus branches, addresses, board affiliations, and contact info.",
    layoutType: "cards",
    accentColor: "#4338ca",
    badgeIcon: campusConfig3D,
    features: ["Branch Directory", "Affiliation Linkage", "Campus Code", "Branch Admin"],
  },
  "settings:number-series": {
    title: "Auto Number Series",
    route: "/dashboard/settings/number-series",
    section: "Administration",
    description: "Sequential numbering prefix and sequence counters for admissions, invoices, and slips.",
    layoutType: "table",
    accentColor: "#6366f1",
    badgeIcon: numberSeries3D,
    features: ["Prefix Config", "Year Formatting", "Next Counter Number", "Sample Preview"],
  },
  "settings:templates": {
    title: "Templates & Bulk Uploaders",
    route: "/dashboard/settings/templates",
    section: "Administration",
    description: "Official college letterhead templates, certificate designs, and Excel upload templates.",
    layoutType: "cards",
    accentColor: "#4f46e5",
    badgeIcon: templates3D,
    features: ["Excel Sample Files", "Letterhead Background", "HTML Template Editor", "Download Samples"],
  },
  "settings:leave-types": {
    title: "Leave Types & Quotas",
    route: "/dashboard/settings/leave-types",
    section: "Administration",
    description: "Configure annual leave categories, quotas, carryover rules, and encashment terms.",
    layoutType: "table",
    accentColor: "#ec4899",
    badgeIcon: leaveTypes3D,
    features: ["Annual Quota Days", "Carry-forward Cap", "Document Mandatory Flag", "Active Status"],
  },
  "settings:attendance-timing": {
    title: "Attendance Timings & Shifts",
    route: "/dashboard/settings/attendance-timing",
    section: "Administration",
    description: "Set campus shift hours, grace period minutes, half-day cutoffs, and biometric sync rules.",
    layoutType: "form",
    accentColor: "#10b981",
    badgeIcon: attendanceTiming3D,
    features: ["Shift Start / End", "Grace Minutes", "Biometric Device IP", "Half-Day Cutoff"],
  },
  "settings:credentials": {
    title: "Credentials Generator",
    route: "/dashboard/settings/credentials",
    section: "Administration",
    description: "Bulk generate student and faculty portal login usernames and temporary passwords.",
    layoutType: "form",
    accentColor: "#3b82f6",
    badgeIcon: rolesIcon3D,
    features: ["Batch Password Reset", "SMS / Email Dispatch", "Default Pattern Rule", "Export Credentials"],
  },
  "settings:audit-logs": {
    title: "Audit & Security Logs",
    route: "/dashboard/settings/audit-logs",
    section: "Administration",
    description: "Detailed system audit trail: user logins, role modifications, and critical updates.",
    layoutType: "table",
    accentColor: "#64748b",
    badgeIcon: auditLogs3D,
    features: ["IP Address Tracking", "Action Type", "Timestamp Logs", "Export Security Dump"],
  },

  // 29. Roles & Permissions
  "roles-permissions:role-management": {
    title: "Role & Permission Matrix",
    route: "/dashboard/settings/roles-permissions",
    section: "Administration",
    description: "Enterprise RBAC matrix: configure module and screen permissions across all roles.",
    layoutType: "table",
    accentColor: "#8b5cf6",
    badgeIcon: rolesIcon3D,
    features: ["Visual Role Builder", "Full CRUD Matrix", "Clone Role", "Presets Bar"],
  },
  "roles-permissions:user-role-assignment": {
    title: "User Role Assignment",
    route: "/dashboard/settings/roles-permissions?tab=assignments",
    section: "Administration",
    description: "Assign roles to faculty and staff with granular user-specific member overrides.",
    layoutType: "split-pane",
    accentColor: "#7c3aed",
    badgeIcon: rolesIcon3D,
    features: ["Search Users", "Assign Role", "Member Overrides", "Audit User Permissions"],
  },

  // 30. Library
  "library:book-catalog": {
    title: "Book Catalog & Search",
    route: "/dashboard/library",
    section: "Operations",
    description: "Search books by title, author, ISBN, category, shelf rack, and check available copies.",
    layoutType: "cards",
    accentColor: "#14b8a6",
    badgeIcon: templates3D,
    features: ["ISBN Barcode Lookup", "Shelf Location", "Copy Availability", "Add New Book"],
  },
  "library:circulation": {
    title: "Issue & Return Desk",
    route: "/dashboard/library?tab=circulation",
    section: "Operations",
    description: "Issue books, process returns, calculate late fines, and scan student library cards.",
    layoutType: "table",
    accentColor: "#0d9488",
    badgeIcon: templates3D,
    features: ["Scan Barcode", "Due Date Calculator", "Fine Waiver", "Issue Slips"],
  },
  "library:library-members": {
    title: "Student & Staff Cards",
    route: "/dashboard/library?tab=members",
    section: "Operations",
    description: "Manage library membership cards, active book borrow quotas, and clearance certificates.",
    layoutType: "table",
    accentColor: "#0f766e",
    badgeIcon: certificates3D,
    features: ["Max Books Allowed", "No Dues Certificate", "Lost Card Issue", "Borrow History"],
  },

  // 31. Placement
  "placement:placement-drives": {
    title: "Recruitment Drives",
    route: "/dashboard/placement",
    section: "Operations",
    description: "Manage visiting companies, CTC job offers, recruitment drive dates, and eligibility criteria.",
    layoutType: "cards",
    accentColor: "#0ea5e9",
    badgeIcon: totalGroups3D,
    features: ["Company Profiles", "CTC Package", "Drive Dates", "Eligibility Criteria"],
  },
  "placement:student-applications": {
    title: "Applications & Offers",
    route: "/dashboard/placement?tab=applications",
    section: "Operations",
    description: "Shortlisted candidates, written test scores, interview rounds, and offer letter tracker.",
    layoutType: "table",
    accentColor: "#0284c7",
    badgeIcon: totalGroups3D,
    features: ["Application Status", "Interview Rounds", "Offer Letter Vault", "Export Placed List"],
  },
};

/**
 * Resolves preview metadata for any moduleId and screenId with robust fallbacks.
 */
export function getScreenPreview(moduleId, screenId) {
  const key = `${moduleId}:${screenId}`;
  const base = SCREEN_PREVIEWS[key] || {
    title: (screenId || moduleId || "Screen")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    route: `/dashboard/${moduleId}`,
    section: "System Module",
    description: `Administrative management interface for ${screenId || moduleId}.`,
    layoutType: "table",
    accentColor: "#3b82f6",
    badgeIcon: dashboard3D,
    features: ["Search & Filter", "Detail View", "Export Records", "Permission Control"],
  };

  return {
    ...base,
    screenshotCandidate: base.screenshotUrl || `/screen-previews/${moduleId}-${screenId}.png`,
  };
}

/**
 * High-fidelity vector Micro-UI Mockup Engine that renders authentic
 * simulated browser windows with live UI controls matching the screen's layoutType.
 */
export const ScreenVisualMockup = React.memo(function ScreenVisualMockup({
  preview,
  isHovered = false,
  isSelected = false,
}) {
  const { layoutType = "table", accentColor = "#6F8400", badgeIcon, route } = preview;

  return (
    <div
      className={`screen-mockup-frame ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}`}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        border: `1px solid ${isSelected ? "var(--cms-primary, #6F8400)" : "#e2e8f0"}`,
        display: "flex",
        flexDirection: "column",
        boxShadow: isSelected
          ? "0 0 0 2px rgba(111, 132, 0, 0.2), 0 4px 12px rgba(111, 132, 0, 0.08)"
          : "0 2px 6px rgba(16, 32, 60, 0.05)",
        position: "relative",
        userSelect: "none",
        transition: "all 0.22s ease",
      }}
    >
      {/* Mini Browser Bar */}
      <div
        style={{
          height: "22px",
          background: "#f1f5f9",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", gap: "4px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
        </div>
        <div
          style={{
            flex: 1,
            height: "14px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "3px",
            fontSize: "8.5px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            padding: "0 6px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "0.2px",
            fontWeight: 500,
          }}
        >
          {route || "https://cms.college.edu/dashboard"}
        </div>
      </div>

      {/* Screen Canvas Container */}
      <div
        style={{
          flex: 1,
          padding: "10px",
          background: "#fafbfc",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Floating 3D Badge Icon */}
        {badgeIcon && (
          <div
            style={{
              position: "absolute",
              right: "10px",
              bottom: "10px",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 10px rgba(16, 32, 60, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 3,
              transition: "transform 0.22s ease",
              transform: isHovered ? "scale(1.1) rotate(-4deg)" : "scale(1)",
            }}
          >
            <img
              src={badgeIcon}
              alt=""
              style={{
                width: "28px",
                height: "28px",
                objectFit: "contain",
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.15))",
              }}
            />
          </div>
        )}

        {/* Layout-Specific Micro-UI Simulation */}
        {layoutType === "table" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
            {/* Table Search & Filter Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  width: "55%",
                  height: "12px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 4px",
                }}
              >
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#94a3b8" }} />
              </div>
              <div
                style={{
                  width: "22px",
                  height: "12px",
                  background: accentColor,
                  borderRadius: "3px",
                  opacity: 0.9,
                }}
              />
            </div>
            {/* Simulated Table Rows */}
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                style={{
                  height: "18px",
                  background: row === 1 ? "#f1f5f9" : "#ffffff",
                  borderRadius: "4px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 6px",
                  gap: "6px",
                }}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: accentColor, opacity: 0.85 }} />
                <div style={{ flex: 1, height: "4px", background: "#cbd5e1", borderRadius: "2px" }} />
                <div style={{ width: "24px", height: "4px", background: "#e2e8f0", borderRadius: "2px" }} />
                <div
                  style={{
                    width: "14px",
                    height: "8px",
                    borderRadius: "2px",
                    background: row === 2 ? "#eef5e7" : `${accentColor}18`,
                    border: `1px solid ${row === 2 ? "#6F8400" : accentColor}`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {layoutType === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
            {/* 3 Metric Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div style={{ width: "16px", height: "3px", background: "#94a3b8", borderRadius: "2px" }} />
                  <div style={{ width: "22px", height: "7px", background: accentColor, borderRadius: "2px" }} />
                </div>
              ))}
            </div>
            {/* Simulated Chart Wave */}
            <div
              style={{
                height: "36px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                padding: "4px",
                display: "flex",
                alignItems: "flex-end",
                gap: "4px",
              }}
            >
              {[25, 45, 60, 40, 75, 90, 65, 80].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i === 5 ? accentColor : `${accentColor}44`,
                    borderRadius: "2px 2px 0 0",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {layoutType === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ width: "24px", height: "3px", background: "#94a3b8", borderRadius: "2px" }} />
                <div style={{ height: "14px", background: "#ffffff", borderRadius: "3px", border: "1px solid #cbd5e1" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ width: "20px", height: "3px", background: "#94a3b8", borderRadius: "2px" }} />
                <div style={{ height: "14px", background: "#ffffff", borderRadius: "3px", border: "1px solid #cbd5e1" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ width: "32px", height: "3px", background: "#94a3b8", borderRadius: "2px" }} />
              <div style={{ height: "20px", background: "#ffffff", borderRadius: "3px", border: "1px dashed #cbd5e1" }} />
            </div>
            <div
              style={{
                alignSelf: "flex-end",
                width: "36px",
                height: "12px",
                background: accentColor,
                borderRadius: "3px",
              }}
            />
          </div>
        )}

        {layoutType === "calendar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "3px" }}>
              {["M", "T", "W", "T", "F"].map((d, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "7.5px",
                    color: "#64748b",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "3px" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slot) => (
                <div
                  key={slot}
                  style={{
                    height: "16px",
                    background: slot % 3 === 0 ? `${accentColor}25` : "#ffffff",
                    border: slot % 3 === 0 ? `1px solid ${accentColor}66` : "1px solid #e2e8f0",
                    borderRadius: "3px",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {layoutType === "cards" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", width: "100%" }}>
            {[1, 2, 3, 4].map((c) => (
              <div
                key={c}
                style={{
                  height: "26px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  padding: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                <div style={{ width: "28px", height: "4px", background: accentColor, borderRadius: "2px" }} />
                <div style={{ width: "18px", height: "3px", background: "#cbd5e1", borderRadius: "1.5px" }} />
              </div>
            ))}
          </div>
        )}

        {layoutType === "split-pane" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "5px", width: "100%", height: "54px" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "3px",
                padding: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "10px",
                    background: i === 1 ? accentColor : "#e2e8f0",
                    borderRadius: "2px",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "3px",
                padding: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
              }}
            >
              <div style={{ width: "40%", height: "5px", background: "#94a3b8", borderRadius: "2px" }} />
              <div style={{ width: "70%", height: "4px", background: "#cbd5e1", borderRadius: "2px" }} />
              <div style={{ flex: 1, background: "#f8fafc", borderRadius: "2px", marginTop: "2px" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
