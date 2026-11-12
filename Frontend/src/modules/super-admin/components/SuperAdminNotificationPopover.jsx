import React, { useState, useMemo, useRef } from "react";
import {
  Bell,
  Search,
  Check,
  CheckCheck,
  Calendar,
  Wallet,
  Award,
  Users,
  ShieldCheck,
  FileText,
  Clock,
  ChevronDown,
  BellOff,
  RefreshCw
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import "./SuperAdminNotificationPopover.css";

// Helper for relative timestamps (e.g. "2 hours ago", "Yesterday")
function formatTimeAgo(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return String(dateStr);
  }
}

// Icon helper by category
function getNotificationCategoryIcon(category = "", title = "") {
  const c = (category + " " + title).toLowerCase();
  if (c.includes("calendar") || c.includes("academic") || c.includes("exam")) {
    return {
      Icon: Calendar,
      wrapClass: "sanp-cat-academic",
      badgeClass: "sanp-badge-academic",
      label: "Academic"
    };
  }
  if (c.includes("reimburse") || c.includes("finance") || c.includes("fee") || c.includes("payment")) {
    return {
      Icon: Wallet,
      wrapClass: "sanp-cat-finance",
      badgeClass: "sanp-badge-finance",
      label: "Finance"
    };
  }
  if (c.includes("certificate") || c.includes("award")) {
    return {
      Icon: Award,
      wrapClass: "sanp-cat-certificate",
      badgeClass: "sanp-badge-certificate",
      label: "Certificate"
    };
  }
  if (c.includes("college") || c.includes("registration") || c.includes("admin") || c.includes("user")) {
    return {
      Icon: Users,
      wrapClass: "sanp-cat-platform",
      badgeClass: "sanp-badge-platform",
      label: "Platform"
    };
  }
  return {
    Icon: Bell,
    wrapClass: "sanp-cat-general",
    badgeClass: "sanp-badge-general",
    label: category || "System"
  };
}

export default function SuperAdminNotificationPopover({ isOpen }) {
  const { data, markNotificationsRead } = useSuperAdmin?.() || { data: {} };
  const popoverRef = useRef(null);

  // Filter States
  const [activeTab, setActiveTab] = useState("unread"); // 'all' | 'unread' | 'read'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [markingAll, setMarkingAll] = useState(false);

  // Unified items
  const items = useMemo(() => {
    return (data?.notifications || []).map((n) => {
      const id = n.id || n.notificationId;
      const isItemRead = n.read === "Read" || n.isRead === true || n.read === true;
      return {
        ...n,
        id,
        isRead: isItemRead,
        timeAgo: formatTimeAgo(n.date || n.createdAt)
      };
    });
  }, [data?.notifications]);

  // Counts
  const totalCount = items.length;
  const unreadCount = items.filter((i) => !i.isRead).length;
  const readCount = items.filter((i) => i.isRead).length;

  // Distinct Categories for dropdown
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Tab filter
      if (activeTab === "unread" && item.isRead) return false;
      if (activeTab === "read" && !item.isRead) return false;

      // 2. Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          (item.title || "").toLowerCase().includes(q) ||
          (item.message || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // 3. Category
      if (selectedCategory !== "All" && item.category !== selectedCategory) {
        return false;
      }

      // 4. Status
      if (selectedStatus === "Unread" && item.isRead) return false;
      if (selectedStatus === "Read" && !item.isRead) return false;

      return true;
    });
  }, [items, activeTab, searchTerm, selectedCategory, selectedStatus]);

  // Mark single notification as read
  const handleItemClick = async (item) => {
    if (item.isRead) return;
    const numId = Number(item.notificationId || String(item.id).replace("notif-", ""));
    if (numId) await markNotificationsRead?.([numId]);
  };

  // Mark all visible unread as read
  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    const unreadItems = filteredItems.filter((i) => !i.isRead);
    try {
      const ids = unreadItems.map((i) => Number(i.notificationId || String(i.id).replace("notif-", ""))).filter(Boolean);
      await markNotificationsRead?.(ids);
    } finally {
      setMarkingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sanp-popover-card" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      {/* ── TOP ARROW POINTING TO BELL ── */}
      <div className="sanp-arrow" />

      {/* ── HEADER ROW ── */}
      <div className="sanp-header">
        <div className="sanp-header-left">
          <div className="sanp-header-icon-wrap">
            <Bell size={17} />
          </div>
          <div className="sanp-header-titles">
            <h3 className="sanp-title">Notifications</h3>
            <span className="sanp-subtitle">Platform and system notifications</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="sanp-tab-pills">
          <button
            type="button"
            className={`sanp-tab-pill ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`sanp-tab-pill ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`sanp-tab-pill ${activeTab === "read" ? "active" : ""}`}
            onClick={() => setActiveTab("read")}
          >
            Read ({readCount})
          </button>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS BAR ── */}
      <div className="sanp-filters-bar">
        {/* Search */}
        <div className="sanp-search-wrap">
          <Search size={14} className="sanp-search-icon" />
          <input
            type="text"
            className="sanp-search-input"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Dropdown */}
        <div className="sanp-select-wrap">
          <select
            className="sanp-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">Category: All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown size={12} className="sanp-select-arrow" />
        </div>

        {/* Status Dropdown */}
        <div className="sanp-select-wrap">
          <select
            className="sanp-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">Status: All</option>
            <option value="Unread">Unread</option>
            <option value="Read">Read</option>
          </select>
          <ChevronDown size={12} className="sanp-select-arrow" />
        </div>
      </div>

      {/* ── NOTIFICATIONS LIST (REAL DB DATA ONLY) ── */}
      <div className="sanp-list">
        {filteredItems.length === 0 ? (
          <div className="sanp-empty-state">
            <BellOff size={32} className="sanp-empty-icon" />
            <span className="sanp-empty-title">No notifications</span>
            <span className="sanp-empty-desc">
              {totalCount === 0
                ? "No notifications found in database."
                : "No notifications match your search or filter."}
            </span>
          </div>
        ) : (
          filteredItems.map((item) => {
            const { Icon, wrapClass, badgeClass, label } = getNotificationCategoryIcon(
              item.category,
              item.title
            );

            return (
              <div
                key={item.id}
                className={`sanp-item ${!item.isRead ? "unread" : "read"}`}
                onClick={() => handleItemClick(item)}
                title={!item.isRead ? "Click to mark as read" : undefined}
              >
                {/* Category Icon */}
                <div className={`sanp-item-icon-wrap ${wrapClass}`}>
                  <Icon size={16} />
                </div>

                {/* Content */}
                <div className="sanp-item-content">
                  <div className="sanp-item-title">{item.title}</div>
                  <div className="sanp-item-message">{item.message}</div>
                </div>

                {/* Meta: Category badge, Timeago, Green dot */}
                <div className="sanp-item-meta">
                  <span className={`sanp-cat-badge ${badgeClass}`}>{label}</span>
                  <span className="sanp-item-time">{item.timeAgo}</span>
                  {!item.isRead && <span className="sanp-unread-dot" title="Unread" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── FOOTER ROW ── */}
      <div className="sanp-footer">
        <span className="sanp-footer-info">
          Showing {filteredItems.length > 0 ? `1 – ${filteredItems.length}` : "0"} of {totalCount} notifications
        </span>

        <div className="sanp-footer-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="sanp-btn-mark-all"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <RefreshCw size={13} className="sanp-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
