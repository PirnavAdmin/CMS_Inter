import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUserPermissions } from "./rolesPermissions.service.js";
import { can, hasRole, toPermissionMap } from "./permissionUtils.jsx";
import { ACTIONS } from "./rolesPermissions.constants.js";
import { getAuthToken, getAuthUser } from "@/modules/auth/authStorage.js";

const FOCUS_REFETCH_THROTTLE_MS = 5000;

const readSeedPermissions = (user) => {
  const perms = user?.permissions ?? user?.rolePermissions;
  return Array.isArray(perms) ? perms : [];
};

const createStateForCurrentSession = () => {
  const token = getAuthToken();
  const user = getAuthUser();
  if (!token) {
    return {
      token: "",
      user,
      permissions: [],
      loading: false,
      hasFetched: false,
      error: "",
    };
  }
  if (hasRole("SUPER_ADMIN", user)) {
    return {
      token,
      user,
      permissions: readSeedPermissions(user),
      loading: false,
      hasFetched: true,
      error: "",
    };
  }
  const seeded = readSeedPermissions(user);
  return {
    token,
    user,
    permissions: seeded,
    loading: seeded.length === 0,
    hasFetched: false,
    error: "",
  };
};

// Module-level reactive singleton store shared across all mounted consumers.
let storeState = createStateForCurrentSession();
let inFlightPromise = null;
let fetchSeq = 0;
let lastFetchedAt = 0;
let globalListenersAttached = false;

const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(storeState);
    } catch {
      // ignore subscriber errors
    }
  });
};

const setStoreState = (patch) => {
  storeState = { ...storeState, ...patch };
  notifyListeners();
};

const persistPermissionsToAuthStorage = (permissions) => {
  if (typeof window === "undefined") return null;
  const freshUser = getAuthUser();
  if (!freshUser || typeof freshUser !== "object") return null;
  const updated = { ...freshUser, permissions };
  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      if (storage?.getItem("user")) {
        storage.setItem("user", JSON.stringify(updated));
      }
    }
  } catch {
    // Storage may be unavailable in restricted contexts.
  }
  return updated;
};

const resetStore = () => {
  fetchSeq += 1;
  inFlightPromise = null;
  lastFetchedAt = 0;
  storeState = createStateForCurrentSession();
  notifyListeners();
};

const syncStoreWithTokenIfChanged = () => {
  const currentToken = getAuthToken();
  if (currentToken !== storeState.token) {
    fetchSeq += 1;
    inFlightPromise = null;
    lastFetchedAt = 0;
    storeState = createStateForCurrentSession();
    return true;
  }
  return false;
};

async function fetchEffectivePermissions({ force = false } = {}) {
  syncStoreWithTokenIfChanged();

  const tokenAtStart = getAuthToken();
  const userAtStart = getAuthUser();

  if (!tokenAtStart) {
    if (storeState.permissions.length > 0 || storeState.loading || storeState.hasFetched) {
      resetStore();
    }
    return [];
  }

  if (hasRole("SUPER_ADMIN", userAtStart)) {
    if (storeState.loading || !storeState.hasFetched) {
      setStoreState({
        token: tokenAtStart,
        user: userAtStart,
        loading: false,
        hasFetched: true,
        error: "",
      });
    }
    return storeState.permissions;
  }

  if (!force && inFlightPromise) {
    return inFlightPromise;
  }

  const seq = ++fetchSeq;
  const shouldShowLoading = !storeState.hasFetched && storeState.permissions.length === 0;
  if (shouldShowLoading && !storeState.loading) {
    setStoreState({ loading: true, error: "" });
  } else if (storeState.error) {
    setStoreState({ error: "" });
  }

  const promise = (async () => {
    try {
      const result = await getCurrentUserPermissions();

      // Ignore stale response if a newer fetch started or the auth token changed/logged out.
      if (seq !== fetchSeq || getAuthToken() !== tokenAtStart) {
        return storeState.permissions;
      }

      const source = result?.meta?.source;
      const nextPerms = Array.isArray(result?.data) ? result.data : null;

      if (nextPerms && source !== "error") {
        // Persist even when nextPerms is an empty array [] so full revocations take effect cleanly.
        const updatedUser = source === "api" ? persistPermissionsToAuthStorage(nextPerms) : getAuthUser();
        lastFetchedAt = Date.now();
        setStoreState({
          token: tokenAtStart,
          user: updatedUser || getAuthUser(),
          permissions: nextPerms,
          loading: false,
          hasFetched: true,
          error: "",
        });
        return nextPerms;
      }

      // Network/error fallback: keep any seeded/cached permissions without wiping storage.
      lastFetchedAt = Date.now();
      setStoreState({
        token: tokenAtStart,
        user: getAuthUser(),
        loading: false,
        hasFetched: true,
        error: source === "error" ? "Failed to load permissions" : "",
      });
      return storeState.permissions;
    } catch (err) {
      if (seq !== fetchSeq || getAuthToken() !== tokenAtStart) {
        return storeState.permissions;
      }
      console.warn("Failed to load user permissions:", err?.message);
      setStoreState({
        token: tokenAtStart,
        user: getAuthUser(),
        loading: false,
        hasFetched: true,
        error: err?.message || "Failed to load permissions",
      });
      return storeState.permissions;
    } finally {
      if (inFlightPromise === promise) {
        inFlightPromise = null;
      }
    }
  })();

  inFlightPromise = promise;
  return promise;
}

const handleRolesUpdated = () => {
  fetchEffectivePermissions({ force: true });
};

const handleAuthLogout = () => {
  resetStore();
};

const handleUserProfileUpdated = () => {
  const freshUser = getAuthUser();
  setStoreState({ user: freshUser });
};

const handleStorage = (e) => {
  if (!e || e.key === "cms_permissions_updated_at" || e.key === "user" || e.key === "token") {
    const currentToken = getAuthToken();
    if (!currentToken) {
      resetStore();
      return;
    }
    if (e?.key === "token" && currentToken !== storeState.token) {
      resetStore();
      fetchEffectivePermissions({ force: true });
      return;
    }
    if (e?.key === "user") {
      const freshUser = getAuthUser();
      const freshPerms = readSeedPermissions(freshUser);
      setStoreState({
        token: currentToken,
        user: freshUser,
        ...(Array.isArray(freshUser?.permissions) ? { permissions: freshPerms } : {}),
      });
    }
    fetchEffectivePermissions({ force: true });
  }
};

const handleWindowFocus = () => {
  if (!getAuthToken()) return;
  if (Date.now() - lastFetchedAt < FOCUS_REFETCH_THROTTLE_MS) return;
  fetchEffectivePermissions({ force: false });
};

const ensureGlobalListeners = () => {
  if (globalListenersAttached || typeof window === "undefined") return;
  globalListenersAttached = true;
  window.addEventListener("roles-updated", handleRolesUpdated);
  window.addEventListener("cms-auth-logout", handleAuthLogout);
  window.addEventListener("user-profile-updated", handleUserProfileUpdated);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleWindowFocus);
};

const cleanupGlobalListenersIfUnused = () => {
  if (!globalListenersAttached || listeners.size > 0 || typeof window === "undefined") return;
  globalListenersAttached = false;
  window.removeEventListener("roles-updated", handleRolesUpdated);
  window.removeEventListener("cms-auth-logout", handleAuthLogout);
  window.removeEventListener("user-profile-updated", handleUserProfileUpdated);
  window.removeEventListener("storage", handleStorage);
  window.removeEventListener("focus", handleWindowFocus);
};

export function invalidateEffectivePermissionsCache({ refetch = false } = {}) {
  fetchSeq += 1;
  inFlightPromise = null;
  lastFetchedAt = 0;
  storeState = createStateForCurrentSession();
  notifyListeners();
  if (refetch && getAuthToken()) {
    return fetchEffectivePermissions({ force: true });
  }
  return Promise.resolve(storeState.permissions);
}

export function useEffectivePermissions() {
  // Synchronously detect login/logout/token switches without waiting for an effect cycle.
  syncStoreWithTokenIfChanged();

  const [snapshot, setSnapshot] = useState(() => storeState);

  useEffect(() => {
    ensureGlobalListeners();
    listeners.add(setSnapshot);

    const tokenChanged = syncStoreWithTokenIfChanged();
    setSnapshot(storeState);

    const token = getAuthToken();
    const user = getAuthUser();
    if (token && !hasRole("SUPER_ADMIN", user) && (tokenChanged || (!storeState.hasFetched && !inFlightPromise))) {
      fetchEffectivePermissions({ force: tokenChanged });
    }

    return () => {
      listeners.delete(setSnapshot);
      cleanupGlobalListenersIfUnused();
    };
  }, []);

  const refresh = useCallback(() => fetchEffectivePermissions({ force: true }), []);

  const { permissions, loading, hasFetched, error } = snapshot;
  const user = snapshot.user ?? getAuthUser();
  const isSuperOrAdmin = useMemo(() => hasRole("SUPER_ADMIN", user) || hasRole("ADMIN", user), [user]);
  const isAccountant = useMemo(() => hasRole("ACCOUNTANT", user), [user]);

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

  return useMemo(
    () => ({
      permissions,
      permissionMap,
      loading,
      hasFetched,
      error,
      refresh,
      canView,
      canDo,
      can: (mod, act = ACTIONS.VIEW, scr = null) => canDo(mod, act, scr),
      isSuperOrAdmin,
      isAccountant,
      user,
    }),
    [permissions, permissionMap, loading, hasFetched, error, refresh, canView, canDo, isSuperOrAdmin, isAccountant, user],
  );
}
