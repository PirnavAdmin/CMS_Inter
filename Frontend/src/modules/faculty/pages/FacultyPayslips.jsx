import { SkeletonDashboard } from "@/shared/components/Skeleton.jsx";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Wallet,
  Calendar,
  Eye,
  Download,
  CalendarClock,
  X,
  Printer,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import "../styles/FacultyPayslips.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { getMyPayslips } from "@/api/payrollApi.js";
import { getAuthUser, getAuthToken } from "@/modules/auth/authStorage.js";

const getMonthLabel = (slip) => {
  if (!slip) return "";
  if (slip.month) return slip.month;
  const monthNum = Number(slip.payrollMonth);
  const yearNum = Number(slip.payrollYear);
  if (!monthNum || isNaN(monthNum)) return "Payslip";
  const date = new Date(yearNum || 2026, monthNum - 1, 1);
  const monthName = date.toLocaleString("en-IN", { month: "long" });
  return yearNum ? `${monthName} ${yearNum}` : monthName;
};

const fmt = (v) => {
  if (v == null || isNaN(Number(v))) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
};

export default function FacultyPayslips() {
  const context = useFacultySafe();
  const profileData = context?.profileData || {};

  const [routeParams, setRouteParams] = useSearchParams();
  const yearParam = routeParams.get("year") || "all";
  const payslipIdParam = routeParams.get("payslipId") || routeParams.get("id");

  const [payslipList, setPayslipList] = useState([]);
  const payslipYear = yearParam;
  const sourcePayslip = payslipIdParam == null ? null : payslipList.find((p) => String(p.payslipId || p.id || p.payrollId) === payslipIdParam);
  const [payslipDetail, setPayslipDetail] = useState(null);
  const viewingPayslip = sourcePayslip ? (String(payslipDetail?.payslipId || payslipDetail?.id || payslipDetail?.payrollId) === payslipIdParam ? payslipDetail : sourcePayslip) : null;

  const handleYearFilterChange = (yr) => {
    setRouteParams((prev) => {
      const next = new URLSearchParams(prev);
      if (yr && yr !== "all") next.set("year", yr);
      else next.delete("year");
      return next;
    });
  };

  const handleClosePayslipModal = () => {
    setRouteParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("payslipId");
      next.delete("id");
      return next;
    });
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
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
    const token = getAuthToken();
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const decoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          const s = Number(decoded?.StaffId || decoded?.staffId || decoded?.staff_id);
          if (s > 0) return s;
        }
      } catch {}
    }
    const a = getAuthUser();
    const id = Number(
      profileData?.staffId ||
      a?.staffId ||
      profileData?.id ||
      a?.id ||
      profileData?.facultyId ||
      a?.facultyId
    );
    return id > 0 ? id : null;
  }, [profileData?.staffId, profileData?.id, profileData?.facultyId]);

  const effectiveEmployeeId = useMemo(() => {
    const a = getAuthUser();
    return (
      profileData?.employeeId ||
      a?.employeeId ||
      profileData?.empId ||
      a?.empId ||
      ""
    ).trim();
  }, [profileData?.employeeId, profileData?.empId]);

  const effectiveCampusId = useMemo(() => {
    const a = getAuthUser();
    return profileData?.campusId || a?.campusId || null;
  }, [profileData?.campusId]);

  // Fetch staff self-service payslips directly from backend API
  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyPayslips();
      let list = Array.isArray(res) ? res : res?.items || res?.$values || [];
      if (!Array.isArray(list)) list = [];

      // Sort descending: by year, then by month
      list.sort((a, b) => {
        const yA = Number(a.payrollYear || 0);
        const yB = Number(b.payrollYear || 0);
        if (yA !== yB) return yB - yA;
        const mA = Number(a.payrollMonth || 0);
        const mB = Number(b.payrollMonth || 0);
        return mB - mA;
      });

      setPayslipList(list);
    } catch (err) {
      console.error("Failed to fetch payslips:", err);
      const msg = getApiErrorMessage(err);
      setError(msg || "Unable to load payslips from the server.");
      setPayslipList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  // Distinct available years
  const years = useMemo(() => {
    const set = new Set();
    payslipList.forEach((item) => {
      const yr = item.payrollYear || item.year;
      if (yr) set.add(String(yr));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [payslipList]);

  // Filtered payslips by selected year
  const filteredPayslips = useMemo(() => {
    return payslipList.filter((item) => {
      if (payslipYear === "all") return true;
      const yr = String(item.payrollYear || item.year || "");
      return yr === payslipYear;
    });
  }, [payslipList, payslipYear]);

  const current = filteredPayslips[0] || null;
  const pastPayslips = filteredPayslips.length > 1 ? filteredPayslips.slice(1) : [];

  // Current month label (actual payslip month or current calendar month if empty)
  const currentMonthLabel = useMemo(() => {
    if (current) return getMonthLabel(current);
    const now = new Date();
    return now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }, [current]);

  const handleViewPayslip = (slip) => {
    if (!slip) {
      notify("No payslip record is available to view yet.", "info");
      return;
    }
    const slipId = slip.payslipId || slip.id || slip.payrollId;
    if (slipId) setRouteParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("payslipId", String(slipId));
      return next;
    });
  };

  useEffect(() => {
    const idToFetch = sourcePayslip?.payslipId || sourcePayslip?.id || sourcePayslip?.payrollId;
    if (!idToFetch) return;
    let cancelled = false;
    apiClient.get(`/api/v1/Payroll/payslips/${idToFetch}`)
      .then((res) => {
        const detail = res?.data?.data || res?.data;
        if (!cancelled && detail && typeof detail === "object" && String(detail.payslipId) === payslipIdParam) setPayslipDetail(detail);
      })
      .catch((err) => { if (!cancelled) console.warn("Could not fetch detailed payslip:", err); });
    return () => { cancelled = true; };
  }, [payslipIdParam, sourcePayslip]);

  // Download PDF attachment
  const handleDownloadPdf = async (slip) => {
    if (!slip || !slip.payslipId) {
      notify("No payslip PDF is available for download yet.", "info");
      return;
    }
    const slipId = slip.payslipId;
    const label = getMonthLabel(slip);
    try {
      setDownloadingId(slipId);
      notify(`Downloading payslip for ${label}...`, "info");
      const res = await apiClient.get(`/api/v1/Payroll/payslips/${slipId}/download-pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip_${slip.employeeId || "Staff"}_${slip.payrollYear || ""}_${String(slip.payrollMonth || "").padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      notify(`Payslip for ${label} downloaded successfully.`);
    } catch (err) {
      console.error("download-pdf failed, trying /pdf endpoint:", err);
      try {
        const fallbackRes = await apiClient.get(`/api/v1/Payroll/payslips/${slipId}/pdf`, {
          responseType: "blob",
        });
        const blob = new Blob([fallbackRes.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Payslip_${slip.employeeId || "Staff"}_${slip.payrollYear || ""}_${String(slip.payrollMonth || "").padStart(2, "0")}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        notify(`Payslip for ${label} downloaded successfully.`);
      } catch (fallbackErr) {
        notify(getApiErrorMessage(fallbackErr || err) || "Failed to download payslip PDF.", "error");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  // Open / print PDF
  const handlePrintPdf = async (slip) => {
    if (!slip || !slip.payslipId) return;
    const slipId = slip.payslipId;
    try {
      notify(`Opening printable payslip...`, "info");
      const res = await apiClient.get(`/api/v1/Payroll/payslips/${slipId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `Payslip_${slip.payslipId}.pdf`;
        a.click();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      notify(getApiErrorMessage(err) || "Failed to open printable payslip.", "error");
    }
  };

  if (loading) return <div className="payslip-container" role="status" aria-label="Loading payslips"><h1 className="main-title">My Payslips</h1><SkeletonDashboard cards={3} tableColumns={6} /></div>;

  return (
    <div className="payslip-container">
      {/* Header */}
      <div className="payslip-header">
        <div>
          <h1 className="main-title">My Payslips</h1>
          <p className="subtitle">Track your salary, deductions and downloads</p>
        </div>
        <div className="header-badge">
          <Wallet size={15} />
          <span>{filteredPayslips.length} Records</span>
          <select
            aria-label="Filter payslips by year"
            value={payslipYear}
            onChange={(event) => handleYearFilterChange(event.target.value)}
          >
            <option value="all">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error banner if network/server issue */}
      {error && (
        <div className="payslip-error-banner" role="alert">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            className="cms-btn cms-btn-ghost"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={fetchPayslips}
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Current Payslip Card (KPI Card - always displayed, shows 0's when empty) */}
      <div className="payslip-card current-card">
        <div className="card-top">
          <div className="section-title-wrap">
            <Wallet size={18} color="var(--cms-primary)" />
            <h2>Current Payslip</h2>
          </div>
          <div className="month-badge">
            <Calendar size={13} />
            <span>{currentMonthLabel}</span>
          </div>
        </div>

        {/* 3 Salary KPI Boxes */}
        <div className="salary-cards">
          <div className="salary-box gross-box">
            <p>Gross Salary</p>
            <h3>{current ? fmt(current.grossSalary) : "₹0"}</h3>
          </div>
          <div className="salary-box deduction-box">
            <p>Deductions</p>
            <h3>{current ? fmt(current.totalDeductions) : "₹0"}</h3>
          </div>
          <div className="salary-box net-box">
            <p>Net Pay</p>
            <h3>{current ? fmt(current.netSalary) : "₹0"}</h3>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="view-btn"
            onClick={() => handleViewPayslip(current)}
          >
            <Eye size={15} /> View Payslip
          </button>
          <button
            className="download-btn"
            disabled={downloadingId === current?.payslipId}
            onClick={() => handleDownloadPdf(current)}
          >
            <Download size={15} />{" "}
            {downloadingId && downloadingId === current?.payslipId
              ? "Downloading..."
              : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Past Payslips Card */}
      <div className="payslip-card">
        <div className="past-header">
          <div className="section-title-wrap">
            <CalendarClock size={18} color="var(--cms-muted)" />
            <h2>Past Payslips</h2>
          </div>
        </div>

        <div>
          {pastPayslips.length > 0 ? (
            pastPayslips.map((p) => (
              <div key={p.payslipId} className="past-item">
                <div className="past-left">
                  <div
                    style={{
                      background: "var(--cms-primary-soft)",
                      padding: 8,
                      borderRadius: 8,
                      color: "var(--cms-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h4>{getMonthLabel(p)}</h4>
                    <p>
                      Net Salary: <strong>{fmt(p.netSalary)}</strong>
                    </p>
                  </div>
                </div>
                <div className="icons">
                  <button
                    className="icon-btn"
                    title="View Payslip"
                    onClick={() => handleViewPayslip(p)}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Download PDF"
                    disabled={downloadingId === p.payslipId}
                    onClick={() => handleDownloadPdf(p)}
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-past-payslips">
              <div className="empty-past-icon">
                <CalendarClock size={24} />
              </div>
              <h4>No Payslips Yet</h4>
              <p>
                {payslipList.length > 0
                  ? "Only the current month's payslip is available. Previous months will appear here as payroll records are generated."
                  : "No previous month payslips have been generated yet for your account. Monthly payslips will appear here once processed and finalized by the accounts administration."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full Itemized Payslip Modal */}
      {payslipIdParam && !viewingPayslip && <div className="cms-overlay"><div className="cms-modal" role="dialog" aria-label="Payslip Details"><p role="status">{loading ? "Loading payslip details..." : error || "This payslip is unavailable for your account."}</p><button type="button" className="cms-btn cms-btn-secondary" onClick={handleClosePayslipModal}>Close</button></div></div>}
      {viewingPayslip && (
        <div
          className="cms-overlay"
          onClick={(e) => e.target === e.currentTarget && handleClosePayslipModal()}
        >
          <div className="cms-modal">
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Payslip — {getMonthLabel(viewingPayslip)}</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                  Employee ID: {viewingPayslip.employeeId || profileData?.employeeId || "--"} ·{" "}
                  {viewingPayslip.staffName || profileData?.fullName || "--"}
                  {viewingPayslip.departmentName ? ` · ${viewingPayslip.departmentName}` : ""}
                </span>
              </div>
              <button className="cms-icon-btn" onClick={handleClosePayslipModal}>
                <X size={16} />
              </button>
            </div>

            <div className="cms-modal-body">
              {/* Metadata strip */}
              {(viewingPayslip.structureName ||
                viewingPayslip.designation ||
                viewingPayslip.payslipStatus) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 16,
                    padding: "8px 14px",
                    background: "var(--cms-bg)",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  {viewingPayslip.structureName && (
                    <div>
                      <span style={{ color: "var(--cms-muted)" }}>Structure: </span>
                      <strong>{viewingPayslip.structureName}</strong>
                    </div>
                  )}
                  {viewingPayslip.designation && (
                    <div>
                      <span style={{ color: "var(--cms-muted)" }}>Designation: </span>
                      <strong>{viewingPayslip.designation}</strong>
                    </div>
                  )}
                  {viewingPayslip.payslipStatus && (
                    <div style={{ marginLeft: "auto" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontWeight: 700,
                          fontSize: 11,
                          background: "var(--cms-green-soft, #e6f6ee)",
                          color: "var(--cms-green, #0f9d58)",
                        }}
                      >
                        {viewingPayslip.payslipStatus}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Exact Backend Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {/* Earnings */}
                <div>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--cms-green, #0f9d58)",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    EARNINGS
                  </h4>
                  <table className="sp-payslip-table">
                    <tbody>
                      <tr>
                        <td>Basic Pay</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.basicPay)}
                        </td>
                      </tr>
                      <tr>
                        <td>House Rent Allowance (HRA)</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.hra)}
                        </td>
                      </tr>
                      <tr>
                        <td>Dearness Allowance (DA)</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.da)}
                        </td>
                      </tr>
                      <tr>
                        <td>Conveyance Allowance</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.conveyanceAllowance)}
                        </td>
                      </tr>
                      <tr>
                        <td>Medical Allowance</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.medicalAllowance)}
                        </td>
                      </tr>
                      <tr>
                        <td>Other Allowance</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.otherAllowance)}
                        </td>
                      </tr>
                      <tr style={{ background: "var(--cms-primary-soft)" }}>
                        <td>
                          <strong>Gross Earnings</strong>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 800,
                            color: "var(--cms-primary-dark)",
                          }}
                        >
                          {fmt(viewingPayslip.grossSalary)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--cms-red, #d93636)",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    DEDUCTIONS
                  </h4>
                  <table className="sp-payslip-table">
                    <tbody>
                      <tr>
                        <td>Provident Fund (PF)</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.pf)}
                        </td>
                      </tr>
                      <tr>
                        <td>Professional Tax (PT)</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.professionalTax)}
                        </td>
                      </tr>
                      <tr>
                        <td>TDS (Income Tax)</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.tds)}
                        </td>
                      </tr>
                      <tr>
                        <td>ESI</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.esi)}
                        </td>
                      </tr>
                      <tr>
                        <td>Insurance / Other Deductions</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(viewingPayslip.insuranceOtherDeduction)}
                        </td>
                      </tr>
                      <tr style={{ background: "var(--cms-red-soft, #fdecec)" }}>
                        <td>
                          <strong>Total Deductions</strong>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 800,
                            color: "var(--cms-red, #d93636)",
                          }}
                        >
                          {fmt(viewingPayslip.totalDeductions)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Payable Banner */}
              <div
                className="sp-payslip-total"
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--cms-primary-soft)",
                  borderRadius: 8,
                  fontWeight: 800,
                  color: "var(--cms-primary-dark)",
                }}
              >
                <span>NET SALARY PAYABLE</span>
                <span>{fmt(viewingPayslip.netSalary)}</span>
              </div>
            </div>

            <div className="cms-modal-foot">
              <button
                className="cms-btn cms-btn-ghost"
                onClick={handleClosePayslipModal}
              >
                Close
              </button>
              <button
                className="cms-btn cms-btn-primary"
                disabled={downloadingId === viewingPayslip.payslipId}
                onClick={() => handleDownloadPdf(viewingPayslip)}
              >
                <Download size={14} />{" "}
                {downloadingId === viewingPayslip.payslipId ? "Downloading..." : "Download PDF"}
              </button>
              <button
                className="cms-btn cms-btn-outline"
                onClick={() => handlePrintPdf(viewingPayslip)}
              >
                <Printer size={14} /> Print / Save PDF
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