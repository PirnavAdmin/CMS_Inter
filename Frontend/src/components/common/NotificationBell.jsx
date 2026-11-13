import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import notificationStore from "@/services/notificationStore.js";
import notificationHubService from "@/services/notificationHubService.js";
import { resolveNotificationTarget } from "@/services/notificationRouting.js";
import { getAuthUser } from "@/features/authStorage.js";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import "./NotificationBell.css";

const HISTORY_LIMIT = 10;

const getCategoryIcon = (type = "") => {
  const t = String(type).toLowerCase();
  if (t.includes("acad") || t.includes("calendar")) return { icon: "📅", className: "academic" };
  if (t.includes("fee") || t.includes("finance") || t.includes("pay") || t.includes("reimburse")) return { icon: "💳", className: "finance" };
  if (t.includes("cert")) return { icon: "🎓", className: "certificate" };
  if (t.includes("exam") || t.includes("mark") || t.includes("result")) return { icon: "📝", className: "exam" };
  if (t.includes("transport") || t.includes("trip") || t.includes("bus")) return { icon: "🚌", className: "transport" };
  if (t.includes("leave") || t.includes("holiday")) return { icon: "🏖️", className: "leave" };
  if (t.includes("attend") || t.includes("regulariz")) return { icon: <CalendarCheck size={17} strokeWidth={2.1} />, className: "attendance" };
  return { icon: "🔔", className: "general" };
};

const formatNotifTimestamp = (createdAt, timeAgo) => {
  if (!createdAt) return timeAgo || "Recently";
  try {
    const dt = new Date(createdAt);
    if (Number.isNaN(dt.getTime())) return timeAgo || "Recently";
    const formatted = dt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return timeAgo ? `${timeAgo} · ${formatted}` : formatted;
  } catch {
    return timeAgo || "Recently";
  }
};

export default function NotificationBell({ className = "", customIcon = null, customBadge = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'history'
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const storeState = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getSnapshot
  );

  const {
    unreadCount,
    allNotifications,
    allTotal,
    allLoaded,
    loadingAll,
    errorAll,
    historyNotifications,
    historyLoaded,
    loadingHistory,
    errorHistory,
  } = storeState;

  // Single-flight initialization once per user session; navigating across pages stays completely idle
  useEffect(() => {
    notificationStore.initialize();
  }, []);

  // Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      notificationHubService.notifyBackendReachable({ source: "user" });
      if (activeTab === "history" && !historyLoaded) {
        notificationStore.loadHistoryNotifications();
      } else if (activeTab === "all" && !allLoaded) {
        notificationStore.loadActiveNotifications();
      }
    }
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === "history") {
      if (!historyLoaded) {
        notificationStore.loadHistoryNotifications();
      }
    } else if (!allLoaded) {
      notificationStore.loadActiveNotifications();
    }
  };

  const handleMarkAsReadAndNavigate = async (notif, e) => {
    e?.stopPropagation();
    const targetRoute = resolveNotificationTarget(notif, getAuthUser());
    setIsOpen(false);

    if (!notif.isRead) {
      await notificationStore.markAsRead(notif);
    }

    if (targetRoute) {
      navigate(targetRoute);
      window.dispatchEvent(
        new CustomEvent("cms-notification-navigate", {
          detail: {
            notificationId: notif.notificationId,
            actionUrl: targetRoute,
            referenceId: notif.referenceId ?? null,
            type: notif.type || "",
          },
        })
      );
      window.dispatchEvent(new CustomEvent("cms-attendance-resync"));
    }
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    await notificationStore.markAllAsRead();
  };

  const isHistoryTab = activeTab === "history";
  const currentList = isHistoryTab ? historyNotifications : allNotifications;
  const currentLoading = isHistoryTab ? loadingHistory : loadingAll;
  const currentError = isHistoryTab ? errorHistory : errorAll;
  const allCountLabel = allTotal > allNotifications.length ? `${allTotal}` : `${allNotifications.length}`;

  return (
    <div className={`cms-notif-bell-container ${className}`} ref={dropdownRef}>
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
          <img src={navbarNotificationsIcon} alt="" aria-hidden="true" className="cms-notif-bell-icon" />
        )}

        {unreadCount > 0 ? (
          customBadge ? (
            customBadge(unreadCount)
          ) : (
            <span className="cms-notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
          )
        ) : null}
      </button>

      {isOpen && (
        <div className="cms-notif-dropdown" role="region" aria-label="Notifications">
          <div className="cms-notif-header">
            <div className="cms-notif-title-wrap">
              <h4>Notifications</h4>
              {!isHistoryTab && allNotifications.some((n) => Number(n.groupCount || 1) > 1) && (
                <span className="cms-notif-count-tag">
                  {allNotifications.length} {allNotifications.length === 1 ? "grouped" : "groups"}
                </span>
              )}
            </div>
            {allNotifications.length > 0 && (
              <button type="button" className="cms-notif-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="cms-notif-tabs" role="tablist" aria-label="Notification sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              className={`cms-notif-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => handleSelectTab("all")}
            >
              All ({allCountLabel})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              className={`cms-notif-tab ${activeTab === "history" ? "active" : ""}`}
              onClick={() => handleSelectTab("history")}
            >
              History{historyLoaded ? ` (${Math.min(historyNotifications.length, HISTORY_LIMIT)})` : ""}
            </button>
          </div>

          {isHistoryTab && (
            <div className="cms-notif-section-caption">
              Showing latest {HISTORY_LIMIT} opened notifications (newest first)
            </div>
          )}

          <div className="cms-notif-list" role="tabpanel">
            {currentLoading && currentList.length === 0 ? (
              <div className="cms-notif-empty">
                <p>Loading {isHistoryTab ? "notification history" : "notifications"}...</p>
              </div>
            ) : currentError && currentList.length === 0 ? (
              <div className="cms-notif-empty">
                <p>{currentError}</p>
                <button
                  type="button"
                  className="cms-notif-mark-all-btn"
                  onClick={() => {
                    notificationHubService.notifyBackendReachable({ source: "user" });
                    if (isHistoryTab) {
                      notificationStore.loadHistoryNotifications({ force: true });
                    } else {
                      notificationStore.loadActiveNotifications({ force: true });
                    }
                  }}
                >
                  Retry
                </button>
              </div>
            ) : currentList.length === 0 ? (
              <div className="cms-notif-empty">
                <span aria-hidden="true" style={{ fontSize: 28 }}>🔔</span>
                <p>{isHistoryTab ? "No notification history yet" : "No active notifications"}</p>
              </div>
            ) : (
              currentList.map((notif) => {
                const meta = getCategoryIcon(notif.type);
                const groupCount = Number(notif.groupCount || 1);
                const showRequestBadge = !isHistoryTab && (groupCount > 1 || notif.isRequestGroup);
                const badgeLabel =
                  groupCount > 1
                    ? `${groupCount} Requests`
                    : notif.isRequestGroup
                    ? "1 Request"
                    : null;

                return (
                  <button
                    key={`${activeTab}-${notif.groupKey || notif.notificationId}`}
                    type="button"
                    className={`cms-notif-item ${!notif.isRead ? "is-unread" : "is-read"} ${groupCount > 1 ? "is-grouped" : ""}`}
                    onClick={(e) => handleMarkAsReadAndNavigate(notif, e)}
                  >
                    <div className={`cms-notif-icon-box ${meta.className}`} aria-hidden="true">
                      {meta.icon}
                    </div>
                    <div className="cms-notif-content">
                      <div className="cms-notif-item-top">
                        <h5 className="cms-notif-item-title">{notif.title}</h5>
                        {showRequestBadge && badgeLabel ? (
                          <span className={`cms-notif-group-badge ${groupCount > 1 ? "multiple" : "single"}`}>
                            {badgeLabel}
                          </span>
                        ) : isHistoryTab ? (
                          <span className="cms-notif-state-pill read">Opened</span>
                        ) : null}
                      </div>
                      <p className="cms-notif-item-msg">{notif.message}</p>
                      <div className="cms-notif-item-meta">
                        <span className="cms-notif-item-time">
                          {formatNotifTimestamp(notif.createdAt, notif.timeAgo)}
                        </span>
                        {groupCount > 1 && !isHistoryTab && (
                          <span className="cms-notif-group-hint">Click to review all</span>
                        )}
                      </div>
                    </div>
                    {!notif.isRead && <span className="cms-notif-unread-dot" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
