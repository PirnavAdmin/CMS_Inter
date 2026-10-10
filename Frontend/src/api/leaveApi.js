import apiClient from "./apiClient";

const BASE_URL = "/api/v1/staff-attendance/leave";

export const leaveApi = {
  createLeave: async (data) => {
    return apiClient.post(BASE_URL, data);
  },
  
  getStaffLeaves: async (params) => {
    return apiClient.get(BASE_URL, { params });
  },
  
  getLeaveDetails: async (leaveId) => {
    return apiClient.get(`${BASE_URL}/${leaveId}`);
  },
  
  actionLeave: async (leaveId, data) => {
    return apiClient.post(`${BASE_URL}/${leaveId}/action`, data);
  },
  
  getLeaveHistory: async (staffId) => {
    return apiClient.get(`${BASE_URL}/history/staff/${staffId}`);
  }
};
