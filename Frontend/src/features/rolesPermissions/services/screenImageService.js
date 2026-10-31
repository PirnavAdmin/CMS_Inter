import apiClient from "@/api/apiClient";
import { env } from "@/config/env";

const API_BASE_URL = env?.apiBaseUrl || "";

const DB_NAME = "CMS_ScreenPreviews_DB";
const STORE_NAME = "screen_images";
const DB_VERSION = 1;

// Memory cache of screenKey -> URL / ObjectURL
const memoryCache = new Map();
const listeners = new Set();

export function sanitizeScreenKey(key) {
  if (!key) return "default";
  return key
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Open or initialize IndexedDB
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "screenKey" });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => {
      console.warn("IndexedDB open error:", event.target.error);
      resolve(null);
    };
  });
}

/**
 * Save an image data URL or blob to IndexedDB
 */
async function saveToIndexedDB(screenKey, dataUrl) {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ screenKey, dataUrl, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Get an image data URL from IndexedDB
 */
async function getFromIndexedDB(screenKey) {
  const db = await openIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(screenKey);
      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Delete an image from IndexedDB
 */
async function deleteFromIndexedDB(screenKey) {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(screenKey);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Subscribe to image changes
 */
export function subscribeScreenImages(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(screenKey, url) {
  listeners.forEach((fn) => {
    try {
      fn(screenKey, url);
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Synchronize all preview URLs from backend server
 */
export async function syncServerPreviews() {
  try {
    const res = await apiClient.get("/api/v1/screen-previews");
    if (res.data?.success && res.data?.data) {
      Object.entries(res.data.data).forEach(([key, relativeUrl]) => {
        const fullUrl = relativeUrl.startsWith("http")
          ? relativeUrl
          : `${API_BASE_URL}${relativeUrl}`;
        memoryCache.set(sanitizeScreenKey(key), fullUrl);
      });
      notifyListeners("*", null);
    }
  } catch {
    // Backend endpoint might be unreachable or optional
  }
}

/**
 * Get current image URL for a given screen key
 */
export function getScreenImageUrl(screenKey, defaultExplicitUrl = null) {
  const safeKey = sanitizeScreenKey(screenKey);

  // 1. Check memory cache (from server or recent upload)
  if (memoryCache.has(safeKey)) {
    return memoryCache.get(safeKey);
  }

  // 2. Explicit metadata url
  if (defaultExplicitUrl) {
    return defaultExplicitUrl;
  }

  return null;
}

/**
 * Asynchronously checks if there is a local indexedDB or public file for this screen
 */
export async function resolveScreenImage(screenKey, defaultExplicitUrl = null) {
  const safeKey = sanitizeScreenKey(screenKey);

  if (memoryCache.has(safeKey)) {
    return memoryCache.get(safeKey);
  }

  // Check IndexedDB
  const localData = await getFromIndexedDB(safeKey);
  if (localData) {
    memoryCache.set(safeKey, localData);
    return localData;
  }

  if (defaultExplicitUrl) {
    memoryCache.set(safeKey, defaultExplicitUrl);
    return defaultExplicitUrl;
  }

  return null;
}

/**
 * Upload and save a new screenshot
 */
export async function uploadScreenScreenshot(screenKey, file) {
  const safeKey = sanitizeScreenKey(screenKey);

  // Read file into data URL for instant client-side preview & local persistence
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Save to IndexedDB
  await saveToIndexedDB(safeKey, dataUrl);
  memoryCache.set(safeKey, dataUrl);
  notifyListeners(safeKey, dataUrl);

  // Attempt server upload
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post(
      `/api/v1/screen-previews/${safeKey}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    if (res.data?.success && res.data?.imageUrl) {
      const fullUrl = res.data.imageUrl.startsWith("http")
        ? res.data.imageUrl
        : `${API_BASE_URL}${res.data.imageUrl}`;
      memoryCache.set(safeKey, fullUrl);
      notifyListeners(safeKey, fullUrl);
      return fullUrl;
    }
  } catch (err) {
    console.warn("Backend screenshot upload skipped (saved locally in IndexedDB):", err.message);
  }

  return dataUrl;
}

/**
 * Delete screenshot and revert back to default mockup
 */
export async function deleteScreenScreenshot(screenKey) {
  const safeKey = sanitizeScreenKey(screenKey);

  await deleteFromIndexedDB(safeKey);
  memoryCache.delete(safeKey);
  notifyListeners(safeKey, null);

  try {
    await apiClient.delete(`/api/v1/screen-previews/${safeKey}`);
  } catch {
    // Server delete skipped
  }
}
