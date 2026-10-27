import axios from "axios";
import { env } from "../config/env.js";
import { clearAuthSession, getAuthToken, updateAuthToken } from "../features/authStorage.js";

let activeApiRequests = 0;
import { handleMockApiRequest } from "./mockApiAdapter.js";

const apiLoadingListeners = new Set();

const notifyApiLoading = () => {
  apiLoadingListeners.forEach((listener) => listener());
};

const beginApiLoading = (config) => {
  if (config.skipGlobalLoader || config.__globalLoadingTracked) return;
  config.__globalLoadingTracked = true;
  activeApiRequests += 1;
  notifyApiLoading();
};

const finishApiLoading = (config) => {
  if (!config?.__globalLoadingTracked) return;
  config.__globalLoadingTracked = false;
  activeApiRequests = Math.max(0, activeApiRequests - 1);
  notifyApiLoading();
};

export const subscribeToApiLoading = (listener) => {
  apiLoadingListeners.add(listener);
  return () => apiLoadingListeners.delete(listener);
};

export const getApiLoadingSnapshot = () => activeApiRequests > 0;

const isHtmlResponse = (data) =>
  typeof data === "string" && /^\s*(<!doctype html|<html)/i.test(data);

const isAuthBypassRequest = (config) => {
  if (config?.skipAuthRedirect || config?.optionalAuth || config?.silentAuth) return true;
  const url = String(config?.url || "");
  return (
    /\/login\/?$/i.test(url) ||
    /\/refresh(-token)?\/?$/i.test(url) ||
    /\/register\/?$/i.test(url) ||
    url.includes("/api/v1/non-teaching/") ||
    url.includes("/api/v1/staff-tasks") ||
    url.includes("/api/v1/support-tickets") ||
    url.includes("/api/v1/staff/me") ||
    url.includes("/api/v1/staff-attendance/")
  );
};

const getStoredAccessToken = () => {
  const stored = getAuthToken();
  if (!stored) return "";
  return stored.replace(/^Bearer\s+/i, "").trim();
};

export const getJwtExpiryState = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return { isJwt: false };
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    if (!decoded.exp) return { isJwt: true, isExpired: false };
    return { isJwt: true, isExpired: decoded.exp * 1000 <= Date.now() };
  } catch {
    return { isJwt: false };
  }
};

export const getApiErrorMessage = (error) => {
  const data = error?.response?.data;
  if (typeof data === "string") {
    if (isHtmlResponse(data)) {
      if (/ERR_NGROK|is offline/i.test(data)) {
        return "Backend ngrok tunnel is offline (ERR_NGROK_3200). Please ensure the backend server and ngrok tunnel are running.";
      }
      return "Backend returned HTML instead of JSON. Check API connection or proxy.";
    }
    return data;
  }
  const flattenMessages = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(flattenMessages);
    if (typeof value === "object") return Object.values(value).flatMap(flattenMessages);
    return [String(value)];
  };
  if (data?.errors && typeof data.errors === "object") {
    const messages = flattenMessages(data.errors).filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  if (data?.Errors && typeof data.Errors === "object") {
    const messages = flattenMessages(data.Errors).filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  if (data?.details && typeof data.details === "string" && (!data?.message || data.message === "An unexpected server error occurred.")) return data.details;
  if (data?.Message && data.Message !== "An unexpected server error occurred.") return data.Message;
  if (data?.message && data.message !== "An unexpected server error occurred.") return data.message;
  if (data?.details && typeof data.details === "string") return data.details;
  if (data?.Message) return data.Message;
  if (data?.message) return data.message;
  if (data?.Error) return data.Error;
  if (data?.error) return data.error;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;
  if (data?.Detail) return data.Detail;
  if (error?.response?.status === 401) return "Your session has expired. Please sign in again.";
  if (error?.response?.status === 403) return "Your account is not permitted to access this resource.";
  if (error?.response?.status) return `Request failed (HTTP ${error.response.status}).`;
  if (error?.message === "Network Error") return "Backend is not reachable. Please check API connection or Vite proxy.";
  if (error?.message) return error.message;
  return "Something went wrong. Please try again.";
};

const apiClient = axios.create({
  baseURL: env.useDevProxy ? "" : env.apiBaseUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

const onTokenRefreshFailed = (error) => {
  refreshSubscribers.forEach((callback) => callback(null, error));
  refreshSubscribers = [];
};

apiClient.interceptors.request.use(
  (config) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      // Preserve file bodies and let the browser supply the multipart boundary.
      try { config.headers?.delete?.("Content-Type"); } catch {}
      try { config.headers?.delete?.("content-type"); } catch {}
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }
    beginApiLoading(config);

    const token = getStoredAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Only route through mock adapter if explicitly configured (mock session token or forced mock data)
    // Real server requests will NEVER use mock data when the server is offline
    const isExplicitMockToken = Boolean(
      token &&
        (token.startsWith("mock-") ||
          token.startsWith("demo-") ||
          token.startsWith("non-teaching-") ||
          token.startsWith("warden-") ||
          token.startsWith("parent-") ||
          token.startsWith("exam-cell-"))
    );
    const isExplicitMockForced = import.meta.env.VITE_USE_MOCK_DATA === "true";
    const isHostelRequest = /\/api\/v1\/hostel/i.test(config.url || "");

    if (
      !isHostelRequest &&
      (isExplicitMockToken || isExplicitMockForced) &&
      !/\/api\/(Auth|Admin)\/login/i.test(config.url || "") &&
      !/\/api\/v1\/(?:inventory|departments|designations)(?:\/|$)/i.test(config.url || "")
    ) {
      config.adapter = handleMockApiRequest;
    }

    try {
      const selectedCampusId = window.localStorage.getItem("cms_selected_campus_id");
      if (selectedCampusId) config.headers["X-Campus-Id"] = selectedCampusId;
      const clientIp = window.localStorage.getItem("cms_client_ip") || window.sessionStorage.getItem("cms_client_ip");
      if (clientIp) config.headers["X-Client-IP"] = clientIp;
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
    // In development, avoid flooding console on every request unless verbose debug is enabled
    if (import.meta.env.DEV && typeof window !== "undefined" && window.__CMS_VERBOSE_API__) {
      const expiry = token ? getJwtExpiryState(token) : {};
      console.log("API request:", {
        url: config.url,
        method: config.method,
        hasToken: Boolean(token),
        tokenLength: token.length || 0,
        hasBearer: Boolean(config.headers?.Authorization?.startsWith("Bearer ")),
        tokenExpired: expiry.isJwt ? expiry.isExpired : undefined,
      });
    }
    return config;
  },
  (error) => {
    finishApiLoading(error.config);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    finishApiLoading(response.config);
    if (!isHtmlResponse(response.data)) {
      if (!response.config?._isMockFallback && typeof window !== "undefined") {
        try { window.localStorage.removeItem("cms_backend_offline"); } catch {}
      }
      return response;
    }
    const htmlErr = new Error("Backend returned HTML instead of JSON. Check API base URL or proxy.");
    htmlErr.config = response.config;
    htmlErr.response = response;
    return Promise.reject(htmlErr);
  },
  async (error) => {
    finishApiLoading(error.config);
    const originalRequest = error.config;

    // Gracefully ignore aborted/canceled component cleanup requests
    if (axios.isCancel(error) || error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    const errText = `${error?.message || ""} ${typeof error?.response?.data === "string" ? error.response.data : JSON.stringify(error?.response?.data || "")}`;
    const isNgrokOffline = /ERR_NGROK|is offline/i.test(errText);
    const isProxyUnreachable =
      error?.response?.status === 502 ||
      error?.response?.status === 503 ||
      error?.response?.status === 504 ||
      error?.response?.data?.message === "Backend proxy unreachable";
    const isNetworkError = error?.message === "Network Error" || error?.code === "ERR_NETWORK" || !error?.response;
    const isBackendUnavailable = isNgrokOffline || isProxyUnreachable || isNetworkError;

    const token = getStoredAccessToken();
    const isExplicitMockToken = Boolean(
      token &&
        (token.startsWith("mock-") ||
          token.startsWith("demo-") ||
          token.startsWith("non-teaching-") ||
          token.startsWith("warden-") ||
          token.startsWith("parent-") ||
          token.startsWith("exam-cell-"))
    );
    const isExplicitMockForced = import.meta.env.VITE_USE_MOCK_DATA === "true";
    const isHostelRequest = /\/api\/v1\/hostel/i.test(originalRequest?.url || "");

    // Automatic fallback to mock adapter ONLY for explicit mock sessions or forced mock mode
    // When real backend is offline, do NOT return mock data - let the request fail cleanly
    if (
      !isHostelRequest &&
      (isExplicitMockToken || isExplicitMockForced) &&
      originalRequest &&
      !/\/api\/(Auth|Admin)\/login\/?$/i.test(originalRequest.url || "") &&
      !/\/api\/v1\/(?:inventory|departments|designations)(?:\/|$)/i.test(originalRequest.url || "") &&
      !originalRequest._isMockFallback
    ) {
      originalRequest._isMockFallback = true;
      try {
        const mockRes = await handleMockApiRequest(originalRequest);
        if (mockRes) {
          return mockRes;
        }
      } catch (_e) {
        // ignore mock adapter fallback errors
      }
    }

    const is404 = error.response?.status === 404;
    const shouldLogDevError =
      import.meta.env.DEV &&
      !isNgrokOffline &&
      !is404 &&
      !originalRequest?.silent &&
      !originalRequest?.skipErrorLog &&
      !originalRequest?.skipAuthRedirect &&
      !originalRequest?.silentAuth &&
      !originalRequest?.optionalAuth;

    if (shouldLogDevError) {
      if (!error.response) {
        console.warn("API network warning (server unreachable or proxy empty response):", {
          url: originalRequest?.url,
          method: originalRequest?.method,
          message: error?.message,
        });
      } else {
        const errDetail =
          error.response?.data?.message ||
          error.response?.data?.Message ||
          error.response?.data?.error ||
          error.response?.data?.title;
        console.error("API response error:", {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status: error.response?.status,
          message: errDetail,
          data: error.response?.data,
        });
      }
    }

    if (isHtmlResponse(error.response?.data)) {
      error.response.data = { message: "Backend returned HTML instead of JSON. Check API base URL or proxy." };
    }

    // Handle 401 Unauthorized with automatic token refresh
    if (error.response?.status === 401 && originalRequest && !isAuthBypassRequest(originalRequest)) {
      const currentToken = getStoredAccessToken();
      const isMockToken = Boolean(
        currentToken &&
          (currentToken.startsWith("mock-") ||
            currentToken.startsWith("demo-") ||
            currentToken.startsWith("non-teaching-") ||
            currentToken.startsWith("warden-") ||
            currentToken.startsWith("parent-") ||
            currentToken.startsWith("exam-cell-"))
      );
      if (isMockToken) {
        // Mock token sessions must NEVER be logged out or redirected by backend 401 errors
        return Promise.reject(error);
      }

      const expiry = getJwtExpiryState(currentToken);
      const isTokenActuallyExpired = Boolean(expiry.isJwt && expiry.isExpired);

      if (originalRequest._retry) {
        if (!currentToken || isTokenActuallyExpired) {
          clearAuthSession();
          if (window.location.pathname !== "/login") window.location.assign("/login");
        }
        return Promise.reject(error);
      }

      if (!currentToken || isTokenActuallyExpired) {
        clearAuthSession();
        if (window.location.pathname !== "/login") window.location.assign("/login");
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken, refreshError) => {
            if (refreshError || !newToken) {
              return reject(error);
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshBaseUrl = env.useDevProxy ? "" : env.apiBaseUrl;
        const refreshResponse = await axios.post(
          `${refreshBaseUrl}/api/Auth/refresh-token`,
          { token: currentToken },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        const newAccessToken =
          refreshResponse.data?.accessToken ||
          refreshResponse.data?.AccessToken ||
          refreshResponse.data?.data?.accessToken;

        if (!newAccessToken) {
          throw new Error("Refresh response did not provide a valid access token.");
        }

        updateAuthToken(newAccessToken);
        isRefreshing = false;
        onTokenRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        onTokenRefreshFailed(refreshErr);
        const expState = getJwtExpiryState(currentToken);
        if (!currentToken || (expState.isJwt && expState.isExpired)) {
          clearAuthSession();
          if (window.location.pathname !== "/login") window.location.assign("/login");
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
