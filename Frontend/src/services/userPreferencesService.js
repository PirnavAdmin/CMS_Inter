import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthToken } from "@/modules/auth/authStorage.js";

const DEFAULT_PREFERENCES = {
  themeMode: "light",
  palette: "purple",
  customColor: null,
};

let cachedPreferences = null;
let inFlightFetch = null;
let debounceTimer = null;
const preferenceListeners = new Set();

const notifyListeners = (prefs) => {
  preferenceListeners.forEach((fn) => {
    try {
      fn(prefs);
    } catch {}
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("user-preferences-changed", { detail: prefs }));
  }
};

/**
 * Checks if user is authenticated (has a token).
 */
export function hasAuthenticatedUser() {
  const token = getAuthToken();
  return Boolean(token && typeof token === "string" && token.trim().length > 0);
}

/**
 * Returns currently cached preferences or default.
 */
export function getCachedUserPreferences() {
  return cachedPreferences ? { ...cachedPreferences } : { ...DEFAULT_PREFERENCES };
}

/**
 * Subscribes to preference changes.
 */
export function subscribeUserPreferences(listener) {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

/**
 * Invalidate cache on logout or account switch.
 */
export function invalidateUserPreferencesCache() {
  cachedPreferences = null;
  inFlightFetch = null;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/**
 * Fetches user preferences from the backend API.
 * Uses in-flight deduplication and local cache.
 */
export async function fetchUserPreferences({ force = false } = {}) {
  if (!hasAuthenticatedUser()) {
    return { ...DEFAULT_PREFERENCES };
  }

  if (cachedPreferences && !force) {
    return { ...cachedPreferences };
  }

  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const endpoint = apiEndpoints?.userPreferences?.get || "/api/v1/user-preferences";
      const res = await apiClient.get(endpoint, {
        skipGlobalLoader: true,
      });

      const data = res?.data?.data || res?.data;
      if (data && typeof data === "object") {
        const themeMode = (data.themeMode || data.ThemeMode || "light").toLowerCase() === "dark" ? "dark" : "light";
        const palette = (data.palette || data.Palette || "purple").toLowerCase();
        const customColor = data.customColor || data.CustomColor || null;

        cachedPreferences = {
          themeMode,
          palette,
          customColor,
          updatedAt: data.updatedAt || data.UpdatedAt || null,
        };

        notifyListeners(cachedPreferences);
        return cachedPreferences;
      }
    } catch (err) {
      // If error (e.g. network or unauthorized), gracefully fall back
    } finally {
      inFlightFetch = null;
    }

    return cachedPreferences || { ...DEFAULT_PREFERENCES };
  })();

  return inFlightFetch;
}

/**
 * Updates user preferences in the backend with debouncing and optimistic local caching.
 */
export async function saveUserPreferences({ themeMode, palette, customColor, immediate = false }) {
  if (!hasAuthenticatedUser()) {
    return;
  }

  const payload = {
    themeMode: (themeMode || cachedPreferences?.themeMode || "light").toLowerCase(),
    palette: (palette || cachedPreferences?.palette || "purple").toLowerCase(),
    customColor: customColor !== undefined ? customColor : cachedPreferences?.customColor || null,
  };

  // Optimistically update cache immediately
  cachedPreferences = {
    ...cachedPreferences,
    ...payload,
  };

  const doSave = async () => {
    try {
      const endpoint = apiEndpoints?.userPreferences?.save || "/api/v1/user-preferences";
      const res = await apiClient.put(endpoint, payload, {
        skipGlobalLoader: true,
      });
      const data = res?.data?.data || res?.data;
      if (data && typeof data === "object") {
        cachedPreferences = {
          themeMode: (data.themeMode || data.ThemeMode || payload.themeMode).toLowerCase(),
          palette: (data.palette || data.Palette || payload.palette).toLowerCase(),
          customColor: data.customColor || data.CustomColor || payload.customColor,
          updatedAt: data.updatedAt || data.UpdatedAt,
        };
      }
    } catch (err) {
      // Failed to persist - optimistic UI was already set, local recovery preserved
    }
  };

  if (immediate) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    return doSave();
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  return new Promise((resolve) => {
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      await doSave();
      resolve(cachedPreferences);
    }, 400);
  });
}

/**
 * Directly applies remote preferences (e.g. from SignalR real-time event).
 */
export function applyRemotePreferences(remoteData) {
  if (!remoteData || typeof remoteData !== "object") return null;

  const themeMode = (remoteData.themeMode || remoteData.ThemeMode || "light").toLowerCase() === "dark" ? "dark" : "light";
  const palette = (remoteData.palette || remoteData.Palette || "purple").toLowerCase();
  const customColor = remoteData.customColor || remoteData.CustomColor || null;

  cachedPreferences = {
    themeMode,
    palette,
    customColor,
    updatedAt: remoteData.updatedAt || remoteData.UpdatedAt || null,
  };

  notifyListeners(cachedPreferences);
  return cachedPreferences;
}
