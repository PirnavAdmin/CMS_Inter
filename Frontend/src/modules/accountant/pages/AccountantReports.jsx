import { useCallback } from "react";
import { reportApi } from "../services/accountantService.js";
import { payrollApi } from "../services/accountantService.js";
import { adminIconAssets } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import "@/modules/admin/AdminProfile/AdminProfilePage.css";

import { getRows, getNumber, formatMoney, formatDate, normalizePayment, normalizeDue, useAccountantPage as useFinancePage, useCampusParams } from "../services/accountantService.js";
import { AccountantCard, AccountantDataTable, AccountantPageHeader, AccountantSummaryCard, PageState } from "../components/AccountantUI.jsx";

export function AccountantReports() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    const [dashboard, collections, dues, payroll] = await Promise.allSettled([
      reportApi.getReportsDashboard(campusParams),
      reportApi.getFeeCollectionDetails(campusParams),
      reportApi.getDueFeesDetails(campusParams),
      payrollApi.getPayrollSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), ...campusParams }),
    ]);
    if (dashboard.status === "rejected" && collections.status === "rejected" && dues.status === "rejected" && payroll.status === "rejected") throw dashboard.reason;
    return {
      dashboard: dashboard.status === "fulfilled" ? dashboard.value.data : {},
      collections: collections.status === "fulfilled" ? getRows(collections.value.data) : [],
      dues: dues.status === "fulfilled" ? getRows(dues.value.data) : [],
      payroll: payroll.status === "fulfilled" ? payroll.value : {},
    };
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const report = state.data?.dashboard || {};
  const collectionRows = (state.data?.collections || []).map(normalizePayment);
  const dueRows = (state.data?.dues || []).map(normalizeDue).filter((row) => row.amount > 0);
  return <>
    <AccountantPageHeader title="Financial Reports" subtitle="Financial collection, outstanding dues, transaction, and payroll reporting." />
    <PageState {...state} />
    {!state.loading && !state.error ? <>
      <section className="sp-summary-grid four">
        <AccountantSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collection Rows" value={collectionRows.length} note="Report detail records" />
        <AccountantSummaryCard icon={adminIconAssets.feeManagement} label="Outstanding Rows" value={dueRows.length} note="Report detail records" tone="orange" />
        <AccountantSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(getNumber(state.data?.payroll, ["totalPayroll", "TotalPayroll", "totalNetSalary", "TotalNetSalary"]) || 0)} note="Current payroll API" tone="purple" />
        <AccountantSummaryCard icon={adminIconAssets.financialReports} label="Report Metrics" value={Object.keys(report || {}).length} note="Available dashboard fields" tone="blue" />
      </section>
      <div className="sp-grid-2">
        <AccountantCard title="Fee Collection Report"><AccountantDataTable columns={["Student", "Amount", "Date", "Status"]} statusColumns={[3]} rows={collectionRows.slice(0, 10).map((row) => ({ Student: row.studentName, Amount: formatMoney(row.amount), Date: formatDate(row.date), Status: row.status }))} empty="No fee collection report data available." /></AccountantCard>
        <AccountantCard title="Outstanding Dues Report"><AccountantDataTable columns={["Student", "Admission No", "Amount", "Due Date"]} rows={dueRows.slice(0, 10).map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate) }))} empty="No outstanding dues report data available." /></AccountantCard>
      </div>
    </> : null}
  </>;
}
