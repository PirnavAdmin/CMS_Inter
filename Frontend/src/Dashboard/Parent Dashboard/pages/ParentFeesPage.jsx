import { useState } from "react";
import { Wallet, CreditCard, CheckCircle2, Download, Printer, Users, Eye, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, getStoredFeeRecords, saveStoredFeeRecords } from "../parentData.js";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentFeesPage() {
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    dataKey,
    currentAcademicYear,
  } = useParentPortal();
  const [feeRecords, setFeeRecords] = useState(getStoredFeeRecords());
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payBusy, setPayBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const isCurrentYear = currentAcademicYear === "2026-2027";
  const feeKey = dataKey || child?.id;
  const rawChildFee = child
    ? (feeRecords[feeKey] || (isCurrentYear ? feeRecords[child.id] || child.fees : null)) || {
        total: 0,
        paid: 0,
        pending: 0,
        status: "—",
        dueDate: "—",
        breakdown: [],
        receipts: [],
      }
    : { total: 0, paid: 0, pending: 0, status: "—", dueDate: "—", breakdown: [], receipts: [] };

  const breakdownTotal = (rawChildFee.breakdown || []).reduce((acc, b) => acc + (b.amount || 0), 0);
  const breakdownPaid = (rawChildFee.breakdown || []).reduce((acc, b) => acc + (b.paid || 0), 0);
  const breakdownPending = (rawChildFee.breakdown || []).reduce((acc, b) => acc + (b.pending || 0), 0);

  const childFee = {
    ...rawChildFee,
    total: breakdownTotal > 0 ? breakdownTotal : rawChildFee.total,
    paid: breakdownTotal > 0 ? breakdownPaid : rawChildFee.paid,
    pending: breakdownTotal > 0 ? breakdownPending : rawChildFee.pending,
    status: breakdownTotal > 0 ? (breakdownPending === 0 ? "Paid" : breakdownPaid > 0 ? "Partial" : "Due") : rawChildFee.status,
  };

  const handleSelectChild = (id) => {
    setActiveChildId(id);
    setSelectedReceipt(null);
  };

  const handleOpenPayModal = () => {
    setPayAmount(String(childFee.pending || "5000"));
    setPayModalOpen(true);
  };

  const handleExecutePayment = (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || amount > childFee.pending) {
      alert("Please enter a valid payment amount up to the pending fee balance.");
      return;
    }

    setPayBusy(true);
    setTimeout(() => {
      let remaining = amount;
      const updatedBreakdown = (childFee.breakdown || []).map((item) => {
        if (remaining <= 0 || (item.pending || 0) <= 0) return item;
        const alloc = Math.min(item.pending, remaining);
        remaining -= alloc;
        const newPaid = item.paid + alloc;
        const newPending = item.pending - alloc;
        return {
          ...item,
          paid: newPaid,
          pending: newPending,
          status: newPending === 0 ? "Paid" : "Partial",
        };
      });

      const newPaid = updatedBreakdown.length > 0
        ? updatedBreakdown.reduce((sum, b) => sum + b.paid, 0)
        : childFee.paid + amount;
      const newPending = updatedBreakdown.length > 0
        ? updatedBreakdown.reduce((sum, b) => sum + b.pending, 0)
        : Math.max(0, childFee.pending - amount);
      const newStatus = newPending === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Due";

      const newReceipt = {
        id: `rec-${Date.now()}`,
        receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        amount,
        method: payMethod,
        txnId: `TXN${Date.now()}`,
        paidFor: `Term Installment Payment (${child?.programme || ""})`,
        status: "Success",
      };

      const targetKey = dataKey || child?.id;
      const updated = {
        ...feeRecords,
        [targetKey]: {
          ...childFee,
          total: childFee.total,
          paid: newPaid,
          pending: newPending,
          status: newStatus,
          breakdown: updatedBreakdown,
          receipts: [newReceipt, ...(childFee.receipts || [])],
        },
      };

      setFeeRecords(updated);
      saveStoredFeeRecords(updated);
      setPayBusy(false);
      setPayModalOpen(false);
      setToastMessage(`Payment of ₹${amount.toLocaleString()} completed successfully! Receipt generated.`);
    }, 1000);
  };

  if (availableChildren.length === 0 || !child) {
    return (
      <DashboardLayout
        title="Fees & Payments"
        subtitle="Fee ledger and installment status"
        breadcrumb={["Parent Portal", "Fees & Payments"]}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <Users size={48} style={{ color: "var(--cms-muted)", margin: "0 auto 16px" }} />
            <h3>No Children Associated</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              No enrolled student records were found linked to your parent account.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Fees & Payments"
      subtitle={`Fee ledger, installment status, and receipts • ${child.name} (${child.group})`}
      breadcrumb={["Parent Portal", "Fees & Payments"]}
    >
      <div className="parent-dashboard-wrapper">
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Child Switcher */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>{child.name} ({child.programme})</h2>
              <p>Fee Account • Admission No: {child.admissionNo} • Level: {child.level}</p>
            </div>
          </div>
          <div className="parent-child-switch-buttons">
            {availableChildren.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`parent-child-switch-btn ${child.id === c.id ? "is-active" : ""}`}
                onClick={() => handleSelectChild(c.id)}
              >
                <Users size={14} /> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Fee Stat Cards */}
        <div className="parent-stat-grid">
          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap">
              <Wallet size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Total Annual Fee</div>
              <div className="parent-stat-value">₹{childFee.total.toLocaleString()}</div>
              <div className="parent-stat-subtext">Academic Year {child?.academicYear || "2026-2027"}</div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap green">
              <CheckCircle2 size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Paid Fees</div>
              <div className="parent-stat-value" style={{ color: "var(--cms-green)" }}>₹{childFee.paid.toLocaleString()}</div>
              <div className="parent-stat-subtext">Status: <strong>{childFee.status}</strong></div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap" style={{ background: childFee.pending > 0 ? "var(--cms-red-soft)" : "var(--cms-green-soft)", color: childFee.pending > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>
              <Clock size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Pending Balance</div>
              <div className="parent-stat-value" style={{ color: childFee.pending > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>
                ₹{childFee.pending.toLocaleString()}
              </div>
              <div className="parent-stat-subtext">{childFee.pending > 0 ? `Due: ${childFee.dueDate}` : "All Dues Cleared"}</div>
            </div>
          </div>

          <div className="parent-stat-card" style={{ cursor: childFee.pending > 0 ? "pointer" : "default" }} onClick={childFee.pending > 0 ? handleOpenPayModal : undefined}>
            <div className="parent-stat-icon-wrap" style={{ background: "var(--cms-primary-soft)", color: "var(--cms-primary-dark)" }}>
              <CreditCard size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Quick Action</div>
              <div className="parent-stat-value" style={{ fontSize: 18 }}>
                {childFee.pending > 0 ? "Pay Now" : "Receipts"}
              </div>
              <div className="parent-stat-subtext" style={{ color: "var(--cms-primary-dark)" }}>
                {childFee.pending > 0 ? "Secure Instant Payment" : "All cleared"}
              </div>
            </div>
          </div>
        </div>

        {/* Fee Category Breakdown */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Wallet size={18} /> Fee Structure & Component Breakdown
            </h3>
            {childFee.pending > 0 && (
              <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={handleOpenPayModal}>
                <CreditCard size={14} /> Pay Pending Balance (₹{childFee.pending.toLocaleString()})
              </button>
            )}
          </div>
          <div className="parent-card-body" style={{ padding: 0 }}>
            <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
              <table className="parent-timetable-table">
                <thead>
                  <tr>
                    <th>Fee Category</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Pending Balance</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(childFee.breakdown || []).length > 0 ? (
                    (childFee.breakdown || []).map((b, idx) => (
                      <tr key={idx}>
                        <td><strong>{b.category}</strong></td>
                        <td>₹{b.amount.toLocaleString()}</td>
                        <td style={{ color: "var(--cms-green)", fontWeight: 600 }}>₹{b.paid.toLocaleString()}</td>
                        <td style={{ color: b.pending > 0 ? "var(--cms-red)" : "inherit", fontWeight: 600 }}>
                          ₹{b.pending.toLocaleString()}
                        </td>
                        <td>{b.due}</td>
                        <td>
                          <span className={`cms-badge ${b.status === "Paid" ? "cms-badge-active" : b.status === "Partial" ? "cms-badge-warn" : "cms-badge-danger"}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                        No fee breakdown records found for Academic Year {currentAcademicYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment History & Receipts */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <CheckCircle2 size={18} /> Payment History & Official Receipts
            </h3>
            <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Total Payments: {childFee.receipts?.length || 0}</span>
          </div>
          <div className="parent-card-body" style={{ padding: 0 }}>
            <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
              <table className="parent-timetable-table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Payment Date</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Transaction Ref</th>
                    <th>Purpose / Narration</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(childFee.receipts || []).length > 0 ? (
                    (childFee.receipts || []).map((rec) => (
                      <tr key={rec.id}>
                        <td><strong>{rec.receiptNo}</strong></td>
                        <td>{rec.date}</td>
                        <td style={{ fontWeight: 700, color: "var(--cms-green)" }}>₹{rec.amount.toLocaleString()}</td>
                        <td>{rec.method}</td>
                        <td style={{ fontSize: 12, color: "var(--cms-muted)" }}>{rec.txnId}</td>
                        <td>{rec.paidFor}</td>
                        <td>
                          <button
                            type="button"
                            className="cms-btn cms-btn-sm cms-btn-outline"
                            onClick={() => setSelectedReceipt(rec)}
                          >
                            <Eye size={13} /> View Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                        No payment receipts recorded for Academic Year {currentAcademicYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pay Now Interactive Modal */}
        {payModalOpen && (
          <Modal
            title="Make Fee Payment"
            onClose={() => !payBusy && setPayModalOpen(false)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setPayModalOpen(false)} disabled={payBusy}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleExecutePayment} disabled={payBusy}>
                  {payBusy ? "Processing Payment..." : `Confirm & Pay ₹${Number(payAmount || 0).toLocaleString()}`}
                </button>
              </>
            }
          >
            <form onSubmit={handleExecutePayment} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: 14, background: "var(--cms-bg)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Student Name:</span>
                  <strong>{child.name}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Admission Number:</span>
                  <strong>{child.admissionNo}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total Pending Balance:</span>
                  <strong style={{ color: "var(--cms-red)" }}>₹{childFee.pending.toLocaleString()}</strong>
                </div>
              </div>

              <div>
                <label className="cms-label" htmlFor="pay-amount">Amount to Pay (₹)</label>
                <input
                  id="pay-amount"
                  type="number"
                  className="cms-input"
                  min={500}
                  max={childFee.pending}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label">Payment Method</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {["UPI", "Net Banking", "Debit/Credit Card"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`cms-btn ${payMethod === m ? "cms-btn-primary" : "cms-btn-outline"}`}
                      style={{ fontSize: 13, padding: "10px 8px", textAlign: "center" }}
                      onClick={() => setPayMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--cms-muted)" }}>
                <ShieldCheck size={16} color="var(--cms-green)" />
                256-Bit Encrypted Payment Gateway • Instant Receipt Generation
              </div>
            </form>
          </Modal>
        )}

        {/* Printable Official Receipt Modal */}
        {selectedReceipt && (
          <Modal
            title={`Fee Payment Receipt — ${selectedReceipt.receiptNo}`}
            onClose={() => setSelectedReceipt(null)}
            size="lg"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setSelectedReceipt(null)}>Close</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => window.print()}>
                  <Printer size={15} /> Print Receipt
                </button>
              </>
            }
          >
            <div className="parent-receipt-sheet">
              <div className="parent-receipt-header">
                <h2>PIRNAV JUNIOR COLLEGE</h2>
                <p>Campus Road, Jubilee Hills, Hyderabad - 500033</p>
                <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>OFFICIAL FEE PAYMENT RECEIPT</strong>
              </div>

              <div className="parent-profile-meta-grid" style={{ marginBottom: 16 }}>
                <div className="parent-meta-item"><span>Receipt No:</span> <strong>{selectedReceipt.receiptNo}</strong></div>
                <div className="parent-meta-item"><span>Date of Payment:</span> <strong>{selectedReceipt.date}</strong></div>
                <div className="parent-meta-item"><span>Student Name:</span> <strong>{child.name}</strong></div>
                <div className="parent-meta-item"><span>Admission No:</span> <strong>{child.admissionNo}</strong></div>
                <div className="parent-meta-item"><span>Course & Group:</span> <strong>{child.programme}</strong></div>
                <div className="parent-meta-item"><span>Payment Mode:</span> <strong>{selectedReceipt.method}</strong></div>
              </div>

              <table className="parent-receipt-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Transaction Reference</th>
                    <th>Amount Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedReceipt.paidFor}</td>
                    <td>{selectedReceipt.txnId}</td>
                    <td style={{ fontWeight: 700 }}>₹{selectedReceipt.amount.toLocaleString()}</td>
                    <td>
                      <span className="cms-badge cms-badge-active">Success</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30, paddingTop: 16, borderTop: "1px solid #cbd5e1" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>This is a computer-generated fee receipt.</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Valid for Income Tax deduction under section 80C.</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Accounts Officer / Cashier</div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
