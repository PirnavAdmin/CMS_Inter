import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as payrollApi from "@/api/payrollApi.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import StudentSummaryCard from "@/Dashboard/StudentDashboard/components/StudentSummaryCard.jsx";
import { getRows, getNumber, getText, formatMoney, formatDate, normalizePayment, normalizeDue, normalizePayroll } from "./pages/AccountantPages.jsx";

function useAccountantLoader(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: "" });
    loader()
      .then((data) => { if (active) setState({ data, loading: false, error: "" }); })
      .catch((error) => { if (active) setState({ data: null, loading: false, error: getApiErrorMessage(error, "Unable to load finance data.") }); });
    return () => { active = false; };
  }, [loader]);
  return state;
}

export default function AccountantDashboard() {
  const { selectedCampusId } = useCampusContext();
  const campusParams = useMemo(() => selectedCampusId ? { campusId: Number(selectedCampusId) || selectedCampusId } : {}, [selectedCampusId]);
  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      apiClient.get(apiEndpoints.fee.dashboard, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.collection, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.due, { params: campusParams }),
      payrollApi.getPayrollSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), ...campusParams }),
      payrollApi.getPayslips(campusParams),
    ]);
    const [dashboard, collection, due, payroll, payslips] = results;
    const collectionRows = collection.status === "fulfilled" ? getRows(collection.value.data) : [];
    const dueRows = due.status === "fulfilled" ? getRows(due.value.data).map(normalizeDue).filter((row) => row.amount > 0) : [];
    const dashboardData = dashboard.status === "fulfilled" ? dashboard.value.data : {};
    const payrollData = payroll.status === "fulfilled" ? payroll.value : {};
    const payrollRows = payslips.status === "fulfilled" ? getRows(payslips.value).map(normalizePayroll) : [];
    return {
      dashboard: dashboardData,
      payments: collectionRows.map(normalizePayment).filter((row) => row.amount > 0).sort((a, b) => String(b.date).localeCompare(String(a.date))),
      dues: dueRows,
      payroll: payrollData,
      payrollRows,
      partial: results.some((result) => result.status === "rejected"),
    };
  }, [campusParams]);
  const { data, loading, error } = useAccountantLoader(load);
  const dashboard = data?.dashboard || {};
  const payments = data?.payments || [];
  const dues = data?.dues || [];
  const payroll = data?.payroll || {};
  const collected = getNumber(dashboard, ["totalCollected", "TotalCollected", "collected", "Collected", "totalPaid", "TotalPaid"])
    ?? payments.reduce((sum, row) => sum + row.amount, 0);
  const pending = getNumber(dashboard, ["totalOutstanding", "TotalOutstanding", "outstanding", "Outstanding", "pendingAmount", "PendingAmount"])
    ?? dues.reduce((sum, row) => sum + row.amount, 0);
  const payrollTotal = getNumber(payroll, ["totalNetSalary", "TotalNetSalary", "totalPayroll", "TotalPayroll", "netSalary", "NetSalary"])
    ?? (data?.payrollRows?.reduce((sum, row) => sum + row.amount, 0) || 0);
  const transactionCount = getNumber(dashboard, ["totalTransactions", "TotalTransactions", "transactionCount", "TransactionCount"]) ?? payments.length;
  const amountChart = useMemo(() => {
    const max = Math.max(collected, pending, payrollTotal, 1);
    return [["Collected", collected], ["Pending dues", pending], ["Payroll", payrollTotal]].map(([label, value]) => ({ label, value, width: `${Math.max(3, (value / max) * 100)}%` }));
  }, [collected, pending, payrollTotal]);

  if (loading) return <div className="sp-api-state">Loading finance overview...</div>;
  if (error && !data) return <div className="sp-api-state is-error">{error}</div>;

  return (
    <>
      <StudentPageHeader title="Accountant Dashboard" subtitle="A focused view of collections, dues, payroll, and financial activity." action={<Link className="sp-btn primary" to="reports"><img className="accountant-btn-icon" src={adminIconAssets.financialReports} alt="" aria-hidden="true" /> Financial reports</Link>} />
      {data?.partial ? <div className="sp-api-state accountant-error"><AlertCircle size={15} /> Some finance data could not be loaded. Showing available results.</div> : null}
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collected" value={formatMoney(collected)} note="From available collection data" />
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Pending Dues" value={formatMoney(pending)} note={`${dues.length} outstanding records`} tone="orange" />
        <StudentSummaryCard icon={adminIconAssets.paymentHistory} label="Transactions" value={transactionCount} note="Available payment records" tone="blue" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Summary" value={formatMoney(payrollTotal)} note="Current payroll data" tone="purple" />
      </section>
      <div className="sp-dashboard-grid">
        <StudentCard title="Recent Payments" subtitle="Latest fee collection activity" className="sp-span-2" action={<Link className="sp-text-link" to="payments">View history <ArrowRight size={13} /></Link>}>
          <StudentDataTable columns={["Student", "Admission No", "Type", "Amount", "Date", "Status"]} statusColumns={[5]} rows={payments.slice(0, 6).map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Type: row.type, Amount: formatMoney(row.amount), Date: formatDate(row.date), Status: row.status }))} empty="No payment transactions available." />
        </StudentCard>
        <StudentCard title="Pending Dues" subtitle="Outstanding student fee balances" action={<Link className="sp-text-link" to="fees">Open ledger <ArrowRight size={13} /></Link>}>
          <StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date"]} rows={dues.slice(0, 5).map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate) }))} empty="No outstanding dues available." />
        </StudentCard>
        <StudentCard title="Financial Snapshot" subtitle="Relative values from loaded records">
          <div className="accountant-chart">{amountChart.map((row) => <div className="accountant-chart-row" key={row.label}><span>{row.label}</span><div className="accountant-bar"><i style={{ width: row.width }} /></div><strong>{formatMoney(row.value)}</strong></div>)}</div>
        </StudentCard>
        <StudentCard title="Payroll Summary" subtitle="Current payroll information" action={<Link className="sp-text-link" to="payroll">Open payroll <ArrowRight size={13} /></Link>}>
          <div className="sp-metric-list">
            <div><span>Total payroll</span><strong>{formatMoney(payrollTotal)}</strong></div>
            <div><span>Records</span><strong>{data?.payrollRows?.length || 0}</strong></div>
            <div><span>Processed</span><strong>{getNumber(payroll, ["processedCount", "ProcessedCount"]) ?? "-"}</strong></div>
            <div><span>Pending</span><strong>{getNumber(payroll, ["pendingCount", "PendingCount"]) ?? "-"}</strong></div>
          </div>
        </StudentCard>
      </div>
    </>
  );
}
