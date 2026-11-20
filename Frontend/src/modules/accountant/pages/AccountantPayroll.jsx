import { useCallback, useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { payrollApi } from "../services/accountantService.js";
import { adminIconAssets } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import {
  AccountantCard,
  AccountantDataTable,
  AccountantPageHeader,
  AccountantSummaryCard,
  PageState,
} from "../components/AccountantUI.jsx";
import "@/modules/admin/AdminProfile/AdminProfilePage.css";

import { getRows, getNumber, formatMoney, useAccountantPage as useFinancePage, useCampusParams } from "../services/accountantService.js";
import { getApiErrorMessage } from "@/api/apiClient.js";

export function AccountantPayroll() {
  const campusParams = useCampusParams();
  const [tab, setTab] = useState("my-payroll");
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(null);
  const load = useCallback(async () => {
    const period = { payrollMonth: month, payrollYear: year };
    const [summary, payslips] = await Promise.all(tab === "my-payroll" ? [
      payrollApi.getMyPayrollSummary({ month, year }),
      payrollApi.getMyPayslips(period),
    ] : [
      payrollApi.getPayrollSummary({ month, year, scope: "staff", ...campusParams }),
      payrollApi.getPayslips({ ...period, scope: "staff", ...campusParams }),
    ]);
    return { summary, payslips: getRows(payslips), scopeKey: JSON.stringify([tab, month, year, campusParams]) };
  }, [tab, month, year, campusParams]);
  const state = useFinancePage(load, [load]);
  const isCurrentData = state.data?.scopeKey === JSON.stringify([tab, month, year, campusParams]);
  const summary = isCurrentData ? state.data?.summary || {} : {};
  const records = isCurrentData ? state.data?.payslips || [] : [];
  const value = (keys) => {
    const amount = getNumber(summary, keys);
    return amount == null ? "?" : formatMoney(amount);
  };
  const download = async (row) => {
    const id = row.payslipId ?? row.PayslipId;
    if (!id) return;
    setDownloading(id); setDownloadError("");
    try {
      const blob = await payrollApi.downloadPayslipPdfBlob(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `Payslip_${year}_${String(month).padStart(2, "0")}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error) || "Unable to download the payslip.");
    } finally { setDownloading(null); }
  };
  const personal = tab === "my-payroll";
  const pick = (row, ...keys) => keys.map(key => row[key]).find(item => item !== undefined && item !== null && item !== "");
  const money = (amount) => amount == null ? "?" : formatMoney(amount);
  return <>
    <AccountantPageHeader title="Payroll" subtitle="View your salary and authorized staff payroll." action={<Link className="sp-btn" to="/accountant-dashboard/payroll/attendance-impact"><CalendarCheck size={15} /> Attendance impact</Link>} />
    <nav aria-label="Payroll views" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <button type="button" className={`sp-btn${personal ? " primary" : ""}`} aria-pressed={personal} onClick={() => { setTab("my-payroll"); setDownloadError(""); }}>My Payroll</button>
      <button type="button" className={`sp-btn${!personal ? " primary" : ""}`} aria-pressed={!personal} onClick={() => { setTab("staff-payroll"); setDownloadError(""); }}>Staff Payroll</button>
    </nav>
    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
      <label>Month <select className="sp-select" value={month} onChange={event => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" })}</option>)}</select></label>
      <label>Year <input className="sp-select" type="number" min="2000" max="9999" value={year} onChange={event => setYear(Number(event.target.value))} /></label>
    </div>
    <PageState loading={state.loading} error={state.error} onRetry={state.reload} />
    {downloadError && <div className="sp-api-state is-error" role="alert">{downloadError}</div>}
    {!state.loading && !state.error && isCurrentData && <>
      <section className="sp-summary-grid four">
        <AccountantSummaryCard icon={adminIconAssets.payroll} label={personal ? "Net Salary" : "Campus Total Payroll"} value={value(["totalNetSalary", "TotalNetSalary"])} note={personal ? `Status: ${pick(summary, "payslipStatus", "PayslipStatus") || "?"}` : "Monthly net salary"} />
        <AccountantSummaryCard icon={adminIconAssets.payroll} label={personal ? "Gross Salary" : "Staff Payslips"} value={personal ? value(["totalGrossSalary", "TotalGrossSalary"]) : (getNumber(summary, ["totalPayslips", "TotalPayslips"]) ?? "?")} tone="blue" />
        <AccountantSummaryCard icon={adminIconAssets.attendanceImpact} label={personal ? "Total Deductions" : "Paid Payslips"} value={personal ? value(["totalDeductions", "TotalDeductions"]) : (getNumber(summary, ["paidPayslips", "PaidPayslips"]) ?? "?")} tone="purple" />
        <AccountantSummaryCard icon={adminIconAssets.attendanceImpact} label={personal ? "Payslips Available" : "Pending Payslips"} value={personal ? records.length : (getNumber(summary, ["pendingPayslips", "PendingPayslips"]) ?? "?")} note="Selected month" tone="orange" />
      </section>
      {personal && <AccountantCard title="Salary Breakdown" subtitle="Selected month">
        <AccountantDataTable columns={["Component", "Amount"]} rows={[["Basic pay", "basicPay", "BasicPay"], ["House rent allowance", "hra", "Hra"], ["Dearness allowance", "da", "Da"], ["Conveyance allowance", "conveyanceAllowance", "ConveyanceAllowance"], ["Medical allowance", "medicalAllowance", "MedicalAllowance"], ["Other allowance", "otherAllowance", "OtherAllowance"], ["Provident fund", "pf", "Pf"], ["Professional tax", "professionalTax", "ProfessionalTax"], ["TDS", "tds", "Tds"], ["ESI", "esi", "Esi"], ["Other deductions", "insuranceOtherDeduction", "InsuranceOtherDeduction"]].map(([label, ...keys]) => [label, money(pick(summary, ...keys))])} />
      </AccountantCard>}
      <AccountantCard title={personal ? "My Payslips" : "Staff Payroll Records"} subtitle="Selected month">
        {personal ? <AccountantDataTable columns={["Month / Year", "Gross Salary", "Deductions", "Net Salary", "Status", "Action"]} statusColumns={[4]} rows={records.map(row => ({ id: pick(row, "payslipId", "PayslipId"), "Month / Year": `${pick(row, "payrollMonth", "PayrollMonth") ?? "?"} / ${pick(row, "payrollYear", "PayrollYear") ?? "?"}`, "Gross Salary": money(pick(row, "grossSalary", "GrossSalary")), Deductions: money(pick(row, "totalDeductions", "TotalDeductions")), "Net Salary": money(pick(row, "netSalary", "NetSalary")), Status: pick(row, "payslipStatus", "PayslipStatus", "paymentStatus", "PaymentStatus") || "?", Action: <button type="button" className="sp-btn" disabled={!pick(row, "payslipId", "PayslipId") || downloading !== null} onClick={() => download(row)}>Download PDF</button> }))} empty="No personal payslip records found for this period." /> : <AccountantPayrollRecords key={`${month}-${year}-${JSON.stringify(campusParams)}`} records={records.map(row => ({ staffName: pick(row, "staffName", "StaffName") || "?", month: `${pick(row, "payrollMonth", "PayrollMonth") ?? "?"} / ${pick(row, "payrollYear", "PayrollYear") ?? "?"}`, amount: pick(row, "netSalary", "NetSalary"), status: pick(row, "payslipStatus", "PayslipStatus", "paymentStatus", "PaymentStatus") || "?" }))} formatAmount={money} />}
      </AccountantCard>
    </>}
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
    <AccountantDataTable columns={["Staff Member", "Month", "Net Amount", "Status"]} statusColumns={[3]} rows={records.slice(startIndex, endIndex).map(row => ({ "Staff Member": row.staffName, Month: row.month, "Net Amount": formatAmount(row.amount), Status: row.status }))} empty="No payroll records available." />
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