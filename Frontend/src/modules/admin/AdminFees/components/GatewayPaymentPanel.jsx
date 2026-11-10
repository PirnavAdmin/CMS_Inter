import { useEffect, useRef, useState } from "react";
import { CheckCircle, Copy, CreditCard, QrCode } from "lucide-react";
import { feePaymentGatewayApi, loadRazorpayCheckout } from "@/api/feePaymentGatewayApi.js";
import { getApiErrorMessage } from "@/api/axios.js";
import { formatCurrency, todayISO, COLLEGE_NAME } from "@/data/feeManagementData.js";
import { collectionPayload, mobilePaymentLinkFor } from "../services/paymentGatewaySession.js";
import { usePaymentPolling } from "../hooks/usePaymentPolling.js";

export default function GatewayPaymentPanel({
  mode,
  account,
  target,
  selectedIds,
  amount,
  onSaved,
  onPending,
  onLockChange,
}) {
  const [order, setOrder] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [linkCopy, setLinkCopy] = useState({ busy: false, message: "", error: "" });
  const [submitted, setSubmitted] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [draft, setDraft] = useState({
    utrNumber: "",
    bankName: "",
    paymentDate: todayISO(),
    remarks: "",
  });
  const controllerRef = useRef(null);
  const checkoutRef = useRef(null);
  const guard = useRef(false);
  const completed = useRef(false);
  const alive = useRef(true);
  const successTimer = useRef(null);
  const audioRef = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controllerRef.current?.abort();
      clearTimeout(successTimer.current);
      checkoutRef.current?.close();
      audioRef.current?.close().catch(() => {});
    };
  }, []);
  const complete = (payment) => {
    if (!alive.current || completed.current) return;
    completed.current = true;
    checkoutRef.current?.close();
    setNotice("Payment confirmed by the backend. Opening receipt…");
    try {
      const audio = audioRef.current;
      if (audio?.state === "running") {
        const osc = audio.createOscillator(),
          gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audio.currentTime);
        osc.frequency.setValueAtTime(880, audio.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 0.6);
      }
    } catch {
      /* Audio permissions do not affect settlement. */
    }
    successTimer.current = window.setTimeout(() => {
      if (alive.current)
        onSaved({
          ...payment,
          receiptNo: payment.receiptNumber || "",
          method: mode === "UPI_QR" ? "UPI" : "Razorpay",
          reference: payment.transactionId || "",
          gatewayConfirmed: true,
        });
    }, 1200);
  };
  const polling = usePaymentPolling(completed.current ? null : order, attempt, complete);
  useEffect(() => {
    setLinkCopy({ busy: false, message: "", error: "" });
  }, [order?.orderId]);
  const locked = busy || Boolean(order) || submitted || uncertain || completed.current;
  useEffect(() => {
    onLockChange(locked);
  }, [locked, onLockChange]);
  const primeAudio = () => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio && !audioRef.current) audioRef.current = new Audio();
      audioRef.current?.resume().catch(() => {});
    } catch {
      /* Optional chime. */
    }
  };
  const run = async (action) => {
    if (guard.current || completed.current || submitted || uncertain) return;
    guard.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      await action(controller.signal);
    } catch (failure) {
      if (!alive.current || controller.signal.aborted) return;
      setError(getApiErrorMessage(failure));
      if (!failure.gatewayRetrySafe && (!failure.response || failure.response.status >= 500))
        setUncertain(true);
    } finally {
      if (alive.current) {
        guard.current = false;
        setBusy(false);
      }
    }
  };
  const startOrder = () => {
    let payload;
    try {
      payload = collectionPayload(account, target, selectedIds, amount);
    } catch (failure) {
      setError(failure.message);
      return;
    }
    primeAudio();
    run(async (signal) => {
      const Checkout = mode === "RAZORPAY" ? await loadRazorpayCheckout() : null;
      if (signal.aborted) return;
      const data = await feePaymentGatewayApi.createOrder(
        { ...payload, paymentMethod: mode },
        signal,
      );
      if (signal.aborted) return;
      if (
        !data.orderId ||
        !Number.isFinite(Number(data.amount)) ||
        Math.abs(Number(data.amount) - payload.amount) > 0.005 ||
        data.currency !== "INR"
      )
        throw new Error(
          "The backend returned incomplete or mismatched order details. Review payment history before retrying.",
        );
      if (
        mode === "UPI_QR" &&
        (!/^data:image\/png;base64,[A-Za-z0-9+/=\s]+$/.test(data.qrCodeBase64 || "") ||
          !String(data.upiUri).startsWith("upi://pay?"))
      )
        throw new Error("The backend did not return a valid UPI QR and URI.");
      if (mode === "RAZORPAY" && !data.keyId)
        throw new Error("The backend did not return the Razorpay public key.");
      const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : undefined;
      const currentOrder = {
        ...data,
        ...payload,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
      };
      setOrder(currentOrder);
      if (!Checkout) return;
      const checkout = new Checkout({
        key: data.keyId,
        order_id: data.orderId,
        amount: Math.round(Number(data.amount) * 100),
        currency: data.currency,
        name: COLLEGE_NAME,
        description: `Fee payment for ${account.studentName}`,
        prefill: { name: account.studentName },
        modal: {
          ondismiss: () => {
            if (alive.current && !completed.current)
              setNotice("Checkout closed. Checking this order for any completed payment.");
          },
        },
        handler: async (result) => {
          if (!alive.current || completed.current || guard.current) return;
          if (
            result.razorpay_order_id !== currentOrder.orderId ||
            !result.razorpay_payment_id ||
            !result.razorpay_signature
          ) {
            setError("Checkout returned invalid payment details.");
            return;
          }
          run(async (verifySignal) => {
            const verified = await feePaymentGatewayApi.verify(
              {
                orderId: currentOrder.orderId,
                razorpayPaymentId: result.razorpay_payment_id,
                razorpaySignature: result.razorpay_signature,
                studentFeeId: payload.studentFeeId,
                amount: payload.amount,
              },
              verifySignal,
            );
            if (verifySignal.aborted || completed.current) return;
            // The supplied verify contract returns success + receipt, without isPaid/status.
            if (
              verified.success === true &&
              verified.receiptNumber &&
              Number.isFinite(Number(verified.amount)) &&
              Math.abs(Number(verified.amount) - payload.amount) < 0.005 &&
              verified.isPaid !== false &&
              (!verified.orderId || verified.orderId === currentOrder.orderId) &&
              (!verified.studentFeeId || Number(verified.studentFeeId) === payload.studentFeeId) &&
              (!verified.status ||
                ["paid", "captured", "settled", "completed", "success"].includes(
                  String(verified.status).toLowerCase(),
                ))
            )
              complete(verified);
            else setNotice("Verification is pending. Awaiting confirmed backend settlement.");
          });
        },
      });
      checkoutRef.current = checkout;
      checkout.on("payment.failed", (result) => {
        if (alive.current && !completed.current)
          setError(
            result.error?.description ||
              "Checkout failed. Checking backend settlement before retrying.",
          );
      });
      checkout.open();
    });
  };
  const submitUtr = () => {
    let payload;
    try {
      payload = collectionPayload(account, target, selectedIds, amount);
      if (target !== "full")
        throw new Error(
          "The bank-transfer API credits the fee account and has no installment-selection field. Choose Full Remaining Balance; schedule allocation is handled on approval.",
        );
      if (!/^[A-Za-z0-9]{6,100}$/.test(draft.utrNumber.trim()))
        throw new Error("Enter a valid UTR/reference with 6–100 letters or digits.");
      if (
        !draft.paymentDate ||
        !Number.isFinite(new Date(draft.paymentDate).getTime()) ||
        draft.paymentDate > todayISO()
      )
        throw new Error("Enter a valid transfer date that is not in the future.");
    } catch (failure) {
      setError(failure.message);
      return;
    }
    run(async (signal) => {
      const { feeInstallmentIds, ...accountPayload } = payload;
      await feePaymentGatewayApi.submitUtr(
        {
          ...accountPayload,
          ...draft,
          utrNumber: draft.utrNumber.trim(),
          bankName: draft.bankName.trim() || null,
          remarks: draft.remarks.trim() || null,
        },
        signal,
      );
      if (signal.aborted) return;
      setSubmitted(true);
      setNotice("UTR submitted for verification. Fees will be credited only after approval.");
      onPending();
    });
  };
  const copyUri = async () => {
    try {
      await navigator.clipboard.writeText(order.upiUri);
      setNotice("UPI URI copied.");
    } catch {
      setError("Clipboard access was denied. Copy the UPI URI shown below.");
    }
  };
  const mobileLink = order ? mobilePaymentLinkFor(order.paymentLink, order) : "";
  const copyMobileLink = async () => {
    if (!mobileLink || linkCopy.busy) return;
    setLinkCopy({ busy: true, message: "", error: "" });
    try {
      await navigator.clipboard.writeText(mobileLink);
      if (alive.current)
        setLinkCopy({ busy: false, message: "Mobile payment link copied.", error: "" });
    } catch {
      if (alive.current)
        setLinkCopy({
          busy: false,
          message: "",
          error: "Clipboard access was denied. Copy the mobile payment link shown below.",
        });
    }
  };
  return (
    <section className="cms-fee-gateway" aria-label="Gateway collection">
      {mode === "BANK_TRANSFER" ? (
        <>
          <p className="cms-fee-note">
            Bank transfers remain pending until verified. Choose Full Remaining Balance to pay
            toward the fee account; you can enter a smaller amount. Schedule allocation is handled
            by the backend on approval.
          </p>
          <div className="cms-form-grid cols-2">
            {[
              ["utrNumber", "UTR / Reference Number", "text"],
              ["bankName", "Bank Name", "text"],
              ["paymentDate", "Transfer Date", "date"],
              ["remarks", "Remarks", "text"],
            ].map(([key, label, type]) => (
              <div className="cms-field" key={key}>
                <label htmlFor={`gateway-${key}`}>{label}</label>
                <input
                  id={`gateway-${key}`}
                  type={type}
                  max={type === "date" ? todayISO() : undefined}
                  maxLength={key === "utrNumber" ? 100 : key === "remarks" ? 500 : 100}
                  disabled={locked}
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={locked}
            onClick={submitUtr}
          >
            {busy
              ? "Submitting…"
              : submitted
                ? "Pending Verification"
                : "Submit UTR for Verification"}
          </button>
        </>
      ) : (
        <>
          {!order ? (
            <div className="cms-fee-gateway-start">
              <p>
                {mode === "UPI_QR"
                  ? "Generate a QR for the selected amount. Payment is confirmed only after backend settlement."
                  : "Pay securely by card or netbanking through Razorpay Checkout."}
              </p>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={busy || uncertain}
                onClick={startOrder}
              >
                {mode === "UPI_QR" ? <QrCode size={16} /> : <CreditCard size={16} />}
                {busy
                  ? "Preparing…"
                  : mode === "UPI_QR"
                    ? "Generate UPI QR"
                    : "Launch Razorpay Checkout"}
              </button>
            </div>
          ) : (
            <div className="cms-fee-gateway-order">
              {mode === "UPI_QR" &&
                !order.monitorOnly &&
                polling.status !== "FAILED" &&
                polling.status !== "TIMEOUT" && (
                  <img
                    src={order.qrCodeBase64}
                    alt={`UPI QR for ${formatCurrency(order.amount)}`}
                  />
                )}
              <strong>{formatCurrency(order.amount)}</strong>
              <code>{order.orderId}</code>
              {completed.current ? (
                <span className="cms-badge cms-badge-active">
                  <CheckCircle size={16} /> Payment confirmed
                </span>
              ) : (
                <p role="status">
                  {polling.status === "PENDING"
                    ? "Awaiting backend payment confirmation"
                    : polling.status}{" "}
                  · {order.expiresAt ? "QR expires in" : "Monitoring time remaining"}{" "}
                  {Math.floor(polling.secondsLeft / 60)}:
                  {String(polling.secondsLeft % 60).padStart(2, "0")}
                </p>
              )}
              {mode === "UPI_QR" && !order.monitorOnly && polling.status === "PENDING" && (
                <>
                  <button type="button" className="cms-btn cms-btn-ghost" onClick={copyUri}>
                    <Copy size={14} /> Copy UPI URI
                  </button>
                  <input aria-label="UPI payment URI" readOnly value={order.upiUri} />
                </>
              )}
              {mode === "UPI_QR" &&
                mobileLink &&
                !order.monitorOnly &&
                polling.status === "PENDING" && (
                  <div className="cms-fee-mobile-payment-link">
                    <label htmlFor="gateway-mobile-link">Mobile Payment Link</label>
                    <input id="gateway-mobile-link" readOnly value={mobileLink} />
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={copyMobileLink}
                      disabled={linkCopy.busy}
                    >
                      <Copy size={14} />
                      {linkCopy.busy ? "Copying…" : "Copy Mobile Payment Link"}
                    </button>
                    <p className="cms-fee-note">
                      Mobile checkout is not available in this frontend build. The payment page,
                      access controls and network availability must be verified before this link is
                      used.
                    </p>
                    {linkCopy.message && <p role="status">{linkCopy.message}</p>}
                    {linkCopy.error && (
                      <p className="cms-error" role="alert">
                        {linkCopy.error}
                      </p>
                    )}
                  </div>
                )}
              {["TIMEOUT", "ERROR"].includes(polling.status) && (
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => {
                    setOrder((current) => ({
                      ...current,
                      expiresAt: undefined,
                      monitorOnly: true,
                    }));
                    setAttempt((value) => value + 1);
                  }}
                >
                  Check This Order Again
                </button>
              )}
              {polling.status === "FAILED" && (
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => {
                    setOrder(null);
                    setUncertain(false);
                    setError("");
                  }}
                >
                  Start New Payment
                </button>
              )}
              <p className="cms-fee-note">
                Closing this window stops monitoring. It does not cancel an order or reverse a
                payment. Check payment history before collecting again.
              </p>
            </div>
          )}
        </>
      )}
      {notice && (
        <p role="status" className="cms-fee-note">
          {notice}
        </p>
      )}
      {(error || polling.error) && (
        <p role="alert" className="cms-error">
          {error || polling.error}
        </p>
      )}
      {uncertain && (
        <p role="alert" className="cms-error">
          The request outcome is uncertain. Review payment history or the pending UTR queue before
          submitting another payment.
        </p>
      )}
    </section>
  );
}
