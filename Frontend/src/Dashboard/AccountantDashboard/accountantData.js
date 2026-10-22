import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";

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

export async function loadPaymentHistory(params, signal) {
  const ledger = await loadScopedLedger(params, signal);
  const students = [...new Set(rowsOf(ledger).map((row) => row.studentId ?? row.StudentId).filter(Boolean))];
  const payments = [];
  const errors = [];
  // Bound concurrent history requests for large ledgers.
  for (let start = 0; start < students.length; start += 6) {
    signal?.throwIfAborted();
    const results = await Promise.allSettled(students.slice(start, start + 6).map((id) => apiClient.get(apiEndpoints.fee.history(id), { signal })));
    results.forEach((result) => {
      if (result.status === "fulfilled") payments.push(...rowsOf(result.value));
      else errors.push(requestError(result.reason));
    });
  }
  const feeIds = new Set(rowsOf(ledger).map((row) => String(row.studentFeeId ?? row.StudentFeeId)));
  const unique = new Map();
  payments.forEach((row, index) => {
    const feeId = row.studentFeeId ?? row.StudentFeeId;
    if (feeId != null && !feeIds.has(String(feeId))) return;
    unique.set(String(row.feePaymentId ?? row.FeePaymentId ?? `payment-${index}`), row);
  });
  return { payments: [...unique.values()], errors: [...new Set(errors)] };
}
