import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAuthSession, getAuthItem, getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";
import { useEffectivePermissions } from "@/features/rolesPermissions/EffectivePermissionsContext.jsx";
import { getModuleKeyForPath } from "@/features/rolesPermissions/permissionRoutes.js";

function isFacultyRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "faculty" || normalized === "hod" || normalized === "lecturer" || normalized === "teacher" || normalized.includes("faculty");
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

function AccessDenied() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ maxWidth: 420, textAlign: "center" }}>
        <h1>Access denied</h1>
        <p>You do not have permission to view this module.</p>
      </section>
    </main>
  );
}

export default function ProtectedRoute({ children, requireAdmin = false, requireFaculty = false, requireStudent = false, requireParent = false, requireAccountant = false, requirePrincipal = false }) {
  const location = useLocation();
  const { status: permissionStatus, canAccess } = useEffectivePermissions();
  const token = getAuthToken();
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenExpired = Boolean(tokenState?.isJwt && tokenState?.isExpired);

  if (!token || isTokenExpired) {
    if (isTokenExpired) clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);
  if (requireAdmin && !isAdmin && !isPrincipal) {
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    return <Navigate to={isFaculty ? "/faculty-dashboard" : "/student-dashboard"} replace />;
  }
  if (requirePrincipal && !isPrincipal) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireFaculty && !isFaculty) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireStudent && (isAdmin || isPrincipal)) return <Navigate to={isPrincipal ? "/principal-dashboard" : "/dashboard"} replace />;
  if (requireStudent && isAccountant) return <Navigate to="/accountant-dashboard" replace />;
  if (requireStudent && isFaculty) return <Navigate to="/faculty-dashboard" replace />;
  if (requireStudent && isParent) return <Navigate to="/parent-dashboard" replace />;

  if (requireParent && !isParent) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  if (requireAccountant && !isAccountant) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }

  const moduleKey = getModuleKeyForPath(location.pathname);
  if (!isAdmin && moduleKey) {
    if (permissionStatus === "idle" || permissionStatus === "loading") {
      return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Loading permissions...</main>;
    }
    if (permissionStatus !== "ready" || !canAccess(moduleKey)) return <AccessDenied />;
  }

  return children || <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  const token = getAuthToken();
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenValid = Boolean(token && (!tokenState?.isJwt || !tokenState?.isExpired));

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);

  if (isTokenValid) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (!isFaculty) return <Navigate to="/student-dashboard" replace />;
  }
  return children || <Outlet />;
}

function isAdminRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized.includes("admin");
}


