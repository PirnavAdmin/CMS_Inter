import { useCallback, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, Eye, EyeOff, KeyRound, Lock, RefreshCw, Search, User } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as reportApi from "@/api/reportApi.js";
import * as payrollApi from "@/api/payrollApi.js";
import { attendanceService } from "@/api/attendanceService.js";
import { getAuthUser } from "@/features/authStorage.js";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import StudentSummaryCard from "@/Dashboard/StudentDashboard/components/StudentSummaryCard.jsx";
import { rowsOf, unwrap, requestError, useFinanceParams, useFinancePage, loadSections, loadPaymentHistory, loadScopedLedger } from "../accountantData.js";
import "@/components/pages/AdminProfilePage.css";

export const getRows = rowsOf;

export const getNumber = (item, keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
};

export const getText = (item, keys, fallback = "-") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
};

export const formatMoney = (value) => value == null ? "-" : `\u20b9${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const normalizePayment = (item = {}) => ({
  id: getText(item, ["feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"], ""),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  type: getText(item, ["paymentType", "PaymentType", "feeTypeName", "FeeTypeName", "type", "Type"], "Fee payment"),
  amount: getNumber(item, ["amount", "Amount", "paymentAmount", "PaymentAmount"])
    ?? (getNumber(item, ["paidAmount", "PaidAmount"]) > 0 ? getNumber(item, ["paidAmount", "PaidAmount"]) : getNumber(item, ["collected", "Collected", "paidAmount", "PaidAmount"])),
  date: getText(item, ["paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt"], ""),
  method: getText(item, ["paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method"]),
  reference: getText(item, ["referenceNumber", "ReferenceNumber", "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber"]),
  status: getText(item, ["status", "Status", "paymentStatus", "PaymentStatus"]),
  transaction: getText(item, ["transactionReference", "TransactionReference"]),
  raw: item,
});

export const normalizeDue = (item = {}) => ({
  id: getText(item, ["feeInstallmentId", "FeeInstallmentId", "studentFeeId", "StudentFeeId", "id", "Id"], ""),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  amount: getNumber(item, ["balance", "Balance", "balanceAmount", "BalanceAmount", "outstandingBalance", "OutstandingBalance", "outstandingAmount", "OutstandingAmount", "pendingAmount", "PendingAmount", "dueAmount", "DueAmount", "amount", "Amount"]),
  dueDate: getText(item, ["dueDate", "DueDate", "nextDue", "NextDue"], ""),
  status: getText(item, ["status", "Status", "feeStatus", "FeeStatus"], "Due"),
});

export const normalizePayroll = (item = {}) => ({
  id: getText(item, ["payslipId", "PayslipId", "salaryAssignmentId", "SalaryAssignmentId", "id", "Id"], ""),
  staffName: getText(item, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]),
  month: `${getText(item, ["monthName", "MonthName", "payrollMonth", "PayrollMonth", "month", "Month"])} / ${getText(item, ["payrollYear", "PayrollYear"])}`,
  amount: getNumber(item, ["netSalary", "NetSalary", "netPay", "NetPay", "amount", "Amount", "salary", "Salary"]),
  status: getText(item, ["payslipStatus", "PayslipStatus", "status", "Status", "paymentStatus", "PaymentStatus"]),
});

export function PageState({ loading, error, data, reload }) {
  if (loading) return <div role="status" className="sp-api-state">{data == null ? "Loading finance data..." : "Refreshing finance data..."}</div>;
  const message = error || data?.errors?.join(" ");
  if (message) return <div role="alert" className="sp-api-state is-error"><AlertCircle size={15} /> {message} {error && data != null ? "Showing previously loaded data." : ""} <button type="button" className="sp-btn" onClick={reload}><RefreshCw size={14} /> Retry</button></div>;
  return null;
}

function useCampusParams() {
  return useFinanceParams();
}

export function AccountantFees() {
  const campusParams = useCampusParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const load = useCallback((signal) => loadScopedLedger(campusParams, signal), [campusParams]);
  const state = useFinancePage(load);
  const rows = (state.data || []).filter((row) => {
    const due = normalizeDue(row);
    return `${due.studentName} ${due.admissionNo}`.toLowerCase().includes(search.toLowerCase()) && (!status || due.status === status);
  });
  return <>
    <StudentPageHeader title="Fee Management" subtitle="Review student ledgers, outstanding balances, installments, and collection status." action={<Link className="sp-btn" to="/accountant-dashboard/payments">Payment history</Link>} />
    <PageState {...state} />
    {state.data != null ? <StudentCard title="Student Fee Ledger" subtitle={`${rows.length} fee records`}>
      <div className="sp-toolbar"><div className="sp-search"><Search size={15} /><input aria-label="Search fee ledger" placeholder="Search by student or admission number" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{[...new Set((state.data || []).map((row) => normalizeDue(row).status))].map((value) => <option key={value}>{value}</option>)}</select></div>
      <StudentDataTable columns={["Student", "Admission No", "Group", "Section", "Payment Plan", "Payable", "Paid", "Balance", "Status", "Details"]} statusColumns={[8]} rows={rows.map((row) => {
        const due = normalizeDue(row);
        return { id: due.id, Student: due.studentName, "Admission No": due.admissionNo, Group: getText(row, ["groupName", "GroupName"]), Section: getText(row, ["sectionName", "SectionName"]), "Payment Plan": getText(row, ["paymentPlan", "PaymentPlan"]), Payable: formatMoney(getNumber(row, ["totalPayable", "TotalPayable"])), Paid: formatMoney(getNumber(row, ["totalPaid", "TotalPaid"])), Balance: formatMoney(due.amount), Status: due.status, Details: <button type="button" className="sp-btn" aria-label={`View fees for ${due.studentName}`} onClick={() => setSelected({ row, context: campusParams })}><Eye size={15} /></button> };
      })} empty="No fee records match the selected filters." />
    </StudentCard> : null}
    {selected?.context === campusParams ? <FeeDetails row={selected.row} params={campusParams} onClose={() => setSelected(null)} /> : null}
  </>;
}

function PaymentTable({ payments }) {
  return <StudentDataTable columns={["Student", "Admission No", "Type", "Amount", "Date", "Method", "Receipt", "Transaction", "Status"]} statusColumns={[8]} rows={payments.map(normalizePayment).map((row) => ({ id: row.id, Student: row.studentName, "Admission No": row.admissionNo, Type: row.type, Amount: formatMoney(row.amount), Date: formatDate(row.date), Method: row.method, Receipt: row.reference, Transaction: row.transaction, Status: row.status }))} empty="No payment transactions available." />;
}

function FeeDetails({ row, params, onClose }) {
  const load = useCallback((signal) => loadSections({
    account: async () => {
      const id = row.studentFeeId ?? row.StudentFeeId;
      const assignment = unwrap(await apiClient.get(apiEndpoints.fee.studentFeeDetails(id), { params, signal }));
      return {
        ...assignment,
        originalFee: getNumber(assignment, ["totalAmount", "TotalAmount"]),
        concession: getNumber(assignment, ["concessionAmount", "ConcessionAmount"]),
        totalPayable: getNumber(assignment, ["payableAmount", "PayableAmount"]),
        totalPaid: getNumber(assignment, ["paidAmount", "PaidAmount"]),
        outstandingBalance: getNumber(assignment, ["balanceAmount", "BalanceAmount"]),
        breakdown: getRows(assignment.components ?? assignment.Components).map((item) => ({
          feeType: getText(item, ["feeTypeName", "FeeTypeName"]),
          amount: getNumber(item, ["amount", "Amount"]),
          concessionScheme: getText(item, ["concessionScheme", "ConcessionScheme"]),
          discount: getNumber(item, ["concessionAmount", "ConcessionAmount"]),
          payable: getNumber(item, ["payableAmount", "PayableAmount"]),
        })),
      };
    },
    studentDetails: () => apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(row.studentId ?? row.StudentId), { params, signal }),
    history: () => apiClient.get(apiEndpoints.fee.history(row.studentId ?? row.StudentId), { params, signal }),
  }), [row, params]);
  const state = useFinancePage(load);
  const feeId = row.studentFeeId ?? row.StudentFeeId;
  const studentDetail = state.data?.studentDetails;
  const detail = studentDetail && String(studentDetail.studentFeeId ?? studentDetail.StudentFeeId) === String(feeId)
    ? studentDetail : state.data?.account;
  const history = getRows(state.data?.history).filter((payment) => String(payment.studentFeeId ?? payment.StudentFeeId) === String(feeId));
  const matches = detail && String(detail.studentFeeId ?? detail.StudentFeeId) === String(feeId);
  return <StudentCard title="Student Fee Details" action={<button className="sp-btn" type="button" onClick={onClose}>Close</button>}>
    <PageState {...state} />
    {detail && !matches ? <div role="alert" className="sp-api-state is-error">The backend returned a different fee assignment. Details are unavailable for this record.</div> : null}
    {matches ? <>
      <div className="sp-metric-list">{[
        ["Student", getText(detail, ["studentName", "StudentName"])], ["Admission No", getText(detail, ["admissionNumber", "AdmissionNumber"])],
        ["Board", getText(row, ["boardName", "BoardName"])], ["Academic Year", getText(detail, ["academicYearName", "AcademicYearName"], getText(row, ["academicYearName", "AcademicYearName"]))],
        ["Roll Number", getText(detail, ["rollNumber", "RollNumber"], getText(row, ["rollNumber", "RollNumber"]))], ["Payment Plan", getText(detail, ["paymentPlan", "PaymentPlan"])],
        ["Status", getText(detail, ["feeStatus", "FeeStatus", "status", "Status"])], ["Assigned Fees", formatMoney(getNumber(detail, ["originalFee", "OriginalFee"]))],
        ["Concession", formatMoney(getNumber(detail, ["concession", "Concession"]))], ["Payable", formatMoney(getNumber(detail, ["totalPayable", "TotalPayable"]))],
        ["Paid", formatMoney(getNumber(detail, ["totalPaid", "TotalPaid"]))], ["Outstanding", formatMoney(getNumber(detail, ["outstandingBalance", "OutstandingBalance"]))],
      ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <h3>Assigned Fees</h3>
      <StudentDataTable columns={["Fee", "Amount", "Concession", "Discount", "Payable"]} rows={getRows(detail.breakdown ?? detail.Breakdown).map((item) => ({ Fee: getText(item, ["feeType", "FeeType"]), Amount: formatMoney(getNumber(item, ["amount", "Amount"])), Concession: getText(item, ["concessionScheme", "ConcessionScheme"]), Discount: formatMoney(getNumber(item, ["discount", "Discount"])), Payable: formatMoney(getNumber(item, ["payable", "Payable"])) }))} />
      <h3>Installments</h3>
      <StudentDataTable columns={["Installment", "Due Date", "Amount", "Paid", "Balance", "Status"]} statusColumns={[5]} rows={getRows(detail.schedules ?? detail.Schedules).map((item) => ({ Installment: getText(item, ["feeSchedule", "FeeSchedule", "installmentNumber", "InstallmentNumber"]), "Due Date": formatDate(item.dueDate ?? item.DueDate), Amount: formatMoney(getNumber(item, ["amount", "Amount"])), Paid: formatMoney(getNumber(item, ["paidAmount", "PaidAmount"])), Balance: formatMoney(getNumber(item, ["balanceAmount", "BalanceAmount"])), Status: getText(item, ["status", "Status"]) }))} />
    </> : null}
    {state.data?.history != null ? <><h3>Payment Transactions</h3><PaymentTable payments={history} /></> : null}
  </StudentCard>;
}

export function AccountantPayments() {
  const campusParams = useCampusParams();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const load = useCallback((signal) => loadPaymentHistory(campusParams, signal), [campusParams]);
  const state = useFinancePage(load);
  const rows = (state.data?.payments || []).map(normalizePayment).sort((a, b) => String(b.date).localeCompare(String(a.date))).filter((row) => !search || `${row.studentName} ${row.admissionNo} ${row.reference} ${row.transaction}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <StudentPageHeader title="Payment History" subtitle="Review fee transactions, references, payment methods, and status." action={<Link className="sp-btn" to="/accountant-dashboard/fees">Fee ledger</Link>} />
    <PageState {...state} />
    {state.data != null ? <StudentCard title="Fee Transactions" subtitle={`${rows.length} transactions`}>
      <div className="sp-toolbar"><div className="sp-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, admission number, or reference" /></div></div>
      <StudentDataTable columns={["Student", "Admission No", "Type", "Amount", "Date", "Method", "Receipt", "Transaction", "Status", "Details"]} statusColumns={[8]} rows={rows.map((row) => ({ id: row.id, Student: row.studentName, "Admission No": row.admissionNo, Type: row.type, Amount: formatMoney(row.amount), Date: formatDate(row.date), Method: row.method, Receipt: row.reference, Transaction: row.transaction, Status: row.status, Details: <button type="button" className="sp-btn" aria-label="View payment details" onClick={() => setSelected({ row, context: campusParams })}><Eye size={15} /></button> }))} empty="No payment transactions available." />
    </StudentCard> : null}
    {selected?.context === campusParams ? <PaymentDetails payment={selected.row} onClose={() => setSelected(null)} /> : null}
  </>;
}

function PaymentDetails({ payment, onClose }) {
  const load = useCallback((signal) => apiClient.get(apiEndpoints.fee.paymentDetails(payment.id), { signal }).then(unwrap), [payment]);
  const state = useFinancePage(load);
  return <StudentCard title="Payment Details" action={<button className="sp-btn" type="button" onClick={onClose}>Close</button>}>
    <PageState {...state} />
    {state.data ? <><PaymentTable payments={[state.data]} /><div className="sp-metric-list">{[
      ["Discount", formatMoney(getNumber(state.data, ["discount", "Discount"]))],
      ["Fine", formatMoney(getNumber(state.data, ["fine", "Fine"]))],
      ["Note", getText(state.data, ["note", "Note", "remarks", "Remarks"])],
    ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></> : null}
  </StudentCard>;
}

export function AccountantPayroll() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    const data = await loadSections({
      summary: () => payrollApi.getPayrollSummary({ campusId: campusParams.campusId }),
      payslips: () => payrollApi.getPayslips({ campusId: campusParams.campusId, payrollMonth: new Date().getMonth() + 1, payrollYear: new Date().getFullYear() }),
    });
    return { ...data, payslips: data.payslips == null ? undefined : getRows(data.payslips).map(normalizePayroll) };
  }, [campusParams]);
  const state = useFinancePage(load);
  const summary = state.data?.summary || {};
  const total = getNumber(summary, ["totalNetSalary", "TotalNetSalary", "totalPayroll", "TotalPayroll", "netSalary", "NetSalary"]);
  return <>
    <StudentPageHeader title="Payroll" subtitle={`Payroll for ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`} action={<Link className="sp-btn" to="/accountant-dashboard/payroll/attendance-impact"><CalendarCheck size={15} /> Attendance impact</Link>} />
    <PageState {...state} />
    {state.data != null ? <>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(total)} note="Current payroll summary" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payslips" value={getNumber(summary, ["totalPayslips", "TotalPayslips"]) ?? state.data?.payslips?.length ?? "-"} note="Current month" tone="blue" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Paid" value={getNumber(summary, ["paidPayslips", "PaidPayslips"]) ?? "-"} note="Current month" tone="purple" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Pending" value={getNumber(summary, ["pendingPayslips", "PendingPayslips"]) ?? "-"} note="Current month" tone="orange" />
      </section>
      <StudentCard title="Payroll Records" subtitle="Read-only payroll information">
        <StudentDataTable columns={["Staff Member", "Month", "Net Amount", "Status"]} statusColumns={[3]} rows={(state.data?.payslips || []).map((row) => ({ "Staff Member": row.staffName, Month: row.month, "Net Amount": formatMoney(row.amount), Status: row.status }))} empty={state.data?.payslips == null ? "Payslips unavailable." : "No payroll records available."} />
      </StudentCard>
    </> : null}
  </>;
}

export function AccountantAttendanceImpact() {
  const campusParams = useCampusParams();
  const load = useCallback(() => attendanceService.getStaffMonthlyReport({ ...campusParams, month: new Date().getMonth() + 1, year: new Date().getFullYear() }).then((data) => getRows(data)), [campusParams]);
  const state = useFinancePage(load);
  const rows = state.data || [];
  return <>
    <StudentPageHeader title="Attendance Impact" subtitle="Review staff attendance figures that may affect payroll calculations." action={<Link className="sp-btn" to="/accountant-dashboard/payroll"><span className="accountant-btn-generated-icon" style={{ backgroundImage: `url(${adminIconAssets.payroll.src})`, backgroundPosition: adminIconAssets.payroll.position }} aria-hidden="true" /> Payroll</Link>} />
    <PageState {...state} />
    {state.data != null ? <StudentCard title="Monthly Attendance Impact" subtitle="Staff attendance for the current month">
      <StudentDataTable columns={["Staff Member", "Present Days", "Absent Days", "Late", "Leave", "Attendance %"]} rows={rows.map((row) => ({ "Staff Member": getText(row, ["staffName", "StaffName"]), "Present Days": getNumber(row, ["presentCount", "PresentCount"]) ?? "-", "Absent Days": getNumber(row, ["absentCount", "AbsentCount"]) ?? "-", Late: getNumber(row, ["lateCount", "LateCount"]) ?? "-", Leave: getNumber(row, ["leaveCount", "LeaveCount"]) ?? "-", "Attendance %": getNumber(row, ["percentage", "Percentage"]) ?? "-" }))} empty="No attendance impact records available." />
    </StudentCard> : null}
  </>;
}

export function AccountantReports() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    return loadSections({
      collections: () => reportApi.getFeeCollectionDetails(campusParams),
      dues: () => reportApi.getDueFeesDetails(campusParams),
      payroll: () => payrollApi.getPayrollSummary({ campusId: campusParams.campusId }),
    });
  }, [campusParams]);
  const state = useFinancePage(load);
  const collectionRows = getRows(state.data?.collections).map(normalizePayment);
  const dueRows = getRows(state.data?.dues).map(normalizeDue).filter((row) => row.amount > 0);
  return <>
    <StudentPageHeader title="Financial Reports" subtitle="Financial collection, outstanding dues, transaction, and payroll reporting." />
    <PageState {...state} />
    {state.data != null ? <>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collection" value={formatMoney(getNumber(state.data?.collections, ["totalCollected", "TotalCollected"]))} note="Selected context" />
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Outstanding Dues" value={formatMoney(getNumber(state.data?.dues, ["totalDue", "TotalDue"]))} note="Selected context" tone="orange" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(getNumber(state.data?.payroll, ["totalPayroll", "TotalPayroll", "totalNetSalary", "TotalNetSalary"]))} note="Current month, selected campus" tone="purple" />
        <StudentSummaryCard icon={adminIconAssets.financialReports} label="Transactions" value={getNumber(state.data?.collections, ["totalTransactions", "TotalTransactions"]) ?? "-"} note="Selected context" tone="blue" />
      </section>
      <div className="sp-grid-2">
        <StudentCard title="Fee Collection Report"><StudentDataTable columns={["Student", "Amount", "Date", "Status"]} statusColumns={[3]} rows={collectionRows.map((row) => ({ Student: row.studentName, Amount: formatMoney(row.amount), Date: formatDate(row.date), Status: row.status }))} empty={state.data?.collections == null ? "Fee collection report unavailable." : "No fee collection report data available."} /></StudentCard>
        <StudentCard title="Outstanding Dues Report"><StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date"]} rows={dueRows.map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate) }))} empty={state.data?.dues == null ? "Outstanding dues report unavailable." : "No outstanding dues report data available."} /></StudentCard>
      </div>
    </> : null}
  </>;
}

export function AccountantProfile() {
  const sessionUser = useMemo(() => getAuthUser() || {}, []);
  const userId = sessionUser.userId ?? sessionUser.UserId ?? sessionUser.id;
  const load = useCallback(() => userId ? apiClient.get(apiEndpoints.auth.userById(userId)).then(unwrap) : Promise.resolve(null), [userId]);
  const profileState = useFinancePage(load);
  const user = profileState.data ? { ...sessionUser, ...profileState.data, role: profileState.data.roleName || sessionUser.role } : sessionUser;
  const name = user.fullName || user.name || "Accountant";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AC";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const firstName = user.firstName || name.split(/\s+/)[0] || "";
  const lastName = user.lastName || name.split(/\s+/).slice(1).join(" ");
  const phone = user.phoneNumber || user.mobile || user.mobileNumber || user.phone || "";
  const employeeId = user.employeeId || user.staffId || "";
  const department = user.department || user.departmentName || "";
  const designation = user.designation || user.designationName || "";
  const campus = user.campus || user.campusName || user.branch || user.branchName || "";
  const username = user.username || user.userName || user.email || "";
  const status = user.status || user.accountStatus || (user.isActive === false ? "Inactive" : user.isActive === true ? "Active Account" : "Not available");

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      await apiClient.post(apiEndpoints.auth.changePassword, { currentPassword, newPassword, confirmPassword });
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(requestError(error));
    } finally {
      setPasswordLoading(false);
    }
  };

  return <>
    <StudentPageHeader title="My Profile" subtitle="Account information for the signed-in finance user." />
    <PageState {...profileState} />
    <div className="admin-profile-container accountant-profile-container">
      <div className="admin-profile-grid">
        <div className="admin-profile-card">
          <div className="admin-profile-card-header">
            <div className="admin-profile-card-title-group">
              <span className="admin-profile-title-icon"><User size={20} /></span>
              <h2>Basic Details &amp; Profile Setup</h2>
            </div>
            <span className="admin-role-badge">{user.role || "Accountant"}</span>
          </div>

          <div className="admin-photo-section">
            <label className="admin-photo-label">Profile Photo</label>
            <div className="admin-photo-content">
              <div className="admin-avatar-wrapper">
                {user.photo || user.profilePhoto || user.avatar ? (
                  <img src={user.photo || user.profilePhoto || user.avatar} alt="Accountant Profile" className="admin-avatar-img" />
                ) : (
                  <div className="admin-avatar-placeholder accountant-avatar-initials">{initials}</div>
                )}
              </div>
              <div className="admin-photo-actions">
                <strong>{name}</strong>
                <p className="admin-photo-hint">{user.email || "Email not available"}</p>
              </div>
            </div>
          </div>

          <div className="admin-profile-form-grid">
            <ReadOnlyField label="Full Name" value={name} />
            <ReadOnlyField label="First Name" value={firstName} />
            <ReadOnlyField label="Last Name" value={lastName} />
            <ReadOnlyField label="Email Address" value={user.email} />
            <ReadOnlyField label="Contact Phone Number" value={phone} />
            <ReadOnlyField label="Employee / Staff ID" value={employeeId} />
            <ReadOnlyField label="Account User ID" value={user.userId || user.UserId || user.id} />
            <ReadOnlyField label="Department" value={department} />
            <ReadOnlyField label="Designation" value={designation} />
            <ReadOnlyField label="Campus / Branch Assignment" value={campus} />
            <ReadOnlyField label="Username" value={username} />
            <ReadOnlyField label="Assigned Role" value={user.role || "Accountant"} />
            <div className="admin-form-group">
              <label>Account Status</label>
              <div className="admin-status-box"><span className="admin-status-dot" /> {status}</div>
            </div>
          </div>
        </div>

        <div className="admin-security-card">
          <div className="admin-security-header">
            <div className="admin-security-icon-circle"><KeyRound size={18} /></div>
            <div className="admin-security-title-wrap">
              <h2>Account Security</h2>
              <p>Update your login password</p>
            </div>
          </div>

          {passwordSuccess ? <div className="admin-feedback-msg success"><CheckCircle2 size={16} /> {passwordSuccess}</div> : null}
          {passwordError ? <div className="admin-feedback-msg error"><AlertCircle size={16} /> {passwordError}</div> : null}

          <form onSubmit={handleUpdatePassword} className="admin-security-form">
            <PasswordField id="accountantCurrentPassword" label="Current Password" value={currentPassword} setValue={setCurrentPassword} visible={showCurrentPassword} setVisible={setShowCurrentPassword} />
            <PasswordField id="accountantNewPassword" label="New Password" value={newPassword} setValue={setNewPassword} visible={showNewPassword} setVisible={setShowNewPassword} placeholder="At least 6 characters" />
            <PasswordField id="accountantConfirmPassword" label="Confirm New Password" value={confirmPassword} setValue={setConfirmPassword} visible={showConfirmPassword} setVisible={setShowConfirmPassword} placeholder="Re-enter new password" />
            <button type="submit" className="admin-btn-update-password" disabled={passwordLoading}>
              <Lock size={15} />
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  </>;
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="admin-form-group">
      <label>{label}</label>
      <input className="admin-input" type="text" value={value || "Not available"} readOnly disabled />
    </div>
  );
}

function PasswordField({ id, label, value, setValue, visible, setVisible, placeholder = "••••••••" }) {
  return (
    <div className="admin-form-group">
      <label htmlFor={id}>{label}</label>
      <div className="admin-password-input-wrap">
        <input id={id} type={visible ? "text" : "password"} className="admin-input" placeholder={placeholder} value={value} onChange={(event) => setValue(event.target.value)} />
        <button type="button" className="admin-password-toggle-btn" onClick={() => setVisible((show) => !show)} title={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}
