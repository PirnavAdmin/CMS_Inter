import React, { useState } from "react";
import DashboardLayout, { adminIconAssets, generatedSidebarIcons } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { Route as RouteIcon, Settings as SettingsIcon } from "lucide-react";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import transportBusIcon from "@/assets/sidebar-3d/transport-bus.png";
import reportsAnalyticsIcon from "@/assets/sidebar-3d/reports-analytics.png";
import staffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import TransportManagerSidebar from "./TransportManagerSidebar.jsx";
import TransportManagerNavbar from "./TransportManagerNavbar.jsx";
import { useTransportManager } from "../TransportManagerContext.jsx";
import "@/shared/layouts/DashboardLayout/DashboardLayout.css";
import "@/cms.css";
import "./TransportManagerLayout.css";
import ThemePalettePicker from "@/shared/components/ThemePalettePicker.jsx";

export const transportManagerMenu = [
  {
    section: "MAIN",
    items: [
      { to: "/transport-manager/overview", label: "Dashboard", icon: adminIconAssets.dashboard },
      { to: "/transport-manager/profile", label: "My Profile", icon: staffIcon },
    ],
  },
  {
    section: "TRANSPORT OPERATIONS",
    items: [
      { to: "/transport-manager/setup", label: "Setup", icon: RouteIcon },
      { to: "/transport-manager/operations", label: "Operations", icon: transportBusIcon },
      { to: "/transport-manager/reports", label: "Reports", icon: reportsAnalyticsIcon },
    ],
  },
  {
    section: "HR & FINANCE",
    items: [
      { to: "/transport-manager/my-attendance", label: "My Attendance", icon: generatedSidebarIcons.staffAttendance },
      { to: "/transport-manager/leave", label: "Staff Leave", icon: generatedSidebarIcons.staffLeave },
      { to: "/transport-manager/payslips", label: "Salary & Payslips", icon: generatedSidebarIcons.payroll },
      { to: "/transport-manager/reimbursements", label: "Reimbursements", icon: reimbursementIcon },
      { to: "/transport-manager/holidays", label: "Holidays", icon: holidayManagementIcon },
    ],
  },
  {
    section: "ADMINISTRATION",
    items: [
      { to: "/transport-manager/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export const transportSearchIndex = [
  { label: "Dashboard", to: "/transport-manager/overview", section: "Main" },
  { label: "My Profile", to: "/transport-manager/profile", section: "Main" },
  { label: "Setup", to: "/transport-manager/setup", section: "Transport Operations" },
  { label: "Route Management", to: "/transport-manager/setup?tab=routes", section: "Transport Operations" },
  { label: "Pickup Points", to: "/transport-manager/setup?tab=pickupPoints", section: "Transport Operations" },
  { label: "Vehicle Management", to: "/transport-manager/setup?tab=vehicles", section: "Transport Operations" },
  { label: "Driver Management", to: "/transport-manager/setup?tab=drivers", section: "Transport Operations" },
  { label: "Bus Attendants", to: "/transport-manager/setup?tab=attendants", section: "Transport Operations" },
  { label: "Operations", to: "/transport-manager/operations", section: "Transport Operations" },
  { label: "Vehicle Assignments", to: "/transport-manager/operations?tab=vehicleAssignments", section: "Transport Operations" },
  { label: "Student Transport", to: "/transport-manager/operations?tab=studentAssignments", section: "Transport Operations" },
  { label: "Vehicle Trips", to: "/transport-manager/operations?tab=trips", section: "Transport Operations" },
  { label: "GPS Tracking", to: "/transport-manager/operations?tab=gps", section: "Transport Operations" },
  { label: "Maintenance", to: "/transport-manager/operations?tab=maintenance", section: "Transport Operations" },
  { label: "Reports", to: "/transport-manager/reports", section: "Transport Operations" },
  { label: "My Attendance", to: "/transport-manager/my-attendance", section: "HR & Finance" },
  { label: "Staff Leave", to: "/transport-manager/leave", section: "HR & Finance" },
  { label: "Salary & Payslips", to: "/transport-manager/payslips", section: "HR & Finance" },
  { label: "Reimbursements", to: "/transport-manager/reimbursements", section: "HR & Finance" },
  { label: "Holidays", to: "/transport-manager/holidays", section: "HR & Finance" },
  { label: "Settings", to: "/transport-manager/settings", section: "Administration" },
];

export default function TransportManagerLayout({ children }) {
  const { sidebarCollapsed, sidebarOpen, closeSidebar } = useTransportManager();
  const [themePaletteOpen, setThemePaletteOpen] = useState(false);

  return (
    <div className={`cms-shell ${sidebarCollapsed ? "nav-closed" : ""}`}>
      {/* Transport Manager Sidebar with Pirnav branding & modules matching Screenshot 1 */}
      <TransportManagerSidebar />

      {/* Main Workspace */}
      <main className="cms-main">
        {/* Transport Manager Topbar with fixed role, assigned campus/board/year */}
        <TransportManagerNavbar onOpenThemePalette={() => setThemePaletteOpen(true)} />

        {/* Content Body */}
        <div className="cms-content">
          <div className="tm-shell">
            {children}
          </div>
        </div>
      </main>

      <ThemePalettePicker
        open={themePaletteOpen}
        onOpenChange={setThemePaletteOpen}
        hideTrigger={true}
      />

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="cms-backdrop-mobile is-open"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 55 }}
          onClick={closeSidebar}
        />
      )}
    </div>
  );
}
