import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { STANDARD_CRUD_ACTIONS } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.constants.js";
import { Eye, Pencil, Power, ShieldCheck } from "lucide-react";
import { Modal } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import { MODULES, activeAccountCount } from "../superAdminPreview.js";
import SuperAdminTable, { SuperAdminBadge } from "../components/SuperAdminTable.jsx";
import "./AccessPage.css";

const roles = ["SuperAdmin", "CollegeAdmin", "Accountant", "Faculty", "HOD", "Receptionist", "Librarian", "Transport Admin", "Student"];
export default function AccessPage({ section = "users" }) {
  const { data, update, session } = useSuperAdmin();
  const [params, setParams] = useSearchParams();
  const accessModule = section === "roles-permissions";
  const tab = params.get("tab") === "permissions" ? "permissions" : "roles";
  const permissionRole = roles.includes(params.get("role")) ? params.get("role") : "SuperAdmin";
  const selectTab = (value) => setParams((current) => { const next = new URLSearchParams(current); next.set("tab", value); return next; });
  const [collegeId, setCollegeId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", collegeId: "" });
  const accountStatus = (user) => user.status || (user.active ? "Active" : "Inactive");
  const userRows = data.users.map((user) => ({ ...user, collegeName: data.colleges.find((college) => college.id === user.collegeId)?.name || "Platform", accountStatus: accountStatus(user) })).filter((user) =>
    (!collegeId || user.collegeId === collegeId) && (!role || user.role === role) && (!status || user.accountStatus === status) && (section !== "college-admins" || user.role === "CollegeAdmin"));
  const statusActionUnavailable = "Account status changes require a verified platform API. Frontend-only activation/deactivation is disabled.";
  useEffect(() => {
    if (!selectedUser) return undefined;
    const previous = document.activeElement;
    const modal = document.querySelector(".sa-user-modal");
    const shell = document.querySelector(".sa-shell");
    if (shell && modal) {
      const tokens = getComputedStyle(shell);
      for (const key of tokens) if (key.startsWith("--cms-")) modal.style.setProperty(key, tokens.getPropertyValue(key));
    }
    const close = modal?.querySelector('button[aria-label="Close"]');
    close?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
      if (event.key !== "Tab" || !modal) return;
      const items = [...modal.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)')];
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [selectedUser]);
  const title = { users: "Global Users", "college-admins": "College Admins", "roles-permissions": "Roles & Permissions" }[section];
  const roleRows = roles.map((role) => ({ id: role, name: role, scope: role === "SuperAdmin" ? "Platform" : "College", access: role === "SuperAdmin" ? "Manage platform colleges, plans and global configuration" : role === "CollegeAdmin" ? "Manage only the assigned college" : "Assigned college modules and actions only" }));
  return <div className="sa-page"><header className="sa-page-head"><div><span className="sa-eyebrow">Users & access</span><h1><span className="sa-page-title-icon"><ThreeDIcon name={accessModule ? "roles-permissions" : "teaching-staff"} size={27}/></span>{title}</h1><p>{section === "users" ? "Manage platform and college user accounts." : "Platform and college permissions remain separate."}</p></div>{section === "college-admins" ? <button type="button" className="cms-btn cms-btn-primary" disabled={!session.preview} onClick={() => setAdding(!adding)}>Create College Admin</button> : null}</header>
    {accessModule ? <>
      <div className="sa-access-tabs" role="tablist" aria-label="Roles and permissions" onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? "roles" : event.key === "End" ? "permissions" : tab === "roles" ? "permissions" : "roles";
        selectTab(next);
        document.getElementById("sa-access-tab-" + next)?.focus();
      }}>
        {[["roles", "System Roles"], ["permissions", "Permissions"]].map(([value, label]) => <button type="button" key={value} id={"sa-access-tab-" + value} role="tab" aria-selected={tab === value} aria-controls={"sa-access-panel-" + value} tabIndex={tab === value ? 0 : -1} className={tab === value ? "is-active" : ""} onClick={() => selectTab(value)}><ThreeDIcon name="roles-permissions" size={19}/>{label}</button>)}
      </div>
      <section role="tabpanel" id={"sa-access-panel-" + tab} aria-labelledby={"sa-access-tab-" + tab} className="sa-access-tab-panel">
        {tab === "roles" ? <SuperAdminTable title="System Roles" searchPlaceholder="Search roles or scope..." rows={roleRows} columns={[{ key: "name", label: "Role Name" }, { key: "scope", label: "Scope", render: (row) => <SuperAdminBadge value={row.scope}/> }, { key: "access", label: "Authorized Access" }]}/> : <>
          <section className="sa-panel sa-permission-role"><label htmlFor="sa-permission-role-select">Select Role<select id="sa-permission-role-select" value={permissionRole} onChange={(event) => setParams((current) => { const next = new URLSearchParams(current); next.set("role", event.target.value); return next; })}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label><div><strong>{permissionRole}</strong><SuperAdminBadge value={permissionRole === "SuperAdmin" ? "Platform" : "College"}/><p className="sa-muted">{permissionRole === "SuperAdmin" ? "Platform role. College data access requires an authorized tenant workflow." : "College-scoped role. Platform-level permissions cannot be assigned."}</p></div></section>
          <SuperAdminTable key={permissionRole} title="Permission Categories" searchPlaceholder="Search permission categories..." rows={[
            ...["College Management", "Global Users", "Subscriptions", "Billing", "Platform Settings"].map((name) => ({ id: "platform-" + name, name, scope: "Platform" })),
            ...MODULES.map((name) => ({ id: "college-" + name, name, scope: "College" })),
          ]} columns={[{ key: "name", label: "Category" }, { key: "scope", label: "Scope" }, ...STANDARD_CRUD_ACTIONS.map((action) => ({ key: action, label: action[0].toUpperCase() + action.slice(1), render: (row) => <span className="sa-permission-unavailable">{row.scope === (permissionRole === "SuperAdmin" ? "Platform" : "College") ? "Not connected" : "Outside role scope"}</span> }))]}/>
          <div className="sa-access-note"><ShieldCheck size={16}/><span>Effective permission grants have not been loaded. This matrix lists categories and scope boundaries only; View/Create/Edit/Delete assignment requires a verified platform permission API.</span></div>
        </>}
      </section>
      <section className="sa-panel"><h2>College custom roles</h2><p className="sa-muted">College custom roles must remain tenant-scoped. Platform permissions cannot be granted by a College Admin. Role changes and effective permission checks require a platform authorization API; this preview does not modify existing college roles.</p></section>
    </> : <>
      <SuperAdminTable title={title} searchPlaceholder="Search users…" rows={userRows} filterKey={[collegeId, role, status].filter(Boolean).join("|")} toolbar={<div className="sa-user-filters">
        <label>College<select aria-label="Filter by College" value={collegeId} onChange={(event) => setCollegeId(event.target.value)}><option value="">All Colleges</option>{data.colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label>
        <label>Role<select aria-label="Filter by Role" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All Roles</option>{roles.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Account Status<select aria-label="Account Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{["Active", "Inactive", "Suspended", "Pending"].map((item) => <option key={item}>{item}</option>)}</select></label>
        {collegeId || role || status ? <button type="button" className="cms-btn cms-btn-ghost" onClick={() => { setCollegeId(""); setRole(""); setStatus(""); }}>Reset filters</button> : null}
      </div>} columns={[
        { key: "name", label: "Name", render: (user) => <span className="sa-user-name"><span className="sa-user-initials" aria-hidden="true">{user.name.split(/\s+/).map((name) => name[0]).slice(0, 2).join("")}</span><strong>{user.name}</strong></span> },
        { key: "email", label: "Email" }, { key: "collegeName", label: "College" },
        { key: "role", label: "Role", render: (user) => <span className="sa-role-chip">{user.role}</span> },
        { key: "accountStatus", label: "Account Status", render: (user) => <SuperAdminBadge value={user.accountStatus}/> },
        { key: "loginEnabled", label: "Login Enabled", render: (user) => <SuperAdminBadge value={user.loginEnabled ? "Enabled" : "Disabled"}/> },
        { key: "actions", label: "Actions", render: (user) => <div className="sa-user-actions">
          <button type="button" className="cms-action-btn view" title="View user details" aria-label={"View " + user.name} onClick={() => setSelectedUser(user)}><Eye size={15}/></button>
          <span title="Editing requires a verified platform user API. Protected identity, role and college fields cannot be changed here."><button type="button" className="cms-action-btn edit" disabled aria-label={"Edit " + user.name + " (unavailable)"}><Pencil size={15}/></button></span>
          <span title={statusActionUnavailable}><button type="button" className={"cms-action-btn status " + (user.active ? "" : "activate")} disabled aria-label={(user.active ? "Deactivate " : "Activate ") + user.name + " (unavailable)"}><Power size={15}/></button></span>
        </div> },
      ]}/>
      <div className="sa-access-note"><ShieldCheck size={16}/><span>View available account details here. Editing and status changes are unavailable until authorized platform APIs are connected.</span></div>
    </>}
    {selectedUser ? <Modal title="User Details" className="sa-user-modal" onClose={() => setSelectedUser(null)} footer={<button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedUser(null)}>Close Details</button>}>
      <div className="sa-user-detail-hero"><span className="sa-user-initials">{selectedUser.name.split(/\s+/).map((name) => name[0]).slice(0, 2).join("")}</span><div><h3>{selectedUser.name}</h3><p>{selectedUser.email}</p></div><SuperAdminBadge value={selectedUser.accountStatus}/></div>
      <div className="cms-kv">{[["User Name", selectedUser.name], ["Email", selectedUser.email], ["College", selectedUser.collegeName], ["Role", selectedUser.role], ["Account Status", selectedUser.accountStatus], ["Login Enabled", selectedUser.loginEnabled ? "Yes" : "No"], ["User ID", selectedUser.id], ["College ID", selectedUser.collegeId || "Platform"], ...(selectedUser.lastLogin ? [["Last Login", selectedUser.lastLogin]] : [])].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    </Modal> : null}
    {adding && section === "college-admins" ? <section className="sa-panel"><h2>Create College Admin · Preview</h2><form className="sa-form" onSubmit={(event) => { event.preventDefault(); const saved = update(`Created College Admin ${form.name}`, (current) => { const college = current.colleges.find((item) => item.id === form.collegeId); const plan = current.plans.find((item) => item.name === college?.plan); if (!college || !plan) throw new Error("Select a college with a subscription plan."); if (college.status !== "Active") throw new Error("Activate the college first."); if (current.users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) throw new Error("An account with this email already exists."); if (activeAccountCount(current.users, college.id) >= plan.limit) throw new Error("Your free account limit has been reached. Upgrade your subscription to activate additional accounts."); return { ...current, colleges: current.colleges.map((item) => item.id === college.id ? { ...item, admin: form.name.trim() } : item), users: [...current.users, { ...form, name: form.name.trim(), email: form.email.trim(), id: crypto.randomUUID(), role: "CollegeAdmin", active: true, loginEnabled: true }] }; }); if (saved) { setAdding(false); setForm({ name: "", email: "", collegeId: "" }); } }}><div className="sa-form-grid"><label>Full Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label><label>College<select required value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })}><option value="">Select college</option>{data.colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label></div><p className="sa-muted">This creates a preview record only. Real invitations require expiring backend invitation tokens. No password or invitation email is generated.</p><button className="cms-btn cms-btn-primary" type="submit">Create Preview Admin</button></form></section> : null}
  </div>;
}
