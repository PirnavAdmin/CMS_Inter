import { useState } from "react";
import { Wallet, CreditCard, CheckCircle2, Download, Printer, Users, Eye, AlertCircle, Clock } from "lucide-react";
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
    childFee: contextChildFee,
    dataKey,
    currentAcademicYear,
    loading,
  } = useParentPortal();
  const [feeRecords, setFeeRecords] = useState(getStoredFeeRecords());
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const isCurrentYear = currentAcademicYear === "2026-2027";
  const feeKey = dataKey || child?.id;
  const rawChildFee = contextChildFee && contextChildFee.total !== undefined
    ? contextChildFee
    : (child
        ? (feeRecords[feeKey] || (isCurrentYear ? feeRecords[child.id] || child.fees : null)) || {
            total: 0,
            paid: 0,
            pending: 0,
            status: "—",
            dueDate: "—",
            breakdown: [],
            receipts: [],
          }
        : { total: 0, paid: 0, pending: 0, status: "—", dueDate: "—", breakdown: [], receipts: [] });

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

  if (loading && !child) {
    return (
      <DashboardLayout
        title="Fees & Payments"
        subtitle="Loading fee ledger and installment status..."
        breadcrumb={["Parent Portal", "Fees & Payments"]}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <Wallet size={48} style={{ color: "var(--cms-primary)", margin: "0 auto 16px" }} />
            <h3>Loading Fee Account Details...</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              Connecting to campus finance ledger to retrieve pending fees and breakdown.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
              <div className="parent-stat-value">₹{(childFee?.total || 0).toLocaleString()}</div>
              <div className="parent-stat-subtext">Academic Year {child?.academicYear || "2026-2027"}</div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap green">
              <CheckCircle2 size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Paid Fees</div>
              <div className="parent-stat-value" style={{ color: "var(--cms-green)" }}>₹{(childFee?.paid || 0).toLocaleString()}</div>
              <div className="parent-stat-subtext">Status: <strong>{childFee?.status || "—"}</strong></div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap" style={{ background: (childFee?.pending || 0) > 0 ? "var(--cms-red-soft)" : "var(--cms-green-soft)", color: (childFee?.pending || 0) > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>
              <Clock size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Pending Balance</div>
              <div className="parent-stat-value" style={{ color: (childFee?.pending || 0) > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>
                ₹{(childFee?.pending || 0).toLocaleString()}
              </div>
              <div className="parent-stat-subtext">{(childFee?.pending || 0) > 0 ? `Due: ${childFee?.dueDate || "—"}` : "All Dues Cleared"}</div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap" style={{ background: "var(--cms-primary-soft)", color: "var(--cms-primary-dark)" }}>
              <CreditCard size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Fee Status</div>
              <div className="parent-stat-value" style={{ fontSize: 18 }}>
                {childFee?.status || "—"}
              </div>
              <div className="parent-stat-subtext" style={{ color: "var(--cms-primary-dark)" }}>
                {childFee.receipts?.length || 0} Receipt{(childFee.receipts?.length || 0) !== 1 ? "s" : ""} on Record
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
