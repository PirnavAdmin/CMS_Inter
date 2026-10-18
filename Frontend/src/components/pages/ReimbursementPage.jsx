import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  HelpCircle,
  MessageSquareQuote,
  Paperclip,
  Plus,
  Receipt,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import * as reimbursementService from "@/services/reimbursementService.js";
import {
  CLAIM_STATUSES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  calculateReimbursementSummary,
  calculateFinancialMetrics,
  exportClaimsToCsv,
  requestClarification,
  fetchClaims as apiFetchClaims,
  fetchMyClaims as apiFetchMyClaims,
} from "@/services/reimbursementService.js";
import "./ReimbursementPage.css";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const PAGE_SIZE = 6;

export default function ReimbursementPage({ isAccountantView = false }) {
  // ── Authentication & Profile Context ──────────────────────────────
  const authUser = useMemo(() => getAuthUser() || {}, []);
  const userRole = String(authUser.role || "").toLowerCase();
  const isFinanceUser =
    isAccountantView ||
    userRole.includes("admin") ||
    userRole.includes("account") ||
    userRole.includes("finance") ||
    userRole.includes("principal");
  const isFacultyUser = !isFinanceUser;

  // Check if authenticated faculty has complete profile info
  const hasFacultyProfile = Boolean(
    (authUser.employeeId || authUser.staffId || authUser.id) &&
    (authUser.fullName || authUser.name) &&
    (authUser.department || authUser.departmentName)
  );

  // Allow switching view between "Finance & Admin Review", "Claims", and "My Claims"
  const [activePortalTab, setActivePortalTab] = useState("all-claims");

  // ── Live Claims & Account Entries State ─────────────────────────────
  const [claims, setClaims] = useState([]);
  const [accountEntries, setAccountEntries] = useState([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch claims from the real API (database-backed)
  const refreshData = useCallback(async () => {
    setIsLoadingClaims(true);
    try {
      if (isFacultyUser) {
        // Faculty: load only their own claims
        const myClaims = await apiFetchMyClaims();
        setClaims(myClaims || []);
      } else {
        // Admin / Finance / Accountant: load all claims
        const allClaims = await apiFetchClaims();
        setClaims(allClaims || []);
      }
    } catch (err) {
      console.warn("[Reimbursement] Failed to load claims from API:", err?.message || err);
      setClaims([]);
    } finally {
      setIsLoadingClaims(false);
    }
  }, [isFacultyUser]);

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const onUpdated = () => refreshData();
    window.addEventListener("cms-reimbursements-updated", onUpdated);
    window.addEventListener("cms-account-updated", onUpdated);
    return () => {
      window.removeEventListener("cms-reimbursements-updated", onUpdated);
      window.removeEventListener("cms-account-updated", onUpdated);
    };
  }, [refreshData]);

  // Derived KPI Summary
  const summary = useMemo(
    () => calculateReimbursementSummary(claims),
    [claims]
  );

  // ── Section 1: Faculty Details Initial State ────────────────────────
  const defaultFacultyId =
    authUser.employeeId || authUser.staffId || (isFacultyUser ? authUser.id || "" : "EMP-1042");
  const defaultFacultyName =
    authUser.fullName || authUser.name || (isFacultyUser ? "" : "Dr. Ananya Rao");
  const defaultDepartment =
    authUser.department || authUser.departmentName || (isFacultyUser ? "" : "Mathematics");
  const defaultDesignation =
    authUser.designation || authUser.designationName || (isFacultyUser ? "Faculty Member" : "Assistant Professor");
  const defaultEmail =
    authUser.email || (isFacultyUser ? "" : "ananya.rao@example.edu");

  // ── Claim Submission Form State (Three Sections) ────────────────────
  const [formData, setFormData] = useState({
    // Section 1: Faculty Details
    facultyId: defaultFacultyId,
    facultyName: defaultFacultyName,
    department: defaultDepartment,
    designation: defaultDesignation,
    email: defaultEmail,

    // Section 2: Expense Details
    category: "Teaching Materials",
    otherCategory: "",
    expenseDate: new Date().toISOString().split("T")[0],
    amount: "",
    purpose: "",
    paymentMethod: "Bank Transfer",
    otherPaymentMethod: "",

    // Section 3: Supporting Documents & Notes
    notes: "",
    declaration: false,
  });

  const [uploadedFile, setUploadedFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // ── Table Search & Filter State ─────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal Dialog States ─────────────────────────────────────────────
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimDetailModalOpen, setClaimDetailModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [clarificationModalOpen, setClarificationModalOpen] = useState(false);
  const [disbursementModalOpen, setDisbursementModalOpen] = useState(false);
  const [previewDocModalOpen, setPreviewDocModalOpen] = useState(false);
  const [viewAccountsDrawerOpen, setViewAccountsDrawerOpen] = useState(false);
  const [previewClaimModalOpen, setPreviewClaimModalOpen] = useState(false);
  const [previewDraftDocModalOpen, setPreviewDraftDocModalOpen] = useState(false);

  // Review Form Controls
  const [approvalAmount, setApprovalAmount] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [clarificationNote, setClarificationNote] = useState("");
  const [disbursementRef, setDisbursementRef] = useState("");
  const [disbursementMode, setDisbursementMode] = useState("Bank Transfer");
  const [otherDisbursementMode, setOtherDisbursementMode] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // ── File Upload Handler with Real Validation ────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setToast({
        type: "error",
        message: "Invalid file type. Only PDF, JPG, JPEG, and PNG receipts are allowed.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setToast({
        type: "error",
        message: `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Read real file for preview & persistence
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
      });
      setFormErrors((prev) => ({ ...prev, file: null, proof: null }));
    };
    reader.onerror = () => {
      setToast({
        type: "error",
        message: "Failed to read receipt file. Please try selecting the file again.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Form Input Change Handler ───────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const resetForm = () => {
    setFormData({
      facultyId: defaultFacultyId,
      facultyName: defaultFacultyName,
      department: defaultDepartment,
      designation: defaultDesignation,
      email: defaultEmail,
      category: "Teaching Materials",
      otherCategory: "",
      expenseDate: new Date().toISOString().split("T")[0],
      amount: "",
      purpose: "",
      paymentMethod: "Bank Transfer",
      otherPaymentMethod: "",
      notes: "",
      declaration: false,
    });
    setUploadedFile(null);
    setFormErrors({});
    setPreviewClaimModalOpen(false);
    setPreviewDraftDocModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Form Validation Helper ──────────────────────────────────────────
  const validateClaimForm = () => {
    const errors = {};
    if (!formData.facultyName.trim()) {
      errors.facultyName = "Faculty Name is required.";
    }
    if (!formData.department.trim()) {
      errors.department = "Department is required.";
    }
    if (!formData.expenseDate) {
      errors.expenseDate = "Expense Date is required.";
    } else {
      const d = new Date(formData.expenseDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        errors.expenseDate = "Expense Date cannot be in the future.";
      }
    }

    const numAmount = Number(formData.amount);
    if (!formData.amount || Number.isNaN(numAmount) || numAmount <= 0) {
      errors.amount = "Please enter a valid positive amount greater than ₹0.";
    }

    if (!formData.purpose || formData.purpose.trim().length < 5) {
      errors.purpose = "Please provide a detailed purpose / description (minimum 5 characters).";
    }

    if (formData.category === "Other" && (!formData.otherCategory || !formData.otherCategory.trim())) {
      errors.otherCategory = "Please specify the expense category name.";
    }

    if (formData.paymentMethod === "Other" && (!formData.otherPaymentMethod || !formData.otherPaymentMethod.trim())) {
      errors.otherPaymentMethod = "Please specify the payment method.";
    }

    if (!uploadedFile) {
      errors.proof = "Receipt / invoice proof document is required.";
    }

    if (!formData.declaration) {
      errors.declaration = "You must confirm the declaration before submitting.";
    }

    return errors;
  };

  const handleOpenPreviewModal = () => {
    const errors = validateClaimForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setToast({
        type: "error",
        message: "Please complete all required fields highlighted before previewing.",
      });
      return;
    }

    setFormErrors({});
    setPreviewClaimModalOpen(true);
  };

  // ── Submit Claim Workflow ───────────────────────────────────────────
  const handleSubmitClaim = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Field-level validation
    const errors = validateClaimForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setToast({
        type: "error",
        message: "Please correct the highlighted validation errors before submitting.",
      });
      return;
    }

    const numAmount = Number(formData.amount);
    setIsSubmitting(true);
    try {
      const resolvedCategory =
        formData.category === "Other"
          ? formData.otherCategory.trim()
          : formData.category;

      const resolvedPaymentMethod =
        formData.paymentMethod === "Other"
          ? formData.otherPaymentMethod.trim()
          : formData.paymentMethod;

      const newClaim = await reimbursementService.submitClaim({
        ...formData,
        category: resolvedCategory,
        paymentMethod: resolvedPaymentMethod,
        amount: numAmount,
        proof: uploadedFile,
      });

      setToast({
        type: "success",
        message: `Claim ${newClaim.claimId} submitted successfully! Your claim is now Pending finance review.`,
      });

      setPreviewClaimModalOpen(false);
      resetForm();
      refreshData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Failed to submit reimbursement claim.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Approval Workflow ───────────────────────────────────────────────
  const openApprovalModal = (claim) => {
    setSelectedClaim(claim);
    setApprovalAmount(String(claim.amount));
    setApprovalRemarks("Approved in accordance with institutional policy.");
    setApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedClaim) return;
    setIsProcessingAction(true);
    try {
      await reimbursementService.approveClaim(selectedClaim.claimId, {
        approvedBy: authUser.fullName || authUser.name || "Finance Admin",
        approvedAmount: Number(approvalAmount) || selectedClaim.amount,
        remarks: approvalRemarks,
      });

      setToast({
        type: "success",
        message: `Claim ${selectedClaim.claimId} approved! Integrated payable entry ${selectedClaim.accountReferenceId || `ACC-PAY-${selectedClaim.claimId}`} created in Account section.`,
      });

      setApprovalModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Failed to approve reimbursement claim.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ── Rejection Workflow ──────────────────────────────────────────────
  const openRejectionModal = (claim) => {
    setSelectedClaim(claim);
    setRejectionReason("");
    setRejectionModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!selectedClaim) return;
    if (!rejectionReason.trim()) {
      setToast({
        type: "error",
        message: "A specific rejection reason is mandatory.",
      });
      return;
    }

    setIsProcessingAction(true);
    try {
      await reimbursementService.rejectClaim(selectedClaim.claimId, {
        rejectedBy: authUser.fullName || authUser.name || "Finance Admin",
        rejectionReason: rejectionReason.trim(),
      });

      setToast({
        type: "warning",
        message: `Claim ${selectedClaim.claimId} has been rejected. No payable was posted to the Account section.`,
      });

      setRejectionModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Failed to reject claim.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ── Clarification / Additional Docs Workflow (Pending/Under Review -> Under Review) ──
  const openClarificationModal = (claim) => {
    setSelectedClaim(claim);
    setClarificationNote("");
    setClarificationModalOpen(true);
  };

  const handleConfirmClarification = async () => {
    if (!selectedClaim) return;
    if (!clarificationNote.trim()) {
      setToast({
        type: "error",
        message: "Please specify the required documents or clarification note.",
      });
      return;
    }

    setIsProcessingAction(true);
    try {
      await reimbursementService.requestClarification(selectedClaim.claimId, {
        reviewer: authUser.fullName || authUser.name || "Finance Reviewer",
        clarificationNote: clarificationNote.trim(),
      });

      setToast({
        type: "success",
        message: `Clarification requested for claim ${selectedClaim.claimId}. Status set to Under Review.`,
      });

      setClarificationModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Failed to request clarification.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ── Payment Disbursement Workflow (Approved -> Paid) ────────────────
  const openDisbursementModal = (claim) => {
    setSelectedClaim(claim);
    setDisbursementRef(`NEFT-UTR-${Math.floor(1000000 + Math.random() * 9000000)}`);
    setDisbursementMode(claim.paymentMethod || "Bank Transfer");
    setOtherDisbursementMode("");
    setDisbursementModalOpen(true);
  };

  const handleConfirmDisbursement = async () => {
    if (!selectedClaim) return;
    setIsProcessingAction(true);
    try {
      const resolvedMode =
        disbursementMode === "Other"
          ? otherDisbursementMode.trim() || "Other"
          : disbursementMode;

      await reimbursementService.disburseClaimPayment(selectedClaim.claimId, {
        disbursedBy: authUser.fullName || authUser.name || "Accounts Officer",
        paymentMode: resolvedMode,
        paymentRef: disbursementRef,
        disbursedDate: new Date().toISOString().split("T")[0],
      });

      setToast({
        type: "success",
        message: `Claim ${selectedClaim.claimId} marked as Paid! Payment record updated in Accounts section.`,
      });

      setDisbursementModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Failed to disburse payment.",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ── Filter Data Lookups ────────────────────────────────────────────
  const distinctDepartments = useMemo(() => {
    const set = new Set();
    claims.forEach((c) => {
      if (c.department) set.add(c.department);
    });
    return Array.from(set).sort();
  }, [claims]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "ALL") count++;
    if (categoryFilter !== "ALL") count++;
    if (deptFilter !== "ALL") count++;
    if (startDateFilter) count++;
    if (endDateFilter) count++;
    if (minAmountFilter) count++;
    if (maxAmountFilter) count++;
    return count;
  }, [statusFilter, categoryFilter, deptFilter, startDateFilter, endDateFilter, minAmountFilter, maxAmountFilter]);

  const clearAllFilters = () => {
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setDeptFilter("ALL");
    setStartDateFilter("");
    setEndDateFilter("");
    setMinAmountFilter("");
    setMaxAmountFilter("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // ── Filtered Claims Calculation ─────────────────────────────────────
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // If in faculty personal view and not finance reviewer, show their claims
      if (activePortalTab === "my-claims") {
        const currentEmpId = authUser.employeeId || authUser.staffId || "EMP-1042";
        if (claim.facultyId !== currentEmpId && claim.facultyName !== defaultFacultyName) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL" && claim.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        if (categoryFilter === "Other") {
          const standardCats = EXPENSE_CATEGORIES.filter((c) => c !== "Other");
          if (standardCats.includes(claim.category) && claim.category !== "Other") {
            return false;
          }
        } else if (claim.category !== categoryFilter) {
          return false;
        }
      }

      // Department filter
      if (deptFilter !== "ALL" && claim.department !== deptFilter) {
        return false;
      }

      // Date range filter
      if (startDateFilter && claim.expenseDate < startDateFilter) {
        return false;
      }
      if (endDateFilter && claim.expenseDate > endDateFilter) {
        return false;
      }

      // Amount range filter
      const numAmt = Number(claim.amount) || 0;
      if (minAmountFilter && numAmt < Number(minAmountFilter)) {
        return false;
      }
      if (maxAmountFilter && numAmt > Number(maxAmountFilter)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = String(claim.claimId || "").toLowerCase().includes(q);
        const nameMatch = String(claim.facultyName || "").toLowerCase().includes(q);
        const deptMatch = String(claim.department || "").toLowerCase().includes(q);
        const catMatch = String(claim.category || "").toLowerCase().includes(q);
        const purpMatch = String(claim.purpose || "").toLowerCase().includes(q);
        const refMatch = String(claim.accountReferenceId || "").toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !deptMatch && !catMatch && !purpMatch && !refMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    claims,
    activePortalTab,
    authUser,
    defaultFacultyName,
    statusFilter,
    categoryFilter,
    deptFilter,
    startDateFilter,
    endDateFilter,
    minAmountFilter,
    maxAmountFilter,
    searchQuery,
  ]);

  // ── Financial Metrics Calculation ──────────────────────────────────
  const financialMetrics = useMemo(
    () => reimbursementService.calculateFinancialMetrics(activePortalTab === "all-claims" ? filteredClaims : claims),
    [filteredClaims, claims, activePortalTab]
  );

  // ── CSV Export Action ──────────────────────────────────────────────
  const handleExportCsv = () => {
    try {
      reimbursementService.exportClaimsToCsv(filteredClaims);
      setToast({
        type: "success",
        message: `Exported ${filteredClaims.length} reimbursement claim(s) to CSV successfully.`,
      });
    } catch (err) {
      setToast({
        type: "error",
        message: "Failed to export claims to CSV.",
      });
    }
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE));
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClaims.slice(start, start + PAGE_SIZE);
  }, [filteredClaims, currentPage]);

  const formatINR = (val) =>
    `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const formatDateLabel = (dStr) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    return Number.isNaN(d.getTime())
      ? dStr
      : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const pageContent = (
    <div className="reimb-page-container">
        {/* Toast Notification */}
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* ── Top Toolbar with Portal View Toggle & Account Integration Sync ── */}
        <div className="reimb-toolbar">
          <div className="reimb-role-toggle">
            <button
              type="button"
              className={`reimb-toggle-btn ${activePortalTab === "all-claims" ? "is-active" : ""}`}
              onClick={() => setActivePortalTab("all-claims")}
            >
              <ShieldCheck size={15} /> Finance &amp; Admin Review ({(summary.pending || 0) + (summary.underReview || 0)})
            </button>
            <button
              type="button"
              className={`reimb-toggle-btn ${activePortalTab === "submit" ? "is-active" : ""}`}
              onClick={() => setActivePortalTab("submit")}
            >
              <img src={reimbursementIcon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> Claims
            </button>
            <button
              type="button"
              className={`reimb-toggle-btn ${activePortalTab === "my-claims" ? "is-active" : ""}`}
              onClick={() => setActivePortalTab("my-claims")}
            >
              <FileCheck2 size={15} /> My Claims ({claims.filter((c) => c.facultyId === defaultFacultyId || c.facultyName === defaultFacultyName).length})
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="reimb-sync-pill"
              onClick={() => setViewAccountsDrawerOpen(true)}
              title="Click to view integrated payables in Account section"
              style={{ cursor: "pointer" }}
            >
              <CheckCircle2 size={14} /> Account Ledger: {accountEntries.length} Integrated Payables
            </button>
            <button
              type="button"
              className="reimb-btn-icon"
              title="Refresh Data"
              onClick={refreshData}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* ── Four KPI Summary Cards ── */}
        <section className="reimb-kpi-grid">
          <div className="reimb-kpi-card total">
            <div className="reimb-kpi-info">
              <span className="reimb-kpi-label">Total Claims</span>
              <span className="reimb-kpi-value">{summary.total}</span>
              <span className="reimb-kpi-sub">Total: {formatINR(summary.totalClaimedAmount)}</span>
            </div>
            <div className="reimb-kpi-icon-wrap">
              <img src={reimbursementIcon} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
            </div>
          </div>

          <div className="reimb-kpi-card pending">
            <div className="reimb-kpi-info">
              <span className="reimb-kpi-label">Pending Claims</span>
              <span className="reimb-kpi-value">{summary.pending}</span>
              <span className="reimb-kpi-sub">
                {summary.underReview > 0 ? `${summary.underReview} under review` : "Awaiting review"}
              </span>
            </div>
            <div className="reimb-kpi-icon-wrap">
              <Clock size={22} />
            </div>
          </div>

          <div className="reimb-kpi-card approved">
            <div className="reimb-kpi-info">
              <span className="reimb-kpi-label">Approved Claims</span>
              <span className="reimb-kpi-value">{summary.approved}</span>
              <span className="reimb-kpi-sub">Payables in Account</span>
            </div>
            <div className="reimb-kpi-icon-wrap">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="reimb-kpi-card rejected">
            <div className="reimb-kpi-info">
              <span className="reimb-kpi-label">Rejected Claims</span>
              <span className="reimb-kpi-value">{summary.rejected}</span>
              <span className="reimb-kpi-sub">Declined claims</span>
            </div>
            <div className="reimb-kpi-icon-wrap">
              <XCircle size={22} />
            </div>
          </div>
        </section>

        {/* ── Compact Financial Summary Bar (Finance & Admin Review Tab) ── */}
        {activePortalTab === "all-claims" && (
          <>
            {!isFinanceUser && (
              <div className="reimb-profile-warning" style={{ margin: "4px 0 14px" }}>
                <ShieldCheck size={18} />
                <div>
                  <strong>Read-Only Review Queue:</strong> You are viewing institutional claims in read-only mode. Only authorized Finance &amp; Admin officers can approve, clarify, or reject reimbursement claims.
                </div>
              </div>
            )}

            <div className="reimb-financial-summary-bar">
              <div className="reimb-fin-metric-card claimed">
                <span className="reimb-fin-metric-title">Total Claimed</span>
                <span className="reimb-fin-metric-val">{formatINR(financialMetrics.totalClaimed)}</span>
                <span className="reimb-fin-metric-sub">{financialMetrics.counts.total} claims in scope</span>
              </div>
              <div className="reimb-fin-metric-card awaiting">
                <span className="reimb-fin-metric-title">Awaiting Review</span>
                <span className="reimb-fin-metric-val">{formatINR(financialMetrics.awaitingReview)}</span>
                <span className="reimb-fin-metric-sub">{financialMetrics.counts.awaitingReviewCount} pending / in review</span>
              </div>
              <div className="reimb-fin-metric-card unpaid">
                <span className="reimb-fin-metric-title">Approved &amp; Unpaid</span>
                <span className="reimb-fin-metric-val">{formatINR(financialMetrics.approvedUnpaid)}</span>
                <span className="reimb-fin-metric-sub">{financialMetrics.counts.approved} pending payment</span>
              </div>
              <div className="reimb-fin-metric-card paid">
                <span className="reimb-fin-metric-title">Total Paid</span>
                <span className="reimb-fin-metric-val">{formatINR(financialMetrics.totalPaid)}</span>
                <span className="reimb-fin-metric-sub">{financialMetrics.counts.paid} disbursed claims</span>
              </div>
              <div className="reimb-fin-metric-card rejected">
                <span className="reimb-fin-metric-title">Total Rejected</span>
                <span className="reimb-fin-metric-val">{formatINR(financialMetrics.totalRejected)}</span>
                <span className="reimb-fin-metric-sub">{financialMetrics.counts.rejected} declined claims</span>
              </div>
            </div>
          </>
        )}

        {/* ── Faculty Claim Submission Form (Three Sections) ── */}
        {activePortalTab === "submit" && (
          <div className="reimb-form-card" id="reimb-submission-form">
            <div className="reimb-form-header">
              <div className="reimb-form-title-group">
                <h2>
                  <ReceiptIndianRupee size={18} style={{ color: "#6F8400" }} />
                  Submit Reimbursement Claim
                </h2>
                <p>Complete the three sections below and attach supporting receipts or invoices.</p>
              </div>
              <button
                type="button"
                className="reimb-btn reimb-btn-secondary"
                onClick={resetForm}
                style={{ padding: "6px 14px", fontSize: 12.5 }}
              >
                Clear Form
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="reimb-form-body">
              {/* ── Section 1: Faculty Details ── */}
              <div className="reimb-section-card">
                <div className="reimb-section-heading">
                  <h3>
                    <span className="reimb-section-badge">1</span>
                    Section 1: Faculty Details
                  </h3>
                  <span className="reimb-auth-tag">
                    <User size={12} /> {isFacultyUser ? "Verified Faculty Identity" : "Claimant Profile (Admin Mode)"}
                  </span>
                </div>

                {isFacultyUser && !hasFacultyProfile && (
                  <div className="reimb-profile-warning">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Faculty Profile Incomplete:</strong> Your authenticated account is missing verified employee profile data (Employee ID or Department). Please complete your profile in Staff Settings before submitting claims.
                    </div>
                  </div>
                )}

                {isFinanceUser && (
                  <div className="reimb-admin-notice">
                    <ShieldCheck size={16} />
                    <span><strong>Admin / Finance Session:</strong> You are logged in with administrative privileges. By default, fields are loaded for faculty claim entry.</span>
                  </div>
                )}

                <div className="reimb-grid-3">
                  <div className="reimb-field">
                    <label>
                      Faculty ID <span className="req">*</span>
                      {isFacultyUser && <span className="reimb-readonly-notice">(Verified)</span>}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formData.facultyId}
                      className="reimb-input is-readonly"
                    />
                  </div>

                  <div className="reimb-field">
                    <label>
                      Faculty Name <span className="req">*</span>
                      {isFacultyUser && <span className="reimb-readonly-notice">(Verified)</span>}
                    </label>
                    <input
                      type="text"
                      readOnly={isFacultyUser}
                      value={formData.facultyName}
                      onChange={(e) => handleChange("facultyName", e.target.value)}
                      className={`reimb-input ${isFacultyUser ? "is-readonly" : ""} ${formErrors.facultyName ? "is-invalid" : ""}`}
                      placeholder="Dr. Full Name"
                    />
                    {formErrors.facultyName && (
                      <span className="reimb-field-error">{formErrors.facultyName}</span>
                    )}
                  </div>

                  <div className="reimb-field">
                    <label>
                      Department <span className="req">*</span>
                      {isFacultyUser && <span className="reimb-readonly-notice">(Verified)</span>}
                    </label>
                    <input
                      type="text"
                      readOnly={isFacultyUser}
                      value={formData.department}
                      onChange={(e) => handleChange("department", e.target.value)}
                      className={`reimb-input ${isFacultyUser ? "is-readonly" : ""} ${formErrors.department ? "is-invalid" : ""}`}
                      placeholder="e.g. Mathematics"
                    />
                    {formErrors.department && (
                      <span className="reimb-field-error">{formErrors.department}</span>
                    )}
                  </div>

                  <div className="reimb-field">
                    <label>
                      Designation
                      {isFacultyUser && <span className="reimb-readonly-notice">(Verified)</span>}
                    </label>
                    <input
                      type="text"
                      readOnly={isFacultyUser}
                      value={formData.designation}
                      onChange={(e) => handleChange("designation", e.target.value)}
                      className={`reimb-input ${isFacultyUser ? "is-readonly" : ""}`}
                      placeholder="e.g. Assistant Professor"
                    />
                  </div>

                  <div className="reimb-field">
                    <label>
                      Email Address
                      {isFacultyUser && <span className="reimb-readonly-notice">(Verified)</span>}
                    </label>
                    <input
                      type="email"
                      readOnly={isFacultyUser}
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={`reimb-input ${isFacultyUser ? "is-readonly" : ""}`}
                      placeholder="faculty@example.edu"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 2: Expense Details ── */}
              <div className="reimb-section-card">
                <div className="reimb-section-heading">
                  <h3>
                    <span className="reimb-section-badge">2</span>
                    Section 2: Expense Details
                  </h3>
                  <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>
                    All expenses must be supported by official bills
                  </span>
                </div>

                <div className="reimb-grid-4">
                  <div className="reimb-field">
                    <label>
                      Expense Category <span className="req">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                      className="reimb-select"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {formData.category === "Other" && (
                      <div className="reimb-other-input-wrap">
                        <input
                          type="text"
                          value={formData.otherCategory || ""}
                          onChange={(e) => handleChange("otherCategory", e.target.value)}
                          className={`reimb-input ${formErrors.otherCategory ? "is-invalid" : ""}`}
                          placeholder="Please specify category..."
                          autoFocus
                        />
                        {formErrors.otherCategory && (
                          <span className="reimb-field-error">{formErrors.otherCategory}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="reimb-field">
                    <label>
                      Expense Date <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={formData.expenseDate}
                      onChange={(e) => handleChange("expenseDate", e.target.value)}
                      className={`reimb-input ${formErrors.expenseDate ? "is-invalid" : ""}`}
                    />
                    {formErrors.expenseDate && (
                      <span className="reimb-field-error">{formErrors.expenseDate}</span>
                    )}
                  </div>

                  <div className="reimb-field">
                    <label>
                      Amount (₹) <span className="req">*</span>
                    </label>
                    <div className="reimb-input-prefix-wrap">
                      <span className="reimb-input-prefix">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleChange("amount", e.target.value)}
                        className={`reimb-input has-prefix ${formErrors.amount ? "is-invalid" : ""}`}
                      />
                    </div>
                    {formErrors.amount && (
                      <span className="reimb-field-error">{formErrors.amount}</span>
                    )}
                  </div>

                  <div className="reimb-field">
                    <label>
                      Preferred Payment Method <span className="req">*</span>
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => handleChange("paymentMethod", e.target.value)}
                      className="reimb-select"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    {formData.paymentMethod === "Other" && (
                      <div className="reimb-other-input-wrap">
                        <input
                          type="text"
                          value={formData.otherPaymentMethod || ""}
                          onChange={(e) => handleChange("otherPaymentMethod", e.target.value)}
                          className={`reimb-input ${formErrors.otherPaymentMethod ? "is-invalid" : ""}`}
                          placeholder="Please specify payment method..."
                          autoFocus
                        />
                        {formErrors.otherPaymentMethod && (
                          <span className="reimb-field-error">{formErrors.otherPaymentMethod}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="reimb-field" style={{ marginTop: 14 }}>
                  <label>
                    Purpose / Description <span className="req">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.purpose}
                    onChange={(e) => handleChange("purpose", e.target.value)}
                    className={`reimb-textarea reimb-purpose-textarea ${formErrors.purpose ? "is-invalid" : ""}`}
                    placeholder="Specify academic purpose, course code, conference name, or institutional utility..."
                  />
                  {formErrors.purpose && (
                    <span className="reimb-field-error">{formErrors.purpose}</span>
                  )}
                </div>
              </div>

              {/* ── Section 3: Supporting Documents and Submission ── */}
              <div className="reimb-section-card">
                <div className="reimb-section-heading">
                  <h3>
                    <span className="reimb-section-badge">3</span>
                    Section 3: Supporting Documents &amp; Submission
                  </h3>
                  <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>
                    PDF, PNG, JPG up to 5 MB
                  </span>
                </div>

                <div className="reimb-grid-2">
                  <div className="reimb-field">
                    <label>
                      Receipt / Invoice Proof <span className="req">*</span>
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg"
                      style={{ display: "none" }}
                    />

                    {!uploadedFile ? (
                      <div
                        className={`reimb-upload-box ${formErrors.proof ? "is-invalid" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="reimb-upload-content">
                          <div className="reimb-upload-icon">
                            <Upload size={18} />
                          </div>
                          <span className="reimb-upload-text">Click to browse or upload receipt</span>
                          <span className="reimb-upload-sub">PDF, PNG, JPG (Max 5 MB)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="reimb-file-badge">
                        <div className="reimb-file-info">
                          <Paperclip size={18} style={{ color: "#6F8400", flexShrink: 0 }} />
                          <div style={{ overflow: "hidden" }}>
                            <div className="reimb-file-name" title={uploadedFile.name}>{uploadedFile.name}</div>
                            <div className="reimb-file-size">
                              {(uploadedFile.size / 1024).toFixed(1)} KB • Attached
                            </div>
                          </div>
                        </div>
                        <div className="reimb-file-actions">
                          <button
                            type="button"
                            className="reimb-file-btn preview"
                            title="Preview Document"
                            onClick={() => {
                              setSelectedClaim({ proof: uploadedFile, claimId: "DRAFT-PROOF" });
                              setPreviewDocModalOpen(true);
                            }}
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <button
                            type="button"
                            className="reimb-file-btn"
                            title="Remove file"
                            onClick={handleRemoveFile}
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                    {formErrors.proof && (
                      <span className="reimb-field-error">{formErrors.proof}</span>
                    )}
                  </div>

                  <div className="reimb-field">
                    <label>Additional Notes / Bill Reference</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      className="reimb-textarea reimb-notes-textarea"
                      placeholder="Optional GST invoice numbers, vendor names, or special instructions..."
                    />
                  </div>
                </div>

                {/* Declaration Checkbox */}
                <div className="reimb-declaration-card" style={{ marginTop: 14 }}>
                  <label className="reimb-declaration-label">
                    <input
                      type="checkbox"
                      checked={formData.declaration}
                      onChange={(e) => handleChange("declaration", e.target.checked)}
                    />
                    <span>
                      I hereby declare that the expenses claimed above were incurred legitimately for
                      official academic/institutional purposes and the supporting invoices/receipts are authentic.
                    </span>
                  </label>
                  {formErrors.declaration && (
                    <span className="reimb-field-error" style={{ display: "block", marginTop: 4 }}>
                      {formErrors.declaration}
                    </span>
                  )}
                </div>

                {/* Submit & Reset Buttons */}
                <div className="reimb-form-actions">
                  <button
                    type="button"
                    className="reimb-btn reimb-btn-secondary"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Reset Form
                  </button>
                  <button
                    type="button"
                    className="reimb-btn reimb-btn-secondary"
                    onClick={handleOpenPreviewModal}
                    disabled={isSubmitting}
                  >
                    <Eye size={15} /> Preview Claim
                  </button>
                  <button
                    type="submit"
                    className="reimb-btn reimb-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="spin-animate" /> Processing...
                      </>
                    ) : (
                      <>
                        <ReceiptIndianRupee size={15} /> Submit Claim
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── Claims History Table ── */}
        <div className="reimb-table-card">
          <div className="reimb-table-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {activePortalTab === "all-claims"
                  ? "Reimbursement Claims Review"
                  : activePortalTab === "my-claims"
                  ? "My Reimbursement Claims"
                  : "Recent Claims History"}
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--cms-muted)" }}>
                Showing {filteredClaims.length} records • Filter by status, category, or claim ID
              </p>
            </div>

            {/* Filters */}
            <div className="reimb-table-filters">
              <div className="reimb-search-wrap">
                <Search size={14} className="reimb-search-icon" />
                <input
                  type="text"
                  placeholder="Search by ID, name, dept, purpose..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="reimb-search-input"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="reimb-filter-select"
              >
                <option value="ALL">All Statuses</option>
                <option value={CLAIM_STATUSES.PENDING}>Pending</option>
                <option value={CLAIM_STATUSES.UNDER_REVIEW}>Under Review</option>
                <option value={CLAIM_STATUSES.APPROVED}>Approved</option>
                <option value={CLAIM_STATUSES.PAID}>Paid</option>
                <option value={CLAIM_STATUSES.REJECTED}>Rejected</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="reimb-filter-select"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className={`reimb-btn reimb-btn-secondary ${showAdvancedFilters ? "is-active" : ""}`}
                style={{ padding: "6px 12px", fontSize: 12.5 }}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                title="Toggle extended filters"
              >
                <SlidersHorizontal size={13} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>

              <button
                type="button"
                className="reimb-btn reimb-btn-secondary"
                style={{ padding: "6px 12px", fontSize: 12.5 }}
                onClick={handleExportCsv}
                title="Export filtered claims to CSV"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          {/* Extended Advanced Filters Row */}
          {showAdvancedFilters && (
            <div className="reimb-advanced-filters-card">
              <div className="reimb-filter-field">
                <label>Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Departments</option>
                  {distinctDepartments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="reimb-filter-field">
                <label>Expense From Date</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="reimb-filter-field">
                <label>Expense To Date</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="reimb-filter-field">
                <label>Min Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minAmountFilter}
                  onChange={(e) => {
                    setMinAmountFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="reimb-filter-field">
                <label>Max Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxAmountFilter}
                  onChange={(e) => {
                    setMaxAmountFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <button
                type="button"
                className="reimb-btn reimb-btn-secondary"
                style={{ height: 34, padding: "0 14px", fontSize: 12 }}
                onClick={clearAllFilters}
              >
                Reset Filters
              </button>
            </div>
          )}

          <div className="reimb-table-wrap">
            <table className="reimb-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Faculty Name</th>
                  <th>Expense Category</th>
                  <th>Expense Date</th>
                  <th>Amount</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Account Ref</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClaims.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="reimb-empty-state">
                        <div className="reimb-empty-icon">
                          <ReceiptIndianRupee size={24} />
                        </div>
                        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>No claims found</h3>
                        <p style={{ margin: 0, fontSize: 13 }}>
                          {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL" || activeFilterCount > 0
                            ? "Try adjusting your search criteria or filter ranges."
                            : "No reimbursement claims submitted yet."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedClaims.map((claim) => (
                    <tr key={claim.id || claim.claimId}>
                      <td className="reimb-claim-id">{claim.claimId}</td>
                      <td>
                        <div className="reimb-faculty-cell">
                          <span className="reimb-faculty-name">{claim.facultyName}</span>
                          <span className="reimb-faculty-meta">
                            {claim.department} • {claim.facultyId}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{claim.category}</span>
                      </td>
                      <td>{formatDateLabel(claim.expenseDate)}</td>
                      <td className="reimb-amount">{formatINR(claim.amount)}</td>
                      <td>{formatDateLabel(claim.submissionDate)}</td>
                      <td>
                        <span className={`reimb-badge ${String(claim.status || "").toLowerCase().replace(/\s+/g, "_")}`}>
                          {claim.status === CLAIM_STATUSES.APPROVED && <Check size={12} />}
                          {claim.status === CLAIM_STATUSES.PENDING && <Clock size={12} />}
                          {claim.status === CLAIM_STATUSES.UNDER_REVIEW && <Eye size={12} />}
                          {claim.status === CLAIM_STATUSES.REJECTED && <X size={12} />}
                          {claim.status === CLAIM_STATUSES.PAID && <CheckCircle2 size={12} />}
                          {claim.status}
                        </span>
                      </td>
                      <td>
                        {claim.accountReferenceId ? (
                          <span className="reimb-account-ref" title="Integrated Account Record">
                            {claim.accountReferenceId}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="reimb-table-actions" style={{ justifyContent: "flex-end" }}>
                          {/* View Claim Details */}
                          <button
                            type="button"
                            className="reimb-btn-icon"
                            title="View Claim Details & Timeline"
                            onClick={() => {
                              setSelectedClaim(claim);
                              setClaimDetailModalOpen(true);
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          {/* View Proof Document */}
                          {claim.proof && (
                            <button
                              type="button"
                              className="reimb-btn-icon"
                              title={`View Proof (${claim.proof.name})`}
                              onClick={() => {
                                setSelectedClaim(claim);
                                setPreviewDocModalOpen(true);
                              }}
                            >
                              <Paperclip size={14} style={{ color: "#6F8400" }} />
                            </button>
                          )}

                          {/* Admin Review Action: Request Clarification */}
                          {isFinanceUser &&
                            (claim.status === CLAIM_STATUSES.PENDING || claim.status === CLAIM_STATUSES.UNDER_REVIEW) && (
                              <button
                                type="button"
                                className="reimb-btn-icon clarify"
                                title="Request Clarification / Additional Docs"
                                onClick={() => openClarificationModal(claim)}
                              >
                                <MessageSquareQuote size={14} />
                              </button>
                            )}

                          {/* Admin Review Action: Approve */}
                          {isFinanceUser &&
                            (claim.status === CLAIM_STATUSES.PENDING || claim.status === CLAIM_STATUSES.UNDER_REVIEW) && (
                              <button
                                type="button"
                                className="reimb-btn-icon approve"
                                title="Approve Claim (Creates Account Payable)"
                                onClick={() => openApprovalModal(claim)}
                              >
                                <Check size={14} />
                              </button>
                            )}

                          {/* Admin Review Action: Reject */}
                          {isFinanceUser &&
                            (claim.status === CLAIM_STATUSES.PENDING || claim.status === CLAIM_STATUSES.UNDER_REVIEW) && (
                              <button
                                type="button"
                                className="reimb-btn-icon reject"
                                title="Reject Claim (Mandatory Reason)"
                                onClick={() => openRejectionModal(claim)}
                              >
                                <X size={14} />
                              </button>
                            )}

                          {/* Accountant Action: Disburse Payment */}
                          {isFinanceUser && claim.status === CLAIM_STATUSES.APPROVED && (
                            <button
                              type="button"
                              className="reimb-btn-icon pay"
                              title="Disburse Payment (Mark as Paid)"
                              onClick={() => openDisbursementModal(claim)}
                            >
                              <ReceiptIndianRupee size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="reimb-pagination">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filteredClaims.length)} of {filteredClaims.length} claims
              </span>
              <div className="reimb-pagination-btns">
                <button
                  type="button"
                  className="reimb-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    className={`reimb-page-btn ${currentPage === i + 1 ? "is-active" : ""}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="reimb-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── MODALS ── */}

        {/* 1. Claim Details Modal */}
        {claimDetailModalOpen && selectedClaim && (
          <Modal
            title={`Claim Details: ${selectedClaim.claimId}`}
            onClose={() => setClaimDetailModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%", flexWrap: "wrap" }}>
                {isFinanceUser &&
                  (selectedClaim.status === CLAIM_STATUSES.PENDING ||
                    selectedClaim.status === CLAIM_STATUSES.UNDER_REVIEW) && (
                    <>
                      <button
                        type="button"
                        className="reimb-btn reimb-btn-primary"
                        onClick={() => {
                          setClaimDetailModalOpen(false);
                          openApprovalModal(selectedClaim);
                        }}
                      >
                        <Check size={14} /> Approve Claim
                      </button>
                      <button
                        type="button"
                        className="reimb-btn reimb-btn-secondary"
                        style={{ color: "#d97706", borderColor: "#fde68a" }}
                        onClick={() => {
                          setClaimDetailModalOpen(false);
                          openClarificationModal(selectedClaim);
                        }}
                      >
                        <MessageSquareQuote size={14} /> Request Clarification
                      </button>
                      <button
                        type="button"
                        className="reimb-btn reimb-btn-secondary"
                        style={{ color: "#dc2626", borderColor: "#fecaca" }}
                        onClick={() => {
                          setClaimDetailModalOpen(false);
                          openRejectionModal(selectedClaim);
                        }}
                      >
                        <X size={14} /> Reject Claim
                      </button>
                    </>
                  )}
                {isFinanceUser && selectedClaim.status === CLAIM_STATUSES.APPROVED && (
                  <button
                    type="button"
                    className="reimb-btn reimb-btn-primary"
                    onClick={() => {
                      setClaimDetailModalOpen(false);
                      openDisbursementModal(selectedClaim);
                    }}
                  >
                    <ReceiptIndianRupee size={14} /> Disburse Payment
                  </button>
                )}
                <button
                  type="button"
                  className="reimb-btn reimb-btn-secondary"
                  onClick={() => setClaimDetailModalOpen(false)}
                >
                  Close
                </button>
              </div>
            }
          >
            <div>
              <div className="reimb-modal-grid">
                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Faculty Member</span>
                  <span className="reimb-modal-value">
                    {selectedClaim.facultyName} ({selectedClaim.facultyId})
                  </span>
                </div>
                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Department &amp; Role</span>
                  <span className="reimb-modal-value">
                    {selectedClaim.department} • {selectedClaim.designation}
                  </span>
                </div>
                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Expense Category</span>
                  <span className="reimb-modal-value">{selectedClaim.category}</span>
                </div>
                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Expense Date</span>
                  <span className="reimb-modal-value">{formatDateLabel(selectedClaim.expenseDate)}</span>
                </div>
                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Claimed Amount</span>
                  <span className="reimb-modal-value" style={{ color: "#6F8400", fontSize: 16 }}>
                    {formatINR(selectedClaim.amount)}
                  </span>
                </div>
                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Current Status</span>
                  <span className={`reimb-badge ${String(selectedClaim.status || "").toLowerCase().replace(/\s+/g, "_")}`}>
                    {selectedClaim.status}
                  </span>
                </div>
              </div>

              {/* Clarification Request Banner (if any) */}
              {selectedClaim.clarificationNote && (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#1e40af", fontSize: 12.5 }}>
                    <MessageSquareQuote size={14} /> Reviewer Clarification Request
                  </div>
                  <div style={{ fontSize: 12.5, color: "#1d4ed8", marginTop: 4, lineHeight: 1.4 }}>
                    "{selectedClaim.clarificationNote}"
                  </div>
                  <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 3 }}>
                    Requested by {selectedClaim.clarificationRequestedBy || "Finance Reviewer"} on{" "}
                    {formatDateLabel(selectedClaim.clarificationRequestDate)}
                  </div>
                </div>
              )}

              <div className="reimb-modal-prop" style={{ marginBottom: 12 }}>
                <span className="reimb-modal-label">Purpose &amp; Description</span>
                <div className="reimb-modal-box">
                  <p>{selectedClaim.purpose}</p>
                </div>
              </div>

              {selectedClaim.notes && (
                <div className="reimb-modal-prop" style={{ marginBottom: 12 }}>
                  <span className="reimb-modal-label">Additional Notes</span>
                  <div className="reimb-modal-box">
                    <p>{selectedClaim.notes}</p>
                  </div>
                </div>
              )}

              {/* Supporting Document Preview Link */}
              {selectedClaim.proof && (
                <div className="reimb-modal-prop" style={{ marginBottom: 14 }}>
                  <span className="reimb-modal-label">Supporting Document</span>
                  <div className="reimb-doc-preview-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Paperclip size={16} style={{ color: "#6F8400" }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedClaim.proof.name}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        ({(selectedClaim.proof.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="reimb-btn reimb-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => setPreviewDocModalOpen(true)}
                    >
                      <Eye size={13} /> View Receipt
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Claim Timeline */}
              <div className="reimb-timeline-wrap">
                <div className="reimb-timeline-header">
                  <Clock size={14} /> Claim Progress Timeline
                </div>
                <div className="reimb-timeline">
                  {/* Step 1: Submitted */}
                  <div className="reimb-timeline-step completed">
                    <div className="reimb-timeline-node">
                      <Check size={14} />
                    </div>
                    <div className="reimb-timeline-content">
                      <span className="reimb-timeline-title">Submitted</span>
                      <span className="reimb-timeline-date">{formatDateLabel(selectedClaim.submissionDate)}</span>
                      <span className="reimb-timeline-actor">{selectedClaim.facultyName}</span>
                    </div>
                  </div>

                  {/* Step 2: Under Review */}
                  <div
                    className={`reimb-timeline-step ${
                      selectedClaim.status === CLAIM_STATUSES.UNDER_REVIEW
                        ? "active"
                        : selectedClaim.status === CLAIM_STATUSES.APPROVED ||
                          selectedClaim.status === CLAIM_STATUSES.PAID ||
                          selectedClaim.status === CLAIM_STATUSES.REJECTED
                        ? "completed"
                        : ""
                    }`}
                  >
                    <div className="reimb-timeline-node">
                      {selectedClaim.status === CLAIM_STATUSES.UNDER_REVIEW ? (
                        <Eye size={14} />
                      ) : selectedClaim.status === CLAIM_STATUSES.APPROVED ||
                        selectedClaim.status === CLAIM_STATUSES.PAID ||
                        selectedClaim.status === CLAIM_STATUSES.REJECTED ? (
                        <Check size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                    </div>
                    <div className="reimb-timeline-content">
                      <span className="reimb-timeline-title">
                        {selectedClaim.status === CLAIM_STATUSES.UNDER_REVIEW ? "Under Review" : "Finance Review"}
                      </span>
                      <span className="reimb-timeline-date">
                        {selectedClaim.clarificationRequestDate
                          ? formatDateLabel(selectedClaim.clarificationRequestDate)
                          : selectedClaim.status === CLAIM_STATUSES.PENDING
                          ? "Pending"
                          : formatDateLabel(selectedClaim.approvalDate || selectedClaim.rejectionDate || selectedClaim.submissionDate)}
                      </span>
                      <span className="reimb-timeline-actor">
                        {selectedClaim.clarificationRequestedBy || "Finance Officer"}
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Decision */}
                  <div
                    className={`reimb-timeline-step ${
                      selectedClaim.status === CLAIM_STATUSES.APPROVED || selectedClaim.status === CLAIM_STATUSES.PAID
                        ? "completed"
                        : selectedClaim.status === CLAIM_STATUSES.REJECTED
                        ? "rejected"
                        : ""
                    }`}
                  >
                    <div className="reimb-timeline-node">
                      {selectedClaim.status === CLAIM_STATUSES.APPROVED || selectedClaim.status === CLAIM_STATUSES.PAID ? (
                        <Check size={14} />
                      ) : selectedClaim.status === CLAIM_STATUSES.REJECTED ? (
                        <X size={14} />
                      ) : (
                        <span style={{ fontSize: 11 }}>3</span>
                      )}
                    </div>
                    <div className="reimb-timeline-content">
                      <span className="reimb-timeline-title">
                        {selectedClaim.status === CLAIM_STATUSES.REJECTED ? "Rejected" : "Approval"}
                      </span>
                      <span className="reimb-timeline-date">
                        {selectedClaim.status === CLAIM_STATUSES.APPROVED || selectedClaim.status === CLAIM_STATUSES.PAID
                          ? formatDateLabel(selectedClaim.approvalDate)
                          : selectedClaim.status === CLAIM_STATUSES.REJECTED
                          ? formatDateLabel(selectedClaim.rejectionDate)
                          : "Awaiting Decision"}
                      </span>
                      <span className="reimb-timeline-actor">
                        {selectedClaim.approvedBy || selectedClaim.rejectedBy || "Authorized Admin"}
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Disbursed (Paid) */}
                  <div
                    className={`reimb-timeline-step ${
                      selectedClaim.status === CLAIM_STATUSES.PAID
                        ? "completed"
                        : selectedClaim.status === CLAIM_STATUSES.APPROVED
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="reimb-timeline-node">
                      {selectedClaim.status === CLAIM_STATUSES.PAID ? (
                        <ReceiptIndianRupee size={14} />
                      ) : (
                        <span style={{ fontSize: 11 }}>4</span>
                      )}
                    </div>
                    <div className="reimb-timeline-content">
                      <span className="reimb-timeline-title">
                        {selectedClaim.status === CLAIM_STATUSES.PAID
                          ? "Payment Paid"
                          : selectedClaim.status === CLAIM_STATUSES.APPROVED
                          ? "Payment Due"
                          : "Disbursement"}
                      </span>
                      <span className="reimb-timeline-date">
                        {selectedClaim.status === CLAIM_STATUSES.PAID
                          ? formatDateLabel(selectedClaim.disbursedDate)
                          : selectedClaim.status === CLAIM_STATUSES.REJECTED
                          ? "N/A"
                          : "Authorized in Accounts"}
                      </span>
                      <span className="reimb-timeline-actor">
                        {selectedClaim.paymentMode || selectedClaim.paymentMethod || "Bank Transfer"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Section Integration Details */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginTop: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#166534", fontSize: 13 }}>
                  <CheckCircle2 size={15} /> Account Section Integration
                </div>
                <div style={{ fontSize: 12, color: "#15803d", marginTop: 4, lineHeight: 1.5 }}>
                  {selectedClaim.status === CLAIM_STATUSES.APPROVED || selectedClaim.status === CLAIM_STATUSES.PAID ? (
                    <>
                      Payable reference <strong>{selectedClaim.accountReferenceId}</strong> is posted to the CMS Account section.
                      Approved by {selectedClaim.approvedBy} on {formatDateLabel(selectedClaim.approvalDate)}.
                      {selectedClaim.status === CLAIM_STATUSES.PAID && (
                        <div>
                          Payment disbursed via {selectedClaim.paymentMode} on {formatDateLabel(selectedClaim.disbursedDate)} (Ref: {selectedClaim.paymentReference}).
                        </div>
                      )}
                    </>
                  ) : selectedClaim.status === CLAIM_STATUSES.REJECTED ? (
                    <>
                      Claim rejected by {selectedClaim.rejectedBy} on {formatDateLabel(selectedClaim.rejectionDate)}.
                      <br />
                      <strong>Reason:</strong> {selectedClaim.rejectionReason}
                    </>
                  ) : (
                    <>
                      Claim is currently {selectedClaim.status}. Upon approval, an official payable entry
                      <strong> ACC-PAY-{selectedClaim.claimId}</strong> will be generated in the CMS Account Section.
                    </>
                  )}
                </div>
              </div>

              {/* Audit Trail Activity History */}
              {selectedClaim.auditLog && selectedClaim.auditLog.length > 0 && (
                <div className="reimb-audit-box">
                  <div className="reimb-audit-header">
                    <span>Activity Audit Trail</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {selectedClaim.auditLog.length} recorded event(s)
                    </span>
                  </div>
                  <ul className="reimb-audit-list">
                    {selectedClaim.auditLog.map((log) => (
                      <li key={log.id} className="reimb-audit-item">
                        <div className="reimb-audit-event">
                          <span className="reimb-audit-action">{log.action}</span>
                          <span className="reimb-audit-notes">{log.notes || "—"}</span>
                        </div>
                        <div className="reimb-audit-meta">
                          <div>
                            <strong>{log.actor}</strong> ({log.role})
                          </div>
                          <div>
                            {new Date(log.timestamp).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* 2. Approve Claim Confirmation Modal */}
        {approvalModalOpen && selectedClaim && (
          <Modal
            title={`Approve Reimbursement: ${selectedClaim.claimId}`}
            onClose={() => !isProcessingAction && setApprovalModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-secondary"
                  disabled={isProcessingAction}
                  onClick={() => setApprovalModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-primary"
                  disabled={isProcessingAction}
                  onClick={handleConfirmApproval}
                >
                  {isProcessingAction ? "Processing..." : "Confirm & Post to Accounts"}
                </button>
              </div>
            }
          >
            <div>
              <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "#374151" }}>
                You are approving reimbursement for <strong>{selectedClaim.facultyName}</strong> (
                {selectedClaim.department}). This action is recorded in the audit trail.
              </p>

              <div className="reimb-field" style={{ marginBottom: 12 }}>
                <label>Approved Amount (₹) <span className="req">*</span></label>
                <div className="reimb-input-prefix-wrap">
                  <span className="reimb-input-prefix">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    className="reimb-input has-prefix"
                  />
                </div>
              </div>

              <div className="reimb-field" style={{ marginBottom: 14 }}>
                <label>Approval Remarks / Budget Authorization</label>
                <textarea
                  rows={2}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="reimb-textarea"
                  placeholder="e.g. Approved under faculty academic development grant."
                />
              </div>

              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#1e40af",
                }}
              >
                <strong>Critical Account Section Action:</strong> Approving this claim will create a
                payable record <strong>ACC-PAY-{selectedClaim.claimId}</strong> in the CMS Finance / Account section.
              </div>
            </div>
          </Modal>
        )}

        {/* 3. Reject Claim Modal (Mandatory Reason) */}
        {rejectionModalOpen && selectedClaim && (
          <Modal
            title={`Reject Reimbursement: ${selectedClaim.claimId}`}
            onClose={() => !isProcessingAction && setRejectionModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-secondary"
                  disabled={isProcessingAction}
                  onClick={() => setRejectionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="reimb-btn"
                  style={{ background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}
                  disabled={isProcessingAction || !rejectionReason.trim()}
                  onClick={handleConfirmRejection}
                >
                  {isProcessingAction ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            }
          >
            <div>
              <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "#374151" }}>
                Rejecting claim submitted by <strong>{selectedClaim.facultyName}</strong> for {formatINR(selectedClaim.amount)}.
              </p>

              <div className="reimb-field" style={{ marginBottom: 12 }}>
                <label>
                  Rejection Reason <span className="req">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="reimb-textarea"
                  placeholder="State the mandatory reason (e.g. Missing tax invoice, exceeds allowable budget, non-compliant expenditure)..."
                />
              </div>

              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#991b1b",
                }}
              >
                <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                No payable entry will be generated in the Account section for rejected claims.
              </div>
            </div>
          </Modal>
        )}

        {/* 4. Payment Disbursement Modal */}
        {disbursementModalOpen && selectedClaim && (
          <Modal
            title={`Disburse Payment: ${selectedClaim.claimId}`}
            onClose={() => !isProcessingAction && setDisbursementModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-secondary"
                  disabled={isProcessingAction}
                  onClick={() => setDisbursementModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-primary"
                  disabled={isProcessingAction}
                  onClick={handleConfirmDisbursement}
                >
                  {isProcessingAction ? "Recording..." : "Confirm Disbursement"}
                </button>
              </div>
            }
          >
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#374151" }}>
                Confirm disbursement of <strong>{formatINR(selectedClaim.approvedAmount || selectedClaim.amount)}</strong> to{" "}
                <strong>{selectedClaim.facultyName}</strong>.
              </p>

              <div className="reimb-grid-2" style={{ marginBottom: 12 }}>
                <div className="reimb-field">
                  <label>Payment Mode</label>
                  <select
                    value={disbursementMode}
                    onChange={(e) => setDisbursementMode(e.target.value)}
                    className="reimb-select"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash Voucher</option>
                    <option value="Other">Other Mode...</option>
                  </select>
                  {disbursementMode === "Other" && (
                    <div className="reimb-other-input-wrap">
                      <input
                        type="text"
                        value={otherDisbursementMode}
                        onChange={(e) => setOtherDisbursementMode(e.target.value)}
                        className="reimb-input"
                        placeholder="Specify payment mode..."
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="reimb-field">
                  <label>Transaction / Reference Number</label>
                  <input
                    type="text"
                    value={disbursementRef}
                    onChange={(e) => setDisbursementRef(e.target.value)}
                    className="reimb-input"
                    placeholder="e.g. UTR-9982341"
                  />
                </div>
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#166534",
                }}
              >
                This will mark the claim as <strong>Paid</strong> and update the corresponding Account section payable entry.
              </div>
            </div>
          </Modal>
        )}

        {/* 5. Document Preview Modal */}
        {previewDocModalOpen && selectedClaim?.proof && (
          <Modal
            title={`Receipt Proof: ${selectedClaim.proof.name}`}
            onClose={() => setPreviewDocModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
                {selectedClaim.proof.dataUrl && (
                  <a
                    href={selectedClaim.proof.dataUrl}
                    download={selectedClaim.proof.name}
                    className="reimb-btn reimb-btn-secondary"
                    style={{ textDecoration: "none" }}
                  >
                    <Download size={14} /> Download Receipt
                  </a>
                )}
                <button
                  type="button"
                  className="reimb-btn reimb-btn-primary"
                  onClick={() => setPreviewDocModalOpen(false)}
                >
                  Close Preview
                </button>
              </div>
            }
          >
            <div style={{ textAlign: "center", maxHeight: "65vh", overflowY: "auto" }}>
              {selectedClaim.proof.type?.startsWith("image/") && selectedClaim.proof.dataUrl ? (
                <img
                  src={selectedClaim.proof.dataUrl}
                  alt={selectedClaim.proof.name}
                  style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
              ) : selectedClaim.proof.dataUrl?.startsWith("data:application/pdf") ? (
                <iframe
                  src={selectedClaim.proof.dataUrl}
                  title={selectedClaim.proof.name}
                  style={{ width: "100%", height: "50vh", border: "1px solid #e2e8f0", borderRadius: 8 }}
                />
              ) : (
                <div style={{ padding: 30, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <FileText size={48} style={{ color: "#6F8400", margin: "0 auto 12px" }} />
                  <h4 style={{ margin: "0 0 6px" }}>{selectedClaim.proof.name}</h4>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                    File size: {(selectedClaim.proof.size / 1024).toFixed(1)} KB • Type: {selectedClaim.proof.type || "Document"}
                  </p>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* 6. Account Section Integrated Payables Drawer Modal */}
        {viewAccountsDrawerOpen && (
          <Modal
            title="CMS Account Section — Integrated Reimbursement Payables"
            onClose={() => setViewAccountsDrawerOpen(false)}
            footer={
              <button
                type="button"
                className="reimb-btn reimb-btn-secondary"
                onClick={() => setViewAccountsDrawerOpen(false)}
              >
                Close Ledger
              </button>
            }
          >
            <div>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#475569" }}>
                These records represent approved faculty claims synchronized directly with the CMS
                Financial Account &amp; Payables ledger.
              </p>

              <div style={{ overflowX: "auto" }}>
                <table className="reimb-table">
                  <thead>
                    <tr>
                      <th>Account Ref</th>
                      <th>Claim ID</th>
                      <th>Faculty</th>
                      <th>Category</th>
                      <th>Payable Amount</th>
                      <th>Approval Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                          No approved reimbursement payables currently in the Account section.
                        </td>
                      </tr>
                    ) : (
                      accountEntries.map((acc) => (
                        <tr key={acc.accountEntryId || acc.id}>
                          <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>
                            {acc.accountEntryId}
                          </td>
                          <td style={{ fontFamily: "monospace" }}>{acc.claimId}</td>
                          <td>
                            <strong>{acc.facultyName}</strong>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{acc.department}</div>
                          </td>
                          <td>{acc.category}</td>
                          <td style={{ fontWeight: 700 }}>{formatINR(acc.amount)}</td>
                          <td>{formatDateLabel(acc.approvalDate)}</td>
                          <td>
                            <span
                              className={`reimb-badge ${acc.paymentStatus?.includes("Paid") ? "paid" : "approved"}`}
                            >
                              {acc.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>
        )}

        {/* 7. Clarification Request Modal */}
        {clarificationModalOpen && selectedClaim && (
          <Modal
            title={`Request Clarification: ${selectedClaim.claimId}`}
            onClose={() => !isProcessingAction && setClarificationModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-secondary"
                  disabled={isProcessingAction}
                  onClick={() => setClarificationModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-primary"
                  disabled={isProcessingAction || !clarificationNote.trim()}
                  onClick={handleConfirmClarification}
                >
                  {isProcessingAction ? "Sending..." : "Send Clarification Request"}
                </button>
              </div>
            }
          >
            <div>
              <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "#374151" }}>
                Request additional details or supporting documents from{" "}
                <strong>{selectedClaim.facultyName}</strong> for claim{" "}
                <strong>{selectedClaim.claimId}</strong> ({formatINR(selectedClaim.amount)}). The claim will transition to{" "}
                <strong>Under Review</strong> status without being rejected.
              </p>

              <div className="reimb-field" style={{ marginBottom: 12 }}>
                <label>
                  Clarification Note / Additional Documents Required <span className="req">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={clarificationNote}
                  onChange={(e) => setClarificationNote(e.target.value)}
                  className="reimb-textarea"
                  placeholder="e.g. Please upload original GST tax invoice matching institutional name, or clarify conference registration itemization..."
                />
              </div>

              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#1e40af",
                }}
              >
                <HelpCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                The faculty member will be notified and can review the requested details under My Claims.
              </div>
            </div>
          </Modal>
        )}

        {/* 8. Claim Submission Draft Preview Modal */}
        {previewClaimModalOpen && (
          <Modal
            title="Preview Claim Submission (Draft)"
            onClose={() => setPreviewClaimModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-secondary"
                  onClick={() => setPreviewClaimModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  className="reimb-btn reimb-btn-primary"
                  onClick={handleSubmitClaim}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="spin-animate" /> Submitting...
                    </>
                  ) : (
                    <>
                      <ReceiptIndianRupee size={15} /> Confirm &amp; Submit Claim
                    </>
                  )}
                </button>
              </div>
            }
          >
            <div>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "#f1f4e2",
                    color: "#6F8400",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileCheck2 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                    Draft Claim Overview
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Please review your claim details and attached receipt proof before final submission.
                  </div>
                </div>
              </div>

              {/* Claimant & Expense Summary Grid */}
              <div className="reimb-modal-grid">
                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Faculty Claimant</span>
                  <span className="reimb-modal-value">{formData.facultyName || "—"}</span>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    {formData.facultyId ? `ID: ${formData.facultyId}` : ""}
                    {formData.email ? ` • ${formData.email}` : ""}
                  </span>
                </div>

                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Department &amp; Designation</span>
                  <span className="reimb-modal-value">
                    {formData.department || "—"} {formData.designation ? `• ${formData.designation}` : ""}
                  </span>
                </div>

                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Expense Category</span>
                  <span className="reimb-modal-value">
                    {formData.category === "Other"
                      ? formData.otherCategory?.trim() || "Other"
                      : formData.category}
                  </span>
                </div>

                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Expense Date</span>
                  <span className="reimb-modal-value">{formatDateLabel(formData.expenseDate)}</span>
                </div>

                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Claimed Amount</span>
                  <span className="reimb-modal-value" style={{ color: "#6F8400", fontSize: 17, fontWeight: 700 }}>
                    {formatINR(Number(formData.amount) || 0)}
                  </span>
                </div>

                <div className="reimb-modal-prop">
                  <span className="reimb-modal-label">Preferred Payment Method</span>
                  <span className="reimb-modal-value">
                    {formData.paymentMethod === "Other"
                      ? formData.otherPaymentMethod?.trim() || "Other"
                      : formData.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Purpose & Description */}
              <div className="reimb-modal-prop" style={{ marginBottom: 14 }}>
                <span className="reimb-modal-label">Purpose &amp; Description</span>
                <div className="reimb-modal-box">
                  <p style={{ whiteSpace: "pre-wrap" }}>{formData.purpose || "—"}</p>
                </div>
              </div>

              {/* Additional Notes */}
              {formData.notes?.trim() && (
                <div className="reimb-modal-prop" style={{ marginBottom: 14 }}>
                  <span className="reimb-modal-label">Additional Notes / Bill Reference</span>
                  <div className="reimb-modal-box">
                    <p style={{ whiteSpace: "pre-wrap" }}>{formData.notes}</p>
                  </div>
                </div>
              )}

              {/* Receipt / Invoice Proof Attachment */}
              <div className="reimb-modal-prop" style={{ marginBottom: 14 }}>
                <span className="reimb-modal-label">Attached Receipt / Invoice Proof</span>
                {uploadedFile ? (
                  <div className="reimb-doc-preview-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                      <Paperclip size={16} style={{ color: "#6F8400", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {uploadedFile.name}
                      </span>
                      <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>
                        ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    {uploadedFile.dataUrl && (
                      <button
                        type="button"
                        className="reimb-btn reimb-btn-secondary"
                        style={{ padding: "4px 10px", fontSize: 12, flexShrink: 0 }}
                        onClick={() => setPreviewDraftDocModalOpen(true)}
                      >
                        <Eye size={13} /> View Receipt
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "#dc2626", marginTop: 4 }}>
                    No receipt proof attached.
                  </div>
                )}
              </div>

              {/* Declaration Confirmation */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Declaration Confirmed:</strong> Expenses were incurred legitimately for official institutional purposes and supporting documents are authentic.
                </span>
              </div>
            </div>
          </Modal>
        )}

        {/* 9. Draft Document Preview Modal */}
        {previewDraftDocModalOpen && uploadedFile && (
          <Modal
            title={`Draft Receipt Proof: ${uploadedFile.name}`}
            onClose={() => setPreviewDraftDocModalOpen(false)}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%" }}>
                {uploadedFile.dataUrl && (
                  <a
                    href={uploadedFile.dataUrl}
                    download={uploadedFile.name}
                    className="reimb-btn reimb-btn-secondary"
                    style={{ textDecoration: "none" }}
                  >
                    <Download size={14} /> Download Receipt
                  </a>
                )}
                <button
                  type="button"
                  className="reimb-btn reimb-btn-primary"
                  onClick={() => setPreviewDraftDocModalOpen(false)}
                >
                  Close Receipt
                </button>
              </div>
            }
          >
            <div style={{ textAlign: "center", maxHeight: "65vh", overflowY: "auto" }}>
              {uploadedFile.type?.startsWith("image/") && uploadedFile.dataUrl ? (
                <img
                  src={uploadedFile.dataUrl}
                  alt={uploadedFile.name}
                  style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
              ) : uploadedFile.dataUrl?.startsWith("data:application/pdf") ? (
                <iframe
                  src={uploadedFile.dataUrl}
                  title={uploadedFile.name}
                  style={{ width: "100%", height: "50vh", border: "1px solid #e2e8f0", borderRadius: 8 }}
                />
              ) : (
                <div style={{ padding: 30, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <FileText size={48} style={{ color: "#6F8400", margin: "0 auto 12px" }} />
                  <h4 style={{ margin: "0 0 6px" }}>{uploadedFile.name}</h4>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                    File size: {(uploadedFile.size / 1024).toFixed(1)} KB • Type: {uploadedFile.type || "Document"}
                  </p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
  );

  if (isAccountantView) {
    return pageContent;
  }

  return (
    <DashboardLayout
      title={isFinanceUser ? "Staff Reimbursements" : "Faculty Reimbursement"}
      subtitle={
        isFinanceUser
          ? "Review, approve, and disburse faculty & staff expense reimbursement claims."
          : "Submit, track, and manage faculty expense reimbursement claims."
      }
      breadcrumb={["Home", isFinanceUser ? "Staff" : "Finance", "Reimbursements"]}
    >
      {pageContent}
    </DashboardLayout>
  );
}
