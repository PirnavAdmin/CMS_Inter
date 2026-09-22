import { useState } from "react";
import { Outlet } from "react-router-dom";
import StudentSidebar from "./StudentSidebar.jsx";
import StudentNavbar from "./StudentNavbar.jsx";
import "../StudentDashboard.css";

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return <div className="sp-shell"><StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}/>{sidebarOpen ? <button className="sp-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"/> : null}<div className="sp-workspace"><StudentNavbar onMenu={() => setSidebarOpen((value) => !value)}/><main className="sp-content"><Outlet/></main></div></div>;
}
