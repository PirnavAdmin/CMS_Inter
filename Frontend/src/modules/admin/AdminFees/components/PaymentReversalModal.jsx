import { useEffect, useRef, useState } from "react";
import { Modal } from "@/shared/components/Ui.jsx";
import { feePaymentGatewayApi } from "@/api/feePaymentGatewayApi.js";
import { getApiErrorMessage } from "@/api/axios.js";
import { formatCurrency } from "@/data/feeManagementData.js";
import {
  canReversePayment,
  gatewayTransactionIdFor,
  reversalPayload,
} from "../services/paymentGatewaySession.js";

export default function PaymentReversalModal({
  transaction,
  authorized,
  onClose,
  onSuccess,
  onAttemptState,
}) {
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const guard = useRef(false);
  const controllerRef = useRef(null);
  const authorizedRef = useRef(authorized);
  authorizedRef.current = authorized;
  useEffect(() => () => controllerRef.current?.abort(), []);
  const id = gatewayTransactionIdFor(transaction);
  const confirm = async () => {
    if (guard.current || uncertain) return;
    if (!canReversePayment(transaction, authorizedRef.current)) {
      setError(
        "This payment is not eligible for reversal or your reversal permission is unavailable.",
      );
      return;
    }
    let payload;
    try {
      payload = reversalPayload({ transactionId: id, reason });
    } catch (failure) {
      setError(failure.message);
      return;
    }
    guard.current = true;
    setProcessing(true);
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    onAttemptState(id, "processing");
    try {
      const result = await feePaymentGatewayApi.reverse(payload, controller.signal);
      if (controller.signal.aborted) return;
      if (
        result.success !== true ||
        !Number.isFinite(Number(result.amount)) ||
        Math.abs(Number(result.amount) - Number(transaction.amount)) > 0.005 ||
        (result.receiptNumber &&
          transaction.receiptNo &&
          transaction.receiptNo !== "-" &&
          result.receiptNumber !== transaction.receiptNo)
      )
        throw new Error(
          "Reversal response did not match this transaction. Review Payment History before trying again.",
        );
      onAttemptState(id, "confirmed");
      onSuccess(result, transaction);
      onClose();
    } catch (failure) {
      if (controller.signal.aborted) return;
      const outcomeUncertain = !failure.response || failure.response.status >= 500;
      setError(getApiErrorMessage(failure));
      setUncertain(outcomeUncertain);
      onAttemptState(id, outcomeUncertain ? "uncertain" : "rejected");
      if (!outcomeUncertain) guard.current = false;
    } finally {
      if (!controller.signal.aborted) setProcessing(false);
    }
  };
  return (
    <Modal
      title="Reverse Fee Payment"
      className="cms-fee-reversal-modal"
      onClose={processing ? () => {} : onClose}
      footer={
        <>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-danger"
            onClick={confirm}
            disabled={processing || uncertain || !authorized}
          >
            {processing ? "Processing Reversal…" : "Confirm & Reverse Payment"}
          </button>
        </>
      }
    >
      <div className="cms-fee-reversal-warning" role="alert">
        Reversing this payment affects the student's ledger and restores the balance on the server.
        The receipt is marked reversed and the transaction remains in the audit history. Confirm
        only after checking the payment and reason.
      </div>
      <dl className="cms-fee-reversal-details">
        {[
          ["Student", transaction.studentName],
          ["Admission No", transaction.admissionNo],
          ["Amount", formatCurrency(transaction.amount)],
          ["Payment Method", transaction.method],
          ["Gateway Transaction ID", id],
          ["Gateway Order", transaction.orderId],
          ["Transaction Reference", transaction.reference],
          ["Receipt", transaction.receiptNo],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "-"}</dd>
          </div>
        ))}
      </dl>
      <div className="cms-field">
        <label htmlFor="payment-reversal-reason">
          Reason for Reversal (required, at least 5 characters)
        </label>
        <textarea
          id="payment-reversal-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={processing || uncertain}
          rows={3}
        />
      </div>
      {error && (
        <p className="cms-error" role="alert">
          {error}
        </p>
      )}
      {uncertain && (
        <p className="cms-error" role="alert">
          The outcome is uncertain. Review the transaction with the accounts team before attempting
          another reversal.
        </p>
      )}
    </Modal>
  );
}
