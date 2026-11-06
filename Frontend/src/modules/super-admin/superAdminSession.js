import { getAuthToken, getAuthUser } from "@/modules/auth/authStorage.js";

export const isSuperAdminRole = (value) => String(value || "").replace(/[\s_-]/g, "").toLowerCase() === "superadmin";

export function getPlatformSession() {
  try {
    const token = getAuthToken();
    if (!token || token.split(".").length !== 3) return null;
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    const roles = [claims.role, claims.Role, claims.roles, claims.Roles, claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]]
      .flat()
      .filter(Boolean);
    if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() || !roles.some(isSuperAdminRole)) return null;
    const user = getAuthUser();
    return {
      role: "SuperAdmin",
      name: user?.fullName || user?.name || claims.unique_name || claims.name || "Super Admin",
      email: user?.email || claims.email || claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || "",
      expiresAt: claims.exp * 1000,
    };
  } catch {
    return null;
  }
}
