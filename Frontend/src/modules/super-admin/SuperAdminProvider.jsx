import { createContext, useContext, useEffect, useState } from "react";
import { createPreviewData } from "./superAdminPreview.js";

const Context = createContext(null);
const DATA_KEY = "pirnav-super-admin-preview-data-v1";
const empty = () => ({ colleges: [], users: [], plans: [], payments: [], activities: [], settings: {} });
export default function SuperAdminProvider({ session, children }) {
  const [data, setData] = useState(() => {
    if (!session.preview) return empty();
    try {
      const saved = JSON.parse(sessionStorage.getItem(DATA_KEY) || "null");
      if (saved && ["colleges", "users", "plans", "payments", "activities"].every((key) => Array.isArray(saved[key])) && saved.settings) return saved;
    } catch { /* Start with isolated fixtures when storage is invalid. */ }
    return createPreviewData();
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!session.preview) return;
    try { sessionStorage.setItem(DATA_KEY, JSON.stringify(data)); }
    catch { setMessage("Preview changes could not be saved in this browser."); }
  }, [data, session.preview]);
  const update = (label, transform, details = {}) => {
    if (!session.preview) { setMessage("Platform APIs are not configured. This operation requires backend support."); return false; }
    try {
      const next = transform(data);
      // Only allow explicitly supported audit metadata; never copy form/session payloads.
      const metadata = Object.fromEntries(["module", "collegeId", "actionType", "oldValues", "newValues"].filter((key) => details[key] !== undefined).map((key) => [key, details[key]]));
      setData({ ...next, activities: [{ id: crypto.randomUUID(), message: label, at: new Date().toISOString(), performedBy: session.name, status: "Success", scope: "Development preview", ...metadata }, ...next.activities].slice(0, 100) });
      setMessage(`${label}. Saved in this preview only.`);
      return true;
    } catch (error) { setMessage(error.message); return false; }
  };
  const refresh = () => {
    if (!session.preview) { setMessage("Platform dashboard APIs are not configured yet."); return false; }
    try {
      const saved = JSON.parse(sessionStorage.getItem(DATA_KEY) || "null");
      if (saved && ["colleges", "users", "plans", "payments", "activities"].every((key) => Array.isArray(saved[key])) && saved.settings) setData(saved);
      setMessage("Preview dashboard refreshed from this browser session.");
      return true;
    } catch { setMessage("Could not refresh preview data. Your current records are preserved."); return false; }
  };
  return <Context.Provider value={{ session, data, update, refresh, message, clearMessage: () => setMessage("") }}>{children}</Context.Provider>;
}
export const useSuperAdmin = () => useContext(Context);
