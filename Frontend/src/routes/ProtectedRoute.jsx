import { Navigate, Outlet } from "react-router-dom";
import { clearAuthSession, getAuthItem, getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";

function isFacultyOrStaffRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return (
    normalized === "faculty" ||
    normalized === "staff" ||
    normalized === "teacher" ||
    normalized === "teaching" ||
    normalized === "non-teaching" ||
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

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireStudent = false,
  requireParent = false,
  requireAccountant = false,
  requirePrincipal = false,
  requireFaculty = false,
}) {
  const token = getAuthToken();
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenExpired = Boolean(tokenState?.isJwt && tokenState?.isExpired);

  if (!token || isTokenExpired) {
    if (isTokenExpired) clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyOrStaffRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);

  if (requireFaculty && !isFaculty) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }

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
  if (requireStudent && (isAdmin || isPrincipal)) return <Navigate to={isPrincipal ? "/principal-dashboard" : "/dashboard"} replace />;
  if (requireStudent && isAccountant) return <Navigate to="/accountant-dashboard" replace />;
  if (requireStudent && isFaculty) return <Navigate to="/faculty-dashboard" replace />;
  if (requireStudent && isParent) return <Navigate to="/parent-dashboard" replace />;

  if (requireParent && !isParent && !isAdmin) {
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

  return children || <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  const token = getAuthToken();
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenValid = Boolean(token && (!tokenState?.isJwt || !tokenState?.isExpired));

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyOrStaffRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);

  if (isTokenValid) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  return children || <Outlet />;
}



