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
  roles: apiEndpoints.roles?.cards || apiEndpoints.roles?.list || "/api/v1/roles/cards",
  roleById: apiEndpoints.roles?.getById || ((id) => `/api/v1/roles/${id}`),
  createRole: apiEndpoints.roles?.create || "/api/v1/roles",
  updateRole: apiEndpoints.roles?.update || ((id) => `/api/v1/roles/${id}`),
  deleteRole: apiEndpoints.roles?.delete || ((id) => `/api/v1/roles/${id}`),
  modules: apiEndpoints.roles?.modules || "/api/v1/roles/modules",
  rolePermissions: apiEndpoints.roles?.permissions || ((roleId) => `/api/v1/roles/${roleId}/permissions`),
  updateRolePermissions: apiEndpoints.roles?.updatePermissions || apiEndpoints.roles?.permissions || ((roleId) => `/api/v1/roles/${roleId}/permissions`),
  roleMembers: apiEndpoints.roles?.members || ((roleId) => `/api/v1/roles/${roleId}/members`),
  userDetails: apiEndpoints.roles?.userDetails || ((userId) => `/api/v1/roles/users/${userId}/details`),
  userPermissions: apiEndpoints.roles?.userPermissions || ((userId) => `/api/v1/roles/users/${userId}/permissions`),
  updateUserPermissions: apiEndpoints.roles?.userOverrides || apiEndpoints.roles?.userPermissions || ((userId) => `/api/v1/roles/users/${userId}/permissions`),
  userAssignments: apiEndpoints.roles?.userAssignments || "/api/v1/roles/user-assignments",
  assignRoleToUser: apiEndpoints.roles?.assignUserRole || ((userId) => `/api/v1/roles/user-assignments/${userId}/assign`),
  removeRoleFromUser: apiEndpoints.roles?.removeUserRole || ((userId) => `/api/v1/roles/user-assignments/${userId}/remove`),
  currentUserPermissions: apiEndpoints.roles?.myPermissions || "/api/v1/roles/my-permissions",
};

const ROLE_CODE_TO_ID = {
  SUPER_ADMIN: 1,
  "super-admin": 1,
  ADMIN: 2,
  admin: 2,
  HOD: 3,
  hod: 3,
  FACULTY: 4,
  faculty: 4,
  STUDENT: 5,
  student: 5,
  PARENT: 6,
  parent: 6,
  ACCOUNTS: 7,
  accounts: 7,
  EXAMINATION_CELL: 8,
  "examination-cell": 8,
  LIBRARIAN: 9,
  librarian: 9,
  HOSTEL_WARDEN: 10,
  "hostel-warden": 10,
  PLACEMENT_OFFICER: 11,
  "placement-officer": 11,
  BUS_DRIVER: 12,
  "bus-driver": 12,
};

const resolveRoleId = (id) => {
  if (id !== undefined && id !== null && !isNaN(Number(id))) return Number(id);
  if (ROLE_CODE_TO_ID[id]) return ROLE_CODE_TO_ID[id];
  return id;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeApiArray = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.permissions)) return data.permissions;
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

export async function createRole(payload) {
  if (rbacEndpoints.createRole) {
    try {
      const response = await apiClient.post(rbacEndpoints.createRole, payload);
      const role = normalizeRole(response.data?.data || response.data);
      return withFallbackNotice(role, false);
    } catch (error) {
      throw new Error(getApiErrorMessage(error) || "Unable to create role.");
    }
  }
  const state = readFallbackState();
  const id = String(Date.now());
  const role = {
    id,
    code: String(payload.code || payload.name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    name: payload.name || "",
    description: payload.description || "",
    isSystemRole: false,
    isProtected: false,
    assignedUserCount: 0,
  };
  state.roles.push(role);
  writeFallbackState(state);
  return withFallbackNotice(role);
}

export async function updateRole(roleId, payload) {
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.updateRole && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.updateRole === "function"
        ? rbacEndpoints.updateRole(numericRoleId)
        : `${rbacEndpoints.updateRole}/${numericRoleId}`;
      const response = await apiClient.put(endpoint, payload);
      const role = normalizeRole(response.data?.data || response.data);
      return withFallbackNotice(role, false);
    } catch (error) {
      throw new Error(getApiErrorMessage(error) || "Unable to update role.");
    }
  }
  const state = readFallbackState();
  const index = state.roles.findIndex((r) => String(r.id) === String(roleId));
  if (index !== -1) {
    state.roles[index] = { ...state.roles[index], ...payload };
    writeFallbackState(state);
    return withFallbackNotice(state.roles[index]);
  }
  throw new Error("Role not found.");
}

export async function deleteRole(roleId) {
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.deleteRole && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.deleteRole === "function"
        ? rbacEndpoints.deleteRole(numericRoleId)
        : `${rbacEndpoints.deleteRole}/${numericRoleId}`;
      await apiClient.delete(endpoint);
      return withFallbackNotice(true, false);
    } catch (error) {
      throw new Error(getApiErrorMessage(error) || "Unable to delete role.");
    }
  }
  const state = readFallbackState();
  state.roles = state.roles.filter((r) => String(r.id) !== String(roleId));
  writeFallbackState(state);
  return withFallbackNotice(true);
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
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.rolePermissions && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.rolePermissions === "function"
        ? rbacEndpoints.rolePermissions(numericRoleId)
        : `${rbacEndpoints.rolePermissions}/${numericRoleId}/permissions`;
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
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.updateRolePermissions && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.updateRolePermissions === "function"
        ? rbacEndpoints.updateRolePermissions(numericRoleId)
        : `${rbacEndpoints.updateRolePermissions}/${numericRoleId}/permissions`;
      const response = await apiClient.put(endpoint, { roleId: numericRoleId, permissions: normalized });
      const permissions = normalizeApiArray(response.data);
      return withFallbackNotice(normalizePermissionPayload(permissions.length ? permissions : normalized), false);
    } catch (error) {
      const state = readFallbackState();
      state.rolePermissions[roleId] = normalized;
      writeFallbackState(state);
      return withFallbackNotice(normalized, true, error);
    }
  }
  const state = readFallbackState();
  state.rolePermissions[roleId] = normalized;
  writeFallbackState(state);
  return withFallbackNotice(normalized);
}

export async function getRoleMembers(roleId, roleCode) {
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.roleMembers && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.roleMembers === "function"
        ? rbacEndpoints.roleMembers(numericRoleId, roleCode)
        : `${rbacEndpoints.roleMembers}/${numericRoleId}/members`;
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
  if (rbacEndpoints.userPermissions && userId) {
    try {
      const endpoint = typeof rbacEndpoints.userPermissions === "function"
        ? rbacEndpoints.userPermissions(userId)
        : `${rbacEndpoints.userPermissions}/${userId}/permissions`;
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
  if (rbacEndpoints.userDetails && userId) {
    try {
      const endpoint = typeof rbacEndpoints.userDetails === "function"
        ? rbacEndpoints.userDetails(userId)
        : `${rbacEndpoints.userDetails}/${userId}/details`;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const data = response.data?.data ?? response.data;
      if (data) return withFallbackNotice(data, false);
    } catch (error) {
      // Fallback
    }
  }

  const state = readFallbackState();
  const user = (state.userAssignments || []).find((item) => String(item.id) === String(userId));
  return withFallbackNotice(user || null);
}

export async function updateUserPermissions(userId, payload) {
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);
  if (rbacEndpoints.updateUserPermissions && userId) {
    try {
      const endpoint = typeof rbacEndpoints.updateUserPermissions === "function"
        ? rbacEndpoints.updateUserPermissions(userId)
        : `${rbacEndpoints.updateUserPermissions}/${userId}/permissions`;
      const response = await apiClient.put(endpoint, { userId, permissions: normalized });
      const permissions = normalizeApiArray(response.data);
      return withFallbackNotice(normalizePermissionPayload(permissions.length ? permissions : normalized), false);
    } catch (error) {
      const state = readFallbackState();
      state.userPermissions = state.userPermissions || {};
      state.userPermissions[userId] = normalized;
      writeFallbackState(state);
      return withFallbackNotice(normalized, true, error);
    }
  }
  const state = readFallbackState();
  state.userPermissions = state.userPermissions || {};
  state.userPermissions[userId] = normalized;
  writeFallbackState(state);
  return withFallbackNotice(normalized);
}

const normalizeUserAssignment = (u) => ({
  id: String(u.userId || u.id),
  userId: u.userCode || u.userId || u.id,
  name: u.name || "",
  userType: u.userType || "",
  department: u.department || "",
  designation: u.designation || "",
  roleCodes: u.roleCodes || (u.roleCode ? [u.roleCode] : []),
  status: u.status || "Active",
});

export async function getUserRoleAssignments(params = {}) {
  if (rbacEndpoints.userAssignments) {
    try {
      const response = await apiClient.get(rbacEndpoints.userAssignments, {
        params: {
          search: params.search || "",
          roleId: params.roleId ? resolveRoleId(params.roleId) : undefined,
          userType: params.userType || undefined,
          pageNumber: params.page || 1,
          pageSize: params.pageSize || 8,
        },
        skipGlobalLoader: true,
      });
      const data = response.data?.data ?? response.data;
      const rawItems = data?.items || (Array.isArray(data) ? data : []);
      const items = rawItems.map(normalizeUserAssignment);
      if (items.length) {
        return withFallbackNotice({
          items,
          page: data?.pageNumber || data?.page || 1,
          pageSize: data?.pageSize || 8,
          total: data?.totalCount || data?.total || items.length,
        }, false);
      }
    } catch (error) {
      // fallback
    }
  }
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

export async function assignRoleToUser(userId, roleCode, roleId = null) {
  if (!userId || !roleCode) throw new Error("User and role are required.");
  if (rbacEndpoints.assignRoleToUser) {
    try {
      const endpoint = typeof rbacEndpoints.assignRoleToUser === "function"
        ? rbacEndpoints.assignRoleToUser(userId)
        : `${rbacEndpoints.assignRoleToUser}/${userId}/assign`;
      await apiClient.post(endpoint, { roleCode, roleId: roleId || resolveRoleId(roleCode) });
      return withFallbackNotice({ userId, roleCode }, false);
    } catch (error) {
      // fallback
    }
  }
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
  if (rbacEndpoints.removeRoleFromUser) {
    try {
      const endpoint = typeof rbacEndpoints.removeRoleFromUser === "function"
        ? rbacEndpoints.removeRoleFromUser(userId)
        : `${rbacEndpoints.removeRoleFromUser}/${userId}/remove`;
      await apiClient.delete(endpoint, { params: { roleCode } });
      return withFallbackNotice({ userId, roleCode }, false);
    } catch (error) {
      // fallback
    }
  }
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
  if (rbacEndpoints.currentUserPermissions) {
    try {
      const response = await apiClient.get(rbacEndpoints.currentUserPermissions, { skipGlobalLoader: true });
      const permissions = normalizeApiArray(response.data);
      if (permissions.length) return withFallbackNotice(normalizePermissionPayload(permissions), false);
    } catch (error) {
      // fallback
    }
  }
  const state = readFallbackState();
  return withFallbackNotice(state.rolePermissions.admin || defaultRolePermissions("ADMIN"));
}

export const rolesPermissionsApiConfig = rbacEndpoints;
