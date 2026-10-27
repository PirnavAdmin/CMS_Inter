import { getAuthToken, getAuthUser, clearAuthSession } from "@/modules/auth/authStorage.js";
import { getJwtExpiryState } from "@/api/apiClient.js";
export function inventorySession() {
  const token = getAuthToken();
  if (/^(demo-|mock-)/.test(token) || getJwtExpiryState(token).isExpired) {
    clearAuthSession();
    return null;
  }
  const user = getAuthUser(),
    role = String(user?.role || "").toLowerCase();
  return getAuthToken() &&
    (role.includes("inventory") || ["store manager", "storekeeper"].includes(role))
    ? user
    : null;
}
export function inventoryLogout() {
  clearAuthSession();
}
