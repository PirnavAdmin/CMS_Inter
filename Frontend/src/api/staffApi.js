import api from "./axios";
import { apiEndpoints } from "./apiEndpoints.js";

// ==================== STAFF MANAGEMENT APIs ====================

// 1. Get paged staff list
export const getStaffPaged = (params) => {
  return api.get("/api/v1/staff", { params });
};

// 2. Generate the next employee ID through the number-series endpoint.
// The staff next-employee-id endpoint uses a stored-procedure parameter name
// that does not match the deployed database procedure.
export const getNextEmployeeId = async (staffType = "Teaching") => {
  const normalizedType = String(staffType || "Teaching").replace(/[^a-z]/gi, "").toLowerCase();
  const isNonTeaching = normalizedType === "nonteaching";
  const seriesCode = isNonTeaching ? "NON_TEACHING_STAFF_ID" : "TEACHING_STAFF_ID";
  const response = await api.post(apiEndpoints.numberSeries.generateNext(seriesCode), {
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
  });
  const payload = response?.data?.data ?? response?.data ?? {};
  const nextEmployeeId = typeof payload === "string"
    ? payload
    : payload.generatedNumber || payload.nextEmployeeId || payload.employeeId || payload.code;

  return {
    ...response,
    data: {
      ...(typeof payload === "object" ? payload : {}),
      nextEmployeeId,
      employeeId: nextEmployeeId,
    },
  };
};

// 3. Get staff for dropdown
export const getStaffDropdown = (staffType) => {
  return api.get("/api/v1/staff/dropdown", {
    params: staffType ? { staffType } : {},
  });
};

// 4. Get single staff by ID
export const getStaffById = (id) => {
  return api.get(`/api/v1/staff/${id}`);
};

// 5. Create new staff member
export const createStaff = (data) => {
  return api.post("/api/v1/staff", data);
};

// 6. Update staff member
export const updateStaff = (id, data) => {
  return api.put(`/api/v1/staff/${id}`, data);
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
export const getDepartments = (staffType) => {
  return api.get("/api/v1/departments", {
    params: staffType ? { staffType } : {},
  });
};

// 10. Add new custom department
export const createDepartment = (data) => {
  return api.post("/api/v1/departments", data);
};

// 11. Get designations (filtered by Teaching / Non-Teaching)
export const getDesignations = (staffType) => {
  return api.get("/api/v1/designations", {
    params: staffType ? { staffType } : {},
  });
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
    return api.get(REIMBURSEMENT_BASE_URL, { params, skipErrorLog: true, optionalAuth: true });
  },

  getReimbursements: async (params) => {
    return api.get(REIMBURSEMENT_BASE_URL, { params, skipErrorLog: true, optionalAuth: true });
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

