import React, { useState } from "react";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Upload,
  X,
  ShieldCheck,
  Send,
  Trash2,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

export default function NonTeachingLeave() {
  const [balances, setBalances] = useState(() => nonTeachingService.getLeaveBalances());
  const [history, setHistory] = useState(() => nonTeachingService.getLeaveHistory());
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: "Casual Leave (CL)",
    typeCode: 1,
    fromDate: "",
    toDate: "",
    reason: "",
    documentName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const calculatedDays =
    leaveForm.fromDate && leaveForm.toDate && new Date(leaveForm.toDate) >= new Date(leaveForm.fromDate)
      ? Math.floor((new Date(leaveForm.toDate) - new Date(leaveForm.fromDate)) / 86400000) + 1
      : 0;

  const handleApply = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      showToast("Please fill all required leave fields.");
      return;
    }
    if (calculatedDays <= 0) {
      showToast("End date must be on or after start date.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await nonTeachingService.applyForLeave({
        ...leaveForm,
        days: calculatedDays,
      });
      setHistory(nonTeachingService.getLeaveHistory());
      setShowApplyModal(false);
      setLeaveForm({
        type: "Casual Leave (CL)",
        typeCode: 1,
        fromDate: "",
        toDate: "",
        reason: "",
        documentName: "",
      });
      showToast(`Leave application #${created.id} submitted for Admin/HR review.`);
    } catch {
      showToast("Failed to submit leave. Saved locally.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = (id) => {
    if (window.confirm("Are you sure you want to withdraw this pending leave request?")) {
      const updated = nonTeachingService.cancelLeave(id);
      setHistory(updated);
      showToast("Leave request withdrawn.");
    }
  };

  return (
    <>
      {toastMessage && (
        <div className="cms-toast-banner cms-toast-success" role="alert" style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* Leave Balances Grid */}
      <section className="nts-kpi-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {balances.map((b) => (
          <div key={b.code} className={`nts-kpi nts-kpi-${b.tone}`}>
            <div className="nts-kpi-top">
              <div className="nts-kpi-icon"><CalendarDays size={18} /></div>
              <div className="nts-kpi-meta">
                <span className="nts-kpi-label">{b.type}</span>
                <span className="nts-kpi-val">{b.remaining} Days</span>
              </div>
            </div>
            <span className="nts-kpi-sub">Total Entitlement: {b.total} Days / Year</span>
          </div>
        ))}
      </section>

      {/* Actions and Policy Notice Strip */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="nts-refresh-btn"
            style={{ padding: "8px 16px" }}
            onClick={() => setShowApplyModal(true)}
          >
            <Plus size={15} /> Apply for Leave
          </button>
          <span style={{ fontSize: 12, color: "var(--nts-muted)" }}>
            * As per service rules, non-teaching staff leave requests require Administrative Officer & HR approval.
          </span>
        </div>
      </section>

      {/* Leave History Table Card */}
      <section className="nts-card">
        <div className="nts-card-head">
          <h3><Clock size={16} style={{ color: "var(--nts-primary)" }} /> My Leave Applications & History</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="nts-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Leave Type</th>
                <th>Date Range</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>Reviewer Remark</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((req) => {
                const normStatus = req.status.toLowerCase();
                return (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 700 }}>{req.id}</td>
                    <td>{req.type}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {req.fromDate} to {req.toDate}
                    </td>
                    <td><strong>{req.days} Day{req.days > 1 ? "s" : ""}</strong></td>
                    <td style={{ maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={req.reason}>
                      {req.reason}
                    </td>
                    <td style={{ color: "var(--nts-muted)", fontSize: 11.5 }}>{req.appliedDate}</td>
                    <td>
                      <span className={`nts-status-badge ${normStatus}`}>
                        {req.status === "Approved" && <CheckCircle2 size={12} />}
                        {req.status === "Pending" && <Clock size={12} />}
                        {req.status === "Rejected" && <XCircle size={12} />}
                        {req.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--nts-muted)", fontSize: 11.5 }}>{req.remark || req.reviewedBy}</td>
                    <td>
                      {req.status === "Pending" ? (
                        <button
                          type="button"
                          className="nts-action-btn"
                          style={{ padding: "3px 8px", fontSize: 11, color: "#dc2626" }}
                          onClick={() => handleCancelLeave(req.id)}
                          title="Withdraw this request"
                        >
                          <Trash2 size={12} /> Withdraw
                        </button>
                      ) : (
                        <span style={{ color: "var(--nts-muted)", fontSize: 11 }}>Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--nts-muted)" }}>
                    No leave applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="nts-modal-backdrop">
          <div className="nts-modal-container">
            <div className="nts-modal-head">
              <h3><CalendarDays size={16} /> Submit Leave Request</h3>
              <button
                type="button"
                className="nts-modal-close"
                onClick={() => setShowApplyModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleApply}>
              <div className="nts-modal-body">
                <div className="nts-form-group">
                  <label>Leave Type *</label>
                  <select
                    className="nts-form-control"
                    value={leaveForm.type}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const code = selected.includes("Casual") ? 1 : selected.includes("Sick") ? 2 : selected.includes("Earned") ? 5 : 1;
                      setLeaveForm({ ...leaveForm, type: selected, typeCode: code });
                    }}
                    required
                  >
                    <option value="Casual Leave (CL)">Casual Leave (CL) — 6 Available</option>
                    <option value="Sick Leave (SL)">Sick Leave (SL) — 5 Available</option>
                    <option value="Earned Leave (EL)">Earned Leave (EL) — 3 Available</option>
                    <option value="Compensatory Off (CO)">Compensatory Off (CO) — 1 Available</option>
                    <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                    <option value="On-Duty (OD) Leave">On-Duty (OD) / Special Official Duty</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="nts-form-group">
                    <label>From Date *</label>
                    <input
                      type="date"
                      className="nts-form-control"
                      value={leaveForm.fromDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="nts-form-group">
                    <label>To Date *</label>
                    <input
                      type="date"
                      className="nts-form-control"
                      value={leaveForm.toDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {calculatedDays > 0 && (
                  <div style={{ padding: "8px 12px", background: "var(--nts-subtle)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    Duration: <strong style={{ color: "var(--nts-primary)" }}>{calculatedDays} Working Day{calculatedDays > 1 ? "s" : ""}</strong>
                  </div>
                )}

                <div className="nts-form-group">
                  <label>Reason for Leave *</label>
                  <textarea
                    rows={3}
                    className="nts-form-control"
                    placeholder="Provide specific justification or reason for leave..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    required
                  />
                </div>

                <div className="nts-form-group">
                  <label>Supporting Document (Optional for Sick / Medical Leave)</label>
                  <input
                    type="file"
                    className="nts-form-control"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setLeaveForm({ ...leaveForm, documentName: file.name });
                    }}
                  />
                </div>
              </div>

              <div className="nts-modal-foot">
                <button
                  type="button"
                  className="nts-action-btn"
                  onClick={() => setShowApplyModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nts-punch-btn in"
                  disabled={submitting}
                >
                  <Send size={14} /> {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
