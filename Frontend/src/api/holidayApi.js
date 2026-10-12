import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

const API_VERSION = "1.0";

export const holidayApi = {
  getSummary: async (params = {}) => {
    const query = {
      campusId: params.campusId ?? params.CampusId,
      academicYearId: params.academicYearId ?? params.AcademicYearId,
      boardId: params.boardId ?? params.BoardId,
      "api-version": API_VERSION,
    };
    // remove undefined keys
    Object.keys(query).forEach((k) => query[k] === undefined && delete query[k]);
    const response = await apiClient.get(apiEndpoints.holidays.summary, { params: query });
    return response?.data?.data ?? response?.data ?? { total: 0, national: 0, festival: 0, upcoming: 0, completed: 0 };
  },

  getHolidays: async (params = {}) => {
    const query = {
      CampusId: params.campusId ?? params.CampusId,
      AcademicYearId: params.academicYearId ?? params.AcademicYearId,
      BoardId: params.boardId ?? params.BoardId,
      Search: params.search ?? params.Search,
      Month: params.month ?? params.Month,
      FromDate: params.fromDate ?? params.FromDate,
      ToDate: params.toDate ?? params.ToDate,
      Type: params.type ?? params.Type,
      Status: params.status ?? params.Status,
      Page: params.page ?? params.Page,
      PageSize: params.pageSize ?? params.PageSize,
      "api-version": API_VERSION,
    };
    Object.keys(query).forEach((k) => query[k] === undefined && delete query[k]);
    const response = await apiClient.get(apiEndpoints.holidays.list, { params: query });
    return response?.data ?? { success: true, data: [], total: 0, totalPages: 1, page: 1, pageSize: 10 };
  },

  getHolidayById: async (id) => {
    const response = await apiClient.get(apiEndpoints.holidays.getById(id), {
      params: { "api-version": API_VERSION },
    });
    return response?.data?.data ?? response?.data;
  },

  createHoliday: async (payload) => {
    const response = await apiClient.post(apiEndpoints.holidays.create, payload, {
      params: { "api-version": API_VERSION },
    });
    return response?.data?.data ?? response?.data;
  },

  updateHoliday: async (id, payload) => {
    const response = await apiClient.put(apiEndpoints.holidays.update(id), payload, {
      params: { "api-version": API_VERSION },
    });
    return response?.data?.data ?? response?.data;
  },

  deleteHoliday: async (id) => {
    const response = await apiClient.delete(apiEndpoints.holidays.delete(id), {
      params: { "api-version": API_VERSION },
    });
    return response?.data;
  },
};

export default holidayApi;
