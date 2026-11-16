import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eye, RefreshCw, X } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Modal, SkeletonRow } from "@/shared/components/Ui.jsx";
import { feePaymentGatewayApi } from "@/api/feePaymentGatewayApi.js";
import { getApiErrorMessage } from "@/api/axios.js";
import { formatCurrency, formatDate } from "@/data/feeManagementData.js";
import { UTR_SUBMITTED_EVENT } from "../services/paymentGatewaySession.js";
import PaymentConfirmation from "./PaymentConfirmation.jsx";

export default function OfflineUtrQueueTab({
  scope,
  canView,
  canReview,
  onSettled,
  onToast,
  Pagination,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(canView));
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [review, setReview] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [proof, setProof] = useState(null);
  const proofRequest = useRef(null);
  const proofUrl = useRef(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [uncertain, setUncertain] = useState(new Set());
  const guard = useRef(false);
  const mutation = useRef(null);
  const reviewActive = useRef(false);
  const refreshPending = useRef(false);
  reviewActive.current = processing || Boolean(review);
  const accessRef = useRef(canReview);
  accessRef.current = canReview;
  const scopeKey = JSON.stringify(scope);
  useEffect(() => () => {
    proofRequest.current?.abort();
    proofRequest.current = null;
    if (proofUrl.current) URL.revokeObjectURL(proofUrl.current);
    proofUrl.current = null;
  }, [scopeKey, canView]);
  const closeProof = () => {
    proofRequest.current?.abort(); proofRequest.current = null;
    if (proofUrl.current) URL.revokeObjectURL(proofUrl.current);
    proofUrl.current = null;
    setProof(null);
  };
  const viewProof = async row => {
    if (!canView || proofRequest.current) return;
    const controller = new AbortController();
    proofRequest.current = controller;
    setProof({ row, scopeKey, loading: true });
    try {
      // Use only the documented, authenticated ID route; never trust arbitrary response URLs.
      const blob = await feePaymentGatewayApi.paymentProof(row.attachmentId, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      if (proofUrl.current) URL.revokeObjectURL(proofUrl.current);
      proofUrl.current = url;
      setProof({ row, scopeKey, url, type: blob.type, loading: false });
    } catch (failure) {
      if (!controller.signal.aborted) setProof({ row, scopeKey, loading: false, error: `Payment proof unavailable: ${getApiErrorMessage(failure)}` });
    } finally {
      if (proofRequest.current === controller) proofRequest.current = null;
    }
  };
  const renderProof = (row, withActions = true) => {
    if (!Number.isSafeInteger(Number(row.attachmentId)) || Number(row.attachmentId) <= 0)
      return <p className="cms-fee-note">No payment proof attached.</p>;
    const current = proof?.scopeKey === scopeKey && String(proof.row.id) === String(row.id) ? proof : null;
    return <>
      <p className="cms-fee-note">{row.attachmentFileName || "Payment proof"} · Uploaded: {row.attachmentUploadedAt ? formatDate(row.attachmentUploadedAt) : "Unavailable"}</p>
      {!current ? <button type="button" className="cms-btn cms-btn-ghost" disabled={!canView} onClick={() => viewProof(row)}>View Payment Proof</button> : null}
      {current?.loading ? <p role="status">Loading private payment proof...</p> : null}
      {current?.error ? <p role="alert" className="cms-error">{current.error}</p> : null}
      {current?.url && current.type === "application/pdf" ? <iframe title="Payment proof PDF" sandbox="" src={current.url} style={{ width: "100%", height: "55vh", border: 0 }} />
        : current?.url ? <img className="cms-fee-proof-preview" src={current.url} alt="Submitted payment proof" /> : null}
      {withActions && current?.url ? <div className="cms-actions"><a className="cms-btn cms-btn-ghost" href={current.url} target="_blank" rel="noopener noreferrer">Open Payment Proof</a>
        <a className="cms-btn cms-btn-ghost" href={current.url} download={String(row.attachmentFileName || "Payment_Proof").replace(/[\\/:*?"<>|]/g, "_")}>Download Payment Proof</a></div> : null}
    </>;
  };
  const closeReview = () => {
    if (processing) return;
    setReview(null);
    closeProof();
  };
  useEffect(() => {
    const refresh = () => {
      if (reviewActive.current) { refreshPending.current = true; return; }
      setVersion(value => value + 1);
    };
    window.addEventListener?.(UTR_SUBMITTED_EVENT, refresh);
    return () => window.removeEventListener?.(UTR_SUBMITTED_EVENT, refresh);
  }, []);
  useEffect(() => {
    if (!processing && !review && refreshPending.current) {
      refreshPending.current = false;
      setVersion(value => value + 1);
    }
  }, [processing, review]);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setPage(1);
    setReview(null);
    setError("");
    setLoadError("");
    setProcessing(false);
    setLoading(canView);
    if (canView)
      feePaymentGatewayApi
        .pendingUtrs(JSON.parse(scopeKey), controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) setItems(rows);
        })
        .catch((failure) => {
          if (!controller.signal.aborted) setLoadError(getApiErrorMessage(failure));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    return () => {
      controller.abort();
      mutation.current?.abort();
      guard.current = false;
    };
  }, [scopeKey, version, canView]);
  const confirm = async () => {
    if (guard.current || !review || !accessRef.current || uncertain.has(review.id)) return;
    if (review.action === "Reject" && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    guard.current = true;
    setProcessing(true);
    setError("");
    const controller = new AbortController();
    mutation.current = controller;
    try {
      const result = await feePaymentGatewayApi.approveUtr(
        { transactionId: Number(review.id), action: review.action, reason: reason.trim() || null },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const approved = review.action === "Approve";
      if (approved && (result.success !== true || !result.receiptNumber || !Number.isSafeInteger(Number(result.feePaymentId)) || Number(result.feePaymentId) <= 0 || !(Number(result.amount) > 0) || Math.abs(Number(result.amount) - Number(review.amount)) > 0.005)) {
        throw new Error("Approval was acknowledged without confirmed payment and receipt details. Check payment history before repeating approval.");
      }
      refreshPending.current = false;
      setItems((current) => current.filter((item) => String(item.id) !== String(review.id)));
      setReview(null);
      closeProof();
      setVersion((value) => value + 1);
      onToast(approved ? "UTR approved by the backend; refreshing fee records." : "UTR rejected.");
      setNotice(approved ? "Payment Successful. Approval and settlement confirmed by the backend." : "Payment Rejected. The verification request was rejected; no payment credit was applied.");
      if (approved) {
        const payment = { ...review, ...result, gatewayConfirmed: true, reference: review.utrNumber,
          paymentDate: review.paymentDate, method: review.paymentMethod || "Bank Transfer / UTR" };
        setConfirmed(payment);
        onSettled(payment);
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(getApiErrorMessage(failure));
        if (!failure.response || failure.response.status >= 500) {
          setUncertain((current) => new Set([...current, review.id]));
          setReview(null);
          closeProof();
          setError(
            `${getApiErrorMessage(failure)} Outcome uncertain; refresh and review payment history before repeating this action.`,
          );
        }
      }
    } finally {
      guard.current = false;
      if (!controller.signal.aborted) setProcessing(false);
    }
  };
  const rows = items.filter(
    (item) =>
      !search.trim() ||
      [item.studentName, item.admissionNo, item.utrNumber, item.bankName].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 5));
  useEffect(() => {
    setPage((current) => Math.min(current, pages));
  }, [pages]);
  return (
    <div className="cms-card cms-fee-utr-queue">
      <div className="cms-card-head">
        <h2>Pending UTR Queue</h2>
        <button
          type="button"
          className="cms-btn cms-btn-ghost"
          disabled={loading || processing || !canView}
          onClick={() => {
            setProcessing(false);
            setVersion((value) => value + 1);
          }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      <div className="cms-card-body cms-fee-toolbar">
        <div className="cms-fee-search">
          <input
            aria-label="Search pending UTRs"
            placeholder="Search student, admission number or UTR"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {!canView && <p className="cms-error">Fee Management view permission is required.</p>}
        {notice ? <p role="status" className="cms-fee-note">{notice}</p> : null}
        {loadError && <p className="cms-error" role="alert">Unable to load pending UTR requests: {loadError}</p>}
        {error && (
          <p className="cms-error" role="alert">
            {error}
          </p>
        )}
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                <th className="num">Amount</th>
                <th>UTR / Reference</th>
                <th>Bank</th>
                <th>Payment Date / Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={8} />)
                : canView && !loadError ? rows.slice((page - 1) * 5, page * 5).map((row, index) => (
                    <tr key={row.id || index}>
                      <td>
                        <strong>{row.studentName || "-"}</strong>
                        <small>{row.studentFeeId ? ` Fee ID: ${row.studentFeeId}` : ""}{row.campusName || row.campusId ? ` · Campus: ${row.campusName || row.campusId}` : ""}{row.paymentMethod ? ` · ${row.paymentMethod}` : ""}</small>
                      </td>
                      <td>{row.admissionNo || row.admissionNumber || "-"}</td>
                      <td className="num">{formatCurrency(row.amount)}</td>
                      <td>{row.utrNumber || "-"}</td>
                      <td>{row.bankName || "-"}</td>
                      <td>{row.paymentDate ? formatDate(row.paymentDate) : "Payment date unavailable"}<br /><small>Submitted: {formatDate(row.submittedAt || row.submittedAtUtc || row.createdAt || row.date)}</small></td>
                      <td>
                        <span className="cms-badge cms-badge-warn">
                          {row.status || "Pending Verification"}
                        </span>
                      </td>
                      <td>
                        <Tooltip.Provider delayDuration={200}>
                        <div className="cms-actions">
                          {Number.isSafeInteger(Number(row.attachmentId)) && Number(row.attachmentId) > 0 ? <Tooltip.Root>
                            <Tooltip.Trigger asChild><button type="button" className="cms-action-btn view" aria-label="View Payment Proof" disabled={!canView} onClick={() => viewProof(row)}><Eye size={15} aria-hidden="true" /></button></Tooltip.Trigger>
                            <Tooltip.Portal><Tooltip.Content className="cms-fee-utr-tooltip" side="top" sideOffset={6} collisionPadding={8} hideWhenDetached>View Payment Proof</Tooltip.Content></Tooltip.Portal>
                          </Tooltip.Root> : null}
                          {["Approve", "Reject"].map((action) => (
                            <Tooltip.Root key={action}>
                            <Tooltip.Trigger asChild>
                            <button
                              type="button"
                              className={`cms-action-btn ${action === "Approve" ? "edit" : "danger"}`}
                              aria-label={action === "Approve" ? "Approve & Credit" : "Reject"}
                              disabled={
                                !canReview ||
                                processing ||
                                uncertain.has(row.id) ||
                                !Number.isSafeInteger(Number(row.id)) ||
                                Number(row.id) <= 0
                              }
                              onClick={() => {
                                closeProof();
                                setReview({ ...row, action });
                                setReason("");
                                setError("");
                                if (Number.isSafeInteger(Number(row.attachmentId)) && Number(row.attachmentId) > 0) viewProof(row);
                              }}
                            >
                              {action === "Approve" ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                            </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal><Tooltip.Content className="cms-fee-utr-tooltip" side="top" sideOffset={6} collisionPadding={8} hideWhenDetached>{action === "Approve" ? "Approve & Credit" : "Reject"}</Tooltip.Content></Tooltip.Portal>
                            </Tooltip.Root>
                          ))}
                        </div>
                        </Tooltip.Provider>
                      </td>
                    </tr>
                  )) : null}
              {!loading && canView && loadError && <tr><td colSpan={8} className="cms-fee-empty-row">Pending UTR requests could not be loaded. Use Refresh to try again.</td></tr>}
              {!loading && canView && !loadError && !rows.length && (
                <tr>
                  <td colSpan={8} className="cms-fee-empty-row">
                    {search.trim() ? "No pending UTR transactions match your search." : "No pending UTR transactions."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {canView && !loading && !loadError ? <Pagination page={page} totalItems={rows.length} onPageChange={setPage} /> : null}
      </div>
      {proof && !review && canView && proof.scopeKey === scopeKey ? <Modal title="Payment Proof" onClose={closeProof} footer={<>
        <button type="button" className="cms-btn cms-btn-ghost" onClick={closeProof}>Close</button>
        {proof.url ? <><a className="cms-btn cms-btn-ghost" href={proof.url} target="_blank" rel="noopener noreferrer">Open Payment Proof</a>
          <a className="cms-btn cms-btn-primary" href={proof.url} download={String(proof.row.attachmentFileName || "Payment_Proof").replace(/[\\/:*?"<>|]/g, "_")}>Download Payment Proof</a></> : null}
      </>}>
        <dl className="cms-fee-reversal-details">{[["UTR", proof.row.utrNumber], ["Amount", formatCurrency(proof.row.amount)], ["Payment Date", proof.row.paymentDate ? formatDate(proof.row.paymentDate) : "Unavailable"], ["File", proof.row.attachmentFileName || "Payment proof"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {renderProof(proof.row, false)}
      </Modal> : null}
      {confirmed ? <PaymentConfirmation payment={confirmed} onClose={() => setConfirmed(null)} /> : null}
      {review && canView && (
        <Modal
          title={review.action === "Approve" ? "Approve Bank Transfer" : "Reject Bank Transfer"}
          size="sm"
          onClose={closeReview}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={processing}
                onClick={closeReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={processing || !canReview}
                onClick={confirm}
              >
                {processing ? "Processing…" : review.action}
              </button>
            </>
          }
        >
          <p>
            {review.studentName} · {formatCurrency(review.amount)} · UTR {review.utrNumber}
          </p>
          <dl className="cms-fee-reversal-details">{[["Student", review.studentName], ["Admission Number", review.admissionNo || review.admissionNumber], ["UTR / Reference", review.utrNumber], ["Amount", formatCurrency(review.amount)], ["Bank / Payment App", review.bankName], ["Payment Date", review.paymentDate ? formatDate(review.paymentDate) : "Unavailable"], ["Submitted", formatDate(review.submittedAt || review.submittedAtUtc || review.createdAt || review.date)], ["Payment Order", review.orderId || "Unavailable"], ["Status", review.status]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Unavailable"}</dd></div>)}</dl>
          {renderProof(review)}
          <p className="cms-fee-note">Compare the UTR and amount with independently verified bank/payment records before approving. A screenshot alone does not confirm receipt of payment.</p>
          <div className="cms-field">
            <label htmlFor="utr-review-reason">
              {review.action === "Reject" ? "Rejection Reason (required)" : "Review Note"}
            </label>
            <textarea
              id="utr-review-reason"
              value={reason}
              disabled={processing}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          {error && (
            <p className="cms-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
