const nameKey = value => String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
const nameCodes = {
  casual: "CL", "casual leave": "CL",
  sick: "SL", "sick leave": "SL", medical: "SL", "medical leave": "SL",
  earned: "EL", "earned leave": "EL", privilege: "EL", "privilege leave": "EL",
  "on duty": "OD", "on duty leave": "OD", duty: "OD",
};

const valueOf = (item, key) => item?.[key] ?? item?.[key[0].toUpperCase() + key.slice(1)];
export function parseAccountantLeaveCategories(response) {
  const body = response?.data;
  if ((body?.status ?? body?.Status ?? body?.success ?? body?.Success) === false) throw new Error(body?.message || body?.Message || "Leave categories request failed.");
  const rows = Array.isArray(body) ? body : body?.data ?? body?.Data;
  if (!Array.isArray(rows)) throw new Error("Leave categories response is invalid.");
  const fields = ["leaveCategoryId", "categoryCode", "categoryName", "annualQuota", "applicableStaffType", "isActive"];
  return rows.map(row => Object.fromEntries(fields.map(key => [key, valueOf(row, key)])))
    .filter(category => Number.isInteger(Number(category.leaveCategoryId)) && Number(category.leaveCategoryId) > 0);
}

export function accountantCategoryEligibility(category, staffType) {
  const key = value => nameKey(value).replace(/staff|only|\s/g, "");
  const audience = key(category.applicableStaffType);
  if (audience === "all") return true;
  const staff = key(staffType);
  if (!staff) return null;
  if (audience === "teaching") return staff === "teaching";
  // LeaveCategoryService initializes Non-Teaching balances for StaffType != Teaching.
  if (audience === "nonteaching") return staff !== "teaching";
  return null;
}

function categoryCode(category) {
  const code = String(category.categoryCode ?? "").trim().toUpperCase();
  return code || nameCodes[nameKey(category.categoryName)] || null;
}

function days(value) {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function leaveCode(leave, categories) {
  if (leave.leaveCategoryId != null) {
    const category = categories.find(item => String(item.leaveCategoryId) === String(leave.leaveCategoryId));
    if (category) return categoryCode(category);
  }
  if (leave.leaveCategoryName) {
    const category = categories.find(item => nameKey(item.categoryName) === nameKey(leave.leaveCategoryName));
    return category ? categoryCode(category) : nameCodes[nameKey(leave.leaveCategoryName)] || null;
  }
  return nameCodes[nameKey(leave.leaveType)] || null;
}

// Keep the catalog intact so a teaching-only category can be distinguished from
// a missing category. Policy quotas do not verify an employee/year allocation.
export function getAccountantLeaveStats(categories, leaves, code, historyAvailable = true, { staffType, categoriesAvailable = true } = {}) {
  const configured = categories.filter(category => categoryCode(category) === code);
  const active = configured.filter(category => category.isActive !== false);
  const matched = active.filter(category => accountantCategoryEligibility(category, staffType) === true);
  let state = "policy";
  let message = "Approved days used / category policy quota. Individual employee allocation is not returned by this API.";
  if (!categoriesAvailable) { state = "unavailable"; message = "Leave categories could not be loaded."; }
  else if (!configured.length) { state = "not_configured"; message = "No matching category was returned by the leave categories API."; }
  else if (!active.length) { state = "inactive"; message = "This leave category is inactive."; }
  else if (!matched.length) {
    const unknown = active.some(category => accountantCategoryEligibility(category, staffType) === null);
    state = unknown ? "eligibility_unknown" : "inapplicable";
    message = unknown ? "Staff classification or category eligibility is unavailable." : `This category does not apply to your staff classification (${staffType}).`;
  }
  else if (matched.length !== 1 || days(matched[0].annualQuota) === null) { state = "quota_unavailable"; message = "The applicable category has no unambiguous valid policy quota."; }
  const quota = state === "policy" ? days(matched[0].annualQuota) : null;
  let used = historyAvailable ? 0 : null;
  if (historyAvailable) {
    for (const leave of leaves) {
      if (nameKey(leave.status) !== "approved") continue;
      const resolvedCode = leaveCode(leave, categories);
      // The history API may omit category identifiers for Other leave. It cannot
      // distinguish On-Duty from other custom categories in that case.
      if (code === "OD" && !resolvedCode && nameKey(leave.leaveType) === "other") {
        used = null;
        break;
      }
      if (resolvedCode !== code) continue;
      const count = days(leave.totalDays);
      if (count === null) { used = null; break; }
      used += count;
    }
  }
  const remaining = quota !== null && used !== null ? Math.max(0, quota - used) : null;
  const labels = { unavailable: "Unavailable", not_configured: "Not configured", inactive: "Inactive", eligibility_unknown: "Eligibility unknown", inapplicable: "Not applicable" };
  return { quota, used, remaining, state, message, text: labels[state] || `${used ?? "--"} / ${quota ?? "--"} Days` };
}
