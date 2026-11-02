import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateLOP, saveLOP } from "./lopModel.js";
test("LOP previews use the selected payroll-day basis and half-day increments", () => {
  assert.deepEqual(calculateLOP({ salary: 30000, month: "2026-10", days: 2, basis: "fixed30" }), {
    periodDays: 30,
    lopDays: 2,
    monthlySalary: 30000,
    deduction: 2000,
    salaryAfterLOP: 28000,
  });
  assert.equal(
    calculateLOP({ salary: 30000, month: "2026-10", days: 2, basis: "calendar" }).deduction,
    1935.48,
  );
  assert.equal(
    calculateLOP({ salary: 30000, month: "2026-10", days: 0.5, basis: "fixed30" }).deduction,
    500,
  );
  assert.equal(
    calculateLOP({ salary: 28000, month: "2026-02", days: 28, basis: "calendar" }).salaryAfterLOP,
    0,
  );
  for (const days of [-1, 0, 31, 0.3, Infinity])
    assert.throws(() => calculateLOP({ salary: 30000, month: "2026-10", days, basis: "fixed30" }));
});
test("one LOP entry per employee/month; edits replace rather than duplicate", () => {
  const values = {
    staffId: "lop-staff-1",
    month: "2026-10",
    days: 2,
    basis: "fixed30",
    reason: "Extra unpaid leave",
  };
  const records = saveLOP([], values);
  assert.equal(records.length, 1);
  assert.throws(() => saveLOP(records, values), /already exists/);
  const edited = saveLOP(records, { ...values, id: records[0].id, days: 3 });
  assert.equal(edited.length, 1);
  assert.equal(edited[0].deduction, 3000);
  assert.equal(saveLOP(records, { ...values, staffId: "lop-staff-2" }).length, 2);
  assert.throws(() => saveLOP([], { ...values, reason: " " }), /reason/);
});
