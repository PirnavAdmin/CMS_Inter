import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

const holidayListCache = new Map();
const holidaySummaryCache = new Map();

export const clearHolidayCache = () => {
  holidayListCache.clear();
  holidaySummaryCache.clear();
};

export const holidayApi = {
  getSummary: async (params = {}) => {
    const key = JSON.stringify(params);
    if (holidaySummaryCache.has(key)) {
      return holidaySummaryCache.get(key);
    }
    try {
      const response = await apiClient.get(apiEndpoints.holidays.summary, { params });
      const result = response?.data?.data ?? response?.data ?? { total: 0, national: 0, festival: 0, upcoming: 0, completed: 0 };
      holidaySummaryCache.set(key, result);
      return result;
    } catch (err) {
      console.warn("Holiday summary API failed, fallback to defaults:", err?.message || err);
      return null;
    }
  },

  getHolidays: async (params = {}) => {
    const key = JSON.stringify(params);
    if (holidayListCache.has(key)) {
      return holidayListCache.get(key);
    }
    try {
      const response = await apiClient.get(apiEndpoints.holidays.list, { params });
      const result = response?.data ?? { success: true, data: [], total: 0, totalPages: 1, page: 1, pageSize: 10 };
      holidayListCache.set(key, result);
      return result;
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
    clearHolidayCache();
    const response = await apiClient.post(apiEndpoints.holidays.create, payload);
    return response?.data?.data ?? response?.data;
  },

  updateHoliday: async (id, payload) => {
    clearHolidayCache();
    const response = await apiClient.put(apiEndpoints.holidays.update(id), payload);
    return response?.data?.data ?? response?.data;
  },

  deleteHoliday: async (id) => {
    clearHolidayCache();
    const response = await apiClient.delete(apiEndpoints.holidays.delete(id));
    return response?.data;
  },

  downloadTemplate: async () => {
    const response = await apiClient.get("/api/v1/holidays/import/template", {
      responseType: "blob",
    });
    return response.data;
  },

  importExcel: async (file, validateOnly = false, campusId, academicYearId, boardId) => {
    if (!validateOnly) clearHolidayCache();
    const formData = new FormData();
    formData.append("file", file);
    
    let url = "/api/v1/holidays/import/excel?validateOnly=" + validateOnly;
    if (campusId) url += "&campusId=" + campusId;
    if (academicYearId) url += "&academicYearId=" + academicYearId;
    if (boardId) url += "&boardId=" + boardId;

    const response = await apiClient.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default holidayApi;
