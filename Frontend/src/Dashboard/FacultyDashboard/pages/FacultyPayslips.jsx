import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Calendar,
  Eye,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import "../styles/FacultyPayslips.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import apiClient from "@/api/apiClient.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getMonthName = (m) => {
  const num = Number(m);
  if (num >= 1 && num <= 12) return MONTH_NAMES[num - 1];
  return m || "";
};

const getPeriod = (slip) => {
  if (!slip) return "";
  const monthName = getMonthName(slip.payrollMonth);
  return `${monthName} ${slip.payrollYear || ""}`.trim();
};

const money = (value) => {
  if (value == null || isNaN(value)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function normalizePayslip(record) {
  if (!record || typeof record !== "object") return {};
  const get = (key) =>
    record[key] ??
    record[key[0].toUpperCase() + key.slice(1)] ??
    record[key.toUpperCase()] ??
    0;

  const getString = (key) =>
    record[key] ??
    record[key[0].toUpperCase() + key.slice(1)] ??
    record[key.toUpperCase()] ??
    "";

  return {
    payslipId: get("payslipId"),
    staffId: get("staffId"),
    employeeId: getString("employeeId"),
    staffName: getString("staffName"),
    staffType: getString("staffType"),
    departmentId: get("departmentId"),
    departmentName: getString("departmentName"),
    designationId: get("designationId"),
    designation: getString("designation"),
    payrollMonth: Number(get("payrollMonth")),
    payrollYear: Number(get("payrollYear")),
    salaryStructureId: get("salaryStructureId"),
    structureName: getString("structureName"),
    basicPay: Number(get("basicPay")),
    hra: Number(get("hra")),
    da: Number(get("da")),
    conveyanceAllowance: Number(get("conveyanceAllowance")),
    medicalAllowance: Number(get("medicalAllowance")),
    otherAllowance: Number(get("otherAllowance")),
    pf: Number(get("pf")),
    professionalTax: Number(get("professionalTax")),
    tds: Number(get("tds")),
    esi: Number(get("esi")),
    insuranceOtherDeduction: Number(get("insuranceOtherDeduction")),
    grossSalary: Number(get("grossSalary")),
    totalDeductions: Number(get("totalDeductions")),
    netSalary: Number(get("netSalary")),
    payslipStatus: getString("payslipStatus"),
    generatedAt: getString("generatedAt"),
  };
}

export default function FacultyPayslips() {
  const context = useFacultySafe();
  const authUser = getAuthUser() || {};
  const profileData = context?.profileData || {};

  const [payslipList, setPayslipList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payslipYear, setPayslipYear] = useState("all");
  const [viewingPayslip, setViewingPayslip] = useState(null);
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

  useEffect(() => {
    fetchFacultyPayslips();
  }, [
    profileData?.facultyId,
    profileData?.staffId,
    profileData?.id,
    profileData?.employeeId,
    authUser?.staffId,
    authUser?.id,
    authUser?.employeeId,
  ]);

  const fetchFacultyPayslips = async () => {
    setLoading(true);
    try {
      const staffId =
        profileData?.facultyId ||
        profileData?.staffId ||
        profileData?.id ||
        authUser?.staffId ||
        authUser?.id;
      const employeeId =
        profileData?.employeeId ||
        profileData?.empId ||
        profileData?.staffCode ||
        authUser?.employeeId;
      const staffName =
        profileData?.fullName ||
        profileData?.name ||
        authUser?.name ||
        authUser?.fullName;

      const isMatch = (slip) => {
        if (staffId && slip.staffId != null && Number(slip.staffId) === Number(staffId)) {
          return true;
        }
        if (employeeId && slip.employeeId) {
          if (String(slip.employeeId).trim().toLowerCase() === String(employeeId).trim().toLowerCase()) {
            return true;
          }
        }
        if (staffName && slip.staffName) {
          const sName = String(slip.staffName).trim().toLowerCase();
          const myName = String(staffName).trim().toLowerCase();
          if (sName === myName) return true;
        }
        return false;
      };

      let list = [];
      if (employeeId) {
        try {
          const searchRes = await apiClient.get("/api/v1/Payroll/payslips", {
            params: { search: employeeId },
          });
          const raw = searchRes.data?.data || searchRes.data?.Data || searchRes.data?.items || searchRes.data;
          list = Array.isArray(raw) ? raw : (raw?.items || raw?.payslips || raw?.$values || []);
        } catch (searchErr) {
          console.warn("Search payslips endpoint failed, falling back to full list:", searchErr);
        }
      }

      let normalized = list.map(normalizePayslip);
      let matched = normalized.filter(isMatch);

      // Fallback: if search didn't return any matched payslips for this faculty, fetch all and filter
      if (matched.length === 0) {
        try {
          const allRes = await apiClient.get("/api/v1/Payroll/payslips");
          const allRaw = allRes.data?.data || allRes.data?.Data || allRes.data?.items || allRes.data;
          const allList = Array.isArray(allRaw) ? allRaw : (allRaw?.items || allRaw?.payslips || allRaw?.$values || []);
          const allNormalized = allList.map(normalizePayslip);
          matched = allNormalized.filter(isMatch);
        } catch (fallbackErr) {
          console.warn("Fetching all payslips failed:", fallbackErr);
        }
      }

      // Sort newest generated first (payrollYear desc, payrollMonth desc)
      matched.sort((a, b) => {
        const yearDiff = Number(b.payrollYear || 0) - Number(a.payrollYear || 0);
        if (yearDiff !== 0) return yearDiff;
        return Number(b.payrollMonth || 0) - Number(a.payrollMonth || 0);
      });

      setPayslipList(matched);
    } catch (error) {
      console.warn("Could not load faculty payslips from server:", error);
      setPayslipList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayslip = async (slip) => {
    if (!slip || !slip.payslipId) {
      notify("No generated payslip available to view for this period yet.", "info");
      return;
    }
    setViewingPayslip(slip);
    try {
      const res = await apiClient.get(`/api/v1/Payroll/payslips/${slip.payslipId}`);
      const payload = res.data?.data || res.data?.Data || res.data;
      if (payload && (payload.payslipId || payload.PayslipId)) {
        setViewingPayslip(normalizePayslip(payload));
      }
    } catch (err) {
      console.warn("Could not load payslip detail, showing cached record", err);
    }
  };

  const handleDownloadPdf = async (slip) => {
    if (!slip || !slip.payslipId) {
      notify("No payslip PDF available to download for this period yet.", "info");
      return;
    }
    setDownloadingId(slip.payslipId);
    try {
      let response;
      try {
        response = await apiClient.get(`/api/v1/Payroll/payslips/${slip.payslipId}/download-pdf`, {
          responseType: "blob",
        });
      } catch (err1) {
        response = await apiClient.get(`/api/v1/Payroll/payslips/${slip.payslipId}/pdf`, {
          responseType: "blob",
        });
      }

      if (response && response.data) {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const monthStr = getMonthName(slip.payrollMonth);
        link.download = `Payslip_${monthStr}_${slip.payrollYear || new Date().getFullYear()}.pdf`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 1000);
        notify(`Payslip for ${monthStr} ${slip.payrollYear || ""} downloaded successfully!`);
      }
    } catch (error) {
      console.error("Failed to download payslip PDF", error);
      notify("Failed to download PDF from server.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter by year
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(payslipList.map((item) => String(item.payrollYear || "")))).filter(Boolean);
    return years.sort((a, b) => b.localeCompare(a));
  }, [payslipList]);

  const filteredPayslips = useMemo(() => {
    return payslipList.filter((item) => payslipYear === "all" || String(item.payrollYear) === payslipYear);
  }, [payslipList, payslipYear]);

  const current = filteredPayslips[0];
  const pastSlips = filteredPayslips.slice(1);

  // Fallback slip with 0 values when empty or server disconnected
  const activeSlip = current || {
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0,
    payrollMonth: new Date().getMonth() + 1,
    payrollYear: new Date().getFullYear(),
  };

  return (
    <div className="payslip-container">
      {/* Header */}
      <div className="payslip-header">
        <div>
          <h1 className="main-title">My Payslips</h1>
          <p className="subtitle">Track your salary, deductions and downloads</p>
        </div>
        <div className="header-badge">
          <Wallet size={16} />
          <span>{filteredPayslips.length} Records</span>
          <select
            aria-label="Filter payslips by year"
            value={payslipYear}
            onChange={(event) => setPayslipYear(event.target.value)}
          >
            <option value="all">All years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Payslip Card — ALWAYS SHOWN with 0 values fallback */}
      <div className="payslip-card current-card">
        <div className="card-top">
          <div className="section-title-wrap">
            <Wallet size={20} />
            <h2>Current Payslip</h2>
          </div>
          <div className="month-badge">
            <Calendar size={14} />
            <span>{getPeriod(activeSlip)}</span>
          </div>
        </div>

        {/* 3 Salary KPI Boxes */}
        <div className="salary-cards">
          <div className="salary-box gross-box">
            <span>Gross Salary</span>
            <h3>{money(activeSlip.grossSalary)}</h3>
          </div>
          <div className="salary-box deduction-box">
            <span>Deductions</span>
            <h3>{money(activeSlip.totalDeductions)}</h3>
          </div>
          <div className="salary-box net-box">
            <span>Net Pay</span>
            <h3>{money(activeSlip.netSalary)}</h3>
          </div>
        </div>

        <div className="action-buttons">
          <button type="button" className="view-btn" onClick={() => handleViewPayslip(current)}>
            <Eye size={16} /> View Payslip
          </button>
          <button
            type="button"
            className="download-btn"
            disabled={downloadingId === current?.payslipId}
            onClick={() => handleDownloadPdf(current)}
          >
            {downloadingId === current?.payslipId ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Download size={16} />
            )}{" "}
            Download PDF
          </button>
        </div>

        {/* Valuable message when no generated payslip exists yet */}
        {!current && (
          <div className="payslip-empty-notice">
            <AlertCircle size={16} />
            <span>No payslips not generated yet.</span>
          </div>
        )}
      </div>

      {/* Past Payslips Card — ALWAYS SHOWN */}
      <div className="payslip-card">
        <div className="past-header">
          <div className="section-title-wrap">
            <Calendar size={20} />
            <h2>Past Payslips</h2>
          </div>
        </div>

        {pastSlips.length === 0 ? (
          <p className="past-empty-msg">No earlier payslips for the selected year.</p>
        ) : (
          <div className="past-list">
            {pastSlips.map((p) => (
              <div key={p.payslipId} className="past-item">
                <div className="past-left">
                  <span className="past-calendar-icon">
                    <Calendar size={20} />
                  </span>
                  <div>
                    <strong>{getPeriod(p)}</strong>
                    <p>
                      Net Salary: <b>{money(p.netSalary)}</b>
                    </p>
                  </div>
                </div>
                <div className="icons">
                  <button
                    type="button"
                    className="icon-btn"
                    title="View Payslip"
                    aria-label={`View ${getPeriod(p)} payslip`}
                    onClick={() => handleViewPayslip(p)}
                  >
                    <Eye size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Download PDF"
                    aria-label={`Download ${getPeriod(p)} payslip`}
                    disabled={downloadingId === p.payslipId}
                    onClick={() => handleDownloadPdf(p)}
                  >
                    {downloadingId === p.payslipId ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Download size={17} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Itemized Payslip Modal */}
      {viewingPayslip && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setViewingPayslip(null)}>
          <div className="cms-modal">
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Payslip — {getPeriod(viewingPayslip)}</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                  Employee ID: {viewingPayslip.employeeId || profileData.employeeId || authUser.employeeId || "--"} · {viewingPayslip.staffName || profileData.fullName || authUser.name || "--"}
                </span>
              </div>
              <button className="cms-icon-btn" onClick={() => setViewingPayslip(null)}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {/* Earnings */}
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "var(--cms-green)", fontSize: 13, fontWeight: 800 }}>EARNINGS</h4>
                  <table className="sp-payslip-table">
                    <tbody>
                      <tr><td>Basic Pay</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.basicPay)}</td></tr>
                      <tr><td>House Rent Allowance (HRA)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.hra)}</td></tr>
                      <tr><td>Dearness Allowance (DA)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.da)}</td></tr>
                      <tr><td>Conveyance Allowance</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.conveyanceAllowance)}</td></tr>
                      <tr><td>Medical Allowance</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.medicalAllowance)}</td></tr>
                      <tr><td>Other Allowance</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.otherAllowance)}</td></tr>
                      <tr style={{ background: "var(--cms-primary-soft)" }}>
                        <td><strong>Gross Earnings</strong></td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--cms-primary-dark)" }}>{money(viewingPayslip.grossSalary)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "var(--cms-red)", fontSize: 13, fontWeight: 800 }}>DEDUCTIONS</h4>
                  <table className="sp-payslip-table">
                    <tbody>
                      <tr><td>Provident Fund (PF)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.pf)}</td></tr>
                      <tr><td>Professional Tax (PT)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.professionalTax)}</td></tr>
                      <tr><td>TDS (Income Tax)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.tds)}</td></tr>
                      <tr><td>ESI</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.esi)}</td></tr>
                      <tr><td>Insurance / Other Deduction</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(viewingPayslip.insuranceOtherDeduction)}</td></tr>
                      <tr style={{ background: "var(--cms-red-soft)" }}>
                        <td><strong>Total Deductions</strong></td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--cms-red)" }}>{money(viewingPayslip.totalDeductions)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sp-payslip-total" style={{ marginTop: 20, display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--cms-primary-soft)", borderRadius: 8, fontWeight: 800 }}>
                <span>NET SALARY PAYABLE</span>
                <span>{money(viewingPayslip.netSalary)}</span>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setViewingPayslip(null)}>Close</button>
              <button
                className="cms-btn cms-btn-primary"
                disabled={downloadingId === viewingPayslip.payslipId}
                onClick={() => handleDownloadPdf(viewingPayslip)}
              >
                {downloadingId === viewingPayslip.payslipId ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Download size={14} />
                )}{" "}
                Download PDF
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


