import { useTransportNavigation, useTransportRouteValue, useTransportRecord } from "../TransportManagerContext.jsx";
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Loader2,
} from "lucide-react";
import "@/modules/faculty/styles/FacultyPayslips.css";
import { useTransportManagerSafe } from "../TransportManagerContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { getAuthUser, getAuthToken } from "@/modules/auth/authStorage.js";

const getMonthLabel = (slip) => {
  if (!slip) return "No Payslip Available";
  if (slip.month) return slip.month;
  const monthNum = Number(slip.payrollMonth);
  const yearNum = Number(slip.payrollYear);
  if (!monthNum || isNaN(monthNum)) return "—";
  const date = new Date(yearNum || 2026, monthNum - 1, 1);
  const monthName = date.toLocaleString("en-IN", { month: "long" });
  return yearNum ? `${monthName} ${yearNum}` : `${monthName}`;
};

const fmt = (v) => {
  if (v == null || isNaN(Number(v))) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
};

export default function TransportManagerPayslips() {
  const navigation = useTransportNavigation();
  const tmContext = useTransportManagerSafe();
  const profileData = useMemo(() => tmContext?.profile || {}, [tmContext?.profile]);

  const [payslipList, setPayslipList] = useState([]);
  const [payslipYear, setPayslipYear] = useTransportRouteValue(navigation, "year", "all", value => value === "all" || /^\d{4}$/.test(value));
  const [loading, setLoading] = useState(true);
  const [viewingPayslip, setViewingPayslip] = useTransportRecord(navigation, "payslipId", payslipList, slip => slip.payslipId || slip.id, !loading);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
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

  const effectiveEmployeeId = useMemo(() => {
    const a = getAuthUser();
    return (
      profileData?.employeeId ||
      a?.employeeId ||
      profileData?.empId ||
      a?.empId ||
      "MNT0044"
    ).trim();
  }, [profileData?.employeeId, profileData?.empId]);

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let loaded = [];
      try {
        const params = {};
        if (effectiveEmployeeId) params.search = effectiveEmployeeId;
        if (profileData?.campusId) params.campusId = profileData.campusId;

        const res = await apiClient.get("/api/v1/Payroll/payslips", { params });
        let raw = res?.data;
        let list = Array.isArray(raw) ? raw : raw?.data || raw?.items || raw?.$values || [];
        if (!Array.isArray(list)) list = [];

        if (effectiveStaffId || effectiveEmployeeId) {
          list = list.filter((slip) => {
            if (effectiveStaffId && String(slip.staffId) === String(effectiveStaffId)) return true;
            if (
              effectiveEmployeeId &&
              String(slip.employeeId || "").trim().toLowerCase() === effectiveEmployeeId.toLowerCase()
            ) {
              return true;
            }
            return false;
          });
        }

        loaded = list;
      } catch (err) {
        console.warn("Could not load backend payslips:", err);
      }

      setPayslipList(loaded);
    } catch (err) {
      console.warn("Failed to load payslips:", err);
      setError("Failed to load personal payslips.");
      setPayslipList([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveEmployeeId, effectiveStaffId, profileData.campusId]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const years = useMemo(() => {
    const ySet = new Set();
    payslipList.forEach((s) => {
      if (s.payrollYear) ySet.add(String(s.payrollYear));
    });
    return Array.from(ySet).sort().reverse();
  }, [payslipList]);

  const filteredPayslips = useMemo(() => {
    if (payslipYear === "all") return payslipList;
    return payslipList.filter((s) => String(s.payrollYear) === payslipYear);
  }, [payslipList, payslipYear]);

  const current = filteredPayslips[0] || null;
  const currentMonthLabel = getMonthLabel(current);

  const handleDownloadPdf = async (slip) => {
    if (!slip) {
      notify("No payslip PDF is available for download.", "info");
      return;
    }
    const slipId = slip.payslipId || slip.id;
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
      console.warn("download-pdf failed, trying /pdf endpoint:", err);
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

  const handlePrintPdf = (slip) => {
    if (!slip) return;
    window.print();
  };

  return (
    <div className="payslip-container">
      {/* Header matching FacultyPayslips */}
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
            onChange={(event) => setPayslipYear(event.target.value)}
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

      {/* Current Payslip KPI Card */}
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
            onClick={() => current && setViewingPayslip(current)}
            disabled={!current}
            style={!current ? { opacity: 0.55, cursor: "not-allowed" } : {}}
          >
            <Eye size={16} />
            View Breakdown
          </button>
          <button
            className="download-btn"
            onClick={() => current && handleDownloadPdf(current)}
            disabled={!current || downloadingId === (current?.payslipId || current?.id)}
            style={!current ? { opacity: 0.55, cursor: "not-allowed" } : {}}
          >
            {downloadingId === (current?.payslipId || current?.id) ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Download size={16} />
            )}
            Download PDF
          </button>
        </div>
      </div>

      {/* Payslip History Card */}
      <div className="payslip-card history-card">
        <div className="history-header">
          <div className="section-title-wrap">
            <CalendarClock size={18} color="var(--cms-primary)" />
            <h2>Payslip History</h2>
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>MONTH</th>
                <th>GROSS SALARY</th>
                <th>DEDUCTIONS</th>
                <th>NET SALARY</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px 0" }}>
                    <Loader2 size={20} className="spin" style={{ margin: "0 auto" }} />
                    <span style={{ fontSize: 13, color: "var(--cms-muted)", display: "block", marginTop: 8 }}>
                      Loading payslips...
                    </span>
                  </td>
                </tr>
              ) : filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px 0", color: "var(--cms-muted)" }}>
                    No payslip records available.
                  </td>
                </tr>
              ) : (
                filteredPayslips.map((slip) => (
                  <tr key={slip.payslipId || slip.id || slip.month}>
                    <td>
                      <strong>{getMonthLabel(slip)}</strong>
                    </td>
                    <td>{fmt(slip.grossSalary)}</td>
                    <td style={{ color: "#dc2626" }}>-{fmt(slip.totalDeductions)}</td>
                    <td>
                      <strong style={{ color: "#166534" }}>{fmt(slip.netSalary)}</strong>
                    </td>
                    <td>
                      <span className="cms-badge cms-badge-active">
                        {slip.status || "Paid"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className="cms-action-btn"
                          onClick={() => setViewingPayslip(slip)}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="cms-action-btn"
                          onClick={() => handleDownloadPdf(slip)}
                          title="Download PDF"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Breakdown Modal */}
      {viewingPayslip && (
        <div className="cms-modal-overlay">
          <div className="cms-modal payslip-modal-content">
            <div className="cms-modal-head">
              <h3>Salary Breakdown — {getMonthLabel(viewingPayslip)}</h3>
              <button
                type="button"
                className="cms-icon-btn"
                onClick={() => setViewingPayslip(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="cms-modal-body">
              {/* Institution & Staff Details */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid var(--cms-border)", paddingBottom: 12 }}>
                <div>
                  <h4 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700 }}>Pirnav Colleges</h4>
                  <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Transport Operations Division</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{viewingPayslip.employeeName || profileData.name || "muzan kibutsuzi"}</div>
                  <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>{viewingPayslip.designation || profileData.role || "Transport Manager"} ({viewingPayslip.employeeId || effectiveEmployeeId})</span>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Earnings */}
                <div>
                  <h5 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "var(--cms-primary)" }}>Earnings</h5>
                  <div className="payslip-table-mini">
                    <div className="payslip-row">
                      <span>Basic Salary</span>
                      <span>{fmt(viewingPayslip.basicPay || 0)}</span>
                    </div>
                    <div className="payslip-row">
                      <span>HRA</span>
                      <span>{fmt(viewingPayslip.hra || 0)}</span>
                    </div>
                    <div className="payslip-row">
                      <span>DA</span>
                      <span>{fmt(viewingPayslip.da || 0)}</span>
                    </div>
                    <div className="payslip-row">
                      <span>Conveyance</span>
                      <span>{fmt(viewingPayslip.conveyanceAllowance || 0)}</span>
                    </div>
                    <div className="payslip-row">
                      <span>Medical Allowance</span>
                      <span>{fmt(viewingPayslip.medicalAllowance || 0)}</span>
                    </div>
                    <div className="payslip-row total">
                      <strong>Total Earnings</strong>
                      <strong>{fmt(viewingPayslip.grossSalary || 0)}</strong>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h5 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#dc2626" }}>Deductions</h5>
                  <div className="payslip-table-mini">
                    <div className="payslip-row">
                      <span>Provident Fund (PF)</span>
                      <span>{fmt(viewingPayslip.pf || 0)}</span>
                    </div>
                    <div className="payslip-row">
                      <span>Professional Tax (PT)</span>
                      <span>{fmt(viewingPayslip.professionalTax || 0)}</span>
                    </div>
                    <div className="payslip-row">
                      <span>Income Tax (TDS)</span>
                      <span>{fmt(viewingPayslip.tds || 0)}</span>
                    </div>
                    <div className="payslip-row total">
                      <strong>Total Deductions</strong>
                      <strong style={{ color: "#dc2626" }}>{fmt(viewingPayslip.totalDeductions || 0)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Callout */}
              <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 10, background: "rgba(111, 132, 0, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cms-muted)", textTransform: "uppercase" }}>Net Amount Payable</span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--cms-primary-dark, #3b4800)" }}>
                    {fmt(viewingPayslip.netSalary || 0)}
                  </div>
                </div>
                <span className="cms-badge cms-badge-active" style={{ fontSize: 13, padding: "4px 10px" }}>
                  {viewingPayslip.status || "Paid"}
                </span>
              </div>
            </div>

            <div className="cms-modal-foot">
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                onClick={() => handlePrintPdf(viewingPayslip)}
              >
                <Printer size={15} /> Print
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => handleDownloadPdf(viewingPayslip)}
              >
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        </div>
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
