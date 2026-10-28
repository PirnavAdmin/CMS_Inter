import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import menuIcon from "@/assets/navbar-3d/menu.png";
import searchIcon from "@/assets/navbar-3d/search.png";
import notificationIcon from "@/assets/navbar-3d/notifications.png";
import darkThemeIcon from "@/assets/navbar-3d/theme-dark.png";
import lightThemeIcon from "@/assets/navbar-3d/theme-light.png";
import boardIcon from "@/assets/navbar-3d/board.png";
import academicYearIcon from "@/assets/navbar-3d/academic-year.png";
import { clearAuthSession } from "@/modules/auth/authStorage.js";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import { studentMenuGroups } from "./StudentSidebar.jsx";

const studentPages = studentMenuGroups.flatMap(([section, links]) => links.map(([label, path, icon]) => ({
  label, section, icon, to: `/student-dashboard${path ? `/${path}` : ""}`,
})));

export default function StudentNavbar({ onMenu, sidebarExpanded }) {
  const navigate = useNavigate();
  const { profile, photoUrl, loading, error, notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = useStudentProfile() || {};
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const closeNotif = (event) => !notifRef.current?.contains(event.target) && setNotifOpen(false);
    document.addEventListener("mousedown", closeNotif);
    return () => document.removeEventListener("mousedown", closeNotif);
  }, []);

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return "Recently";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Recently";
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };
  const student = !loading && !error ? profile : null;
  const [failedPhotoUrl, setFailedPhotoUrl] = useState("");
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const suggestions = studentPages.filter((page) => terms.every((term) => `${page.label} ${page.section}`.toLowerCase().includes(term)));

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const closeSearch = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", closeSearch);
    return () => document.removeEventListener("pointerdown", closeSearch);
  }, []);

  const openPage = (page) => {
    if (!page) return;
    setSearchOpen(false);
    setQuery("");
    setActiveResult(0);
    searchInputRef.current?.blur();
    navigate(page.to);
  };
  const searchKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchOpen(false);
      searchInputRef.current?.blur();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveResult((current) => suggestions.length
        ? (!searchOpen ? (event.key === "ArrowDown" ? 0 : suggestions.length - 1)
          : (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length) : 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openPage(suggestions[activeResult]);
    }
  };

  useEffect(() => {
    const close = (event) => !menuRef.current?.contains(event.target) && setProfileOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  };
  const unavailable = loading ? "Loading..." : error ? "Unavailable" : "Not Assigned";
  const assignedBoard = student?.boardName || unavailable;
  const assignedAcademicYear = student?.academicYearName || unavailable;
  const studentName = student?.studentName || "Student";
  const initials = studentName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST";
  const logout = () => {
    clearAuthSession();
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <header className="sp-navbar">
      <button type="button" className="sp-icon-btn sp-menu-btn" onClick={onMenu} aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarExpanded} aria-controls="sp-student-sidebar">
        <img src={menuIcon} alt="" aria-hidden="true" />
      </button>
      <div className={`sp-navbar-search${searchOpen ? " is-open" : ""}`} ref={searchRef} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
      }}>
        <button type="button" className="sp-search-trigger" aria-label="Search Student Portal pages" aria-expanded={searchOpen} aria-controls="sp-student-search-results" onClick={() => {
          setSearchOpen(true);
          setActiveResult(0);
          searchInputRef.current?.focus();
        }}><img src={searchIcon} alt="" aria-hidden="true" /></button>
        <input ref={searchInputRef} type="search" role="combobox" aria-label="Search Student Portal pages and modules" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls="sp-student-search-results" aria-activedescendant={searchOpen && suggestions[activeResult] ? `sp-student-search-${activeResult}` : undefined}
          placeholder="Search pages and modules..." autoComplete="off" value={query}
          onFocus={() => setSearchOpen(true)} onKeyDown={searchKeyDown}
          onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); setActiveResult(0); }}/>
        {searchOpen ? <div id="sp-student-search-results" className="sp-navbar-search-results" role="listbox" aria-label="Student Portal pages">
          {suggestions.length ? suggestions.map((page, index) => <button type="button" role="option" id={`sp-student-search-${index}`} key={page.to} aria-selected={activeResult === index} className={activeResult === index ? "is-highlighted" : ""}
            onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveResult(index)} onClick={() => openPage(page)}>
            <img src={page.icon} alt="" aria-hidden="true"/><span>{page.label}<small>{page.section}</small></span>
          </button>) : <p role="status">No matching Student Portal pages</p>}
        </div> : null}
      </div>
      <div className="sp-student-academic-context" aria-label="Assigned academic context">
        <div className="sp-readonly-context sp-readonly-board">
          <img src={boardIcon} alt="" aria-hidden="true" />
          <span><small>Board</small><strong title={assignedBoard}>{assignedBoard}</strong></span>
        </div>
        <div className="sp-readonly-context sp-readonly-year">
          <img src={academicYearIcon} alt="" aria-hidden="true" />
          <span><small>Academic Year</small><strong title={assignedAcademicYear}>{assignedAcademicYear}</strong></span>
        </div>
      </div>
      <div className="sp-navbar-actions">
        <button className="sp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          <img src={dark ? lightThemeIcon : darkThemeIcon} alt="" aria-hidden="true" />
        </button>
        <div className="sp-notification-menu" ref={notifRef}>
          <button
            type="button"
            className="sp-icon-btn sp-notification"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={`${unreadCount} notifications`}
            aria-expanded={notifOpen}
          >
            <img src={notificationIcon} alt="" aria-hidden="true" />
            {unreadCount > 0 ? <i>{unreadCount > 9 ? "9+" : unreadCount}</i> : null}
          </button>
          {notifOpen ? (
            <div className="sp-notifications-dropdown">
              <div className="sp-notif-header">
                <div>
                  <strong>Notifications</strong>
                  {unreadCount > 0 && <span className="sp-notif-unread-badge">{unreadCount}</span>}
                </div>
                {unreadCount > 0 && (
                  <button type="button" className="sp-notif-mark-all" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="sp-notif-list">
                {!notifications?.length ? (
                  <div className="sp-notif-empty">
                    <p>No notifications right now.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      className={`sp-notif-item ${!notif.isRead ? "is-unread" : ""}`}
                      onClick={() => {
                        if (markAsRead) markAsRead(notif.id);
                        setNotifOpen(false);
                        navigate(notif.to || "/student-dashboard/certificates");
                      }}
                    >
                      <span className={`sp-notif-status-badge is-${String(notif.status).toLowerCase()}`}>
                        {notif.status}
                      </span>
                      <span className="sp-notif-item-body">
                        <strong>{notif.title}</strong>
                        <p>{notif.message}</p>
                        <time>{formatNotifTime(notif.time)}</time>
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="sp-notif-footer">
                <Link to="/student-dashboard/certificates" onClick={() => setNotifOpen(false)}>
                  View All Certificates →
                </Link>
              </div>
            </div>
          ) : null}
        </div>
        <div className="sp-profile-menu" ref={menuRef}>
          <button onClick={() => setProfileOpen((value) => !value)}>
            <span className="sp-avatar">{student && photoUrl && failedPhotoUrl !== photoUrl ? <img className="sp-navbar-photo" src={photoUrl} alt="" onError={() => setFailedPhotoUrl(photoUrl)}/> : initials}</span>
            <span><strong>{studentName}</strong><small>Roll No: {student?.rollNo || unavailable}</small></span>
            <ChevronDown size={15} />
          </button>
          {profileOpen ? (
            <div className="sp-profile-dropdown">
              <Link to="/student-dashboard/profile" onClick={() => setProfileOpen(false)}><UserRound size={16} /> My Profile</Link>
              <div className="sp-profile-divider" />
              <button type="button" className="sp-profile-logout" onClick={logout}><LogOut size={16} /> Logout</button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
