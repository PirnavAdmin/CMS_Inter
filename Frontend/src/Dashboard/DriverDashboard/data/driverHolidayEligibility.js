const normalizeAudience = (value) => String(value ?? "")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

const driverAudiences = new Set([
  "all", "everyone", "all students staff", "all students and staff",
  "students staff", "students and staff", "all staff", "staff", "staff only",
  "all employees", "employees", "employee", "non teaching", "non teaching staff",
  "non teaching employees", "non academic staff", "support staff", "transport",
  "transport staff", "transport department", "driver", "drivers", "bus driver",
  "bus drivers", "drivers only", "all drivers",
]);
const excludedAudiences = new Set([
  "student", "students", "students only", "all students", "faculty", "faculty only",
  "all faculty", "faculty staff", "faculty and students", "students and faculty",
  "teacher", "teachers", "teachers only", "all teachers", "teaching",
  "teaching staff", "teaching staff only", "academic staff", "teaching employees",
]);

export function isDriverHolidayEligible(holiday) {
  // An explicit eligibility result from the server takes precedence over labels.
  for (const flag of [holiday.isEligibleForDriver, holiday.isEligible]) {
    if (typeof flag === "boolean") return flag;
  }
  const audience = holiday.appliesTo ?? holiday.AppliesTo;
  const labels = Array.isArray(audience) ? audience : [audience];
  const normalized = labels.map(normalizeAudience);
  if (normalized.some((label) => driverAudiences.has(label))) return true;
  if (normalized.length && normalized.every((label) => excludedAudiences.has(label))) return false;
  // Unknown/missing labels must not hide valid records. Backend enforces scope.
  return true;
}
