import apiClient from "@/api/apiClient.js";

const BASE = "/api/v1/lop-configuration";

export function normalizeKeys(value) {
  if (Array.isArray(value)) return value.map(normalizeKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key.charAt(0).toLowerCase() + key.slice(1),
      normalizeKeys(entry),
    ]),
  );
}

async function request(path = "", { method = "get", data, params, signal } = {}) {
  const url = path ? `${BASE}/${path}` : BASE;
  const response = await apiClient.request({
    url,
    method,
    data,
    params,
    signal,
    requireRealBackend: true,
  });
  const body = normalizeKeys(response.data);
  if (body?.success === false) {
    throw new Error(body.message || "LOP request failed.");
  }
  return body?.data ?? body;
}

export function extractLopRows(value) {
  const result = Array.isArray(value)
    ? value
    : (value?.items ?? value?.records ?? value?.rows ?? value?.$values ?? []);
  if (!Array.isArray(result)) return [];
  return result.map((r) => ({
    ...r,
    id: r.id ?? r.lopRecordId ?? r.recordId ?? r.staffId,
    name: r.name ?? r.staffName ?? r.fullName ?? "",
    department: r.department ?? r.departmentName ?? "",
    salary: Number(r.salary ?? r.monthlySalary ?? 0),
    basicPay: Number(r.basicPay ?? 0),
    lopDays: Number(r.lopDays ?? 0),
    deduction: Number(r.deduction ?? 0),
    salaryAfterLOP: Number(r.salaryAfterLOP ?? r.salaryAfterLop ?? 0),
  }));
}

export const lopApi = {
  getPolicy: (params, signal) => request("policy", { params, signal }),
  getAllPolicies: (signal) => request("policies", { signal }),
  savePolicy: (data) => request("policy", { method: "post", data }),
  deletePolicyOverride: (policyId) =>
    request(`policies/${encodeURIComponent(policyId)}`, { method: "delete" }),

  getPreview: (params, signal) => request("preview", { params, signal }),
  syncMonthlyRecords: (data) => request("sync-records", { method: "post", data }),

  getStaffList: (params, signal) => request("staff", { params, signal }),
  getRecords: (params, signal) => request("records", { params, signal }),
  getRecordById: (id, signal) => request(`records/${encodeURIComponent(id)}`, { signal }),
  getKpis: (params, signal) => request("kpis", { params, signal }),
  createRecord: (data) => request("records", { method: "post", data }),
  updateRecord: (id, data) => request(`records/${encodeURIComponent(id)}`, { method: "put", data }),
  updateRecordStatus: (id, data) =>
    request(`records/${encodeURIComponent(id)}/status`, { method: "patch", data }),
  deleteRecord: (id) => request(`records/${encodeURIComponent(id)}`, { method: "delete" }),

  calculateLop: (data, signal) => request("calculate", { method: "post", data, signal }),
};
