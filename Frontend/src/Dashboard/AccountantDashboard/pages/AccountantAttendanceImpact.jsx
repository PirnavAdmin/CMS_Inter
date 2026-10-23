import { useCallback } from "react";
import { Link } from "react-router-dom";
import { attendanceService } from "../services/accountantService.js";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import "@/components/pages/AdminProfilePage.css";

import { getRows, getNumber, getText, formatMoney, useAccountantPage as useFinancePage, useCampusParams } from "../services/accountantService.js";
import { PageState } from "../components/AccountantUI.jsx";

export function AccountantAttendanceImpact() {
  const campusParams = useCampusParams();
  const load = useCallback(() => attendanceService.getStaffMonthlyReport({ ...campusParams, month: new Date().getMonth() + 1, year: new Date().getFullYear() }).then((data) => getRows(data)), [campusParams]);
  const state = useFinancePage(load, [load]);
  const rows = state.data || [];
  return <>
    <StudentPageHeader title="Attendance Impact" subtitle="Review staff attendance figures that may affect payroll calculations." action={<Link className="sp-btn" to="/accountant-dashboard/payroll"><span className="accountant-btn-generated-icon" style={{ backgroundImage: `url(${adminIconAssets.payroll.src})`, backgroundPosition: adminIconAssets.payroll.position }} aria-hidden="true" /> Payroll</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <StudentCard title="Monthly Attendance Impact" subtitle="The backend determines the available attendance and deduction fields.">
      <StudentDataTable columns={["Staff Member", "Present Days", "Absent Days", "Leave", "Deduction", "Payroll Impact"]} rows={rows.map((row) => ({ "Staff Member": getText(row, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]), "Present Days": getNumber(row, ["presentDays", "PresentDays", "present", "Present"]) ?? "-", "Absent Days": getNumber(row, ["absentDays", "AbsentDays", "absent", "Absent"]) ?? "-", Leave: getNumber(row, ["leaveDays", "LeaveDays", "leave", "Leave"]) ?? "-", Deduction: formatMoney(getNumber(row, ["deduction", "Deduction", "deductionAmount", "DeductionAmount"]) || 0), "Payroll Impact": formatMoney(getNumber(row, ["payrollImpact", "PayrollImpact", "impactAmount", "ImpactAmount"]) || 0) }))} empty="No attendance impact records available." />
    </StudentCard> : null}
  </>;
}
