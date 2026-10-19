import { getAuthToken, getAuthUser, clearAuthSession } from "@/features/authStorage.js";
export function inventorySession() {
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
