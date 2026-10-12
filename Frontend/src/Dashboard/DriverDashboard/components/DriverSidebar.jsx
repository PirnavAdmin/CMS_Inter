import React from "react";
import {
  LayoutDashboard,
  MapPin,
  Route as RouteIcon,
  Users,
  Navigation,
  FileBarChart2,
  User,
  LogOut,
  X,
  Bus,
} from "lucide-react";
import pirnavLogo from "@/assets/pirnav-colleges-logo.png";

export default function DriverSidebar({ activeTab, onSelectTab, onLogout, open, onClose }) {
  const menuItems = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard },
    { id: "route", label: "My Route", icon: RouteIcon },
    { id: "trips", label: "Trips", icon: Bus },
    { id: "students", label: "Students", icon: Users },
    { id: "gps", label: "GPS Tracking", icon: Navigation },
    { id: "reports", label: "Reports", icon: FileBarChart2 },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <aside className={`dp-sidebar ${open ? "is-open" : ""}`}>
      <div className="dp-sidebar-brand">
        <div className="dp-brand-logo-wrap">
          <img src={pirnavLogo} alt="Pirnav College" className="dp-brand-logo" />
        </div>
        <button type="button" className="dp-sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
          <X size={18} />
        </button>
      </div>

      <div className="dp-sidebar-subbrand">
        <span className="dp-portal-tag">DRIVER PORTAL</span>
        <span className="dp-portal-desc">Transport Management</span>
      </div>

      <nav className="dp-sidebar-nav">
        <div className="dp-nav-section-title">MENU</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`dp-nav-item ${isActive ? "is-active" : ""}`}
              onClick={() => {
                onSelectTab(item.id);
                if (onClose) onClose();
              }}
            >
              <Icon size={18} className="dp-nav-icon" />
              <span>{item.label}</span>
              {isActive && <span className="dp-active-indicator" />}
            </button>
          );
        })}
      </nav>

      <div className="dp-sidebar-footer">
        <div className="dp-sidebar-driver-mini">
          <div className="dp-mini-avatar">RK</div>
          <div className="dp-mini-info">
            <strong>Ramesh Kumar</strong>
            <small>EMP001 • Bus PC-101</small>
          </div>
        </div>
        <button
          type="button"
          className="dp-nav-item dp-logout-btn"
          onClick={onLogout}
        >
          <LogOut size={17} className="dp-nav-icon" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

