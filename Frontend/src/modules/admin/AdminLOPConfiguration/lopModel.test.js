import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateLOP } from "./lopModel.js";

test("calculateLOP computes calendar, fixed30, working26, and basic pay basis accurately", () => {
  const oct = calculateLOP({ salary: 31000, month: "2026-10", days: 2, basis: "calendar" });
  assert.equal(oct.periodDays, 31);
  assert.equal(oct.deduction, 2000);
  assert.equal(oct.salaryAfterLOP, 29000);

  const fixed = calculateLOP({ salary: 30000, month: "2026-11", days: 1.5, basis: "fixed30" });
  assert.equal(fixed.periodDays, 30);
  assert.equal(fixed.deduction, 1500);

  const working26 = calculateLOP({ salary: 26000, month: "2026-11", days: 1, basis: "working26" });
  assert.equal(working26.periodDays, 26);
  assert.equal(working26.deduction, 1000);

  const basicOnly = calculateLOP({
    salary: 50000,
    basicPay: 30000,
    deductionComponent: "Basic",
    month: "2026-11",
    days: 3,
    basis: "fixed30",
  });
  assert.equal(basicOnly.deduction, 3000);
  assert.equal(basicOnly.salaryAfterLOP, 47000);
});

test("calculateLOP rejects invalid days or months", () => {
  assert.throws(() => calculateLOP({ salary: 30000, month: "2026-13", days: 1, basis: "calendar" }));
  assert.throws(() => calculateLOP({ salary: 30000, month: "2026-10", days: 0, basis: "calendar" }));
  assert.throws(() => calculateLOP({ salary: 30000, month: "2026-10", days: 0.3, basis: "calendar" }));
});
