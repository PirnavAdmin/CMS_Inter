import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { SkeletonPage } from "@/shared/components/Ui.jsx";
import StudentSidebar from "./StudentSidebar.jsx";
import StudentNavbar from "./StudentNavbar.jsx";
import "../StudentDashboard.css";
import { StudentProfileProvider, useStudentProfile } from "../context/StudentProfileContext.jsx";
import useTheme from "@/hooks/useTheme.js";

const SIDEBAR_WIDTH_KEY = "studentPortal.sidebarWidth";
const DEFAULT_SIDEBAR_WIDTH = 218;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 350;
const clampSidebarWidth = (value) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));

function StudentPortalContent() {
  const { profile, loading, error, refreshProfile } = useStudentProfile();
  if (loading && !profile) return <div className="sp-page"><SkeletonPage/></div>;
  if (error && !profile) return <div className="sp-page"><div className="sp-api-state is-error"><p>{error}</p><button className="sp-btn" type="button" onClick={refreshProfile}>Retry</button></div></div>;
  return <Outlet/>;
}

export default function StudentLayout() {
  const { palette } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
      return Number.isFinite(savedWidth) && savedWidth > 0 ? clampSidebarWidth(savedWidth) : DEFAULT_SIDEBAR_WIDTH;
    } catch {
      return DEFAULT_SIDEBAR_WIDTH;
    }
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStart = useRef(null);
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

  const startSidebarResize = (event) => {
    if (mobile || sidebarCollapsed || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: sidebarWidth };
    setIsResizingSidebar(true);
  };
  const resizeSidebar = (event) => {
    const start = resizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setSidebarWidth(clampSidebarWidth(start.startWidth + event.clientX - start.startX));
  };
  const finishSidebarResize = (event) => {
    const start = resizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    resizeStart.current = null;
    setIsResizingSidebar(false);
    try { window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(start.startWidth + event.clientX - start.startX))); } catch { /* Keep resizing available when storage is disabled. */ }
  };

  return <StudentProfileProvider>
    <div className={`sp-shell${sidebarCollapsed ? " sp-sidebar-collapsed" : ""}${isResizingSidebar ? " is-resizing-sidebar" : ""}`} data-dashboard-palette={palette} style={{ "--sp-sidebar-expanded-width": `${sidebarWidth}px` }}>
      <StudentSidebar open={sidebarOpen} collapsed={sidebarCollapsed} mobile={mobile} onClose={() => setSidebarOpen(false)} onResizePointerDown={startSidebarResize} onResizePointerMove={resizeSidebar} onResizePointerUp={finishSidebarResize} onResizePointerCancel={finishSidebarResize}/>
      {mobile && sidebarOpen ? <button className="sp-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"/> : null}
      <div className="sp-workspace">
        <StudentNavbar onMenu={toggleSidebar} sidebarExpanded={mobile ? sidebarOpen : !sidebarCollapsed}/>
        <main className="sp-content"><StudentPortalContent/></main>
      </div>
    </div>
  </StudentProfileProvider>;
}
