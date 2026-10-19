/**
 * PIRNAV COLLEGE MANAGEMENT SYSTEM — Non-Teaching Staff Service
 * 
 * Provides centralized data access, role-based workflows, persistence in localStorage,
 * and seamless fallback when remote APIs are unavailable.
 */

import { getAuthUser } from "@/features/authStorage.js";
import { getLeaveRequests, submitLeaveRequest } from "@/features/leave/services/leaveStore.js";

const STORAGE_PREFIX = "cms_nts_";

function getStored(key, fallback) {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

// Default profile for NTS001
export const DEFAULT_NTS_USER = {
  id: "nts-001",
  staffId: 901,
  employeeId: "NTS001",
  name: "Demo Non-Teaching Staff",
  fullName: "Demo Non-Teaching Staff",
  displayName: "Demo Non-Teaching Staff",
  email: "nts001@cms.com",
  role: "NON_TEACHING_STAFF",
  department: "Administration",
  designation: "Office Assistant",
  departmentName: "Administration",
  designationName: "Office Assistant",
  staffType: "Non-Teaching",
  mobile: "+91 98765 43299",
  phone: "+91 98765 43299",
  joiningDate: "2023-06-15",
  campusName: "Main Campus (HQ)",
  bloodGroup: "O+",
  gender: "Male",
  dob: "1994-08-22",
  address: "Plot 42, Green Valley Enclave, Campus Road, Visakhapatnam",
  emergencyContact: "+91 98765 00112 (Spouse)",
  qualification: "B.Com, PGDCA (Computer Applications)",
  reportingManager: "Administrative Officer (AO)",
  shift: "Morning (09:00 AM - 05:30 PM)",
  employmentType: "Full-Time Regular",
  status: "Active",
};

export const DEFAULT_LEAVE_BALANCES = [
  { type: "Casual Leave (CL)", code: "CL", remaining: 6, total: 12, tone: "blue" },
  { type: "Sick Leave (SL)", code: "SL", remaining: 5, total: 10, tone: "green" },
  { type: "Earned Leave (EL)", code: "EL", remaining: 3, total: 15, tone: "amber" },
  { type: "Compensatory Off", code: "CO", remaining: 1, total: 2, tone: "purple" },
];

export const INITIAL_LEAVE_HISTORY = [
  {
    id: "NTS-LV-2026-04",
    type: "Casual Leave (CL)",
    fromDate: "2026-11-02",
    toDate: "2026-11-03",
    days: 2,
    reason: "Personal family event in native town",
    status: "Pending",
    appliedDate: "2026-10-14",
    reviewedBy: "Pending Admin / HR Approval",
    remark: "Awaiting review by Administrative Officer",
  },
  {
    id: "NTS-LV-2026-03",
    type: "Sick Leave (SL)",
    fromDate: "2026-09-18",
    toDate: "2026-09-19",
    days: 2,
    reason: "Viral fever and doctor consultation",
    status: "Approved",
    appliedDate: "2026-09-17",
    reviewedBy: "Dr. K. Srinivas (HR Head)",
    remark: "Medical certificate verified. Approved.",
  },
  {
    id: "NTS-LV-2026-02",
    type: "Casual Leave (CL)",
    fromDate: "2026-08-11",
    toDate: "2026-08-11",
    days: 1,
    reason: "Bank documentation and personal work",
    status: "Approved",
    appliedDate: "2026-08-08",
    reviewedBy: "Administrative Officer",
    remark: "Approved with alternate staff coverage.",
  },
  {
    id: "NTS-LV-2026-01",
    type: "Earned Leave (EL)",
    fromDate: "2026-07-02",
    toDate: "2026-07-06",
    days: 5,
    reason: "Annual family pilgrimage",
    status: "Rejected",
    appliedDate: "2026-06-25",
    reviewedBy: "Principal Office",
    remark: "Overlaps with annual admission rush. Please reschedule.",
  },
];

export const INITIAL_TASKS = [
  {
    id: "TSK-101",
    title: "Verify Inward Courier & Examination Consignments",
    description: "Inspect sealed examination question booklets received from the University Board, match challan count, and log into safe locker register.",
    category: "Examination Support",
    priority: "Urgent",
    status: "In Progress",
    assignedDate: "2026-10-15",
    dueDate: "2026-10-15",
    assignedBy: "Controller of Examinations",
  },
  {
    id: "TSK-102",
    title: "Compile Monthly Non-Teaching Stationery Requisition",
    description: "Gather printer cartridges, registers, stamp pads, and filing folders requests from all 16 departments and submit to Stores Manager.",
    category: "Office Administration",
    priority: "High",
    status: "Pending",
    assignedDate: "2026-10-14",
    dueDate: "2026-10-16",
    assignedBy: "Administrative Officer",
  },
  {
    id: "TSK-103",
    title: "Archive Board Inspection Documentation (2025-26)",
    description: "File copies of campus safety certifications, fire clearance, and faculty affiliation affidavits in Record Room Almirah 4.",
    category: "Documentation",
    priority: "Medium",
    status: "In Progress",
    assignedDate: "2026-10-12",
    dueDate: "2026-10-18",
    assignedBy: "Office Superintendent",
  },
  {
    id: "TSK-104",
    title: "Coordinate Campus ID Card Distribution for Batch 2026",
    description: "Sort smart RFID cards printed for 1st Year Intermediate students by section and handover to respective Class Teachers.",
    category: "Student Support",
    priority: "High",
    status: "In Progress",
    assignedDate: "2026-10-11",
    dueDate: "2026-10-17",
    assignedBy: "Admissions Coordinator",
  },
  {
    id: "TSK-105",
    title: "Update Notice Boards with Revised Holiday Notification",
    description: "Print and pin circular #PCMS/CIR/2026/88 regarding Dussehra recess on Administrative Block and Staff Room notice boards.",
    category: "Campus Operations",
    priority: "Low",
    status: "Pending",
    assignedDate: "2026-10-15",
    dueDate: "2026-10-16",
    assignedBy: "Administrative Officer",
  },
  {
    id: "TSK-106",
    title: "Prepare Office Visitor Logs for Weekly Admin Audit",
    description: "Reconcile security gate registers with visitor appointment logs and compile weekly executive summary.",
    category: "Office Administration",
    priority: "Medium",
    status: "Completed",
    assignedDate: "2026-10-08",
    dueDate: "2026-10-14",
    assignedBy: "Administrative Officer",
  },
  {
    id: "TSK-107",
    title: "Submit Department Equipment Maintenance Checklist",
    description: "Check Xerox machines, paper shredders, and UPS backups across Admin sections and sign service log.",
    category: "Facility",
    priority: "Low",
    status: "Completed",
    assignedDate: "2026-10-06",
    dueDate: "2026-10-10",
    assignedBy: "Facility Supervisor",
  },
  {
    id: "TSK-108",
    title: "Reconcile Biometric Attendance Discrepancy Slips",
    description: "Process 6 on-duty slips submitted by drivers and security staff for the first week of October.",
    category: "Attendance",
    priority: "High",
    status: "Completed",
    assignedDate: "2026-10-07",
    dueDate: "2026-10-09",
    assignedBy: "HR Executive",
  },
];

export const INITIAL_ANNOUNCEMENTS = [
  {
    id: "ANN-2026-31",
    title: "Mandatory Staff Meeting on Biometric Punch Compliance",
    date: "2026-10-14",
    category: "HR Notice",
    publisher: "HR & Establishment Wing",
    priority: "High",
    content: "All non-teaching personnel are reminded that biometric check-in must be completed by 09:15 AM to avoid late mark accrual. Three late punches in a calendar month result in half-day deduction as per service rules.",
  },
  {
    id: "ANN-2026-30",
    title: "Annual Campus Cleanliness & Sanitation Drive",
    date: "2026-10-12",
    category: "Operations",
    publisher: "Campus Facilities Committee",
    priority: "Normal",
    content: "Special sanitation and e-waste disposal drive will take place this Saturday across all laboratory storerooms, library stack rooms, and record archives.",
  },
  {
    id: "ANN-2026-29",
    title: "Employee PF & ESI Statement Generation Available",
    date: "2026-10-10",
    category: "Accounts & Payroll",
    publisher: "Accounts Department",
    priority: "Normal",
    content: "Provident Fund and Insurance statements for Q2 have been finalized. Staff members may verify their contribution slips on the Accounts notice board or download digitally.",
  },
  {
    id: "ANN-2026-28",
    title: "Fire Safety Drill & Emergency Equipment Inspection",
    date: "2026-10-05",
    category: "Security",
    publisher: "Campus Safety Directorate",
    priority: "Urgent",
    content: "Mandatory fire drill conducted successfully. Fire extinguishers on Floors 1-3 recharged. All staff must be aware of emergency assembly zones.",
  },
];

export const INITIAL_SUPPORT_TICKETS = [
  {
    id: "TKT-2026-104",
    subject: "ERP Attendance Sync Delay for Terminal 3",
    category: "IT Support",
    priority: "Medium",
    status: "In Progress",
    createdAt: "2026-10-14",
    description: "Biometric Terminal 3 outside Admin Office is taking over 30 seconds to sync punch logs with the central database.",
    response: "IT Engineer assigned (Ticket #442). Firmware update scheduled today at 05:45 PM.",
  },
  {
    id: "TKT-2026-101",
    subject: "AC Unit Not Cooling in Administrative Office Room 102",
    category: "Maintenance",
    priority: "High",
    status: "Resolved",
    createdAt: "2026-10-11",
    description: "Split AC unit compressor making rattling noise and not cooling effectively during afternoon hours.",
    response: "Serviced and gas recharged by Maintenance Team on 12-Oct-2026. Working normally.",
  },
  {
    id: "TKT-2026-098",
    subject: "Request for Canon Laser Printer Toner Cartridge",
    category: "Office Supplies",
    priority: "Low",
    status: "Resolved",
    createdAt: "2026-10-02",
    description: "Black toner cartridge level at 5% on Dispatch section printer.",
    response: "New cartridge issued from Central Stores on 03-Oct-2026.",
  },
];

// Generate October 2026 Attendance Logs
export function generateOctoberAttendanceLogs() {
  const logs = [];
  const today = 15; // Today is Oct 15, 2026

  for (let day = today; day >= 1; day--) {
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `2026-10-${dayStr}`;
    const d = new Date(2026, 9, day);
    const dayOfWeek = d.getDay(); // 0 is Sunday

    if (dayOfWeek === 0) {
      logs.push({
        date: dateStr,
        day: "Sunday",
        checkIn: "--",
        checkOut: "--",
        hours: "--",
        status: "Weekly Off",
        tone: "neutral",
        remarks: "Scheduled Sunday Off",
      });
      continue;
    }

    if (day === 2) {
      logs.push({
        date: dateStr,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        checkIn: "--",
        checkOut: "--",
        hours: "--",
        status: "Holiday",
        tone: "purple",
        remarks: "Gandhi Jayanti",
      });
      continue;
    }

    if (day === today) {
      logs.push({
        date: dateStr,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        checkIn: "09:04 AM",
        checkOut: "--",
        hours: "Ongoing",
        status: "Present",
        tone: "green",
        remarks: "Punched in on time (Biometric Terminal 1)",
      });
      continue;
    }

    if (day === 8) {
      logs.push({
        date: dateStr,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        checkIn: "09:28 AM",
        checkOut: "05:35 PM",
        hours: "8h 07m",
        status: "Late",
        tone: "amber",
        remarks: "Late arrival by 28m (Traffic delay slip approved)",
      });
      continue;
    }

    if (day === 5) {
      logs.push({
        date: dateStr,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        checkIn: "--",
        checkOut: "--",
        hours: "--",
        status: "Absent",
        tone: "red",
        remarks: "Unplanned absence (Adjusted against CL)",
      });
      continue;
    }

    // Normal working days
    logs.push({
      date: dateStr,
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      checkIn: `08:${52 + (day % 12)} AM`,
      checkOut: `05:${30 + (day % 15)} PM`,
      hours: "8h 35m",
      status: "Present",
      tone: "green",
      remarks: "Regular 8.5-hr shift completed",
    });
  }

  return logs;
}

// ──────────────────────────────────────────────────────────────────────────
// Service API Methods
// ──────────────────────────────────────────────────────────────────────────

export const nonTeachingService = {
  // Profile
  getProfile: () => {
    const authUser = getAuthUser();
    const stored = getStored("profile", null);
    return {
      ...DEFAULT_NTS_USER,
      ...(authUser || {}),
      ...(stored || {}),
    };
  },

  updateProfile: (updates) => {
    const current = nonTeachingService.getProfile();
    const updated = { ...current, ...updates };
    setStored("profile", updated);
    return updated;
  },

  // Attendance
  getAttendanceLogs: () => {
    return getStored("attendance_logs", generateOctoberAttendanceLogs());
  },

  getAttendanceSummary: () => {
    return {
      attendanceRate: 95.8,
      presentDays: 22,
      absentDays: 1,
      lateDays: 1,
      totalWorkingHours: "176 hrs",
      shiftTime: "09:00 AM - 05:30 PM",
      todayStatus: "Present",
      checkInToday: "09:04 AM",
    };
  },

  recordPunch: (action = "in") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    const currentLogs = nonTeachingService.getAttendanceLogs();
    const todayStr = now.toISOString().split("T")[0];

    const updated = currentLogs.map((log) => {
      if (log.date === todayStr) {
        if (action === "in") {
          return { ...log, checkIn: timeStr, status: "Present", tone: "green", remarks: "Manual biometric punch in" };
        } else {
          return { ...log, checkOut: timeStr, hours: "8h 15m", remarks: "Punched out successfully" };
        }
      }
      return log;
    });

    setStored("attendance_logs", updated);
    return { timeStr, action };
  },

  // Leave
  getLeaveBalances: () => {
    return getStored("leave_balances", DEFAULT_LEAVE_BALANCES);
  },

  getLeaveHistory: () => {
    return getStored("leave_history", INITIAL_LEAVE_HISTORY);
  },

  applyForLeave: async (payload) => {
    const newRequest = {
      id: `NTS-LV-2026-${String(Date.now()).slice(-4)}`,
      type: payload.type || "Casual Leave (CL)",
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      days: payload.days || 1,
      reason: payload.reason,
      status: "Pending", // Non-teaching staff CANNOT self-approve leave
      appliedDate: new Date().toISOString().split("T")[0],
      reviewedBy: "Pending Admin / HR Approval",
      remark: "Awaiting review by Administrative Officer",
      documentName: payload.documentName || null,
    };

    const history = nonTeachingService.getLeaveHistory();
    const updated = [newRequest, ...history];
    setStored("leave_history", updated);

    // Attempt real backend call if available
    try {
      await submitLeaveRequest({
        leaveType: payload.typeCode || 1,
        startDate: payload.fromDate,
        endDate: payload.toDate,
        reason: payload.reason,
      });
    } catch {
      /* fallback to local persistence */
    }

    return newRequest;
  },

  cancelLeave: (id) => {
    const history = nonTeachingService.getLeaveHistory();
    const updated = history.filter((req) => req.id !== id);
    setStored("leave_history", updated);
    return updated;
  },

  // Tasks
  getTasks: () => {
    return getStored("tasks", INITIAL_TASKS);
  },

  updateTaskStatus: (taskId, newStatus) => {
    const tasks = nonTeachingService.getTasks();
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setStored("tasks", updated);
    return updated;
  },

  addTask: (task) => {
    const tasks = nonTeachingService.getTasks();
    const newTask = {
      ...task,
      id: `TSK-${Date.now().toString().slice(-4)}`,
      assignedDate: new Date().toISOString().split("T")[0],
      status: task.status || "Pending",
      assignedBy: "Self / Personal Reminder",
    };
    const updated = [newTask, ...tasks];
    setStored("tasks", updated);
    return newTask;
  },

  // Announcements
  getAnnouncements: () => {
    return getStored("announcements", INITIAL_ANNOUNCEMENTS);
  },

  // Support
  getSupportTickets: () => {
    return getStored("support_tickets", INITIAL_SUPPORT_TICKETS);
  },

  createSupportTicket: (ticket) => {
    const tickets = nonTeachingService.getSupportTickets();
    const newTicket = {
      ...ticket,
      id: `TKT-2026-${Date.now().toString().slice(-3)}`,
      status: "Open",
      createdAt: new Date().toISOString().split("T")[0],
      response: "Ticket received. Assigned to Campus Helpdesk queue.",
    };
    const updated = [newTicket, ...tickets];
    setStored("support_tickets", updated);
    return newTicket;
  },
};
