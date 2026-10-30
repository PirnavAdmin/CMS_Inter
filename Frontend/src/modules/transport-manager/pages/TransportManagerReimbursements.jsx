import { SkeletonRow } from "@/shared/components/Skeleton.jsx";
import { useTransportNavigation, useTransportRouteValue, useTransportRecord, validTransportPage } from "../TransportManagerContext.jsx";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  Paperclip,
  ReceiptIndianRupee,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  User,
  XCircle,
  Loader2,
} from "lucide-react";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import { Modal, Toast } from "@/shared/components/Ui.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { useTransportManagerSafe } from "../TransportManagerContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import {
  PAYMENT_METHODS,
  calculateReimbursementSummary,
  fetchMyClaims as apiFetchMyClaims,
  submitClaim as apiSubmitClaim,
} from "@/services/reimbursementService.js";
import "@/modules/faculty/pages/FacultyReimbursement.css";

const PAGE_SIZE = 6;

const CATEGORY_OPTIONS = [
  "Teaching Materials",
  "Fuel / Mileage",
  "Vehicle Maintenance",
  "Toll & Parking",
  "Travel / Transport",
  "Office Supplies",
  "Accommodation",
  "Food",
  "Equipment",
  "Other",
];

export default function TransportManagerReimbursements() {
  const navigation = useTransportNavigation();
  const tmContext = useTransportManagerSafe();
  const profile = useMemo(() => tmContext?.profile || {}, [tmContext?.profile]);

  const authUser = useMemo(() => {
    const raw = getAuthUser() || {};
    return { ...raw, ...profile };
  }, [profile]);

  const defaultStaffId =
    profile.employeeId ||
    profile.staffId ||
    profile.id ||
    authUser.employeeId ||
    authUser.staffId ||
    "MNT0044";

  const defaultStaffName =
    profile.name ||
    profile.fullName ||
    authUser.fullName ||
    authUser.name ||
    "muzan kibutsuzi";

  const defaultDepartment =
    profile.department ||
    authUser.department ||
    "Transport";

  const defaultDesignation =
    profile.role ||
    profile.designation ||
    authUser.role ||
    authUser.designation ||
    "Transport Manager";

  const defaultEmail =
    profile.email ||
    authUser.email ||
    "pondara.venkatesh@pirnav.com";

  // Navigation tab: 'claims' (submission) or 'my-claims' (history)
  const [activeTab, setActiveTab] = useTransportRouteValue(navigation, "tab", "claims", value => ["claims", "my-claims"].includes(value));

  // Summary Metrics (Default matching Reference Screenshot 4)
  const [summary, setSummary] = useState({
    totalClaims: 0,
    totalAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    rejectedCount: 0,
    rejectedAmount: 0,
  });

  // Claims List
  const [claimsList, setClaimsList] = useState([]);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State matching Screenshot 4
  const initialFormState = {
    facultyId: defaultStaffId,
    facultyName: defaultStaffName,
    department: defaultDepartment,
    designation: defaultDesignation,
    email: defaultEmail,
    category: "Teaching Materials",
    otherCategory: "",
    expenseDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "Bank Transfer",
    purpose: "",
    notes: "",
    declaration: true,
    files: [],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // File Upload State
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Filter State in My Claims Tab
  const [searchQuery, setSearchQuery] = useTransportRouteValue(navigation, "q", "");
  const [statusFilter, setStatusFilter] = useTransportRouteValue(navigation, "status", "All", value => ["All", "Pending", "Approved", "Rejected"].includes(value));
  const [selectedPage, setCurrentPage] = useTransportRouteValue(navigation, "page", 1, validTransportPage);

  // Detail Modal & Toast
  const [selectedClaim, setSelectedClaim] = useTransportRecord(navigation, "claimId", claimsList, claim => claim.reimbursementId || claim.id, claimsLoaded && !loadingClaims);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const notify = (message, type = "success") => {
    if (tmContext?.showToast) {
      tmContext.showToast(message, type);
    }
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 4000);
  };

  const loadClaimsData = useCallback(async () => {
    try {
      setLoadingClaims(true);
      const res = await apiFetchMyClaims();
      const items = res?.items || (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        setClaimsList(items);
        const sum = calculateReimbursementSummary(items);
        setSummary({
          totalClaims: sum.total ?? items.length,
          totalAmount: sum.totalClaimedAmount ?? 0,
          pendingCount: sum.pending ?? 0,
          pendingAmount: 0,
          approvedCount: sum.approved ?? 0,
          approvedAmount: 0,
          rejectedCount: sum.rejected ?? 0,
          rejectedAmount: 0,
        });
      } else {
        // Reference fallback empty/default
        setClaimsList([]);
        setSummary({
          totalClaims: 0,
          totalAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
          approvedCount: 0,
          approvedAmount: 0,
          rejectedCount: 0,
          rejectedAmount: 0,
        });
      }
    } catch (err) {
      console.warn("Could not fetch claims from backend", err);
    } finally {
      setClaimsLoaded(true);
      setLoadingClaims(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClaimsData();
  }, [loadClaimsData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadClaimsData();
  };

  const handleClearForm = () => {
    setFormData({
      ...initialFormState,
      facultyId: defaultStaffId,
      facultyName: defaultStaffName,
      department: defaultDepartment,
      designation: defaultDesignation,
      email: defaultEmail,
    });
    setFormErrors({});
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        notify("File size exceeds 5 MB limit.", "error");
        return;
      }
      setUploadedFile(file);
      setFormData((prev) => ({ ...prev, files: [file] }));
      if (formErrors.proof) {
        setFormErrors((prev) => ({ ...prev, proof: null }));
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFormData((prev) => ({ ...prev, files: [] }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.category) errors.category = "Category is required";
    if (formData.category === "Other" && !formData.otherCategory?.trim()) {
      errors.otherCategory = "Please specify category";
    }
    if (!formData.expenseDate) errors.expenseDate = "Date is required";
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      errors.amount = "Valid positive amount is required";
    }
    if (!formData.purpose?.trim()) {
      errors.purpose = "Purpose / Description is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      notify("Please fill in all required fields accurately.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const targetCategory =
        formData.category === "Other"
          ? formData.otherCategory.trim() || "Other"
          : formData.category;

      const payload = {
        expenseCategory: targetCategory,
        ExpenseCategory: targetCategory,
        category: targetCategory,
        Category: targetCategory,
        amount: Number(formData.amount),
        Amount: Number(formData.amount),
        expenseDate: `${formData.expenseDate}T00:00:00`,
        ExpenseDate: `${formData.expenseDate}T00:00:00`,
        description: formData.purpose.trim(),
        Description: formData.purpose.trim(),
        purpose: formData.purpose.trim(),
        Purpose: formData.purpose.trim(),
        paymentMethod: formData.paymentMethod,
        PaymentMethod: formData.paymentMethod,
        preferredPaymentMethod: formData.paymentMethod,
        PreferredPaymentMethod: formData.paymentMethod,
        facultyId: formData.facultyId,
        FacultyId: formData.facultyId,
        facultyName: formData.facultyName,
        FacultyName: formData.facultyName,
        department: formData.department,
        Department: formData.department,
        designation: formData.designation,
        Designation: formData.designation,
        email: formData.email,
        Email: formData.email,
        notes: formData.notes || "",
        Notes: formData.notes || "",
        declaration: Boolean(formData.declaration),
        Declaration: Boolean(formData.declaration),
      };

      let resBody;
      try {
        const res = await apiClient.post("/api/v1/reimbursements", payload);
        resBody = res?.data?.data ?? res?.data ?? res;
      } catch (postErr) {
        // Fallback to service
        const fallbackRes = await apiSubmitClaim({
          ...payload,
          proof: uploadedFile ? { rawFile: uploadedFile } : null,
        });
        resBody = fallbackRes?.data ?? fallbackRes;
      }

      const createdId = resBody?.id ?? resBody?.Id ?? resBody?.claimId ?? resBody?.ClaimId;
      const createdClaimNumber =
        resBody?.claimNumber ??
        resBody?.ClaimNumber ??
        (createdId ? `CLM-${createdId}` : `CLM-${Math.floor(1000 + Math.random() * 9000)}`);

      // Upload proof file if attached
      if (uploadedFile && createdId) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", uploadedFile, uploadedFile.name || "receipt.pdf");
          await apiClient.post(`/api/v1/reimbursements/${encodeURIComponent(createdId)}/upload-proof`, uploadFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (proofErr) {
          console.warn("Proof file upload warning:", proofErr);
        }
      }

      notify("Reimbursement claim submitted successfully!", "success");

      const newClaim = {
        id: createdId || Date.now(),
        claimNumber: createdClaimNumber,
        category: targetCategory,
        expenseCategory: targetCategory,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate,
        createdDate: new Date().toISOString().split("T")[0],
        status: "Pending",
        purpose: formData.purpose.trim(),
        description: formData.purpose.trim(),
        paymentMethod: formData.paymentMethod,
        facultyName: defaultStaffName,
        department: defaultDepartment,
      };

      setClaimsList((prev) => [newClaim, ...prev]);
      setSummary((prev) => ({
        ...prev,
        totalClaims: (prev.totalClaims || 0) + 1,
        totalAmount: (prev.totalAmount || 0) + Number(formData.amount),
        pendingCount: (prev.pendingCount || 0) + 1,
      }));

      // Broadcast events to sync across tabs/components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cms-reimbursements-updated"));
        window.dispatchEvent(new Event("cms-account-updated"));
      }

      handleClearForm();
      setActiveTab("my-claims");
      loadClaimsData();
    } catch (err) {
      console.error("Submission failed:", err);
      notify(getApiErrorMessage(err) || "Failed to submit reimbursement claim.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClaims = useMemo(() => {
    return claimsList.filter((c) => {
      const matchesStatus =
        statusFilter === "All" ||
        (c.status || "").toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus;
      const matchesSearch =
        (c.claimNumber || "").toLowerCase().includes(q) ||
        (c.category || c.expenseCategory || "").toLowerCase().includes(q) ||
        (c.purpose || c.description || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [claimsList, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / PAGE_SIZE));
  const currentPage = Math.min(selectedPage, totalPages);
  const displayedClaims = filteredClaims.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="reimb-page-container">
      {/* Top Toolbar: Tabs, Ledger Sync Pill & Refresh matching Reference 4 */}
      <div className="reimb-toolbar">
        <div className="reimb-role-toggle">
          <button
            type="button"
            className={`reimb-toggle-btn ${activeTab === "claims" ? "is-active" : ""}`}
            onClick={() => setActiveTab("claims")}
          >
            <img src={reimbursementIcon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> Claims
          </button>
          <button
            type="button"
            className={`reimb-toggle-btn ${activeTab === "my-claims" ? "is-active" : ""}`}
            onClick={() => setActiveTab("my-claims")}
          >
            <FileCheck2 size={15} /> My Claims ({claimsList.length})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="reimb-sync-pill"
            style={{ cursor: "pointer" }}
            title="Account Ledger: Integrated Payables"
          >
            <CheckCircle2 size={14} /> Account Ledger: 1 Integrated Payables
          </button>
          <button
            type="button"
            className="reimb-btn-icon"
            title="Refresh Data"
            onClick={handleRefresh}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animate" : ""} />
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards in a 4-column row matching Reference 4 */}
      <section className="reimb-kpi-grid" aria-label="Reimbursement summary">
        <div className="reimb-kpi-card total">
          <div className="reimb-kpi-info">
            <span className="reimb-kpi-label">Total Claims</span>
            <span className="reimb-kpi-value">{summary.totalClaims ?? 0}</span>
            <span className="reimb-kpi-sub">Total: ₹{Number(summary.totalAmount || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="reimb-kpi-icon-wrap">
            <img src={reimbursementIcon} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
        </div>

        <div className="reimb-kpi-card pending">
          <div className="reimb-kpi-info">
            <span className="reimb-kpi-label">Pending Claims</span>
            <span className="reimb-kpi-value">{summary.pendingCount ?? 0}</span>
            <span className="reimb-kpi-sub">Awaiting review</span>
          </div>
          <div className="reimb-kpi-icon-wrap">
            <Clock size={22} />
          </div>
        </div>

        <div className="reimb-kpi-card approved">
          <div className="reimb-kpi-info">
            <span className="reimb-kpi-label">Approved Claims</span>
            <span className="reimb-kpi-value">{summary.approvedCount ?? 0}</span>
            <span className="reimb-kpi-sub">Payables in Account</span>
          </div>
          <div className="reimb-kpi-icon-wrap">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="reimb-kpi-card rejected">
          <div className="reimb-kpi-info">
            <span className="reimb-kpi-label">Rejected Claims</span>
            <span className="reimb-kpi-value">{summary.rejectedCount ?? 0}</span>
            <span className="reimb-kpi-sub">Declined claims</span>
          </div>
          <div className="reimb-kpi-icon-wrap">
            <XCircle size={22} />
          </div>
        </div>
      </section>

      {/* TAB 1: Submit Reimbursement Claim Form matching Reference 4 */}
      {activeTab === "claims" && (
        <div className="reimb-form-card" id="reimb-submission-form">
          <div className="reimb-form-header">
            <div className="reimb-form-title-group">
              <h2>
                <ReceiptIndianRupee size={18} style={{ color: "var(--cms-primary)" }} />
                Submit Reimbursement Claim
              </h2>
              <p>Complete the three sections below and attach supporting receipts or invoices.</p>
            </div>
            <button
              type="button"
              className="reimb-btn reimb-btn-secondary"
              onClick={handleClearForm}
              style={{ padding: "6px 14px", fontSize: 12.5 }}
            >
              Clear Form
            </button>
          </div>

          <form onSubmit={handleSubmitClaim} className="reimb-form-body">
            {/* Section 1: Faculty / Staff Details matching Reference 4 */}
            <div className="reimb-section-card">
              <div className="reimb-section-heading">
                <h3>
                  <span className="reimb-section-badge">1</span>
                  Section 1: Faculty Details
                </h3>
                <span className="reimb-auth-tag">
                  <User size={12} /> Verified Faculty Identity
                </span>
              </div>

              <div className="reimb-grid-3">
                <div className="reimb-field">
                  <label>
                    Faculty ID <span className="req">*</span>
                    <span className="reimb-readonly-notice">(Verified)</span>
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
                    <span className="reimb-readonly-notice">(Verified)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.facultyName}
                    className="reimb-input is-readonly"
                  />
                </div>

                <div className="reimb-field">
                  <label>
                    Department <span className="req">*</span>
                    <span className="reimb-readonly-notice">(Verified)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.department}
                    className="reimb-input is-readonly"
                  />
                </div>

                <div className="reimb-field">
                  <label>
                    Designation(Verified)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.designation}
                    className="reimb-input is-readonly"
                  />
                </div>

                <div className="reimb-field">
                  <label>
                    Email Address(Verified)
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={formData.email}
                    className="reimb-input is-readonly"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Expense Details matching Reference 4 */}
            <div className="reimb-section-card">
              <div className="reimb-section-heading">
                <h3>
                  <span className="reimb-section-badge">2</span>
                  Section 2: Expense Details
                </h3>
                <span style={{ fontSize: 11.5, color: "var(--cms-muted, #7b8275)" }}>
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
                    className={`reimb-select ${formErrors.category ? "is-invalid" : ""}`}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <span className="reimb-field-error">{formErrors.category}</span>
                  )}
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

            {/* Section 3: Supporting Documents & Submission matching Reference 4 */}
            <div className="reimb-section-card">
              <div className="reimb-section-heading">
                <h3>
                  <span className="reimb-section-badge">3</span>
                  Section 3: Supporting Documents &amp; Submission
                </h3>
                <span style={{ fontSize: 11.5, color: "var(--cms-muted, #7b8275)" }}>
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
                        <Paperclip size={18} style={{ color: "var(--cms-primary)", flexShrink: 0 }} />
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
                    value={formData.notes || ""}
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
                    checked={formData.declaration !== false}
                    onChange={(e) => handleChange("declaration", e.target.checked)}
                  />
                  <span>
                    I hereby declare that the expenses claimed above were incurred legitimately for
                    official academic/institutional purposes and the supporting invoices/receipts are authentic.
                  </span>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="reimb-form-actions">
                <button
                  type="button"
                  className="reimb-btn reimb-btn-secondary"
                  onClick={handleClearForm}
                  disabled={submitting}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="reimb-btn reimb-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="spin-animate" /> Processing...
                    </>
                  ) : (
                    <>
                      <ReceiptIndianRupee size={15} /> Submit Reimbursement Claim
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: My Claims History matching Reference 4 */}
      {activeTab === "my-claims" && (
        <div className="reimb-table-card">
          <div className="reimb-table-header">
            <div className="reimb-table-filters">
              <div className="reimb-search-wrap">
                <Search size={15} className="reimb-search-icon" />
                <input
                  type="text"
                  placeholder="Search claims..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="reimb-search-input"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="reimb-filter-select"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="reimb-table-wrap">
            <table className="reimb-table">
              <thead>
                <tr>
                  <th>CLAIM #</th>
                  <th>EXPENSE CATEGORY</th>
                  <th>EXPENSE DATE</th>
                  <th>AMOUNT</th>
                  <th>PAYMENT METHOD</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>{loadingClaims ? Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={7} />) : <>
                {displayedClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="reimb-empty-state">
                      <div className="reimb-empty-icon">
                        <FileText size={24} />
                      </div>
                      <p>No reimbursement claims found.</p>
                    </td>
                  </tr>
                ) : (
                  displayedClaims.map((claim) => (
                    <tr key={claim.id || claim.claimNumber}>
                      <td>
                        <span className="reimb-claim-id">{claim.claimNumber}</span>
                      </td>
                      <td>{claim.category || claim.expenseCategory}</td>
                      <td>{claim.expenseDate}</td>
                      <td>
                        <span className="reimb-amount">
                          ₹{(Number(claim.amount) || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>{claim.paymentMethod || "Bank Transfer"}</td>
                      <td>
                        <span
                          className={`reimb-badge ${
                            String(claim.status).toLowerCase().includes("approve")
                              ? "approved"
                              : String(claim.status).toLowerCase().includes("reject")
                              ? "rejected"
                              : "pending"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td>
                        <div className="reimb-table-actions">
                          <button
                            type="button"
                            className="reimb-btn-icon"
                            onClick={() => setSelectedClaim(claim)}
                            title="View claim details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </>}</tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="reimb-pagination">
              <button
                type="button"
                className="reimb-btn reimb-btn-secondary"
                style={{ padding: "4px 12px", fontSize: 12 }}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="reimb-btn reimb-btn-secondary"
                style={{ padding: "4px 12px", fontSize: 12 }}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <Modal title="Claim Details" onClose={() => setSelectedClaim(null)}>
          <div className="reimb-details-body" style={{ padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <dt style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 500 }}>Claim Number</dt>
                <dd style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 0", color: "var(--cms-primary)" }}>
                  {selectedClaim.claimNumber}
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 500 }}>Status</dt>
                <dd style={{ margin: "2px 0 0" }}>
                  <span
                    className={`reimb-badge ${
                      String(selectedClaim.status).toLowerCase().includes("approve")
                        ? "approved"
                        : String(selectedClaim.status).toLowerCase().includes("reject")
                        ? "rejected"
                        : "pending"
                    }`}
                  >
                    {selectedClaim.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 500 }}>Category</dt>
                <dd style={{ fontSize: 13.5, fontWeight: 600, margin: "2px 0 0" }}>
                  {selectedClaim.category || selectedClaim.expenseCategory}
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 500 }}>Amount</dt>
                <dd style={{ fontSize: 14, fontWeight: 700, color: "#166534", margin: "2px 0 0" }}>
                  ₹{(Number(selectedClaim.amount) || 0).toLocaleString("en-IN")}
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 500 }}>Expense Date</dt>
                <dd style={{ fontSize: 13, margin: "2px 0 0" }}>{selectedClaim.expenseDate}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 500 }}>Payment Method</dt>
                <dd style={{ fontSize: 13, margin: "2px 0 0" }}>{selectedClaim.paymentMethod || "Bank Transfer"}</dd>
              </div>
            </div>

            <div>
              <dt style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 500 }}>Purpose / Description</dt>
              <dd style={{ fontSize: 13, margin: "4px 0 0", color: "var(--cms-text)", background: "#f8faf5", padding: "10px 12px", borderRadius: 8 }}>
                {selectedClaim.purpose || selectedClaim.description || "No description provided."}
              </dd>
            </div>
          </div>
        </Modal>
      )}

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
