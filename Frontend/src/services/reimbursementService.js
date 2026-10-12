/**
 * Faculty Reimbursement Service
 * Handles claim submission, three-section validation, role-based review workflow,
 * visual audit timeline history, notifications, and critical integration with the CMS Account Section.
 */

const STORAGE_KEY_CLAIMS = "cms_reimbursement_claims";
const STORAGE_KEY_ACCOUNTS = "cms_account_reimbursements";
const STORAGE_KEY_NOTIFICATIONS = "cms_reimbursement_notifications";

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

// Initial realistic seed claims matching institution departments and staff records
const INITIAL_CLAIMS = [
  {
    id: "CLM-2026-001",
    claimId: "CLM-2026-001",
    facultyId: "EMP-1042",
    facultyName: "Dr. Ananya Rao",
    department: "Mathematics",
    designation: "Assistant Professor",
    email: "ananya.rao@example.edu",
    category: "Teaching Materials",
    expenseDate: "2026-10-02",
    amount: 3200,
    purpose: "Reference textbooks and advanced calculus teaching journals for semester seminar.",
    paymentMethod: "Bank Transfer",
    notes: "Receipt stamped by academic bookstore with GST invoice number.",
    status: CLAIM_STATUSES.PENDING,
    submissionDate: "2026-10-03",
    proof: {
      name: "Calculus_Books_Invoice.pdf",
      size: 345000,
      type: "application/pdf",
      uploadedAt: "2026-10-03T10:15:00Z",
    },
    declaration: true,
    createdAt: "2026-10-03T10:15:00Z",
    auditLog: [
      {
        id: "LOG-01-1",
        action: "Submitted",
        actor: "Dr. Ananya Rao",
        role: "Faculty Member",
        timestamp: "2026-10-03T10:15:00Z",
        notes: "Claim submitted with verified book invoice attachment.",
      },
    ],
  },
  {
    id: "CLM-2026-002",
    claimId: "CLM-2026-002",
    facultyId: "EMP-1042",
    facultyName: "Dr. Ananya Rao",
    department: "Mathematics",
    designation: "Assistant Professor",
    email: "ananya.rao@example.edu",
    category: "Travel",
    expenseDate: "2026-09-24",
    amount: 4500,
    purpose: "Express train ticket and transit cab fare to attend Regional Mathematics Colloquium.",
    paymentMethod: "Bank Transfer",
    notes: "Tickets verified and pre-approved by Department HOD.",
    status: CLAIM_STATUSES.APPROVED,
    approvedAmount: 4500,
    approvedBy: "Finance Officer (Admin)",
    approvalDate: "2026-09-28",
    approvalRemarks: "Approved as per standard travel entitlement policy.",
    accountReferenceId: "ACC-PAY-CLM-2026-002",
    submissionDate: "2026-09-25",
    proof: {
      name: "Train_Cab_Receipts.pdf",
      size: 480000,
      type: "application/pdf",
      uploadedAt: "2026-09-25T14:30:00Z",
    },
    declaration: true,
    createdAt: "2026-09-25T14:30:00Z",
    auditLog: [
      {
        id: "LOG-02-1",
        action: "Submitted",
        actor: "Dr. Ananya Rao",
        role: "Faculty Member",
        timestamp: "2026-09-25T14:30:00Z",
        notes: "Claim submitted with travel ticket documentation.",
      },
      {
        id: "LOG-02-2",
        action: "Under Review",
        actor: "Finance Reviewer",
        role: "Finance Officer",
        timestamp: "2026-09-26T10:15:00Z",
        notes: "Transit vouchers checked against event itinerary.",
      },
      {
        id: "LOG-02-3",
        action: "Approved",
        actor: "Finance Officer (Admin)",
        role: "Finance Officer",
        timestamp: "2026-09-28T11:45:00Z",
        notes: "Approved as per travel policy. Generated payable voucher ACC-PAY-CLM-2026-002 in CMS Account Section.",
      },
    ],
  },
  {
    id: "CLM-2026-003",
    claimId: "CLM-2026-003",
    facultyId: "EMP-1018",
    facultyName: "Dr. Rajesh Kumar",
    department: "Physics",
    designation: "Associate Professor",
    email: "rajesh.physics@pirnav.edu",
    category: "Equipment",
    expenseDate: "2026-09-12",
    amount: 8900,
    purpose: "Emergency replacement of optics laser diode calibration sensors for 2nd year practicals.",
    paymentMethod: "Bank Transfer",
    notes: "Procured from authorized scientific instrumentation vendor.",
    status: CLAIM_STATUSES.PAID,
    approvedAmount: 8900,
    approvedBy: "Chief Accountant",
    approvalDate: "2026-09-15",
    approvalRemarks: "Approved under departmental contingency lab fund.",
    accountReferenceId: "ACC-PAY-CLM-2026-003",
    disbursedDate: "2026-09-20",
    disbursedBy: "Accounts Department",
    paymentMode: "Bank Transfer",
    paymentReference: "NEFT-UTR-8829410",
    submissionDate: "2026-09-13",
    proof: {
      name: "Optics_Sensor_Bill.pdf",
      size: 612000,
      type: "application/pdf",
      uploadedAt: "2026-09-13T09:40:00Z",
    },
    declaration: true,
    createdAt: "2026-09-13T09:40:00Z",
    auditLog: [
      {
        id: "LOG-03-1",
        action: "Submitted",
        actor: "Dr. Rajesh Kumar",
        role: "Faculty Member",
        timestamp: "2026-09-13T09:40:00Z",
        notes: "Claim submitted with laboratory sensor GST bill.",
      },
      {
        id: "LOG-03-2",
        action: "Approved",
        actor: "Chief Accountant",
        role: "Accounts Lead",
        timestamp: "2026-09-15T15:20:00Z",
        notes: "Approved under lab contingency grant. Created payable ACC-PAY-CLM-2026-003.",
      },
      {
        id: "LOG-03-3",
        action: "Paid",
        actor: "Accounts Department",
        role: "Cashier",
        timestamp: "2026-09-20T12:00:00Z",
        notes: "Payment disbursed via Bank Transfer. Bank Reference: NEFT-UTR-8829410.",
      },
    ],
  },
  {
    id: "CLM-2026-004",
    claimId: "CLM-2026-004",
    facultyId: "EMP-1035",
    facultyName: "Priya Sharma",
    department: "Chemistry",
    designation: "Assistant Professor",
    email: "priya.sharma@example.edu",
    category: "Food",
    expenseDate: "2026-09-08",
    amount: 2400,
    purpose: "Team refreshments during departmental symposium planning.",
    paymentMethod: "UPI",
    notes: "Food bills from campus cafeteria.",
    status: CLAIM_STATUSES.REJECTED,
    rejectedBy: "Finance Reviewer",
    rejectionDate: "2026-09-11",
    rejectionReason: "Meal expenses without prior sanctioned budget code or Dean authorization cannot be reimbursed.",
    submissionDate: "2026-09-09",
    proof: {
      name: "Cafeteria_Food_Bill.jpg",
      size: 210000,
      type: "image/jpeg",
      uploadedAt: "2026-09-09T16:20:00Z",
    },
    declaration: true,
    createdAt: "2026-09-09T16:20:00Z",
    auditLog: [
      {
        id: "LOG-04-1",
        action: "Submitted",
        actor: "Priya Sharma",
        role: "Faculty Member",
        timestamp: "2026-09-09T16:20:00Z",
        notes: "Claim submitted with cafeteria bill.",
      },
      {
        id: "LOG-04-2",
        action: "Rejected",
        actor: "Finance Reviewer",
        role: "Finance Officer",
        timestamp: "2026-09-11T14:10:00Z",
        notes: "Meal expenses without prior sanctioned budget code or Dean authorization cannot be reimbursed.",
      },
    ],
  },
  {
    id: "CLM-2026-005",
    claimId: "CLM-2026-005",
    facultyId: "EMP-1065",
    facultyName: "Dr. Vikram Sethi",
    department: "Computer Science",
    designation: "Associate Professor",
    email: "vikram.sethi@pirnav.edu",
    category: "Travel",
    expenseDate: "2026-09-29",
    amount: 5800,
    purpose: "Registration and local travel for National Cloud & AI Educators Summit.",
    paymentMethod: "Bank Transfer",
    notes: "Paper presentation slot confirmed in conference schedule.",
    status: CLAIM_STATUSES.UNDER_REVIEW,
    clarificationRequestedBy: "Finance Reviewer",
    clarificationRequestDate: "2026-10-04",
    clarificationNote: "Please attach the official conference presentation certificate or badge verification.",
    submissionDate: "2026-10-01",
    proof: {
      name: "AI_Summit_Registration.pdf",
      size: 389000,
      type: "application/pdf",
      uploadedAt: "2026-10-01T11:00:00Z",
    },
    declaration: true,
    createdAt: "2026-10-01T11:00:00Z",
    auditLog: [
      {
        id: "LOG-05-1",
        action: "Submitted",
        actor: "Dr. Vikram Sethi",
        role: "Faculty Member",
        timestamp: "2026-10-01T11:00:00Z",
        notes: "Claim submitted with registration fee voucher.",
      },
      {
        id: "LOG-05-2",
        action: "Clarification Requested",
        actor: "Finance Reviewer",
        role: "Finance Officer",
        timestamp: "2026-10-04T16:45:00Z",
        notes: "Please attach the official conference presentation certificate or badge verification.",
      },
    ],
  },
];

// Initial Account integration entries corresponding to approved & paid claims
const INITIAL_ACCOUNT_ENTRIES = [
  {
    id: "ACC-PAY-CLM-2026-002",
    accountEntryId: "ACC-PAY-CLM-2026-002",
    claimId: "CLM-2026-002",
    facultyId: "EMP-1042",
    facultyName: "Dr. Ananya Rao",
    department: "Mathematics",
    category: "Travel",
    amount: 4500,
    entryType: "Faculty Expense Reimbursement Payable",
    ledgerCategory: "Faculty Benefits & Travel Reimbursements",
    approvalDate: "2026-09-28",
    approvedBy: "Finance Officer (Admin)",
    paymentStatus: "Payable (Awaiting Disbursement)",
    disbursedDate: null,
    paymentMode: "Bank Transfer",
    paymentRef: null,
    remarks: "Approved as per standard travel entitlement policy.",
  },
  {
    id: "ACC-PAY-CLM-2026-003",
    accountEntryId: "ACC-PAY-CLM-2026-003",
    claimId: "CLM-2026-003",
    facultyId: "EMP-1018",
    facultyName: "Dr. Rajesh Kumar",
    department: "Physics",
    category: "Equipment",
    amount: 8900,
    entryType: "Faculty Expense Reimbursement Payable",
    ledgerCategory: "Laboratory & Equipment Contingency",
    approvalDate: "2026-09-15",
    approvedBy: "Chief Accountant",
    paymentStatus: "Paid / Disbursed",
    disbursedDate: "2026-09-20",
    paymentMode: "Bank Transfer",
    paymentRef: "NEFT-UTR-8829410",
    remarks: "Approved under departmental contingency lab fund.",
  },
];

function notifyStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cms-reimbursements-updated"));
    window.dispatchEvent(new Event("cms-account-updated"));
  }
}

/**
 * Reads all claims from localStorage with fallback to initial seed
 */
export function getStoredClaims() {
  if (typeof window === "undefined") return INITIAL_CLAIMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CLAIMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Could not read reimbursement claims from localStorage:", err);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(INITIAL_CLAIMS));
  } catch {}
  return INITIAL_CLAIMS;
}

/**
 * Saves claims list to localStorage
 */
export function saveStoredClaims(claims) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(claims));
    notifyStorageChange();
  } catch (err) {
    console.warn("Failed to persist claims to localStorage:", err);
  }
}

/**
 * Reads integrated Account records
 */
export function getStoredAccountEntries() {
  if (typeof window === "undefined") return INITIAL_ACCOUNT_ENTRIES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Could not read account reimbursement entries:", err);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(INITIAL_ACCOUNT_ENTRIES));
  } catch {}
  return INITIAL_ACCOUNT_ENTRIES;
}

/**
 * Saves integrated Account records
 */
export function saveStoredAccountEntries(entries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(entries));
    notifyStorageChange();
  } catch (err) {
    console.warn("Failed to persist account entries:", err);
  }
}

/**
 * Reads audit notifications
 */
export function getStoredNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Records a notification
 */
export function addNotification(notification) {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredNotifications();
    const entry = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };
    const updated = [entry, ...existing].slice(0, 50);
    window.localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    window.dispatchEvent(new Event("cms-notifications-updated"));
  } catch {}
}

/**
 * Generates next unique sequential claim ID
 */
export function generateNextClaimId(claims) {
  const year = new Date().getFullYear();
  const currentYearClaims = (claims || []).filter((c) =>
    String(c.claimId || "").startsWith(`CLM-${year}`)
  );
  const nextNum = currentYearClaims.length + 1;
  return `CLM-${year}-${String(nextNum).padStart(3, "0")}`;
}

/**
 * Submits a new claim (Three sections validation enforced)
 */
export async function submitClaim(claimPayload) {
  // Validate Section 1: Faculty Details
  if (!claimPayload.facultyName || !claimPayload.facultyName.trim()) {
    throw new Error("Faculty Name is required.");
  }
  if (!claimPayload.department || !claimPayload.department.trim()) {
    throw new Error("Department is required.");
  }

  // Validate Section 2: Expense Details
  if (!claimPayload.category || !EXPENSE_CATEGORIES.includes(claimPayload.category)) {
    throw new Error("Please select a valid expense category.");
  }
  if (!claimPayload.expenseDate) {
    throw new Error("Expense Date is required.");
  }
  const expDate = new Date(claimPayload.expenseDate);
  if (Number.isNaN(expDate.getTime())) {
    throw new Error("Expense Date is invalid.");
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (expDate > today) {
    throw new Error("Expense Date cannot be in the future.");
  }

  const numericAmount = Number(claimPayload.amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Claim amount must be a positive number greater than ₹0.");
  }

  if (!claimPayload.purpose || claimPayload.purpose.trim().length < 5) {
    throw new Error("Please provide a meaningful purpose / description (minimum 5 characters).");
  }

  // Validate Section 3: Declaration Checkbox
  if (!claimPayload.declaration) {
    throw new Error("You must accept the declaration confirming the claim details are accurate.");
  }

  const existing = getStoredClaims();
  const newClaimId = generateNextClaimId(existing);
  const nowIso = new Date().toISOString();

  const newClaim = {
    id: newClaimId,
    claimId: newClaimId,
    facultyId: claimPayload.facultyId || "FAC-GUEST",
    facultyName: claimPayload.facultyName.trim(),
    department: claimPayload.department.trim(),
    designation: claimPayload.designation ? claimPayload.designation.trim() : "Faculty",
    email: claimPayload.email ? claimPayload.email.trim() : "",
    category: claimPayload.category,
    expenseDate: claimPayload.expenseDate,
    amount: Math.round(numericAmount * 100) / 100,
    purpose: claimPayload.purpose.trim(),
    paymentMethod: claimPayload.paymentMethod || "Bank Transfer",
    notes: claimPayload.notes ? claimPayload.notes.trim() : "",
    status: CLAIM_STATUSES.PENDING,
    submissionDate: nowIso.split("T")[0],
    proof: claimPayload.proof || null,
    declaration: true,
    createdAt: nowIso,
    auditLog: [
      {
        id: `LOG-${Date.now()}-1`,
        action: "Submitted",
        actor: claimPayload.facultyName.trim(),
        role: "Faculty Member",
        timestamp: nowIso,
        notes: "Claim submitted with supporting documentation.",
      },
    ],
  };

  const updated = [newClaim, ...existing];
  saveStoredClaims(updated);

  addNotification({
    targetUser: newClaim.facultyName,
    facultyId: newClaim.facultyId,
    claimId: newClaim.claimId,
    type: "info",
    title: "Claim Submitted",
    message: `Reimbursement claim ${newClaim.claimId} (₹${newClaim.amount}) submitted successfully. Current status: Pending.`,
  });

  return newClaim;
}

export const submitReimbursementClaim = submitClaim;

/**
 * Requests clarification / additional documentation without rejecting
 */
export async function requestClarification(claimId, { reviewer, clarificationNote }) {
  if (!clarificationNote || !clarificationNote.trim()) {
    throw new Error("Clarification note or requested document description is required.");
  }

  const claims = getStoredClaims();
  const index = claims.findIndex((c) => String(c.claimId || c.id) === String(claimId));
  if (index === -1) {
    throw new Error(`Reimbursement claim "${claimId}" not found.`);
  }

  const claim = claims[index];
  if (claim.status === CLAIM_STATUSES.APPROVED || claim.status === CLAIM_STATUSES.PAID) {
    throw new Error(`Cannot request clarification on already finalized claim ${claimId}.`);
  }

  const nowIso = new Date().toISOString();
  const reviewerName = reviewer || "Finance Reviewer";

  const updatedClaim = {
    ...claim,
    status: CLAIM_STATUSES.UNDER_REVIEW,
    clarificationRequestedBy: reviewerName,
    clarificationRequestDate: nowIso.split("T")[0],
    clarificationNote: clarificationNote.trim(),
    updatedAt: nowIso,
    auditLog: [
      ...(claim.auditLog || []),
      {
        id: `LOG-${Date.now()}-2`,
        action: "Clarification Requested",
        actor: reviewerName,
        role: "Finance Reviewer",
        timestamp: nowIso,
        notes: clarificationNote.trim(),
      },
    ],
  };

  claims[index] = updatedClaim;
  saveStoredClaims(claims);

  addNotification({
    targetUser: claim.facultyName,
    facultyId: claim.facultyId,
    claimId: claim.claimId,
    type: "warning",
    title: "Clarification Requested",
    message: `Finance review on ${claim.claimId}: "${clarificationNote.trim()}". Please provide required details.`,
  });

  return updatedClaim;
}

/**
 * Approves a claim and creates an entry in the Account section
 */
export async function approveClaim(claimId, { approvedBy, remarks, approvedAmount }) {
  const claims = getStoredClaims();
  const index = claims.findIndex((c) => String(c.claimId || c.id) === String(claimId));
  if (index === -1) {
    throw new Error(`Reimbursement claim "${claimId}" not found.`);
  }

  const claim = claims[index];
  if (claim.status === CLAIM_STATUSES.APPROVED || claim.status === CLAIM_STATUSES.PAID) {
    throw new Error(`Claim ${claimId} has already been approved.`);
  }

  const finalApprovedAmount = Number(approvedAmount) > 0 ? Number(approvedAmount) : claim.amount;
  const nowIso = new Date().toISOString();
  const approvalDate = nowIso.split("T")[0];
  const reviewer = approvedBy || "Finance Officer (Admin)";
  const accountRef = `ACC-PAY-${claim.claimId}`;

  // 1. Update Claim Status
  const updatedClaim = {
    ...claim,
    status: CLAIM_STATUSES.APPROVED,
    approvedAmount: finalApprovedAmount,
    approvedBy: reviewer,
    approvalDate,
    approvalRemarks: remarks || "Approved in accordance with institution expense guidelines.",
    accountReferenceId: accountRef,
    updatedAt: nowIso,
    auditLog: [
      ...(claim.auditLog || []),
      {
        id: `LOG-${Date.now()}-3`,
        action: "Approved",
        actor: reviewer,
        role: "Finance Officer",
        timestamp: nowIso,
        notes: remarks || "Claim approved. Synchronized payable with Account section.",
      },
    ],
  };

  claims[index] = updatedClaim;
  saveStoredClaims(claims);

  // 2. Critical Integration: Create or Update Entry in Account Section
  const accountEntries = getStoredAccountEntries();
  const existingAccIndex = accountEntries.findIndex((e) => e.claimId === claim.claimId);

  const accountRecord = {
    id: accountRef,
    accountEntryId: accountRef,
    claimId: claim.claimId,
    facultyId: claim.facultyId,
    facultyName: claim.facultyName,
    department: claim.department,
    category: claim.category,
    amount: finalApprovedAmount,
    entryType: "Faculty Expense Reimbursement Payable",
    ledgerCategory: "Faculty Benefits & Reimbursements",
    approvalDate,
    approvedBy: reviewer,
    paymentStatus: "Payable (Awaiting Disbursement)",
    disbursedDate: null,
    paymentMode: claim.paymentMethod || "Bank Transfer",
    paymentRef: null,
    remarks: remarks || claim.purpose,
    updatedAt: nowIso,
  };

  if (existingAccIndex >= 0) {
    accountEntries[existingAccIndex] = accountRecord;
  } else {
    accountEntries.unshift(accountRecord);
  }

  saveStoredAccountEntries(accountEntries);

  addNotification({
    targetUser: claim.facultyName,
    facultyId: claim.facultyId,
    claimId: claim.claimId,
    type: "success",
    title: "Claim Approved",
    message: `Claim ${claim.claimId} approved for ₹${finalApprovedAmount.toLocaleString("en-IN")}. Payable ${accountRef} posted to Accounts.`,
  });

  return updatedClaim;
}

/**
 * Rejects a claim (Requires mandatory reason; does NOT create account entry)
 */
export async function rejectClaim(claimId, { rejectedBy, rejectionReason }) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error("A specific rejection reason is required.");
  }

  const claims = getStoredClaims();
  const index = claims.findIndex((c) => String(c.claimId || c.id) === String(claimId));
  if (index === -1) {
    throw new Error(`Reimbursement claim "${claimId}" not found.`);
  }

  const claim = claims[index];
  if (claim.status === CLAIM_STATUSES.REJECTED) {
    throw new Error(`Claim ${claimId} has already been rejected.`);
  }

  const nowIso = new Date().toISOString();
  const reviewer = rejectedBy || "Finance Reviewer";

  const updatedClaim = {
    ...claim,
    status: CLAIM_STATUSES.REJECTED,
    rejectedBy: reviewer,
    rejectionDate: nowIso.split("T")[0],
    rejectionReason: rejectionReason.trim(),
    updatedAt: nowIso,
    auditLog: [
      ...(claim.auditLog || []),
      {
        id: `LOG-${Date.now()}-4`,
        action: "Rejected",
        actor: reviewer,
        role: "Finance Reviewer",
        timestamp: nowIso,
        notes: rejectionReason.trim(),
      },
    ],
  };

  claims[index] = updatedClaim;
  saveStoredClaims(claims);

  // Remove from Account section if it previously had a draft/payable
  const accountEntries = getStoredAccountEntries().filter((e) => e.claimId !== claim.claimId);
  saveStoredAccountEntries(accountEntries);

  addNotification({
    targetUser: claim.facultyName,
    facultyId: claim.facultyId,
    claimId: claim.claimId,
    type: "error",
    title: "Claim Rejected",
    message: `Claim ${claim.claimId} rejected. Reason: ${rejectionReason.trim()}`,
  });

  return updatedClaim;
}

/**
 * Disburses an approved claim (transitions to Paid in both Reimbursement & Account section)
 */
export async function disburseClaimPayment(claimId, { disbursedBy, paymentMode, paymentRef, disbursedDate }) {
  const claims = getStoredClaims();
  const index = claims.findIndex((c) => String(c.claimId || c.id) === String(claimId));
  if (index === -1) {
    throw new Error(`Claim "${claimId}" not found.`);
  }

  const claim = claims[index];
  if (claim.status !== CLAIM_STATUSES.APPROVED) {
    throw new Error(`Claim must be in Approved state before payment disbursement.`);
  }

  const nowIso = new Date().toISOString();
  const payDate = disbursedDate || nowIso.split("T")[0];
  const refNum = paymentRef || `UTR-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const mode = paymentMode || claim.paymentMethod || "Bank Transfer";
  const disburser = disbursedBy || "Accounts Cashier";

  // 1. Update Claim
  const updatedClaim = {
    ...claim,
    status: CLAIM_STATUSES.PAID,
    disbursedDate: payDate,
    disbursedBy: disburser,
    paymentMode: mode,
    paymentReference: refNum,
    updatedAt: nowIso,
    auditLog: [
      ...(claim.auditLog || []),
      {
        id: `LOG-${Date.now()}-5`,
        action: "Paid",
        actor: disburser,
        role: "Accounts Department",
        timestamp: nowIso,
        notes: `Payment disbursed via ${mode}. Transaction Ref: ${refNum}`,
      },
    ],
  };
  claims[index] = updatedClaim;
  saveStoredClaims(claims);

  // 2. Update Account Entry to Paid
  const accountEntries = getStoredAccountEntries();
  const accIndex = accountEntries.findIndex((e) => e.claimId === claim.claimId);
  if (accIndex >= 0) {
    accountEntries[accIndex] = {
      ...accountEntries[accIndex],
      paymentStatus: "Paid / Disbursed",
      disbursedDate: payDate,
      paymentMode: mode,
      paymentRef: refNum,
      updatedAt: nowIso,
    };
    saveStoredAccountEntries(accountEntries);
  }

  addNotification({
    targetUser: claim.facultyName,
    facultyId: claim.facultyId,
    claimId: claim.claimId,
    type: "success",
    title: "Payment Disbursed",
    message: `Reimbursement payment for ${claim.claimId} (₹${claim.approvedAmount || claim.amount}) disbursed via ${mode}. UTR: ${refNum}`,
  });

  return updatedClaim;
}

/**
 * Derives accurate statistical summary counts from claims
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
