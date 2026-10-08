import { getAuthItem, getAuthUser } from "@/features/authStorage.js";
import { ACTIONS, PERMISSION_DEPENDENCIES } from "./rolesPermissions.constants.js";

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const normalizeModuleKey = (value = "") => String(value)
  .trim()
  .toLowerCase()
  .replace(/&/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const normalizeActionKey = (value = "") => {
  const action = String(value).trim().toLowerCase();
  if (action === "add") return ACTIONS.CREATE;
  if (action === "update") return ACTIONS.EDIT;
  return action;
};

const getPermissionModuleKey = (item = {}) =>
  item?.moduleId
  ?? item?.ModuleId
  ?? item?.moduleKey
  ?? item?.ModuleKey
  ?? item?.subModule
  ?? item?.SubModule
  ?? item?.module
  ?? item?.Module
  ?? "";

const getPermissionActions = (item = {}) => {
  if (Array.isArray(item)) return item;
  if (Array.isArray(item?.actions)) return item.actions;
  if (Array.isArray(item?.Actions)) return item.Actions;

  return [
    (item?.canView ?? item?.CanView) && ACTIONS.VIEW,
    (item?.canAdd ?? item?.CanAdd ?? item?.canCreate ?? item?.CanCreate) && ACTIONS.CREATE,
    (item?.canEdit ?? item?.CanEdit ?? item?.canUpdate ?? item?.CanUpdate) && ACTIONS.EDIT,
    (item?.canDelete ?? item?.CanDelete) && ACTIONS.DELETE,
  ].filter(Boolean);
};

const toPermissionMap = (permissions = []) => {
  if (permissions && typeof permissions === "object" && !Array.isArray(permissions)) {
    return Object.entries(permissions).reduce((acc, [moduleKey, actions]) => {
      acc[normalizeModuleKey(moduleKey)] = getPermissionActions(actions).map(normalizeActionKey);
      return acc;
    }, {});
  }
  return permissions.reduce((acc, item) => {
    const moduleKey = normalizeModuleKey(getPermissionModuleKey(item));
    if (!moduleKey) return acc;
    acc[moduleKey] = getPermissionActions(item).map(normalizeActionKey);
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
  if (!source) return false;
  const permissionMap = toPermissionMap(source);
  const actions = permissionMap[normalizeModuleKey(moduleKey)];
  if (!Array.isArray(actions)) return false;
  return actions.includes(normalizeActionKey(actionKey));
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
  return enforcePermissionDependencies([...next]);
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
  const byModule = new Map();

  permissions.forEach((item) => {
    const module = normalizeModuleKey(getPermissionModuleKey(item));
    if (!module) return;

    const actions = byModule.get(module) || [];
    getPermissionActions(item).map(normalizeActionKey).forEach((action) => {
      if (action && !actions.includes(action)) actions.push(action);
    });
    byModule.set(module, actions);
  });

  return [...byModule.entries()].map(([module, actions]) => ({ module, actions }));
}
