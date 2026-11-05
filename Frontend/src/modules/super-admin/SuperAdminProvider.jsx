import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPreviewData, normalizeMockData, MOCK_DATA_KEY, LEGACY_DATA_KEY } from "./superAdminPreview.js";

const Context = createContext(null);
const empty = () => ({ schemaVersion: 2, colleges: [], registrations: [], users: [], plans: [], payments: [], activities: [], settings: {} });
const valid = (data) => data && typeof data === "object" && Array.isArray(data.colleges) && Array.isArray(data.users);
const read = (storage, key) => { try {
  const parsed = JSON.parse(storage.getItem(key) || "null");
  if (!valid(parsed)) return null;
  const defaults = createPreviewData();
  return { ...parsed, plans: Array.isArray(parsed.plans) ? parsed.plans : defaults.plans,
    payments: Array.isArray(parsed.payments) ? parsed.payments : [], activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [], settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : defaults.settings };
} catch { return null; } };
const safeMock = (value) => Array.isArray(value) ? value.map(safeMock) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([key]) => !/password|token|secret|credential|authorization/i.test(key)).map(([key, item]) => [key, safeMock(item)])) : value;
function loadPreview() {
  try {
    const current = read(localStorage, MOCK_DATA_KEY);
    if (current) return normalizeMockData(safeMock(current));
    const local = read(localStorage, LEGACY_DATA_KEY), tab = read(sessionStorage, LEGACY_DATA_KEY);
    if (!local && !tab) return normalizeMockData(createPreviewData());
    const merged = { ...(local || tab), ...(tab || {}) };
    for (const key of ["colleges", "users", "plans", "payments", "activities", "registrations"]) merged[key] = [...new Map([...(local?.[key] || []), ...(tab?.[key] || [])].map((row) => [row.id || row.name, row])).values()];
    return normalizeMockData(safeMock(merged));
  } catch { return normalizeMockData(createPreviewData()); }
}
export default function SuperAdminProvider({ session, children }) {
  const [data, setData] = useState(() => session.preview ? loadPreview() : empty());
  const latest = useRef(data);
  const [message, setMessage] = useState("");
  const persist = (next) => {
    try {
      const raw = localStorage.getItem(MOCK_DATA_KEY);
      if (raw && !read(localStorage, MOCK_DATA_KEY)) localStorage.setItem(`${MOCK_DATA_KEY}-invalid-backup`, raw);
      localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(safeMock(next))); return true;
    } catch { return false; }
  };
  useEffect(() => {
    if (!session.preview) return undefined;
    if (!persist(latest.current)) setMessage("Preview storage is unavailable. Changes remain in memory and may not survive refresh.");
    const synchronize = (event) => {
      if (event.key !== MOCK_DATA_KEY) return;
      const saved = read(localStorage, MOCK_DATA_KEY);
      if (saved) { const next = normalizeMockData(safeMock(saved)); latest.current = next; setData(next); }
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, [session.preview]);
  const update = (label, transform, details = {}) => {
    if (!session.preview) { setMessage("Platform APIs are not configured. This operation requires backend support."); return false; }
    try {
      const next = normalizeMockData(transform(latest.current));
      const metadata = Object.fromEntries(["module", "collegeId", "actionType", "oldValues", "newValues"].filter((key) => details[key] !== undefined).map((key) => [key, safeMock(details[key])]));
      const result = { ...next, activities: [{ id: crypto.randomUUID(), message: label, at: new Date().toISOString(), performedBy: session.name, status: "Success", scope: "Development preview", ...metadata }, ...next.activities].slice(0, 100) };
      latest.current = result; setData(result);
      setMessage(persist(result) ? `${label}. Saved in this browser's mock preview only.` : `${label}. Storage unavailable; changes remain in memory only.`);
      return true;
    } catch (error) { setMessage(error.message); return false; }
  };
  const refresh = () => {
    if (!session.preview) { setMessage("Platform dashboard APIs are not configured yet."); return false; }
    const saved = read(localStorage, MOCK_DATA_KEY);
    if (!saved) { setMessage("Could not refresh preview data. Current records are preserved."); return false; }
    const next = normalizeMockData(safeMock(saved)); latest.current = next; setData(next); setMessage("Mock preview refreshed from this browser's local storage."); return true;
  };
  return <Context.Provider value={{ session, data, update, refresh, message, clearMessage: () => setMessage("") }}>{children}</Context.Provider>;
}
export const useSuperAdmin = () => useContext(Context);
