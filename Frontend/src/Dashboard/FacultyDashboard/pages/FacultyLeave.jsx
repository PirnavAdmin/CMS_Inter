import React, { useState } from "react";
import { Plus, Calendar, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import "../styles/FacultyLeave.css";
import { facultyMockData } from "../data/facultyMockData.js";

const STATUS_BADGE = {
  Approved: "cms-badge-active",
  Active: "cms-badge-active",
  Pending: "cms-badge-warn",
  Rejected: "cms-badge-danger",
  Cancelled: "cms-badge-inactive",
};

export default function FacultyLeave() {
  const [leaveList, setLeaveList] = useState(facultyMockData.leaveRequests);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: "Casual Leave (CL)",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [leaveCategories] = useState([
    { code: "CL", name: "Casual Leave (CL)" },
    { code: "SL", name: "Sick Leave (SL)" },
    { code: "EL", name: "Earned Leave (EL)" },
    { code: "OD", name: "On-Duty (OD) / Academic Duty" },
    { code: "ML", name: "Maternity / Paternity Leave" },
    { code: "CO", name: "Compensatory Off (CO)" },
  ]);

  const notify = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const leavePreviewDays =
    leaveForm.fromDate && leaveForm.toDate && new Date(leaveForm.toDate) >= new Date(leaveForm.fromDate)
      ? Math.floor((new Date(leaveForm.toDate) - new Date(leaveForm.fromDate)) / 86400000) + 1
      : 0;

  const affectedClassCount = (() => {
    if (!leavePreviewDays) return 0;
    let count = 0;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let offset = 0; offset < leavePreviewDays; offset++) {
      const date = new Date(leaveForm.fromDate);
      date.setDate(date.getDate() + offset);
      count += facultyMockData.timetable.filter((slot) => slot[dayNames[date.getDay()]]).length;
    }
    return count;
  })();

  const applyLeave = async () => {
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      return notify("Please complete all required fields.", "error");
    }
    setLeaveSubmitting(true);
    const start = new Date(leaveForm.fromDate), end = new Date(leaveForm.toDate);
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const newLeave = {
      id: Date.now(),
      type: leaveForm.type,
      fromDate: leaveForm.fromDate,
      toDate: leaveForm.toDate,
      totalDays: days,
      reason: leaveForm.reason,
      appliedOn: new Date().toLocaleDateString("en-GB"),
      status: "Pending",
      approvedBy: "Principal Office",
    };
    setLeaveList((items) => [newLeave, ...items]);
    setShowLeaveModal(false);
    setLeaveForm({ type: "Casual Leave (CL)", fromDate: "", toDate: "", reason: "" });
    setLeaveSubmitting(false);
    notify("Leave application submitted successfully!");
  };

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Leave Management</h1>
          <p>Apply for casual, sick, or earned leave and track approval status.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setShowLeaveModal(true)}>
          <Plus size={14} /> Apply Leave
        </button>
      </div>

      {/* Leave Balances Strip */}
      <div className="sp-stat-grid" style={{ marginBottom: 16 }}>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">Casual Leave (CL)</div><div className="cms-stat-value">8 / 12 Days</div></div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-blue"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">Sick Leave (SL)</div><div className="cms-stat-value">7 / 10 Days</div></div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-amber"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">Earned Leave (EL)</div><div className="cms-stat-value">15 / 15 Days</div></div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-violet"><Calendar size={20} /></div>
          <div><div className="cms-stat-label">On-Duty (OD)</div><div className="cms-stat-value">6 / 8 Days</div></div>
        </div>
      </div>

      {/* History Table */}
      <div className="cms-card">
        <div className="cms-card-head"><h2>Leave Applications History</h2></div>
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
              {leaveList.map((l) => (
                <tr key={l.id}>
                  <td className="cms-strong">{l.type}</td>
                  <td>{l.fromDate}</td>
                  <td>{l.toDate}</td>
                  <td><strong>{l.totalDays}</strong></td>
                  <td>{l.reason}</td>
                  <td style={{ color: "var(--cms-muted)" }}>{l.appliedOn}</td>
                  <td><span className={`cms-badge ${STATUS_BADGE[l.status] || "cms-badge-warn"}`}>{l.status}</span></td>
                  <td>{l.approvedBy}</td>
                  <td>
                    {l.status === "Pending" ? (
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        onClick={() =>
                          setLeaveList((items) =>
                            items.map((item) => (item.id === l.id ? { ...item, status: "Cancelled" } : item))
                          )
                        }
                      >
                        Cancel
                      </button>
                    ) : (
                      <span style={{ color: "var(--cms-muted)" }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setShowLeaveModal(false)}>
          <div className="cms-modal sm">
            <div className="cms-modal-head">
              <h3>Apply for Staff Leave</h3>
              <button className="cms-icon-btn" onClick={() => setShowLeaveModal(false)}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label>Leave Type <span className="req">*</span></label>
                  <select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                    {leaveCategories.map((c) => (
                      <option key={c.code || c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="cms-field">
                  <label>From Date <span className="req">*</span></label>
                  <input type="date" value={leaveForm.fromDate} onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })} />
                </div>
                <div className="cms-field">
                  <label>To Date <span className="req">*</span></label>
                  <input type="date" value={leaveForm.toDate} onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })} />
                </div>
                <div className="cms-field full">
                  <label>Reason for Leave <span className="req">*</span></label>
                  <textarea rows={3} value={leaveForm.reason} placeholder="State reason clearly..." onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                </div>
              </div>
              {leavePreviewDays > 0 && (
                <p style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 12 }}>
                  Calculated leave: {leavePreviewDays} day(s) · Affected timetable classes: {affectedClassCount}
                </p>
              )}
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button className="cms-btn cms-btn-primary" onClick={applyLeave} disabled={leaveSubmitting}>
                {leaveSubmitting ? <Loader2 size={14} className="spin" /> : null} Submit Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

