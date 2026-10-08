import React, { useEffect, useRef, useState } from "react";
import { FileText, Plus, Search, X } from "lucide-react";
import { getAuthUser } from "../../../features/authStorage.js";
import { useDriverData } from "../DriverDataContext.jsx";
import "./DriverLeavePage.css";

const types = ["Casual Leave", "Sick Leave", "Earned Leave"];
const emptyForm = { type: types[0], fromDate: "", toDate: "", reason: "" };

export default function DriverLeavePage() {
  const { driverProfile } = useDriverData();
  const user = getAuthUser();
  const identity = user?.staffId ?? user?.id ?? user?.employeeId ?? user?.email;
  const storageKey = identity != null ? `driver_leave_drafts_v1:${identity}` : null;
  const [applications, setApplications] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved.filter((item) => item && item.status === "Draft" && types.includes(item.type) && /^\d{4}-\d{2}-\d{2}$/.test(item.fromDate) && /^\d{4}-\d{2}-\d{2}$/.test(item.toDate)) : [];
    } catch { return []; }
  });
  const [tab, setTab] = useState("applications");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dialogRef = useRef(null);
  const applyRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const trigger = applyRef.current;
    dialogRef.current?.querySelector("select")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll("button, input, select, textarea");
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); trigger?.focus(); };
  }, [open]);

  const days = form.fromDate && form.toDate && form.toDate >= form.fromDate ? Math.round((Date.parse(form.toDate) - Date.parse(form.fromDate)) / 86400000) + 1 : 0;
  const saveDraft = (event) => {
    event.preventDefault();
    if (!storageKey) { setError("Sign in with your driver account to save a draft."); return; }
    if (!days || !form.reason.trim()) { setError("Enter a valid date range and a reason for leave."); return; }
    const next = [...applications, { ...form, reason: form.reason.trim(), id: crypto.randomUUID(), days, savedOn: new Date().toISOString().slice(0, 10), status: "Draft" }];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setApplications(next);
      setOpen(false);
      setForm(emptyForm);
      setQuery(""); setStatus(""); setType(""); setTab("applications");
      setMessage("Leave draft saved in this browser. It has not been submitted for approval.");
    } catch { setError("Unable to save the draft. Please enable browser storage and try again."); }
  };
  const filtered = applications.filter((item) => (!status || item.status === status) && (!type || item.type === type) && `${driverProfile.name} ${driverProfile.employeeId}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="dp-page-container dp-leave">
    <div className="dp-page-header">
      <h1 className="dp-page-title dp-leave-heading"><FileText size={30} /> Leave Management</h1>
      <button type="button" ref={applyRef} className="dp-btn dp-btn-primary" onClick={() => { setError(""); setOpen(true); }}><Plus size={20} /> Apply for Leave</button>
    </div>
    <div className="dp-leave-summary">
      <div className="dp-leave-stat"><span>APPROVED LEAVES</span><strong>-- Leaves</strong></div>
      <div className="dp-leave-stat is-warning"><span>PENDING APPROVALS</span><strong>-- Applications</strong></div>
      <div className="dp-leave-stat is-danger"><span>REJECTED / CANCELLED</span><strong>-- Leaves</strong></div>
    </div>
    <div className="dp-leave-tabs" role="tablist" aria-label="Leave management">
      <button type="button" role="tab" id="driver-leave-applications-tab" aria-selected={tab === "applications"} aria-controls="driver-leave-panel" className={tab === "applications" ? "is-active" : ""} onClick={() => setTab("applications")}>Leave Applications</button>
      <button type="button" role="tab" id="driver-leave-balance-tab" aria-selected={tab === "balance"} aria-controls="driver-leave-panel" className={tab === "balance" ? "is-active" : ""} onClick={() => setTab("balance")}>Leave Balance</button>
    </div>
    <p className="dp-leave-service-note">Leave approval and balance services are not connected yet. Applications can be saved as browser drafts.</p>
    {message && <p className="dp-leave-message" role="status">{message}</p>}
    <div role="tabpanel" id="driver-leave-panel" aria-labelledby={`driver-leave-${tab}-tab`}>
      {tab === "applications" ? <>
        <div className="dp-leave-filters">
          <label className="dp-leave-search"><Search size={18} /><input aria-label="Search employee name or employee ID" placeholder="Search employee name..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="dp-leave-selects"><select aria-label="Filter status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{["Draft", "Pending", "Approved", "Rejected", "Cancelled"].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter leave type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All Leave Types</option>{types.map((value) => <option key={value}>{value}</option>)}</select></div>
        </div>
        <div className="dp-leave-table-wrap"><table className="dp-leave-table"><thead><tr>{["S.NO.", "EMPLOYEE", "EMP ID", "DEPARTMENT", "LEAVE TYPE", "FROM - TO DATE", "REQUESTED DAYS", "APPLIED ON", "STATUS"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
          {filtered.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><strong>{driverProfile.name}</strong></td><td>{driverProfile.employeeId}</td><td>{driverProfile.department || "--"}</td><td className="dp-leave-type">{item.type}</td><td className="dp-leave-dates">{item.fromDate} <span>to</span> {item.toDate}</td><td><strong>{item.days} {item.days === 1 ? "Day" : "Days"}</strong></td><td>--<small>Draft saved: {item.savedOn}</small></td><td><span className="dp-leave-badge">Draft</span></td></tr>)}
          {!filtered.length && <tr><td colSpan={9} className="dp-leave-empty">{applications.length ? "No applications match your filters." : "No leave applications yet. Use Apply for Leave to create a draft."}</td></tr>}
        </tbody></table></div>
      </> : <div className="dp-leave-table-wrap"><table className="dp-leave-table dp-leave-balance"><thead><tr>{["S.NO.", "EMPLOYEE", "CASUAL LEAVE BALANCE", "SICK LEAVE BALANCE", "EARNED LEAVE BALANCE", "USED LEAVE BALANCE", "TOTAL REMAINING BALANCE"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody><tr><td>1</td><td><strong>{driverProfile.name}</strong><small>{driverProfile.role} · {driverProfile.employeeId}</small></td>{Array.from({ length: 5 }, (_, index) => <td key={index}>--</td>)}</tr></tbody></table></div>}
    </div>
    {open && <div className="dp-modal-backdrop" onClick={() => setOpen(false)}><div ref={dialogRef} className="dp-modal-card dp-leave-modal" role="dialog" aria-modal="true" aria-labelledby="driver-apply-leave-title" onClick={(event) => event.stopPropagation()}><div className="dp-modal-header"><h2 id="driver-apply-leave-title">Apply for Leave</h2><button type="button" className="dp-modal-close" aria-label="Close leave form" onClick={() => setOpen(false)}><X size={20} /></button></div><form onSubmit={saveDraft} className="dp-leave-form">
      <p>Save a draft for {driverProfile.name}. Submission for approval requires the leave API.</p>
      <label>Leave Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{types.map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="dp-leave-date-fields"><label>From Date<input type="date" required value={form.fromDate} onChange={(event) => setForm({ ...form, fromDate: event.target.value })} /></label><label>To Date<input type="date" required min={form.fromDate || undefined} value={form.toDate} onChange={(event) => setForm({ ...form, toDate: event.target.value })} /></label></div>
      <p>Requested duration: <strong>{days} calendar {days === 1 ? "day" : "days"}</strong></p>
      <label>Reason<textarea required maxLength={2000} rows={4} placeholder="Enter the reason for your leave" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
      {error && <p className="dp-leave-error" role="alert">{error}</p>}
      <div className="dp-leave-form-actions"><button type="button" className="dp-btn dp-btn-outline" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="dp-btn dp-btn-primary">Save Draft</button></div>
    </form></div></div>}
  </div>;
}
