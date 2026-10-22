/**
 * PIRNAV COLLEGE MANAGEMENT SYSTEM — Non-Teaching Staff Service
 * 
 * Provides centralized data access, role-based workflows, persistence in localStorage,
 * and seamless fallback when remote APIs are unavailable.
 */

import { getAuthUser } from "@/features/authStorage.js";
import { submitLeaveRequest } from "@/features/leave/services/leaveStore.js";
import { announcementService } from "@/services/announcementService.js";

const STORAGE_PREFIX = "cms_nonteaching_v2_";

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

export const getEmptyNtsUser = () => {
  const authUser = getAuthUser() || {};
  let name = authUser.name || authUser.fullName || authUser.username || "Non-Teaching Staff";
  name = name.replace(/\bDemo\s*/gi, "").trim() || "Non-Teaching Staff";
  return {
    id: authUser.staffId || authUser.id || "",
    staffId: authUser.staffId || authUser.id || null,
    employeeId: authUser.employeeId || authUser.empId || "--",
    name: name,
    fullName: name,
    displayName: name,
    email: authUser.email || "--",
    role: authUser.role || "NON_TEACHING_STAFF",
    department: authUser.department || authUser.departmentName || "--",
    designation: authUser.designation || authUser.designationName || "--",
    departmentName: authUser.departmentName || authUser.department || "--",
    designationName: authUser.designationName || authUser.designation || "--",
    staffType: authUser.staffType || "Non-Teaching",
    mobile: authUser.mobile || authUser.phone || "--",
    phone: authUser.phone || authUser.mobile || "--",
    joiningDate: authUser.joiningDate || authUser.dateOfJoining || "--",
    campusName: authUser.campusName || "Main Campus (HQ)",
    bloodGroup: authUser.bloodGroup || "--",
    gender: authUser.gender || "--",
    dob: authUser.dob || "--",
    address: authUser.address || "--",
    emergencyContact: authUser.emergencyContact || authUser.altMobile || "--",
    qualification: authUser.qualification || "--",
    reportingManager: authUser.reportingManager || "--",
    shift: authUser.shift || "Morning (09:00 AM - 04:30 PM)",
    employmentType: authUser.employmentType || "Regular",
    status: authUser.status || "Active",
  };
};

export const DEFAULT_NTS_USER = getEmptyNtsUser();
export const DEFAULT_LEAVE_BALANCES = [];
export const INITIAL_LEAVE_HISTORY = [];
export const INITIAL_TASKS = [];
export const INITIAL_ANNOUNCEMENTS = [];
export const INITIAL_SUPPORT_TICKETS = [];

export function generateOctoberAttendanceLogs() {
  return [];
}

// ──────────────────────────────────────────────────────────────────────────
// Service API Methods
// ──────────────────────────────────────────────────────────────────────────

export const nonTeachingService = {
  // Profile
  getProfile: () => {
    const base = getEmptyNtsUser();
    const stored = getStored("profile", null);
    const merged = {
      ...base,
      ...(stored || {}),
    };
    const cleanName = (merged.displayName || merged.name || merged.fullName || "Non-Teaching Staff")
      .replace(/\bDemo\s*/gi, "")
      .trim() || "Non-Teaching Staff";
    return {
      ...merged,
      name: cleanName,
      fullName: cleanName,
      displayName: cleanName,
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
    return getStored("attendance_logs", []);
  },

  getAttendanceSummary: () => {
    return {
      attendanceRate: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalWorkingHours: "0 hrs",
      shiftTime: "09:00 AM - 04:30 PM",
      todayStatus: "Not Punched",
      checkInToday: "--",
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
          return { ...log, checkOut: timeStr, hours: "0h", remarks: "Punched out successfully" };
        }
      }
      return log;
    });

    setStored("attendance_logs", updated);
    return { timeStr, action };
  },

  // Leave
  getLeaveBalances: () => {
    return getStored("leave_balances", []);
  },

  getLeaveHistory: () => {
    return getStored("leave_history", []);
  },

  applyForLeave: async (payload) => {
    const newRequest = {
      id: `NTS-LV-${String(Date.now()).slice(-4)}`,
      type: payload.type || "Casual Leave (CL)",
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      days: payload.days || 1,
      reason: payload.reason,
      status: "Pending",
      appliedDate: new Date().toISOString().split("T")[0],
      reviewedBy: "Pending Admin / HR Approval",
      remark: "Awaiting review",
      documentName: payload.documentName || null,
    };

    const history = nonTeachingService.getLeaveHistory();
    const updated = [newRequest, ...history];
    setStored("leave_history", updated);

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
    return getStored("tasks", []);
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
    return announcementService.getNonTeachingAnnouncements();
  },

  addAnnouncement: (announcement) => {
    return announcementService.createAnnouncement({
      ...announcement,
      targetAudience: announcement.targetAudience || "Non-Teaching Staff",
    });
  },

  deleteAnnouncement: (id) => {
    return announcementService.deleteAnnouncement(id);
  },

  // Support
  getSupportTickets: () => {
    return getStored("support_tickets", []);
  },

  createSupportTicket: (ticket) => {
    const tickets = nonTeachingService.getSupportTickets();
    const newTicket = {
      ...ticket,
      id: `TKT-${Date.now().toString().slice(-4)}`,
      status: "Open",
      createdAt: new Date().toISOString().split("T")[0],
      response: "Ticket received. Assigned to Campus Helpdesk queue.",
    };
    const updated = [newTicket, ...tickets];
    setStored("support_tickets", updated);
    return newTicket;
  },
};
