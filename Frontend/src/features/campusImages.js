import { useEffect, useState } from "react";
import { useCampusContext } from "../context/CampusContext.jsx";

export const campusImageFields = [
  ["dashboardLogo", "Dashboard Logo", "Logo in dashboard sidebars", "logo"],
  ["headerLogo", "Home Header Logo", "Logo at the top of the home page", "logo"],
  ["footerLogo", "Home Footer Logo", "Logo in the home-page footer", "logo"],
  ["loginImage", "Login Background", "Background behind the login form", "photo"],
  ["loginLogo", "Login Logo", "College logo above the login-page title", "logo"],
  ["heroImage", "Home Hero Image", "Main image on the home page", "photo"],
];
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
export async function readCampusImageFile(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG, or WebP image.");
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
