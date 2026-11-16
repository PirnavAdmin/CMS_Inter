import apiClient from "./apiClient";
import { apiEndpoints } from "./apiEndpoints";

export const landingPageApi = {
  async getConfig(collegeId = null) {
    try {
      const params = { _t: Date.now() };
      if (collegeId) params.collegeId = collegeId;
      const response = await apiClient.get(apiEndpoints.landingPage.getConfig, { params });
      return response.data?.data ?? response.data ?? null;
    } catch (err) {
      console.warn("Failed to fetch landing page config from server:", err);
      throw err;
    }
  },

  async saveConfig(payload) {
    try {
      const response = await apiClient.put(apiEndpoints.landingPage.saveConfig, payload);
      return response.data?.data ?? response.data ?? null;
    } catch (err) {
      console.error("Failed to save landing page config to server:", err);
      throw err;
    }
  },

  async uploadImage(file, slot = "asset", collegeId = null) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const params = { slot };
      if (collegeId) params.collegeId = collegeId;
      const response = await apiClient.post(apiEndpoints.landingPage.uploadImage, formData, {
        params,
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.url ?? response.data?.data?.url ?? null;
    } catch (err) {
      console.error(`Failed to upload landing page image for slot ${slot}:`, err);
      throw err;
    }
  },

  async getPublicConfig(collegeCode = null, collegeId = null) {
    try {
      const params = { _t: Date.now() };
      if (collegeCode) params.collegeCode = collegeCode;
      if (collegeId) params.collegeId = collegeId;
      const response = await apiClient.get(apiEndpoints.landingPage.getPublic, { params });
      return response.data?.data ?? response.data ?? null;
    } catch (err) {
      console.warn("Failed to fetch public landing page config from server:", err);
      return null;
    }
  },
};

export default landingPageApi;
