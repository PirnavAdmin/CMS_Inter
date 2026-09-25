const AUTH_KEYS = ["token", "user", "role", "cms-parent-active-child"];

const storageValue = (storage, key) => {
  try { return storage?.getItem(key) ?? null; }
  catch { return null; }
};

export const getAuthItem = (key) => {
  if (typeof window === "undefined") return null;
  return storageValue(window.sessionStorage, key) ?? storageValue(window.localStorage, key);
};

export const getAuthToken = () => getAuthItem("token") || "";

export const getAuthUser = () => {
  try { return JSON.parse(getAuthItem("user") || "null"); }
  catch { return null; }
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

export const saveAuthSession = ({ token, user, role }, persistent) => {
  clearAuthSession();
  if (!token || typeof window === "undefined") return;
  const storage = persistent ? window.localStorage : window.sessionStorage;
  storage.setItem("token", String(token));
  storage.setItem("user", JSON.stringify(user));
  storage.setItem("role", String(role ?? user?.role ?? ""));
};

export const updateAuthToken = (token) => {
  if (!token || typeof window === "undefined") return;
  const rawToken = String(token).replace(/^Bearer\s+/i, "").trim();
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

