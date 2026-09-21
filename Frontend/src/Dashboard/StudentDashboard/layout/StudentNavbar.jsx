import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import menuIcon from "@/assets/navbar-3d/menu.png";
import notificationIcon from "@/assets/navbar-3d/notifications.png";
import darkThemeIcon from "@/assets/navbar-3d/theme-dark.png";
import lightThemeIcon from "@/assets/navbar-3d/theme-light.png";
import boardIcon from "@/assets/navbar-3d/board.png";
import academicYearIcon from "@/assets/navbar-3d/academic-year.png";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { clearAuthSession } from "@/features/authStorage.js";
import { student } from "../data/studentMockData.js";

export default function StudentNavbar({ onMenu }) {
  const navigate = useNavigate();
  const { selectedBoard, selectedAcademicYear } = useAcademicContext();
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);

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
  const assignedBoard = student.board
    || selectedBoard?.name
    || selectedBoard?.boardName
    || selectedBoard?.code
    || "Board not assigned";
  const assignedAcademicYear = student.academicYear
    || selectedAcademicYear?.name
    || selectedAcademicYear?.label
    || selectedAcademicYear?.code
    || "Year not assigned";
  const logout = () => {
    clearAuthSession();
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <header className="sp-navbar">
      <button className="sp-icon-btn sp-menu-btn" onClick={onMenu} aria-label="Toggle sidebar">
        <img src={menuIcon} alt="" aria-hidden="true" />
      </button>
      <div className="sp-navbar-title">
        <strong>Student Portal</strong>
        <span>{student.academicYear} • {student.section}</span>
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
        <button className="sp-icon-btn sp-notification" aria-label="Notifications">
          <img src={notificationIcon} alt="" aria-hidden="true" />
          <i>2</i>
        </button>
        <div className="sp-profile-menu" ref={menuRef}>
          <button onClick={() => setProfileOpen((value) => !value)}>
            <span className="sp-avatar">{student.initials}</span>
            <span><strong>{student.name}</strong><small>Roll No: {student.rollNo}</small></span>
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
