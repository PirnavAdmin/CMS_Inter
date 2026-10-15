import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUserPermissions } from "./rolesPermissions.service.js";
import { can, hasRole, toPermissionMap } from "./permissionUtils.jsx";
import { ACTIONS } from "./rolesPermissions.constants.js";
import { getAuthUser } from "@/features/authStorage.js";

export function useEffectivePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getCurrentUserPermissions();
      setPermissions(result?.data || []);
    } catch (err) {
      console.warn("Failed to load user permissions:", err?.message);
      setError(err?.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleRolesUpdated = () => {
      refresh();
    };

    window.addEventListener("roles-updated", handleRolesUpdated);
    return () => {
      window.removeEventListener("roles-updated", handleRolesUpdated);
    };
  }, [refresh]);

  const user = getAuthUser();
  const isSuperOrAdmin = useMemo(() => hasRole("SUPER_ADMIN", user) || hasRole("ADMIN", user), [user]);

  const permissionMap = useMemo(() => toPermissionMap(permissions), [permissions]);

  const canView = useCallback(
    (moduleKey, screenKey = null) => {
      if (isSuperOrAdmin) return true;
      return can(moduleKey, ACTIONS.VIEW, permissions, user, screenKey);
    },
    [isSuperOrAdmin, permissions, user],
  );

  const canDo = useCallback(
    (moduleKey, actionKey = ACTIONS.VIEW, screenKey = null) => {
      if (isSuperOrAdmin) return true;
      return can(moduleKey, actionKey, permissions, user, screenKey);
    },
    [isSuperOrAdmin, permissions, user],
  );

  return useMemo(() => ({
    permissions,
    permissionMap,
    loading,
    error,
    refresh,
    canView,
    canDo,
    can: (mod, act, scr) => canDo(mod, act, scr),
    isSuperOrAdmin,
  }), [permissions, permissionMap, loading, error, refresh, canView, canDo, isSuperOrAdmin]);
}
