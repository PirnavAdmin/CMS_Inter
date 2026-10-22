import axios from "axios";
import { env } from "@/config/env.js";
import { clearAuthSession, getAuthToken, updateAuthToken, BACKEND_ADMIN_JWT, BACKEND_PARENT_JWT } from "../features/authStorage.js";
import { handleMockApiRequest } from "./mockApiAdapter.js";

let activeApiRequests = 0;

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
  return /\/login\/?$/i.test(url) || /\/refresh(-token)?\/?$/i.test(url) || /\/register\/?$/i.test(url);
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
  if (typeof data === "string") return data;
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
      config.headers.delete("Content-Type");
    }
    beginApiLoading(config);

    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isOffline = typeof window !== "undefined" && window.localStorage?.getItem("cms_backend_offline") === "true";
    const isExamModuleRequest = Boolean(
      config.url && (
        /\/api\/v1\/(examinations|exam-schedules|rooms|periods)/i.test(config.url) ||
        /\/api\/v1\/(settings\/)?number-series/i.test(config.url) ||
        config.url.includes("/examinations") ||
        config.url.includes("/exam-schedules")
      )
    );
    const isExamCellRoute =
      typeof window !== "undefined" &&
      window.location?.pathname?.includes("exam-cell-dashboard");

<<<<<<< HEAD
    const isMockSession =
      isOffline ||
      isExamModuleRequest ||
      isExamCellRoute ||
      Boolean(token && (token.startsWith("mock-") || token.startsWith("demo-") || token.startsWith("parent-auth-token-")));

    if (isMockSession && !/\/api\/(Auth|Admin)\/login/i.test(config.url || "")) {
=======
    // Clean up any stale offline flags so real APIs are never blocked
    try {
      if (typeof window !== "undefined") {
        if (window.localStorage?.getItem("cms_backend_offline")) {
          window.localStorage.removeItem("cms_backend_offline");
        }
        window.localStorage?.setItem("cms_backend_online", "true");
      }
    } catch (_e) {
      // ignore storage errors
    }

    // Only route through mock adapter if explicitly configured or using a synthetic mock token
    const isExplicitMockToken = Boolean(
      token &&
        (token.startsWith("mock-") ||
          token.startsWith("demo-") ||
          token.startsWith("non-teaching-") ||
          token.startsWith("warden-") ||
          token.startsWith("parent-"))
    );
    const isExplicitMockForced = import.meta.env.VITE_USE_MOCK_DATA === "true";

    if ((isExplicitMockToken || isExplicitMockForced) && !/\/api\/(Auth|Admin)\/login/i.test(config.url || "")) {
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
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
    if (!isHtmlResponse(response.data)) return response;
    // When ngrok returns HTML (warning or offline page), seamlessly serve from mockApiAdapter
    return handleMockApiRequest(response.config);
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

    const token = getStoredAccessToken();
    const isExplicitMockToken = Boolean(token && (token.startsWith("mock-") || token.startsWith("demo-")));
    const isExplicitMockForced = import.meta.env.VITE_USE_MOCK_DATA === "true";

<<<<<<< HEAD
    // Automatic fallback to mock adapter for missing endpoints (404), offline backend (ERR_NGROK), 502/503/504 proxy errors, Network Errors, or HTML error pages
    const isProxyOrBackendFailure =
      error.response?.status === 404 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504 ||
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error" ||
      isNgrokOffline ||
      !error.response ||
      isHtmlResponse(error.response?.data);

    if (isProxyOrBackendFailure && originalRequest && !originalRequest._isMockFallback && !originalRequest.url?.includes("/Auth/refresh-token")) {
=======
    // Automatic fallback to mock adapter ONLY for explicit mock sessions or tests
    if ((isExplicitMockToken || isExplicitMockForced) && originalRequest && !originalRequest._isMockFallback) {
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
      originalRequest._isMockFallback = true;
      try {
        const mockRes = await handleMockApiRequest(originalRequest);
        if (mockRes) return mockRes;
      } catch (_e) {
        // ignore mock adapter fallback errors
      }
    }



    const shouldLogDevError =
      import.meta.env.DEV &&
      !isNgrokOffline &&
      !originalRequest?.silent &&
      !originalRequest?.skipErrorLog &&
      !originalRequest?.skipAuthRedirect &&
      !originalRequest?.silentAuth &&
      !originalRequest?.optionalAuth &&
<<<<<<< HEAD
      error.response?.status !== 401 &&
      error.response?.status !== 404 &&
      error.response?.status !== 403;
=======
      !originalRequest?.url?.includes("/api/v1/hostel");
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402

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

    // Handle standard session expiration refresh if 401 persists
    if (error.response?.status === 401 && originalRequest && !isAuthBypassRequest(originalRequest)) {
      const currentToken = getStoredAccessToken();
<<<<<<< HEAD
      const isParentSession = Boolean(typeof window !== "undefined" && window.location?.pathname?.startsWith("/parent-dashboard"));
      if (isParentSession) {
=======
      const isMockToken = Boolean(
        currentToken &&
          (currentToken.startsWith("mock-") ||
            currentToken.startsWith("demo-") ||
            currentToken.startsWith("non-teaching-") ||
            currentToken.startsWith("warden-") ||
            currentToken.startsWith("parent-"))
      );
      if (isMockToken) {
        // Mock token sessions must NEVER be logged out or redirected by backend 401 errors
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        clearAuthSession();
        if (window.location.pathname !== "/login") window.location.assign("/login");
        return Promise.reject(error);
      }

      if (!currentToken) {
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
        clearAuthSession();
        if (window.location.pathname !== "/login") window.location.assign("/login");
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
