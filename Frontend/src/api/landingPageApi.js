import apiClient from "./apiClient";
import { apiEndpoints } from "./apiEndpoints";

let inFlightGetConfig = null;
let inFlightGetPublic = null;

export const landingPageApi = {
  async getConfig(collegeId = null) {
    if (inFlightGetConfig && !collegeId) {
      return inFlightGetConfig;
    }
    const fetchPromise = (async () => {
      try {
        const params = { _t: Date.now() };
        if (collegeId) params.collegeId = collegeId;
        const response = await apiClient.get(apiEndpoints.landingPage.getConfig, {
          params,
          validateStatus: (status) => status < 500,
        });
        if (response.status === 404) {
          return null;
        }
        return response.data?.data ?? response.data ?? null;
      } catch {
        return null;
      } finally {
        if (!collegeId) inFlightGetConfig = null;
      }
    })();
    if (!collegeId) inFlightGetConfig = fetchPromise;
    return fetchPromise;
  },

  async saveConfig(payload) {
    try {
      const response = await apiClient.put(apiEndpoints.landingPage.saveConfig, payload);
      if (response.data?.success === false) throw new Error(response.data.message || "Configuration could not be saved.");
      return response.data && Object.hasOwn(response.data, "data") ? response.data.data : response.data ?? null;
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
    if (inFlightGetPublic && !collegeCode && !collegeId) {
      return inFlightGetPublic;
    }
    const fetchPromise = (async () => {
      try {
        const params = { _t: Date.now() };
        if (collegeCode) params.collegeCode = collegeCode;
        if (collegeId) params.collegeId = collegeId;
        const response = await apiClient.get(apiEndpoints.landingPage.getPublic, {
          params,
          validateStatus: (status) => status < 500,
        });
        if (response.status === 404) {
          return null;
        }
        return response.data?.data ?? response.data ?? null;
      } catch {
        return null;
      } finally {
        if (!collegeCode && !collegeId) inFlightGetPublic = null;
      }
    })();
    if (!collegeCode && !collegeId) inFlightGetPublic = fetchPromise;
    return fetchPromise;
  },
};

export default landingPageApi;
