import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import { activeAccountCount } from "../superAdminPreview.js";
import SuperAdminTable, { SuperAdminBadge } from "../components/SuperAdminTable.jsx";
import "./CollegesPage.css";

const initial = { name: "", code: "", email: "", phone: "", address: "", logo: "", admin: "", adminEmail: "", plan: "Free", status: "Active" };
export default function CollegesPage({ registrations = false }) {
  const { data, update, session } = useSuperAdmin();
  const [form, setForm] = useState(null);
  const [viewing, setViewing] = useState(false);
  const modalRef = useRef(null);
  const modalOpen = Boolean(form);
  useEffect(() => {
    if (!modalOpen) return undefined;
    const previous = document.activeElement;
    modalRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setForm(null);
      if (event.key === "Tab") {
        const fields = [...modalRef.current.querySelectorAll('button, input, textarea, select, a[href]')].filter((item) => !item.disabled);
        const first = fields[0], last = fields.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [modalOpen]);
  const save = (event) => {
    event.preventDefault();
    const saved = update(`${form.id ? "Updated" : "Created"} college ${form.name}`, (current) => {
      if (current.colleges.some((college) => college.id !== form.id && college.code.toLowerCase() === form.code.trim().toLowerCase())) throw new Error("A college with this code already exists.");
      if (!form.name.trim() || !form.code.trim()) throw new Error("Enter a college name and code.");
      if (form.admin && !form.id && !form.adminEmail) throw new Error("Enter the College Admin email.");
      if (form.admin && !form.id && current.users.some((user) => user.email.toLowerCase() === form.adminEmail.trim().toLowerCase())) throw new Error("An account with this admin email already exists.");
      const id = form.id || `COL-${crypto.randomUUID().slice(0, 8)}`;
      const { adminEmail, ...fields } = form;
      const college = { ...fields, name: form.name.trim(), code: form.code.trim().toUpperCase(), id, registered: form.registered || new Date().toISOString().slice(0, 10), renewal: form.renewal || "" };
      const users = form.admin && !form.id ? [...current.users, { id: crypto.randomUUID(), name: form.admin, email: adminEmail, collegeId: id, role: "CollegeAdmin", active: true, loginEnabled: true }] : current.users;
      return { ...current, users, colleges: form.id ? current.colleges.map((item) => item.id === id ? college : item) : [...current.colleges, college] };
    });
    if (saved) setForm(null);
  };
  const changeStatus = (college, status) => update(`${status === "Active" ? "Activated" : "Deactivated"} ${college.name}`, (current) => ({ ...current, colleges: current.colleges.map((item) => item.id === college.id ? { ...item, status } : item) }));
  const open = (college, readOnly = false) => { setViewing(readOnly); setForm(college ? { ...college } : { ...initial }); };
  return <div className="sa-page"><header className="sa-page-head"><div><span className="sa-eyebrow">College management</span><h1><span className="sa-page-title-icon"><ThreeDIcon name="campus-configuration" size={27}/></span>{registrations ? "College Registrations" : "All Colleges"}</h1><p>Manage college profiles, access and subscription ownership.</p></div><button type="button" className="cms-btn cms-btn-primary" disabled={!session.preview} onClick={() => open()}><Plus size={16}/> Add College</button></header>
    <SuperAdminTable title={registrations ? "Pending registrations" : "College directory"} rows={data.colleges.filter((college) => !registrations || college.status === "Pending")} columns={[
      { key: "name", label: "College", render: (college) => <div><strong>{college.name}</strong><small className="sa-college-code">{college.code} · {college.id}</small></div> }, { key: "admin", label: "College Admin" }, { key: "email", label: "Email" }, { key: "plan", label: "Plan" },
      { key: "accounts", label: "Account Usage", render: (college) => `${activeAccountCount(data.users, college.id)} / ${data.plans.find((plan) => plan.name === college.plan)?.limit ?? "—"}` }, { key: "status", label: "Status", render: (college) => <SuperAdminBadge value={college.status}/> },
      { key: "actions", label: "Actions", render: (college) => <div className="sa-actions"><button className="cms-btn" type="button" onClick={() => open(college, true)}>View</button><button className="cms-btn" type="button" disabled={!session.preview} onClick={() => open(college)}>Edit</button><button className="cms-btn" type="button" disabled={!session.preview} onClick={() => changeStatus(college, college.status === "Active" ? "Inactive" : "Active")}>{college.status === "Pending" ? "Approve" : college.status === "Active" ? "Deactivate" : "Activate"}</button></div> },
    ]}/>
    {form ? <div className="sa-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setForm(null); }}><section className="sa-modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sa-college-title"><header><h2 id="sa-college-title">{viewing ? "College Details" : form.id ? "Edit College" : "Add College"}</h2><button className="cms-icon-btn" type="button" aria-label="Close college details" onClick={() => setForm(null)}><X size={18}/></button></header><form onSubmit={save} className="sa-form"><div className="sa-form-grid">{[["name", "College Name", "text", true], ["code", "College Code", "text", true], ["email", "Email", "email", true], ["phone", "Contact Number", "tel", false], ["address", "Address", "text", false], ["logo", "Logo URL", "url", false], ["admin", "College Admin", "text", false], ...(!form.id ? [["adminEmail", "Admin Email", "email", false]] : [])].map(([key, label, type, required]) => <label key={key}>{label}<input type={type} required={required} readOnly={viewing} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })}/></label>)}</div>{!form.id ? <p className="sa-muted">New colleges start on the Free plan. The preview records the admin locally; it does not send invitations or create real logins.</p> : <div className="sa-actions"><Link className="cms-btn" to="/super-admin/subscriptions" onClick={() => setForm(null)}>View Subscription</Link><Link className="cms-btn" to="/super-admin/account-usage" onClick={() => setForm(null)}>Account Usage</Link>{!form.admin ? <Link className="cms-btn" to="/super-admin/college-admins" onClick={() => setForm(null)}>Create College Admin</Link> : null}</div>}<footer><button type="button" className="cms-btn" onClick={() => setForm(null)}>Close</button>{!viewing ? <button type="submit" className="cms-btn cms-btn-primary">Save College</button> : null}</footer></form></section></div> : null}
  </div>;
}
