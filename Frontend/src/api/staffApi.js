import api from "./axios";

// ==================== STAFF MANAGEMENT APIs ====================

// 1. Get paged staff list
export const getStaffPaged = (params) => {
  return api.get("/api/v1/staff", { params });
};

// 2. Get next sequential employee ID (PJCTCH0001 / PJCNTCH0001)
export const getNextEmployeeId = (staffType = "Teaching") => {
  return api.get("/api/v1/staff/next-employee-id", {
    params: { staffType },
  });
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
