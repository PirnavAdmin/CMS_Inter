import apiClient from "@/api/apiClient.js";

const THEME_POLICY_STORAGE_KEY = "pirnav-theme-policy";

export const DEFAULT_THEME_POLICY = {
  themeMode: "independent", // "independent" | "admin"
  adminPalette: "olive",
  adminCustomColor: "",
  adminDarkMode: "light",
};

let currentPolicy = (() => {
  if (typeof window === "undefined") return { ...DEFAULT_THEME_POLICY };
  try {
    const raw = window.sessionStorage.getItem(THEME_POLICY_STORAGE_KEY);
    return raw ? { ...DEFAULT_THEME_POLICY, ...JSON.parse(raw) } : { ...DEFAULT_THEME_POLICY };
  } catch {
    return { ...DEFAULT_THEME_POLICY };
  }
})();

const policyListeners = new Set();

const notifyListeners = () => {
  policyListeners.forEach((fn) => {
    try {
      fn(currentPolicy);
    } catch {}
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("theme-policy-changed", { detail: currentPolicy }));
  }
};

export const getThemePolicySnapshot = () => currentPolicy;

export const subscribeThemePolicy = (listener) => {
  policyListeners.add(listener);
  return () => policyListeners.delete(listener);
};

export async function fetchThemePolicy() {
  try {
    const res = await apiClient.get("/api/v1/settings/theme-policy", {
      skipGlobalLoader: true,
      optionalAuth: true,
    });
    const data = res?.data?.data || res?.data;
    if (data && typeof data === "object") {
      const mode = (data.themeMode || data.ThemeMode || "independent").toLowerCase();
      const palette = data.adminPalette || data.AdminPalette || "olive";
      const customColor = data.adminCustomColor || data.AdminCustomColor || "";
      const darkMode = data.adminDarkMode || data.AdminDarkMode || "light";

      currentPolicy = {
        themeMode: mode === "admin" ? "admin" : "independent",
        adminPalette: palette,
        adminCustomColor: customColor,
        adminDarkMode: darkMode,
      };

      try {
        window.sessionStorage.setItem(THEME_POLICY_STORAGE_KEY, JSON.stringify(currentPolicy));
      } catch {}

      notifyListeners();
      return currentPolicy;
    }
  } catch (err) {
    // If backend is unavailable or offline, keep current / default policy
  }
  return currentPolicy;
}

export async function updateThemePolicy(policyUpdates) {
  const payload = {
    themeMode: policyUpdates.themeMode || currentPolicy.themeMode,
    adminPalette: policyUpdates.adminPalette || currentPolicy.adminPalette,
    adminCustomColor: policyUpdates.adminCustomColor !== undefined ? policyUpdates.adminCustomColor : currentPolicy.adminCustomColor,
    adminDarkMode: policyUpdates.adminDarkMode || currentPolicy.adminDarkMode,
  };

  const res = await apiClient.put("/api/v1/settings/theme-policy", payload);
  const data = res?.data?.data || res?.data;

  currentPolicy = {
    themeMode: (data?.themeMode || data?.ThemeMode || payload.themeMode).toLowerCase() === "admin" ? "admin" : "independent",
    adminPalette: data?.adminPalette || data?.AdminPalette || payload.adminPalette,
    adminCustomColor: data?.adminCustomColor || data?.AdminCustomColor || payload.adminCustomColor || "",
    adminDarkMode: data?.adminDarkMode || data?.AdminDarkMode || payload.adminDarkMode || "light",
  };

  try {
    window.sessionStorage.setItem(THEME_POLICY_STORAGE_KEY, JSON.stringify(currentPolicy));
  } catch {}

  notifyListeners();
  return currentPolicy;
}
