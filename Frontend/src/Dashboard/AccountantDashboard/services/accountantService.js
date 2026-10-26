import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { ACTIONS } from "@/features/rolesPermissions/rolesPermissions.constants.js";
import { readFee, feeStatus, scopedFeeMasters } from "../utils/feeViewData.js";
import { PAYMENT_METHODS } from "../../../data/feeManagementData.js";

// Shared API modules retain their original clients, endpoints and contracts.
// Payroll: reuse the project API without changing its contract.
export * as payrollApi from "@/api/payrollApi.js";
// Financial reports.
export * as reportApi from "@/api/reportApi.js";
// Attendance.
export { attendanceService } from "@/api/attendanceService.js";
// Reimbursements.
export { fetchClaims, fetchAccountEntries, disburseClaimPayment } from "@/services/reimbursementService.js";

// Shared display adapters (preserved from AccountantPages).
export const getRows = (payload) => {
  const value = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values", "rows", "Rows", "payments", "Payments", "dues", "Dues"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

export const getNumber = (item, keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
};

export const getText = (item, keys, fallback = "-") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
};

export const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const normalizePayment = (item = {}) => ({
  id: getText(item, ["feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"], Math.random()),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  type: getText(item, ["paymentType", "PaymentType", "feeTypeName", "FeeTypeName", "type", "Type"], "Fee payment"),
  amount: getNumber(item, ["amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"]) || 0,
  date: getText(item, ["paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt"], ""),
  method: getText(item, ["paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method"]),
  reference: getText(item, ["referenceNumber", "ReferenceNumber", "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber"]),
  status: getText(item, ["status", "Status", "paymentStatus", "PaymentStatus"], "Paid"),
});

export const normalizeDue = (item = {}) => ({
  id: getText(item, ["feeInstallmentId", "FeeInstallmentId", "studentFeeId", "StudentFeeId", "id", "Id"], Math.random()),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  amount: getNumber(item, ["balance", "Balance", "outstandingAmount", "OutstandingAmount", "pendingAmount", "PendingAmount", "dueAmount", "DueAmount", "amount", "Amount"]) || 0,
  dueDate: getText(item, ["dueDate", "DueDate", "nextDue", "NextDue"], ""),
  status: getText(item, ["status", "Status", "feeStatus", "FeeStatus"], "Due"),
});

export const normalizePayroll = (item = {}) => ({
  id: getText(item, ["payslipId", "PayslipId", "salaryAssignmentId", "SalaryAssignmentId", "id", "Id"], Math.random()),
  staffName: getText(item, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]),
  month: getText(item, ["monthName", "MonthName", "payrollMonth", "PayrollMonth", "month", "Month"]),
  amount: getNumber(item, ["netSalary", "NetSalary", "netPay", "NetPay", "amount", "Amount", "salary", "Salary"]) || 0,
  status: getText(item, ["status", "Status", "paymentStatus", "PaymentStatus"], "Pending"),
});


// Existing route-level loading and campus hooks.
export function useAccountantPage(loader, dependencies) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: "" });
    loader().then((data) => { if (active) setState({ data, loading: false, error: "" }); }).catch((error) => {
      if (active) setState({ data: null, loading: false, error: getApiErrorMessage(error, "Unable to load finance data.") });
    });
    return () => { active = false; };
  }, [...dependencies, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload };
}

export function useCampusParams() {
  const { selectedCampusId } = useCampusContext();
  return useMemo(() => selectedCampusId ? { campusId: Number(selectedCampusId) || selectedCampusId } : {}, [selectedCampusId]);
}


// Finance data access and hooks
export function unwrap(payload) {
  let value = payload;
  for (let depth = 0; depth < 6; depth += 1) {
    const nested = value?.data ?? value?.Data;
    if (nested == null) break;
    value = nested;
  }
  return value;
}

export function rowsOf(payload) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values", "rows", "Rows", "details", "Details", "staffRows", "StaffRows", "payments", "Payments", "dues", "Dues"]) {
    if (value?.[key] != null) return rowsOf(value[key]);
  }
  return [];
}

export function requestError(error) {
  if (error?.code === "ACCOUNTANT_DATA_ERROR") return error.message;
  const status = error?.response?.status;
  const endpoint = String(error?.config?.url || "").split("?")[0].replace(/\/(\d+)(?=\/|$)/g, "/:id");
  const message = status === 403 ? "Your account does not have permission to access this data."
    : status === 401 ? "Your session has expired. Please sign in again."
    : status ? "The backend could not complete this request." : "The backend could not be reached.";
  return `${message}${endpoint ? ` ${endpoint}` : ""}${status ? ` (HTTP ${status})` : ""}`;
}

export function useFinanceParams() {
  const { selectedCampusId } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  return useMemo(() => Object.fromEntries(Object.entries({ campusId: selectedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId })
    .filter(([, value]) => Number(value) > 0).map(([key, value]) => [key, Number(value)])), [selectedCampusId, selectedBoardId, selectedAcademicYearId]);
}

export function useFinancePage(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: "", loader: null });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState((previous) => ({ data: previous.loader === loader ? previous.data : null, loading: true, error: "", loader }));
    Promise.resolve().then(() => loader(controller.signal)).then((data) => {
      if (active) setState({ data, loading: false, error: "", loader });
    }).catch((error) => {
      if (active) setState((previous) => ({ data: previous.loader === loader ? previous.data : null, loading: false, error: requestError(error), loader }));
    });
    return () => { active = false; controller.abort(); };
  }, [loader, reloadKey]);
  // Hide the previous context even on the render before effect cleanup.
  return { ...(state.loader === loader ? state : { data: null, loading: true, error: "" }), reload };
}

export async function loadSections(loaders) {
  const entries = Object.entries(loaders);
  const results = await Promise.allSettled(entries.map(([, loader]) => loader()));
  const data = { errors: [] };
  results.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === "fulfilled") data[key] = unwrap(result.value);
    else data.errors.push(`${key}: ${requestError(result.reason)}`);
  });
  if (results.every((result) => result.status === "rejected")) throw results[0].reason;
  return data;
}

export async function loadScopedLedger(params, signal) {
  const response = await apiClient.get(apiEndpoints.fee.ledger, { params, signal });
  const ledger = rowsOf(response);
  if (!params.boardId || !ledger.length) return ledger;
  // The primary ledger query currently ignores boardId; verify membership using student masters.
  const students = new Map();
  let pageNumber = 1;
  let totalPages = 1;
  do {
    signal?.throwIfAborted();
    const page = unwrap(await apiClient.get(apiEndpoints.students.getAll, {
      params: { ...params, pageNumber, pageSize: 100 }, signal,
    }));
    rowsOf(page).forEach((student) => {
      if (String(student.boardId ?? student.BoardId) === String(params.boardId)) {
        students.set(String(student.studentId ?? student.StudentId), student);
      }
    });
    totalPages = Number(page?.totalPages ?? page?.TotalPages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw Object.assign(new Error("Student context could not be verified. Retry before viewing this board's fees."), { code: "ACCOUNTANT_DATA_ERROR" });
    }
    pageNumber += 1;
  } while (pageNumber <= totalPages);
  return ledger.filter((row) => students.has(String(row.studentId ?? row.StudentId))).map((row) => {
    const student = students.get(String(row.studentId ?? row.StudentId));
    return { ...row, boardName: student.boardName ?? student.BoardName, academicYearName: student.academicYearName ?? student.AcademicYearName, rollNumber: student.rollNo ?? student.RollNo };
  });
}

export async function loadPaymentHistory(params, signal, authorize = () => false) {
  signal?.throwIfAborted();
  if (!authorize()) throw invalid("Student payment history requires verified Fee Management create permission for POST /api/v1/fees/bulk-history. The individual history and receipt routes exclude Accountant.");
  const ledger = await loadScopedLedger(params, signal);
  const students = [...new Set(ledger.map(row => readFee(row, "studentId")))];
  if (students.some(id => !validId(id)) || ledger.some(row => !validId(readFee(row, "studentFeeId")))) throw invalid("Payment history cannot be verified because account IDs are missing.");
  const feeIds = new Set(ledger.map(row => String(readFee(row, "studentFeeId"))));
  const payments = new Map(), errors = [];
  // The existing bulk endpoint has its own module/create authorization. It is
  // the primary source, never a fallback after a denied history/receipt request.
  for (let start = 0; start < students.length; start += 50) {
    signal?.throwIfAborted();
    try {
      if (!authorize()) throw invalid("History permission is no longer available. Refresh your permissions.");
      const ids = students.slice(start, start + 50).map(Number);
      const data = checkedFeeData(await apiClient.post("/api/v1/fees/bulk-history", ids, { signal }));
      for (const id of ids) {
        if (data?.[String(id)] == null) throw invalid("The backend did not return payment history for a requested student.");
        for (const payment of checkedFeeRows(data[String(id)])) {
          if (!validId(readFee(payment, "studentFeeId")) || Number(readFee(payment, "studentId")) !== id) throw invalid("The returned transaction does not match the requested student.");
          if (!feeIds.has(String(readFee(payment, "studentFeeId")))) continue;
          const amount = readFee(payment, "amount");
          if (!validId(readFee(payment, "feePaymentId")) || amount == null || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw invalid("The API returned an invalid payment transaction. No replacement values have been used.");
          payments.set(String(readFee(payment, "feePaymentId")), payment);
        }
      }
    } catch (failure) {
      signal?.throwIfAborted();
      errors.push(requestError(failure));
      break;
    }
  }
  return { payments: [...payments.values()], errors };
}

export async function loadCollectionAccounts(params, signal) {
  const rows = checkedFeeRows(await apiClient.get(apiEndpoints.fee.collection, { params, signal }));
  return rows.map((row) => ({ ...row, totalPayable: readFee(row, "payable"), totalPaid: readFee(row, "paid"), nextDueDate: readFee(row, "nextDue") }));
}

export async function loadCollectionDetails(row, signal) {
  const feeId = readFee(row, "studentFeeId");
  if (feeId != null && feeId !== "" && !validId(feeId)) throw invalid("The selected fee account ID is invalid. Refresh the collection list.");
  // Match Admin: use the student-specific details route whenever a valid
  // student ID is present. The shared loader validates IDs and response identity,
  // preserves backend errors, and only uses the fee route for a real fee ID.
  const detail = await loadLedgerDetails(row, signal);
  if (!validId(readFee(detail, "studentId")) || !validId(readFee(detail, "studentFeeId"))) throw invalid("The returned fee account is missing valid student or fee account IDs. Payment collection is unavailable.");
  if (validId(feeId) && Number(readFee(detail, "studentFeeId")) !== Number(feeId)) throw invalid("The returned fee account does not match the selected student. Refresh the collection list before collecting payment.");
  return detail;
}

export function feeCollectionAccess(permissions) {
  return Boolean(!permissions.loading && !permissions.error && (permissions.isSuperOrAdmin || permissions.canDo("fee-management", ACTIONS.CREATE, "fee-collection")));
}

export function paymentPayload(account, draft) {
  const id = (key) => Number(readFee(account, key));
  if (!["studentId", "studentFeeId"].every(key => validId(readFee(account, key)))) throw invalid("Valid student and fee account IDs are required.");
  const number = key => draft[key] !== "" && draft[key] != null && Number.isFinite(Number(draft[key]));
  if (!number("amount") || Number(draft.amount) <= 0) throw invalid("Enter a valid payment amount greater than zero.");
  if (!["discount", "fine"].every(key => number(key) && Number(draft[key]) >= 0)) throw invalid("Discount and fine must be valid, non-negative amounts.");
  const amount = Number(draft.amount), discount = Number(draft.discount), fine = Number(draft.fine);
  const balance = readFee(account, "outstandingBalance");
  const savedBalance = balance == null ? NaN : Number(balance);
  const finalAmount = Math.round((amount + fine - discount + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(savedBalance) || savedBalance <= 0) throw invalid("A current outstanding balance is required. Refresh the fee account.");
  if (amount > savedBalance || !Number.isFinite(finalAmount) || finalAmount <= 0 || finalAmount > savedBalance) throw invalid("Payment including fine and discount must be positive and cannot exceed the outstanding balance.");
  if (!["full", "partial", "schedules"].includes(draft.target)) throw invalid("Select a payment target.");
  const ids = draft.target !== "schedules" ? [] : [...new Set(draft.feeInstallmentIds || [])].map(Number);
  const schedules = checkedFeeRows(readFee(account, "schedules") ?? []);
  const selected = schedules.filter(row => ids.includes(Number(readFee(row, "feeInstallmentId"))));
  if (draft.target === "schedules" && (!ids.length || ids.some(value => !validId(value)) || selected.length !== ids.length || selected.some(row => readFee(row, "balanceAmount") == null || Number(readFee(row, "balanceAmount")) <= 0 || !Number.isFinite(Number(readFee(row, "balanceAmount")))))) throw invalid("Select valid pending fee schedules from this account.");
  if (ids.length && (amount > selected.reduce((sum, row) => sum + Number(readFee(row, "balanceAmount")), 0) || finalAmount > selected.reduce((sum, row) => sum + Number(readFee(row, "balanceAmount")), 0))) throw invalid("Payment cannot exceed the selected schedule balance.");
  if (!PAYMENT_METHODS.includes(draft.paymentMode)) throw invalid("Select a supported payment method.");
  if (draft.paymentMode !== "Cash" && !String(draft.transactionReference || "").trim()) throw invalid("A transaction reference is required for non-cash payments.");
  if (String(draft.transactionReference || "").length > 100 || String(draft.note || "").length > 500) throw invalid("Reference must be at most 100 characters and notes at most 500 characters.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.paymentDate || "") || Number.isNaN(Date.parse(draft.paymentDate)) || new Date(draft.paymentDate).toISOString().slice(0, 10) !== draft.paymentDate) throw invalid("Enter a valid payment date.");
  return { studentId: id("studentId"), studentFeeId: id("studentFeeId"), feeInstallmentIds: ids, amount, paymentDate: new Date(draft.paymentDate).toISOString(), paymentMode: draft.paymentMode, receiptNumber: "", discount, fine, transactionReference: String(draft.transactionReference || "").trim(), note: draft.note || "" };
}

export async function collectStudentPayment(account, draft, authorize) {
  const payload = paymentPayload(account, draft);
  if (!authorize()) throw invalid("Verified Fee Management create permission is required to collect payment.");
  try {
    const saved = checkedFeeData(await apiClient.post(apiEndpoints.fee.collect, payload));
    if (!validId(readFee(saved, "feePaymentId")) || Number(readFee(saved, "studentId")) !== payload.studentId || Number(readFee(saved, "studentFeeId")) !== payload.studentFeeId || readFee(saved, "amount") == null || !Number.isFinite(Number(readFee(saved, "amount"))) || Number(readFee(saved, "amount")) <= 0 || String(readFee(saved, "status")).toLowerCase() !== "success") throw invalid("The payment response could not be confirmed.");
    return saved;
  } catch (error) {
    if (!error.response || error.response.status >= 500) error.feeSaveUncertain = true;
    throw error;
  }
}


// Fee API requests and envelope validation
export function checkedFeeData(payload) {
  let value = payload;
  for (let depth = 0; depth < 8; depth += 1) {
    if (value?.success === false || value?.Success === false || value?.status === false || value?.Status === false) {
      throw Object.assign(new Error("The fee API reported an unsuccessful response. Please retry or contact your administrator."), { code: "ACCOUNTANT_DATA_ERROR" });
    }
    const nested = value?.data ?? value?.Data;
    if (nested == null) return value;
    value = nested;
  }
  return value;
}

export function checkedFeeRows(payload) {
  const value = checkedFeeData(payload);
  if (Array.isArray(value) || ["items", "Items", "records", "Records", "results", "Results", "$values", "rows", "Rows"].some((key) => value?.[key] != null)) return rowsOf(value);
  throw Object.assign(new Error("The fee API returned an unrecognized list response. No records have been displayed."), { code: "ACCOUNTANT_DATA_ERROR" });
}

export async function loadSetupRecords(kind, endpoint, params, signal, paging = {}) {
  // Admin treats types/scholarships as reusable masters, not student-year records.
  const query = kind === "types" || kind === "scholarships" ? undefined
    : kind === "structures" ? { campusId: params.campusId }
      : kind === "transport" ? { campusId: params.campusId, pageNumber: paging.page, pageSize: 5, search: paging.search }
        : params;
  const response = await apiClient.get(endpoint, { ...(query ? { params: query } : {}), signal });
  const data = checkedFeeData(response);
  let rows = checkedFeeRows(data);
  if (kind === "types" || kind === "scholarships") rows = scopedFeeMasters(rows, params);
  // Match Admin: the structures endpoint owns campus scope. Navbar board/year
  // defaults are for creation, not additional filters on this campus-wide list.
  if (kind !== "transport") return { rows };
  const total = readFee(data, "totalCount");
  if (total == null || !Number.isInteger(Number(total)) || Number(total) < 0) {
    throw Object.assign(new Error("Transport fee pagination metadata is unavailable. The backend must return totalCount."), { code: "ACCOUNTANT_DATA_ERROR" });
  }
  return { rows, total: Number(total) };
}

export async function loadFeeOverview(params, signal) {
  const results = await Promise.allSettled([
    apiClient.get(apiEndpoints.fee.dashboard, { params, signal }),
    apiClient.get(apiEndpoints.fee.due, { params, signal }),
  ]);
  const [dashboard, due] = results;
  const data = { dashboard: null, due: null, errors: {} };
  if (dashboard.status === "fulfilled") {
    try {
      const value = checkedFeeData(dashboard.value);
      if (!value || typeof value !== "object" || Array.isArray(value)) data.errors.dashboard = "The fee dashboard response is unavailable or invalid.";
      else data.dashboard = value;
    } catch (error) { data.errors.dashboard = requestError(error); }
  } else data.errors.dashboard = requestError(dashboard.reason);
  if (due.status === "fulfilled") {
    try { data.due = checkedFeeRows(due.value); } catch (error) { data.errors.due = requestError(error); }
  } else data.errors.due = requestError(due.reason);
  return data;
}


// Fee ledger
const invalid = (message) => Object.assign(new Error(message), { code: "ACCOUNTANT_DATA_ERROR" });
const validId = (value) => /^\d+$/.test(String(value ?? "")) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;

export function ledgerDetailEndpoint(row) {
  const studentId = readFee(row, "studentId");
  if (studentId != null && studentId !== "") {
    if (!validId(studentId)) throw invalid("The selected student's ID is invalid. Refresh the ledger before viewing details.");
    return apiEndpoints.fee.studentFeeDetailsByStudent(Number(studentId));
  }
  const feeId = readFee(row, "studentFeeId");
  if (!validId(feeId)) throw invalid("The selected fee record has no valid identifier. Refresh the ledger before viewing details.");
  return apiEndpoints.fee.getStudentFee(Number(feeId));
}

export async function loadLedgerDetails(row, signal) {
  const endpoint = ledgerDetailEndpoint(row);
  let response;
  try {
    response = await apiClient.get(endpoint, { signal });
  } catch (error) {
    if (error.response?.status === 400) {
      const body = error.response.data;
      const errors = body?.errors ?? body?.Errors;
      const messages = errors && typeof errors === "object" ? Object.values(errors).flat().filter((value) => typeof value === "string") : [];
      const message = body?.message ?? body?.Message ?? body?.detail ?? body?.title;
      throw invalid(`${requestError(error)}${message ? ` ${message}` : ""}${messages.length ? ` ${messages.join(" ")}` : ""}`);
    }
    throw error;
  }
  const detail = checkedFeeData(response);
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) throw invalid("Student fee details were not returned. Refresh the ledger and try again.");
  const identityKey = validId(readFee(row, "studentId")) ? "studentId" : "studentFeeId";
  if (!validId(readFee(detail, identityKey)) || Number(readFee(detail, identityKey)) !== Number(readFee(row, identityKey))) {
    throw invalid("The returned fee details do not match the selected student. Refresh the ledger before trying again.");
  }
  for (const key of ["studentId", "admissionNumber"]) {
    const expected = readFee(row, key);
    const actual = readFee(detail, key);
    if (expected != null && expected !== "" && actual != null && (key === "studentId" ? Number(expected) !== Number(actual) : String(expected) !== String(actual))) {
      throw invalid("The returned fee details do not match the selected student. Refresh the ledger before trying again.");
    }
  }
  return detail;
}

export function ledgerPage(rows, pageNumber, search = "", filters = {}) {
  const term = search.trim().toLowerCase();
  const filtered = rows.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(readFee(row, key)) === value)
    && (!term || Object.values(row).some((value) => typeof value !== "object" && String(value ?? "").toLowerCase().includes(term))));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / 5));
  const current = Math.min(pages, Math.max(1, Number(pageNumber) || 1));
  const offset = (current - 1) * 5;
  return { rows: filtered.slice(offset, offset + 5), total, pages, current, start: total ? offset + 1 : 0, end: Math.min(offset + 5, total) };
}


// Fee setup and permissions
export const setupNames = { types: "Fee Type", structures: "Fee Structure", hostel: "Hostel Fee", transport: "Transport Fee", scholarships: "Scholarship", fine: "Fine Rule" };
export const setupIdKeys = { types: "feeTypeId", structures: "feeStructureId", hostel: "feeConfigId", transport: "pickupPointId", scholarships: "scholarshipId", fine: "fineRuleId" };
export const setupId = (kind, row) => readFee(row, setupIdKeys[kind]);

export function feeSetupAccess(permissions, kind) {
  const module = "fee-management";
  const screen = kind === "hostel" ? "hostel-fees" : "fee-structure";
  const ready = !permissions.loading && !permissions.error;
  const view = Boolean(ready && (permissions.canView(module, screen) || permissions.canView(module) || permissions.isSuperOrAdmin || permissions.isAccountant));
  // Transport fare configuration belongs to Fee Setup, not route management.
  const actions = { create: ACTIONS.CREATE, edit: ACTIONS.EDIT, delete: kind === "transport" ? null : ACTIONS.DELETE };
  return { module, screen, view, ...Object.fromEntries(Object.entries(actions).map(([key, action]) => [key, Boolean(view && action && (permissions.canDo(module, action, screen) || permissions.canDo(module, action) || permissions.isSuperOrAdmin))])) };
}

export function requireSetupAction(access, action, method, endpoint) {
  if (!access?.view || !access[action]) {
    const permission = action === "create" && access?.module === "transport" ? ACTIONS.MANAGE_ROUTES : action;
    throw Object.assign(new Error(`Permission required: ${access?.module || "fee-management"}:${access?.screen || "fee-structure"}:${permission}. ${method} ${endpoint}`), { code: "ACCOUNTANT_DATA_ERROR" });
  }
}

export function setupEndpoint(kind, row) {
  const id = setupId(kind, row);
  if (id != null && (!Number.isInteger(Number(id)) || Number(id) <= 0)) throw new Error("A valid saved record ID is required.");
  const config = {
    types: [apiEndpoints.fee.feeTypes, apiEndpoints.fee.feeTypeById],
    structures: [apiEndpoints.fee.createStructure, apiEndpoints.fee.getStructureById],
    hostel: [apiEndpoints.hostel.fees, apiEndpoints.hostel.feeById],
    transport: [apiEndpoints.transport.pickupPoints, apiEndpoints.transport.pickupPointById],
    scholarships: [apiEndpoints.fee.scholarships, apiEndpoints.fee.getScholarshipById],
    fine: [apiEndpoints.fee.fineRules, apiEndpoints.fee.fineRuleById],
  }[kind];
  if (!config) throw new Error("Unsupported fee setup section.");
  return id == null ? config[0] : config[1](id);
}

export async function loadFeeOptions(endpoint, params, signal) {
  const rows = [];
  let pageNumber = 1;
  let totalPages = 1;
  do {
    const data = checkedFeeData(await apiClient.get(endpoint, { params: { ...params, pageNumber, pageSize: 100 }, signal }));
    rows.push(...checkedFeeRows(data));
    if (!Array.isArray(data)) {
      const count = readFee(data, "totalCount");
      const size = Number(readFee(data, "pageSize") ?? 100);
      const explicitPages = readFee(data, "totalPages");
      totalPages = explicitPages != null ? Number(explicitPages) : count != null && size > 0 ? Math.ceil(Number(count) / size) : 1;
      if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > 10000) throw new Error("Fee setup lookup pagination could not be verified.");
    }
    pageNumber += 1;
  } while (pageNumber <= totalPages);
  return rows;
}

export async function loadSetupEditor(kind, row, params, signal, viewOnly = false) {
  const sources = viewOnly ? {} : kind === "structures" ? { types: apiEndpoints.fee.feeTypes, boards: apiEndpoints.boards.getAll, years: apiEndpoints.academicYears.getAll }
    : kind === "fine" ? { types: apiEndpoints.fee.feeTypes }
      : kind === "hostel" ? { blocks: apiEndpoints.hostel.blocks, roomTypes: apiEndpoints.hostel.roomTypes }
        : kind === "transport" ? { routes: apiEndpoints.transport.routes } : {};
  const lookups = {};
  const context = { ...params, ...(row && kind === "structures" ? { boardId: readFee(row, "boardId"), academicYearId: readFee(row, "academicYearId") } : {}) };
  await Promise.all(Object.entries(sources).map(async ([key, endpoint]) => {
    const query = key === "types" || key === "years" || key === "boards" ? {} : context;
    lookups[key] = await loadFeeOptions(endpoint, query, signal);
    if (key === "types") lookups[key] = scopedFeeMasters(lookups[key], context).filter((item) => !["hostel fee", "transport fee"].includes(String(readFee(item, "feeTypeName") || "").trim().toLowerCase()));
  }));
  let detail = null;
  const warnings = [];
  if (row && kind === "structures") {
    const results = await Promise.allSettled([
      apiClient.get(setupEndpoint(kind, row), { signal }),
      apiClient.get(apiEndpoints.fee.getStructureItems(setupId(kind, row)), { signal }),
    ]);
    // Admin can hydrate a listed structure from its items route. Never use that
    // fallback to get around an authorization denial or a deleted-record response.
    for (const result of results) {
      if (result.status === "rejected" && [401, 403, 404].includes(result.reason?.response?.status)) throw result.reason;
    }
    const [recordResult, itemsResult] = results;
    if (recordResult.status === "fulfilled") detail = checkedFeeData(recordResult.value);
    else { detail = { ...row }; warnings.push(requestError(recordResult.reason)); }
    if (itemsResult.status === "fulfilled") detail = { ...detail, items: checkedFeeRows(itemsResult.value) };
    else {
      const existing = readFee(detail, "items") ?? readFee(row, "items");
      if (existing == null) throw itemsResult.reason;
      const savedItems = checkedFeeRows(existing);
      if (!viewOnly && savedItems.some((item) => !readFee(item, "feeStructureComponentId"))) throw itemsResult.reason;
      detail = { ...detail, items: savedItems };
      warnings.push(requestError(itemsResult.reason));
    }
  } else if (row) detail = checkedFeeData(await apiClient.get(setupEndpoint(kind, row), { signal }));
  if (row && (!detail || typeof detail !== "object" || Array.isArray(detail))) throw new Error("The saved fee record could not be loaded. No changes have been made.");
  return { lookups, detail: detail ? { ...row, ...detail } : null, warnings };
}

const names = ["feeTypeName", "scholarshipName", "fineRuleName"];
const nameKey = (kind) => ({ types: names[0], scholarships: names[1], fine: names[2] })[kind];
const keysByKind = {
  types: ["feeTypeName", "feeTypeCode", "category"], scholarships: ["scholarshipName", "discountType", "discountValue"],
  fine: ["fineRuleName", "applicableFeeId", "fineType", "fineAmount", "gracePeriod"],
  hostel: ["hostelId", "roomTypeId", "feeFrequency", "hostelFeeAmount", "securityDeposit", "effectiveDate"],
  transport: ["routeId", "pickupPointName", "landmark", "sequenceNo", "distanceFromStart", "monthlyFee", "pickupTime", "dropTime"],
  structures: ["structureName", "description", "boardId", "academicYearId", "groupId", "programId", "yearFeeMode", "incrementType", "incrementValue"],
};

export function setupDraft(kind, detail, lookups, params) {
  const defaults = { status: "Active", category: "Academic", discountType: "Percentage", fineType: "Fixed Amount", gracePeriod: 0, feeFrequency: "Monthly", securityDeposit: 0,
    effectiveDate: new Date().toLocaleDateString("en-CA"), sequenceNo: 1, pickupTime: "07:30", dropTime: "16:15", yearFeeMode: "same", incrementType: "percentage", incrementValue: "", boardId: params.boardId ?? "", academicYearId: params.academicYearId ?? "" };
  const draft = Object.fromEntries((keysByKind[kind] || []).map((key) => [key, readFee(detail, key) ?? defaults[key] ?? ""]));
  draft.status = detail ? feeStatus(detail) : "Active";
  if (draft.status === "-") draft.status = "Active";
  if (kind === "scholarships" && draft.discountType === "Fixed Amount") draft.discountType = "Fixed";
  if (kind === "hostel") draft.effectiveDate = String(draft.effectiveDate).slice(0, 10);
  if (kind === "transport") { draft.pickupTime = String(draft.pickupTime).slice(0, 5); draft.dropTime = String(draft.dropTime).slice(0, 5); }
  if (kind === "structures") {
    const saved = checkedItems(detail);
    const types = lookups.types || [];
    draft.items = [...saved.map((item) => ({ feeTypeId: readFee(item, "feeTypeId"), feeTypeName: readFee(item, "feeTypeName"), itemId: readFee(item, "feeStructureComponentId"), rule: readFee(item, "rule") || "Optional", amount: readFee(item, "amount") ?? "", isActive: readFee(item, "isActive") !== false,
      original: { rule: readFee(item, "rule") || "Optional", amount: readFee(item, "amount") ?? "", isActive: readFee(item, "isActive") !== false } })),
      ...types.filter((type) => !saved.some((item) => String(readFee(item, "feeTypeId")) === String(readFee(type, "feeTypeId")))).map((type) => ({ feeTypeId: readFee(type, "feeTypeId"), feeTypeName: readFee(type, "feeTypeName"), rule: "Optional", amount: "", isActive: false }))];
  }
  return draft;
}

function checkedItems(detail) {
  const items = readFee(detail, "items");
  return items == null ? [] : checkedFeeRows(items);
}

export const structureItemChanged = (item) => !item.original || item.rule !== item.original.rule || Number(item.amount) !== Number(item.original.amount) || item.isActive !== item.original.isActive;

export function structureDraftPreview(draft) {
  const first = draft.items.filter((item) => item.isActive).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const increment = draft.yearFeeMode === "different" ? draft.incrementType === "percentage" ? first * Number(draft.incrementValue || 0) / 100 : Number(draft.incrementValue || 0) : 0;
  const rounded = Math.round((increment + Number.EPSILON) * 100) / 100;
  return { first, increment: rounded, second: Math.round((first + rounded + Number.EPSILON) * 100) / 100 };
}

export function validateSetupDraft(kind, draft, rows, row) {
  const name = nameKey(kind);
  const text = (key) => String(draft[key] ?? "").trim();
  const number = (key) => text(key) !== "" && Number.isFinite(Number(draft[key]));
  const positive = (key) => number(key) && Number(draft[key]) > 0;
  if (name && !text(name)) return `${setupNames[kind]} Name is required`;
  if (name && rows.some((item) => String(setupId(kind, item)) !== String(setupId(kind, row)) && String(readFee(item, name) || "").trim().toLowerCase() === text(name).toLowerCase())) return `${text(name)} already exists`;
  if (kind === "types" && text(name).length < 2) return "Fee Type Name must contain at least 2 characters";
  if (kind === "scholarships" && (!positive("discountValue") || (draft.discountType === "Percentage" && Number(draft.discountValue) > 100))) return "Enter a positive discount value; percentages cannot exceed 100";
  if (kind === "fine") {
    if (!positive("applicableFeeId")) return "Applicable Fee / Fee Type is required";
    if (!positive("fineAmount") || (draft.fineType === "Percentage" && Number(draft.fineAmount) > 100)) return "Enter a positive fine amount; percentages cannot exceed 100";
    if (!number("gracePeriod") || Number(draft.gracePeriod) < 0 || !Number.isInteger(Number(draft.gracePeriod))) return "Grace Period must be a non-negative whole number";
  }
  if (kind === "hostel" && (!positive("hostelId") || !positive("roomTypeId") || !positive("hostelFeeAmount") || !number("securityDeposit") || Number(draft.securityDeposit) < 0 || !text("effectiveDate"))) return "Select hostel block, room type, effective date, and valid hostel fee and deposit";
  if (kind === "transport" && (!positive("routeId") || !text("pickupPointName") || !number("monthlyFee") || Number(draft.monthlyFee) < 0 || !number("distanceFromStart") || Number(draft.distanceFromStart) < 0 || !positive("sequenceNo") || !Number.isInteger(Number(draft.sequenceNo)) || !text("pickupTime") || !text("dropTime"))) return "Select route, pickup point, times, distance, sequence, and a valid monthly fare";
  if (kind === "structures") {
    if (!["boardId", "academicYearId", "groupId", "programId"].every(positive)) return "Board, Academic Year, Group and Program are required";
    if (row && draft.items.some((item) => item.original && !item.itemId)) return "Saved fee component IDs are missing. Refresh before editing this structure";
    const active = draft.items.filter((item) => item.isActive);
    if (!active.length) return "Select at least one active fee type for this structure";
    if (draft.items.some((item) => !Number.isInteger(Number(item.feeTypeId)) || Number(item.feeTypeId) <= 0 || Number(item.amount || 0) < 0)) return "Only saved fee types and non-negative amounts can be used";
    if (draft.items.some((item) => (!row ? item.isActive : structureItemChanged(item) && (item.itemId || item.isActive)) && (!Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0))) return "Fee amount must be greater than 0 for active or modified fee types";
    if (!row && draft.yearFeeMode === "different" && (!number("incrementValue") || Number(draft.incrementValue) < 0)) return "Enter a valid, non-negative increment value";
    if (!row && !Number.isFinite(structureDraftPreview(draft).second)) return "Enter a smaller fee or increment value";
    if (!row && rows.some((item) => feeStatus(item) === "Active" && Number(readFee(item, "academicLevelId") || 1) === 1 && ["academicYearId", "groupId", "programId"].every((key) => String(readFee(item, key)) === String(draft[key])))) return "A fee structure already exists for the selected Academic Year, Group and Program";
  }
  return "";
}

export function setupPayload(kind, draft, row, params) {
  const n = (key) => Number(draft[key]);
  const active = draft.status !== "Inactive";
  if (kind === "types") {
    const code = draft.feeTypeName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
    return { FeeTypeName: draft.feeTypeName.trim(), FeeTypeCode: draft.feeTypeCode || (code.length >= 2 ? code : `FT${code}`.slice(0, 30)), Category: draft.category, IsActive: active };
  }
  if (kind === "scholarships") return { ScholarshipName: draft.scholarshipName.trim(), DiscountType: draft.discountType, DiscountValue: n("discountValue"), IsActive: active };
  if (kind === "fine") return { fineRuleName: draft.fineRuleName.trim(), applicableFeeId: n("applicableFeeId"), fineType: draft.fineType, fineAmount: n("fineAmount"), gracePeriod: n("gracePeriod"), status: draft.status };
  if (kind === "hostel") return { hostelId: n("hostelId"), roomTypeId: n("roomTypeId"), feeFrequency: draft.feeFrequency, hostelFeeAmount: n("hostelFeeAmount"), securityDeposit: n("securityDeposit"), effectiveDate: draft.effectiveDate, status: draft.status };
  if (kind === "transport") return { routeId: n("routeId"), pickupPointName: draft.pickupPointName.trim(), landmark: draft.landmark || "Main Landmark", sequenceNo: n("sequenceNo"), pickupTime: draft.pickupTime.length === 5 ? `${draft.pickupTime}:00` : draft.pickupTime, dropTime: draft.dropTime.length === 5 ? `${draft.dropTime}:00` : draft.dropTime, distanceFromStart: n("distanceFromStart"), monthlyFee: n("monthlyFee"), status: active };
  if (row) return { structureName: draft.structureName, description: draft.description || null, programId: n("programId"), isActive: active };
  return { ...(params.campusId ? { campusId: params.campusId } : {}), boardId: n("boardId"), academicYearId: n("academicYearId"), groupId: n("groupId"), programId: n("programId"), yearFeeMode: draft.yearFeeMode,
    ...(draft.yearFeeMode === "different" ? { incrementType: draft.incrementType, incrementValue: n("incrementValue") } : {}), items: draft.items.filter((item) => item.isActive).map((item) => ({ feeTypeId: Number(item.feeTypeId), rule: item.rule, amount: Number(item.amount) })) };
}

export async function saveSetupRecord(kind, draft, row, params, authorize) {
  if (row && !setupId(kind, row)) throw Object.assign(new Error("A valid saved record ID is required."), { code: "ACCOUNTANT_DATA_ERROR" });
  const action = row ? "edit" : "create";
  const method = row ? "PUT" : "POST";
  const endpoint = setupEndpoint(kind, row);
  authorize(action, method, endpoint);
  const payload = setupPayload(kind, draft, row, params);
  let wrote = false;
  try {
    const response = row ? await apiClient.put(endpoint, payload) : await apiClient.post(endpoint, payload);
    const result = checkedFeeData(response);
    if (result == null || result === false) throw new Error("The API did not confirm the save. Refresh before retrying.");
    wrote = true;
    if (kind === "structures" && row) {
      for (const item of draft.items.filter((item) => structureItemChanged(item) && (item.itemId || item.isActive))) {
        const itemEndpoint = item.itemId ? apiEndpoints.fee.updateStructureItem(item.itemId) : apiEndpoints.fee.addStructureItem(setupId(kind, row));
        authorize(action, item.itemId ? "PUT" : "POST", itemEndpoint);
        const itemPayload = { rule: item.rule, amount: Number(item.amount), isActive: item.isActive, ...(!item.itemId ? { feeTypeId: Number(item.feeTypeId) } : {}) };
        const savedItem = checkedFeeData(item.itemId ? await apiClient.put(itemEndpoint, itemPayload) : await apiClient.post(itemEndpoint, itemPayload));
        if (savedItem == null || savedItem === false) throw new Error("The API did not confirm the fee item save.");
      }
    }
    return result;
  } catch (error) {
    if (wrote || !error.response || error.response.status >= 500) error.feeSaveUncertain = true;
    throw error;
  }
}

export async function deleteSetupRecord(kind, row, authorize) {
  if (!setupId(kind, row)) throw new Error("A valid saved record ID is required.");
  const endpoint = setupEndpoint(kind, row);
  authorize("delete", "DELETE", endpoint);
  const result = checkedFeeData(await apiClient.delete(endpoint));
  if (result == null || result === false) throw new Error("The API did not confirm the deletion. Refresh the list before retrying.");
  return result;
}


// Holidays
// Accountant-scoped adapter: live holiday pages, staff applicability, and response mapping.
const valueOf = (item, key) => item?.[key] ?? item?.[key[0].toUpperCase() + key.slice(1)];
const fields = ["id", "campusId", "academicYearId", "boardId", "holidayName", "holidayType", "appliesTo", "dateType", "status", "lifecycleStatus", "description", "formattedDateRange"];
const isoDate = value => String(value ?? "").slice(0, 10);

export function normalizeHoliday(raw) {
  const holiday = Object.fromEntries(fields.map(key => [key, valueOf(raw, key)]));
  holiday.startDate = isoDate(valueOf(raw, "startDate") || valueOf(raw, "holidayDate"));
  holiday.endDate = isoDate(valueOf(raw, "endDate") || holiday.startDate);
  if (holiday.id == null || !holiday.startDate || !holiday.endDate || Number.isNaN(Date.parse(holiday.startDate)) || Number.isNaN(Date.parse(holiday.endDate)) || holiday.endDate < holiday.startDate) {
    throw new Error("The holiday API returned an invalid record.");
  }
  return holiday;
}

export function isApplicableHoliday(holiday, scope) {
  // These are the staff audiences supported by the existing holiday editor/backend.
  const audience = String(holiday.appliesTo || "").trim().toLowerCase();
  if (audience !== "all students & staff" && audience !== "staff only") return false;
  return ["campusId", "boardId", "academicYearId"].every(key => holiday[key] == null || (scope[key] != null && String(holiday[key]) === String(scope[key])));
}

export async function loadAccountantHolidays(fetchPage, scope, isCurrent = () => true) {
  const records = new Map();
  let page = 1;
  while (true) {
    const response = await fetchPage({ ...scope, page, pageSize: 100 });
    if (!isCurrent()) return null;
    const body = response?.data;
    if ((body?.success ?? body?.Success ?? body?.status ?? body?.Status) === false) throw new Error(body?.message || body?.Message || "Holiday request failed.");
    const rows = Array.isArray(body) ? body : valueOf(body, "data");
    if (!Array.isArray(rows)) throw new Error("The holiday API returned an invalid list response.");
    const before = records.size;
    for (const raw of rows) {
      const holiday = normalizeHoliday(raw);
      records.set(String(holiday.id), holiday);
    }
    const totalPages = Number(valueOf(body, "totalPages"));
    const total = Number(valueOf(body, "total"));
    const hasNext = Number.isFinite(totalPages) && totalPages > 0 ? page < totalPages : Number.isFinite(total) && total > 0 ? records.size < total : false;
    if (!hasNext) break;
    if (records.size === before) throw new Error("The holiday API did not return the next page of records. Please retry.");
    page += 1;
  }
  return [...records.values()].filter(holiday => isApplicableHoliday(holiday, scope));
}

export function overlapsMonth(startDate, endDate, month) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const target = Number(month) - 1;
  const span = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (span >= 11) return true;
  for (let offset = 0; offset <= span; offset += 1) {
    if ((start.getMonth() + offset) % 12 === target) return true;
  }
  return false;
}

