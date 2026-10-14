import {
  ACTIONS,
  ALL_PERMISSION_MODULES,
  ROLE_MEMBER_FALLBACK,
  ROLE_SEEDS,
  USER_ASSIGNMENT_FALLBACK,
} from "./rolesPermissions.constants.js";
import { normalizePermissionPayload, normalizeRoleCode } from "./permissionUtils.jsx";

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

const apiResult = (data) => ({ data: clone(data), meta: { source: "mock" } });
const notifyRolesUpdated = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("roles-updated"));
};

const normalizeRole = (role = {}) => ({
  ...role,
  id: String(role.id ?? role.roleId ?? role.code ?? role.name),
  code: normalizeRoleCode(role.code || role.roleCode || role.name),
  name: role.name || role.roleName || "",
  description: role.description || "",
  isSystemRole: role.isSystemRole ?? true,
  isProtected: role.isProtected ?? false,
  assignedUserCount: Number(role.assignedUserCount ?? 0),
});

const normalizeUserAssignment = (user = {}) => {
  const id = user.userId ?? user.id ?? "";
  const roleCodes = Array.isArray(user.roleCodes)
    ? user.roleCodes
    : user.roleCode
      ? [user.roleCode]
      : [];

  return {
    ...user,
    id: String(user.id ?? id),
    userId: String(user.userId ?? id),
    userCode: String(user.userCode ?? user.userId ?? id),
    name: user.name || "",
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

const roleModuleIds = {
  SUPER_ADMIN: ALL_PERMISSION_MODULES.map((module) => module.id),
  ADMIN: ALL_PERMISSION_MODULES.map((module) => module.id),
  HOD: [
    "dashboard",
    "group-management",
    "subject-management",
    "section-room",
    "timetable",
    "holiday-management",
    "student-management",
    "attendance",
    "staff-management",
    "staff-attendance",
    "examination",
    "marks-evaluation",
    "results",
    "reports-analytics",
  ],
  FACULTY: ["dashboard", "timetable", "attendance", "examination", "marks-evaluation", "results", "certificates", "holiday-management"],
  STUDENT: ["dashboard", "timetable", "attendance", "examination", "results", "fee-management", "transport", "hostel-management", "certificates", "holiday-management"],
  PARENT: ["dashboard", "attendance", "examination", "results", "fee-management", "timetable", "certificates", "holiday-management"],
  ACCOUNTS: ["dashboard", "fee-management", "payroll", "reports-analytics"],
  EXAMINATION_CELL: ["dashboard", "timetable", "examination", "marks-evaluation", "results", "certificates", "reports-analytics"],
  LIBRARIAN: ["dashboard", "library", "reports-analytics"],
  HOSTEL_WARDEN: ["dashboard", "hostel-management", "student-management", "attendance", "reports-analytics"],
  PLACEMENT_OFFICER: ["dashboard", "placement", "student-management", "reports-analytics"],
  BUS_DRIVER: ["dashboard", "transport"],
  OFFICE_STAFF: ["dashboard", "student-admission", "student-management", "certificates", "reports-analytics"],
  ADMISSION_STAFF: ["dashboard", "student-admission", "student-management", "section-allocation"],
  TRANSPORT_MANAGER: ["dashboard", "transport", "reports-analytics"],
  LAB_ASSISTANT: ["dashboard", "subject-management", "reports-analytics"],
};

const editableRoleCodes = new Set(["SUPER_ADMIN", "ADMIN", "HOD", "ACCOUNTS", "EXAMINATION_CELL", "HOSTEL_WARDEN", "TRANSPORT_MANAGER"]);

const defaultActionsForRole = (roleCode, module) => {
  const availableActions = module.availableActions || [ACTIONS.VIEW];
  if (roleCode === "SUPER_ADMIN" || roleCode === "ADMIN") return availableActions;
  if (editableRoleCodes.has(roleCode)) {
    return [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE].filter((action) => availableActions.includes(action));
  }
  return availableActions.includes(ACTIONS.VIEW) ? [ACTIONS.VIEW] : [];
};

const buildRolePermissions = (roleCode) => {
  const normalizedRoleCode = normalizeRoleCode(roleCode);
  const allowedModuleIds = roleModuleIds[normalizedRoleCode] || ["dashboard"];
  return normalizePermissionPayload(
    ALL_PERMISSION_MODULES
      .filter((module) => allowedModuleIds.includes(module.id))
      .map((module) => ({ module: module.id, actions: defaultActionsForRole(normalizedRoleCode, module) })),
  );
};

const mockRolePermissions = new Map(mockRoles.map((role) => [role.id, buildRolePermissions(role.code)]));
const mockUserPermissions = new Map();

const findRole = (roleIdOrCode) => {
  const normalized = normalizeRoleCode(roleIdOrCode);
  return mockRoles.find((role) => String(role.id) === String(roleIdOrCode) || role.code === normalized) || null;
};

const roleCounts = () => {
  const counts = new Map();
  mockAssignments.forEach((user) => {
    (user.roleCodes || []).forEach((roleCode) => counts.set(roleCode, (counts.get(roleCode) || 0) + 1));
  });
  return counts;
};

export async function getRoles() {
  const counts = roleCounts();
  return apiResult(mockRoles.map((role) => ({ ...role, assignedUserCount: counts.get(role.code) ?? role.assignedUserCount })));
}

export async function getRoleById(roleId) {
  return apiResult(findRole(roleId));
}

export async function createRole(payload = {}) {
  const role = normalizeRole({
    ...payload,
    id: payload.id || normalizeRoleCode(payload.code || payload.name).toLowerCase().replace(/_/g, "-"),
    code: payload.code || payload.name,
  });
  mockRoles.push(role);
  mockRolePermissions.set(role.id, []);
  notifyRolesUpdated();
  return apiResult(role);
}

export async function updateRole(roleId, payload = {}) {
  const index = mockRoles.findIndex((role) => String(role.id) === String(roleId));
  if (index === -1) throw new Error("Role not found.");
  mockRoles[index] = normalizeRole({ ...mockRoles[index], ...payload, id: mockRoles[index].id });
  notifyRolesUpdated();
  return apiResult(mockRoles[index]);
}

export async function deleteRole(roleId) {
  const index = mockRoles.findIndex((role) => String(role.id) === String(roleId));
  if (index === -1) throw new Error("Role not found.");
  if (mockRoles[index].isProtected) throw new Error("Protected roles cannot be deleted.");
  const [removed] = mockRoles.splice(index, 1);
  mockRolePermissions.delete(removed.id);
  notifyRolesUpdated();
  return apiResult(true);
}

export async function getModulesAndPermissions() {
  return apiResult(ALL_PERMISSION_MODULES);
}

export async function getRolePermissions(roleId) {
  const role = findRole(roleId);
  if (!role) return apiResult([]);
  return apiResult(mockRolePermissions.get(role.id) || []);
}

export async function updateRolePermissions(roleId, payload) {
  const role = findRole(roleId);
  if (!role) throw new Error("Role not found.");
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);
  mockRolePermissions.set(role.id, normalized);
  return apiResult(normalized);
}

export async function getRoleMembers(roleId, roleCode) {
  const role = findRole(roleId) || findRole(roleCode);
  if (!role) return apiResult([]);
  return apiResult(mockAssignments.filter((user) => (user.roleCodes || []).includes(role.code)));
}

export async function getUserPermissions(userId) {
  const user = mockAssignments.find((item) => String(item.id) === String(userId) || String(item.userId) === String(userId));
  if (!user) return apiResult([]);
  if (mockUserPermissions.has(user.id)) return apiResult(mockUserPermissions.get(user.id));
  const role = findRole((user.roleCodes || [])[0]);
  return apiResult(role ? mockRolePermissions.get(role.id) || [] : []);
}

export async function getUserRoleDetails(userId) {
  return apiResult(mockAssignments.find((item) => String(item.id) === String(userId) || String(item.userId) === String(userId)) || null);
}

export async function updateUserPermissions(userId, payload) {
  const user = mockAssignments.find((item) => String(item.id) === String(userId) || String(item.userId) === String(userId));
  if (!user) throw new Error("User not found.");
  const normalized = normalizePermissionPayload(payload?.permissions || payload || []);
  mockUserPermissions.set(user.id, normalized);
  return apiResult(normalized);
}

export async function getUserRoleAssignments(params = {}) {
  const search = String(params.search || "").trim().toLowerCase();
  const role = params.roleId ? findRole(params.roleId) : null;
  const userType = String(params.userType || "").trim().toLowerCase();
  const page = Number(params.page || 1);
  const pageSize = Number(params.pageSize || 8);

  const filtered = mockAssignments.filter((user) => {
    const matchesSearch = !search || [user.name, user.userId, user.department, user.designation, user.userType]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesRole = !role || (user.roleCodes || []).includes(role.code);
    const matchesUserType = !userType || String(user.userType || "").toLowerCase() === userType;
    return matchesSearch && matchesRole && matchesUserType;
  });
  const start = (page - 1) * pageSize;
  return apiResult({
    items: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}

export async function assignRoleToUser(userId, roleCode) {
  const user = mockAssignments.find((item) => String(item.id) === String(userId) || String(item.userId) === String(userId));
  const role = findRole(roleCode);
  if (!user || !role) throw new Error("User and role are required.");
  if (!(user.roleCodes || []).includes(role.code)) user.roleCodes = [...(user.roleCodes || []), role.code];
  notifyRolesUpdated();
  return apiResult({ userId, roleCode: role.code });
}

export async function removeRoleFromUser(userId, roleCode) {
  const user = mockAssignments.find((item) => String(item.id) === String(userId) || String(item.userId) === String(userId));
  if (!user) throw new Error("User not found.");
  const normalizedRoleCode = normalizeRoleCode(roleCode);
  user.roleCodes = (user.roleCodes || []).filter((code) => normalizeRoleCode(code) !== normalizedRoleCode);
  notifyRolesUpdated();
  return apiResult({ userId, roleCode: normalizedRoleCode });
}

export async function getCurrentUserPermissions() {
  return apiResult([]);
}

export const rolesPermissionsApiConfig = Object.freeze({
  mode: "mock",
  apiIntegrationEnabled: false,
});
