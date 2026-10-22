import test from "node:test";
import assert from "node:assert/strict";
import { accountantCategoryEligibility, getAccountantLeaveStats, parseAccountantLeaveCategories } from "./accountantLeaveStats.js";

const categories = [
  { leaveCategoryId: 1, categoryCode: " cl ", categoryName: "Casual Leave", annualQuota: 9 },
  { leaveCategoryId: 2, categoryCode: "SL", categoryName: "Sick Leave", annualQuota: "6.5" },
  { leaveCategoryId: 3, categoryCode: "EL", categoryName: "Earned Leave", annualQuota: 14 },
  { leaveCategoryId: 4, categoryCode: "OD", categoryName: "On-Duty", annualQuota: 3 },
  { leaveCategoryId: 5, categoryCode: "CO", categoryName: "Compensatory Off", annualQuota: 2 },
].map(category => ({ ...category, applicableStaffType: "All Staff", isActive: true }));
const approved = (extra = {}) => ({ status: "Approved", totalDays: 1, ...extra });

test("uses the returned applicable policy quotas for each card, without Faculty defaults", () => {
  assert.deepEqual(["CL", "SL", "EL", "OD"].map(code => getAccountantLeaveStats(categories, [], code).text), [
    "0 / 9 Days", "0 / 6.5 Days", "0 / 14 Days", "0 / 3 Days",
  ]);
});

test("counts approved working days, excluding pending/rejected/cancelled requests", () => {
  const leaves = [
    approved({ leaveType: "Casual", totalDays: 2.5 }),
    approved({ leaveCategoryId: 1, totalDays: 1 }),
    ...["Pending", "Rejected", "Cancelled"].map(status => ({ status, leaveType: "Casual", totalDays: 5 })),
  ];
  const result = getAccountantLeaveStats(categories, leaves, "CL");
  assert.equal(result.quota, 9);
  assert.equal(result.used, 3.5);
  assert.equal(result.remaining, 5.5);
  assert.equal(result.text, "3.5 / 9 Days");
  assert.equal(result.state, "policy");
});

test("category IDs take precedence over legacy enums, preventing double counting", () => {
  const leaves = [approved({ leaveCategoryId: 3, leaveType: "Casual" })];
  assert.equal(getAccountantLeaveStats(categories, leaves, "CL").used, 0);
  assert.equal(getAccountantLeaveStats(categories, leaves, "EL").used, 1);
});

test("resolves On-Duty by category ID/name without counting other custom leave", () => {
  const leaves = [
    approved({ leaveCategoryId: 4, leaveType: "Other" }),
    approved({ leaveCategoryName: "On-Duty", leaveType: "Other", totalDays: 0.5 }),
    approved({ leaveCategoryId: 5, leaveType: "Other", totalDays: 2 }),
  ];
  assert.equal(getAccountantLeaveStats(categories, leaves, "OD").text, "1.5 / 3 Days");
});

test("unclassified Other usage remains unknown while the valid quota stays visible", () => {
  const stats = getAccountantLeaveStats(categories, [approved({ leaveType: "Other" })], "OD");
  assert.equal(stats.text, "-- / 3 Days");
  assert.equal(stats.remaining, null);
});

test("keeps a genuine zero quota and zero-day usage", () => {
  const zero = [{ ...categories[0], annualQuota: "0" }];
  assert.equal(getAccountantLeaveStats(zero, [approved({ leaveType: "Casual", totalDays: 0 })], "CL").text, "0 / 0 Days");
});

test("missing, invalid, or ambiguous quotas never become zero or a hardcoded quota", () => {
  for (const annualQuota of [null, undefined, "", " ", "unknown", -1, false, NaN, Infinity]) {
    const stats = getAccountantLeaveStats([{ ...categories[0], annualQuota }], [], "CL");
    assert.equal(stats.text, "0 / -- Days");
    assert.equal(stats.remaining, null);
  }
  assert.equal(getAccountantLeaveStats([], [], "CL").quota, null);
  assert.equal(getAccountantLeaveStats([categories[0], { ...categories[0], leaveCategoryId: 9 }], [], "CL").quota, null);
});

test("missing history or invalid approved-day counts do not masquerade as zero usage", () => {
  assert.equal(getAccountantLeaveStats(categories, [], "CL", false).text, "-- / 9 Days");
  assert.equal(getAccountantLeaveStats(categories, [approved({ leaveType: "Casual", totalDays: null })], "CL").used, null);
});

test("policy changes and approval changes are reflected on the next mapping", () => {
  const changed = categories.map(c => c.leaveCategoryId === 1 ? { ...c, annualQuota: 11 } : c);
  const pending = { status: "Pending", leaveType: "Casual", totalDays: 2 };
  assert.equal(getAccountantLeaveStats(changed, [pending], "CL").text, "0 / 11 Days");
  assert.equal(getAccountantLeaveStats(changed, [{ ...pending, status: "Approved" }], "CL").text, "2 / 11 Days");
});

test("supports category-name fallback and clamps remaining days at zero", () => {
  const names = [{ leaveCategoryId: 4, categoryName: "On-Duty", annualQuota: 1, applicableStaffType: "All Staff" }];
  assert.equal(getAccountantLeaveStats(names, [approved({ leaveCategoryId: 4, totalDays: 2 })], "OD").remaining, 0);
});

test("parses the reported nested success response and preserves teaching-only EL", () => {
  const catalog = parseAccountantLeaveCategories({ data: { status: true, message: "Loaded", data: [
    { leaveCategoryId: 3, categoryCode: "EL", annualQuota: 15, applicableStaffType: "Teaching Staff Only", isActive: true },
  ] } });
  assert.equal(catalog[0].categoryCode, "EL");
  assert.equal(catalog[0].annualQuota, 15);
  const result = getAccountantLeaveStats(catalog, [], "EL", true, { staffType: "Non-Teaching" });
  assert.equal(result.text, "Not applicable");
  assert.equal(result.quota, null);
  assert.equal(getAccountantLeaveStats(catalog, [], "EL", true, { staffType: "Teaching" }).text, "0 / 15 Days");
});

test("handles PascalCase responses, empty lists, and failed response envelopes", () => {
  const parsed = parseAccountantLeaveCategories({ data: { Status: true, Data: [
    { LeaveCategoryId: 1, CategoryCode: "CL", AnnualQuota: 0, ApplicableStaffType: "All Staff", IsActive: true },
  ] } });
  assert.equal(getAccountantLeaveStats(parsed, [], "CL").quota, 0);
  assert.deepEqual(parseAccountantLeaveCategories({ data: { status: true, data: [] } }), []);
  assert.throws(() => parseAccountantLeaveCategories({ data: { status: false, message: "Denied" } }), /Denied/);
  assert.throws(() => parseAccountantLeaveCategories({ data: { status: true, data: {} } }), /invalid/);
});

test("distinguishes not configured, inactive, failed fetch, and unknown eligibility", () => {
  assert.equal(getAccountantLeaveStats([], [], "OD").text, "Not configured");
  assert.equal(getAccountantLeaveStats([{ ...categories[3], isActive: false }], [], "OD").text, "Inactive");
  assert.equal(getAccountantLeaveStats([], [], "OD", true, { categoriesAvailable: false }).text, "Unavailable");
  assert.equal(getAccountantLeaveStats([{ ...categories[3], applicableStaffType: "Non-Teaching Staff" }], [], "OD").text, "Eligibility unknown");
  assert.equal(getAccountantLeaveStats([categories[3]], [], "OD", true, { staffType: "Non-Teaching" }).text, "0 / 3 Days");
});

test("eligibility follows the authenticated staff classification, never the dashboard role", () => {
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Teaching Staff Only" }, "NonTeaching"), false);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Non-Teaching Staff" }, "Teaching Staff"), false);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Non-Teaching Staff" }, "Non-Teaching"), true);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "All Staff" }, null), true);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Teaching Staff Only" }, null), null);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Unknown audience" }, "Non-Teaching"), null);
});
