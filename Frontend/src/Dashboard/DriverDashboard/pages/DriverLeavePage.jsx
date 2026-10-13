import React, { useEffect, useRef, useState } from "react";
import { FileText, Plus, Search, X } from "lucide-react";
import { getDriverLeaves, applyDriverLeave, getDriverLeaveCategories, DRIVER_LEAVE_TYPES } from "../data/driverLeaveApi.js";
import { getApiErrorMessage } from "../../../api/apiClient.js";
import { useDriverData } from "../DriverDataContext.jsx";
import "./DriverLeavePage.css";

const dateLabel = (value) => value ? String(value).slice(0, 10) : "--";
const emptyForm = { type: "", fromDate: "", toDate: "", reason: "" };

export default function DriverLeavePage() {
  const { driverProfile: sessionProfile } = useDriverData();
  const [details, setDetails] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const leaveOptions = categories.length ? categories : DRIVER_LEAVE_TYPES;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);
  const submitLock = useRef(false);
  const applications = Array.isArray(details.history) ? details.history : [];
  const driverProfile = { ...sessionProfile, name: details.staffName || sessionProfile.name, employeeId: details.staffCode || sessionProfile.employeeId, department: details.department || sessionProfile.department, role: details.staffType || sessionProfile.role };
  const types = [...new Set([...leaveOptions.map((item) => item.name), ...applications.map((item) => item.leaveCategoryName || item.leaveType)].filter(Boolean))];
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
    const controller = new AbortController();
    const load = async () => {
      try {
        const result = await getDriverLeaves(controller.signal);
        if (!controller.signal.aborted) { setDetails(result); setLoadError(""); }
      } catch (failure) { if (!controller.signal.aborted) setLoadError(getApiErrorMessage(failure)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    const refreshVisible = () => { if (document.visibilityState === "visible") load(); };
    const timer = setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refreshVisible); };
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    getDriverLeaveCategories(controller.signal).then((items) => {
      if (!controller.signal.aborted) { setCategories(items); setCategoryError(items.length ? "" : "No active leave categories are available."); }
    }).catch((failure) => { if (!controller.signal.aborted) setCategoryError(getApiErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setCategoriesLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = applyRef.current;
    dialogRef.current?.querySelector("select")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll("button:not(:disabled), input, select, textarea");
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); trigger?.focus(); };
  }, [open, submitting]);

  const days = form.fromDate && form.toDate && form.toDate >= form.fromDate ? Math.round((Date.parse(form.toDate) - Date.parse(form.fromDate)) / 86400000) + 1 : 0;
  const submitLeave = async (event) => {
    event.preventDefault();
    if (submitLock.current) return;
    if (!days || !form.reason.trim() || !categories.some((item) => String(item.id) === form.type)) { setError("Select a leave type, enter a valid date range and provide a reason."); return; }
    submitLock.current = true; setSubmitting(true); setError(""); setMessage("");
    try {
      const result = await applyDriverLeave(form);
      setOpen(false); setForm(emptyForm);
      setQuery(""); setStatus(""); setType(""); setTab("applications");
      setMessage(result.message || "Leave application submitted successfully.");
      setRevision((value) => value + 1);
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { submitLock.current = false; setSubmitting(false); }
  };
  const filtered = applications.filter((item) => (!status || String(item.status).toLowerCase() === status.toLowerCase()) && (!type || (item.leaveCategoryName || item.leaveType) === type) && `${driverProfile.name} ${driverProfile.employeeId}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="dp-page-container dp-leave">
    <div className="dp-page-header">
      <h1 className="dp-page-title dp-leave-heading"><FileText size={30} /> Leave Management</h1>
      <button type="button" ref={applyRef} className="dp-btn dp-btn-primary" onClick={() => { setError(""); setOpen(true); }}><Plus size={20} /> Apply for Leave</button>
    </div>
    <div className="dp-leave-summary">
      <div className="dp-leave-stat"><span>APPROVED LEAVES</span><strong>{details.approved ?? "--"} Leaves</strong></div>
      <div className="dp-leave-stat is-warning"><span>PENDING APPROVALS</span><strong>{details.pending ?? "--"} Applications</strong></div>
      <div className="dp-leave-stat is-danger"><span>REJECTED / CANCELLED</span><strong>{details.rejected ?? "--"} Leaves</strong></div>
    </div>
    <div className="dp-leave-tabs" role="tablist" aria-label="Leave management">
      <button type="button" role="tab" id="driver-leave-applications-tab" aria-selected={tab === "applications"} aria-controls="driver-leave-panel" className={tab === "applications" ? "is-active" : ""} onClick={() => setTab("applications")}>Leave Applications</button>
      <button type="button" role="tab" id="driver-leave-balance-tab" aria-selected={tab === "balance"} aria-controls="driver-leave-panel" className={tab === "balance" ? "is-active" : ""} onClick={() => setTab("balance")}>Leave Balance</button>
    </div>
    <p className="dp-leave-service-note">{loading ? "Loading leave details..." : "Leave applications and balances are retrieved from the server."}</p>
    {loadError && <p className="dp-leave-error" role="alert">{loadError} <button type="button" className="dp-btn dp-btn-outline" onClick={() => setRevision((value) => value + 1)}>Retry</button></p>}
    {message && <p className="dp-leave-message" role="status">{message}</p>}
    <div role="tabpanel" id="driver-leave-panel" aria-labelledby={`driver-leave-${tab}-tab`}>
      {tab === "applications" ? <>
        <div className="dp-leave-filters">
          <label className="dp-leave-search"><Search size={18} /><input aria-label="Search employee name or employee ID" placeholder="Search employee name..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="dp-leave-selects"><select aria-label="Filter status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{["Pending", "Approved", "Rejected", "Cancelled"].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter leave type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All Leave Types</option>{types.map((value) => <option key={value}>{value}</option>)}</select></div>
        </div>
        <div className="dp-leave-table-wrap"><table className="dp-leave-table"><thead><tr>{["S.NO.", "EMPLOYEE", "EMP ID", "DEPARTMENT", "LEAVE TYPE", "FROM - TO DATE", "REQUESTED DAYS", "APPLIED ON", "STATUS"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
          {filtered.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><strong>{driverProfile.name}</strong></td><td>{driverProfile.employeeId}</td><td>{driverProfile.department || "--"}</td><td className="dp-leave-type">{item.leaveCategoryName || item.leaveType || "--"}</td><td className="dp-leave-dates">{dateLabel(item.startDate)} <span>to</span> {dateLabel(item.endDate)}</td><td><strong>{item.requestedDays} {item.requestedDays === 1 ? "Day" : "Days"}</strong></td><td>{dateLabel(item.appliedOn)}</td><td><span className={"dp-leave-badge status-" + String(item.status || "").toLowerCase()}>{item.status || "--"}</span></td></tr>)}
          {!filtered.length && <tr><td colSpan={9} className="dp-leave-empty">{loading ? "Loading leave applications..." : loadError ? "Leave applications could not be loaded." : applications.length ? "No applications match your filters." : "No leave applications yet. Use Apply for Leave to submit a request."}</td></tr>}
        </tbody></table></div>
      </> : <div className="dp-leave-table-wrap"><table className="dp-leave-table dp-leave-balance"><thead><tr>{["S.NO.", "EMPLOYEE", "CASUAL LEAVE BALANCE", "SICK LEAVE BALANCE", "EARNED LEAVE BALANCE", "USED LEAVE BALANCE", "TOTAL REMAINING BALANCE"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody><tr><td>1</td><td><strong>{driverProfile.name}</strong><small>{driverProfile.role} · {driverProfile.employeeId}</small></td>{["casualLeaves", "sickLeaves", "earnedLeaves", "used", "totalAvailable"].map((field) => <td key={field}>{details.balance?.[field] != null ? details.balance[field] + " Days" : "--"}</td>)}</tr></tbody></table></div>}
    </div>
    {open && <div className="dp-modal-backdrop" onClick={() => { if (!submitting) setOpen(false); }}><div ref={dialogRef} className="dp-modal-card dp-leave-modal" role="dialog" aria-modal="true" aria-labelledby="driver-apply-leave-title" onClick={(event) => event.stopPropagation()}><div className="dp-modal-header"><h2 id="driver-apply-leave-title">Apply for Leave</h2><button type="button" className="dp-modal-close" aria-label="Close leave form" disabled={submitting} onClick={() => setOpen(false)}><X size={20} /></button></div><form onSubmit={submitLeave} className="dp-leave-form">
      <p>Submit a leave application for {driverProfile.name}.</p>
      {categoryError && <p className="dp-leave-error" role="alert">{categoryError}</p>}
      <label>Leave Type<select required disabled={categoriesLoading || submitting} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="">{categoriesLoading ? "Loading Leave Types..." : "Select Leave Type"}</option>{leaveOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {!categoriesLoading && !categories.length && <p className="dp-leave-error" role="status">These leave types are shown for selection. The admin must configure active leave categories on the server before applications can be submitted.</p>}
      <div className="dp-leave-date-fields"><label>From Date<input type="date" required value={form.fromDate} onChange={(event) => setForm({ ...form, fromDate: event.target.value })} /></label><label>To Date<input type="date" required min={form.fromDate || undefined} value={form.toDate} onChange={(event) => setForm({ ...form, toDate: event.target.value })} /></label></div>
      <p>Requested duration: <strong>{days} calendar {days === 1 ? "day" : "days"}</strong></p>
      <label>Reason<textarea required maxLength={2000} rows={4} placeholder="Enter the reason for your leave" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
      {error && <p className="dp-leave-error" role="alert">{error}</p>}
      <div className="dp-leave-form-actions"><button type="button" className="dp-btn dp-btn-outline" disabled={submitting} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="dp-btn dp-btn-primary" disabled={submitting || !categories.length}>{submitting ? "Submitting..." : "Submit Application"}</button></div>
    </form></div></div>}
  </div>;
}
