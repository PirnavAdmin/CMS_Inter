import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { Modal, SkeletonRow } from "@/shared/components/Ui.jsx";
import { feePaymentGatewayApi } from "@/api/feePaymentGatewayApi.js";
import { getApiErrorMessage } from "@/api/axios.js";
import { formatCurrency, formatDate } from "@/data/feeManagementData.js";

export default function OfflineUtrQueueTab({
  scope,
  canView,
  canReview,
  onSettled,
  onToast,
  Pagination,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [uncertain, setUncertain] = useState(new Set());
  const guard = useRef(false);
  const mutation = useRef(null);
  const accessRef = useRef(canReview);
  accessRef.current = canReview;
  const scopeKey = JSON.stringify(scope);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setPage(1);
    setReview(null);
    setError("");
    setProcessing(false);
    setLoading(canView);
    if (canView)
      feePaymentGatewayApi
        .pendingUtrs(JSON.parse(scopeKey), controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) setItems(rows);
        })
        .catch((failure) => {
          if (!controller.signal.aborted) setError(getApiErrorMessage(failure));
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
      await feePaymentGatewayApi.approveUtr(
        { transactionId: Number(review.id), action: review.action, reason: reason.trim() || null },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const approved = review.action === "Approve";
      setItems((current) => current.filter((item) => String(item.id) !== String(review.id)));
      setReview(null);
      setVersion((value) => value + 1);
      onToast(approved ? "UTR approved by the backend; refreshing fee records." : "UTR rejected.");
      if (approved) onSettled();
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(getApiErrorMessage(failure));
        if (!failure.response || failure.response.status >= 500) {
          setUncertain((current) => new Set([...current, review.id]));
          setReview(null);
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
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={8} />)
                : rows.slice((page - 1) * 5, page * 5).map((row, index) => (
                    <tr key={row.id || index}>
                      <td>
                        <strong>{row.studentName || "-"}</strong>
                      </td>
                      <td>{row.admissionNo || row.admissionNumber || "-"}</td>
                      <td className="num">{formatCurrency(row.amount)}</td>
                      <td>{row.utrNumber || "-"}</td>
                      <td>{row.bankName || "-"}</td>
                      <td>{formatDate(row.date || row.paymentDate)}</td>
                      <td>
                        <span className="cms-badge cms-badge-warn">
                          {row.status || "Pending Verification"}
                        </span>
                      </td>
                      <td>
                        <div className="cms-actions">
                          {["Approve", "Reject"].map((action) => (
                            <button
                              key={action}
                              type="button"
                              className="cms-btn cms-btn-ghost cms-fee-mini-btn"
                              disabled={
                                !canReview ||
                                processing ||
                                uncertain.has(row.id) ||
                                !Number.isSafeInteger(Number(row.id)) ||
                                Number(row.id) <= 0
                              }
                              onClick={() => {
                                setReview({ ...row, action });
                                setReason("");
                                setError("");
                              }}
                            >
                              {action === "Approve" ? <Check size={14} /> : <X size={14} />}
                              {action === "Approve" ? "Approve & Credit" : "Reject"}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
              {!loading && !rows.length && (
                <tr>
                  <td colSpan={8} className="cms-fee-empty-row">
                    No pending UTR transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />
      </div>
      {review && (
        <Modal
          title={review.action === "Approve" ? "Approve Bank Transfer" : "Reject Bank Transfer"}
          size="sm"
          onClose={processing ? () => {} : () => setReview(null)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={processing}
                onClick={() => setReview(null)}
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
