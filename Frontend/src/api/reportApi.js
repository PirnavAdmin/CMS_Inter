import api from "./axios";

// ==================== REPORTS & ANALYTICS API ====================

// --- 1. Cascading Filters ---
export const getReportBoards = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/boards", { params, ...config });
};

export const getReportAcademicYears = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/academic-years", { params, ...config });
};

export const getReportAcademicLevels = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/academic-levels", { params, ...config });
};

export const getReportGroups = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/groups", { params, ...config });
};

export const getReportSections = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/sections", { params, ...config });
};

// --- 2. Overview / Dashboard Metrics (10 Cards) ---
export const getReportsDashboard = (params, config = {}) => {
  return api.get("/api/v1/reports/dashboard", { params, ...config });
};

export const getReportsOverview = (params, config = {}) => {
  return getReportsDashboard(params, config);
};

// --- 3. Report Detail Endpoints ---
export const getAdmissionsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/admissions", { params, ...config });
};

export const getStudentStrengthDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/student-strength", { params, ...config });
};

export const getAttendanceDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/attendance", { params, ...config });
};

export const getStaffAttendanceDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/staff-attendance", { params, ...config });
};

export const getFacultyAttendanceDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/faculty-attendance", { params, ...config });
};

export const getFeeCollectionDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/fee-collection", { params, ...config });
};

export const getDueFeesDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/due-fees", { params, ...config });
};

export const getExaminationsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/examinations", { params, ...config });
};

export const getResultsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/results", { params, ...config });
};

export const getPassPercentageDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/pass-percentage", { params, ...config });
};

export const getToppersDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/toppers", { params, ...config });
};

export const getStaffWorkloadDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/staff-workload", { params, ...config });
};

export const getFacultyWorkloadDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/staff-workload", { params, ...config });
};

// --- 4. Audit Logs ---
export const getAuditLogs = (params, config = {}) => {
  return api.get("/api/v1/reports/details/audit-logs", { params, ...config });
};

// --- 5. Export Handlers ---
export const exportReportPdf = (reportType, params, config = {}) => {
  return api.get("/api/v1/reports/export/pdf", {
    params: { reportType, ...params },
    responseType: "blob",
    ...config,
  });
};

export const exportReportExcel = (reportType, params, config = {}) => {
  return api.get("/api/v1/reports/export/excel", {
    params: { reportType, ...params },
    responseType: "blob",
    ...config,
  });
};

export const exportReportUnified = (reportType, format, params, config = {}) => {
  return api.get("/api/v1/reports/export", {
    params: { reportType, format, ...params },
    responseType: "blob",
    ...config,
  });
};
