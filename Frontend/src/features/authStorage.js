const AUTH_KEYS = ["token", "user", "role"];

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
};

export const saveAuthSession = ({ token, user, role }, persistent) => {
  clearAuthSession();
  if (!token || typeof window === "undefined") return;
  const storage = persistent ? window.localStorage : window.sessionStorage;
  storage.setItem("token", String(token));
  storage.setItem("user", JSON.stringify(user));
  storage.setItem("role", String(role ?? user?.role ?? ""));
};
