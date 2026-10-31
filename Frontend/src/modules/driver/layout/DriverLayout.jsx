import React, { useState } from "react";
import DriverSidebar from "../components/DriverSidebar.jsx";
import DriverTopbar from "../components/DriverTopbar.jsx";
import useTheme from "@/hooks/useTheme.js";
import "./DriverLayout.css";

export default function DriverLayout({
  activeTab,
  onSelectTab,
  onLogout,
  onSyncData,
  children,
}) {
  const { palette } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dp-shell" data-dashboard-palette={palette}>
      <DriverSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="dp-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      )}

      <div className="dp-workspace">
        <DriverTopbar
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          onNavigateProfile={() => onSelectTab("profile")}
          onNavigatePayslips={() => onSelectTab("payslips")}
          onLogout={onLogout}
          onSyncData={onSyncData}
        />
        <main className="dp-content">{children}</main>
      </div>
    </div>
  );
}
