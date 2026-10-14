import { useCallback, useEffect, useMemo, useState } from "react";
import { ACTIONS } from "./rolesPermissions.constants.js";
import { getCurrentUserPermissions } from "./rolesPermissions.service.js";
import { can } from "./permissionUtils.jsx";

export function useEffectivePermissions({ enabled = true } = {}) {
  const [state, setState] = useState({ permissions: [], loading: Boolean(enabled), error: "" });

  const refresh = useCallback(async () => {
    if (!enabled) {
      setState({ permissions: [], loading: false, error: "" });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await getCurrentUserPermissions();
      setState({ permissions: response.data || [], loading: false, error: "" });
    } catch (error) {
      setState({ permissions: [], loading: false, error: error?.message || "Unable to load permissions." });
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({
    ...state,
    refresh,
    canView: (moduleKey) => enabled && !state.loading && !state.error && can(moduleKey, ACTIONS.VIEW, state.permissions),
    canDo: (moduleKey, actionKey = ACTIONS.VIEW) => enabled && !state.loading && !state.error && can(moduleKey, actionKey, state.permissions),
  }), [enabled, refresh, state]);
}
