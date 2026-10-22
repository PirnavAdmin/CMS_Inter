import test from "node:test";
import assert from "node:assert/strict";
import { accountantCategoryEligibility, accountantLeaveCategoryLabel, accountantLeaveTypeForCategory, getAccountantLeaveCategoryStats, getAccountantLeaveTypeLabel, getApplicableAccountantLeaveCategories, parseAccountantLeaveCategories } from "./accountantLeaveStats.js";

const raw = [
  { leaveCategoryId: 10, categoryCode: "MDCL", categoryName: "Medical", annualQuota: 10, applicableStaffType: "Teaching Staff Only", displayOrder: 1 },
  { leaveCategoryId: 11, categoryCode: "CL", categoryName: "Casual Leave", annualQuota: 12, applicableStaffType: "All Staff", displayOrder: 2 },
  { leaveCategoryId: 12, categoryCode: "SL", categoryName: "Sick Leave", annualQuota: 10, applicableStaffType: "All Staff", displayOrder: 3, requiresProof: true },
  { leaveCategoryId: 13, categoryCode: "EL", categoryName: "Earned Leave", annualQuota: 15, applicableStaffType: "Teaching Staff Only", displayOrder: 4 },
  { leaveCategoryId: 14, categoryCode: "ML", categoryName: "Maternity Leave", annualQuota: 17, applicableStaffType: "All Staff", displayOrder: 5 },
  { leaveCategoryId: 15, categoryCode: "CO", categoryName: "Compensatory Off", annualQuota: 5, applicableStaffType: "Non-Teaching Staff", displayOrder: 6 },
].map(category => ({ ...category, isActive: true }));
const parsed = categories => parseAccountantLeaveCategories({ data: { status: true, data: categories } });
const catalog = parsed(raw);
const available = categories => getApplicableAccountantLeaveCategories(categories, "Non-Teaching");
const approved = extra => ({ status: "Approved", totalDays: 1, ...extra });
const stats = (code, leaves = [], categories = catalog, historyAvailable = true) => getAccountantLeaveCategoryStats(categories.find(c => c.categoryCode === code), categories, leaves, historyAvailable);

test("parses nested API data and dynamically selects CL, SL, ML, CO in Admin order", () => {
  assert.deepEqual(available([...catalog].reverse()).map(c => c.categoryCode), ["CL", "SL", "ML", "CO"]);
  assert.deepEqual(available(catalog).map(c => stats(c.categoryCode).text), ["0 / 12 Days", "0 / 10 Days", "0 / 17 Days", "0 / 5 Days"]);
  assert.equal(catalog.find(c => c.categoryCode === "SL").requiresProof, true);
});

test("preserves PascalCase values, zero quotas, display order and proof flags", () => {
  const result = parseAccountantLeaveCategories({ data: { Status: true, Data: [{ LeaveCategoryId: 8, CategoryName: "Custom", CategoryCode: "NEW", AnnualQuota: 0, ApplicableStaffType: "All Staff", IsActive: true, DisplayOrder: 2, RequiresProof: true, AllowCarryForward: true }] } });
  assert.equal(result[0].annualQuota, 0);
  assert.equal(result[0].requiresProof, true);
  assert.equal(result[0].allowCarryForward, true);
  assert.equal(getAccountantLeaveCategoryStats(result[0], result, []).text, "0 / 0 Days");
});

test("empty response is genuine empty; failed and malformed responses remain errors", () => {
  assert.deepEqual(parsed([]), []);
  assert.throws(() => parseAccountantLeaveCategories({ data: { status: false, message: "Denied" } }), /Denied/);
  assert.throws(() => parseAccountantLeaveCategories({ data: { status: true, data: {} } }), /invalid/);
});

test("teaching-only and inactive categories are excluded by applicability, not names", () => {
  const changed = catalog.map(c => c.categoryCode === "CO" ? { ...c, isActive: false } : c);
  assert.deepEqual(available(changed).map(c => c.categoryCode), ["CL", "SL", "ML"]);
  assert(!available(catalog).some(c => ["MDCL", "EL", "OD"].includes(c.categoryCode)));
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Teaching Staff Only" }, "non teaching"), false);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Non-Teaching Staff" }, "Teaching"), false);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Teaching Staff Only" }, null), null);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Unknown" }, "Non-Teaching"), null);
});

test("new eligible categories and name/quota/order changes appear on the next mapping", () => {
  const changed = catalog.map(c => c.categoryCode === "CL" ? { ...c, categoryName: "Personal Leave", annualQuota: 14, displayOrder: 9 } : c);
  changed.push({ leaveCategoryId: 20, categoryCode: "NEW", categoryName: "Study Leave", annualQuota: 2.5, applicableStaffType: "Non-Teaching Staff", isActive: true, displayOrder: 1 });
  const result = available(changed);
  assert.equal(result[0].categoryCode, "NEW");
  assert.equal(result.at(-1).categoryName, "Personal Leave");
  assert.equal(stats("CL", [], changed).text, "0 / 14 Days");
  assert.equal(accountantLeaveCategoryLabel(result.at(-1)), "Personal Leave (CL)");
  assert.equal(result.length, 5);
});

test("a changed audience removes a category; OD appears only if actually configured", () => {
  const changed = catalog.map(c => c.categoryCode === "ML" ? { ...c, applicableStaffType: "Teaching Staff Only" } : c);
  changed.push({ leaveCategoryId: 21, categoryCode: "OD", categoryName: "On-Duty", annualQuota: 3, applicableStaffType: "All Staff", isActive: true });
  assert.deepEqual(available(changed).map(c => c.categoryCode), ["CL", "SL", "CO", "OD"]);
});

test("unknown quotas do not become zero; fractional approved usage is supported", () => {
  for (const annualQuota of [null, undefined, "", " ", false, "invalid", -1, NaN, Infinity]) {
    const category = { ...catalog[1], annualQuota };
    const result = getAccountantLeaveCategoryStats(category, catalog, []);
    assert.equal(result.text, "0 / -- Days");
    assert.equal(result.policyRemaining, null);
  }
  assert.equal(stats("CL", [approved({ leaveCategoryId: 11, totalDays: 2.5 })]).text, "2.5 / 12 Days");
});

test("usage matches stable IDs even when name or legacy enum is different", () => {
  const leaves = [approved({ leaveCategoryId: 15, leaveType: "Other", totalDays: 2 }), approved({ leaveCategoryId: 14, leaveType: "Casual", totalDays: 3 })];
  assert.equal(stats("CO", leaves).used, 2);
  assert.equal(stats("ML", leaves).used, 3);
  assert.equal(stats("CL", leaves).used, 0);
});

test("unclassified Other history never silently becomes zero for CO or custom leave", () => {
  const result = stats("CO", [approved({ leaveType: "Other", totalDays: 2 })]);
  assert.equal(result.text, "-- / 5 Days");
  assert.equal(result.policyRemaining, null);
});

test("unambiguous legacy Maternity usage is supported; ambiguous Sick/Medical is unavailable", () => {
  assert.equal(stats("ML", [approved({ leaveType: "Maternity", totalDays: 3 })]).used, 3);
  assert.equal(stats("SL", [approved({ leaveType: "Sick", totalDays: 2 })]).used, null);
  assert.equal(stats("SL", [approved({ leaveCategoryId: 12, totalDays: 2 })]).used, 2);
});

test("only approved requests contribute and invalid/history-error usage stays unknown", () => {
  const leaves = ["Pending", "Rejected", "Cancelled"].map(status => ({ status, leaveCategoryId: 11, totalDays: 3 }));
  assert.equal(stats("CL", leaves).used, 0);
  assert.equal(stats("CL", [approved({ leaveCategoryId: 11, totalDays: null })]).used, null);
  assert.equal(stats("CL", [], catalog, false).text, "-- / 12 Days");
  assert.equal(stats("CL", [approved({})]).used, null);
});

test("history labels follow current Admin names when an ID is present", () => {
  const changed = catalog.map(c => c.categoryCode === "CO" ? { ...c, categoryName: "Rest Day" } : c);
  assert.equal(getAccountantLeaveTypeLabel({ leaveCategoryId: 15, leaveType: "Other" }, changed), "Rest Day");
  assert.equal(getAccountantLeaveTypeLabel({ leaveType: "Other" }, changed), "Other");
});

test("submission enum contract is preserved for ML and custom CO categories", () => {
  assert.equal(accountantLeaveTypeForCategory(catalog.find(c => c.categoryCode === "ML")), "Maternity");
  assert.equal(accountantLeaveTypeForCategory(catalog.find(c => c.categoryCode === "CO")), "Other");
  assert.equal(accountantLeaveTypeForCategory(catalog.find(c => c.categoryCode === "CL")), "Casual");
});

test("duplicate IDs do not produce duplicate cards; unspecified order remains stable", () => {
  const result = parsed([raw[1], raw[1], { ...raw[2], displayOrder: undefined }]);
  assert.equal(result.length, 2);
  assert.deepEqual(available(result).map(c => c.categoryCode), ["CL", "SL"]);
});
