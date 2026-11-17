import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

export const enquiryApi = {
  // Public Landing Page submission
  submitEnquiry: async (data, signal) => {
    const res = await apiClient.post(apiEndpoints.enquiries.submit, data, { signal });
    return res.data?.data ?? res.data;
  },

  // Public Landing Page contact config fetch
  getPublicContactConfig: async (campusId, signal) => {
    const res = await apiClient.get(apiEndpoints.enquiries.contactConfig, {
      params: campusId ? { campusId } : {},
      signal,
    });
    return res.data?.data ?? res.data;
  },

  // Staff / Receptionist / Admin list enquiries
  listEnquiries: async ({ campusId, status, search, page = 1, pageSize = 20 } = {}, signal) => {
    const params = { page, pageSize };
    if (campusId) params.campusId = campusId;
    if (status && status !== "All") params.status = status;
    if (search) params.search = search;

    const res = await apiClient.get(apiEndpoints.enquiries.list, { params, signal });
    return {
      items: res.data?.data ?? [],
      totalCount: res.data?.totalCount ?? 0,
      page: res.data?.page ?? 1,
      pageSize: res.data?.pageSize ?? pageSize,
      totalPages: res.data?.totalPages ?? 1,
    };
  },

  // Stats ribbon
  getStats: async (campusId, signal) => {
    const res = await apiClient.get(apiEndpoints.enquiries.stats, {
      params: campusId ? { campusId } : {},
      signal,
    });
    return res.data?.data ?? {
      totalCount: 0,
      newCount: 0,
      inProgressCount: 0,
      contactedCount: 0,
      resolvedCount: 0,
      todayCount: 0,
    };
  },

  // Single enquiry detail
  getEnquiryById: async (id, signal) => {
    const res = await apiClient.get(apiEndpoints.enquiries.byId(id), { signal });
    return res.data?.data ?? res.data;
  },

  // Update status and response notes
  updateStatus: async (id, payload, signal) => {
    const res = await apiClient.put(apiEndpoints.enquiries.updateStatus(id), payload, { signal });
    return res.data?.data ?? res.data;
  },

  // Admin & Principal save landing contact config
  saveContactConfig: async (payload, signal) => {
    const res = await apiClient.put(apiEndpoints.enquiries.contactConfig, payload, { signal });
    return res.data?.data ?? res.data;
  },
};

export default enquiryApi;
