import { useSyncExternalStore } from "react";
import {
  getThemePolicySnapshot,
  subscribeThemePolicy,
  fetchThemePolicy,
  updateThemePolicy,
} from "@/features/themePolicy.js";

const THEME_STORAGE_KEY = "pirnav-theme";
const PALETTE_STORAGE_KEY = "pirnav-dashboard-palette";
const CUSTOM_COLOR_STORAGE_KEY = "pirnav-custom-color";

export const VALID_PALETTES = [
  "olive",
  "cobalt",
  "sapphire",
  "ocean",
  "midnight",
  "graphite",
  "teal",
  "emerald",
  "amber",
  "cinnamon",
  "bronze",
  "crimson",
  "wine",
  "plum",
  "purple",
  "custom",
];

const listeners = new Set();

export function isUserAdmin() {
  if (typeof window === "undefined") return false;
  try {
    // 1. Check role in sessionStorage / localStorage
    const role = (
      window.sessionStorage.getItem("role") ||
      window.localStorage.getItem("role") ||
      ""
    ).toLowerCase();

    if (role.includes("admin") || role.includes("superadmin")) return true;

    // 2. Check user object
    const userRaw =
      window.sessionStorage.getItem("user") ||
      window.localStorage.getItem("user");
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (
        u?.isAdmin ||
        String(u?.role || "").toLowerCase().includes("admin") ||
        u?.roleType === "admin"
      ) {
        return true;
      }
    }

    // 3. Fallback: Path-based detection for Admin Portal
    const pathname = window.location?.pathname || "";
    if (
      pathname.startsWith("/dashboard/settings") ||
      pathname === "/dashboard" ||
      (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/student"))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function hexToHsl(hex) {
  let c = (hex || "#00b4d8").replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return { h: 190, s: 95, l: 45 };
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function applyCustomThemeTokens(hex) {
  if (typeof document === "undefined") return;
  const { h, s } = hexToHsl(hex);
  let styleEl = document.getElementById("cms-custom-theme-vars");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "cms-custom-theme-vars";
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    html[data-theme-palette="custom"],
    .cms-shell[data-dashboard-palette="custom"] {
      --cms-primary: hsl(${h}, ${Math.min(s, 90)}%, 38%) !important;
      --cms-primary-dark: hsl(${h}, ${Math.min(s, 90)}%, 28%) !important;
      --cms-primary-hover: hsl(${h}, ${Math.min(s, 90)}%, 32%) !important;
      --cms-primary-active: hsl(${h}, ${Math.min(s, 90)}%, 24%) !important;
      --cms-primary-soft: hsl(${h}, ${Math.min(s, 65)}%, 92%) !important;
      --cms-primary-border: hsl(${h}, ${Math.min(s, 55)}%, 82%) !important;
      --cms-sidebar-surface-bg: linear-gradient(180deg, hsl(${h}, ${Math.min(s, 55)}%, 85%) 0%, hsl(${h}, ${Math.min(s, 55)}%, 76%) 100%) !important;
      --cms-topbar-surface-bg: linear-gradient(180deg, hsl(${h}, ${Math.min(s, 55)}%, 85%) 0%, hsl(${h}, ${Math.min(s, 55)}%, 76%) 100%) !important;
      --cms-brand-surface-bg: linear-gradient(180deg, hsl(${h}, ${Math.min(s, 55)}%, 85%) 0%, hsl(${h}, ${Math.min(s, 55)}%, 76%) 100%) !important;
      --cms-nav-chrome-border: hsla(${h}, ${Math.min(s, 60)}%, 35%, 0.35) !important;
      --cms-sidebar-group-color: hsl(${h}, ${Math.min(s, 75)}%, 24%) !important;
      --cms-sidebar-link-color: hsl(${h}, 25%, 13%) !important;
      --cms-sidebar-link-hover-bg: hsla(${h}, ${Math.min(s, 60)}%, 35%, 0.16) !important;
      --cms-sidebar-link-hover-color: hsl(${h}, 30%, 10%) !important;
      --cms-sidebar-active: linear-gradient(90deg, hsl(${h}, ${Math.min(s, 85)}%, 38%), hsl(${h}, ${Math.min(s, 85)}%, 48%)) !important;
      --cms-sidebar-active-glow: 0 4px 14px hsla(${h}, ${Math.min(s, 85)}%, 38%, 0.45) !important;
      --cms-brand-logo-filter: hue-rotate(${Math.round(h - 70)}deg) saturate(1.25) contrast(1.15) brightness(1.04) drop-shadow(0 1px 2px hsla(${h}, ${s}%, 40%, 0.25)) !important;
    }

    html[data-theme-palette="custom"]:not([data-theme="dark"]) {
      background: linear-gradient(135deg, hsl(${h}, ${Math.min(s, 40)}%, 92%) 0%, #fafbfc 45%, hsl(${h}, ${Math.min(s, 40)}%, 88%) 100%) fixed !important;
    }

    [data-theme="dark"] html[data-theme-palette="custom"],
    html[data-theme="dark"][data-theme-palette="custom"],
    [data-theme="dark"] [data-theme-palette="custom"],
    [data-theme="dark"] .cms-shell[data-dashboard-palette="custom"] {
      --cms-primary: hsl(${h}, ${Math.min(s, 85)}%, 65%) !important;
      --cms-primary-dark: hsl(${h}, ${Math.min(s, 85)}%, 75%) !important;
      --cms-primary-hover: hsl(${h}, ${Math.min(s, 85)}%, 70%) !important;
      --cms-primary-active: hsl(${h}, ${Math.min(s, 85)}%, 80%) !important;
      --cms-primary-soft: hsla(${h}, ${Math.min(s, 85)}%, 65%, 0.18) !important;
      --cms-primary-border: hsl(${h}, ${Math.min(s, 50)}%, 30%) !important;
      --cms-sidebar-surface-bg: linear-gradient(180deg, hsl(${h}, ${Math.min(s, 35)}%, 14%) 0%, hsl(${h}, ${Math.min(s, 35)}%, 9%) 100%) !important;
      --cms-topbar-surface-bg: linear-gradient(135deg, hsl(${h}, ${Math.min(s, 35)}%, 17%) 0%, hsl(${h}, ${Math.min(s, 35)}%, 11%) 100%) !important;
      --cms-brand-surface-bg: linear-gradient(135deg, hsl(${h}, ${Math.min(s, 35)}%, 17%) 0%, hsl(${h}, ${Math.min(s, 35)}%, 11%) 100%) !important;
      --cms-nav-chrome-border: hsla(${h}, ${Math.min(s, 60)}%, 65%, 0.22) !important;
      --cms-sidebar-group-color: hsl(${h}, ${Math.min(s, 50)}%, 72%) !important;
      --cms-sidebar-link-color: hsl(${h}, 15%, 94%) !important;
      --cms-sidebar-link-hover-bg: hsla(${h}, ${Math.min(s, 60)}%, 65%, 0.16) !important;
      --cms-sidebar-link-hover-color: #ffffff !important;
      --cms-sidebar-active: linear-gradient(90deg, hsl(${h}, ${Math.min(s, 75)}%, 46%), hsl(${h}, ${Math.min(s, 75)}%, 56%)) !important;
      --cms-sidebar-active-glow: 0 4px 14px hsla(${h}, ${Math.min(s, 75)}%, 46%, 0.45) !important;
      --cms-brand-logo-filter: hue-rotate(${Math.round(h - 70)}deg) brightness(1.3) contrast(1.12) saturate(1.3) drop-shadow(0 0 3px hsla(${h}, ${Math.min(s, 60)}%, 65%, 0.6)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4)) !important;
    }

    html[data-theme="dark"][data-theme-palette="custom"] {
      background: linear-gradient(135deg, hsl(${h}, ${Math.min(s, 30)}%, 6%) 0%, hsl(${h}, ${Math.min(s, 30)}%, 12%) 45%, hsl(${h}, ${Math.min(s, 30)}%, 7%) 100%) fixed !important;
    }
  `;
}

function readTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function readCustomColor() {
  if (typeof window === "undefined") return "#00b4d8";
  try {
    return window.localStorage.getItem(CUSTOM_COLOR_STORAGE_KEY) || "#00b4d8";
  } catch {
    return "#00b4d8";
  }
}

function readPalette() {
  if (typeof document === "undefined") return "olive";
  const attr = document.documentElement.getAttribute("data-theme-palette");
  if (VALID_PALETTES.includes(attr)) return attr;
  try {
    const saved = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    return VALID_PALETTES.includes(saved) ? saved : "olive";
  } catch {
    return "olive";
  }
}

function readEffectivePalette() {
  const policy = getThemePolicySnapshot();
  if (policy && policy.themeMode === "admin") {
    return VALID_PALETTES.includes(policy.adminPalette) ? policy.adminPalette : "olive";
  }
  return readPalette();
}

function readEffectiveCustomColor() {
  const policy = getThemePolicySnapshot();
  if (policy && policy.themeMode === "admin" && policy.adminPalette === "custom") {
    return policy.adminCustomColor || "#00b4d8";
  }
  return readCustomColor();
}

export function applyEffectiveTheme() {
  if (typeof document === "undefined") return;
  const p = readEffectivePalette();
  document.documentElement.setAttribute("data-theme-palette", p);
  if (p === "custom") {
    applyCustomThemeTokens(readEffectiveCustomColor());
  }
}

// Initial setup on script execution
if (typeof document !== "undefined") {
  applyEffectiveTheme();
  // Fetch fresh theme policy from backend on app bootstrap
  fetchThemePolicy()
    .then(() => {
      applyEffectiveTheme();
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}

// Subscribe to policy updates (custom events / multi-tab)
subscribeThemePolicy(() => {
  applyEffectiveTheme();
  listeners.forEach((l) => l());
});

export function setTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme === "dark" ? "#161916" : "#6F8400");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  listeners.forEach((l) => l());
}

export function setPalette(palette) {
  if (typeof document === "undefined") return;
  const p = VALID_PALETTES.includes(palette) ? palette : "olive";
  const policy = getThemePolicySnapshot();
  const adminUser = isUserAdmin();

  // If in admin mode and user is admin, immediately update the policy in backend!
  if (policy?.themeMode === "admin" && adminUser) {
    updateThemePolicy({ themeMode: "admin", adminPalette: p }).catch(() => {});
  }

  document.documentElement.setAttribute("data-theme-palette", p);
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, p);
    window.localStorage.setItem("pirnav-palette", p);
  } catch {}

  if (p === "custom") {
    applyCustomThemeTokens(readEffectiveCustomColor());
  }

  listeners.forEach((l) => l());
}

export function setCustomColor(color) {
  if (typeof window === "undefined") return;
  const policy = getThemePolicySnapshot();
  const adminUser = isUserAdmin();

  if (policy?.themeMode === "admin" && adminUser) {
    updateThemePolicy({
      themeMode: "admin",
      adminCustomColor: color,
      adminPalette: "custom",
    }).catch(() => {});
  }

  try {
    window.localStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, color);
  } catch {}

  applyCustomThemeTokens(color);

  // If not already on custom, switch to custom palette
  if (readEffectivePalette() !== "custom") {
    setPalette("custom");
  } else {
    listeners.forEach((l) => l());
  }
}

function subscribe(cb) {
  listeners.add(cb);
  const handleStorage = (e) => {
    if (
      e.key === THEME_STORAGE_KEY ||
      e.key === PALETTE_STORAGE_KEY ||
      e.key === "pirnav-palette" ||
      e.key === CUSTOM_COLOR_STORAGE_KEY
    ) {
      if (e.key === CUSTOM_COLOR_STORAGE_KEY && readEffectivePalette() === "custom") {
        applyCustomThemeTokens(readEffectiveCustomColor());
      }
      cb();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light");
  const palette = useSyncExternalStore(subscribe, readEffectivePalette, () => "olive");
  const customColor = useSyncExternalStore(subscribe, readEffectiveCustomColor, () => "#00b4d8");
  const themePolicy = useSyncExternalStore(subscribe, getThemePolicySnapshot, () => ({
    themeMode: "independent",
    adminPalette: "olive",
    adminCustomColor: "",
    adminDarkMode: "light",
  }));

  const isAdmin = isUserAdmin();
  // An Admin user is NEVER locked out!
  const isThemeLocked = themePolicy?.themeMode === "admin" && !isAdmin;

  return {
    theme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
    setTheme,
    palette,
    setPalette: (p) => {
      if (isThemeLocked) return;
      setPalette(p);
    },
    customColor,
    setCustomColor: (c) => {
      if (isThemeLocked) return;
      setCustomColor(c);
    },
    themePolicy,
    isThemeLocked,
    isAdmin,
    updateThemePolicy,
  };
}

export default useTheme;
