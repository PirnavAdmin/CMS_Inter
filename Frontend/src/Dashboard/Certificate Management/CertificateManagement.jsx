import React, { useState, useEffect, useMemo } from "react";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import {
  FiFileText,
  FiCheckSquare,
  FiDownload,
  FiEye,
  FiPrinter,
  FiTrash2,
  FiSlash,
  FiCheckCircle,
  FiSend,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiFilter,
  FiPlus,
  FiCheck,
  FiCalendar,
  FiUser,
  FiAward,
} from "react-icons/fi";
import {
  getCertificates,
  getCertificateWorkflowStats,
  getCertificateStudentsDropdown,
  generateCertificate,
  reviewCertificate,
  approveCertificate,
  issueCertificate,
  bulkApproveCertificates,
  bulkIssueCertificates,
  cancelCertificate,
  deleteCertificate,
  downloadCertificatePdf,
} from "../../api/certificateApi";
import createCertificateIcon from "@/assets/sidebar-3d/certificates.png";
import certificateRecordsIcon from "@/assets/settings-3d/audit-logs.png";
import reviewIssueIcon from "@/assets/reports-3d/toppers.png";
import "./CertificateManagement.css";

// Supported Certificate Types
const CERTIFICATE_TYPES = [
  "Bonafide Certificate",
  "Study Certificate",
  "Conduct Certificate",
  "Transfer Certificate",
  "Others",
];

const PURPOSE_PRESETS = [
  "For Higher Studies and College Admissions",
  "Passport Application Requirement",
  "Bank Education Loan Processing",
  "State/National Level Sports Submission",
  "Scholarship & Fee Reimbursement",
  "Employment / Job Application",
  "Visa & Immigration Documentation",
  "Other",
];

const CertificateManagement = () => {
  // Active Main Tab: "create", "records", "workflow"
  const [activeTab, setActiveTab] = useState("records");

  // Workflow Sub-filter: "All", "Generated", "Reviewed", "Approved", "Issued", "Cancelled"
  const [workflowStageFilter, setWorkflowStageFilter] = useState("All");

  // Filter & Search states for Records
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Data states
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    generatedCount: 0,
    reviewedCount: 0,
    approvedCount: 0,
    issuedCount: 0,
    cancelledCount: 0,
  });
  const [studentsDropdown, setStudentsDropdown] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Create Form State
  const [formData, setFormData] = useState({
    admissionNo: "",
    certificateType: "",
    customCertificateType: "",
    purpose: "",
    customPurpose: "",
    requestDate: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  // Selected Student Details for Auto-fill
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Modals
  const [viewingCertificate, setViewingCertificate] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [cancellingCert, setCancellingCert] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  // Load Data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [certsRes, statsRes, studentsRes] = await Promise.allSettled([
        getCertificates(),
        getCertificateWorkflowStats(),
        getCertificateStudentsDropdown(),
      ]);

      if (certsRes.status === "fulfilled" && certsRes.value?.data) {
        setCertificates(certsRes.value.data);
      }
      if (statsRes.status === "fulfilled" && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }
      if (studentsRes.status === "fulfilled" && studentsRes.value?.data) {
        setStudentsDropdown(studentsRes.value.data);
      }
    } catch (err) {
      console.error("Failed loading certificates data:", err);
      showToast("Could not load latest certificates data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle Student Selection in Create Form
  const handleAdmissionChange = (e) => {
    const admNo = e.target.value;
    setFormData((prev) => ({ ...prev, admissionNo: admNo }));

    const student = studentsDropdown.find((s) => s.admissionNo === admNo);
    if (student) {
      setSelectedStudent(student);
    } else {
      setSelectedStudent(null);
    }
  };

  // Reset Create Form
  const handleClearForm = () => {
    setFormData({
      admissionNo: "",
      certificateType: "",
      customCertificateType: "",
      purpose: "",
      customPurpose: "",
      requestDate: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setSelectedStudent(null);
  };

  // Submit Create Certificate
  const handleGenerateCertificate = async (e) => {
    e.preventDefault();

    if (!formData.admissionNo) {
      showToast("Please select an Admission Number", "error");
      return;
    }

    const resolvedType =
      formData.certificateType === "Other"
        ? formData.customCertificateType?.trim()
        : formData.certificateType;

    if (!resolvedType) {
      showToast("Please select or enter a Certificate Type", "error");
      return;
    }

    const resolvedPurpose =
      formData.purpose === "Other"
        ? formData.customPurpose?.trim() || null
        : formData.purpose?.trim() || null;

    setActionLoading(true);
    try {
      const payload = {
        admissionNo: formData.admissionNo.trim(),
        certificateType: resolvedType,
        purpose: resolvedPurpose,
        requestDate: formData.requestDate ? new Date(formData.requestDate) : new Date(),
        remarks: formData.remarks?.trim() || null,
      };

      const res = await generateCertificate(payload);
      showToast(
        `Certificate ${res.data?.certificateNumber || ""} generated successfully!`,
        "success"
      );
      handleClearForm();
      await loadAllData();
      setActiveTab("records");
    } catch (err) {
      console.error("Generation error:", err);
      const msg = err.response?.data?.message || "Failed to generate certificate";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Single Status Transition Handlers
  const handleReview = async (certId) => {
    setActionLoading(true);
    try {
      await reviewCertificate(certId);
      showToast("Certificate marked as Reviewed", "success");
      await loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to review certificate", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (certId) => {
    setActionLoading(true);
    try {
      await approveCertificate(certId);
      showToast("Certificate Approved and Ready to Issue", "success");
      await loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve certificate", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssue = async (certId) => {
    setActionLoading(true);
    try {
      await issueCertificate(certId, "Principal");
      showToast("Certificate Issued Successfully", "success");
      await loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to issue certificate", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    if (stats.reviewedCount === 0) {
      showToast("No reviewed certificates pending approval", "warning");
      return;
    }
    setActionLoading(true);
    try {
      const res = await bulkApproveCertificates();
      showToast(res.data?.message || "All reviewed certificates approved!", "success");
      await loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Bulk approval failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkIssue = async () => {
    if (stats.approvedCount === 0) {
      showToast("No approved certificates ready for issue", "warning");
      return;
    }
    setActionLoading(true);
    try {
      const res = await bulkIssueCertificates("Principal");
      showToast(res.data?.message || "All approved certificates issued!", "success");
      await loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Bulk issuing failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Action
  const handleConfirmCancel = async () => {
    if (!cancellingCert) return;
    setActionLoading(true);
    try {
      await cancelCertificate(cancellingCert.certificateId);
      showToast(`Certificate ${cancellingCert.certificateNumber} cancelled`, "success");
      setShowCancelModal(false);
      setCancellingCert(null);
      await loadAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel certificate", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Download / Print PDF
  const handleDownloadPdf = async (cert) => {
    try {
      showToast(`Preparing PDF for ${cert.certificateNumber}...`, "info");
      const res = await downloadCertificatePdf(cert.certificateId);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${cert.certificateNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      showToast("Could not download certificate PDF", "error");
    }
  };

  const handlePrintCertificate = async (cert) => {
    try {
      const res = await downloadCertificatePdf(cert.certificateId);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow.print();
      };
    } catch (err) {
      console.error("Print error:", err);
      showToast("Could not open print dialog", "error");
    }
  };

  // Filtered Certificates for Tab 2: Records
  const filteredRecords = useMemo(() => {
    return certificates.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.certificateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.certificateType?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        selectedTypeFilter === "All" || c.certificateType === selectedTypeFilter;

      const matchesStatus =
        selectedStatusFilter === "All" || c.status === selectedStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [certificates, searchTerm, selectedTypeFilter, selectedStatusFilter]);

  // Filtered Certificates for Tab 3: Workflow
  const filteredWorkflowRecords = useMemo(() => {
    if (workflowStageFilter === "All") {
      return certificates;
    }
    return certificates.filter((c) => c.status === workflowStageFilter);
  }, [certificates, workflowStageFilter]);

  // Pagination for Active Tab List
  const activeList = activeTab === "workflow" ? filteredWorkflowRecords : filteredRecords;
  const totalPages = Math.ceil(activeList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeList.slice(start, start + pageSize);
  }, [activeList, currentPage, pageSize]);

  // Format Dates
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper Badge Color
  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "generated":
        return <span className="cert-status-badge badge-generated">Generated</span>;
      case "reviewed":
        return <span className="cert-status-badge badge-reviewed">Reviewed</span>;
      case "approved":
        return <span className="cert-status-badge badge-approved">Approved</span>;
      case "issued":
        return <span className="cert-status-badge badge-issued">Issued</span>;
      case "cancelled":
      case "deleted":
        return <span className="cert-status-badge badge-cancelled">Cancelled</span>;
      default:
        return <span className="cert-status-badge badge-default">{status}</span>;
    }
  };

  return (
    <div className="cert-module-container">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`cert-toast-banner toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: "", type: "success" })}>
            <FiX />
          </button>
        </div>
      )}

      {/* Top 3 Navigation Tabs */}
      <div className="cert-tabs-header">
        <button
          className={`cert-nav-tab ${activeTab === "create" ? "tab-active" : ""}`}
          onClick={() => {
            setActiveTab("create");
            setCurrentPage(1);
          }}
        >
          <img className="tab-3d-icon" src={createCertificateIcon} alt="" aria-hidden="true" width={18} height={18} /> Create Certificate
        </button>

        <button
          className={`cert-nav-tab ${activeTab === "records" ? "tab-active" : ""}`}
          onClick={() => {
            setActiveTab("records");
            setCurrentPage(1);
          }}
        >
          <img className="tab-3d-icon" src={certificateRecordsIcon} alt="" aria-hidden="true" width={18} height={18} /> Certificate Records
        </button>

        <button
          className={`cert-nav-tab ${activeTab === "workflow" ? "tab-active" : ""}`}
          onClick={() => {
            setActiveTab("workflow");
            setCurrentPage(1);
          }}
        >
          <img className="tab-3d-icon" src={reviewIssueIcon} alt="" aria-hidden="true" width={18} height={18} /> Review &amp; Issue
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CREATE CERTIFICATE */}
      {/* ========================================================================= */}
      {activeTab === "create" && (
        <div className="cert-card-content cert-create-card">
          <div className="cert-card-header">
            <h2>Create Certificate</h2>
            <p>Enter request details and generate a certificate request.</p>
          </div>

          <form onSubmit={handleGenerateCertificate} className="cert-create-form">
            <div className="cert-form-grid-4">
              {/* Admission No. */}
              <div className="cert-form-group">
                <label>
                  ADMISSION NO. <span className="text-red">*</span>
                </label>
                <select
                  className="cert-input-select"
                  value={formData.admissionNo}
                  onChange={handleAdmissionChange}
                  required
                >
                  <option value="">
                    {studentsDropdown.length > 0 ? "Select Admission No" : "Loading admissions..."}
                  </option>
                  {studentsDropdown.map((s) => (
                    <option key={s.studentId} value={s.admissionNo}>
                      {s.admissionNo} - {s.studentName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Certificate Type */}
              <div className="cert-form-group">
                <label>
                  CERTIFICATE TYPE <span className="text-red">*</span>
                </label>
                <select
                  className="cert-input-select"
                  value={formData.certificateType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, certificateType: e.target.value }))
                  }
                  required
                >
                  <option value="">Select Certificate Type</option>
                  {CERTIFICATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {formData.certificateType === "Other" && (
                  <input
                    type="text"
                    className="cert-input-text mt-2"
                    placeholder="Enter Custom Certificate Type"
                    value={formData.customCertificateType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customCertificateType: e.target.value,
                      }))
                    }
                    required
                  />
                )}
              </div>

              {/* Purpose */}
              <div className="cert-form-group">
                <label>PURPOSE</label>
                <input
                  type="text"
                  list="purpose-presets"
                  className="cert-input-text"
                  placeholder="Purpose (e.g. Higher Studies, Bank Loan)"
                  value={formData.purpose}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                />
                <datalist id="purpose-presets">
                  {PURPOSE_PRESETS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              {/* Request Date */}
              <div className="cert-form-group">
                <label>
                  REQUEST DATE <span className="text-red">*</span>
                </label>
                <div className="cert-input-icon-wrapper">
                  <input
                    type="date"
                    className="cert-input-text"
                    value={formData.requestDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, requestDate: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Remarks Row */}
            <div className="cert-form-grid-1 mt-3">
              <div className="cert-form-group">
                <label>REMARKS</label>
                <input
                  type="text"
                  className="cert-input-text"
                  placeholder="Remarks (optional)"
                  value={formData.remarks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>

            <div className="cert-form-divider"></div>

            {/* Auto-filled Student Details */}
            <div className="cert-form-grid-4">
              <div className="cert-form-group">
                <label>STUDENT NAME</label>
                <input
                  type="text"
                  className="cert-input-text cert-input-readonly"
                  placeholder="Auto-filled from admission number"
                  value={selectedStudent ? selectedStudent.studentName : ""}
                  readOnly
                />
              </div>

              <div className="cert-form-group">
                <label>ACADEMIC YEAR</label>
                <input
                  type="text"
                  className="cert-input-text cert-input-readonly"
                  placeholder="Auto-filled"
                  value={selectedStudent ? selectedStudent.academicYear : ""}
                  readOnly
                />
              </div>

              <div className="cert-form-group">
                <label>GROUP</label>
                <input
                  type="text"
                  className="cert-input-text cert-input-readonly"
                  placeholder="Auto-filled"
                  value={selectedStudent ? selectedStudent.groupName : ""}
                  readOnly
                />
              </div>

              <div className="cert-form-group">
                <label>YEAR</label>
                <input
                  type="text"
                  className="cert-input-text cert-input-readonly"
                  placeholder="Auto-filled"
                  value={selectedStudent ? selectedStudent.academicLevel : ""}
                  readOnly
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="cert-form-actions">
              <button
                type="button"
                className="btn-cert-secondary"
                onClick={handleClearForm}
                disabled={actionLoading}
              >
                <FiRefreshCw className="mr-1" /> Clear
              </button>

              <button
                type="submit"
                className="btn-cert-primary"
                disabled={actionLoading || !formData.admissionNo}
              >
                <FiFileText className="mr-1" />{" "}
                {actionLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CERTIFICATE RECORDS */}
      {/* ========================================================================= */}
      {activeTab === "records" && (
        <div className="cert-card-content cert-records-card">
          <div className="cert-card-header">
            <h2>Certificate Management</h2>
            <p>Generate certificates, view requests, and process approval.</p>
          </div>

          {/* Search, Filter, Export, New Request Bar */}
          <div className="cert-toolbar">
            <div className="cert-search-box">
              <Search3DIcon className="cert-search-icon" size={17} />
              <input
                type="text"
                placeholder="Search by certificate no., admission no., or student name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button className="cert-search-clear" onClick={() => setSearchTerm("")}>
                  <FiX />
                </button>
              )}
            </div>

            <div className="cert-toolbar-actions">
              <button
                className={`btn-toolbar-outline ${showFilterDropdown ? "active-filter" : ""}`}
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <FiFilter /> Filters
              </button>

              <button
                className="btn-toolbar-outline"
                onClick={() => {
                  const csvContent =
                    "data:text/csv;charset=utf-8," +
                    [
                      "Certificate No,Admission No,Student Name,Type,Request Date,Issue Date,Status",
                      ...filteredRecords.map(
                        (c) =>
                          `"${c.certificateNumber}","${c.admissionNo}","${c.studentName}","${c.certificateType}","${formatDate(c.requestDate)}","${formatDate(c.issueDate)}","${c.status}"`
                      ),
                    ].join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `Certificates_${new Date().toISOString().split("T")[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}
              >
                <FiDownload /> Export
              </button>

              <button
                className="btn-cert-primary"
                onClick={() => {
                  setActiveTab("create");
                }}
              >
                <FiPlus /> + New Request
              </button>
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {showFilterDropdown && (
            <div className="cert-filters-drawer">
              <div className="cert-filter-item">
                <label>Status:</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => {
                    setSelectedStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="All">All Status</option>
                  <option value="Generated">Generated</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Approved">Approved</option>
                  <option value="Issued">Issued</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="cert-filter-item">
                <label>Certificate Type:</label>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => {
                    setSelectedTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="All">All Certificate Types</option>
                  {CERTIFICATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-clear-filters"
                onClick={() => {
                  setSelectedStatusFilter("All");
                  setSelectedTypeFilter("All");
                  setSearchTerm("");
                }}
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Table */}
          <div className="cert-table-wrapper">
            <table className="cert-data-table">
              <thead>
                <tr>
                  <th>CERTIFICATE NUMBER</th>
                  <th>ADMISSION NUMBER</th>
                  <th>STUDENT</th>
                  <th>TYPE</th>
                  <th>REQUEST DATE</th>
                  <th>ISSUE DATE</th>
                  <th>STATUS</th>
                  <th className="text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="table-empty-message">
                      <div className="cert-spinner-inline"></div> Loading certificates...
                    </td>
                  </tr>
                ) : paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="table-empty-message">
                      No certificate records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((cert) => (
                    <tr key={cert.certificateId}>
                      <td className="font-bold text-dark">{cert.certificateNumber}</td>
                      <td>{cert.admissionNo}</td>
                      <td>
                        <div className="student-name-block">
                          <span className="student-main-name">{cert.studentName}</span>
                          <span className="student-sub-level">
                            {cert.academicLevel || "1st Year"}
                          </span>
                        </div>
                      </td>
                      <td>{cert.certificateType}</td>
                      <td>{formatDate(cert.requestDate)}</td>
                      <td>{formatDate(cert.issueDate)}</td>
                      <td>{getStatusBadge(cert.status)}</td>
                      <td className="text-center">
                        <div className="cert-action-buttons">
                          {/* View */}
                          <button
                            className="btn-icon-action btn-view"
                            title="View Certificate Details"
                            onClick={() => {
                              setViewingCertificate(cert);
                              setShowViewModal(true);
                            }}
                          >
                            <FiEye />
                          </button>

                          {/* Download PDF */}
                          <button
                            className="btn-icon-action btn-download"
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(cert)}
                          >
                            <FiDownload />
                          </button>

                          {/* Print PDF */}
                          <button
                            className="btn-icon-action btn-print"
                            title="Print Certificate"
                            onClick={() => handlePrintCertificate(cert)}
                          >
                            <FiPrinter />
                          </button>

                          {/* Cancel */}
                          {cert.status !== "Cancelled" && cert.status !== "Issued" && (
                            <button
                              className="btn-icon-action btn-cancel"
                              title="Cancel Certificate"
                              onClick={() => {
                                setCancellingCert(cert);
                                setShowCancelModal(true);
                              }}
                            >
                              <FiSlash />
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

          {/* Pagination */}
          <div className="cert-pagination-footer">
            <div className="pagination-count-text">
              Showing {activeList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
              {Math.min(currentPage * pageSize, activeList.length)} of {activeList.length} records
            </div>

            <div className="pagination-controls">
              <button
                className="btn-page-nav"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  className={`btn-page-number ${currentPage === pg ? "page-active" : ""}`}
                  onClick={() => setCurrentPage(pg)}
                >
                  {pg}
                </button>
              ))}

              <button
                className="btn-page-nav"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVIEW & ISSUE (WORKFLOW) */}
      {/* ========================================================================= */}
      {activeTab === "workflow" && (
        <div className="cert-card-content cert-workflow-card">
          <div className="cert-card-header-flex">
            <div>
              <h2>Certificate Workflow</h2>
              <p>Process all eligible certificates at each workflow stage.</p>
            </div>

            <div className="workflow-bulk-actions">
              <button
                className="btn-bulk-approve"
                onClick={handleBulkApprove}
                disabled={actionLoading || stats.reviewedCount === 0}
              >
                <FiCheck /> Approve All
              </button>

              <button
                className="btn-bulk-issue"
                onClick={handleBulkIssue}
                disabled={actionLoading || stats.approvedCount === 0}
              >
                <FiSend /> Issue All
              </button>
            </div>
          </div>

          {/* 5 Stage Metric Cards */}
          <div className="workflow-stage-cards-grid">
            {/* Generated */}
            <div
              className={`stage-card card-generated ${workflowStageFilter === "Generated" ? "stage-card-active" : ""}`}
              onClick={() => {
                setWorkflowStageFilter(workflowStageFilter === "Generated" ? "All" : "Generated");
                setCurrentPage(1);
              }}
            >
              <span className="stage-title">Generated</span>
              <span className="stage-subtitle">{stats.generatedCount} Pending</span>
            </div>

            {/* Reviewed */}
            <div
              className={`stage-card card-reviewed ${workflowStageFilter === "Reviewed" ? "stage-card-active" : ""}`}
              onClick={() => {
                setWorkflowStageFilter(workflowStageFilter === "Reviewed" ? "All" : "Reviewed");
                setCurrentPage(1);
              }}
            >
              <span className="stage-title">Reviewed</span>
              <span className="stage-subtitle">{stats.reviewedCount} Pending</span>
            </div>

            {/* Approved */}
            <div
              className={`stage-card card-approved ${workflowStageFilter === "Approved" ? "stage-card-active" : ""}`}
              onClick={() => {
                setWorkflowStageFilter(workflowStageFilter === "Approved" ? "All" : "Approved");
                setCurrentPage(1);
              }}
            >
              <span className="stage-title">Approved</span>
              <span className="stage-subtitle">{stats.approvedCount} Ready to issue</span>
            </div>

            {/* Issued */}
            <div
              className={`stage-card card-issued ${workflowStageFilter === "Issued" ? "stage-card-active" : ""}`}
              onClick={() => {
                setWorkflowStageFilter(workflowStageFilter === "Issued" ? "All" : "Issued");
                setCurrentPage(1);
              }}
            >
              <span className="stage-title">Issued</span>
              <span className="stage-subtitle">{stats.issuedCount} Completed</span>
            </div>

            {/* Cancelled */}
            <div
              className={`stage-card card-cancelled ${workflowStageFilter === "Cancelled" ? "stage-card-active" : ""}`}
              onClick={() => {
                setWorkflowStageFilter(workflowStageFilter === "Cancelled" ? "All" : "Cancelled");
                setCurrentPage(1);
              }}
            >
              <span className="stage-title">Cancelled</span>
              <span className="stage-subtitle">{stats.cancelledCount} Requests</span>
            </div>
          </div>

          {/* Workflow Table */}
          <div className="cert-table-wrapper mt-4">
            <table className="cert-data-table">
              <thead>
                <tr>
                  <th>CERTIFICATE NUMBER</th>
                  <th>ADMISSION NUMBER</th>
                  <th>STUDENT</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                  <th>REQUEST DATE</th>
                  <th className="text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="table-empty-message">
                      <div className="cert-spinner-inline"></div> Loading workflow items...
                    </td>
                  </tr>
                ) : paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-empty-message">
                      No certificates in this workflow stage.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((cert) => (
                    <tr key={cert.certificateId}>
                      <td className="font-bold text-dark">{cert.certificateNumber}</td>
                      <td>{cert.admissionNo}</td>
                      <td>
                        <div className="student-name-block">
                          <span className="student-main-name">{cert.studentName}</span>
                          <span className="student-sub-level">
                            {cert.academicLevel || "1st Year"}
                          </span>
                        </div>
                      </td>
                      <td>{cert.certificateType}</td>
                      <td>{getStatusBadge(cert.status)}</td>
                      <td>{formatDate(cert.requestDate)}</td>
                      <td className="text-center">
                        <div className="cert-workflow-action-buttons">
                          {/* Stage Transition Action Button */}
                          {cert.status === "Generated" && (
                            <button
                              className="btn-stage-action btn-stage-review"
                              title="Mark as Reviewed"
                              onClick={() => handleReview(cert.certificateId)}
                              disabled={actionLoading}
                            >
                              <FiCheckCircle /> Review
                            </button>
                          )}

                          {cert.status === "Reviewed" && (
                            <button
                              className="btn-stage-action btn-stage-approve"
                              title="Approve Certificate"
                              onClick={() => handleApprove(cert.certificateId)}
                              disabled={actionLoading}
                            >
                              <FiCheck /> Approve
                            </button>
                          )}

                          {cert.status === "Approved" && (
                            <button
                              className="btn-stage-action btn-stage-issue"
                              title="Issue Certificate"
                              onClick={() => handleIssue(cert.certificateId)}
                              disabled={actionLoading}
                            >
                              <FiSend /> Issue
                            </button>
                          )}

                          {/* View Eye */}
                          <button
                            className="btn-icon-action btn-view"
                            title="View Details"
                            onClick={() => {
                              setViewingCertificate(cert);
                              setShowViewModal(true);
                            }}
                          >
                            <FiEye />
                          </button>

                          {/* Download PDF */}
                          <button
                            className="btn-icon-action btn-download"
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(cert)}
                          >
                            <FiDownload />
                          </button>

                          {/* Reject / Cancel */}
                          {cert.status !== "Cancelled" && cert.status !== "Issued" && (
                            <button
                              className="btn-icon-action btn-cancel"
                              title="Cancel / Reject"
                              onClick={() => {
                                setCancellingCert(cert);
                                setShowCancelModal(true);
                              }}
                            >
                              <FiSlash />
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

          {/* Pagination */}
          <div className="cert-pagination-footer">
            <div className="pagination-count-text">
              Showing {activeList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
              {Math.min(currentPage * pageSize, activeList.length)} of {activeList.length} records
            </div>

            <div className="pagination-controls">
              <button
                className="btn-page-nav"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  className={`btn-page-number ${currentPage === pg ? "page-active" : ""}`}
                  onClick={() => setCurrentPage(pg)}
                >
                  {pg}
                </button>
              ))}

              <button
                className="btn-page-nav"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW CERTIFICATE DETAILS MODAL */}
      {/* ========================================================================= */}
      {showViewModal && viewingCertificate && (
        <div className="cert-modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="cert-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header">
              <div className="modal-title-with-icon">
                <FiAward className="modal-icon" />
                <h3>{viewingCertificate.certificateType}</h3>
              </div>
              <button className="btn-close-modal" onClick={() => setShowViewModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="cert-modal-body">
              <div className="cert-preview-card">
                <div className="cert-preview-header">
                  <h4>COLLEGE MANAGEMENT SYSTEM</h4>
                  <p>Certificate of Verification &amp; Recognition</p>
                </div>

                <div className="cert-preview-meta">
                  <div className="meta-badge-box">
                    <span className="meta-label">Certificate No:</span>
                    <span className="meta-value font-bold">
                      {viewingCertificate.certificateNumber}
                    </span>
                  </div>
                  <div className="meta-badge-box">
                    <span className="meta-label">Status:</span>
                    {getStatusBadge(viewingCertificate.status)}
                  </div>
                </div>

                <div className="cert-preview-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Student Name</span>
                    <span className="detail-value">{viewingCertificate.studentName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Admission Number</span>
                    <span className="detail-value">{viewingCertificate.admissionNo}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Academic Level / Year</span>
                    <span className="detail-value">
                      {viewingCertificate.academicLevel || "1st Year"} ({viewingCertificate.academicYear || "2026-2027"})
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Group / Stream</span>
                    <span className="detail-value">{viewingCertificate.groupName || "MPC"}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">Purpose</span>
                    <span className="detail-value">{viewingCertificate.purpose}</span>
                  </div>
                  {viewingCertificate.remarks && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Remarks</span>
                      <span className="detail-value text-muted">{viewingCertificate.remarks}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Request Date</span>
                    <span className="detail-value">{formatDate(viewingCertificate.requestDate)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Issue Date</span>
                    <span className="detail-value">{formatDate(viewingCertificate.issueDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cert-modal-footer">
              <button
                className="btn-cert-secondary"
                onClick={() => handlePrintCertificate(viewingCertificate)}
              >
                <FiPrinter className="mr-1" /> Print
              </button>
              <button
                className="btn-cert-primary"
                onClick={() => handleDownloadPdf(viewingCertificate)}
              >
                <FiDownload className="mr-1" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showCancelModal && cancellingCert && (
        <div className="cert-modal-backdrop" onClick={() => setShowCancelModal(false)}>
          <div className="cert-modal-dialog modal-dialog-sm" onClick={(e) => e.stopPropagation()}>
            <div className="cert-modal-header modal-header-danger">
              <h3>Confirm Certificate Cancellation</h3>
              <button className="btn-close-modal" onClick={() => setShowCancelModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="cert-modal-body">
              <p>
                Are you sure you want to cancel certificate{" "}
                <strong>{cancellingCert.certificateNumber}</strong> for{" "}
                <strong>{cancellingCert.studentName}</strong>?
              </p>
              <p className="text-muted text-sm mt-2">
                This action will mark the certificate as Cancelled and invalidate public verification.
              </p>
            </div>

            <div className="cert-modal-footer">
              <button
                className="btn-cert-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
              >
                Back
              </button>
              <button
                className="btn-cert-danger"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
              >
                {actionLoading ? "Cancelling..." : "Yes, Cancel Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateManagement;
