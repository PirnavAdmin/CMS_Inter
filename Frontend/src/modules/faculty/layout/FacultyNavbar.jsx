import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, User, LogOut, CheckCircle2, Building2, Lock, Palette } from "lucide-react";
import navbarMenuIcon from "@/assets/navbar-3d/menu.png";
import navbarSearchIcon from "@/assets/navbar-3d/search.png";
import navbarNotificationsIcon from "@/assets/navbar-3d/notifications.png";
import navbarBoardIcon from "@/assets/navbar-3d/board.png";
import navbarAcademicYearIcon from "@/assets/navbar-3d/academic-year.png";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
import ThemePalettePicker from "@/shared/components/ThemePalettePicker.jsx";
import TransparentAvatar from "@/shared/components/TransparentAvatar.jsx";
import { useFaculty } from "../FacultyContext.jsx";
import { facultyMockData } from "../data/facultyMockData.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { clearAuthSession, getAuthUser } from "@/modules/auth/authStorage.js";

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
  const [themePaletteOpen, setThemePaletteOpen] = useState(false);
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

  const {
    campuses,
    activeCampuses,
    selectedCampus,
    setSelectedCampus,
    loading: campusLoading,
  } = useCampusContext();

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

  // 1. Staff Assigned Campuses Resolution
  const availableCampuses = useMemo(() => {
    const all = Array.isArray(activeCampuses) && activeCampuses.length > 0
      ? activeCampuses
      : (Array.isArray(campuses) && campuses.length > 0 ? campuses : []);

    const authUser = getAuthUser();

    // Array of campus objects on profileData
    if (Array.isArray(profileData?.assignedCampuses) && profileData.assignedCampuses.length > 0) {
      const idSet = new Set(profileData.assignedCampuses.map((c) => String(c.id ?? c.campusId)).filter(Boolean));
      const matched = all.filter((c) => idSet.has(String(c.id ?? c.campusId)));
      if (matched.length > 0) return matched;
      return profileData.assignedCampuses.map((c) => ({
        id: c.id ?? c.campusId,
        campusId: c.id ?? c.campusId,
        name: c.name || c.campusName || "Assigned Campus",
        code: c.code || c.campusCode || "CAMPUS",
      }));
    }

    // Array of campus IDs on profileData or authUser
    const assignedIds = (Array.isArray(profileData?.assignedCampusIds) && profileData.assignedCampusIds.length > 0)
      ? profileData.assignedCampusIds
      : (Array.isArray(authUser?.assignedCampusIds) && authUser.assignedCampusIds.length > 0)
      ? authUser.assignedCampusIds
      : null;

    if (Array.isArray(assignedIds) && assignedIds.length > 0) {
      const idSet = new Set(assignedIds.map(String));
      const matched = all.filter((c) => idSet.has(String(c.id ?? c.campusId)));
      if (matched.length > 0) return matched;
    }

    // Single campus assigned on profileData or authUser
    const singleId = profileData?.campusId ?? authUser?.campusId;
    if (singleId) {
      const matched = all.filter((c) => String(c.id ?? c.campusId) === String(singleId));
      if (matched.length > 0) return matched;
      const cName = profileData?.campusName || authUser?.campusName || "Main Campus (HQ)";
      return [{ id: singleId, campusId: singleId, name: cName, campusName: cName, code: "MAIN" }];
    }

    // Default: allow available active campuses
    return all.length > 0 ? all : [{ id: 1, campusId: 1, name: "Main Campus (HQ)", campusName: "Main Campus (HQ)", code: "MAIN" }];
  }, [activeCampuses, campuses, profileData]);

  // Active Campus Resolution
  const activeCampus = useMemo(() => {
    if (selectedCampus?.id || selectedCampus?.campusId) {
      const match = availableCampuses.find(
        (c) => String(c.id ?? c.campusId) === String(selectedCampus?.id ?? selectedCampus?.campusId)
      );
      if (match) return match;
    }
    return availableCampuses[0] || selectedCampus || null;
  }, [selectedCampus, availableCampuses]);

  // 2. Staff Assigned Boards Resolution
  const availableBoards = useMemo(() => {
    const allBoards = (Array.isArray(boards) && boards.length > 0)
      ? boards
      : (Array.isArray(facultyMockData.boards) && facultyMockData.boards.length > 0
          ? facultyMockData.boards.map((b) => ({
              ...b,
              name: b.name === "BIEAP" ? "Board of Intermediate Education, Andhra Pradesh" : b.name,
              boardName: b.name === "BIEAP" ? "Board of Intermediate Education, Andhra Pradesh" : b.name,
            }))
          : FALLBACK_BOARDS);

    const authUser = getAuthUser();

    // Array of board objects on profileData
    if (Array.isArray(profileData?.assignedBoards) && profileData.assignedBoards.length > 0) {
      const idSet = new Set(profileData.assignedBoards.map((b) => String(b.id ?? b.boardId)).filter(Boolean));
      const matched = allBoards.filter((b) => idSet.has(String(b.id ?? b.boardId)));
      if (matched.length > 0) return matched;
      return profileData.assignedBoards.map((b) => ({
        id: b.id ?? b.boardId,
        boardId: b.id ?? b.boardId,
        name: b.name === "BIEAP" ? "Board of Intermediate Education, Andhra Pradesh" : (b.name || b.boardName || "Assigned Board"),
        boardName: b.name === "BIEAP" ? "Board of Intermediate Education, Andhra Pradesh" : (b.name || b.boardName || "Assigned Board"),
        code: b.code || "BIEAP",
      }));
    }

    // Array of board IDs on profileData or authUser
    const assignedIds = (Array.isArray(profileData?.assignedBoardIds) && profileData.assignedBoardIds.length > 0)
      ? profileData.assignedBoardIds
      : (Array.isArray(authUser?.assignedBoardIds) && authUser.assignedBoardIds.length > 0)
      ? authUser.assignedBoardIds
      : null;

    if (Array.isArray(assignedIds) && assignedIds.length > 0) {
      const idSet = new Set(assignedIds.map(String));
      const matched = allBoards.filter((b) => idSet.has(String(b.id ?? b.boardId)));
      if (matched.length > 0) return matched;
    }

    // Single board assigned on profileData or authUser
    const singleBoardId = profileData?.boardId ?? authUser?.boardId;
    const singleBoardName = profileData?.boardName ?? profileData?.board ?? authUser?.boardName ?? authUser?.board;
    if (singleBoardId || singleBoardName) {
      const matched = allBoards.filter((b) =>
        (singleBoardId && String(b.id ?? b.boardId) === String(singleBoardId)) ||
        (singleBoardName && (b.name === singleBoardName || b.code === singleBoardName || b.boardName === singleBoardName))
      );
      if (matched.length > 0) return matched;
      const bName = singleBoardName === "BIEAP" ? "Board of Intermediate Education, Andhra Pradesh" : (singleBoardName || "Board of Intermediate Education, Andhra Pradesh");
      return [{ id: singleBoardId || "1", boardId: singleBoardId || 1, name: bName, boardName: bName, code: profileData?.boardCode || "BIEAP" }];
    }

    return allBoards;
  }, [boards, profileData]);

  // Active Board Resolution
  const activeBoard = useMemo(() => {
    if (selectedBoard?.name || selectedBoard?.code || selectedBoard?.id) {
      const match = availableBoards.find(
        (b) => String(b.id ?? b.boardId) === String(selectedBoard?.id ?? selectedBoard?.boardId) ||
               (b.code && b.code === selectedBoard?.code) ||
               (b.name && b.name === selectedBoard?.name)
      );
      if (match) return match;
    }
    try {
      const stored = localStorage.getItem("cms_selected_board");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name || parsed?.code) {
          const match = availableBoards.find(
            (b) => String(b.id ?? b.boardId) === String(parsed.id ?? parsed.boardId) ||
                   (b.code && b.code === parsed.code)
          );
          if (match) return match;
        }
      }
    } catch {}
    return availableBoards[0] || null;
  }, [selectedBoard, availableBoards]);

  // 3. Staff Assigned Academic Years Resolution
  const availableAcademicYears = useMemo(() => {
    const allYears = Array.isArray(academicYears) && academicYears.length > 0 ? academicYears : FALLBACK_ACADEMIC_YEARS;
    const authUser = getAuthUser();

    // Array of academic year objects on profileData
    if (Array.isArray(profileData?.assignedAcademicYears) && profileData.assignedAcademicYears.length > 0) {
      const idSet = new Set(profileData.assignedAcademicYears.map((y) => String(y.id ?? y.academicYearId ?? y.code ?? y)).filter(Boolean));
      const matched = allYears.filter((y) => idSet.has(String(y.id)) || idSet.has(String(y.code)) || idSet.has(String(y.name)));
      if (matched.length > 0) return matched;
    }

    // Array of academic year IDs on profileData or authUser
    const assignedIds = (Array.isArray(profileData?.assignedAcademicYearIds) && profileData.assignedAcademicYearIds.length > 0)
      ? profileData.assignedAcademicYearIds
      : (Array.isArray(authUser?.assignedAcademicYearIds) && authUser.assignedAcademicYearIds.length > 0)
      ? authUser.assignedAcademicYearIds
      : null;

    if (Array.isArray(assignedIds) && assignedIds.length > 0) {
      const idSet = new Set(assignedIds.map(String));
      const matched = allYears.filter((y) => idSet.has(String(y.id)) || idSet.has(String(y.academicYearId)) || idSet.has(String(y.code)));
      if (matched.length > 0) return matched;
    }

    // Single academic year assigned on profileData or authUser
    const singleYearId = profileData?.academicYearId ?? authUser?.academicYearId;
    const singleYearName = profileData?.academicYear ?? authUser?.academicYear;
    if (singleYearId || singleYearName) {
      const matched = allYears.filter((y) =>
        (singleYearId && (String(y.id) === String(singleYearId) || String(y.academicYearId) === String(singleYearId))) ||
        (singleYearName && (y.name === singleYearName || y.code === singleYearName || y.label === singleYearName))
      );
      if (matched.length > 0) return matched;
      return [{
        id: singleYearId || "2026-2027",
        code: singleYearName || "2026-2027",
        name: singleYearName || "2026-2027",
        label: singleYearName || "2026-2027",
      }];
    }

    return allYears;
  }, [academicYears, profileData]);

  // Active Academic Year Resolution
  const activeAcademicYear = useMemo(() => {
    if (selectedAcademicYear?.name || selectedAcademicYear?.code || selectedAcademicYear?.id) {
      const match = availableAcademicYears.find(
        (y) => String(y.id ?? y.academicYearId) === String(selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId) ||
               (y.code && y.code === selectedAcademicYear?.code) ||
               (y.name && y.name === selectedAcademicYear?.name)
      );
      if (match) return match;
    }
    try {
      const stored = localStorage.getItem("cms_selected_academic_year");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name || parsed?.code) {
          const match = availableAcademicYears.find(
            (y) => String(y.id ?? y.academicYearId) === String(parsed.id ?? parsed.academicYearId) ||
                   (y.code && y.code === parsed.code)
          );
          if (match) return match;
        }
      }
    } catch {}
    return availableAcademicYears[0] || null;
  }, [selectedAcademicYear, availableAcademicYears]);

  // Sync initial selections back to contexts if they were null or out of assigned scope
  useEffect(() => {
    if (activeCampus && String(selectedCampus?.id ?? selectedCampus?.campusId) !== String(activeCampus.id ?? activeCampus.campusId)) {
      if (setSelectedCampus) setSelectedCampus(activeCampus);
      try {
        localStorage.setItem("cms_selected_campus_id", String(activeCampus.id ?? activeCampus.campusId));
      } catch {}
    }
  }, [activeCampus, selectedCampus, setSelectedCampus]);

  useEffect(() => {
    if (activeBoard && String(selectedBoard?.id ?? selectedBoard?.boardId) !== String(activeBoard.id ?? activeBoard.boardId)) {
      if (academicSetSelectedBoard) academicSetSelectedBoard(activeBoard);
      if (facultySetSelectedBoard) facultySetSelectedBoard(activeBoard);
      try {
        localStorage.setItem("cms_selected_board", JSON.stringify(activeBoard));
      } catch {}
    }
  }, [activeBoard, selectedBoard, academicSetSelectedBoard, facultySetSelectedBoard]);

  useEffect(() => {
    if (activeAcademicYear && String(selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId) !== String(activeAcademicYear.id ?? activeAcademicYear.academicYearId)) {
      if (academicSetSelectedAcademicYear) academicSetSelectedAcademicYear(activeAcademicYear);
      if (facultySetSelectedAcademicYear) facultySetSelectedAcademicYear(activeAcademicYear);
      try {
        localStorage.setItem("cms_selected_academic_year", JSON.stringify(activeAcademicYear));
      } catch {}
    }
  }, [activeAcademicYear, selectedAcademicYear, academicSetSelectedAcademicYear, facultySetSelectedAcademicYear]);

  // Dropdown States
  const [campusOpen, setCampusOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [responsiveOpen, setResponsiveOpen] = useState(false);

  const campusRef = useRef(null);
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

  // Selection Handlers
  const handleCampusSelect = (campus) => {
    if (setSelectedCampus) setSelectedCampus(campus);
    try {
      localStorage.setItem("cms_selected_campus_id", String(campus.id ?? campus.campusId));
    } catch {}
    setCampusOpen(false);
    setResponsiveOpen(false);
  };

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
    if (item.step) navigate(`/faculty-dashboard/profile?step=${item.step}`);
    else setActiveModule(item.moduleId);
    setSearchOpen(false);
    setSearchQuery("");
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (campusRef.current && !campusRef.current.contains(e.target)) setCampusOpen(false);
      if (boardRef.current && !boardRef.current.contains(e.target)) setBoardOpen(false);
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
      if (responsiveRef.current && !responsiveRef.current.contains(e.target)) setResponsiveOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (profileDropRef.current && !profileDropRef.current.contains(e.target)) setProfileDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const campusDisplayName = activeCampus?.name || activeCampus?.campusName || activeCampus?.code || selectedCampus?.name || "Main Campus (HQ)";
  const boardDisplayName = activeBoard?.name || activeBoard?.boardName || activeBoard?.code || (boardsLoading ? "Loading boards..." : "Board of Intermediate Education, Andhra Pradesh");
  const yearDisplayName = activeAcademicYear?.name || activeAcademicYear?.label || activeAcademicYear?.code || "2026-2027";

  const [photoOverride, setPhotoOverride] = useState(null);
  const [navPhotoError, setNavPhotoError] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setPhotoOverride(e.detail?.photoUrl !== undefined ? e.detail.photoUrl : null);
    };
    window.addEventListener("cms-staff-photo-updated", handler);
    return () => window.removeEventListener("cms-staff-photo-updated", handler);
  }, []);

  const activePhoto = useMemo(() => {
    if (photoOverride !== null) return photoOverride;
    const staffId = profileData?.id || profileData?.facultyId;
    const cachedStaffPhoto = typeof window !== "undefined" && staffId ? localStorage.getItem(`staff_profile_${staffId}_photo`) : null;
    return (
      profileData?.photoUrl ||
      profileData?.photoPath ||
      profileData?.profilePhoto ||
      cachedStaffPhoto ||
      (typeof window !== "undefined" ? localStorage.getItem("staff_profile_photo") : null) ||
      null
    );
  }, [photoOverride, profileData?.photoUrl, profileData?.photoPath, profileData?.profilePhoto, profileData?.id, profileData?.facultyId]);

  useEffect(() => {
    setNavPhotoError(false);
  }, [activePhoto]);

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
          {/* Campus Selector (Interactive Dropdown) */}
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
              disabled={campusLoading && !availableCampuses.length}
              aria-label="Select Campus"
              aria-expanded={campusOpen}
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
              <ChevronDown size={12} className="cms-academic-btn-arrow" />
            </button>

            {campusOpen && (
              <div className="cms-academic-dropdown-panel">
                <div className="cms-academic-panel-header">
                  {availableCampuses.length > 1 ? "Select Campus" : "Assigned Campus"}
                </div>
                <div className="cms-academic-panel-list">
                  {availableCampuses.map((c) => {
                    const isSelected =
                      String(activeCampus?.id ?? activeCampus?.campusId) === String(c.id ?? c.campusId) ||
                      (c.code && activeCampus?.code === c.code);
                    return (
                      <button
                        key={c.id || c.campusId}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => handleCampusSelect(c)}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                          <span className="cms-academic-item-name" title={c.name || c.campusName}>
                            {c.name || c.campusName}
                          </span>
                          {c.code && <span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>{c.code}</span>}
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="cms-academic-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Board Selector (Interactive Dropdown) */}
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
                <div className="cms-academic-panel-header">
                  {availableBoards.length > 1 ? "Select Board" : "Assigned Board"}
                </div>
                <div className="cms-academic-panel-list">
                  {availableBoards.map((b) => {
                    const isSelected =
                      String(activeBoard?.id ?? activeBoard?.boardId) === String(b.id ?? b.boardId) ||
                      activeBoard?.code === b.code ||
                      activeBoard?.name === b.name ||
                      activeBoard?.boardName === b.boardName;
                    return (
                      <button
                        key={b.id || b.boardId || b.code}
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
                setCampusOpen(false);
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
                <div className="cms-academic-panel-header">
                  {availableAcademicYears.length > 1 ? "Select Academic Year" : "Assigned Academic Year"}
                </div>
                <div className="cms-academic-panel-list">
                  {availableAcademicYears.map((y) => {
                    const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
                    const isSelected =
                      String(activeAcademicYear?.id ?? activeAcademicYear?.academicYearId) === String(y.id ?? y.academicYearId) ||
                      normalize(activeAcademicYear?.code) === normalize(y.code) ||
                      normalize(activeAcademicYear?.name) === normalize(y.name) ||
                      normalize(activeAcademicYear?.label) === normalize(y.label);
                    return (
                      <button
                        key={y.id || y.academicYearId || y.code}
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
              setCampusOpen(false);
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
                {activeCampus?.code || "Campus"} · {activeBoard?.code || "Board"} · {activeAcademicYear?.name || "Year"}
              </span>
            </div>
            <ChevronDown size={12} className="cms-academic-btn-arrow" />
          </button>

          {responsiveOpen && (
            <div className="cms-academic-dropdown-panel cms-academic-responsive-panel">
              {/* Campus Selector */}
              <div className="cms-academic-responsive-section">
                <div className="cms-academic-responsive-sec-title">
                  <Building2 size={13} color="var(--cms-primary)" />
                  <span>{availableCampuses.length > 1 ? "Switch Campus" : "Assigned Campus"}</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableCampuses.map((c) => {
                    const isSelected =
                      String(activeCampus?.id ?? activeCampus?.campusId) === String(c.id ?? c.campusId) ||
                      (c.code && activeCampus?.code === c.code);
                    return (
                      <button
                        key={c.id || c.campusId}
                        type="button"
                        className={`cms-academic-panel-item ${isSelected ? "is-selected" : ""}`}
                        onClick={() => handleCampusSelect(c)}
                      >
                        <span className="cms-academic-item-name" title={c.name || c.campusName}>
                          {c.name || c.campusName}
                        </span>
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
                  <span>{availableBoards.length > 1 ? "Switch Board" : "Assigned Board"}</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableBoards.map((b) => {
                    const isSelected =
                      String(activeBoard?.id ?? activeBoard?.boardId) === String(b.id ?? b.boardId) ||
                      activeBoard?.code === b.code ||
                      activeBoard?.name === b.name ||
                      activeBoard?.boardName === b.boardName;
                    return (
                      <button
                        key={b.id || b.boardId || b.code}
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
                  <span>{availableAcademicYears.length > 1 ? "Switch Academic Year" : "Assigned Academic Year"}</span>
                </div>
                <div className="cms-academic-panel-list">
                  {availableAcademicYears.map((y) => {
                    const normalize = (s) => String(s || "").trim().replace(/[–—]/g, "-").replace(/\s+/g, "");
                    const isSelected =
                      String(activeAcademicYear?.id ?? activeAcademicYear?.academicYearId) === String(y.id ?? y.academicYearId) ||
                      normalize(activeAcademicYear?.code) === normalize(y.code) ||
                      normalize(activeAcademicYear?.name) === normalize(y.name) ||
                      normalize(activeAcademicYear?.label) === normalize(y.label);
                    return (
                      <button
                        key={y.id || y.academicYearId || y.code}
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
            {activePhoto && !navPhotoError ? (
              <img 
                src={activePhoto} 
                alt="Profile" 
                className="cms-avatar" 
                style={{ objectFit: 'cover' }} 
                onError={() => setNavPhotoError(true)} 
              />
            ) : (
              <TransparentAvatar size={34} className="cms-avatar" />
            )}

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
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {activePhoto && !navPhotoError ? (
                    <img 
                      src={activePhoto} 
                      alt="Profile" 
                      className="cms-avatar" 
                      style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: "50%", flexShrink: 0 }} 
                      onError={() => setNavPhotoError(true)} 
                    />
                  ) : (
                    <TransparentAvatar size={36} className="cms-avatar" />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profileData.fullName ||
                        `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
                        "Staff Member"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--cms-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profileData.designation || profileData.role || "Staff"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                  {typeof profileData.email === "string"
                    ? profileData.email
                    : Array.isArray(profileData.email)
                    ? profileData.email[0]
                    : ""}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>
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
              <button
                type="button"
                className="cms-dropdown-item"
                onClick={() => {
                  setProfileDropOpen(false);
                  setThemePaletteOpen(true);
                }}
              >
                <Palette size={14} /> Theme Appearance
              </button>
              <button className="cms-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <ThemePalettePicker
        open={themePaletteOpen}
        onOpenChange={setThemePaletteOpen}
        hideTrigger={true}
      />

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
