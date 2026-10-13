import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { X, LogOut, ChevronDown } from "lucide-react";
import ExamCellVisual from "./ExamCellVisuals.jsx";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import { getAuthUser, clearAuthSession } from "@/features/authStorage.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import logo from "@/assets/pirnav-colleges-logo.png";
import { examCellBase, examCellMenu } from "../navigation.js";
import "@/cms.css";
import "../exam-cell.css";

const id = (item) => String(item?.id ?? item?.campusId ?? item?.boardId ?? item?.academicYearId ?? "");
const name = (item) => item?.name || item?.campusName || item?.boardName || item?.academicYearName || item?.yearName || item?.code || "";

export default function ExamCellLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser() || {};
  const displayName = user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Exam Cell";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  const academic = useAcademicContext();
  const campus = useCampusContext();
  const logout = () => { clearAuthSession(); navigate("/login", { replace: true }); };
  useEffect(() => { setMobileOpen(false); setProfileOpen(false); setSearch(""); }, [location.pathname]);
  useEffect(() => {
    const close = (event) => { if (event.key === "Escape") { setMobileOpen(false); setProfileOpen(false); setSearch(""); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const selector = (label, options, selected, onSelect) => <label className="ec-context"><ExamCellVisual name={label} className="ec-context-image" /><span>{label}</span><select aria-label={label} value={id(selected)} onChange={(event) => onSelect(options.find((item) => id(item) === event.target.value))}><option value="" disabled>Select {label}</option>{options.map((item) => <option key={id(item)} value={id(item)}>{name(item)}</option>)}</select></label>;
  const matches = search.trim() ? examCellMenu.flatMap(([, entries]) => entries).filter(([, label]) => label.toLowerCase().includes(search.toLowerCase())) : [];
  return <div className={`ec-shell ${collapsed ? "ec-collapsed" : ""} ${mobileOpen ? "ec-mobile-open" : ""}`}>
    {mobileOpen && <button className="ec-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className="ec-sidebar" aria-label="Exam Cell navigation">
      <Link to={examCellBase} className="ec-brand"><img src={logo} alt="Pirnav College" /></Link>
      <button className="ec-mobile-close ec-icon" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
      <nav>{examCellMenu.map(([group, entries]) => <div className="ec-nav-group" key={group}><h2>{group}</h2>{entries.map(([path, label]) => <NavLink key={path} to={`${examCellBase}/${path}`} end={!path} title={label}><ExamCellVisual name={path} /><span>{label}</span></NavLink>)}</div>)}</nav>
      <button className="ec-logout" onClick={logout} title="Logout"><LogOut size={19} /><span>Logout</span></button>
    </aside>
    <main className="ec-main">
      <header className="ec-topbar">
        <button className="ec-icon ec-desktop-menu" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><ExamCellVisual name="menu" /></button>
        <button className="ec-icon ec-mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><ExamCellVisual name="menu" /></button>
        <div className="ec-search"><ExamCellVisual name="search" /><input aria-label="Search Exam Cell pages" placeholder="Search pages and modules..." value={search} onChange={(event) => setSearch(event.target.value)} />{search && <div className="ec-search-results">{matches.length ? matches.map(([path, label]) => <Link key={path} to={`${examCellBase}/${path}`}>{label}</Link>) : <p>No matching pages.</p>}</div>}</div>
        <div className="ec-contexts">{selector("Campus", campus.activeCampuses || campus.campuses || [], campus.selectedCampus, campus.setSelectedCampus)}{selector("Board", academic.boards, academic.selectedBoard, academic.setSelectedBoard)}{selector("Academic Year", academic.academicYears, academic.selectedAcademicYear, academic.setSelectedAcademicYear)}</div>
        <ThemeToggle />
        <span className="ec-icon" title="Notifications API is not configured" aria-label="Notifications unavailable"><ExamCellVisual name="notifications" /></span>
        <div className="ec-user-menu"><button className="ec-user" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}><span className="ec-avatar">{initials}</span><span><strong>{displayName}</strong><small>Exam Cell</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="ec-dropdown"><Link to={`${examCellBase}/profile`}>My Profile</Link><button onClick={logout}>Logout</button></div>}</div>
      </header>
      <div className="ec-content"><Outlet /></div>
    </main>
  </div>;
}
