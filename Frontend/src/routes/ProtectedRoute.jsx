import { Navigate, Outlet } from "react-router-dom";
import { clearAuthSession, getAuthItem, getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";

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

export default function ProtectedRoute({ children, requireAdmin = false, requireStudent = false, requireParent = false, requireAccountant = false, requirePrincipal = false }) {
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


