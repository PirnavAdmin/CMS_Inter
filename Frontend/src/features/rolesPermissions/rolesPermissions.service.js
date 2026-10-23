import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import {
  ACTIONS,
  ALL_PERMISSION_MODULES,
  ROLE_MEMBER_FALLBACK,
  ROLE_SEEDS,
  USER_ASSIGNMENT_FALLBACK,
} from "./rolesPermissions.constants.js";
import { normalizePermissionPayload, normalizeRoleCode, sortRolesByPriority } from "./permissionUtils.jsx";
import { getAuthUser } from "@/features/authStorage.js";

const cloneItem = (item) => {
  if (!item || typeof item !== "object") return item;
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  );
};

const clone = (value) => {
  if (Array.isArray(value)) return value.map(cloneItem);
  return cloneItem(value);
};

const apiResult = (data, source = "api") => ({ data: clone(data), meta: { source } });

const notifyRolesUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("roles-updated"));
    try {
      localStorage.setItem("cms_permissions_updated_at", String(Date.now()));
    } catch {
      // ignore
    }
  }
};

const ROLE_CODE_TO_ID = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  HOD: 3,
  FACULTY: 4,
  STUDENT: 5,
  PARENT: 6,
  ACCOUNTANT: 7,
  ACCOUNTS: 7,
  EXAMINATION_CELL: 8,
  LIBRARIAN: 9,
  HOSTEL_WARDEN: 10,
  TRAINING_PLACEMENT: 11,
  PLACEMENT_OFFICER: 11,
  BUS_DRIVER: 12,
  DRIVER: 12,
  ATTENDANT: 13,
  OFFICE_STAFF: 13,
  RECEPTIONIST: 13,
  DEAN: 14,
  LAB_ASSISTANT: 14,
  ADMISSION_STAFF: 14,
  PRINCIPAL: 15,
  INVENTORY_MANAGER: 16,
  INVENTORY: 16,
  UNASSIGNED: 17,
};

const resolveRoleIdParam = (roleId, roleCode) => {
  const parsed = Number(roleId);
  if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  const norm = normalizeRoleCode(roleCode || roleId);
  return ROLE_CODE_TO_ID[norm] || roleId;
};

const normalizeRole = (role = {}) => {
  const count = Number(role.assignedUserCount ?? role.userCount ?? role.usersCount ?? 0);
  const code = normalizeRoleCode(role.code || role.roleCode || role.roleName || role.name);
  const matchedSeed = ROLE_SEEDS.find(
    (s) => s.code === code || s.roleId === (role.roleId ?? role.id) || s.id === role.id
  );
  return {
    ...role,
    id: String(role.id ?? role.roleId ?? role.code ?? role.name),
    roleId: Number(role.roleId ?? role.id) || matchedSeed?.roleId || ROLE_CODE_TO_ID[code] || undefined,
    code,
    name: role.name || role.roleName || matchedSeed?.name || (code === "ACCOUNTANT" ? "Accountant" : code),
    description: role.description || matchedSeed?.description || "",
    isSystemRole: role.isSystemRole ?? matchedSeed?.isSystemRole ?? false,
    isProtected: role.isProtected ?? matchedSeed?.isProtected ?? (code === "SUPER_ADMIN"),
    icon: role.icon || matchedSeed?.icon,
    assignedUserCount: count,
    userCount: count,
    usersCount: count,
  };
};

const normalizeUserAssignment = (user = {}) => {
  const id = user.userId ?? user.id ?? "";
  const roleCodes = Array.isArray(user.roleCodes)
    ? user.roleCodes
    : user.roleCode || user.roleName
      ? [user.roleCode || user.roleName]
      : [];

  const resolvedName = (user.name || user.fullName || user.userName || "").trim();
  const fallbackName = user.email ? user.email.split("@")[0] : (id ? `User #${id}` : "User");

  return {
    ...user,
    id: String(user.id ?? id),
    userId: String(user.userId ?? user.userCode ?? id),
    userCode: String(user.userCode ?? user.userId ?? id),
    name: resolvedName || fallbackName,
    userType: user.userType || "",
    department: user.department || "",
    designation: user.designation || "",
    roleCodes: roleCodes.map(normalizeRoleCode).filter(Boolean),
    status: user.status || "Active",
  };
};

const mockRoles = ROLE_SEEDS.map(normalizeRole);
const mockAssignments = [...ROLE_MEMBER_FALLBACK, ...USER_ASSIGNMENT_FALLBACK]
  .map(normalizeUserAssignment)
  .filter((user, index, users) => users.findIndex((item) => item.id === user.id) === index);

const roleCounts = () => {
  const counts = new Map();
  mockAssignments.forEach((user) => {
    (user.roleCodes || []).forEach((roleCode) => counts.set(roleCode, (counts.get(roleCode) || 0) + 1));
  });
  return counts;
};

// Normalize backend permissions into UI tree format (modules -> screens)
export function transformBackendPermissionsToMatrix(rawPermissions = []) {
  const items = Array.isArray(rawPermissions)
    ? rawPermissions
    : rawPermissions?.permissions ?? rawPermissions?.data ?? [];

  if (!items || !items.length) return [];

  const moduleMap = new Map();

  items.forEach((item) => {
    const rawModule = item.moduleKey || item.moduleId || item.subModule || item.module || "";
    let modId = String(rawModule).trim().toLowerCase().replace(/&/g, "").replace(/\//g, "-").replace(/\s+/g, "-");
    if (modId === "staff-reimbursements" || modId === "staff-reimbursement" || modId === "reimbursements") {
      modId = "reimbursement";
    }
    if (modId === "reports") {
      modId = "reports-analytics";
    }
    if (modId === "inventory") {
      modId = "inventory-management";
    }
    if (!modId) return;

    if (!moduleMap.has(modId)) {
      moduleMap.set(modId, {
        module: modId,
        actions: [],
        screens: [],
      });
    }

    const entry = moduleMap.get(modId);
    const itemActions = Array.isArray(item.actions) ? item.actions : [];
    if (item.canView && !itemActions.includes(ACTIONS.VIEW)) itemActions.push(ACTIONS.VIEW);
    if ((item.canAdd || item.canCreate) && !itemActions.includes(ACTIONS.CREATE)) itemActions.push(ACTIONS.CREATE);
    if (item.canEdit && !itemActions.includes(ACTIONS.EDIT)) itemActions.push(ACTIONS.EDIT);
    if (item.canDelete && !itemActions.includes(ACTIONS.DELETE)) itemActions.push(ACTIONS.DELETE);

    const screenId = String(item.screenId || item.screenCode || item.screen || "").trim().toLowerCase();
    if (screenId) {
      entry.screens.push({
        screenId,
        screenName: item.screenName || item.screen || screenId,
        actions: [...new Set(itemActions)],
      });
    }

    itemActions.forEach((act) => {
      if (!entry.actions.includes(act)) entry.actions.push(act);
    });
  });

  return [...moduleMap.values()];
}

export async function getRoles(filters = {}) {
  try {
    const response = await apiClient.get(apiEndpoints.roles.cards, { params: filters });
    const payload = response?.data?.data || response?.data || [];
    if (Array.isArray(payload) && payload.length > 0) {
      return apiResult(sortRolesByPriority(payload.map(normalizeRole)), "api");
    }
  } catch (err) {
    console.warn("Live getRoles failed, falling back to cached/seed data:", err?.message);
  }

  const counts = roleCounts();
  return apiResult(sortRolesByPriority(mockRoles.map((role) => ({ ...role, assignedUserCount: counts.get(role.code) ?? role.assignedUserCount }))), "fallback");
}

export async function getRoleById(roleId) {
  const targetId = resolveRoleIdParam(roleId);
  try {
    const response = await apiClient.get(apiEndpoints.roles.getById(targetId));
    if (response?.data?.data) return apiResult(normalizeRole(response.data.data), "api");
  } catch (err) {
    console.warn("Live getRoleById failed:", err?.message);
  }
  const norm = normalizeRoleCode(roleId);
  const role = mockRoles.find((r) => String(r.id) === String(roleId) || String(r.roleId) === String(targetId) || r.code === norm);
  return apiResult(role || null, "fallback");
}

export async function createRole(payload = {}) {
  try {
    const response = await apiClient.post(apiEndpoints.roles.create, {
      roleName: payload.name || payload.roleName || payload.code,
      description: payload.description || "",
    });
    notifyRolesUpdated();
    return apiResult(normalizeRole(response?.data?.data || response?.data), "api");
  } catch (err) {
    console.warn("Live createRole failed:", err?.message);
    const role = normalizeRole({
      ...payload,
      id: payload.id || normalizeRoleCode(payload.code || payload.name).toLowerCase().replace(/_/g, "-"),
      code: payload.code || payload.name,
    });
    mockRoles.push(role);
    notifyRolesUpdated();
    return apiResult(role, "fallback");
  }
}

export async function updateRole(roleId, payload = {}) {
  try {
    const response = await apiClient.put(apiEndpoints.roles.update(roleId), {
      roleName: payload.name || payload.roleName || payload.code,
      description: payload.description || "",
      isActive: payload.isActive ?? true,
    });
    notifyRolesUpdated();
    return apiResult(normalizeRole(response?.data?.data || response?.data), "api");
  } catch (err) {
    console.warn("Live updateRole failed:", err?.message);
    const index = mockRoles.findIndex((r) => String(r.id) === String(roleId) || String(r.roleId) === String(roleId));
    if (index === -1) throw new Error("Role not found.");
    mockRoles[index] = normalizeRole({ ...mockRoles[index], ...payload, id: mockRoles[index].id });
    notifyRolesUpdated();
    return apiResult(mockRoles[index], "fallback");
  }
}

export async function deleteRole(roleId) {
  try {
    await apiClient.delete(apiEndpoints.roles.delete(roleId));
    notifyRolesUpdated();
    return apiResult(true, "api");
  } catch (err) {
    console.warn("Live deleteRole failed:", err?.message);
    const index = mockRoles.findIndex((r) => String(r.id) === String(roleId));
    if (index === -1) throw new Error("Role not found.");
    if (mockRoles[index].isProtected) throw new Error("Protected roles cannot be deleted.");
    mockRoles.splice(index, 1);
    notifyRolesUpdated();
    return apiResult(true, "fallback");
  }
}


const CUSTOM_MODULES_KEY = "cms_custom_permission_modules";
const CUSTOM_SCREENS_KEY = "cms_custom_permission_screens";

export function getCustomModules() {
  try {
    const raw = localStorage.getItem(CUSTOM_MODULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCustomScreens() {
  try {
    const raw = localStorage.getItem(CUSTOM_SCREENS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function addModule(moduleData) {
  try {
    await apiClient.post(apiEndpoints.roles.modules, moduleData);
  } catch (err) {
    console.warn("Backend addModule endpoint not yet available, saving to persistent catalog:", err?.message);
  }
  const custom = getCustomModules();
  const exists = custom.find((m) => m.id === moduleData.id);
  if (!exists) {
    custom.push(moduleData);
    localStorage.setItem(CUSTOM_MODULES_KEY, JSON.stringify(custom));
  }
  notifyRolesUpdated();
  return apiResult(moduleData, "api");
}

export async function addScreen(moduleId, screenData) {
  try {
    await apiClient.post(`${apiEndpoints.roles.modules}/${moduleId}/screens`, screenData);
  } catch (err) {
    console.warn("Backend addScreen endpoint not yet available, saving to persistent catalog:", err?.message);
  }
  const customScreens = getCustomScreens();
  if (!customScreens[moduleId]) {
    customScreens[moduleId] = [];
  }
  const exists = customScreens[moduleId].find((s) => s.id === screenData.id);
  if (!exists) {
    customScreens[moduleId].push(screenData);
    localStorage.setItem(CUSTOM_SCREENS_KEY, JSON.stringify(customScreens));
  }
  notifyRolesUpdated();
  return apiResult(screenData, "api");
}

export async function getModulesAndPermissions() {
  const customModules = getCustomModules();
  const customScreens = getCustomScreens();
  let baseModules = ALL_PERMISSION_MODULES;

  try {
    const response = await apiClient.get(apiEndpoints.roles.modules);
    const remoteModules = response?.data?.data || response?.data;
    if (Array.isArray(remoteModules) && remoteModules.length > 0) {
      baseModules = remoteModules.map((remote) => {
        const local = ALL_PERMISSION_MODULES.find((m) => m.id === remote.id || m.name?.toLowerCase() === (remote.name || '').toLowerCase());
        return {
          ...local,
          ...remote,
          screens: local?.screens || remote.screens || [],
        };
      });
    }
  } catch (err) {
    console.warn('Live getModules failed, using full catalog:', err?.message);
  }

  const moduleMap = new Map();
  baseModules.forEach((m) => moduleMap.set(m.id, { ...m, screens: [...(m.screens || [])] }));
  customModules.forEach((cm) => {
    if (moduleMap.has(cm.id)) {
      const existing = moduleMap.get(cm.id);
      moduleMap.set(cm.id, { ...existing, ...cm, screens: [...(existing.screens || []), ...(cm.screens || [])] });
    } else {
      moduleMap.set(cm.id, { ...cm, screens: [...(cm.screens || [])] });
    }
  });

  Object.entries(customScreens).forEach(([modId, screens]) => {
    if (moduleMap.has(modId)) {
      const target = moduleMap.get(modId);
      const existingScreenIds = new Set((target.screens || []).map((s) => s.id));
      screens.forEach((s) => {
        if (!existingScreenIds.has(s.id)) {
          target.screens.push(s);
          existingScreenIds.add(s.id);
        }
      });
    }
  });

  return apiResult(Array.from(moduleMap.values()), 'catalog');
}

export async function getRolePermissions(roleId, roleCode) {
  const targetId = resolveRoleIdParam(roleId, roleCode);
  try {
    const response = await apiClient.get(apiEndpoints.roles.permissions(targetId));
    const matrixData = response?.data?.data?.permissions || response?.data?.data || response?.data;
    if (Array.isArray(matrixData) && matrixData.length > 0) {
      return apiResult(transformBackendPermissionsToMatrix(matrixData), "api");
    }
  } catch (err) {
    console.warn("Live getRolePermissions failed, falling back:", err?.message);
  }

  // Fallback: build default permissions from catalog
  const normalizedRoleCode = normalizeRoleCode(roleCode || roleId);
  const isSuper = normalizedRoleCode === "SUPER_ADMIN" || normalizedRoleCode === "ADMIN";
  const defaultPayload = ALL_PERMISSION_MODULES.map((module) => {
    const actions = isSuper
      ? [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]
      : [ACTIONS.VIEW];
    const screens = (module.screens || []).map((s) => ({
      screenId: s.id,
      screenName: s.name,
      actions: isSuper ? [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] : [ACTIONS.VIEW],
    }));
    return {
      module: module.id,
      actions,
      screens,
    };
  });

  return apiResult(defaultPayload, "fallback");
}

export async function updateRolePermissions(roleId, payload) {
  const targetId = resolveRoleIdParam(roleId);
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);

  // Format flattened input items with screenId for backend DTO
  const permissionsInput = [];
  normalized.forEach((mod) => {
    if (mod.screens && mod.screens.length > 0) {
      mod.screens.forEach((scr) => {
        permissionsInput.push({
          module: mod.module,
          screenId: scr.screenId,
          screenName: scr.screenName || scr.screenId,
          actions: scr.actions,
        });
      });
      // Also include module-level summary record so module-level permissions are preserved in DB
      permissionsInput.push({
        module: mod.module,
        screenId: "",
        screenName: "",
        actions: mod.actions,
      });
    } else {
      permissionsInput.push({
        module: mod.module,
        screenId: "",
        screenName: "",
        actions: mod.actions,
      });
    }
  });

  try {
    await apiClient.put(apiEndpoints.roles.updatePermissions(targetId), {
      roleId: Number(targetId) || undefined,
      permissions: permissionsInput,
    });
    notifyRolesUpdated();
    return apiResult(normalized, "api");
  } catch (err) {
    console.error("Live updateRolePermissions failed:", err);
    throw err;
  }
}

export async function getRoleMembers(roleId, roleCode, filters = {}) {
  const targetId = resolveRoleIdParam(roleId, roleCode);
  try {
    const response = await apiClient.get(apiEndpoints.roles.members(targetId), { params: filters });
    const members = response?.data?.data || response?.data;
    if (Array.isArray(members)) {
      return apiResult(members.map(normalizeUserAssignment), "api");
    }
  } catch (err) {
    console.warn("Live getRoleMembers failed, using fallback:", err?.message);
  }
  const normalizedCode = normalizeRoleCode(roleCode || roleId);
  return apiResult(mockAssignments.filter((user) => (user.roleCodes || []).includes(normalizedCode)), "fallback");
}

export async function getUserPermissions(userId, roleCode) {
  try {
    const response = await apiClient.get(apiEndpoints.roles.userPermissions(userId));
    const matrixData = response?.data?.data?.permissions || response?.data?.data || response?.data;
    if (Array.isArray(matrixData) && matrixData.length > 0) {
      return apiResult(transformBackendPermissionsToMatrix(matrixData), "api");
    }
  } catch (err) {
    console.warn("Live getUserPermissions failed:", err?.message);
  }
  return getRolePermissions(roleCode || "ADMIN", roleCode);
}

export async function getUserRoleDetails(userId) {
  try {
    const response = await apiClient.get(apiEndpoints.roles.userDetails(userId));
    const data = response?.data?.data || response?.data;
    if (data) {
      return apiResult(normalizeUserAssignment(data.user ? { ...data.user, roleCodes: [data.role?.roleName].filter(Boolean) } : data), "api");
    }
  } catch (err) {
    console.warn("Live getUserRoleDetails failed:", err?.message);
  }
  return apiResult(mockAssignments.find((u) => String(u.id) === String(userId) || String(u.userId) === String(userId)) || null, "fallback");
}

export async function updateUserPermissions(userId, payload) {
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);

  const permissionsInput = [];
  normalized.forEach((mod) => {
    if (mod.screens && mod.screens.length > 0) {
      mod.screens.forEach((scr) => {
        permissionsInput.push({
          module: mod.module,
          screenId: scr.screenId,
          screenName: scr.screenName || scr.screenId,
          actions: scr.actions,
        });
      });
      // Also include module-level summary record so module-level permissions are preserved in DB
      permissionsInput.push({
        module: mod.module,
        screenId: "",
        screenName: "",
        actions: mod.actions,
      });
    } else {
      permissionsInput.push({
        module: mod.module,
        screenId: "",
        screenName: "",
        actions: mod.actions,
      });
    }
  });

  try {
    await apiClient.put(apiEndpoints.roles.userOverrides(userId), {
      userId: Number(userId) || undefined,
      permissions: permissionsInput,
      notes: payload?.notes || "Manual screen-level override from Roles & Permissions",
    });
    notifyRolesUpdated();
    return apiResult(normalized, "api");
  } catch (err) {
    console.error("Live updateUserPermissions failed:", err);
    throw err;
  }
}

export async function getUserRoleAssignments(params = {}) {
  try {
    const response = await apiClient.get(apiEndpoints.roles.userAssignments, { params });
    const payload = response?.data?.data || response?.data;
    if (payload && Array.isArray(payload.items)) {
      return apiResult({
        items: payload.items.map(normalizeUserAssignment),
        page: payload.pageNumber || payload.page || Number(params.page || 1),
        pageSize: payload.pageSize || Number(params.pageSize || 8),
        total: payload.totalCount ?? payload.total ?? payload.items.length,
      }, "api");
    }
  } catch (err) {
    console.warn("Live getUserRoleAssignments failed:", err?.message);
  }

  // Fallback
  const search = String(params.search || "").trim().toLowerCase();
  const roleCode = params.roleCode ? normalizeRoleCode(params.roleCode) : null;
  const userType = String(params.userType || "").trim().toLowerCase();
  const page = Number(params.page || 1);
  const pageSize = Number(params.pageSize || 8);

  const filtered = mockAssignments.filter((user) => {
    const matchesSearch = !search || [user.name, user.userId, user.department, user.designation, user.userType]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesRole = !roleCode || (user.roleCodes || []).includes(roleCode);
    const matchesUserType = !userType || String(user.userType || "").toLowerCase() === userType;
    return matchesSearch && matchesRole && matchesUserType;
  });
  const start = (page - 1) * pageSize;
  return apiResult({
    items: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  }, "fallback");
}

export async function assignRoleToUser(userId, roleCode, roleId = null) {
  try {
    await apiClient.post(apiEndpoints.roles.assignUserRole(userId), {
      roleCode,
      roleId: roleId ? Number(roleId) : undefined,
    });
    notifyRolesUpdated();
    return apiResult({ userId, roleCode }, "api");
  } catch (err) {
    console.warn("Live assignRoleToUser failed:", err?.message);
    const user = mockAssignments.find((item) => String(item.id) === String(userId) || String(item.userId) === String(userId));
    if (user && !(user.roleCodes || []).includes(roleCode)) {
      user.roleCodes = [...(user.roleCodes || []), roleCode];
    }
    notifyRolesUpdated();
    return apiResult({ userId, roleCode }, "fallback");
  }
}

export async function removeRoleFromUser(userId, roleCode) {
  try {
    await apiClient.delete(apiEndpoints.roles.removeUserRole(userId), {
      params: { roleCode },
    });
    notifyRolesUpdated();
    return apiResult({ userId, roleCode }, "api");
  } catch (err) {
    console.warn("Live removeRoleFromUser failed:", err?.message);
    const user = mockAssignments.find((item) => String(item.id) === String(userId) || String(item.userId) === String(userId));
    if (user) {
      user.roleCodes = (user.roleCodes || []).filter((c) => normalizeRoleCode(c) !== normalizeRoleCode(roleCode));
    }
    notifyRolesUpdated();
    return apiResult({ userId, roleCode }, "fallback");
  }
}

export async function getCurrentUserPermissions() {
  try {
    const response = await apiClient.get(apiEndpoints.roles.myPermissions);
    const permissions = response?.data?.permissions || response?.data?.data || response?.data;
    if (Array.isArray(permissions) && permissions.length > 0) {
      return apiResult(transformBackendPermissionsToMatrix(permissions), "api");
    }
  } catch (err) {
    console.warn("Live getCurrentUserPermissions failed:", err?.message);
  }

  // Fallback 1: Return existing cached permissions from the current authenticated user if present
  try {
    const authUser = getAuthUser();
    const existingPerms = authUser?.permissions || authUser?.rolePermissions;
    if (Array.isArray(existingPerms) && existingPerms.length > 0) {
      return apiResult(existingPerms, "cache");
    }
    // Fallback 2: Generate default permissions based on the user's role code
    const roleCode = authUser?.role || authUser?.roleCode || "ADMIN";
    const fallbackPerms = await getRolePermissions(roleCode, roleCode);
    if (Array.isArray(fallbackPerms?.data) && fallbackPerms.data.length > 0) {
      return apiResult(fallbackPerms.data, "fallback");
    }
  } catch (err) {
    console.warn("Error resolving fallback permissions:", err?.message);
  }

  return apiResult([], "fallback");
}

export async function cloneRole(sourceRoleId, { newName, description = "" }) {
  const sourcePermsRes = await getRolePermissions(sourceRoleId);
  const sourcePermissions = sourcePermsRes?.data || [];

  const newRoleRes = await createRole({ name: newName, description });
  const newRole = newRoleRes?.data;
  if (!newRole) throw new Error("Failed to create new role during clone operation.");

  if (sourcePermissions.length > 0) {
    await updateRolePermissions(newRole.id || newRole.roleId, sourcePermissions);
  }

  notifyRolesUpdated();
  return apiResult(newRole, "api");
}

export function exportPermissionsToCsv(role, matrix = []) {
  if (!role || !Array.isArray(matrix)) return;

  const rows = [
    ["Module ID", "Module Name", "Screen ID", "Screen Name", "View", "Add/Create", "Edit/Update", "Delete"],
  ];

  matrix.forEach((mod) => {
    const screens = mod.screens && mod.screens.length > 0
      ? mod.screens
      : [{ screenId: "", screenName: "(Whole Module)", actions: mod.actions }];

    screens.forEach((scr) => {
      const actions = scr.actions || [];
      rows.push([
        `"${mod.module || mod.id || ""}"`,
        `"${mod.name || mod.module || ""}"`,
        `"${scr.screenId || ""}"`,
        `"${scr.screenName || scr.name || ""}"`,
        actions.includes("view") ? "YES" : "NO",
        actions.includes("create") ? "YES" : "NO",
        actions.includes("edit") ? "YES" : "NO",
        actions.includes("delete") ? "YES" : "NO",
      ]);
    });
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const fileName = `${(role.name || role.code || "role").toLowerCase().replace(/[^a-z0-9]/g, "_")}_permissions.csv`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const rolesPermissionsApiConfig = Object.freeze({
  mode: "connected",
  apiIntegrationEnabled: true,
});

