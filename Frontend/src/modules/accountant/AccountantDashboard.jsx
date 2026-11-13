import { SkeletonCard, Skeleton } from "@/shared/components/Skeleton.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarDays, RefreshCw, Sun, Moon, Sunset } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as payrollApi from "@/api/payrollApi.js";
import { getFeeCollectionDetails } from "@/api/reportApi.js";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { attendanceService } from "@/api/attendanceService.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { adminIconAssets } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { AccountantCard, AccountantDataTable, AccountantSummaryCard } from "./components/AccountantUI.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { usePermissions } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import staffIcon from "@/assets/dashboard-3d/non-teaching-staff.png";
import { getRows, getNumber, formatMoney, formatDate, normalizePayment, normalizeDue, normalizePayroll, checkedFeeData } from "./services/accountantService.js";
import { profileValue as field } from "./utils/accountantProfileData.js";
import { parseAccountantLeaveCategories, getApplicableAccountantLeaveCategories } from "./utils/accountantLeaveStats.js";

export function accountantGreeting(hour) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

// The dashboard API supplies saved transactions. /collection supplies fee accounts,
// not payments, and must never be used to infer a transaction count or payment date.
export function accountantRecentPayments(dashboard) {
  const rows = field(dashboard, "recentPayments");
  if (!Array.isArray(rows)) return null;
  return rows.map(normalizePayment).filter(row => row.amount > 0).sort((a, b) => {
    const first = Date.parse(a.date), second = Date.parse(b.date);
    return Number.isFinite(first) && Number.isFinite(second) ? second - first : Number.isFinite(second) ? 1 : Number.isFinite(first) ? -1 : 0;
  });
}

// Aggregate the complete scoped report, never the dashboard's limited recent list.
export function accountantMonthlyCollections(response) {
  const report = checkedFeeData(response);
  const details = field(report, "details");
  const count = getNumber(report, ["totalTransactions", "TotalTransactions", "transactions", "Transactions"]);
  const total = getNumber(report, ["totalCollected", "TotalCollected"]);
  if (!Array.isArray(details) || count !== details.length || total == null) throw new Error("The collection report did not return a complete transaction list and total.");
  const seen = new Set(), months = new Map();
  let cents = 0;
  for (const row of details) {
    const id = field(row, "paymentId");
    const period = field(row, "period");
    const paid = getNumber(row, ["paidAmount", "PaidAmount"]);
    const collected = getNumber(row, ["collected", "Collected"]);
    // Match ReportsController's amount selection, including signed report adjustments.
    const amount = paid > 0 ? paid : collected;
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0 || seen.has(String(Number(id))) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || amount == null || ["failed", "cancelled"].includes(String(field(row, "status")).toLowerCase())) throw new Error("The collection report contains duplicate, incomplete or unsupported transactions.");
    seen.add(String(Number(id)));
    const value = Math.round(amount * 100);
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(cents + value)) throw new Error("Collection amounts could not be verified.");
    cents += value;
    months.set(period, (months.get(period) ?? 0) + value);
  }
  if (cents !== Math.round(total * 100)) throw new Error("Collection details do not match the report total.");
  return [...months].sort(([a], [b]) => a.localeCompare(b)).map(([period, value]) => ({ period, collected: value / 100 }));
}

function MonthlyFeeChart({ state, allowed }) {
  if (state.loading) return <SkeletonCard lines={3} />;
  if (state.error || !state.data?.length) return <div className="accountant-home-chart-unavailable" role="status"><HomeIcon asset={adminIconAssets.financialReports} /><strong>{state.error ? "Monthly collection data unavailable" : allowed && state.data ? "No fee collections for this scope" : "Monthly collection data unavailable"}</strong><p>{state.error || (allowed && state.data ? "No reported transactions match the selected campus, board and academic year." : allowed ? "No complete monthly report was returned for the selected campus, board and academic year." : "Financial Reports view permission is required for the monthly collection report.")}</p></div>;
  const monthLabel = period => { const [year, month] = period.split("-").map(Number); return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); };
  const axisAmount = value => Math.abs(value) >= 100000 ? `₹${Number((value / 100000).toFixed(1))}L` : Math.abs(value) >= 1000 ? `₹${Number((value / 1000).toFixed(1))}k` : `₹${value}`;
  return <div className="accountant-home-monthly-chart" role="group" aria-label="Monthly fee collections in INR, selected campus, board and academic year">
    <div className="accountant-home-chart-plot">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={state.data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--cms-border)" />
        <XAxis dataKey="period" tickFormatter={monthLabel} tick={{ fontSize: 10, fill: "var(--cms-muted)" }} tickLine={false} axisLine={{ stroke: "var(--cms-border)" }} minTickGap={12} />
        <YAxis tickFormatter={axisAmount} tick={{ fontSize: 10, fill: "var(--cms-muted)" }} tickLine={false} axisLine={false} width={53} />
        <Tooltip labelFormatter={monthLabel} formatter={value => [formatMoney(value), "Reported collection"]} contentStyle={{ background: "var(--cms-surface)", borderColor: "var(--cms-border)", borderRadius: 8, color: "var(--cms-text)" }} />
        <Bar dataKey="collected" fill="var(--cms-primary)" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
    </div>
    <span className="accountant-home-chart-caption">Reported collections (INR), by payment month</span>
  </div>;
}

export async function loadAccountantHomePersonal({ attendance, leave }) {
  const data = { errors: {} };
  const read = async (key, request) => {
    try { data[key] = checkedFeeData(await request()); }
    catch (error) { data.errors[key] = `${error.response?.status ? `HTTP ${error.response.status}: ` : ""}${getApiErrorMessage(error)}`; }
  };
  await Promise.all([
    read("profile", () => apiClient.get("/api/v1/staff/me")),
    ...(attendance ? [read("today", () => attendanceService.getMyTodayStatus()), read("attendance", () => attendanceService.getMyAttendanceHistory("week"))] : []),
    ...(leave ? [read("categories", () => apiClient.get("/api/v1/leave-categories"))] : []),
  ]);
  if (leave) {
    const staffId = Number(field(data.profile, "staffId", "id"));
    if (Number.isSafeInteger(staffId) && staffId > 0) {
      await read("leaves", async () => {
        const response = await apiClient.get(`/api/v1/staff-attendance/leave/history/staff/${staffId}`);
        const history = checkedFeeData(response);
        const rows = field(history, "history");
        if (Number(field(history, "staffId")) !== staffId || !Array.isArray(rows) || rows.some(row => Number(field(row, "staffId")) !== staffId)) throw new Error("Leave history does not match your authenticated staff identity.");
        return rows.map(row => Object.fromEntries(["staffId", "leaveCategoryId", "leaveCategoryName", "leaveType", "totalDays", "status"].map(key => [key, field(row, key)])));
      });
    } else data.errors.leaves = "Your authenticated staff profile is required to load leave requests.";
    try {
      const catalog = parseAccountantLeaveCategories({ data: data.categories });
      data.catalog = catalog;
      data.categories = getApplicableAccountantLeaveCategories(catalog, field(data.profile, "staffType"));
    } catch (error) { data.errors.categories ||= error.message; data.categories = []; }
  }
  return data;
}

function useAccountantLoader(loader) {
  const [state, setState] = useState({ loader: null, data: null, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState({ loader, data: null, loading: true, error: "" });
    loader().then(data => { if (active) setState({ loader, data, loading: false, error: "" }); })
      .catch(error => { if (active) setState({ loader, data: null, loading: false, error: getApiErrorMessage(error) }); });
    return () => { active = false; };
  }, [loader]);
  return state.loader === loader ? state : { data: null, loading: true, error: "" };
}

function HomeIcon({ asset }) {
  return typeof asset === "string" ? <img src={asset} alt="" aria-hidden="true" /> : <span aria-hidden="true" style={{ backgroundImage: `url(${asset.src})`, backgroundPosition: asset.position }} />;
}

function HomeCardTitle({ icon, children }) {
  return <span className="accountant-home-card-title"><span className="accountant-home-card-icon"><HomeIcon asset={icon} /></span>{children}</span>;
}

function PayrollOverview({ summary }) {
  const total = getNumber(summary, ["totalPayslips", "TotalPayslips"]);
  const statuses = [
    ["Paid Payslips", getNumber(summary, ["paidPayslips", "PaidPayslips"]), "#84b600"],
    ["Pending Payslips", getNumber(summary, ["pendingPayslips", "PendingPayslips"]), "#facc15"],
    ["On Hold", getNumber(summary, ["onHoldPayslips", "OnHoldPayslips"]), "#737373"],
  ];
  const validCount = value => Number.isSafeInteger(value) && value >= 0;
  const known = statuses.reduce((sum, [, count]) => sum + (count ?? 0), 0);
  const complete = validCount(total) && statuses.every(([, count]) => validCount(count)) && known <= total;
  if (complete && total > known) statuses.push(["Other Statuses", total - known, "#cbd5e1"]);
  let position = 0;
  const stops = complete && total > 0 ? statuses.map(([, count, color]) => {
    const start = position;
    position += count / total * 100;
    return `${color} ${start}% ${position}%`;
  }).join(", ") : null;
  return <div className="accountant-home-payroll-overview">
    <div className="accountant-home-donut" style={stops ? { background: `conic-gradient(${stops})` } : undefined} role="img" aria-label={complete ? `${total} payslips. ${statuses.map(([label, count]) => `${label}: ${count}`).join(". ")}` : "Payroll status breakdown unavailable"}>
      <div><span>Total</span><strong>{validCount(total) ? total : "—"}</strong><span>Payslips</span></div>
    </div>
    <div className="accountant-home-payroll-legend">{statuses.map(([label, count, color]) => <div key={label}><span><i style={{ background: color }} aria-hidden="true" />{label}</span><strong>{validCount(count) ? count : "Unavailable"}</strong></div>)}{!complete && <p role="status">Status breakdown unavailable.</p>}</div>
  </div>;
}

export default function AccountantDashboard() {
  const { selectedCampusId, selectedCampus } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const permissions = usePermissions();
  const canFees = permissions.canView("fee-management", "fee-structure");
  const canHistory = permissions.canView("fee-management", "fee-collection");
  const canPayroll = permissions.canView("payroll");
  const canAttendance = permissions.canView("staff-attendance", "my-attendance");
  const canLeave = permissions.canView("staff-leave-management", "staff-leave");
  const canReports = permissions.canView("reports-analytics");
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const campusParams = useMemo(() => selectedCampusId ? { campusId: Number(selectedCampusId) || selectedCampusId } : {}, [selectedCampusId]);
  const financeParams = useMemo(() => ({ ...campusParams, ...(selectedBoardId ? { boardId: selectedBoardId } : {}), ...(selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}) }), [campusParams, selectedBoardId, selectedAcademicYearId]);
  const load = useCallback(async () => {
    const allowedFees = canFees || canHistory;
    const results = await Promise.allSettled([
      allowedFees ? apiClient.get(apiEndpoints.fee.dashboard, { params: financeParams }) : null,
      allowedFees ? apiClient.get(apiEndpoints.fee.collection, { params: financeParams }) : null,
      allowedFees ? apiClient.get(apiEndpoints.fee.due, { params: financeParams }) : null,
      canPayroll ? payrollApi.getPayrollSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), ...campusParams }) : null,
      canPayroll ? payrollApi.getPayslips(campusParams) : null,
    ]);
    const errors = [];
    const values = results.map((result, index) => {
      try { if (result.status === "rejected") throw result.reason; return result.value == null ? null : checkedFeeData(result.value); }
      catch (error) { errors.push(`${["Financial overview", "Fee accounts", "Pending dues", "Payroll", "Payslips"][index]}: ${getApiErrorMessage(error)}`); return null; }
    });
    const [dashboard, collection, due, payroll, payslips] = values;
    return { dashboard, collection: collection == null ? null : getRows(collection), payments: accountantRecentPayments(dashboard), dues: due == null ? null : getRows(due).map(normalizeDue).filter(row => row.amount > 0).sort((a, b) => (Date.parse(a.dueDate) || Infinity) - (Date.parse(b.dueDate) || Infinity)), payroll, payrollRows: payslips == null ? null : getRows(payslips).map(normalizePayroll), errors };
  }, [campusParams, financeParams, canFees, canHistory, canPayroll, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const personalLoad = useCallback(() => loadAccountantHomePersonal({ attendance: canAttendance, leave: canLeave }), [canAttendance, canLeave, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const finance = useAccountantLoader(load);
  const personal = useAccountantLoader(personalLoad);
  const collectionLoad = useCallback(async () => canReports ? accountantMonthlyCollections(await getFeeCollectionDetails(financeParams)) : null, [canReports, financeParams, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const collectionTrend = useAccountantLoader(collectionLoad);
  const data = finance.data;
  const self = personal.data;
  const profile = self?.profile;
  const name = [field(profile, "firstName"), field(profile, "middleName"), field(profile, "lastName")].filter(Boolean).join(" ") || field(permissions.user, "fullName", "name") || "Accountant";
  const employee = field(profile, "employeeId") || field(permissions.user, "employeeId");
  const department = field(profile, "departmentName", "department");
  const campus = field(selectedCampus, "campusName", "name") || field(profile, "campusName");
  const dashboard = data?.dashboard;
  const payments = data?.payments;
  const dues = data?.dues;
  const payroll = data?.payroll;
  const collected = getNumber(dashboard, ["totalCollected", "TotalCollected", "collected", "Collected", "totalPaid", "TotalPaid"])
    ?? (data?.collection ? data.collection.reduce((sum, row) => sum + Number(field(row, "paid") || 0), 0) : null);
  const pending = getNumber(dashboard, ["totalOutstanding", "TotalOutstanding", "outstanding", "Outstanding", "pendingAmount", "PendingAmount"])
    ?? (dues ? dues.reduce((sum, row) => sum + row.amount, 0) : null);
  const payrollTotal = getNumber(payroll, ["totalNetSalary", "TotalNetSalary", "totalPayroll", "TotalPayroll", "netSalary", "NetSalary"])
    ?? (data?.payrollRows ? data.payrollRows.reduce((sum, row) => sum + row.amount, 0) : null);
  const amount = value => value == null ? "Unavailable" : formatMoney(value);
  const attendanceStatus = field(self?.today, "todayStatus") || ({ punched_in: "Checked in", punched_out: "Checked out", not_punched: "Not checked in" })[field(self?.today, "status")] || field(self?.today, "status") || "No record available";
  const metrics = field(self?.attendance, "metrics");
  const metric = key => field(metrics, key) === "" ? "Unavailable" : field(metrics, key);
  const pendingPayslips = getNumber(payroll, ["pendingPayslips", "PendingPayslips"]);
  const hour = now.getHours();
  const GreetingIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const quickActions = [
    ["Collect Student Fee", "/accountant-dashboard/fees?tab=collection", adminIconAssets.feeManagement, canFees && canHistory && permissions.canCreate("fee-management", "fee-collection")],
    ["Student Fee Ledger", "/accountant-dashboard/fees?tab=ledger", adminIconAssets.feeManagement, canFees && permissions.canView("fee-management", "student-fees")],
    ["Student Fee Payment History", "/accountant-dashboard/fees?tab=student-ledger&subtab=payment-history", adminIconAssets.paymentHistory, canHistory],
    ["Payroll", "/accountant-dashboard/payroll", adminIconAssets.payroll, canPayroll],
    ["Financial Reports", "/accountant-dashboard/reports", adminIconAssets.financialReports, permissions.canView("reports-analytics")],
  ].filter(([, , , allowed]) => allowed);

  return <div className="accountant-home">
    <header className="accountant-home-welcome">
      <div className="accountant-home-identity">
        <div className="accountant-home-avatar"><HomeIcon asset={staffIcon} /></div>
        <div className="accountant-home-welcome-copy">
          <h1><GreetingIcon size={21} aria-hidden="true" /> {accountantGreeting(hour)}, {name}!</h1>
          <div className="accountant-home-pills"><span>Accountant</span>{employee && <span>ID: {employee}</span>}{department && <span>{department}</span>}{campus && <span>{campus}</span>}</div>
        </div>
      </div>
      <div className="accountant-home-controls"><span><CalendarDays size={14} aria-hidden="true" />{now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span><button className="accountant-home-refresh" type="button" onClick={() => { setNow(new Date()); setRefresh(value => value + 1); }} disabled={finance.loading || personal.loading} aria-label="Refresh dashboard" title="Refresh dashboard"><RefreshCw size={15} /><span>Refresh dashboard</span></button></div>
    </header>
    {personal.error || self?.errors.profile ? <p className="accountant-home-notice" role="status">Profile: {personal.error || self.errors.profile}</p> : null}
    <section aria-label="Financial overview" aria-busy={finance.loading}>
      {finance.error || data?.errors.length ? <p className="accountant-home-notice" role="status"><AlertCircle size={15} /> {finance.error || data.errors.join(" ")}</p> : null}
      <div className="accountant-home-summary">
        <AccountantSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collected" value={finance.loading ? <Skeleton style={{ width: 100, height: 24 }} /> : amount(collected)} note="Selected campus, board & academic year" />
        <AccountantSummaryCard icon={adminIconAssets.feeManagement} label="Pending Dues" value={finance.loading ? <Skeleton style={{ width: 100, height: 24 }} /> : amount(pending)} note={dues ? `${dues.length} outstanding records` : "Outstanding student balances"} tone="orange" />
        <AccountantSummaryCard icon={adminIconAssets.payroll} label={payroll ? "Payroll (This Month)" : "Payroll (Available Records)"} value={finance.loading ? <Skeleton style={{ width: 100, height: 24 }} /> : amount(payrollTotal)} note={payroll ? pendingPayslips == null ? "Current month, selected campus" : `${pendingPayslips} pending payslip${pendingPayslips === 1 ? "" : "s"}` : "Monthly summary unavailable; available payslips"} tone="blue" />
        <AccountantSummaryCard icon={adminIconAssets.paymentHistory} label="Recent Transactions" value={finance.loading ? <Skeleton style={{ width: 100, height: 24 }} /> : payments?.length ?? "Unavailable"} note="Returned recent fee payments & receipts" tone="purple" />
      </div>
    </section>
    {quickActions.length > 0 && <section className="accountant-home-quick" aria-labelledby="accountant-home-actions-title">
      <h2 id="accountant-home-actions-title">Quick Actions</h2>
      <div className="accountant-home-actions">{quickActions.map(([label, to, asset]) => <Link key={label} to={to} className="accountant-home-action"><span className="accountant-home-action-icon"><HomeIcon asset={asset} /></span><span>{label}</span><ArrowRight size={17} aria-hidden="true" /></Link>)}</div>
    </section>}
    <div className="accountant-home-main-grid">
      <AccountantCard className="accountant-home-widget accountant-home-attendance-card" title={<HomeCardTitle icon={attendanceIcon}>Today's Attendance</HomeCardTitle>} subtitle={now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}>
        {canAttendance ? personal.loading ? <SkeletonCard lines={3} /> : personal.error || self?.errors.today ? <p className="accountant-home-notice" role="status">{personal.error || self.errors.today}</p> : <>
          <div className="accountant-home-attendance"><span className="accountant-home-attendance-icon"><HomeIcon asset={attendanceIcon} /></span><div><span className="accountant-home-eyebrow">Today's Status</span><h3>{attendanceStatus}</h3>{field(self?.today, "shiftName") && <p>Shift: {field(self.today, "shiftName")}</p>}</div><Link className="sp-btn" to="/accountant-dashboard/my-attendance">Open Punch Controls <ArrowRight size={14} /></Link></div>
          <dl className="accountant-home-details">{[["Check In", field(self?.today, "inTime")], ["Check Out", field(self?.today, "outTime")], ["Working Duration", field(self?.today, "shiftDuration")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Unavailable"}</dd></div>)}</dl>
        </> : <p>Attendance access is unavailable for this account.</p>}
        {canAttendance && !personal.loading && <div className="accountant-home-records">{self?.errors.attendance ? <p role="status">Attendance summary: {self.errors.attendance}</p> : <><span>This Week:</span><strong>{metric("presentDays")} present</strong><span className="accountant-home-record-divider" aria-hidden="true">|</span><span>{metric("workingDays")} working</span></>}</div>}
      </AccountantCard>
      <AccountantCard className="accountant-home-widget accountant-home-dues-card" title={<HomeCardTitle icon={adminIconAssets.feeManagement}>Pending Fee Dues</HomeCardTitle>} subtitle="Outstanding student fee balances">
        {finance.loading ? <SkeletonCard lines={3} /> : <AccountantDataTable columns={["Student", "Adm. No", "Amount", "Due Date"]} rows={(dues || []).slice(0, 3).map(row => ({ Student: row.studentName, "Adm. No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": row.dueDate && Number.isFinite(Date.parse(row.dueDate)) ? formatDate(row.dueDate) : "Unavailable" }))} empty={dues == null ? "Pending dues data is unavailable." : "No outstanding dues available."} />}
        {canFees && <div className="accountant-home-card-footer"><Link className="sp-text-link" to="/accountant-dashboard/fees?tab=ledger">View All Dues <ArrowRight size={15} /></Link></div>}
      </AccountantCard>
      <AccountantCard className="accountant-home-widget accountant-home-payroll-card" title={<HomeCardTitle icon={adminIconAssets.payroll}>Payroll Status</HomeCardTitle>} subtitle={`Current month${campus ? `, ${campus}` : ", selected campus"}`}>
        {finance.loading ? <SkeletonCard lines={3} /> : <PayrollOverview summary={payroll} />}
        {canPayroll && <div className="accountant-home-card-footer"><Link className="sp-text-link" to="/accountant-dashboard/payroll">Open Payroll <ArrowRight size={15} /></Link></div>}
      </AccountantCard>
    </div>
    <div className="accountant-home-bottom-grid">
      <AccountantCard className="accountant-home-widget accountant-home-collection-card" title={<HomeCardTitle icon={adminIconAssets.financialReports}>Fee Collection Overview</HomeCardTitle>} subtitle="Fee collection (INR), selected fee scope">
        <div className="accountant-home-collection-layout">
          <MonthlyFeeChart state={collectionTrend} allowed={canReports} />
          <dl className="accountant-home-collection-totals">{[["Total Collected", collected, adminIconAssets.feeManagement, "green"], ["Total Pending", pending, adminIconAssets.feeManagement, "orange"]].map(([label, value, asset, tone]) => <div key={label} className={`tone-${tone}`}><span><HomeIcon asset={asset} /></span><div><dt>{label}</dt><dd>{finance.loading ? <Skeleton style={{ width: 90, height: 20 }} /> : amount(value)}</dd></div></div>)}</dl>
        </div>
      </AccountantCard>
      <AccountantCard className="accountant-home-widget accountant-home-payments-card" title={<HomeCardTitle icon={adminIconAssets.paymentHistory}>Recent Payments</HomeCardTitle>} subtitle="Latest saved fee transactions" action={canHistory && <Link className="sp-text-link" to="/accountant-dashboard/fees?tab=student-ledger&subtab=payment-history">View History <ArrowRight size={15} /></Link>}>
        {finance.loading ? <SkeletonCard lines={3} /> : <AccountantDataTable columns={["Student", "Adm. No", "Type", "Amount", "Date"]} rows={(payments || []).slice(0, 3).map(row => ({ Student: row.studentName, "Adm. No": row.admissionNo, Type: row.type, Amount: formatMoney(row.amount), Date: row.date && Number.isFinite(Date.parse(row.date)) ? formatDate(row.date) : "Unavailable" }))} empty={payments == null ? "Recent payment data is unavailable." : "No payment transactions available."} />}
      </AccountantCard>
    </div>
  </div>;
}
