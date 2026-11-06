import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { useState } from "react";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import { activeAccountCount, MODULES, subscriptionState, renewalDaysRemaining } from "../superAdminDataUtils.js";
import SuperAdminTable, { SuperAdminBadge } from "../components/SuperAdminTable.jsx";
import "./SubscriptionsPage.css";

export default function SubscriptionsPage({ section = "plans" }) {
  const { data, update, session } = useSuperAdmin();
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const title = { plans: "Subscription Plans", subscriptions: "College Subscriptions", "account-usage": "Account Usage", renewals: "Renewals" }[section];
  const reportRows = section === "subscriptions" ? data.subscriptions : section === "account-usage" ? data.accountUsage : section === "renewals" ? data.renewals : [];
  const sourceRows = reportRows.length ? reportRows.map((row) => {
    const college = data.colleges.find((item) => String(item.id) === String(row.collegeId ?? row.id));
    return { ...college, ...row, id: String(row.collegeId ?? row.id ?? college?.id ?? ""), name: row.collegeName ?? row.name ?? college?.name ?? "", plan: row.planName ?? row.plan ?? college?.plan ?? "Free", renewal: row.renewalDate ?? row.renewal ?? college?.renewal ?? "", activeAccounts: row.activeAccounts ?? row.accountCount, accountLimit: row.accountLimit ?? row.limit };
  }) : data.colleges;
  const usage = sourceRows.map((college) => {
    const plan = data.plans.find((item) => item.name === college.plan);
    const active = Number(college.activeAccounts ?? activeAccountCount(data.users, college.id));
    const limit = Number(college.accountLimit ?? plan?.limit ?? 0);
    return { ...college, active, limit, available: Math.max(0, limit - active), percentage: limit > 0 ? active / limit * 100 : active ? 100 : 0,
      subscriptionStatus: section === "renewals" && subscriptionState(college) === "Active" && college.renewalHistory?.length ? "Renewed" : subscriptionState(college), days: renewalDaysRemaining(college.renewal), modules: plan?.modules ?? [] };
  });
  const rows = usage.filter((row) => (!planFilter || row.plan === planFilter) && (!statusFilter || row.subscriptionStatus === statusFilter)
    && (!from || (row.renewal && row.renewal >= from)) && (!to || (row.renewal && row.renewal <= to)));
  const changeCollege = (college, changes, label) => update(`${label}: ${college.name}`, null,
    { module: "Subscriptions", collegeId: college.id, actionType: label, oldValues: { plan: college.plan, renewal: college.renewal }, newValues: changes });
  const requestChange = (college, planName) => {
    const plan = data.plans.find((item) => item.name === planName);
    const warning = college.active > (plan?.limit ?? 0) ? ` Current usage (${college.active}) exceeds the new limit (${plan?.limit}). Existing accounts will be preserved.` : "";
    setConfirm({ title: "Change subscription?", message: `Change ${college.name} to ${planName}?${warning}`, run: () => changeCollege(college,
      { plan: planName, subscriptionStatus: planName === "Free" ? "Free" : "Active", ...(planName === "Free" ? { renewal: "" } : {}) }, "Changed subscription") });
  };
  const renew = (college) => setConfirm({ title: "Renew subscription?", message: `Extend ${college.name}'s subscription by 30 days?`, run: () => {
    const renewal = new Date(Math.max(Date.now(), new Date(`${college.renewal || new Date().toISOString().slice(0, 10)}T00:00:00`).getTime()) + 30 * 86400000).toISOString().slice(0, 10);
    const history = [...(college.renewalHistory ?? []), { at: new Date().toISOString(), previousRenewal: college.renewal, renewal, plan: college.plan }];
    return changeCollege(college, { renewal, subscriptionStatus: "Active", renewalHistory: history }, "Renewed subscription");
  } });
  const cancel = (college) => setConfirm({ title: "Cancel subscription?", message: `Cancel ${college.name}'s paid plan and move to Free? Existing accounts and renewal history remain intact.`, run: () => changeCollege(college,
    { plan: "Free", renewal: "", subscriptionStatus: "Cancelled" }, "Cancelled subscription") });
  const savePlan = (event) => {
    event.preventDefault(); setError("");
    const name = editing.name.trim(); const price = Number(editing.price); const limit = Number(editing.limit); const durationDays = Number(editing.durationDays);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(durationDays) || durationDays < 1) { setError("Enter a plan name, non-negative price, and positive whole-number duration and account limit."); return; }
    if (data.plans.some((plan) => plan.name !== editing.originalName && plan.name.toLowerCase() === name.toLowerCase())) { setError("Plan name already exists."); return; }
    const plan = { ...editing, name, price, limit, durationDays, description: editing.description.trim() };
    delete plan.isNew; delete plan.originalName;
    setConfirm({ title: "Save plan?", message: "Save this plan to the platform?", run: async () => {
      const saved = await update(`Configured plan ${name}`, null, { module: "Plans", actionType: editing.isNew ? "Create" : "Update", planId: editing.planId, payload: plan, newValues: plan });
      if (saved) setEditing(null); return saved;
    } });
  };
  const actions = (college) => <div className="sa-actions"><button className="cms-btn" onClick={() => setViewing(college)}>View</button><button className="cms-btn" disabled={college.plan === "Free" || college.subscriptionStatus === "Cancelled" || data.plans.find((plan) => plan.name === college.plan)?.active === false} onClick={() => renew(college)}>Renew 30 days</button><button className="cms-btn" disabled={college.plan === "Free" || college.subscriptionStatus === "Cancelled"} onClick={() => cancel(college)}>Cancel paid plan</button></div>;
  const columns = section === "account-usage" ? [
    { key: "name", label: "College" }, { key: "plan", label: "Plan" }, { key: "active", label: "Active Accounts" }, { key: "limit", label: "Account Limit" }, { key: "available", label: "Available Slots" },
    { key: "percentage", label: "Usage", render: (row) => <div className={`sa-usage ${row.percentage >= 90 ? "is-danger" : row.percentage >= 70 ? "is-warning" : "is-healthy"}`}><progress aria-label={`Account usage for ${row.name}`} max="100" value={Math.min(100, row.percentage)}/><strong>{row.percentage.toFixed(1)}%</strong></div> },
  ] : section === "renewals" ? [
    { key: "name", label: "College" }, { key: "plan", label: "Plan" }, { key: "renewal", label: "Renewal Date", render: (row) => row.renewal || "No expiry" },
    { key: "days", label: "Days Remaining", render: (row) => row.days == null ? "—" : row.days < 0 ? `${Math.abs(row.days)} days overdue` : `${row.days} days` },
    { key: "subscriptionStatus", label: "Renewal Status", render: (row) => <SuperAdminBadge value={row.subscriptionStatus === "Active" && row.renewalHistory?.length ? "Renewed" : row.subscriptionStatus}/> }, { key: "actions", label: "Actions", render: actions },
  ] : [
    { key: "name", label: "College" }, { key: "plan", label: "Plan", render: (row) => <select aria-label={`Plan for ${row.name}`} value={row.plan} onChange={(event) => requestChange(row, event.target.value)} className="sa-plan-select">{data.plans.map((plan) => <option key={plan.name} disabled={plan.active === false && plan.name !== row.plan}>{plan.name}</option>)}</select> },
    { key: "active", label: "Active Accounts" }, { key: "limit", label: "Account Limit" }, { key: "subscriptionStart", label: "Start Date", render: (row) => row.subscriptionStart || "Not recorded" },
    { key: "renewal", label: "Renewal Date", render: (row) => row.renewal || "No expiry" }, { key: "subscriptionStatus", label: "Subscription Status", render: (row) => <SuperAdminBadge value={row.subscriptionStatus}/> }, { key: "actions", label: "Actions", render: actions },
  ];
  const summary = section === "account-usage" ? [["Total Active Accounts", usage.reduce((sum, row) => sum + row.active, 0)], ["Total Allowed Accounts", usage.reduce((sum, row) => sum + row.limit, 0)], ["Colleges Near Limit", usage.filter((row) => row.percentage >= 70 && row.percentage < 100).length], ["Colleges At Limit", usage.filter((row) => row.percentage >= 100).length]] : section === "renewals" ? [["Total Upcoming Renewals", usage.filter((row) => row.plan !== "Free" && row.days != null && row.days >= 0 && row.subscriptionStatus !== "Cancelled").length], ["Expiring Within 7 Days", usage.filter((row) => row.plan !== "Free" && row.days != null && row.days >= 0 && row.days <= 7 && row.subscriptionStatus !== "Cancelled").length], ["Expiring Within 30 Days", usage.filter((row) => row.plan !== "Free" && row.days != null && row.days >= 0 && row.days <= 30 && row.subscriptionStatus !== "Cancelled").length], ["Expired Subscriptions", usage.filter((row) => row.subscriptionStatus === "Expired").length]] : [];
  return <div className="sa-page"><header className="sa-page-head"><div><span className="sa-eyebrow">Subscriptions</span><h1><span className="sa-page-title-icon"><ThreeDIcon name={section === "account-usage" ? "staff-attendance" : "fees"} size={27}/></span>{title}</h1><p>Plans, module access and unique active login accounts across colleges.</p></div>{section === "plans" && <button className="cms-btn cms-btn-primary" onClick={() => { setError(""); setEditing({ name: "", description: "", price: 0, limit: 25, durationDays: 30, active: true, modules: [], isNew: true }); }}>Create Plan</button>}</header>
    {!!summary.length && <div className="sa-usage-summary">{summary.map(([label, value]) => <article className="sa-panel" key={label}><span className="sa-muted">{label}</span><strong>{value.toLocaleString("en-IN")}</strong></article>)}</div>}
    {section === "plans" ? <div className="sa-plans">{data.plans.map((plan) => <article className="sa-panel" key={plan.name}><h2>{plan.name}</h2><SuperAdminBadge value={plan.active === false ? "Inactive" : "Active"}/><p>{plan.description || "No description recorded."}</p><h2>₹{plan.price.toLocaleString("en-IN")}<small> / {plan.durationDays ?? 30} days</small></h2><strong>{plan.limit.toLocaleString("en-IN")} active accounts</strong><ul>{plan.modules.map((module) => <li key={module}>{module}</li>)}</ul><div className="sa-actions"><button className="cms-btn" onClick={() => setViewing({ ...plan, isPlan: true })}>View</button><button className="cms-btn" onClick={() => { setError(""); setEditing({ ...plan, description: plan.description ?? "", durationDays: plan.durationDays ?? 30, active: plan.active !== false, originalName: plan.name }); }}>Edit</button><button className="cms-btn" onClick={() => setConfirm({ title: "Change plan status?", message: "Existing college subscriptions remain assigned. Inactive plans cannot be newly selected.", run: () => update(`Changed plan status: ${plan.name}`, (current) => ({ ...current, plans: current.plans.map((row) => row.name === plan.name ? { ...row, active: row.active === false } : row) }), { module: "Plans", actionType: "Status change", planId: plan.planId || plan.id }) })}>{plan.active === false ? "Activate" : "Deactivate"}</button></div></article>)}</div> : <SuperAdminTable title={title} rows={rows} columns={columns} filterKey={`${planFilter}:${statusFilter}:${from}:${to}`} toolbar={<><label>Plan<select className="sa-plan-select" value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}><option value="">All plans</option>{data.plans.map((plan) => <option key={plan.name}>{plan.name}</option>)}</select></label>{section !== "account-usage" && <><label>Status<select className="sa-plan-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{["Free", "Active", "Expiring Soon", "Expired", "Cancelled", ...(section === "renewals" ? ["Renewed"] : [])].map((state) => <option key={state}>{state}</option>)}</select></label>{section === "renewals" && <><label>Renewal from<input type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label>Renewal to<input type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)}/></label></>}</>}</>}/>}
    {editing && <Modal title={editing.isNew ? "Create Plan" : `Configure ${editing.name}`} onClose={() => setEditing(null)}><form className="sa-form" onSubmit={savePlan}><div className="sa-form-grid"><label>Plan Name<input required readOnly={!editing.isNew} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })}/></label><label>Description<textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })}/></label>{[["price", "Price (₹)", 0, "0.01"], ["limit", "Account Limit", 1, "1"], ["durationDays", "Duration (days)", 1, "1"]].map(([key, label, min, step]) => <label key={key}>{label}<input type="number" required min={min} step={step} value={editing[key]} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })}/></label>)}</div><fieldset className="sa-module-options"><legend>Included Modules</legend>{MODULES.map((module) => <label key={module}><input type="checkbox" checked={editing.modules.includes(module)} onChange={(event) => setEditing({ ...editing, modules: event.target.checked ? [...editing.modules, module] : editing.modules.filter((item) => item !== module) })}/>{module}</label>)}</fieldset>{error && <p role="alert">{error}</p>}<button className="cms-btn cms-btn-primary">Save Plan</button></form></Modal>}
    {viewing && <Modal title={viewing.name} onClose={() => setViewing(null)}><p>{viewing.isPlan ? viewing.description || "No description recorded." : `Plan: ${viewing.plan} · ${viewing.active} / ${viewing.limit} accounts`}</p><h3>Available Modules</h3><ul>{viewing.modules.map((module) => <li key={module}>{module}</li>)}</ul>{!viewing.isPlan && <><h3>Renewal History</h3>{viewing.renewalHistory?.length ? <ul>{viewing.renewalHistory.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString("en-IN")}: {entry.previousRenewal || "No expiry"} → {entry.renewal} ({entry.plan})</li>)}</ul> : <p>No renewal history recorded.</p>}</>}</Modal>}
    {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} onCancel={() => setConfirm(null)} onConfirm={() => { confirm.run(); setConfirm(null); }}/>}<p className="sa-muted">Platform subscription management. All changes are enforced across registered college accounts.</p>
  </div>;
}
