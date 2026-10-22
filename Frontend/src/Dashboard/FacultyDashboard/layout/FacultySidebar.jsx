import CampusBrandImage from "@/components/common/CampusBrandImage.jsx";
import React, { useMemo } from "react";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import staffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import marksEvaluationIcon from "@/assets/sidebar-3d/marks-evaluation.png";
import examinationIcon from "@/assets/dashboard-3d/create-exam.png";
import feeManagementIcon from "@/assets/sidebar-3d/fee-management.png";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import managementIconsSprite from "@/assets/sidebar-3d/management-icons-sprite.png";
import generalSettingsIcon from "@/assets/sidebar-3d/general-settings.svg";
import { useFaculty } from "../FacultyContext.jsx";
import { useFacultyPermissions } from "../PermissionContext.jsx";

export const generatedSidebarIcons = {
  staffAttendance: { src: managementIconsSprite, position: "50% 0%" },
  staffLeave: { src: managementIconsSprite, position: "100% 0%" },
  payroll: { src: managementIconsSprite, position: "0% 100%" },
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

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: dashboardIcon, group: "MAIN" },
  { id: "profile", label: "My Profile", icon: staffIcon, group: "MAIN" },
  { id: "timetable", label: "My Timetable", icon: timetableIcon, group: "ACADEMICS" },
  { id: "classes", label: "My Classes", icon: staffIcon, group: "ACADEMICS" },
  { id: "attendance", label: "Student Attendance", icon: attendanceIcon, group: "ACADEMICS" },
  { id: "marks", label: "Marks Entry", icon: marksEvaluationIcon, group: "ACADEMICS" },
  { id: "examduties", label: "Exam Duties", icon: examinationIcon, group: "ACADEMICS" },
  { id: "myattendance", label: "My Attendance", icon: generatedSidebarIcons.staffAttendance, group: "HR & FINANCE" },
  { id: "leave", label: "Staff Leave", icon: generatedSidebarIcons.staffLeave, group: "HR & FINANCE" },
  { id: "salary", label: "Salary & Payslips", icon: generatedSidebarIcons.payroll, group: "HR & FINANCE" },
  { id: "reimbursements", label: "Reimbursements", icon: reimbursementIcon, group: "HR & FINANCE" },
  { id: "holidays", label: "Holidays", icon: holidayManagementIcon, group: "HR & FINANCE" },
  { id: "settings", label: "Settings", icon: generalSettingsIcon, group: "ADMINISTRATION" },
];

export const permissionByModule = {
  dashboard: "VIEW_DASHBOARD",
  profile: "VIEW_PROFILE",
  timetable: "VIEW_TIMETABLE",
  attendance: "MARK_ATTENDANCE",
  marks: "ENTER_MARKS",
  examduties: "VIEW_EXAM_DUTIES",
  myattendance: "VIEW_SELF_ATTENDANCE",
  leave: "APPLY_LEAVE",
  salary: "VIEW_PAYSLIPS",
  holidays: "VIEW_HOLIDAYS",
  classes: "VIEW_CLASSES",
  reimbursements: "VIEW_REIMBURSEMENTS",
  settings: "VIEW_SETTINGS",
};


export default function FacultySidebar() {
  const { activeModule, setActiveModule, sidebarOpen, setSidebarOpen, profileData, initials } = useFaculty();
  const permissions = useFacultyPermissions();

  const navGroups = ["MAIN", "ACADEMICS", "HR & FINANCE", "ADMINISTRATION"];

  const [photoOverride, setPhotoOverride] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      setPhotoOverride(e.detail?.photoUrl !== undefined ? e.detail.photoUrl : null);
    };
    window.addEventListener("cms-staff-photo-updated", handler);
    return () => window.removeEventListener("cms-staff-photo-updated", handler);
  }, []);

  const activePhoto = useMemo(() => {
    if (photoOverride !== null) return photoOverride;
    return (
      profileData?.photoUrl ||
      (typeof window !== "undefined" ? localStorage.getItem("staff_profile_photo") : null) ||
      (profileData?.photoPath
        ? `/api/v1/staff/photo/${profileData.id || profileData.facultyId}?t=${Date.now()}`
        : null)
    );
  }, [photoOverride, profileData?.photoUrl, profileData?.photoPath, profileData?.id, profileData?.facultyId]);

  return (
    <aside className={`cms-sidebar ${sidebarOpen ? "open is-open" : ""}`}>
      <div className="cms-brand">
        <CampusBrandImage className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges"  />
      </div>

      <nav className="cms-nav">
        {navGroups.map((grp) => {
          const items = NAV_ITEMS.filter(
            (n) => n.group === grp && (!permissionByModule[n.id] || permissions.includes(permissionByModule[n.id]))
          );
          if (!items.length) return null;
          return (
            <div key={grp}>
              <div className="cms-nav-group">{grp}</div>
              {items.map((item) => {
                const active = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`cms-nav-link ${active ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveModule(item.id);
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <SidebarIcon icon={item.icon} />
                    <span className="cms-nav-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer Profile Card (Displays uploaded profile photo or initials) */}
      <div
        className="cms-sidebar-footer"
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--cms-border, rgba(0, 0, 0, 0.08))",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => {
          setActiveModule("profile");
          if (window.innerWidth <= 768) setSidebarOpen(false);
        }}
        title="View My Profile"
      >
        {activePhoto ? (
          <img
            src={activePhoto}
            alt={profileData.fullName || "Profile"}
            className="cms-avatar"
            style={{ width: 34, height: 34, objectFit: "cover", borderRadius: "50%", flexShrink: 0 }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget.parentElement?.querySelector(".cms-avatar-fallback");
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="cms-avatar cms-avatar-fallback"
          style={{
            width: 34,
            height: 34,
            fontSize: 13,
            flexShrink: 0,
            display: activePhoto ? "none" : "flex",
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--cms-text)",
            }}
          >
            {profileData.fullName || `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() || "Staff Member"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--cms-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {profileData.designation || profileData.role || "Assistant Professor"}
          </div>
        </div>
      </div>
    </aside>
  );
}
