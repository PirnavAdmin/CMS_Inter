import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarDays, RefreshCw, Sun, Moon, Sunset } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as payrollApi from "@/api/payrollApi.js";
import { attendanceService } from "@/api/attendanceService.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { adminIconAssets } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import StudentCard from "@/modules/student/components/StudentCard.jsx";
import StudentDataTable from "@/modules/student/components/StudentDataTable.jsx";
import StudentSummaryCard from "@/modules/student/components/StudentSummaryCard.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { usePermissions } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import staffIcon from "@/assets/dashboard-3d/non-teaching-staff.png";
import { getRows, getNumber, formatMoney, formatDate, normalizePayment, normalizeDue, normalizePayroll, checkedFeeData } from "./services/accountantService.js";
import { profileValue as field } from "./utils/accountantProfileData.js";
import { parseAccountantLeaveCategories, getApplicableAccountantLeaveCategories, getAccountantLeaveCategoryStats, accountantLeaveCategoryLabel } from "./utils/accountantLeaveStats.js";

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

export default function AccountantDashboard() {
  const { selectedCampusId, selectedCampus } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const permissions = usePermissions();
  const canFees = permissions.canView("fee-management", "fee-structure");
  const canHistory = permissions.canView("fee-management", "fee-collection");
  const canPayroll = permissions.canView("payroll");
  const canAttendance = permissions.canView("staff-attendance", "my-attendance");
  const canLeave = permissions.canView("staff-leave-management", "staff-leave");
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
  const leaves = self?.leaves;
  const leaveCount = status => leaves ? leaves.filter(row => String(row.status).toLowerCase() === status).length : "Unavailable";
  const hour = now.getHours();
  const GreetingIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const quickActions = [
    ["Collect Student Fee", "/accountant-dashboard/fees?tab=collection", adminIconAssets.feeManagement, canFees && canHistory && permissions.canCreate("fee-management", "fee-collection"), "green"],
    ["Payment History", "/accountant-dashboard/payments?tab=fees", adminIconAssets.paymentHistory, canHistory, "blue"],
    ["Student Fee Ledger", "/accountant-dashboard/fees?tab=ledger", adminIconAssets.feeManagement, canFees && permissions.canView("fee-management", "student-fees"), "orange"],
    ["Financial Reports", "/accountant-dashboard/reports", adminIconAssets.financialReports, permissions.canView("reports-analytics"), "green"],
  ].filter(([, , , allowed]) => allowed);

  return <div className="accountant-home">
    <header className="accountant-home-welcome">
      <div className="accountant-home-identity"><div className="accountant-home-avatar"><HomeIcon asset={staffIcon} /></div><div><h1><GreetingIcon size={22} aria-hidden="true" /> {accountantGreeting(hour)}, {name}!</h1><div className="accountant-home-pills"><span>Accountant</span>{employee && <span>ID: {employee}</span>}{department && <span>{department}</span>}{campus && <span>{campus}</span>}</div></div></div>
      <div className="accountant-home-controls"><span><CalendarDays size={15} aria-hidden="true" />{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><button className="sp-btn" type="button" onClick={() => { setNow(new Date()); setRefresh(value => value + 1); }} disabled={finance.loading || personal.loading}><RefreshCw size={14} /> Refresh dashboard</button></div>
    </header>
    {personal.error || self?.errors.profile ? <p className="accountant-home-notice" role="status">Profile: {personal.error || self.errors.profile}</p> : null}
    <section aria-label="Financial overview" aria-busy={finance.loading}>
      {finance.loading ? <p className="accountant-home-notice" role="status">Loading financial overview...</p> : null}
      {finance.error || data?.errors.length ? <p className="accountant-home-notice" role="status"><AlertCircle size={15} /> {finance.error || data.errors.join(" ")}</p> : null}
      <div className="accountant-home-summary"><StudentSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collected" value={finance.loading ? "Loading..." : amount(collected)} note="Selected fee scope" /><StudentSummaryCard icon={adminIconAssets.feeManagement} label="Pending Dues" value={finance.loading ? "Loading..." : amount(pending)} note={dues ? `${dues.length} outstanding records` : "Outstanding student balances"} tone="orange" /><StudentSummaryCard icon={adminIconAssets.paymentHistory} label="Recent Transactions" value={finance.loading ? "Loading..." : payments?.length ?? "Unavailable"} note="Returned recent payments; not an all-time count" tone="blue" /><StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Summary" value={finance.loading ? "Loading..." : amount(payrollTotal)} note={payroll ? "Current month, selected campus" : "Available payslips, selected campus"} tone="purple" /></div>
    </section>
    {quickActions.length > 0 && <section className="accountant-home-quick" aria-labelledby="accountant-home-actions-title"><div className="accountant-home-section-head"><h2 id="accountant-home-actions-title">Quick Actions</h2></div><div className="accountant-home-actions">{quickActions.map(([label, to, icon, , tone]) => <Link key={label} to={to} className={`accountant-home-action tone-${tone}`}><HomeIcon asset={icon} /><span>{label}</span><ArrowRight size={14} aria-hidden="true" /></Link>)}</div></section>}
    <div className="accountant-home-widget-grid">
      <StudentCard className="accountant-home-widget accountant-home-attendance-card" title="Today's Attendance" subtitle={now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} action={canAttendance && <Link className="sp-text-link" to="/accountant-dashboard/my-attendance">View attendance records <ArrowRight size={13} /></Link>}>
        {canAttendance ? personal.loading ? <p role="status">Loading attendance...</p> : personal.error || self?.errors.today ? <p className="accountant-home-notice" role="status">{personal.error || self.errors.today}</p> : <><div className="accountant-home-attendance"><HomeIcon asset={attendanceIcon} /><div><span className="accountant-home-eyebrow">TODAY'S STATUS</span><h3>{attendanceStatus}</h3>{field(self?.today, "shiftName") && <p>Shift: {field(self.today, "shiftName")}</p>}</div><Link className="sp-btn primary" to="/accountant-dashboard/my-attendance">Open punch controls <ArrowRight size={14} /></Link></div><dl className="accountant-home-details">{[["Check in", field(self?.today, "inTime")], ["Check out", field(self?.today, "outTime")], ["Working duration", field(self?.today, "shiftDuration")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Unavailable"}</dd></div>)}</dl></> : <p>Attendance access is unavailable for this account.</p>}
        {canAttendance && !personal.loading && <div className="accountant-home-records">{self?.errors.attendance ? <p role="status">Attendance summary: {self.errors.attendance}</p> : <><span>This week</span><strong>{metric("presentDays")} present days</strong><span>{metric("workingDays")} working days</span></>}</div>}
      </StudentCard>
      <StudentCard className="accountant-home-widget accountant-home-leave-card" title="Leave Balances & Requests" subtitle="Your eligible non-teaching leave policies" action={canLeave && <Link className="sp-text-link" to="/accountant-dashboard/leave">Manage leaves <ArrowRight size={13} /></Link>}>
        {canLeave ? personal.loading ? <p role="status">Loading leave policies...</p> : personal.error ? <p className="accountant-home-notice" role="status">{personal.error}</p> : <>{self?.errors.categories ? <p className="accountant-home-notice" role="status">Leave categories: {self.errors.categories}</p> : <div className="accountant-home-leaves">{self?.categories?.length ? self.categories.map(category => { const stats = getAccountantLeaveCategoryStats(category, self.catalog, leaves || [], Boolean(leaves)); return <div key={category.leaveCategoryId}><span>{accountantLeaveCategoryLabel(category)}</span><strong>{stats.text}</strong><small>Approved days used / policy quota</small></div>; }) : <p>No eligible leave categories returned.</p>}</div>}<p className="accountant-home-caption">Individual leave balances: Unavailable. Policy quotas do not include individual allocations, accruals or carry-forward balances.</p>{self?.errors.leaves ? <p className="accountant-home-notice" role="status">Leave requests: {self.errors.leaves}</p> : <div className="accountant-home-records"><span>Pending <strong>{leaveCount("pending")}</strong></span><span>Approved <strong>{leaveCount("approved")}</strong></span><span>Rejected <strong>{leaveCount("rejected")}</strong></span></div>}</> : <p>Leave access is unavailable for this account.</p>}
      </StudentCard>
      <StudentCard className="accountant-home-widget accountant-home-table-widget" title="Recent Payments" subtitle="Latest saved fee transactions" action={canHistory && <Link className="sp-text-link" to="/accountant-dashboard/payments?tab=fees">View history <ArrowRight size={13} /></Link>}>
        <StudentDataTable columns={["Student", "Admission No", "Type", "Amount", "Date", "Status"]} statusColumns={[5]} rows={(payments || []).slice(0, 4).map(row => ({ Student: row.studentName, "Admission No": row.admissionNo, Type: row.type, Amount: formatMoney(row.amount), Date: formatDate(row.date), Status: row.status }))} empty={finance.loading ? "Loading payments..." : payments === null || payments === undefined ? "Recent payment data is unavailable." : "No payment transactions available."} />
      </StudentCard>
      <StudentCard className="accountant-home-widget accountant-home-table-widget" title="Pending Dues" subtitle="Outstanding student fee balances, earliest due first" action={canFees && <Link className="sp-text-link" to="/accountant-dashboard/fees?tab=ledger">Open ledger <ArrowRight size={13} /></Link>}><StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date"]} rows={(dues || []).slice(0, 4).map(row => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": row.dueDate && Number.isFinite(Date.parse(row.dueDate)) ? formatDate(row.dueDate) : "Unavailable" }))} empty={finance.loading ? "Loading dues..." : dues == null ? "Pending dues data is unavailable." : "No outstanding dues available."} /></StudentCard>
      <StudentCard className="accountant-home-widget" title="Financial Snapshot" subtitle="Amounts shown in INR; scopes differ">
        <dl className="accountant-home-snapshot">{[["Fee collected", collected, "Selected campus, board and academic-year fee scope"], ["Pending dues", pending, "Selected campus, board and academic-year fee scope"], ["Payroll", payrollTotal, payroll ? "Current month, selected campus" : "Available payslip records, selected campus"]].map(([label, value, scope]) => <div key={label}><dt>{label}</dt><dd>{finance.loading ? "Loading..." : amount(value)}</dd><small>{scope}</small></div>)}</dl>
      </StudentCard>
      <StudentCard className="accountant-home-widget" title="Payroll Status" subtitle="Current month, selected campus" action={canPayroll && <Link className="sp-text-link" to="/accountant-dashboard/payroll">Open payroll <ArrowRight size={13} /></Link>}>
        {finance.loading ? <p role="status">Loading payroll...</p> : <dl className="accountant-home-snapshot"><div><dt>Paid payslips</dt><dd>{getNumber(payroll, ["paidPayslips", "PaidPayslips"]) ?? "Unavailable"}</dd></div><div><dt>Pending payslips</dt><dd>{getNumber(payroll, ["pendingPayslips", "PendingPayslips"]) ?? "Unavailable"}</dd></div><div><dt>On hold</dt><dd>{getNumber(payroll, ["onHoldPayslips", "OnHoldPayslips"]) ?? "Unavailable"}</dd></div><div><dt>Total payslips</dt><dd>{getNumber(payroll, ["totalPayslips", "TotalPayslips"]) ?? "Unavailable"}</dd></div></dl>}
      </StudentCard>
    </div>
  </div>;
}
