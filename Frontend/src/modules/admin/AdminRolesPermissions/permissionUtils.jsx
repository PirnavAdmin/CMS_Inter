import { getAuthItem, getAuthUser } from "@/modules/auth/authStorage.js";
import { ACTIONS, PERMISSION_DEPENDENCIES } from "./rolesPermissions.constants.js";

export { ACTIONS, PERMISSION_DEPENDENCIES };

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const MODULE_ALIASES = Object.freeze({
  "staff-reimbursements": "reimbursement",
  "staff-reimbursement": "reimbursement",
  "staff reimbursements": "reimbursement",
  "staff reimbursement": "reimbursement",
  "reimbursements": "reimbursement",
  "reimbursement": "reimbursement",
  "reports": "reports-analytics",
  "reports-analytics": "reports-analytics",
  "inventory": "inventory-management",
  "inventory-management": "inventory-management",
  "courses": "group-management",
  "course-management": "group-management",
  "examinations": "examination",
  "examination": "examination",
  "my-profile": "profile",
  "my profile": "profile",
  "profile": "profile",
  "driver-profile": "profile",
  "accountant-profile": "profile",
  "exam-cell-profile": "profile",
  "inventory-profile": "profile",
  "warden-profile": "profile",
  "parent-dashboard": "dashboard",
  "parent-children": "student-management",
  "parent-attendance": "attendance",
  "parent-academics-results": "results",
  "parent-examinations": "examination",
  "parent-fees-payments": "fee-management",
  "parent-timetable": "timetable",
  "parent-communication": "reports-analytics",
  "parent-announcements": "reports-analytics",
  "parent-announcements-events": "reports-analytics",
  "parent-documents": "certificates",
  "parent-settings": "settings",
  "parent-profile": "profile",
  "warden-dashboard": "dashboard",
  "warden-rooms-beds": "hostel-management",
  "warden-student-allocations": "hostel-management",
  "warden-hostel-attendance": "hostel-management",
  "warden-outpass-leaves": "hostel-management",
  "warden-resident-students": "hostel-management",
  "warden-hostel-reports": "hostel-management",
  "warden-my-attendance": "staff-attendance",
  "warden-staff-leave": "staff-leave-management",
  "warden-holidays": "holiday-management",
  "warden-reimbursements": "reimbursement",
  "warden-settings": "settings",
  // Driver aliases
  "driver-todays-trips": "transport",
  "driver-route-stops": "transport",
  "driver-live-navigation": "transport",
  "driver-student-manifest": "transport",
  "driver-my-attendance": "staff-attendance",
  "driver-leave-management": "staff-leave-management",
  "driver-my-payslips": "payroll",
  "driver-trip-reports": "reports-analytics",
  "driver-holidays": "holiday-management",
  "driver-settings": "settings",
  // Accountant aliases
  "accountant-dashboard": "dashboard",
  "accountant-fee-management": "fee-management",
  "accountant-payment-history": "fee-management",
  "accountant-reimbursements": "reimbursement",
  "accountant-payroll": "payroll",
  "accountant-attendance-impact": "payroll",
  "accountant-financial-reports": "reports-analytics",
  "accountant-my-attendance": "staff-attendance",
  "accountant-staff-leave": "staff-leave-management",
  "accountant-holidays": "holiday-management",
  "accountant-settings": "settings",
  // Exam Cell aliases
  "exam-cell-dashboard": "dashboard",
  "exam-cell-examination": "examination",
  "exam-cell-marks-entry": "marks-evaluation",
  "exam-cell-results": "results",
  "exam-cell-attendance": "attendance",
  "exam-cell-my-attendance": "staff-attendance",
  "exam-cell-certificates": "certificates",
  "exam-cell-settings": "settings",
  "exam-cell-promotions": "promotion",
  // Inventory Manager aliases
  "inventory-dashboard": "dashboard",
  "inventory-items": "inventory-management",
  "inventory-stock-in": "inventory-management",
  "inventory-stock-out": "inventory-management",
  "inventory-suppliers": "inventory-management",
  "inventory-categories": "inventory-management",
  "inventory-purchase-orders": "inventory-management",
  "inventory-returns": "inventory-management",
  "inventory-reports": "inventory-management",
  "inventory-leave-management": "staff-leave-management",
  "inventory-my-payslips": "payroll",
  "inventory-notifications": "dashboard",
  "inventory-profile": "profile",
  "inventory-settings": "settings",
});

export const normalizeModuleKey = (value = "") => {
  const raw = String(value).trim().toLowerCase();
  if (MODULE_ALIASES[raw]) return MODULE_ALIASES[raw];
  const cleaned = raw.replace(/&/g, "").replace(/\//g, "-").replace(/\s+/g, "-");
  return MODULE_ALIASES[cleaned] || cleaned;
};

export const normalizeActionKey = (value = "") => {
  const action = String(value).trim().toLowerCase();
  if (
    action === "add" ||
    action === "create" ||
    action === "mark-attendance" ||
    action === "apply" ||
    action === "schedule" ||
    action === "enter-marks" ||
    action === "collect-payment" ||
    action === "generate-receipt" ||
    action === "issue" ||
    action === "issue-books" ||
    action === "assign-permissions" ||
    action === "assign-users" ||
    action === "allocate-students" ||
    action === "manage-routes" ||
    action === "manage-drives" ||
    action === "manage-applications" ||
    action === "manage-rooms" ||
    action === "manage-books" ||
    action === "assign-driver-vehicle"
  ) {
    return ACTIONS.CREATE;
  }
  if (
    action === "update" ||
    action === "edit" ||
    action === "edit-attendance" ||
    action === "edit-marks" ||
    action === "approve-reject" ||
    action === "publish" ||
    action === "return-books"
  ) {
    return ACTIONS.EDIT;
  }
  if (action === "delete" || action === "remove") {
    return ACTIONS.DELETE;
  }
  if (action === "view" || action === "read") {
    return ACTIONS.VIEW;
  }
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

const getPermissionScreenKey = (item = {}) =>
  item?.screenId
  ?? item?.ScreenId
  ?? item?.screenKey
  ?? item?.ScreenKey
  ?? item?.screen
  ?? item?.Screen
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

export const toPermissionMap = (permissions = []) => {
  const map = {};

  if (!permissions) return map;

  if (typeof permissions === "object" && !Array.isArray(permissions)) {
    Object.entries(permissions).forEach(([key, actions]) => {
      map[normalizeModuleKey(key)] = getPermissionActions(actions).map(normalizeActionKey);
    });
    return map;
  }

  permissions.forEach((item) => {
    const modKey = normalizeModuleKey(getPermissionModuleKey(item));
    if (!modKey) return;

    // Module-level actions
    const modActions = getPermissionActions(item).map(normalizeActionKey);
    if (!map[modKey]) {
      map[modKey] = modActions;
    } else {
      map[modKey] = [...new Set([...map[modKey], ...modActions])];
    }

    // Direct screenId on item (flat format from backend)
    const scrKey = normalizeModuleKey(getPermissionScreenKey(item));
    if (scrKey) {
      map[`${modKey}:${scrKey}`] = modActions;
    }

    // Nested screens array on item
    if (Array.isArray(item.screens)) {
      item.screens.forEach((screen) => {
        const sKey = normalizeModuleKey(screen?.id ?? screen?.screenId ?? screen?.name);
        if (sKey) {
          const screenActions = getPermissionActions(screen).map(normalizeActionKey);
          map[`${modKey}:${sKey}`] = screenActions;
          // Also merge into module-level map so module-level canView knows if any screen is viewable
          if (screenActions.includes(ACTIONS.VIEW) && !map[modKey].includes(ACTIONS.VIEW)) {
            map[modKey].push(ACTIONS.VIEW);
          }
        }
      });
    }
  });

  
  // Mirror aliases so lookups by raw backend slug or canonical ID both resolve
  const reimbActions = map["reimbursement"] || map["staff-reimbursements"] || map["staff-reimbursement"] || map["reimbursements"];
  if (reimbActions) {
    map["reimbursement"] = reimbActions;
    map["staff-reimbursements"] = reimbActions;
    map["staff-reimbursement"] = reimbActions;
    map["reimbursements"] = reimbActions;
  }
  if (map["reports-analytics"]) {
    map["reports"] = map["reports-analytics"];
  }
  if (map["inventory-management"]) {
    map["inventory"] = map["inventory-management"];
  }
  if (map["marks-evaluation"]) {
    map["marks"] = map["marks-evaluation"];
  }
  if (map["staff-attendance"]) {
    map["myattendance"] = map["staff-attendance"];
    map["my-attendance"] = map["staff-attendance"];
  }
  if (map["staff-leave-management"]) {
    map["leave"] = map["staff-leave-management"];
    map["staff-leave"] = map["staff-leave-management"];
  }
  if (map["holiday-management"]) {
    map["holidays"] = map["holiday-management"];
  }
  if (map["payroll"]) {
    map["salary"] = map["payroll"];
    map["payslips"] = map["payroll"];
  }
  if (map["examination"]) {
    map["examinations"] = map["examination"];
    map["examduties"] = map["examination"];
    map["exam-duties"] = map["examination"];
  } else if (map["examinations"]) {
    map["examination"] = map["examinations"];
    map["examduties"] = map["examinations"];
    map["exam-duties"] = map["examinations"];
  }
  if (map["subject-management"]) {
    map["classes"] = map["subject-management"];
  }
  if (map["hostel-management"]) {
    ["warden-rooms-beds", "warden-student-allocations", "warden-hostel-attendance", "warden-outpass-leaves", "warden-resident-students", "warden-hostel-reports"].forEach((k) => { map[k] = map["hostel-management"]; });
  }
  if (map["student-management"]) {
    map["parent-children"] = map["student-management"];
  }
  if (map["fee-management"]) {
    map["parent-fees-payments"] = map["fee-management"];
    map["fees"] = map["fee-management"];
  }
  if (map["results"]) {
    map["parent-academics-results"] = map["results"];
  }
  if (map["group-management"]) {
    map["academics"] = map["group-management"];
    map["courses"] = map["group-management"];
  }
  // Certificates & Documents
  if (map["certificates"]) {
    map["documents"] = map["certificates"];
    map["parent-documents"] = map["certificates"];
    map["exam-cell-certificates"] = map["certificates"];
  }

  // Dashboard
  if (map["dashboard"]) {
    map["parent-dashboard"] = map["dashboard"];
    map["warden-dashboard"] = map["dashboard"];
    map["inventory-dashboard"] = map["dashboard"];
    map["inventory-notifications"] = map["dashboard"];
    map["driver-dashboard"] = map["dashboard"];
    map["accountant-dashboard"] = map["dashboard"];
    map["exam-cell-dashboard"] = map["dashboard"];
  }

  // Attendance
  if (map["attendance"]) {
    map["parent-attendance"] = map["attendance"];
    map["exam-cell-attendance"] = map["attendance"];
  }

  // Timetable
  if (map["timetable"]) {
    map["parent-timetable"] = map["timetable"];
  }

  // Reports & Analytics / Communication
  if (map["reports-analytics"]) {
    map["parent-communication"] = map["reports-analytics"];
    map["parent-announcements"] = map["reports-analytics"];
    map["parent-announcements-events"] = map["reports-analytics"];
    map["driver-trip-reports"] = map["reports-analytics"];
    map["accountant-financial-reports"] = map["reports-analytics"];
  }

  // Settings
  if (map["settings"]) {
    map["parent-settings"] = map["settings"];
    map["inventory-settings"] = map["settings"];
    map["warden-settings"] = map["settings"];
    map["driver-settings"] = map["settings"];
    map["accountant-settings"] = map["settings"];
    map["exam-cell-settings"] = map["settings"];
  }

  // Profile
  if (map["profile"]) {
    map["parent-profile"] = map["profile"];
    map["warden-profile"] = map["profile"];
    map["driver-profile"] = map["profile"];
    map["accountant-profile"] = map["profile"];
    map["inventory-profile"] = map["profile"];
    map["exam-cell-profile"] = map["profile"];
  }

  // Staff Attendance
  if (map["staff-attendance"]) {
    map["warden-my-attendance"] = map["staff-attendance"];
    map["driver-my-attendance"] = map["staff-attendance"];
    map["accountant-my-attendance"] = map["staff-attendance"];
    map["exam-cell-my-attendance"] = map["staff-attendance"];
  }

  // Staff Leave Management
  if (map["staff-leave-management"]) {
    map["warden-staff-leave"] = map["staff-leave-management"];
    map["inventory-leave-management"] = map["staff-leave-management"];
    map["driver-leave-management"] = map["staff-leave-management"];
    map["accountant-staff-leave"] = map["staff-leave-management"];
  }

  // Holiday Management
  if (map["holiday-management"]) {
    map["warden-holidays"] = map["holiday-management"];
    map["driver-holidays"] = map["holiday-management"];
    map["accountant-holidays"] = map["holiday-management"];
  }

  // Reimbursements
  if (map["reimbursement"]) {
    map["warden-reimbursements"] = map["reimbursement"];
    map["accountant-reimbursements"] = map["reimbursement"];
  }

  // Payroll
  if (map["payroll"]) {
    map["inventory-my-payslips"] = map["payroll"];
    map["driver-my-payslips"] = map["payroll"];
    map["accountant-payroll"] = map["payroll"];
    map["accountant-attendance-impact"] = map["payroll"];
  }

  // Promotion
  if (map["promotion"]) {
    map["exam-cell-promotions"] = map["promotion"];
  }

  // Marks & Exams
  if (map["examination"]) {
    map["parent-examinations"] = map["examination"];
    map["exam-cell-examination"] = map["examination"];
  }
  if (map["marks-evaluation"]) {
    map["exam-cell-marks-entry"] = map["marks-evaluation"];
  }

  // Inventory Management
  if (map["inventory-management"]) {
    ["inventory-items", "inventory-stock-in", "inventory-stock-out", "inventory-suppliers", "inventory-categories", "inventory-purchase-orders", "inventory-returns", "inventory-reports"].forEach((k) => { map[k] = map["inventory-management"]; });
  }
  if (map["transport"]) {
    ["driver-todays-trips", "driver-route-stops", "driver-live-navigation", "driver-student-manifest"].forEach((k) => { map[k] = map["transport"]; });
  }

  // Mirror settings screens so direct screen-name or module-screen lookups resolve seamlessly
  const settingsScreens = [
    "audit-logs", "lop-configuration", "campus-images", "campus-configuration",
    "leave-types", "attendance-timing", "number-series", "templates",
    "credentials", "credentials-generator", "landing-configuration", "login-configuration"
  ];
  settingsScreens.forEach((scr) => {
    if (map[`settings:${scr}`]) {
      map[scr] = map[`settings:${scr}`];
    } else if (map["settings"]) {
      map[scr] = map["settings"];
      map[`settings:${scr}`] = map["settings"];
    }
  });

  return map;
};

export function normalizeRoleCode(value = "") {
  const code = normalizeCode(value);
  if (
    code === "ADMINISTRATOR" ||
    code === "SYSTEM_ADMINISTRATOR" ||
    code === "COLLEGE_ADMIN" ||
    code === "COLLEGE_ADMINISTRATOR"
  ) {
    return "ADMIN";
  }
  if (code === "ACCOUNTS" || code === "ACCOUNT" || code === "ACCOUNTING" || code === "FINANCE") return "ACCOUNTANT";
  if (code.includes("LIBRAR")) return "LIBRARIAN";
  if (code === "DRIVER") return "BUS_DRIVER";
  if (code === "RECEPTION" || code === "RECEPTIONIST" || code === "FRONT_DESK" || code === "FRONT_OFFICE") return "RECEPTIONIST";
  return code;
}
export const ROLE_PRIORITY_ORDER = Object.freeze([
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "DEAN",
  "HOD",
  "FACULTY",
  "STUDENT",
  "PARENT",
  "ACCOUNTANT",
  "EXAMINATION_CELL",
  "LIBRARIAN",
  "HOSTEL_WARDEN",
  "PLACEMENT_OFFICER",
  "BUS_DRIVER",
  "OFFICE_STAFF",
  "ADMISSION_STAFF",
  "TRANSPORT_MANAGER",
  "LAB_ASSISTANT",
  "ATTENDANT",
  "INVENTORY_MANAGER",
  "UNASSIGNED",
]);

export function sortRolesByPriority(roles = []) {
  if (!Array.isArray(roles)) return [];
  const priorityMap = new Map(ROLE_PRIORITY_ORDER.map((code, index) => [code, index]));
  return [...roles].sort((a, b) => {
    const codeA = normalizeRoleCode(a?.code || a?.roleCode || a?.name || a?.roleName);
    const codeB = normalizeRoleCode(b?.code || b?.roleCode || b?.name || b?.roleName);
    const pA = priorityMap.has(codeA) ? priorityMap.get(codeA) : 999;
    const pB = priorityMap.has(codeB) ? priorityMap.get(codeB) : 999;
    if (pA !== pB) return pA - pB;
    return (a?.name || "").localeCompare(b?.name || "");
  });
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

const SETTINGS_SCREENS = Object.freeze([
  "audit-logs", "lop-configuration", "campus-images", "campus-configuration",
  "leave-types", "attendance-timing", "number-series", "templates",
  "credentials", "credentials-generator", "landing-configuration", "login-configuration"
]);

export function can(moduleKey, actionKey = ACTIONS.VIEW, permissions, user = getAuthUser(), screenKey = null) {
  if (hasRole("SUPER_ADMIN", user)) return true;
  let normMod = normalizeModuleKey(moduleKey);
  const normAct = normalizeActionKey(actionKey);



  // Administrators have full access
  if (hasRole("ADMIN", user)) return true;

  // Enquiry Management accessible to Admin, Principal, Receptionist, Non-Teaching
  if (normMod === "enquiry-management" || normMod === "enquiries") {
    if (hasRole("ADMIN", user) || hasRole("PRINCIPAL", user) || hasRole("RECEPTIONIST", user)) {
      return true;
    }
    const roleStr = String(user?.role || user?.roleName || user?.roleCode || "").toLowerCase();
    if (roleStr.includes("reception") || roleStr.includes("principal") || roleStr.includes("admin") || roleStr.includes("nonteaching") || roleStr.includes("non-teaching")) {
      return true;
    }
  }


  const rawSource = permissions ?? user?.permissions ?? user?.rolePermissions;

  // Administrators have full access
  if (hasRole("ADMIN", user)) return true;

  // If permissions are not an array or empty, deny access (no arbitrary fallback)
  if (!Array.isArray(rawSource) || rawSource.length === 0) {
    return false;
  }

  const permissionMap = toPermissionMap(rawSource);
  let normScr = screenKey ? normalizeModuleKey(screenKey) : null;

  if (SETTINGS_SCREENS.includes(normMod) && !normScr) {
    normScr = normMod;
    normMod = "settings";
  }

  // Admin always has authoritative access to administrative and settings management
  if (hasRole("ADMIN", user) && (normMod === "settings" || normMod === "roles-permissions" || SETTINGS_SCREENS.includes(normMod) || normScr === "role-management")) {
    return true;
  }

  // If a specific screen is queried, check screen-level grant first
  if (normScr) {
    const scrActions = permissionMap[`${normMod}:${normScr}`] || permissionMap[normScr];
    if (Array.isArray(scrActions)) {
      return scrActions.includes(normAct);
    }
  }

  // Screen routes inherit their parent module grant when screen-level grant is not defined
  const moduleActions = permissionMap[normMod];
  if (Array.isArray(moduleActions) && moduleActions.includes(normAct)) {
    return true;
  }

  if (hasRole("ADMIN", user)) {
    return true;
  }

  return false;
}

export function PermissionGuard({ moduleKey, screenKey = null, actionKey = ACTIONS.VIEW, permissions, fallback = null, children }) {
  return can(moduleKey, actionKey, permissions, getAuthUser(), screenKey) ? children : fallback;
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
    // If enabling create, edit, or delete, auto-enable view
    if (actionKey !== ACTIONS.VIEW) {
      next.add(ACTIONS.VIEW);
    }
  } else {
    next.delete(actionKey);
    // If disabling view, auto-disable create, edit, delete
    if (actionKey === ACTIONS.VIEW) {
      next.delete(ACTIONS.CREATE);
      next.delete(ACTIONS.EDIT);
      next.delete(ACTIONS.DELETE);
    }
  }
  return [...next];
}

export function normalizePermissionPayload(permissions = []) {
  if (!Array.isArray(permissions)) return [];

  const byModule = new Map();

  permissions.forEach((item) => {
    const mod = normalizeModuleKey(getPermissionModuleKey(item));
    if (!mod) return;

    const existing = byModule.get(mod) || { module: mod, actions: [], screens: new Map() };
    const itemActions = getPermissionActions(item).map(normalizeActionKey);

    itemActions.forEach((act) => {
      if (act && !existing.actions.includes(act)) existing.actions.push(act);
    });

    // Check direct screen
    const scrId = normalizeModuleKey(getPermissionScreenKey(item));
    if (scrId) {
      const scrActions = existing.screens.get(scrId) || [];
      itemActions.forEach((act) => {
        if (act && !scrActions.includes(act)) scrActions.push(act);
      });
      existing.screens.set(scrId, scrActions);
    }

    // Check nested screens
    if (Array.isArray(item.screens)) {
      item.screens.forEach((s) => {
        const sId = normalizeModuleKey(s.id || s.screenId);
        if (!sId) return;
        const scrActions = existing.screens.get(sId) || [];
        getPermissionActions(s).map(normalizeActionKey).forEach((act) => {
          if (act && !scrActions.includes(act)) scrActions.push(act);
        });
        existing.screens.set(sId, scrActions);
      });
    }

    byModule.set(mod, existing);
  });

  return [...byModule.values()].map((entry) => ({
    module: entry.module,
    actions: entry.actions,
    screens: [...entry.screens.entries()].map(([screenId, actions]) => ({
      screenId,
      actions,
    })),
  }));
}

export function getPresetActions(preset, availableActions = [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]) {
  switch (preset) {
    case "full_access":
      return [...availableActions];
    case "view_only":
      return availableActions.includes(ACTIONS.VIEW) ? [ACTIONS.VIEW] : [];
    case "operational":
      return availableActions.filter((a) => a !== ACTIONS.DELETE);
    case "revoke_all":
    default:
      return [];
  }
}

export function usePermissions() {
  const user = getAuthUser();
  const permissions = user?.permissions ?? user?.rolePermissions ?? null;
  const isSuperOrAdmin = hasRole("SUPER_ADMIN", user) || hasRole("ADMIN", user);

  return {
    user,
    permissions,
    isSuperOrAdmin,
    can: (moduleKey, actionKey = ACTIONS.VIEW, screenKey = null) =>
      can(moduleKey, actionKey, permissions, user, screenKey),
    canView: (moduleKey, screenKey = null) =>
      can(moduleKey, ACTIONS.VIEW, permissions, user, screenKey),
    canCreate: (moduleKey, screenKey = null) =>
      can(moduleKey, ACTIONS.CREATE, permissions, user, screenKey),
    canEdit: (moduleKey, screenKey = null) =>
      can(moduleKey, ACTIONS.EDIT, permissions, user, screenKey),
    canDelete: (moduleKey, screenKey = null) =>
      can(moduleKey, ACTIONS.DELETE, permissions, user, screenKey),
  };
}


