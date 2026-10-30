import axios from "axios";
import api from "@/api/apiClient.js";

const base = "/api/v1/lop-configuration";
export function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key.charAt(0).toLowerCase() + key.slice(1),
      normalize(entry),
    ]),
  );
}
export async function lopRequest(path, { method = "get", data, params, signal } = {}) {
  const response = await api.request({
    url: `${base}/${path}`,
    method,
    data,
    params,
    signal,
    _isMockFallback: true,
    transformRequest: [
      ...api.defaults.transformRequest,
      function serverOnly(body) {
        this.adapter = axios.getAdapter(["xhr", "http", "fetch"]);
        return body;
      },
    ],
  });
  const body = normalize(response.data);
  if (body?.success === false) throw new Error(body.message || "LOP request failed.");
  return body?.data ?? body;
}
export function lopRows(value) {
  const result = Array.isArray(value)
    ? value
    : (value?.items ?? value?.records ?? value?.rows ?? value?.$values);
  if (!Array.isArray(result))
    throw new Error("The LOP server returned an unsupported list response.");
  return result.map((r) => ({
    ...r,
    id: r.id ?? r.lopRecordId ?? r.recordId ?? r.staffId,
    name: r.name ?? r.staffName ?? r.fullName,
    department: r.department ?? r.departmentName,
    salary: r.salary ?? r.monthlySalary,
  }));
}
