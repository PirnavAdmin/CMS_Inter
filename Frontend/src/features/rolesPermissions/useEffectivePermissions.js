import { useCallback, useMemo } from "react";

export function useEffectivePermissions() {
  const refresh = useCallback(async () => undefined, []);

  return useMemo(() => ({
    permissions: [],
    loading: false,
    error: "",
    refresh,
    canView: () => true,
    canDo: () => true,
  }), [refresh]);
}
