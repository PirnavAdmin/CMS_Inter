import React from "react";
import { Outlet } from "react-router-dom";
import DashboardLayout, { adminIconAssets, generatedSidebarIcons } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import "../NonTeachingDashboard.css";

const nonTeachingMenu = [
  {
    section: "STAFF OVERVIEW",
    items: [
      { to: "/non-teaching-dashboard", label: "Dashboard", icon: adminIconAssets.dashboard },
      { to: "/non-teaching-dashboard/profile", label: "My Profile", icon: adminIconAssets.profile },
    ],
  },
  {
    section: "MY WORKPLACE",
    items: [
      { to: "/non-teaching-dashboard/attendance", label: "My Attendance", icon: adminIconAssets.attendanceImpact },
      { to: "/non-teaching-dashboard/leave", label: "Leave Management", icon: generatedSidebarIcons.staffLeave },
      { to: "/non-teaching-dashboard/tasks", label: "My Tasks", icon: generatedSidebarIcons.department },
      { to: "/non-teaching-dashboard/payslip", label: "Salary & Payslips", icon: generatedSidebarIcons.payroll },
      { to: "/non-teaching-dashboard/announcements", label: "Announcements", icon: adminIconAssets.financialReports },
    ],
  },
  {
    section: "OPERATIONS & HELP",
    items: [
      { to: "/non-teaching-dashboard/department", label: "Department Portal", icon: generatedSidebarIcons.admission },
      { to: "/non-teaching-dashboard/support", label: "Help & Support", icon: adminIconAssets.notifications },
    ],
  },
];

export default function NonTeachingLayout() {
  return (
    <DashboardLayout
      menuOverride={nonTeachingMenu}
      profilePath="/non-teaching-dashboard/profile"
      settingsPath={null}
      showSettingsAction={false}
      showBoardSelector={false}
      showAcademicYearSelector={false}
    >
      <div className="non-teaching-shell">
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
