import React, { useState } from "react";
import { Wallet, Calendar, Eye, Download, CalendarClock, X, Printer, AlertCircle, CheckCircle2 } from "lucide-react";
import "../styles/FacultyPayslips.css";
import { facultyMockData } from "../data/facultyMockData.js";

import { useFacultySafe } from "../FacultyContext.jsx";

export default function FacultyPayslips() {
  const context = useFacultySafe();
  const [payslipList] = useState(facultyMockData.payslips);
  const [payslipYear, setPayslipYear] = useState("all");
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [toast, setToast] = useState(null);
  const profileData = context?.profileData || facultyMockData.user;

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const filteredPayslips = payslipList.filter((item) => payslipYear === "all" || String(item.year) === payslipYear);
  const current = filteredPayslips[0];
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

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
            onChange={(event) => setPayslipYear(event.target.value)}
          >
            <option value="all">All years</option>
            {Array.from(new Set(payslipList.map((item) => String(item.year))))
              .sort((a, b) => b.localeCompare(a))
              .map((year) => (
                <option key={year}>{year}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Current Payslip Card */}
      {current && (
        <div className="payslip-card current-card">
          <div className="card-top">
            <div className="section-title-wrap">
              <Wallet size={18} color="var(--cms-primary)" />
              <h2>Current Payslip</h2>
            </div>
            <div className="month-badge">
              <Calendar size={13} />
              <span>{current.month}</span>
            </div>
          </div>

          {/* 3 Salary Boxes */}
          <div className="salary-cards">
            <div className="salary-box gross-box">
              <p>Gross Salary</p>
              <h3>{fmt(current.grossSalary)}</h3>
            </div>
            <div className="salary-box deduction-box">
              <p>Deductions</p>
              <h3>{fmt(current.totalDeductions)}</h3>
            </div>
            <div className="salary-box net-box">
              <p>Net Pay</p>
              <h3>{fmt(current.netSalary)}</h3>
            </div>
          </div>

          <div className="action-buttons">
            <button className="view-btn" onClick={() => setViewingPayslip(current)}>
              <Eye size={15} /> View Payslip
            </button>
            <button className="download-btn" onClick={() => notify(`Downloading payslip for ${current.month}...`)}>
              <Download size={15} /> Download PDF
            </button>
          </div>
        </div>
      )}

      {/* Past Payslips Card */}
      <div className="payslip-card">
        <div className="past-header">
          <div className="section-title-wrap">
            <CalendarClock size={18} color="var(--cms-muted)" />
            <h2>Past Payslips</h2>
          </div>
        </div>

        <div>
          {filteredPayslips.slice(1).map((p) => (
            <div key={p.id} className="past-item">
              <div className="past-left">
                <div style={{ background: "var(--cms-primary-soft)", padding: 8, borderRadius: 8, color: "var(--cms-primary)" }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <h4>{p.month}</h4>
                  <p>Net Salary: <strong>{fmt(p.netSalary)}</strong></p>
                </div>
              </div>
              <div className="icons">
                <button className="icon-btn" title="View Payslip" onClick={() => setViewingPayslip(p)}>
                  <Eye size={15} />
                </button>
                <button className="icon-btn" title="Download PDF" onClick={() => notify(`Downloading payslip for ${p.month}...`)}>
                  <Download size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Itemized Payslip Modal */}
      {viewingPayslip && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setViewingPayslip(null)}>
          <div className="cms-modal">
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Payslip — {viewingPayslip.month}</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Employee ID: {profileData.employeeId} · {profileData.fullName}</span>
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
                      <tr><td>Basic Pay</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.basicPay)}</td></tr>
                      <tr><td>House Rent Allowance (HRA)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.hra)}</td></tr>
                      <tr><td>Dearness Allowance (DA)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.da)}</td></tr>
                      <tr><td>Special Allowance</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.specialAllowance)}</td></tr>
                      <tr style={{ background: "var(--cms-primary-soft)" }}>
                        <td><strong>Gross Earnings</strong></td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--cms-primary-dark)" }}>{fmt(viewingPayslip.grossSalary)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "var(--cms-red)", fontSize: 13, fontWeight: 800 }}>DEDUCTIONS</h4>
                  <table className="sp-payslip-table">
                    <tbody>
                      <tr><td>Provident Fund (PF)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.pf)}</td></tr>
                      <tr><td>Professional Tax (PT)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.pt)}</td></tr>
                      <tr><td>TDS (Income Tax)</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(viewingPayslip.tds)}</td></tr>
                      <tr style={{ background: "var(--cms-red-soft)" }}>
                        <td><strong>Total Deductions</strong></td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--cms-red)" }}>{fmt(viewingPayslip.totalDeductions)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sp-payslip-total" style={{ marginTop: 20, display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--cms-primary-soft)", borderRadius: 8, fontWeight: 800 }}>
                <span>NET SALARY PAYABLE</span>
                <span>{fmt(viewingPayslip.netSalary)}</span>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setViewingPayslip(null)}>Close</button>
              <button className="cms-btn cms-btn-primary" onClick={() => notify("Printing payslip...")}>
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
