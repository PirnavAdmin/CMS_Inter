import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { Plus, Calendar, X, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import "../styles/FacultyLeave.css";
import { useFacultySafe } from "../FacultyContext.jsx";
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

export default function FacultyLeave() {
  const context = useFacultySafe();
  const profileData = context?.profileData || {};
  const academicCtx = useAcademicContext?.() || {};
  const selectedAcademicYearId = academicCtx.selectedAcademicYearId;
  const selectedCampusId = academicCtx.selectedCampusId;

  const [leaveList, setLeaveList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorySummary, setCategorySummary] = useState(null);
  const [staffBalance, setStaffBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeParams, setRouteParams] = useSearchParams();
  const cardParam = routeParams.get("card");
  const [showLeaveModal, setShowLeaveModal] = useState(() => cardParam === "apply" || cardParam === "apply-leave");

  useEffect(() => {
    const card = routeParams.get("card");
    const shouldOpen = card === "apply" || card === "apply-leave";
    if (shouldOpen !== showLeaveModal) {
      setShowLeaveModal(shouldOpen);
    }
  }, [routeParams]);

  const handleCloseModal = () => {
    setShowLeaveModal(false);
    setRouteParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("card");
      return next;
    });
  };
  const [leaveForm, setLeaveForm] = useState({
    categoryId: "",
    customLeaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Derive staff identification strictly
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
      } catch { }
    }
    try {
      const saved = localStorage.getItem("staff_profile_data");
      if (saved) {
        const parsed = JSON.parse(saved);
        const s = Number(parsed?.staffId || parsed?.id);
        if (s > 0 && parsed?.role !== "Admin" && parsed?.role !== "Super Admin") {
          return s;
        }
      }
    } catch { }
    const a = getAuthUser();
    const id = Number(
      profileData?.staffId ||
      a?.staffId ||
      (profileData?.role !== "Admin" ? profileData?.id : null) ||
      (a?.role !== "Admin" ? a?.id : null) ||
      profileData?.id ||
      a?.id ||
      profileData?.facultyId ||
      a?.facultyId
    );
    return id > 0 ? id : 1108;
  }, [profileData]);

  const effectiveDepartmentId = useMemo(() => {
    const a = getAuthUser();
    return Number(profileData?.departmentId || a?.departmentId || 0);
  }, [profileData?.departmentId]);

  const effectiveCampusId = useMemo(() => {
    const a = getAuthUser();
    return Number(selectedCampusId || profileData?.campusId || a?.campusId || 1);
  }, [selectedCampusId, profileData?.campusId]);

  const effectiveAcademicYearId = useMemo(() => {
    return Number(selectedAcademicYearId || 1);
  }, [selectedAcademicYearId]);

  // Fetch real leave data and categories from backend
  const fetchLeaveData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch leave categories and summary from backend
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
              categoryId: prev.categoryId || catList[0]?.leaveCategoryId || "",
            }));
          }
        }

        if (sumRes.status === "fulfilled") {
          const sumData = sumRes.value?.data?.data || sumRes.value?.data?.Data;
          if (sumData) {
            setCategorySummary(sumData);
          }
        }
      } catch (catErr) {
        console.warn("Could not fetch leave categories:", catErr);
      }

      // Fetch official holidays to exclude from working days
      try {
        const holRes = await apiClient.get("/api/v1/holidays", { params: { pageSize: 100 } });
        const hList = holRes?.data?.data || holRes?.data || [];
        if (Array.isArray(hList)) setHolidays(hList);
      } catch {}

      // 2. Fetch staff leave history & balance
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
        const histData = histRes?.data?.data || histRes?.data?.Data;
        if (histData) {
          balanceObj = histData.balance || null;
          if (Array.isArray(histData.history)) {
            leaves = histData.history;
          }
        }
      } catch (histErr) {
        console.warn("Could not fetch staff leave history:", histErr);
      }

      // 3. Fallback to /api/v1/staff-attendance/leave?staffId=... if history is empty
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

      // Sort newest first
      leaves.sort((a, b) => {
        const dateA = new Date(a.startDate || a.createdAt || 0);
        const dateB = new Date(b.startDate || b.createdAt || 0);
        return dateB - dateA;
      });

      setLeaveList(leaves);
      setStaffBalance(balanceObj);
    } catch (err) {
      console.error("Failed to load leave records:", err);
      setError(getApiErrorMessage(err) || "Failed to load leave records.");
    } finally {
      setLoading(false);
    }
  }, [effectiveStaffId, effectiveCampusId]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  // Calculate used & remaining days per category from approved leaves
  const approvedLeaves = useMemo(
    () => leaveList.filter((l) => (l.status || "").toLowerCase() === "approved"),
    [leaveList]
  );

  const getCategoryStats = (keyword, defaultQuota) => {
    const matchedCat = categories.find((c) =>
      (c.categoryName || "").toLowerCase().includes(keyword.toLowerCase())
    );
    const quota = Number(matchedCat?.annualQuota) || defaultQuota;

    const used = approvedLeaves
      .filter((l) => {
        const t = (l.leaveType || "").toLowerCase();
        const n = (l.leaveCategoryName || "").toLowerCase();
        return t.includes(keyword.toLowerCase()) || n.includes(keyword.toLowerCase());
      })
      .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

    // If staff has no allocated balance yet (total === 0), show 0 / quota
    if (staffBalance && Number(staffBalance.total) === 0 && approvedLeaves.length === 0) {
      return { used: 0, quota, remaining: 0, text: `0 / ${quota} Days` };
    }

    const remaining = Math.max(0, quota - used);
    return { used, quota, remaining, text: `${remaining} / ${quota} Days` };
  };

  const casualStats = useMemo(() => getCategoryStats("casual", 12), [categories, approvedLeaves, staffBalance]);
  const sickStats = useMemo(() => getCategoryStats("sick", 10), [categories, approvedLeaves, staffBalance]);
  const earnedStats = useMemo(() => getCategoryStats("earned", 15), [categories, approvedLeaves, staffBalance]);
  const onDutyStats = useMemo(() => getCategoryStats("duty", 8), [categories, approvedLeaves, staffBalance]);

  // Leave preview calculation for date inputs (excludes Sundays and official holidays)
  const leavePreviewDays = useMemo(() => {
    if (!leaveForm.fromDate || !leaveForm.toDate || leaveForm.toDate < leaveForm.fromDate) return 0;
    const start = new Date(`${leaveForm.fromDate}T00:00:00`);
    const end = new Date(`${leaveForm.toDate}T00:00:00`);
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const isSunday = cur.getDay() === 0;
      const curIso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      const isHoliday = holidays.some((h) => {
        const hStart = (h.startDate || h.holidayDate || "").slice(0, 10);
        const hEnd = (h.endDate || hStart).slice(0, 10);
        return curIso >= hStart && curIso <= hEnd && (h.status === "Active" || !h.status);
      });
      if (!isSunday && !isHoliday) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [leaveForm.fromDate, leaveForm.toDate, holidays]);

  // Handle opening the Apply Leave modal
  const handleOpenModal = () => {
    setShowLeaveModal(true);
    setLeaveForm({
      categoryId: categories.length > 0 ? categories[0].leaveCategoryId : "OTHERS",
      customLeaveType: "",
      fromDate: "",
      toDate: "",
      reason: "",
    });
    setRouteParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("card", "apply");
      return next;
    });
  };

  // Create custom leave category via POST /api/v1/leave-categories
  const handleCreateCustomCategory = async () => {
    const customName = (leaveForm.customLeaveType || "").trim();
    if (!customName) {
      return notify("Please enter a custom leave type name.", "error");
    }

    // Check if category already exists (case-insensitive)
    const existing = categories.find(
      (c) => (c.categoryName || "").trim().toLowerCase() === customName.toLowerCase()
    );
    if (existing) {
      setLeaveForm((prev) => ({
        ...prev,
        categoryId: existing.leaveCategoryId,
        customLeaveType: "",
      }));
      notify(`Selected existing category: ${existing.categoryName}`);
      return existing.leaveCategoryId;
    }

    setAddingCategory(true);
    try {
      const code =
        customName
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 4)
          .toUpperCase() || "LV";

      const newCatPayload = {
        categoryName: customName,
        categoryCode: code,
        annualQuota: 10,
        applicableStaffType: "All Staff",
        allowCarryForward: false,
        requiresProof: false,
        description: `Custom leave type: ${customName}`,
        displayOrder: categories.length + 1,
      };

      const res = await apiClient.post("/api/v1/leave-categories", newCatPayload);
      const created = res?.data?.data || res?.data;
      const createdId = created?.leaveCategoryId || created?.id;

      notify(`Custom leave type "${customName}" added successfully!`);

      // Refresh categories from backend
      try {
        const catRes = await apiClient.get("/api/v1/leave-categories");
        const catList = catRes?.data?.data || catRes?.data?.Data || catRes?.data || [];
        if (Array.isArray(catList) && catList.length > 0) {
          setCategories(catList);
          const found = catList.find(
            (c) => (c.categoryName || "").trim().toLowerCase() === customName.toLowerCase()
          );
          if (found) {
            setLeaveForm((prev) => ({
              ...prev,
              categoryId: found.leaveCategoryId,
              customLeaveType: "",
            }));
            return found.leaveCategoryId;
          }
        }
      } catch {}

      if (createdId) {
        setCategories((prev) => [...prev, { ...newCatPayload, leaveCategoryId: createdId }]);
        setLeaveForm((prev) => ({
          ...prev,
          categoryId: createdId,
          customLeaveType: "",
        }));
        return createdId;
      }
      return null;
    } catch (err) {
      console.error("Failed to create custom leave category:", err);
      notify(getApiErrorMessage(err) || "Failed to create custom leave category.", "error");
      return null;
    } finally {
      setAddingCategory(false);
    }
  };

  // Submit leave request via POST /api/v1/staff-attendance/leave
  const applyLeave = async () => {
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      return notify("Please complete all required fields.", "error");
    }
    if (new Date(leaveForm.toDate) < new Date(leaveForm.fromDate)) {
      return notify("To Date cannot be earlier than From Date.", "error");
    }
    if (leavePreviewDays <= 0) {
      return notify("Selected leave range contains 0 working days (Sundays and official holidays are excluded).", "error");
    }

    setLeaveSubmitting(true);
    try {
      let targetCategoryId = leaveForm.categoryId;
      let targetLeaveType = "Casual";

      // If "OTHERS" is selected, resolve or create custom category
      if (String(leaveForm.categoryId) === "OTHERS") {
        const customName = (leaveForm.customLeaveType || "").trim();
        if (!customName) {
          setLeaveSubmitting(false);
          return notify("Please enter a custom leave type name.", "error");
        }

        const existing = categories.find(
          (c) => (c.categoryName || "").trim().toLowerCase() === customName.toLowerCase()
        );

        if (existing) {
          targetCategoryId = existing.leaveCategoryId;
          targetLeaveType = existing.categoryName;
        } else {
          // Auto create via POST /api/v1/leave-categories
          const code =
            customName
              .replace(/[^a-zA-Z0-9]/g, "")
              .substring(0, 4)
              .toUpperCase() || "LV";

          const newCatPayload = {
            categoryName: customName,
            categoryCode: code,
            annualQuota: 10,
            applicableStaffType: "All Staff",
            allowCarryForward: false,
            requiresProof: false,
            description: `Custom leave type: ${customName}`,
            displayOrder: categories.length + 1,
          };

          try {
            const res = await apiClient.post("/api/v1/leave-categories", newCatPayload);
            const created = res?.data?.data || res?.data;
            targetCategoryId = created?.leaveCategoryId || created?.id;
            targetLeaveType = customName;

            // Refresh categories list
            const catRes = await apiClient.get("/api/v1/leave-categories");
            const catList = catRes?.data?.data || catRes?.data?.Data || catRes?.data || [];
            if (Array.isArray(catList) && catList.length > 0) {
              setCategories(catList);
            }
          } catch (createErr) {
            console.warn("Could not create leave category on server, submitting directly:", createErr);
            targetCategoryId = categories[0]?.leaveCategoryId || 1;
            targetLeaveType = customName;
          }
        }
      } else {
        const selectedCat = categories.find(
          (c) => String(c.leaveCategoryId) === String(leaveForm.categoryId)
        );
        const catCode = (selectedCat?.categoryCode || "").trim().toUpperCase();
        const catName = (selectedCat?.categoryName || "").trim().toLowerCase();
        let canonicalEnum = "Casual";
        if (catCode === "SL" || catName.includes("sick") || catName.includes("medical")) {
          canonicalEnum = "Sick";
        } else if (catCode === "EL" || catName.includes("earned") || catName.includes("privilege")) {
          canonicalEnum = "Earned";
        } else if (catCode === "ML" || catName.includes("maternity") || catName.includes("parental")) {
          canonicalEnum = "Maternity";
        } else if (catCode === "CL" || catName.includes("casual")) {
          canonicalEnum = "Casual";
        } else {
          canonicalEnum = "Other";
        }
        targetLeaveType = canonicalEnum;
        targetCategoryId = selectedCat?.leaveCategoryId || leaveForm.categoryId;
      }

      const payload = {
        staffId: effectiveStaffId,
        leaveType: targetLeaveType,
        leaveCategoryId: Number(targetCategoryId || 1),
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
          categoryId: categories[0]?.leaveCategoryId || 1,
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

  // Cancel pending leave via POST /api/v1/staff-attendance/leave/{leaveRequestId}/action
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
    if (lower.includes("maternity")) return "Maternity Leave (ML)";
    if (lower.includes("duty")) return "On-Duty (OD)";
    if (lower.includes("compensatory")) return "Compensatory Off (CO)";
    if (lower.includes("medical")) return "Medical Leave";
    return type;
  };

  return (
    <div className="faculty-leave-container">
      {/* Page Header */}
      <div className="cms-page-head">
        <div>
          <h1>Leave Management</h1>
          <p>Apply for casual, sick, or earned leave and track approval status.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={handleOpenModal}>
          <Plus size={14} /> Apply Leave
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="leave-error-banner" role="alert">
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

      {/* Leave Balances KPI Cards Strip */}
      <div className="sp-stat-grid" style={{ marginBottom: 16 }}>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green">
            <Calendar size={20} />
          </div>
          <div>
            <div className="cms-stat-label">Casual Leave (CL)</div>
            <div className="cms-stat-value">{casualStats.text}</div>
          </div>
        </div>

        <div className="cms-stat">
          <div className="cms-stat-icon tone-blue">
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
                      {l.status === "Pending" ? (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 12, color: "var(--cms-red)" }}
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
      {showLeaveModal &&
        (typeof document !== "undefined"
          ? createPortal(
              <div
                className="cms-overlay faculty-leave-modal-overlay"
                onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
              >
                <div className="cms-modal sm faculty-leave-modal" role="dialog" aria-modal="true">
                  <div className="cms-modal-head">
                    <h3>Apply for Staff Leave</h3>
                    <button
                      type="button"
                      className="cms-icon-btn"
                      onClick={handleCloseModal}
                      aria-label="Close"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="cms-modal-body">
                    <div className="cms-form-grid">
                      <div className="cms-field full">
                        <label>
                          Leave Type <span className="req">*</span>
                        </label>
                        <select
                          value={leaveForm.categoryId}
                          onChange={(e) =>
                            setLeaveForm({ ...leaveForm, categoryId: e.target.value })
                          }
                        >
                          {categories.length === 0 && (
                            <option value="">Loading leave categories...</option>
                          )}
                          {categories.map((c) => (
                            <option key={c.leaveCategoryId} value={c.leaveCategoryId}>
                              {c.categoryName} {c.categoryCode ? `(${c.categoryCode})` : ""} · {Number(c.annualQuota || 0)} days quota
                            </option>
                          ))}
                          <option value="OTHERS">Others</option>
                        </select>
                      </div>

                      {/* Conditional Custom Leave Type Field when "OTHERS" is selected */}
                      {String(leaveForm.categoryId) === "OTHERS" && (
                        <div className="cms-field full leave-custom-field-group">
                          <label>
                            Custom Leave Type <span className="req">*</span>
                          </label>
                          <div className="leave-custom-input-wrap">
                            <input
                              type="text"
                              placeholder="Enter custom leave type (e.g. Sabbatical, Bereavement)..."
                              value={leaveForm.customLeaveType || ""}
                              onChange={(e) =>
                                setLeaveForm({ ...leaveForm, customLeaveType: e.target.value })
                              }
                              autoFocus
                            />
                            <button
                              type="button"
                              className="cms-btn cms-btn-ghost leave-add-custom-btn"
                              onClick={handleCreateCustomCategory}
                              disabled={addingCategory || !leaveForm.customLeaveType?.trim()}
                              title="Add to categories list"
                            >
                              {addingCategory ? (
                                <Loader2 size={13} className="leave-spin" />
                              ) : (
                                <Plus size={13} />
                              )}
                              <span>Add</span>
                            </button>
                          </div>
                          <span className="leave-custom-hint">
                            This custom leave type will be saved to your institution's leave categories.
                          </span>
                        </div>
                      )}

                      <div className="cms-field">
                        <label>
                          From Date <span className="req">*</span>
                        </label>
                        <input
                          type="date"
                          value={leaveForm.fromDate}
                          onChange={(e) =>
                            setLeaveForm({ ...leaveForm, fromDate: e.target.value })
                          }
                        />
                      </div>

                      <div className="cms-field">
                        <label>
                          To Date <span className="req">*</span>
                        </label>
                        <input
                          type="date"
                          value={leaveForm.toDate}
                          onChange={(e) =>
                            setLeaveForm({ ...leaveForm, toDate: e.target.value })
                          }
                        />
                      </div>

                      <div className="cms-field full">
                        <label>
                          Reason for Leave <span className="req">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={leaveForm.reason}
                          placeholder="State reason clearly..."
                          onChange={(e) =>
                            setLeaveForm({ ...leaveForm, reason: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {leavePreviewDays > 0 ? (
                      <div className="leave-duration-badge">
                        Effective Duration: {leavePreviewDays} working day{leavePreviewDays > 1 ? "s" : ""} (Sundays &amp; official holidays excluded)
                      </div>
                    ) : leaveForm.fromDate && leaveForm.toDate ? (
                      <div className="leave-duration-warning">
                        Selected range contains only non-working days (Sundays or holidays). Leave cannot be requested for 0 working days.
                      </div>
                    ) : null}
                  </div>

                  <div className="cms-modal-foot">
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      onClick={applyLeave}
                      disabled={leaveSubmitting}
                    >
                      {leaveSubmitting && (
                        <Loader2 size={14} className="leave-spin" style={{ marginRight: 6 }} />
                      )}
                      Submit Leave
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null)}

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
