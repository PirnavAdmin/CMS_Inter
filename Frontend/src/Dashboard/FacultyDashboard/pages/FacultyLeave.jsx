import React, { useState, useEffect } from "react";
import { Plus, Calendar, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import "../styles/FacultyLeave.css";

import { useFacultySafe } from "../FacultyContext.jsx";
import { leaveApi } from "../../../api/leaveApi";

const STATUS_BADGE = {
  Approved: "cms-badge-active",
  Active: "cms-badge-active",
  Pending: "cms-badge-warn",
  Rejected: "cms-badge-danger",
  Cancelled: "cms-badge-inactive",
};

export default function FacultyLeave() {
  const context = useFacultySafe();
  const [leaveList, setLeaveList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 1, // 1 for CasualLeave
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Mapped to backend enum LeaveType: CasualLeave = 1, SickLeave = 2, EarnedLeave = 5, DutyLeave = 7, MaternityLeave = 3, CompensatoryOff = 6
  const [leaveCategories] = useState([
    { code: 1, name: "Casual Leave (CL)" },
    { code: 2, name: "Sick Leave (SL)" },
    { code: 5, name: "Earned Leave (EL)" },
    { code: 7, name: "On-Duty (OD) / Academic Duty" },
    { code: 3, name: "Maternity / Paternity Leave" },
    { code: 6, name: "Compensatory Off (CO)" },
  ]);

  const staffId = context?.profileData?.facultyId || 0;

  useEffect(() => {
    fetchLeaveHistory();
  }, [staffId]);

  const fetchLeaveHistory = async () => {
    if (!staffId) return;
    try {
      setLoading(true);
      const res = await leaveApi.getLeaveHistory(staffId);
      if (res.data?.status) {
        setLeaveList(res.data.data?.history || []);
      }
    } catch (error) {
      console.error("Failed to load leave history", error);
    } finally {
      setLoading(false);
    }
  };

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const leavePreviewDays =
    leaveForm.fromDate && leaveForm.toDate && new Date(leaveForm.toDate) >= new Date(leaveForm.fromDate)
      ? Math.floor((new Date(leaveForm.toDate) - new Date(leaveForm.fromDate)) / 86400000) + 1
      : 0;

  const applyLeave = async () => {
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      return notify("Please complete all required fields.", "error");
    }
    setLeaveSubmitting(true);
    try {
      const payload = {
        staffId: staffId,
        leaveType: Number(leaveForm.type),
        startDate: leaveForm.fromDate,
        endDate: leaveForm.toDate,
        reason: leaveForm.reason,
        departmentId: context?.profileData?.departmentId || null,
        academicYearId: 1 // Default or dynamically fetched
      };

      const res = await leaveApi.createLeave(payload);
      if (res.data?.status) {
        notify("Leave application submitted successfully!");
        setShowLeaveModal(false);
        setLeaveForm({ type: 1, fromDate: "", toDate: "", reason: "" });
        fetchLeaveHistory();
      }
    } catch (error) {
      console.error("Failed to apply for leave", error);
      notify(error.response?.data?.message || "Failed to apply for leave", "error");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB");
  };

  const getLeaveTypeName = (enumVal) => {
    const found = leaveCategories.find(c => c.code === enumVal || c.name === enumVal);
    if (found) return found.name;
    // Fallbacks if backend sends string
    if (enumVal === "CasualLeave") return "Casual Leave (CL)";
    if (enumVal === "SickLeave") return "Sick Leave (SL)";
    if (enumVal === "EarnedLeave") return "Earned Leave (EL)";
    return enumVal;
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
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                    <Loader2 size={24} className="spin" style={{ margin: "0 auto", color: "var(--cms-primary)" }} />
                  </td>
                </tr>
              ) : leaveList.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "20px", color: "var(--cms-muted)" }}>
                    No leave history found.
                  </td>
                </tr>
              ) : (
                leaveList.map((l) => (
                  <tr key={l.staffLeaveRequestId || l.id}>
                    <td className="cms-strong">{getLeaveTypeName(l.leaveType)}</td>
                    <td>{formatDate(l.startDate)}</td>
                    <td>{formatDate(l.endDate)}</td>
                    <td><strong>{l.totalDays}</strong></td>
                    <td>{l.reason}</td>
                    <td style={{ color: "var(--cms-muted)" }}>{formatDate(l.createdAt)}</td>
                    <td><span className={`cms-badge ${STATUS_BADGE[l.status] || "cms-badge-warn"}`}>{l.status}</span></td>
                    <td>{l.approvedByUserName || "--"}</td>
                    <td>
                      {l.status === "Pending" ? (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => {
                            // Cancel functionality can be integrated later via actionLeave api
                            notify("Cancel feature is not implemented fully yet.", "error");
                          }}
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
                      <option key={c.code} value={c.code}>{c.name}</option>
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
                  Calculated leave: {leavePreviewDays} day(s)
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
