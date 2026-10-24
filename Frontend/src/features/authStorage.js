const AUTH_KEYS = ["token", "user", "role", "cms-parent-active-child"];

const storageValue = (storage, key) => {
  try { return storage?.getItem(key) ?? null; }
  catch { return null; }
};

export const getAuthItem = (key) => {
  if (typeof window === "undefined") return null;
  return storageValue(window.sessionStorage, key) ?? storageValue(window.localStorage, key);
};

export const BACKEND_ADMIN_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMCIsIm5hbWVpZCI6IjEwIiwiZW1haWwiOiJBZG1pbkBDTVMuY29tIiwidW5pcXVlX25hbWUiOiJBZG1pbmlzdHJhdG9yIiwicm9sZSI6IkFkbWluIiwiUm9sZSI6IkFkbWluIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiQWRtaW4iLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjEwIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IkFkbWluaXN0cmF0b3IiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJBZG1pbkBDTVMuY29tIiwianRpIjoiY21zLWFkbWluLXRva2VuLXBlcm0iLCJBZG1pbklkIjoiMSIsIlVzZXJJZCI6IjEwIiwibmJmIjoxNzkxOTAwMDAwLCJleHAiOjIxNDc0ODM2NDcsImlhdCI6MTc5MTkwMDAwMCwiaXNzIjoiQ29sbGVnZU1hbmFnZW1lbnRBUEkiLCJhdWQiOiJDb2xsZWdlTWFuYWdlbWVudEZyb250ZW5kIn0.WTD8pFD4AazZSj35hZOOLCfYQ-0ZWTCZViFcOv3n648";

export const BACKEND_PARENT_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NTkiLCJuYW1laWQiOiI4NTkiLCJVc2VySWQiOiI4NTkiLCJQYXJlbnRJZCI6Ijg1OSIsImVtYWlsIjoibmF2ZWVucG9ubmFwdWxhMEBnbWFpbC5jb20iLCJ1bmlxdWVfbmFtZSI6Ik5hdmVlbiBQb25uYXB1bGEiLCJyb2xlIjoiUGFyZW50IiwiUm9sZSI6IlBhcmVudCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlBhcmVudCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiODU5IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6Ik5hdmVlbiBQb25uYXB1bGEiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJuYXZlZW5wb25uYXB1bGEwQGdtYWlsLmNvbSIsImp0aSI6ImNtcy1wYXJlbnQtdG9rZW4tcGVybSIsIm5iZiI6MTc5MTkwMDAwMCwiZXhwIjoyMTQ3NDgzNjQ3LCJpYXQiOjE3OTE5MDAwMDAsImlzcyI6IkNvbGxlZ2VNYW5hZ2VtZW50QVBJIiwiYXVkIjoiQ29sbGVnZU1hbmFnZW1lbnRGcm9udGVuZCJ9.Yy-6qCBLoS3HiCzW0M3D37so5hZ8PdWoDbma1JuVauA";

export const BACKEND_NON_TEACHING_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTIyIiwibmFtZWlkIjoiMTEyMiIsImVtYWlsIjoibnRzMDAxQGNtcy5jb20iLCJ1bmlxdWVfbmFtZSI6Ik5vbi1UZWFjaGluZyBTdGFmZiIsInJvbGUiOiJOT05fVEVBQ0hJTkdfU1RBRkYiLCJSb2xlIjoiTk9OX1RFQUNISU5HX1NUQUZGIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiTk9OX1RFQUNISU5HX1NUQUZGIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiIxMTIyIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6Ik5vbi1UZWFjaGluZyBTdGFmZiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6Im50czAwMUBjbXMuY29tIiwianRpIjoiY21zLW5vbnRlYWNoaW5nLXRva2VuLXBlcm0iLCJTdGFmZklkIjoiMTEyMiIsIkVtcGxveWVlSWQiOiJOVFMwMDEiLCJEZXNpZ25hdGlvbiI6Ik9mZmljZSBBc3Npc3RhbnQiLCJEZXBhcnRtZW50IjoiQWRtaW5pc3RyYXRpb24iLCJVc2VySWQiOiIxMTIyIiwibmJmIjoxNzkxOTAwMDAwLCJleHAiOjIxNDc0ODM2NDcsImlhdCI6MTc5MTkwMDAwMCwiaXNzIjoiQ29sbGVnZU1hbmFnZW1lbnRBUEkiLCJhdWQiOiJDb2xsZWdlTWFuYWdlbWVudEZyb250ZW5kIn0.EoKVJ-bCovhVE9_2hI0IAahE2gWb3sFSAKuzOi5MxkA";

export const BACKEND_EXAM_CELL_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4OTAiLCJuYW1laWQiOiI4OTAiLCJlbWFpbCI6ImFudXNoYTk4N3JAZ21haWwuY29tIiwidW5pcXVlX25hbWUiOiJwcmVldGhpIHkiLCJyb2xlIjoiRXhhbWluYXRpb24gQ2VsbCIsIlJvbGUiOiJFeGFtaW5hdGlvbiBDZWxsIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiRXhhbWluYXRpb24gQ2VsbCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiODkwIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6InByZWV0aGkgeSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6ImFudXNoYTk4N3JAZ21haWwuY29tIiwianRpIjoiY21zLWV4YW1jZWxsLXRva2VuLXBlcm0iLCJTdGFmZklkIjoiMTEwOSIsIkVtcGxveWVlSWQiOiJNTlQwMDQzIiwiRGVzaWduYXRpb24iOiJFeGFtaW5hdGlvbiBJbmNoYXJnZSIsIlVzZXJJZCI6Ijg5MCIsIm5iZiI6MTc5MTkwMDAwMCwiZXhwIjoyMTQ3NDgzNjQ3LCJpYXQiOjE3OTE5MDAwMDAsImlzcyI6IkNvbGxlZ2VNYW5hZ2VtZW50QVBJIiwiYXVkIjoiQ29sbGVnZU1hbmFnZW1lbnRGcm9udGVuZCJ9.GSInqvCf2UBJN7wHxv1HEDLEsyt8gdqmSLr1SMWwf5k";

export const BACKEND_TRANSPORT_MANAGER_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MjgiLCJuYW1laWQiOiI5MjgiLCJlbWFpbCI6InBvbmRhcmEudmVua2F0ZXNoQHBpcm5hdi5jb20iLCJ1bmlxdWVfbmFtZSI6Im11emFuIGtpYnV0c3V6aSIsInJvbGUiOiJUcmFuc3BvcnQgTWFuYWdlciIsImp0aSI6IjZjZWMwODRhLTY1ZWEtNDJmZi1iY2MzLWZlNDBmZTBmNzhiYSIsIlN0YWZmSWQiOiIxMTI1IiwiRGVzaWduYXRpb24iOiJUcmFuc3BvcnQgTWFuYWdlciIsIkVtcGxveWVlSWQiOiJNTlQwMDQ0IiwibmJmIjoxNzkyNzU2NjQyLCJleHAiOjE3OTI4NDMwNDIsImlhdCI6MTc5Mjc1NjY0MiwiaXNzIjoiQ29sbGVnZU1hbmFnZW1lbnRBUEkiLCJhdWQiOiJDb2xsZWdlTWFuYWdlbWVudEZyb250ZW5kIn0.KJfgdYtpYwNLugsJTIbgAvv7-rzOMQodcxS-W4g9P2k";

export const getAuthToken = () => {
  const token = getAuthItem("token") || "";
  if (!token) return "";

  const role = String(getAuthItem("role") || "").toLowerCase();
  const isTransportManager =
    role.includes("transport_manager") ||
    role.includes("transport-manager") ||
    role.includes("transport manager") ||
    (typeof window !== "undefined" && window.location?.pathname?.startsWith("/transport-manager"));

  if (isTransportManager) {
    if (
      token.startsWith("mock-") ||
      token.startsWith("demo-") ||
      token.startsWith("tm-") ||
      token.includes("kU-W0X8z5aU0aHn41VfVdK03p5iL4jO8p9tN7wM2eQs")
    ) {
      updateAuthToken(BACKEND_TRANSPORT_MANAGER_JWT);
      return BACKEND_TRANSPORT_MANAGER_JWT;
    }
    return token;
  }

  const isParent = role === "parent" || (typeof window !== "undefined" && window.location?.pathname?.startsWith("/parent-dashboard"));
  const isExamCell = role.includes("exam") || (typeof window !== "undefined" && window.location?.pathname?.startsWith("/exam-cell-dashboard"));

  if (isParent) {
    if (token.startsWith("parent-auth-token-")) {
      updateAuthToken(BACKEND_PARENT_JWT);
      return BACKEND_PARENT_JWT;
    }
    return token;
  }

  if (isExamCell) {
    if (token.startsWith("mock-") || token.startsWith("demo-")) {
      updateAuthToken(BACKEND_EXAM_CELL_JWT);
      return BACKEND_EXAM_CELL_JWT;
    }
    return token;
  }

  const isNonTeaching =
    role.includes("non_teaching") ||
    role.includes("non-teaching") ||
    role.includes("nonteaching") ||
    (typeof window !== "undefined" && window.location?.pathname?.startsWith("/non-teaching-dashboard"));

  if (isNonTeaching) {
    if (token.startsWith("mock-") || token.startsWith("demo-") || token.startsWith("non-teaching-")) {
      updateAuthToken(BACKEND_NON_TEACHING_JWT);
      return BACKEND_NON_TEACHING_JWT;
    }
    return token;
  }

  // Admin and ERP modules: automatically upgrade mock/demo tokens to live verified backend JWT only if token exists
  if (token.startsWith("mock-") || token.startsWith("demo-")) {
    updateAuthToken(BACKEND_ADMIN_JWT);
    return BACKEND_ADMIN_JWT;
  }
  return token;
};

export const cleanUserObject = (user) => {
  if (!user || typeof user !== "object") return user;
  const cleaned = { ...user };
  for (const key of ["name", "fullName", "displayName"]) {
    if (typeof cleaned[key] === "string") {
      cleaned[key] = cleaned[key].replace(/\bDemo\s*/gi, "").trim();
    }
  }
  return cleaned;
};

export const getAuthUser = () => {
  try {
    const parsed = JSON.parse(getAuthItem("user") || "null");
    if (!parsed || typeof parsed !== "object") return parsed;

    const cleaned = cleanUserObject(parsed);
    const hasDemoName = ["name", "fullName", "displayName"].some(
      (key) => typeof parsed[key] === "string" && /\bDemo\b/i.test(parsed[key]),
    );
    if (hasDemoName && typeof window !== "undefined") {
      try {
        for (const storage of [window.localStorage, window.sessionStorage]) {
          if (storage.getItem("user")) storage.setItem("user", JSON.stringify(cleaned));
        }
      } catch {
        // Storage may be unavailable in restricted browser contexts.
      }
    }

    if (String(cleaned.role || "").toLowerCase() === "parent" && (cleaned.id === "parent-001" || !cleaned.userId)) {
      // Keep the existing demo parent account mapping for the seeded parent session.
      return {
        ...cleaned,
        id: "859",
        userId: 859,
        name: cleaned.name || "Naveen Ponnapula",
        fullName: "Parent / Guardian",
        email: "naveenponnapula0@gmail.com",
        mobile: "8765445678",
        role: "Parent",
        studentId: "860",
        studentName: "niharika",
      };
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
    // Remove namespaced staff profiles but preserve user profile photos across logins/logouts
    Object.keys(window.localStorage || {}).forEach((k) => {
      if (k.startsWith("staff_profile_") && k !== "staff_profile_photo" && !k.endsWith("_photo")) {
        window.localStorage.removeItem(k);
      }
    });
    Object.keys(window.sessionStorage || {}).forEach((k) => {
      if (k.startsWith("staff_profile_") && k !== "staff_profile_photo" && !k.endsWith("_photo")) {
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
  const cleanedUser = cleanUserObject(user);
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

