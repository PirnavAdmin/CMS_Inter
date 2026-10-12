import React, { useState } from "react";
import DriverSidebar from "../components/DriverSidebar.jsx";
import DriverTopbar from "../components/DriverTopbar.jsx";
import "./DriverLayout.css";

export default function DriverLayout({
  activeTab,
  onSelectTab,
  onLogout,
  onSyncData,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dp-shell">
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
          onLogout={onLogout}
          onSyncData={onSyncData}
        />
        <main className="dp-content">{children}</main>
      </div>
    </div>
  );
}

