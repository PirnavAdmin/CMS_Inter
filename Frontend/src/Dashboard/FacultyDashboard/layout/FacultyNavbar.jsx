import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, User, LogOut, CheckCircle2, Building2, Lock } from "lucide-react";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import { useFaculty } from "../FacultyContext.jsx";
import { facultyMockData } from "../data/facultyMockData.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";

export function NavbarIcon({ src }) {
  return <img className="cms-navbar-3d-icon" src={src} alt="" aria-hidden="true" />;
}

export const STAFF_SEARCH_INDEX = [
  { id: "dashboard", label: "Dashboard", group: "MAIN", moduleId: "dashboard", keywords: "home overview summary live clock stats biometric check in staff portal punch attendance" },
  { id: "profile", label: "My Profile", group: "MAIN", moduleId: "profile", keywords: "profile details download pdf resume verification identity employee" },
  { id: "profile-personal", label: "Personal Information", group: "MY PROFILE", moduleId: "profile", step: 1, keywords: "first name last name dob aadhaar pan mobile email gender marital status blood group photo" },
  { id: "profile-bank", label: "Bank Details", group: "MY PROFILE", moduleId: "profile", step: 2, keywords: "bank salary account ifsc branch account number uan pf statutory passbook" },
  { id: "profile-address", label: "Address Information", group: "MY PROFILE", moduleId: "profile", step: 3, keywords: "house street village city pincode district state country contact residential address permanent" },
  { id: "profile-experience", label: "Experience Details", group: "MY PROFILE", moduleId: "profile", step: 4, keywords: "teaching academic experience history institution designation subjects teached past work college" },
  { id: "profile-documents", label: "Uploaded Documents", group: "MY PROFILE", moduleId: "profile", step: 5, keywords: "certificates pdf files verification id proof attachments degree pan aadhaar upload" },
  { id: "profile-preview", label: "Profile Preview & Submit", group: "MY PROFILE", moduleId: "profile", step: 6, keywords: "preview review submit final submission verification summary review employee details" },
  { id: "timetable", label: "My Timetable", group: "ACADEMICS", moduleId: "timetable", keywords: "schedule classes routine periods lecture room slot monday tuesday wednesday thursday friday saturday weekly timetable" },
  { id: "attendance", label: "Student Attendance", group: "ACADEMICS", moduleId: "attendance", keywords: "roll call mark attendance students present absent morning afternoon daily register student attendance student management" },
  { id: "marks", label: "Marks Entry", group: "ACADEMICS", moduleId: "marks", keywords: "marks evaluation exam marks entry evaluation score grades examination results test student marks subject test" },
  { id: "examduties", label: "Exam Duties", group: "ACADEMICS", moduleId: "examduties", keywords: "invigilation hall superintendent exam duty evaluation camp practical external chief invigilator bieap duties center" },
  { id: "myattendance", label: "My Attendance", group: "HR & FINANCE", moduleId: "myattendance", keywords: "biometric punch logs clock in check in history hours worked faculty attendance daily log punch status biometric machine" },
  { id: "leave", label: "Leave Management", group: "HR & FINANCE", moduleId: "leave", keywords: "apply leave casual leave sick leave earned leave on duty od balance leave history cl sl el leave request permissions" },
  { id: "salary", label: "Salary & Payslips", group: "HR & FINANCE", moduleId: "salary", keywords: "payslip download salary slip ctc gross net pay deductions hra da pf allowances earnings payroll tax tds" },
  { id: "reimbursements", label: "Reimbursements", group: "HR & FINANCE", moduleId: "reimbursements", keywords: "claim reimbursement expenses bills receipts claim proof approval books conference medical travel claims fuel" },
];

const FALLBACK_ACADEMIC_YEARS = [
  { id: "2026-2027", code: "2026-2027", name: "2026-2027", label: "2026-2027" },
  { id: "2025-2026", code: "2025-2026", name: "2025-2026", label: "2025-2026" },
  { id: "2024-2025", code: "2024-2025", name: "2024-2025", label: "2024-2025" },
];

const FALLBACK_BOARDS = [
  { id: "1", boardId: 1, code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh", boardName: "Board of Intermediate Education, Andhra Pradesh" },
  { id: "2", boardId: 2, code: "CBSE", name: "Central Board of Secondary Education", boardName: "Central Board of Secondary Education" },
];

export default function FacultyNavbar() {
  const navigate = useNavigate();

  // Contexts
  const {
    profileData,
    initials,
    setSidebarOpen,
    notify,
    setActiveModule,
    setProfileStep,
    setSelectedBoard: facultySetSelectedBoard,
    setSelectedAcademicYear: facultySetSelectedAcademicYear,
  } = useFaculty();

  const { selectedCampus } = useCampusContext();

  const {
    boards,
    academicYears,
    selectedBoard,
    selectedAcademicYear,
    setSelectedBoard: academicSetSelectedBoard,
    setSelectedAcademicYear: academicSetSelectedAcademicYear,
    boardsLoading,
    academicYearsLoading,
  } = useAcademicContext();

  // Robust Board Resolution
  const availableBoards = useMemo(() => {
    if (Array.isArray(boards) && boards.length > 0) return boards;
    if (Array.isArray(facultyMockData.boards) && facultyMockData.boards.length > 0) {
      return facultyMockData.boards.map((b) => ({
        ...b,
        name: b.name === "BIEAP" ? "Board of Intermediate Education, Andhra Pradesh" : b.name,
        boardName: b.name === "BIEAP" ? "Board of Intermediate Education, Andhra Pradesh" : b.name,
      }));
    }
    return FALLBACK_BOARDS;
  }, [boards]);

  const activeBoard = useMemo(() => {
    if (selectedBoard?.name || selectedBoard?.code) return selectedBoard;
    try {
      const stored = localStorage.getItem("cms_selected_board");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name || parsed?.code) return parsed;
      }
    } catch {}
    return availableBoards[0] || null;
  }, [selectedBoard, availableBoards]);

  // Robust Academic Year Resolution (ensures years are always selectable)
  const availableAcademicYears = useMemo(() => {
    if (Array.isArray(academicYears) && academicYears.length > 0) return academicYears;
    return FALLBACK_ACADEMIC_YEARS;
  }, [academicYears]);

  const activeAcademicYear = useMemo(() => {
    if (selectedAcademicYear?.name || selectedAcademicYear?.code) return selectedAcademicYear;
    try {
      const stored = localStorage.getItem("cms_selected_academic_year");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name || parsed?.code) return parsed;
      }
    } catch {}
    return availableAcademicYears[0] || null;
  }, [selectedAcademicYear, availableAcademicYears]);

  // Sync initial selections back to contexts if they were null
  useEffect(() => {
    if (!selectedBoard && activeBoard) {
      if (academicSetSelectedBoard) academicSetSelectedBoard(activeBoard);
      if (facultySetSelectedBoard) facultySetSelectedBoard(activeBoard);
    }
    if (!selectedAcademicYear && activeAcademicYear) {
      if (academicSetSelectedAcademicYear) academicSetSelectedAcademicYear(activeAcademicYear);
      if (facultySetSelectedAcademicYear) facultySetSelectedAcademicYear(activeAcademicYear);
    }
  }, [selectedBoard, activeBoard, selectedAcademicYear, activeAcademicYear, academicSetSelectedBoard, facultySetSelectedBoard, academicSetSelectedAcademicYear, facultySetSelectedAcademicYear]);

  // Dropdown States
  const [boardOpen, setBoardOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [responsiveOpen, setResponsiveOpen] = useState(false);

  const boardRef = useRef(null);
  const yearRef = useRef(null);
  const responsiveRef = useRef(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Profile Dropdown State
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const profileDropRef = useRef(null);

  // Board & Academic Year Selection Handlers
  const handleBoardSelect = (board) => {
    if (academicSetSelectedBoard) academicSetSelectedBoard(board);
    if (facultySetSelectedBoard) facultySetSelectedBoard(board);
    try {
      localStorage.setItem("cms_selected_board", JSON.stringify(board));
    } catch {}
    setBoardOpen(false);
    setResponsiveOpen(false);
  };

  const handleYearSelect = (year) => {
    if (academicSetSelectedAcademicYear) academicSetSelectedAcademicYear(year);
    if (facultySetSelectedAcademicYear) facultySetSelectedAcademicYear(year);
    try {
      localStorage.setItem("cms_selected_academic_year", JSON.stringify(year));
    } catch {}
    setYearOpen(false);
    setResponsiveOpen(false);
  };

  // Search Index Filtering
  const searchSuggestions = useMemo(() => {
    const searchIndex = [...STAFF_SEARCH_INDEX, ...(facultyMockData.searchIndex || [])];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchIndex.slice(0, 8);
    return searchIndex
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q) ||
          (item.keywords && item.keywords.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchQuery]);

  const handleSelectSearchResult = (item) => {
    setActiveModule(item.moduleId);
    if (item.step) {
      setProfileStep(item.step);
    }
    setSearchOpen(false);
    setSearchQuery("");
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleLogout = () => {
    navigate("/login", { replace: true });
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
      if (responsiveRef.current && !responsiveRef.current.contains(e.target)) setResponsiveOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (profileDropRef.current && !profileDropRef.current.contains(e.target)) setProfileDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const campusDisplayName = selectedCampus?.name || selectedCampus?.campusName || selectedCampus?.code || "Main Campus (HQ)";
  const boardDisplayName = activeBoard?.name || activeBoard?.boardName || activeBoard?.code || (boardsLoading ? "Loading boards..." : "Board of Intermediate Education, Andhra Pradesh");
  const yearDisplayName = activeAcademicYear?.name || activeAcademicYear?.label || activeAcademicYear?.code || "2026-2027";

  return (
    <header className="cms-topbar">
      {/* 3-bar Hamburger Toggle */}
      <button
        className="cms-icon-btn cms-menu-toggle"
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        title="Toggle Sidebar"
        aria-label="Toggle Sidebar"
      >
        <NavbarIcon src={navbarMenuIcon} />
      </button>

      {/* Search Bar for Pages & Modules */}
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
        {searchOpen && (
          <div className="cms-search-panel">
            {searchSuggestions.length ? (
              searchSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="cms-search-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSearchResult(s)}
                >
                  <span>{s.label}</span>
                  <small>{s.group}</small>
                </button>
              ))
            ) : (
              <div className="cms-search-empty">No matching modules found</div>
            )}
          </div>
        )}
      </div>

      <div className="cms-top-actions">
        {/* DESKTOP SELECTORS (≥ 1120px): Side-by-side Campus + Board + Academic Year */}
        <div className="cms-academic-selectors cms-academic-selectors-desktop">
          {/* Campus Selector (Read-Only) */}
          <div
            className="cms-academic-btn cms-academic-btn-campus is-readonly"
            title={`Assigned Campus: ${campusDisplayName} (Configured by Administrator)`}
            aria-label="Campus (Read-Only)"
          >
            <div className="cms-academic-btn-icon">
              <Building2 size={16} color="var(--cms-primary)" />
            </div>
            <div className="cms-academic-btn-text">
              <span className="cms-academic-btn-label">Campus</span>
              <span className="cms-academic-btn-value" title={campusDisplayName}>
                {campusDisplayName}
              </span>
            </div>
          </div>

          {/* Board Selector (Interactive Dropdown) */}
          <div className="cms-academic-dropdown-wrap" ref={boardRef}>
            <button
              type="button"
              className={`cms-academic-btn ${boardOpen ? "is-open" : ""}`}
              onClick={() => {
                setBoardOpen((v) => !v);
                setYearOpen(false);
                setProfileDropOpen(false);
              }}
              disabled={boardsLoading && !availableBoards.length}
              aria-label="Select Board"
              aria-expanded={boardOpen}
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
                <div className="cms-academic-panel-header">Select Board</div>
                <div className="cms-academic-panel-list">
                  {availableBoards.map((b) => {
                    const isSelected =
                      String(activeBoard?.id) === String(b.id) ||
                      activeBoard?.code === b.code ||
                      activeBoard?.name === b.name ||
                      activeBoard?.boardName === b.boardName;
                    return (
                      <button
                        key={b.id || b.code}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => handleBoardSelect(b)}
                      >
                        <span className="cms-academic-item-name" title={b.name || b.boardName || b.code}>
                          {b.name || b.boardName || b.code}
                        </span>
                        {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Academic Year Selector (Interactive Dropdown) */}
          <div className="cms-academic-dropdown-wrap" ref={yearRef}>
            <button
              type="button"
              className={`cms-academic-btn ${yearOpen ? "is-open" : ""}`}
              onClick={() => {
                setYearOpen((v) => !v);
                setBoardOpen(false);
                setProfileDropOpen(false);
              }}
              disabled={academicYearsLoading && !availableAcademicYears.length}
              aria-label="Select Academic Year"
              aria-expanded={yearOpen}
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
                <div className="cms-academic-panel-header">Select Academic Year</div>
                <div className="cms-academic-panel-list">
                  {availableAcademicYears.map((y) => {
                    const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
                    const isSelected =
                      String(activeAcademicYear?.id) === String(y.id) ||
                      normalize(activeAcademicYear?.code) === normalize(y.code) ||
                      normalize(activeAcademicYear?.name) === normalize(y.name) ||
                      normalize(activeAcademicYear?.label) === normalize(y.label);
                    return (
                      <button
                        key={y.id || y.code}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => handleYearSelect(y)}
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

        {/* RESPONSIVE SELECTOR (< 1120px): Compact button that hides details under a single menu */}
        <div className="cms-academic-responsive-wrapper" ref={responsiveRef}>
          <button
            type="button"
            className={`cms-academic-btn cms-academic-responsive-trigger ${responsiveOpen ? "is-open" : ""}`}
            onClick={() => {
              setResponsiveOpen((v) => !v);
              setBoardOpen(false);
              setYearOpen(false);
              setProfileDropOpen(false);
            }}
            aria-label="Academic Context Selector"
            title="Campus, Board & Academic Year"
          >
            <div className="cms-academic-btn-icon">
              <Building2 size={16} color="var(--cms-primary)" />
            </div>
            <div className="cms-academic-btn-text">
              <span className="cms-academic-btn-label">Academic Context</span>
              <span className="cms-academic-btn-value">
                {activeBoard?.code || "Board"} · {activeAcademicYear?.name || "Year"}
              </span>
            </div>
            <ChevronDown size={12} className="cms-academic-btn-arrow" />
          </button>

          {responsiveOpen && (
            <div className="cms-academic-dropdown-panel cms-academic-responsive-panel">
              {/* Read-Only Campus */}
              <div className="cms-academic-responsive-section">
                <div className="cms-academic-responsive-sec-title">
                  <Building2 size={13} color="var(--cms-primary)" />
                  <span>Campus (Assigned by Admin)</span>
                </div>
                <div className="cms-academic-readonly-badge">
                  <span className="cms-badge-name" title={campusDisplayName}>{campusDisplayName}</span>
                  <span className="cms-badge-lock"><Lock size={10} /> Read-only</span>
                </div>
              </div>

              {/* Board Selector */}
              <div className="cms-academic-responsive-section">
                <div className="cms-academic-responsive-sec-title">
                  <NavbarIcon src={navbarBoardIcon} />
                  <span>Switch Board</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableBoards.map((b) => {
                    const isSelected =
                      String(activeBoard?.id) === String(b.id) ||
                      activeBoard?.code === b.code ||
                      activeBoard?.name === b.name ||
                      activeBoard?.boardName === b.boardName;
                    return (
                      <button
                        key={b.id || b.code}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => handleBoardSelect(b)}
                      >
                        <span className="cms-academic-item-name" title={b.name || b.boardName || b.code}>
                          {b.name || b.boardName || b.code}
                        </span>
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
                  <span>Switch Academic Year</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableAcademicYears.map((y) => {
                    const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
                    const isSelected =
                      String(activeAcademicYear?.id) === String(y.id) ||
                      normalize(activeAcademicYear?.code) === normalize(y.code) ||
                      normalize(activeAcademicYear?.name) === normalize(y.name) ||
                      normalize(activeAcademicYear?.label) === normalize(y.label);
                    return (
                      <button
                        key={y.id || y.code}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => handleYearSelect(y)}
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
        <button className="cms-icon-btn" onClick={() => notify("No new notifications")} title="Notifications">
          <NavbarIcon src={navbarNotificationsIcon} />
        </button>

        {/* Profile Avatar & Dropdown */}
        <div style={{ position: "relative" }} ref={profileDropRef}>
          <button className="cms-profile-btn" onClick={() => setProfileDropOpen((p) => !p)}>
            <div className="cms-avatar">{initials}</div>
            <div className="cms-profile-meta">
              <strong>
                {profileData.fullName ||
                  `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
                  "Staff Member"}
              </strong>
              <span>{profileData.designation || profileData.role || "Staff"}</span>
            </div>
            <ChevronDown size={14} />
          </button>

          {profileDropOpen && (
            <div className="cms-dropdown" onClick={() => setProfileDropOpen(false)}>
              <div className="cms-dropdown-head">
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {profileData.fullName ||
                    `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
                    "Staff Member"}
                </div>
                <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                  {typeof profileData.email === "string"
                    ? profileData.email
                    : Array.isArray(profileData.email)
                    ? profileData.email[0]
                    : ""}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>
                  ID: {profileData.employeeId || profileData.id || "—"}
                </div>
              </div>
              <button
                className="cms-dropdown-item"
                onClick={() => {
                  setActiveModule("profile");
                  setProfileDropOpen(false);
                }}
              >
                <User size={14} /> My Profile
              </button>
              <button className="cms-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scoped Responsive Styles for Faculty Academic Selectors */}
      <style>{`
        @media (min-width: 1121px) {
          .cms-academic-responsive-wrapper { display: none !important; }
          .cms-academic-selectors-desktop { display: flex !important; }
        }
        @media (max-width: 1120px) {
          .cms-academic-selectors-desktop { display: none !important; }
          .cms-academic-responsive-wrapper { display: block !important; position: relative; }
        }
        .cms-academic-btn.is-readonly {
          cursor: default !important;
          user-select: none;
          background: rgba(111, 132, 0, 0.05);
          border-color: rgba(111, 132, 0, 0.18);
        }
        .cms-academic-btn.is-readonly:hover {
          transform: none !important;
          box-shadow: none !important;
          border-color: rgba(111, 132, 0, 0.18) !important;
        }
        .cms-academic-responsive-wrapper {
          position: relative;
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
          z-index: 100;
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
        .cms-academic-readonly-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--cms-primary-soft, #F1F4E2);
          border: 1px solid rgba(111, 132, 0, 0.22);
          padding: 7px 10px;
          border-radius: 8px;
        }
        .cms-academic-readonly-badge .cms-badge-name {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--cms-primary-dark, #566900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cms-academic-readonly-badge .cms-badge-lock {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          color: var(--cms-muted, #7B8275);
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          flex-shrink: 0;
        }
      `}</style>
    </header>
  );
}
