import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { normalizePermissionPayload, normalizeRoleCode } from "./permissionUtils.jsx";

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
  ADMIN: 2,
  HOD: 3,
  FACULTY: 4,
  STUDENT: 5,
  PARENT: 6,
  ACCOUNTS: 7,
  EXAMINATION_CELL: 8,
  LIBRARIAN: 9,
  HOSTEL_WARDEN: 10,
  PLACEMENT_OFFICER: 11,
  BUS_DRIVER: 12,
};

const resolveRoleId = (id) => {
  if (id !== undefined && id !== null && !isNaN(Number(id))) return Number(id);
  const normalizedCode = normalizeRoleCode(id);
  if (ROLE_CODE_TO_ID[normalizedCode]) return ROLE_CODE_TO_ID[normalizedCode];
  return id;
};

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
  const assignedUserCount = role?.assignedUserCount
    ?? role?.AssignedUserCount
    ?? role?.assignedUsersCount
    ?? role?.userCount
    ?? role?.UserCount
    ?? role?.memberCount
    ?? role?.MemberCount
    ?? role?.count;
  return {
    id: String(role?.id ?? role?.roleId ?? role?.Id ?? code),
    code: normalizeRoleCode(code),
    name,
    description: role?.description || role?.Description || "",
    isSystemRole: role?.isSystemRole ?? role?.IsSystemRole ?? false,
    isProtected: role?.isProtected ?? role?.IsProtected ?? false,
    assignedUserCount: assignedUserCount == null ? null : Number(assignedUserCount),
  };
};

const apiResult = (data) => ({ data, meta: { source: "api" } });
const apiError = (error, defaultMessage) => new Error(getApiErrorMessage(error) || defaultMessage);
const endpointRequired = (endpoint, label) => {
  if (!endpoint) throw new Error(`${label} API is not configured.`);
};
const notifyRolesUpdated = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("roles-updated"));
};

export async function getRoles(filters = {}) {
  endpointRequired(rbacEndpoints.roles, "Roles");
  const params = {};
  if (filters?.campusId) params.campusId = filters.campusId;
  if (filters?.boardId) params.boardId = filters.boardId;
  if (filters?.academicYearId) params.academicYearId = filters.academicYearId;

  try {
    const response = await apiClient.get(rbacEndpoints.roles, {
      params: Object.keys(params).length ? params : undefined,
      skipGlobalLoader: true,
    });
    return apiResult(normalizeApiArray(response.data).map(normalizeRole).filter((role) => role.name));
  } catch (error) {
    throw apiError(error, "Unable to load roles.");
  }
}

export async function getRoleById(roleId) {
  const roles = await getRoles();
  return apiResult(roles.data.find((role) => String(role.id) === String(roleId)) || null);
}

export async function createRole(payload) {
  endpointRequired(rbacEndpoints.createRole, "Create role");
  try {
    const response = await apiClient.post(rbacEndpoints.createRole, payload);
    const role = normalizeRole(response.data?.data || response.data);
    notifyRolesUpdated();
    return apiResult(role);
  } catch (error) {
    throw apiError(error, "Unable to create role.");
  }
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
      notifyRolesUpdated();
      return apiResult(role);
    } catch (error) {
      throw new Error(getApiErrorMessage(error) || "Unable to update role.");
    }
  }
  throw new Error("Update role API is not configured or the role ID is invalid.");
}

export async function deleteRole(roleId) {
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.deleteRole && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.deleteRole === "function"
        ? rbacEndpoints.deleteRole(numericRoleId)
        : `${rbacEndpoints.deleteRole}/${numericRoleId}`;
      await apiClient.delete(endpoint);
      notifyRolesUpdated();
      return apiResult(true);
    } catch (error) {
      throw new Error(getApiErrorMessage(error) || "Unable to delete role.");
    }
  }
  throw new Error("Delete role API is not configured or the role ID is invalid.");
}

export async function getModulesAndPermissions() {
  endpointRequired(rbacEndpoints.modules, "Permission modules");
  try {
    const response = await apiClient.get(rbacEndpoints.modules, { skipGlobalLoader: true });
    return apiResult(normalizeApiArray(response.data));
  } catch (error) {
    throw apiError(error, "Unable to load permission modules.");
  }
}

export async function getRolePermissions(roleId) {
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.rolePermissions && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.rolePermissions === "function"
        ? rbacEndpoints.rolePermissions(numericRoleId)
        : `${rbacEndpoints.rolePermissions}/${numericRoleId}/permissions`;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const permissions = normalizeApiArray(response.data);
      return apiResult(normalizePermissionPayload(permissions));
    } catch (error) {
      throw apiError(error, "Unable to load role permissions.");
    }
  }
  throw new Error("Role permissions API is not configured or the role ID is invalid.");
}

export async function updateRolePermissions(roleId, payload) {
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);
  const numericRoleId = resolveRoleId(roleId);
  if (rbacEndpoints.updateRolePermissions && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.updateRolePermissions === "function"
        ? rbacEndpoints.updateRolePermissions(numericRoleId)
        : `${rbacEndpoints.updateRolePermissions}/${numericRoleId}/permissions`;
      await apiClient.put(endpoint, { roleId: numericRoleId, permissions: normalized });
      return getRolePermissions(numericRoleId);
    } catch (error) {
      throw apiError(error, "Unable to save role permissions.");
    }
  }
  throw new Error("Role permissions API is not configured or the role ID is invalid.");
}

export async function getRoleMembers(roleId, roleCode, filters = {}) {
  const numericRoleId = resolveRoleId(roleId ?? roleCode);
  if (rbacEndpoints.roleMembers && numericRoleId) {
    try {
      const endpoint = typeof rbacEndpoints.roleMembers === "function"
        ? rbacEndpoints.roleMembers(numericRoleId)
        : `${rbacEndpoints.roleMembers}/${numericRoleId}/members`;
      const response = await apiClient.get(endpoint, {
        params: filters && Object.keys(filters).length ? filters : undefined,
        skipGlobalLoader: true,
      });
      const members = normalizeApiArray(response.data).map(normalizeUserAssignment);
      return apiResult(members);
    } catch (error) {
      throw apiError(error, "Unable to load role members.");
    }
  }
  throw new Error("Role members API is not configured or the role ID is invalid.");
}

export async function getUserPermissions(userId) {
  if (rbacEndpoints.userPermissions && userId) {
    try {
      const endpoint = typeof rbacEndpoints.userPermissions === "function"
        ? rbacEndpoints.userPermissions(userId)
        : `${rbacEndpoints.userPermissions}/${userId}/permissions`;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const permissions = normalizeApiArray(response.data);
      return apiResult(normalizePermissionPayload(permissions));
    } catch (error) {
      throw apiError(error, "Unable to load user permissions.");
    }
  }
  throw new Error("User permissions API is not configured or the user ID is missing.");
}

export async function getUserRoleDetails(userId) {
  if (rbacEndpoints.userDetails && userId) {
    try {
      const endpoint = typeof rbacEndpoints.userDetails === "function"
        ? rbacEndpoints.userDetails(userId)
        : `${rbacEndpoints.userDetails}/${userId}/details`;
      const response = await apiClient.get(endpoint, { skipGlobalLoader: true });
      const data = response.data?.data ?? response.data;
      return apiResult(data || null);
    } catch (error) {
      throw apiError(error, "Unable to load user details.");
    }
  }
  throw new Error("User details API is not configured or the user ID is missing.");
}

export async function updateUserPermissions(userId, payload) {
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);
  if (rbacEndpoints.updateUserPermissions && userId) {
    try {
      const endpoint = typeof rbacEndpoints.updateUserPermissions === "function"
        ? rbacEndpoints.updateUserPermissions(userId)
        : `${rbacEndpoints.updateUserPermissions}/${userId}/permissions`;
      await apiClient.put(endpoint, { userId, permissions: normalized });
      return getUserPermissions(userId);
    } catch (error) {
      throw apiError(error, "Unable to save user permissions.");
    }
  }
  throw new Error("User permissions API is not configured or the user ID is missing.");
}

const normalizeUserAssignment = (u = {}) => {
  const id = u.userId ?? u.UserId ?? u.id ?? u.Id;
  const userCode = u.userCode
    ?? u.UserCode
    ?? u.employeeId
    ?? u.EmployeeId
    ?? (id == null ? "" : String(id));
  const roleCode = u.roleCode ?? u.RoleCode ?? u.roleName ?? u.RoleName ?? "";
  const roleCodes = Array.isArray(u.roleCodes)
    ? u.roleCodes
    : Array.isArray(u.RoleCodes)
      ? u.RoleCodes
      : roleCode
        ? [roleCode]
        : [];

  return {
    ...u,
    id: id == null ? "" : String(id),
    userId: userCode,
    userCode,
    name: u.name ?? u.Name ?? u.fullName ?? u.FullName ?? "",
    userType: u.userType ?? u.UserType ?? "",
    department: u.department ?? u.Department ?? "",
    designation: u.designation ?? u.Designation ?? "",
    roleCodes: roleCodes.map(normalizeRoleCode).filter(Boolean),
    status: u.status ?? u.Status ?? "Active",
  };
};

export async function getUserRoleAssignments(params = {}) {
  if (rbacEndpoints.userAssignments) {
    try {
      const queryParams = {
        search: params.search || "",
        roleId: params.roleId ? resolveRoleId(params.roleId) : undefined,
        userType: params.userType || undefined,
        campusId: params.campusId || undefined,
        boardId: params.boardId || undefined,
        academicYearId: params.academicYearId || undefined,
        pageNumber: params.page || 1,
        pageSize: params.pageSize || 8,
      };

      const response = await apiClient.get(rbacEndpoints.userAssignments, {
        params: queryParams,
        skipGlobalLoader: true,
      });
      const data = response.data?.data ?? response.data;
      const rawItems = data?.items || (Array.isArray(data) ? data : []);
      const items = rawItems.map(normalizeUserAssignment);
      return apiResult({
        items,
        page: data?.pageNumber || data?.page || 1,
        pageSize: data?.pageSize || params.pageSize || 8,
        total: data?.totalCount ?? data?.total ?? items.length,
      });
    } catch (error) {
      throw apiError(error, "Unable to load user role assignments.");
    }
  }
  throw new Error("User role assignments API is not configured.");
}

export async function assignRoleToUser(userId, roleCode, roleId = null) {
  if (!userId || !roleCode) throw new Error("User and role are required.");
  if (rbacEndpoints.assignRoleToUser) {
    try {
      const endpoint = typeof rbacEndpoints.assignRoleToUser === "function"
        ? rbacEndpoints.assignRoleToUser(userId)
        : `${rbacEndpoints.assignRoleToUser}/${userId}/assign`;
      await apiClient.post(endpoint, { roleCode, roleId: roleId || resolveRoleId(roleCode) });
      return apiResult({ userId, roleCode });
    } catch (error) {
      throw apiError(error, "Unable to assign role.");
    }
  }
  throw new Error("Assign role API is not configured.");
}

export async function removeRoleFromUser(userId, roleCode) {
  if (rbacEndpoints.removeRoleFromUser) {
    try {
      const endpoint = typeof rbacEndpoints.removeRoleFromUser === "function"
        ? rbacEndpoints.removeRoleFromUser(userId)
        : `${rbacEndpoints.removeRoleFromUser}/${userId}/remove`;
      await apiClient.delete(endpoint, { params: { roleCode } });
      return apiResult({ userId, roleCode });
    } catch (error) {
      throw apiError(error, "Unable to remove role.");
    }
  }
  throw new Error("Remove role API is not configured.");
}

export async function getCurrentUserPermissions() {
  if (rbacEndpoints.currentUserPermissions) {
    try {
      const response = await apiClient.get(rbacEndpoints.currentUserPermissions, { skipGlobalLoader: true });
      const permissions = normalizeApiArray(response.data);
      return apiResult(normalizePermissionPayload(permissions));
    } catch (error) {
      throw apiError(error, "Unable to load current user permissions.");
    }
  }
  throw new Error("Current user permissions API is not configured.");
}

export const rolesPermissionsApiConfig = rbacEndpoints;
