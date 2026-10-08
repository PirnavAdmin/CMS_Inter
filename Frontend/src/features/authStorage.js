const AUTH_KEYS = [
  "token",
  "user",
  "role",
  "cms-parent-active-child",
  "cms_auth",
  "cms_role",
  "cms_username",
  "cms_warden_outpasses",
];

const storageValue = (storage, key) => {
  try { return storage?.getItem(key) ?? null; }
  catch { return null; }
};

export const getAuthItem = (key) => {
  if (typeof window === "undefined") return null;
  return storageValue(window.sessionStorage, key) ?? storageValue(window.localStorage, key);
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") return;
  AUTH_KEYS.forEach((key) => {
    try { window.localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  });
  try {
    window.localStorage.removeItem("staff_profile_data");
    window.sessionStorage.removeItem("staff_profile_data");
    // Also remove any namespaced staff profiles
    Object.keys(window.localStorage || {}).forEach((k) => {
      if (k.startsWith("staff_profile_")) {
        window.localStorage.removeItem(k);
      }
    });
    Object.keys(window.sessionStorage || {}).forEach((k) => {
      if (k.startsWith("staff_profile_")) {
        window.sessionStorage.removeItem(k);
      }
    });
  } catch { /* Storage unavailable */ }
};

export const getAuthToken = () => {
  const item = getAuthItem("token");
  if (!item || typeof item !== "string") return "";
  const cleaned = item.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
  if (!cleaned || cleaned === "undefined" || cleaned === "null") return "";
  // Invalidate any lingering mock or unauthenticated dummy tokens
  if (cleaned.includes("-auth-token-") || cleaned.startsWith("mock-") || cleaned.includes(".sig_")) {
    clearAuthSession();
    return "";
  }
  return cleaned;
};

export const getAuthUser = () => {
  try { return JSON.parse(getAuthItem("user") || "null"); }
  catch { return null; }
};


export const saveAuthSession = ({ token, user, role }, persistent) => {
  clearAuthSession();
  if (!token || typeof window === "undefined") return;
  const rawToken = String(token).replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
  if (!rawToken || rawToken === "undefined" || rawToken === "null") return;
  const storage = persistent ? window.localStorage : window.sessionStorage;
  storage.setItem("token", rawToken);
  storage.setItem("user", JSON.stringify(user));
  const normalizedRole = String(role ?? user?.role ?? "");
  storage.setItem("role", normalizedRole);

  const isWarden =
    normalizedRole.toLowerCase().includes("warden") ||
    String(user?.email || "").toLowerCase().includes("warden");
  if (isWarden) {
    try {
      window.localStorage.setItem("cms_auth", "true");
      window.localStorage.setItem("cms_role", "warden");
      window.localStorage.setItem("cms_username", user?.email || "Warden@CMS.com");
      window.sessionStorage.setItem("cms_auth", "true");
      window.sessionStorage.setItem("cms_role", "warden");
      window.sessionStorage.setItem("cms_username", user?.email || "Warden@CMS.com");
    } catch {}
  }
};

export const updateAuthToken = (token) => {
  if (!token || typeof window === "undefined") return;
  const rawToken = String(token).replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
  if (!rawToken || rawToken === "undefined" || rawToken === "null") return;
  if (window.localStorage.getItem("token")) {
    window.localStorage.setItem("token", rawToken);
  }
  if (window.sessionStorage.getItem("token")) {
    window.sessionStorage.setItem("token", rawToken);
  }
  if (!window.localStorage.getItem("token") && !window.sessionStorage.getItem("token")) {
    window.localStorage.setItem("token", rawToken);
  }
};

