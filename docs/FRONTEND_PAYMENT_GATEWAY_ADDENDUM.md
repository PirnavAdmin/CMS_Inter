# Technical Addendum & Missing Features Implementation Guide
## Omnichannel Payment Gateway & Admin Fee Management System

**Project:** College Management System  
**Module:** Admin Fee Management (`Frontend/src/modules/admin/AdminFees/`) & Student Portal  
**Target Audience:** Frontend Development Team / Teammate  
**Document Type:** Addendum to `FRONTEND_PAYMENT_GATEWAY_IMPLEMENTATION_PLAN.md` (Priority 2 Features)  
**Status:** Ready for Implementation  
**Date:** November 2026  

---

## 1. Overview & Purpose

This document serves as an official **Addendum** to the previously shared **Frontend Payment Gateway Implementation Plan** (`FRONTEND_PAYMENT_GATEWAY_IMPLEMENTATION_PLAN.md`) and **Frontend API Integration Plan** (`FRONTEND_API_INTEGRATION_PLAN.md`).

During the backend parity implementation with the 25-page technical specification, **four critical enterprise features** were built in the backend that require corresponding frontend UI components and API wiring:

1. **Payment Reversal & Refund Engine (Accounting Action):** Allows authorized financial personnel (`Admin`, `Accountant`, `Finance`, `Principal`) to reverse captured transactions, restore student ledger balances, and log reasons in the audit ledger.
2. **Dynamic Cross-Device Mobile Payment Link (`paymentLink`):** Allows counter cashiers to copy and share a dynamically resolved LAN/public payment URL (`http://<LAN_IP>:5173/student/fees/pay/...`) so parents on campus Wi-Fi can open checkout on their phones without scanning the monitor.
3. **Multi-Installment Allocation Selection Matrix:** Checkbox/dropdown selection supporting lump-sum fee payments spanning multiple pending installments (`feeInstallmentIds: [501, 502]`).
4. **Automated "Overdue" Badges & Proactive 3-Day Reminder Banners:** UI treatment for overdue fees automatically transitioned by the hourly backend worker and in-app notification toasts.

---

## 2. Feature 1: Payment Reversal & Refund Engine

### 2.1 Business Requirement
When a parent accidentally pays twice, a cashier logs a payment against the wrong student account, or a payment gateway transaction needs to be annulled, privileged accounting staff must be able to click **"Reverse Payment"** from the payment history table.

Reversing a payment:
- Sets the transaction status to `"Reversed"` in the database.
- Restores the student fee balance (`PaidAmount -= Amount`, `BalanceAmount += Amount`).
- Reverts the student account status to `"Partial"` or `"Pending"`.
- Marks the linked receipt as reversed.
- Appends an audit entry to `Payments_Ledger.csv`.
- Dispatches an in-app reversal notice to the student.

---

### 2.2 API Contract: Reverse Payment

* **URL:** `POST /api/v1/fee-payments/gateway/reverse`
* **Authorization:** Restricted to `Admin`, `Super Admin`, `SuperAdmin`, `Principal`, `Accountant`, `Finance`.
* **Request Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_TOKEN>
  ```
* **Request Body:**
  ```json
  {
    "transactionId": 142,
    "reason": "Accidental duplicate card swipe by cashier at counter 2"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "receiptNumber": "REC-2026-00891",
    "amount": 15000.00
  }
  ```
* **Failure Response (`400 Bad Request`):**
  ```json
  {
    "success": false,
    "message": "Cannot reverse transaction with status 'Failed'. Only captured payments can be reversed."
  }
  ```

---

### 2.3 API Function: `feePaymentGatewayApi.js`

Add the following export to [`Frontend/src/api/feePaymentGatewayApi.js`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/api/feePaymentGatewayApi.js):

```javascript
/**
 * 8. Reverse a Settled Fee Payment (Admin / Accountant only)
 * Restores student account balance and records reason in audit ledger.
 *
 * @param {Object} params
 * @param {number} params.transactionId - Primary ID of PaymentGatewayTransaction
 * @param {string} params.reason - Detailed justification for reversal (min 3 chars)
 */
export async function reversePaymentApi({ transactionId, reason }) {
  try {
    const response = await apiClient.post(`${BASE_URL}/reverse`, {
      transactionId: Number(transactionId),
      reason: String(reason || "").trim()
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to reverse fee payment."));
  }
}
```

---

### 2.4 UI Component: `PaymentReversalModal.jsx`

Create a new component at [`Frontend/src/modules/admin/AdminFees/components/PaymentReversalModal.jsx`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminFees/components/PaymentReversalModal.jsx):

```jsx
import React, { useState } from "react";
import { reversePaymentApi } from "../../../../api/feePaymentGatewayApi";
import "./PaymentReversalModal.css";

/**
 * Modal to securely reverse a captured fee payment with audit reasoning.
 */
export default function PaymentReversalModal({ isOpen, onClose, transaction, onSuccess }) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a detailed reason (at least 5 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await reversePaymentApi({
        transactionId: transaction.id || transaction.transactionId,
        reason: reason.trim()
      });

      if (result.success) {
        if (onSuccess) onSuccess(result);
        onClose();
      } else {
        setError(result.message || "Failed to reverse payment.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred during reversal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cms-modal-backdrop" onClick={onClose}>
      <div
        className="cms-modal reversal-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="reversal-modal__header">
          <div className="reversal-modal__icon">⚠️</div>
          <div>
            <h3 className="reversal-modal__title">Reverse Fee Payment</h3>
            <p className="reversal-modal__subtitle">
              Receipt #{transaction.receiptNumber || transaction.orderId}
            </p>
          </div>
          <button className="cms-modal-close" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="reversal-modal__body">
          <div className="reversal-warning-box">
            <p>
              <strong>Warning:</strong> Reversing this payment will restore the student's
              outstanding balance by <strong>₹{Number(transaction.amount || 0).toLocaleString("en-IN")}</strong>.
              This action is permanently recorded in the audit ledger and cannot be undone.
            </p>
          </div>

          <div className="reversal-summary-grid">
            <div>
              <span className="lbl">Student:</span>
              <span className="val">{transaction.studentName || `Student #${transaction.studentId}`}</span>
            </div>
            <div>
              <span className="lbl">Amount:</span>
              <span className="val highlight">₹{Number(transaction.amount || 0).toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="lbl">Payment Method:</span>
              <span className="val">{transaction.paymentMethod || transaction.paymentMode || "Online"}</span>
            </div>
            <div>
              <span className="lbl">Date:</span>
              <span className="val">{new Date(transaction.date || transaction.createdAt || Date.now()).toLocaleDateString("en-IN")}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reversalReason" className="form-label required">
              Reason for Reversal / Cancellation:
            </label>
            <textarea
              id="reversalReason"
              className="form-control"
              rows={3}
              placeholder="e.g., Accidental duplicate counter swipe, Cheque bounced, Wrong student account selected..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {error && <div className="cms-alert cms-alert--danger">{error}</div>}

          <div className="reversal-modal__footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? "Processing Reversal..." : "Confirm & Reverse Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### 2.5 CSS Styles: `PaymentReversalModal.css`

Create [`Frontend/src/modules/admin/AdminFees/components/PaymentReversalModal.css`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminFees/components/PaymentReversalModal.css):

```css
.reversal-modal {
  max-width: 540px;
  width: 90%;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.reversal-modal__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid #fee2e2;
  background: #fef2f2;
}

.reversal-modal__icon {
  font-size: 24px;
}

.reversal-modal__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #991b1b;
}

.reversal-modal__subtitle {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #b91c1c;
}

.reversal-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reversal-warning-box {
  padding: 12px 14px;
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #92400e;
  line-height: 1.4;
}

.reversal-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.reversal-summary-grid .lbl {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

.reversal-summary-grid .val {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
}

.reversal-summary-grid .val.highlight {
  color: #dc2626;
  font-size: 1rem;
}

.reversal-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}
```

---

### 2.6 Wiring the Reversal Action in Payment History Table

In the table rendering student payment receipts (e.g., in `FeeManagementPage.jsx` or the Student Ledger modal):

1. Check if the logged-in user has accounting permissions:
   ```javascript
   const userRole = currentUser?.role?.toLowerCase() || "";
   const canReverse = ["admin", "superadmin", "super admin", "principal", "accountant", "finance"].includes(userRole);
   ```
2. Render the "Reverse" button on each payment row (only for non-reversed payments):
   ```jsx
   {canReverse && row.status !== "Reversed" && (
     <button
       type="button"
       className="btn-action-icon btn-action-danger"
       title="Reverse / Cancel Payment"
       onClick={() => setSelectedTransactionForReversal(row)}
     >
       ↩️ Reverse
     </button>
   )}
   ```
3. Place `PaymentReversalModal` at the root of the page:
   ```jsx
   <PaymentReversalModal
     isOpen={!!selectedTransactionForReversal}
     transaction={selectedTransactionForReversal}
     onClose={() => setSelectedTransactionForReversal(null)}
     onSuccess={(result) => {
       showToast(`Payment reversed successfully (₹${result.amount}). Student balance restored.`, "success");
       fetchFeeData(); // Refresh table data
     }}
   />
   ```

---

## 3. Feature 2: Dynamic Cross-Device Mobile Payment Link

### 3.1 What Changed in the Backend
In `POST /api/v1/fee-payments/gateway/create-order`, the backend now automatically resolves the server's operational Wi-Fi/LAN IP and returns:

```json
{
  "success": true,
  "orderId": "order_OG9238hsd98",
  "amount": 15000.00,
  "currency": "INR",
  "upiUri": "upi://pay?pa=pirnavcolleges@hdfcbank&...",
  "qrCodeBase64": "data:image/png;base64,iVBORw0KGgo...",
  "paymentLink": "http://192.168.1.15:5173/student/fees/pay/204?orderId=order_OG9238hsd98",
  "keyId": "rzp_test_..."
}
```

---

### 3.2 Update in `CountertopUpiQrTab.jsx`

Add a **"Copy Mobile Payment Link"** button and helper text directly below the dynamic QR code:

```jsx
// In CountertopUpiQrTab.jsx
const [copiedLink, setCopiedLink] = useState(false);

const handleCopyPaymentLink = () => {
  if (!orderData?.paymentLink) return;
  navigator.clipboard.writeText(orderData.paymentLink);
  setCopiedLink(true);
  setTimeout(() => setCopiedLink(false), 2500);
};

// Inside the JSX return under the QR image:
{orderData?.paymentLink && (
  <div className="mobile-link-container">
    <div className="mobile-link-label">
      📱 Parent paying on mobile Wi-Fi?
    </div>
    <div className="mobile-link-box">
      <input
        type="text"
        readOnly
        value={orderData.paymentLink}
        className="mobile-link-input"
      />
      <button
        type="button"
        className="btn btn-outline-primary btn-sm btn-copy-link"
        onClick={handleCopyPaymentLink}
      >
        {copiedLink ? "✓ Copied!" : "📋 Copy Link"}
      </button>
    </div>
    <span className="mobile-link-hint">
      You can also paste this link into WhatsApp Web or SMS to send directly to the parent.
    </span>
  </div>
)}
```

---

## 4. Feature 3: Multi-Installment Allocation Selection Matrix

### 4.1 Business Requirement
When a student has multiple pending installments (e.g. Installment 1: ₹10,000, Installment 2: ₹10,000, Installment 3: ₹5,000):
- The cashier should be able to check multiple installments simultaneously.
- The "Amount to Collect" input automatically sums up the selected installment balances.
- When submitted, the array `feeInstallmentIds: [501, 502]` is passed to `create-order`.
- The backend's new `FeePaymentAllocations` engine sequentially clears Installment 1 and Installment 2.

---

### 4.2 UI Implementation in `AdminOmnichannelCollectModal.jsx`

Add multi-select installment checkboxes inside the installment target section:

```jsx
// State:
const [targetMode, setTargetMode] = useState("installments"); // "installments" or "custom"
const [selectedInstallmentIds, setSelectedInstallmentIds] = useState([]);

// Toggle an installment:
const handleToggleInstallment = (id) => {
  setSelectedInstallmentIds((prev) => {
    const exists = prev.includes(id);
    const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];

    // Automatically recalculate amount to pay
    const sum = pendingInstallments
      .filter((inst) => updated.includes(inst.feeInstallmentId))
      .reduce((acc, curr) => acc + (Number(curr.balanceAmount) || 0), 0);

    setAmount(sum > 0 ? sum : account.balanceAmount);
    return updated;
  });
};

// Render Installments Selection List:
<div className="installments-selection-list">
  <label className="form-label">Select Pending Installment(s) to Clear:</label>
  {pendingInstallments.map((inst) => {
    const isChecked = selectedInstallmentIds.includes(inst.feeInstallmentId);
    return (
      <label key={inst.feeInstallmentId} className={`installment-checkbox-item ${isChecked ? "selected" : ""}`}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => handleToggleInstallment(inst.feeInstallmentId)}
        />
        <div className="inst-meta">
          <span className="inst-num">Installment #{inst.installmentNumber}</span>
          <span className="inst-due">Due: {new Date(inst.dueDate).toLocaleDateString("en-IN")}</span>
        </div>
        <div className="inst-amount">
          ₹{Number(inst.balanceAmount).toLocaleString("en-IN")}
        </div>
      </label>
    );
  })}
</div>
```

---

## 5. Feature 4: Automated "Overdue" Badges & Proactive Reminders

### 5.1 What Changed in the Backend
The new backend worker [`FeeBackgroundHostedService`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Backend/src/CollegeManagement.API/Services/Background/FeeBackgroundHostedService.cs) now automatically marks past-due installments and student fees as `"Overdue"`.

### 5.2 UI Badge Styles

Add `.status-badge.overdue` in [`Frontend/src/modules/admin/AdminFees/FeeManagementPage.css`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminFees/FeeManagementPage.css):

```css
/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.paid {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.partial {
  background: #fef9c3;
  color: #a16207;
}

.status-badge.pending {
  background: #f1f5f9;
  color: #475569;
}

/* Priority 2: Overdue Status */
.status-badge.overdue {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  animation: pulse-red 2s infinite ease-in-out;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}
```

### 5.3 Overdue Warning Alert in Student Fee Header

If any student account has `status === "Overdue"`, display a subtle warning pill in the student detail row:

```jsx
{account.status === "Overdue" && (
  <div className="overdue-warning-banner">
    ⚠️ <strong>Payment Overdue:</strong> One or more installments for this student have passed their due date.
  </div>
)}
```

---

## 6. Summary Checklist for Frontend Teammate

| # | Task | Target File | Status |
|---|------|-------------|--------|
| **1** | Add `reversePaymentApi` export | `Frontend/src/api/feePaymentGatewayApi.js` | ⏳ Ready to Code |
| **2** | Create `PaymentReversalModal.jsx` & `.css` | `Frontend/src/modules/admin/AdminFees/components/` | ⏳ Ready to Code |
| **3** | Add "Reverse" button in payment history table | `Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx` | ⏳ Ready to Code |
| **4** | Add "Copy Mobile Link" button using `paymentLink` | `Frontend/src/modules/admin/AdminFees/components/CountertopUpiQrTab.jsx` | ⏳ Ready to Code |
| **5** | Add multi-installment selection checkboxes | `Frontend/src/modules/admin/AdminFees/components/AdminOmnichannelCollectModal.jsx` | ⏳ Ready to Code |
| **6** | Add `.status-badge.overdue` styling | `Frontend/src/modules/admin/AdminFees/FeeManagementPage.css` | ⏳ Ready to Code |

---

> [!NOTE]
> All backend endpoints, DTOs, database tables (`FeePaymentAllocations`), background jobs, and CSV ledger updates are fully implemented and verified on the server. The frontend teammate can call these endpoints immediately.
