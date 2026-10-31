/**
 * PIRNAV COLLEGE MANAGEMENT SYSTEM — Non-Teaching Staff Service
 * 
 * Provides centralized data access, role-based workflows, remote API integration,
 * and seamless offline/localStorage fallback.
 */

import apiClient from "@/api/apiClient.js";
import { getAuthUser } from "@/features/authStorage.js";
import { announcementService } from "@/services/announcementService.js";
import { attendanceService } from "@/api/attendanceService.js";

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
    id: authUser.staffId || authUser.id || "nts-001",
    staffId: authUser.staffId || authUser.id || 901,
    employeeId: authUser.employeeId || authUser.empId || "NTS001",
    name: name,
    fullName: name,
    displayName: name,
    email: authUser.email || "nts001@cms.com",
    role: authUser.role || "NON_TEACHING_STAFF",
    department: authUser.department || authUser.departmentName || "Administration",
    designation: authUser.designation || authUser.designationName || "Office Assistant",
    departmentName: authUser.departmentName || authUser.department || "Administration",
    designationName: authUser.designationName || authUser.designation || "Office Assistant",
    staffType: authUser.staffType || "Non-Teaching",
    mobile: authUser.mobile || authUser.phone || "+91 98765 43299",
    phone: authUser.phone || authUser.mobile || "+91 98765 43299",
    joiningDate: authUser.joiningDate || authUser.dateOfJoining || "2023-06-15",
    campusName: authUser.campusName || "Main Campus (HQ)",
    bloodGroup: authUser.bloodGroup || "O+",
    gender: authUser.gender || "Male",
    dob: authUser.dob || "1994-08-22",
    address: authUser.address || "Plot 42, Green Valley Enclave, Campus Road, Visakhapatnam",
    emergencyContact: authUser.emergencyContact || authUser.altMobile || "+91 98765 00112 (Spouse)",
    qualification: authUser.qualification || "B.Com, PGDCA (Computer Applications)",
    reportingManager: authUser.reportingManager || "Administrative Officer (AO)",
    shift: authUser.shift || "Morning (09:00 AM - 05:30 PM)",
    employmentType: authUser.employmentType || "Full-Time Regular",
    status: authUser.status || "Active",
  };
};

export const DEFAULT_NTS_USER = getEmptyNtsUser();
export const DEFAULT_LEAVE_BALANCES = [
  { code: "CL", categoryCode: "CL", type: "Casual Leave", categoryName: "Casual Leave", title: "Casual Leave", total: 12, remaining: 12, used: 0, tone: "blue" },
  { code: "SL", categoryCode: "SL", type: "Sick Leave", categoryName: "Sick Leave", title: "Sick Leave", total: 10, remaining: 10, used: 0, tone: "green" },
  { code: "EL", categoryCode: "EL", type: "Earned Leave", categoryName: "Earned Leave", title: "Earned Leave", total: 15, remaining: 15, used: 0, tone: "purple" },
  { code: "CO", categoryCode: "CO", type: "Compensatory Off / OD", categoryName: "Compensatory Off / OD", title: "Compensatory Off / OD", total: 8, remaining: 8, used: 0, tone: "amber" },
];
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
  // Profile (Live DB integration via /api/v1/staff/me)
  fetchProfile: async () => {
    try {
      const res = await apiClient.get("/api/v1/staff/me");
      const d = res?.data || res;
      if (d && (d.id || d.employeeId || d.email)) {
        const base = nonTeachingService.getProfile();
        const fullName = `${d.firstName || ""} ${d.middleName || ""} ${d.lastName || ""}`.trim() || d.fullName || base.name;

        let ecStr = "+91 98765 00112 (Spouse)";
        if (d.emergencyContact) {
          if (typeof d.emergencyContact === "object") {
            const p = d.emergencyContact.mobile || d.emergencyContact.alternateMobile || "";
            const r = d.emergencyContact.relationship || d.emergencyContact.contactName || "";
            ecStr = p && r ? `${p} (${r})` : p || r || ecStr;
          } else {
            ecStr = String(d.emergencyContact);
          }
        } else if (d.alternateMobile) {
          ecStr = d.alternateMobile;
        }

        let addrStr = "Plot 42, Green Valley Enclave, Campus Road, Visakhapatnam";
        if (d.currentAddress) {
          if (typeof d.currentAddress === "object") {
            const parts = [
              d.currentAddress.street || d.currentAddress.currentAddress,
              d.currentAddress.city,
              d.currentAddress.state,
              d.currentAddress.pincode,
            ].filter(Boolean);
            addrStr = parts.length > 0 ? parts.join(", ") : addrStr;
          } else {
            addrStr = String(d.currentAddress);
          }
        }

        const updated = {
          ...base,
          id: d.id || base.id,
          staffId: d.id || base.staffId,
          employeeId: d.employeeId || base.employeeId || "NTS001",
          name: fullName,
          fullName: fullName,
          displayName: fullName,
          email: d.email || base.email,
          department: d.departmentName || d.department || base.department,
          designation: d.designationName || d.designation || base.designation,
          departmentName: d.departmentName || d.department || base.departmentName,
          designationName: d.designationName || d.designation || base.designationName,
          mobile: d.mobile || d.phone || base.mobile,
          emergencyContact: ecStr,
          address: addrStr,
          qualification: d.highestQualification || d.qualification || base.qualification,
          gender: d.gender || base.gender,
          bloodGroup: d.bloodGroup || base.bloodGroup,
          dob: d.dob || (d.dateOfBirth ? String(d.dateOfBirth).split("T")[0] : base.dob),
          joiningDate: d.joiningDate || (d.dateOfJoining ? String(d.dateOfJoining).split("T")[0] : base.joiningDate),
          reportingManager: d.reportingManager || base.reportingManager,
          shift: d.shift || base.shift,
          status: d.status || base.status,
          employmentType: d.employmentType || base.employmentType,
          campusName: d.campusName || base.campusName,
        };
        nonTeachingService.updateProfile(updated);
        return updated;
      }
    } catch {
      /* Fallback gracefully */
    }
    return nonTeachingService.getProfile();
  },

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
      workingDays: 0,
      presentDays: 0,
      approvedLeaves: 0,
      absentDays: 0,
    };
  },

  recordPunch: (action) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    return { success: true, action, timeStr };
  },

  // Leave Balances & History
  getLeaveBalances: () => {
    return getStored("leave_balances", DEFAULT_LEAVE_BALANCES);
  },

  getLeaveHistory: () => {
    return getStored("leave_history", INITIAL_LEAVE_HISTORY);
  },

  fetchLeaveData: async () => {
    try {
      const [histRes, catRes] = await Promise.allSettled([
        apiClient.get("/api/v1/staff-attendance/leave/my-history"),
        apiClient.get("/api/v1/leave-categories"),
      ]);

      let balances = DEFAULT_LEAVE_BALANCES;
      let history = [];

      if (histRes.status === "fulfilled") {
        const d = histRes.value?.data?.data || histRes.value?.data?.Data;
        if (d) {
          if (Array.isArray(d.history)) history = d.history;
          if (d.balance) {
            balances = [
              { code: "CL", categoryCode: "CL", type: "Casual Leave", categoryName: "Casual Leave", title: "Casual Leave", total: 12, remaining: 12, used: 0, tone: "blue" },
              { code: "SL", categoryCode: "SL", type: "Sick Leave", categoryName: "Sick Leave", title: "Sick Leave", total: 10, remaining: 10, used: 0, tone: "green" },
              { code: "EL", categoryCode: "EL", type: "Earned Leave", categoryName: "Earned Leave", title: "Earned Leave", total: 15, remaining: 15, used: 0, tone: "purple" },
              { code: "CO", categoryCode: "CO", type: "Compensatory Off / OD", categoryName: "Compensatory Off / OD", title: "Compensatory Off / OD", total: 8, remaining: 8, used: 0, tone: "amber" },
            ];
          }
        }
      }

      if (catRes.status === "fulfilled") {
        const catList = catRes.value?.data?.data || catRes.value?.data?.Data || catRes.value?.data || [];
        if (Array.isArray(catList) && catList.length > 0 && balances === DEFAULT_LEAVE_BALANCES) {
          balances = catList.map((c, idx) => ({
            code: c.categoryCode || c.code || "LEAVE",
            categoryCode: c.categoryCode || c.code || "LEAVE",
            type: c.categoryName || c.name || "Leave",
            categoryName: c.categoryName || c.name || "Leave",
            title: c.categoryName || c.name || "Leave",
            total: Number(c.annualQuota) || 12,
            remaining: Number(c.annualQuota) || 12,
            used: 0,
            tone: idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "purple" : "amber",
          }));
        }
      }

      if (balances.length > 0) setStored("leave_balances", balances);
      if (history.length > 0) setStored("leave_history", history);

      return { balances, history };
    } catch {
      /* fallback */
    }
    return {
      balances: nonTeachingService.getLeaveBalances(),
      history: nonTeachingService.getLeaveHistory(),
    };
  },

  fetchAttendanceSummary: async () => {
    try {
      const res = await apiClient.get("/api/v1/staff-attendance/my-history?period=month");
      const summary = res?.data?.data?.summary || res?.data?.Data?.Summary || res?.data?.Summary;
      if (summary) {
        const mapped = {
          attendanceRate: Number(summary.attendanceRate ?? summary.AttendanceRate ?? 95.2),
          workingDays: Number(summary.workingDays ?? summary.WorkingDays ?? 22),
          presentDays: Number(summary.presentDays ?? summary.PresentDays ?? 20),
          approvedLeaves: Number(summary.approvedLeaves ?? summary.ApprovedLeaves ?? 2),
          absentDays: Number(summary.absentDays ?? summary.AbsentDays ?? 0),
        };
        setStored("attendance_summary", mapped);
        return mapped;
      }
    } catch {
      /* fallback */
    }
    return nonTeachingService.getAttendanceSummary();
  },

  // Tasks (Connected to /api/v1/staff-tasks)
  fetchTasks: async () => {
    try {
      const res = await apiClient.get("/api/v1/staff-tasks/my");
      const list = res?.data?.data || res?.data || [];
      if (Array.isArray(list)) {
        setStored("tasks", list);
        return list;
      }
    } catch {
      /* fallback */
    }
    return nonTeachingService.getTasks();
  },

  getTasks: () => {
    return getStored("tasks", []);
  },

  updateTaskStatus: async (taskId, newStatus) => {
    try {
      await apiClient.put(`/api/v1/staff-tasks/${taskId}/status`, { status: newStatus });
    } catch {
      /* fallback */
    }
    const tasks = nonTeachingService.getTasks();
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setStored("tasks", updated);
    return updated;
  },

  addTask: async (task) => {
    let createdTask = null;
    try {
      const res = await apiClient.post("/api/v1/staff-tasks", task);
      createdTask = res?.data?.data;
    } catch {
      /* fallback */
    }

    if (!createdTask) {
      createdTask = {
        ...task,
        id: `TSK-${Date.now().toString().slice(-4)}`,
        assignedDate: new Date().toISOString().split("T")[0],
        status: task.status || "Pending",
        assignedBy: "Self / Personal Reminder",
      };
    }

    const tasks = nonTeachingService.getTasks();
    const updated = [createdTask, ...tasks.filter((t) => t.id !== createdTask.id)];
    setStored("tasks", updated);
    return createdTask;
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

  // Support Tickets (Connected to /api/v1/support-tickets)
  fetchSupportTickets: async () => {
    try {
      const res = await apiClient.get("/api/v1/support-tickets/my");
      const list = res?.data?.data || res?.data || [];
      if (Array.isArray(list)) {
        setStored("support_tickets", list);
        return list;
      }
    } catch {
      /* fallback */
    }
    return nonTeachingService.getSupportTickets();
  },

  getSupportTickets: () => {
    return getStored("support_tickets", []);
  },

  createSupportTicket: async (ticket) => {
    let created = null;
    try {
      const res = await apiClient.post("/api/v1/support-tickets", ticket);
      created = res?.data?.data;
    } catch {
      /* fallback */
    }

    if (!created) {
      created = {
        ...ticket,
        id: `TKT-${Date.now().toString().slice(-4)}`,
        status: "Open",
        createdAt: new Date().toISOString().split("T")[0],
        response: null,
      };
    }

    const tickets = nonTeachingService.getSupportTickets();
    const updated = [created, ...tickets.filter((t) => t.id !== created.id)];
    setStored("support_tickets", updated);
    return created;
  },
};
