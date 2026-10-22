import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAuthUser } from "@/features/authStorage.js";
import { can } from "@/features/rolesPermissions/permissionUtils.jsx";
import { getCurrentUserPermissions } from "@/features/rolesPermissions/rolesPermissions.service.js";

const PermissionContext = createContext({
  permissions: [],
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

  useEffect(() => {
    let isMounted = true;

    const syncPermissions = async () => {
      try {
        const res = await getCurrentUserPermissions();
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setLivePermissions(res.data);
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
        }
      } catch (err) {
        console.warn("Could not load faculty live permissions:", err);
      }
    };

    syncPermissions();

    const handleUpdate = () => syncPermissions();
    window.addEventListener("roles-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("roles-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

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
      const mapped = LEGACY_PERMISSION_MAP[permString];
      if (mapped) {
        return canAccess(mapped.module, mapped.action, mapped.screen);
      }
      return canAccess(permString, "view");
    };

    return {
      permissions,
      canAccess,
      canView,
      includes,
    };
  }, [permissions, user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function useFacultyPermissions() {
  return useContext(PermissionContext);
}

export default PermissionContext;
