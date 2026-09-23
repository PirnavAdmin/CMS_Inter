import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import {
  ACTIONS,
  ALL_PERMISSION_MODULES,
  ROLE_MEMBER_FALLBACK,
  ROLE_SEEDS,
  USER_ASSIGNMENT_FALLBACK,
} from "./rolesPermissions.constants.js";
import { normalizePermissionPayload } from "./permissionUtils.jsx";

const STORAGE_KEY = "cms-rbac-fallback-state-v1";

const rbacEndpoints = {
  roles: apiEndpoints.roles?.list,
  roleById: apiEndpoints.roles?.getById,
  createRole: null,
  updateRole: null,
  deleteRole: null,
  modules: null,
  rolePermissions: null,
  updateRolePermissions: null,
  roleMembers: null,
  userDetails: null,
  userPermissions: null,
  updateUserPermissions: null,
  userAssignments: null,
  assignRoleToUser: null,
  removeRoleFromUser: null,
  currentUserPermissions: null,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeApiArray = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const normalizeRole = (role) => {
  const name = role?.name || role?.roleName || role?.Name || role?.RoleName || "";
  const code = role?.code || role?.roleCode || role?.Code || role?.RoleCode || name;
  const seed = ROLE_SEEDS.find((item) => item.code === String(code).toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
  return {
    id: String(role?.id ?? role?.roleId ?? role?.Id ?? seed?.id ?? code),
    code: seed?.code || String(code).toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    name: seed?.name || name,
    description: role?.description || role?.Description || seed?.description || "",
    isSystemRole: role?.isSystemRole ?? role?.IsSystemRole ?? seed?.isSystemRole ?? true,
    isProtected: role?.isProtected ?? role?.IsProtected ?? seed?.isProtected ?? false,
    assignedUserCount: role?.assignedUserCount ?? role?.AssignedUserCount ?? seed?.assignedUserCount ?? 0,
    icon: seed?.icon,
    discoveredFrom: seed?.discoveredFrom,
  };
};

const defaultRolePermissions = (roleCode) => {
  if (roleCode === "SUPER_ADMIN" || roleCode === "ADMIN") {
    return ALL_PERMISSION_MODULES.map((module) => ({ module: module.id, actions: module.availableActions }));
  }

  const byRole = {
    HOD: ["dashboard", "group-management", "subject-management", "section-room", "timetable", "student-management", "attendance", "staff-management", "staff-attendance", "staff-leave-management", "examination", "marks-evaluation", "results", "reports-analytics"],
    FACULTY: ["dashboard", "subject-management", "timetable", "student-management", "attendance", "staff-leave-management", "examination", "marks-evaluation", "results"],
    STUDENT: ["dashboard", "attendance", "examination", "marks-evaluation", "results", "certificates"],
    PARENT: ["dashboard", "attendance", "results", "fee-management", "certificates"],
    ACCOUNTS: ["dashboard", "fee-management", "payroll", "reports-analytics"],
    EXAMINATION_CELL: ["dashboard", "examination", "marks-evaluation", "results", "reports-analytics"],
    LIBRARIAN: ["dashboard", "library", "reports-analytics"],
    HOSTEL_WARDEN: ["dashboard", "hostel-management", "attendance", "reports-analytics"],
    PLACEMENT_OFFICER: ["dashboard", "placement", "student-management", "reports-analytics"],
    BUS_DRIVER: ["dashboard", "transport"],
    OFFICE_STAFF: ["dashboard", "student-admission", "student-management", "certificates", "settings"],
    ADMISSION_STAFF: ["dashboard", "student-admission", "student-management", "section-allocation", "reports-analytics"],
    TRANSPORT_MANAGER: ["dashboard", "transport", "reports-analytics"],
    LAB_ASSISTANT: ["dashboard", "subject-management", "timetable"],
  };

  const modules = byRole[roleCode] || ["dashboard"];
  return ALL_PERMISSION_MODULES.filter((module) => modules.includes(module.id)).map((module) => ({
    module: module.id,
    actions: module.availableActions.filter((action) => {
      if (roleCode === "BUS_DRIVER") return [ACTIONS.VIEW].includes(action);
      if (roleCode === "STUDENT" || roleCode === "PARENT") return [ACTIONS.VIEW, ACTIONS.DOWNLOAD, ACTIONS.EXPORT].includes(action);
      if (roleCode === "FACULTY") return ![ACTIONS.DELETE, ACTIONS.ASSIGN_PERMISSIONS, ACTIONS.ASSIGN_USERS].includes(action);
      return ![ACTIONS.DELETE, ACTIONS.ASSIGN_PERMISSIONS, ACTIONS.ASSIGN_USERS].includes(action);
    }),
  }));
};

const initialState = () => ({
  roles: ROLE_SEEDS.map((role) => ({
    ...role,
    icon: undefined,
  })),
  modules: clone(ALL_PERMISSION_MODULES).map((module) => ({ ...module, icon: undefined })),
  rolePermissions: ROLE_SEEDS.reduce((acc, role) => {
    acc[role.id] = defaultRolePermissions(role.code);
    return acc;
  }, {}),
  userPermissions: {},
  roleMembers: clone(ROLE_MEMBER_FALLBACK),
  userAssignments: clone(USER_ASSIGNMENT_FALLBACK),
});

const mergeFallbackState = (state) => {
  const seedRolesByCode = new Map(ROLE_SEEDS.map((role) => [role.code, role]));
  const rolesByCode = new Map((state.roles || []).map((role) => [role.code, role]));
  const memberIds = new Set((state.roleMembers || []).map((member) => member.id));

  return {
    ...state,
    roles: [
      ...ROLE_SEEDS.map((seed) => ({
        ...seed,
        icon: undefined,
        ...(rolesByCode.get(seed.code) || {}),
        assignedUserCount: seed.assignedUserCount,
      })),
      ...(state.roles || []).filter((role) => !seedRolesByCode.has(role.code)),
    ],
    roleMembers: [
      ...(state.roleMembers || []),
      ...clone(ROLE_MEMBER_FALLBACK).filter((member) => !memberIds.has(member.id)),
    ],
  };
};

const readFallbackState = () => {
  if (typeof window === "undefined") return initialState();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || window.sessionStorage.getItem(STORAGE_KEY);
    return stored ? mergeFallbackState({ ...initialState(), ...JSON.parse(stored) }) : initialState();
  } catch {
    return initialState();
  }
};

const writeFallbackState = (state) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Fallback state is best-effort only.
  }
};

const withFallbackNotice = (data, usingFallback = true, error = null) => ({
  data,
  meta: {
    usingFallback,
    errorMessage: error ? getApiErrorMessage(error) : "",
  },
});

export async function getRoles() {
  if (rbacEndpoints.roles) {
    try {
      const response = await apiClient.get(rbacEndpoints.roles, { skipGlobalLoader: true });
      const apiRoles = normalizeApiArray(response.data).map(normalizeRole).filter((role) => role.name);
      if (apiRoles.length) {
        const seedsByCode = new Map(ROLE_SEEDS.map((role) => [role.code, role]));
        const merged = ROLE_SEEDS.map((seed) => apiRoles.find((role) => role.code === seed.code) || seed);
        apiRoles.forEach((role) => {
          if (!seedsByCode.has(role.code)) merged.push(role);
        });
        return withFallbackNotice(merged, false);
      }
    } catch (error) {
      return withFallbackNotice(ROLE_SEEDS, true, error);
    }
  }
  return withFallbackNotice(ROLE_SEEDS);
}

export async function getRoleById(roleId) {
  const roles = await getRoles();
  return withFallbackNotice(roles.data.find((role) => String(role.id) === String(roleId)) || null, roles.meta.usingFallback);
}

export async function createRole() {
  throw new Error("Role creation endpoint is not configured yet.");
}

export async function updateRole() {
  throw new Error("Role update endpoint is not configured yet.");
}

export async function deleteRole() {
  throw new Error("Role deletion endpoint is not configured yet.");
}

export async function getModulesAndPermissions() {
  if (rbacEndpoints.modules) {
    try {
      const response = await apiClient.get(rbacEndpoints.modules, { skipGlobalLoader: true });
      const modules = normalizeApiArray(response.data);
      if (modules.length) return withFallbackNotice(modules, false);
    } catch (error) {
      return withFallbackNotice(ALL_PERMISSION_MODULES, true, error);
    }
  }
  return withFallbackNotice(ALL_PERMISSION_MODULES);
}

export async function getRolePermissions(roleId, roleCode) {
  if (rbacEndpoints.rolePermissions) {
    try {
      const endpoint = typeof rbacEndpoints.rolePermissions === "function"
        ? rbacEndpoints.rolePermissions(roleId)
        : rbacEndpoints.rolePermissions;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const permissions = normalizeApiArray(response.data);
      if (permissions.length) return withFallbackNotice(normalizePermissionPayload(permissions), false);
    } catch (error) {
      return withFallbackNotice(normalizePermissionPayload(defaultRolePermissions(roleCode)), true, error);
    }
  }
  const state = readFallbackState();
  const permissions = state.rolePermissions[roleId] || defaultRolePermissions(roleCode);
  return withFallbackNotice(normalizePermissionPayload(permissions));
}

export async function updateRolePermissions(roleId, payload) {
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);
  if (rbacEndpoints.updateRolePermissions) {
    const endpoint = typeof rbacEndpoints.updateRolePermissions === "function"
      ? rbacEndpoints.updateRolePermissions(roleId)
      : rbacEndpoints.updateRolePermissions;
    const response = await apiClient.put(endpoint, { roleId, permissions: normalized });
    const permissions = normalizeApiArray(response.data);
    return withFallbackNotice(normalizePermissionPayload(permissions.length ? permissions : normalized), false);
  }
  const state = readFallbackState();
  state.rolePermissions[roleId] = normalized;
  writeFallbackState(state);
  return withFallbackNotice(normalized);
}

export async function getRoleMembers(roleId, roleCode) {
  if (rbacEndpoints.roleMembers) {
    try {
      const endpoint = typeof rbacEndpoints.roleMembers === "function"
        ? rbacEndpoints.roleMembers(roleId, roleCode)
        : rbacEndpoints.roleMembers;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const members = normalizeApiArray(response.data);
      return withFallbackNotice(members, false);
    } catch (error) {
      return withFallbackNotice([], true, error);
    }
  }
  const state = readFallbackState();
  const members = (state.roleMembers || []).filter((member) => (member.roleCodes || []).includes(roleCode));
  return withFallbackNotice(members);
}

export async function getUserPermissions(userId, roleCode) {
  if (rbacEndpoints.userPermissions) {
    try {
      const endpoint = typeof rbacEndpoints.userPermissions === "function"
        ? rbacEndpoints.userPermissions(userId)
        : rbacEndpoints.userPermissions;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const permissions = normalizeApiArray(response.data);
      if (permissions.length) return withFallbackNotice(normalizePermissionPayload(permissions), false);
    } catch (error) {
      return withFallbackNotice(normalizePermissionPayload(defaultRolePermissions(roleCode)), true, error);
    }
  }
  const state = readFallbackState();
  const permissions = state.userPermissions?.[userId] || defaultRolePermissions(roleCode);
  return withFallbackNotice(normalizePermissionPayload(permissions));
}

export async function getUserRoleDetails(userId) {
  if (rbacEndpoints.userDetails) {
    try {
      const endpoint = typeof rbacEndpoints.userDetails === "function"
        ? rbacEndpoints.userDetails(userId)
        : rbacEndpoints.userDetails;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const data = response.data?.data ?? response.data;
      return withFallbackNotice(data, false);
    } catch (error) {
      throw new Error(getApiErrorMessage(error) || "Unable to load user details.");
    }
  }

  const state = readFallbackState();
  const user = (state.userAssignments || []).find((item) => String(item.id) === String(userId));
  return withFallbackNotice(user || null);
}

export async function updateUserPermissions(userId, payload) {
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);
  if (rbacEndpoints.updateUserPermissions) {
    const endpoint = typeof rbacEndpoints.updateUserPermissions === "function"
      ? rbacEndpoints.updateUserPermissions(userId)
      : rbacEndpoints.updateUserPermissions;
    const response = await apiClient.put(endpoint, { userId, permissions: normalized });
    const permissions = normalizeApiArray(response.data);
    return withFallbackNotice(normalizePermissionPayload(permissions.length ? permissions : normalized), false);
  }
  const state = readFallbackState();
  state.userPermissions = state.userPermissions || {};
  state.userPermissions[userId] = normalized;
  writeFallbackState(state);
  return withFallbackNotice(normalized);
}

export async function getUserRoleAssignments(params = {}) {
  const state = readFallbackState();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 8);
  const query = String(params.search || "").trim().toLowerCase();
  const filtered = query
    ? state.userAssignments.filter((user) =>
        [user.name, user.userId, user.userType, user.department, user.designation, ...(user.roleCodes || [])]
          .some((value) => String(value || "").toLowerCase().includes(query)))
    : state.userAssignments;
  const start = (page - 1) * pageSize;
  return withFallbackNotice({
    items: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}

export async function assignRoleToUser(userId, roleCode) {
  if (!userId || !roleCode) throw new Error("User and role are required.");
  const state = readFallbackState();
  const index = state.userAssignments.findIndex((user) => String(user.id) === String(userId));
  if (index === -1) throw new Error("User assignment was not found.");
  const roleCodes = new Set(state.userAssignments[index].roleCodes || []);
  roleCodes.add(roleCode);
  state.userAssignments[index] = { ...state.userAssignments[index], roleCodes: [...roleCodes] };
  writeFallbackState(state);
  return withFallbackNotice(state.userAssignments[index]);
}

export async function removeRoleFromUser(userId, roleCode) {
  const state = readFallbackState();
  const index = state.userAssignments.findIndex((user) => String(user.id) === String(userId));
  if (index === -1) throw new Error("User assignment was not found.");
  state.userAssignments[index] = {
    ...state.userAssignments[index],
    roleCodes: (state.userAssignments[index].roleCodes || []).filter((code) => code !== roleCode),
  };
  writeFallbackState(state);
  return withFallbackNotice(state.userAssignments[index]);
}

export async function getCurrentUserPermissions() {
  const state = readFallbackState();
  return withFallbackNotice(state.rolePermissions.admin || defaultRolePermissions("ADMIN"));
}

export const rolesPermissionsApiConfig = rbacEndpoints;
