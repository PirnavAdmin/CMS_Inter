import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { syncUserTheme } from "@/hooks/useTheme.js";
import { clearAuthSession, getAuthItem, getAuthToken, getAuthUser } from "@/modules/auth/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";
import { isExamCellRole } from "@/modules/exam-cell/navigation.js";
import { can, hasRole } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";
import { useEffectivePermissions } from "@/modules/admin/AdminRolesPermissions/useEffectivePermissions.js";
import { ACTIONS } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.constants.js";
import { getPlatformSession } from "@/modules/super-admin/superAdminSession.js";

const normalizeRoleToken = (value) =>
  String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

export function isInventoryRole(role, user) {
  if (user?.roleType === "inventory") return true;
  return [role, user?.role, user?.roleCode, user?.roleName, ...(Array.isArray(user?.roles) ? user.roles : [user?.roles])].some((value) => {
    const name = typeof value === "object" && value ? value.roleName || value.name || value.code : value;
    const normalized = String(name || "").trim().toLowerCase().replace(/[\s_-]/g, "");
    return normalized.includes("inventory") || normalized === "storemanager" || normalized === "storekeeper";
  });
}

export function isDriverRole(role, user) {
  if (user?.roleType === "driver" || user?.roleType === "bus_driver") return true;
  const check = (val) => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    const clean = s.replace(/[-_\s]/g, "");
    return clean === "driver" || clean === "busdriver" || s.includes("driver");
  };
  if (check(role)) return true;
  if (user && typeof user === "object") {
    if (check(user.role) || check(user.roleCode) || check(user.roleName) || check(user.designation)) return true;
    const roleCodes = Array.isArray(user.roleCodes) ? user.roleCodes : [user.roleCodes];
    if (roleCodes.some(check)) return true;
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    if (
      roles.some((r) => {
        if (typeof r === "string") return check(r);
        if (r && typeof r === "object") {
          return check(r.code) || check(r.name) || check(r.role) || check(r.roleName);
        }
        return false;
      })
    ) {
      return true;
    }
  }
  return false;
}

export function isWardenRole(role, user) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (
    normalizedRole.includes("warden") ||
    normalizedRole === "hostel_warden" ||
    normalizedRole === "hostel-warden" ||
    normalizedRole === "chief_warden" ||
    normalizedRole === "assistant_warden"
  ) {
    return true;
  }
  if (user && typeof user === "object") {
    if (user.roleType === "warden") return true;
    const userRole = String(user.role || "").trim().toLowerCase();
    if (
      userRole.includes("warden") ||
      userRole === "hostel_warden" ||
      userRole === "hostel-warden" ||
      userRole === "chief_warden" ||
      userRole === "assistant_warden"
    ) {
      return true;
    }
    const designation = String(user.designation || user.Designation || user.designationName || "").trim().toLowerCase();
    if (designation.includes("warden")) {
      return true;
    }
    const roleCodes = Array.isArray(user.roleCodes) ? user.roleCodes : [user.roleCodes];
    if (roleCodes.some((rc) => String(rc || "").toLowerCase().includes("warden"))) {
      return true;
    }
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    if (
      roles.some((r) => {
        if (typeof r === "string") return r.toLowerCase().includes("warden");
        if (r && typeof r === "object") {
          return (
            String(r.code || "").toLowerCase().includes("warden") ||
            String(r.name || "").toLowerCase().includes("warden") ||
            String(r.role || "").toLowerCase().includes("warden")
          );
        }
        return false;
      })
    ) {
      return true;
    }
  }
  return false;
}

export function isTransportManagerRole(role, user) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const isExplicitTransportManager =
    normalizedRole.includes("transport") ||
    normalizedRole === "transport_manager" ||
    normalizedRole === "transport-manager" ||
    normalizedRole === "transportmanager";
  if (isExplicitTransportManager) {
    return true;
  }
  // Prevent Bus Drivers whose department is "Transport" from being misclassified as Transport Managers.
  if (isDriverRole(role, user)) {
    return false;
  }
  if (user && typeof user === "object") {
    const userRole = String(user.role || "").trim().toLowerCase();
    if (
      userRole.includes("transport") ||
      userRole === "transport_manager" ||
      userRole === "transport-manager" ||
      userRole === "transportmanager"
    ) {
      return true;
    }
    const designation = String(user.designation || user.Designation || user.designationName || "").trim().toLowerCase();
    if (designation.includes("transport")) {
      return true;
    }
    const department = String(user.department || user.Department || user.departmentName || "").trim().toLowerCase();
    if (department.includes("transport")) {
      return true;
    }
    if (user.roleType === "transport_manager") {
      return true;
    }
    const roleCodes = Array.isArray(user.roleCodes) ? user.roleCodes : [user.roleCodes];
    if (roleCodes.some((rc) => String(rc || "").toLowerCase().includes("transport"))) {
      return true;
    }
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    if (
      roles.some((r) => {
        if (typeof r === "string") return r.toLowerCase().includes("transport");
        if (r && typeof r === "object") {
          return (
            String(r.code || "").toLowerCase().includes("transport") ||
            String(r.name || "").toLowerCase().includes("transport") ||
            String(r.role || "").toLowerCase().includes("transport")
          );
        }
        return false;
      })
    ) {
      return true;
    }
  }
  return false;
}

export function isDeanRole(role, user) {
  return [role, user?.role, user?.roleCode, user?.roleName].some((val) => {
    const norm = normalizeRoleToken(val);
    return norm === "dean" || norm.includes("dean");
  });
}

export function isGeneralStaffDashboardRole(role, user) {
  const targets = new Set([
    "office_staff",
    "admission_staff",
    "lab_assistant",
    "librarian",
    "placement_officer",
    "training_placement",
  ]);
  return [role, user?.role, user?.roleCode, user?.roleName].some((val) => {
    const norm = normalizeRoleToken(val);
    return targets.has(norm) || norm.includes("librar") || norm.includes("placement");
  });
}

export function isNonTeachingRole(role, user) {
  // Explicitly exclude specific known roles and admins so they are never hijacked into non-teaching portal
  if (user?.isAdmin || isAdminRole(role) || (user && isAdminRole(user.role))) return false;
  if (isPrincipalRole(role) || (user && isPrincipalRole(user.role))) return false;
  if (isAccountantRole(role) || (user && isAccountantRole(user.role))) return false;
  if (isExamCellRole(role) || (user && isExamCellRole(user.role))) return false;
  if (isWardenRole(role, user)) return false;
  if (isTransportManagerRole(role, user)) return false;
  if (isInventoryRole(role, user)) return false;
  if (isDriverRole(role, user)) return false;
  if (isDeanRole(role, user)) return false;
  if (isParentRole(role) || (user && isParentRole(user.role)) || user?.roleType === "parent") return false;
  if (isStudentRole(role) || (user && isStudentRole(user.role)) || user?.roleType === "student") return false;

  const check = (val) => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    const clean = s.replace(/[-_\s]/g, "");
    return (
      clean === "nonteaching" ||
      clean === "nonteachingstaff" ||
      clean === "receptionist" ||
      s.includes("reception") ||
      clean === "sportsmanager" ||
      clean === "sportmanager" ||
      s.includes("sport")
    );
  };
  if (check(role)) return true;
  if (user && typeof user === "object") {
    if (check(user.role)) return true;
    if (check(user.roleType)) return true;
    if (check(user.roleName)) return true;
    if (check(user.designation)) return true;
    const st = String(user.staffType || user.StaffType || user.roleStaffType || "").trim().toLowerCase();
    if (st.includes("non")) return true;
    const userRoleStr = String(user.role || "").trim().toLowerCase();
    if (userRoleStr === "staff" && check(user.staffType)) return true;
  }
  return false;
}

function isFacultyOrStaffRole(role, user) {
  if (
    isWardenRole(role, user) ||
    isTransportManagerRole(role, user) ||
    isInventoryRole(role, user) ||
    isDriverRole(role, user) ||
    isDeanRole(role, user) ||
    isGeneralStaffDashboardRole(role, user)
  ) {
    return false;
  }
  const normalized = String(role || "").trim().toLowerCase();
  const normToken = normalizeRoleToken(role);
  if (
    normalized.includes("warden") ||
    normToken === "non_teaching" ||
    normToken === "nonteaching" ||
    normToken === "non_teaching_staff" ||
    normToken === "office_staff" ||
    normToken === "admission_staff" ||
    normToken === "attendant" ||
    normToken === "unassigned" ||
    normalized.includes("sport") ||
    normalized.includes("reception")
  ) {
    return false;
  }
  return (
    normalized === "faculty" ||
    normalized === "staff" ||
    normalized === "teacher" ||
    normalized === "teaching" ||
    normalized === "lecturer" ||
    normalized === "hod" ||
    normalized.includes("faculty") ||
    normalized.includes("teacher") ||
    normalized.includes("lecturer")
  );
}

function isPrincipalRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "principal" || normalized.includes("principal");
}

function isParentRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "parent" || normalized.includes("parent");
}

function isAccountantRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized.includes("accountant") || normalized.includes("accounting") || normalized === "finance" || normalized === "cashier";
}

function isAdminRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized.includes("admin");
}

function isStudentRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "student" || normalized.includes("student");
}

function hasAnyViewPermission(permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  return permissions.some(
    (p) =>
      Boolean(p?.canView ?? p?.CanView) ||
      (Array.isArray(p?.actions) && p.actions.some((a) => String(a).toLowerCase() === "view")) ||
      (Array.isArray(p?.screens) && p.screens.some((s) => Array.isArray(s?.actions) && s.actions.some((a) => String(a).toLowerCase() === "view"))),
  );
}

export function resolveHomePortalPath(role, user, permissionsOverride = null) {
  const effectiveRole = role || user?.role || user?.roleCode || user?.staffType || "";
  if (hasRole("SUPER_ADMIN", user)) return "/super-admin/dashboard";

  const isAdmin =
    (user?.isAdmin || user?.roleType === "admin" || isAdminRole(effectiveRole)) &&
    !isWardenRole(effectiveRole, user) &&
    !isTransportManagerRole(effectiveRole, user) &&
    !isInventoryRole(effectiveRole, user) &&
    !isDriverRole(effectiveRole, user);

  if (isAdmin) return "/admin-dashboard";
  if (isTransportManagerRole(effectiveRole, user)) return "/transport-manager/overview";
  if (isWardenRole(effectiveRole, user)) return "/warden-dashboard";
  if (isInventoryRole(effectiveRole, user)) return "/inventory-dashboard";
  if (isDriverRole(effectiveRole, user)) return "/driver";
  if (user?.roleType === "examcell" || isExamCellRole(effectiveRole) || (user && isExamCellRole(user.role))) return "/exam-cell-dashboard";
  if (user?.roleType === "principal" || isPrincipalRole(effectiveRole) || (user && isPrincipalRole(user.role))) return "/principal-dashboard";
  if (user?.roleType === "accountant" || isAccountantRole(effectiveRole) || (user && isAccountantRole(user.role))) return "/accountant-dashboard";
  if (isDeanRole(effectiveRole, user)) return "/admin-dashboard";

  const perms = permissionsOverride ?? user?.permissions ?? user?.rolePermissions;
  const hasAdminModuleGrants = hasAnyViewPermission(perms);

  if (isGeneralStaffDashboardRole(effectiveRole, user)) {
    if (hasAdminModuleGrants) return "/admin-dashboard";
    const st = String(user?.staffType || user?.StaffType || user?.roleStaffType || "").trim().toLowerCase();
    if (st.includes("non")) return "/non-teaching-dashboard";
    return "/admin-dashboard";
  }

  if (isNonTeachingRole(effectiveRole, user)) return "/non-teaching-dashboard";
  if (isFacultyOrStaffRole(effectiveRole, user)) return "/faculty-dashboard";
  if (user?.roleType === "parent" || isParentRole(effectiveRole) || (user && isParentRole(user.role))) return "/parent-dashboard";
  if (user?.roleType === "student" || isStudentRole(effectiveRole) || (user && isStudentRole(user.role))) return "/student-dashboard";

  // Unmapped roles (e.g. ATTENDANT, UNASSIGNED, custom roles) resolve to /admin-dashboard so ProtectedRoute
  // can grant access when modules are assigned or cleanly render AccessDeniedView without bouncing.
  return "/admin-dashboard";
}

export function AccessDeniedView({ module, screen, action }) {
  const navigate = useNavigate();
  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  const homePath = resolveHomePortalPath(role, user);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      padding: "2rem",
      textAlign: "center"
    }}>
      <div style={{
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        background: "#fee2e2",
        color: "#dc2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "1.5rem",
        fontSize: "28px"
      }}>
        🛡️
      </div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "#1e293b" }}>
        Access Restricted
      </h2>
      <p style={{ maxWidth: "480px", color: "#64748b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        You do not have permission to access <strong>{screen || module || "this resource"}</strong>.
        Please contact your administrator if you require access.
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={() => navigate(homePath, { replace: true })}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            border: "none",
            background: "var(--cms-primary, #4361ee)",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireStudent = false,
  requireParent = false,
  requireAccountant = false,
  requirePrincipal = false,
  requireFaculty = false,
  requireExamCell = false,
  requireWarden = false,
  requireNonTeaching = false,
  requireTransportManager = false,
  requireDriver = false,
  requireInventory = false,
  requiredModule = null,
  requiredScreen = null,
  requiredAction = ACTIONS.VIEW,
}) {
  const location = useLocation();

  // Discard sessions created by the removed local preview login.
  const storedToken = getAuthToken();
  const isPreview = storedToken === "exam-cell-local-preview" || /^(demo-|mock-)/.test(storedToken);
  if (isPreview) clearAuthSession();
  const token = isPreview ? "" : storedToken;
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenExpired = Boolean(tokenState?.isJwt && tokenState?.isExpired);

  const {
    permissions: effectivePermissions,
    loading: permsLoading,
    hasFetched: permsHasFetched,
    user: effectiveUser,
  } = useEffectivePermissions();

  useEffect(() => {
    if (token && !isTokenExpired) {
      syncUserTheme().catch(() => {});
    }
  }, [token, isTokenExpired]);

  if (!token || isTokenExpired) {
    if (isTokenExpired) clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const user = effectiveUser || getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  if (!user && !role) {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = hasRole("SUPER_ADMIN", user);
  const isAdmin =
    (isSuperAdmin || user?.isAdmin || isAdminRole(role)) &&
    !isWardenRole(role, user) &&
    !isTransportManagerRole(role, user) &&
    !isInventoryRole(role, user) &&
    !isDriverRole(role, user);
  const isTransportManager = !isAdmin && isTransportManagerRole(role, user);
  const isWarden = !isAdmin && !isTransportManager && isWardenRole(role, user);
  const isInventory = !isAdmin && !isTransportManager && !isWarden && isInventoryRole(role, user);
  const isDriver = !isAdmin && !isTransportManager && !isWarden && !isInventory && isDriverRole(role, user);
  const isPrincipal = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && isPrincipalRole(role);
  const isAccountant = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && isAccountantRole(role);
  const isExamCell = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && isExamCellRole(role);
  const isDean = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && !isPrincipal && !isAccountant && !isExamCell && isDeanRole(role, user);
  const isNonTeaching = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && !isPrincipal && !isAccountant && !isExamCell && !isDean && isNonTeachingRole(role, user);
  const isFaculty = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && !isPrincipal && !isAccountant && !isExamCell && !isDean && !isNonTeaching && isFacultyOrStaffRole(role, user);
  const isParent = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && isParentRole(role);
  const isStudent = !isAdmin && !isWarden && !isTransportManager && !isInventory && !isDriver && isStudentRole(role);

  const livePermissions = permsHasFetched
    ? effectivePermissions
    : (effectivePermissions?.length ? effectivePermissions : (user?.permissions ?? user?.rolePermissions ?? []));

  const isWaitingForInitialPermissions = Boolean(
    !isSuperAdmin &&
    !isAdmin &&
    permsLoading &&
    !permsHasFetched &&
    (!Array.isArray(livePermissions) || livePermissions.length === 0),
  );

  const isExplicitlyAllowedModule = Boolean(requiredModule && can(requiredModule, requiredAction, livePermissions, user, requiredScreen));
  const hasGrantedDashboardAccess = hasAnyViewPermission(livePermissions);
  const canAccessDashboardParentRoute = Boolean(
    requireAdmin && !isStudent && !isParent && (isAdmin || isPrincipal || isExplicitlyAllowedModule || hasGrantedDashboardAccess),
  );

  // Wait for initial permission load before prematurely denying or redirecting on permission-dependent routes.
  if (isWaitingForInitialPermissions && (requiredModule || (requireAdmin && !isAdmin && !isPrincipal && !isStudent && !isParent))) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "#64748b", fontSize: "0.9rem" }}>
        Verifying permissions...
      </div>
    );
  }

  const redirectToHomeOrDeny = (blockedModule) => {
    const homePath = resolveHomePortalPath(role, user, livePermissions);
    if (
      !homePath ||
      location.pathname === homePath ||
      location.pathname.startsWith(`${homePath}/`) ||
      (requireAdmin && (homePath === "/admin-dashboard" || homePath === "/dashboard"))
    ) {
      return <AccessDeniedView module={blockedModule || requiredModule || "this resource"} screen={requiredScreen} action={requiredAction} />;
    }
    return <Navigate to={homePath} replace />;
  };

  // Inventory Manager check (never redirect when already inside /inventory-dashboard)
  if (requireInventory && !isInventory && !isAdmin) {
    return redirectToHomeOrDeny("inventory-management");
  }
  if (
    isInventory &&
    !location.pathname.startsWith("/inventory-dashboard") &&
    !canAccessDashboardParentRoute &&
    (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireWarden || requireNonTeaching || requireTransportManager || requireDriver)
  ) {
    return <Navigate to="/inventory-dashboard" replace />;
  }

  // Driver check
  if (requireDriver && !isDriver && !isAdmin) {
    return redirectToHomeOrDeny("driver-portal");
  }
  if (
    isDriver &&
    !location.pathname.startsWith("/driver") &&
    !canAccessDashboardParentRoute &&
    (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireWarden || requireNonTeaching || requireTransportManager || requireInventory)
  ) {
    return <Navigate to="/driver" replace />;
  }

  // Transport Manager check
  if (requireTransportManager && !isTransportManager && !isAdmin) {
    return redirectToHomeOrDeny("transport");
  }

  // If a Transport Manager attempts to access routes restricted to other roles, redirect them to transport manager overview
  if (isTransportManager && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireWarden || requireNonTeaching || requireDriver || requireInventory)) {
    return <Navigate to="/transport-manager/overview" replace />;
  }

  // Non-Teaching check
  if (requireNonTeaching && !isNonTeaching && !isAdmin && !isPrincipal) {
    return redirectToHomeOrDeny("non-teaching-dashboard");
  }

  // If a Non-Teaching Staff attempts to access other restricted dashboards, redirect to non-teaching dashboard
  if (isNonTeaching && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireWarden || requireTransportManager || requireDriver || requireInventory)) {
    return <Navigate to="/non-teaching-dashboard" replace />;
  }

  // Warden check
  if (requireWarden && !isWarden && !isAdmin) {
    return redirectToHomeOrDeny("hostel-management");
  }

  // If a Warden attempts to access routes restricted to other roles, redirect them to warden dashboard
  if (isWarden && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireTransportManager || requireDriver || requireInventory)) {
    return <Navigate to="/warden-dashboard" replace />;
  }

  if (requireExamCell && !isExamCell && !isAdmin && !isPrincipal) {
    return redirectToHomeOrDeny("examination");
  }
  if (isExamCell && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireWarden || requireTransportManager || requireDriver || requireInventory)) {
    return <Navigate to="/exam-cell-dashboard" replace />;
  }

  if (requireFaculty && !isFaculty) {
    return redirectToHomeOrDeny("faculty-portal");
  }
  if (requireAdmin && !canAccessDashboardParentRoute && !isAdmin && !isPrincipal) {
    return redirectToHomeOrDeny("dashboard");
  }
  if (requirePrincipal && !isPrincipal) {
    return redirectToHomeOrDeny("principal-dashboard");
  }
  if (requireStudent && !isStudent) {
    return redirectToHomeOrDeny("student-dashboard");
  }

  if (requireParent && !isParent && !isAdmin) {
    return redirectToHomeOrDeny("parent-dashboard");
  }
  if (requireAccountant && !isAccountant) {
    return redirectToHomeOrDeny("accountant-dashboard");
  }

  // Fine-grained RBAC Module & Screen permission check
  if (requiredModule && !isSuperAdmin) {
    const hasPermission = can(requiredModule, requiredAction, livePermissions, user, requiredScreen);
    if (!hasPermission) {
      return <AccessDeniedView module={requiredModule} screen={requiredScreen} action={requiredAction} />;
    }
  }

  return children || <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  if (getPlatformSession()) return <Navigate to="/super-admin/dashboard" replace />;
  // Discard sessions created by the removed local preview login.
  const storedToken = getAuthToken();
  const isPreview = storedToken === "exam-cell-local-preview" || /^(demo-|mock-)/.test(storedToken);
  if (isPreview) clearAuthSession();
  const token = isPreview ? "" : storedToken;
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenValid = Boolean(token && (!tokenState?.isJwt || !tokenState?.isExpired));

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;

  if (isTokenValid && (user || role)) {
    const homePath = resolveHomePortalPath(role, user);
    return <Navigate to={homePath} replace />;
  }

  // If a valid token exists but there is no user and no role, clear orphan token
  if (isTokenValid && !user && !role) {
    clearAuthSession();
  }

  return children || <Outlet />;
}
