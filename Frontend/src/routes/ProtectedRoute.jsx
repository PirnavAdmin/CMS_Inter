import { Navigate, Outlet } from "react-router-dom";
import { clearAuthSession, getAuthItem, getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";
import { isExamCellRole } from "@/Dashboard/ExamCellDashboard/navigation.js";
import { can, hasRole } from "@/features/rolesPermissions/permissionUtils.jsx";
import { ACTIONS } from "@/features/rolesPermissions/rolesPermissions.constants.js";

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
  if (
    normalizedRole.includes("transport") ||
    normalizedRole === "transport_manager" ||
    normalizedRole === "transport-manager" ||
    normalizedRole === "transportmanager"
  ) {
    return true;
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

export function isNonTeachingRole(role, user) {
  // Explicitly exclude specific known roles and admins so they are never hijacked into non-teaching portal
  if (user?.isAdmin || isAdminRole(role) || (user && isAdminRole(user.role))) return false;
  if (isPrincipalRole(role) || (user && isPrincipalRole(user.role))) return false;
  if (isAccountantRole(role) || (user && isAccountantRole(user.role))) return false;
  if (isExamCellRole(role) || (user && isExamCellRole(user.role))) return false;
  if (isWardenRole(role, user)) return false;
  if (isTransportManagerRole(role, user)) return false;

  const check = (val) => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    const clean = s.replace(/[-_\s]/g, "");
    return clean === "nonteaching" || clean === "nonteachingstaff";
  };
  if (check(role)) return true;
  if (user && typeof user === "object") {
    if (check(user.role)) return true;
    if (check(user.roleType)) return true;
    // Only check staffType if role is specifically generic "staff"
    const userRoleStr = String(user.role || "").trim().toLowerCase();
    if (userRoleStr === "staff" && check(user.staffType)) return true;
  }
  return false;
}

function isFacultyOrStaffRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized.includes("warden")) return false;
  if (normalized === "non-teaching" || normalized === "nonteaching" || normalized === "non_teaching_staff") return false;
  return (
    normalized === "faculty" ||
    normalized === "staff" ||
    normalized === "teacher" ||
    normalized === "teaching" ||
    normalized === "lecturer" ||
    normalized === "hod" ||
    normalized.includes("faculty") ||
    normalized.includes("staff") ||
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

export function AccessDeniedView({ module, screen, action }) {
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
        <a
          href="/dashboard"
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            background: "var(--cms-primary, #4361ee)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 500
          }}
        >
          Return to Dashboard
        </a>
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
  requiredModule = null,
  requiredScreen = null,
  requiredAction = ACTIONS.VIEW,
}) {
  // Discard sessions created by the removed local preview login.
  const storedToken = getAuthToken();
  const isPreview = storedToken === "exam-cell-local-preview" || /^(demo-|mock-)/.test(storedToken);
  if (isPreview) clearAuthSession();
  const token = isPreview ? "" : storedToken;
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenExpired = Boolean(tokenState?.isJwt && tokenState?.isExpired);

  if (!token || isTokenExpired) {
    if (isTokenExpired) clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  if (!user && !role) {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }
  const isAdmin = (user?.isAdmin || isAdminRole(role)) && !isWardenRole(role, user) && !isTransportManagerRole(role, user);
  const isWarden = !isAdmin && isWardenRole(role, user);
  const isTransportManager = !isAdmin && isTransportManagerRole(role, user);
  const isPrincipal = !isAdmin && !isWarden && !isTransportManager && isPrincipalRole(role);
  const isAccountant = !isAdmin && !isWarden && !isTransportManager && isAccountantRole(role);
  const isExamCell = !isAdmin && !isWarden && !isTransportManager && isExamCellRole(role);
  const isNonTeaching = !isAdmin && !isWarden && !isTransportManager && !isPrincipal && !isAccountant && !isExamCell && isNonTeachingRole(role, user);
  const isFaculty = !isAdmin && !isWarden && !isTransportManager && !isNonTeaching && isFacultyOrStaffRole(role);
  const isParent = !isAdmin && !isWarden && !isTransportManager && isParentRole(role);
  const isStudent = !isAdmin && isStudentRole(role);

  const userPerms = user?.permissions || user?.rolePermissions;
  const isExplicitlyAllowedModule = Boolean(requiredModule && can(requiredModule, requiredAction, undefined, user, requiredScreen));
  const hasGrantedDashboardAccess = Array.isArray(userPerms) && userPerms.some((p) => p?.canView || (Array.isArray(p?.actions) && p.actions.includes("view")));
  const canAccessDashboardParentRoute = Boolean(requireAdmin && (isAdmin || isPrincipal || isExplicitlyAllowedModule || hasGrantedDashboardAccess));

  // Transport Manager check
  if (requireTransportManager && !isTransportManager && !isAdmin) {
    const destination = isWarden
      ? "/warden-dashboard"
      : isNonTeaching
      ? "/non-teaching-dashboard"
      : isPrincipal
      ? "/principal-dashboard"
      : isAccountant
      ? "/accountant-dashboard"
      : isParent
      ? "/parent-dashboard"
      : isFaculty
      ? "/faculty-dashboard"
      : isExamCell
      ? "/exam-cell-dashboard"
      : "/student-dashboard";
    return <Navigate to={destination} replace />;
  }

  // If a Transport Manager attempts to access routes restricted to other roles, redirect them to transport manager overview
  if (isTransportManager && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireWarden || requireNonTeaching)) {
    return <Navigate to="/transport-manager/overview" replace />;
  }

  // Non-Teaching check
  if (requireNonTeaching && !isNonTeaching && !isAdmin && !isPrincipal) {
    const destination = isTransportManager
      ? "/transport-manager/overview"
      : isWarden
      ? "/warden-dashboard"
      : isPrincipal
      ? "/principal-dashboard"
      : isAccountant
      ? "/accountant-dashboard"
      : isParent
      ? "/parent-dashboard"
      : isFaculty
      ? "/faculty-dashboard"
      : isExamCell
      ? "/exam-cell-dashboard"
      : "/student-dashboard";
    return <Navigate to={destination} replace />;
  }

  // If a Non-Teaching Staff attempts to access other restricted dashboards, redirect to non-teaching dashboard
  if (isNonTeaching && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireWarden || requireTransportManager)) {
    return <Navigate to="/non-teaching-dashboard" replace />;
  }

  // Warden check
  if (requireWarden && !isWarden && !isAdmin) {
    const destination = isTransportManager
      ? "/transport-manager/overview"
      : isPrincipal
      ? "/principal-dashboard"
      : isAccountant
      ? "/accountant-dashboard"
      : isParent
      ? "/parent-dashboard"
      : isFaculty
      ? "/faculty-dashboard"
      : isExamCell
      ? "/exam-cell-dashboard"
      : "/student-dashboard";
    return <Navigate to={destination} replace />;
  }

  // If a Warden attempts to access routes restricted to other roles, redirect them to warden dashboard
  if (isWarden && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireTransportManager)) {
    return <Navigate to="/warden-dashboard" replace />;
  }

  if (requireExamCell && !isExamCell && !isAdmin && !isPrincipal) {
    const destination = isTransportManager
      ? "/transport-manager/overview"
      : isWarden
      ? "/warden-dashboard"
      : isAdmin
      ? "/dashboard"
      : isPrincipal
      ? "/principal-dashboard"
      : isAccountant
      ? "/accountant-dashboard"
      : isParent
      ? "/parent-dashboard"
      : isFaculty
      ? "/faculty-dashboard"
      : "/student-dashboard";
    return <Navigate to={destination} replace />;
  }
  if (isExamCell && !canAccessDashboardParentRoute && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireWarden || requireTransportManager)) {
    return <Navigate to="/exam-cell-dashboard" replace />;
  }

  if (requireFaculty && !isFaculty) {
    if (isTransportManager) return <Navigate to="/transport-manager/overview" replace />;
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireAdmin && !canAccessDashboardParentRoute && !isAdmin && !isPrincipal) {
    if (isTransportManager) return <Navigate to="/transport-manager/overview" replace />;
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    return <Navigate to={isFaculty ? "/faculty-dashboard" : "/student-dashboard"} replace />;
  }
  if (requirePrincipal && !isPrincipal) {
    if (isTransportManager) return <Navigate to="/transport-manager/overview" replace />;
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireStudent && !isStudent) {
    if (isTransportManager) return <Navigate to="/transport-manager/overview" replace />;
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAdmin || isPrincipal) return <Navigate to={isPrincipal ? "/principal-dashboard" : "/dashboard"} replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isExamCell) return <Navigate to="/exam-cell-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  if (requireParent && !isParent && !isAdmin) {
    if (isTransportManager) return <Navigate to="/transport-manager/overview" replace />;
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireAccountant && !isAccountant) {
    if (isTransportManager) return <Navigate to="/transport-manager/overview" replace />;
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }

  // Fine-grained RBAC Module & Screen permission check
  if (requiredModule && !hasRole("SUPER_ADMIN", user)) {
    const hasPermission = can(requiredModule, requiredAction, undefined, user, requiredScreen);
    if (!hasPermission) {
      return <AccessDeniedView module={requiredModule} screen={requiredScreen} action={requiredAction} />;
    }
  }

  return children || <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  // Discard sessions created by the removed local preview login.
  const storedToken = getAuthToken();
  const isPreview = storedToken === "exam-cell-local-preview" || /^(demo-|mock-)/.test(storedToken);
  if (isPreview) clearAuthSession();
  const token = isPreview ? "" : storedToken;
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenValid = Boolean(token && (!tokenState?.isJwt || !tokenState?.isExpired));

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  const isAdmin = (user?.isAdmin || isAdminRole(role)) && !isWardenRole(role, user) && !isTransportManagerRole(role, user);
  const isWarden = !isAdmin && isWardenRole(role, user);
  const isTransportManager = !isAdmin && isTransportManagerRole(role, user);
  const isPrincipal = !isAdmin && !isWarden && !isTransportManager && isPrincipalRole(role);
  const isAccountant = !isAdmin && !isWarden && !isTransportManager && isAccountantRole(role);
  const isExamCell = !isAdmin && !isWarden && !isTransportManager && isExamCellRole(role);
  const isNonTeaching = !isAdmin && !isWarden && !isTransportManager && !isPrincipal && !isAccountant && !isExamCell && isNonTeachingRole(role, user);
  const isFaculty = !isAdmin && !isWarden && !isTransportManager && !isNonTeaching && isFacultyOrStaffRole(role);
  const isParent = !isAdmin && !isWarden && !isTransportManager && isParentRole(role);
  const isStudent = !isAdmin && isStudentRole(role);

  if (isTokenValid && (user || role)) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isTransportManager) return <Navigate to="/transport-manager/overview" replace />;
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isExamCell) return <Navigate to="/exam-cell-dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isNonTeaching) return <Navigate to="/non-teaching-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isStudent) return <Navigate to="/student-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // If a valid token exists but there is no user and no role, clear orphan token
  if (isTokenValid && !user && !role) {
    clearAuthSession();
  }

  return children || <Outlet />;
}



