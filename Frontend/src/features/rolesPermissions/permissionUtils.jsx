import { getAuthItem, getAuthUser } from "@/features/authStorage.js";
import { ACTIONS, PERMISSION_DEPENDENCIES } from "./rolesPermissions.constants.js";

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toPermissionMap = (permissions = []) => {
  if (permissions && typeof permissions === "object" && !Array.isArray(permissions)) {
    return permissions;
  }
  return permissions.reduce((acc, item) => {
    const moduleKey = item?.module || item?.moduleKey || item?.moduleId;
    if (!moduleKey) return acc;
    acc[moduleKey] = Array.isArray(item?.actions) ? item.actions : [];
    return acc;
  }, {});
};

export function normalizeRoleCode(value = "") {
  return normalizeCode(value);
}

export function hasRole(roleCode, user = getAuthUser()) {
  const expected = normalizeRoleCode(roleCode);
  const storedRole = getAuthItem("role") || user?.role || user?.roleCode;
  const roles = [
    storedRole,
    user?.roleCode,
    user?.roleName,
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.roleCodes) ? user.roleCodes : []),
  ];
  return roles.some((role) => normalizeRoleCode(typeof role === "object" ? role.code || role.name : role) === expected);
}

export function can(moduleKey, actionKey = ACTIONS.VIEW, permissions, user = getAuthUser()) {
  if (hasRole("SUPER_ADMIN", user) || hasRole("ADMIN", user)) return true;
  const source = permissions ?? user?.permissions ?? user?.rolePermissions;
  if (!source) return true;
  const permissionMap = toPermissionMap(source);
  const actions = permissionMap[moduleKey];
  if (!Array.isArray(actions)) return false;
  return actions.includes(actionKey);
}

export function PermissionGuard({ moduleKey, actionKey = ACTIONS.VIEW, permissions, fallback = null, children }) {
  return can(moduleKey, actionKey, permissions) ? children : fallback;
}

export function enforcePermissionDependencies(actions = []) {
  const next = new Set(actions);
  actions.forEach((action) => {
    (PERMISSION_DEPENDENCIES[action] || []).forEach((dependency) => next.add(dependency));
  });
  if (!next.has(ACTIONS.VIEW)) {
    [...next].forEach((action) => {
      if (action !== ACTIONS.VIEW) next.delete(action);
    });
  }
  return [...next];
}

export function togglePermissionAction(currentActions = [], actionKey, enabled) {
  const next = new Set(currentActions);
  if (enabled) {
    next.add(actionKey);
  } else {
    next.delete(actionKey);
  }
  return [...next];
}

export function normalizePermissionPayload(permissions = []) {
  const seen = new Set();
  return permissions
    .map((item) => ({
      module: item.module || item.moduleKey || item.moduleId,
      actions: Array.isArray(item.actions) ? item.actions : [],
    }))
    .filter((item) => item.module)
    .map((item) => ({
      ...item,
      actions: item.actions.filter((action) => {
        const key = `${item.module}.${action}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    }));
}
