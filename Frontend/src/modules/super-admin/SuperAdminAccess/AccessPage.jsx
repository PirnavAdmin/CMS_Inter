import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { STANDARD_CRUD_ACTIONS } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.constants.js";
import { Eye, Pencil, Power, ShieldCheck } from "lucide-react";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import { MODULES, collegeAdmins, mockAdminEligible, saveMockAdmin, assertAccountActivation } from "../superAdminPreview.js";
import SuperAdminTable, { SuperAdminBadge } from "../components/SuperAdminTable.jsx";
import "./AccessPage.css";

const roles = ["SuperAdmin", "CollegeAdmin", "Accountant", "Faculty", "HOD", "Receptionist", "Librarian", "Transport Admin", "Student"];
function AccessPageContent({ section = "users" }) {
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
  return <div className="sa-page"><header className="sa-page-head"><div><span className="sa-eyebrow">Users & access</span><h1><span className="sa-page-title-icon"><ThreeDIcon name={accessModule ? "roles-permissions" : "teaching-staff"} size={27}/></span>{title}</h1><p>{section === "users" ? "Manage platform and college user accounts." : "Platform and college permissions remain separate."}</p></div></header>
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
          <button type="button" className={"cms-action-btn status " + (user.active ? "" : "activate")} title={user.active ? "Deactivate account" : "Activate account"} aria-label={(user.active ? "Deactivate " : "Activate ") + user.name} onClick={() => update("Updated user status", (current) => ({ ...current, users: current.users.map((u) => u.id === user.id ? { ...u, active: !user.active, accountStatus: user.active ? "Inactive" : "Active" } : u) }), { module: "College Admins", userId: user.id || user.userId, actionType: "Access change", newValues: { active: !user.active } })}><Power size={15}/></button>
        </div> },
      ]}/>
      <div className="sa-access-note"><ShieldCheck size={16}/><span>Platform user directory. Toggle status or review account details across registered colleges.</span></div>
    </>}
    {selectedUser ? <Modal title="User Details" className="sa-user-modal" onClose={() => setSelectedUser(null)} footer={<button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedUser(null)}>Close Details</button>}>
      <div className="sa-user-detail-hero"><span className="sa-user-initials">{selectedUser.name.split(/\s+/).map((name) => name[0]).slice(0, 2).join("")}</span><div><h3>{selectedUser.name}</h3><p>{selectedUser.email}</p></div><SuperAdminBadge value={selectedUser.accountStatus}/></div>
      <div className="cms-kv">{[["User Name", selectedUser.name], ["Email", selectedUser.email], ["College", selectedUser.collegeName], ["Role", selectedUser.role], ["Account Status", selectedUser.accountStatus], ["Login Enabled", selectedUser.loginEnabled ? "Yes" : "No"], ["User ID", selectedUser.id], ["College ID", selectedUser.collegeId || "Platform"], ...(selectedUser.lastLogin ? [["Last Login", selectedUser.lastLogin]] : [])].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    </Modal> : null}

  </div>;
}

function CollegeAdminsPage() {
  const { data, update, session } = useSuperAdmin();
  const [params, setParams] = useSearchParams();
  const action = params.get("action");
  const targetCollege = params.get("collegeId") || "";
  const editId = params.get("id");
  const [form, setForm] = useState(null);
  const [existingId, setExistingId] = useState("");
  const [mode, setMode] = useState("create");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [accessResult, setAccessResult] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loginFilter, setLoginFilter] = useState("");
  const eligible = data.colleges.filter((college) => college.collegeStatus === "Active");
  const admins = data.users.filter((user) => user.role === "CollegeAdmin");
  useEffect(() => {
    if (!["create", "edit"].includes(action)) { setForm(null); return; }
    const user = editId ? data.users.find((row) => row.id === editId && row.role === "CollegeAdmin") : null;
    const college = data.colleges.find((row) => row.id === targetCollege);
    setForm(user ? { ...user } : { name: college?.initialAdminName || "", email: college?.initialAdminEmail || "", phone: "", collegeId: targetCollege, active: true, loginEnabled: true });
    setExistingId(user?.id || ""); setMode("create"); setError("");
    // Initialize from route changes only, preserving entered values during shared-state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, editId, targetCollege]);
  const open = (user) => setParams((current) => { const next = new URLSearchParams(current); next.set("action", user ? "edit" : "create"); if (user) { next.set("id", user.id); next.set("collegeId", user.collegeId || ""); } else next.delete("id"); return next; });
  const close = () => { setForm(null); setParams((current) => { const next = new URLSearchParams(current); next.delete("action"); next.delete("id"); return next; }); };
  const changeUser = (user, changes) => setConfirm({ title: "Change mock admin access?", message: `Update ${user.name}'s mock account? No real authentication or provisioning is performed.`, run: () => update("Updated mock admin access", (current) => {
    const existing = current.users.find((row) => row.id === user.id);
    if (!existing) throw new Error("Admin account no longer exists.");
    const next = { ...existing, ...changes };
    if (next.active && next.loginEnabled && !(existing.active && existing.loginEnabled)) assertAccountActivation(current, next.collegeId);
    return { ...current, users: current.users.map((row) => row.id === user.id ? next : row) };
  }, { module: "College Admins", collegeId: user.collegeId, userId: user.id || user.userId, actionType: "Access change", newValues: changes }) });
  const save = (event) => {
    event.preventDefault(); setError("");
    if (mode === "existing" && !existingId) { setError("Select an existing compatible CollegeAdmin."); return; }
    setConfirm({ title: "Save mock admin assignment?", message: "Confirm the selected college, account status and mock login setting. No real login account is provisioned.", run: () => {
    if (update(existingId ? "Assigned or updated mock College Admin" : "Created mock College Admin", (current) => saveMockAdmin(current, form, existingId || null), { module: "College Admins", collegeId: form.collegeId, actionType: existingId ? "Assign / Update" : "Create", payload: form, newValues: form })) close();
    else setError("Could not save. Check the validation message above.");
    } });
  };
  const rows = admins.map((user) => ({ ...user, collegeName: data.colleges.find((college) => college.id === user.collegeId)?.name || "Unassigned", eligibility: mockAdminEligible(data, user) ? "Available" : "Unavailable" })).filter((user) => (!collegeFilter || user.collegeId === collegeFilter) && (!statusFilter || (user.active ? "Active" : "Inactive") === statusFilter) && (!loginFilter || String(Boolean(user.loginEnabled)) === loginFilter));
  const counts = [["Total Admins", admins.length], ["Active Admins", admins.filter((user) => user.active).length], ["Login Enabled", admins.filter((user) => user.loginEnabled).length], ["Colleges Without Admin", data.colleges.filter((college) => !collegeAdmins(data, college.id).length).length]];
  return <div className="sa-page"><header className="sa-page-head"><div><span className="sa-eyebrow">Users & access</span><h1><span className="sa-page-title-icon"><ThreeDIcon name="teaching-staff" size={27}/></span>College Admins</h1><p>Assign mock administrators to approved, active colleges. No credentials or invitations are created.</p></div><button className="cms-btn cms-btn-primary" onClick={() => open(null)}>Create College Admin</button></header>
    <div className="sa-registration-summary">{counts.map(([label, count], index) => <article className={`sa-registration-stat tone-${["blue", "green", "amber", "red"][index]}`} key={label}><span className="sa-registration-stat-icon"><ThreeDIcon name="teaching-staff" size={25}/></span><span><small>{label}</small><strong>{count}</strong></span></article>)}</div>
    <SuperAdminTable title="College Admins" rows={rows} filterKey={`${collegeFilter}:${statusFilter}:${loginFilter}`} toolbar={<div className="sa-user-filters"><label>College<select value={collegeFilter} onChange={(event) => setCollegeFilter(event.target.value)}><option value="">All Colleges</option>{data.colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label><label>Account Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All Statuses</option><option>Active</option><option>Inactive</option></select></label><label>Login Enabled<select value={loginFilter} onChange={(event) => setLoginFilter(event.target.value)}><option value="">All</option><option value="true">Enabled</option><option value="false">Disabled</option></select></label></div>} columns={[
      { key: "name", label: "Full Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Contact" }, { key: "collegeName", label: "College" }, { key: "role", label: "Role" }, { key: "accountStatus", label: "Account Status", render: (user) => <SuperAdminBadge value={user.active ? "Active" : "Inactive"}/> }, { key: "loginEnabled", label: "Login Enabled", render: (user) => <SuperAdminBadge value={user.loginEnabled ? "Enabled" : "Disabled"}/> }, { key: "eligibility", label: "Mock Access" }, { key: "actions", label: "Actions", render: (user) => <div className="sa-actions"><button className="cms-btn" onClick={() => { setDetail(user); setAccessResult(""); }}>View</button><button className="cms-btn" onClick={() => open(user)}>Edit</button><button className="cms-btn" onClick={() => changeUser(user, { loginEnabled: !user.loginEnabled })}>{user.loginEnabled ? "Disable Login" : "Enable Login"}</button><button className="cms-btn" onClick={() => changeUser(user, { active: !user.active })}>{user.active ? "Deactivate" : "Activate"}</button></div> },
    ]}/>
    {form && <Modal title={editId ? "Edit College Admin · Mock" : "Create / Assign College Admin · Mock"} onClose={close}><form className="sa-form" onSubmit={save}>{!editId && <label>Setup Method<select value={mode} onChange={(event) => { setMode(event.target.value); setExistingId(""); }}><option value="create">Create Mock Admin</option><option value="existing">Assign Existing Admin</option></select></label>}{mode === "existing" && <label>Existing compatible admin<select required value={existingId} onChange={(event) => { const user = admins.find((row) => row.id === event.target.value); setExistingId(user?.id || ""); if (user) setForm({ ...user, collegeId: form.collegeId }); }}><option value="">Select admin</option>{admins.filter((user) => !user.collegeId || user.collegeId === form.collegeId).map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select></label>}<div className="sa-form-grid">{[["name", "Full Name", "text", true], ["email", "Email", "email", true], ["phone", "Contact Number", "tel", false]].map(([key, label, type, required]) => <label key={key}>{label}<input required={required} type={type} readOnly={mode === "existing"} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })}/></label>)}<label>College<select required value={form.collegeId || ""} onChange={(event) => { setForm({ ...form, collegeId: event.target.value }); if (mode === "existing") setExistingId(""); }}><option value="">Select active college</option>{eligible.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></label><label>Role<input value="CollegeAdmin" readOnly/></label><label>Account Status<select value={form.active ? "Active" : "Inactive"} onChange={(event) => setForm({ ...form, active: event.target.value === "Active" })}><option>Active</option><option>Inactive</option></select></label><label className="sa-admin-checkbox"><input type="checkbox" checked={Boolean(form.loginEnabled)} onChange={(event) => setForm({ ...form, loginEnabled: event.target.checked })}/>Login Enabled (mock eligibility only)</label></div>{error && <p role="alert">{error}</p>}<p className="sa-muted">No real login, password, email or account provisioning occurs.</p><button className="cms-btn cms-btn-primary">Save College Admin</button></form></Modal>}
    {detail && <Modal title="College Admin Details" onClose={() => setDetail(null)}><dl className="sa-onboarding-details">{[["Name", detail.name], ["Email", detail.email], ["Contact", detail.phone || "Not recorded"], ["College", detail.collegeName], ["Role", detail.role], ["Account Status", detail.active ? "Active" : "Inactive"], ["Login Enabled", detail.loginEnabled ? "Yes" : "No"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button className="cms-btn" onClick={() => setAccessResult(mockAdminEligible(data, data.users.find((user) => user.id === detail.id)) ? "Mock access eligible. This does not create a real login session." : "Mock access blocked: college must be active and the admin account and login must be enabled.")}>Check Mock Access</button>{accessResult && <p role="status">{accessResult}</p>}</Modal>}
    {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} onCancel={() => setConfirm(null)} onConfirm={() => { confirm.run(); setConfirm(null); }}/>}
  </div>;
}
export default function AccessPage(props) {
  return props.section === "college-admins" ? <CollegeAdminsPage/> : <AccessPageContent {...props}/>;
}
