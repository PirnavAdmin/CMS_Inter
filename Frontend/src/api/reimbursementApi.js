/**
 * Faculty Reimbursement API Adapter
 * Connects to backend API if deployed, otherwise leverages the
 * persistent local development-only reimbursement service.
 */

import api from "./axios.js";
import { apiEndpoints } from "./apiEndpoints.js";
import * as reimbursementService from "@/services/reimbursementService.js";

export const getReimbursementClaims = async (params) => {
  try {
    const res = await api.get(apiEndpoints.reimbursement.list, { params, skipErrorLog: true, optionalAuth: true });
    if (res?.data?.data && Array.isArray(res.data.data)) {
      return res.data;
    }
  } catch {
    // Backend endpoint pending deployment; fallback to local persistent service
  }
  const data = reimbursementService.getStoredClaims();
  return { success: true, data };
};

export const submitReimbursementClaim = async (claimData) => {
  try {
    const res = await api.post(apiEndpoints.reimbursement.submit, claimData, { skipErrorLog: true, optionalAuth: true });
    if (res?.data?.data) {
      return res.data.data;
    }
  } catch {
    // Backend endpoint pending deployment; fallback to local persistent service
  }
  return await reimbursementService.submitClaim(claimData);
};

export const approveReimbursementClaim = async (claimId, payload) => {
  try {
    const res = await api.put(apiEndpoints.reimbursement.approve(claimId), payload, { skipErrorLog: true, optionalAuth: true });
    if (res?.data?.data) {
      return res.data.data;
    }
  } catch {
    // Backend endpoint pending deployment; fallback to local persistent service
  }
  return await reimbursementService.approveClaim(claimId, payload);
};

export const rejectReimbursementClaim = async (claimId, payload) => {
  try {
    const res = await api.put(apiEndpoints.reimbursement.reject(claimId), payload, { skipErrorLog: true, optionalAuth: true });
    if (res?.data?.data) {
      return res.data.data;
    }
  } catch {
    // Backend endpoint pending deployment; fallback to local persistent service
  }
  return await reimbursementService.rejectClaim(claimId, payload);
};

export const disburseReimbursementPayment = async (claimId, payload) => {
  try {
    const res = await api.post(apiEndpoints.reimbursement.pay(claimId), payload, { skipErrorLog: true, optionalAuth: true });
    if (res?.data?.data) {
      return res.data.data;
    }
  } catch {
    // Backend endpoint pending deployment; fallback to local persistent service
  }
  return await reimbursementService.disburseClaimPayment(claimId, payload);
};

export const getAccountReimbursements = async () => {
  return reimbursementService.getStoredAccountEntries();
};

export default {
  getReimbursementClaims,
  submitReimbursementClaim,
  approveReimbursementClaim,
  rejectReimbursementClaim,
  disburseReimbursementPayment,
  getAccountReimbursements,
};
