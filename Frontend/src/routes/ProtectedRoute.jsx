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

export function isNonTeachingRole(role, user) {
  const normalized = String(role || "").trim().toLowerCase();
  if (
    normalized === "non_teaching_staff" ||
    normalized === "non-teaching" ||
    normalized === "non-teaching-staff" ||
    normalized === "nonteaching" ||
    normalized === "non_teaching"
  ) {
    return true;
  }
  if (user && typeof user === "object") {
    const userRole = String(user.role || "").trim().toLowerCase();
    if (
      userRole === "non_teaching_staff" ||
      userRole === "non-teaching" ||
      userRole === "non-teaching-staff" ||
      userRole === "nonteaching" ||
      userRole === "non_teaching"
    ) {
      return true;
    }
    const staffType = String(user.staffType || user.type || "").trim().toLowerCase();
    if (staffType === "non-teaching" || staffType === "nonteaching") {
      return true;
    }
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

<<<<<<< HEAD
function isStudentRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "student" || normalized.includes("student");
=======
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
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
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
  requiredModule = null,
  requiredScreen = null,
  requiredAction = ACTIONS.VIEW,
}) {
  // Discard sessions created by the removed local preview login.
  const storedToken = getAuthToken();
  if (storedToken === "exam-cell-local-preview") clearAuthSession();
  const token = storedToken === "exam-cell-local-preview" ? "" : storedToken;
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenExpired = Boolean(tokenState?.isJwt && tokenState?.isExpired);

  if (!token || isTokenExpired) {
    if (isTokenExpired) clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
<<<<<<< HEAD
  if (!user && !role) {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyOrStaffRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);
  const isStudent = isStudentRole(role);
=======
  const isWarden = isWardenRole(role, user);
  const isNonTeaching = !isWarden && isNonTeachingRole(role, user);
  const isAdmin = (user?.isAdmin || isAdminRole(role)) && !isWarden && !isNonTeaching;
  const isFaculty = !isWarden && !isNonTeaching && isFacultyOrStaffRole(role);
  const isPrincipal = !isWarden && isPrincipalRole(role);
  const isParent = !isWarden && isParentRole(role);
  const isAccountant = !isWarden && isAccountantRole(role);
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402

  const isExamCell = !isWarden && isExamCellRole(role);

  // Non-Teaching check
  if (requireNonTeaching && !isNonTeaching && !isAdmin) {
    const destination = isWarden
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
  if (isNonTeaching && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell || requireWarden)) {
    return <Navigate to="/non-teaching-dashboard" replace />;
  }

  // Warden check
  if (requireWarden && !isWarden && !isAdmin) {
    const destination = isPrincipal
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
  if (isWarden && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireExamCell)) {
    return <Navigate to="/warden-dashboard" replace />;
  }

  if (requireExamCell && !isExamCell) {
    const destination = isWarden
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
  if (isExamCell && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal || requireWarden)) {
    return <Navigate to="/exam-cell-dashboard" replace />;
  }

  if (requireFaculty && !isFaculty) {
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireAdmin && !isAdmin && !isPrincipal) {
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    return <Navigate to={isFaculty ? "/faculty-dashboard" : "/student-dashboard"} replace />;
  }
  if (requirePrincipal && !isPrincipal) {
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
<<<<<<< HEAD
  if (requireStudent && !isStudent) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isExamCell) return <Navigate to="/exam-cell-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
=======
  if (requireStudent && isWarden) return <Navigate to="/warden-dashboard" replace />;
  if (requireStudent && (isAdmin || isPrincipal)) return <Navigate to={isPrincipal ? "/principal-dashboard" : "/dashboard"} replace />;
  if (requireStudent && isAccountant) return <Navigate to="/accountant-dashboard" replace />;
  if (requireStudent && isFaculty) return <Navigate to="/faculty-dashboard" replace />;
  if (requireStudent && isParent) return <Navigate to="/parent-dashboard" replace />;
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402

  if (requireParent && !isParent && !isAdmin) {
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireAccountant && !isAccountant) {
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
  if (storedToken === "exam-cell-local-preview") clearAuthSession();
  const token = storedToken === "exam-cell-local-preview" ? "" : storedToken;
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenValid = Boolean(token && (!tokenState?.isJwt || !tokenState?.isExpired));

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
<<<<<<< HEAD
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyOrStaffRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);
  const isStudent = isStudentRole(role);

  if (isTokenValid && (user || role)) {
=======
  const isWarden = isWardenRole(role, user);
  const isNonTeaching = !isWarden && isNonTeachingRole(role, user);
  const isAdmin = (user?.isAdmin || isAdminRole(role)) && !isWarden && !isNonTeaching;
  const isFaculty = !isWarden && !isNonTeaching && isFacultyOrStaffRole(role);
  const isPrincipal = !isWarden && isPrincipalRole(role);
  const isParent = !isWarden && isParentRole(role);
  const isAccountant = !isWarden && isAccountantRole(role);

  if (isTokenValid) {
    if (isWarden) return <Navigate to="/warden-dashboard" replace />;
    if (isNonTeaching) return <Navigate to="/non-teaching-dashboard" replace />;
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
    if (isExamCellRole(role)) return <Navigate to="/exam-cell-dashboard" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    if (isStudent) return <Navigate to="/student-dashboard" replace />;
    if (user?.isAdmin) return <Navigate to="/dashboard" replace />;
  }

  // If a valid token exists but there is no user and no role, clear orphan token
  if (isTokenValid && !user && !role) {
    clearAuthSession();
  }

  return children || <Outlet />;
}



