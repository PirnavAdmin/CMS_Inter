import { useEffect, useRef, useState } from "react";
import { Modal } from "@/shared/components/Ui.jsx";
import { feePaymentGatewayApi } from "@/api/feePaymentGatewayApi.js";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { formatCurrency, formatDate } from "@/data/feeManagementData.js";
import { emailDeliveryState, gatewayData, paymentUiState } from "../services/paymentGatewaySession.js";

// Shared by Admin, Accountant and the authorized UTR queue. PDFs remain backend-generated.
export default function PaymentConfirmation({ payment: initialPayment, account = {}, onClose, autoPrint = false }) {
  const [details, setDetails] = useState(null);
  const initialId = initialPayment.feePaymentId || initialPayment.paymentId;
  const payment = { ...initialPayment, ...(Number(details?.feePaymentId) === Number(initialId) ? details : {}) };
  const id = payment.feePaymentId || payment.paymentId;
  const state = paymentUiState(payment);
  const paid = state === "PAYMENT_SUCCESSFUL" || payment.isPaid === true || /^(settled|paid|captured|success)$/i.test(payment.status || "");
  const [pdf, setPdf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [freshBalance, setFreshBalance] = useState(null);
  const [retryingEmail, setRetryingEmail] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState("");
  const frame = useRef(null);
  const receiptNo = payment.receiptNumber || payment.receiptNo;
  const canRead = Boolean(id && receiptNo && (paid || /reversed|refunded/i.test(payment.status || "")));

  useEffect(() => {
    const controller = new AbortController();
    setDetails(null);
    setRetryFeedback("");
    if (Number.isSafeInteger(Number(id)) && Number(id) > 0) {
      Promise.allSettled([
        apiClient.get(apiEndpoints.fee.paymentDetails(id), { signal: controller.signal, requireRealBackend: true, skipGlobalLoader: true }),
        typeof feePaymentGatewayApi.paymentStatus === "function"
          ? feePaymentGatewayApi.paymentStatus(id, controller.signal)
          : Promise.resolve(null),
      ]).then(([paymentRes, notifRes]) => {
        if (controller.signal.aborted) return;
        const base = paymentRes.status === "fulfilled" ? gatewayData(paymentRes.value.data) : {};
        const notif = notifRes.status === "fulfilled" && notifRes.value ? notifRes.value : {};
        const merged = { ...base, ...notif };
        if (Number(merged.feePaymentId) === Number(id)) setDetails(merged);
      }).catch(() => { /* Keep the confirmed response; never invent missing date or email metadata. */ });
    }
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    let url;
    setPdf(""); setError(""); setLoading(canRead);
    if (canRead) feePaymentGatewayApi.receiptPdf(id, controller.signal)
      .then(blob => { if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setPdf(url); } })
      .catch(failure => { if (!controller.signal.aborted) setError(`Official receipt unavailable: ${getApiErrorMessage(failure)}`); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [id, canRead, version]);

  const feeId = payment.studentFeeId;
  useEffect(() => {
    const controller = new AbortController();
    setFreshBalance(null);
    if (paid && Number.isSafeInteger(Number(feeId)) && Number(feeId) > 0) {
      apiClient.get(apiEndpoints.fee.getAssignment(feeId), { signal: controller.signal, requireRealBackend: true, skipGlobalLoader: true })
        .then(response => {
          if (controller.signal.aborted) return;
          const data = gatewayData(response.data);
          const balance = data.outstandingBalance ?? data.balanceAmount;
          if (Number(data.studentFeeId) === Number(feeId) && balance != null && Number.isFinite(Number(balance))) setFreshBalance(Number(balance));
        }).catch(() => { /* Payment remains confirmed even if refreshed balance is unavailable. */ });
    }
    return () => controller.abort();
  }, [paid, feeId, id]);

  const email = emailDeliveryState(payment);
  const emailLabels = {
    SENT: "Email Sent",
    QUEUED: "Email Queued",
    FAILED: "Email Failed — payment remains confirmed.",
    NOT_REQUESTED: "Email not requested.",
    UNKNOWN: "Payment confirmed. Email delivery status is unavailable.",
  };

  const handleRetryEmail = async () => {
    if (!id || retryingEmail) return;
    setRetryingEmail(true);
    setRetryFeedback("");
    try {
      const res = await feePaymentGatewayApi.retryEmail(id);
      setDetails(prev => ({
        ...(prev || {}),
        feePaymentId: id,
        emailNotificationStatus: res.emailNotificationStatus || "QUEUED",
        emailDeliveryStatus: res.emailDeliveryStatus || "QUEUED",
        emailFailureReason: null,
      }));
      setRetryFeedback(res.message || "Confirmation email re-queued for delivery.");
    } catch (failure) {
      setRetryFeedback(`Retry failed: ${getApiErrorMessage(failure)}`);
    } finally {
      setRetryingEmail(false);
    }
  };

  const balance = freshBalance ?? payment.outstandingBalance ?? payment.remainingBalance;
  const date = payment.paymentDate || payment.receiptDate || payment.date;
  const print = () => { try { frame.current?.contentWindow?.print(); } catch { setError("Use View Receipt to print the official PDF in your browser."); } };

  return <Modal title={paid ? "Payment Successful" : "Payment Details"} onClose={onClose} footer={<>
    <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
    {pdf ? <><a className="cms-btn cms-btn-ghost" href={pdf} target="_blank" rel="noopener noreferrer">View Receipt</a>
      <a className="cms-btn cms-btn-primary" href={pdf} download={`Fee_Receipt_${String(id)}.pdf`}>Download PDF Receipt</a>
      <button type="button" className="cms-btn cms-btn-ghost" onClick={print}>Print Receipt</button></> : null}
    {paid && email === "FAILED" ? (
      <button type="button" className="cms-btn cms-btn-ghost" disabled={retryingEmail} onClick={handleRetryEmail}>{retryingEmail ? "Retrying Email..." : "Retry Email"}</button>
    ) : null}
    {error && canRead ? <button type="button" className="cms-btn cms-btn-ghost" disabled={loading} onClick={() => setVersion(value => value + 1)}>Retry Receipt</button> : null}
  </>}>
    <dl className="cms-fee-reversal-details">
      {[["Student", payment.studentName || account?.studentName], ["Admission Number", payment.admissionNumber || payment.admissionNo || account?.admissionNumber || account?.admissionNo],
        ["Amount Paid", payment.amount != null ? formatCurrency(payment.amount) : null], ["Payment Method", payment.paymentMethod || payment.paymentMode || payment.method],
        ["Transaction Reference", payment.transactionReference || payment.reference || payment.transactionId || payment.utrNumber],
        ["Payment Date", date ? formatDate(date) : null], ["Receipt Number", receiptNo],
        ["Remaining Balance", balance != null ? formatCurrency(balance) : "Unavailable — refresh the fee account"],
        ["Status", state.replaceAll("_", " ")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Unavailable"}</dd></div>)}
    </dl>
    {paid ? (
      <div className="cms-fee-note" role="status">
        <p style={{ margin: 0 }}>
          {emailLabels[email] || emailLabels.UNKNOWN}
          {payment.emailSentAt ? ` (${formatDate(payment.emailSentAt)})` : ""}
        </p>
        {email === "FAILED" && payment.emailFailureReason ? (
          <p style={{ margin: "4px 0 0", color: "#b91c1c" }}>{payment.emailFailureReason}</p>
        ) : null}
        {retryFeedback ? <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{retryFeedback}</p> : null}
      </div>
    ) : null}
    {!canRead ? <p className="cms-fee-note">An official receipt requires a confirmed saved payment ID and receipt number. Check Payment History.</p> : null}
    {loading ? <p role="status">Loading official PDF receipt...</p> : null}
    {error ? <p role="alert" className="cms-error">{error}</p> : null}
    {pdf ? <iframe ref={frame} title="Official payment receipt" src={pdf} style={{ width: "100%", height: "55vh", border: 0 }} onLoad={() => { if (autoPrint) print(); }} /> : null}
  </Modal>;
}
