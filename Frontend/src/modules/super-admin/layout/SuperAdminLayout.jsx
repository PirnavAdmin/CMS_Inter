import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, Bell, Building2, CreditCard, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, X, User, ChevronDown } from "lucide-react";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
import { useTheme } from "@/hooks/useTheme.js";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import collegeLogo from "@/assets/pirnav-colleges-logo.png";
import SuperAdminNotificationPopover from "../components/SuperAdminNotificationPopover.jsx";
import { clearAuthSession } from "@/modules/auth/authStorage.js";
import { logoutPreview } from "../superAdminSession.js";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import "./SuperAdminLayout.css";
import "../SuperAdminTheme.css";

const groups = [
  ["Overview", [["dashboard", "Dashboard", LayoutDashboard]]],
  ["College Management", [["colleges", "College Management", Building2], ["college-admins", "College Admins", Users]]],
  ["Subscriptions", [["plans", "Subscription Plans", CreditCard], ["subscriptions", "College Subscriptions", CreditCard], ["renewals", "Renewals", Activity]]],
  ["Billing", [["payments-invoices", "Payments & Invoices", CreditCard]]],
  ["Platform Management", [["modules", "Module Management", LayoutDashboard]]],
  ["System", [["audit-logs", "Audit Logs", Activity], ["settings", "Global Settings", Settings], ["profile", "My Profile", Users]]],
];
const navigationIcons = {
  dashboard: "dashboard", colleges: "campus-configuration", "college-admins": "teaching-staff",
  plans: "fees", subscriptions: "certificates", renewals: "academic-year",
  "payments-invoices": "payments", modules: "subjects", "audit-logs": "audit-logs", settings: "settings", profile: "teaching-staff",
};

export default function SuperAdminLayout() {
  const { session, data, message, clearMessage } = useSuperAdmin();
  const platformName = String(data?.settings?.platformName || "").trim() || "PIRNAV CMS";
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const unreadCount = (data?.notifications || []).filter((n) => n.read !== "Read" && !n.isRead).length;
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  const location = useLocation();
  const activeChildren = {
    colleges: ["/super-admin/college-management", "/super-admin/register-college"],
    "college-admins": ["/super-admin/add-college-admin"],
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
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
    navigate("/login", { replace: true });
  };
  return <div className={`cms-shell sa-shell ${open ? "sa-nav-open" : ""} ${collapsed ? "sa-nav-collapsed" : ""}`} data-dashboard-palette={palette || "olive"}>
    {open ? <button type="button" className="sa-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)}/> : null}
    <aside className="sa-sidebar"><NavLink to="/super-admin/dashboard" className="sa-brand" aria-label={`${platformName} Super Admin Dashboard`}><img src={collegeLogo} alt="Pirnav College"/><small title={platformName}>{platformName}</small></NavLink><nav id="sa-navigation" aria-label="Super Admin navigation">{groups.map(([label, links], groupIndex) => <section key={label}><h2>{label}</h2>{links.map(([path, name, Icon], index) => <NavLink key={path} to={`/super-admin/${path}`} title={name} aria-label={name} onClick={() => setOpen(false)} className={({ isActive }) => isActive || (activeChildren[path] || []).includes(location.pathname) ? "active" : undefined} aria-current={(activeChildren[path] || []).includes(location.pathname) ? "page" : undefined}><span className={`sa-nav-icon sa-icon-tone-${(groupIndex + index) % 6}`}><ThreeDIcon name={navigationIcons[path] || Icon} size={22}/></span><span className="sa-nav-text">{name}</span></NavLink>)}</section>)}</nav></aside>
    <div className="sa-workspace">
      <header className="sa-topbar">
        <div className="sa-topbar-start">
          <button type="button" className="cms-icon-btn sa-menu" aria-label="Toggle navigation" aria-controls="sa-navigation" aria-expanded={mobile ? open : !collapsed} onClick={() => mobile ? setOpen(!open) : setCollapsed(!collapsed)}>
            <ThreeDIcon name="menu" size={22}/>
          </button>
          <span className="sa-platform-label">
            <ThreeDIcon name="board" size={24}/>
            <span><small>PLATFORM WORKSPACE</small><strong title={platformName}>{platformName}</strong></span>
          </span>
        </div>

        <div className="sa-topbar-end">
          <ThemeToggle variant="dashboard"/>
          {/* Topbar Notification Bell with Popover */}
          <div className="sa-notif-btn-wrap" ref={notifRef}>
            <button
              type="button"
              className={`sa-notif-trigger-btn ${notifOpen ? "active" : ""}`}
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              aria-expanded={notifOpen}
              title="Platform Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="sa-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </button>

            <SuperAdminNotificationPopover
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>

          <div className="sa-profile-wrap" ref={profileRef}>
            <button
              type="button"
              className="sa-profile-trigger"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              title="Super Administrator Menu"
            >
              <span className="sa-avatar"><User size={19} aria-hidden="true" /></span>
              <div className="sa-profile-meta">
                <strong>{session.name}</strong>
                <small>Super Admin</small>
              </div>
              <ChevronDown size={14} className={`sa-profile-chevron ${profileOpen ? "open" : ""}`} />
            </button>

            {profileOpen && (
              <div className="sa-profile-dropdown">
                <div className="sa-dropdown-user-header">
                  <div className="sa-dropdown-user-name">{session.name}</div>
                  <div className="sa-dropdown-user-email">{session.email || "superadmin.pirnav@gmail.com"}</div>
                  <div className="sa-dropdown-role-tag">Super Administrator</div>
                </div>

                <div className="sa-dropdown-divider" />

                <button
                  type="button"
                  className="sa-dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/super-admin/profile");
                  }}
                >
                  <User size={15} className="sa-dd-icon" />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="sa-dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/super-admin/settings");
                  }}
                >
                  <Settings size={15} className="sa-dd-icon" />
                  <span>Settings</span>
                </button>

                <div className="sa-dropdown-divider" />

                <button
                  type="button"
                  className="sa-dropdown-item sa-logout-item"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={15} className="sa-dd-icon" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
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
