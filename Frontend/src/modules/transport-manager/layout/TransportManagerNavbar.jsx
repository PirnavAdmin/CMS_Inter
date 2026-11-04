import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Building2,
  CheckCircle2,
  LogOut,
  User,
  Settings,
  Palette,
} from "lucide-react";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
import TransparentAvatar from "@/shared/components/TransparentAvatar.jsx";
import { clearAuthSession } from "@/modules/auth/authStorage.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useTransportManagerSafe } from "../TransportManagerContext.jsx";

export function NavbarIcon({ src }) {
  return <img className="cms-navbar-3d-icon" src={src} alt="" aria-hidden="true" />;
}

const NAV_SEARCH_ITEMS = [
  { label: "Dashboard", path: "/transport-manager/overview" },
  { label: "Setup", path: "/transport-manager/setup" },
  { label: "Route Management", path: "/transport-manager/setup?tab=routes" },
  { label: "Pickup Points", path: "/transport-manager/setup?tab=pickupPoints" },
  { label: "Vehicle Management", path: "/transport-manager/setup?tab=vehicles" },
  { label: "Driver Management", path: "/transport-manager/setup?tab=drivers" },
  { label: "Bus Attendants", path: "/transport-manager/setup?tab=attendants" },
  { label: "Operations", path: "/transport-manager/operations" },
  { label: "Vehicle Assignment", path: "/transport-manager/operations?tab=vehicleAssignments" },
  { label: "Student Transport", path: "/transport-manager/operations?tab=studentAssignments" },
  { label: "Vehicle Trips", path: "/transport-manager/operations?tab=trips" },
  { label: "GPS Tracking", path: "/transport-manager/operations?tab=gps" },
  { label: "Maintenance", path: "/transport-manager/operations?tab=maintenance" },
  { label: "Reports", path: "/transport-manager/reports" },
  { label: "My Attendance", path: "/transport-manager/my-attendance" },
  { label: "Staff Leave", path: "/transport-manager/leave" },
  { label: "Salary & Payslips", path: "/transport-manager/payslips" },
  { label: "Reimbursements", path: "/transport-manager/reimbursements" },
  { label: "Holidays", path: "/transport-manager/holidays" },
  { label: "Settings", path: "/transport-manager/settings" },
  { label: "My Profile", path: "/transport-manager/profile" },
];

export default function TransportManagerNavbar({ onOpenThemePalette }) {
  const navigate = useNavigate();
  const context = useTransportManagerSafe();

  const toggleSidebar = context?.toggleSidebar || (() => {});
  const sidebarCollapsed = context?.sidebarCollapsed ?? false;
  const profile = context?.profile;
  const selectedBoardId = context?.selectedBoardId;
  const setSelectedBoardId = context?.setSelectedBoardId || (() => {});

  const {
    campuses = [],
    activeCampuses = [],
    selectedCampus,
    setSelectedCampus = () => {},
  } = useCampusContext?.() || {};

  const {
    boards = [],
    academicYears = [],
    selectedAcademicYear,
    setSelectedAcademicYear = () => {},
  } = useAcademicContext?.() || {};

  // Dropdown states
  const [campusOpen, setCampusOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [responsiveOpen, setResponsiveOpen] = useState(false);
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const campusRef = useRef(null);
  const boardRef = useRef(null);
  const yearRef = useRef(null);
  const responsiveRef = useRef(null);
  const profileDropRef = useRef(null);
  const searchRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (campusRef.current && !campusRef.current.contains(e.target)) setCampusOpen(false);
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
      if (responsiveRef.current && !responsiveRef.current.contains(e.target)) setResponsiveOpen(false);
      if (profileDropRef.current && !profileDropRef.current.contains(e.target)) setProfileDropOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableCampuses = useMemo(() => {
    if (context?.authorizedCampuses?.length > 0) return context.authorizedCampuses;
    if (profile?.assignedCampuses?.length > 0) return profile.assignedCampuses;
    return [{ id: 1, campusId: 1, name: "Main Campus (HQ)", code: "MAIN" }];
  }, [context?.authorizedCampuses, profile?.assignedCampuses]);

  const campusDisplayName = useMemo(() => {
    if (selectedCampus?.name || selectedCampus?.campusName) {
      return selectedCampus.name || selectedCampus.campusName;
    }
    return availableCampuses[0]?.name || "Main Campus (HQ)";
  }, [selectedCampus, availableCampuses]);

  const availableBoards = useMemo(() => {
    if (context?.authorizedBoards?.length > 0) return context.authorizedBoards;
    if (profile?.assignedBoards?.length > 0) return profile.assignedBoards;
    return [{ id: 1, boardId: 1, code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh" }];
  }, [context?.authorizedBoards, profile?.assignedBoards]);

  const currentBoardObj = useMemo(() => {
    return availableBoards.find(
      (b) => String(b.id || b.boardId) === String(selectedBoardId)
    ) || availableBoards[0] || {
      id: 1,
      name: "Board of Intermediate Education, Andhra Pradesh",
      boardName: "Board of Intermediate Education, Andhra Pradesh",
    };
  }, [availableBoards, selectedBoardId]);

  const boardDisplayName =
    currentBoardObj?.name ||
    currentBoardObj?.boardName ||
    currentBoardObj?.code ||
    "Board of Intermediate Education, Andhra Pradesh";

  const availableYears = useMemo(() => {
    if (academicYears?.length > 0) return academicYears;
    return [{ id: 1, code: "2026-2027", name: "2026-2027", label: "2026-2027" }];
  }, [academicYears]);

  const yearDisplayName =
    selectedAcademicYear?.name ||
    selectedAcademicYear?.label ||
    selectedAcademicYear?.code ||
    "2026-2027";

  const campusCode = useMemo(() => {
    return selectedCampus?.code || selectedCampus?.campusCode || availableCampuses[0]?.code || "MAIN";
  }, [selectedCampus, availableCampuses]);

  const boardCode = useMemo(() => {
    return currentBoardObj?.code || currentBoardObj?.boardCode || "BIEAP";
  }, [currentBoardObj]);

  const academicContextSummary = `${campusCode} · ${boardCode} · ${yearDisplayName}`;
  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return NAV_SEARCH_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <header className="cms-topbar tm-navbar">
      {/* 3-bar Hamburger Menu Button */}
      <button
        className="cms-icon-btn cms-menu-toggle"
        type="button"
        onClick={toggleSidebar}
        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        aria-expanded={!sidebarCollapsed}
      >
        <NavbarIcon src={navbarMenuIcon} />
      </button>

      {/* Search Input for Pages & Modules */}
      <div className="cms-search-wrap" ref={searchRef}>
        <div className="cms-search-top">
          <NavbarIcon src={navbarSearchIcon} />
          <input
            placeholder="Search pages and modules..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            aria-label="Search pages and modules"
          />
        </div>
        {searchOpen && searchQuery && (
          <div className="cms-search-panel">
            {searchResults.length > 0 ? (
              searchResults.map((s) => (
                <button
                  key={s.path}
                  type="button"
                  className="cms-search-item"
                  onClick={() => {
                    navigate(s.path);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <span>{s.label}</span>
                </button>
              ))
            ) : (
              <div className="cms-search-empty">No matching modules found</div>
            )}
          </div>
        )}
      </div>

      <div className="cms-top-actions">
        {/* Academic Context Selectors for Wide Desktop (Campus + Board + Academic Year individual pills) */}
        <div className="cms-academic-selectors cms-academic-selectors-desktop">
          {/* Campus Selector Pill */}
          <div className="cms-academic-dropdown-wrap" ref={campusRef}>
            <button
              type="button"
              className={`cms-academic-btn ${campusOpen ? "is-open" : ""}`}
              onClick={() => {
                setCampusOpen((v) => !v);
                setBoardOpen(false);
                setYearOpen(false);
                setProfileDropOpen(false);
              }}
              aria-label="Select Campus"
            >
              <div className="cms-academic-btn-icon">
                <Building2 size={16} color="var(--cms-primary, #7c3aed)" />
              </div>
              <div className="cms-academic-btn-text">
                <span className="cms-academic-btn-label">CAMPUS</span>
                <span className="cms-academic-btn-value" title={campusDisplayName}>
                  {campusDisplayName}
                </span>
              </div>
              <ChevronDown size={12} className="cms-academic-btn-arrow" />
            </button>

            {campusOpen && (
              <div className="cms-academic-dropdown-panel">
                <div className="cms-academic-panel-header">Assigned Campus</div>
                <div className="cms-academic-panel-list">
                  {availableCampuses.map((c) => {
                    const isSelected =
                      String(selectedCampus?.id ?? selectedCampus?.campusId ?? "1") === String(c.id ?? c.campusId);
                    return (
                      <button
                        key={c.id || c.campusId}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedCampus(c);
                          setCampusOpen(false);
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                          <span className="cms-academic-item-name">{c.name || c.campusName}</span>
                          {(c.code || c.campusCode) && (
                            <span style={{ fontSize: "11px", color: "var(--cms-muted, #7B8275)" }}>
                              {c.code || c.campusCode}
                            </span>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Board Selector Pill */}
          <div className="cms-academic-dropdown-wrap" ref={boardRef}>
            <button
              type="button"
              className={`cms-academic-btn ${boardOpen ? "is-open" : ""}`}
              onClick={() => {
                setBoardOpen((v) => !v);
                setCampusOpen(false);
                setYearOpen(false);
                setProfileDropOpen(false);
              }}
              aria-label="Select Board"
            >
              <div className="cms-academic-btn-icon">
                <NavbarIcon src={navbarBoardIcon} />
              </div>
              <div className="cms-academic-btn-text">
                <span className="cms-academic-btn-label">BOARD</span>
                <span className="cms-academic-btn-value" title={boardDisplayName}>
                  {boardDisplayName}
                </span>
              </div>
              <ChevronDown size={12} className="cms-academic-btn-arrow" />
            </button>

            {boardOpen && (
              <div className="cms-academic-dropdown-panel">
                <div className="cms-academic-panel-header">Assigned Board</div>
                <div className="cms-academic-panel-list">
                  {availableBoards.map((b) => {
                    const isSelected =
                      String(selectedBoardId || "1") === String(b.id || b.boardId);
                    return (
                      <button
                        key={b.id || b.boardId || b.code}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedBoardId(String(b.id || b.boardId));
                          setBoardOpen(false);
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                          <span className="cms-academic-item-name">{b.name || b.boardName || b.code}</span>
                          {b.code && (
                            <span style={{ fontSize: "11px", color: "var(--cms-muted, #7B8275)" }}>
                              {b.code}
                            </span>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Academic Year Selector Pill */}
          <div className="cms-academic-dropdown-wrap" ref={yearRef}>
            <button
              type="button"
              className={`cms-academic-btn ${yearOpen ? "is-open" : ""}`}
              onClick={() => {
                setYearOpen((v) => !v);
                setCampusOpen(false);
                setBoardOpen(false);
                setProfileDropOpen(false);
              }}
              aria-label="Select Academic Year"
            >
              <div className="cms-academic-btn-icon">
                <NavbarIcon src={navbarAcademicYearIcon} />
              </div>
              <div className="cms-academic-btn-text">
                <span className="cms-academic-btn-label">ACADEMIC YEAR</span>
                <span className="cms-academic-btn-value" title={yearDisplayName}>
                  {yearDisplayName}
                </span>
              </div>
              <ChevronDown size={12} className="cms-academic-btn-arrow" />
            </button>

            {yearOpen && (
              <div className="cms-academic-dropdown-panel">
                <div className="cms-academic-panel-header">Academic Year</div>
                <div className="cms-academic-panel-list">
                  {availableYears.map((y) => {
                    const isSelected =
                      selectedAcademicYear?.id === y.id || selectedAcademicYear?.name === y.name || (!selectedAcademicYear && (y.name === "2026-2027" || y.code === "2026-2027"));
                    return (
                      <button
                        key={y.id || y.name}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedAcademicYear(y);
                          setYearOpen(false);
                        }}
                      >
                        <span className="cms-academic-item-name">{y.name || y.label || y.code}</span>
                        {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Compact Selector (Switches to single tab with Campus info when screen width decreases) */}
        <div className="cms-academic-responsive-wrapper" ref={responsiveRef}>
          <button
            type="button"
            className={`cms-academic-btn cms-academic-responsive-trigger ${responsiveOpen ? "is-open" : ""}`}
            onClick={() => {
              setResponsiveOpen((v) => !v);
              setCampusOpen(false);
              setBoardOpen(false);
              setYearOpen(false);
              setProfileDropOpen(false);
            }}
            aria-label="Academic Context Selector"
            title={`${campusDisplayName} · ${boardDisplayName} · ${yearDisplayName}`}
          >
            <div className="cms-academic-btn-icon">
              <Building2 size={16} color="var(--cms-primary, #7c3aed)" />
            </div>
            <div className="cms-academic-btn-text">
              <span className="cms-academic-btn-label">ACADEMIC CONTEXT</span>
              <span className="cms-academic-btn-value" title={`${campusDisplayName} · ${boardDisplayName} · ${yearDisplayName}`}>
                {academicContextSummary}
              </span>
            </div>
            <ChevronDown size={12} className="cms-academic-btn-arrow" />
          </button>

          {responsiveOpen && (
            <div className="cms-academic-dropdown-panel cms-academic-responsive-panel">
              {/* Campus Selector */}
              <div className="cms-academic-responsive-section">
                <div className="cms-academic-responsive-sec-title">
                  <Building2 size={13} color="var(--cms-primary, #7c3aed)" />
                  <span>{availableCampuses.length > 1 ? "SWITCH CAMPUS" : "ASSIGNED CAMPUS"}</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableCampuses.map((c) => {
                    const isSelected =
                      String(selectedCampus?.id ?? selectedCampus?.campusId ?? "1") === String(c.id ?? c.campusId);
                    return (
                      <button
                        key={c.id || c.campusId}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedCampus(c);
                          setResponsiveOpen(false);
                        }}
                      >
                        <span className="cms-academic-item-name">{c.name || c.campusName}</span>
                        {isSelected && <CheckCircle2 size={15} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Board Selector */}
              <div className="cms-academic-responsive-section">
                <div className="cms-academic-responsive-sec-title">
                  <NavbarIcon src={navbarBoardIcon} />
                  <span>{availableBoards.length > 1 ? "SWITCH BOARD" : "ASSIGNED BOARD"}</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableBoards.map((b) => {
                    const isSelected =
                      String(selectedBoardId || "1") === String(b.id || b.boardId);
                    return (
                      <button
                        key={b.id || b.boardId || b.code}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedBoardId(String(b.id || b.boardId));
                          setResponsiveOpen(false);
                        }}
                      >
                        <span className="cms-academic-item-name">{b.name || b.boardName || b.code}</span>
                        {isSelected && <CheckCircle2 size={15} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Academic Year Selector */}
              <div className="cms-academic-responsive-section">
                <div className="cms-academic-responsive-sec-title">
                  <NavbarIcon src={navbarAcademicYearIcon} />
                  <span>{availableYears.length > 1 ? "SWITCH ACADEMIC YEAR" : "ACADEMIC YEAR"}</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableYears.map((y) => {
                    const isSelected =
                      selectedAcademicYear?.id === y.id ||
                      selectedAcademicYear?.name === y.name ||
                      (!selectedAcademicYear && (y.name === "2026-2027" || y.code === "2026-2027"));
                    return (
                      <button
                        key={y.id || y.name}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedAcademicYear(y);
                          setResponsiveOpen(false);
                        }}
                      >
                        <span className="cms-academic-item-name">{y.name || y.label || y.code}</span>
                        {isSelected && <CheckCircle2 size={15} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle variant="dashboard" />

        {/* Notifications Button */}
        <button
          className="cms-icon-btn"
          type="button"
          onClick={() => {
            if (context?.showToast) context.showToast("No new transport notifications", "info");
          }}
          title="Notifications"
          aria-label="Notifications"
        >
          <NavbarIcon src={navbarNotificationsIcon} />
        </button>

        {/* Profile Avatar Capsule Pill & Dropdown matching Reference 2 & 3 */}
        <div style={{ position: "relative" }} ref={profileDropRef}>
          <button
            type="button"
            className="cms-profile-btn"
            onClick={() => setProfileDropOpen((p) => !p)}
            aria-label="User Profile Menu"
          >
            <TransparentAvatar size={34} className="cms-avatar" style={{ color: "var(--cms-primary, #7c3aed)" }} />
            <div className="cms-profile-meta">
              <strong>{profile?.fullName || profile?.name || "muzan kibutsuzi"}</strong>
              <span>Transport Manager</span>
            </div>
            <ChevronDown size={14} className="cms-profile-arrow" />
          </button>

          {profileDropOpen && (
            <div className="cms-dropdown" onClick={() => setProfileDropOpen(false)}>
              <div className="cms-dropdown-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TransparentAvatar size={36} className="cms-avatar" style={{ color: "var(--cms-primary, #7c3aed)" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profile?.fullName || profile?.name || "muzan kibutsuzi"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--cms-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Transport Manager
                    </div>
                  </div>
                </div>
              </div>

              <div className="cms-dropdown-menu">
                <button
                  type="button"
                  className="cms-dropdown-item"
                  onClick={() => navigate("/transport-manager/profile")}
                >
                  <User size={15} />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  className="cms-dropdown-item"
                  onClick={() => {
                    setProfileDropOpen(false);
                    if (onOpenThemePalette) {
                      onOpenThemePalette();
                    }
                  }}
                >
                  <Palette size={15} />
                  <span>Theme Appearance</span>
                </button>
                <button
                  type="button"
                  className="cms-dropdown-item"
                  onClick={() => navigate("/transport-manager/settings")}
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  className="cms-dropdown-item text-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .cms-topbar.tm-navbar {
          container-type: inline-size;
          container-name: topbar;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          padding: 0 14px !important;
          gap: 10px !important;
          overflow: visible !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
        }

        /* Compact search input matching Reference 1 (Admin Dashboard) */
        .cms-topbar.tm-navbar .cms-search-wrap {
          flex: 0 1 170px !important;
          min-width: 90px !important;
          max-width: 185px !important;
          position: relative !important;
          transition: max-width 0.2s ease, flex 0.2s ease !important;
        }

        .cms-topbar.tm-navbar .cms-search-panel {
          position: absolute !important;
          top: calc(100% + 6px) !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 9999 !important;
          background: var(--cms-surface, #ffffff) !important;
          border: 1px solid var(--cms-border, #e2e8f0) !important;
          border-radius: 10px !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18) !important;
        }

        .cms-topbar.tm-navbar .cms-top-actions {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          margin-left: auto !important;
          flex-shrink: 0 !important;
          min-width: 0 !important;
        }

        /* Large Screen / Desktop: 3 Side-by-Side Academic Pills */
        .cms-academic-responsive-wrapper { display: none !important; }
        .cms-academic-selectors-desktop {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          flex-shrink: 0 !important;
        }

        .cms-academic-selectors-desktop .cms-academic-dropdown-wrap {
          position: relative !important;
          flex-shrink: 0 !important;
        }

        /* Academic Context Button Base & Truncation (matching Reference 1) */
        .cms-topbar.tm-navbar .cms-academic-btn {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          height: 34px !important;
          padding: 2px 8px !important;
          border-radius: 9px !important;
          background: var(--cms-surface, #ffffff) !important;
          border: 1px solid var(--cms-border, #e2e8f0) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
          max-width: clamp(100px, 13vw, 160px) !important;
          min-width: 75px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          cursor: pointer !important;
          transition: all 0.18s ease !important;
          flex-shrink: 0 !important;
        }

        .cms-topbar.tm-navbar .cms-academic-btn-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 22px !important;
          height: 22px !important;
          border-radius: 6px !important;
          background: color-mix(in srgb, var(--cms-primary, #7c3aed) 12%, transparent) !important;
          color: var(--cms-primary, #7c3aed) !important;
          flex-shrink: 0 !important;
        }

        .cms-topbar.tm-navbar .cms-academic-btn-text {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          line-height: 1.15 !important;
          text-align: left !important;
          flex: 1 1 0 !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .cms-topbar.tm-navbar .cms-academic-btn-label {
          font-size: 8px !important;
          font-weight: 800 !important;
          color: var(--cms-muted, #7B8275) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.3px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 100% !important;
          width: 100% !important;
          display: block !important;
        }

        .cms-topbar.tm-navbar .cms-academic-btn-value {
          font-size: 11px !important;
          font-weight: 800 !important;
          color: var(--cms-text, #1e293b) !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 100% !important;
          width: 100% !important;
          display: block !important;
        }

        .cms-topbar.tm-navbar .cms-academic-btn-arrow {
          color: var(--cms-muted, #7B8275) !important;
          transition: transform 0.2s ease !important;
          margin-left: 1px !important;
          flex-shrink: 0 !important;
          display: block !important;
        }

        .cms-topbar.tm-navbar .cms-academic-btn.is-open .cms-academic-btn-arrow {
          transform: rotate(180deg) !important;
        }

        /* Dropdown Panel: Floats cleanly on top of the navbar and page content (matching Reference 2) */
        .cms-topbar.tm-navbar .cms-academic-dropdown-panel {
          position: absolute !important;
          top: calc(100% + 8px) !important;
          left: 0 !important;
          right: auto !important;
          min-width: 260px !important;
          max-width: min(340px, calc(100vw - 20px)) !important;
          width: max-content !important;
          background: #ffffff !important;
          border: 1px solid var(--cms-border, #e2e8f0) !important;
          border-radius: 12px !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06) !important;
          z-index: 9999 !important;
          padding: 10px !important;
          animation: cmsFadeDown 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        [data-theme="dark"] .cms-topbar.tm-navbar .cms-academic-dropdown-panel {
          background: #182118 !important;
          border-color: var(--cms-border, #2e3a2c) !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45) !important;
        }

        /* Header in dropdown panel matching Reference 2 */
        .cms-topbar.tm-navbar .cms-academic-panel-header {
          font-size: 10px !important;
          font-weight: 800 !important;
          color: var(--cms-muted, #7B8275) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          padding: 4px 8px 8px !important;
          border-bottom: 1px solid var(--cms-border, #f1f5f9) !important;
          margin-bottom: 6px !important;
        }

        .cms-topbar.tm-navbar .cms-academic-panel-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          max-height: 240px !important;
          overflow-y: auto !important;
        }

        .cms-topbar.tm-navbar .cms-academic-panel-item {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
          padding: 8px 12px !important;
          border: 0 !important;
          background: transparent !important;
          border-radius: 9px !important;
          cursor: pointer !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          color: var(--cms-text, #1e293b) !important;
          transition: all 0.15s ease !important;
          text-align: left !important;
        }

        .cms-topbar.tm-navbar .cms-academic-panel-item:hover {
          background: var(--cms-primary-soft, #f1f6ea) !important;
          color: var(--cms-primary, #7c3aed) !important;
        }

        .cms-topbar.tm-navbar .cms-academic-panel-item.is-selected {
          background: color-mix(in srgb, var(--cms-primary, #7c3aed) 12%, #ffffff) !important;
          color: var(--cms-primary, #7c3aed) !important;
          font-weight: 700 !important;
        }

        [data-theme="dark"] .cms-topbar.tm-navbar .cms-academic-panel-item.is-selected {
          background: color-mix(in srgb, var(--cms-primary, #7c3aed) 22%, #182118) !important;
          color: var(--cms-primary-light, #c4b5fd) !important;
        }

        .cms-topbar.tm-navbar .cms-academic-check {
          color: #16a34a !important;
          flex-shrink: 0 !important;
          margin-left: 8px !important;
        }

        /* If dropdown is near right edge (Academic Year or Profile), align right */
        .cms-topbar.tm-navbar .cms-academic-dropdown-wrap:last-child .cms-academic-dropdown-panel,
        .cms-topbar.tm-navbar .cms-dropdown {
          left: auto !important;
          right: 0 !important;
          z-index: 9999 !important;
        }

        /* Profile Button */
        .cms-topbar.tm-navbar .cms-profile-btn {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 3px 8px 3px 3px !important;
          border-radius: 9999px !important;
          background: var(--cms-card-bg, #ffffff) !important;
          border: 1px solid var(--cms-border, #e2e8f0) !important;
          box-shadow: var(--cms-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05)) !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          flex-shrink: 0 !important;
          max-width: 180px !important;
          min-width: 0 !important;
        }

        .cms-topbar.tm-navbar .cms-profile-btn:hover {
          background: var(--cms-hover, rgba(124, 58, 237, 0.04)) !important;
          border-color: var(--cms-primary, #7c3aed) !important;
        }

        .cms-topbar.tm-navbar .cms-profile-meta {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          min-width: 0 !important;
          max-width: 110px !important;
          text-align: left !important;
        }

        .cms-topbar.tm-navbar .cms-profile-meta strong {
          font-size: 12px !important;
          font-weight: 700 !important;
          color: var(--cms-text, #1e293b) !important;
          line-height: 1.2 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 100% !important;
        }

        .cms-topbar.tm-navbar .cms-profile-meta span {
          font-size: 10.5px !important;
          font-weight: 500 !important;
          color: var(--cms-muted, #727c65) !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          margin-top: 1px !important;
          max-width: 100% !important;
        }

        .cms-topbar.tm-navbar .cms-profile-arrow {
          color: var(--cms-text, #1e293b) !important;
          opacity: 0.75 !important;
          flex-shrink: 0 !important;
          margin-left: 1px !important;
        }

        /* Profile Dropdown Menu */
        .cms-topbar.tm-navbar .cms-dropdown {
          position: absolute !important;
          top: calc(100% + 8px) !important;
          right: 0 !important;
          left: auto !important;
          z-index: 9999 !important;
          background: #ffffff !important;
          border: 1px solid var(--cms-border, #e2e8f0) !important;
          border-radius: 12px !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18) !important;
        }

        /* Responsive Compact Trigger Button (Preserved for small screen width) */
        .cms-topbar.tm-navbar .cms-academic-responsive-trigger {
          max-width: clamp(110px, 14vw, 170px) !important;
          min-width: 90px !important;
          padding: 2px 7px !important;
          flex-shrink: 1 !important;
        }

        /* Small Screen Width Breakpoint: Preserved compact trigger below 768px */
        @media (max-width: 768px) {
          .cms-topbar.tm-navbar {
            padding: 0 8px !important;
            gap: 6px !important;
          }
          .cms-academic-selectors-desktop { display: none !important; }
          .cms-academic-responsive-wrapper {
            display: block !important;
            position: relative !important;
            flex-shrink: 1 !important;
            min-width: 0 !important;
          }
          .cms-topbar.tm-navbar .cms-profile-meta { display: none !important; }
          .cms-topbar.tm-navbar .cms-profile-btn {
            padding: 3px 6px 3px 3px !important;
            gap: 4px !important;
          }
          .cms-topbar.tm-navbar .cms-search-wrap {
            max-width: 140px !important;
            min-width: 75px !important;
            flex-shrink: 1 !important;
          }
          .cms-topbar.tm-navbar .cms-top-actions {
            gap: 4px !important;
          }
          .cms-topbar.tm-navbar .cms-icon-btn {
            width: 32px !important;
            height: 32px !important;
          }
          .cms-topbar.tm-navbar .cms-academic-responsive-trigger {
            padding: 2px 6px !important;
            max-width: 130px !important;
            min-width: 75px !important;
          }
        }

        @container topbar (max-width: 768px) {
          .cms-topbar.tm-navbar {
            padding: 0 8px !important;
            gap: 6px !important;
          }
          .cms-academic-selectors-desktop { display: none !important; }
          .cms-academic-responsive-wrapper {
            display: block !important;
            position: relative !important;
            flex-shrink: 1 !important;
            min-width: 0 !important;
          }
          .cms-topbar.tm-navbar .cms-profile-meta { display: none !important; }
          .cms-topbar.tm-navbar .cms-profile-btn {
            padding: 3px 6px 3px 3px !important;
            gap: 4px !important;
          }
          .cms-topbar.tm-navbar .cms-search-wrap {
            max-width: 120px !important;
            min-width: 70px !important;
            flex-shrink: 1 !important;
          }
          .cms-topbar.tm-navbar .cms-top-actions {
            gap: 4px !important;
          }
          .cms-topbar.tm-navbar .cms-icon-btn {
            width: 32px !important;
            height: 32px !important;
          }
          .cms-topbar.tm-navbar .cms-academic-responsive-trigger {
            padding: 2px 6px !important;
            max-width: 120px !important;
            min-width: 70px !important;
          }
        }

        .cms-academic-responsive-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 295px;
          max-width: calc(100vw - 32px);
          max-height: 75vh;
          overflow-y: auto;
          padding: 12px;
          z-index: 9999;
          box-shadow: var(--cms-shadow-lg, 0 20px 50px rgba(16, 32, 60, 0.18));
        }

        .cms-academic-responsive-section {
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--cms-border, #e4e8f0);
        }

        .cms-academic-responsive-section:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .cms-academic-responsive-sec-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--cms-muted, #7B8275);
          margin-bottom: 6px;
        }
      `}</style>
    </header>
  );
}
