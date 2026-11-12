import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { can } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";
import { getCurrentUserPermissions } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.service.js";

const PermissionContext = createContext({
  permissions: [],
  isLoadingPermissions: false,
  canAccess: () => false,
  canView: () => false,
  includes: () => false,
});

// Map legacy mock permission strings to canonical RBAC module keys & actions
const LEGACY_PERMISSION_MAP = {
  VIEW_DASHBOARD: { module: "dashboard", action: "view" },
  VIEW_PROFILE: { module: "profile", action: "view" },
  VIEW_TIMETABLE: { module: "timetable", action: "view" },
  VIEW_CLASSES: { module: "subject-management", action: "view" },
  MARK_ATTENDANCE: { module: "attendance", action: "view" },
  VIEW_ATTENDANCE: { module: "attendance", action: "view" },
  ENTER_MARKS: { module: "marks-evaluation", action: "view" },
  VIEW_MARKS: { module: "marks-evaluation", action: "view" },
  VIEW_EXAM_DUTIES: { module: "examinations", action: "view" },
  VIEW_SELF_ATTENDANCE: { module: "staff-attendance", action: "view", screen: "my-attendance" },
  APPLY_LEAVE: { module: "staff-leave-management", action: "view", screen: "staff-leave" },
  VIEW_LEAVE: { module: "staff-leave-management", action: "view", screen: "staff-leave" },
  VIEW_PAYSLIPS: { module: "payroll", action: "view" },
  VIEW_HOLIDAYS: { module: "holiday-management", action: "view" },
  VIEW_REIMBURSEMENTS: { module: "reimbursement", action: "view" },
  VIEW_SETTINGS: { module: "settings", action: "view" },
};

export function PermissionProvider({ children, permissions: permissionsProp }) {
  const [user, setUser] = useState(() => getAuthUser());
  const [livePermissions, setLivePermissions] = useState(() => {
    if (permissionsProp !== undefined) return permissionsProp;
    const u = getAuthUser();
    return u?.permissions || u?.rolePermissions || [];
  });
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(() => {
    if (permissionsProp !== undefined) return false;
    const u = getAuthUser();
    const cached = u?.permissions || u?.rolePermissions;
    return Boolean(u) && (!Array.isArray(cached) || cached.length === 0);
  });
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const hasApiSyncRef = useRef(false);

  useEffect(() => {
    if (permissionsProp !== undefined) {
      setIsLoadingPermissions(false);
      return undefined;
    }

    let isMounted = true;
    const RETRY_DELAYS = [1500, 3500, 7000];

    const syncPermissions = async () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      const freshAuth = getAuthUser();
      if (isMounted && freshAuth) {
        setUser(freshAuth);
      }
      if (!freshAuth) {
        if (isMounted) setIsLoadingPermissions(false);
        return;
      }

      try {
        const res = await getCurrentUserPermissions();
        if (!isMounted) return;

        const source = res?.meta?.source || "api";
        if (source === "api" && Array.isArray(res?.data)) {
          hasApiSyncRef.current = true;
          retryAttemptRef.current = 0;
          setLivePermissions(res.data);
          setIsLoadingPermissions(false);
          const currentUser = getAuthUser();
          if (currentUser) {
            const updated = { ...currentUser, permissions: res.data };
            setUser(updated);
            try {
              for (const storage of [window.localStorage, window.sessionStorage]) {
                if (storage.getItem("user")) storage.setItem("user", JSON.stringify(updated));
              }
            } catch {
              // ignore
            }
          }
          return;
        }

        if (source === "cache" && Array.isArray(res?.data) && res.data.length > 0) {
          setLivePermissions((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : res.data));
        }

        // Retry transient permission fetch errors without wiping existing permissions
        const attempt = retryAttemptRef.current;
        if (attempt < RETRY_DELAYS.length) {
          retryAttemptRef.current = attempt + 1;
          retryTimerRef.current = setTimeout(() => {
            if (isMounted) syncPermissions();
          }, RETRY_DELAYS[attempt]);
        } else {
          setIsLoadingPermissions(false);
        }
      } catch (err) {
        console.warn("Could not load faculty live permissions:", err);
        if (!isMounted) return;
        const attempt = retryAttemptRef.current;
        if (attempt < RETRY_DELAYS.length) {
          retryAttemptRef.current = attempt + 1;
          retryTimerRef.current = setTimeout(() => {
            if (isMounted) syncPermissions();
          }, RETRY_DELAYS[attempt]);
        } else {
          setIsLoadingPermissions(false);
        }
      }
    };

    syncPermissions();

    const handleUpdate = () => {
      retryAttemptRef.current = 0;
      syncPermissions();
    };
    const handleReconnect = () => {
      if (!hasApiSyncRef.current) {
        retryAttemptRef.current = 0;
        syncPermissions();
      }
    };

    window.addEventListener("roles-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("cms-staff-updated", handleReconnect);
    window.addEventListener("online", handleReconnect);
    window.addEventListener("focus", handleReconnect);
    return () => {
      isMounted = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      window.removeEventListener("roles-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("cms-staff-updated", handleReconnect);
      window.removeEventListener("online", handleReconnect);
      window.removeEventListener("focus", handleReconnect);
    };
  }, [permissionsProp]);

  const permissions = useMemo(() => {
    if (permissionsProp !== undefined) return permissionsProp;
    return livePermissions;
  }, [permissionsProp, livePermissions]);

  const value = useMemo(() => {
    const canAccess = (moduleKey, actionKey = "view", screenKey = null) => {
      // Profile is the personal user profile; always viewable by logged-in faculty
      if (moduleKey === "profile") return true;
      return can(moduleKey, actionKey, permissions, user, screenKey);
    };

    const canView = (moduleKey, screenKey = null) => {
      return canAccess(moduleKey, "view", screenKey);
    };

    // Backwards compatibility for code that calls permissions.includes(...)
    const includes = (permString) => {
      if (!permString) return true;
      if (permString === "VIEW_PROFILE") return true;
      if (permString === "VIEW_REIMBURSEMENTS") {
        return canAccess("reimbursement", "view") || canAccess("staff-reimbursements", "view");
      }
      const mapped = LEGACY_PERMISSION_MAP[permString];
      if (mapped) {
        return canAccess(mapped.module, mapped.action, mapped.screen);
      }
      return canAccess(permString, "view");
    };

    return {
      permissions,
      isLoadingPermissions,
      canAccess,
      canView,
      includes,
    };
  }, [permissions, user, isLoadingPermissions]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function useFacultyPermissions() {
  return useContext(PermissionContext);
}

export default PermissionContext;
