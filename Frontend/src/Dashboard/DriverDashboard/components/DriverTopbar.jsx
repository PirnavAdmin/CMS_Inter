import React, { useState, useEffect } from "react";
import {
  Menu,
  Bell,
  RefreshCw,
  Calendar,
  Shield,
  User,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { getAuthUser } from "../../../features/authStorage.js";

export default function DriverTopbar({
  onMenuToggle,
  onNavigateProfile,
  onLogout,
  onSyncData,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [notifications, setNotifications] = useState([]);

  const user = getAuthUser();
  const driverName = user?.name || "Driver";
  const driverInitials = driverName.substring(0, 2).toUpperCase();
  const driverEmail = user?.email || "";
  const driverEmpId = user?.employeeId || "EMP-000";

  const unreadCount = notifications.filter((n) => n.unread).length;

  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleSyncClick = () => {
    setIsSyncing(true);
    setSyncMessage("Syncing telemetry & student list...");
    if (onSyncData) onSyncData();
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage("Telemetry synchronized!");
      setTimeout(() => setSyncMessage(""), 2500);
    }, 1200);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className="dp-topbar">
      <div className="dp-topbar-left">
        <button
          type="button"
          className="dp-menu-btn"
          onClick={onMenuToggle}
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>

        <div className="dp-topbar-title-block">
          <div className="dp-college-title">
            <strong>Pirnav College</strong>
            <span className="dp-title-sep">/</span>
            <span className="dp-submodule-title">Transport Management</span>
          </div>
          <span className="dp-date-chip">
            <Calendar size={13} /> {currentDate}
          </span>
        </div>
      </div>

      <div className="dp-topbar-right">
        {syncMessage && <span className="dp-sync-feedback">{syncMessage}</span>}

        <button
          type="button"
          className={`dp-icon-btn ${isSyncing ? "is-syncing" : ""}`}
          onClick={handleSyncClick}
          title="Sync Live GPS & Student Data"
        >
          <RefreshCw size={17} className={isSyncing ? "dp-spin-icon" : ""} />
        </button>

        {/* Notifications Popover */}
        <div className="dp-popover-wrapper">
          <button
            type="button"
            className="dp-icon-btn dp-notif-btn"
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && <span className="dp-notif-badge">{unreadCount}</span>}
          </button>

          {notificationsOpen && (
            <div className="dp-dropdown-menu dp-notif-dropdown">
              <div className="dp-dropdown-header">
                <strong>Notifications</strong>
                {unreadCount > 0 && (
                  <button type="button" className="dp-link-btn" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="dp-notif-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>No notifications</div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`dp-notif-item ${item.unread ? "is-unread" : ""}`}
                    >
                      <div className="dp-notif-icon-box">
                        {item.tone === "warning" ? (
                          <AlertTriangle size={14} className="dp-text-warning" />
                        ) : item.tone === "success" ? (
                          <CheckCircle size={14} className="dp-text-success" />
                        ) : (
                          <Info size={14} className="dp-text-blue" />
                        )}
                      </div>
                      <div className="dp-notif-content">
                        <div className="dp-notif-row">
                          <strong>{item.title}</strong>
                          <small>{item.time}</small>
                        </div>
                        <p>{item.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile menu */}
        <div className="dp-popover-wrapper">
          <button
            type="button"
            className="dp-profile-trigger"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotificationsOpen(false);
            }}
          >
            <div className="dp-profile-avatar">{driverInitials}</div>
            <div className="dp-profile-meta">
              <strong className="dp-profile-name">{driverName}</strong>
              <div className="dp-profile-sub">
                <span className="dp-role-badge">Driver</span>
                <span className="dp-emp-id">{driverEmpId}</span>
              </div>
            </div>
          </button>

          {profileOpen && (
            <div className="dp-dropdown-menu dp-profile-dropdown">
              <div className="dp-profile-dropdown-hero">
                <div className="dp-profile-avatar is-large">{driverInitials}</div>
                <div>
                  <strong>{driverName}</strong>
                  <small>{driverEmail}</small>
                  <span className="dp-dropdown-bus-tag">Bus: Assigned Vehicle</span>
                </div>
              </div>

              <div className="dp-dropdown-divider" />

              <button
                type="button"
                className="dp-dropdown-action"
                onClick={() => {
                  setProfileOpen(false);
                  if (onNavigateProfile) onNavigateProfile();
                }}
              >
                <User size={15} /> My Profile & Documents
              </button>

              <div className="dp-dropdown-divider" />

              <button
                type="button"
                className="dp-dropdown-action dp-action-danger"
                onClick={() => {
                  setProfileOpen(false);
                  if (onLogout) onLogout();
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

