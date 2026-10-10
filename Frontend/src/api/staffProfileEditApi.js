import apiClient from "./apiClient";

export const staffProfileEditApi = {
  // Staff Endpoints
  getProfileEditStatus: async (staffId) => {
    return apiClient.get(`/api/v1/staff/${staffId}/profile-edit-status`);
  },
  
  requestProfileEdit: async (staffId, reason) => {
    return apiClient.post(`/api/v1/staff/${staffId}/profile-edit-request`, { requestReason: reason });
  },
  
  submitProfileEdit: async (staffId) => {
    return apiClient.patch(`/api/v1/staff/${staffId}/profile-edit-submit`);
  },

  // Admin Endpoints
  getAllRequests: async () => {
    return apiClient.get(`/api/v1/staff/profile-edit-requests`);
  },
  
  grantProfileEdit: async (requestId) => {
    return apiClient.patch(`/api/v1/staff/profile-edit-request/${requestId}/grant`);
  },
  
  approveProfileEdit: async (requestId) => {
    return apiClient.patch(`/api/v1/staff/profile-edit-request/${requestId}/approve`);
  },
};
