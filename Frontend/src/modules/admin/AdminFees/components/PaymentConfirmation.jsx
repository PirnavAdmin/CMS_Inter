import { useEffect, useRef, useState } from "react";
import { Download, FileText } from "lucide-react";
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
  const [printing, setPrinting] = useState(autoPrint);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [freshBalance, setFreshBalance] = useState(null);
  const [retryingEmail, setRetryingEmail] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState("");
  const [emailRefreshFailed, setEmailRefreshFailed] = useState(false);
  const frame = useRef(null);
  const pdfOwner = useRef(null);
  const receiptNo = payment.receiptNumber || payment.receiptNo;
  const canRead = Boolean(id && receiptNo && (paid || /reversed|refunded/i.test(payment.status || "")));

  useEffect(() => {
    const controller = new AbortController();
    setDetails(null);
    setRetryFeedback("");
    setEmailRefreshFailed(false);
    if (Number.isSafeInteger(Number(id)) && Number(id) > 0) {
      Promise.allSettled([
        apiClient.get(apiEndpoints.fee.paymentDetails(id), { signal: controller.signal, requireRealBackend: true, skipGlobalLoader: true }),
        typeof feePaymentGatewayApi.paymentStatus === "function"
          ? feePaymentGatewayApi.paymentStatus(id, controller.signal)
          : Promise.resolve(null),
      ]).then(([paymentRes, notifRes]) => {
        if (controller.signal.aborted) return;
        const base = paymentRes.status === "fulfilled" ? gatewayData(paymentRes.value.data) : {};
        const refreshed = notifRes.status === "fulfilled" && Number(notifRes.value?.feePaymentId) === Number(id);
        setEmailRefreshFailed(!refreshed);
        const notif = refreshed ? { ...notifRes.value,
          emailDeliveryStatus: notifRes.value.emailDeliveryStatus ?? notifRes.value.emailStatus ?? "UNKNOWN",
          emailSentAt: notifRes.value.emailSentAt ?? null,
        } : {};
        const merged = { ...base, ...notif };
        if (Number(merged.feePaymentId) === Number(id)) setDetails(merged);
      }).catch(() => { if (!controller.signal.aborted) setEmailRefreshFailed(true); });
    } else setEmailRefreshFailed(true);
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    let url;
    setPdf(""); setPrinting(autoPrint); setError(""); setLoading(canRead);
    if (canRead) feePaymentGatewayApi.receiptPdf(id, controller.signal)
      .then(blob => { if (!controller.signal.aborted) { url = URL.createObjectURL(blob); pdfOwner.current = id; setPdf(url); } })
      .catch(failure => { if (!controller.signal.aborted) setError(`Official receipt unavailable: ${getApiErrorMessage(failure)}`); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [id, canRead, version, autoPrint]);

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
    FAILED: "Email Sending Failed",
    NOT_REQUESTED: "Email Not Requested",
    UNKNOWN: "Email Status Unavailable",
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
  const receiptPdf = pdfOwner.current === id ? pdf : "";
  const filename = `Fee_Receipt_${String(receiptNo || id).replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
  const print = () => {
    try {
      if (!frame.current?.contentWindow) throw new Error("Receipt is not ready");
      frame.current.contentWindow.focus();
      frame.current.contentWindow.print();
    } catch { setError("Use View Receipt to print the official PDF in your browser."); }
  };

  return <Modal title={paid ? "Payment Successful" : "Payment Details"} onClose={onClose} footer={<div className="cms-payment-confirmation-footer">
    <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
    <div className="cms-payment-confirmation-actions">
    {receiptPdf ? <><a className="cms-btn cms-btn-ghost" href={receiptPdf} target="_blank" rel="noopener noreferrer">View Receipt</a>
      <button type="button" className="cms-btn cms-btn-ghost" onClick={() => { if (printing && frame.current) print(); else setPrinting(true); }}>Print Receipt</button></> : null}
    {paid && email === "FAILED" ? (
      <button type="button" className="cms-btn cms-btn-ghost" disabled={retryingEmail} onClick={handleRetryEmail}>{retryingEmail ? "Retrying Email..." : "Retry Email"}</button>
    ) : null}
    {error && canRead ? <button type="button" className="cms-btn cms-btn-ghost" disabled={loading} onClick={() => setVersion(value => value + 1)}>Retry Receipt</button> : null}
    </div>
  </div>}>
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
          {email === "SENT" && payment.emailSentAt ? ` (${formatDate(payment.emailSentAt)})` : ""}
          {emailRefreshFailed && email !== "UNKNOWN" ? " (previously retrieved information)" : ""}
        </p>
        {email !== "SENT" && payment.emailSentAt && ["QUEUED", "FAILED"].includes(email) ? <p style={{ margin: "4px 0 0" }}>Last sent: {formatDate(payment.emailSentAt)}</p> : null}
        {emailRefreshFailed ? <p role="alert" style={{ margin: "4px 0 0", fontSize: 12 }}>Unable to refresh email status. The displayed information may be outdated.</p> : null}
        {email === "SENT" ? <p style={{ margin: "4px 0 0", fontSize: 12 }}>Email sent through the configured mail service. Inbox delivery is not confirmed.</p> : null}
        {email === "FAILED" && payment.emailFailureReason ? (
          <p style={{ margin: "4px 0 0", color: "#b91c1c" }}>{payment.emailFailureReason}</p>
        ) : null}
        {retryFeedback ? <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{retryFeedback}</p> : null}
      </div>
    ) : null}
    {!canRead ? <p className="cms-fee-note">An official receipt requires a confirmed saved payment ID and receipt number. Check Payment History.</p> : null}
    {loading ? <p role="status">Loading official PDF receipt...</p> : null}
    {error ? <p role="alert" className="cms-error">{error}</p> : null}
    {canRead && <div className="cms-payment-confirmation-attachment">
      <FileText size={28} aria-hidden="true" />
      <div><strong>{filename}</strong><span>Official payment receipt</span></div>
      {receiptPdf ? <a className="cms-btn cms-btn-primary" href={receiptPdf} download={filename} aria-label={`Download ${filename}`}><Download size={18} aria-hidden="true" /></a>
        : <button type="button" className="cms-btn cms-btn-primary" disabled aria-label="Download receipt unavailable"><Download size={18} aria-hidden="true" /></button>}
    </div>}
    {receiptPdf && printing ? <iframe ref={frame} title="Official payment receipt for printing" src={receiptPdf} className="cms-payment-confirmation-print" tabIndex={-1} aria-hidden="true" onLoad={print} /> : null}
  </Modal>;
}
