export function payrollMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
}

export function formatMonthLabel(ym) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym || "")) return ym || "All Months";
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function getPeriodDaysForMonth(month, basis = "calendar") {
  if (basis === "fixed30") return 30;
  if (basis === "working26") return 26;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) return 30;
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

export function calculateLOP({ salary, basicPay = 0, deductionComponent = "Gross", month, days, basis = "calendar", roundingMode = "Exact" }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
    throw new Error("Select a valid payroll month.");
  }
  const periodDays = getPeriodDaysForMonth(month, basis);
  let lopDays = Number(days);
  const grossSalary = Number(salary || 0);
  const baseSalary = deductionComponent === "Basic" && Number(basicPay) > 0 ? Number(basicPay) : grossSalary;

  if (!Number.isFinite(grossSalary) || grossSalary < 0) {
    throw new Error("Monthly salary must be a non-negative amount.");
  }
  if (
    days === "" ||
    !Number.isFinite(lopDays) ||
    lopDays <= 0 ||
    lopDays > periodDays ||
    !Number.isInteger(lopDays * 2)
  ) {
    throw new Error(
      `Enter LOP days in half-day steps, greater than 0 and no more than ${periodDays}.`,
    );
  }

  if (roundingMode === "HalfDay") lopDays = Math.ceil(lopDays * 2) / 2;
  else if (roundingMode === "WholeDay") lopDays = Math.ceil(lopDays);

  const perDayRate = periodDays > 0 ? Math.round((baseSalary / periodDays) * 100) / 100 : 0;
  const deduction = periodDays > 0 ? Math.round(((baseSalary * lopDays) / periodDays) * 100) / 100 : 0;
  return {
    periodDays,
    baseSalary,
    perDayRate,
    lopDays,
    monthlySalary: grossSalary,
    deduction,
    salaryAfterLOP: Math.max(0, Math.round((grossSalary - deduction) * 100) / 100),
  };
}
