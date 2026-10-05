import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import menuIcon from "@/assets/navbar-3d/menu.png";
import notificationIcon from "@/assets/navbar-3d/notifications.png";
import darkThemeIcon from "@/assets/navbar-3d/theme-dark.png";
import lightThemeIcon from "@/assets/navbar-3d/theme-light.png";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { clearAuthSession, getAuthUser } from "@/features/authStorage.js";

export default function AccountantNavbar({ onMenu }) {
  const navigate = useNavigate();
  const { selectedCampus } = useCampusContext();
  const user = getAuthUser() || {};
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const name = user.fullName || user.name || "Accountant";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AC";

  useEffect(() => {
    const close = (event) => !menuRef.current?.contains(event.target) && setProfileOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sp-navbar">
      <button className="sp-icon-btn sp-menu-btn" onClick={onMenu} aria-label="Toggle sidebar"><img src={menuIcon} alt="" /></button>
      <div className="sp-navbar-title"><strong>Accountant Portal</strong><span>{selectedCampus?.name || selectedCampus?.campusName || "Campus finance workspace"}</span></div>
      <div className="sp-accountant-context"><span>Finance workspace</span></div>
      <div className="sp-navbar-actions">
        <button className="sp-icon-btn" onClick={() => { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; }} aria-label="Toggle theme"><img src={dark ? lightThemeIcon : darkThemeIcon} alt="" /></button>
        <button className="sp-icon-btn sp-notification" aria-label="Notifications"><img src={notificationIcon} alt="" /><i>0</i></button>
        <div className="sp-profile-menu" ref={menuRef}>
          <button onClick={() => setProfileOpen((value) => !value)}>
            <span className="sp-avatar">{initials}</span>
            <span><strong>{name}</strong><small>{user.role || "Accountant"}</small></span>
            <ChevronDown size={15} />
          </button>
          {profileOpen ? <div className="sp-profile-dropdown">
            <Link to="/accountant-dashboard/profile" onClick={() => setProfileOpen(false)}><UserRound size={16} /> My Profile</Link>
            <div className="sp-profile-divider" />
            <button type="button" className="sp-profile-logout" onClick={logout}><LogOut size={16} /> Logout</button>
          </div> : null}
        </div>
      </div>
    </header>
  );
}
