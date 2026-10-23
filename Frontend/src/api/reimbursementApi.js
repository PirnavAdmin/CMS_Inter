/**
 * Faculty Reimbursement API Client
 * Clean integration of all 11 fresh API endpoints.
 * Zero mock data, zero localStorage/sessionStorage.
 *
 * Endpoints:
 * 1.  GET   /api/v1/reimbursements/summary          (4 Status cards, 5 Financial Review cards, integratedPayablesCount)
 * 2.  GET   /api/v1/reimbursements                  (Claims list; supports campusId, status, category, search)
 * 3.  GET   /api/v1/reimbursements/my-claims        (Personal claims for authenticated faculty)
 * 4.  GET   /api/v1/reimbursements/{id}             (Detailed claim view with full auditLog timeline)
 * 5.  GET   /api/v1/reimbursements/account-entries  (Dedicated list for Account Ledger modal)
 * 6.  POST  /api/v1/reimbursements                  (Claim submission form)
 * 7.  POST  /api/v1/reimbursements/{id}/upload-proof (Document upload: <= 5MB, PDF/JPG/PNG)
 * 8.  PATCH /api/v1/reimbursements/{id}/verify       (Approves claim & assigns ACC-PAY-CLM-...; fallback PUT /approve)
 * 9.  PATCH /api/v1/reimbursements/{id}/clarification(Requests clarification & sets status to Under Review; fallback PUT /clarification)
 * 10. PATCH /api/v1/reimbursements/{id}/reject       (Rejects claim with notes; fallback PUT /reject)
 * 11. PATCH /api/v1/reimbursements/{id}/mark-paid    (Marks claim disbursed with payment reference; fallback POST /pay)
 */

import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

/**
 * 1. GET /api/v1/reimbursements/summary
 * Fetches all 4 Status Cards + 5 Financial Review Cards + integratedPayablesCount
 */
export const getReimbursementSummary = async (params = {}) => {
  return await apiClient.get(apiEndpoints.reimbursement.summary, { params });
};

/**
 * 2. GET /api/v1/reimbursements
 * Claims list (supports ?campusId=, ?status=, ?category=, ?search=)
 */
export const getReimbursements = async (params = {}) => {
  return await apiClient.get(apiEndpoints.reimbursement.list, { params });
};

export const getReimbursementClaims = getReimbursements;
export const getAllReimbursements = getReimbursements;

/**
 * 3. GET /api/v1/reimbursements/my-claims
 * Personal claims for authenticated faculty
 */
export const getMyClaims = async (params = {}) => {
  return await apiClient.get(apiEndpoints.reimbursement.myClaims, { params });
};

/**
 * 4. GET /api/v1/reimbursements/{id}
 * Detailed claim view (includes full auditLog timeline)
 */
export const getReimbursementById = async (id) => {
  if (!id) throw new Error("Claim ID is required.");
  return await apiClient.get(apiEndpoints.reimbursement.byId(id));
};

/**
 * 5. GET /api/v1/reimbursements/account-entries
 * Dedicated list for the Account Ledger modal
 */
export const getAccountEntries = async (params = {}) => {
  return await apiClient.get(apiEndpoints.reimbursement.accountEntries, { params });
};

/**
 * 6. POST /api/v1/reimbursements
 * Claim submission form
 */
export const submitReimbursementClaim = async (payload) => {
  return await apiClient.post(apiEndpoints.reimbursement.submit, payload);
};

export const createReimbursement = submitReimbursementClaim;
export const submitReimbursement = submitReimbursementClaim;

/**
 * 7. POST /api/v1/reimbursements/{id}/upload-proof
 * Document upload (<= 5MB, PDF/JPG/PNG)
 */
export const uploadProof = async (id, fileOrFormData) => {
  if (!id) throw new Error("Claim ID is required for document upload.");

  let data = fileOrFormData;
  if (!(fileOrFormData instanceof FormData)) {
    data = new FormData();
    data.append("file", fileOrFormData);
  }

  return await apiClient.post(apiEndpoints.reimbursement.uploadProof(id), data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * 8. PATCH /api/v1/reimbursements/{id}/verify (fallback PUT /approve)
 * Approves claim & assigns ACC-PAY-CLM-...
 */
export const verifyReimbursement = async (id, payload = {}) => {
  if (!id) throw new Error("Claim ID is required.");
  try {
    return await apiClient.patch(apiEndpoints.reimbursement.verify(id), payload);
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return await apiClient.put(apiEndpoints.reimbursement.approve(id), payload);
    }
    throw err;
  }
};

export const approveReimbursementClaim = verifyReimbursement;

/**
 * 9. PATCH /api/v1/reimbursements/{id}/clarification (fallback PUT /clarification)
 * Requests clarification & sets status to Under Review
 */
export const requestClarification = async (id, payload = {}) => {
  if (!id) throw new Error("Claim ID is required.");
  try {
    return await apiClient.patch(apiEndpoints.reimbursement.clarification(id), payload);
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return await apiClient.put(apiEndpoints.reimbursement.clarification(id), payload);
    }
    throw err;
  }
};

/**
 * 10. PATCH /api/v1/reimbursements/{id}/reject (fallback PUT /reject)
 * Rejects claim with notes
 */
export const rejectReimbursement = async (id, payload = {}) => {
  if (!id) throw new Error("Claim ID is required.");
  try {
    return await apiClient.patch(apiEndpoints.reimbursement.reject(id), payload);
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return await apiClient.put(apiEndpoints.reimbursement.reject(id), payload);
    }
    throw err;
  }
};

export const rejectReimbursementClaim = rejectReimbursement;

/**
 * 11. PATCH /api/v1/reimbursements/{id}/mark-paid (fallback POST /pay)
 * Marks claim disbursed with payment reference
 */
export const markReimbursementPaid = async (id, payload = {}) => {
  if (!id) throw new Error("Claim ID is required.");
  try {
    return await apiClient.patch(apiEndpoints.reimbursement.markPaid(id), payload);
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 405) {
      return await apiClient.post(apiEndpoints.reimbursement.pay(id), payload);
    }
    throw err;
  }
};

export const disburseReimbursementPayment = markReimbursementPaid;

export const reimbursementApi = {
  // 1
  getSummary: getReimbursementSummary,
  getReimbursementSummary,
  // 2
  getClaims: getReimbursements,
  getReimbursements,
  getReimbursementClaims,
  getAllReimbursements,
  // 3
  getMyClaims,
  // 4
  getById: getReimbursementById,
  getReimbursementById,
  // 5
  getAccountEntries,
  // 6
  submit: submitReimbursementClaim,
  submitReimbursementClaim,
  createReimbursement,
  // 7
  uploadProof,
  // 8
  verify: verifyReimbursement,
  verifyReimbursement,
  approveReimbursementClaim,
  // 9
  requestClarification,
  // 10
  reject: rejectReimbursement,
  rejectReimbursement,
  rejectReimbursementClaim,
  // 11
  markPaid: markReimbursementPaid,
  markReimbursementPaid,
  disburseReimbursementPayment,
};

export default reimbursementApi;
