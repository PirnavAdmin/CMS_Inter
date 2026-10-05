import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, User, LogOut, CheckCircle2 } from "lucide-react";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import { useFaculty } from "../FacultyContext.jsx";
import { facultyMockData } from "../data/facultyMockData.js";

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

export default function FacultyNavbar() {
  const navigate = useNavigate();
  const {
    profileData,
    initials,
    setSidebarOpen,
    selectedBoard,
    setSelectedBoard,
    selectedAcademicYear,
    setSelectedAcademicYear,
    boards,
    academicYears,
    boardsLoading,
    academicYearsLoading,
    notify,
    setActiveModule,
    setProfileStep,
  } = useFaculty();

  const [boardOpen, setBoardOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const boardRef = useRef(null);
  const yearRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const profileDropRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (profileDropRef.current && !profileDropRef.current.contains(e.target)) setProfileDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        {/* Topbar Academic Selectors */}
        <div className="cms-academic-selectors">
          {/* Board Selector */}
          <div className="cms-academic-dropdown-wrap" ref={boardRef}>
            <button
              type="button"
              className={`cms-academic-btn ${boardOpen ? "is-open" : ""}`}
              onClick={() => {
                setBoardOpen((v) => !v);
                setYearOpen(false);
                setProfileDropOpen(false);
              }}
              disabled={boardsLoading || !boards?.length}
              aria-label="Select Board"
              aria-expanded={boardOpen}
            >
              <div className="cms-academic-btn-icon">
                <NavbarIcon src={navbarBoardIcon} />
              </div>
              <div className="cms-academic-btn-text">
                <span className="cms-academic-btn-label">Board</span>
                <span
                  className="cms-academic-btn-value"
                  title={selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code}
                >
                  {selectedBoard?.name ||
                    selectedBoard?.boardName ||
                    selectedBoard?.code ||
                    (boardsLoading ? "Loading boards..." : "No active boards available")}
                </span>
              </div>
              <ChevronDown size={12} className="cms-academic-btn-arrow" />
            </button>

            {boardOpen && (
              <div className="cms-academic-dropdown-panel">
                <div className="cms-academic-panel-header">Select Board</div>
                <div className="cms-academic-panel-list">
                  {boardsLoading ? (
                    <div className="cms-academic-panel-empty">Loading boards...</div>
                  ) : !boards?.length ? (
                    <div className="cms-academic-panel-empty">No active boards available</div>
                  ) : (
                    boards.map((b) => {
                      const isSelected =
                        selectedBoard?.code === b.code ||
                        selectedBoard?.id === b.id ||
                        selectedBoard?.name === b.name ||
                        selectedBoard?.boardName === b.boardName;
                      return (
                        <button
                          key={b.id || b.code}
                          type="button"
                          className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setSelectedBoard(b);
                            setBoardOpen(false);
                          }}
                        >
                          <span className="cms-academic-item-name" title={b.name || b.boardName || b.code}>
                            {b.name || b.boardName || b.code}
                          </span>
                          {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Academic Year Selector */}
          <div className="cms-academic-dropdown-wrap" ref={yearRef}>
            <button
              type="button"
              className={`cms-academic-btn ${yearOpen ? "is-open" : ""}`}
              onClick={() => {
                setYearOpen((v) => !v);
                setBoardOpen(false);
                setProfileDropOpen(false);
              }}
              disabled={academicYearsLoading || !academicYears?.length}
              aria-label="Select Academic Year"
              aria-expanded={yearOpen}
            >
              <div className="cms-academic-btn-icon">
                <NavbarIcon src={navbarAcademicYearIcon} />
              </div>
              <div className="cms-academic-btn-text">
                <span className="cms-academic-btn-label">Academic Year</span>
                <span className="cms-academic-btn-value">
                  {selectedAcademicYear?.name ||
                    selectedAcademicYear?.label ||
                    selectedAcademicYear?.code ||
                    (academicYearsLoading ? "Loading years..." : "No active academic years")}
                </span>
              </div>
              <ChevronDown size={12} className="cms-academic-btn-arrow" />
            </button>

            {yearOpen && (
              <div className="cms-academic-dropdown-panel">
                <div className="cms-academic-panel-header">Select Academic Year</div>
                <div className="cms-academic-panel-list">
                  {academicYearsLoading ? (
                    <div className="cms-academic-panel-empty">Loading academic years...</div>
                  ) : !academicYears?.length ? (
                    <div className="cms-academic-panel-empty">No active academic years available</div>
                  ) : (
                    academicYears.map((y) => {
                      const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
                      const isSelected =
                        normalize(selectedAcademicYear?.code) === normalize(y.code) ||
                        normalize(selectedAcademicYear?.name) === normalize(y.name) ||
                        normalize(selectedAcademicYear?.label) === normalize(y.label);
                      return (
                        <button
                          key={y.id || y.code}
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
                    })
                  )}
                </div>
              </div>
            )}
          </div>
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
    </header>
  );
}
