import React, { useState, useRef } from "react";
import { Plus, Paperclip, Upload, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import "../styles/FacultyReimbursements.css";
import { MOCK_REIMB } from "../data/facultyMockData.js";

const STATUS_BADGE = {
  Approved: "cms-badge-active",
  Active: "cms-badge-active",
  Pending: "cms-badge-warn",
  Rejected: "cms-badge-danger",
};

export default function FacultyReimbursements() {
  const [reimbList, setReimbList] = useState(MOCK_REIMB);
  const [showReimbModal, setShowReimbModal] = useState(false);
  const [reimbForm, setReimbForm] = useState({ type: "Books & Journals", amount: "", desc: "", file: null });
  const [reimbSubmitting, setReimbSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const reimbFileInputRef = useRef(null);

  const notify = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const submitReimbursement = () => {
    if (!reimbForm.amount || !reimbForm.desc.trim()) {
      return notify("Please fill amount and description.", "error");
    }
    setReimbSubmitting(true);
    setTimeout(() => {
      const item = {
        id: Date.now(),
        claimId: `CLM${Date.now().toString().slice(-6)}`,
        type: reimbForm.type,
        claimed: Number(reimbForm.amount),
        approved: 0,
        date: new Date().toLocaleDateString("en-GB"),
        status: "Pending",
        proofName: reimbForm.file?.name || "None",
      };
      setReimbList((p) => [item, ...p]);
      setShowReimbModal(false);
      setReimbForm({ type: "Books & Journals", amount: "", desc: "", file: null });
      notify("Expense claim submitted with proof attachment!");
      setReimbSubmitting(false);
    }, 600);
  };

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Reimbursements</h1>
          <p>Submit and track expense claims with supporting bills or proof documents.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setShowReimbModal(true)}>
          <Plus size={14} /> New Claim
        </button>
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
