import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import {
  ACTIONS,
  ALL_PERMISSION_MODULES,
  ROLE_MEMBER_FALLBACK,
  ROLE_SEEDS,
  USER_ASSIGNMENT_FALLBACK,
} from "./rolesPermissions.constants.js";
import { normalizeModuleKey, normalizePermissionPayload, normalizeRoleCode, sortRolesByPriority } from "./permissionUtils.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { ACCOUNTANT_SIDEBAR_NAVIGATION, DRIVER_SIDEBAR_NAVIGATION, EXAMINATION_CELL_SIDEBAR_NAVIGATION, FACULTY_SIDEBAR_NAVIGATION, HOSTEL_WARDEN_NAVIGATION, INVENTORY_MANAGER_SIDEBAR_NAVIGATION, PARENT_SIDEBAR_NAVIGATION, ROLE_SIDEBAR_MODULE_KEYS, STUDENT_SIDEBAR_NAVIGATION, TRANSPORT_MANAGER_SIDEBAR_NAVIGATION } from "@/navigation/roleSidebarRegistry.js";

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
  const staffType = role.staffType || role.StaffType || matchedSeed?.staffType || "Both";
  return {
    ...role,
    id: String(role.id ?? role.roleId ?? role.code ?? role.name),
    roleId: Number(role.roleId ?? role.id) || matchedSeed?.roleId || ROLE_CODE_TO_ID[code] || undefined,
    code,
    name: role.name || role.roleName || matchedSeed?.name || (code === "ACCOUNTANT" ? "Accountant" : code),
    description: role.description || matchedSeed?.description || "",
    staffType,
    departmentId: role.departmentId ?? role.DepartmentId ?? null,
    departmentName: role.departmentName ?? role.DepartmentName ?? "",
    designationId: role.designationId ?? role.DesignationId ?? null,
    designationName: role.designationName ?? role.DesignationName ?? "",
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
    let modId = normalizeModuleKey(rawModule);
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
      staffType: payload.staffType || "Both",
      departmentId: payload.departmentId || null,
      designationId: payload.designationId || null,
      newDepartmentName: payload.newDepartmentName || null,
      newDesignationName: payload.newDesignationName || null,
    });
    notifyRolesUpdated();
    return apiResult(normalizeRole(response?.data?.data || response?.data), "api");
  } catch (err) {
    console.error("createRole failed:", err);
    throw err;
  }
}

export async function updateRole(roleId, payload = {}) {
  try {
    const response = await apiClient.put(apiEndpoints.roles.update(roleId), {
      roleName: payload.name || payload.roleName || payload.code,
      description: payload.description || "",
      staffType: payload.staffType || undefined,
      departmentId: payload.departmentId !== undefined ? payload.departmentId : undefined,
      designationId: payload.designationId !== undefined ? payload.designationId : undefined,
      newDepartmentName: payload.newDepartmentName || null,
      newDesignationName: payload.newDesignationName || null,
      isActive: payload.isActive ?? true,
    });
    notifyRolesUpdated();
    return apiResult(normalizeRole(response?.data?.data || response?.data), "api");
  } catch (err) {
    console.error("updateRole failed:", err);
    throw err;
  }
}

export async function deleteRole(roleId) {
  try {
    await apiClient.delete(apiEndpoints.roles.delete(roleId));
    notifyRolesUpdated();
    return apiResult(true, "api");
  } catch (err) {
    console.error("deleteRole failed:", err);
    throw err;
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
  return apiResult(moduleData, "api");
}

export async function addScreen(moduleId, screenData) {
  return apiResult(screenData, "api");
}

export async function getModulesAndPermissions() {
  return apiResult(ALL_PERMISSION_MODULES, "catalog");
}

export function getRoleEligibleModules(roleCode, catalog = ALL_PERMISSION_MODULES) {
  if (normalizeRoleCode(roleCode) === "ACCOUNTANT") {
    return ACCOUNTANT_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "EXAMINATION_CELL") {
    return EXAMINATION_CELL_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "BUS_DRIVER") {
    return DRIVER_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "INVENTORY_MANAGER") {
    return INVENTORY_MANAGER_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "HOSTEL_WARDEN") {
    return HOSTEL_WARDEN_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "STUDENT") {
    return STUDENT_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "FACULTY") {
    return FACULTY_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "PARENT") {
    return PARENT_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  if (normalizeRoleCode(roleCode) === "TRANSPORT_MANAGER") {
    return TRANSPORT_MANAGER_SIDEBAR_NAVIGATION.map((item) => ({
      ...item,
      name: item.label,
    }));
  }
  const keys = ROLE_SIDEBAR_MODULE_KEYS[normalizeRoleCode(roleCode)];
  if (keys === null) return catalog;
  if (!keys) return catalog;
  const order = new Map(keys.map((key, index) => [key, index]));
  return catalog
    .filter((module) => order.has(module.id))
    .sort((left, right) => order.get(left.id) - order.get(right.id));
}

export async function getRolePermissions(roleId, roleCode) {
  const targetId = resolveRoleIdParam(roleId, roleCode);
  try {
    const response = await apiClient.get(apiEndpoints.roles.permissions(targetId));
    const matrixData = response?.data?.data?.permissions || response?.data?.data || response?.data;
    // An empty array is a valid saved state: it means every permission is off.
    // Do not replace it with frontend defaults after a successful API response.
    if (Array.isArray(matrixData)) {
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

    try {
      const refreshed = await getRolePermissions(targetId, payload?.roleCode);
      if (refreshed?.meta?.source === "api") {
        return refreshed;
      }
    } catch {
      // Fallback to normalized
    }

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
    // An empty response is an intentional "no permissions" state, not a
    // failed request that should fall back to another role's permissions.
    if (Array.isArray(matrixData)) {
      return apiResult(transformBackendPermissionsToMatrix(matrixData), "api");
    }
  } catch (err) {
    console.warn("Live getUserPermissions failed:", err?.message);
  }
  return getRolePermissions(roleCode || "UNASSIGNED", roleCode);
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

    try {
      const refreshed = await getUserPermissions(userId, payload?.roleCode);
      if (refreshed?.meta?.source === "api") {
        return refreshed;
      }
    } catch {
      // Fallback to normalized
    }

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
    console.error("assignRoleToUser failed:", err);
    throw err;
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
    console.error("removeRoleFromUser failed:", err);
    throw err;
  }
}

export async function getCurrentUserPermissions() {
  try {
    const response = await apiClient.get(apiEndpoints.roles.myPermissions);
    const permissions =
      response?.data?.permissions ??
      response?.data?.Permissions ??
      response?.data?.data ??
      response?.data?.Data ??
      response?.data;
    if (Array.isArray(permissions)) {
      // Valid API response (whether permissions exist or are legitimately empty for this user)
      return apiResult(transformBackendPermissionsToMatrix(permissions), "api");
    }
    const authUser = getAuthUser();
    const existingPerms = authUser?.permissions || authUser?.rolePermissions;
    if (Array.isArray(existingPerms) && existingPerms.length > 0) {
      return apiResult(existingPerms, "cache");
    }
    return apiResult([], "error");
  } catch (err) {
    console.warn("Live getCurrentUserPermissions failed:", err?.message);
    // On network failure only, preserve the existing authenticated user's session cache if available
    const authUser = getAuthUser();
    const existingPerms = authUser?.permissions || authUser?.rolePermissions;
    if (Array.isArray(existingPerms) && existingPerms.length > 0) {
      return apiResult(existingPerms, "cache");
    }
    return apiResult([], "error");
  }
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

export function exportPermissionsToCsv(role, matrix = [], modules = []) {
  if (!role || !Array.isArray(matrix)) return;

  const rows = [
    ["Module ID", "Module Name", "Section", "Module Access", "View", "Add/Create", "Edit/Update", "Delete"],
  ];
  const moduleById = new Map((modules || []).map((module) => [module.id, module]));
  const actionsByModule = new Map();
  (matrix || []).forEach((permission) => {
    const rawKey = String(permission.module || permission.id || "").trim().toLowerCase();
    const normKey = normalizeModuleKey(rawKey);
    const actions = permission.actions || [];
    if (rawKey) actionsByModule.set(rawKey, actions);
    if (normKey) actionsByModule.set(normKey, actions);
  });

  const exportRows = modules.length
    ? modules.map((module) => {
        const permKey = String(module.permissionKey || "").trim().toLowerCase();
        const idKey = String(module.id || "").trim().toLowerCase();
        const actions = (
          (permKey && actionsByModule.get(permKey)) ||
          (permKey && actionsByModule.get(normalizeModuleKey(permKey))) ||
          actionsByModule.get(idKey) ||
          actionsByModule.get(normalizeModuleKey(idKey)) ||
          (module.legacyPermissionKeys || []).map((k) => actionsByModule.get(k) || actionsByModule.get(normalizeModuleKey(k))).find(Boolean) ||
          []
        );
        return { module: module.permissionKey || module.id, name: module.name, section: module.section, actions };
      })
    : matrix;

  exportRows.forEach((mod) => {
    const moduleId = mod.module || mod.id || "";
    const definition = moduleById.get(moduleId);
    const actions = mod.actions || [];
    rows.push([
      `"${moduleId}"`,
      `"${definition?.name || mod.name || moduleId}"`,
      `"${definition?.section || ""}"`,
      actions.length > 0 ? "YES" : "NO",
      actions.includes("view") ? "YES" : "NO",
      actions.includes("create") ? "YES" : "NO",
      actions.includes("edit") ? "YES" : "NO",
      actions.includes("delete") ? "YES" : "NO",
    ]);
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


export async function getDepartmentLookup() {
  try {
    const res = await apiClient.get(apiEndpoints.departments?.getAll || "/api/v1/departments", {
      params: { includeInactive: false },
    });
    const raw = res?.data?.data || res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
    return raw.filter(
      (d) => d && d.isActive !== false && d.status !== "Inactive" && d.Status !== "Inactive"
    );
  } catch (err) {
    console.warn("Failed to load departments lookup:", err);
    return [];
  }
}

export async function getDesignationLookup(departmentId = null) {
  try {
    const params = {
      includeInactive: false,
      ...(departmentId ? { departmentId } : {}),
    };
    const res = await apiClient.get(apiEndpoints.designations?.getAll || "/api/v1/designations", { params });
    const raw = res?.data?.data || res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
    return raw.filter(
      (d) => d && d.isActive !== false && d.status !== "Inactive" && d.Status !== "Inactive"
    );
  } catch (err) {
    console.warn("Failed to load designations lookup:", err);
    return [];
  }
}

export async function createQuickDepartment(payload = {}) {
  const res = await apiClient.post(apiEndpoints.departments?.create || "/api/v1/departments", {
    departmentName: payload.departmentName,
    staffType: payload.staffType || "Both",
    description: payload.description || "",
  });
  if (typeof window !== "undefined" && window.sessionStorage) {
    try { window.sessionStorage.removeItem("cms_cached_departments"); } catch {}
  }
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new Event("departments-updated")); } catch {}
  }
  return res?.data?.data || res?.data;
}

export async function createQuickDesignation(payload = {}) {
  const res = await apiClient.post(apiEndpoints.designations?.create || "/api/v1/designations", {
    name: payload.name,
    departmentId: payload.departmentId || null,
    staffType: payload.staffType || "Both",
  });
  if (typeof window !== "undefined" && window.sessionStorage) {
    try { window.sessionStorage.removeItem("cms_cached_designations"); } catch {}
  }
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new Event("designations-updated")); } catch {}
  }
  return res?.data?.data || res?.data;
}
