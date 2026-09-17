import apiClient from "./apiClient";
import { apiEndpoints } from "./apiEndpoints";

export const attendanceTimingApi = {
  async getConfigs() {
    try {
      const response = await apiClient.get(apiEndpoints.attendanceTimingConfig.list);
      return response.data?.data ?? response.data ?? [];
    } catch (err) {
      console.warn("Failed to fetch attendance timing configs:", err);
      return [];
    }
  },

  async getEffectiveConfig(staffType, departmentId) {
    try {
      const params = {};
      if (staffType != null) params.staffType = staffType;
      if (departmentId != null) params.departmentId = departmentId;
      const response = await apiClient.get(apiEndpoints.attendanceTimingConfig.effective, { params });
      return response.data?.data ?? response.data ?? null;
    } catch (err) {
      console.warn("Failed to fetch effective timing config:", err);
      return null;
    }
  },

  async getConfigById(id) {
    const response = await apiClient.get(apiEndpoints.attendanceTimingConfig.getById(id));
    return response.data?.data ?? response.data ?? null;
  },

  async createConfig(payload) {
    const response = await apiClient.post(apiEndpoints.attendanceTimingConfig.create, payload);
    return response.data?.data ?? response.data ?? null;
  },

  async updateConfig(id, payload) {
    const response = await apiClient.put(apiEndpoints.attendanceTimingConfig.update(id), payload);
    return response.data?.data ?? response.data ?? null;
  },

  async deleteConfig(id) {
    const response = await apiClient.delete(apiEndpoints.attendanceTimingConfig.delete(id));
    return response.data?.success ?? true;
  }
};

export default attendanceTimingApi;
