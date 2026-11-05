import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { attendanceService } from "../services/accountantService.js";
import { adminIconAssets } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import StudentCard from "@/modules/student/components/StudentCard.jsx";
import StudentDataTable from "@/modules/student/components/StudentDataTable.jsx";
import StudentPageHeader from "@/modules/student/components/StudentPageHeader.jsx";
import "@/modules/admin/AdminProfile/AdminProfilePage.css";

import { getRows, getNumber, getText, formatMoney, useAccountantPage as useFinancePage, useCampusParams } from "../services/accountantService.js";
import { PageState } from "../components/AccountantUI.jsx";

const RECORDS_PER_PAGE = 5;

export function AccountantAttendanceImpact() {
  const campusParams = useCampusParams();
  const load = useCallback(() => attendanceService.getStaffMonthlyReport({ ...campusParams, month: new Date().getMonth() + 1, year: new Date().getFullYear() }).then((data) => getRows(data)), [campusParams]);
  const state = useFinancePage(load, [load]);
  const rows = state.data || [];
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / RECORDS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * RECORDS_PER_PAGE;
  const endIndex = Math.min(startIndex + RECORDS_PER_PAGE, rows.length);
  useEffect(() => {
    setCurrentPage(current => Math.min(current, totalPages));
  }, [totalPages]);
  return <>
    <StudentPageHeader title="Attendance Impact" subtitle="Review staff attendance figures that may affect payroll calculations." action={<Link className="sp-btn" to="/accountant-dashboard/payroll"><span className="accountant-btn-generated-icon" style={{ backgroundImage: `url(${adminIconAssets.payroll.src})`, backgroundPosition: adminIconAssets.payroll.position }} aria-hidden="true" /> Payroll</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <StudentCard title="Monthly Attendance Impact" subtitle="The backend determines the available attendance and deduction fields.">
      <StudentDataTable columns={["Staff Member", "Present Days", "Absent Days", "Leave", "Deduction", "Payroll Impact"]} rows={rows.map((row) => {
        const deduction = getNumber(row, ["deduction", "Deduction", "deductionAmount", "DeductionAmount"]);
        const payrollImpact = getNumber(row, ["payrollImpact", "PayrollImpact", "impactAmount", "ImpactAmount"]);
        return {
          "Staff Member": getText(row, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]),
          "Present Days": getNumber(row, ["presentCount", "PresentCount", "presentDays", "PresentDays", "present", "Present"]) ?? "—",
          "Absent Days": getNumber(row, ["absentCount", "AbsentCount", "absentDays", "AbsentDays", "absent", "Absent"]) ?? "—",
          Leave: getNumber(row, ["leaveCount", "LeaveCount", "leaveDays", "LeaveDays", "leave", "Leave"]) ?? "—",
          Deduction: deduction == null ? "—" : formatMoney(deduction),
          "Payroll Impact": payrollImpact == null ? "—" : formatMoney(payrollImpact),
        };
      }).slice(startIndex, endIndex)} empty="No attendance impact records available." />
      {rows.length > 0 && <div className="acct-payroll-pagination">
        <span role="status" aria-live="polite">Showing {startIndex + 1}–{endIndex} of {rows.length} records</span>
        <nav aria-label="Attendance impact records pagination">
          <button type="button" className="sp-btn" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>Previous</button>
          <span className="sp-btn primary" aria-label={`Page ${page} of ${totalPages}`} aria-current="page">{page}</span>
          <button type="button" className="sp-btn" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>Next</button>
        </nav>
      </div>}
    </StudentCard> : null}
  </>;
}
