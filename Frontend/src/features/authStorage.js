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

export const cleanUserObject = (user) => {
  if (!user || typeof user !== "object") return user;
  const cleaned = { ...user };
  if (typeof cleaned.name === "string") {
    cleaned.name = cleaned.name.replace(/\bDemo\s*/gi, "").trim();
  }
  if (typeof cleaned.fullName === "string") {
    cleaned.fullName = cleaned.fullName.replace(/\bDemo\s*/gi, "").trim();
  }
  if (typeof cleaned.displayName === "string") {
    cleaned.displayName = cleaned.displayName.replace(/\bDemo\s*/gi, "").trim();
  }
  return cleaned;
};

export const getAuthUser = () => {
  try {
    const raw = getAuthItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const cleaned = cleanUserObject(parsed);
    // Persist cleaned version if 'Demo' was present in stored session
    if (
      parsed &&
      ((parsed.name && /\bDemo\b/i.test(parsed.name)) ||
        (parsed.fullName && /\bDemo\b/i.test(parsed.fullName)) ||
        (parsed.displayName && /\bDemo\b/i.test(parsed.displayName)))
    ) {
      try {
        if (typeof window !== "undefined") {
          if (window.localStorage.getItem("user")) {
            window.localStorage.setItem("user", JSON.stringify(cleaned));
          }
          if (window.sessionStorage.getItem("user")) {
            window.sessionStorage.setItem("user", JSON.stringify(cleaned));
          }
        }
      } catch {}
    }
    return cleaned;
  } catch {
    return null;
  }
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
  const cleanedUser = cleanUserObject(user);
  storage.setItem("token", String(token));
  storage.setItem("user", JSON.stringify(cleanedUser));
  storage.setItem("role", String(role ?? cleanedUser?.role ?? ""));
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

