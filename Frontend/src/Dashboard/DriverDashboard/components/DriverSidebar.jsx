import CampusBrandImage from "@/components/common/CampusBrandImage.jsx";
import React from "react";
import { X, LogOut } from "lucide-react";
import pirnavLogo from "@/assets/pirnav-colleges-logo.png";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { useDriverData } from "../DriverDataContext.jsx";

export default function DriverSidebar({ activeTab, onSelectTab, onLogout, open, onClose }) {
  const { driverProfile } = useDriverData();
  const menuItems = [
    { id: "home", label: "Dashboard", icon: "dashboard" },
    { id: "route", label: "My Route", icon: "transport" },
    { id: "trips", label: "Trips", icon: "transport" },
    { id: "students", label: "Students", icon: "students" },
    { id: "gps", label: "GPS Tracking", icon: "campus" },
    { id: "reports", label: "Reports", icon: "reports-analytics" },
    { id: "profile", label: "Profile", icon: "staff" },
    { id: "attendance", label: "My Attendance", icon: "staff-attendance" },
    { id: "leave", label: "Leave Management", icon: "staff-leave" },
    { id: "payslips", label: "My Payslips", icon: "payroll" },
    { id: "holidays", label: "Holidays", icon: "holidays" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <aside className={`dp-sidebar ${open ? "is-open" : ""}`}>
      <div className="dp-sidebar-brand">
        <div className="dp-brand-logo-wrap">
          <CampusBrandImage src={pirnavLogo} alt="Pirnav College" className="dp-brand-logo"  />
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
              <ThreeDIcon name={item.icon} size={20} className="dp-nav-icon" />
              <span>{item.label}</span>
              {isActive && <span className="dp-active-indicator" />}
            </button>
          );
        })}
      </nav>

      <div className="dp-sidebar-footer">
        <div className="dp-sidebar-driver-mini">
          <div className="dp-mini-avatar">{driverProfile.initials}</div>
          <div className="dp-mini-info">
            <strong>{driverProfile.name}</strong>
            <small>{driverProfile.employeeId} · {driverProfile.assignedVehicle}</small>
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

