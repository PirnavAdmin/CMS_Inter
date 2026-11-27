import { useEffect, useState } from "react";
import { useCampusContext } from "../../../context/CampusContext.jsx";
import { getAuthUser, getAuthToken } from "../../auth/authStorage.js";
import { landingPageApi } from "../../../api/landingPageApi.js";

export const campusImageFields = [
  ["dashboardLogo", "Dashboard Logo", "Logo in dashboard sidebars", "logo"],
  ["headerLogo", "Home Header Logo", "Logo at the top of the home page", "logo"],
  ["footerLogo", "Home Footer Logo", "Logo in the home-page footer", "logo"],
  ["loginImage", "Login Background", "Background behind the login form", "photo"],
  ["loginLogo", "Login Logo", "College logo above the login-page title", "logo"],
  ["heroImage", "Home Hero Image", "Main image on the home page", "photo"],
];
export const headerBrandDefaults = {
  dashboardTitle: "PIRNAV",
  dashboardSubtitle: "COLLEGE",
  dashboardTagline: "KNOWLEDGE \u2022 DISCIPLINE \u2022 EXCELLENCE",
  dashboardTitleColor: "#1e3a8a",
  dashboardSubtitleColor: "#d4a017",
  dashboardTaglineColor: "#6b7280",
  dashboardTitleSize: "36",
  dashboardTitleWeight: "700",
  dashboardSubtitleWeight: "600",
  dashboardSubtitleSize: "20",
  dashboardTaglineSize: "8",
  dashboardTaglineWeight: "600",
  dashboardSubtitleAlign: "center",
  dashboardTaglineAlign: "center",
  dashboardTitleAlign: "center",
  dashboardLogoSize: "48",
};
export function getHeaderBrand(configuration = {}) {
  const u = getAuthUser();
  const isTenantCollege = Boolean(u?.collegeId && Number(u.collegeId) > 1);
  const tenantName = (u?.collegeName || "").trim();
  const defaultTitle = isTenantCollege && tenantName ? tenantName.toUpperCase() : headerBrandDefaults.dashboardTitle;
  const defaultSubtitle = isTenantCollege && tenantName ? "" : headerBrandDefaults.dashboardSubtitle;
  const defaultTagline = isTenantCollege ? "COLLEGE MANAGEMENT SYSTEM" : headerBrandDefaults.dashboardTagline;

  const boundedSize = (key, min, max) => {
    const value = Number(configuration[key] ?? headerBrandDefaults[key]);
    return String(Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : Number(headerBrandDefaults[key]));
  };
  const color = (key) => /^#[0-9a-f]{6}$/i.test(configuration[key] || "") ? configuration[key] : headerBrandDefaults[key];
  const weight = (key) => ["400", "500", "600", "700", "800"].includes(String(configuration[key])) ? String(configuration[key]) : headerBrandDefaults[key];
  // Preserve custom single-line names saved before the two-line title existed.
  const legacyTitle = configuration.dashboardTitle === "PIRNAV COLLEGE" && configuration.dashboardSubtitle == null;
  return {
    dashboardTitle: String(legacyTitle ? "PIRNAV" : configuration.dashboardTitle ?? defaultTitle),
    dashboardSubtitle: String(configuration.dashboardSubtitle ?? (configuration.dashboardTitle && !legacyTitle ? "" : defaultSubtitle)),
    dashboardTagline: String(configuration.dashboardTagline ?? defaultTagline),
    dashboardTitleColor: color("dashboardTitleColor"),
    dashboardSubtitleColor: color("dashboardSubtitleColor"),
    dashboardTaglineColor: color("dashboardTaglineColor"),
    dashboardTitleSize: boundedSize("dashboardTitleSize", 12, 48),
    dashboardSubtitleSize: configuration.dashboardSubtitleSize == null && configuration.dashboardTitleSize != null ? String(Math.min(48, Math.max(8, Number(boundedSize("dashboardTitleSize", 12, 48)) * 0.55))) : boundedSize("dashboardSubtitleSize", 8, 48),
    dashboardTaglineSize: configuration.dashboardTaglineSize == null && configuration.dashboardTitleSize != null ? String(Math.min(24, Math.max(6, Number(boundedSize("dashboardTitleSize", 12, 48)) * 0.22))) : boundedSize("dashboardTaglineSize", 6, 24),
    dashboardTitleWeight: weight("dashboardTitleWeight"),
    dashboardSubtitleWeight: weight("dashboardSubtitleWeight"),
    dashboardTaglineWeight: weight("dashboardTaglineWeight"),
    dashboardSubtitleAlign: ["left", "center", "right"].includes(configuration.dashboardSubtitleAlign) ? configuration.dashboardSubtitleAlign : configuration.dashboardTitleAlign ?? headerBrandDefaults.dashboardSubtitleAlign,
    dashboardTaglineAlign: ["left", "center", "right"].includes(configuration.dashboardTaglineAlign) ? configuration.dashboardTaglineAlign : configuration.dashboardTitleAlign ?? headerBrandDefaults.dashboardTaglineAlign,
    dashboardTitleAlign: ["left", "center", "right"].includes(configuration.dashboardTitleAlign) ? configuration.dashboardTitleAlign : headerBrandDefaults.dashboardTitleAlign,
    dashboardLogoSize: boundedSize("dashboardLogoSize", 24, 72),
  };
}
const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open("cms-campus-images", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("images");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error("Browser image storage is unavailable."));
});
const savedRevisions = new Map();
const brandingIdentity = () => {
  const user = getAuthUser();
  const token = getAuthToken();
  const collegeId = Number(user?.collegeId ?? user?.CollegeId);
  const userId = user?.userId ?? user?.UserId ?? user?.id ?? user?.Id;
  return { token, collegeId: Number.isInteger(collegeId) && collegeId > 0 ? collegeId : null, userId: userId == null ? "" : String(userId) };
};
const brandingCacheKey = (identity) => identity.token && identity.collegeId && identity.userId ? `college:${identity.collegeId}:user:${identity.userId}` : null;
const validBranding = (data, identity) => Boolean(data && typeof data === "object" && !Array.isArray(data)
  && data.success !== false && Number(data.collegeId ?? data.CollegeId) === identity.collegeId
  && typeof data.dashboardTitle === "string" && typeof data.dashboardSubtitle !== "undefined"
  && typeof data.dashboardTagline !== "undefined" && Object.hasOwn(data, "dashboardLogo"));
const sameIdentity = (a, b) => a.token === b.token && a.collegeId === b.collegeId && a.userId === b.userId;
export async function readCampusImages(campusId) {
  const identity = brandingIdentity();
  const cacheKey = brandingCacheKey(identity);
  const revision = savedRevisions.get(cacheKey);
  try {
    if (identity.token && !identity.collegeId) throw new Error("The signed-in account has no verified college ID. Contact the administrator.");
    const serverData = identity.token
      ? await landingPageApi.getConfig()
      : await landingPageApi.getPublicConfig();

    if (!sameIdentity(identity, brandingIdentity())) throw new Error("The signed-in account changed while loading branding.");
    if (identity.token && !validBranding(serverData, identity)) throw new Error("The server returned an invalid or mismatched college branding configuration.");
    if (serverData && typeof serverData === "object" && Object.keys(serverData).length > 0) {
      try {
        if (!cacheKey) return serverData;
        if (savedRevisions.get(cacheKey) !== revision) return serverData;
        const db = await openDatabase();
        if (savedRevisions.get(cacheKey) !== revision || !sameIdentity(identity, brandingIdentity())) { db.close(); return serverData; }
        await new Promise((resolve, reject) => {
          const transaction = db.transaction("images", "readwrite");
          transaction.objectStore("images").put(serverData, cacheKey);
          transaction.oncomplete = resolve;
          transaction.onerror = transaction.onabort = reject;
        });
        db.close();
      } catch {
        // Cache error ignored
      }
      return serverData;
    }
  } catch (err) {
    const status = Number(err?.response?.status);
    if (!sameIdentity(identity, brandingIdentity()) || !cacheKey || (status >= 400 && status < 500) || !err?.response && !err?.request) throw err;
  }

  if (!cacheKey) return {};
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("images").objectStore("images").get(cacheKey);
      request.onsuccess = () => resolve(sameIdentity(identity, brandingIdentity()) && validBranding(request.result, identity) ? request.result : {});
      request.onerror = () => reject(new Error("Unable to load saved campus images."));
    });
  } finally { db.close(); }
}
export async function saveCampusImages(campusId, images, { requirePersisted = false } = {}) {
  if (campusId == null || campusId === "") throw new Error("Select a campus before saving images.");
  let savedImages = images;
  let confirmed = false;
  const identity = brandingIdentity();
  const cacheKey = brandingCacheKey(identity);
  if (requirePersisted && !getAuthToken()) throw new Error("Sign in before saving header configuration.");
  if (identity.token && !identity.collegeId) throw new Error("The signed-in account has no verified college ID. Contact the administrator.");

  // Save to backend database API
  if (getAuthToken()) {
    try {
      const response = await landingPageApi.saveConfig({
        ...images,
        campusId: Number(campusId) || null,
      });
      if (!sameIdentity(identity, brandingIdentity())) throw new Error("The signed-in account changed while saving branding.");
      const hasConfiguration = validBranding(response, identity);
      if (requirePersisted && !hasConfiguration) throw new Error("The backend did not return the saved header configuration. Your draft has been kept; reload to verify the saved settings.");
      if (requirePersisted && ["dashboardTitle", "dashboardSubtitle", "dashboardTagline", "dashboardLogo"].some((key) => (response[key] ?? "") !== (images[key] ?? "")))
        throw new Error("The backend did not confirm the submitted header title, subtitle, tagline and logo. Your draft has been kept; reload to verify the saved settings.");
      if (hasConfiguration) {
        // Keep browser-only settings that are not part of this API's DTO.
        savedImages = { ...images, ...response };
        confirmed = true;
      }
    } catch (apiErr) {
      console.error("Failed to save landing page configuration to backend API:", apiErr);
      const apiMessage = apiErr?.response?.data?.message || apiErr?.message || "Failed to save configuration to database.";
      throw new Error(apiMessage);
    }
  }

  if (!confirmed && identity.token) throw new Error("The backend did not return a valid college configuration.");
  savedRevisions.set(cacheKey, (savedRevisions.get(cacheKey) || 0) + 1);
  try {
    if (!cacheKey) throw new Error("A verified college and user are required for browser caching.");
    const db = await openDatabase();
    try {
      if (!sameIdentity(identity, brandingIdentity())) throw new Error("The signed-in account changed while saving branding.");
      await new Promise((resolve, reject) => {
        const transaction = db.transaction("images", "readwrite");
        transaction.objectStore("images").put(savedImages, cacheKey);
        transaction.oncomplete = resolve;
        transaction.onerror = transaction.onabort = () => reject(new Error("Images could not be saved. Check available browser storage."));
      });
    } finally { db.close(); }
  } catch (error) {
    if (!confirmed) throw error;
    console.warn("Configuration saved to server, but browser cache is unavailable:", error);
  }
  if (!sameIdentity(identity, brandingIdentity())) throw new Error("The signed-in account changed while saving branding.");
  window.dispatchEvent(new CustomEvent("campus-images-changed", { detail: { campusId, collegeId: identity.collegeId, userId: identity.userId, images: savedImages } }));
  try { localStorage.setItem("cms-campus-images-revision", `${Date.now()}-${Math.random()}`); } catch { /* Same-tab updates still work. */ }
  return savedImages;
}
export async function readCampusImageFile(file, { allowSvg = false } = {}) {
  if (!["image/png", "image/jpeg", "image/webp", ...(allowSvg ? ["image/svg+xml"] : [])].includes(file.type)) throw new Error(allowSvg ? "Choose a PNG, SVG, JPEG, or WebP image." : "Choose a PNG, JPEG, or WebP image.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Each image must be no larger than 2 MB.");
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read this image."));
    reader.readAsDataURL(file);
  });
  await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth && image.naturalHeight ? resolve() : reject(new Error("This image is invalid."));
    image.onerror = () => reject(new Error("This image could not be decoded."));
    image.src = src;
  });
  return src;
}
export function useCampusImages() {
  const { selectedCampusId } = useCampusContext();
  const [identity, setIdentity] = useState(brandingIdentity);
  const [saved, setSaved] = useState({ campusId: null, identity: null, images: {} });
  useEffect(() => {
    const update = () => setIdentity((previous) => { const next = brandingIdentity(); return sameIdentity(previous, next) ? previous : next; });
    window.addEventListener("cms-auth-login", update);
    window.addEventListener("cms-auth-logout", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("cms-auth-login", update); window.removeEventListener("cms-auth-logout", update); window.removeEventListener("storage", update); };
  }, []);
  useEffect(() => {
    let active = true;
    let requestId = 0;
    let pending = false;
    const load = async () => {
      if (pending || !sameIdentity(identity, brandingIdentity())) return;
      pending = true;
      const current = ++requestId;
      try {
        const images = await readCampusImages(selectedCampusId);
        if (active && current === requestId && sameIdentity(identity, brandingIdentity())) setSaved((previous) => {
          const keys = Object.keys(images);
          if (previous.campusId === selectedCampusId && previous.identity && sameIdentity(previous.identity, identity) && keys.length === Object.keys(previous.images).length
            && keys.every((key) => Object.hasOwn(previous.images, key) && Object.is(previous.images[key], images[key]))) return previous;
          return { campusId: selectedCampusId, identity, images };
        });
      } catch (error) {
        // A failed refresh must not temporarily replace saved branding with defaults.
        if (active && current === requestId) setSaved((previous) => [401, 403, 404].includes(Number(error?.response?.status)) ? { campusId: selectedCampusId, identity, images: {} } : previous.campusId === selectedCampusId && previous.identity && sameIdentity(previous.identity, identity) ? previous : { campusId: selectedCampusId, identity, images: {} });
      } finally { pending = false; }
    };
    const onStorage = (event) => { if (event.key === "cms-campus-images-revision") load(); };
    const onChanged = (event) => {
      if (event.detail?.images) {
        if (Number(event.detail.collegeId) !== identity.collegeId || String(event.detail.userId) !== identity.userId || !sameIdentity(identity, brandingIdentity())) return;
        // Invalidate older GETs so they cannot overwrite this confirmed PUT result.
        requestId += 1;
        setSaved({ campusId: selectedCampusId, identity, images: event.detail.images });
      } else load();
    };
    load();
    const onFocus = () => { if (typeof document === "undefined" || document.visibilityState !== "hidden") load(); };
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("campus-images-changed", onChanged);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
    return () => { active = false; requestId += 1; window.removeEventListener("campus-images-changed", onChanged); window.removeEventListener("storage", onStorage); window.removeEventListener("focus", onFocus); if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility); };
  }, [selectedCampusId, identity]);
  return saved.campusId === selectedCampusId && saved.identity && sameIdentity(saved.identity, identity) && sameIdentity(identity, brandingIdentity()) ? saved.images : {};
}
