import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, CreditCard, Eye, EyeOff, KeyRound, Lock, ReceiptIndianRupee, RefreshCw, Search, SendHorizontal, ShieldAlert, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as reportApi from "@/api/reportApi.js";
import * as payrollApi from "@/api/payrollApi.js";
import { attendanceService } from "@/api/attendanceService.js";
import { getAuthUser } from "@/features/authStorage.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import StudentSummaryCard from "@/Dashboard/StudentDashboard/components/StudentSummaryCard.jsx";
import { getStoredAccountEntries, disburseClaimPayment } from "@/services/reimbursementService.js";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import "@/components/pages/AdminProfilePage.css";

export const getRows = (payload) => {
  const value = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values", "rows", "Rows", "payments", "Payments", "dues", "Dues"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

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

export const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const normalizePayment = (item = {}) => ({
  id: getText(item, ["feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"], Math.random()),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  type: getText(item, ["paymentType", "PaymentType", "feeTypeName", "FeeTypeName", "type", "Type"], "Fee payment"),
  amount: getNumber(item, ["amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"]) || 0,
  date: getText(item, ["paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt"], ""),
  method: getText(item, ["paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method"]),
  reference: getText(item, ["referenceNumber", "ReferenceNumber", "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber"]),
  status: getText(item, ["status", "Status", "paymentStatus", "PaymentStatus"], "Paid"),
});

export const normalizeDue = (item = {}) => ({
  id: getText(item, ["feeInstallmentId", "FeeInstallmentId", "studentFeeId", "StudentFeeId", "id", "Id"], Math.random()),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  amount: getNumber(item, ["balance", "Balance", "outstandingAmount", "OutstandingAmount", "pendingAmount", "PendingAmount", "dueAmount", "DueAmount", "amount", "Amount"]) || 0,
  dueDate: getText(item, ["dueDate", "DueDate", "nextDue", "NextDue"], ""),
  status: getText(item, ["status", "Status", "feeStatus", "FeeStatus"], "Due"),
});

export const normalizePayroll = (item = {}) => ({
  id: getText(item, ["payslipId", "PayslipId", "salaryAssignmentId", "SalaryAssignmentId", "id", "Id"], Math.random()),
  staffName: getText(item, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]),
  month: getText(item, ["monthName", "MonthName", "payrollMonth", "PayrollMonth", "month", "Month"]),
  amount: getNumber(item, ["netSalary", "NetSalary", "netPay", "NetPay", "amount", "Amount", "salary", "Salary"]) || 0,
  status: getText(item, ["status", "Status", "paymentStatus", "PaymentStatus"], "Pending"),
});

function useFinancePage(loader, dependencies) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: "" });
    loader().then((data) => { if (active) setState({ data, loading: false, error: "" }); }).catch((error) => {
      if (active) setState({ data: null, loading: false, error: getApiErrorMessage(error, "Unable to load finance data.") });
    });
    return () => { active = false; };
  }, [...dependencies, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload };
}

function PageState({ loading, error, onRetry }) {
  if (loading) return <div className="sp-api-state">Loading finance data...</div>;
  if (error) return <div className="sp-api-state is-error"><AlertCircle size={15} /> {error} {onRetry ? <button type="button" className="sp-btn" onClick={onRetry}><RefreshCw size={14} /> Retry</button> : null}</div>;
  return null;
}

function useCampusParams() {
  const { selectedCampusId } = useCampusContext();
  return useMemo(() => selectedCampusId ? { campusId: Number(selectedCampusId) || selectedCampusId } : {}, [selectedCampusId]);
}

export function AccountantFees() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    const [ledger, due, dashboard] = await Promise.all([
      apiClient.get(apiEndpoints.fee.ledger, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.due, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.dashboard, { params: campusParams }),
    ]);
    return { ledger: getRows(ledger.data), due: getRows(due.data), dashboard: dashboard.data };
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const rows = (state.data?.ledger || state.data?.due || []).map(normalizeDue).filter((row) => row.amount > 0);
  return <>
    <StudentPageHeader title="Fee Management" subtitle="Review student ledgers, outstanding balances, installments, and collection status." action={<Link className="sp-btn" to="payments">Payment history</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <StudentCard title="Student Fee Ledger" subtitle={`${rows.length} outstanding records`}>
      <div className="sp-toolbar"><div className="sp-search"><Search size={15} /><input aria-label="Search fee ledger" placeholder="Search by student or admission number" onChange={(event) => { const term = event.target.value.toLowerCase(); event.currentTarget.closest(".sp-card").querySelectorAll("tbody tr").forEach((row) => { row.hidden = term && !row.textContent.toLowerCase().includes(term); }); }} /></div></div>
      <StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date", "Status"]} statusColumns={[4]} rows={rows.map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate), Status: row.status }))} empty="No outstanding fee records available." />
    </StudentCard> : null}
  </>;
}

export function AccountantPayments() {
  const campusParams = useCampusParams();
  const [activeTab, setActiveTab] = useState("reimbursements"); // "reimbursements" | "fees"
  const [search, setSearch] = useState("");
  const [reimbFilter, setReimbFilter] = useState("all");
  const [disburseModal, setDisburseModal] = useState(null);
  const [disburseForm, setDisburseForm] = useState({ paymentMode: "Bank Transfer", paymentRef: "", remarks: "" });
  const [disburseLoading, setDisburseLoading] = useState(false);
  const [disburseSuccess, setDisburseSuccess] = useState("");

  const [accountEntries, setAccountEntries] = useState(() => getStoredAccountEntries());

  const refreshAccountEntries = useCallback(() => {
    setAccountEntries(getStoredAccountEntries());
  }, []);

  useEffect(() => {
    window.addEventListener("cms-account-updated", refreshAccountEntries);
    window.addEventListener("cms-reimbursements-updated", refreshAccountEntries);
    return () => {
      window.removeEventListener("cms-account-updated", refreshAccountEntries);
      window.removeEventListener("cms-reimbursements-updated", refreshAccountEntries);
    };
  }, [refreshAccountEntries]);

  const load = useCallback(async () => {
    const [collection, payments] = await Promise.allSettled([
      apiClient.get(apiEndpoints.fee.collection, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.payments, { params: campusParams }),
    ]);
    const rows = [
      ...(collection.status === "fulfilled" ? getRows(collection.value.data) : []),
      ...(payments.status === "fulfilled" ? getRows(payments.value.data) : []),
    ];
    if (!rows.length && collection.status === "rejected" && payments.status === "rejected") throw collection.reason;
    return rows.map(normalizePayment).filter((row, index, list) => list.findIndex((item) => String(item.id) === String(row.id)) === index).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const feeRows = (state.data || []).filter((row) => !search || `${row.studentName} ${row.admissionNo} ${row.reference}`.toLowerCase().includes(search.toLowerCase()));

  const filteredReimbEntries = useMemo(() => {
    return accountEntries.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        item.voucherId.toLowerCase().includes(q) ||
        item.claimId.toLowerCase().includes(q) ||
        item.facultyName.toLowerCase().includes(q) ||
        item.facultyId.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchStatus = reimbFilter === "all" ||
        (reimbFilter === "pending" && item.paymentStatus.includes("Awaiting")) ||
        (reimbFilter === "paid" && item.paymentStatus.includes("Paid"));
      return matchSearch && matchStatus;
    });
  }, [accountEntries, search, reimbFilter]);

  const totalReimbAmount = useMemo(() => {
    return accountEntries.reduce((sum, item) => sum + (Number(item.approvedAmount) || 0), 0);
  }, [accountEntries]);

  const pendingReimbCount = useMemo(() => {
    return accountEntries.filter((e) => e.paymentStatus.includes("Awaiting")).length;
  }, [accountEntries]);

  const paidReimbCount = useMemo(() => {
    return accountEntries.filter((e) => e.paymentStatus.includes("Paid")).length;
  }, [accountEntries]);

  const handleDisburseConfirm = async (e) => {
    e.preventDefault();
    if (!disburseModal) return;
    setDisburseLoading(true);
    try {
      const generatedRef = disburseForm.paymentRef.trim() || `UTR-${Date.now().toString().slice(-8)}`;
      await disburseClaimPayment(disburseModal.claimId, {
        disbursedBy: "Accounts Department",
        paymentMode: disburseForm.paymentMode,
        paymentRef: generatedRef,
        remarks: disburseForm.remarks,
      });
      refreshAccountEntries();
      setDisburseSuccess(`Payment of ₹${Number(disburseModal.approvedAmount).toLocaleString("en-IN")} disbursed for ${disburseModal.facultyName} (${disburseModal.claimId}). Reference: ${generatedRef}`);
      setDisburseModal(null);
      setDisburseForm({ paymentMode: "Bank Transfer", paymentRef: "", remarks: "" });
      setTimeout(() => setDisburseSuccess(""), 5000);
    } catch (err) {
      alert(err.message || "Failed to disburse payment.");
    } finally {
      setDisburseLoading(false);
    }
  };

  return (
    <>
      <StudentPageHeader
        title="Payment & Payable History"
        subtitle="Manage student fee transactions, faculty reimbursement payables, and bank disbursements."
        action={
          <div className="sp-actions" style={{ display: "flex", gap: "8px" }}>
            <Link className="sp-btn" to="fees">Fee ledger</Link>
            <Link className="sp-btn primary" to="/accountant-dashboard/reimbursement">
              <img src={reimbursementIcon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> Reimbursement Portal
            </Link>
          </div>
        }
      />

      {disburseSuccess ? (
        <div className="sp-api-state" style={{ background: "#f0fdf4", borderColor: "#86efac", color: "#166534", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
          <CheckCircle2 size={16} />
          <span>{disburseSuccess}</span>
        </div>
      ) : null}

      <section className="sp-summary-grid four" style={{ marginBottom: "16px" }}>
        <StudentSummaryCard
          icon={adminIconAssets.feeManagement}
          label="Fee Transactions"
          value={feeRows.length}
          note="From collection records"
        />
        <StudentSummaryCard
          icon={adminIconAssets.payroll}
          label="Approved Payables"
          value={formatMoney(totalReimbAmount)}
          note={`${accountEntries.length} total approved claims`}
          tone="purple"
        />
        <StudentSummaryCard
          icon={adminIconAssets.attendanceImpact}
          label="Awaiting Payout"
          value={pendingReimbCount}
          note="Pending account disbursement"
          tone="orange"
        />
        <StudentSummaryCard
          icon={adminIconAssets.paymentHistory}
          label="Disbursed & Paid"
          value={paidReimbCount}
          note="Successfully paid"
          tone="blue"
        />
      </section>

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", borderBottom: "1px solid var(--sp-border)", paddingBottom: "8px" }}>
        <button
          type="button"
          className={`sp-btn ${activeTab === "reimbursements" ? "primary" : ""}`}
          onClick={() => setActiveTab("reimbursements")}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <img src={reimbursementIcon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
          <span>Faculty Reimbursement Payables ({accountEntries.length})</span>
        </button>
        <button
          type="button"
          className={`sp-btn ${activeTab === "fees" ? "primary" : ""}`}
          onClick={() => setActiveTab("fees")}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>Student Fee Transactions ({feeRows.length})</span>
        </button>
      </div>

      {activeTab === "reimbursements" ? (
        <StudentCard
          title="Faculty Reimbursement Accounts Payable"
          subtitle="Integrated with Reimbursement approval workflow. Approved claims automatically become payable records here."
        >
          <div className="sp-toolbar" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
            <div className="sp-search" style={{ flex: "1 1 240px" }}>
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search voucher, claim ID, faculty name, or category"
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {["all", "pending", "paid"].map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  className={`sp-btn ${reimbFilter === statusKey ? "primary" : ""}`}
                  style={{ minHeight: "32px", padding: "4px 10px", fontSize: "11px" }}
                  onClick={() => setReimbFilter(statusKey)}
                >
                  {statusKey === "all" ? "All Entries" : statusKey === "pending" ? "Awaiting Payout" : "Disbursed"}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Voucher ID</th>
                  <th>Claim ID</th>
                  <th>Faculty</th>
                  <th>Department</th>
                  <th>Category</th>
                  <th>Approved Amount</th>
                  <th>Approval Date</th>
                  <th>Accounting Status</th>
                  <th>Reference / UTR</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReimbEntries.length > 0 ? (
                  filteredReimbEntries.map((entry) => {
                    const isAwaiting = entry.paymentStatus.includes("Awaiting");
                    return (
                      <tr key={entry.voucherId}>
                        <td style={{ fontWeight: 650, color: "var(--sp-primary-dark)" }}>{entry.voucherId}</td>
                        <td style={{ fontWeight: 600 }}>{entry.claimId}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{entry.facultyName}</div>
                          <div style={{ fontSize: "11px", color: "var(--sp-muted)" }}>{entry.facultyId}</div>
                        </td>
                        <td>{entry.department}</td>
                        <td>{entry.category}</td>
                        <td style={{ fontWeight: 700, color: "#15803d" }}>₹{Number(entry.approvedAmount).toLocaleString("en-IN")}</td>
                        <td>{entry.approvalDate}</td>
                        <td>
                          <span className={`sp-badge ${isAwaiting ? "is-warning" : "is-success"}`}>
                            {entry.paymentStatus}
                          </span>
                        </td>
                        <td style={{ fontSize: "11px", fontFamily: "monospace" }}>
                          {entry.paymentRef || "—"}
                        </td>
                        <td>
                          {isAwaiting ? (
                            <button
                              type="button"
                              className="sp-btn primary"
                              style={{ minHeight: "30px", padding: "3px 10px", fontSize: "11px" }}
                              onClick={() => {
                                setDisburseModal(entry);
                                setDisburseForm({
                                  paymentMode: entry.paymentMode || "Bank Transfer",
                                  paymentRef: `UTR-${Date.now().toString().slice(-8)}`,
                                  remarks: `Disbursed for ${entry.claimId}`,
                                });
                              }}
                            >
                              Disburse Payment
                            </button>
                          ) : (
                            <span style={{ color: "#166534", fontSize: "11px", fontWeight: 600 }}>
                              ✓ Disbursed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10}>
                      <div className="sp-empty" style={{ padding: "24px", textAlign: "center", color: "var(--sp-muted)" }}>
                        No reimbursement payable entries match the criteria.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </StudentCard>
      ) : (
        <>
          <PageState {...state} />
          {!state.loading && !state.error ? (
            <StudentCard title="Fee Transactions" subtitle={`${feeRows.length} transactions`}>
              <div className="sp-toolbar">
                <div className="sp-search">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student, admission number, or reference"
                  />
                </div>
              </div>
              <StudentDataTable
                columns={["Student", "Admission No", "Type", "Amount", "Date", "Method", "Reference", "Status"]}
                statusColumns={[7]}
                rows={feeRows.map((row) => ({
                  Student: row.studentName,
                  "Admission No": row.admissionNo,
                  Type: row.type,
                  Amount: formatMoney(row.amount),
                  Date: formatDate(row.date),
                  Method: row.method,
                  Reference: row.reference,
                  Status: row.status,
                }))}
                empty="No payment transactions available."
              />
            </StudentCard>
          ) : null}
        </>
      )}

      {/* Disburse Payment Modal Dialog */}
      {disburseModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 45px rgba(0,0,0,0.2)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  Disburse Reimbursement Payment
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  {disburseModal.voucherId} • {disburseModal.claimId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisburseModal(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDisburseConfirm} style={{ padding: "20px 24px" }}>
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Payee:</span>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{disburseModal.facultyName} ({disburseModal.facultyId})</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Department / Purpose:</span>
                  <span style={{ fontSize: "12px", color: "#334155" }}>{disburseModal.department} • {disburseModal.category}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Approved Amount:</span>
                  <strong style={{ fontSize: "16px", color: "#166534" }}>₹{Number(disburseModal.approvedAmount).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Payment Mode
                  </label>
                  <select
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    value={disburseForm.paymentMode}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentMode: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Transaction Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    placeholder="e.g. UTR-98234821 or Cheque #4928"
                    value={disburseForm.paymentRef}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentRef: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Accounting Remarks
                  </label>
                  <input
                    type="text"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    placeholder="e.g. Cleared via Main Institutional Account"
                    value={disburseForm.remarks}
                    onChange={(e) => setDisburseForm({ ...disburseForm, remarks: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="sp-btn"
                  onClick={() => setDisburseModal(null)}
                  disabled={disburseLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sp-btn primary"
                  disabled={disburseLoading}
                >
                  {disburseLoading ? "Recording Payout..." : "Confirm & Disburse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

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
    <StudentPageHeader title="Payroll" subtitle="Financial payroll visibility for salary amounts, payslips, and processing status." action={<Link className="sp-btn" to="attendance-impact"><CalendarCheck size={15} /> Attendance impact</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(total)} note="Current payroll summary" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payslips" value={state.data?.payslips?.length || 0} note="Available records" tone="blue" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Processed" value={getNumber(summary, ["processedCount", "ProcessedCount"]) ?? "-"} note="From payroll API" tone="purple" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Pending" value={getNumber(summary, ["pendingCount", "PendingCount"]) ?? "-"} note="From payroll API" tone="orange" />
      </section>
      <StudentCard title="Payroll Records" subtitle="Read-only payroll information">
        <StudentDataTable columns={["Staff Member", "Month", "Net Amount", "Status"]} statusColumns={[3]} rows={(state.data?.payslips || []).map((row) => ({ "Staff Member": row.staffName, Month: row.month, "Net Amount": formatMoney(row.amount), Status: row.status }))} empty="No payroll records available." />
      </StudentCard>
    </> : null}
  </>;
}

export function AccountantAttendanceImpact() {
  const campusParams = useCampusParams();
  const load = useCallback(() => attendanceService.getStaffMonthlyReport({ ...campusParams, month: new Date().getMonth() + 1, year: new Date().getFullYear() }).then((data) => getRows(data)), [campusParams]);
  const state = useFinancePage(load, [load]);
  const rows = state.data || [];
  return <>
    <StudentPageHeader title="Attendance Impact" subtitle="Review staff attendance figures that may affect payroll calculations." action={<Link className="sp-btn" to="payroll"><span className="accountant-btn-generated-icon" style={{ backgroundImage: `url(${adminIconAssets.payroll.src})`, backgroundPosition: adminIconAssets.payroll.position }} aria-hidden="true" /> Payroll</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <StudentCard title="Monthly Attendance Impact" subtitle="The backend determines the available attendance and deduction fields.">
      <StudentDataTable columns={["Staff Member", "Present Days", "Absent Days", "Leave", "Deduction", "Payroll Impact"]} rows={rows.map((row) => ({ "Staff Member": getText(row, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]), "Present Days": getNumber(row, ["presentDays", "PresentDays", "present", "Present"]) ?? "-", "Absent Days": getNumber(row, ["absentDays", "AbsentDays", "absent", "Absent"]) ?? "-", Leave: getNumber(row, ["leaveDays", "LeaveDays", "leave", "Leave"]) ?? "-", Deduction: formatMoney(getNumber(row, ["deduction", "Deduction", "deductionAmount", "DeductionAmount"]) || 0), "Payroll Impact": formatMoney(getNumber(row, ["payrollImpact", "PayrollImpact", "impactAmount", "ImpactAmount"]) || 0) }))} empty="No attendance impact records available." />
    </StudentCard> : null}
  </>;
}

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
    <StudentPageHeader title="Financial Reports" subtitle="Financial collection, outstanding dues, transaction, and payroll reporting." />
    <PageState {...state} />
    {!state.loading && !state.error ? <>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collection Rows" value={collectionRows.length} note="Report detail records" />
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Outstanding Rows" value={dueRows.length} note="Report detail records" tone="orange" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(getNumber(state.data?.payroll, ["totalPayroll", "TotalPayroll", "totalNetSalary", "TotalNetSalary"]) || 0)} note="Current payroll API" tone="purple" />
        <StudentSummaryCard icon={adminIconAssets.financialReports} label="Report Metrics" value={Object.keys(report || {}).length} note="Available dashboard fields" tone="blue" />
      </section>
      <div className="sp-grid-2">
        <StudentCard title="Fee Collection Report"><StudentDataTable columns={["Student", "Amount", "Date", "Status"]} statusColumns={[3]} rows={collectionRows.slice(0, 10).map((row) => ({ Student: row.studentName, Amount: formatMoney(row.amount), Date: formatDate(row.date), Status: row.status }))} empty="No fee collection report data available." /></StudentCard>
        <StudentCard title="Outstanding Dues Report"><StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date"]} rows={dueRows.slice(0, 10).map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate) }))} empty="No outstanding dues report data available." /></StudentCard>
      </div>
    </> : null}
  </>;
}

export function AccountantProfile() {
  const user = getAuthUser() || {};
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
  const employeeId = user.employeeId || user.staffId || user.userId || user.id || "";
  const department = user.department || user.departmentName || "Finance";
  const designation = user.designation || user.designationName || user.role || "Accountant";
  const campus = user.campus || user.campusName || user.branch || user.branchName || "";
  const username = user.username || user.userName || user.email || "";
  const status = user.status || user.accountStatus || (user.isActive === false ? "Inactive" : "Active Account");

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
      setPasswordError(error?.response?.data?.message || error?.response?.data?.title || error.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return <>
    <StudentPageHeader title="My Profile" subtitle="Account information for the signed-in finance user." />
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
