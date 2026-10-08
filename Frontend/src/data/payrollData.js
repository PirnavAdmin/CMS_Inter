// Real Payroll Data Provider — loads strictly from backend APIs.

const STORAGE_KEY = "pjc-payroll-live-v2";

export function formatINR(val) {
  const num = Number(val);
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(safeNum);
}

export function calculateGrossSalary(earnings = {}) {
  return Object.values(earnings).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
}

export function calculateTotalDeductions(deductions = {}) {
  return Object.values(deductions).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
}

export function calculateNetSalary(gross = 0, deductions = 0) {
  return Math.max(0, Number(gross || 0) - Number(deductions || 0));
}

export function calculateLOP(grossSalary = 0, workingDays = 30, lopDays = 0) {
  if (!workingDays || workingDays <= 0) return 0;
  const perDay = Number(grossSalary || 0) / Number(workingDays);
  return Math.round(perDay * Number(lopDays || 0));
}

export function calculateOvertime(hours = 0, rate = 150) {
  return Math.round(Number(hours || 0) * Number(rate || 150));
}

export const initialStructures = [];
export const initialAssignments = [];
export const initialPayrollMonths = [];
export const initialPayslips = [];
export const initialRevisions = [];
export const initialBonuses = [];
export const initialLoans = [];
export const initialReimbursements = [];
export const initialOvertime = [];

export const initialSettings = {
  payrollCycle: "Monthly",
  payrollProcessingDay: 28,
  salaryPaymentDay: 1,
  currency: "INR",
  financialYear: "2026-2027",
  defaultWorkingDays: 30,
  countSundays: true,
  countHolidays: true,
  enablePF: true,
  employeePFPercent: 12,
  employerPFPercent: 12,
  pfWageLimit: 15000,
  enableESI: true,
  employeeESIPercent: 0.75,
  employerESIPercent: 3.25,
  esiLimit: 21000,
  enableLOP: true,
  dailyRateFormula: "Gross / Working Days",
  enableOvertime: true,
  overtimeRate: 150,
  maxOvertimeHours: 40,
  defaultPaymentMode: "Bank Transfer",
  showLogoInPayslip: true,
  showMaskedAccount: true,
  showAttendanceInPayslip: true,
  showEmployerContrib: true,
  showSignature: true,
};

export function loadSalaryData() {
  // Clear any legacy mock data from sessionStorage
  try {
    sessionStorage.removeItem("pjc-mock-salary-v1");
  } catch (e) {
    // Ignore storage errors
  }

  const defaultData = {
    structures: [],
    assignments: [],
    payrollMonths: [],
    payslips: [],
    revisions: [],
    bonuses: [],
    loans: [],
    reimbursements: [],
    overtime: [],
    settings: initialSettings,
    apiEmployees: [],
  };

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultData,
        ...parsed,
        structures: Array.isArray(parsed.structures) ? parsed.structures : [],
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        payslips: Array.isArray(parsed.payslips) ? parsed.payslips : [],
        payrollMonths: Array.isArray(parsed.payrollMonths) ? parsed.payrollMonths : [],
        revisions: Array.isArray(parsed.revisions) ? parsed.revisions : [],
        bonuses: Array.isArray(parsed.bonuses) ? parsed.bonuses : [],
        loans: Array.isArray(parsed.loans) ? parsed.loans : [],
        reimbursements: Array.isArray(parsed.reimbursements) ? parsed.reimbursements : [],
        overtime: Array.isArray(parsed.overtime) ? parsed.overtime : [],
        settings: parsed.settings || defaultData.settings,
        apiEmployees: Array.isArray(parsed.apiEmployees) ? parsed.apiEmployees : [],
      };
    }
  } catch (e) {
    console.warn("Could not read salary data from sessionStorage", e);
  }
  return defaultData;
}

export function saveSalaryData(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Could not write salary data to sessionStorage", e);
  }
}
