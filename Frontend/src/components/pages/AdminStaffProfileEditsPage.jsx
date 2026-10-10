import React, { useState, useEffect } from "react";
import { Check, X, User, CheckCircle, AlertCircle } from "lucide-react";
import { staffProfileEditApi } from "../../api/staffProfileEditApi";
import DashboardLayout from "../layout/DashboardLayout";
import "../../cms.css";

export default function AdminStaffProfileEditsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await staffProfileEditApi.getAllRequests();
      if (res.data?.status) {
        let allReqs = res.data.data || [];
        if (filter === "Pending") {
          allReqs = allReqs.filter(r => r.status === "Requested" || r.status === "SubmittedForReview");
        } else if (filter === "Allowed") {
          allReqs = allReqs.filter(r => r.status === "Allowed");
        } else if (filter === "Approved") {
          allReqs = allReqs.filter(r => r.status === "Approved");
        }
        setRequests(allReqs);
      }
    } catch (error) {
      console.error("Failed to load requests", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleGrantAccess = async (id) => {
    try {
      await staffProfileEditApi.grantProfileEdit(id);
      showToast("Edit access granted successfully.");
      fetchRequests();
    } catch (e) {
      showToast("Failed to grant access.", "error");
    }
  };

  const handleApproveChanges = async (id) => {
    try {
      await staffProfileEditApi.approveProfileEdit(id);
      showToast("Profile updates approved successfully.");
      fetchRequests();
    } catch (e) {
      showToast("Failed to approve updates.", "error");
    }
  };

  return (
    <DashboardLayout title="Staff Profile Edit Requests" breadcrumb={["Staff", "Staff Profile Edits"]}>
      <div className="cms-page">
      <div className="cms-page-head">
        <div className="cms-page-heading">
          <User size={24} className="cms-page-icon" />
          <div>
            <h1>Staff Profile Edit Requests</h1>
            <p>Manage staff requests to update their personal information.</p>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {["Pending", "Allowed", "Approved", "All"].map(status => (
              <button 
                key={status} 
                className={`cms-btn ${filter === status ? "cms-btn-primary" : "cms-btn-ghost"}`} 
                onClick={() => setFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Staff Name</th>
                <th>Reason</th>
                <th>Requested Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>Loading requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "var(--cms-muted)" }}>
                    No requests found for this status.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-strong">REQ-{r.id}</td>
                    <td>{r.staffName} (ID: {r.staffId})</td>
                    <td>{r.requestReason || "-"}</td>
                    <td>{new Date(r.requestedAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`cms-badge cms-badge-${r.status === 'Approved' ? 'success' : r.status === 'Allowed' ? 'info' : 'warn'}`}>
                        {r.status.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {r.status === "Requested" && (
                          <button
                            className="cms-action-btn primary"
                            title="Grant Edit Access"
                            onClick={() => handleGrantAccess(r.id)}
                          >
                            <Check size={14} /> Grant Access
                          </button>
                        )}
                        {r.status === "SubmittedForReview" && (
                          <button
                            className="cms-action-btn success"
                            title="Approve Profile Updates"
                            onClick={() => handleApproveChanges(r.id)}
                          >
                            <Check size={14} /> Approve Changes
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
