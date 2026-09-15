import { Navigate, Outlet } from "react-router-dom";
import { getAuthItem, getAuthToken, getAuthUser } from "@/features/authStorage.js";

export default function ProtectedRoute({ children, requireAdmin = false, requireStudent = false }) {
  const token = getAuthToken();
  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role;
  const isAdmin = user?.isAdmin || isAdminRole(role);

  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/student-dashboard" replace />;
  if (requireStudent && isAdmin) return <Navigate to="/dashboard" replace />;

  return children || <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  const token = getAuthToken();
  const user = getAuthUser();
  const role = getAuthItem("role") || user?.role;
  const isAdmin = user?.isAdmin || isAdminRole(role);

  if (token) return <Navigate to={isAdmin ? "/dashboard" : "/student-dashboard"} replace />;
  return children || <Outlet />;
}

function isAdminRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "super admin";
}


