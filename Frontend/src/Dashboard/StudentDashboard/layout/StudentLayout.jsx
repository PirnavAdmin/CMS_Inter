import { useState } from "react";
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
  return <StudentProfileProvider><div className="sp-shell"><StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}/>{sidebarOpen ? <button className="sp-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"/> : null}<div className="sp-workspace"><StudentNavbar onMenu={() => setSidebarOpen((value) => !value)}/><main className="sp-content"><StudentPortalContent/></main></div></div></StudentProfileProvider>;
}
