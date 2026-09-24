import apiClient, { getApiErrorMessage } from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

/**
 * Unwrap nested API responses (e.g. data, items, $values, records)
 */
const unwrapResponse = (res) => {
  const payload = res?.data !== undefined ? res.data : res;
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return payload;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values", "data", "Data", "payload", "Payload"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return payload;
};

// ==========================================
// 1. SALARY STRUCTURES
// ==========================================

export const getSalaryStructures = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.salaryStructures, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getSalaryStructures error:", getApiErrorMessage(error));
    throw error;
  }
};

export const getSalaryStructureById = async (id) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.salaryStructureById(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.getSalaryStructureById(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const createSalaryStructure = async (payload) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.createSalaryStructure, payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.createSalaryStructure error:", getApiErrorMessage(error));
    throw error;
  }
};

export const updateSalaryStructure = async (id, payload) => {
  try {
    const res = await apiClient.put(apiEndpoints.payroll.updateSalaryStructure(id), payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.updateSalaryStructure(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const deleteSalaryStructure = async (id) => {
  try {
    const res = await apiClient.delete(apiEndpoints.payroll.deleteSalaryStructure(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.deleteSalaryStructure(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

// ==========================================
// 2. EMPLOYEES
// ==========================================

export const getEmployees = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.employees, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getEmployees error:", getApiErrorMessage(error));
    throw error;
  }
};

// ==========================================
// 3. SALARY ASSIGNMENTS
// ==========================================

export const getSalaryAssignments = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.salaryAssignments, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getSalaryAssignments error:", getApiErrorMessage(error));
    throw error;
  }
};

export const getSalaryAssignmentById = async (id) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.salaryAssignmentById(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.getSalaryAssignmentById(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const createSalaryAssignment = async (payload) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.createSalaryAssignment, payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.createSalaryAssignment error:", getApiErrorMessage(error));
    throw error;
  }
};

export const deleteSalaryAssignment = async (id) => {
  try {
    const res = await apiClient.delete(apiEndpoints.payroll.deleteSalaryAssignment(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.deleteSalaryAssignment(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const updateSalaryAssignmentStatus = async (id, status) => {
  try {
    const res = await apiClient.patch(apiEndpoints.payroll.salaryAssignmentStatus(id, status));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.updateSalaryAssignmentStatus(${id}, ${status}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

// ==========================================
// 4. PAYSLIPS
// ==========================================

export const getPayslips = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.payslips, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getPayslips error:", getApiErrorMessage(error));
    throw error;
  }
};

export const getPayslipById = async (id) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.payslipById(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.getPayslipById(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const generatePayslip = async (payload) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.generatePayslip, payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.generatePayslip error:", getApiErrorMessage(error));
    throw error;
  }
};

export const generatePayslipsBulk = async (payload) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.generatePayslipsBulk, payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.generatePayslipsBulk error:", getApiErrorMessage(error));
    throw error;
  }
};

export const updatePayslipStatus = async (id, status) => {
  try {
    const res = await apiClient.patch(apiEndpoints.payroll.updatePayslipStatus(id, status));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.updatePayslipStatus(${id}, ${status}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const sendPayslipEmail = async (id) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.sendPayslipEmail(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.sendPayslipEmail(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const getPayslipAdvanceRepayments = async (id) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.payslipAdvanceRepayments(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.getPayslipAdvanceRepayments(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

// ==========================================
// 5. SALARY REVISIONS
// ==========================================

export const getSalaryRevisions = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.revisions, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getSalaryRevisions error:", getApiErrorMessage(error));
    throw error;
  }
};

export const createSalaryRevision = async (payload) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.createRevision, payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.createSalaryRevision error:", getApiErrorMessage(error));
    throw error;
  }
};

export const approveSalaryRevision = async (id, payload = {}) => {
  try {
    const res = await apiClient.patch(apiEndpoints.payroll.approveRevision(id), payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.approveSalaryRevision(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

// ==========================================
// 6. BONUSES
// ==========================================

export const getBonuses = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.bonuses, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getBonuses error:", getApiErrorMessage(error));
    throw error;
  }
};

export const getBonusById = async (id) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.bonusById(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.getBonusById(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const createBonus = async (payload) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.createBonus, payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.createBonus error:", getApiErrorMessage(error));
    throw error;
  }
};

export const approveBonus = async (id, payload = {}) => {
  try {
    const res = await apiClient.patch(apiEndpoints.payroll.approveBonus(id), payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.approveBonus(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

// ==========================================
// 7. SALARY ADVANCES
// ==========================================

export const getSalaryAdvances = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.advances, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getSalaryAdvances error:", getApiErrorMessage(error));
    throw error;
  }
};

export const getSalaryAdvanceById = async (id) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.advanceById(id));
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.getSalaryAdvanceById(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const createSalaryAdvance = async (payload) => {
  try {
    const res = await apiClient.post(apiEndpoints.payroll.createAdvance, payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.createSalaryAdvance error:", getApiErrorMessage(error));
    throw error;
  }
};

export const approveSalaryAdvance = async (id, payload = {}) => {
  try {
    const res = await apiClient.patch(apiEndpoints.payroll.approveAdvance(id), payload);
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.approveSalaryAdvance(${id}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

export const getAdvanceBalances = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.advanceBalances, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getAdvanceBalances error:", getApiErrorMessage(error));
    throw error;
  }
};

export const getAdvanceRepaymentHistory = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.advanceRepaymentHistory, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getAdvanceRepaymentHistory error:", getApiErrorMessage(error));
    throw error;
  }
};

// ==========================================
// 8. SUMMARY & REPORTS
// ==========================================

export const getPayrollSummary = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.summary, { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn("payrollApi.getPayrollSummary error:", getApiErrorMessage(error));
    throw error;
  }
};

export const getStaffSummary = async (staffId, params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.payroll.staffSummary(staffId), { params });
    return unwrapResponse(res);
  } catch (error) {
    console.warn(`payrollApi.getStaffSummary(${staffId}) error:`, getApiErrorMessage(error));
    throw error;
  }
};

