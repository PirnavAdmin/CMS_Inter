// ============================================================
// Shared static Fee Management data + helpers.
// Student Admission (Step 8) and Fee Management both read/write
// through this single module. Frontend only: localStorage backed.
// Replace the storage helpers with API calls later - the shape stays.
// ============================================================

import { useSyncExternalStore } from "react";

export const STORAGE_KEY = "cms_fee_management_v1";
export const COLLEGE_NAME = "Pirnav College";

/** Fixed one-time mandatory admission fee. */
export const ADMISSION_FEE = 3000;

export const PAYMENT_PLANS = ["Full Payment", "Installment Payment"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Net Banking", "Cheque"];
export const INSTALLMENT_COUNTS = [2, 3, 4];
export const DEFAULT_INSTALLMENT_COUNT = 3;
export const ACADEMIC_YEARS = ["2026-2027", "2025-2026"];
export const DEFAULT_ACADEMIC_YEAR = "2026-2027";
export const ACADEMIC_LEVELS = ["1st Year", "2nd Year"];
export const FEE_TYPE_TEMPLATES = [
  { key: "admissionFee", type: "Admission Fee", required: true },
  { key: "courseFee", type: "Course Fee", required: true },
  { key: "examinationFee", type: "Examination Fee", amount: 2000 },
  { key: "laboratoryFee", type: "Laboratory Fee", amount: 3000 },
  { key: "libraryFee", type: "Library Fee", amount: 1000 },
  { key: "uniformFee", type: "Uniform Fee", amount: 4000 },
  { key: "idCardFee", type: "ID Card Fee", amount: 300 },
];

// ------------------------------------------------------------
// ONE central course fee configuration (group -> section -> fee).
// Change names/amounts here only.
// ------------------------------------------------------------
export const COURSE_FEE_CONFIG = {
  MPC: { IIT: 60000, EEE: 40000, MZ: 20000 },
  BiPC: { NEET: 65000, MEDICAL: 45000, GENERAL: 25000 },
  MEC: { CA: 50000, FOUNDATION: 30000 },
  CEC: { COMMERCE: 28000, GENERAL: 18000 },
};

export const FEE_GROUPS = Object.keys(COURSE_FEE_CONFIG);
export const sectionsForGroup = (group) => Object.keys(COURSE_FEE_CONFIG[group] || {});
export const courseFeeFor = (group, section) => Number(COURSE_FEE_CONFIG[group]?.[section] ?? 0);

export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `\u20b9${(Number.isFinite(amount) ? Math.round(amount) : 0).toLocaleString("en-IN")}`;
};

export const formatCompactCurrency = (value) => {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `\u20b9${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `\u20b9${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `\u20b9${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
};

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const feeScheduleLabel = (value) =>
  String(value || "")
    .replace(/\bInstallments\b/g, "Fee Schedules")
    .replace(/\binstallments\b/g, "fee schedules")
    .replace(/\bInstallment\b/g, "Fee Schedule")
    .replace(/\binstallment\b/g, "fee schedule");

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addMonthsISO = (isoDate, months) => {
  const base = new Date(String(isoDate || todayISO()).slice(0, 10));
  if (Number.isNaN(base.getTime())) return todayISO();
  const target = new Date(base.getFullYear(), base.getMonth() + months, base.getDate());
  return target.toISOString().slice(0, 10);
};

/** Splits an amount into equal parts without losing/creating rupees. */
export const splitAmount = (total, count) => {
  const amount = Math.max(Math.round(Number(total) || 0), 0);
  const parts = Math.max(Number(count) || 2, 1);
  const base = Math.floor(amount / parts);
  const remainder = amount - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index >= parts - remainder ? 1 : 0));
};

/** Builds a default installment schedule from a course fee. */
export const buildInstallmentSchedule = (courseFee, count, startDate) => {
  const amounts = splitAmount(courseFee, count);
  return amounts.map((amount, index) => ({
    no: index + 1,
    amount,
    dueDate: addMonthsISO(startDate || todayISO(), index),
    paid: 0,
  }));
};

export const normalizeFeeItems = (items = []) =>
  items.map((item, index) => {
    const originalAmount = Number(item.originalAmount ?? item.amount ?? 0);
    return {
      id: item.id || `FI-${index + 1}`,
      type: item.type || `Fee ${index + 1}`,
      description: item.description || "",
      originalAmount,
      payableAmount: Number(item.payableAmount ?? originalAmount),
      selected: item.selected !== false,
      required: Boolean(item.required),
      dueDate: item.dueDate || "",
    };
  });

export const feeItemsForStructure = (structure, group, section) => {
  const source = Array.isArray(structure?.feeItems) && structure.feeItems.length
    ? structure.feeItems
    : FEE_TYPE_TEMPLATES.map((template) => ({
      id: template.key,
      type: template.type,
      originalAmount: template.key === "admissionFee"
        ? Number(structure?.admissionFee ?? ADMISSION_FEE)
        : template.key === "courseFee"
          ? Number(structure?.courseFee ?? courseFeeFor(group, section))
          : Number(template.amount || 0),
      selected: Boolean(template.required),
      required: Boolean(template.required),
      dueDate: "",
    }));
  return normalizeFeeItems(source);
};

export const deriveFeeItems = (items = []) => normalizeFeeItems(items).filter((item) => item.selected);

// ------------------------------------------------------------
// Derived calculations (never store duplicated totals)
// ------------------------------------------------------------
export const installmentStatus = (installment) => {
  const amount = Number(installment.amount || 0);
  const paid = Number(installment.paid || 0);
  if (paid >= amount && amount > 0) return "Paid";
  const overdue = installment.dueDate && String(installment.dueDate).slice(0, 10) < todayISO();
  if (paid > 0) return overdue ? "Overdue" : "Partial";
  return overdue ? "Overdue" : "Pending";
};

export const deriveAccount = (account) => {
  const feeItems = deriveFeeItems(account.feeItems);
  const admissionFee = Number(account.admissionFee || feeItems.find((item) => item.type === "Admission Fee")?.originalAmount || 0);
  const fallbackCourseFee = Number(account.courseFee || 0);
  const totalOriginal = feeItems.length ? feeItems.reduce((sum, item) => sum + item.originalAmount, 0) : admissionFee + fallbackCourseFee;
  const totalConcession = Math.min(Math.max(Number(account.concessionAmount || 0), 0), totalOriginal);
  const totalPayable = Math.max(Number(account.totalPayable ?? totalOriginal - totalConcession), 0);
  const courseFee = totalPayable;
  const transactions = Array.isArray(account.transactions) ? account.transactions : [];
  const transactionPaid = transactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
  const explicitPaid = account.totalPaid ?? account.paidAmount ?? account.amountPaid;
  const rawPaid = Math.max(Number(explicitPaid ?? transactionPaid), 0);
  const totalPaid = totalPayable > 0 ? Math.min(rawPaid, totalPayable) : rawPaid;
  const explicitBalance = account.balance ?? account.balanceAmount ?? account.outstandingBalance ?? account.dueAmount;
  const balance = Math.max(Number(explicitBalance ?? totalPayable - totalPaid), 0);
  const installments = (Array.isArray(account.installments) ? account.installments : []).map((item) => ({
    ...item,
    balance: Math.max(Number(item.amount || 0) - Number(item.paid || 0), 0),
    status: installmentStatus(item),
  }));
  const pending = installments.filter((item) => item.status !== "Paid").sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const nextDue = pending[0] || null;

  let feeStatus = "Due";
  if (balance === 0) feeStatus = "Paid";
  else if (pending.some((item) => item.status === "Overdue")) feeStatus = "Overdue";
  else if (totalPaid > 0) feeStatus = "Partial";

  return {
    ...account,
    admissionFee,
    courseFee,
    feeItems,
    totalOriginal,
    totalConcession,
    concessionName: account.concessionName || "",
    concessionType: account.concessionType || "Fixed",
    concessionValue: Number(account.concessionValue || 0),
    totalPayable,
    transactions,
    installments,
    totalPaid,
    balance,
    feeStatus,
    nextDueDate: nextDue?.dueDate || null,
    nextDueAmount: nextDue ? nextDue.balance : 0,
    nextInstallment: nextDue,
  };
};

export const receiptNumber = (sequence, year) =>
  `RCP-${year || String(new Date().getFullYear())}-${String(sequence).padStart(4, "0")}`;

// ------------------------------------------------------------
// Seed data (loaded once when localStorage is empty)
// ------------------------------------------------------------
const seedStructures = () => {
  let id = 1;
  return FEE_GROUPS.flatMap((group) =>
    sectionsForGroup(group).map((section) => ({
      id: `FS-${id++}`,
      academicYear: DEFAULT_ACADEMIC_YEAR,
      group,
      section,
      admissionFee: ADMISSION_FEE,
      courseFee: courseFeeFor(group, section),
      feeItems: feeItemsForStructure({
        admissionFee: ADMISSION_FEE,
        courseFee: courseFeeFor(group, section),
      }, group, section),
      status: "Active",
    })),
  );
};

const seedStudents = [
  { name: "Rahul Kumar", group: "MPC", section: "IIT", plan: "Full Payment", level: "1st Year", date: "2026-06-12", method: "UPI", paidCourse: "full" },
  { name: "Aarav Reddy", group: "MPC", section: "EEE", plan: "Installment Payment", level: "1st Year", date: "2026-06-14", method: "Cash", count: 4, paidInstallments: 2 },
  { name: "Diya Sharma", group: "MPC", section: "MZ", plan: "Installment Payment", level: "1st Year", date: "2026-06-15", method: "Card", count: 2, paidInstallments: 1 },
  { name: "Vihaan Patel", group: "BiPC", section: "NEET", plan: "Installment Payment", level: "1st Year", date: "2026-06-16", method: "Net Banking", count: 4, paidInstallments: 0, overdue: true },
  { name: "Saanvi Nair", group: "BiPC", section: "MEDICAL", plan: "Full Payment", level: "2nd Year", date: "2026-06-18", method: "Cheque", paidCourse: "full" },
  { name: "Ishaan Verma", group: "BiPC", section: "GENERAL", plan: "Installment Payment", level: "1st Year", date: "2026-06-19", method: "UPI", count: 3, paidInstallments: 3 },
  { name: "Meera Joshi", group: "MEC", section: "CA", plan: "Installment Payment", level: "1st Year", date: "2026-06-20", method: "Cash", count: 3, paidInstallments: 1 },
  { name: "Arjun Menon", group: "MEC", section: "FOUNDATION", plan: "Installment Payment", level: "2nd Year", date: "2026-06-22", method: "UPI", count: 2, paidInstallments: 0 },
  { name: "Ananya Iyer", group: "CEC", section: "COMMERCE", plan: "Full Payment", level: "1st Year", date: "2026-06-24", method: "Card", paidCourse: "full" },
  { name: "Karthik Rao", group: "CEC", section: "GENERAL", plan: "Installment Payment", level: "2nd Year", date: "2026-06-26", method: "UPI", count: 3, paidInstallments: 2, overdue: true },
];

const buildSeedState = () => {
  let sequence = 1;
  const accounts = seedStudents.map((student, index) => {
    const courseFee = courseFeeFor(student.group, student.section);
    const feeItems = feeItemsForStructure({ admissionFee: ADMISSION_FEE, courseFee }, student.group, student.section)
      .filter((item) => item.required);
    const admissionNo = `ADM-2026-${String(index + 1).padStart(3, "0")}`;
    const transactions = [{
      id: `TXN-${index + 1}-A`,
      receiptNo: receiptNumber(sequence++, "2026"),
      date: student.date,
      type: "Admission Fee",
      amount: ADMISSION_FEE,
      method: student.method,
      reference: student.method === "Cash" ? "" : `TXN${900000 + index}`,
      note: "Collected during admission",
      installmentNo: null,
    }];

    let installments = [];
    if (student.plan === "Installment Payment") {
      const start = student.overdue ? addMonthsISO(todayISO(), -3) : student.date;
      installments = buildInstallmentSchedule(courseFee, student.count, start);
      for (let i = 0; i < (student.paidInstallments || 0); i += 1) {
        installments[i].paid = installments[i].amount;
        transactions.push({
          id: `TXN-${index + 1}-I${i + 1}`,
          receiptNo: receiptNumber(sequence++, "2026"),
          date: installments[i].dueDate,
          type: `Installment ${i + 1}`,
          amount: installments[i].amount,
          method: student.method,
          reference: student.method === "Cash" ? "" : `TXN${910000 + index * 10 + i}`,
          note: "",
          installmentNo: i + 1,
        });
      }
    } else if (student.paidCourse === "full") {
      transactions.push({
        id: `TXN-${index + 1}-C`,
        receiptNo: receiptNumber(sequence++, "2026"),
        date: student.date,
        type: "Full Course Fee",
        amount: courseFee,
        method: student.method,
        reference: student.method === "Cash" ? "" : `TXN${920000 + index}`,
        note: "Collected during admission",
        installmentNo: null,
      });
    }

    return {
      id: `FA-${index + 1}`,
      studentId: `STU-${index + 1}`,
      admissionNo,
      studentName: student.name,
      rollNumber: `26${student.group.toUpperCase()}${String(index + 1).padStart(3, "0")}`,
      academicYear: DEFAULT_ACADEMIC_YEAR,
      academicLevel: student.level,
      group: student.group,
      section: student.section,
      admissionDate: student.date,
      admissionFee: ADMISSION_FEE,
      courseFee,
      feeItems,
      paymentPlan: student.plan,
      paymentMethod: student.method,
      installments,
      transactions,
    };
  });

  return { feeStructures: seedStructures(), feeAccounts: accounts, receiptSequence: sequence };
};

// ------------------------------------------------------------
// Tiny observable localStorage store
// ------------------------------------------------------------
const listeners = new Set();
let cache = null;

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

const persist = (state) => {
  cache = state;
  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable - keep in-memory copy */
    }
  }
  listeners.forEach((fn) => fn());
};

export const readFeeState = () => {
  if (cache) return cache;
  if (hasStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.feeAccounts) && Array.isArray(parsed.feeStructures)) {
          cache = {
            feeStructures: parsed.feeStructures,
            feeAccounts: parsed.feeAccounts,
            receiptSequence: Number(parsed.receiptSequence) || parsed.feeAccounts.length + 1,
          };
          return cache;
        }
      }
    } catch {
      /* fall through to seed */
    }
  }
  const seeded = buildSeedState();
  cache = seeded;
  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch {
      /* ignore */
    }
  }
  return cache;
};

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useFeeState = () => useSyncExternalStore(subscribe, readFeeState, readFeeState);

export const resetFeeState = () => persist(buildSeedState());

const nextReceipt = (state) => {
  const sequence = Number(state.receiptSequence) || 1;
  return { receiptNo: receiptNumber(sequence, "2026"), sequence: sequence + 1 };
};

// ---------- Fee structures ----------
export const findStructure = (academicYear, group, section) =>
  readFeeState().feeStructures.find(
    (row) => row.academicYear === academicYear && row.group === group && row.section === section && row.status === "Active",
  );

/** Snapshot of the fee applicable at admission time. */
export const feeSnapshot = (academicYear, group, section) => {
  const structure = findStructure(academicYear, group, section)
    || readFeeState().feeStructures.find((row) => row.group === group && row.section === section && row.status === "Active");
  const feeItems = feeItemsForStructure(structure, group, section);
  return {
    admissionFee: Number(structure?.admissionFee ?? ADMISSION_FEE),
    courseFee: Number(structure?.courseFee ?? courseFeeFor(group, section)),
    feeItems,
  };
};

export const isDuplicateStructure = (values, id) =>
  readFeeState().feeStructures.some(
    (row) => row.id !== id
      && row.academicYear === values.academicYear
      && row.group === values.group
      && row.section === values.section,
  );

export const saveFeeStructure = (values, id) => {
  const state = readFeeState();
  const row = {
    academicYear: values.academicYear,
    group: values.group,
    section: values.section,
    admissionFee: Number(values.admissionFee || 0),
    courseFee: Number(values.courseFee || 0),
    feeItems: feeItemsForStructure({
      feeItems: values.feeItems,
      admissionFee: Number(values.admissionFee || 0),
      courseFee: Number(values.courseFee || 0),
    }, values.group, values.section),
    status: values.status || "Active",
  };
  const feeStructures = id
    ? state.feeStructures.map((item) => (item.id === id ? { ...item, ...row } : item))
    : [...state.feeStructures, { id: `FS-${Date.now()}`, ...row }];
  persist({ ...state, feeStructures });
};

// ---------- Fee accounts ----------
/**
 * Creates a fee account for a completed admission.
 * Always records the mandatory admission fee transaction.
 */
export const createFeeAccountFromAdmission = (admission) => {
  const state = readFeeState();
  let sequence = Number(state.receiptSequence) || 1;
  const receipt = () => {
    const value = receiptNumber(sequence, "2026");
    sequence += 1;
    return value;
  };
  const stamp = Date.now();
  const date = admission.admissionDate || todayISO();
  const method = admission.paymentMethod || "Cash";
  const reference = admission.transactionReference || "";
  const selectedFeeItems = deriveFeeItems(admission.feeItems?.length ? admission.feeItems : feeItemsForStructure({
    admissionFee: admission.admissionFee,
    courseFee: admission.courseFee,
  }, admission.group, admission.section));
  const payableAdmissionFee = Number(selectedFeeItems.find((item) => item.type === "Admission Fee")?.payableAmount ?? 0);
  const selectedFeeTotal = selectedFeeItems.reduce((sum, item) => sum + Number(item.payableAmount || 0), 0);
  const concessionAmount = Math.min(Math.max(Number(admission.concessionAmount || 0), 0), selectedFeeTotal);
  const totalPayable = Math.max(Number(admission.totalPayable ?? selectedFeeTotal - concessionAmount), 0);
  const transactions = [];

  const installments = (admission.installments || []).map((item) => ({
    no: item.no,
    amount: Number(item.amount || 0),
    dueDate: item.dueDate,
    paid: 0,
  }));

  if (admission.paymentPlan === "Full Payment") {
    transactions.push({
      id: `TXN-${stamp}-C`,
      receiptNo: receipt(),
      date,
      type: "Full Course Fee",
      amount: totalPayable,
      method,
      reference,
      note: "Collected during admission",
      installmentNo: null,
    });
  } else if (admission.collectFirstInstallment && installments.length) {
    installments[0].paid = installments[0].amount;
    transactions.push({
      id: `TXN-${stamp}-I1`,
      receiptNo: receipt(),
      date,
      type: "Installment 1",
      amount: installments[0].amount,
      method,
      reference,
      note: "First installment collected during admission",
      installmentNo: 1,
    });
  }

  const account = {
    id: `FA-${stamp}`,
    studentId: `STU-${stamp}`,
    admissionNo: admission.admissionNo || `ADM-${stamp}`,
    studentName: admission.studentName || "Unnamed Student",
    rollNumber: admission.rollNumber || "-",
    academicYear: admission.academicYear || DEFAULT_ACADEMIC_YEAR,
    academicLevel: admission.academicLevel || "-",
    group: admission.group,
    section: admission.section,
    admissionDate: date,
    admissionFee: payableAdmissionFee,
    courseFee: Number(selectedFeeItems.find((item) => item.type === "Course Fee")?.payableAmount ?? admission.courseFee ?? 0),
    feeItems: selectedFeeItems,
    concessionName: admission.concessionName || "",
    concessionType: admission.concessionType || "Fixed",
    concessionValue: Number(admission.concessionValue || 0),
    concessionAmount,
    totalPayable,
    paymentPlan: admission.paymentPlan || "Full Payment",
    paymentMethod: method,
    installments,
    transactions,
  };

  persist({ ...state, feeAccounts: [account, ...state.feeAccounts], receiptSequence: sequence });
  return account;
};

/**
 * Records a payment. Pass installmentNo for an installment payment,
 * or mode "full" to settle the whole remaining balance.
 */
export const collectPayment = (accountId, payment) => {
  const state = readFeeState();
  const target = state.feeAccounts.find((item) => item.id === accountId);
  if (!target) return null;

  const derived = deriveAccount(target);
  const amount = Math.max(Number(payment.amount || 0), 0);
  const discount = Math.max(Number(payment.discount || 0), 0);
  const fine = Math.max(Number(payment.fine || 0), 0);
  const netAmount = Math.max(amount + fine - discount, 0);
  if (netAmount <= 0 || netAmount > derived.balance) return null;

  const { receiptNo, sequence } = nextReceipt(state);
  let installments = target.installments || [];
  let type = "Course Fee";

  if (payment.mode === "full") {
    installments = installments.map((item) => ({ ...item, paid: Number(item.amount || 0) }));
    type = derived.paymentPlan === "Full Payment" ? "Course Fee" : "Full Remaining Balance";
  } else if (payment.installmentNo) {
    installments = installments.map((item) =>
      item.no === Number(payment.installmentNo)
        ? { ...item, paid: Math.min(Number(item.paid || 0) + netAmount, Number(item.amount || 0)) }
        : item,
    );
    type = `Installment ${payment.installmentNo}`;
  }

  const transaction = {
    id: `TXN-${Date.now()}`,
    receiptNo,
    date: payment.date || todayISO(),
    type,
    amount: netAmount,
    baseAmount: amount,
    discount,
    fine,
    method: payment.method || "Cash",
    reference: payment.reference || "",
    note: payment.note || "",
    installmentNo: payment.mode === "full" ? null : Number(payment.installmentNo) || null,
    previousBalance: derived.balance,
    balance: Math.max(derived.balance - netAmount, 0),
  };

  const feeAccounts = state.feeAccounts.map((item) =>
    item.id === accountId ? { ...item, installments, transactions: [...item.transactions, transaction] } : item,
  );

  persist({ ...state, feeAccounts, receiptSequence: sequence });
  return transaction;
};

// ---------- Aggregations ----------
export const feeAccountsDerived = (state) => (state?.feeAccounts || []).map(deriveAccount);

export const overviewTotals = (accounts) => {
  const totalExpected = accounts.reduce((sum, item) => sum + item.totalPayable, 0);
  const totalCollected = accounts.reduce((sum, item) => sum + item.totalPaid, 0);
  return {
    totalStudents: accounts.length,
    totalExpected,
    totalCollected,
    outstanding: Math.max(totalExpected - totalCollected, 0),
    pendingStudents: accounts.filter((item) => item.balance > 0).length,
    overdueStudents: accounts.filter((item) => item.feeStatus === "Overdue").length,
    collectedPercent: totalExpected ? (totalCollected / totalExpected) * 100 : 0,
  };
};

export const groupWiseTotals = (accounts) => {
  const map = new Map();
  accounts.forEach((item) => {
    const row = map.get(item.group) || { group: item.group, expected: 0, collected: 0, outstanding: 0 };
    row.expected += item.totalPayable;
    row.collected += item.totalPaid;
    row.outstanding += item.balance;
    map.set(item.group, row);
  });
  return [...map.values()];
};

export const upcomingInstallments = (accounts, limit = 6) =>
  accounts
    .flatMap((account) =>
      account.installments
        .filter((item) => item.status !== "Paid")
        .map((item) => ({
          key: `${account.id}-${item.no}`,
          studentName: account.studentName,
          admissionNo: account.admissionNo,
          group: account.group,
          section: account.section,
          no: item.no,
          dueDate: item.dueDate,
          amount: item.balance,
          status: item.status,
        })),
    )
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, limit);

export const allTransactions = (accounts) =>
  accounts
    .flatMap((account) =>
      account.transactions.map((txn) => ({
        ...txn,
        accountId: account.id,
        admissionNo: account.admissionNo,
        studentName: account.studentName,
        academicYear: account.academicYear,
        group: account.group,
        section: account.section,
        balance: deriveAccount(account).balance,
      })),
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
export const feeStatusTone = (status) => ({ Paid: 'cms-badge-active', Partial: 'cms-badge-warn', Pending: 'cms-badge-warn', Due: 'cms-badge-info', Overdue: 'cms-badge-danger' }[status] || 'cms-badge-inactive');
