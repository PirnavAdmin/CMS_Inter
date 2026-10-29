import { useTransportNavigation, useTransportRouteValue } from "../TransportManagerContext.jsx";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Calendar, X, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import "@/modules/faculty/styles/FacultyLeave.css";
import "../styles/TransportManagerLeave.css";
import { useTransportManagerSafe } from "../TransportManagerContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { getAuthUser, getAuthToken } from "@/modules/auth/authStorage.js";

const STATUS_BADGE = {
  Approved: "cms-badge-active",
  Active: "cms-badge-active",
  Pending: "cms-badge-warn",
  Rejected: "cms-badge-danger",
  Cancelled: "cms-badge-inactive",
};

export default function TransportManagerLeave() {
  const navigation = useTransportNavigation();
  const tmContext = useTransportManagerSafe();
  const profileData = useMemo(() => tmContext?.profile || {}, [tmContext?.profile]);
  const academicCtx = useAcademicContext?.() || {};
  const selectedAcademicYearId = academicCtx.selectedAcademicYearId;
  const selectedCampusId = academicCtx.selectedCampusId;

  const [leaveList, setLeaveList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorySummary, setCategorySummary] = useState(null);
  const [staffBalance, setStaffBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useTransportRouteValue(navigation, "apply", false);
  const [leaveForm, setLeaveForm] = useState({
    categoryId: "1",
    customLeaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    if (tmContext?.showToast) {
      tmContext.showToast(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const effectiveStaffId = useMemo(() => {
    if (profileData?.staffId && Number(profileData.staffId) > 0) {
      return Number(profileData.staffId);
    }
    const token = getAuthToken();
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const decoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          const s = Number(decoded?.StaffId || decoded?.staffId || decoded?.staff_id);
          if (s > 0) return s;
        }
      } catch (err) {
        void err;
      }
    }
    const a = getAuthUser();
    const id = Number(
      profileData?.staffId ||
      a?.staffId ||
      profileData?.id ||
      a?.id ||
      1125
    );
    return id > 0 ? id : 1125;
  }, [profileData]);

  const effectiveDepartmentId = useMemo(() => {
    const a = getAuthUser();
    return Number(profileData?.departmentId || a?.departmentId || 79);
  }, [profileData?.departmentId]);

  const effectiveCampusId = useMemo(() => {
    const a = getAuthUser();
    return Number(selectedCampusId || profileData?.campusId || a?.campusId || 1);
  }, [selectedCampusId, profileData?.campusId]);

  const effectiveAcademicYearId = useMemo(() => {
    return Number(selectedAcademicYearId || 1);
  }, [selectedAcademicYearId]);

  const fetchLeaveData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const [catRes, sumRes] = await Promise.allSettled([
          apiClient.get("/api/v1/leave-categories"),
          apiClient.get("/api/v1/leave-categories/summary"),
        ]);

        if (catRes.status === "fulfilled") {
          const catList = catRes.value?.data?.data || catRes.value?.data?.Data || catRes.value?.data || [];
          if (Array.isArray(catList) && catList.length > 0) {
            setCategories(catList);
            setLeaveForm((prev) => ({
              ...prev,
              categoryId: prev.categoryId || catList[0]?.leaveCategoryId || "1",
            }));
          }
        }

        if (sumRes.status === "fulfilled") {
          const sumData = sumRes.value?.data?.data || sumRes.value?.data?.Data || sumRes.value?.data;
          if (sumData) {
            setCategorySummary(sumData);
          }
        }
      } catch (catErr) {
        console.warn("Could not load backend leave categories:", catErr);
      }

      let leaves = [];
      let balanceObj = null;

      try {
        let histRes;
        try {
          histRes = await apiClient.get("/api/v1/staff-attendance/leave/my-history");
        } catch {
          histRes = await apiClient.get(
            `/api/v1/staff-attendance/leave/history/staff/${effectiveStaffId}`
          );
        }
        const histData = histRes?.data?.data || histRes?.data?.Data || histRes?.data;
        if (histData) {
          balanceObj = histData.balance || null;
          if (Array.isArray(histData.history)) {
            leaves = histData.history;
          } else if (Array.isArray(histData)) {
            leaves = histData;
          } else if (Array.isArray(histData.items)) {
            leaves = histData.items;
          }
        }
      } catch (histErr) {
        console.warn("Could not fetch staff leave history:", histErr);
      }

      // Fallback to /api/v1/staff-attendance/leave?staffId=... if history is empty
      if (leaves.length === 0) {
        try {
          const leaveRes = await apiClient.get("/api/v1/staff-attendance/leave", {
            params: { staffId: effectiveStaffId, campusId: effectiveCampusId },
          });
          const leaveData = leaveRes?.data?.data || leaveRes?.data?.Data || leaveRes?.data;
          if (Array.isArray(leaveData) && leaveData.length > 0) {
            leaves = leaveData;
          }
        } catch (leaveErr) {
          console.warn("Could not fetch leaves list:", leaveErr);
        }
      }

      leaves.sort((a, b) => {
        const dateA = new Date(a.startDate || a.createdAt || 0);
        const dateB = new Date(b.startDate || b.createdAt || 0);
        return dateB - dateA;
      });

      setLeaveList(leaves);
      if (balanceObj) setStaffBalance(balanceObj);
    } catch (err) {
      console.warn("Error fetching leave details:", err);
      setError(getApiErrorMessage(err) || "Failed to load leave records.");
    } finally {
      setLoading(false);
    }
  }, [effectiveStaffId, effectiveCampusId]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const casualStats = useMemo(() => {
    const used = leaveList
      .filter((l) => (l.leaveType || l.leaveCategoryName || "").toLowerCase().includes("casual") && l.status === "Approved")
      .reduce((acc, curr) => acc + (Number(curr.totalDays) || 1), 0);
    return {
      used,
      max: 12,
      text: `${used} / 12 Days`,
    };
  }, [leaveList]);

  const sickStats = useMemo(() => {
    const used = leaveList
      .filter((l) => (l.leaveType || l.leaveCategoryName || "").toLowerCase().includes("sick") && l.status === "Approved")
      .reduce((acc, curr) => acc + (Number(curr.totalDays) || 1), 0);
    return {
      used,
      max: 10,
      text: `${used} / 10 Days`,
    };
  }, [leaveList]);

  const earnedStats = useMemo(() => {
    const used = leaveList
      .filter((l) => (l.leaveType || l.leaveCategoryName || "").toLowerCase().includes("earned") && l.status === "Approved")
      .reduce((acc, curr) => acc + (Number(curr.totalDays) || 1), 0);
    return {
      used,
      max: 15,
      text: `${used} / 15 Days`,
    };
  }, [leaveList]);

  const onDutyStats = useMemo(() => {
    const used = leaveList
      .filter((l) => (l.leaveType || l.leaveCategoryName || "").toLowerCase().includes("duty") && l.status === "Approved")
      .reduce((acc, curr) => acc + (Number(curr.totalDays) || 1), 0);
    return {
      used,
      max: 8,
      text: `${used} / 8 Days`,
    };
  }, [leaveList]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate) {
      notify("Please select both from and to dates.", "error");
      return;
    }
    if (new Date(leaveForm.toDate) < new Date(leaveForm.fromDate)) {
      notify("To date cannot be before from date.", "error");
      return;
    }
    if (!leaveForm.reason.trim()) {
      notify("Please enter a reason for leave.", "error");
      return;
    }

    setLeaveSubmitting(true);
    try {
      const selectedCat = categories.find(
        (c) => String(c.leaveCategoryId) === String(leaveForm.categoryId)
      );
      const catCode = (selectedCat?.categoryCode || "").trim().toUpperCase();
      const catName = (selectedCat?.categoryName || "").trim().toLowerCase();
      let targetLeaveType = "Casual";
      if (catCode === "SL" || catName.includes("sick") || catName.includes("medical")) {
        targetLeaveType = "Sick";
      } else if (catCode === "EL" || catName.includes("earned") || catName.includes("privilege")) {
        targetLeaveType = "Earned";
      } else if (catCode === "CL" || catName.includes("casual")) {
        targetLeaveType = "Casual";
      } else {
        targetLeaveType = "Other";
      }

      const payload = {
        staffId: effectiveStaffId,
        leaveType: targetLeaveType,
        leaveCategoryId: Number(leaveForm.categoryId || 1),
        startDate: new Date(leaveForm.fromDate).toISOString(),
        endDate: new Date(leaveForm.toDate).toISOString(),
        reason: leaveForm.reason.trim(),
        departmentId: effectiveDepartmentId,
        academicYearId: effectiveAcademicYearId,
      };

      const res = await apiClient.post("/api/v1/staff-attendance/leave", payload);
      if (res.data?.status || res.status === 200 || res.status === 201) {
        notify("Leave application submitted successfully!");
        setShowLeaveModal(false);
        setLeaveForm({
          categoryId: categories[0]?.leaveCategoryId || "1",
          customLeaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
        });
        fetchLeaveData();
      } else {
        notify(res.data?.message || "Failed to submit leave application.", "error");
      }
    } catch (err) {
      console.error("Failed to apply for leave:", err);
      notify(getApiErrorMessage(err) || "Failed to apply for leave.", "error");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleCancelLeave = async (leave) => {
    const leaveId = leave.staffLeaveRequestId || leave.id;
    if (!leaveId) return;
    if (!window.confirm("Are you sure you want to cancel this leave application?")) return;
    try {
      await apiClient.post(`/api/v1/staff-attendance/leave/${leaveId}/action`, {
        status: "Cancelled",
        rejectionReason: "Cancelled by employee",
      });
      notify("Leave application cancelled successfully.");
      fetchLeaveData();
    } catch (err) {
      console.error("Failed to cancel leave:", err);
      notify(getApiErrorMessage(err) || "Failed to cancel leave application.", "error");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getLeaveTypeName = (l) => {
    if (l.leaveCategoryName) return l.leaveCategoryName;
    const type = l.leaveType;
    if (!type) return "Leave";
    const lower = String(type).toLowerCase();
    if (lower.includes("casual")) return "Casual Leave (CL)";
    if (lower.includes("sick")) return "Sick Leave (SL)";
    if (lower.includes("earned")) return "Earned Leave (EL)";
    if (lower.includes("duty")) return "On-Duty (OD)";
    return type;
  };

  return (
    <div className="leave-page">
      {/* Header matching Screenshot 3 */}
      <div className="cms-page-head">
        <div className="cms-page-title">
          <div className="cms-page-title-copy">
            <h1>Leave Management</h1>
            <p>Apply for casual, sick, or earned leave and track approval status.</p>
          </div>
        </div>
        <div className="cms-page-actions">
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setShowLeaveModal(true)}
          >
            <Plus size={16} />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards matching Screenshot 3 */}
      <div className="cms-stats-grid">
        <div className="cms-stat">
          <div className="cms-stat-icon tone-primary">
            <Calendar size={20} />
          </div>
          <div>
            <div className="cms-stat-label">Casual Leave (CL)</div>
            <div className="cms-stat-value">{casualStats.text}</div>
          </div>
        </div>

        <div className="cms-stat">
          <div className="cms-stat-icon tone-green">
            <Calendar size={20} />
          </div>
          <div>
            <div className="cms-stat-label">Sick Leave (SL)</div>
            <div className="cms-stat-value">{sickStats.text}</div>
          </div>
        </div>

        <div className="cms-stat">
          <div className="cms-stat-icon tone-amber">
            <Calendar size={20} />
          </div>
          <div>
            <div className="cms-stat-label">Earned Leave (EL)</div>
            <div className="cms-stat-value">{earnedStats.text}</div>
          </div>
        </div>

        <div className="cms-stat">
          <div className="cms-stat-icon tone-violet">
            <Calendar size={20} />
          </div>
          <div>
            <div className="cms-stat-label">On-Duty (OD)</div>
            <div className="cms-stat-value">{onDutyStats.text}</div>
          </div>
        </div>
      </div>

      {/* Leave Applications History Table Card */}
      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Leave Applications History</h2>
        </div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>TYPE</th>
                <th>FROM DATE</th>
                <th>TO DATE</th>
                <th>DAYS</th>
                <th>REASON</th>
                <th>APPLIED ON</th>
                <th>STATUS</th>
                <th>APPROVER</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "32px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <Loader2 size={24} className="leave-spin" style={{ color: "var(--cms-primary)" }} />
                      <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Loading leave applications...</span>
                    </div>
                  </td>
                </tr>
              ) : leaveList.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div className="empty-leave-state">
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
                    <td className="cms-strong">{getLeaveTypeName(l)}</td>
                    <td>{formatDate(l.startDate)}</td>
                    <td>{formatDate(l.endDate)}</td>
                    <td><strong>{l.totalDays || 1}</strong></td>
                    <td style={{ maxWidth: 220, whiteSpace: "normal" }}>{l.reason || "--"}</td>
                    <td style={{ color: "var(--cms-muted)" }}>{formatDate(l.createdAt)}</td>
                    <td>
                      <span className={`cms-badge ${STATUS_BADGE[l.status] || "cms-badge-warn"}`}>
                        {l.status}
                      </span>
                    </td>
                    <td>{l.approvedByUserName || "--"}</td>
                    <td>
                      {l.status === "Pending" ? (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 12, color: "var(--cms-red, #dc2626)" }}
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

      {/* Apply Leave Modal */}
      {showLeaveModal && typeof document !== "undefined" && createPortal(
        <div
          className="cms-overlay tm-leave-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowLeaveModal(false)}
        >
          <form
            className="cms-modal sm tm-leave-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tm-leave-modal-title"
            onSubmit={handleApplyLeave}
          >
            <div className="cms-modal-head">
              <h3 id="tm-leave-modal-title">Apply for Staff Leave</h3>
              <button
                type="button"
                className="cms-icon-btn"
                aria-label="Close"
                disabled={leaveSubmitting}
                onClick={() => setShowLeaveModal(false)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label htmlFor="tm-leave-type">
                    LEAVE TYPE <span className="req">*</span>
                  </label>
                  <select
                    id="tm-leave-type"
                    required
                    value={leaveForm.categoryId}
                    disabled={leaveSubmitting}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({ ...prev, categoryId: e.target.value }))
                    }
                  >
                    <option value="">Select leave type</option>
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <option
                          key={c.leaveCategoryId || c.id}
                          value={c.leaveCategoryId || c.id}
                        >
                          {c.categoryName || c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="1">Casual Leave (CL)</option>
                        <option value="2">Sick Leave (SL)</option>
                        <option value="3">Earned Leave (EL)</option>
                        <option value="4">On-Duty (OD)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="cms-field">
                  <label htmlFor="tm-leave-from">
                    FROM DATE <span className="req">*</span>
                  </label>
                  <input
                    id="tm-leave-from"
                    type="date"
                    required
                    value={leaveForm.fromDate}
                    disabled={leaveSubmitting}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({ ...prev, fromDate: e.target.value }))
                    }
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="tm-leave-to">
                    TO DATE <span className="req">*</span>
                  </label>
                  <input
                    id="tm-leave-to"
                    type="date"
                    required
                    min={leaveForm.fromDate || undefined}
                    value={leaveForm.toDate}
                    disabled={leaveSubmitting}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({ ...prev, toDate: e.target.value }))
                    }
                  />
                </div>

                <div className="cms-field full">
                  <label htmlFor="tm-leave-reason">
                    REASON FOR LEAVE <span className="req">*</span>
                  </label>
                  <textarea
                    id="tm-leave-reason"
                    rows={2}
                    required
                    placeholder="State reason clearly..."
                    value={leaveForm.reason}
                    disabled={leaveSubmitting}
                    onChange={(e) =>
                      setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="cms-modal-foot">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={leaveSubmitting}
                onClick={() => setShowLeaveModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cms-btn cms-btn-primary"
                disabled={leaveSubmitting}
              >
                {leaveSubmitting && (
                  <Loader2 size={14} className="tm-leave-spin" style={{ marginRight: 6 }} />
                )}
                Submit Leave
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {toast && (
        <div
          className={`sp-toast ${toast.type === "error" ? "error" : ""}`}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: "10px 16px",
            background: toast.type === "error" ? "#dc2626" : "#166534",
            color: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
