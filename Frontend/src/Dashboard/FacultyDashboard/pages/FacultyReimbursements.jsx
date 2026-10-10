import React, { useState, useEffect, useRef } from "react";
import { Plus, Paperclip, Upload, Trash2, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import "../styles/FacultyReimbursements.css";

import { useFacultySafe } from "../FacultyContext.jsx";
import { reimbursementApi } from "../../../api/reimbursementApi";

const STATUS_BADGE = {
  Approved: "cms-badge-active",
  AccountantApproved: "cms-badge-active",
  AdminVerified: "cms-badge-info",
  Paid: "cms-badge-success",
  Pending: "cms-badge-warn",
  Rejected: "cms-badge-danger",
};

export default function FacultyReimbursements() {
  const context = useFacultySafe();
  const [reimbList, setReimbList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReimbModal, setShowReimbModal] = useState(false);
  const [reimbForm, setReimbForm] = useState({ type: "Books & Journals", amount: "", desc: "", file: null });
  const [reimbSubmitting, setReimbSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const reimbFileInputRef = useRef(null);

  const staffId = context?.profileData?.facultyId || 0; // The FacultyContext maps it to facultyId

  useEffect(() => {
    fetchReimbursements();
  }, [staffId]);

  const fetchReimbursements = async () => {
    if (!staffId) return;
    try {
      setLoading(true);
      // Fetch reimbursements specific to this staff member
      const res = await reimbursementApi.getAllReimbursements({ staffId });
      if (res.data?.status) {
        setReimbList(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch reimbursements", error);
      notify("Failed to load reimbursements", "error");
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

  const submitReimbursement = async () => {
    if (!reimbForm.amount || !reimbForm.desc.trim()) {
      return notify("Please fill amount and description.", "error");
    }
    setReimbSubmitting(true);
    try {
      const payload = {
        staffId: staffId,
        claimCategory: reimbForm.type,
        claimedAmount: Number(reimbForm.amount),
        description: reimbForm.desc,
        campusId: context?.profileData?.campusId || 1
      };

      const res = await reimbursementApi.createReimbursement(payload);
      if (res.data?.status) {
        const newClaim = res.data.data;
        
        // Upload proof if file is selected
        if (reimbForm.file) {
          try {
            await reimbursementApi.uploadProofDocument(newClaim.id, reimbForm.file);
          } catch (uploadErr) {
            console.error("Failed to upload proof", uploadErr);
            notify("Claim created, but proof upload failed.", "error");
          }
        }
        
        notify("Expense claim submitted successfully!");
        setShowReimbModal(false);
        setReimbForm({ type: "Books & Journals", amount: "", desc: "", file: null });
        fetchReimbursements(); // Refresh list

        // Notify Admin tabs
        const channel = new BroadcastChannel("cms_notifications");
        channel.postMessage({ type: "NEW_REIMBURSEMENT" });
        setTimeout(() => channel.close(), 100);
      }
    } catch (error) {
      console.error("Failed to submit claim", error);
      notify(error.response?.data?.message || "Failed to submit claim", "error");
    } finally {
      setReimbSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB");
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
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    <Loader2 size={24} className="spin" style={{ margin: "0 auto", color: "var(--cms-primary)" }} />
                  </td>
                </tr>
              ) : reimbList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "var(--cms-muted)" }}>
                    No reimbursements found.
                  </td>
                </tr>
              ) : (
                reimbList.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-strong">{r.claimNumber}</td>
                    <td>{r.claimCategory}</td>
                    <td>₹{Number(r.claimedAmount || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>
                      {r.approvedAmount !== null ? `₹${Number(r.approvedAmount).toLocaleString()}` : "-"}
                    </td>
                    <td>{formatDate(r.submittedAt)}</td>
                    <td>
                      {r.proofDocumentPath ? (
                        <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5167"}${r.proofDocumentPath}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--cms-primary)", textDecoration: "none" }}>
                          <Paperclip size={13} /> View Proof
                        </a>
                      ) : (
                        <span style={{ color: "var(--cms-muted)", fontSize: 12 }}>None</span>
                      )}
                    </td>
                    <td><span className={`cms-badge ${STATUS_BADGE[r.status] || "cms-badge-warn"}`}>{r.status}</span></td>
                  </tr>
                ))
              )}
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
