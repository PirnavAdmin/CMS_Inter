// Gateway amounts use rupees; only Razorpay Checkout uses currency subunits.
export function gatewayData(payload) {
  let data = payload;
  let acknowledged;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!data || typeof data !== "object") throw new Error("Invalid payment API response.");
    if (data.success === false || data.Success === false)
      throw new Error(data.message || data.Message || "Payment request was rejected.");
    if (data.success === true || data.Success === true) acknowledged = true;
    if (data.data !== undefined || data.Data !== undefined) data = data.data ?? data.Data;
    else {
      if (Array.isArray(data)) return data.map(gatewayData);
      const normalized = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key[0].toLowerCase() + key.slice(1), value]),
      );
      return acknowledged === true && normalized.success === undefined
        ? { ...normalized, success: true }
        : normalized;
    }
  }
  throw new Error("Invalid payment API response envelope.");
}

export const installmentIdFor = (item) => item?.feeInstallmentId || item?.installmentId || item?.id;

// Configuration is always explicitly scoped; never resolve a college/default account locally.
export function paymentConfigCampusId(value) {
  const id = Number(value);
  if (!/^\d+$/.test(String(value ?? "")) || !Number.isSafeInteger(id) || id <= 0)
    throw new Error("Select a valid campus before loading payment settings.");
  return id;
}

export const PAYMENT_CONFIG_DEFAULTS = Object.freeze({
  bankName: "", accountHolderName: "", accountNumber: "", confirmAccountNumber: "",
  ifscCode: "", branchName: "", accountType: "Current", enableOfflineUtr: false,
  payeeVpa: "", payeeName: "", currency: "INR", mcc: "8220", enableCounterUpiQr: false,
  provider: "Razorpay", isLiveMode: false, razorpayKeyId: "", razorpayKeySecret: "",
  razorpayWebhookSecret: "", hasRazorpayKeySecret: false, hasRazorpayWebhookSecret: false,
  autoCapture: true, enableRazorpay: false, pollingIntervalMs: 1200,
  monitoringTimeoutSeconds: 600, baseAppUrl: "", frontendPort: 5173, webhookUrl: "",
});
const paymentConfigFields = Object.keys(PAYMENT_CONFIG_DEFAULTS).filter((key) => ![
  "confirmAccountNumber", "hasRazorpayKeySecret", "hasRazorpayWebhookSecret", "webhookUrl",
].includes(key));

export function normalizePaymentConfig(payload, campusId) {
  const data = gatewayData(payload);
  const id = paymentConfigCampusId(campusId);
  if (data.campusId == null || Number(data.campusId) !== id)
    throw new Error("The backend did not return this campus's configuration. No default account was substituted.");
  for (const key of ["enableOfflineUtr", "enableCounterUpiQr", "enableRazorpay", "isLiveMode", "autoCapture", "hasRazorpayKeySecret", "hasRazorpayWebhookSecret"])
    if (typeof data[key] !== "boolean") throw new Error("The payment configuration response is incomplete. Contact the backend team.");
  if (data.accountNumber != null && typeof data.accountNumber !== "string")
    throw new Error("The backend must return account numbers as strings to preserve leading zeroes.");
  for (const key of Object.keys(PAYMENT_CONFIG_DEFAULTS).filter((key) => typeof PAYMENT_CONFIG_DEFAULTS[key] === "string" && !["razorpayKeySecret", "razorpayWebhookSecret", "confirmAccountNumber"].includes(key)))
    if (data[key] != null && typeof data[key] !== "string") throw new Error("The backend returned an invalid payment configuration field.");
  for (const [key, min, max] of [["pollingIntervalMs", 500, 10000], ["monitoringTimeoutSeconds", 60, 3600], ["frontendPort", 1, 65535]])
    if (!Number.isInteger(data[key]) || data[key] < min || data[key] > max) throw new Error("The backend returned invalid or missing polling/network settings.");
  const result = { ...PAYMENT_CONFIG_DEFAULTS, campusId: id };
  for (const key of Object.keys(PAYMENT_CONFIG_DEFAULTS))
    if (data[key] != null && !["razorpayKeySecret", "razorpayWebhookSecret", "confirmAccountNumber"].includes(key)) result[key] = data[key];
  // Secret values from a faulty response are never put into form state.
  return result;
}

export const PAYMENT_CONFIG_SECTIONS = Object.freeze({
  bank: ["bankName", "accountHolderName", "accountNumber", "confirmAccountNumber", "ifscCode", "branchName", "accountType", "enableOfflineUtr"],
  upi: ["payeeVpa", "payeeName", "currency", "mcc", "enableCounterUpiQr"],
  razorpay: ["provider", "isLiveMode", "razorpayKeyId", "razorpayKeySecret", "razorpayWebhookSecret", "autoCapture", "enableRazorpay"],
  advanced: ["pollingIntervalMs", "monitoringTimeoutSeconds", "baseAppUrl", "frontendPort"],
});

export function paymentConfigErrors(form, section) {
  if (section && !PAYMENT_CONFIG_SECTIONS[section]) throw new Error("Unknown payment configuration section.");
  const errors = {};
  for (const key of ["bankName", "accountHolderName", "accountNumber", "ifscCode"])
    if (!String(form[key] || "").trim()) errors[key] = "This field is required.";
  if (form.accountNumber && !/^\d{6,34}$/.test(form.accountNumber)) errors.accountNumber = "Enter 6–34 digits, preserving leading zeroes.";
  if (form.accountNumber !== form.confirmAccountNumber) errors.confirmAccountNumber = "Account numbers must match. Re-enter the receiving account number.";
  if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase())) errors.ifscCode = "Enter a valid 11-character IFSC code.";
  if (!["Current", "Savings"].includes(form.accountType)) errors.accountType = "Choose Current or Savings.";
  if ((form.enableCounterUpiQr || form.payeeVpa) && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(form.payeeVpa)) errors.payeeVpa = "Enter a valid UPI ID, such as merchant@bank.";
  if (form.enableCounterUpiQr && !form.payeeName.trim()) errors.payeeName = "Payee display name is required for QR collection.";
  if (form.currency !== "INR") errors.currency = "Only INR is supported.";
  if (form.mcc && !/^\d{4}$/.test(form.mcc)) errors.mcc = "MCC must contain four digits.";
  if (form.enableRazorpay && !new RegExp(`^rzp_${form.isLiveMode ? "live" : "test"}_[A-Za-z0-9]+$`).test(form.razorpayKeyId)) errors.razorpayKeyId = "Enter a Razorpay key ID matching the selected mode.";
  for (const [key, flag] of [["razorpayKeySecret", "hasRazorpayKeySecret"], ["razorpayWebhookSecret", "hasRazorpayWebhookSecret"]]) {
    if ((section ? form.enableRazorpay && !form[flag] : form.enableRazorpay || form[flag]) && !form[key].trim()) errors[key] = form[flag]
      ? "Saved secret exists. Blank-secret preservation is not verified; provide a replacement before saving."
      : "A secret is required when Razorpay is enabled.";
  }
  for (const [key, min, max] of [["pollingIntervalMs", 500, 10000], ["monitoringTimeoutSeconds", 60, 3600], ["frontendPort", 1, 65535]])
    if (!Number.isInteger(Number(form[key])) || Number(form[key]) < min || Number(form[key]) > max) errors[key] = `Enter a whole number from ${min} to ${max}.`;
  if (form.baseAppUrl) {
    try {
      const url = new URL(form.baseAppUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    } catch { errors.baseAppUrl = "Enter an HTTP(S) application URL without credentials, query or fragment."; }
  }
  return section ? Object.fromEntries(Object.entries(errors).filter(([key]) => PAYMENT_CONFIG_SECTIONS[section].includes(key))) : errors;
}

export function paymentConfigPayload(form, campusId, section) {
  const errors = paymentConfigErrors(form, section);
  if (Object.keys(errors).length) throw new Error("Correct the payment configuration fields before saving.");
  const payload = { campusId: paymentConfigCampusId(campusId) };
  for (const key of paymentConfigFields) {
    const value = form[key];
    // Never submit blank secrets with unverified preservation semantics.
    if (["razorpayKeySecret", "razorpayWebhookSecret"].includes(key) && !value.trim()) continue;
    payload[key] = typeof value === "string" ? value.trim() : value;
  }
  payload.ifscCode = payload.ifscCode.toUpperCase();
  for (const key of ["pollingIntervalMs", "monitoringTimeoutSeconds", "frontendPort"]) payload[key] = Number(payload[key]);
  return payload;
}

// FeePaymentId, receipt IDs, generic row IDs and provider pay_* references are not gateway PKs.
export function gatewayTransactionIdFor(row = {}) {
  const id =
    row.paymentGatewayTransactionId ??
    row.PaymentGatewayTransactionId ??
    row.gatewayTransactionId ??
    row.GatewayTransactionId ??
    row.transactionId ??
    row.TransactionId;
  return /^\d+$/.test(String(id ?? "")) && Number.isSafeInteger(Number(id)) && Number(id) > 0
    ? Number(id)
    : null;
}

export function hasPaymentReversalRole(user = {}, storedRole = "") {
  const roles = [
    storedRole,
    user.role,
    user.roleCode,
    ...(Array.isArray(user.roles) ? user.roles : [user.roles]),
    ...(Array.isArray(user.roleCodes) ? user.roleCodes : [user.roleCodes]),
  ];
  return roles.some((role) => {
    const value = role && typeof role === "object" ? role.code || role.roleName || role.name : role;
    return ["admin", "superadmin", "principal", "accountant", "finance"].includes(
      String(value || "")
        .toLowerCase()
        .replace(/[\s_-]/g, ""),
    );
  });
}

export function isReversedPayment(row = {}) {
  return (
    row.isReversed === true ||
    row.IsReversed === true ||
    [
      row.status,
      row.Status,
      row.gatewayStatus,
      row.GatewayStatus,
      row.transactionStatus,
      row.TransactionStatus,
    ].some((status) =>
      ["reversed", "refunded"].includes(
        String(status || "")
          .trim()
          .toLowerCase(),
      ),
    )
  );
}

export function canReversePayment(row, authorized) {
  const status =
    row?.gatewayStatus ||
    row?.GatewayStatus ||
    row?.transactionStatus ||
    row?.TransactionStatus ||
    row?.status ||
    row?.Status;
  const unsettled = [
    row?.status,
    row?.Status,
    row?.gatewayStatus,
    row?.GatewayStatus,
    row?.transactionStatus,
    row?.TransactionStatus,
  ].some((value) =>
    ["failed", "pending", "created", "authorized", "cancelled", "canceled", "rejected"].includes(
      String(value || "")
        .trim()
        .toLowerCase(),
    ),
  );
  return Boolean(
    authorized &&
    gatewayTransactionIdFor(row) &&
    !isReversedPayment(row) &&
    !unsettled &&
    String(status || "")
      .trim()
      .toLowerCase() === "captured" &&
    Number.isFinite(Number(row.amount ?? row.Amount)) &&
    Number(row.amount ?? row.Amount) > 0,
  );
}

export function reversalPayload({ transactionId, reason }) {
  const id = gatewayTransactionIdFor({ transactionId });
  if (!id) throw new Error("A valid PaymentGatewayTransaction ID is required.");
  const explanation = String(reason || "").trim();
  if (explanation.length < 5 || !/[\p{L}\p{N}]/u.test(explanation))
    throw new Error("Provide a meaningful reversal reason of at least 5 characters.");
  return { transactionId: id, reason: explanation };
}

// Validate without rewriting the backend URL; never substitute the counter's hostname/IP.
export function mobilePaymentLinkFor(value, order) {
  if (typeof value !== "string" || !value || value !== value.trim()) return "";
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hash)
      return "";
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      /^127\./.test(host) ||
      ["[::1]", "0.0.0.0"].includes(host)
    )
      return "";
    if (
      url.pathname !== `/student/fees/pay/${order.studentFeeId}` ||
      url.searchParams.getAll("orderId").length !== 1 ||
      url.searchParams.get("orderId") !== order.orderId
    )
      return "";
    return value;
  } catch {
    return "";
  }
}

export function backendOverdue(account = {}) {
  return (
    String(account.backendFeeStatus || "")
      .trim()
      .toLowerCase() === "overdue" ||
    (account.installments || []).some(
      (item) =>
        String(item.backendStatus || "")
          .trim()
          .toLowerCase() === "overdue",
    )
  );
}
export function pendingInstallments(account) {
  const groups = new Map();
  for (const item of account.installments || []) {
    const id = Number(installmentIdFor(item));
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    groups.set(id, [...(groups.get(id) || []), item]);
  }
  return Array.from(groups.values())
    .filter((rows) =>
      rows.every(
        (item) =>
          !["paid", "completed", "settled"].includes(String(item.status).trim().toLowerCase()) &&
          Number.isFinite(Number(item.balance)) &&
          Number(item.balance) > 0 &&
          Number(item.balance) === Number(rows[0].balance),
      ),
    )
    .map((rows) => rows[0]);
}

export function collectionPayload(account, target, selectedIds, amount) {
  const studentId = Number(account.studentId);
  const studentFeeId = Number(
    account.assignmentId || account.studentFeeAssignmentId || account.studentFeeId,
  );
  if (
    !Number.isSafeInteger(studentId) ||
    studentId <= 0 ||
    !Number.isSafeInteger(studentFeeId) ||
    studentFeeId <= 0
  )
    throw new Error("Valid student and fee assignment IDs are required.");
  const value = Number(amount);
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  )
    throw new Error("Enter a positive amount with at most two decimal places.");
  if (!Number.isFinite(Number(account.balance)) || value > Number(account.balance))
    throw new Error("Amount cannot exceed the outstanding balance.");
  const feeInstallmentIds = target === "full" ? [] : [...new Set(selectedIds.map(Number))];
  if (target !== "full") {
    const pending = pendingInstallments(account);
    if (
      !feeInstallmentIds.length ||
      feeInstallmentIds.some(
        (id) =>
          !Number.isSafeInteger(id) ||
          id <= 0 ||
          !pending.some((item) => Number(installmentIdFor(item)) === id),
      )
    )
      throw new Error("Select available unpaid schedules with valid installment IDs.");
    const limit = pending
      .filter((item) => feeInstallmentIds.includes(Number(installmentIdFor(item))))
      .reduce((sum, item) => sum + Number(item.balance), 0);
    if (value > limit) throw new Error("Amount cannot exceed the selected schedule total.");
  }
  return { studentId, studentFeeId, feeInstallmentIds, amount: value };
}

export function settlementState(data, order) {
  if (data.orderId !== order.orderId)
    throw new Error("Payment status belongs to a different order.");
  if (data.studentFeeId != null && Number(data.studentFeeId) !== Number(order.studentFeeId))
    throw new Error("Payment status belongs to a different fee account.");
  const status = String(data.status || "").toLowerCase();
  if (["failed", "cancelled", "canceled", "expired", "rejected"].includes(status)) return "FAILED";
  if (data.isPaid === true || ["captured", "paid", "settled"].includes(status)) {
    if (data.isPaid === false) return "PENDING";
    if (
      !Number.isFinite(Number(data.amount)) ||
      Math.abs(Number(data.amount) - order.amount) > 0.005
    )
      throw new Error("Confirmed payment amount does not match this order.");
    return "SUCCESS";
  }
  return "PENDING";
}

// Recursive timeouts deliberately wait for each request to finish; no overlapping probes.
export function startPaymentPolling({
  order,
  probe,
  onUpdate,
  onSuccess,
  intervalMs = 1200,
  timeoutMs = 600000,
  now = Date.now,
  schedule = setTimeout,
  unschedule = clearTimeout,
}) {
  const controller = new AbortController();
  let timer,
    deadlineTimer,
    stopped = false;
  const deadline = Math.min(now() + timeoutMs, order.expiresAt || Infinity);
  const stop = () => {
    stopped = true;
    controller.abort();
    unschedule(timer);
    unschedule(deadlineTimer);
  };
  const timeout = () => {
    if (stopped) return;
    stop();
    onUpdate({
      status: "TIMEOUT",
      error: "Monitoring ended. Check this order again before collecting another payment.",
    });
  };
  const tick = async () => {
    if (stopped) return;
    if (now() >= deadline) {
      timeout();
      return;
    }
    try {
      const data = await probe(controller.signal);
      if (stopped) return;
      if (now() >= deadline) {
        timeout();
        return;
      }
      const status = settlementState(data, order);
      if (status === "SUCCESS") {
        stop();
        onUpdate({ status, error: "" });
        onSuccess(data);
        return;
      }
      if (status === "FAILED") {
        stop();
        onUpdate({ status, error: data.failureReason || `Payment ${data.status}.` });
        return;
      }
      onUpdate({ status: "PENDING", error: "" });
    } catch (error) {
      if (stopped) return;
      const code = error.response?.status;
      if (
        (code >= 400 && code < 500 && code !== 408 && code !== 429) ||
        (!code && error.name === "Error" && !error.code)
      ) {
        stop();
        onUpdate({ status: "ERROR", error: error.message });
        return;
      }
      onUpdate({ status: "PENDING", error: error.message || "Unable to check payment; retrying." });
    }
    if (!stopped) timer = schedule(tick, intervalMs);
  };
  deadlineTimer = schedule(timeout, Math.max(0, deadline - now()));
  tick();
  return stop;
}
