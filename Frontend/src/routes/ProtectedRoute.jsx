import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAuthSession, getAuthItem, getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";
import { ACTIONS } from "@/features/rolesPermissions/rolesPermissions.constants.js";
import { useEffectivePermissions } from "@/features/rolesPermissions/useEffectivePermissions.js";

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

const PRINCIPAL_DASHBOARD_ROUTE_RULES = [
  ["/dashboard/settings/roles-permissions", "roles-permissions"],
  ["/dashboard/settings", "settings"],
  ["/dashboard/board-academic-year", "settings"],
  ["/dashboard/courses", "group-management"],
  ["/dashboard/subjects", "subject-management"],
  ["/dashboard/sections", "section-room"],
  ["/dashboard/timetable", "timetable"],
  ["/dashboard/holidays", "holiday-management"],
  ["/dashboard/inventory-management", "inventory-management"],
  ["/dashboard/inventory", "inventory-management"],
  ["/dashboard/admission", "student-admission"],
  ["/dashboard/students", "student-management"],
  ["/dashboard/section-allocation", "section-allocation"],
  ["/dashboard/attendance/staff", "staff-attendance"],
  ["/dashboard/attendance/student", "attendance"],
  ["/dashboard/attendance", "attendance"],
  ["/dashboard/promotion", "promotion"],
  ["/dashboard/promotions", "promotion"],
  ["/dashboard/transport", "transport"],
  ["/dashboard/staff", "staff-management"],
  ["/dashboard/departments", "department-designation"],
  ["/dashboard/designations", "department-designation"],
  ["/dashboard/leave-management", "staff-leave-management"],
  ["/dashboard/reimbursements", "reimbursement"],
  ["/dashboard/reimbursement", "reimbursement"],
  ["/dashboard/finance/reimbursement", "reimbursement"],
  ["/dashboard/examinations", "examination"],
  ["/dashboard/marks-entry", "marks-evaluation"],
  ["/dashboard/results", "results"],
  ["/dashboard/fee-structure", "fee-management"],
  ["/dashboard/payroll", "payroll"],
  ["/dashboard/staff-salary", "payroll"],
  ["/dashboard/certificates", "certificates"],
  ["/dashboard/reports", "reports-analytics"],
  ["/dashboard/hostel", "hostel-management"],
  ["/hostel", "hostel-management"],
  ["/dashboard", "dashboard"],
];

function principalPermissionForPath(pathname) {
  const match = PRINCIPAL_DASHBOARD_ROUTE_RULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!match) return null;
  const action = /\/add(?:\/|$)|\/generate(?:\/|$)|\/upload(?:\/|$)|\/import(?:\/|$)/.test(pathname)
    ? ACTIONS.CREATE
    : /\/edit(?:\/|$)/.test(pathname)
      ? ACTIONS.EDIT
      : ACTIONS.VIEW;
  return { moduleKey: match[1], action };
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
  const location = useLocation();
  const token = getAuthToken();
  const tokenState = token ? getJwtExpiryState(token) : null;
  const isTokenExpired = Boolean(tokenState?.isJwt && tokenState?.isExpired);
  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role || user?.staffType;
  const isAdmin = user?.isAdmin || isAdminRole(role);
  const isFaculty = isFacultyOrStaffRole(role);
  const isPrincipal = isPrincipalRole(role);
  const isParent = isParentRole(role);
  const isAccountant = isAccountantRole(role);
  const principalPermissions = useEffectivePermissions({ enabled: requireAdmin && isPrincipal });

  if (!token || isTokenExpired) {
    if (isTokenExpired) clearAuthSession();
    return <Navigate to="/login" replace />;
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
  if (requireAdmin && isPrincipal && !isAdmin) {
    if (location.pathname === "/dashboard") return <Navigate to="/principal-dashboard" replace />;
    const requiredPermission = principalPermissionForPath(location.pathname);
    if (!requiredPermission) return <Navigate to="/principal-dashboard" replace />;
    if (principalPermissions.loading) return null;
    if (principalPermissions.error) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Permissions unavailable</h2>
          <p>{principalPermissions.error}</p>
          <button type="button" onClick={principalPermissions.refresh}>Retry</button>
        </div>
      );
    }
    if (!principalPermissions.canDo(requiredPermission.moduleKey, requiredPermission.action)) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Access denied</h2>
          <p>You do not have permission to open this module.</p>
        </div>
      );
    }
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



