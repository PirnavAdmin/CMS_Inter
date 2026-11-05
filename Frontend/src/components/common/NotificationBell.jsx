import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import notificationHubService from "@/services/notificationHubService.js";
import notificationApi from "@/services/notificationApi.js";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import "./NotificationBell.css";

const getCategoryIcon = (type = "") => {
  const t = String(type).toLowerCase();
  if (t.includes("acad") || t.includes("calendar")) return { icon: "📅", className: "academic" };
  if (t.includes("fee") || t.includes("finance") || t.includes("pay") || t.includes("reimburse")) return { icon: "💳", className: "finance" };
  if (t.includes("cert")) return { icon: "🎓", className: "certificate" };
  if (t.includes("exam") || t.includes("mark") || t.includes("result")) return { icon: "📝", className: "exam" };
  if (t.includes("transport") || t.includes("trip") || t.includes("bus")) return { icon: "🚌", className: "transport" };
  if (t.includes("leave") || t.includes("holiday")) return { icon: "🏖️", className: "leave" };
  return { icon: "🔔", className: "general" };
};

export default function NotificationBell({ className = "", customIcon = null, customBadge = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread'
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load initial unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Gracefully ignore silent failure
    }
  }, []);

  // Fetch full notification list
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications({ page: 1, pageSize: 20 });
      if (res?.success) {
        setNotifications(res.items || []);
        setUnreadCount(res.unreadCount ?? 0);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: fetch count and subscribe to live SignalR events
  useEffect(() => {
    refreshUnreadCount();

    // Subscribe to centralized SignalR notification broadcasts
    const unsubscribe = notificationHubService.subscribe((payload) => {
      // Real-time notification arrived!
      setUnreadCount((prev) => prev + 1);

      if (payload) {
        const newNotif = {
          notificationId: payload.notificationId || Date.now(),
          title: payload.title || "New Notification",
          message: payload.message || "",
          type: payload.type || "General",
          actionUrl: payload.actionUrl || null,
          isRead: false,
          createdAt: payload.createdAt || new Date().toISOString(),
          timeAgo: "Just now",
        };

        setNotifications((prev) => [newNotif, ...prev.filter((n) => n.notificationId !== newNotif.notificationId)]);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [refreshUnreadCount]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (notif, e) => {
    e?.stopPropagation();
    if (!notif.isRead) {
      await notificationApi.markAsRead(notif.notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notif.notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (notif.actionUrl) {
      setIsOpen(false);
      navigate(notif.actionUrl);
    }
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    await notificationApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.isRead;
    return true;
  });

  return (
    <div className={`cms-notif-bell-container ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`cms-notif-bell-trigger ${isOpen ? "active" : ""}`}
        onClick={toggleDropdown}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        {customIcon ? (
          customIcon
        ) : (
          <img src={navbarNotificationsIcon} alt="Notifications" className="cms-notif-bell-icon" />
        )}

        {unreadCount > 0 ? (
          customBadge ? (
            customBadge(unreadCount)
          ) : (
            <span className="cms-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )
        ) : null}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="cms-notif-dropdown">
          {/* Header */}
          <div className="cms-notif-header">
            <div className="cms-notif-title-wrap">
              <h4>Notifications</h4>
              {unreadCount > 0 && <span className="cms-notif-count-tag">{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button type="button" className="cms-notif-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="cms-notif-tabs">
            <button
              type="button"
              className={`cms-notif-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`cms-notif-tab ${activeTab === "unread" ? "active" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="cms-notif-list">
            {loading && notifications.length === 0 ? (
              <div className="cms-notif-empty">
                <p>Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="cms-notif-empty">
                <span style={{ fontSize: 28 }}>🔔</span>
                <p>{activeTab === "unread" ? "No unread notifications" : "No notifications yet"}</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const meta = getCategoryIcon(notif.type);
                return (
                  <div
                    key={notif.notificationId}
                    className={`cms-notif-item ${!notif.isRead ? "is-unread" : ""}`}
                    onClick={(e) => handleMarkAsRead(notif, e)}
                  >
                    <div className={`cms-notif-icon-box ${meta.className}`}>{meta.icon}</div>
                    <div className="cms-notif-content">
                      <h5 className="cms-notif-item-title">{notif.title}</h5>
                      <p className="cms-notif-item-msg">{notif.message}</p>
                      <span className="cms-notif-item-time">{notif.timeAgo || "Recently"}</span>
                    </div>
                    {!notif.isRead && <div className="cms-notif-unread-dot" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

