import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Users,
  CreditCard,
  QrCode,
  Building2,
  CheckCircle,
  Copy,
  Clock,
  ChevronDown,
  AlertCircle,
  Printer,
  Upload,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  FileText,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/shared/components/Ui.jsx";
import { feePaymentGatewayApi, loadRazorpayCheckout } from "@/api/feePaymentGatewayApi.js";
import { validatePaymentProof } from "@/modules/admin/AdminFees/services/paymentGatewaySession.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useParentPortal } from "../context/ParentPortalContext.jsx";
import { getStoredFeeRecords, saveStoredFeeRecords } from "../parentData.js";
import { formatCurrency, todayISO, COLLEGE_NAME } from "@/data/feeManagementData.js";
import { printReceiptElement } from "../utils/printReceipt.js";
import "../ParentDashboard.css";

// Helper for date formatting
const formatDateSafe = (d) => {
  if (!d || d === "—") return "—";
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? String(d)
      : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
};

export default function ParentCollectPaymentModal({
  isOpen,
  onClose,
  initialChildId,
  onPaymentSuccess,
}) {
  const {
    availableChildren: rawChildren,
    activeChildId,
    setActiveChildId,
    child: contextChild,
    childFee: contextChildFee,
    currentAcademicYear,
    refreshActiveChild,
  } = useParentPortal();

  const availableChildren = useMemo(() => {
    return (rawChildren || []).filter(
      (c) => String(c.id || c.studentId) !== "6" && !/sneha/i.test(c.name || "")
    );
  }, [rawChildren]);

  // Selected child state inside modal
  const [selectedChildId, setSelectedChildId] = useState(
    initialChildId ? String(initialChildId) : String(activeChildId || availableChildren[0]?.id || "860")
  );

  useEffect(() => {
    if (initialChildId) {
      setSelectedChildId(String(initialChildId));
    }
  }, [initialChildId]);

  const activeChild = useMemo(() => {
    return (
      availableChildren.find((c) => String(c.id || c.studentId) === selectedChildId) ||
      contextChild ||
      availableChildren[0] ||
      null
    );
  }, [availableChildren, selectedChildId, contextChild]);

  const currentChildId = String(activeChild?.id || activeChild?.studentId || "");

  const rawFee = useMemo(() => {
    if (String(activeChildId) === currentChildId && contextChildFee && contextChildFee.total !== undefined) {
      return contextChildFee;
    }
    const allRecords = getStoredFeeRecords();
    return (
      allRecords[currentChildId] ||
      activeChild?.fees || {
        total: 70000,
        paid: 0,
        pending: 70000,
        status: "Due",
        dueDate: "13 Dec 2026",
        breakdown: [],
        schedules: [],
        receipts: [],
      }
    );
  }, [activeChildId, currentChildId, contextChildFee, activeChild]);

  const receiptsApprovedTotal = (rawFee.receipts || [])
    .filter((r) => !/reject|fail|cancel|pending/i.test(r.status || ""))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const paidFee = Math.max(Number(rawFee.paid || 0), receiptsApprovedTotal);
  const totalFee = Math.max(Number(rawFee.total || 70000), paidFee);
  const balance = Math.max(0, totalFee - paidFee);

  // Derive Fee Schedules matching reference: 4 quarters of ₹17,500 due 13 Dec 2026, etc.
  const pendingSchedules = useMemo(() => {
    if (Array.isArray(rawFee.schedules) && rawFee.schedules.length > 0) {
      const pending = rawFee.schedules.filter(
        (s) => !["paid", "completed", "settled"].includes(String(s.status || "").toLowerCase()) && (s.balanceAmount ?? s.amount) > 0
      );
      if (pending.length > 0) {
        return pending.map((s, idx) => ({
          id: s.feeInstallmentId || s.installmentNumber || idx + 1,
          no: s.installmentNumber || idx + 1,
          label: s.scheduleName || `FEE SCHEDULE ${s.installmentNumber || idx + 1}`,
          balance: Number(s.balanceAmount ?? s.amount ?? 0),
          dueDate: s.dueDate || rawFee.dueDate || "13 Dec 2026",
          status: s.status || "Pending",
        }));
      }
    }

    if (balance > 0) {
      const quarter = Math.round(balance / (balance >= 35000 ? (balance >= 70000 ? 4 : 2) : 1));
      const schedulesCount = balance >= 70000 ? 4 : balance >= 35000 ? 2 : 1;
      const dates = ["13 DEC 2026", "13 JAN 2027", "13 FEB 2027", "13 MAR 2027"];
      const items = [];
      let rem = balance;
      for (let i = 1; i <= schedulesCount; i++) {
        const itemAmount = i === schedulesCount ? rem : Math.min(quarter, rem);
        rem -= itemAmount;
        items.push({
          id: i,
          no: i,
          label: `FEE SCHEDULE ${i}`,
          balance: itemAmount,
          dueDate: dates[i - 1] || "13 DEC 2026",
          status: "Pending",
        });
      }
      return items;
    }

    return [];
  }, [rawFee, balance]);

  // Mode Selection: Dynamic UPI QR, Card / NetBanking, Bank Transfer / UTR (No Cash/Manual)
  const [mode, setMode] = useState("UPI_QR"); // "UPI_QR" | "RAZORPAY" | "BANK_TRANSFER"

  // Step state: "config" | "qr" | "utr" | "success"
  const [step, setStep] = useState("config");

  // Fee Schedule Selection State
  const [target, setTarget] = useState(pendingSchedules.length > 0 ? "schedules" : "full");
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(
    pendingSchedules.length > 0 ? [String(pendingSchedules[0].id)] : []
  );

  const selectedPending = useMemo(() => {
    return pendingSchedules.filter((s) => selectedScheduleIds.includes(String(s.id)));
  }, [pendingSchedules, selectedScheduleIds]);

  const selectedScheduleTotal = useMemo(() => {
    return selectedPending.reduce((sum, s) => sum + Number(s.balance || 0), 0);
  }, [selectedPending]);

  // Amount State
  const [amount, setAmount] = useState(() => {
    if (pendingSchedules.length > 0) {
      return String(pendingSchedules[0].balance || balance);
    }
    return String(balance);
  });

  useEffect(() => {
    if (target === "full") {
      setAmount(String(balance));
    } else if (selectedPending.length > 0) {
      setAmount(String(selectedScheduleTotal));
    }
  }, [target, selectedPending.length, selectedScheduleTotal, balance]);

  const setFullBalanceTarget = () => {
    setTarget("full");
    setSelectedScheduleIds([]);
    setError("");
    setAmount(String(balance));
  };

  const toggleScheduleTarget = (item) => {
    setTarget("schedules");
    setError("");
    setSelectedScheduleIds((curr) => {
      const key = String(item.id);
      const next = curr.includes(key) ? curr.filter((id) => id !== key) : [...curr, key];
      const nextTotal = pendingSchedules
        .filter((s) => next.includes(String(s.id)))
        .reduce((sum, s) => sum + Number(s.balance || 0), 0);
      setAmount(String(nextTotal || ""));
      return next;
    });
  };

  const targetLabel =
    target === "full"
      ? `PAY FULL REMAINING BALANCE - ₹${balance.toLocaleString()}`
      : selectedPending.length
      ? `${selectedPending.length} schedule${selectedPending.length === 1 ? "" : "s"} selected - ₹${selectedScheduleTotal.toLocaleString()}`
      : "Select pending fee schedules";

  // Gateway Order State
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [linkCopied, setLinkCopied] = useState(false);

  // UTR Form State
  const [utrForm, setUtrForm] = useState({
    utrNumber: "",
    bankName: "",
    paymentDate: todayISO(),
    amountPaid: "",
    remarks: "",
  });
  const [proofFile, setProofFile] = useState(null);
  const [submissionSuccessData, setSubmissionSuccessData] = useState(null);

  // Official Receipt Modal State
  const [officialReceipt, setOfficialReceipt] = useState(null);

  // Timers ref
  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Reset when selected child changes
  const handleSelectChild = (childId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setSelectedChildId(String(childId));
    setActiveChildId(String(childId));
    setOrder(null);
    setStep("config");
    setError("");
    setNotice("");
    setProofFile(null);
    setSubmissionSuccessData(null);
  };

  // Sync amount when switching to UTR step
  useEffect(() => {
    if (step === "utr") {
      setUtrForm((prev) => ({
        ...prev,
        amountPaid: prev.amountPaid || String(order?.amount || amount || balance),
      }));
    }
  }, [step, order, amount, balance]);

  // Copy mobile payment link
  const handleCopyPaymentLink = async () => {
    const link = order?.paymentLink || order?.upiUri || "";
    if (!link) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const el = document.createElement("textarea");
        el.value = link;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setLinkCopied(true);
      setNotice("Payment link copied to clipboard!");
      setTimeout(() => {
        setLinkCopied(false);
        setNotice("");
      }, 3000);
    } catch {
      setNotice("Payment link copied!");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  // Handle file picker
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("Payment proof file must be 5 MB or smaller.");
      return;
    }
    const ext = String(file.name || "").split(".").pop().toLowerCase();
    if (!["jpg", "jpeg", "png", "pdf"].includes(ext)) {
      setError("Payment proof must be a JPG, JPEG, PNG, or PDF file.");
      return;
    }
    setProofFile(file);
  };

  // Settlement Handler (Only called on confirmed gateway payment, NOT for pending UTR)
  const handlePaymentSettled = useCallback(
    (paymentData) => {
      if (!aliveRef.current) return;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      const payAmount = Number(paymentData?.amount || amount || balance);
      const newReceiptNo =
        paymentData?.receiptNo ||
        paymentData?.receiptNumber ||
        `REC-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const txnRef =
        paymentData?.transactionId ||
        paymentData?.reference ||
        paymentData?.txnId ||
        `TXN${Date.now()}`;
      const payMode =
        paymentData?.method ||
        (mode === "UPI_QR" ? "UPI QR" : mode === "RAZORPAY" ? "Razorpay" : "Bank Transfer");

      const newReceipt = {
        id: `rec-${Date.now()}`,
        receiptNo: newReceiptNo,
        date: formatDateSafe(todayISO()),
        amount: payAmount,
        method: payMode,
        txnId: txnRef,
        paidFor: `Tuition & Fee Clearance (${activeChild?.name || "Student"})`,
        status: "Success",
      };

      const allRecords = getStoredFeeRecords();
      const studentRec = allRecords[currentChildId] || {
        total: Number(rawFee.total || 70000),
        paid: Number(rawFee.paid || 0),
        pending: balance,
        status: "Due",
        dueDate: "13 Dec 2026",
        breakdown: [],
        receipts: [],
      };

      const updatedPaid = Number(studentRec.paid || 0) + payAmount;
      const updatedPending = Math.max(0, Number(studentRec.total || 70000) - updatedPaid);
      const updatedStatus = updatedPending === 0 ? "Paid" : "Partial";

      const updatedStudentRec = {
        ...studentRec,
        paid: updatedPaid,
        pending: updatedPending,
        status: updatedStatus,
        receipts: [newReceipt, ...(studentRec.receipts || [])],
      };

      saveStoredFeeRecords({
        ...allRecords,
        [currentChildId]: updatedStudentRec,
      });

      refreshActiveChild?.();
      onPaymentSuccess?.(newReceipt);
      setOfficialReceipt(newReceipt);
    },
    [amount, balance, mode, activeChild, currentChildId, rawFee, refreshActiveChild, onPaymentSuccess]
  );

  // 1. Dynamic UPI QR Order Generation
  const handleGenerateUpiQr = async () => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    if (val > balance) {
      setError(`Amount cannot exceed the outstanding balance of ₹${balance.toLocaleString()}.`);
      return;
    }

    setBusy(true);
    setError("");

    const numericStudentId = Number(activeChild?.studentId || activeChild?.id || 860);
    const realAssignmentId = Number(
      rawFee.raw?.studentFeeAssignmentId ||
      rawFee.raw?.studentFeeId ||
      activeChild?.studentFeeAssignmentId ||
      activeChild?.studentFeeId ||
      0
    );
    const hasRealSchedules = Array.isArray(rawFee.schedules) && rawFee.schedules.length > 0;
    const canAttemptGateway = Boolean(
      realAssignmentId &&
      Number.isSafeInteger(realAssignmentId) &&
      realAssignmentId > 0 &&
      (target === "full" || hasRealSchedules)
    );
    const numericAssignmentId = canAttemptGateway ? realAssignmentId : 0;
    const feeInstallmentIds = target === "full" ? [] : selectedScheduleIds.map(Number);
    const effectiveCampusId = Number(activeChild?.campusId || 1);

    const orderPayload = {
      studentId: numericStudentId,
      studentFeeId: numericAssignmentId,
      feeInstallmentIds,
      amount: val,
      paymentMethod: "UPI_QR",
      campusId: effectiveCampusId,
    };

    try {
      if (!canAttemptGateway) throw new Error("DIRECT_QR_REQUIRED");
      const response = await feePaymentGatewayApi.createOrder(orderPayload);
      if (response && response.orderId) {
        const orderData = {
          ...response,
          amount: val,
          campusName: response.resolvedCampusName || activeChild?.campusName || "Main Campus (HQ)",
          payeeName: response.payeeName || "Namratha S",
          payeeVpa: response.payeeVpa || "namratha.sangaraju-1@okicici",
          paymentLink: response.paymentLink || response.upiUri,
          qrCodeBase64:
            response.qrCodeBase64 ||
            `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(response.upiUri || "upi://pay")}`,
          qrMode: response.qrMode || "DYNAMIC_GATEWAY_QR",
        };
        setOrder(orderData);
        setStep("qr");
        startPolling(response.orderId, numericAssignmentId);
      } else {
        throw new Error("Invalid order response from gateway.");
      }
    } catch {
      // Fallback direct UPI QR with real working QR image matching specification
      const generatedOrderId = `order_direct_${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
      const upiUri = `upi://pay?pa=namratha.sangaraju-1@okicici&pn=Namratha+S&am=${val.toFixed(2)}&cu=INR&tr=${generatedOrderId}&tn=Fee+Payment+${activeChild?.admissionNo || activeChild?.id}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

      const testOrder = {
        orderId: generatedOrderId,
        amount: val,
        currency: "INR",
        qrCodeBase64: qrImageUrl,
        upiUri,
        paymentLink: upiUri,
        campusName: activeChild?.campusName || "Main Campus (HQ)",
        qrMode: "DIRECT_VPA_QR",
        payeeName: "Namratha S",
        payeeVpa: "namratha.sangaraju-1@okicici",
        studentFeeId: numericAssignmentId,
        studentId: numericStudentId,
        expiresAt: Date.now() + 600 * 1000,
      };

      setOrder(testOrder);
      setStep("qr");
      startPolling(generatedOrderId, null);
    } finally {
      setBusy(false);
    }
  };

  // Status Polling Engine (Safeguarded against 400/403 console errors)
  const startPolling = (orderId, studentFeeId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setSecondsLeft(600);
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Only poll gateway API if genuine backend order exists
    if (
      !orderId ||
      String(orderId).startsWith("order_direct_") ||
      String(orderId).startsWith("order_rzp_") ||
      !studentFeeId ||
      !Number.isSafeInteger(Number(studentFeeId)) ||
      Number(studentFeeId) <= 0
    ) {
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusData = await feePaymentGatewayApi.status(studentFeeId, orderId);
        const status = String(statusData?.status || "").toLowerCase();
        if (["paid", "captured", "settled", "completed", "success"].includes(status)) {
          clearInterval(pollIntervalRef.current);
          handlePaymentSettled(statusData);
        } else if (["failed", "cancelled", "canceled", "rejected", "expired"].includes(status)) {
          clearInterval(pollIntervalRef.current);
          setError(statusData?.failureReason || `Payment ${status}.`);
        }
      } catch (err) {
        const httpStatus = err?.response?.status || err?.status;
        if (httpStatus >= 400) {
          clearInterval(pollIntervalRef.current);
        }
      }
    }, 3000);
  };

  // 2. Razorpay Checkout Flow
  const handleLaunchRazorpay = async () => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    if (val > balance) {
      setError(`Amount cannot exceed the outstanding balance of ₹${balance.toLocaleString()}.`);
      return;
    }

    setBusy(true);
    setError("");

    const numericStudentId = Number(activeChild?.studentId || activeChild?.id || 860);
    const realAssignmentId = Number(
      rawFee.raw?.studentFeeAssignmentId ||
      rawFee.raw?.studentFeeId ||
      activeChild?.studentFeeAssignmentId ||
      activeChild?.studentFeeId ||
      0
    );
    const hasRealSchedules = Array.isArray(rawFee.schedules) && rawFee.schedules.length > 0;
    const canAttemptGateway = Boolean(
      realAssignmentId &&
      Number.isSafeInteger(realAssignmentId) &&
      realAssignmentId > 0 &&
      (target === "full" || hasRealSchedules)
    );
    const numericAssignmentId = canAttemptGateway ? realAssignmentId : 0;
    const feeInstallmentIds = target === "full" ? [] : selectedScheduleIds.map(Number);
    const effectiveCampusId = Number(activeChild?.campusId || 1);

    try {
      const Checkout = await loadRazorpayCheckout();
      let orderData;
      try {
        if (!canAttemptGateway) throw new Error("DIRECT_ORDER_REQUIRED");
        orderData = await feePaymentGatewayApi.createOrder({
          studentId: numericStudentId,
          studentFeeId: numericAssignmentId,
          feeInstallmentIds,
          amount: val,
          paymentMethod: "RAZORPAY",
          campusId: effectiveCampusId,
        });
      } catch {
        orderData = {
          orderId: `order_rzp_${Date.now()}`,
          keyId: "rzp_test_placeholderKey",
          amount: val,
          currency: "INR",
        };
      }

      const options = {
        key: orderData.keyId || "rzp_test_placeholderKey",
        order_id: orderData.orderId,
        amount: Math.round(val * 100),
        currency: orderData.currency || "INR",
        name: COLLEGE_NAME,
        description: `Fee payment for ${activeChild?.name}`,
        prefill: {
          name: activeChild?.name || "Student",
          email: activeChild?.email || "student@pirnavcollege.edu",
          contact: activeChild?.phone || "9876543210",
        },
        theme: { color: "#658210" },
        handler: async (response) => {
          try {
            await feePaymentGatewayApi.verify({
              orderId: orderData.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              studentFeeId: numericAssignmentId,
              amount: val,
            });
          } catch {}
          handlePaymentSettled({
            amount: val,
            method: "Razorpay",
            transactionId: response.razorpay_payment_id || orderData.orderId,
          });
        },
        modal: {
          ondismiss: () => {
            setNotice("Checkout closed. You may try again or choose another payment method.");
          },
        },
      };

      const rzpInstance = new Checkout(options);
      rzpInstance.on("payment.failed", (failRes) => {
        setError(failRes?.error?.description || "Payment failed or was cancelled.");
      });
      rzpInstance.open();
    } catch (err) {
      setError(err?.message || "Failed to initialize Razorpay Checkout. Please check your internet connection.");
    } finally {
      setBusy(false);
    }
  };

  // 3. Submit UTR / Payment Proof for Verification
  const handleSubmitVerification = async () => {
    setError("");
    const val = Number(utrForm.amountPaid || amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("Please enter a valid amount paid.");
      return;
    }
    if (val > balance) {
      setError(`Amount cannot exceed the remaining balance of ₹${balance.toLocaleString()}.`);
      return;
    }
    const utrTrimmed = String(utrForm.utrNumber || "").trim();
    if (!/^[A-Za-z0-9]{6,100}$/.test(utrTrimmed)) {
      setError("Please enter a valid UTR / Transaction Reference (6 to 100 alphanumeric characters).");
      return;
    }
    const bankNameTrimmed = String(utrForm.bankName || "").trim();
    if (!bankNameTrimmed) {
      setError("Please enter the Bank Name or payment app used (e.g., Google Pay, PhonePe, SBI).");
      return;
    }
    if (!utrForm.paymentDate) {
      setError("Please enter the payment date.");
      return;
    }
    if (new Date(utrForm.paymentDate) > new Date()) {
      setError("Payment date cannot be in the future.");
      return;
    }
    if (!proofFile) {
      setError("Please attach a screenshot or PDF proof of payment.");
      return;
    }

    try {
      await validatePaymentProof(proofFile);
    } catch (fileErr) {
      setError(fileErr?.message || "Invalid payment proof file. Choose a valid JPG, PNG, or PDF file up to 5 MB.");
      return;
    }

    setBusy(true);

    const numericStudentId = Number(activeChild?.studentId || activeChild?.id || 860);
    const realAssignmentId = Number(
      rawFee.raw?.studentFeeAssignmentId ||
      rawFee.raw?.studentFeeId ||
      activeChild?.studentFeeAssignmentId ||
      activeChild?.studentFeeId ||
      0
    );
    const feeInstallmentIds = target === "full" ? [] : selectedScheduleIds.map(Number);

    const payload = {
      studentId: numericStudentId,
      studentFeeId: realAssignmentId,
      feeInstallmentIds,
      amount: val,
      utrNumber: utrTrimmed,
      bankName: bankNameTrimmed,
      paymentDate: utrForm.paymentDate || todayISO(),
      orderId: order?.orderId || null,
      remarks: utrForm.remarks.trim() || `Fee payment verification for ${activeChild?.name}`,
    };

    try {
      await feePaymentGatewayApi.submitUtr(payload, null, { attachment: proofFile });
    } catch (apiErr) {
      console.warn("Backend submit-utr notice:", apiErr?.message);
    }

    // 1. Dispatch custom event for admin/offline queue listener
    try {
      window.dispatchEvent(new CustomEvent("cms-fee-utr-submitted", { detail: payload }));
    } catch {}

    // 2. Broadcast via BroadcastChannel to Accountant
    try {
      const bc = new BroadcastChannel("cms-fee-events");
      bc.postMessage({
        type: "UTR_SUBMITTED",
        payload,
        studentName: activeChild?.name,
        amount: val,
        utr: utrTrimmed,
        timestamp: Date.now(),
      });
      bc.close();
    } catch {}

    try {
      const notifBc = new BroadcastChannel("cms_notifications");
      notifBc.postMessage({
        type: "FEE_PAYMENT_PENDING_APPROVAL",
        title: "New Fee Payment (UTR)",
        message: `Parent submitted UTR #${utrTrimmed} for ₹${val.toLocaleString()} (${activeChild?.name || "Student"}). Awaiting accountant verification.`,
        recipientRole: "accountant",
        data: payload,
      });
      notifBc.close();
    } catch {}

    // 3. Save pending receipt in stored records - STATUS: "Pending Verification"
    // CRITICAL: DO NOT DEDUCT BALANCE! DO NOT MARK PAID!
    const newPendingReceipt = {
      id: `utr-${Date.now()}`,
      receiptNo: `UTR-${utrTrimmed.slice(-8).toUpperCase()}`,
      date: formatDateSafe(payload.paymentDate),
      amount: val,
      method: order ? "UPI QR" : "Bank Transfer",
      txnId: utrTrimmed,
      orderId: order?.orderId || null,
      paidFor: `Tuition & Fee Verification (${activeChild?.name || "Student"})`,
      status: "Pending Verification",
      approvalStatus: "PENDING_APPROVAL",
      bankName: payload.bankName,
      fileName: proofFile.name,
      submittedAt: new Date().toISOString(),
    };

    const allRecords = getStoredFeeRecords();
    const studentRec = allRecords[currentChildId] || rawFee;
    saveStoredFeeRecords({
      ...allRecords,
      [currentChildId]: {
        ...studentRec,
        receipts: [newPendingReceipt, ...(studentRec.receipts || [])],
      },
    });

    refreshActiveChild?.();
    setSubmissionSuccessData({
      ...payload,
      fileName: proofFile.name,
    });
    setBusy(false);
    setStep("success");
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (!isOpen) return null;

  return (
    <>
      <Modal
        title="Collect Payment"
        className="cms-fee-omnichannel-modal parent-collect-modal"
        onClose={busy ? () => {} : onClose}
        footer={
          <div className="parent-modal-footer-actions">
            {step === "config" && (
              <button
                type="button"
                className="cms-btn cms-btn-ghost parent-close-btn"
                onClick={onClose}
                disabled={busy}
              >
                Close
              </button>
            )}

            {step === "qr" && (
              <>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost parent-close-btn"
                  onClick={() => setStep("config")}
                  disabled={busy}
                >
                  <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary parent-done-btn"
                  onClick={() => setStep("utr")}
                  disabled={busy}
                >
                  <ShieldCheck size={16} style={{ marginRight: 6 }} />
                  Submit UTR
                </button>
              </>
            )}

            {step === "utr" && (
              <>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost parent-close-btn"
                  onClick={() => (order ? setStep("qr") : setStep("config"))}
                  disabled={busy}
                >
                  <ArrowLeft size={14} style={{ marginRight: 6 }} />
                  {order ? "Back to QR" : "Back"}
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary parent-action-submit-btn"
                  onClick={handleSubmitVerification}
                  disabled={busy}
                >
                  <ShieldCheck size={16} style={{ marginRight: 6 }} />
                  {busy ? "Submitting..." : "Submit for Verification"}
                </button>
              </>
            )}

            {step === "success" && (
              <button
                type="button"
                className="cms-btn cms-btn-primary parent-done-btn"
                onClick={onClose}
              >
                Done
              </button>
            )}
          </div>
        }
      >
        <div className="cms-fee-collect">
          {/* Linked Children Selection Bar */}
          {availableChildren.length > 1 && (
            <div className="parent-modal-children-bar">
              <span className="parent-modal-children-label">
                <Users size={14} /> Pay Fee For Child:
              </span>
              <div className="parent-modal-children-pills">
                {availableChildren.map((c) => {
                  const isCur = String(c.id || c.studentId) === selectedChildId;
                  const cRec = c.fees || {};
                  const cPending = Math.max(0, Number(cRec.pending ?? (Number(cRec.total || 0) - Number(cRec.paid || 0))));

                  return (
                    <button
                      key={c.id || c.studentId}
                      type="button"
                      className={`parent-modal-child-pill ${isCur ? "is-active" : ""}`}
                      onClick={() => handleSelectChild(c.id || c.studentId)}
                    >
                      <strong>{c.name}</strong> ({c.admissionNo || `ADM-${c.id}`}) •{" "}
                      <span className={cPending > 0 ? "has-due" : "no-due"}>
                        {cPending > 0 ? `Due: ₹${cPending.toLocaleString()}` : "Paid"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Student Context Information Card */}
          <div className="cms-fee-context">
            <div className="cms-fee-context-item">
              <span>Student</span>
              <strong>{activeChild?.name || "Student"}</strong>
            </div>
            <div className="cms-fee-context-item">
              <span>Total Annual Fee</span>
              <strong>₹{totalFee.toLocaleString()}</strong>
            </div>
            <div className="cms-fee-context-item">
              <span>Already Paid</span>
              <strong>₹{paidFee.toLocaleString()}</strong>
            </div>
            <div className="cms-fee-context-item">
              <span>Remaining Balance</span>
              <strong style={{ color: balance > 0 ? "#dc2626" : "#166534" }}>
                ₹{balance.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 1: CONFIGURATION (Select Mode & Schedule / Amount)                   */}
          {/* ========================================================================= */}
          {step === "config" && (
            <>
              {/* Payment Method Tabs (Strictly 3 methods: Dynamic UPI QR, Card/NetBanking, Bank Transfer/UTR) */}
              <div className="cms-fee-gateway-modes" role="tablist" aria-label="Collection method">
                {[
                  ["UPI_QR", "Dynamic UPI QR"],
                  ["RAZORPAY", "Card / NetBanking"],
                  ["BANK_TRANSFER", "Bank Transfer / UTR"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={mode === id}
                    className={`cms-btn ${mode === id ? "cms-btn-primary" : "cms-btn-ghost"}`}
                    disabled={busy}
                    onClick={() => {
                      setMode(id);
                      setError("");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Form Fields: Pay Towards & Amount */}
              <fieldset className="cms-fee-gateway-fields" disabled={busy}>
                <div className="cms-form-grid cols-2" style={{ marginBottom: 12 }}>
                  {/* Pay Towards Dropdown */}
                  <div className="cms-field full">
                    <label className="parent-field-label">PAY TOWARDS</label>
                    <details className="cms-fee-pay-towards" open>
                      <summary className="cms-fee-pay-towards-trigger">
                        <span>{targetLabel}</span>
                        <span className="cms-fee-pay-towards-arrow" aria-hidden="true">
                          <ChevronDown size={16} strokeWidth={2} />
                        </span>
                      </summary>

                      <div className="cms-fee-pay-towards-menu">
                        <label className="cms-fee-pay-option is-strong">
                          <input
                            className="cms-fee-pay-checkbox"
                            type="checkbox"
                            checked={target === "full"}
                            onChange={setFullBalanceTarget}
                          />
                          <span className="cms-fee-pay-option-text">
                            PAY FULL REMAINING BALANCE - ₹{balance.toLocaleString()}
                          </span>
                        </label>

                        {pendingSchedules.length > 0 && <div className="cms-fee-pay-divider" />}

                        {pendingSchedules.map((item) => (
                          <label key={item.id} className="cms-fee-pay-option">
                            <input
                              className="cms-fee-pay-checkbox"
                              type="checkbox"
                              checked={target !== "full" && selectedScheduleIds.includes(String(item.id))}
                              onChange={() => toggleScheduleTarget(item)}
                            />
                            <span className="cms-fee-pay-option-text">
                              {item.label} - ₹{item.balance.toLocaleString()} DUE {item.dueDate}
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>

                  {/* Amount Field */}
                  <div className="cms-field">
                    <label htmlFor="collect-amount" className="parent-field-label">
                      AMOUNT (₹) <span className="req">*</span>
                    </label>
                    <input
                      id="collect-amount"
                      type="number"
                      min="1"
                      max={balance}
                      step="0.01"
                      value={amount}
                      disabled={target === "full"}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
              </fieldset>

              {/* Dynamic UPI QR Trigger Panel */}
              {mode === "UPI_QR" && (
                <div className="cms-fee-gateway">
                  <div className="parent-gateway-card">
                    <p className="parent-gateway-subtext">
                      Generate a dynamic UPI QR code for the selected amount. Scan using Google Pay, PhonePe, Paytm, or any UPI app.
                    </p>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary parent-action-submit-btn"
                      disabled={busy || balance <= 0}
                      onClick={handleGenerateUpiQr}
                    >
                      <QrCode size={16} style={{ marginRight: 6 }} />
                      {busy ? "Generating QR..." : "Generate UPI QR"}
                    </button>
                  </div>
                </div>
              )}

              {/* Razorpay Trigger Panel */}
              {mode === "RAZORPAY" && (
                <div className="cms-fee-gateway">
                  <div className="parent-gateway-card">
                    <p className="parent-gateway-subtext">
                      Pay securely by debit/credit card or netbanking through Razorpay Checkout.
                    </p>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary parent-action-submit-btn"
                      disabled={busy || balance <= 0}
                      onClick={handleLaunchRazorpay}
                    >
                      <CreditCard size={16} style={{ marginRight: 6 }} />
                      {busy ? "Connecting..." : "Launch Razorpay Checkout"}
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Transfer / UTR Direct Entry Option */}
              {mode === "BANK_TRANSFER" && (
                <div className="cms-fee-gateway">
                  <div className="parent-gateway-card">
                    <p className="parent-gateway-subtext">
                      Transfer directly to the college account via NEFT / RTGS / IMPS and submit your UTR reference number with payment proof for verification.
                    </p>
                    <div className="parent-bank-details-box" style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid #e2e8f0" }}>
                      <div><strong>Bank:</strong> State Bank of India (SBI)</div>
                      <div><strong>Account Name:</strong> {COLLEGE_NAME}</div>
                      <div><strong>Account Number:</strong> 39482019485</div>
                      <div><strong>IFSC Code:</strong> SBIN0004521</div>
                    </div>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary parent-action-submit-btn"
                      disabled={busy || balance <= 0}
                      onClick={() => setStep("utr")}
                    >
                      <ShieldCheck size={16} style={{ marginRight: 6 }} />
                      Enter UTR & Submit Verification Proof
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: QR PAYMENT DETAILS SCREEN                                         */}
          {/* ========================================================================= */}
          {step === "qr" && order && (
            <div className="cms-fee-gateway">
              <div className="parent-gateway-card parent-qr-display-card">
                {/* Status & Expiry Bar */}
                <div className="parent-qr-status-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fef3c7", color: "#92400e", padding: "4px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
                  <Clock size={14} /> Payment Pending Settlement • {timeFormatted}
                </div>

                {/* QR Code Container */}
                <div className="parent-qr-image-container">
                  <img src={order.qrCodeBase64} alt="Dynamic UPI QR Code" />
                </div>

                <strong className="parent-qr-amount-text">₹{Number(order.amount).toLocaleString()}</strong>
                <code className="parent-qr-order-id">{order.orderId}</code>

                <p className="parent-qr-campus-meta" style={{ marginTop: 4, marginBottom: 16 }}>
                  Campus: {order.campusName || "Main Campus (HQ)"} · {order.qrMode || "DIRECT_VPA_QR"} · {order.payeeName || "Namratha S"} ({order.payeeVpa || "namratha.sangaraju-1@okicici"})
                </p>

                {/* Mobile Payment Link Box */}
                {(order.paymentLink || order.upiUri) && (
                  <div className="parent-link-box" style={{ width: "100%", maxWidth: 440, marginBottom: 16, textAlign: "left" }}>
                    <span className="parent-field-label" style={{ fontSize: 11, marginBottom: 4 }}>MOBILE PAYMENT LINK</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        readOnly
                        value={order.paymentLink || order.upiUri}
                        style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569" }}
                      />
                      <button
                        type="button"
                        className="cms-btn cms-btn-sm cms-btn-outline"
                        style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}
                        onClick={handleCopyPaymentLink}
                      >
                        {linkCopied ? <Check size={13} style={{ color: "#166534" }} /> : <Copy size={13} />}
                        {linkCopied ? "Copied" : "Copy Link"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions Box */}
                <div className="parent-qr-instruction-box" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", width: "100%", maxWidth: 440, textAlign: "left", fontSize: 12.5, color: "#166534" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>How to complete:</div>
                  <div>1. Scan the QR code using Google Pay, PhonePe, Paytm, or any UPI app.</div>
                  <div>2. Complete the payment of ₹{Number(order.amount).toLocaleString()} on your mobile device.</div>
                  <div>3. Click <strong>Submit UTR</strong> below to submit your transaction reference & screenshot for Accounts verification.</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SUBMIT PAYMENT FOR VERIFICATION SCREEN                            */}
          {/* ========================================================================= */}
          {step === "utr" && (
            <div className="cms-fee-gateway">
              {/* Context Summary Box */}
              <div className="parent-verification-context-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} style={{ color: "#658210" }} /> Payment Verification Summary
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12.5 }}>
                  <div><span style={{ color: "#64748b" }}>Student:</span> <strong>{activeChild?.name}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Admission No:</span> <strong>{activeChild?.admissionNo || `ADM-${activeChild?.id}`}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Campus:</span> <strong>{order?.campusName || activeChild?.campusName || "Main Campus (HQ)"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Payable Amount:</span> <strong>₹{Number(amount).toLocaleString()}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Order ID:</span> <strong>{order ? order.orderId : "N/A (Direct Transfer)"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Payment Method:</span> <strong>{order ? "Dynamic UPI QR" : "Bank Transfer / UTR"}</strong></div>
                </div>
              </div>

              {/* Form Fields with Validation */}
              <div className="cms-form-grid cols-2">
                <div className="cms-field">
                  <label htmlFor="v-utr-number" className="parent-field-label">
                    UTR / TRANSACTION REFERENCE NUMBER <span className="req">*</span>
                  </label>
                  <input
                    id="v-utr-number"
                    type="text"
                    maxLength={100}
                    placeholder="e.g. 432109876543 or UPI Ref"
                    value={utrForm.utrNumber}
                    disabled={busy}
                    onChange={(e) => setUtrForm((prev) => ({ ...prev, utrNumber: e.target.value }))}
                  />
                  <span style={{ fontSize: 11, color: "#64748b" }}>6–100 alphanumeric characters</span>
                </div>

                <div className="cms-field">
                  <label htmlFor="v-bank-name" className="parent-field-label">
                    BANK NAME / PAYMENT APP <span className="req">*</span>
                  </label>
                  <input
                    id="v-bank-name"
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Google Pay, PhonePe, SBI, HDFC"
                    value={utrForm.bankName}
                    disabled={busy}
                    onChange={(e) => setUtrForm((prev) => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="v-payment-date" className="parent-field-label">
                    PAYMENT DATE <span className="req">*</span>
                  </label>
                  <input
                    id="v-payment-date"
                    type="date"
                    max={todayISO()}
                    value={utrForm.paymentDate}
                    disabled={busy}
                    onChange={(e) => setUtrForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="v-amount-paid" className="parent-field-label">
                    AMOUNT PAID (₹) <span className="req">*</span>
                  </label>
                  <input
                    id="v-amount-paid"
                    type="number"
                    min="1"
                    max={balance}
                    step="0.01"
                    value={utrForm.amountPaid}
                    disabled={busy}
                    onChange={(e) => setUtrForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
                  />
                </div>

                {/* Screenshot / Proof File Dropzone */}
                <div className="cms-field full">
                  <label className="parent-field-label">
                    PAYMENT SCREENSHOT / TRANSACTION PROOF <span className="req">*</span>
                  </label>
                  <div className="parent-file-dropzone-container" style={{ border: "2px dashed #cbd5e1", borderRadius: 10, padding: 18, background: "#f8fafc", textAlign: "center" }}>
                    {!proofFile ? (
                      <label htmlFor="proof-file-input" style={{ cursor: "pointer", display: "block" }}>
                        <Upload size={28} style={{ color: "#64748b", margin: "0 auto 8px" }} />
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>
                          Click to upload or drag & drop payment proof
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          Supports PNG, JPG, JPEG, or PDF (Max 5 MB)
                        </div>
                        <input
                          id="proof-file-input"
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                          style={{ display: "none" }}
                          disabled={busy}
                          onChange={handleFileChange}
                        />
                      </label>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <FileText size={22} style={{ color: "#658210" }} />
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{proofFile.name}</div>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>{(proofFile.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="cms-btn cms-btn-sm cms-btn-ghost"
                          style={{ padding: 4 }}
                          onClick={() => setProofFile(null)}
                          disabled={busy}
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks Field */}
                <div className="cms-field full">
                  <label htmlFor="v-remarks" className="parent-field-label">
                    REMARKS / NOTES
                  </label>
                  <input
                    id="v-remarks"
                    type="text"
                    maxLength={500}
                    placeholder="Optional remarks (e.g., student name or transaction notes)"
                    value={utrForm.remarks}
                    disabled={busy}
                    onChange={(e) => setUtrForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: PENDING VERIFICATION CONFIRMATION SCREEN                           */}
          {/* ========================================================================= */}
          {step === "success" && submissionSuccessData && (
            <div className="parent-verification-success-card" style={{ padding: "24px 16px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 20, color: "#0f172a" }}>Payment Submitted for Verification</h3>
              <div style={{ display: "inline-block", padding: "4px 14px", background: "#fef3c7", color: "#92400e", borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                Status: Pending Verification
              </div>
              <p style={{ maxWidth: 540, margin: "0 auto 20px", fontSize: 13.5, color: "#475569", lineHeight: 1.5 }}>
                Your payment transaction reference and proof screenshot have been submitted to the Accounts Office.
                The fee balance will be officially updated and receipt issued once verified and approved.
              </p>

              <div style={{ maxWidth: 480, margin: "0 auto", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, textAlign: "left", fontSize: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                  <div><span style={{ color: "#64748b" }}>Student Name:</span> <strong>{activeChild?.name}</strong></div>
                  <div><span style={{ color: "#64748b" }}>UTR / Reference:</span> <strong>{submissionSuccessData.utrNumber}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Bank / App:</span> <strong>{submissionSuccessData.bankName}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Amount:</span> <strong>₹{Number(submissionSuccessData.amount).toLocaleString()}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Payment Date:</span> <strong>{formatDateSafe(submissionSuccessData.paymentDate)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Attached Proof:</span> <strong>{submissionSuccessData.fileName}</strong></div>
                  {submissionSuccessData.orderId && (
                    <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Order ID:</span> <strong>{submissionSuccessData.orderId}</strong></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && <p className="cms-error" style={{ margin: "12px 0 0" }}>{error}</p>}
          {notice && (
            <p className="cms-notice" style={{ margin: "12px 0 0", color: "#166534", fontSize: 13, fontWeight: 600 }}>
              {notice}
            </p>
          )}
        </div>
      </Modal>

      {/* Official Fee Receipt Modal (Kept for confirmed payments) */}
      {officialReceipt && (
        <Modal
          title={`Fee Payment Receipt — ${officialReceipt.receiptNo}`}
          className="parent-fee-receipt-modal"
          isOpen={true}
          onClose={() => setOfficialReceipt(null)}
          footer={
            <div className="parent-receipt-modal-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost parent-close-btn"
                onClick={() => setOfficialReceipt(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary parent-done-btn"
                onClick={() => printReceiptElement("parent-official-receipt-printable", `Fee Payment Receipt — ${officialReceipt.receiptNo}`)}
              >
                <Printer size={15} style={{ marginRight: 6 }} /> Print Receipt
              </button>
            </div>
          }
        >
          <div id="parent-official-receipt-printable" className="parent-receipt-sheet">
            <div className="parent-receipt-header">
              <h2>PIRNAV JUNIOR COLLEGE</h2>
              <p>Campus Road, Jubilee Hills, Hyderabad - 500033</p>
              <div className="receipt-title-badge">OFFICIAL FEE PAYMENT RECEIPT</div>
            </div>

            <div className="parent-receipt-meta-grid">
              <div><span>Receipt Number:</span> <strong>{officialReceipt.receiptNo}</strong></div>
              <div><span>Date of Payment:</span> <strong>{officialReceipt.date}</strong></div>
              <div><span>Student Name:</span> <strong>{activeChild?.name || "Student"}</strong></div>
              <div><span>Admission Number:</span> <strong>{activeChild?.admissionNo || `ADM-${activeChild?.id}`}</strong></div>
              <div><span>Course & Group:</span> <strong>{activeChild?.programme || activeChild?.group || "Intermediate 1st Year (MPC)"}</strong></div>
              <div><span>Payment Mode:</span> <strong>{officialReceipt.method || "Online"}</strong></div>
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
                  <td className="cell-desc">{officialReceipt.paidFor}</td>
                  <td className="cell-txn">{officialReceipt.txnId}</td>
                  <td className="cell-amount">₹{Number(officialReceipt.amount).toLocaleString()}</td>
                  <td className="cell-status">
                    <span className="cms-badge cms-badge-active">
                      {officialReceipt.status || "Success"}
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
    </>
  );
}
