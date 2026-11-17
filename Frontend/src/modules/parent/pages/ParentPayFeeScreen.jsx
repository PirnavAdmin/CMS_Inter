import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  Wallet,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react";
import { useParentPortal } from "../context/ParentPortalContext.jsx";
import { getStoredFeeRecords } from "../parentData.js";
import { Toast } from "@/shared/components/Ui.jsx";
import ParentCollectPaymentModal from "../components/ParentCollectPaymentModal.jsx";
import "../ParentDashboard.css";

export default function ParentPayFeeScreen({ onBack }) {
  const {
    availableChildren: rawChildren,
    activeChildId,
    setActiveChildId,
    child: currentChild,
    childFee: contextChildFee,
    dataKey,
    currentAcademicYear,
  } = useParentPortal();

  const availableChildren = useMemo(() => {
    return (rawChildren || []).filter(
      (c) => String(c.id || c.studentId) !== "6" && !/sneha/i.test(c.name || "")
    );
  }, [rawChildren]);

  // Selected child id (local fallback synced with context)
  const selectedChildId = String(activeChildId || currentChild?.id || (availableChildren[0]?.id || ""));

  const selectedChild = useMemo(() => {
    return availableChildren.find((c) => String(c.id || c.studentId) === selectedChildId) || currentChild || availableChildren[0] || null;
  }, [availableChildren, selectedChildId, currentChild]);

  // Compute fees for the selected child
  const feeRecords = useMemo(() => getStoredFeeRecords(), []);
  const feeKey = dataKey || selectedChild?.id;

  const rawFee = contextChildFee && contextChildFee.total !== undefined && String(activeChildId) === String(selectedChild?.id)
    ? contextChildFee
    : (selectedChild
        ? (feeRecords[feeKey] || feeRecords[selectedChild?.id] || selectedChild?.fees) || {
            total: 70000,
            paid: 0,
            pending: 70000,
            status: "Due",
            dueDate: "15 Dec 2026",
            breakdown: [],
            receipts: [],
          }
        : { total: 0, paid: 0, pending: 0, status: "—", dueDate: "—", breakdown: [], receipts: [] });

  const receiptsList = rawFee.receipts || [];
  const approvedReceiptsTotal = receiptsList
    .filter((r) => !/reject|fail|cancel|pending/i.test(r.status || ""))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const paidAmount = Math.max(Number(rawFee.paid || 0), approvedReceiptsTotal);
  const totalAmount = Math.max(Number(rawFee.total || 70000), paidAmount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);
  const feeStatus = pendingAmount === 0 && totalAmount > 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Due";
  const dueDateStr = pendingAmount === 0 ? "All Dues Cleared" : (rawFee.dueDate || "13 Dec 2026");

  let remPaid = paidAmount;
  const rawBreakdownItems = (rawFee.breakdown && rawFee.breakdown.length > 0)
    ? rawFee.breakdown
    : [
        { category: "Admission", amount: 5000 },
        { category: "Course Fee", amount: 65000 },
      ];

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

  const selectedChildFee = {
    ...rawFee,
    total: totalAmount,
    paid: paidAmount,
    pending: pendingAmount,
    status: feeStatus,
    dueDate: dueDateStr,
    breakdown: reconciledBreakdown,
    receipts: receiptsList,
  };
  const _ignoreOldPayFeeCalc = null;



  const _unusedMemoFee = useMemo(() => {
    return {
      ...rawFee,



      status: rawFee.status || "Due",


      dueDate: rawFee.dueDate && rawFee.dueDate !== "—" ? rawFee.dueDate : "15 Dec 2026",
    };
  }, [rawFee]);

  // Payment selection state
  const [paymentType, setPaymentType] = useState("full"); // "full" | "partial" | "installment"
  const [partialAmount, setPartialAmount] = useState("");
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const pendingBalance = Math.max(0, Number(selectedChildFee.pending || 0));

  // Determine installments available
  const pendingInstallments = useMemo(() => {
    const list = (selectedChildFee.breakdown || []).filter((b) => (b.pending || 0) > 0);
    if (list.length > 0) return list;
    if (pendingBalance > 0) {
      const half = Math.ceil(pendingBalance / 2);
      return [
        { category: "Term 1 Pending Installment", pending: half, due: selectedChildFee.dueDate || "15 Dec 2026" },
        { category: "Term 2 Pending Installment", pending: pendingBalance - half, due: "15 Feb 2027" },
      ];
    }
    return [];
  }, [selectedChildFee, pendingBalance]);

  // Reactive payment amount
  const calculatedPayAmount = useMemo(() => {
    if (pendingBalance === 0) return 0;
    if (paymentType === "full") {
      return pendingBalance;
    }
    if (paymentType === "partial") {
      const parsed = parseFloat(partialAmount);
      return isNaN(parsed) || parsed <= 0 ? 0 : Math.min(parsed, pendingBalance);
    }
    if (paymentType === "installment") {
      if (pendingInstallments.length > 0) {
        const item = pendingInstallments[selectedInstallmentIndex] || pendingInstallments[0];
        return Math.min(item.pending || 0, pendingBalance);
      }
      return pendingBalance;
    }
    return 0;
  }, [paymentType, partialAmount, pendingBalance, pendingInstallments, selectedInstallmentIndex]);

  const handleSelectChild = (childId) => {
    setActiveChildId(childId);
    // Reset partial amount when switching child
    setPartialAmount("");
    setSelectedInstallmentIndex(0);
  };

  const handleProceed = () => {
    if (pendingBalance === 0) {
      setToastMessage("All fees for this child are already fully paid!");
      return;
    }
    if (paymentType === "partial") {
      const val = parseFloat(partialAmount);
      if (isNaN(val) || val < 1000) {
        setToastMessage("Please enter a valid partial amount of at least ₹1,000.");
        return;
      }
      if (val > pendingBalance) {
        setToastMessage(`Partial amount cannot exceed the pending balance of ₹${pendingBalance.toLocaleString()}.`);
        return;
      }
    }
    if (calculatedPayAmount <= 0) {
      setToastMessage("Please select a valid payment option.");
      return;
    }

    setIsPaymentModalOpen(true);
  };

  return (
    <div className="parent-dashboard-wrapper parent-pay-screen">
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />

      {/* Top Header with Back Button */}
      <div className="parent-pay-header-banner">
        <button type="button" className="parent-pay-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Pay Fee
        </button>
        <div className="parent-pay-title-wrap">
          <h2>Pay Fee</h2>
          <p>Pay fees for your child securely online</p>
        </div>
      </div>

      {/* Payment Progress - 3 Steps (Step 1 Active) */}
      <div className="parent-pay-stepper-card">
        <div className="parent-pay-steps">
          <div className="parent-pay-step is-active">
            <div className="parent-pay-step-badge">1</div>
            <span className="parent-pay-step-label">Select &amp; Amount</span>
          </div>

          <div className="parent-pay-step-line" />

          <div className="parent-pay-step">
            <div className="parent-pay-step-badge">2</div>
            <span className="parent-pay-step-label">Payment</span>
          </div>

          <div className="parent-pay-step-line" />

          <div className="parent-pay-step">
            <div className="parent-pay-step-badge">3</div>
            <span className="parent-pay-step-label">Confirmation</span>
          </div>
        </div>
      </div>

      {/* Two-Column: Select Child (Left) & Fee Summary (Right) */}
      <div className="parent-pay-top-grid">
        {/* Left Column: Select Child */}
        <div className="parent-card parent-pay-select-child-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Users size={18} /> Select Child
            </h3>
            <span className="parent-pay-child-count-pill">
              {availableChildren.length} Linked {availableChildren.length === 1 ? "Child" : "Children"}
            </span>
          </div>

          <div className="parent-pay-children-list">
            {availableChildren.map((ch) => {
              const isSelected = String(ch.id || ch.studentId) === selectedChildId;
              const photo = ch.avatar;
              const initials = (ch.name || "S").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

              return (
                <div
                  key={ch.id || ch.studentId}
                  className={`parent-pay-child-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => handleSelectChild(ch.id || ch.studentId)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="parent-pay-radio-circle">
                    {isSelected && <div className="parent-pay-radio-dot" />}
                  </div>

                  {photo ? (
                    <img
                      src={photo}
                      alt={ch.name}
                      className="parent-pay-child-avatar"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling && (e.target.nextSibling.style.display = "flex");
                      }}
                    />
                  ) : null}
                  <div
                    className="parent-pay-child-avatar-fallback"
                    style={{ display: photo ? "none" : "flex" }}
                  >
                    {initials}
                  </div>

                  <div className="parent-pay-child-info">
                    <div className="parent-pay-child-name">{ch.name}</div>
                    <div className="parent-pay-child-sub">
                      {ch.level || "Intermediate"} • {ch.programme || ch.group || "MPC"}
                    </div>
                    <div className="parent-pay-child-adm">
                      Admission No: {ch.admissionNo || `ADM-${ch.id || ch.studentId}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Fee Summary */}
        <div className="parent-pay-summary-card">
          <h3 className="parent-pay-summary-title">
            <Wallet size={18} /> Fee Summary
          </h3>

          <div className="parent-pay-summary-rows">
            <div className="parent-pay-summary-row">
              <span className="label">Total Annual Fee</span>
              <span className="val">₹{(selectedChildFee.total || 0).toLocaleString()}</span>
            </div>

            <div className="parent-pay-summary-row paid">
              <span className="label">Already Paid Amount</span>
              <span className="val">₹{(selectedChildFee.paid || 0).toLocaleString()}</span>
            </div>

            <hr className="parent-pay-summary-divider" />

            <div className="parent-pay-summary-row pending">
              <span className="label">Pending Balance</span>
              <span className="val">₹{(selectedChildFee.pending || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="parent-pay-summary-footer-meta">
            <span>
              Academic Year: <strong>{selectedChild?.academicYear || currentAcademicYear || "2026-2027"}</strong>
            </span>
            <span>
              Due Date: <strong>{selectedChildFee.dueDate || "15 Dec 2026"}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Choose Payment Type */}
      <div className="parent-card parent-pay-types-container">
        <div className="parent-card-header">
          <h3 className="parent-card-title">
            <CreditCard size={18} /> Choose Payment Type
          </h3>
        </div>

        <div className="parent-pay-types-grid">
          {/* 1. Full Payment */}
          <div
            className={`parent-pay-type-card ${paymentType === "full" ? "is-selected" : ""}`}
            onClick={() => setPaymentType("full")}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="parent-pay-type-header">
                <div className="parent-pay-type-title-group">
                  <h4>Full Payment</h4>
                  <p>Pay complete pending balance</p>
                </div>
                <div className="parent-pay-radio-circle">
                  {paymentType === "full" && <div className="parent-pay-radio-dot" />}
                </div>
              </div>

              <div className="parent-pay-type-amount">
                ₹{pendingBalance.toLocaleString()}
              </div>

              <p className="parent-pay-type-desc">
                Clear all outstanding dues in a single secure transaction.
              </p>
            </div>

            <span className="parent-pay-type-badge">
              Full Clearance
            </span>
          </div>

          {/* 2. Partial Payment */}
          <div
            className={`parent-pay-type-card ${paymentType === "partial" ? "is-selected" : ""}`}
            onClick={() => setPaymentType("partial")}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="parent-pay-type-header">
                <div className="parent-pay-type-title-group">
                  <h4>Partial Payment</h4>
                  <p>Pay any custom amount</p>
                </div>
                <div className="parent-pay-radio-circle">
                  {paymentType === "partial" && <div className="parent-pay-radio-dot" />}
                </div>
              </div>

              <p className="parent-pay-type-desc" style={{ marginTop: 6 }}>
                Make an advance or installment payment towards your child's pending fee.
              </p>

              {paymentType === "partial" && (
                <div className="parent-pay-custom-input-wrap" onClick={(e) => e.stopPropagation()}>
                  <label htmlFor="custom-partial-input">Enter Amount to Pay (₹)</label>
                  <div className="parent-pay-input-with-symbol">
                    <span>₹</span>
                    <input
                      id="custom-partial-input"
                      type="number"
                      min="1000"
                      max={pendingBalance}
                      step="500"
                      placeholder="e.g. 5000"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                    />
                  </div>
                  <div className="parent-pay-input-hint">
                    Min: ₹1,000 • Max: ₹{pendingBalance.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            <span className="parent-pay-type-badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
              Min ₹1,000
            </span>
          </div>

          {/* 3. Installment Payment */}
          <div
            className={`parent-pay-type-card ${paymentType === "installment" ? "is-selected" : ""}`}
            onClick={() => setPaymentType("installment")}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="parent-pay-type-header">
                <div className="parent-pay-type-title-group">
                  <h4>Installment Payment</h4>
                  <p>Pay scheduled term installment</p>
                </div>
                <div className="parent-pay-radio-circle">
                  {paymentType === "installment" && <div className="parent-pay-radio-dot" />}
                </div>
              </div>

              {pendingInstallments.length > 0 ? (
                <>
                  <div className="parent-pay-type-amount">
                    ₹{(pendingInstallments[selectedInstallmentIndex]?.pending || pendingBalance).toLocaleString()}
                  </div>
                  <p className="parent-pay-type-desc">
                    {pendingInstallments[selectedInstallmentIndex]?.category || "Scheduled Term Installment"}
                  </p>

                  {pendingInstallments.length > 1 && paymentType === "installment" && (
                    <div className="parent-pay-installment-select-wrap" onClick={(e) => e.stopPropagation()}>
                      <label htmlFor="installment-picker">Select Term / Component:</label>
                      <select
                        id="installment-picker"
                        className="parent-pay-installment-select"
                        value={selectedInstallmentIndex}
                        onChange={(e) => setSelectedInstallmentIndex(Number(e.target.value))}
                      >
                        {pendingInstallments.map((inst, idx) => (
                          <option key={idx} value={idx}>
                            {inst.category} — ₹{(inst.pending || 0).toLocaleString()} (Due: {inst.due || "—"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="parent-pay-type-amount">₹0</div>
                  <p className="parent-pay-type-desc">
                    No pending installments on record for this academic period.
                  </p>
                </>
              )}
            </div>

            <span className="parent-pay-type-badge" style={{ background: "#fef3c7", color: "#b45320" }}>
              Term Schedule
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="parent-pay-bottom-bar">
        <div className="parent-pay-bottom-amount">
          <span className="sub">Total Payable Amount</span>
          <span className="num">₹{calculatedPayAmount.toLocaleString()}</span>
        </div>

        <div className="parent-pay-bottom-actions">
          <button type="button" className="cms-btn cms-btn-outline" onClick={onBack}>
            ← Back to Fees
          </button>
          <button
            type="button"
            className="parent-pay-proceed-btn"
            disabled={calculatedPayAmount <= 0}
            onClick={handleProceed}
          >
            Proceed to Payment <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Collect Payment Omnichannel Modal */}
      <ParentCollectPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        initialChildId={selectedChildId}
        onPaymentSuccess={() => {
          setIsPaymentModalOpen(false);
          onBack?.();
        }}
      />
    </div>
  );
}

