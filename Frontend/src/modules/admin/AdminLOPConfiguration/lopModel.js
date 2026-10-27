export const LOP_STORAGE_KEY = "cms-settings-lop-demo-v1";
export const mockStaff = [
  {
    id: "lop-staff-1",
    employeeId: "EMP001",
    name: "Ramesh Kumar",
    department: "Transport",
    salary: 30000,
  },
  {
    id: "lop-staff-2",
    employeeId: "EMP002",
    name: "Priya Sharma",
    department: "Teaching",
    salary: 45000,
  },
  {
    id: "lop-staff-3",
    employeeId: "EMP003",
    name: "Inventory Manager",
    department: "Stores & Inventory",
    salary: 34000,
  },
];
export function payrollMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
}
export function calculateLOP({ salary, month, days, basis }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || ""))
    throw new Error("Select a valid payroll month.");
  const [year, monthNumber] = month.split("-").map(Number);
  const periodDays = basis === "fixed30" ? 30 : new Date(year, monthNumber, 0).getDate();
  const lopDays = Number(days),
    monthlySalary = Number(salary);
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0)
    throw new Error("Monthly salary must be a non-negative amount.");
  if (
    days === "" ||
    !Number.isFinite(lopDays) ||
    lopDays <= 0 ||
    lopDays > periodDays ||
    !Number.isInteger(lopDays * 2)
  )
    throw new Error(
      `Enter LOP days in half-day steps, greater than 0 and no more than ${periodDays}.`,
    );
  const deduction = Math.round(((monthlySalary * lopDays) / periodDays) * 100) / 100;
  return {
    periodDays,
    lopDays,
    monthlySalary,
    deduction,
    salaryAfterLOP: Math.round((monthlySalary - deduction) * 100) / 100,
  };
}
export function saveLOP(records, values) {
  const staff = mockStaff.find((s) => s.id === values.staffId);
  if (!staff) throw new Error("Select a staff member.");
  if (!values.reason?.trim()) throw new Error("Enter the reason for loss of pay.");
  if (
    records.some(
      (r) => r.id !== values.id && r.staffId === values.staffId && r.month === values.month,
    )
  )
    throw new Error(
      "An LOP entry already exists for this staff member and month. Edit that entry instead.",
    );
  const calculation = calculateLOP({ ...values, salary: staff.salary });
  const record = {
    id: values.id || crypto.randomUUID(),
    staffId: staff.id,
    employeeId: staff.employeeId,
    name: staff.name,
    department: staff.department,
    month: values.month,
    basis: values.basis,
    reason: values.reason.trim(),
    ...calculation,
  };
  return values.id ? records.map((r) => (r.id === values.id ? record : r)) : [record, ...records];
}
export function sampleLOP() {
  return saveLOP([], {
    staffId: "lop-staff-1",
    month: payrollMonth(),
    days: 2,
    basis: "calendar",
    reason: "Additional unpaid leave after paid leave was exhausted.",
  });
}
