import { useCallback, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as payrollApi from "@/api/payrollApi.js";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import StudentSummaryCard from "@/Dashboard/StudentDashboard/components/StudentSummaryCard.jsx";
import { getRows, getNumber, formatMoney, formatDate, normalizePayment, normalizeDue } from "./pages/AccountantPages.jsx";
import { PageState } from "./pages/AccountantPages.jsx";
import { useFinanceParams, useFinancePage, loadSections, loadScopedLedger } from "./accountantData.js";

export default function AccountantDashboard() {
  const campusParams = useFinanceParams();
  const load = useCallback(async (signal) => {
    const data = await loadSections({
      dashboard: () => apiClient.get(apiEndpoints.fee.dashboard, { params: campusParams, signal }),
      ledger: () => loadScopedLedger(campusParams, signal),
      due: () => apiClient.get(apiEndpoints.fee.due, { params: campusParams, signal }),
      payroll: () => payrollApi.getPayrollSummary({ campusId: campusParams.campusId }),
    });
    return {
      ...data,
      payments: getRows(data.dashboard?.recentPayments ?? data.dashboard?.RecentPayments)
        .filter((payment) => data.ledger != null && getRows(data.ledger).some((row) => String(row.studentFeeId ?? row.StudentFeeId) === String(payment.studentFeeId ?? payment.StudentFeeId)))
        .map(normalizePayment),
      dues: getRows(data.due).map(normalizeDue).filter((row) => row.amount > 0),
    };
  }, [campusParams]);
  const state = useFinancePage(load);
  const { data, loading, error } = state;
  const dashboard = data?.dashboard || {};
  const payments = data?.payments || [];
  const dues = data?.dues || [];
  const payroll = data?.payroll || {};
  const ledger = data?.ledger == null ? null : getRows(data.ledger);
  const ledgerTotal = (keys) => {
    if (ledger == null) return undefined;
    const amounts = ledger.map((row) => getNumber(row, keys));
    return amounts.every((amount) => amount != null) ? amounts.reduce((sum, amount) => sum + amount, 0) : undefined;
  };
  const collected = ledgerTotal(["totalPaid", "TotalPaid"]);
  const pending = ledgerTotal(["balance", "Balance"]);
  const payrollTotal = getNumber(payroll, ["totalNetSalary", "TotalNetSalary"]);
  const studentCount = ledger && ledger.every((row) => row.studentId ?? row.StudentId) ? new Set(ledger.map((row) => String(row.studentId ?? row.StudentId))).size : undefined;
  const amountChart = useMemo(() => {
    const values = [["Collected", collected], ["Pending dues", pending], ["Payroll", payrollTotal]].filter(([, value]) => value != null);
    const max = Math.max(...values.map(([, value]) => value), 1);
    return values.map(([label, value]) => ({ label, value, width: `${(value / max) * 100}%` }));
  }, [collected, pending, payrollTotal]);

  if (data == null) return <PageState {...state} />;

  return (
    <>
      <StudentPageHeader title="Accountant Dashboard" subtitle="A focused view of collections, dues, payroll, and financial activity." action={<Link className="sp-btn primary" to="reports"><img className="accountant-btn-icon" src={adminIconAssets.financialReports} alt="" aria-hidden="true" /> Financial reports</Link>} />
      <PageState {...state} />
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collected" value={formatMoney(collected)} note="From available collection data" />
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Pending Dues" value={formatMoney(pending)} note="Selected context" tone="orange" />
        <StudentSummaryCard icon={adminIconAssets.paymentHistory} label="Students" value={studentCount ?? "-"} note="Selected context" tone="blue" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Summary" value={formatMoney(payrollTotal)} note="Current payroll data" tone="purple" />
      </section>
      <div className="sp-dashboard-grid">
        <StudentCard title="Recent Payments" subtitle="Latest fee collection activity" className="sp-span-2" action={<Link className="sp-text-link" to="payments">View history <ArrowRight size={13} /></Link>}>
          <StudentDataTable columns={["Student", "Admission No", "Type", "Amount", "Date", "Status"]} statusColumns={[5]} rows={payments.slice(0, 6).map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Type: row.type, Amount: formatMoney(row.amount), Date: formatDate(row.date), Status: row.status }))} empty={data?.dashboard == null || data?.ledger == null ? "Recent payments unavailable." : "No recent payments in the selected context."} />
        </StudentCard>
        <StudentCard title="Pending Dues" subtitle="Outstanding student fee balances" action={<Link className="sp-text-link" to="fees">Open ledger <ArrowRight size={13} /></Link>}>
          <StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date"]} rows={dues.slice(0, 5).map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate) }))} empty={data?.due == null ? "Outstanding schedules unavailable." : "No outstanding dues available."} />
        </StudentCard>
        <StudentCard title="Financial Snapshot" subtitle="Relative values from loaded records">
          <div className="accountant-chart">{amountChart.map((row) => <div className="accountant-chart-row" key={row.label}><span>{row.label}</span><div className="accountant-bar"><i style={{ width: row.width }} /></div><strong>{formatMoney(row.value)}</strong></div>)}</div>
        </StudentCard>
        <StudentCard title="Payroll Summary" subtitle="Current payroll information" action={<Link className="sp-text-link" to="payroll">Open payroll <ArrowRight size={13} /></Link>}>
          <div className="sp-metric-list">
            <div><span>Total payroll</span><strong>{formatMoney(payrollTotal)}</strong></div>
            <div><span>Records</span><strong>{getNumber(payroll, ["totalPayslips", "TotalPayslips"]) ?? "-"}</strong></div>
            <div><span>Paid</span><strong>{getNumber(payroll, ["paidPayslips", "PaidPayslips"]) ?? "-"}</strong></div>
            <div><span>Pending</span><strong>{getNumber(payroll, ["pendingPayslips", "PendingPayslips"]) ?? "-"}</strong></div>
          </div>
        </StudentCard>
      </div>
    </>
  );
}
