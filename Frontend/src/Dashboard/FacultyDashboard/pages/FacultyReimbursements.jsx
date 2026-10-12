import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Paperclip, Upload, Trash2, X, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/FacultyReimbursements.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import { getStoredClaims, submitReimbursementClaim } from "@/services/reimbursementService.js";
import { getAuthUser } from "@/features/authStorage.js";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";

const STATUS_BADGE = {
  Approved: "cms-badge-active",
  Active: "cms-badge-active",
  Pending: "cms-badge-warn",
  Rejected: "cms-badge-danger",
  Paid: "cms-badge-active",
};

export default function FacultyReimbursements() {
  const context = useFacultySafe();
  const authUser = getAuthUser() || {};
  const [reimbList, setReimbList] = useState(() => {
    const claims = getStoredClaims();
    return claims.map((c) => ({
      id: c.id,
      claimId: c.claimId,
      type: c.category,
      claimed: c.amount,
      approved: c.approvedAmount || (c.status === "Approved" || c.status === "Paid" ? c.amount : 0),
      date: c.expenseDate,
      status: c.status,
      proofName: c.proof?.name || "None",
    }));
  });

  const refreshClaims = useCallback(() => {
    const claims = getStoredClaims();
    setReimbList(
      claims.map((c) => ({
        id: c.id,
        claimId: c.claimId,
        type: c.category,
        claimed: c.amount,
        approved: c.approvedAmount || (c.status === "Approved" || c.status === "Paid" ? c.amount : 0),
        date: c.expenseDate,
        status: c.status,
        proofName: c.proof?.name || "None",
      }))
    );
  }, []);

  useEffect(() => {
    window.addEventListener("cms-reimbursements-updated", refreshClaims);
    return () => window.removeEventListener("cms-reimbursements-updated", refreshClaims);
  }, [refreshClaims]);

  const [showReimbModal, setShowReimbModal] = useState(false);
  const [reimbForm, setReimbForm] = useState({ type: "Teaching Materials", otherType: "", amount: "", desc: "", file: null });
  const [reimbSubmitting, setReimbSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const reimbFileInputRef = useRef(null);

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const submitReimbursement = async () => {
    if (!reimbForm.amount || !reimbForm.desc.trim()) {
      return notify("Please fill amount and description.", "error");
    }
    setReimbSubmitting(true);
    try {
      await submitReimbursementClaim({
        facultyId: authUser.staffId || authUser.id || "FAC-CURRENT",
        facultyName: authUser.fullName || authUser.name || "Faculty Member",
        department: authUser.department || "Academics",
        designation: authUser.designation || "Assistant Professor",
        email: authUser.email || "faculty@example.edu",
        category: reimbForm.type === "Other" ? (reimbForm.otherType?.trim() || "Other") : reimbForm.type,
        expenseDate: new Date().toISOString().split("T")[0],
        amount: reimbForm.amount,
        purpose: reimbForm.desc,
        notes: "Submitted via Faculty Portal",
        declaration: true,
        proof: reimbForm.file
          ? {
              name: reimbForm.file.name,
              size: reimbForm.file.size,
              type: reimbForm.file.type,
            }
          : null,
      });

      refreshClaims();
      setShowReimbModal(false);
      setReimbForm({ type: "Teaching Materials", otherType: "", amount: "", desc: "", file: null });
      notify("Expense claim submitted successfully! Track status in history.");
    } catch (err) {
      notify(err.message || "Failed to submit claim.", "error");
    } finally {
      setReimbSubmitting(false);
    }
  };

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Reimbursements</h1>
          <p>Submit and track expense claims with supporting bills or proof documents.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link to="/dashboard/reimbursement" className="cms-btn cms-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <img src={reimbursementIcon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> Comprehensive Claim Module
          </Link>
          <button className="cms-btn cms-btn-primary" onClick={() => setShowReimbModal(true)}>
            <Plus size={14} /> New Claim
          </button>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Type</th>
                <th>Claimed Amount</th>
                <th>Approved Amount</th>
                <th>Date</th>
                <th>Proof Document</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reimbList.map((r) => (
                <tr key={r.id}>
                  <td className="cms-strong">{r.claimId}</td>
                  <td>{r.type}</td>
                  <td>₹{Number(r.claimed || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>₹{Number(r.approved || 0).toLocaleString()}</td>
                  <td>{r.date}</td>
                  <td>
                    {r.proofName && r.proofName !== "None" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--cms-primary)" }}>
                        <Paperclip size={13} /> {r.proofName}
                      </span>
                    ) : (
                      <span style={{ color: "var(--cms-muted)", fontSize: 12 }}>None</span>
                    )}
                  </td>
                  <td><span className={`cms-badge ${STATUS_BADGE[r.status] || "cms-badge-warn"}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Claim Modal */}
      {showReimbModal && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setShowReimbModal(false)}>
          <div className="cms-modal sm faculty-reimbursement-modal">
            <div className="cms-modal-head">
              <h3>New Reimbursement Claim</h3>
              <button className="cms-icon-btn" onClick={() => setShowReimbModal(false)}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid faculty-reimbursement-form">
                <div className="cms-field">
                  <label>Claim Category <span className="req">*</span></label>
                  <select value={reimbForm.type} onChange={(e) => setReimbForm({ ...reimbForm, type: e.target.value })}>
                    {["Books & Journals", "Academic Conference", "Travel & Field Trip", "Medical Expense", "Stationery & Supplies", "Other"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                  {reimbForm.type === "Other" && (
                    <input
                      type="text"
                      style={{ marginTop: 6 }}
                      value={reimbForm.otherType || ""}
                      placeholder="Please specify category name..."
                      onChange={(e) => setReimbForm({ ...reimbForm, otherType: e.target.value })}
                      autoFocus
                    />
                  )}
                </div>
                <div className="cms-field">
                  <label>Amount (₹) <span className="req">*</span></label>
                  <input type="number" min={0} value={reimbForm.amount} placeholder="0" onChange={(e) => setReimbForm({ ...reimbForm, amount: e.target.value })} />
                </div>
                <div className="cms-field full">
                  <label>Proof / Receipt Attachment (Photo, Screenshot or PDF) <span className="req">*</span></label>
                  <div
                    className="sp-proof-upload-box"
                    onClick={() => reimbFileInputRef.current?.click()}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Upload size={17} color="var(--cms-primary)" />
                      <span style={{ fontSize: 13, color: reimbForm.file ? "var(--cms-text)" : "var(--cms-muted)" }}>
                        {reimbForm.file ? reimbForm.file.name : "Choose receipt image (PNG, JPG) or PDF file..."}
                      </span>
                    </div>
                    <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }}>
                      Browse File
                    </button>
                    <input
                      ref={reimbFileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setReimbForm((p) => ({ ...p, file }));
                      }}
                    />
                  </div>
                  {reimbForm.file && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="sp-proof-chip">
                        <Paperclip size={13} /> {reimbForm.file.name} ({(reimbForm.file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        className="cms-action-btn danger"
                        onClick={() => setReimbForm((p) => ({ ...p, file: null }))}
                        title="Remove file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="cms-field full">
                  <label>Description & Purpose <span className="req">*</span></label>
                  <textarea rows={2} value={reimbForm.desc} placeholder="Detail the expenditure..." onChange={(e) => setReimbForm({ ...reimbForm, desc: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setShowReimbModal(false)}>Cancel</button>
              <button className="cms-btn cms-btn-primary" onClick={submitReimbursement} disabled={reimbSubmitting}>
                {reimbSubmitting ? <Loader2 size={14} className="spin" /> : null} Submit Claim
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
