export const profileValue = (source, ...keys) => {
  for (const key of keys) {
    const value = source?.[key] ?? source?.[key[0].toUpperCase() + key.slice(1)];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};
export function profileJson(value, fallback) {
  if (value && typeof value === "object") return value;
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
export function maskProfileValue(value) {
  const text = String(value || "");
  return text ? `${"\u2022".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}` : "";
}
export function profileDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function profileCollections(staff) {
  const bank = profileJson(profileValue(staff, "bankDetails", "bankDetailsJson"), {});
  const experiences = profileJson(profileValue(staff, "experienceList", "experienceDetails", "experienceJson"), []);
  const experience = Array.isArray(experiences) ? experiences : [];
  let documents = profileJson(profileValue(staff, "documents", "documentsList", "documentsJson", "documentsMap"), []);
  if (!Array.isArray(documents)) documents = Object.entries(documents || {}).map(([type, url]) => typeof url === "string" ? { type, url, name: type } : { type, ...url });
  return { bank, experience, documents };
}
export function profileDocumentUrl(path, apiBaseUrl) {
  if (typeof path !== "string" || !path.trim()) return "";
  try {
    const base = new URL(apiBaseUrl);
    const url = new URL(path, base);
    return ["https:", "http:"].includes(url.protocol) && url.origin === base.origin && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}
export function validateProfileDocument(file, type) {
  if (!type.trim()) return "Document type is required.";
  if (!file) return "Choose a document to upload.";
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name || "")) return "Only PDF, JPEG and PNG documents are accepted.";
  if (!file.size || file.size > 10 * 1024 * 1024) return "Choose a non-empty document of 10 MB or smaller.";
  return "";
}
