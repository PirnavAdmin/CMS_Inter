import { SkeletonPage } from "@/shared/components/Skeleton.jsx";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Wallet, CreditCard, CheckCircle2, Download, Printer, Users, Eye, AlertCircle, Clock } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useParentPortal } from "../context/ParentPortalContext.jsx";
import { Modal, Toast } from "@/shared/components/Ui.jsx";
import ParentPayFeeScreen from "./ParentPayFeeScreen.jsx";
import ParentCollectPaymentModal from "../components/ParentCollectPaymentModal.jsx";
import { printReceiptElement } from "../utils/printReceipt.js";
import "../ParentDashboard.css";

export default function ParentFeesPage({ initialView }) {
  const {
    availableChildren: rawChildren,
    activeChildId,
    setActiveChildId,
    child,
    childFee: contextChildFee,
    dataKey,
    currentAcademicYear,
    loading,
    refreshActiveChild,
  } = useParentPortal();
  const availableChildren = (rawChildren || []).filter((c) => String(c.id || c.studentId) !== "6" && !/sneha/i.test(c.name || ""));
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);

  const isPayView = initialView === "pay" || searchParams.get("view") === "pay";

  const handleOpenPayFee = () => {
    setIsCollectPaymentOpen(true);
  };

  const handleClosePayFee = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("view");
      return next;
    });
  };

  const handleOpenReceipt = (rec) => {
    setSelectedReceipt(rec);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("receiptId", String(rec.id || rec.receiptNo));
      return next;
    });
  };

  const handleCloseReceipt = () => {
    setSelectedReceipt(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("receiptId");
      return next;
    });
  };
  const [toastMessage, setToastMessage] = useState("");

  const rawChildFee = contextChildFee && contextChildFee.total !== undefined
    ? contextChildFee
    : (child?.fees || {
        total: 0,
        paid: 0,
        pending: 0,
        status: "—",
        dueDate: "—",
        breakdown: [],
        receipts: [],
      });

  const receiptsList = rawChildFee.receipts || [];
  const approvedReceiptsTotal = receiptsList
    .filter((r) => !/reject|fail|cancel|pending/i.test(r.status || ""))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const paidAmount = Math.max(Number(rawChildFee.paid || 0), approvedReceiptsTotal);
  const totalAmount = Math.max(Number(rawChildFee.total || 0), paidAmount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);
  const feeStatus = pendingAmount === 0 && totalAmount > 0 ? "Paid" : paidAmount > 0 ? "Partial" : (totalAmount > 0 ? "Due" : "—");
  const dueDateStr = pendingAmount === 0 ? "All Dues Cleared" : (rawChildFee.dueDate || "—");

  let remPaid = paidAmount;
  const rawBreakdownItems = (rawChildFee.breakdown && rawChildFee.breakdown.length > 0)
    ? rawChildFee.breakdown
    : [];

  const reconciledBreakdown = rawBreakdownItems.map((b) => {
    const bAmt = Number(b.amount || 0);
    const bPaid = Math.min(bAmt, remPaid);
    remPaid = Math.max(0, remPaid - bPaid);
    const bPending = Math.max(0, bAmt - bPaid);
    const bStatus = bPending === 0 && bAmt > 0 ? "Paid" : bPaid > 0 ? "Partial" : "Due";
    return {
      ...b,
      category: b.category || b.feeType || "Fee Component",
      amount: bAmt,
      paid: bPaid,
      pending: bPending,
      due: dueDateStr,
      status: bStatus,
    };
  });

  const childFee = {
    ...rawChildFee,
    total: totalAmount,
    paid: paidAmount,
    pending: pendingAmount,
    status: feeStatus,
    dueDate: dueDateStr,
    breakdown: reconciledBreakdown,
    receipts: receiptsList,
  };

  useEffect(() => {
    const receiptParam = searchParams.get("receiptId");
    if (receiptParam && childFee?.receipts?.length > 0) {
      const match = childFee.receipts.find((r) => String(r.id || r.receiptNo) === String(receiptParam));
      if (match) setSelectedReceipt(match);
    }
  }, [searchParams, childFee?.receipts]);

  useEffect(() => {
    const handleFeeSettled = () => {
      refreshActiveChild?.();
      setToastMessage("✓ Payment records updated from Accounts Office.");
    };

    window.addEventListener?.("cms-fee-settled", handleFeeSettled);
    window.addEventListener?.("cms-fee-utr-approved", handleFeeSettled);

    let bc = null;
    try {
      bc = new BroadcastChannel("cms-fee-events");
      bc.onmessage = (msg) => {
        if (msg?.data?.type === "UTR_APPROVED" || msg?.data?.type === "PAYMENT_SETTLED") {
          refreshActiveChild?.();
          const amt = Number(msg.data?.amount || 0);
          setToastMessage(amt > 0 ? `✓ Payment of ₹${amt.toLocaleString()} approved by Accounts Office!` : "✓ Fee payment approved by Accounts Office!");
        }
      };
    } catch {}

    return () => {
      window.removeEventListener?.("cms-fee-settled", handleFeeSettled);
      window.removeEventListener?.("cms-fee-utr-approved", handleFeeSettled);
      if (bc) bc.close();
    };
  }, [refreshActiveChild]);

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
          <SkeletonPage variant="dashboard" columns={4} />
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

  if (isPayView) {
    return (
      <DashboardLayout
        title="Pay Fee"
        subtitle={`Pay fees for your child securely online • ${child.name} (${child.group})`}
        breadcrumb={["Parent Portal", "Fees & Payments", "Pay Fee"]}
      >
        <ParentPayFeeScreen onBack={handleClosePayFee} />
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
                className={`parent-child-switch-btn ${String(activeChildId || child?.id) === String(c.id) ? "is-active" : ""}`}
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

          {/* 5th Card: PAY FEE */}
          <div
            className="parent-stat-card parent-pay-fee-stat-card"
            onClick={handleOpenPayFee}
            role="button"
            tabIndex={0}
          >
            <div className="parent-stat-icon-wrap green">
              <Wallet size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">PAY FEE</div>
              <div className="parent-stat-value" style={{ fontSize: 18 }}>{(childFee?.pending || 0) === 0 ? "Paid in Full" : "Pay Online"}</div>
              <div className="parent-stat-subtext">
                {(childFee?.pending || 0) === 0 ? (
                  <span className="cms-badge cms-badge-active" style={{ fontSize: 12, padding: "3px 8px", display: "inline-block" }}>
                    ✓ All Dues Cleared
                  </span>
                ) : (
                  <button
                    type="button"
                    className="parent-pay-now-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPayFee();
                    }}
                  >
                    Pay Now →
                  </button>
                )}
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
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(childFee.receipts || []).length > 0 ? (
                    (childFee.receipts || []).map((rec, idx) => (
                      <tr key={rec.id ? `rec-${rec.id}` : `receipt-${idx}`}>
                        <td><strong>{rec.receiptNo}</strong></td>
                        <td>{rec.date}</td>
                        <td style={{ fontWeight: 700, color: "var(--cms-green)" }}>₹{rec.amount.toLocaleString()}</td>
                        <td>{rec.method}</td>
                        <td style={{ fontSize: 12, color: "var(--cms-muted)" }}>{rec.txnId}</td>
                        <td>{rec.paidFor}</td>
                        <td>
                          <span className={`cms-badge ${rec.status === "Approved" || !rec.status || rec.status === "Success" ? "cms-badge-active" : /pending|awaiting/i.test(rec.status) ? "cms-badge-warn" : "cms-badge-danger"}`}>
                            {rec.status === "Approved" || !rec.status || rec.status === "Success" ? "Approved" : /pending|awaiting/i.test(rec.status) ? "Pending Approval" : rec.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="cms-btn cms-btn-sm cms-btn-outline"
                            onClick={() => handleOpenReceipt(rec)}
                          >
                            <Eye size={13} /> View Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
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
            onClose={handleCloseReceipt}
            className="parent-fee-receipt-modal"
            footer={
              <div className="parent-receipt-modal-actions">
                <button type="button" className="cms-btn cms-btn-ghost parent-close-btn" onClick={handleCloseReceipt}>
                  Close
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary parent-done-btn"
                  onClick={() => printReceiptElement("parent-fee-receipt-printable", `Fee Payment Receipt — ${selectedReceipt.receiptNo}`)}
                >
                  <Printer size={15} style={{ marginRight: 6 }} /> Print Receipt
                </button>
              </div>
            }
          >
            <div id="parent-fee-receipt-printable" className="parent-receipt-sheet">
              <div className="parent-receipt-header">
                <h2>PIRNAV JUNIOR COLLEGE</h2>
                <p>Campus Road, Jubilee Hills, Hyderabad - 500033</p>
                <div className="receipt-title-badge">OFFICIAL FEE PAYMENT RECEIPT</div>
              </div>

              <div className="parent-receipt-meta-grid">
                <div><span>Receipt Number:</span> <strong>{selectedReceipt.receiptNo}</strong></div>
                <div><span>Date of Payment:</span> <strong>{selectedReceipt.date}</strong></div>
                <div><span>Student Name:</span> <strong>{child?.name || "Student"}</strong></div>
                <div><span>Admission Number:</span> <strong>{child?.admissionNo || `ADM-${child?.id}`}</strong></div>
                <div><span>Course & Group:</span> <strong>{child?.programme || child?.group || "Intermediate 1st Year (MPC)"}</strong></div>
                <div><span>Payment Mode:</span> <strong>{selectedReceipt.method || "Online"}</strong></div>
              </div>

              <table className="parent-receipt-table">
                <thead>
                  <tr>
                    <th style={{ width: "36%" }}>Description</th>
                    <th style={{ width: "28%" }}>Transaction Reference</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Amount Paid</th>
                    <th style={{ width: "18%", textAlign: "center" }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="cell-desc">{selectedReceipt.paidFor}</td>
                    <td className="cell-txn">{selectedReceipt.txnId}</td>
                    <td className="cell-amount">₹{Number(selectedReceipt.amount || 0).toLocaleString()}</td>
                    <td className="cell-status">
                      <span className={`cms-badge ${/pending/i.test(selectedReceipt.status) ? "cms-badge-warn" : /reject|fail/i.test(selectedReceipt.status) ? "cms-badge-danger" : "cms-badge-active"}`}>
                        {selectedReceipt.status || "Success"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="parent-receipt-foot-block">
                <div className="parent-receipt-foot-legal">
                  <div>This is an official computer-generated fee receipt.</div>
                  <div>Valid for Income Tax deduction under section 80C.</div>
                </div>
                <div className="parent-receipt-foot-signature">
                  <div style={{ height: 20 }}></div>
                  <div className="sig-line">Accounts Officer / Cashier</div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Collect Payment Omnichannel Modal */}
        <ParentCollectPaymentModal
          isOpen={isCollectPaymentOpen}
          onClose={() => setIsCollectPaymentOpen(false)}
          initialChildId={activeChildId}
          onPaymentSuccess={() => {
            refreshActiveChild?.();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
