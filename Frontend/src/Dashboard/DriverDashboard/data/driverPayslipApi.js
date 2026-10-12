import apiClient from "../../../api/apiClient.js";
import { getDriverStaffId } from "./driverAttendanceApi.js";

const base = "/api/v1/Payroll/payslips";
const unwrap = (response) => {
  const payload = response.data;
  if (payload?.success === false || payload?.Success === false) throw new Error(payload.message || payload.Message || "Unable to load payslips.");
  return payload?.data ?? payload?.Data ?? payload;
};
export function normalizePayslip(record) {
  const get = (key) => record[key] ?? record[key[0].toUpperCase() + key.slice(1)] ?? record[key.toUpperCase()];
  return Object.fromEntries([
    "payslipId", "staffId", "employeeId", "staffName", "payrollMonth", "payrollYear",
    "basicPay", "hra", "da", "conveyanceAllowance", "medicalAllowance", "otherAllowance",
    "pf", "professionalTax", "tds", "esi", "insuranceOtherDeduction", "grossSalary",
    "totalDeductions", "netSalary", "payslipStatus", "generatedAt",
  ].map((key) => [key, get(key)]));
}
export async function getDriverPayslips(employeeId, signal) {
  const staffId = getDriverStaffId();
  if (!employeeId || employeeId === "Not available") throw new Error("Your employee code is not available yet. Refresh your driver profile and try again.");
  const data = unwrap(await apiClient.get(base, {
    params: { search: employeeId }, signal,
  }));
  const list = Array.isArray(data) ? data : data?.items ?? data?.Items ?? data?.payslips ?? data?.$values;
  if (!Array.isArray(list)) throw new Error("The payslip list response is invalid.");
  return list.map(normalizePayslip).filter((slip) => String(slip.staffId) === String(staffId))
    .sort((a, b) => b.payrollYear - a.payrollYear || b.payrollMonth - a.payrollMonth);
}
export async function getDriverPayslip(slip, signal) {
  const staffId = getDriverStaffId();
  if (String(slip.staffId) !== String(staffId)) throw new Error("This payslip does not belong to your account.");
  const data = normalizePayslip(unwrap(await apiClient.get(`${base}/${encodeURIComponent(slip.payslipId)}`, { signal })));
  if (String(data.staffId) !== String(staffId)) throw new Error("The server returned a payslip for a different employee.");
  return data;
}
export async function getDriverPayslipPdf(slip) {
  // Verify the returned detail owner before requesting its PDF.
  await getDriverPayslip(slip);
  const response = await apiClient.get(`${base}/${encodeURIComponent(slip.payslipId)}/pdf`, { responseType: "blob" });
  if (!String(response.headers["content-type"]).includes("application/pdf")) throw new Error("The server did not return a PDF payslip.");
  return response.data;
}
