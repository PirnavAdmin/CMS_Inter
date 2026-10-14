/**
 * Faculty Reimbursement Service
 * Connects directly to backend API v1 endpoints.
 * All localStorage and sessionStorage mock caching have been removed.
 */

import { reimbursementApi } from "@/api/reimbursementApi.js";

export const EXPENSE_CATEGORIES = [
  "Travel",
  "Accommodation",
  "Food",
  "Teaching Materials",
  "Office Supplies",
  "Equipment",
  "Other",
];

export const PAYMENT_METHODS = [
  "Bank Transfer",
  "UPI",
  "Cash",
  "Cheque",
  "Other",
];

export const CLAIM_STATUSES = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

/**
 * Normalizes any single claim object from the backend API into standard frontend shape
 */
export function normalizeClaim(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id ?? raw.Id ?? raw.claimId ?? raw.ClaimId ?? "";
  const claimId = raw.claimId ?? raw.ClaimId ?? raw.id ?? raw.Id ?? (id ? `CLM-${id}` : "");

  // Faculty Details
  const facultyId =
    raw.facultyId ?? raw.FacultyId ?? raw.staffId ?? raw.StaffId ?? raw.employeeId ?? raw.EmployeeId ?? "";
  const facultyName =
    raw.facultyName ?? raw.FacultyName ?? raw.staffName ?? raw.StaffName ?? raw.name ?? raw.Name ?? "";
  const department =
    raw.department ?? raw.Department ?? raw.departmentName ?? raw.DepartmentName ?? "";
  const designation =
    raw.designation ?? raw.Designation ?? raw.designationName ?? raw.DesignationName ?? "";
  const email = raw.email ?? raw.Email ?? "";

  // Expense Details
  const category =
    raw.category ?? raw.Category ?? raw.expenseCategory ?? raw.ExpenseCategory ?? "Other";
  const expenseDate =
    raw.expenseDate ?? raw.ExpenseDate ?? raw.date ?? raw.Date ?? "";
  const amount = Number(
    raw.amount ?? raw.Amount ?? raw.claimedAmount ?? raw.ClaimedAmount ?? 0
  );
  const purpose =
    raw.purpose ?? raw.Purpose ?? raw.description ?? raw.Description ?? "";
  const paymentMethod =
    raw.paymentMethod ?? raw.PaymentMethod ?? raw.preferredPaymentMethod ?? raw.PreferredPaymentMethod ?? "Bank Transfer";
  const notes =
    raw.notes ?? raw.Notes ?? raw.additionalNotes ?? raw.AdditionalNotes ?? raw.billReference ?? "";

  // Status & Decision Details
  const status = raw.status ?? raw.Status ?? CLAIM_STATUSES.PENDING;
  const approvedAmount =
    raw.approvedAmount !== undefined && raw.approvedAmount !== null
      ? Number(raw.approvedAmount)
      : raw.ApprovedAmount !== undefined && raw.ApprovedAmount !== null
      ? Number(raw.ApprovedAmount)
      : null;
  const approvedBy = raw.approvedBy ?? raw.ApprovedBy ?? "";
  const approvalDate = raw.approvalDate ?? raw.ApprovalDate ?? "";
  const approvalRemarks =
    raw.approvalRemarks ?? raw.ApprovalRemarks ?? raw.adminNotes ?? raw.AdminNotes ?? raw.remarks ?? raw.Remarks ?? "";

  // Rejection Details
  const rejectedBy = raw.rejectedBy ?? raw.RejectedBy ?? "";
  const rejectionDate = raw.rejectionDate ?? raw.RejectionDate ?? "";
  const rejectionReason =
    raw.rejectionReason ?? raw.RejectionReason ?? raw.rejectNotes ?? raw.RejectNotes ?? raw.reason ?? raw.Reason ?? "";

  // Payment & Accounts Integration Details
  const accountReferenceId =
    raw.accountReferenceId ?? raw.AccountReferenceId ?? raw.accountRef ?? raw.AccountRef ?? "";
  const disbursedDate =
    raw.disbursedDate ?? raw.DisbursedDate ?? raw.paidDate ?? raw.PaidDate ?? "";
  const disbursedBy = raw.disbursedBy ?? raw.DisbursedBy ?? "";
  const paymentMode = raw.paymentMode ?? raw.PaymentMode ?? paymentMethod;
  const paymentReference =
    raw.paymentReference ?? raw.PaymentReference ?? raw.paymentRef ?? raw.PaymentRef ?? "";

  // Submission metadata
  const submissionDate =
    raw.submissionDate ?? raw.SubmissionDate ?? raw.createdAt ?? raw.CreatedAt ?? "";

  // Supporting Document Proof normalization
  let proof = null;
  if (raw.proof) {
    if (typeof raw.proof === "string") {
      proof = {
        name: raw.proofName ?? raw.ProofName ?? raw.proof.split("/").pop() ?? "Receipt Proof",
        url: raw.proof,
        dataUrl: raw.proof.startsWith("data:") ? raw.proof : null,
      };
    } else {
      proof = {
        name: raw.proof.name ?? raw.proof.Name ?? raw.proofName ?? raw.ProofName ?? "Receipt Proof",
        size: Number(raw.proof.size ?? raw.proof.Size ?? 0),
        type: raw.proof.type ?? raw.proof.Type ?? "application/pdf",
        dataUrl: raw.proof.dataUrl ?? raw.proof.DataUrl ?? null,
        url: raw.proof.url ?? raw.proof.Url ?? null,
      };
    }
  } else if (raw.proofUrl || raw.receiptUrl || raw.receiptFilePath || raw.filePath || raw.proofName) {
    const url = raw.proofUrl ?? raw.receiptUrl ?? raw.receiptFilePath ?? raw.filePath;
    const name =
      raw.proofName ?? raw.ProofName ?? raw.receiptFileName ?? (url ? String(url).split("/").pop() : "Receipt Proof");
    proof = {
      name,
      url,
      dataUrl: url && String(url).startsWith("data:") ? url : null,
      type: String(name).endsWith(".pdf")
        ? "application/pdf"
        : String(name).endsWith(".png")
        ? "image/png"
        : "image/jpeg",
    };
  }

  // Audit Log History normalization
  const rawAudit = raw.auditLog ?? raw.AuditLog ?? raw.auditTrail ?? raw.AuditTrail ?? [];
  const auditLog = Array.isArray(rawAudit)
    ? rawAudit.map((log, idx) => ({
        id: log.id ?? log.Id ?? `LOG-${idx}`,
        action: log.action ?? log.Action ?? "Action",
        actor: log.actor ?? log.Actor ?? log.userName ?? "User",
        role: log.role ?? log.Role ?? "Staff",
        timestamp: log.timestamp ?? log.Timestamp ?? log.createdAt ?? log.CreatedAt ?? "",
        notes: log.notes ?? log.Notes ?? log.remarks ?? log.Remarks ?? "",
      }))
    : [];

  return {
    id: String(id),
    claimId: String(claimId || id),
    facultyId: String(facultyId),
    facultyName: String(facultyName),
    department: String(department),
    designation: String(designation),
    email: String(email),
    category,
    expenseDate,
    amount,
    purpose,
    paymentMethod,
    notes,
    status,
    approvedAmount,
    approvedBy,
    approvalDate,
    approvalRemarks,
    rejectedBy,
    rejectionDate,
    rejectionReason,
    accountReferenceId,
    disbursedDate,
    disbursedBy,
    paymentMode,
    paymentReference,
    submissionDate,
    proof,
    auditLog,
    declaration: Boolean(raw.declaration ?? raw.Declaration ?? true),
    clarificationNote: raw.clarificationNote ?? raw.ClarificationNote ?? "",
    clarificationRequestedBy: raw.clarificationRequestedBy ?? raw.ClarificationRequestedBy ?? "",
    clarificationRequestDate: raw.clarificationRequestDate ?? raw.ClarificationRequestDate ?? "",
  };
}

/**
 * Normalizes list of claims from API response
 */
export function normalizeClaimsList(response) {
  if (!response) return [];
  const list =
    Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
      ? response.data.data
      : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.claims)
      ? response.claims
      : [];
  return list.map(normalizeClaim).filter(Boolean);
}

/**
 * Normalizes Summary KPI and Financial Review metrics
 */
export function normalizeSummary(rawSummary, claimsList = []) {
  const data = rawSummary?.data?.data ?? rawSummary?.data ?? rawSummary ?? {};
  const calculated = calculateReimbursementSummary(claimsList);
  const financial = calculateFinancialMetrics(claimsList);

  const total = Number(
    data.total ?? data.totalClaims ?? data.totalCount ?? calculated.total
  );
  const pending = Number(
    data.pending ?? data.pendingClaims ?? data.pendingCount ?? calculated.pending
  );
  const underReview = Number(
    data.underReview ?? data.underReviewClaims ?? data.underReviewCount ?? calculated.underReview
  );
  const approved = Number(
    data.approved ?? data.approvedClaims ?? data.approvedCount ?? calculated.approved
  );
  const rejected = Number(
    data.rejected ?? data.rejectedClaims ?? data.rejectedCount ?? calculated.rejected
  );
  const paid = Number(
    data.paid ?? data.paidClaims ?? data.paidCount ?? calculated.paid
  );

  const totalClaimedAmount = Number(
    data.totalClaimedAmount ?? data.totalAmount ?? data.totalClaimed ?? calculated.totalClaimedAmount
  );
  const totalApprovedAmount = Number(
    data.totalApprovedAmount ?? data.approvedAmount ?? calculated.totalApprovedAmount
  );
  const totalDisbursedAmount = Number(
    data.totalDisbursedAmount ?? data.disbursedAmount ?? calculated.totalDisbursedAmount
  );

  const integratedPayablesCount = Number(
    data.integratedPayablesCount ??
      data.integratedPayables ??
      data.payablesCount ??
      data.accountEntriesCount ??
      (approved + paid)
  );

  return {
    total,
    pending,
    underReview,
    awaitingReviewCount: pending + underReview,
    approved,
    rejected,
    paid,
    totalClaimedAmount,
    totalApprovedAmount,
    totalDisbursedAmount,
    integratedPayablesCount,
    // Financial Review Cards values
    totalClaimed: Number(data.totalClaimed ?? data.totalClaimedAmount ?? financial.totalClaimed),
    awaitingReview: Number(data.awaitingReview ?? data.awaitingReviewAmount ?? financial.awaitingReview),
    approvedUnpaid: Number(data.approvedUnpaid ?? data.approvedUnpaidAmount ?? financial.approvedUnpaid),
    totalPaid: Number(data.totalPaid ?? data.totalPaidAmount ?? data.disbursedAmount ?? financial.totalPaid),
    totalRejected: Number(data.totalRejected ?? data.totalRejectedAmount ?? financial.totalRejected),
    counts: {
      total,
      pending,
      underReview,
      awaitingReviewCount: pending + underReview,
      approved,
      paid,
      rejected,
    },
  };
}

/**
 * 1. Fetches Summary from GET /api/v1/reimbursements/summary
 */
export async function fetchReimbursementSummary(params = {}, currentClaims = []) {
  try {
    const res = await reimbursementApi.getReimbursementSummary(params);
    return normalizeSummary(res, currentClaims);
  } catch (err) {
    console.warn("reimbursementApi.getReimbursementSummary failed, computing from current claims:", err);
    return normalizeSummary({}, currentClaims);
  }
}

/**
 * 2. Fetches All Claims from GET /api/v1/reimbursements (Finance & Admin Review Tab)
 */
export async function fetchClaims(params = {}) {
  try {
    const res = await reimbursementApi.getReimbursements(params);
    return normalizeClaimsList(res);
  } catch (err) {
    console.warn("reimbursementApi.getReimbursements failed:", err);
    return [];
  }
}

/**
 * 3. Fetches Faculty Claims from GET /api/v1/reimbursements/my-claims (My Claims Tab)
 */
export async function fetchMyClaims(params = {}) {
  try {
    const res = await reimbursementApi.getMyClaims(params);
    return normalizeClaimsList(res);
  } catch (err) {
    console.warn("reimbursementApi.getMyClaims failed:", err);
    return [];
  }
}

/**
 * 4. Fetches Detailed Single Claim from GET /api/v1/reimbursements/{id} (View / Preview Modal)
 */
export async function fetchClaimById(id) {
  try {
    const res = await reimbursementApi.getReimbursementById(id);
    const raw = res?.data?.data ?? res?.data ?? res;
    return normalizeClaim(raw);
  } catch (err) {
    console.warn("reimbursementApi.getReimbursementById failed:", err);
    return null;
  }
}

/**
 * 5 & 6. Submits Claim to POST /api/v1/reimbursements and uploads proof to POST /api/v1/reimbursements/{id}/upload-proof
 */
export async function submitClaim(claimPayload) {
  // Validate basic required fields
  if (!claimPayload.facultyName || !claimPayload.facultyName.trim()) {
    throw new Error("Faculty Name is required.");
  }
  if (!claimPayload.department || !claimPayload.department.trim()) {
    throw new Error("Department is required.");
  }
  if (!claimPayload.expenseDate) {
    throw new Error("Expense Date is required.");
  }
  const numAmount = Number(claimPayload.amount);
  if (!claimPayload.amount || Number.isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Amount must be greater than ₹0.");
  }
  if (!claimPayload.purpose || claimPayload.purpose.trim().length < 5) {
    throw new Error("Purpose must be at least 5 characters.");
  }

  const payload = {
    facultyId: claimPayload.facultyId || "",
    facultyName: claimPayload.facultyName.trim(),
    department: claimPayload.department.trim(),
    designation: claimPayload.designation?.trim() || "",
    email: claimPayload.email?.trim() || "",
    category: claimPayload.category || "Teaching Materials",
    expenseDate: claimPayload.expenseDate,
    amount: numAmount,
    purpose: claimPayload.purpose.trim(),
    paymentMethod: claimPayload.paymentMethod || "Bank Transfer",
    notes: claimPayload.notes?.trim() || "",
    declaration: Boolean(claimPayload.declaration),
  };

  // POST /api/v1/reimbursements
  const res = await reimbursementApi.submitReimbursementClaim(payload);
  const created = res?.data?.data ?? res?.data ?? res;
  const newId = created?.id ?? created?.claimId ?? created?.Id ?? created?.ClaimId;

  // If proof file is attached, upload via POST /api/v1/reimbursements/{id}/upload-proof
  if (claimPayload.proof && newId) {
    try {
      const rawFile = claimPayload.proof.rawFile || claimPayload.proof.file;
      if (rawFile instanceof File || rawFile instanceof Blob) {
        await reimbursementApi.uploadProof(newId, rawFile);
      } else if (claimPayload.proof.dataUrl) {
        // Convert base64 dataUrl to Blob
        const blob = dataUrlToBlob(claimPayload.proof.dataUrl);
        await reimbursementApi.uploadProof(newId, blob);
      }
    } catch (uploadErr) {
      console.warn("Proof file upload failed after claim creation:", uploadErr);
    }
  }

  // Notify components across window
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cms-reimbursements-updated"));
  }

  return normalizeClaim(created) || { ...payload, id: newId, claimId: newId };
}

/**
 * 7. Approves claim via PATCH /api/v1/reimbursements/{id}/verify
 */
export async function approveClaim(claimId, payload = {}) {
  const body = {
    approvedAmount: Number(payload.approvedAmount) || undefined,
    remarks: payload.remarks || payload.approvalRemarks || "Approved",
    adminNotes: payload.remarks || payload.adminNotes || "Approved",
    approvedBy: payload.approvedBy || "Finance Admin",
  };
  const res = await reimbursementApi.verifyReimbursement(claimId, body);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cms-reimbursements-updated"));
    window.dispatchEvent(new Event("cms-account-updated"));
  }
  return res?.data?.data ?? res?.data ?? res;
}

export const verifyClaim = approveClaim;

/**
 * 8. Rejects claim via PATCH /api/v1/reimbursements/{id}/reject
 */
export async function rejectClaim(claimId, payload = {}) {
  const reason = payload.rejectionReason || payload.reason || payload.rejectNotes || "Rejected";
  const body = {
    rejectionReason: reason,
    rejectNotes: reason,
    reason: reason,
    rejectedBy: payload.rejectedBy || "Finance Admin",
  };
  const res = await reimbursementApi.rejectReimbursement(claimId, body);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cms-reimbursements-updated"));
  }
  return res?.data?.data ?? res?.data ?? res;
}

/**
 * 5. Fetches Dedicated List for Account Ledger Modal from GET /api/v1/reimbursements/account-entries
 */
export function normalizeAccountEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id =
    raw.accountEntryId ??
    raw.AccountEntryId ??
    raw.voucherId ??
    raw.VoucherId ??
    raw.accountReferenceId ??
    raw.AccountReferenceId ??
    raw.id ??
    raw.Id ??
    "";
  const claimId = raw.claimId ?? raw.ClaimId ?? "";
  const facultyName =
    raw.facultyName ?? raw.FacultyName ?? raw.staffName ?? raw.StaffName ?? "";
  const facultyId =
    raw.facultyId ?? raw.FacultyId ?? raw.staffId ?? raw.StaffId ?? "";
  const department = raw.department ?? raw.Department ?? "";
  const category = raw.category ?? raw.Category ?? "Other";
  const amount = Number(
    raw.amount ??
      raw.Amount ??
      raw.approvedAmount ??
      raw.ApprovedAmount ??
      raw.payableAmount ??
      raw.PayableAmount ??
      0
  );
  const approvalDate = raw.approvalDate ?? raw.ApprovalDate ?? raw.date ?? "";
  const paymentStatus =
    raw.paymentStatus ??
    raw.PaymentStatus ??
    (raw.status === "Paid"
      ? "Paid / Disbursed"
      : "Payable (Awaiting Disbursement)");
  const disbursedDate = raw.disbursedDate ?? raw.DisbursedDate ?? "";
  const paymentRef =
    raw.paymentRef ??
    raw.PaymentRef ??
    raw.paymentReference ??
    raw.PaymentReference ??
    "";
  const paymentMode = raw.paymentMode ?? raw.PaymentMode ?? "";

  return {
    id: String(id),
    accountEntryId: String(id),
    voucherId: String(id),
    claimId: String(claimId),
    facultyName: String(facultyName),
    facultyId: String(facultyId),
    department: String(department),
    category: String(category),
    amount,
    approvedAmount: amount,
    approvalDate,
    paymentStatus,
    disbursedDate,
    paymentRef,
    paymentMode,
  };
}

export async function fetchAccountEntries(params = {}) {
  try {
    const res = await reimbursementApi.getAccountEntries(params);
    const list =
      Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.items)
        ? res.items
        : [];
    return list.map(normalizeAccountEntry).filter(Boolean);
  } catch (err) {
    console.warn("reimbursementApi.getAccountEntries call failed:", err);
    return [];
  }
}

/**
 * 9. Requests clarification via PATCH /api/v1/reimbursements/{id}/clarification (fallback PUT)
 */
export async function requestClarification(claimId, payload = {}) {
  const body = {
    reviewer: payload.reviewer || "Finance Reviewer",
    clarificationNote: payload.clarificationNote || "",
    notes: payload.clarificationNote || "",
  };
  const res = await reimbursementApi.requestClarification(claimId, body);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cms-reimbursements-updated"));
  }
  return res?.data?.data ?? res?.data ?? res;
}

/**
 * 9. Marks claim as paid via PATCH /api/v1/reimbursements/{id}/mark-paid
 */
export async function disburseClaimPayment(claimId, payload = {}) {
  const body = {
    paymentReference: payload.paymentRef || payload.paymentReference || "Paid",
    paymentRef: payload.paymentRef || payload.paymentReference || "Paid",
    paymentMode: payload.paymentMode || "Bank Transfer",
    disbursedDate: payload.disbursedDate || new Date().toISOString().split("T")[0],
    disbursedBy: payload.disbursedBy || "Accounts Officer",
  };
  const res = await reimbursementApi.markReimbursementPaid(claimId, body);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cms-reimbursements-updated"));
    window.dispatchEvent(new Event("cms-account-updated"));
  }
  return res?.data?.data ?? res?.data ?? res;
}

export const markPaid = disburseClaimPayment;

/**
 * Helper: Converts base64 Data URL to Blob for FormData upload
 */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Derives statistical summary counts from claims
 */
export function calculateReimbursementSummary(claims = []) {
  const total = claims.length;
  let pending = 0;
  let underReview = 0;
  let approved = 0;
  let rejected = 0;
  let paid = 0;
  let totalClaimedAmount = 0;
  let totalApprovedAmount = 0;
  let totalDisbursedAmount = 0;

  claims.forEach((c) => {
    const amt = Number(c.amount) || 0;
    totalClaimedAmount += amt;

    if (c.status === CLAIM_STATUSES.PENDING) {
      pending += 1;
    } else if (c.status === CLAIM_STATUSES.UNDER_REVIEW) {
      underReview += 1;
    } else if (c.status === CLAIM_STATUSES.APPROVED) {
      approved += 1;
      totalApprovedAmount += Number(c.approvedAmount || amt);
    } else if (c.status === CLAIM_STATUSES.REJECTED) {
      rejected += 1;
    } else if (c.status === CLAIM_STATUSES.PAID) {
      paid += 1;
      totalApprovedAmount += Number(c.approvedAmount || amt);
      totalDisbursedAmount += Number(c.approvedAmount || amt);
    }
  });

  return {
    total,
    pending,
    underReview,
    awaitingReviewCount: pending + underReview,
    approved,
    rejected,
    paid,
    totalClaimedAmount,
    totalApprovedAmount,
    totalDisbursedAmount,
  };
}

/**
 * Comprehensive financial report metrics for Finance & Admin
 */
export function calculateFinancialMetrics(claims = []) {
  let totalClaimed = 0;
  let awaitingReview = 0;
  let approvedUnpaid = 0;
  let totalPaid = 0;
  let totalRejected = 0;

  let pendingCount = 0;
  let underReviewCount = 0;
  let approvedCount = 0;
  let paidCount = 0;
  let rejectedCount = 0;

  claims.forEach((c) => {
    const amt = Number(c.amount) || 0;
    const approvedAmt = Number(c.approvedAmount) || amt;
    totalClaimed += amt;

    if (c.status === CLAIM_STATUSES.PENDING) {
      awaitingReview += amt;
      pendingCount += 1;
    } else if (c.status === CLAIM_STATUSES.UNDER_REVIEW) {
      awaitingReview += amt;
      underReviewCount += 1;
    } else if (c.status === CLAIM_STATUSES.APPROVED) {
      approvedUnpaid += approvedAmt;
      approvedCount += 1;
    } else if (c.status === CLAIM_STATUSES.PAID) {
      totalPaid += approvedAmt;
      paidCount += 1;
    } else if (c.status === CLAIM_STATUSES.REJECTED) {
      totalRejected += amt;
      rejectedCount += 1;
    }
  });

  return {
    totalClaimed,
    awaitingReview,
    approvedUnpaid,
    totalPaid,
    totalRejected,
    counts: {
      total: claims.length,
      pending: pendingCount,
      underReview: underReviewCount,
      awaitingReviewCount: pendingCount + underReviewCount,
      approved: approvedCount,
      paid: paidCount,
      rejected: rejectedCount,
    },
  };
}

/**
 * Exports claims to CSV with browser download trigger
 */
export function exportClaimsToCsv(claims = []) {
  const headers = [
    "Claim ID",
    "Faculty Name",
    "Faculty ID",
    "Department",
    "Designation",
    "Category",
    "Expense Date",
    "Amount (INR)",
    "Approved Amount (INR)",
    "Submission Date",
    "Status",
    "Account Reference",
    "Payment Mode",
    "Payment Reference",
    "Purpose",
  ];

  const escapeField = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = claims.map((c) => [
    escapeField(c.claimId),
    escapeField(c.facultyName),
    escapeField(c.facultyId),
    escapeField(c.department),
    escapeField(c.designation),
    escapeField(c.category),
    escapeField(c.expenseDate),
    escapeField(c.amount),
    escapeField(c.approvedAmount || ""),
    escapeField(c.submissionDate),
    escapeField(c.status),
    escapeField(c.accountReferenceId || ""),
    escapeField(c.paymentMode || c.paymentMethod || ""),
    escapeField(c.paymentReference || ""),
    escapeField(c.purpose),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Reimbursement_Claims_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return csvContent;
}

// Backward-compatible placeholders for existing components without local storage mock
export function getStoredClaims() {
  return [];
}
export function getStoredAccountEntries() {
  return [];
}
export const submitReimbursementClaim = submitClaim;
