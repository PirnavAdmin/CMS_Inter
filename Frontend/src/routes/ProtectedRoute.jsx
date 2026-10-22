import { Navigate, Outlet } from "react-router-dom";
import { clearAuthSession, getAuthItem, getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";
import { isExamCellRole } from "@/Dashboard/ExamCellDashboard/navigation.js";

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

function isStudentRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "student" || normalized.includes("student");
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

  const isExamCell = isExamCellRole(role);
  if (requireExamCell && !isExamCell) {
    const destination = isAdmin ? "/dashboard" : isPrincipal ? "/principal-dashboard" : isAccountant ? "/accountant-dashboard" : isParent ? "/parent-dashboard" : isFaculty ? "/faculty-dashboard" : "/student-dashboard";
    return <Navigate to={destination} replace />;
  }
  if (isExamCell && (requireAdmin || requireFaculty || requireStudent || requireParent || requireAccountant || requirePrincipal)) {
    return <Navigate to="/exam-cell-dashboard" replace />;
  }

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
  if (requireStudent && !isStudent) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isPrincipal) return <Navigate to="/principal-dashboard" replace />;
    if (isAccountant) return <Navigate to="/accountant-dashboard" replace />;
    if (isFaculty) return <Navigate to="/faculty-dashboard" replace />;
    if (isParent) return <Navigate to="/parent-dashboard" replace />;
    if (isExamCell) return <Navigate to="/exam-cell-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

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
  // Discard sessions created by the removed local preview login.
  const storedToken = getAuthToken();
  if (storedToken === "exam-cell-local-preview") clearAuthSession();
  const token = storedToken === "exam-cell-local-preview" ? "" : storedToken;
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenValid = Boolean(token && (!tokenState?.isJwt || !tokenState?.isExpired));

  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyOrStaffRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);
  const isStudent = isStudentRole(role);

  if (isTokenValid && (user || role)) {
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



