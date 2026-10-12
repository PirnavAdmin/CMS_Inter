import React, { useEffect, useRef, useState } from "react";
import { Wallet, Calendar, Eye, Download, X, RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "../../../api/apiClient.js";
import { getDriverPayslips, getDriverPayslip, getDriverPayslipPdf } from "../data/driverPayslipApi.js";
import { useDriverData } from "../DriverDataContext.jsx";
import { payslipNotificationKey } from "../data/driverPayslipNotifications.js";
import "./DriverPayslipsPage.css";

const money = (value) => value == null ? "--" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
const period = (slip) => `${new Date(2000, Number(slip.payrollMonth) - 1, 1).toLocaleString("en-IN", { month: "long" })} ${slip.payrollYear}`;
const earnings = [["Basic Pay", "basicPay"], ["House Rent Allowance (HRA)", "hra"], ["Dearness Allowance (DA)", "da"], ["Conveyance Allowance", "conveyanceAllowance"], ["Medical Allowance", "medicalAllowance"], ["Other Allowance", "otherAllowance"]];
const deductions = [["Provident Fund (PF)", "pf"], ["Professional Tax (PT)", "professionalTax"], ["TDS (Income Tax)", "tds"], ["ESI", "esi"], ["Insurance / Other Deduction", "insuranceOtherDeduction"]];

export default function DriverPayslipsPage() {
  const { driverProfile, notifications } = useDriverData();
  const notificationKey = payslipNotificationKey(notifications);
  const [slips, setSlips] = useState([]);
  const [year, setYear] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [downloadId, setDownloadId] = useState(null);
  const dialogRef = useRef(null);
  const detailController = useRef(null);
  const selectedId = selected?.payslipId;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const load = async (initial = false) => {
      try {
        const list = await getDriverPayslips(driverProfile.employeeId, controller.signal);
        if (!controller.signal.aborted) { setSlips(list); setError(""); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure.response?.status === 404 ? "Driver payslip access is not available on the server yet." : getApiErrorMessage(failure)); }
      finally { if (initial && !controller.signal.aborted) setLoading(false); }
    };
    let pending = false;
    const refresh = async (initial = false) => {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try { await load(initial); } finally { pending = false; }
    };
    refresh(true);
    const refreshVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refreshVisible); };
  }, [revision, driverProfile.employeeId, notificationKey]);
  useEffect(() => () => detailController.current?.abort(), []);
  useEffect(() => {
    if (selectedId == null) return;
    const trigger = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") { detailController.current?.abort(); setSelected(null); }
      if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll("button:not(:disabled)");
        const first = buttons?.[0], last = buttons?.[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); trigger?.focus(); };
  }, [selectedId]);
  const view = async (slip) => {
    detailController.current?.abort();
    const controller = new AbortController(); detailController.current = controller;
    setSelected(slip); setDetailLoading(true); setDetailError("");
    try {
      const data = await getDriverPayslip(slip, controller.signal);
      if (!controller.signal.aborted) setSelected(data);
    } catch (failure) { if (!controller.signal.aborted) setDetailError(getApiErrorMessage(failure)); }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  };
  const download = async (slip) => {
    if (downloadId != null) return;
    setDownloadId(slip.payslipId); setError("");
    try {
      const pdf = await getDriverPayslipPdf(slip);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a"); link.href = url; link.download = `Payslip_${slip.payrollYear}_${slip.payrollMonth}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(getApiErrorMessage(failure)); setDetailError(getApiErrorMessage(failure)); }
    finally { setDownloadId(null); }
  };
  const filtered = slips.filter((slip) => year === "all" || String(slip.payrollYear) === year);
  const current = filtered[0];
  const close = () => { detailController.current?.abort(); setSelected(null); };
  return <div className="dp-page-container dp-payslips">
    <div className="dp-page-header"><div><h1 className="dp-page-title">My Payslips</h1><p className="dp-page-subtitle">Track your salary, deductions and downloads</p></div><div className="dp-payslip-years"><Wallet size={17} /><span>{filtered.length} Records</span><select aria-label="Filter payslips by year" value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{[...new Set(slips.map((slip) => slip.payrollYear))].map((value) => <option key={value}>{value}</option>)}</select></div></div>
    {error && <div className="dp-payslip-error" role="alert">{error} <button type="button" className="dp-btn dp-btn-outline" onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15} /> Retry</button></div>}
    {loading ? <p role="status">Loading your payslips...</p> : current ? <>
      <section className="dp-payslip-card"><div className="dp-payslip-card-head"><h2><Wallet size={20} /> Current Payslip</h2><span className="dp-payslip-period"><Calendar size={15} />{period(current)}</span></div><div className="dp-payslip-metrics">{[["Gross Salary", current.grossSalary, "gross"], ["Deductions", current.totalDeductions, "deductions"], ["Net Pay", current.netSalary, "net"]].map(([label, value, tone]) => <div key={label}><span>{label}</span><strong className={tone}>{money(value)}</strong></div>)}</div><div className="dp-payslip-actions"><button type="button" className="dp-btn dp-btn-primary" onClick={() => view(current)}><Eye size={16} /> View Payslip</button><button type="button" className="dp-btn dp-btn-outline" disabled={downloadId != null} onClick={() => download(current)}><Download size={16} /> Download PDF</button></div></section>
      <section className="dp-payslip-card"><h2><Calendar size={20} /> Past Payslips</h2>{filtered.slice(1).map((slip) => <div className="dp-payslip-history-row" key={slip.payslipId}><span className="dp-payslip-calendar"><Calendar size={20} /></span><div><strong>{period(slip)}</strong><p>Net Salary: <b>{money(slip.netSalary)}</b></p></div><div className="dp-payslip-row-actions"><button type="button" className="dp-icon-btn" aria-label={`View ${period(slip)} payslip`} onClick={() => view(slip)}><Eye size={17} /></button><button type="button" className="dp-icon-btn" aria-label={`Download ${period(slip)} payslip`} disabled={downloadId != null} onClick={() => download(slip)}><Download size={17} /></button></div></div>)}{filtered.length === 1 && <p className="dp-payslip-muted">No earlier payslips for the selected year.</p>}</section>
    </> : !error && <section className="dp-payslip-card"><h2>No payslips available</h2><p className="dp-payslip-muted">No generated payslips were returned for your account. A salary assignment alone does not create a monthly payslip; the admin must generate it in Payroll.</p></section>}
    {selected && <div className="dp-modal-backdrop" onClick={close}><div ref={dialogRef} className="dp-modal-card dp-payslip-modal" role="dialog" aria-modal="true" aria-labelledby="driver-payslip-title" onClick={(event) => event.stopPropagation()}><div className="dp-modal-header"><div><h2 id="driver-payslip-title">Payslip — {period(selected)}</h2><p>Employee ID: {selected.employeeId || driverProfile.employeeId} · {selected.staffName || driverProfile.name}</p></div><button type="button" className="dp-modal-close" aria-label="Close payslip" onClick={close}><X size={20} /></button></div>{detailLoading ? <p className="dp-payslip-modal-body" role="status">Loading payslip details...</p> : detailError ? <p className="dp-payslip-error" role="alert">{detailError}</p> : <div className="dp-payslip-modal-body"><div className="dp-payslip-breakdown">{[["EARNINGS", earnings, "Gross Earnings", selected.grossSalary], ["DEDUCTIONS", deductions, "Total Deductions", selected.totalDeductions]].map(([title, rows, totalLabel, total]) => <section key={title}><h3 className={title === "DEDUCTIONS" ? "deductions" : "earnings"}>{title}</h3><table><tbody>{rows.map(([label, field]) => <tr key={field}><td>{label}</td><td>{money(selected[field])}</td></tr>)}<tr className="dp-payslip-total"><th scope="row">{totalLabel}</th><td>{money(total)}</td></tr></tbody></table></section>)}</div><div className="dp-payslip-net"><strong>NET SALARY PAYABLE</strong><strong>{money(selected.netSalary)}</strong></div></div>}<div className="dp-modal-footer"><button type="button" className="dp-btn dp-btn-outline" onClick={close}>Close</button><button type="button" className="dp-btn dp-btn-primary" disabled={detailLoading || !!detailError || downloadId != null} onClick={() => download(selected)}><Download size={16} /> Download PDF</button></div></div></div>}
  </div>;
}
