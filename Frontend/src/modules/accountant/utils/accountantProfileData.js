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

// Editable profile mapping, validation and payloads.
const value = profileValue;
export const bankFields = ["bankName", "accountHolderName", "accountNumber", "ifscCode", "branch", "accountType"];
export const addressFields = ["currentAddress", "permanentAddress", "city", "district", "state", "pincode", "country"];
const text = input => String(input ?? "");
const date = input => text(input).split("T")[0];
export function editableProfileFields(staff) {
  const { bank, experience } = profileCollections(staff);
  const aliases = { accountHolderName: "accountHolder", ifscCode: "ifsc" };
  return {
    personal: Object.fromEntries(["maritalStatus", "aadhaar", "panNumber"].map(key => [key, text(value(staff, key, key === "panNumber" ? "pan" : key))])),
    bank: { ...bank, ...Object.fromEntries(bankFields.map(key => [key, text(value(staff, key, aliases[key] || key) || value(bank, key, aliases[key] || key))])) },
    address: Object.fromEntries(addressFields.map(key => [key, text(value(staff, key, key === "pincode" ? "pin" : key))])),
    experience: experience.map(record => ({
      organization: text(value(record, "organization", "institution", "employer")),
      designation: text(value(record, "designation")), fromDate: date(value(record, "fromDate", "from")),
      toDate: date(value(record, "toDate", "to")), totalYears: value(record, "totalYears") || 0, roles: text(value(record, "roles")),
    })),
  };
}
export function updateProfileField(form, field, input) {
  const [section, key] = field.split(".");
  if (field === "bank.ifscCode" || field === "personal.panNumber") input = input.toUpperCase();
  return key ? { ...form, [section]: { ...form[section], [key]: input } } : { ...form, [field]: input };
}
const trimmed = object => Object.fromEntries(Object.entries(object).map(([key, input]) => [key, typeof input === "string" ? input.trim() : input]));
const changed = (left, right) => JSON.stringify(left) !== JSON.stringify(right);
export function profileDraftRequests(staff, form) {
  const baseline = editableProfileFields(staff);
  const personal = { ...form.personal };
  for (const key of ["firstName", "lastName"]) if (text(form[key]).trim() !== text(value(staff, key)).trim()) personal[key] = form[key].trim();
  const requests = [];
  const personalDelta = Object.fromEntries(Object.entries(trimmed(personal)).filter(([key, input]) => input !== text(value(staff, key, key === "panNumber" ? "pan" : key)).trim()));
  if (Object.keys(personalDelta).length) requests.push({ sectionName: "Personal", personal: personalDelta });
  if (changed(trimmed(form.bank), trimmed(baseline.bank))) {
    const bank = trimmed(form.bank);
    if (form.personal.panNumber !== baseline.personal.panNumber) bank.panNumber = form.personal.panNumber.trim();
    requests.push({ sectionName: "Bank", bank });
  }
  const address = Object.fromEntries(Object.entries(trimmed(form.address)).filter(([key, input]) => input !== baseline.address[key].trim()));
  if (Object.keys(address).length) requests.push({ sectionName: "Address", address });
  const experiences = form.experience.map(record => ({ ...trimmed(record), totalYears: Number(record.totalYears) }));
  if (changed(experiences, baseline.experience.map(record => ({ ...trimmed(record), totalYears: Number(record.totalYears) })))) requests.push({ sectionName: "Experience", experience: experiences });
  return requests;
}
export function validateProfileDraft(staff, form) {
  const baseline = editableProfileFields(staff);
  if (!form.experience.length && baseline.experience.length) return "The existing profile-draft API cannot remove the final experience record.";
  if (form.bank.ifscCode !== baseline.bank.ifscCode && form.bank.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bank.ifscCode.trim())) return "Enter a valid 11-character IFSC code.";
  if (form.bank.accountNumber !== baseline.bank.accountNumber && form.bank.accountNumber && !/^\d{6,30}$/.test(form.bank.accountNumber.trim())) return "Bank account number must contain 6 to 30 digits.";
  if (form.personal.aadhaar !== baseline.personal.aadhaar && form.personal.aadhaar && !/^\d{12}$/.test(form.personal.aadhaar.replace(/\s/g, ""))) return "Aadhaar number must contain 12 digits.";
  if (form.personal.panNumber !== baseline.personal.panNumber && form.personal.panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.personal.panNumber.trim())) return "Enter a valid PAN number.";
  for (const record of changed(form.experience, baseline.experience) ? form.experience : []) {
    if (!record.organization.trim() || !record.designation.trim()) return "Each experience record needs an employer and designation.";
    if (!Number.isFinite(Number(record.totalYears)) || Number(record.totalYears) < 0) return "Experience years must be a non-negative number.";
    if (record.fromDate && record.toDate && record.fromDate > record.toDate) return "Experience end date must follow its start date.";
  }
  return "";
}
export function profileContactPayload(staff, form) {
  return { fullName: `${form.firstName.trim()} ${form.lastName.trim()}`, mobile: form.mobile.trim(), personalEmail: form.email.trim(), address: value(staff, "currentAddress") || null, emergencyContact: value(staff, "alternateMobile") || null };
}
