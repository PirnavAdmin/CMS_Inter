import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Eye, Pencil, Power, UserPlus, X } from "lucide-react";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import superAdminApi from "@/api/superAdminApi.js";
import { activeAccountCount, collegeAdmins } from "../superAdminDataUtils.js";
import SuperAdminTable, { SuperAdminBadge } from "../components/SuperAdminTable.jsx";
import "./CollegesPage.css";

const blank = { name: "", code: "", email: "", phone: "", address: "", applicantName: "", applicantEmail: "", contact: "", plan: "Free" };
export default function CollegesPage({ registrations = false }) {
  const { data, update, session } = useSuperAdmin();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");
  const [nextCollege, setNextCollege] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [searchReset, setSearchReset] = useState(0);
  const title = registrations ? "College Registrations" : "All Colleges";
  const source = registrations ? data.registrations : data.colleges;
  const rows = source.map((row) => ({ ...row, admin: registrations ? row.applicantName : collegeAdmins(data, row.id).map((admin) => admin.name).join(", "), displayStatus: registrations ? row.registrationStatus : row.collegeStatus, adminSetup: collegeAdmins(data, registrations ? row.collegeId : row.id).length ? "Admin Assigned" : "Admin Not Assigned" }))
    .filter((row) => (!statusFilter || row.displayStatus === statusFilter) && (!planFilter || row.plan === planFilter) && (!adminFilter || (row.adminSetup === "Admin Assigned") === (adminFilter === "assigned")))
    .sort((a, b) => {
      if (!registrations) return 0;
      if (sort.startsWith("name")) return a.name.localeCompare(b.name) * (sort === "name-asc" ? 1 : -1);
      const first = Date.parse(a.submittedAt), second = Date.parse(b.submittedAt);
      if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
      if (!Number.isFinite(second)) return -1;
      return (first - second) * (sort === "oldest" ? 1 : -1);
    });
  const summaries = registrations ? [["", "Total Registrations", "campus-configuration", "blue", source.length], ...[["Pending", "Pending Registrations", "notifications", "amber"], ["Approved", "Approved Registrations", "mark-attendance", "green"], ["Rejected", "Rejected Registrations", "leave-types", "red"]].map(([status, label, icon, tone]) => [status, label, icon, tone, source.filter((row) => row.registrationStatus === status).length])] : [["", "Total Colleges", "campus-configuration", "blue", source.length], ["Active", "Active Colleges", "mark-attendance", "green", source.filter((row) => row.collegeStatus === "Active").length], ["Inactive", "Inactive Colleges", "leave-types", "amber", source.filter((row) => row.collegeStatus === "Inactive").length], ["unassigned", "Colleges Without Admin", "teaching-staff", "red", source.filter((row) => !collegeAdmins(data, row.id).length).length]];
  const openForm = (row) => { setError(""); setForm({ ...blank, ...row }); };
  const save = async (event) => {
    event.preventDefault(); setError("");
    const collegeForm = { ...form };
    delete collegeForm.logo;
    delete collegeForm.logoUrl;
    delete collegeForm.initialAdminName;
    delete collegeForm.adminEmail;
    delete collegeForm.applicantName;
    delete collegeForm.applicantEmail;
    const payload = { ...collegeForm, phone: form.phone || form.contact || "" };
    if (registrations) {
      payload.applicantName = form.applicantName || "";
      payload.applicantEmail = form.applicantEmail || "";
    }
    const saved = await update(registrations ? "Saved registration application" : "Saved college", null, { module: registrations ? "Registrations" : "Colleges", actionType: form.id ? "Update" : "Create", collegeId: form.collegeId || form.id, payload });
    if (saved) { setForm(null); if (!registrations) setNextCollege(form.id || payload.id); }
    else setError("Could not save. Check the API error above and correct the form.");
  };
  const review = (row, status) => setConfirm({ title: `${status === "Approved" ? "Approve" : "Reject"} registration?`, message: status === "Approved" ? `Approve ${row.name}?` : `Reject ${row.name}?`, run: async () => {
    const saved = await update(`${status} registration: ${row.name}`, null, { module: "Registrations", actionType: status, collegeId: row.collegeId || row.id, id: row.id });
    if (saved && status === "Approved") setNextCollege(row.collegeId || row.id);
  } });
  const assignLink = (collegeId) => `/super-admin/college-admins?collegeId=${encodeURIComponent(collegeId)}&action=create`;
  const viewing = detail || (!registrations && params.get("view") ? data.colleges.find((row) => row.id === params.get("view")) : null);
  const openDetails = async (row) => {
    setDetail(row);
    if (!row?.id) return;
    try { setDetail({ ...row, ...await superAdminApi.getCollegeById(row.id) }); }
    catch (apiError) { setDetail({ ...row, detailError: apiError?.response?.data?.message || apiError.message }); }
  };
  const closeDetails = () => { setDetail(null); if (params.has("view")) setParams((current) => { const next = new URLSearchParams(current); next.delete("view"); return next; }); };
  return <div className="sa-page"><header className="sa-page-head"><div><span className="sa-eyebrow">College management</span><h1><span className="sa-page-title-icon"><ThreeDIcon name="campus-configuration" size={27}/></span>{title}</h1><p>{registrations ? "Review college registration requests from the platform API." : "College directory, subscription ownership and administrator setup."}</p></div><button className="cms-btn cms-btn-primary" onClick={() => openForm(null)}>{registrations ? "Submit Registration" : "Add College"}</button></header>
    <div className="sa-registration-summary">{summaries.map(([status, label, icon, tone, count]) => <button type="button" key={label} className={`sa-registration-stat tone-${tone}${(status === "unassigned" ? adminFilter === "unassigned" : statusFilter === status && !adminFilter) ? " is-selected" : ""}`} onClick={() => { setStatusFilter(status === "unassigned" ? "" : status); setAdminFilter(status === "unassigned" ? "unassigned" : ""); }}><span className="sa-registration-stat-icon"><ThreeDIcon name={icon} size={25}/></span><span><small>{label}</small><strong>{count}</strong></span></button>)}</div>
    {nextCollege && <section className="sa-panel sa-onboarding-next" role="status"><strong>College saved. Next: Assign College Admin.</strong><div className="sa-actions"><Link className="cms-btn" to={`/super-admin/colleges?view=${encodeURIComponent(nextCollege)}`}>View College</Link><Link className="cms-btn cms-btn-primary" to={assignLink(nextCollege)}>Assign College Admin</Link><button className="cms-btn" onClick={() => setNextCollege(null)}>Dismiss</button></div></section>}
    <SuperAdminTable key={searchReset} title={registrations ? "Registration Management" : "College directory"} rows={rows} filterKey={`${statusFilter}:${planFilter}:${adminFilter}:${sort}`} toolbar={<div className="sa-registration-filters"><label>{registrations ? "Registration Status" : "College Status"}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">{registrations ? "All Registrations" : "All Statuses"}</option>{(registrations ? ["Pending", "Approved", "Rejected"] : ["Active", "Inactive"]).map((status) => <option key={status}>{status}</option>)}</select></label><label>Subscription Plan<select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}><option value="">All Plans</option>{data.plans.map((plan) => <option key={plan.id}>{plan.name}</option>)}</select></label>{registrations ? <label>Sort By<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="name-asc">College Name A–Z</option><option value="name-desc">College Name Z–A</option></select></label> : <label>Admin Assignment<select value={adminFilter} onChange={(event) => setAdminFilter(event.target.value)}><option value="">All Colleges</option><option value="assigned">Admin Assigned</option><option value="unassigned">Admin Not Assigned</option></select></label>}<button className="cms-btn" onClick={() => { setStatusFilter(""); setPlanFilter(""); setAdminFilter(""); setSort("newest"); setSearchReset((value) => value + 1); }}>Clear Filters</button></div>} columns={[
      { key: "name", label: "College", render: (row) => <div><strong>{row.name}</strong><small className="sa-college-code">{row.code}</small></div> }, { key: "admin", label: registrations ? "Applicant / Admin Contact" : "College Admin", render: (row) => row.admin || "Admin Not Assigned" }, { key: "email", label: "Email" }, { key: "plan", label: "Plan" }, { key: "usage", label: "Account Usage", render: (row) => { const id = registrations ? row.collegeId : row.id; return `${id ? activeAccountCount(data.users, id) : 0} / ${data.plans.find((plan) => plan.name === row.plan)?.limit ?? "—"}`; } }, { key: "displayStatus", label: "Status", render: (row) => <span className={`cms-badge sa-registration-badge status-${row.displayStatus?.toLowerCase()}`}>{row.displayStatus}</span> }, ...(!registrations ? [{ key: "adminSetup", label: "Admin Setup Status" }] : []),
      { key: "actions", label: "Actions", render: (row) => <div className="sa-user-actions sa-college-actions"><button type="button" className="cms-action-btn view" title="View college" aria-label={`View ${row.name}`} onClick={() => openDetails(row)}><Eye size={15}/></button>{(!registrations || row.registrationStatus === "Pending") && <button type="button" className="cms-action-btn edit" title="Edit college" aria-label={`Edit ${row.name}`} onClick={() => openForm(row)}><Pencil size={15}/></button>}{registrations ? row.registrationStatus === "Pending" ? <><button type="button" className="cms-action-btn activate" title="Approve registration" aria-label={`Approve ${row.name}`} onClick={() => review(row, "Approved")}><Check size={15}/></button><button type="button" className="cms-action-btn status" title="Reject registration" aria-label={`Reject ${row.name}`} onClick={() => review(row, "Rejected")}><X size={15}/></button></> : row.collegeId && <><Link className="cms-action-btn view" title="View college" aria-label={`View college ${row.name}`} to={`/super-admin/colleges?view=${encodeURIComponent(row.collegeId)}`}><Eye size={15}/></Link><Link className="cms-action-btn assign" title="Assign admin" aria-label={`Assign admin to ${row.name}`} to={assignLink(row.collegeId)}><UserPlus size={15}/></Link></> : <><button type="button" className={`cms-action-btn status ${row.status === "Active" ? "" : "activate"}`} title={row.status === "Active" ? "Deactivate college" : "Activate college"} aria-label={`${row.status === "Active" ? "Deactivate" : "Activate"} ${row.name}`} onClick={() => setConfirm({ title: "Change college status?", message: `${row.status === "Active" ? "Deactivate" : "Activate"} ${row.name}?`, run: () => update("Changed college status", null, { module: "Colleges", actionType: "Status change", collegeId: row.id }) })}><Power size={15}/></button><Link className="cms-action-btn assign" title="Assign admin" aria-label={`Assign admin to ${row.name}`} to={assignLink(row.id)}><UserPlus size={15}/></Link></>}</div> },
    ]}/>
    {form && <Modal title={registrations ? form.id ? "Edit Registration" : "Submit Registration" : form.id ? "Edit College" : "Add College"} onClose={() => setForm(null)}><form className="sa-form" onSubmit={save}><div className="sa-form-grid">{[["name", "College Name", "text", true], ["code", "Unique College Code", "text", true], ["email", "College Email", "email", true], [registrations ? "contact" : "phone", "Contact Number", "tel", false], ["address", "Address", "text", false], ...(registrations ? [["applicantName", "Applicant Name", "text", true], ["applicantEmail", "Applicant Email", "email", true]] : [])].map(([key, label, type, required]) => <label key={key}>{label}<input type={type} required={required} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })}/></label>)}{registrations && <label>Requested Plan<select value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}>{data.plans.filter((plan) => plan.active !== false).map((plan) => <option key={plan.id}>{plan.name}</option>)}</select></label>}</div>{error && <p role="alert">{error}</p>}<div className="sa-actions"><button type="button" className="cms-btn" onClick={() => setForm(null)}>Cancel</button><button className="cms-btn cms-btn-primary">Save {registrations ? "Application" : "College"}</button></div></form></Modal>}
    {viewing && <Modal title={registrations ? "Registration Details" : "College Details"} onClose={closeDetails}>{viewing.detailError && <p role="alert">{viewing.detailError}</p>}<dl className="sa-onboarding-details">{(registrations ? [["College", viewing.name], ["Code", viewing.code], ["Applicant", viewing.applicantName], ["Applicant Email", viewing.applicantEmail], ["Registration Status", viewing.registrationStatus], ["Submitted", viewing.submittedAt || "Not recorded"], ["Reviewed", viewing.reviewedAt || "Not reviewed"], ["Linked College", viewing.collegeId || "Not linked"]] : [["College", viewing.name], ["Code", viewing.code], ["Email", viewing.email], ["Source", viewing.source], ["College Status", viewing.collegeStatus], ["Plan", viewing.plan], ["Account Usage", `${activeAccountCount(data.users, viewing.id)} / ${data.plans.find((plan) => plan.name === viewing.plan)?.limit ?? "—"}`], ["Assigned Admins", collegeAdmins(data, viewing.id).map((admin) => `${admin.name} (${admin.email})`).join("; ") || "Admin Not Assigned"]]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{!registrations && <div className="sa-actions"><Link className="cms-btn cms-btn-primary" to={assignLink(viewing.id)}>Assign College Admin</Link><Link className="cms-btn" to="/super-admin/subscriptions">View Subscription</Link><Link className="cms-btn" to="/super-admin/account-usage">Account Usage</Link></div>}</Modal>}
    {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} onCancel={() => setConfirm(null)} onConfirm={() => { confirm.run(); setConfirm(null); }}/>}
  </div>;
}
