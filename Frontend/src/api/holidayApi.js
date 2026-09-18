import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

export const holidayApi = {
  getSummary: async (params = {}) => {
    try {
      const response = await apiClient.get(apiEndpoints.holidays.summary, { params });
      return response?.data?.data ?? response?.data ?? { total: 0, national: 0, festival: 0, upcoming: 0, completed: 0 };
    } catch (err) {
      console.warn("Holiday summary API failed, fallback to defaults:", err?.message || err);
      return null;
    }
  },

  getHolidays: async (params = {}) => {
    try {
      const response = await apiClient.get(apiEndpoints.holidays.list, { params });
      return response?.data ?? { success: true, data: [], total: 0, totalPages: 1, page: 1, pageSize: 10 };
    } catch (err) {
      console.warn("Holiday list API failed, fallback to defaults:", err?.message || err);
      return null;
    }
  },

  getHolidayById: async (id) => {
    const response = await apiClient.get(apiEndpoints.holidays.getById(id));
    return response?.data?.data ?? response?.data;
  },

  createHoliday: async (payload) => {
    const response = await apiClient.post(apiEndpoints.holidays.create, payload);
    return response?.data?.data ?? response?.data;
  },

  updateHoliday: async (id, payload) => {
    const response = await apiClient.put(apiEndpoints.holidays.update(id), payload);
    return response?.data?.data ?? response?.data;
  },

  deleteHoliday: async (id) => {
    const response = await apiClient.delete(apiEndpoints.holidays.delete(id));
    return response?.data;
  },
};

export default holidayApi;
