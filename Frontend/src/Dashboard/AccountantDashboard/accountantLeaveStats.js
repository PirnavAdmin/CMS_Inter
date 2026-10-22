const nameKey = value => String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
const valueOf = (item, key) => item?.[key] ?? item?.[key[0].toUpperCase() + key.slice(1)];

export function parseAccountantLeaveCategories(response) {
  const body = response?.data;
  if ((body?.status ?? body?.Status ?? body?.success ?? body?.Success) === false) throw new Error(body?.message || body?.Message || "Leave categories request failed.");
  const rows = Array.isArray(body) ? body : body?.data ?? body?.Data;
  if (!Array.isArray(rows)) throw new Error("Leave categories response is invalid.");
  const fields = ["leaveCategoryId", "categoryCode", "categoryName", "annualQuota", "applicableStaffType", "isActive", "displayOrder", "requiresProof", "allowCarryForward"];
  const categories = new Map();
  for (const row of rows) {
    const category = Object.fromEntries(fields.map(key => [key, valueOf(row, key)]));
    if (Number.isInteger(Number(category.leaveCategoryId)) && Number(category.leaveCategoryId) > 0) categories.set(String(category.leaveCategoryId), category);
  }
  return [...categories.values()];
}

export function accountantCategoryEligibility(category, staffType) {
  const key = value => nameKey(value).replace(/staff|only|\s/g, "");
  const audience = key(category.applicableStaffType);
  if (audience === "all") return true;
  const staff = key(staffType);
  if (!staff) return null;
  if (audience === "teaching") return staff === "teaching";
  // Matches LeaveCategoryService's Non-Teaching balance initialization rule.
  if (audience === "nonteaching") return staff !== "teaching";
  return null;
}

export function getApplicableAccountantLeaveCategories(categories, staffType) {
  const order = category => category.displayOrder != null && Number.isFinite(Number(category.displayOrder)) ? Number(category.displayOrder) : Infinity;
  return categories.filter(category => category.isActive !== false && accountantCategoryEligibility(category, staffType) === true)
    .sort((a, b) => order(a) - order(b));
}

export function accountantLeaveCategoryLabel(category) {
  return `${category.categoryName || "Leave"}${category.categoryCode ? ` (${category.categoryCode})` : ""}`;
}

// Existing enum contract used by the submission API; this is not a list of cards.
export function accountantLeaveTypeForCategory(category) {
  const code = String(category.categoryCode || "").trim().toUpperCase();
  const name = nameKey(category.categoryName);
  if (code === "CL" || name.includes("casual")) return "Casual";
  if (code === "SL" || /sick|medical/.test(name)) return "Sick";
  if (code === "EL" || /earned|privilege/.test(name)) return "Earned";
  if (code === "ML" || name.includes("maternity")) return "Maternity";
  return "Other";
}

function days(value) {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

// IDs are authoritative. Legacy enum-only history is usable only when it has one
// unambiguous configured category. Never assume that Other means CO or On-Duty.
function historyCategory(leave, catalog) {
  if (leave.leaveCategoryId != null) return { id: String(leave.leaveCategoryId), candidates: [] };
  if (leave.leaveCategoryName) {
    const named = catalog.filter(category => nameKey(category.categoryName) === nameKey(leave.leaveCategoryName));
    if (named.length === 1) return { id: String(named[0].leaveCategoryId), candidates: [] };
  }
  const type = nameKey(leave.leaveType);
  if (!type) return { id: null, candidates: catalog };
  const canonical = { casual: "Casual", sick: "Sick", medical: "Sick", earned: "Earned", maternity: "Maternity", other: "Other" }[type];
  const candidates = catalog.filter(category => canonical ? accountantLeaveTypeForCategory(category) === canonical : nameKey(category.categoryCode) === type);
  if (canonical !== "Other" && candidates.length === 1) return { id: String(candidates[0].leaveCategoryId), candidates: [] };
  return { id: null, candidates };
}

export function getAccountantLeaveTypeLabel(leave, catalog) {
  const resolved = historyCategory(leave, catalog);
  const category = catalog.find(item => String(item.leaveCategoryId) === resolved.id);
  return category?.categoryName || leave.leaveCategoryName || leave.leaveType || "Leave";
}

export function getAccountantLeaveCategoryStats(category, catalog, leaves, historyAvailable = true) {
  const quota = days(category.annualQuota);
  let used = historyAvailable ? 0 : null;
  if (historyAvailable) {
    for (const leave of leaves) {
      if (nameKey(leave.status) !== "approved") continue;
      const resolved = historyCategory(leave, catalog);
      if (!resolved.id && resolved.candidates.some(item => String(item.leaveCategoryId) === String(category.leaveCategoryId))) { used = null; break; }
      if (resolved.id !== String(category.leaveCategoryId)) continue;
      const count = days(leave.totalDays);
      if (count === null) { used = null; break; }
      used += count;
    }
  }
  // The API returns policy limits, not employee/category allocations or accruals.
  return {
    quota, used,
    policyRemaining: quota !== null && used !== null ? Math.max(0, quota - used) : null,
    message: "Approved days used / category policy quota. Individual allocations, accruals and carry-forward balances are not supplied by this API.",
    text: `${used ?? "--"} / ${quota ?? "--"} Days`,
  };
}
