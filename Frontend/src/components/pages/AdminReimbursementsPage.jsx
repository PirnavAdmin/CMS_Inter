import React, { useState, useEffect } from "react";
import { Check, X, Search, FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import { reimbursementApi } from "@/api/staffApi";
import DashboardLayout from "../layout/DashboardLayout";
import "../../cms.css";

export default function AdminReimbursementsPage() {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [toast, setToast] = useState(null);

  const [verifyModal, setVerifyModal] = useState({ show: false, claim: null, amount: "", notes: "", isReject: false });

  useEffect(() => {
    fetchClaims();
  }, [filter]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await reimbursementApi.getAllReimbursements({ status: filter !== "All" ? filter : "" });
      if (res.data?.status) {
        setReimbursements(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load claims", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleVerify = async () => {
    try {
      const { claim, amount, notes, isReject } = verifyModal;
      if (isReject) {
        if (!notes) return showToast("Rejection notes are required.", "error");
        await reimbursementApi.rejectReimbursement(claim.id, { rejectNotes: notes });
        showToast("Claim rejected successfully.");
      } else {
        if (amount === "" || amount < 0) return showToast("Valid approved amount is required.", "error");
        await reimbursementApi.verifyReimbursement(claim.id, { approvedAmount: Number(amount), adminNotes: notes });
        showToast("Claim verified successfully.");
      }
      setVerifyModal({ show: false, claim: null, amount: "", notes: "", isReject: false });
      fetchClaims();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Action failed.", "error");
    }
  };

  return (
    <DashboardLayout title="Staff Reimbursements" subtitle="Verify and approve expense claims submitted by staff members." breadcrumb={["Staff", "Staff Reimbursements"]}>
      <div className="cms-page" style={{ paddingTop: 0 }}>

      <div className="cms-card">
        <div className="cms-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {["Pending", "AdminVerified", "AccountantApproved", "Paid", "Rejected", "All"].map(status => (
              <button 
                key={status} 
                className={`cms-btn ${filter === status ? "cms-btn-primary" : "cms-btn-ghost"}`} 
                onClick={() => setFilter(status)}
              >
                {status.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
          </div>
        </div>

        <div className="cms-table-wrap staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Staff Name</th>
                <th>Category</th>
                <th>Claimed</th>
                <th>Approved</th>
                <th>Date</th>
                <th>Proof</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>Loading claims...</td>
                </tr>
              ) : reimbursements.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "20px", color: "var(--cms-muted)" }}>
                    No claims found for this status.
                  </td>
                </tr>
              ) : (
                reimbursements.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-strong">{r.claimNumber}</td>
                    <td>Staff ID: {r.staffId}</td>
                    <td>{r.claimCategory}</td>
                    <td>₹{Number(r.claimedAmount).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>
                      {r.approvedAmount !== null ? `₹${Number(r.approvedAmount).toLocaleString()}` : "-"}
                    </td>
                    <td>{new Date(r.submittedAt).toLocaleDateString()}</td>
                    <td>
                      {r.proofDocumentPath ? (
                        <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5167"}${r.proofDocumentPath}`} target="_blank" rel="noreferrer" className="cms-link">
                          View
                        </a>
                      ) : "-"}
                    </td>
                    <td><span className={`cms-badge cms-badge-${r.status.toLowerCase().includes('reject') ? 'danger' : r.status.includes('Pending') ? 'warn' : 'success'}`}>{r.status.replace(/([A-Z])/g, ' $1').trim()}</span></td>
                    <td>
                      {r.status === "Pending" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="cms-action-btn primary"
                            title="Verify"
                            onClick={() => setVerifyModal({ show: true, claim: r, amount: r.claimedAmount, notes: "", isReject: false })}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="cms-action-btn danger"
                            title="Reject"
                            onClick={() => setVerifyModal({ show: true, claim: r, amount: "", notes: "", isReject: true })}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {verifyModal.show && (
        <div className="cms-overlay">
          <div className="cms-modal sm">
            <div className="cms-modal-head">
              <h3>{verifyModal.isReject ? "Reject Claim" : "Verify Claim"}</h3>
              <button className="cms-icon-btn" onClick={() => setVerifyModal({ show: false, claim: null, amount: "", notes: "", isReject: false })}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label>Claim Number</label>
                  <input type="text" value={verifyModal.claim?.claimNumber} disabled />
                </div>
                {!verifyModal.isReject && (
                  <div className="cms-field full">
                    <label>Approved Amount (₹) <span className="req">*</span></label>
                    <input 
                      type="number" 
                      value={verifyModal.amount} 
                      onChange={(e) => setVerifyModal({ ...verifyModal, amount: e.target.value })} 
                    />
                  </div>
                )}
                <div className="cms-field full">
                  <label>{verifyModal.isReject ? "Rejection Reason" : "Verification Notes"} {verifyModal.isReject && <span className="req">*</span>}</label>
                  <textarea 
                    rows={3} 
                    value={verifyModal.notes} 
                    onChange={(e) => setVerifyModal({ ...verifyModal, notes: e.target.value })} 
                    placeholder={verifyModal.isReject ? "Reason for rejection..." : "Optional notes..."}
                  />
                </div>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setVerifyModal({ show: false, claim: null, amount: "", notes: "", isReject: false })}>Cancel</button>
              <button className={`cms-btn ${verifyModal.isReject ? "cms-btn-danger" : "cms-btn-primary"}`} onClick={handleVerify}>
                {verifyModal.isReject ? "Reject" : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`} style={{ position: "fixed", bottom: 20, right: 20, padding: "10px 20px", background: toast.type === "error" ? "#fef2f2" : "#f0fdf4", color: toast.type === "error" ? "#dc2626" : "#16a34a", border: `1px solid ${toast.type === "error" ? "#f87171" : "#86efac"}`, borderRadius: 8, display: "flex", gap: 10, alignItems: "center", zIndex: 9999, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.text}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
