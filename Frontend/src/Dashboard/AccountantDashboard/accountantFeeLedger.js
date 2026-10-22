import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { requestError } from "./accountantData.js";
import { checkedFeeData } from "./accountantFeeRequests.js";
import { readFee } from "./feeViewData.js";

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
