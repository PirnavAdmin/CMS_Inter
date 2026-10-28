import { useCallback, useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { payrollApi } from "../services/accountantService.js";
import { adminIconAssets } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import StudentCard from "@/modules/student/components/StudentCard.jsx";
import StudentDataTable from "@/modules/student/components/StudentDataTable.jsx";
import StudentPageHeader from "@/modules/student/components/StudentPageHeader.jsx";
import StudentSummaryCard from "@/modules/student/components/StudentSummaryCard.jsx";
import "@/modules/admin/AdminProfile/AdminProfilePage.css";

import { getRows, getNumber, formatMoney, normalizePayroll, useAccountantPage as useFinancePage, useCampusParams } from "../services/accountantService.js";
import { PageState } from "../components/AccountantUI.jsx";

export function AccountantPayroll() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      payrollApi.getPayrollSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), ...campusParams }),
      payrollApi.getPayslips(campusParams),
      payrollApi.getSalaryAssignments(campusParams),
    ]);
    if (results.every((result) => result.status === "rejected")) throw results[0].reason;
    return {
      summary: results[0].status === "fulfilled" ? results[0].value : {},
      payslips: results[1].status === "fulfilled" ? getRows(results[1].value).map(normalizePayroll) : [],
      assignments: results[2].status === "fulfilled" ? getRows(results[2].value) : [],
    };
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const summary = state.data?.summary || {};
  const total = getNumber(summary, ["totalNetSalary", "TotalNetSalary", "totalPayroll", "TotalPayroll", "netSalary", "NetSalary"]) ?? (state.data?.payslips || []).reduce((sum, row) => sum + row.amount, 0);
  return <>
    <StudentPageHeader title="Payroll" subtitle="Financial payroll visibility for salary amounts, payslips, and processing status." action={<Link className="sp-btn" to="/accountant-dashboard/payroll/attendance-impact"><CalendarCheck size={15} /> Attendance impact</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(total)} note="Current payroll summary" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payslips" value={state.data?.payslips?.length || 0} note="Available records" tone="blue" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Processed" value={getNumber(summary, ["processedCount", "ProcessedCount"]) ?? "-"} note="From payroll API" tone="purple" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Pending" value={getNumber(summary, ["pendingCount", "PendingCount"]) ?? "-"} note="From payroll API" tone="orange" />
      </section>
      <StudentCard title="Payroll Records" subtitle="Read-only payroll information">
        <AccountantPayrollRecords key={JSON.stringify(campusParams)} records={state.data?.payslips || []} formatAmount={formatMoney} />
      </StudentCard>
    </> : null}
  </>;
}

const RECORDS_PER_PAGE = 5;

function AccountantPayrollRecords({ records, formatAmount }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(records.length / RECORDS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * RECORDS_PER_PAGE;
  const endIndex = Math.min(startIndex + RECORDS_PER_PAGE, records.length);
  useEffect(() => {
    setCurrentPage(current => Math.min(current, totalPages));
  }, [totalPages]);

  return <>
    <StudentDataTable columns={["Staff Member", "Month", "Net Amount", "Status"]} statusColumns={[3]} rows={records.slice(startIndex, endIndex).map(row => ({ "Staff Member": row.staffName, Month: row.month, "Net Amount": formatAmount(row.amount), Status: row.status }))} empty="No payroll records available." />
    {records.length > 0 && <div className="acct-payroll-pagination">
      <span role="status" aria-live="polite">Showing {startIndex + 1}–{endIndex} of {records.length} records</span>
      {totalPages > 1 && <nav aria-label="Payroll records pagination">
        <button type="button" className="sp-btn" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>Previous</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(number => <button type="button" key={number} className={`sp-btn${number === page ? " primary" : ""}`} aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => setCurrentPage(number)}>{number}</button>)}
        <button type="button" className="sp-btn" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>Next</button>
      </nav>}
    </div>}
  </>;
}
