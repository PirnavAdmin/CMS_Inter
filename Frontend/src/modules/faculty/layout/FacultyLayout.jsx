import React from "react";
import { Outlet } from "react-router-dom";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import FacultySidebar from "./FacultySidebar.jsx";
import FacultyNavbar from "./FacultyNavbar.jsx";
import { useFaculty } from "../FacultyContext.jsx";
import "@/shared/layouts/DashboardLayout/DashboardLayout.css";
import "@/cms.css";
import "../FacultyDashboard.css";

export default function FacultyLayout({ children }) {
  const { sidebarOpen, setSidebarOpen, toast, setToast } = useFaculty();

  return (
    <div className={`cms-shell faculty-shell ${sidebarOpen ? "" : "nav-closed"}`}>
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
        <div
          className={`sp-toast sp-toast-${toast.type || "success"} ${toast.type === "error" ? "error" : ""}`}
          role="alert"
        >
          <div className="sp-toast-icon-wrap">
            {toast.type === "error" ? (
              <AlertCircle size={18} />
            ) : toast.type === "warning" ? (
              <AlertTriangle size={18} />
            ) : toast.type === "info" ? (
              <Info size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
          </div>
          <div className="sp-toast-content">
            {toast.title && <strong className="sp-toast-title">{toast.title}</strong>}
            <span className="sp-toast-message">{toast.text}</span>
          </div>
          {setToast && (
            <button
              type="button"
              className="sp-toast-close-btn"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
