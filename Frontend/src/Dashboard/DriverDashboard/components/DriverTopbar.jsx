import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Bell,
  RefreshCw,
  Calendar,
  Building2,
  ChevronDown,
  Shield,
  User,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { driverProfile, notificationsList } from "../data/driverMockData.js";
import { useCampusContext } from "../../../context/CampusContext.jsx";

export default function DriverTopbar({
  onMenuToggle,
  onNavigateProfile,
  onLogout,
  onSyncData,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [notifications, setNotifications] = useState(notificationsList);
  const campusRef = useRef(null);
  const { activeCampuses, campuses, selectedCampus, setSelectedCampus } = useCampusContext();
  const campusOptions = activeCampuses?.length ? activeCampuses : campuses || [];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (!campusOpen) return undefined;

    const handlePointerDown = (event) => {
      if (campusRef.current && !campusRef.current.contains(event.target)) {
        setCampusOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setCampusOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [campusOpen]);

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

        <div className="dp-popover-wrapper dp-campus-selector" ref={campusRef}>
          <button
            type="button"
            className={`dp-campus-trigger ${campusOpen ? "is-open" : ""}`}
            onClick={() => {
              setCampusOpen((prev) => !prev);
              setNotificationsOpen(false);
              setProfileOpen(false);
            }}
            disabled={!campusOptions.length}
            aria-label="Select campus"
            aria-haspopup="menu"
            aria-expanded={campusOpen}
            title={selectedCampus?.name || selectedCampus?.campusName || selectedCampus?.code || "Select campus"}
          >
            <span className="dp-campus-icon"><Building2 size={15} /></span>
            <span className="dp-campus-copy">
              <span className="dp-campus-label">Campus</span>
              <span className="dp-campus-name">
                {selectedCampus?.name || selectedCampus?.campusName || selectedCampus?.code || "Select campus"}
              </span>
            </span>
            <ChevronDown size={13} className="dp-campus-chevron" />
          </button>

          {campusOpen && (
            <div className="dp-dropdown-menu dp-campus-dropdown" role="menu" aria-label="Campus options">
              <div className="dp-campus-dropdown-title">Select Campus</div>
              <div className="dp-campus-options">
                {campusOptions.length ? campusOptions.map((campus) => {
                  const campusId = campus.id ?? campus.campusId;
                  const selectedId = selectedCampus?.id ?? selectedCampus?.campusId;
                  const isSelected = String(campusId) === String(selectedId);
                  const campusName = campus.name || campus.campusName || campus.code || "Campus";

                  return (
                    <button
                      key={campusId}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      className={`dp-campus-option ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedCampus(campus);
                        setCampusOpen(false);
                      }}
                    >
                      <span className="dp-campus-option-copy">
                        <span className="dp-campus-option-name" title={campusName}>{campusName}</span>
                        {campus.code && <small>{campus.code}</small>}
                      </span>
                      {isSelected && <CheckCircle size={15} />}
                    </button>
                  );
                }) : (
                  <div className="dp-campus-empty">No active campuses available</div>
                )}
              </div>
            </div>
          )}
        </div>

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
              setCampusOpen(false);
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
                {notifications.map((item) => (
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
                ))}
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
              setCampusOpen(false);
            }}
          >
            <div className="dp-profile-avatar">{driverProfile.initials}</div>
            <div className="dp-profile-meta">
              <strong className="dp-profile-name">{driverProfile.name}</strong>
              <div className="dp-profile-sub">
                <span className="dp-role-badge">Driver</span>
                <span className="dp-emp-id">{driverProfile.employeeId}</span>
              </div>
            </div>
          </button>

          {profileOpen && (
            <div className="dp-dropdown-menu dp-profile-dropdown">
              <div className="dp-profile-dropdown-hero">
                <div className="dp-profile-avatar is-large">{driverProfile.initials}</div>
                <div>
                  <strong>{driverProfile.name}</strong>
                  <small>{driverProfile.email}</small>
                  <span className="dp-dropdown-bus-tag">Bus: {driverProfile.assignedVehicle}</span>
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
