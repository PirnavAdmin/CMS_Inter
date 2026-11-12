import { useMemo, useState } from "react";
import { Building2, Check, CheckCircle2, Crown, Eye, Gift, Layers, MoreVertical, Pencil, Plus, Scale, Star, Users, X } from "lucide-react";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import { useSubscriptionDashboardData } from "../superAdminSubscriptionData.js";
import "./SubscriptionPlansPage.css";

const icons = { Free: Gift, Basic: Layers, Standard: Star, Premium: Crown, Enterprise: Building2 };
const tones = ["free", "basic", "standard", "premium", "enterprise"];
const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function SubscriptionPlansPage() {
  const { value, update } = useSubscriptionDashboardData();
  const plans = value.plans || [];
  const subscriptions = value.subscriptions || [];
  const [annual, setAnnual] = useState(false);
  const [users, setUsers] = useState(300);
  const [form, setForm] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [menu, setMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState("");
  const annualPrice = (plan) => Math.round(Number(plan.monthlyPrice) * 12 * 0.8);
  const price = (plan) => annual ? annualPrice(plan) : Number(plan.monthlyPrice);
  const duration = annual ? 365 : 30;
  const recommended = useMemo(() => plans.filter((plan) => plan.status === "Active" && Number(plan.maxUsers) >= users).sort((a, b) => Number(a.maxUsers) - Number(b.maxUsers))[0] || null, [plans, users]);
  const subscribedCount = subscriptions.length;
  const totalUsers = subscriptions.reduce((sum, record) => sum + (Number(record.totalUsers) || 0), 0);
  const persistPlan = (event) => {
    event.preventDefault();
    const name = form.name.trim(); const monthlyPrice = Number(form.monthlyPrice); const maxUsers = Number(form.maxUsers);
    if (!name || !Number.isFinite(monthlyPrice) || monthlyPrice < 0 || !Number.isSafeInteger(maxUsers) || maxUsers < 1) { setToast("Enter a plan name, nonnegative price, and positive whole-number user limit."); return; }
    const next = { id: form.id || `PLAN-${Date.now()}`, name, monthlyPrice, maxUsers, durationDays: 30, status: form.status, popular: form.popular };
    update((current) => ({ ...current, plans: form.id ? current.plans.map((plan) => plan.id === form.id ? next : plan) : [...current.plans, next], auditLogs: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), action: form.id ? "Updated" : "Created", module: "Subscription Plans", details: `${form.id ? "Updated" : "Created"} ${name} plan`, user: "Super Administrator" }, ...current.auditLogs] }));
    setForm(null); setToast(`Plan ${form.id ? "updated" : "created"}.`);
  };
  const togglePlan = (plan) => update((current) => ({ ...current, plans: current.plans.map((item) => item.id === plan.id ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item), auditLogs: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), action: "Status changed", module: "Subscription Plans", details: `${plan.name} status changed`, user: "Super Administrator" }, ...current.auditLogs] }));
  const deletePlan = () => { const plan = confirmDelete; update((current) => ({ ...current, plans: current.plans.filter((item) => item.id !== plan.id), auditLogs: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), action: "Deleted", module: "Subscription Plans", details: `Deleted ${plan.name} plan`, user: "Super Administrator" }, ...current.auditLogs] })); setConfirmDelete(null); setToast("Plan deleted."); };
  const openCreate = () => setForm({ name: "", monthlyPrice: "", maxUsers: "", status: "Active", popular: false });
  const openEdit = (plan) => setForm({ ...plan, monthlyPrice: String(plan.monthlyPrice), maxUsers: String(plan.maxUsers) });
  const cards = <div className="spp-v3-plan-grid">{plans.map((plan, index) => { const Icon = icons[plan.name] || Star; const chosen = plan.id === recommended?.id; return <article key={plan.id} className={`spp-v3-plan-card ${tones[index % tones.length]} ${chosen ? "recommended" : ""}`}><header><span className="spp-v3-icon"><Icon size={23}/></span><strong>{plan.name}</strong>{chosen && <span className="spp-v3-selected"><Check size={15}/></span>}</header><span className={`spp-v3-status ${plan.status === "Active" ? "active" : "inactive"}`}>● {plan.status}</span><div className="spp-v3-price">{money(price(plan))}<small> / {duration} Days</small></div><div className="spp-v3-users"><Users size={19}/><b>{Number(plan.maxUsers).toLocaleString("en-IN")} Users</b></div><footer><button onClick={() => setViewing(plan)}><Eye size={15}/> View</button><button onClick={() => openEdit(plan)}><Pencil size={15}/> Edit</button><div className="spp-v3-menu"><button aria-label={`More actions for ${plan.name}`} onClick={() => setMenu(menu === plan.id ? null : plan.id)}><MoreVertical size={16}/></button>{menu === plan.id && <div className="spp-v3-popover"><button onClick={() => { togglePlan(plan); setMenu(null); }}>{plan.status === "Active" ? "Deactivate" : "Activate"}</button><button className="danger" onClick={() => { setConfirmDelete(plan); setMenu(null); }}>Delete Plan</button></div>}</div></footer></article>; })}</div>;
  return <div className="plans-page spp-v3">
    {toast && <div className="spp-v3-toast" role="status">{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={14}/></button></div>}
    <nav className="spp-breadcrumb"><span>Subscriptions</span><span>›</span><b>Subscription Plans</b></nav>
    <header className="spp-v3-heading"><div><h1>Subscription Plans</h1><p>Create and manage subscription plans based on total users. Choose the right plan for your colleges.</p></div><div className="spp-v3-header-actions"><div className="spp-v3-billing"><button className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Monthly (30 Days)</button><button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Yearly (365 Days)<small>Save 20%</small></button></div><button className="spp-v3-create" onClick={openCreate}><Plus size={18}/> Create Plan</button></div></header>
    <section className="spp-v3-stats"><article><span className="blue"><Layers/></span><div><b>{plans.length}</b><small>Total Plans</small></div></article><article><span className="green"><CheckCircle2/></span><div><b>{plans.filter((plan) => plan.status === "Active").length}</b><small>Active Plans</small></div></article><article><span className="amber"><Building2/></span><div><b>{subscribedCount}</b><small>Subscribed Colleges</small></div></article><article><span className="purple"><Users/></span><div><b>{totalUsers.toLocaleString("en-IN")}</b><small>Total Users (All Colleges)</small></div></article></section>
    <section className="spp-v3-recommend"><div className="spp-v3-slider"><div className="spp-v3-slider-title"><div><h2>Select Users Count</h2><p>Choose the number of users to find the best plan and price.</p></div><strong><Users size={20}/>{users.toLocaleString("en-IN")} Users</strong></div><input aria-label="Select total users" type="range" min="1" max="5000" value={users} onChange={(event) => setUsers(Number(event.target.value))}/><div className="spp-v3-marks"><span>25</span><span>100</span><span>300</span><span>1,000</span><span>5,000</span></div></div><div className="spp-v3-recommended">{recommended ? <><span className="spp-v3-recommend-label">Recommended Plan</span><div className="spp-v3-recommend-body"><div><h2>{recommended.name}</h2><p>Supports up to {Number(recommended.maxUsers).toLocaleString("en-IN")} users</p></div><strong>{money(price(recommended))}<small> / {duration} Days</small></strong><CheckCircle2 className="big-check"/></div></> : <div className="spp-v3-no-plan"><h2>No plan available</h2><p>No active plan supports {users.toLocaleString("en-IN")} users. Create or activate a higher capacity plan.</p></div>}</div></section>
    <section className="spp-v3-cards">{cards}</section>
    <section className="spp-v3-comparison"><header><div><Scale size={23}/><div><h2>Plan Comparison</h2><p>Compare all plans at a glance.</p></div></div></header><div className="spp-v3-table-scroll"><table><thead><tr><th>Plan</th>{plans.map((plan) => <th key={plan.id}>{plan.name}</th>)}</tr></thead><tbody><tr><th>Users Limit</th>{plans.map((plan) => <td key={plan.id}>{Number(plan.maxUsers).toLocaleString("en-IN")}</td>)}</tr><tr><th>Price ({duration} Days)</th>{plans.map((plan) => <td key={plan.id}>{money(price(plan))}</td>)}</tr></tbody></table></div></section>
    {form && <Modal title={form.id ? "Edit Plan" : "Create Plan"} onClose={() => setForm(null)}><form className="spp-v3-form" onSubmit={persistPlan}><label>Plan Name<input required maxLength={60} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label><label>Monthly Price<input type="number" min="0" step="0.01" required value={form.monthlyPrice} onChange={(event) => setForm({ ...form, monthlyPrice: event.target.value })}/></label><label>Maximum Users<input type="number" min="1" step="1" required value={form.maxUsers} onChange={(event) => setForm({ ...form, maxUsers: event.target.value })}/></label><label>Duration / Billing Period<select value="30" disabled><option value="30">Monthly · 30 Days (Yearly pricing is calculated)</option></select></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label><div className="spp-v3-form-actions"><button type="button" onClick={() => setForm(null)}>Cancel</button><button type="submit" className="spp-v3-create">Save Plan</button></div></form></Modal>}
    {viewing && <Modal title={`${viewing.name} Plan`} onClose={() => setViewing(null)}><dl className="spp-v3-details"><div><dt>Monthly Price</dt><dd>{money(viewing.monthlyPrice)}</dd></div><div><dt>Yearly Price</dt><dd>{money(annualPrice(viewing))}</dd></div><div><dt>Duration</dt><dd>30 Days / 365 Days</dd></div><div><dt>Maximum Users</dt><dd>{Number(viewing.maxUsers).toLocaleString("en-IN")}</dd></div><div><dt>Status</dt><dd>{viewing.status}</dd></div></dl></Modal>}
    {confirmDelete && <ConfirmDialog title="Delete plan?" message={`Delete ${confirmDelete.name}? Colleges already assigned to it will keep their current subscription record.`} onCancel={() => setConfirmDelete(null)} onConfirm={deletePlan} danger/>}
  </div>;
}
