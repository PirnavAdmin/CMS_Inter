export const POLICY_KEY = "cms-settings-common-lop-policy-v1";
export const defaultPolicy = {
  enabled: false,
  shiftStart: "09:00",
  graceMinutes: 10,
  allowedLateLogins: 2,
  lateLoginsPerPenalty: 3,
  penaltyDays: 0.5,
  basis: "calendar",
  effectiveFrom: "",
  missedCheckoutLopEnabled: true,
  allowedMissedCheckouts: 0,
  missedCheckoutsPerPenalty: 1,
  missedCheckoutPenaltyDays: 0.5,
};
const minutes = (value) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) throw new Error("Enter a valid staff login time.");
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};
export function validatePolicy(policy) {
  const start = minutes(policy.shiftStart);
  const normalized = {
    missedCheckoutLopEnabled: policy.missedCheckoutLopEnabled ?? true,
    allowedMissedCheckouts: policy.allowedMissedCheckouts ?? 0,
    missedCheckoutsPerPenalty: policy.missedCheckoutsPerPenalty ?? 1,
    missedCheckoutPenaltyDays: policy.missedCheckoutPenaltyDays ?? 0.5,
    ...policy,
  };
  for (const [key, label, min, max] of [
    ["graceMinutes", "Grace minutes", 0, 120],
    ["allowedLateLogins", "Allowed late logins", 0, 31],
    ["lateLoginsPerPenalty", "Late logins per deduction", 1, 31],
    ["allowedMissedCheckouts", "Allowed missed checkouts", 0, 31],
    ["missedCheckoutsPerPenalty", "Missed checkouts per deduction", 1, 31],
  ]) {
    if (!Number.isInteger(Number(normalized[key])) || Number(normalized[key]) < min || Number(normalized[key]) > max) {
      throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
    }
  }
  if (start + Number(normalized.graceMinutes) >= 1440) throw new Error("Grace period must end on the same day as the login time.");
  if (![0.5, 1].includes(Number(normalized.penaltyDays))) throw new Error("Choose a half-day or one-day deduction.");
  if (![0.5, 1].includes(Number(normalized.missedCheckoutPenaltyDays))) throw new Error("Choose a half-day or one-day missed checkout deduction.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalized.effectiveFrom || "")) throw new Error("Choose the policy effective month.");
  return {
    ...normalized,
    graceMinutes: Number(normalized.graceMinutes),
    allowedLateLogins: Number(normalized.allowedLateLogins),
    lateLoginsPerPenalty: Number(normalized.lateLoginsPerPenalty),
    penaltyDays: Number(normalized.penaltyDays),
    missedCheckoutLopEnabled: Boolean(normalized.missedCheckoutLopEnabled),
    allowedMissedCheckouts: Number(normalized.allowedMissedCheckouts),
    missedCheckoutsPerPenalty: Number(normalized.missedCheckoutsPerPenalty),
    missedCheckoutPenaltyDays: Number(normalized.missedCheckoutPenaltyDays),
  };
}
export function policyDeduction(policy, logins, salary, month, missedCheckoutCount = 0) {
  const p = validatePolicy(policy);
  const lateCount = (logins || []).filter((login) => minutes(login) > minutes(p.shiftStart) + p.graceMinutes).length;
  const excessLate = Math.max(0, lateCount - p.allowedLateLogins);
  const excessMissed = Math.max(0, Number(missedCheckoutCount || 0) - p.allowedMissedCheckouts);
  const periodDays = p.basis === "fixed30" ? 30 : new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const active = p.enabled && month >= p.effectiveFrom;
  const lateDays = active ? Math.floor(excessLate / p.lateLoginsPerPenalty) * p.penaltyDays : 0;
  const missedDays = active && p.missedCheckoutLopEnabled ? Math.floor(excessMissed / p.missedCheckoutsPerPenalty) * p.missedCheckoutPenaltyDays : 0;
  const days = active ? Math.min(periodDays, lateDays + missedDays) : 0;
  const deduction = Math.round((salary / periodDays) * days * 100) / 100;
  return { lateCount, missedCheckoutCount: Number(missedCheckoutCount || 0), lopDays: days, deduction, salaryAfterLOP: Math.round((salary - deduction) * 100) / 100 };
}
