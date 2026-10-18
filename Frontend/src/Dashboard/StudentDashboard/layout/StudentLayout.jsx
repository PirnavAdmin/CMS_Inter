import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentSidebar from "./StudentSidebar.jsx";
import StudentNavbar from "./StudentNavbar.jsx";
import "../StudentDashboard.css";
import { StudentProfileProvider, useStudentProfile } from "../context/StudentProfileContext.jsx";

function StudentPortalContent() {
  const { profile, loading, error, refreshProfile } = useStudentProfile();
  if (loading && !profile) return <div className="sp-page"><SkeletonPage/></div>;
  if (error && !profile) return <div className="sp-page"><div className="sp-api-state is-error"><p>{error}</p><button className="sp-btn" type="button" onClick={refreshProfile}>Retry</button></div></div>;
  return <Outlet/>;
}

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 900px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const syncViewport = () => { setMobile(media.matches); setSidebarOpen(false); };
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);
  useEffect(() => {
    if (!mobile || !sidebarOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setSidebarOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobile, sidebarOpen]);

  const toggleSidebar = () => mobile
    ? setSidebarOpen((value) => !value)
    : setSidebarCollapsed((value) => !value);

  return <StudentProfileProvider>
    <div className={`sp-shell${sidebarCollapsed ? " sp-sidebar-collapsed" : ""}`}>
      <StudentSidebar open={sidebarOpen} collapsed={sidebarCollapsed} mobile={mobile} onClose={() => setSidebarOpen(false)}/>
      {mobile && sidebarOpen ? <button className="sp-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"/> : null}
      <div className="sp-workspace">
        <StudentNavbar onMenu={toggleSidebar} sidebarExpanded={mobile ? sidebarOpen : !sidebarCollapsed}/>
        <main className="sp-content"><StudentPortalContent/></main>
      </div>
    </div>
  </StudentProfileProvider>;
}
