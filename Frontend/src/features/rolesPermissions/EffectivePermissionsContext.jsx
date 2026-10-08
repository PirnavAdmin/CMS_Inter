import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { ACTIONS } from "./rolesPermissions.constants.js";
import { can } from "./permissionUtils.jsx";
import { getCurrentUserPermissions } from "./rolesPermissions.service.js";

const EffectivePermissionsContext = createContext({
  permissions: [],
  status: "idle",
  error: "",
  canAccess: () => false,
  refreshPermissions: async () => undefined,
});

export function EffectivePermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [sessionVersion, setSessionVersion] = useState(0);
  const token = getAuthToken();
  const user = getAuthUser();

  const refreshPermissions = useCallback(async () => {
    if (!token) {
      setPermissions([]);
      setError("");
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const response = await getCurrentUserPermissions();
      setPermissions(response.data || []);
      setStatus("ready");
    } catch (requestError) {
      setPermissions([]);
      setError(requestError?.message || "Unable to load permissions.");
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions, sessionVersion]);

  useEffect(() => {
    const onSessionChange = () => setSessionVersion((value) => value + 1);
    window.addEventListener("cms-auth-session-updated", onSessionChange);
    return () => window.removeEventListener("cms-auth-session-updated", onSessionChange);
  }, []);

  const value = useMemo(() => ({
    permissions,
    status,
    error,
    refreshPermissions,
    canAccess: (moduleKey, actionKey = ACTIONS.VIEW) => can(moduleKey, actionKey, permissions, user),
  }), [error, permissions, refreshPermissions, status, user]);

  return <EffectivePermissionsContext.Provider value={value}>{children}</EffectivePermissionsContext.Provider>;
}

export function useEffectivePermissions() {
  return useContext(EffectivePermissionsContext);
}

export default EffectivePermissionsContext;
