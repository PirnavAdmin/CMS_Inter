import { getPeriodDaysForMonth } from "./lopModel.js";

export const defaultPolicy = {
  policyId: 1,
  campusId: null,
  staffType: "All",
  enabled: true,
  useShiftTimingConfig: true,
  shiftStart: "09:00",
  graceMinutes: 10,
  allowedLateLogins: 2,
  lateLoginsPerPenalty: 3,
  penaltyDays: 0.5,
  missedCheckoutLopEnabled: true,
  allowedMissedCheckouts: 0,
  missedCheckoutsPerPenalty: 1,
  missedCheckoutPenaltyDays: 0.5,
  weeklyMissedCheckoutRuleEnabled: true,
  weeklyMissedCheckoutThreshold: 2,
  weeklyMissedCheckoutPenaltyDays: 1.0,
  absentLopEnabled: true,
  absentPenaltyDays: 1,
  countUnmarkedWorkingDaysAsAbsent: true,
  halfDayLopEnabled: true,
  halfDayPenaltyDays: 0.5,
  basis: "calendar",
  deductionComponent: "Gross",
  roundingMode: "Exact",
  maxLopDaysPerMonth: "",
  autoApplyToPayroll: true,
  effectiveFrom: "",
};

const toMinutes = (value) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) {
    throw new Error("Enter a valid shift login time (HH:MM).");
  }
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};

export function applyRounding(value, mode = "Exact") {
  const num = Number(value || 0);
  if (num <= 0) return 0;
  if (mode === "HalfDay") return Math.ceil(num * 2) / 2;
  if (mode === "WholeDay") return Math.ceil(num);
  return Math.round(num * 10) / 10;
}

export function validatePolicy(policy) {
  const normalized = {
    ...defaultPolicy,
    ...policy,
    shiftStart: String(policy?.shiftStart || "09:00").slice(0, 5),
  };

  if (!normalized.useShiftTimingConfig) {
    const start = toMinutes(normalized.shiftStart);
    if (start + Number(normalized.graceMinutes) >= 1440) {
      throw new Error("Grace period must end on the same day as the login time.");
    }
  }

  for (const [key, label, min, max] of [
    ["graceMinutes", "Grace minutes", 0, 120],
    ["allowedLateLogins", "Allowed late logins", 0, 31],
    ["lateLoginsPerPenalty", "Late logins per deduction", 1, 31],
    ["allowedMissedCheckouts", "Allowed missed checkouts", 0, 31],
    ["missedCheckoutsPerPenalty", "Missed checkouts per deduction", 1, 31],
  ]) {
    const val = Number(normalized[key]);
    if (!Number.isInteger(val) || val < min || val > max) {
      throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
    }
  }

  if (![0.5, 1].includes(Number(normalized.penaltyDays))) {
    throw new Error("Late penalty must be 0.5 (Half Day) or 1 (Full Day).");
  }
  if (![0.5, 1].includes(Number(normalized.missedCheckoutPenaltyDays))) {
    throw new Error("Missed checkout penalty must be 0.5 (Half Day) or 1 (Full Day).");
  }
  if (![0.5, 1, 1.5, 2].includes(Number(normalized.absentPenaltyDays))) {
    throw new Error("Absent penalty must be between 0.5 and 2 days per absence.");
  }
  if (![0.5, 1].includes(Number(normalized.halfDayPenaltyDays))) {
    throw new Error("Half-day penalty must be 0.5 or 1 day.");
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalized.effectiveFrom || "")) {
    throw new Error("Choose a valid policy effective month (YYYY-MM).");
  }

  const maxCapRaw = normalized.maxLopDaysPerMonth;
  let maxLopDaysPerMonth = null;
  if (maxCapRaw !== "" && maxCapRaw != null) {
    const parsedCap = Number(maxCapRaw);
    if (!Number.isFinite(parsedCap) || parsedCap <= 0 || parsedCap > 31) {
      throw new Error("Monthly LOP cap must be between 0.5 and 31 days (or leave blank for no cap).");
    }
    maxLopDaysPerMonth = parsedCap;
  }

  return {
    campusId: normalized.campusId ? Number(normalized.campusId) : null,
    staffType: normalized.staffType || "All",
    enabled: Boolean(normalized.enabled),
    useShiftTimingConfig: Boolean(normalized.useShiftTimingConfig),
    shiftStart: normalized.shiftStart,
    graceMinutes: Number(normalized.graceMinutes),
    allowedLateLogins: Number(normalized.allowedLateLogins),
    lateLoginsPerPenalty: Number(normalized.lateLoginsPerPenalty),
    penaltyDays: Number(normalized.penaltyDays),
    missedCheckoutLopEnabled: Boolean(normalized.missedCheckoutLopEnabled),
    allowedMissedCheckouts: Number(normalized.allowedMissedCheckouts),
    missedCheckoutsPerPenalty: Number(normalized.missedCheckoutsPerPenalty),
    missedCheckoutPenaltyDays: Number(normalized.missedCheckoutPenaltyDays),
    weeklyMissedCheckoutRuleEnabled: Boolean(normalized.weeklyMissedCheckoutRuleEnabled ?? true),
    weeklyMissedCheckoutThreshold: Math.max(1, Math.min(7, Number(normalized.weeklyMissedCheckoutThreshold || 2))),
    weeklyMissedCheckoutPenaltyDays: [0.5, 1, 1.5, 2].includes(Number(normalized.weeklyMissedCheckoutPenaltyDays))
      ? Number(normalized.weeklyMissedCheckoutPenaltyDays)
      : 1.0,
    absentLopEnabled: Boolean(normalized.absentLopEnabled),
    absentPenaltyDays: Number(normalized.absentPenaltyDays),
    countUnmarkedWorkingDaysAsAbsent: Boolean(normalized.countUnmarkedWorkingDaysAsAbsent),
    halfDayLopEnabled: Boolean(normalized.halfDayLopEnabled),
    halfDayPenaltyDays: Number(normalized.halfDayPenaltyDays),
    basis: ["calendar", "fixed30", "working26"].includes(normalized.basis) ? normalized.basis : "calendar",
    deductionComponent: normalized.deductionComponent === "Basic" ? "Basic" : "Gross",
    roundingMode: ["Exact", "HalfDay", "WholeDay"].includes(normalized.roundingMode) ? normalized.roundingMode : "Exact",
    maxLopDaysPerMonth,
    autoApplyToPayroll: Boolean(normalized.autoApplyToPayroll),
    effectiveFrom: normalized.effectiveFrom,
  };
}

export function simulatePolicyDeduction(policy, {
  salary = 0,
  basicPay = 0,
  month,
  lateCount = 0,
  missedCheckoutCount = 0,
  absentCount = 0,
  halfDayCount = 0,
  weeklyMissedTriggerCount = 0,
}) {
  const p = validatePolicy(policy);
  const periodDays = getPeriodDaysForMonth(month, p.basis);
  const active = p.enabled && (!p.effectiveFrom || month >= p.effectiveFrom);

  const excessLate = Math.max(0, Number(lateCount || 0) - p.allowedLateLogins);
  const latePenaltyDays = active
    ? Math.floor(excessLate / p.lateLoginsPerPenalty) * p.penaltyDays
    : 0;

  const excessMissed = Math.max(0, Number(missedCheckoutCount || 0) - p.allowedMissedCheckouts);
  const missedCheckoutPenaltyDays = active && p.missedCheckoutLopEnabled
    ? Math.floor(excessMissed / p.missedCheckoutsPerPenalty) * p.missedCheckoutPenaltyDays
    : 0;

  const absentLopDays = active && p.absentLopEnabled
    ? Math.max(0, Number(absentCount || 0)) * p.absentPenaltyDays
    : 0;

  const halfDayLopDays = active && p.halfDayLopEnabled
    ? Math.max(0, Number(halfDayCount || 0)) * p.halfDayPenaltyDays
    : 0;

  const weeklyMissedPenaltyDays = active && p.weeklyMissedCheckoutRuleEnabled
    ? Math.max(0, Number(weeklyMissedTriggerCount || 0)) * p.weeklyMissedCheckoutPenaltyDays
    : 0;

  let rawTotal = absentLopDays + halfDayLopDays + latePenaltyDays + missedCheckoutPenaltyDays + weeklyMissedPenaltyDays;
  if (p.maxLopDaysPerMonth != null && p.maxLopDaysPerMonth > 0) {
    rawTotal = Math.min(rawTotal, p.maxLopDaysPerMonth);
  }
  const lopDays = active ? Math.min(periodDays, applyRounding(rawTotal, p.roundingMode)) : 0;

  const grossSalary = Math.max(0, Number(salary || 0));
  const baseSalary = p.deductionComponent === "Basic" && Number(basicPay) > 0 ? Number(basicPay) : grossSalary;
  const perDayRate = periodDays > 0 ? Math.round((baseSalary / periodDays) * 100) / 100 : 0;
  const deduction = periodDays > 0 ? Math.round(((baseSalary * lopDays) / periodDays) * 100) / 100 : 0;
  const salaryAfterLOP = Math.max(0, Math.round((grossSalary - deduction) * 100) / 100);

  return {
    periodDays,
    baseSalary,
    perDayRate,
    latePenaltyDays,
    missedCheckoutPenaltyDays,
    absentLopDays,
    halfDayLopDays,
    weeklyMissedPenaltyDays,
    weeklyMissedTriggerCount: Number(weeklyMissedTriggerCount || 0),
    lopDays,
    deduction,
    salaryAfterLOP,
  };
}

export const POLICY_PRESETS = [
  {
    id: "standard",
    label: "Standard College Policy",
    tag: "Recommended",
    description: "Synced shifts, 2 free lates, 1d/absence, 0.5d/missed checkout, and weekly 2-miss lockout (1d Absent).",
    values: {
      enabled: true,
      autoApplyToPayroll: true,
      useShiftTimingConfig: true,
      allowedLateLogins: 2,
      lateLoginsPerPenalty: 3,
      penaltyDays: 0.5,
      missedCheckoutLopEnabled: true,
      allowedMissedCheckouts: 0,
      missedCheckoutsPerPenalty: 1,
      missedCheckoutPenaltyDays: 0.5,
      weeklyMissedCheckoutRuleEnabled: true,
      weeklyMissedCheckoutThreshold: 2,
      weeklyMissedCheckoutPenaltyDays: 1.0,
      absentLopEnabled: true,
      absentPenaltyDays: 1,
      countUnmarkedWorkingDaysAsAbsent: true,
      halfDayLopEnabled: true,
      halfDayPenaltyDays: 0.5,
      basis: "calendar",
      deductionComponent: "Gross",
      roundingMode: "Exact",
      maxLopDaysPerMonth: "",
    },
  },
  {
    id: "lenient",
    label: "Flexible & Capped",
    tag: "Staff Friendly",
    description: "4 free lates, 1 free missed checkout, Basic pay basis, weekly lockout disabled, and a 10-day monthly cap.",
    values: {
      enabled: true,
      autoApplyToPayroll: true,
      useShiftTimingConfig: true,
      allowedLateLogins: 4,
      lateLoginsPerPenalty: 3,
      penaltyDays: 0.5,
      missedCheckoutLopEnabled: true,
      allowedMissedCheckouts: 1,
      missedCheckoutsPerPenalty: 1,
      missedCheckoutPenaltyDays: 0.5,
      weeklyMissedCheckoutRuleEnabled: false,
      weeklyMissedCheckoutThreshold: 3,
      weeklyMissedCheckoutPenaltyDays: 0.5,
      absentLopEnabled: true,
      absentPenaltyDays: 1,
      countUnmarkedWorkingDaysAsAbsent: false,
      halfDayLopEnabled: true,
      halfDayPenaltyDays: 0.5,
      basis: "fixed30",
      deductionComponent: "Basic",
      roundingMode: "Exact",
      maxLopDaysPerMonth: 10,
    },
  },
  {
    id: "strict",
    label: "Strict Attendance",
    tag: "Zero Grace",
    description: "0 free lates, 1d per missed checkout, weekly 2-miss lockout (1d Absent), whole-day rounding on Gross.",
    values: {
      enabled: true,
      autoApplyToPayroll: true,
      useShiftTimingConfig: true,
      allowedLateLogins: 0,
      lateLoginsPerPenalty: 2,
      penaltyDays: 0.5,
      missedCheckoutLopEnabled: true,
      allowedMissedCheckouts: 0,
      missedCheckoutsPerPenalty: 1,
      missedCheckoutPenaltyDays: 1,
      weeklyMissedCheckoutRuleEnabled: true,
      weeklyMissedCheckoutThreshold: 2,
      weeklyMissedCheckoutPenaltyDays: 1.0,
      absentLopEnabled: true,
      absentPenaltyDays: 1,
      countUnmarkedWorkingDaysAsAbsent: true,
      halfDayLopEnabled: true,
      halfDayPenaltyDays: 0.5,
      basis: "calendar",
      deductionComponent: "Gross",
      roundingMode: "WholeDay",
      maxLopDaysPerMonth: "",
    },
  },
  {
    id: "trackingOnly",
    label: "Track Only (No Cut)",
    tag: "Preview Only",
    description: "Calculates LOP reports & attendance impact for review without cutting payroll salary.",
    values: {
      enabled: true,
      autoApplyToPayroll: false,
      useShiftTimingConfig: true,
      allowedLateLogins: 2,
      lateLoginsPerPenalty: 3,
      penaltyDays: 0.5,
      missedCheckoutLopEnabled: true,
      allowedMissedCheckouts: 0,
      missedCheckoutsPerPenalty: 1,
      missedCheckoutPenaltyDays: 0.5,
      weeklyMissedCheckoutRuleEnabled: true,
      weeklyMissedCheckoutThreshold: 2,
      weeklyMissedCheckoutPenaltyDays: 1.0,
      absentLopEnabled: true,
      absentPenaltyDays: 1,
      countUnmarkedWorkingDaysAsAbsent: true,
      halfDayLopEnabled: true,
      halfDayPenaltyDays: 0.5,
      basis: "calendar",
      deductionComponent: "Gross",
      roundingMode: "Exact",
      maxLopDaysPerMonth: "",
    },
  },
];

export function describePolicyRules(policy = defaultPolicy) {
  const p = { ...defaultPolicy, ...policy };
  const basisLabel =
    p.basis === "fixed30"
      ? "30 fixed days"
      : p.basis === "working26"
        ? "26 working days"
        : "actual calendar days in the month";
  const roundLabel =
    p.roundingMode === "HalfDay"
      ? "rounded up to the nearest 0.5 day"
      : p.roundingMode === "WholeDay"
        ? "rounded up to a full day"
        : "used with exact precision";

  return {
    general: !p.enabled
      ? "Automatic LOP calculation is paused for this scope."
      : p.autoApplyToPayroll
        ? `Automatic LOP is active from ${p.effectiveFrom || "current month"} and deducts during Payroll generation${p.maxLopDaysPerMonth ? ` (capped at ${p.maxLopDaysPerMonth}d/month)` : ""}.`
        : `Automatic LOP is tracked for attendance review only (not auto-deducted in Payroll).`,
    formula: `Each LOP day deducts ${p.deductionComponent === "Basic" ? "Basic Pay" : "Gross Salary"} ÷ ${basisLabel}, ${roundLabel}.`,
    late: `${Number(p.allowedLateLogins || 0)} free late arrival${Number(p.allowedLateLogins || 0) === 1 ? "" : "s"}/month. Every ${p.lateLoginsPerPenalty || 1} extra late arrival${Number(p.lateLoginsPerPenalty || 1) === 1 ? "" : "s"} = ${p.penaltyDays} day LOP (${p.useShiftTimingConfig ? "synced shift cutoff" : `custom ${p.shiftStart || "09:00"} + ${p.graceMinutes || 0}m grace`}).`,
    missedCheckout: !p.missedCheckoutLopEnabled
      ? "Missed check-outs do not incur LOP."
      : `${Number(p.allowedMissedCheckouts || 0)} free missed check-out${Number(p.allowedMissedCheckouts || 0) === 1 ? "" : "s"}/month. Every ${p.missedCheckoutsPerPenalty || 1} unresolved missed check-out${Number(p.missedCheckoutsPerPenalty || 1) === 1 ? "" : "s"} = ${p.missedCheckoutPenaltyDays} day LOP.`,
    weeklyMissedCheckout: !p.weeklyMissedCheckoutRuleEnabled
      ? "Weekly missed check-out lockout rule is disabled."
      : `If staff accumulates ${p.weeklyMissedCheckoutThreshold || 2} unresolved missed check-outs in a single week (Mon–Sat), their immediate next working day is penalized as Absent (${p.weeklyMissedCheckoutPenaltyDays || 1.0} day cut), even if attendance is logged.`,
    absence: !p.absentLopEnabled
      ? "Unexcused absences do not incur LOP."
      : `Each unexcused absence deducts ${p.absentPenaltyDays} day(s) LOP${p.countUnmarkedWorkingDaysAsAbsent ? " (unmarked past working days count as absent)" : " (explicitly marked absences only)"}.`,
    halfDay: !p.halfDayLopEnabled
      ? "Half-day attendance does not incur extra LOP."
      : `Each half-day status deducts ${p.halfDayPenaltyDays} day LOP.`,
  };
}

export function getLateExample(policy) {
  const allowed = Number(policy?.allowedLateLogins || 0);
  const perPenalty = Number(policy?.lateLoginsPerPenalty || 1);
  const penalty = Number(policy?.penaltyDays || 0.5);
  const sampleCount = allowed + perPenalty;
  return `If staff is late ${sampleCount} times in a month: ${allowed} are free, the remaining ${perPenalty} trigger ${penalty} day of LOP deduction.`;
}

export function getMissedCheckoutExample(policy) {
  if (!policy?.missedCheckoutLopEnabled) {
    return "Missed punch-outs are excused and do not incur salary deduction.";
  }
  const allowed = Number(policy?.allowedMissedCheckouts || 0);
  const perPenalty = Number(policy?.missedCheckoutsPerPenalty || 1);
  const penalty = Number(policy?.missedCheckoutPenaltyDays || 0.5);
  const sampleCount = allowed + perPenalty;
  return `If staff forgets to punch out ${sampleCount} times: ${allowed} are free, the remaining ${perPenalty} trigger ${penalty} day of LOP deduction.`;
}

export function getWeeklyMissedCheckoutExample(policy) {
  if (!policy?.weeklyMissedCheckoutRuleEnabled) {
    return "Weekly lockout rule is disabled. Missed check-outs follow monthly accumulation rules only.";
  }
  const threshold = Number(policy?.weeklyMissedCheckoutThreshold || 2);
  const penalty = Number(policy?.weeklyMissedCheckoutPenaltyDays || 1.0);
  return `If staff has ${threshold} missed check-outs in a single calendar week (Monday to Saturday), their immediate next working day is flagged as Absent (${penalty} Day LOP cut) even if biometric in/out punch is logged.`;
}

export function getFormulaSummary(policy, sampleSalary = 30000, daysInMonth = 30) {
  const basis = policy?.basis || "calendar";
  const divisor = basis === "fixed30" ? 30 : basis === "working26" ? 26 : daysInMonth;
  const comp = policy?.deductionComponent === "Basic" ? "Basic Pay" : "Gross Salary";
  const rate = Math.round((sampleSalary / divisor) * 100) / 100;
  return {
    divisor,
    comp,
    rate,
    sampleSalary,
    twoDayCut: Math.round(rate * 2 * 100) / 100,
  };
}
