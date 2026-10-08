import axios from "axios";
import { env } from "@/config/env.js";
import { clearAuthSession, getAuthToken, updateAuthToken } from "@/features/authStorage.js";

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
  const url = String(config?.url || "");
  return /\/login\/?$/i.test(url) || /\/refresh(-token)?\/?$/i.test(url) || /\/register\/?$/i.test(url);
};

const getStoredAccessToken = () => {
  const stored = getAuthToken();
  if (!stored) return "";
  return stored.replace(/^Bearer\s+/i, "").trim();
};

const getJwtExpiryState = (token) => {
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
  if (data?.Message) return data.Message;
  if (data?.message) return data.message;
  if (data?.Error) return data.Error;
  if (data?.error) return data.error;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;
  if (data?.Detail) return data.Detail;
  if (error?.response?.status === 401) return "Your session has expired. Please sign in again.";
  if (error?.response?.status === 403) return "Your account is not permitted to access this resource.";
  if (error?.response?.status === 404) return "Requested resource not found on backend (HTTP 404).";
  if (error?.response?.status === 502 || error?.response?.status === 504) return "Backend proxy unreachable. Please check API connection.";
  if (error?.code === "ECONNABORTED" || error?.message?.includes?.("timeout")) return "Request timed out. Backend may be overloaded or unreachable.";
  if (error?.response?.status) return `Request failed (HTTP ${error.response.status}).`;
  if (error?.message === "Network Error") return "Backend is not reachable. Please check API connection or Vite proxy.";
  if (error?.message) return error.message;
  return "Something went wrong. Please try again.";
};

const recentApiErrorLogTimes = new Map();

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
    beginApiLoading(config);
    const token = getStoredAccessToken();
    if (token) {
      if (typeof config.headers?.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
      } else {
        if (!config.headers) config.headers = {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (import.meta.env.DEV) {
      const expiry = token ? getJwtExpiryState(token) : {};
      const hasAuthHeader = Boolean(
        config.headers?.Authorization?.startsWith?.("Bearer ") ||
        (typeof config.headers?.get === "function" && config.headers.get("Authorization")?.startsWith("Bearer "))
      );
      console.log("API request:", {
        url: config.url,
        method: (config.method || "GET").toUpperCase(),
        hasToken: Boolean(token),
        tokenLength: token.length || 0,
        hasBearer: hasAuthHeader,
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
    return Promise.reject(new Error("Backend returned HTML instead of JSON. Check API base URL or proxy."));
  },
  async (error) => {
    finishApiLoading(error.config);
    const originalRequest = error.config;

    // Gracefully ignore aborted/canceled component cleanup requests
    if (axios.isCancel(error) || error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    if (import.meta.env.DEV && !originalRequest?.silent && !originalRequest?.skipErrorLog) {
      const status = error.response?.status || (error.message === "Network Error" ? "Network Error" : "Request Error");
      const url = originalRequest?.url || "Unknown URL";
      const method = (originalRequest?.method || "GET").toUpperCase();
      const message = getApiErrorMessage(error) || error.message || "Unknown error";
      const isAuthenticated = Boolean(getStoredAccessToken());

      // Deduplicate identical error messages in DEV to prevent console flooding
      const errorKey = `${method}:${url}:${status}`;
      const now = Date.now();
      const lastLogged = recentApiErrorLogTimes.get(errorKey) || 0;
      if (now - lastLogged > 4000) {
        recentApiErrorLogTimes.set(errorKey, now);
        if (recentApiErrorLogTimes.size > 100) {
          recentApiErrorLogTimes.clear();
        }
        console.warn(
          `[API ${status}] ${method} ${url}: ${message}`,
          {
            url,
            method,
            status,
            message,
            authenticated: isAuthenticated,
            data: error.response?.data,
          }
        );
      }
    }

    if (isHtmlResponse(error.response?.data)) {
      error.response.data = { message: "Backend returned HTML instead of JSON. Check API base URL or proxy." };
    }

    // Handle 401 Unauthorized with automatic token refresh
    if (error.response?.status === 401 && originalRequest && !isAuthBypassRequest(originalRequest)) {
      const isWardenSession =
        typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/warden") ||
          window.localStorage.getItem("cms_role") === "warden" ||
          window.localStorage.getItem("cms_auth") === "true");

      if (isWardenSession) {
        // Do not force logout or redirect for Warden on API 401: allow component to use fallback/mock data
        return Promise.reject(error);
      }

      const currentToken = getStoredAccessToken();
      const isMockToken = Boolean(
        currentToken &&
        (currentToken.includes("-auth-token-") || currentToken.startsWith("mock-") || currentToken.startsWith("parent-") || currentToken.startsWith("warden-"))
      );
      if (isMockToken) {
        clearAuthSession();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
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
              return reject(refreshError || error);
            }
            if (typeof originalRequest.headers?.set === "function") {
              originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
            } else {
              if (!originalRequest.headers) originalRequest.headers = {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
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

        if (typeof originalRequest.headers?.set === "function") {
          originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        } else {
          if (!originalRequest.headers) originalRequest.headers = {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        onTokenRefreshFailed(refreshErr);
        clearAuthSession();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
