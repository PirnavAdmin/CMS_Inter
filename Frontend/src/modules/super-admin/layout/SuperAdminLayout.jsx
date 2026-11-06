import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Bell, Building2, CreditCard, GraduationCap, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, X } from "lucide-react";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import collegeLogo from "@/assets/pirnav-colleges-logo.png";
import { clearAuthSession } from "@/modules/auth/authStorage.js";
import { logoutPreview } from "../superAdminSession.js";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import "./SuperAdminLayout.css";

const groups = [
  ["Overview", [["dashboard", "Dashboard", LayoutDashboard]]],
  ["College Management", [["colleges", "All Colleges", Building2], ["registrations", "College Registrations", GraduationCap], ["college-admins", "College Admins", Users]]],
  ["Users & Access", [["users", "Global Users", Users], ["roles-permissions", "Roles & Permissions", ShieldCheck]]],
  ["Subscriptions", [["plans", "Subscription Plans", CreditCard], ["subscriptions", "College Subscriptions", CreditCard], ["account-usage", "Account Usage", Activity], ["renewals", "Renewals", Activity]]],
  ["Billing", [["payments-invoices", "Payments & Invoices", CreditCard]]],
  ["Platform Management", [["modules", "Module Management", LayoutDashboard], ["notifications", "Notifications", Bell]]],
  ["System", [["audit-logs", "Audit Logs", Activity], ["settings", "Global Settings", Settings], ["profile", "My Profile", Users]]],
];
const navigationIcons = {
  dashboard: "dashboard", colleges: "campus-configuration", registrations: "add-student", "college-admins": "teaching-staff",
  users: "total-students", "roles-permissions": "roles-permissions", plans: "fees", subscriptions: "certificates", "account-usage": "staff-attendance", renewals: "academic-year",
  "payments-invoices": "payments", modules: "subjects", notifications: "notifications", "audit-logs": "audit-logs", settings: "settings", profile: "teaching-staff",
};

export default function SuperAdminLayout() {
  const { session, message, clearMessage } = useSuperAdmin();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const onChange = () => { setMobile(query.matches); setOpen(false); };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const navigate = useNavigate();
  const logout = () => {
    if (session.preview) logoutPreview(); else clearAuthSession();
    navigate("/super-admin/login", { replace: true });
  };
  return <div className={`cms-shell sa-shell ${open ? "sa-nav-open" : ""} ${collapsed ? "sa-nav-collapsed" : ""}`} data-dashboard-palette="olive">
    {open ? <button type="button" className="sa-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)}/> : null}
    <aside className="sa-sidebar"><NavLink to="/super-admin/dashboard" className="sa-brand" aria-label="Pirnav Super Admin Dashboard"><img src={collegeLogo} alt="Pirnav College"/><small>SUPER ADMIN PORTAL</small></NavLink><nav id="sa-navigation" aria-label="Super Admin navigation">{groups.map(([label, links], groupIndex) => <section key={label}><h2>{label}</h2>{links.map(([path, name, Icon], index) => <NavLink key={path} to={`/super-admin/${path}`} title={name} aria-label={name} onClick={() => setOpen(false)}><span className={`sa-nav-icon sa-icon-tone-${(groupIndex + index) % 6}`}><ThreeDIcon name={navigationIcons[path] || Icon} size={22}/></span><span className="sa-nav-text">{name}</span></NavLink>)}</section>)}</nav><button type="button" className="sa-logout" title="Logout" aria-label="Logout" onClick={logout}><LogOut size={17}/><span className="sa-nav-text">Logout</span></button></aside>
    <div className="sa-workspace"><header className="sa-topbar"><div className="sa-topbar-start"><button type="button" className="cms-icon-btn sa-menu" aria-label="Toggle navigation" aria-controls="sa-navigation" aria-expanded={mobile ? open : !collapsed} onClick={() => mobile ? setOpen(!open) : setCollapsed(!collapsed)}><ThreeDIcon name="menu" size={22}/></button><span className="sa-platform-label"><ThreeDIcon name="board" size={24}/><span><small>PLATFORM WORKSPACE</small><strong>All colleges</strong></span></span></div><div><ThemeToggle variant="dashboard"/><span className="sa-avatar">SA</span><span><strong>{session.name}</strong><small>Super Admin</small></span></div></header>
      <main className="sa-content">
        {session.preview ? (
          <div className="sa-preview-banner">
            <ShieldCheck size={18} />
            <span><strong>Development preview</strong> · Developer preview session active.</span>
          </div>
        ) : null}
        {message ? <div className="sa-feedback" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={clearMessage}><X size={16}/></button></div> : null}
        <Outlet/>
      </main>
    </div>
  </div>;
}
