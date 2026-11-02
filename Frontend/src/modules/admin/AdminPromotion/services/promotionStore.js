import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

export const STUDENT_FEES_UPDATED_EVENT = "student-fees-updated";

const notifyFeeAccountsChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STUDENT_FEES_UPDATED_EVENT));
};

/**
 * Filter out empty string, null, or undefined params
 */
const cleanParams = (params = {}) => {
  const cleaned = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      cleaned[k] = v;
    }
  }
  return cleaned;
};

/**
 * Fetch eligible students for promotion based on academic filters.
 */
export const getEligibleStudents = async (params = {}) => {
  const res = await apiClient.get(apiEndpoints.promotions.eligible, {
    params: cleanParams(params),
    timeout: 20000,
    silent: true,
    skipErrorLog: true,
  });
  return res.data?.data || res.data?.Data || res.data || [];
};

/**
 * Preview promotion eligibility and validations before actual execution.
 */
export const previewPromotion = async (payload) => {
  const res = await apiClient.post(apiEndpoints.promotions.preview, payload, {
    timeout: 20000,
  });
  return res.data?.data || res.data?.Data || res.data;
};

/**
 * Execute bulk student promotion.
 */
export const promoteStudents = async (payload) => {
  const res = await apiClient.post(apiEndpoints.promotions.create, payload, {
    timeout: 30000,
  });
  notifyFeeAccountsChanged();
  return res.data?.data || res.data?.Data || res.data;
};

/**
 * Promote a single student with target academic configurations.
 */
export const promoteSingleStudent = async (studentId, payload) => {
  const res = await apiClient.post(
    apiEndpoints.promotions.student(studentId),
    payload,
    { timeout: 20000 }
  );
  notifyFeeAccountsChanged();
  return res.data?.data || res.data?.Data || res.data;
};

/**
 * Allocate or change program (coaching track e.g., Regular, IIT-JEE, NEET, NEET Advanced) for selected students.
 */
export const allocateProgram = async (payload) => {
  const res = await apiClient.patch(
    apiEndpoints.promotions.programAllocation,
    payload,
    { timeout: 20000 }
  );
  notifyFeeAccountsChanged();
  return res.data?.data || res.data?.Data || res.data;
};

export const getPromotionFeePreview = async (payload) => {
  const endpoint = apiEndpoints.promotions?.feePreview || "/api/v1/promotions/fee-preview";
  try {
    const res = await apiClient.post(endpoint, payload, { timeout: 20000 });
    return res.data?.data ?? res.data?.Data ?? res.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return {
        feeStructureId: null,
        structureName: "Standard Academic Fee",
        totalAmount: 0,
        components: [],
        availableFeeStructures: [],
        studentsCount: Array.isArray(payload?.studentIds) ? payload.studentIds.length : 0,
      };
    }
    throw error;
  }
};

export const getProgramFeePreview = async (studentId, targetProgramId) => {
  const endpoint = typeof apiEndpoints.promotions?.programFeePreview === "function"
    ? apiEndpoints.promotions.programFeePreview(studentId, targetProgramId)
    : `/api/v1/promotions/program-fee-preview?studentId=${studentId}&targetProgramId=${targetProgramId}`;
  try {
    const res = await apiClient.get(endpoint, { timeout: 20000 });
    return res.data?.data ?? res.data?.Data ?? res.data;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

export const getCampusTransferFeePreview = async (transferId) => {
  const endpoint = typeof apiEndpoints.campusTransfers?.feePreview === "function"
    ? apiEndpoints.campusTransfers.feePreview(transferId)
    : `/api/v1/promotions/campus-transfers/${transferId}/fee-preview`;
  try {
    const res = await apiClient.get(endpoint, { timeout: 20000 });
    return res.data?.data ?? res.data?.Data ?? res.data;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

export const getTransferFeePreview = getCampusTransferFeePreview;

export const approveCampusTransfer = async (transferId, payload = { actionRemarks: null }) => {
  const res = await apiClient.put(
    apiEndpoints.campusTransfers.approve(transferId),
    payload,
    { timeout: 20000 },
  );
  notifyFeeAccountsChanged();
  return res.data?.data || res.data?.Data || res.data;
};

/**
 * Allocate section for selected students.
 */
export const allocateSection = async (payload) => {
  const res = await apiClient.patch(
    apiEndpoints.promotions.sectionAllocation,
    payload,
    { timeout: 20000 }
  );
  return res.data?.data || res.data?.Data || res.data;
};

/**
 * Allocate group for selected students.
 */
export const allocateGroup = async (payload) => {
  const res = await apiClient.patch(
    apiEndpoints.promotions.groupAllocation,
    payload,
    { timeout: 20000 }
  );
  return res.data?.data || res.data?.Data || res.data;
};

/**
 * Fetch historical promotion audit logs.
 */
export const getPromotionHistory = async (params = {}) => {
  const res = await apiClient.get(apiEndpoints.promotions.history, {
    params: cleanParams(params),
    timeout: 20000,
  });
  return res.data?.data || res.data?.Data || res.data || [];
};

/**
 * Rollback a previously executed promotion.
 */
export const rollbackPromotion = async (payload) => {
  const res = await apiClient.post(apiEndpoints.promotions.rollback, payload, {
    timeout: 20000,
  });
  notifyFeeAccountsChanged();
  return res.data?.data || res.data?.Data || res.data;
};

/**
 * Fetch promotion report metrics and student status details.
 */
export const getPromotionReport = async (params = {}) => {
  const res = await apiClient.get(apiEndpoints.promotions.report, {
    params: cleanParams(params),
    timeout: 20000,
  });
  return res.data?.data || res.data?.Data || res.data;
};

export default {
  getPromotionFeePreview,
  getProgramFeePreview,
  getCampusTransferFeePreview,
  getTransferFeePreview,
  getEligibleStudents,
  previewPromotion,
  promoteStudents,
  promoteSingleStudent,
  allocateProgram,
  approveCampusTransfer,
  allocateSection,
  allocateGroup,
  getPromotionHistory,
  rollbackPromotion,
  getPromotionReport,
};
