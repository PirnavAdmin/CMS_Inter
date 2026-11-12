import api from "./axios";

// ==================== REPORTS & ANALYTICS API ====================

const defaultOpt = (config = {}) => ({ silent: true, skipErrorLog: true, ...config });

// --- 1. Cascading Filters ---
export const getReportBoards = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/boards", { params, ...defaultOpt(config) });
};

export const getReportAcademicYears = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/academic-years", { params, ...defaultOpt(config) });
};

export const getReportAcademicLevels = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/academic-levels", { params, ...defaultOpt(config) });
};

export const getReportGroups = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/groups", { params, ...defaultOpt(config) });
};

export const getReportSections = (params, config = {}) => {
  return api.get("/api/v1/reports/filters/sections", { params, ...defaultOpt(config) });
};

// --- 2. Overview / Dashboard Metrics (10 Cards) ---
export const getReportsDashboard = (params, config = {}) => {
  return api.get("/api/v1/reports/dashboard", { params, ...defaultOpt(config) });
};

export const getReportsOverview = (params, config = {}) => {
  return getReportsDashboard(params, config);
};

// --- 3. Report Detail Endpoints ---
export const getAdmissionsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/admissions", { params, ...defaultOpt(config) });
};

export const getStudentStrengthDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/student-strength", { params, ...defaultOpt(config) });
};

export const getAttendanceDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/attendance", { params, ...defaultOpt(config) });
};

export const getStaffAttendanceDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/staff-attendance", { params, ...defaultOpt(config) });
};

export const getFacultyAttendanceDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/faculty-attendance", { params, ...defaultOpt(config) });
};

export const getFeeCollectionDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/fee-collection", { params, ...defaultOpt(config) });
};

export const getDueFeesDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/due-fees", { params, ...defaultOpt(config) });
};

export const getExaminationsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/examinations", { params, ...defaultOpt(config) });
};

export const getResultsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/results", { params, ...defaultOpt(config) });
};

export const getPassPercentageDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/pass-percentage", { params, ...defaultOpt(config) });
};

export const getToppersDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/toppers", { params, ...defaultOpt(config) });
};

export const getStaffWorkloadDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/staff-workload", { params, ...defaultOpt(config) });
};

export const getFacultyWorkloadDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/staff-workload", { params, ...defaultOpt(config) });
};

export const getStudentPerformanceDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/student-performance", { params, ...defaultOpt(config) });
};

export const getSubjectsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/subjects", { params, ...defaultOpt(config) });
};

export const getGroupsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/groups", { params, ...defaultOpt(config) });
};

export const getSectionsDetails = (params, config = {}) => {
  return api.get("/api/v1/reports/details/sections", { params, ...defaultOpt(config) });
};

// --- 4. Audit Logs ---
export const getAuditLogs = (params, config = {}) => {
  return api.get("/api/v1/reports/details/audit-logs", { params, ...defaultOpt(config) });
};

// --- 5. Export Handlers ---
export const exportReportPdf = (reportType, params, config = {}) => {
  return api.get("/api/v1/reports/export/pdf", {
    params: { reportType, ...params },
    responseType: "blob",
    ...defaultOpt(config),
  });
};

export const exportReportExcel = (reportType, params, config = {}) => {
  return api.get("/api/v1/reports/export/excel", {
    params: { reportType, ...params },
    responseType: "blob",
    ...defaultOpt(config),
  });
};

export const exportReportUnified = (reportType, format, params, config = {}) => {
  return api.get("/api/v1/reports/export", {
    params: { reportType, format, ...params },
    responseType: "blob",
    ...defaultOpt(config),
  });
};
