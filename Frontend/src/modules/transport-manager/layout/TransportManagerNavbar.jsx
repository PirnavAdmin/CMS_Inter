import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Building2,
  CheckCircle2,
  LogOut,
  User,
  Settings,
  ShieldCheck,
} from "lucide-react";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
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

export default function TransportManagerNavbar() {
  const navigate = useNavigate();
  const context = useTransportManagerSafe();

  const toggleSidebar = context?.toggleSidebar || (() => {});
  const sidebarCollapsed = context?.sidebarCollapsed ?? false;
  const profile = context?.profile;
  const authorizedBoards = context?.authorizedBoards;
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
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const campusRef = useRef(null);
  const boardRef = useRef(null);
  const yearRef = useRef(null);
  const profileDropRef = useRef(null);
  const searchRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (campusRef.current && !campusRef.current.contains(e.target)) setCampusOpen(false);
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
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

  const initials = useMemo(() => {
    const fullName = String(profile?.fullName || profile?.name || "muzan kibutsuzi").trim();
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0]?.[0] || "M").toUpperCase();
  }, [profile?.fullName, profile?.name]);

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

      {/* Search Input for Pages & Modules matching Screenshot 2 */}
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
        {/* Academic Context Selectors (Campus + Board + Academic Year) */}
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
                <Building2 size={16} color="var(--cms-primary, #6F8400)" />
              </div>
              <div className="cms-academic-btn-text">
                <span className="cms-academic-btn-label">Campus</span>
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
                        <span className="cms-academic-item-name">{c.name || c.campusName}</span>
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
                <span className="cms-academic-btn-label">Board</span>
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
                        <span className="cms-academic-item-name">{b.name || b.boardName || b.code}</span>
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
                <span className="cms-academic-btn-label">Academic Year</span>
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

        {/* Theme Toggle (Dashboard Variant with 3D icons) */}
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

        {/* Profile Avatar Capsule Pill & Dropdown matching Screenshot 2 */}
        <div style={{ position: "relative" }} ref={profileDropRef}>
          <button
            type="button"
            className="cms-profile-btn"
            onClick={() => setProfileDropOpen((p) => !p)}
            aria-label="User Profile Menu"
          >
            <div className="cms-avatar cms-avatar-fallback">
              {initials}
            </div>
            <div className="cms-profile-meta">
              <strong>{profile?.fullName || profile?.name || "muzan kibutsuzi"}</strong>
              <span>Transport Manager</span>
            </div>
            <ChevronDown size={14} />
          </button>

          {profileDropOpen && (
            <div className="cms-dropdown" onClick={() => setProfileDropOpen(false)}>
              <div className="cms-dropdown-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    className="cms-avatar cms-dropdown-avatar-fallback"
                    style={{
                      width: 36,
                      height: 36,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: "var(--cms-primary, #6F8400)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {initials}
                  </div>
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
    </header>
  );
}
