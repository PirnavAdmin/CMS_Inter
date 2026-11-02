import apiClient from "../../../api/apiClient.js";
import { getDriverStaffId } from "./driverAttendanceApi.js";
import { unwrapDriverData } from "./driverData.js";

const base = "/api/v1/transport/drivers/leaves";
export const DRIVER_LEAVE_TYPES = [
  { id: "casual", name: "Casual Leave" },
  { id: "sick", name: "Sick Leave" },
  { id: "earned", name: "Earned Leave" },
];
export const getDriverLeaves = (signal) => apiClient.get(base, { params: { staffId: getDriverStaffId() }, signal }).then(unwrapDriverData);
export const applyDriverLeave = (form) => {
  if (!/^\d+$/.test(String(form.type)) || Number(form.type) <= 0) throw new Error("This leave type needs an active category ID from the backend before it can be submitted.");
  return apiClient.post(`${base}/apply`, {
  leaveCategoryId: Number(form.type),
  startDate: `${form.fromDate}T00:00:00`,
  endDate: `${form.toDate}T00:00:00`,
  reason: form.reason.trim(),
}, { params: { staffId: getDriverStaffId() } }).then((response) => {
  unwrapDriverData(response);
  return response.data;
});
};
export function normalizeDriverLeaveCategories(payload) {
  if (payload?.success === false || payload?.Success === false || payload?.status === false || payload?.Status === false) throw new Error(payload.message || payload.Message || "Unable to load leave categories.");
  const data = payload?.data ?? payload?.Data ?? payload;
  const list = Array.isArray(data) ? data : data?.items ?? data?.Items ?? data?.$values;
  if (!Array.isArray(list)) throw new Error("The leave categories response is invalid.");
  return list.filter((item) => {
    const active = item.isActive ?? item.IsActive ?? item.status ?? item.Status;
    return ![false, 0, "false", "inactive", "0"].includes(typeof active === "string" ? active.toLowerCase() : active);
  }).map((item) => ({
    id: item.leaveCategoryId ?? item.LeaveCategoryId ?? item.id ?? item.Id,
    name: item.categoryName ?? item.CategoryName ?? item.name ?? item.Name,
  })).filter((item) => /^\d+$/.test(String(item.id)) && Number(item.id) > 0 && item.name);
}
export const getDriverLeaveCategories = (signal) => apiClient.get("/api/v1/leave-categories", { signal })
  .then((response) => normalizeDriverLeaveCategories(response.data));
