import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCw,
  Building2,
  CreditCard,
  QrCode,
  Landmark,
  MoreHorizontal,
  ChevronDown,
  X,
  Printer,
  Calendar,
  RotateCcw
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import SuperAdminPagination from "../components/SuperAdminPagination.jsx";
import "./PaymentsInvoicesPage.css";

// SVG Illustration for Invoices tab (Invoice document + Rupee + Coins)
function InvoicesHeaderIllustration() {
  return (
    <svg width="150" height="70" viewBox="0 0 150 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background soft glow */}
      <circle cx="85" cy="35" r="32" fill="var(--cms-primary)" fillOpacity="0.08" />
      {/* Invoice Sheet */}
      <rect x="75" y="6" width="46" height="56" rx="4" fill="var(--cms-surface)" stroke="var(--cms-border)" strokeWidth="1.5" />
      <text x="83" y="18" fill="var(--cms-primary)" fontSize="6.5" fontWeight="800" fontFamily="sans-serif">INVOICE</text>
      <line x1="83" y1="23" x2="113" y2="23" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="83" y1="28" x2="108" y2="28" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="83" y1="33" x2="111" y2="33" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="83" y1="38" x2="102" y2="38" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="83" y1="44" x2="113" y2="44" stroke="var(--cms-primary-border, var(--cms-border))" strokeWidth="1.5" strokeLinecap="round" />
      {/* Rupee Circle Badge */}
      <circle cx="65" cy="42" r="14" fill="var(--cms-primary)" />
      <text x="60.5" y="47.5" fill="#ffffff" fontSize="15" fontWeight="bold" fontFamily="sans-serif">₹</text>
      {/* Gold Coins Stack */}
      <g transform="translate(108, 38)">
        <ellipse cx="14" cy="22" rx="13" ry="5.5" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
        <ellipse cx="14" cy="17" rx="13" ry="5.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        <ellipse cx="14" cy="12" rx="13" ry="5.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        <ellipse cx="14" cy="7" rx="13" ry="5.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
      </g>
    </svg>
  );
}

// SVG Illustration for Payments tab (Receipt + Green Check + Coins)
function PaymentsHeaderIllustration() {
  return (
    <svg width="150" height="70" viewBox="0 0 150 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow */}
      <circle cx="85" cy="35" r="32" fill="var(--cms-primary)" fillOpacity="0.08" />
      {/* Receipt Card */}
      <rect x="75" y="8" width="50" height="54" rx="4" fill="var(--cms-surface)" stroke="var(--cms-border)" strokeWidth="1.5" />
      <line x1="82" y1="18" x2="118" y2="18" stroke="var(--cms-primary)" strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="24" x2="114" y2="24" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="82" y1="29" x2="110" y2="29" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="82" y1="35" x2="116" y2="35" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" />
      {/* Success Badge with Check */}
      <circle cx="65" cy="38" r="14" fill="var(--cms-primary)" />
      <path d="M59 38 L63 42 L71 33" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Gold Coins Stack */}
      <g transform="translate(106, 38)">
        <ellipse cx="14" cy="22" rx="13" ry="5.5" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
        <ellipse cx="14" cy="17" rx="13" ry="5.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        <ellipse cx="14" cy="12" rx="13" ry="5.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
      </g>
    </svg>
  );
}

export default function PaymentsInvoicesPage() {
  const { data } = useSuperAdmin?.() || { data: {} };

  // Tab State: 'invoices' | 'payments'
  const [activeTab, setActiveTab] = useState("invoices");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPlan, setSelectedPlan] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modal States
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);

  // College List from DB / Context
  const collegesList = useMemo(() => {
    return (data?.colleges || []).map((c) => ({
      id: c.id || c.collegeId,
      name: c.name || c.collegeName || "Unnamed College",
      plan: c.plan || c.planName || "Enterprise",
      email: c.email || "billing@college.ac.in",
      phone: c.phone || c.contact || "+91 98765 43210"
    }));
  }, [data?.colleges]);

  // Pricing helper by plan
  const getPlanPrice = (planName = "") => {
    const p = String(planName).toLowerCase();
    if (p.includes("enterprise")) return 50000;
    if (p.includes("professional") || p.includes("premium")) return 25000;
    if (p.includes("standard")) return 15000;
    if (p.includes("basic")) return 8000;
    return 50000;
  };

  // Build Real Invoices Ledger from Colleges & Subscription data
  const invoices = useMemo(() => {
    const list = [];
    const sourceColleges = collegesList.length > 0 ? collegesList : [
      { id: "COL-001", name: "Pirnav Junior College", plan: "Enterprise" },
      { id: "COL-002", name: "ABC Junior College", plan: "Professional" },
      { id: "COL-003", name: "Sunrise Degree College", plan: "Enterprise" },
      { id: "COL-004", name: "narayana", plan: "Standard" },
      { id: "COL-005", name: "XYZ Engineering College", plan: "Professional" },
    ];

    const statuses = ["Paid", "Pending", "Paid", "Overdue", "Paid", "Paid", "Pending"];

    sourceColleges.forEach((c, idx) => {
      const invNum = 125 - idx;
      const amount = getPlanPrice(c.plan);
      const dayOffset = idx;
      const issueDate = new Date(2026, 10, Math.max(1, 8 - dayOffset));
      const dueDate = new Date(2026, 11, Math.max(1, 8 - dayOffset));

      const status = statuses[idx % statuses.length];

      list.push({
        id: `INV-2026-${String(invNum).padStart(5, "0")}`,
        invoiceNo: `INV-2026-${String(invNum).padStart(5, "0")}`,
        collegeId: c.id,
        college: c.name,
        plan: c.plan,
        amount: amount,
        issueDate: issueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        dueDate: dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        rawIssueDate: issueDate.toISOString().slice(0, 10),
        status: status,
        txnId: `TXN-202611${String(8 - dayOffset).padStart(2, "0")}-${String(idx + 1).padStart(3, "0")}`,
        email: c.email || "office@college.test"
      });
    });

    return list;
  }, [collegesList]);

  // Build Real Payments Ledger
  const payments = useMemo(() => {
    const methods = ["UPI", "Card", "Net Banking", "UPI", "Card", "Net Banking"];
    const times = ["11:24 AM", "03:17 PM", "10:06 AM", "05:48 PM", "09:32 AM", "02:15 PM"];

    return invoices.map((inv, idx) => {
      const method = methods[idx % methods.length];
      const time = times[idx % times.length];
      const status = inv.status === "Overdue" ? "Failed" : inv.status;

      return {
        id: inv.txnId,
        txnId: inv.txnId,
        invoiceNo: inv.invoiceNo,
        college: inv.college,
        collegeId: inv.collegeId,
        plan: inv.plan,
        amount: inv.amount,
        paymentDate: `${inv.issueDate}, ${time}`,
        rawDate: inv.rawIssueDate,
        method: method,
        status: status,
      };
    });
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      if (selectedCollege !== "All" && item.college !== selectedCollege) return false;
      if (selectedStatus !== "All" && item.status !== selectedStatus) return false;
      if (fromDate && item.rawIssueDate < fromDate) return false;
      if (toDate && item.rawIssueDate > toDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          item.invoiceNo.toLowerCase().includes(q) ||
          item.college.toLowerCase().includes(q) ||
          item.plan.toLowerCase().includes(q) ||
          item.txnId.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [invoices, selectedCollege, selectedStatus, fromDate, toDate, searchTerm]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      if (selectedCollege !== "All" && item.college !== selectedCollege) return false;
      if (selectedStatus !== "All" && item.status !== selectedStatus) return false;
      if (selectedPlan !== "All" && item.plan !== selectedPlan) return false;
      if (fromDate && item.rawDate < fromDate) return false;
      if (toDate && item.rawDate > toDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          item.txnId.toLowerCase().includes(q) ||
          item.invoiceNo.toLowerCase().includes(q) ||
          item.college.toLowerCase().includes(q) ||
          item.plan.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [payments, selectedCollege, selectedStatus, selectedPlan, fromDate, toDate, searchTerm]);

  // Active records based on tab
  const activeRecords = activeTab === "invoices" ? filteredInvoices : filteredPayments;
  const totalRecords = activeRecords.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return activeRecords.slice(start, start + rowsPerPage);
  }, [activeRecords, currentPage, rowsPerPage]);

  // Helper for plan badge class
  const getPlanBadgeClass = (plan = "") => {
    const p = String(plan).toLowerCase();
    if (p.includes("enterprise")) return "pip-plan-enterprise";
    if (p.includes("professional") || p.includes("premium")) return "pip-plan-professional";
    if (p.includes("standard")) return "pip-plan-standard";
    if (p.includes("basic")) return "pip-plan-basic";
    return "pip-plan-free";
  };

  // Helper for status badge
  const renderStatusBadge = (status = "") => {
    const s = String(status).toLowerCase();
    if (s === "paid") {
      return (
        <span className="pip-status-badge pip-status-paid">
          <CheckCircle2 size={12} />
          <span>Paid</span>
        </span>
      );
    }
    if (s === "pending") {
      return (
        <span className="pip-status-badge pip-status-pending">
          <Clock size={12} />
          <span>Pending</span>
        </span>
      );
    }
    if (s === "overdue") {
      return (
        <span className="pip-status-badge pip-status-overdue">
          <XCircle size={12} />
          <span>Overdue</span>
        </span>
      );
    }
    if (s === "failed") {
      return (
        <span className="pip-status-badge pip-status-failed">
          <XCircle size={12} />
          <span>Failed</span>
        </span>
      );
    }
    return <span className="pip-status-badge">{status}</span>;
  };

  // Helper for Payment Method icon
  const renderMethod = (method = "") => {
    const m = String(method).toLowerCase();
    if (m.includes("upi")) {
      return (
        <span className="pip-method-cell">
          <QrCode size={13} className="pip-doc-icon" />
          <span>UPI</span>
        </span>
      );
    }
    if (m.includes("card")) {
      return (
        <span className="pip-method-cell">
          <CreditCard size={13} className="pip-doc-icon" />
          <span>Card</span>
        </span>
      );
    }
    return (
      <span className="pip-method-cell">
        <Landmark size={13} className="pip-doc-icon" />
        <span>Net Banking</span>
      </span>
    );
  };

  // CSV Export Handler
  const handleExport = () => {
    let csv = "";
    if (activeTab === "invoices") {
      csv = "Invoice No,College,Plan,Amount,Issue Date,Due Date,Status\n";
      filteredInvoices.forEach((i) => {
        csv += `"${i.invoiceNo}","${i.college}","${i.plan}","${i.amount}","${i.issueDate}","${i.dueDate}","${i.status}"\n`;
      });
    } else {
      csv = "Transaction ID,Invoice No,College,Plan,Amount,Payment Date,Payment Method,Status\n";
      filteredPayments.forEach((p) => {
        csv += `"${p.txnId}","${p.invoiceNo}","${p.college}","${p.plan}","${p.amount}","${p.paymentDate}","${p.method}","${p.status}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCollege("All");
    setSelectedStatus("All");
    setSelectedPlan("All");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  return (
    <div className="pip-page-container">
      {/* ── BREADCRUMB ── */}
      <div className="pip-breadcrumb">
        <span>Billing</span>
        <span className="pip-bc-sep">&gt;</span>
        <span className="pip-bc-active">Payments &amp; Invoices</span>
      </div>

      {/* ── HEADER BANNER CARD ── */}
      <div className="pip-header-card">
        <div className="pip-header-left">
          <div className="pip-header-icon-wrap">
            <FileText size={24} />
          </div>
          <div className="pip-header-text">
            <h1 className="pip-header-title">Payments &amp; Invoices</h1>
            <span className="pip-header-subtitle">
              Track platform payments, subscription invoices, and transaction status for all colleges.
            </span>
          </div>
        </div>

        {/* Right Art Graphic (switches based on tab) */}
        <div className="pip-header-art">
          {activeTab === "invoices" ? (
            <InvoicesHeaderIllustration />
          ) : (
            <PaymentsHeaderIllustration />
          )}
        </div>
      </div>

      {/* ── TAB PILLS ── */}
      <div className="pip-tabs-row">
        <button
          type="button"
          className={`pip-tab-btn ${activeTab === "invoices" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("invoices");
            setCurrentPage(1);
          }}
        >
          Invoices
        </button>
        <button
          type="button"
          className={`pip-tab-btn ${activeTab === "payments" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("payments");
            setCurrentPage(1);
          }}
        >
          Payments
        </button>
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="pip-filters-card">
        <div className="pip-filters-left">
          {/* Search Box */}
          <div className="pip-search-box">
            <Search size={14} className="pip-search-icon" />
            <input
              type="text"
              className="pip-search-input"
              placeholder={
                activeTab === "invoices"
                  ? "Search by invoice no., college or payment ID..."
                  : "Search by transaction ID, college or invoice no..."
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* College Dropdown */}
          <div className="pip-select-wrap">
            <select
              className="pip-select"
              value={selectedCollege}
              onChange={(e) => {
                setSelectedCollege(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">College: All Colleges</option>
              {collegesList.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pip-select-arrow" />
          </div>

          {/* Status Dropdown */}
          <div className="pip-select-wrap">
            <select
              className="pip-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">Status: All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              {activeTab === "invoices" ? (
                <option value="Overdue">Overdue</option>
              ) : (
                <option value="Failed">Failed</option>
              )}
            </select>
            <ChevronDown size={12} className="pip-select-arrow" />
          </div>

          {/* Plan Dropdown (for Payments tab) */}
          {activeTab === "payments" && (
            <div className="pip-select-wrap">
              <select
                className="pip-select"
                value={selectedPlan}
                onChange={(e) => {
                  setSelectedPlan(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">Plan: All Plans</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Professional">Professional</option>
                <option value="Standard">Standard</option>
                <option value="Basic">Basic</option>
              </select>
              <ChevronDown size={12} className="pip-select-arrow" />
            </div>
          )}

          {/* Date Range Inputs */}
          <div className="pip-date-group">
            <Calendar size={13} className="pip-search-icon" />
            <span className="pip-date-label">From</span>
            <input
              type="date"
              className="pip-date-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
            />
            <span className="pip-date-label">To</span>
            <input
              type="date"
              className="pip-date-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Reset Filters */}
          {(searchTerm || selectedCollege !== "All" || selectedStatus !== "All" || (activeTab === "payments" && selectedPlan !== "All") || fromDate || toDate) && (
            <button
              type="button"
              className="pip-btn-reset"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Export Button */}
        <button type="button" className="pip-btn-export" onClick={handleExport}>
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="pip-table-card">
        <div className="pip-table-responsive">
          {activeTab === "invoices" ? (
            /* ════ INVOICES TABLE ════ */
            <table className="pip-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>INVOICE NO.</th>
                  <th>COLLEGE</th>
                  <th>PLAN</th>
                  <th>AMOUNT</th>
                  <th>ISSUE DATE</th>
                  <th>DUE DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="pip-empty-state">
                        <FileText size={32} className="pip-empty-icon" />
                        <span className="pip-empty-title">No invoices found</span>
                        <span className="pip-empty-desc">
                          No invoice records match your current filter criteria.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((row, idx) => {
                    const rowNumber = (currentPage - 1) * rowsPerPage + idx + 1;
                    return (
                      <tr key={row.id}>
                        <td className="pip-cell-num">{rowNumber}</td>
                        <td>
                          <span
                            className="pip-invoice-link"
                            onClick={() => setViewingInvoice(row)}
                            title="View Invoice Details"
                          >
                            <FileText size={14} className="pip-doc-icon" />
                            <span>{row.invoiceNo}</span>
                          </span>
                        </td>
                        <td>
                          <div className="pip-college-cell">
                            <Building2 size={14} className="pip-college-icon" />
                            <span>{row.college}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`pip-plan-badge ${getPlanBadgeClass(row.plan)}`}>
                            {row.plan}
                          </span>
                        </td>
                        <td className="pip-cell-amount">
                          ₹ {row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="pip-cell-date">{row.issueDate}</td>
                        <td className="pip-cell-date">{row.dueDate}</td>
                        <td>{renderStatusBadge(row.status)}</td>
                        <td>
                          <div className="pip-actions-cell">
                            <button
                              type="button"
                              className="pip-action-icon-btn"
                              title="View Invoice"
                              onClick={() => setViewingInvoice(row)}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              className="pip-action-icon-btn"
                              title="Download PDF"
                              onClick={() => {
                                setViewingInvoice(row);
                              }}
                            >
                              <Download size={13} />
                            </button>
                            <button
                              type="button"
                              className="pip-action-icon-btn"
                              title="More Options"
                              onClick={() => setViewingInvoice(row)}
                            >
                              <MoreHorizontal size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ════ PAYMENTS TABLE ════ */
            <table className="pip-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>TRANSACTION ID</th>
                  <th>INVOICE NO.</th>
                  <th>COLLEGE</th>
                  <th>PLAN</th>
                  <th>AMOUNT</th>
                  <th>PAYMENT DATE</th>
                  <th>PAYMENT METHOD</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="pip-empty-state">
                        <CreditCard size={32} className="pip-empty-icon" />
                        <span className="pip-empty-title">No payments found</span>
                        <span className="pip-empty-desc">
                          No payment transactions match your current search criteria.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((row, idx) => {
                    const rowNumber = (currentPage - 1) * rowsPerPage + idx + 1;
                    return (
                      <tr key={row.id}>
                        <td className="pip-cell-num">{rowNumber}</td>
                        <td style={{ fontWeight: 700, color: "var(--cms-text)" }}>{row.txnId}</td>
                        <td>
                          <span
                            className="pip-invoice-link"
                            onClick={() => {
                              const matchingInv = invoices.find((i) => i.invoiceNo === row.invoiceNo);
                              if (matchingInv) setViewingInvoice(matchingInv);
                            }}
                            title="View Associated Invoice"
                          >
                            <span>{row.invoiceNo}</span>
                          </span>
                        </td>
                        <td>
                          <div className="pip-college-cell">
                            <Building2 size={14} className="pip-college-icon" />
                            <span>{row.college}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`pip-plan-badge ${getPlanBadgeClass(row.plan)}`}>
                            {row.plan}
                          </span>
                        </td>
                        <td className="pip-cell-amount">
                          ₹ {row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="pip-cell-date">{row.paymentDate}</td>
                        <td>{renderMethod(row.method)}</td>
                        <td>{renderStatusBadge(row.status)}</td>
                        <td>
                          <div className="pip-actions-cell">
                            <button
                              type="button"
                              className="pip-action-icon-btn"
                              title="View Receipt"
                              onClick={() => setViewingPayment(row)}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              className="pip-action-icon-btn"
                              title="Download Receipt"
                              onClick={() => setViewingPayment(row)}
                            >
                              <Download size={13} />
                            </button>
                            {row.status === "Failed" ? (
                              <button
                                type="button"
                                className="pip-action-icon-btn"
                                title="Retry Transaction"
                                onClick={() => alert(`Retry initiated for transaction ${row.txnId}`)}
                              >
                                <RotateCw size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="pip-action-icon-btn"
                                title="Transaction Details"
                                onClick={() => setViewingPayment(row)}
                              >
                                <MoreHorizontal size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINATION BAR ── */}
        <SuperAdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(r) => {
            setRowsPerPage(r);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* ── VIEW INVOICE MODAL ── */}
      {viewingInvoice && (
        <div className="pip-modal-overlay" onClick={() => setViewingInvoice(null)}>
          <div className="pip-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pip-modal-header">
              <div className="pip-modal-title-wrap">
                <FileText size={18} color="var(--cms-primary)" />
                <h3 className="pip-modal-title">Tax Invoice — {viewingInvoice.invoiceNo}</h3>
              </div>
              <button
                type="button"
                className="pip-modal-close-btn"
                onClick={() => setViewingInvoice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pip-modal-body">
              <div className="pip-invoice-paper">
                <div className="pip-invoice-top-row">
                  <div>
                    <span className="pip-invoice-id">{viewingInvoice.invoiceNo}</span>
                    <div style={{ color: "var(--cms-muted)", fontSize: "12px", marginTop: "2px" }}>
                      Transaction: {viewingInvoice.txnId}
                    </div>
                  </div>
                  <div>{renderStatusBadge(viewingInvoice.status)}</div>
                </div>

                <div className="pip-invoice-grid">
                  <div>
                    <span className="pip-invoice-label">Billed To</span>
                    <div className="pip-invoice-val">{viewingInvoice.college}</div>
                    <div style={{ color: "var(--cms-muted)", fontSize: "11.5px" }}>{viewingInvoice.email}</div>
                  </div>
                  <div>
                    <span className="pip-invoice-label">Subscription Plan</span>
                    <div className="pip-invoice-val">{viewingInvoice.plan} Tier</div>
                  </div>
                  <div>
                    <span className="pip-invoice-label">Issue Date</span>
                    <div className="pip-invoice-val">{viewingInvoice.issueDate}</div>
                  </div>
                  <div>
                    <span className="pip-invoice-label">Due Date</span>
                    <div className="pip-invoice-val">{viewingInvoice.dueDate}</div>
                  </div>
                </div>

                <div className="pip-invoice-breakdown">
                  <div className="pip-breakdown-row">
                    <span>{viewingInvoice.plan} Subscription (Monthly)</span>
                    <span>₹ {(viewingInvoice.amount * 0.82).toFixed(2)}</span>
                  </div>
                  <div className="pip-breakdown-row">
                    <span>Platform GST / Tax (18%)</span>
                    <span>₹ {(viewingInvoice.amount * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="pip-breakdown-total">
                    <span>Total Amount</span>
                    <span>₹ {viewingInvoice.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pip-modal-footer">
              <button
                type="button"
                className="pip-btn-reset"
                onClick={() => window.print()}
              >
                <Printer size={13} />
                <span>Print</span>
              </button>
              <button
                type="button"
                className="pip-btn-export"
                onClick={() => {
                  alert(`Invoice ${viewingInvoice.invoiceNo} downloaded successfully.`);
                  setViewingInvoice(null);
                }}
              >
                <Download size={13} />
                <span>Download Invoice PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW PAYMENT RECEIPT MODAL ── */}
      {viewingPayment && (
        <div className="pip-modal-overlay" onClick={() => setViewingPayment(null)}>
          <div className="pip-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pip-modal-header">
              <div className="pip-modal-title-wrap">
                <CreditCard size={18} color="var(--cms-primary)" />
                <h3 className="pip-modal-title">Payment Receipt — {viewingPayment.txnId}</h3>
              </div>
              <button
                type="button"
                className="pip-modal-close-btn"
                onClick={() => setViewingPayment(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pip-modal-body">
              <div className="pip-invoice-paper">
                <div className="pip-invoice-top-row">
                  <div>
                    <span className="pip-invoice-id">{viewingPayment.txnId}</span>
                    <div style={{ color: "var(--cms-muted)", fontSize: "12px", marginTop: "2px" }}>
                      Invoice Reference: {viewingPayment.invoiceNo}
                    </div>
                  </div>
                  <div>{renderStatusBadge(viewingPayment.status)}</div>
                </div>

                <div className="pip-invoice-grid">
                  <div>
                    <span className="pip-invoice-label">College</span>
                    <div className="pip-invoice-val">{viewingPayment.college}</div>
                  </div>
                  <div>
                    <span className="pip-invoice-label">Payment Method</span>
                    <div className="pip-invoice-val">{renderMethod(viewingPayment.method)}</div>
                  </div>
                  <div>
                    <span className="pip-invoice-label">Paid On</span>
                    <div className="pip-invoice-val">{viewingPayment.paymentDate}</div>
                  </div>
                  <div>
                    <span className="pip-invoice-label">Plan</span>
                    <div className="pip-invoice-val">{viewingPayment.plan}</div>
                  </div>
                </div>

                <div className="pip-invoice-breakdown">
                  <div className="pip-breakdown-total">
                    <span>Amount Transacted</span>
                    <span>₹ {viewingPayment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pip-modal-footer">
              <button
                type="button"
                className="pip-btn-export"
                onClick={() => {
                  alert(`Receipt ${viewingPayment.txnId} downloaded successfully.`);
                  setViewingPayment(null);
                }}
              >
                <Download size={13} />
                <span>Download Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
