import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

export const landingConfigApi = {
  getLandingConfig: async (campusId, signal) => {
    const endpoint = apiEndpoints.landingPageConfig?.get || "/api/v1/landing-page-config";
    const res = await apiClient.get(endpoint, {
      params: campusId ? { campusId } : {},
      signal,
    });
    return res.data?.data ?? res.data;
  },

  saveLandingConfig: async (payload, signal) => {
    const endpoint = apiEndpoints.landingPageConfig?.save || "/api/v1/landing-page-config";
    const res = await apiClient.put(endpoint, payload, { signal });
    return res.data?.data ?? res.data;
  },
};

export default landingConfigApi;
