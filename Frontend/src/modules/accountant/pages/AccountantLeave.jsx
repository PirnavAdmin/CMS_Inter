import { SkeletonTable, SkeletonRow, Skeleton } from "@/shared/components/Skeleton.jsx";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Calendar, X, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { accountantLeaveCategoryLabel, accountantLeaveTypeForCategory, getAccountantLeaveCategoryStats, getAccountantLeaveTypeLabel, getApplicableAccountantLeaveCategories, parseAccountantLeaveCategories } from "../utils/accountantLeaveStats.js";
import "./AccountantLeave.css";

const PROFILE_URL = "/api/v1/staff/me";
const historyUrl = staffId => `/api/v1/staff-attendance/leave/history/staff/${staffId}`;
const CATEGORY_URL = "/api/v1/leave-categories";
const LEAVE_URL = "/api/v1/staff-attendance/leave";
const STATUS_BADGE = { Approved: "cms-badge-active", Pending: "cms-badge-warn", Rejected: "cms-badge-danger", Cancelled: "cms-badge-inactive" };
const blankForm = () => ({ categoryId: "", fromDate: "", toDate: "", reason: "" });
const positiveId = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const field = (obj, name) => obj?.[name] ?? obj?.[name[0].toUpperCase() + name.slice(1)];
const unwrap = response => {
  const body = response?.data;
  if ((body?.status ?? body?.Status ?? body?.success ?? body?.Success) === false) throw new Error(body?.message || body?.Message || "Request failed.");
  return body?.data ?? body?.Data ?? body;
};
const apiError = (err, method, url) => {
  const message = err?.response?.status === 403 && url === CATEGORY_URL
    ? "Your account is not permitted to view leave categories. Please contact your administrator. Retry after access has been granted."
    : getApiErrorMessage(err);
  return `${method} ${url}${err?.response?.status ? ` (HTTP ${err.response.status})` : ""}: ${message}`;
};
const normalize = (obj, fields) => Object.fromEntries(fields.map(name => [name, field(obj, name)]));
const leaveFields = ["staffLeaveRequestId", "staffId", "leaveType", "leaveCategoryId", "leaveCategoryName", "startDate", "endDate", "totalDays", "reason", "createdAt", "status", "approvedByUserName"];
const formatDate = value => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function AccountantLeave() {
  const academic = useAcademicContext() || {};
  const [leaveList, setLeaveList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [policyCategories, setPolicyCategories] = useState([]);
  const [categoriesAvailable, setCategoriesAvailable] = useState(false);
  const [staffType, setStaffType] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState(blankForm);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState(null);
  const requestRef = useRef(0);
  const prerequisitesRequestRef = useRef(null);
  const submitLock = useRef(false);
  const cancelLock = useRef(false);
  const modalRef = useRef(null);
  const notify = (text, type = "success") => setToast({ text, type });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchLeaveData = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setPrerequisitesLoading(true);
    setError(null);
    setHistoryError(null);
    setLeaveList([]);
    setStaffId(null);
    setCategories([]);
    setPolicyCategories([]);
    setCategoriesAvailable(false);
    setStaffType(null);
    // Resolve identity independently of history. Never use a user ID as a staff ID.
    // StrictMode replays mount effects in development. Share only the current
    // in-flight reads within this page; subsequent refreshes always fetch anew.
    if (!prerequisitesRequestRef.current) {
      prerequisitesRequestRef.current = Promise.allSettled([apiClient.get(PROFILE_URL), apiClient.get(CATEGORY_URL)]);
    }
    const pending = prerequisitesRequestRef.current;
    const results = await pending;
    if (prerequisitesRequestRef.current === pending) prerequisitesRequestRef.current = null;
    if (request !== requestRef.current) return;
    let profile;
    let id;
    const errors = [];
    try {
      if (results[0].status === "rejected") throw results[0].reason;
      profile = unwrap(results[0].value);
      // /staff/me returns StaffProfileFullDto; its Id is the authenticated staff ID.
      id = positiveId(field(profile, "staffId") ?? field(profile, "id"));
      if (!id) throw new Error("Your authenticated staff profile did not return a valid staff ID. Leave submission is unavailable.");
      setStaffId(id);
      setStaffType(field(profile, "staffType") || null);
    } catch (err) {
      errors.push(apiError(err, "GET", PROFILE_URL));
      profile = null;
    }
    try {
      if (results[1].status === "rejected") throw results[1].reason;
      const catalog = parseAccountantLeaveCategories(results[1].value);
      setPolicyCategories(catalog);
      setCategoriesAvailable(true);
      const available = id ? getApplicableAccountantLeaveCategories(catalog, field(profile, "staffType")) : [];
      setCategories(available);
    } catch (err) { errors.push(apiError(err, "GET", CATEGORY_URL)); }
    setPrerequisitesLoading(false);
    if (!id) {
      setHistoryError("Leave history requires your authenticated staff profile.");
      setError(errors.join(" "));
      setLoading(false);
      return;
    }
    // This deployed route is also used by Faculty; authorization remains server-side.
    const url = historyUrl(id);
    try {
      const history = unwrap(await apiClient.get(url));
      if (request !== requestRef.current) return;
      if (positiveId(field(history, "staffId")) !== id) throw new Error("Leave history does not match your authenticated staff identity.");
      const rows = field(history, "history");
      if (!Array.isArray(rows)) throw new Error("Staff leave history response is invalid.");
      const leaves = rows.map(row => normalize(row, leaveFields));
      if (leaves.some(row => positiveId(row.staffId) !== id)) throw new Error("Leave history contains records outside your staff identity.");
      setLeaveList(leaves.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      if (request !== requestRef.current) return;
      const message = apiError(err, "GET", url);
      setHistoryError(message);
      errors.push(message);
    }
    setError(errors.length ? errors.join(" ") : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaveData();
    return () => { requestRef.current += 1; };
  }, [fetchLeaveData]);

  useEffect(() => {
    if (!showLeaveModal) return;
    const previous = document.activeElement;
    modalRef.current?.querySelector("select")?.focus();
    const onKey = event => {
      if (event.key === "Escape" && !submitLock.current) setShowLeaveModal(false);
      if (event.key !== "Tab") return;
      const controls = [...(modalRef.current?.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)") || [])];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [showLeaveModal]);

  const categoryCards = categories.map(category => ({
    category,
    stats: getAccountantLeaveCategoryStats(category, policyCategories, leaveList, !historyError),
  }));
  const missingQuotas = categoryCards.filter(card => card.stats.quota === null).map(card => accountantLeaveCategoryLabel(card.category));
  const unknownUsage = categoryCards.filter(card => card.stats.used === null).map(card => accountantLeaveCategoryLabel(card.category));
  const selectedCategory = categories.find(category => String(category.leaveCategoryId) === String(leaveForm.categoryId));
  const handleOpenModal = () => {
    if (prerequisitesLoading || !staffId || !categories.length) return;
    setLeaveForm(blankForm());
    setFormError(null);
    setShowLeaveModal(true);
  };
  const closeModal = () => { if (!submitLock.current) setShowLeaveModal(false); };
  const applyLeave = async event => {
    event.preventDefault();
    if (submitLock.current) return;
    const category = categories.find(c => String(c.leaveCategoryId) === String(leaveForm.categoryId));
    if (!category || !leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) return setFormError("Please complete all required fields.");
    if (!Number.isFinite(Date.parse(leaveForm.fromDate)) || !Number.isFinite(Date.parse(leaveForm.toDate))) return setFormError("Please select valid leave dates.");
    if (leaveForm.toDate < leaveForm.fromDate) return setFormError("To Date cannot be earlier than From Date.");
    if (!staffId || prerequisitesLoading) return setFormError("Your authenticated staff profile must be loaded before applying for leave.");
    submitLock.current = true;
    setLeaveSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        staffId,
        leaveType: accountantLeaveTypeForCategory(category),
        leaveCategoryId: Number(category.leaveCategoryId),
        startDate: `${leaveForm.fromDate}T00:00:00.000Z`,
        endDate: `${leaveForm.toDate}T00:00:00.000Z`,
        reason: leaveForm.reason.trim(),
        academicYearId: positiveId(academic.selectedAcademicYearId),
      };
      unwrap(await apiClient.post(LEAVE_URL, payload));
      notify("Leave application submitted successfully!");
      setShowLeaveModal(false);
      setLeaveForm(blankForm());
      await fetchLeaveData();
    } catch (err) { setFormError(apiError(err, "POST", LEAVE_URL)); }
    finally { submitLock.current = false; setLeaveSubmitting(false); }
  };
  const handleCancelLeave = async leave => {
    if (cancelLock.current || submitLock.current || leave.status !== "Pending" || !leaveList.includes(leave) || positiveId(leave.staffId) !== staffId) return;
    const id = positiveId(leave.staffLeaveRequestId);
    if (!id || !window.confirm("Are you sure you want to cancel this leave application?")) return;
    cancelLock.current = true;
    setCancelId(id);
    const url = `${LEAVE_URL}/${id}/action`;
    try {
      unwrap(await apiClient.post(url, { status: "Cancelled", rejectionReason: "Cancelled by employee" }));
      notify("Leave application cancelled successfully.");
      await fetchLeaveData();
    } catch (err) { notify(apiError(err, "POST", url), "error"); }
    finally { cancelLock.current = false; setCancelId(null); }
  };

  return (
    <div className="accountant-leave-container">
      {/* Page Header */}
      <div className="cms-page-head">
        <div>
          <h1>Leave Management</h1>
          <p>Apply for casual, sick, or earned leave and track approval status.</p>
        </div>
        <button type="button" className="cms-btn cms-btn-primary" disabled={prerequisitesLoading || !staffId || !categories.length} onClick={handleOpenModal}>
          <Plus size={14} /> Apply Leave
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="accountant-leave-error-banner" role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            className="cms-btn cms-btn-ghost"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={fetchLeaveData}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Cards and dropdown share the same active, eligibility-filtered catalog. */}
      <div className="sp-stat-grid" aria-label="Leave category policies" style={{ marginBottom: 16, "--accountant-leave-columns": Math.min(Math.max(categories.length, 1), 4), "--accountant-leave-small-columns": Math.min(Math.max(categories.length, 1), 2) }}>
        {prerequisitesLoading ? (
          <SkeletonTable columns={6} rows={5} />
        ) : !categoriesAvailable || !staffId ? (
          <div className="accountant-leave-category-state">Leave categories are unavailable. Please retry using the error banner.</div>
        ) : !categories.length ? (
          <div className="accountant-leave-category-state">No active leave categories apply to your staff classification{staffType ? ` (${staffType})` : ""}.</div>
        ) : categoryCards.map(({ category, stats }, index) => (
          <div className="cms-stat" key={category.leaveCategoryId}>
            <div className={`cms-stat-icon tone-${["green", "blue", "amber", "violet"][index % 4]}`}><Calendar size={20} /></div>
            <div>
              <div className="cms-stat-label">{accountantLeaveCategoryLabel(category)}</div>
              <div className="cms-stat-value" title={stats.message}>{loading ? <Skeleton style={{ width: "100%", maxWidth: 180, height: 16 }} /> : stats.text}</div>
            </div>
          </div>
        ))}
      </div>

      {!loading && categories.length > 0 && (
        <p className="accountant-leave-balance-note" role="status">
          Values show approved days used / applicable category policy quota, not a verified individual employee allocation.
          {missingQuotas.length > 0 && ` Policy quotas are unavailable for: ${missingQuotas.join(", ")}.`}
          {!historyError && unknownUsage.length > 0 && ` Approved usage cannot be determined for: ${unknownUsage.join(", ")}.`}
        </p>
      )}
      {/* Leave Applications History Table Card */}
      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Leave Applications History</h2>
        </div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>Approver</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={9} />)
              ) : historyError ? (
                <tr><td colSpan="9" style={{ textAlign: "center", padding: 40 }}>Leave history unavailable. {historyError}</td></tr>
              ) : leaveList.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div className="accountant-empty-leave-state">
                      <Calendar size={32} style={{ color: "var(--cms-muted)", opacity: 0.7, marginBottom: 8 }} />
                      <h4>No Leave Applications Found</h4>
                      <p>
                        You have not submitted any leave applications yet. Click "+ Apply Leave" above to apply for casual, sick, or earned leave.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leaveList.map((l) => (
                  <tr key={l.staffLeaveRequestId || l.id}>
                    <td className="cms-strong">{getAccountantLeaveTypeLabel(l, policyCategories)}</td>
                    <td>{formatDate(l.startDate)}</td>
                    <td>{formatDate(l.endDate)}</td>
                    <td><strong>{l.totalDays}</strong></td>
                    <td style={{ maxWidth: 220, whiteSpace: "normal" }}>{l.reason || "--"}</td>
                    <td style={{ color: "var(--cms-muted)" }}>{formatDate(l.createdAt)}</td>
                    <td>
                      <span className={`cms-badge ${STATUS_BADGE[l.status] || "cms-badge-warn"}`}>
                        {l.status}
                      </span>
                    </td>
                    <td>{l.approvedByUserName || "--"}</td>
                    <td>
                      {l.status === "Pending" && l.staffLeaveRequestId ? (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 12, color: "var(--cms-red)" }}
                          disabled={cancelId !== null || leaveSubmitting}
                          onClick={() => handleCancelLeave(l)}
                        >
                          Cancel
                        </button>
                      ) : (
                        <span style={{ color: "var(--cms-muted)" }}>--</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showLeaveModal && typeof document !== "undefined" && createPortal(
        <div className="cms-overlay accountant-leave-modal-overlay" onClick={event => event.target === event.currentTarget && closeModal()}>
          <form className="cms-modal sm accountant-leave-modal" role="dialog" aria-modal="true" aria-labelledby="accountant-leave-modal-title" ref={modalRef} onSubmit={applyLeave}>
            <div className="cms-modal-head">
              <h3 id="accountant-leave-modal-title">Apply for Staff Leave</h3>
              <button type="button" className="cms-icon-btn" aria-label="Close" disabled={leaveSubmitting} onClick={closeModal}><X size={15} /></button>
            </div>
            <div className="cms-modal-body">
              {formError && <div className="accountant-leave-form-error" role="alert">{formError}</div>}
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label htmlFor="accountant-leave-type">Leave Type <span className="req">*</span></label>
                  <select id="accountant-leave-type" required value={leaveForm.categoryId} disabled={leaveSubmitting} onChange={e => setLeaveForm({ ...leaveForm, categoryId: e.target.value })}>
                    <option value="">Select leave type</option>
                    {categories.map(c => <option key={c.leaveCategoryId} value={c.leaveCategoryId}>{c.categoryName}{c.categoryCode ? ` (${c.categoryCode})` : ""}{c.annualQuota != null ? ` - ${c.annualQuota} days policy quota` : ""}</option>)}
                  </select>
                </div>
                <div className="cms-field">
                  <label htmlFor="accountant-leave-from">From Date <span className="req">*</span></label>
                  <input id="accountant-leave-from" type="date" required value={leaveForm.fromDate} disabled={leaveSubmitting} onChange={e => setLeaveForm({ ...leaveForm, fromDate: e.target.value })} />
                </div>
                <div className="cms-field">
                  <label htmlFor="accountant-leave-to">To Date <span className="req">*</span></label>
                  <input id="accountant-leave-to" type="date" required min={leaveForm.fromDate || undefined} value={leaveForm.toDate} disabled={leaveSubmitting} onChange={e => setLeaveForm({ ...leaveForm, toDate: e.target.value })} />
                </div>
                <div className="cms-field full">
                  <label htmlFor="accountant-leave-reason">Reason for Leave <span className="req">*</span></label>
                  <textarea id="accountant-leave-reason" rows={2} required placeholder="State reason clearly..." value={leaveForm.reason} disabled={leaveSubmitting} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                </div>
              </div>
              {selectedCategory?.requiresProof && <p className="accountant-leave-balance-note">Supporting proof is required by this policy. This form has no document-upload integration; arrange proof with your leave approver.</p>}
              {selectedCategory && accountantLeaveTypeForCategory(selectedCategory) === "Maternity" && <p className="accountant-leave-balance-note">Staff-type applicability does not confirm individual maternity eligibility. Eligibility remains subject to backend validation and leave approval.</p>}
            </div>
            <div className="cms-modal-foot">
              <button type="button" className="cms-btn cms-btn-ghost" disabled={leaveSubmitting} onClick={closeModal}>Cancel</button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={leaveSubmitting || prerequisitesLoading || !staffId || !categories.length}>{leaveSubmitting && <Loader2 size={14} className="accountant-leave-spin" style={{ marginRight: 6 }} />}Submit Leave</button>
            </div>
          </form>
        </div>, document.body
      )}
      {toast && <div role="status" className={`accountant-leave-toast ${toast.type === "error" ? "error" : ""}`}>{toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{toast.text}</div>}
    </div>
  );
}
