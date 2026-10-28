import React, { useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import staffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import transportBusIcon from "@/assets/sidebar-3d/transport-bus.png";
import reportsAnalyticsIcon from "@/assets/sidebar-3d/reports-analytics.png";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import managementIconsSprite from "@/assets/sidebar-3d/management-icons-sprite.png";
import generalSettingsIcon from "@/assets/sidebar-3d/general-settings.svg";
import { Route as RouteIcon } from "lucide-react";
import { useTransportManager } from "../TransportManagerContext.jsx";

export const generatedSidebarIcons = {
  staffAttendance: { src: managementIconsSprite, position: "50% 0%" },
  staffLeave: { src: managementIconsSprite, position: "100% 0%" },
  payroll: { src: managementIconsSprite, position: "0% 100%" },
  maintenance: { src: managementIconsSprite, position: "0% 0%" },
};

export function SidebarIcon({ icon, sub = false }) {
  if (!icon) return null;
  if (typeof icon === "string") {
    return <img className={`cms-nav-3d-icon${sub ? " cms-nav-3d-icon-sub" : ""}`} src={icon} alt="" aria-hidden="true" />;
  }
  if (icon.src) {
    return (
      <span
        className={`cms-nav-3d-icon cms-nav-generated-icon${sub ? " cms-nav-3d-icon-sub" : ""}`}
        style={{ backgroundImage: `url(${icon.src})`, backgroundPosition: icon.position }}
        aria-hidden="true"
      />
    );
  }
  const IconComponent = icon;
  return <IconComponent className={`cms-nav-3d-icon${sub ? " cms-nav-3d-icon-sub" : ""}`} size={sub ? 15 : 18} aria-hidden="true" />;
}

export const NAV_GROUPS = [
  {
    label: "MAIN",
    items: [
      {
        to: "/transport-manager/overview",
        label: "Dashboard",
        icon: dashboardIcon,
      },
      {
        to: "/transport-manager/profile",
        label: "My Profile",
        icon: staffIcon,
      },
    ],
  },
  {
    label: "TRANSPORT OPERATIONS",
    items: [
      {
        to: "/transport-manager/setup",
        label: "Setup",
        icon: RouteIcon,
      },
      {
        to: "/transport-manager/operations",
        label: "Operations",
        icon: transportBusIcon,
      },
      {
        to: "/transport-manager/reports",
        label: "Reports",
        icon: reportsAnalyticsIcon,
      },
    ],
  },
  {
    label: "HR & FINANCE",
    items: [
      {
        to: "/transport-manager/my-attendance",
        label: "My Attendance",
        icon: generatedSidebarIcons.staffAttendance,
      },
      {
        to: "/transport-manager/leave",
        label: "Staff Leave",
        icon: generatedSidebarIcons.staffLeave,
      },
      {
        to: "/transport-manager/payslips",
        label: "Salary & Payslips",
        icon: generatedSidebarIcons.payroll,
      },
      {
        to: "/transport-manager/reimbursements",
        label: "Reimbursements",
        icon: reimbursementIcon,
      },
      {
        to: "/transport-manager/holidays",
        label: "Holidays",
        icon: holidayManagementIcon,
      },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      {
        to: "/transport-manager/settings",
        label: "Settings",
        icon: generalSettingsIcon,
      },
    ],
  },
];

export default function TransportManagerSidebar() {
  const { sidebarOpen, sidebarCollapsed, closeSidebar, profile } = useTransportManager();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = useMemo(() => {
    const parts = String(profile?.name || "Transport Manager").trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0]?.[0] || "T").toUpperCase();
  }, [profile?.name]);

  return (
    <>
      <aside
        className={`cms-sidebar tm-sidebar ${sidebarOpen ? "open is-open" : ""} ${
          sidebarCollapsed ? "collapsed is-collapsed" : ""
        }`}
      >
        {/* Brand Header — In collapsed mode shows only crest icon matching Image 2 */}
        <div className="cms-brand" title={sidebarCollapsed ? "Pirnav Colleges" : undefined}>
          <CampusBrandImage className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges" />
        </div>

        {/* Navigation List */}
        <nav className="cms-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="cms-nav-group-wrap">
              <div className="cms-nav-group">{group.label}</div>
              {group.items.map((item) => {
                const isActive =
                  item.to === "/transport-manager/overview"
                    ? location.pathname === "/transport-manager" ||
                      location.pathname === "/transport-manager/overview"
                    : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => {
                      if (window.innerWidth <= 1024) closeSidebar();
                    }}
                    className={`cms-nav-link ${isActive ? "is-active" : ""}`}
                  >
                    <SidebarIcon icon={item.icon} />
                    <span className="cms-nav-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Card */}
        <div
          className="cms-sidebar-footer"
          onClick={() => {
            navigate("/transport-manager/profile");
            if (window.innerWidth <= 1024) closeSidebar();
          }}
          title={
            sidebarCollapsed
              ? `${profile?.name || "muzan kibutsuzi"} (${profile?.role || "Transport Manager"})`
              : "View My Profile"
          }
        >
          <div
            className="cms-avatar cms-avatar-fallback"
            style={{
              width: 34,
              height: 34,
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "var(--cms-primary, #6F8400)",
              color: "#ffffff",
            }}
          >
            {initials}
          </div>
          <div className="cms-sidebar-footer-text" style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--cms-text, #232a1e)",
              }}
            >
              {profile?.name || "muzan kibutsuzi"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--cms-muted, #727c65)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profile?.role || "Transport Manager"}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
