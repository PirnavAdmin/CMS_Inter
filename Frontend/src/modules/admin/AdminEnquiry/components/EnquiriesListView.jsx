import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Inbox,
  Phone,
  Mail,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  X,
  MessageSquare,
  Shield,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import enquiryApi from "@/api/enquiryApi.js";
import { getApiErrorMessage } from "@/api/apiClient.js";
import { getAuthUser, getAuthItem } from "@/modules/auth/authStorage.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import "./EnquiriesListView.css";

const STATUS_OPTIONS = ["All", "New", "In Progress", "Contacted", "Resolved"];

const CATEGORY_OPTIONS = [
  "All",
  "Admissions",
  "Fee Structure & Scholarships",
  "Academic Programmes (MPC, BiPC, CEC, MEC)",
  "Hostel Facility",
  "Transport & Bus Routes",
  "General Enquiry",
  "Other",
];

// Helper to determine active user's identity and normalized role for tracking
function getActiveHandler() {
  const user = getAuthUser() || {};
  const storedRole = String(getAuthItem("role") || user.role || user.roleName || user.designation || "Staff");
  const name = user.name || user.fullName || user.userName || user.email || "Staff Member";

  const norm = storedRole.trim().toLowerCase();
  let role = "Staff";
  if (norm.includes("admin")) role = "Admin";
  else if (norm.includes("principal")) role = "Principal";
  else if (norm.includes("reception")) role = "Receptionist";

  return { name, role, rawRole: storedRole };
}

export default function EnquiriesListView({ portalType = "admin" }) {
  const { selectedCampusId } = useCampusContext();
  const currentHandler = useMemo(() => getActiveHandler(), []);

  // Records state
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    newCount: 0,
    inProgressCount: 0,
    contactedCount: 0,
    resolvedCount: 0,
    todayCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [activeEnquiry, setActiveEnquiry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState("Contacted");
  const [modalMethod, setModalMethod] = useState("Phone");
  const [modalNotes, setModalNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Message preview modal
  const [viewMessageEnquiry, setViewMessageEnquiry] = useState(null);

  const loadData = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      try {
        const [listRes, statsRes] = await Promise.all([
          enquiryApi.listEnquiries(
            {
              campusId: selectedCampusId ? Number(selectedCampusId) : undefined,
              status: statusFilter !== "All" ? statusFilter : undefined,
              search: searchTerm || undefined,
              page: 1,
              pageSize: 100,
            },
            signal,
          ),
          enquiryApi.getStats(selectedCampusId ? Number(selectedCampusId) : undefined, signal),
        ]);

        let filtered = listRes.items || [];
        if (categoryFilter !== "All") {
          filtered = filtered.filter(
            (item) => String(item.enquiryType || "").toLowerCase() === categoryFilter.toLowerCase(),
          );
        }

        setItems(filtered);
        setStats(statsRes || {});
      } catch (err) {
        if (!signal?.aborted) {
          setError(getApiErrorMessage(err) || "Failed to load enquiries.");
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [selectedCampusId, statusFilter, categoryFilter, searchTerm],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const openChargeModal = (enquiry) => {
    setActiveEnquiry(enquiry);
    // If it's new, taking charge defaults status to 'Contacted' or 'In Progress'
    setModalStatus(enquiry.status === "New" ? "Contacted" : enquiry.status);
    setModalMethod(enquiry.contactMethodUsed || "Phone");
    setModalNotes(enquiry.responseNotes || "");
    setModalOpen(true);
  };

  const handleSaveCharge = async (e) => {
    e.preventDefault();
    if (!activeEnquiry) return;

    setSavingStatus(true);
    try {
      await enquiryApi.updateStatus(activeEnquiry.id, {
        status: modalStatus,
        contactMethodUsed: modalMethod,
        responseNotes: modalNotes.trim(),
        handledByStaffName: currentHandler.name,
        handledByRole: currentHandler.role,
      });

      setModalOpen(false);
      setToastMessage(`✓ Tracked successfully: ${currentHandler.role} took charge and recorded follow-up.`);
      setTimeout(() => setToastMessage(""), 5000);
      await loadData();
    } catch (err) {
      alert(getApiErrorMessage(err) || "Failed to update enquiry status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const getRoleBadge = (role, staffName) => {
    const norm = String(role || "").toLowerCase();
    if (norm.includes("admin")) {
      return (
        <span className="enq-charge-badge is-admin" title="Administrator took charge">
          <Shield size={12} />
          <span>Admin took charge</span>
        </span>
      );
    }
    if (norm.includes("principal")) {
      return (
        <span className="enq-charge-badge is-principal" title="Principal took charge">
          <GraduationCap size={12} />
          <span>Principal took charge</span>
        </span>
      );
    }
    if (norm.includes("reception")) {
      return (
        <span className="enq-charge-badge is-receptionist" title="Receptionist took charge">
          <UserCheck size={12} />
          <span>Receptionist took charge</span>
        </span>
      );
    }
    return (
      <span className="enq-charge-badge is-staff" title="Staff member took charge">
        <UserCheck size={12} />
        <span>Staff took charge</span>
      </span>
    );
  };

  return (
    <div className="enq-manager-shell">
      {toastMessage && (
        <div className="enq-alert is-success" role="status">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage("")} aria-label="Close message">
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="enq-alert is-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => loadData()} aria-label="Retry loading">
            Retry
          </button>
        </div>
      )}

      {/* Interactive KPI Cards Ribbon (Click card to filter table) */}
      <section className="enq-kpi-grid" aria-label="Enquiry summary metrics and filters">
        <button
          type="button"
          className={`enq-kpi-card is-slate ${statusFilter === "All" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("All")}
          aria-pressed={statusFilter === "All"}
          title="Click to view all visitor enquiries"
        >
          <div className="enq-kpi-icon is-slate">
            <Inbox size={22} />
          </div>
          <div className="enq-kpi-data">
            <span className="enq-kpi-label">Total Received</span>
            <strong className="enq-kpi-value">{stats.totalCount || 0}</strong>
            <small className="enq-kpi-meta">All visitor leads</small>
          </div>
          {statusFilter === "All" && <span className="enq-kpi-active-pill">Active</span>}
        </button>

        <button
          type="button"
          className={`enq-kpi-card is-amber ${statusFilter === "New" ? "is-active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "New" ? "All" : "New")}
          aria-pressed={statusFilter === "New"}
          title="Click to filter by New / Unassigned enquiries"
        >
          <div className="enq-kpi-icon is-amber">
            <AlertCircle size={22} />
          </div>
          <div className="enq-kpi-data">
            <span className="enq-kpi-label">New / Unassigned</span>
            <strong className="enq-kpi-value">{stats.newCount || 0}</strong>
            <small className="enq-kpi-meta">Awaiting first contact</small>
          </div>
          {statusFilter === "New" && <span className="enq-kpi-active-pill is-amber">Active</span>}
        </button>

        <button
          type="button"
          className={`enq-kpi-card is-blue ${statusFilter === "In Progress" ? "is-active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "In Progress" ? "All" : "In Progress")}
          aria-pressed={statusFilter === "In Progress"}
          title="Click to filter by In Progress enquiries"
        >
          <div className="enq-kpi-icon is-blue">
            <Clock size={22} />
          </div>
          <div className="enq-kpi-data">
            <span className="enq-kpi-label">In Progress</span>
            <strong className="enq-kpi-value">{stats.inProgressCount || 0}</strong>
            <small className="enq-kpi-meta">Active discussions</small>
          </div>
          {statusFilter === "In Progress" && <span className="enq-kpi-active-pill is-blue">Active</span>}
        </button>

        <button
          type="button"
          className={`enq-kpi-card is-purple ${statusFilter === "Contacted" ? "is-active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "Contacted" ? "All" : "Contacted")}
          aria-pressed={statusFilter === "Contacted"}
          title="Click to filter by Contacted enquiries"
        >
          <div className="enq-kpi-icon is-purple">
            <Phone size={22} />
          </div>
          <div className="enq-kpi-data">
            <span className="enq-kpi-label">Contacted</span>
            <strong className="enq-kpi-value">{stats.contactedCount || 0}</strong>
            <small className="enq-kpi-meta">Followed up</small>
          </div>
          {statusFilter === "Contacted" && <span className="enq-kpi-active-pill is-purple">Active</span>}
        </button>

        <button
          type="button"
          className={`enq-kpi-card is-emerald ${statusFilter === "Resolved" ? "is-active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "Resolved" ? "All" : "Resolved")}
          aria-pressed={statusFilter === "Resolved"}
          title="Click to filter by Resolved enquiries"
        >
          <div className="enq-kpi-icon is-emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="enq-kpi-data">
            <span className="enq-kpi-label">Resolved</span>
            <strong className="enq-kpi-value">{stats.resolvedCount || 0}</strong>
            <small className="enq-kpi-meta">Admission confirmed / closed</small>
          </div>
          {statusFilter === "Resolved" && <span className="enq-kpi-active-pill is-emerald">Active</span>}
        </button>
      </section>

      {/* Streamlined Filter and Search Bar */}
      <section className="enq-toolbar-card" aria-label="Filters and Search">
        <div className="enq-toolbar-row">
          <div className="enq-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by visitor name, mobile, email, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="enq-clear-search"
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="enq-select-wrap">
            <Filter size={15} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          {statusFilter !== "All" && (
            <div className="enq-active-filter-indicator">
              <span>Showing: <strong>{statusFilter}</strong></span>
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                title="Clear status filter"
              >
                <X size={13} />
                <span>Show All</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="enq-refresh-btn"
            onClick={() => loadData()}
            title="Refresh records"
          >
            <RefreshCw size={15} className={loading ? "enq-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Table Records View */}
      <section className="enq-table-card" aria-label="Enquiry Records">
        {loading && items.length === 0 ? (
          <div className="enq-loading-state">
            <RefreshCw size={24} className="enq-spin" />
            <p>Loading enquiries...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="enq-empty-state">
            <Inbox size={42} />
            <h3>No enquiries found</h3>
            <p>
              {searchTerm || statusFilter !== "All" || categoryFilter !== "All"
                ? "No visitor enquiries match your search or filter parameters. Try clearing filters."
                : "No prospective visitor inquiries have been submitted yet. They will appear here immediately."}
            </p>
          </div>
        ) : (
          <div className="enq-table-responsive">
            <table className="enq-table">
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Visitor &amp; Contact</th>
                  <th style={{ width: "16%" }}>Category &amp; Subject</th>
                  <th style={{ width: "30%" }}>Who Took Charge &amp; Track</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "20%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const hasHandler = Boolean(row.handledByStaffName || row.handledByRole);
                  const isNew = row.status === "New";

                  return (
                    <tr key={row.id} className={isNew ? "enq-row-new" : ""}>
                      {/* Visitor Cell */}
                      <td>
                        <div className="enq-visitor-cell">
                          <strong className="enq-visitor-name">{row.fullName}</strong>
                          <div className="enq-visitor-channels">
                            <a
                              href={`tel:${row.mobile.replace(/[^+\d]/g, "")}`}
                              className="enq-link-phone"
                              title="Click to Call"
                            >
                              <Phone size={12} />
                              <span>{row.mobile}</span>
                            </a>
                            <a
                              href={`mailto:${row.email}`}
                              className="enq-link-email"
                              title="Click to Email"
                            >
                              <Mail size={12} />
                              <span>{row.email}</span>
                            </a>
                          </div>
                          <span className="enq-received-time">
                            Received:{" "}
                            {new Date(row.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Category & Message Preview */}
                      <td>
                        <div className="enq-subject-cell">
                          <span className="enq-category-pill">{row.enquiryType}</span>
                          <span className="enq-subject-text" title={row.subject}>
                            {row.subject || "General Enquiry"}
                          </span>
                          <button
                            type="button"
                            className="enq-view-msg-btn"
                            onClick={() => setViewMessageEnquiry(row)}
                          >
                            <MessageSquare size={12} />
                            <span>View Message</span>
                          </button>
                        </div>
                      </td>

                      {/* Who Took Charge & Process Track Cell */}
                      <td>
                        <div className="enq-track-cell">
                          {hasHandler ? (
                            <>
                              <div className="enq-handler-head">
                                {getRoleBadge(row.handledByRole, row.handledByStaffName)}
                                <span className="enq-handler-name">
                                  {row.handledByStaffName || "Authorized Staff"}
                                </span>
                              </div>

                              <div className="enq-track-details">
                                <span className="enq-track-meta">
                                  <strong>Channel:</strong> {row.contactMethodUsed || "Direct Contact"}
                                  {row.contactedAt && (
                                    <> · {new Date(row.contactedAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}</>
                                  )}
                                </span>

                                {row.responseNotes ? (
                                  <p className="enq-track-notes" title={row.responseNotes}>
                                    "{row.responseNotes}"
                                  </p>
                                ) : (
                                  <span className="enq-track-no-notes">No conversation notes recorded.</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="enq-unassigned-box">
                              <span className="enq-unassigned-badge">
                                <Clock size={12} />
                                <span>Awaiting Charge</span>
                              </span>
                              <p className="enq-unassigned-text">
                                No one has contacted this visitor yet. Click "Take Charge" to record interaction.
                              </p>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Cell */}
                      <td>
                        <span
                          className={`enq-status-badge ${
                            row.status === "New"
                              ? "is-new"
                              : row.status === "In Progress"
                                ? "is-progress"
                                : row.status === "Contacted"
                                  ? "is-contacted"
                                  : row.status === "Resolved"
                                    ? "is-resolved"
                                    : "is-closed"
                          }`}
                        >
                          <span className="enq-status-dot" />
                          <span>{row.status}</span>
                        </span>
                      </td>

                      {/* Actions Cell */}
                      <td>
                        <div className="enq-actions-cell">
                          <button
                            type="button"
                            className={`enq-charge-btn ${isNew ? "is-primary" : "is-secondary"}`}
                            onClick={() => openChargeModal(row)}
                            title={isNew ? "Take charge of this lead" : "Update conversation track"}
                          >
                            <UserCheck size={14} />
                            <span>{isNew ? "Take Charge & Contact" : "Update Track"}</span>
                          </button>

                          <div className="enq-quick-dials">
                            <a
                              href={`tel:${row.mobile.replace(/[^+\d]/g, "")}`}
                              className="enq-dial-btn is-call"
                              title={`Call ${row.fullName}`}
                            >
                              <Phone size={13} />
                            </a>

                            <a
                              href={`https://wa.me/${row.mobile.replace(/[^+\d]/g, "")}?text=${encodeURIComponent(
                                `Hello ${row.fullName}, this is regarding your enquiry at Pirnav College.`,
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="enq-dial-btn is-whatsapp"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>

                            <a
                              href={`mailto:${row.email}?subject=${encodeURIComponent(
                                `Regarding your enquiry: ${row.subject || "Pirnav College Information"}`,
                              )}`}
                              className="enq-dial-btn is-email"
                              title="Send Email"
                            >
                              <Mail size={13} />
                            </a>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal: Take Charge & Record Follow-up */}
      {modalOpen && activeEnquiry && (
        <div className="enq-modal-backdrop" onClick={() => !savingStatus && setModalOpen(false)}>
          <div
            className="enq-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-charge-title"
          >
            <div className="enq-modal-header">
              <div>
                <h3 id="modal-charge-title">Visitor Interaction &amp; Charge Tracker</h3>
                <p>Record notes and maintain clear visibility on who took charge of this enquiry.</p>
              </div>
              <button
                type="button"
                className="enq-modal-close"
                onClick={() => setModalOpen(false)}
                disabled={savingStatus}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Visitor Summary Strip inside Modal */}
            <div className="enq-modal-lead-summary">
              <div className="enq-modal-lead-main">
                <h4>{activeEnquiry.fullName}</h4>
                <div className="enq-modal-lead-meta">
                  <span>
                    <Phone size={13} /> {activeEnquiry.mobile}
                  </span>
                  <span>
                    <Mail size={13} /> {activeEnquiry.email}
                  </span>
                  <span className="enq-modal-tag">{activeEnquiry.enquiryType}</span>
                </div>
              </div>

              <div className="enq-modal-quick-links">
                <a
                  href={`tel:${activeEnquiry.mobile.replace(/[^+\d]/g, "")}`}
                  className="enq-modal-action-btn"
                >
                  <Phone size={13} /> Call
                </a>
                <a
                  href={`https://wa.me/${activeEnquiry.mobile.replace(/[^+\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="enq-modal-action-btn is-wa"
                >
                  <MessageSquare size={13} /> WhatsApp
                </a>
                <a
                  href={`mailto:${activeEnquiry.email}`}
                  className="enq-modal-action-btn"
                >
                  <Mail size={13} /> Email
                </a>
              </div>
            </div>

            {/* Charge Takeover Notification Banner */}
            <div className="enq-handler-banner">
              <div className="enq-handler-banner-icon">
                {currentHandler.role === "Admin" ? (
                  <Shield size={20} />
                ) : currentHandler.role === "Principal" ? (
                  <GraduationCap size={20} />
                ) : (
                  <UserCheck size={20} />
                )}
              </div>
              <div>
                <strong>
                  You are taking charge as:{" "}
                  <span className="enq-banner-role">[{currentHandler.role}]</span> {currentHandler.name}
                </strong>
                <p>
                  This record will officially show that the {currentHandler.role} took charge of contacting this
                  visitor.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCharge}>
              <div className="enq-modal-body">
                <div className="enq-form-row">
                  <div className="enq-form-field">
                    <label htmlFor="modal-enq-status">Lifecycle Status *</label>
                    <select
                      id="modal-enq-status"
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                      required
                    >
                      <option value="In Progress">In Progress (Active Communication)</option>
                      <option value="Contacted">Contacted (Spoke / Answered Questions)</option>
                      <option value="Resolved">Resolved (Admission Finalized / Done)</option>
                      <option value="New">New (Reset to Unassigned)</option>
                      <option value="Closed">Closed / Spam</option>
                    </select>
                  </div>

                  <div className="enq-form-field">
                    <label htmlFor="modal-enq-method">Contact Method Used *</label>
                    <select
                      id="modal-enq-method"
                      value={modalMethod}
                      onChange={(e) => setModalMethod(e.target.value)}
                      required
                    >
                      <option value="Phone">Phone Call</option>
                      <option value="WhatsApp">WhatsApp Message</option>
                      <option value="Email">Official Email</option>
                      <option value="In-Person">In-Person Campus Visit</option>
                    </select>
                  </div>
                </div>

                <div className="enq-form-field">
                  <label htmlFor="modal-enq-notes">Conversation &amp; Response Notes *</label>
                  <textarea
                    id="modal-enq-notes"
                    rows="4"
                    placeholder="Document conversation details (e.g., explained fee structure, scheduled campus tour for Saturday, verified eligibility for MPC)..."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    required
                  />
                  <small className="enq-field-hint">
                    These notes and your identity ({currentHandler.role} — {currentHandler.name}) will be saved for
                    full transparent tracking across Admin, Principal, and Receptionist dashboards.
                  </small>
                </div>
              </div>

              <div className="enq-modal-footer">
                <button
                  type="button"
                  className="enq-btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={savingStatus}
                >
                  Cancel
                </button>
                <button type="submit" className="enq-btn-primary" disabled={savingStatus}>
                  {savingStatus ? (
                    <>
                      <RefreshCw size={14} className="enq-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Save &amp; Record Charge
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Full Visitor Message */}
      {viewMessageEnquiry && (
        <div className="enq-modal-backdrop" onClick={() => setViewMessageEnquiry(null)}>
          <div
            className="enq-modal-dialog is-view"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-view-title"
          >
            <div className="enq-modal-header">
              <div>
                <h3 id="modal-view-title">Original Visitor Message</h3>
                <p>Submitted by {viewMessageEnquiry.fullName}</p>
              </div>
              <button
                type="button"
                className="enq-modal-close"
                onClick={() => setViewMessageEnquiry(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="enq-modal-body">
              <div className="enq-view-meta">
                <div>
                  <strong>Category:</strong> <span>{viewMessageEnquiry.enquiryType}</span>
                </div>
                <div>
                  <strong>Subject:</strong> <span>{viewMessageEnquiry.subject || "No Subject"}</span>
                </div>
                <div>
                  <strong>Submitted At:</strong>{" "}
                  <span>
                    {new Date(viewMessageEnquiry.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>

              <div className="enq-message-box">
                <h4>Message:</h4>
                <p>{viewMessageEnquiry.message}</p>
              </div>
            </div>

            <div className="enq-modal-footer">
              <button
                type="button"
                className="enq-btn-primary"
                onClick={() => {
                  const enq = viewMessageEnquiry;
                  setViewMessageEnquiry(null);
                  openChargeModal(enq);
                }}
              >
                <UserCheck size={14} /> Take Charge / Follow Up
              </button>
              <button
                type="button"
                className="enq-btn-secondary"
                onClick={() => setViewMessageEnquiry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
