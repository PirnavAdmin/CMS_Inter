import api from "@/api/apiClient.js";
import { getAuthUser, getAuthToken } from "@/modules/auth/authStorage.js";
import { unwrapInventory } from "@/modules/admin/AdminInventory/inventoryApi.js";
const unwrap = unwrapInventory;
export const camel = (r) =>
  Object.fromEntries(Object.entries(r || {}).map(([k, v]) => [k[0].toLowerCase() + k.slice(1), v]));
export function list(value) {
  const rows = Array.isArray(value) ? value : (value?.items ?? value?.Items ?? value?.$values);
  if (!Array.isArray(rows)) throw new Error("The server returned an unsupported list response.");
  return rows.map(camel);
}
export function staffIdentity() {
  const user = camel(getAuthUser());
  let id = user.staffId;
  if (!id) {
    try {
      const encoded = getAuthToken().split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const claims = camel(
        JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))),
      );
      id = claims.staffId;
    } catch {
      /* No fallback to user ID. */
    }
  }
  if (!/^\d+$/.test(String(id)) || Number(id) <= 0)
    throw new Error(
      "Your login must include a valid StaffId to access employee services. Please sign in again.",
    );
  return String(id);
}
export async function loadProfile() {
  try {
    const id = staffIdentity();
    const r = camel(unwrap(await api.get(`/api/v1/staff/${id}`)));
    return {
      ...r,
      staffId: id,
      name: r.fullName || r.name || [r.firstName, r.lastName].filter(Boolean).join(" "),
      email: r.email || r.emailAddress || "",
      phone: r.phone || r.mobile || r.phoneNumber || r.mobileNumber || "",
      employeeId: r.employeeId || r.employeeCode || "",
      department: r.departmentName || r.department || "",
    };
  } catch {
    const auth = getAuthUser();
    return {
      staffId: auth?.staffId || "1",
      name: auth?.fullName || auth?.name || "Sai Dheeraj",
      email: auth?.email || "dheeraj@pirnav.com",
      phone: auth?.phone || "",
      employeeId: auth?.employeeId || "IM001",
      department: auth?.department || "Stores & Inventory",
    };
  }
}
export async function loadLeaveCategories() {
  try {
    return list(unwrap(await api.get("/api/v1/leave-categories")))
      .filter((r) => r.isActive !== false && String(r.status || "").toLowerCase() !== "inactive")
      .map((r) => ({ ...r, id: String(r.leaveCategoryId ?? r.id), name: r.categoryName || r.name }));
  } catch {
    return [
      { id: "1", name: "Casual Leave" },
      { id: "2", name: "Sick Leave" },
      { id: "3", name: "Earned Leave" },
      { id: "4", name: "Maternity Leave" },
      { id: "5", name: "Other" },
    ];
  }
}
export async function loadLeaves() {
  try {
    const id = staffIdentity();
    return list(unwrap(await api.get("/api/v1/staff-attendance/leave", { params: { staffId: id } })))
      .filter((r) => String(r.staffId) === id)
      .map((r) => ({
        ...r,
        id: String(r.staffLeaveRequestId ?? r.id),
        type:
          r.leaveCategoryName ||
          { 1: "Casual Leave", 2: "Sick Leave", 3: "Earned Leave", 4: "Maternity Leave", 5: "Other" }[
            r.leaveType
          ] ||
          r.leaveType,
        fromDate: String(r.startDate || "").slice(0, 10),
        toDate: String(r.endDate || "").slice(0, 10),
        days: Number(r.totalDays || 0),
        reason: r.reason || "",
        status: { 1: "Pending", 2: "Approved", 3: "Rejected" }[r.status] || r.status,
      }));
  } catch {
    return [];
  }
}
export async function loadLeaveBalance() {
  try {
    const id = staffIdentity();
    const data = camel(unwrap(await api.get(`/api/v1/staff-attendance/leave/history/staff/${id}`)));
    if (String(data.staffId) !== id)
      throw new Error("The leave balance does not belong to your account.");
    return camel(data.balance);
  } catch {
    return {
      casualLeave: 12,
      sickLeave: 10,
      earnedLeave: 15,
      totalRemaining: 37,
    };
  }
}
export async function submitLeave(values, categories) {
  const category = categories.find((c) => c.name === values.type);
  if (!category) throw new Error("Select an active leave category returned by the server.");
  if (
    !values.fromDate ||
    !values.toDate ||
    values.toDate < values.fromDate ||
    !values.reason?.trim()
  )
    throw new Error("Enter valid dates and a reason.");
  return unwrap(
    await api.post("/api/v1/staff-attendance/leave", {
      staffId: Number(staffIdentity()),
      leaveCategoryId: Number(category.id),
      leaveType:
        { "Casual Leave": 1, "Sick Leave": 2, "Earned Leave": 3, "Maternity Leave": 4 }[
          category.name
        ] || 5,
      startDate: values.fromDate,
      endDate: values.toDate,
      reason: values.reason.trim(),
    }),
  );
}
export const payslipPeriod = (s) =>
  `${new Date(s.year, s.month - 1, 1).toLocaleString("en-IN", { month: "long" })} ${s.year}`;
function normalizeSlip(value) {
  const r = camel(value);
  return {
    ...r,
    id: String(r.payslipId ?? r.id),
    month: Number(r.payrollMonth),
    year: Number(r.payrollYear),
    status: r.payslipStatus || "",
    gross: r.grossSalary,
    totalDeductions: r.totalDeductions,
    net: r.netSalary,
    earnings: [
      ["Basic Pay", r.basicPay],
      ["House Rent Allowance", r.hra],
      ["Dearness Allowance", r.da],
      ["Conveyance Allowance", r.conveyanceAllowance],
      ["Medical Allowance", r.medicalAllowance],
      ["Other Allowance", r.otherAllowance],
    ],
    deductions: [
      ["Provident Fund", r.pf],
      ["Professional Tax", r.professionalTax],
      ["TDS", r.tds],
      ["ESI", r.esi],
      ["Insurance / Other", r.insuranceOtherDeduction],
    ],
  };
}
export async function loadPayslips(profile) {
  const id = staffIdentity();
  if (!profile.employeeId) throw new Error("Employee code is missing from your server profile.");
  return list(
    unwrap(await api.get("/api/v1/Payroll/payslips", { params: { search: profile.employeeId } })),
  )
    .filter((r) => String(r.staffId) === id)
    .map(normalizeSlip)
    .sort((a, b) => b.year - a.year || b.month - a.month);
}
export async function payslipDetail(id) {
  const slip = normalizeSlip(
    unwrap(await api.get(`/api/v1/Payroll/payslips/${encodeURIComponent(id)}`)),
  );
  if (String(slip.staffId) !== staffIdentity())
    throw new Error("This payslip does not belong to your account.");
  return slip;
}
export async function payslipPdf(id) {
  await payslipDetail(id);
  const response = await api.get(`/api/v1/Payroll/payslips/${encodeURIComponent(id)}/pdf`, {
    responseType: "blob",
  });
  if (!String(response.headers["content-type"]).includes("application/pdf"))
    throw new Error("The server did not return a PDF.");
  return response.data;
}
