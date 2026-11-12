import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Copy, CreditCard, QrCode, Upload } from "lucide-react";
import { feePaymentGatewayApi, getPaymentGatewayConfigApi, loadRazorpayCheckout } from "@/api/feePaymentGatewayApi.js";
import { getApiErrorMessage } from "@/api/axios.js";
import { formatCurrency, todayISO, COLLEGE_NAME } from "@/data/feeManagementData.js";
import { collectionPayload, directQrUtrPayload, isManualQrOrder, mobilePaymentLinkFor, UTR_SUBMITTED_EVENT, validatePaymentProof } from "../services/paymentGatewaySession.js";
import { usePaymentPolling } from "../hooks/usePaymentPolling.js";

const allowGatewayAction = () => true;

export default function GatewayPaymentPanel({
  mode,
  campusId,
  account,
  target,
  selectedIds,
  amount,
  onSaved,
  onPending,
  onLockChange,
  onFooterChange,
  authorize = allowGatewayAction,
}) {
  const [order, setOrder] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [linkCopy, setLinkCopy] = useState({ busy: false, message: "", error: "" });
  const [submitted, setSubmitted] = useState(false);
  const pendingSubmission = useRef(null);
  const [uncertain, setUncertain] = useState(false);
  const [configurationUnavailable, setConfigurationUnavailable] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationErrors, setVerificationErrors] = useState({});
  const [verificationDraft, setVerificationDraft] = useState({ utrNumber: "", bankName: "", paymentDate: todayISO(), amountPaid: "", remarks: "" });
  const submittedReferences = useRef(new Set());
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [proofValidating, setProofValidating] = useState(false);
  const proofInput = useRef(null);
  const proofSelection = useRef(0);
  const proofValidationBusy = useRef(false);
  const selectedProof = useRef(null);
  const verificationRequest = useRef(null);
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
          ...order,
          ...payment,
          receiptNo: payment.receiptNumber || "",
          method: mode === "UPI_QR" ? "UPI" : "Razorpay",
          reference: payment.transactionId || "",
          gatewayConfirmed: true,
        });
    }, 1200);
  };
  const isCompleted = completed.current;
  const monitoringOrder = useMemo(() => !order || isCompleted ? null : submitted
    ? { ...order, requiresManualUtr: false, expiresAt: undefined }
    : order, [order, isCompleted, submitted]);
  const polling = usePaymentPolling(monitoringOrder, attempt, complete);
  const canReconcile = mode === "UPI_QR" && isManualQrOrder(order) && !completed.current && !submitted
    && !["SUCCESS", "FAILED"].includes(polling.status);
  const openVerification = useCallback(() => {
    if (!canReconcile || busy || uncertain) return;
    setVerificationOpen(true);
    setVerificationErrors({});
    setError("");
  }, [canReconcile, busy, uncertain]);
  useEffect(() => {
    onFooterChange?.({ showDone: canReconcile && !verificationOpen, onDone: openVerification, disabled: busy || uncertain || !authorize(), busy });
  }, [onFooterChange, canReconcile, verificationOpen, openVerification, busy, uncertain, authorize]);
  useEffect(() => () => onFooterChange?.(null), [onFooterChange]);
  const orderId = order?.orderId;
  const orderAmount = order?.amount;
  useEffect(() => {
    if (!proofFile || !/^image\//.test(proofFile.type)) { setProofPreview(""); return; }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);
  useEffect(() => {
    setLinkCopy({ busy: false, message: "", error: "" });
    setVerificationOpen(false);
    setVerificationErrors({});
    proofSelection.current++;
    proofValidationBusy.current = false;
    selectedProof.current = null;
    verificationRequest.current = null;
    setProofFile(null);
    setProofValidating(false);
    setVerificationDraft({ utrNumber: "", bankName: "", paymentDate: todayISO(), amountPaid: orderId ? String(orderAmount) : "", remarks: "" });
  }, [orderId, orderAmount]);
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
    if (!authorize()) { setError("Fee collection permission is required. Refresh your permissions before continuing."); return; }
    guard.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      await action(controller.signal);
    } catch (failure) {
      if (!alive.current || controller.signal.aborted) return;
      setError(failure.gatewayConfigurationMessage || getApiErrorMessage(failure));
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
      const effectiveCampusId = account.campusId ?? campusId;
      let settings;
      try {
        if (account.campusId && Number(account.campusId) !== Number(campusId))
          throw new Error("This fee account belongs to another campus. Select its campus before collecting.");
        settings = await getPaymentGatewayConfigApi(effectiveCampusId, signal);
        if (mode === "UPI_QR" && (!settings.enableCounterUpiQr || !settings.payeeVpa || !settings.payeeName))
          throw new Error("Dynamic UPI QR is disabled or incomplete for this campus. Review Payment Settings.");
        if (mode === "RAZORPAY" && (!settings.enableRazorpay || !settings.razorpayKeyId || !settings.hasRazorpayKeySecret || !settings.hasRazorpayWebhookSecret))
          throw new Error("Razorpay is disabled or incomplete for this campus. Review Payment Settings.");
      } catch (failure) {
        failure.gatewayRetrySafe = true; // No order was submitted.
        if (failure.response?.status === 404)
          failure.gatewayConfigurationMessage = "Payment configuration API is unavailable (404). The backend team must deploy the gateway configuration and order endpoints. QR/Card collection is disabled; reopen after the backend is ready.";
        if (!signal.aborted) setConfigurationUnavailable(true);
        throw failure;
      }
      if (signal.aborted) return;
      const Checkout = mode === "RAZORPAY" ? await loadRazorpayCheckout() : null;
      if (signal.aborted) return;
      const orderRequest = { ...payload, paymentMethod: mode };
      if (effectiveCampusId && Number.isSafeInteger(Number(effectiveCampusId)))
        orderRequest.campusId = Number(effectiveCampusId);
      const data = await feePaymentGatewayApi.createOrder(orderRequest, signal);
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
        data.resolvedCampusId != null &&
        effectiveCampusId != null &&
        Number(data.resolvedCampusId) !== Number(effectiveCampusId)
      )
        throw new Error(
          "The backend resolved a different campus payment account. Refresh before retrying.",
        );
      if (
        mode === "UPI_QR" &&
        (!/^data:image\/png;base64,[A-Za-z0-9+/=\s]+$/.test(data.qrCodeBase64 || "") ||
          (Boolean(data.upiUri) && !String(data.upiUri).startsWith("upi://pay?")))
      )
        throw new Error("The backend did not return a valid UPI QR and URI.");
      if (mode === "RAZORPAY" && !data.keyId)
        throw new Error("The backend did not return the Razorpay public key.");
      const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : undefined;
      const currentOrder = {
        ...data,
        ...payload,
        campusId: Number(effectiveCampusId),
        campusName: data.resolvedCampusName || account.campusName,
        pollingIntervalMs: Number(settings.pollingIntervalMs),
        monitoringTimeoutSeconds: Number(settings.monitoringTimeoutSeconds),
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
      const result = await feePaymentGatewayApi.submitUtr(
        {
          ...accountPayload,
          ...(feeInstallmentIds?.length ? { feeInstallmentIds } : {}),
          ...draft,
          utrNumber: draft.utrNumber.trim(),
          bankName: draft.bankName.trim() || null,
          remarks: draft.remarks.trim() || null,
        },
        signal,
      );
      if (signal.aborted) return;
      pendingSubmission.current = result;
      setSubmitted(true);
      setNotice("Payment details submitted successfully. Your payment is pending verification.");
      if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(UTR_SUBMITTED_EVENT));
      onPending?.(pendingSubmission.current);
    });
  };
  const chooseProof = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const version = ++proofSelection.current;
    verificationRequest.current = null;
    proofValidationBusy.current = true;
    selectedProof.current = null;
    setProofFile(null);
    setProofValidating(true);
    setVerificationErrors(current => ({ ...current, attachment: "" }));
    try {
      const type = await validatePaymentProof(file);
      if (!alive.current || version !== proofSelection.current) return;
      // Keep the actual validated MIME for previews even if a device supplies octet-stream.
      const validFile = file.type === type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
      selectedProof.current = validFile;
      setProofFile(validFile);
    } catch (failure) {
      if (alive.current && version === proofSelection.current) {
        setVerificationErrors(current => ({ ...current, attachment: failure.message }));
        if (proofInput.current) proofInput.current.value = "";
      }
    } finally {
      if (alive.current && version === proofSelection.current) { proofValidationBusy.current = false; setProofValidating(false); }
    }
  };
  const removeProof = () => {
    proofSelection.current++;
    verificationRequest.current = null;
    selectedProof.current = null;
    proofValidationBusy.current = false;
    setProofFile(null); setProofValidating(false);
    setVerificationErrors(current => ({ ...current, attachment: "" }));
    if (proofInput.current) proofInput.current.value = "";
  };
  const submitQrUtr = (event) => {
    event.preventDefault();
    if (guard.current || submitted || uncertain || completed.current || proofValidationBusy.current) return;
    let payload;
    try {
      if (!canReconcile) throw new Error("This QR order is no longer eligible for manual reconciliation.");
      if (Number(order.campusId) !== Number(campusId)) throw new Error("Select the campus used to generate this QR before submitting its payment reference.");
      payload = directQrUtrPayload(order, account, verificationDraft, todayISO());
      payload = { ...payload, orderId: order.orderId, ...(order.feeInstallmentIds?.length ? { feeInstallmentIds: order.feeInstallmentIds } : {}) };
      if (!selectedProof.current) throw Object.assign(new Error("Choose a payment screenshot or transaction proof before submitting."), { field: "attachment" });
      if (submittedReferences.current.has(payload.utrNumber)) throw Object.assign(new Error("This reference has already been submitted or settled. Review the pending queue and payment history."), { field: "utrNumber" });
    } catch (failure) {
      setVerificationErrors({ [failure.field || "order"]: failure.message });
      return;
    }
    setVerificationErrors({});
    const attachment = selectedProof.current;
    const fingerprint = JSON.stringify([payload, attachment.name, attachment.size, attachment.lastModified]);
    if (verificationRequest.current?.fingerprint !== fingerprint) {
      verificationRequest.current = { fingerprint, key: `utr-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}` };
    }
    run(async signal => {
      let result;
      try { result = await feePaymentGatewayApi.submitUtr(payload, signal, { attachment, idempotencyKey: verificationRequest.current.key }); }
      catch (failure) {
        if (failure.response?.status === 409) setUncertain(true);
        if (failure.response?.status === 413) setVerificationErrors(current => ({ ...current, attachment: "The server rejected the upload size. Choose a payment proof of 5 MB or smaller." }));
        const fields = failure.response?.data?.errors;
        if (fields) setVerificationErrors(current => ({ ...current, attachment: fields.attachment?.join?.(" ") || fields.Attachment?.join?.(" ") || current.attachment }));
        if (/already.*(?:submitted|settled)|duplicate/i.test(getApiErrorMessage(failure))) submittedReferences.current.add(payload.utrNumber);
        throw failure;
      }
      if (signal.aborted || !alive.current) return;
      pendingSubmission.current = result;
      submittedReferences.current.add(payload.utrNumber);
      setSubmitted(true);
      setNotice("Payment details submitted successfully. Your payment is pending verification.");
      if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(UTR_SUBMITTED_EVENT));
      onPending?.(pendingSubmission.current);
    });
  };
  const submitInlineDirectUtr = (approveImmediately) => {
    if (!canReconcile || guard.current || submitted || uncertain || completed.current) return;
    const cleanUtr = draft.utrNumber.trim();
    if (!order?.orderId) return;
    if (!/^[A-Za-z0-9]{6,100}$/.test(cleanUtr)) {
      setError("Enter a valid UPI Ref / UTR with 6–100 letters or digits.");
      return;
    }
    let payload;
    try {
      payload = collectionPayload(account, target, selectedIds, amount);
    } catch (failure) {
      setError(failure.message);
      return;
    }
    run(async (signal) => {
      const submittedRes = await feePaymentGatewayApi.submitUtr(
        {
          studentId: payload.studentId,
          studentFeeId: payload.studentFeeId,
          feeInstallmentIds: payload.feeInstallmentIds,
          amount: Number(order.amount),
          orderId: order.orderId,
          utrNumber: cleanUtr,
          bankName: draft.bankName.trim() || null,
          paymentDate: todayISO(),
          remarks: draft.remarks.trim() || `Direct UPI QR (${order.orderId})`,
        },
        signal,
      );
      if (signal.aborted) return;
      submittedReferences.current.add(cleanUtr);
      pendingSubmission.current = submittedRes;
      setSubmitted(true);
      if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(UTR_SUBMITTED_EVENT));
      if (!approveImmediately) {
        setSubmitted(true);
        setNotice("UTR submitted for queue verification. Fees will be credited after approval.");
        onPending?.(pendingSubmission.current);
        return;
      }
      const txnId = Number(submittedRes.transactionId);
      if (!Number.isSafeInteger(txnId) || txnId <= 0) {
        setSubmitted(true);
        setNotice("UTR submitted for verification. Approve it in the Pending UTR Queue to credit fees.");
        onPending?.(pendingSubmission.current);
        return;
      }
      let approved;
      try {
        approved = await feePaymentGatewayApi.approveUtr(
          { transactionId: txnId, action: "Approve" },
          signal,
        );
      } catch (failure) {
        if (signal.aborted || !alive.current) return;
        setNotice("UTR was submitted. Check the Pending UTR Queue and payment history before attempting approval again.");
        onPending?.(pendingSubmission.current);
        throw failure;
      }
      if (signal.aborted || completed.current) return;
      if (approved.success === true && approved.receiptNumber && Number.isSafeInteger(Number(approved.feePaymentId)) && Number(approved.feePaymentId) > 0 && Math.abs(Number(approved.amount) - Number(order.amount)) < 0.005) {
        complete({
          ...approved,
          amount: approved.amount ?? order.amount,
          transactionId: cleanUtr,
        });
      } else {
        setSubmitted(true);
        setNotice("UTR submitted. Refresh Fee Management or check Pending UTR Queue.");
        onPending?.(pendingSubmission.current);
      }
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
            Bank transfers remain pending until verified. Choose specific fee schedules or Pay Full
            Remaining Balance (you can enter a smaller amount); schedule allocation is settled on
            approval.
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
      ) : verificationOpen && order ? (
        <form className="cms-fee-qr-verification" onSubmit={submitQrUtr} noValidate>
          <h3>Submit Payment for Verification</h3>
          <dl className="cms-fee-reversal-details">
            {[
              ["Student Name", account.studentName], ["Admission Number", account.admissionNo || account.admissionNumber],
              ["Student Fee ID", order.studentFeeId], ["Campus", order.campusName || order.campusId || "Unavailable"],
              ["Selected Fee Schedules", order.feeInstallmentIds?.length ? order.feeInstallmentIds.map(id => {
                const schedule = account.installments?.find(item => Number(item.feeInstallmentId || item.id) === Number(id));
                return schedule?.label || (schedule?.no ? `Fee Schedule ${schedule.no}` : `Schedule ID ${id}`);
              }).join(", ") : "Fee account"],
              ["Generated Payment Amount", formatCurrency(order.amount)], ["Payment Order ID", order.orderId], ["Payment Method", "Direct UPI QR"],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Unavailable"}</dd></div>)}
          </dl>
          <p className="cms-fee-note">The payment order and selected fee schedules are sent for backend verification. Your balance changes only after authorized approval and settlement.</p>
          <fieldset className="cms-fee-gateway-fields" disabled={busy || submitted || uncertain || completed.current || !authorize()}>
            <div className="cms-form-grid cols-2">
              {[
                ["utrNumber", "UTR / UPI Transaction Reference Number", "text", 100],
                ["bankName", "Bank Name / Payment App", "text", 200],
                ["paymentDate", "Payment Date", "date"], ["amountPaid", "Amount Paid", "number"],
              ].map(([key, label, type, maxLength]) => <div className={`cms-field${key === "remarks" ? " full" : ""}`} key={key}>
                <label htmlFor={`qr-verification-${key}`}>{label}{key !== "remarks" ? <span className="req" aria-hidden="true">*</span> : null}</label>
                <input id={`qr-verification-${key}`} type={type} required={key !== "remarks"} maxLength={maxLength}
                  min={type === "date" ? "2000-01-01" : type === "number" ? "0.01" : undefined}
                  max={type === "date" ? todayISO() : undefined} step={type === "number" ? "0.01" : undefined}
                  value={verificationDraft[key]} aria-invalid={Boolean(verificationErrors[key])}
                  aria-describedby={verificationErrors[key] ? `qr-verification-${key}-error` : undefined}
                  onChange={event => { setVerificationDraft(current => ({ ...current, [key]: event.target.value })); setVerificationErrors(current => ({ ...current, [key]: "" })); }} />
                {verificationErrors[key] ? <span id={`qr-verification-${key}-error`} className="cms-error" role="alert">{verificationErrors[key]}</span> : null}
              </div>)}
              <div className="cms-field full">
                <label htmlFor="qr-verification-proof">Payment Screenshot / Transaction Proof <span className="req" aria-hidden="true">*</span></label>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => proofInput.current?.click()} aria-controls="qr-verification-proof" aria-describedby="qr-verification-proof-help">
                  <Upload size={16} aria-hidden="true" /> {proofFile ? "Replace Payment Screenshot" : "Choose Payment Screenshot"}
                </button>
                <input id="qr-verification-proof" className="cms-sr-only" tabIndex={-1} type="file" ref={proofInput} required onChange={chooseProof}
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  aria-invalid={Boolean(verificationErrors.attachment)} aria-describedby={`qr-verification-proof-help${verificationErrors.attachment ? " qr-verification-proof-error" : ""}`} />
                <p id="qr-verification-proof-help" className="cms-fee-note">JPG, JPEG, PNG or PDF, up to 5 MB. Proof is submitted for authorized verification; it does not confirm payment.</p>
                {proofValidating ? <p role="status">Checking payment proof...</p> : null}
                {proofFile ? <div className="cms-fee-proof-selection"><span>{proofFile.name}</span><button type="button" className="cms-btn cms-btn-ghost" onClick={removeProof}>Remove</button></div> : null}
                {proofFile && proofPreview ? <img className="cms-fee-proof-preview" src={proofPreview} alt="Selected payment proof preview" /> : null}
                {verificationErrors.attachment ? <span id="qr-verification-proof-error" className="cms-error" role="alert">{verificationErrors.attachment}</span> : null}
              </div>
              <div className="cms-field full">
                <label htmlFor="qr-verification-remarks">Remarks</label>
                <input id="qr-verification-remarks" type="text" maxLength={500} value={verificationDraft.remarks}
                  aria-invalid={Boolean(verificationErrors.remarks)}
                  aria-describedby={verificationErrors.remarks ? "qr-verification-remarks-error" : undefined}
                  onChange={event => { setVerificationDraft(current => ({ ...current, remarks: event.target.value })); setVerificationErrors(current => ({ ...current, remarks: "" })); }} />
                {verificationErrors.remarks ? <span id="qr-verification-remarks-error" className="cms-error" role="alert">{verificationErrors.remarks}</span> : null}
              </div>
            </div>
          </fieldset>
          {verificationErrors.order ? <p className="cms-error" role="alert">{verificationErrors.order}</p> : null}
          {submitted ? <strong className="cms-badge cms-badge-info" role="status">{polling.paymentState === "PAYMENT_REJECTED" ? "Payment Rejected" : polling.paymentState === "PAYMENT_EXPIRED" ? "Payment Expired" : polling.status === "FAILED" ? "Payment Failed" : "Pending Verification"}</strong> : null}
          <div className="cms-form-actions">
            <button type="button" className="cms-btn cms-btn-ghost" disabled={busy} onClick={() => setVerificationOpen(false)}>Back to QR</button>
            <button type="submit" className="cms-btn cms-btn-primary" disabled={busy || proofValidating || submitted || uncertain || completed.current || !authorize()}>{busy ? "Submitting..." : submitted ? "Pending Verification" : "Submit for Verification"}</button>
          </div>
        </form>
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
                disabled={busy || uncertain || configurationUnavailable || !authorize()}
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
                !submitted &&
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
              {mode === "UPI_QR" && (
                <p className="cms-fee-note" role="status">
                  Campus: {order.campusName || order.campusId}{" · "}
                  {order.qrMode || (order.requiresManualUtr ? "DIRECT_VPA_QR" : "UPI QR")}{" · "}
                  {order.payeeName && order.payeeVpa ? `${order.payeeName} (${order.payeeVpa})` : "Payee details unavailable"}
                </p>
              )}
              {completed.current ? (
                <span className="cms-badge cms-badge-active">
                  <CheckCircle size={16} /> Payment confirmed
                </span>
              ) : polling.paymentState === "PAYMENT_REJECTED" ? <p role="status">Payment Rejected</p>
                : polling.paymentState === "PAYMENT_EXPIRED" ? <p role="status">Payment Expired</p>
                : polling.status === "FAILED" ? <p role="status">Payment Failed</p>
                : submitted || polling.paymentState === "PENDING_VERIFICATION" ? <strong className="cms-badge cms-badge-info" role="status">Pending Verification</strong>
                : polling.paymentState === "PAYMENT_INITIATED" ? <p role="status">Payment Initiated — Awaiting Payment</p>
                : polling.status === "MANUAL_UTR" ? (
                <p role="status">
                  Direct Bank VPA Mode — Awaiting UTR / UPI Reference Confirmation
                </p>
              ) : (
                <p role="status">
                  {polling.status === "PENDING"
                    ? "Awaiting Payment — awaiting backend confirmation"
                    : polling.status}{" "}
                  · {order.expiresAt ? "QR expires in" : "Monitoring time remaining"}{" "}
                  {Math.floor(polling.secondsLeft / 60)}:
                  {String(polling.secondsLeft % 60).padStart(2, "0")}
                </p>
              )}
              {mode === "UPI_QR" && order.requiresManualUtr && !completed.current && !submitted && (
                <p className="cms-fee-note" role="note">
                  Direct Bank VPA Mode: Razorpay keys are not configured. Auto-settlement webhook is
                  unavailable. After paying, click Done to submit the transaction reference for
                  verification, or use the inline UTR controls below.
                </p>
              )}
              {canReconcile && (
                <fieldset className="cms-fee-gateway-fields" disabled={busy || uncertain || !authorize()}>
                  <div className="cms-field">
                    <label htmlFor="gateway-inline-utr">Paid UPI Ref / UTR Number <span className="req" aria-hidden="true">*</span></label>
                    <input id="gateway-inline-utr" required maxLength={100} value={draft.utrNumber}
                      onChange={event => setDraft(current => ({ ...current, utrNumber: event.target.value }))} />
                  </div>
                  <div className="cms-form-actions">
                    <button type="button" className="cms-btn cms-btn-ghost" onClick={() => submitInlineDirectUtr(false)}>Submit UTR for Verification</button>
                    <button type="button" className="cms-btn cms-btn-primary" onClick={() => submitInlineDirectUtr(true)}>Verify &amp; Credit Payment Now</button>
                  </div>
                </fieldset>
              )}
              {mode === "UPI_QR" && order.upiUri && !order.monitorOnly && !submitted && polling.status === "PENDING" && (
                <>
                  <button type="button" className="cms-btn cms-btn-ghost" onClick={copyUri}>
                    <Copy size={14} /> Copy UPI URI
                  </button>
                  <input aria-label="UPI payment URI" readOnly value={order.upiUri} />
                </>
              )}
              {mode === "UPI_QR" &&
                mobileLink &&
                !submitted &&
                !order.monitorOnly &&
                ["PENDING", "MANUAL_UTR"].includes(polling.status) && (
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
                    setSubmitted(false);
                    setVerificationOpen(false);
                    setNotice("");
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
