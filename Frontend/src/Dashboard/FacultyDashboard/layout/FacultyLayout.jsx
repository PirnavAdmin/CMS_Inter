import React from "react";
import { Outlet } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import FacultySidebar from "./FacultySidebar.jsx";
import FacultyNavbar from "./FacultyNavbar.jsx";
import { useFaculty } from "../FacultyContext.jsx";
import "@/components/layout/DashboardLayout.css";
import "@/cms.css";
import "../FacultyDashboard.css";

export default function FacultyLayout({ children }) {
  const { sidebarOpen, setSidebarOpen, toast } = useFaculty();

  return (
    <div className={`cms-shell ${sidebarOpen ? "" : "nav-closed"}`}>
      {/* Sidebar */}
      <FacultySidebar />

      {/* Main Workspace */}
      <main className="cms-main">
        {/* Topbar */}
        <FacultyNavbar />

        {/* Content Body */}
        <div className="cms-content">
          {children || <Outlet />}
        </div>
      </main>

      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="cms-backdrop-mobile is-open"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 55 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </div>
      )}

      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
