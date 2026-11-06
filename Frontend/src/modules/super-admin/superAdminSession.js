import { getAuthToken, getAuthUser } from "@/modules/auth/authStorage.js";

const SESSION_KEY = "pirnav-super-admin-preview-session-v1";
export const previewEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_SUPER_ADMIN_PREVIEW === "true";
export const previewEmail = previewEnabled ? String(import.meta.env.VITE_SUPER_ADMIN_PREVIEW_EMAIL || "").trim().toLowerCase() : "";
export const isSuperAdminRole = (value) => String(value || "").replace(/[\s_-]/g, "").toLowerCase() === "superadmin";

export async function loginPreview(email, password) {
  if (!previewEnabled || !previewEmail) throw new Error("Super Admin preview is not configured.");
  const expected = String(import.meta.env.VITE_SUPER_ADMIN_PREVIEW_PASSWORD_SHA256 || "").toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (!/^[a-f0-9]{64}$/.test(expected) || email.trim().toLowerCase() !== previewEmail || actual !== expected) throw new Error("Invalid preview email or password.");
  const session = { preview: true, role: "SuperAdmin", name: "Platform Owner", email: previewEmail, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getPlatformSession() {
  if (previewEnabled) {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (session?.preview === true && session.email === previewEmail && isSuperAdminRole(session.role) && session.expiresAt > Date.now()) return session;
    } catch { /* Invalid preview sessions never grant access. */ }
  }
  try {
    const token = getAuthToken();
    if (!token || token.split(".").length !== 3) return null;
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    const roles = [claims.role, claims.Role, claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]].flat();
    if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() || !roles.some(isSuperAdminRole)) return null;
    const user = getAuthUser();
    return { preview: false, role: "SuperAdmin", name: user?.fullName || user?.name || "Super Admin", email: user?.email || "", expiresAt: claims.exp * 1000 };
  } catch { return null; }
}

export function logoutPreview() { sessionStorage.removeItem(SESSION_KEY); }
