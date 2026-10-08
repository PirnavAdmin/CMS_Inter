import apiClient from "../../../api/apiClient.js";
import { getAuthToken, getAuthUser } from "../../../features/authStorage.js";
import { unwrapDriverData } from "./driverData.js";

const base = "/api/v1/transport/drivers/attendance";
export function getDriverStaffId() {
  const user = getAuthUser();
  let id = user?.staffId ?? user?.StaffId;
  if (id == null) {
    try {
      const payload = getAuthToken().replace(/^Bearer\s+/i, "").split(".")[1];
      const encoded = payload.replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
      id = claims.StaffId ?? claims.staffId;
    } catch { /* A missing staff claim must not fall back to UserId. */ }
  }
  if (!/^\d+$/.test(String(id)) || Number(id) <= 0) throw new Error("Your session has no valid StaffId. Please sign in again.");
  return id;
}
export const attendanceToday = (signal) => apiClient.get(`${base}/today`, { params: { staffId: getDriverStaffId() }, signal }).then(unwrapDriverData);
export const attendanceHistory = (fromDate, toDate, signal) => apiClient.get(`${base}/history`, { params: { staffId: getDriverStaffId(), fromDate, toDate }, signal }).then(unwrapDriverData);
export const punchAttendance = (action, coordinates) => apiClient.post(`${base}/${action}`, coordinates, { params: { staffId: getDriverStaffId() }, headers: { "X-Device-Id": "Driver-Portal-Manual" } }).then(unwrapDriverData);
export const regularizeAttendance = (data) => apiClient.post(`${base}/regularization`, data, { params: { staffId: getDriverStaffId() } }).then(unwrapDriverData);

export function attendanceRecords(punches = []) {
  return Object.fromEntries(punches.map((punch) => [String(punch.date).slice(0, 10), { ...punch, checkIn: punch.inTime, checkOut: punch.outTime }]));
}
export function punchTime(value) {
  if (!value) return "--";
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return "--";
  const hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
export function punchHours(record) {
  if (record?.hours == null || !Number.isFinite(Number(record.hours))) return "--";
  const minutes = Math.max(0, Math.round(Number(record.hours) * 60));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
