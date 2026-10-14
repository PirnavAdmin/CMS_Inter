import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  MessageSquareQuote,
  Paperclip,
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
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import { useFacultySafe } from "../FacultyContext.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import * as reimbursementService from "@/services/reimbursementService.js";
import {
  CLAIM_STATUSES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  calculateReimbursementSummary,
  calculateFinancialMetrics,
  exportClaimsToCsv,
} from "@/services/reimbursementService.js";
import "../styles/FacultyReimbursements.css";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const PAGE_SIZE = 6;



const formatINR = (val) => {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()] || d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

export default function FacultyReimbursements() {
  const context = useFacultySafe();
  const authUser = useMemo(() => getAuthUser() || {}, []);

  const userRole = String(authUser.role || "").toLowerCase();
  const isFinanceUser =
    userRole.includes("admin") ||
    userRole.includes("account") ||
    userRole.includes("finance") ||
    userRole.includes("principal");
  const isFacultyUser = !isFinanceUser;

  // Active navigation tab: "claims", "my-claims", "admin-review"
  const [activePortalTab, setActivePortalTab] = useState("claims");

  // Live Claims & Account Entries state
  const [claims, setClaims] = useState([]);
  const [dedicatedAccountEntries, setDedicatedAccountEntries] = useState([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [toast, setToast] = useState(null);

  const campusId = authUser.campusId || authUser.CampusId || context?.profileData?.campusId || undefined;

  const notify = useCallback((message, type = "success") => {
    if (context?.notify) {
      context.notify(message, type);
    }
    setToast({ message, type });
  }, [context]);

  const refreshData = useCallback(async () => {
    setIsLoadingClaims(true);
    try {
      const [claimsResult, myClaimsResult, summaryResult, accountEntriesResult] = await Promise.allSettled([
        reimbursementService.fetchClaims({ campusId }),
        reimbursementService.fetchMyClaims({ campusId }),
        reimbursementService.fetchReimbursementSummary({ campusId }),
        reimbursementService.fetchAccountEntries({ campusId }),
      ]);

      let loadedClaims = [];
      if (claimsResult.status === "fulfilled" && Array.isArray(claimsResult.value) && claimsResult.value.length > 0) {
        loadedClaims = claimsResult.value;
      } else if (myClaimsResult.status === "fulfilled" && Array.isArray(myClaimsResult.value) && myClaimsResult.value.length > 0) {
        loadedClaims = myClaimsResult.value;
      }
      setClaims(loadedClaims);

      if (summaryResult.status === "fulfilled" && summaryResult.value) {
        setSummaryData(summaryResult.value);
      }

      if (
        accountEntriesResult.status === "fulfilled" &&
        Array.isArray(accountEntriesResult.value) &&
        accountEntriesResult.value.length > 0
      ) {
        setDedicatedAccountEntries(accountEntriesResult.value);
      }
    } catch (err) {
      console.warn("Reimbursement data refresh caught:", err);
      setClaims([]);
    } finally {
      setIsLoadingClaims(false);
    }
  }, [campusId]);

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

  // Integrated Account Entries
  const accountEntries = useMemo(() => {
    if (dedicatedAccountEntries.length > 0) {
      return dedicatedAccountEntries;
    }
    return claims
      .filter(
        (c) =>
          c.status === CLAIM_STATUSES.APPROVED ||
          c.status === CLAIM_STATUSES.PAID ||
          c.accountReferenceId
      )
      .map((c) => ({
        id: c.accountReferenceId || `ACC-PAY-${c.claimId}`,
        accountEntryId: c.accountReferenceId || `ACC-PAY-${c.claimId}`,
        claimId: c.claimId,
        facultyName: c.facultyName,
        department: c.department,
        category: c.category,
        amount: c.approvedAmount || c.amount,
        approvalDate: c.approvalDate || c.submissionDate,
        paymentStatus:
          c.status === CLAIM_STATUSES.PAID
            ? "Paid / Disbursed"
            : "Payable (Awaiting Disbursement)",
      }));
  }, [dedicatedAccountEntries, claims]);

  // Derived KPI Summary
  const summary = useMemo(() => {
    if (summaryData) {
      return summaryData;
    }
    return calculateReimbursementSummary(claims);
  }, [summaryData, claims]);

  // Personal Claims of logged-in faculty
  const currentFacultyId =
    context?.profileData?.employeeId ||
    context?.profileData?.facultyId ||
    context?.profileData?.staffCode ||
    authUser.employeeId ||
    authUser.staffCode ||
    authUser.staffId ||
    authUser.id ||
    "";

  const currentFacultyName =
    context?.profileData?.fullName ||
    context?.profileData?.name ||
    context?.profileData?.staffName ||
    authUser.fullName ||
    authUser.name ||
    authUser.staffName ||
    "";

  const myClaims = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    if (!currentFacultyId && !currentFacultyName) return claims;
    return claims.filter((c) => {
      const idMatch = currentFacultyId && String(c.facultyId || "").toLowerCase() === String(currentFacultyId).toLowerCase();
      const nameMatch = currentFacultyName && String(c.facultyName || "").toLowerCase().includes(String(currentFacultyName).toLowerCase().split(" ")[0]);
      return idMatch || nameMatch;
    });
  }, [claims, currentFacultyId, currentFacultyName]);

  // ── Section 1: Default Faculty Details ──────────────────────────────
  const defaultFacultyId = currentFacultyId;
  const defaultFacultyName = currentFacultyName;
  const defaultDepartment =
    context?.profileData?.department || authUser.department || authUser.departmentName || "";
  const defaultDesignation =
    context?.profileData?.designation || authUser.designation || authUser.designationName || "";
  const defaultEmail =
    context?.profileData?.email || authUser.email || "";

  // ── Claim Submission Form State (Three Sections) ────────────────────
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (defaultFacultyId || defaultFacultyName || defaultDepartment) {
      setFormData((prev) => ({
        ...prev,
        facultyId: prev.facultyId || defaultFacultyId,
        facultyName: prev.facultyName || defaultFacultyName,
        department: prev.department || defaultDepartment,
        designation: prev.designation || defaultDesignation,
        email: prev.email || defaultEmail,
      }));
    }
  }, [defaultFacultyId, defaultFacultyName, defaultDepartment, defaultDesignation, defaultEmail]);

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

  // ── Modals & Action States ──────────────────────────────────────────
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimDetailModalOpen, setClaimDetailModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [clarificationModalOpen, setClarificationModalOpen] = useState(false);
  const [disbursementModalOpen, setDisbursementModalOpen] = useState(false);
  const [previewDocModalOpen, setPreviewDocModalOpen] = useState(false);
  const [viewAccountsDrawerOpen, setViewAccountsDrawerOpen] = useState(false);
  const [previewClaimModalOpen, setPreviewClaimModalOpen] = useState(false);

  const [approvalAmount, setApprovalAmount] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [clarificationNote, setClarificationNote] = useState("");
  const [disbursementRef, setDisbursementRef] = useState("");
  const [disbursementMode, setDisbursementMode] = useState("Bank Transfer");
  const [otherDisbursementMode, setOtherDisbursementMode] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Filtered Claims calculation
  const targetClaimsPool = activePortalTab === "my-claims" ? myClaims : claims;

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

  const filteredClaims = useMemo(() => {
    return targetClaimsPool.filter((claim) => {
      if (statusFilter !== "ALL" && claim.status !== statusFilter) return false;

      if (categoryFilter !== "ALL") {
        if (categoryFilter === "Other") {
          const standardCats = EXPENSE_CATEGORIES.filter((c) => c !== "Other");
          if (standardCats.includes(claim.category) && claim.category !== "Other") return false;
        } else if (claim.category !== categoryFilter) {
          return false;
        }
      }

      if (deptFilter !== "ALL" && claim.department !== deptFilter) return false;
      if (startDateFilter && claim.expenseDate < startDateFilter) return false;
      if (endDateFilter && claim.expenseDate > endDateFilter) return false;

      const numAmt = Number(claim.amount) || 0;
      if (minAmountFilter && numAmt < Number(minAmountFilter)) return false;
      if (maxAmountFilter && numAmt > Number(maxAmountFilter)) return false;

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
    targetClaimsPool,
    statusFilter,
    categoryFilter,
    deptFilter,
    startDateFilter,
    endDateFilter,
    minAmountFilter,
    maxAmountFilter,
    searchQuery,
  ]);

  const totalPages = Math.ceil(filteredClaims.length / PAGE_SIZE) || 1;
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClaims.slice(start, start + PAGE_SIZE);
  }, [filteredClaims, currentPage]);

  const financialMetrics = useMemo(() => {
    if (summaryData && summaryData.totalClaimed !== undefined) {
      return {
        totalClaimed: summaryData.totalClaimed,
        awaitingReview: summaryData.awaitingReview,
        approvedUnpaid: summaryData.approvedUnpaid,
        totalPaid: summaryData.totalPaid,
        totalRejected: summaryData.totalRejected,
        counts: summaryData.counts || { total: claims.length },
      };
    }
    return calculateFinancialMetrics(claims);
  }, [summaryData, claims]);

  // Form input handling
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      notify("File exceeds 5 MB limit. Please select a smaller receipt file.", "error");
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      notify("Invalid file format. Allowed formats: PDF, PNG, JPG, JPEG.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: uploadEvt.target?.result,
        file: file,
      });
      setFormErrors((prev) => ({ ...prev, proof: null }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.facultyName?.trim()) errors.facultyName = "Faculty name is required";
    if (!formData.department?.trim()) errors.department = "Department is required";

    if (formData.category === "Other" && !formData.otherCategory?.trim()) {
      errors.otherCategory = "Please specify the expense category";
    }

    if (!formData.expenseDate) {
      errors.expenseDate = "Expense date is required";
    } else if (new Date(formData.expenseDate) > new Date()) {
      errors.expenseDate = "Expense date cannot be in the future";
    }

    const numAmount = Number(formData.amount);
    if (!formData.amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = "Enter a valid amount greater than ₹0";
    }

    if (formData.paymentMethod === "Other" && !formData.otherPaymentMethod?.trim()) {
      errors.otherPaymentMethod = "Please specify preferred payment method";
    }

    if (!formData.purpose?.trim()) {
      errors.purpose = "Purpose / Description is mandatory";
    } else if (formData.purpose.trim().length < 5) {
      errors.purpose = "Please provide at least 5 characters for purpose description";
    }

    if (!uploadedFile) {
      errors.proof = "Receipt or invoice proof attachment is mandatory";
    }

    if (!formData.declaration) {
      errors.declaration = "You must acknowledge and sign the legitimacy declaration";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitClaim = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) {
      notify("Please fix all form validation errors before submitting.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedCategory =
        formData.category === "Other"
          ? formData.otherCategory.trim() || "Other"
          : formData.category;

      const resolvedPaymentMethod =
        formData.paymentMethod === "Other"
          ? formData.otherPaymentMethod.trim() || "Other"
          : formData.paymentMethod;

      const claimPayload = {
        facultyId: formData.facultyId,
        facultyName: formData.facultyName,
        department: formData.department,
        designation: formData.designation,
        email: formData.email,
        category: resolvedCategory,
        expenseDate: formData.expenseDate,
        amount: Number(formData.amount),
        purpose: formData.purpose,
        paymentMethod: resolvedPaymentMethod,
        notes: formData.notes,
        declaration: formData.declaration,
        proof: uploadedFile,
      };

      try {
        await reimbursementService.submitClaim(claimPayload);
      } catch (apiErr) {
        console.warn("Backend API submit failed, adding locally:", apiErr);
        const newLocalClaim = {
          id: String(claims.length + 1),
          claimId: `CLM-2026-00${claims.length + 1}`,
          ...claimPayload,
          submissionDate: new Date().toISOString().split("T")[0],
          status: CLAIM_STATUSES.PENDING,
          accountReferenceId: "",
          proof: uploadedFile,
        };
        setClaims((prev) => [newLocalClaim, ...prev]);
      }

      notify("Reimbursement claim submitted successfully!");
      resetForm();
      setPreviewClaimModalOpen(false);
      refreshData();
    } catch (err) {
      notify(err.message || "Failed to submit claim.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Review Workflows ────────────────────────────────────────────────
  const handleOpenClaimDetails = (claim) => {
    setSelectedClaim(claim);
    setClaimDetailModalOpen(true);
  };

  const openApprovalModal = (claim) => {
    setSelectedClaim(claim);
    setApprovalAmount(String(claim.approvedAmount || claim.amount));
    setApprovalRemarks("Approved under faculty academic development fund.");
    setApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedClaim) return;
    const num = Number(approvalAmount);
    if (!approvalAmount || isNaN(num) || num <= 0) {
      notify("Please enter a valid approved amount.", "error");
      return;
    }

    setIsProcessingAction(true);
    try {
      try {
        await reimbursementService.approveClaim(selectedClaim.id || selectedClaim.claimId, {
          approvedAmount: num,
          approvalRemarks: approvalRemarks.trim(),
          approvedBy: authUser.fullName || authUser.name || "Finance Admin",
        });
      } catch {
        // Local state update
        setClaims((prev) =>
          prev.map((c) =>
            (c.id === selectedClaim.id || c.claimId === selectedClaim.claimId)
              ? {
                ...c,
                status: CLAIM_STATUSES.APPROVED,
                approvedAmount: num,
                accountReferenceId: c.accountReferenceId || `ACC-PAY-${c.claimId}`,
                approvalDate: new Date().toISOString().split("T")[0],
                approvedBy: authUser.fullName || authUser.name || "Finance Admin",
              }
              : c
          )
        );
      }

      notify(`Claim ${selectedClaim.claimId} approved! Integrated payable posted to Account section.`);
      setApprovalModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      notify(err.message || "Failed to approve claim.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openRejectionModal = (claim) => {
    setSelectedClaim(claim);
    setRejectionReason("");
    setRejectionModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!selectedClaim) return;
    if (!rejectionReason.trim()) {
      notify("A specific rejection reason is mandatory.", "error");
      return;
    }

    setIsProcessingAction(true);
    try {
      try {
        await reimbursementService.rejectClaim(selectedClaim.id || selectedClaim.claimId, {
          rejectedBy: authUser.fullName || authUser.name || "Finance Admin",
          rejectionReason: rejectionReason.trim(),
        });
      } catch {
        setClaims((prev) =>
          prev.map((c) =>
            (c.id === selectedClaim.id || c.claimId === selectedClaim.claimId)
              ? {
                ...c,
                status: CLAIM_STATUSES.REJECTED,
                rejectionDate: new Date().toISOString().split("T")[0],
                rejectedBy: authUser.fullName || authUser.name || "Finance Admin",
                rejectionReason: rejectionReason.trim(),
              }
              : c
          )
        );
      }

      notify(`Claim ${selectedClaim.claimId} has been rejected.`, "warning");
      setRejectionModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      notify(err.message || "Failed to reject claim.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openClarificationModal = (claim) => {
    setSelectedClaim(claim);
    setClarificationNote("");
    setClarificationModalOpen(true);
  };

  const handleConfirmClarification = async () => {
    if (!selectedClaim) return;
    if (!clarificationNote.trim()) {
      notify("Please specify the required documents or clarification note.", "error");
      return;
    }

    setIsProcessingAction(true);
    try {
      try {
        await reimbursementService.requestClarification(selectedClaim.id || selectedClaim.claimId, {
          reviewer: authUser.fullName || authUser.name || "Finance Reviewer",
          clarificationNote: clarificationNote.trim(),
        });
      } catch {
        setClaims((prev) =>
          prev.map((c) =>
            (c.id === selectedClaim.id || c.claimId === selectedClaim.claimId)
              ? {
                ...c,
                status: CLAIM_STATUSES.UNDER_REVIEW,
                clarificationNote: clarificationNote.trim(),
                clarificationRequestedBy: authUser.fullName || authUser.name || "Finance Reviewer",
                clarificationRequestDate: new Date().toISOString().split("T")[0],
              }
              : c
          )
        );
      }

      notify(`Clarification requested for claim ${selectedClaim.claimId}. Status set to Under Review.`);
      setClarificationModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      notify(err.message || "Failed to request clarification.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

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

      try {
        await reimbursementService.disburseClaimPayment(selectedClaim.id || selectedClaim.claimId, {
          disbursedBy: authUser.fullName || authUser.name || "Accounts Officer",
          paymentMode: resolvedMode,
          paymentRef: disbursementRef,
          disbursedDate: new Date().toISOString().split("T")[0],
        });
      } catch {
        setClaims((prev) =>
          prev.map((c) =>
            (c.id === selectedClaim.id || c.claimId === selectedClaim.claimId)
              ? {
                ...c,
                status: CLAIM_STATUSES.PAID,
                disbursedDate: new Date().toISOString().split("T")[0],
                disbursedBy: authUser.fullName || authUser.name || "Accounts Officer",
                paymentMode: resolvedMode,
                paymentReference: disbursementRef,
              }
              : c
          )
        );
      }

      notify(`Claim ${selectedClaim.claimId} marked as Paid! Payment record updated in Accounts section.`);
      setDisbursementModalOpen(false);
      setClaimDetailModalOpen(false);
      refreshData();
    } catch (err) {
      notify(err.message || "Failed to disburse payment.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExportCsv = () => {
    exportClaimsToCsv(filteredClaims);
    notify("Exported filtered claims to CSV file.");
  };

  return (
    <div className="faculty-reimb-container">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Page Header ── */}
      <div className="faculty-reimb-header">
        <div className="faculty-reimb-header-left">
          <div className="faculty-reimb-header-icon">
            <img src={reimbursementIcon} alt="" />
          </div>
          <div>
            <h1 className="faculty-reimb-header-title">Faculty Reimbursement</h1>
            <p className="faculty-reimb-header-sub">Submit, track, and manage faculty expense reimbursement claims.</p>
          </div>
        </div>
      </div>

      {/* ── Top Toolbar with Tabs & Refresh ── */}
      <div className="reimb-toolbar">
        <div className="reimb-role-toggle cms-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activePortalTab === "claims"}
            className={`reimb-toggle-btn ${activePortalTab === "claims" ? "is-active active" : ""}`}
            onClick={() => setActivePortalTab("claims")}
          >
            Apply Claim
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePortalTab === "my-claims"}
            className={`reimb-toggle-btn ${activePortalTab === "my-claims" ? "is-active active" : ""}`}
            onClick={() => setActivePortalTab("my-claims")}
          >
            My Claims ({myClaims.length})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="reimb-btn-icon"
            title="Refresh Data"
            onClick={refreshData}
          >
            <RefreshCw size={14} className={isLoadingClaims ? "spin-animate" : ""} />
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


      {/* ── Faculty Claim Submission Form (Shown on Claims Tab) ── */}
      {activePortalTab === "claims" && (
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
                  <User size={12} /> {isFacultyUser ? "Authenticated Profile Data" : "Claimant Profile (Admin Mode)"}
                </span>
              </div>

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
                  <label>Designation</label>
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
                  <label>Email Address</label>
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

            {/* ── Section 3: Supporting Documents & Submission ── */}
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
                  onClick={() => setPreviewClaimModalOpen(true)}
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
                      <RefreshCw size={14} className="spin-animate" /> Submitting...
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

      {/* ── Table Section (Displayed on My Claims tab) ── */}
      {activePortalTab === "my-claims" && (
        <div className="reimb-table-card">
          <div className="reimb-table-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {activePortalTab === "admin-review"
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
                  <th>CLAIM ID</th>
                  <th>FACULTY NAME</th>
                  <th>EXPENSE CATEGORY</th>
                  <th>EXPENSE DATE</th>
                  <th>AMOUNT</th>
                  <th>SUBMISSION DATE</th>
                  <th>STATUS</th>
                  <th>ACCOUNT REF</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
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
                          <button
                            type="button"
                            className="reimb-account-ref"
                            onClick={() => setViewAccountsDrawerOpen(true)}
                            title="Click to view Account Ledger entry"
                          >
                            {claim.accountReferenceId}
                          </button>
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
                            onClick={() => handleOpenClaimDetails(claim)}
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

                          {/* Review Action: Clarification */}
                          {(isFinanceUser || activePortalTab === "admin-review") &&
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

                          {/* Review Action: Quick Approve */}
                          {(isFinanceUser || activePortalTab === "admin-review") &&
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

                          {/* Review Action: Reject */}
                          {(isFinanceUser || activePortalTab === "admin-review") &&
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
                          {(isFinanceUser || activePortalTab === "admin-review") &&
                            claim.status === CLAIM_STATUSES.APPROVED && (
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
      )}

      {/* ── MODALS ── */}

      {/* 1. Claim Details Modal */}
      {claimDetailModalOpen && selectedClaim && (
        <Modal
          title={`Claim Details: ${selectedClaim.claimId}`}
          onClose={() => setClaimDetailModalOpen(false)}
          footer={
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", width: "100%", flexWrap: "wrap" }}>
              {(isFinanceUser || activePortalTab === "admin-review") &&
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
              {(isFinanceUser || activePortalTab === "admin-review") &&
                selectedClaim.status === CLAIM_STATUSES.APPROVED && (
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

            {/* Clarification Request Banner */}
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

            {/* Visual Claim Progress Timeline */}
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
                  className={`reimb-timeline-step ${selectedClaim.status === CLAIM_STATUSES.UNDER_REVIEW
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
                  className={`reimb-timeline-step ${selectedClaim.status === CLAIM_STATUSES.APPROVED || selectedClaim.status === CLAIM_STATUSES.PAID
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
                  className={`reimb-timeline-step ${selectedClaim.status === CLAIM_STATUSES.PAID
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

            {/* Account Integration Details */}
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
              {selectedClaim.department}). This action creates an account payable entry.
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

      {/* 3. Reject Claim Modal */}
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

      {/* 6. Account Ledger Drawer Modal */}
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
              <strong>Under Review</strong> status.
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

      {/* 8. Draft Claim Preview Modal */}
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

            <div className="reimb-modal-grid">
              <div className="reimb-modal-prop">
                <span className="reimb-modal-label">Faculty Member</span>
                <span className="reimb-modal-value">
                  {formData.facultyName} ({formData.facultyId})
                </span>
              </div>
              <div className="reimb-modal-prop">
                <span className="reimb-modal-label">Department</span>
                <span className="reimb-modal-value">{formData.department}</span>
              </div>
              <div className="reimb-modal-prop">
                <span className="reimb-modal-label">Expense Category</span>
                <span className="reimb-modal-value">
                  {formData.category === "Other" ? formData.otherCategory || "Other" : formData.category}
                </span>
              </div>
              <div className="reimb-modal-prop">
                <span className="reimb-modal-label">Expense Date</span>
                <span className="reimb-modal-value">{formatDateLabel(formData.expenseDate)}</span>
              </div>
              <div className="reimb-modal-prop">
                <span className="reimb-modal-label">Claimed Amount</span>
                <span className="reimb-modal-value" style={{ color: "#6F8400", fontSize: 16 }}>
                  {formatINR(formData.amount)}
                </span>
              </div>
              <div className="reimb-modal-prop">
                <span className="reimb-modal-label">Preferred Payment</span>
                <span className="reimb-modal-value">
                  {formData.paymentMethod === "Other" ? formData.otherPaymentMethod || "Other" : formData.paymentMethod}
                </span>
              </div>
            </div>

            <div className="reimb-modal-prop" style={{ margin: "14px 0" }}>
              <span className="reimb-modal-label">Purpose / Description</span>
              <div className="reimb-modal-box">
                <p>{formData.purpose || "—"}</p>
              </div>
            </div>

            {formData.notes && (
              <div className="reimb-modal-prop" style={{ margin: "14px 0" }}>
                <span className="reimb-modal-label">Additional Notes</span>
                <div className="reimb-modal-box">
                  <p>{formData.notes}</p>
                </div>
              </div>
            )}

            {uploadedFile && (
              <div className="reimb-modal-prop" style={{ margin: "14px 0" }}>
                <span className="reimb-modal-label">Attached Receipt</span>
                <div className="reimb-doc-preview-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Paperclip size={16} style={{ color: "#6F8400" }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{uploadedFile.name}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
