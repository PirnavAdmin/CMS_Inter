import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import StudentSummaryCard from "@/Dashboard/StudentDashboard/components/StudentSummaryCard.jsx";
import { fetchClaims, fetchAccountEntries, disburseClaimPayment } from "../services/accountantService.js";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import "@/components/pages/AdminProfilePage.css";

import { getRows, formatMoney, formatDate, normalizePayment, useAccountantPage as useFinancePage, useCampusParams } from "../services/accountantService.js";
import { PageState } from "../components/AccountantUI.jsx";

export function AccountantPayments() {
  const campusParams = useCampusParams();
  const [activeTab, setActiveTab] = useState("reimbursements"); // "reimbursements" | "fees"
  const [search, setSearch] = useState("");
  const [reimbFilter, setReimbFilter] = useState("all");
  const [disburseModal, setDisburseModal] = useState(null);
  const [disburseForm, setDisburseForm] = useState({ paymentMode: "Bank Transfer", paymentRef: "", remarks: "" });
  const [disburseLoading, setDisburseLoading] = useState(false);
  const [disburseSuccess, setDisburseSuccess] = useState("");

  const [accountEntries, setAccountEntries] = useState([]);

  const refreshAccountEntries = useCallback(async () => {
    try {
      let payables = await fetchAccountEntries();
      if (!payables || payables.length === 0) {
        const claims = await fetchClaims();
        payables = (claims || [])
          .filter((c) => c.status === "Approved" || c.status === "Paid" || c.accountReferenceId)
          .map((c) => ({
            voucherId: c.accountReferenceId || `ACC-PAY-${c.claimId}`,
            claimId: c.claimId,
            facultyName: c.facultyName,
            facultyId: c.facultyId,
            department: c.department,
            category: c.category,
            approvedAmount: c.approvedAmount || c.amount,
            approvalDate: c.approvedDate || c.date || "—",
            paymentStatus: c.status === "Paid" ? "Paid / Disbursed" : "Payable (Awaiting Disbursement)",
            disbursedDate: c.disbursedDate,
            paymentRef: c.paymentReference,
            paymentMode: c.paymentMode,
          }));
      }
      setAccountEntries(payables);
    } catch (err) {
      console.warn("Could not fetch account payables from API:", err);
    }
  }, []);

  useEffect(() => {
    refreshAccountEntries();
  }, [refreshAccountEntries]);

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

            <Link className="sp-btn" to="/accountant-dashboard/fees?tab=ledger">Fee ledger</Link>
            <Link className="sp-btn primary" to="/accountant-dashboard/reimbursements">
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
