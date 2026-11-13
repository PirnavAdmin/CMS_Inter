import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultPolicy,
  describePolicyRules,
  getFormulaSummary,
  getLateExample,
  getMissedCheckoutExample,
  getWeeklyMissedCheckoutExample,
  POLICY_PRESETS,
  simulatePolicyDeduction,
  validatePolicy,
} from "./lopPolicy.js";

const policy = {
  ...defaultPolicy,
  enabled: true,
  useShiftTimingConfig: false,
  effectiveFrom: "2026-10",
  basis: "fixed30",
};

test("simulatePolicyDeduction computes late, missed checkout, absent, half-day, weekly lockout, and cap", () => {
  const result = simulatePolicyDeduction(policy, {
    salary: 30000,
    month: "2026-10",
    lateCount: 5, // 5 - 2 = 3 => 0.5d
    missedCheckoutCount: 1, // 1 - 0 = 1 => 0.5d
    absentCount: 1, // 1 * 1 = 1.0d
    halfDayCount: 1, // 1 * 0.5 = 0.5d
    weeklyMissedTriggerCount: 1, // 1 * 1.0d = 1.0d
  });
  assert.equal(result.latePenaltyDays, 0.5);
  assert.equal(result.missedCheckoutPenaltyDays, 0.5);
  assert.equal(result.absentLopDays, 1);
  assert.equal(result.halfDayLopDays, 0.5);
  assert.equal(result.weeklyMissedPenaltyDays, 1.0);
  assert.equal(result.lopDays, 3.5);
  assert.equal(result.deduction, 3500);
  assert.equal(result.salaryAfterLOP, 26500);

  const disabled = simulatePolicyDeduction({ ...policy, enabled: false }, { salary: 30000, month: "2026-10", absentCount: 3 });
  assert.equal(disabled.lopDays, 0);
  assert.equal(disabled.deduction, 0);

  const capped = simulatePolicyDeduction({ ...policy, maxLopDaysPerMonth: 1.5 }, { salary: 30000, month: "2026-10", absentCount: 5 });
  assert.equal(capped.lopDays, 1.5);
  assert.equal(capped.deduction, 1500);
});

test("invalid policy settings are rejected", () => {
  assert.throws(() => validatePolicy({ ...policy, lateLoginsPerPenalty: 0 }));
  assert.throws(() => validatePolicy({ ...policy, graceMinutes: -1 }));
  assert.throws(() => validatePolicy({ ...policy, shiftStart: "25:00" }));
  assert.throws(() => validatePolicy({ ...policy, penaltyDays: 3 }));
});

test("POLICY_PRESETS are all valid and describePolicyRules produces readable summaries", () => {
  for (const preset of POLICY_PRESETS) {
    const validated = validatePolicy({ ...defaultPolicy, ...preset.values, effectiveFrom: "2026-11" });
    assert.equal(typeof validated.enabled, "boolean");
    assert.equal(typeof validated.weeklyMissedCheckoutRuleEnabled, "boolean");
  }
  const summary = describePolicyRules({ ...defaultPolicy, effectiveFrom: "2026-11" });
  assert.match(summary.late, /2 free late/);
  assert.match(summary.formula, /Gross Salary/);
  assert.match(summary.weeklyMissedCheckout, /2 unresolved missed check-outs/);

  const lateEx = getLateExample(defaultPolicy);
  assert.match(lateEx, /5 times in a month/);

  const missedEx = getMissedCheckoutExample(defaultPolicy);
  assert.match(missedEx, /trigger 0.5 day/);

  const weeklyEx = getWeeklyMissedCheckoutExample(defaultPolicy);
  assert.match(weeklyEx, /2 missed check-outs/);

  const formulaSum = getFormulaSummary(defaultPolicy, 30000, 30);
  assert.equal(formulaSum.rate, 1000);
});
