import apiClient from "./apiClient";
import { apiEndpoints } from "./apiEndpoints";

// Ensure the endpoint exists in apiEndpoints (we can hardcode if needed, but better to extend)
const BASE_URL = "/api/v1/staff-reimbursements";

export const reimbursementApi = {
  createReimbursement: async (data) => {
    return apiClient.post(BASE_URL, data);
  },

  getReimbursementById: async (id) => {
    return apiClient.get(`${BASE_URL}/${id}`);
  },

  getAllReimbursements: async (params) => {
    return apiClient.get(BASE_URL, { params });
  },

  getReimbursementSummary: async (campusId) => {
    return apiClient.get(`${BASE_URL}/summary`, { params: { campusId } });
  },

  verifyReimbursement: async (id, data) => {
    return apiClient.patch(`${BASE_URL}/${id}/admin-verify`, data);
  },

  rejectReimbursement: async (id, data) => {
    return apiClient.patch(`${BASE_URL}/${id}/admin-reject`, data);
  },

  approveReimbursement: async (id, data) => {
    return apiClient.patch(`${BASE_URL}/${id}/accountant-approve`, data);
  },

  markReimbursementPaid: async (id, data) => {
    return apiClient.patch(`${BASE_URL}/${id}/mark-paid`, data);
  },

  uploadProofDocument: async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(`${BASE_URL}/${id}/upload-proof`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
