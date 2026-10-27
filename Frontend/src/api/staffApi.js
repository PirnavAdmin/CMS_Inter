import api from "./axios";
import { apiEndpoints } from "./apiEndpoints.js";

// ==================== STAFF MANAGEMENT APIs ====================

// 1. Get paged staff list
export const getStaffPaged = (params) => {
  return api.get("/api/v1/staff", { params });
};

// 2. Generate the next employee ID through the number-series endpoint or direct staff endpoint.
export const getNextEmployeeId = async (staffType = "Teaching", campusId = null) => {
  const normalizedType = String(staffType || "Teaching").replace(/[^a-z]/gi, "").toLowerCase();
  const isNonTeaching = normalizedType === "nonteaching";
  const seriesCode = isNonTeaching ? "NON_TEACHING_STAFF_ID" : "TEACHING_STAFF_ID";
  try {
    const response = await api.post(
      apiEndpoints.numberSeries.generateNext(seriesCode),
      {
        board: "",
        dept: "",
        type: staffType,
        staff: "",
        desig: "",
        cert: "",
        academicYear: "",
        group: "",
        section: "",
        level: "",
        exam: "",
        campusId: campusId || undefined,
      },
      { params: campusId ? { campusId } : {} }
    );
    const payload = response?.data?.data ?? response?.data ?? {};
    const nextEmployeeId = typeof payload === "string"
      ? payload
      : payload.generatedNumber || payload.nextEmployeeId || payload.employeeId || payload.code;

    if (nextEmployeeId) {
      return {
        ...response,
        data: {
          ...(typeof payload === "object" ? payload : {}),
          nextEmployeeId,
          employeeId: nextEmployeeId,
        },
      };
    }
  } catch (err) {
    console.warn("Number series endpoint failed, falling back to staff next-employee-id endpoint:", err);
  }

  // Direct Staff endpoint fallback
  const fallbackRes = await api.get("/api/v1/staff/next-employee-id", {
    params: {
      staffType,
      ...(campusId ? { campusId } : {}),
    },
  });
  const data = fallbackRes?.data ?? {};
  const nextId = data.nextEmployeeId || data.employeeId;
  return {
    ...fallbackRes,
    data: {
      ...data,
      nextEmployeeId: nextId,
      employeeId: nextId,
    },
  };
};

// 3. Get staff for dropdown with campus isolation
export const getStaffDropdown = (staffType, campusId = null) => {
  const params = {};
  if (staffType) params.staffType = staffType;
  if (campusId) params.campusId = campusId;
  return api.get("/api/v1/staff/dropdown", { params });
};

// 4. Get single staff by ID
export const getStaffById = (id) => {
  return api.get(`/api/v1/staff/${id}`);
};

// 5. Create new staff member
export const createStaff = (data) => {
  return api.post("/api/v1/staff", data);
};

// Helper to safely format documents into C# Dictionary<string, string>
const formatDocumentsDictionary = (docs) => {
  if (!docs) return {};
  if (Array.isArray(docs)) {
    const map = {};
    docs.forEach((doc, idx) => {
      const key = String(doc?.type || doc?.name || `Document_${idx + 1}`).trim();
      const val = String(doc?.url || doc?.name || doc?.fileName || "").trim();
      if (key) map[key] = val;
    });
    return map;
  }
  if (typeof docs === "object") {
    const map = {};
    Object.entries(docs).forEach(([k, v]) => {
      map[String(k)] = typeof v === "string" ? v : String(v?.url || v?.name || "");
    });
    return map;
  }
  return {};
};

// 6. Update staff member
export const updateStaff = (id, data) => {
  let sanitized = data;
  if (data && typeof data === "object") {
    sanitized = { ...data };
    if (sanitized.documents !== undefined) {
      sanitized.documents = formatDocumentsDictionary(sanitized.documents);
    }
    if (Array.isArray(sanitized.experience)) {
      sanitized.experience = sanitized.experience.length * 1.0;
    }
  }
  return api.put(`/api/v1/staff/${id}`, sanitized);
};

// 7. Delete staff member (soft delete)
export const deleteStaff = (id) => {
  return api.delete(`/api/v1/staff/${id}`);
};

// 8. Upload staff photo
export const uploadStaffPhoto = (formData) => {
  return api.post("/api/v1/staff/upload-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ==================== MASTER LOOKUP APIs ====================

// 9. Get departments (filtered by Teaching / Non-Teaching)
export const getDepartments = (staffType, campusId = null) => {
  const params = {};
  if (staffType) params.staffType = staffType;
  if (campusId) params.campusId = campusId;
  return api.get("/api/v1/departments", { params });
};

// 10. Add new custom department
export const createDepartment = (data) => {
  return api.post("/api/v1/departments", data);
};

// 11. Get designations (filtered by Teaching / Non-Teaching & department)
export const getDesignations = (staffType, departmentId = null) => {
  const params = {};
  if (staffType) params.staffType = staffType;
  if (departmentId) params.departmentId = departmentId;
  return api.get("/api/v1/designations", { params });
};

// 12. Add new custom designation
export const createDesignation = (data) => {
  return api.post("/api/v1/designations", data);
};

// ==================== STAFF SUBJECT ALLOCATION APIs ====================

// 13. Get subject allocations for staff member
export const getStaffSubjectAllocations = (staffId) => {
  return api.get(`/api/v1/staff/${staffId}/subject-allocations`);
};

// 14. Assign subject to staff
export const assignStaffSubject = (data) => {
  return api.post("/api/v1/staff/assign-subject", data);
};

// 15. Update subject allocation
export const updateStaffSubjectAllocation = (id, data) => {
  return api.put(`/api/v1/staff/assign-subject/${id}`, data);
};

// 16. Delete subject allocation
export const deleteStaffSubjectAllocation = (id) => {
  return api.delete(`/api/v1/staff/assign-subject/${id}`);
};

// 16b. Unassign subject from staff by name or subjectId
export const unassignStaffSubject = (staffId, subjectNameOrId) => {
  const params = typeof subjectNameOrId === "number" ? { subjectId: subjectNameOrId } : { subjectName: subjectNameOrId };
  return api.delete(`/api/v1/staff/${staffId}/unassign-subject`, { params });
};

// 17. Get staff workload
export const getStaffWorkload = (staffId) => {
  return api.get(`/api/v1/staff/workload/${staffId}`);
};

// ==================== LEAVE APIs ====================
const LEAVE_BASE_URL = "/api/v1/staff-attendance/leave";

export const leaveApi = {
  createLeave: async (data) => {
    return api.post(LEAVE_BASE_URL, data);
  },
  
  getStaffLeaves: async (params) => {
    return api.get(LEAVE_BASE_URL, { params });
  },
  
  getLeaveDetails: async (leaveId) => {
    return api.get(`${LEAVE_BASE_URL}/${leaveId}`);
  },
  
  actionLeave: async (leaveId, data) => {
    return api.post(`${LEAVE_BASE_URL}/${leaveId}/action`, data);
  },
  
  getLeaveHistory: async (staffId) => {
    return api.get(`${LEAVE_BASE_URL}/history/staff/${staffId}`);
  }
};

// ==================== REIMBURSEMENT APIs ====================
const REIMBURSEMENT_BASE_URL = "/api/v1/reimbursements";

export const reimbursementApi = {
  createReimbursement: async (data) => {
    return api.post(REIMBURSEMENT_BASE_URL, data);
  },

  getReimbursementById: async (id) => {
    return api.get(`${REIMBURSEMENT_BASE_URL}/${id}`);
  },

  getAllReimbursements: async (params) => {
    return api.get(REIMBURSEMENT_BASE_URL, { params });
  },

  getReimbursementSummary: async (campusId) => {
    return api.get(`${REIMBURSEMENT_BASE_URL}/summary`, { params: { campusId } });
  },

  verifyReimbursement: async (id, data) => {
    return api.patch(`${REIMBURSEMENT_BASE_URL}/${id}/admin-verify`, data);
  },

  rejectReimbursement: async (id, data) => {
    return api.patch(`${REIMBURSEMENT_BASE_URL}/${id}/admin-reject`, data);
  },

  approveReimbursement: async (id, data) => {
    return api.patch(`${REIMBURSEMENT_BASE_URL}/${id}/accountant-approve`, data);
  },

  markReimbursementPaid: async (id, data) => {
    return api.patch(`${REIMBURSEMENT_BASE_URL}/${id}/mark-paid`, data);
  },

  uploadProofDocument: async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`${REIMBURSEMENT_BASE_URL}/${id}/upload-proof`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

// ==================== STAFF ATTENDANCE APIs ====================
export const staffAttendanceApi = {
  // GET /api/v1/staff-attendance/monthly-report
  getMonthlyReport: (params) => {
    return api.get("/api/v1/staff-attendance/monthly-report", { params });
  },

  // GET /api/v1/staff-attendance/my-today
  getMyToday: () => {
    return api.get("/api/v1/staff-attendance/my-today");
  },

  // GET /api/v1/staff-attendance/my-history
  getMyHistory: (period = "week") => {
    return api.get("/api/v1/staff-attendance/my-history", { params: { period } });
  },

  // POST /api/v1/staff-attendance/punch-in
  punchIn: (data = {}) => {
    return api.post("/api/v1/staff-attendance/punch-in", data);
  },

  // POST /api/v1/staff-attendance/punch-out
  punchOut: (data = {}) => {
    return api.post("/api/v1/staff-attendance/punch-out", data);
  },

  // POST /api/v1/staff-attendance/regularize
  regularize: (data) => {
    return api.post("/api/v1/staff-attendance/regularize", data);
  },
};

