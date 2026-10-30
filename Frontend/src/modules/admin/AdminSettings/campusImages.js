import { useEffect, useState } from "react";
import { useCampusContext } from "../../../context/CampusContext.jsx";

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
  const boundedSize = (key, min, max) => {
    const value = Number(configuration[key] ?? headerBrandDefaults[key]);
    return String(Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : Number(headerBrandDefaults[key]));
  };
  const color = (key) => /^#[0-9a-f]{6}$/i.test(configuration[key] || "") ? configuration[key] : headerBrandDefaults[key];
  const weight = (key) => ["400", "500", "600", "700", "800"].includes(String(configuration[key])) ? String(configuration[key]) : headerBrandDefaults[key];
  // Preserve custom single-line names saved before the two-line title existed.
  const legacyTitle = configuration.dashboardTitle === "PIRNAV COLLEGE" && configuration.dashboardSubtitle == null;
  return {
    dashboardTitle: String(legacyTitle ? "PIRNAV" : configuration.dashboardTitle ?? headerBrandDefaults.dashboardTitle),
    dashboardSubtitle: String(configuration.dashboardSubtitle ?? (configuration.dashboardTitle && !legacyTitle ? "" : headerBrandDefaults.dashboardSubtitle)),
    dashboardTagline: String(configuration.dashboardTagline ?? headerBrandDefaults.dashboardTagline),
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
export async function readCampusImages(campusId) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("images").objectStore("images").get(String(campusId));
      request.onsuccess = () => resolve(request.result || {});
      request.onerror = () => reject(new Error("Unable to load saved campus images."));
    });
  } finally { db.close(); }
}
export async function saveCampusImages(campusId, images) {
  if (campusId == null || campusId === "") throw new Error("Select a campus before saving images.");
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("images", "readwrite");
      transaction.objectStore("images").put(images, String(campusId));
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(new Error("Images could not be saved. Check available browser storage."));
    });
  } finally { db.close(); }
  window.dispatchEvent(new Event("campus-images-changed"));
  try { localStorage.setItem("cms-campus-images-revision", `${Date.now()}-${Math.random()}`); } catch { /* Same-tab updates still work. */ }
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
  const [saved, setSaved] = useState({ campusId: null, images: {} });
  useEffect(() => {
    let active = true;
    let requestId = 0;
    const load = async () => {
      const current = ++requestId;
      try {
        const images = await readCampusImages(selectedCampusId);
        if (active && current === requestId) setSaved({ campusId: selectedCampusId, images });
      } catch { if (active && current === requestId) setSaved({ campusId: selectedCampusId, images: {} }); }
    };
    const onStorage = (event) => { if (event.key === "cms-campus-images-revision") load(); };
    load();
    window.addEventListener("campus-images-changed", load);
    window.addEventListener("storage", onStorage);
    return () => { active = false; window.removeEventListener("campus-images-changed", load); window.removeEventListener("storage", onStorage); };
  }, [selectedCampusId]);
  return saved.campusId === selectedCampusId ? saved.images : {};
}
