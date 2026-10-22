import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { rowsOf, requestError } from "../services/accountantData.js";
import { readFee, scopedFeeMasters } from "../utils/feeViewData.js";

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
      : kind === "transport" ? { campusId: params.campusId, pageNumber: paging.page, pageSize: 10, search: paging.search }
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
