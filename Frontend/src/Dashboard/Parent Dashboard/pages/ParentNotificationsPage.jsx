import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronRight, Eye, Filter } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, getStoredNotifications, saveStoredNotifications } from "../parentData.js";
import { Modal } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentNotificationsPage() {
  const { availableChildren } = useParentPortal();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState(getStoredNotifications());
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotifModal, setSelectedNotifModal] = useState(null);

  const childIds = new Set(availableChildren.map((c) => c.id));
  const parentNotifs = notifs.filter((n) => {
    if (!n.studentId) return false;
    const baseId = n.studentId.replace(/-\d{4}$/, "");
    return childIds.has(n.studentId) || childIds.has(baseId);
  });

  const unreadCount = parentNotifs.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    const updated = notifs.map((n) => (parentNotifs.some((pn) => pn.id === n.id) ? { ...n, read: true } : n));
    setNotifs(updated);
    saveStoredNotifications(updated);
  };

  const handleOpenDetail = (notif) => {
    const updated = notifs.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
    setNotifs(updated);
    saveStoredNotifications(updated);
    setSelectedNotifModal(notif);
  };

  const filtered = parentNotifs.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "all") return true;
    return n.category.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={`Parent alerts & updates • ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
      breadcrumb={["Parent Portal", "Notifications"]}
      actions={
        unreadCount > 0 ? (
          <button type="button" className="cms-btn cms-btn-outline cms-btn-sm" onClick={handleMarkAllRead}>
            <CheckCheck size={14} /> Mark All as Read
          </button>
        ) : null
      }
    >
      <div className="parent-dashboard-wrapper">
        {/* Category Filters */}
        <div className="parent-card" style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cms-muted)", marginRight: 6 }}>Filter:</span>
            {["all", "unread", "Fees", "Examinations", "Academics"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`cms-btn cms-btn-sm ${activeTab === tab ? "cms-btn-primary" : "cms-btn-outline"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "all" ? "All Alerts" : tab === "unread" ? `Unread (${unreadCount})` : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((n) => (
            <div
              key={n.id}
              className="parent-card"
              style={{
                background: n.read ? "var(--cms-surface)" : "var(--cms-primary-soft)",
                borderColor: n.read ? "var(--cms-border)" : "var(--cms-primary-border)",
                transition: "all 0.2s ease",
              }}
            >
              <div className="parent-card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: n.read ? "var(--cms-bg)" : "#ffffff",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--cms-primary-dark)",
                      flexShrink: 0,
                    }}
                  >
                    <Bell size={20} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className="cms-badge cms-badge-active" style={{ fontSize: 11 }}>{n.category}</span>
                      <strong style={{ fontSize: 14.5 }}>{n.title}</strong>
                      {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cms-primary)" }} />}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--cms-text)" }}>{n.message}</p>
                    <span style={{ fontSize: 11.5, color: "var(--cms-muted)", display: "block", marginTop: 4 }}>{n.time}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-sm cms-btn-outline"
                    onClick={() => handleOpenDetail(n)}
                  >
                    <Eye size={13} /> Details
                  </button>
                  {n.link && (
                    <Link to={n.link} className="cms-btn cms-btn-sm cms-btn-primary" style={{ textDecoration: "none" }}>
                      Open Module <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="parent-card" style={{ padding: 40, textAlign: "center", color: "var(--cms-muted)" }}>
              No notifications found under this category.
            </div>
          )}
        </div>

        {/* Notification Detail Modal */}
        {selectedNotifModal && (
          <Modal
            title={selectedNotifModal.title}
            onClose={() => setSelectedNotifModal(null)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setSelectedNotifModal(null)}>Close</button>
                {selectedNotifModal.link && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => {
                      navigate(selectedNotifModal.link);
                      setSelectedNotifModal(null);
                    }}
                  >
                    View Related Page
                  </button>
                )}
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--cms-muted)" }}>
                <span>Category: <strong>{selectedNotifModal.category}</strong></span>
                <span>Time: <strong>{selectedNotifModal.time}</strong></span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--cms-text)", margin: 0 }}>
                {selectedNotifModal.message}
              </p>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
