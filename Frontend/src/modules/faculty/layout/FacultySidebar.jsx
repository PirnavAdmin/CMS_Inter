import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import React, { useMemo, useState, useEffect } from "react";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import staffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import marksEvaluationIcon from "@/assets/sidebar-3d/marks-evaluation.png";
import examinationIcon from "@/assets/dashboard-3d/create-exam.png";
import feeManagementIcon from "@/assets/sidebar-3d/fee-management.png";
import managementIconsSprite from "@/assets/sidebar-3d/management-icons-sprite.png";
import generalSettingsIcon from "@/assets/sidebar-3d/general-settings.svg";
import reimbursementIcon from "@/assets/sidebar-3d/reimbursement.svg";
import { useFaculty } from "../FacultyContext.jsx";
import { useFacultyPermissions } from "../PermissionContext.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { calculateStaffProfileCompletion, isStaffPortalUnlocked } from "../profileCompletion.js";
import { readCampusImages } from "@/modules/admin/AdminSettings/campusImages.js";
import { campusContentDefaults } from "@/modules/admin/AdminSettings/campusContent.js";

import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { Skeleton } from "@/shared/components/Ui.jsx";
import { CheckCircle2, Circle, Lock, Clock, ShieldCheck, UserCheck, Phone, Mail, Headphones } from "lucide-react";

export const generatedSidebarIcons = {
  staffAttendance: { src: managementIconsSprite, position: "50% 0%" },
  staffLeave: { src: managementIconsSprite, position: "100% 0%" },
  payroll: { src: managementIconsSprite, position: "0% 100%" },
};

export function SidebarIcon({ icon, sub = false }) {
  if (!icon) return null;
  return <ThreeDIcon icon={icon} size={sub ? 17 : 20} className={sub ? "cms-nav-3d-icon-sub" : ""} />;
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
  const { activeModule, setActiveModule, sidebarOpen, setSidebarOpen, profileData, profileStep, setProfileStep } = useFaculty();
  const permissions = useFacultyPermissions();
  const authUser = getAuthUser();
  const profileStatus = profileData?.profileStatus || authUser?.profileStatus;
  const roleLower = String(authUser?.role || "").toLowerCase();
  const staffTypeLower = String(authUser?.staffType || "").toLowerCase();
  const isFaculty =
    roleLower.includes("teach") ||
    roleLower.includes("faculty") ||
    roleLower.includes("professor") ||
    roleLower.includes("lecturer") ||
    roleLower.includes("staff") ||
    staffTypeLower.includes("teach") ||
    Boolean(authUser?.staffId) ||
    Boolean(authUser?.employeeId) ||
    Boolean(profileData?.employeeId);
  const compPct = useMemo(() => calculateStaffProfileCompletion(profileData), [profileData]);
  const isCompleted = isStaffPortalUnlocked(
    profileStatus,
    profileData?.isOnboarded === true || authUser?.isOnboarded === true
  );
  const isPendingOnboarding = isFaculty && !isCompleted;

  const [supportContact, setSupportContact] = useState({
    name: "Central HR Administration",
    email: campusContentDefaults.contactEmail || "support@pirnavcollege.com",
    phone: campusContentDefaults.contactPhone || "+91 9398649798",
  });

  useEffect(() => {
    let active = true;
    const campusId = authUser?.campusId || profileData?.campusId || 1;
    readCampusImages(campusId)
      .then((cfg) => {
        if (active && cfg) {
          setSupportContact({
            name: cfg.collegeName ? `${cfg.collegeName} HR Helpdesk` : "Central HR Administration",
            email: cfg.contactEmail || campusContentDefaults.contactEmail,
            phone: cfg.contactPhone || campusContentDefaults.contactPhone,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [authUser?.campusId, profileData?.campusId]);

  const navGroups = ["MAIN", "ACADEMICS", "HR & FINANCE", "ADMINISTRATION"];

  return (
    <aside className={`cms-sidebar ${sidebarOpen ? "open is-open" : ""}`}>
      <div className="cms-brand">
        <CampusBrandImage className="cms-brand-logo" src={pirnavCollegesLogo} alt="Pirnav Colleges" />
      </div>

      <nav className="cms-nav">
        {isPendingOnboarding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "0 4px" }}>
            {/* Active Onboarding Module */}
            <div>
              <div className="cms-nav-group">
                {isFaculty ? "FACULTY INDUCTION & ONBOARDING" : "STAFF INDUCTION & ONBOARDING"}
              </div>
              <button
                type="button"
                className="cms-nav-link is-active"
                onClick={() => {
                  setActiveModule("profile");
                  if (window.innerWidth <= 768) setSidebarOpen(false);
                }}
                style={{ marginBottom: "8px" }}
              >
                <SidebarIcon icon={staffIcon} />
                <span className="cms-nav-label">
                  <span>My Profile Setup</span>
                </span>
                <span style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  background: "var(--cms-primary, #355e3b)",
                  color: "#ffffff",
                  marginLeft: "auto"
                }}>
                  Active
                </span>
              </button>

              {/* Onboarding Wizard Sub-Steps */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                marginLeft: "20px",
                paddingLeft: "12px",
                borderLeft: "2px solid rgba(53, 94, 59, 0.2)"
              }}>
                {[
                  { step: 1, label: "Personal Info" },
                  { step: 2, label: "Bank Details" },
                  { step: 3, label: "Address Info" },
                  { step: 4, label: "Experience" },
                  { step: 5, label: "Documents" },
                  { step: 6, label: "Review & Submit" },
                ].map((s) => {
                  const isCurrent = profileStep === s.step;
                  const isPast = profileStep > s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => {
                        setActiveModule("profile");
                        if (typeof setProfileStep === "function") setProfileStep(s.step);
                        if (window.innerWidth <= 768) setSidebarOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        background: isCurrent ? "rgba(53, 94, 59, 0.12)" : "transparent",
                        border: "none",
                        color: isCurrent ? "var(--cms-primary, #355e3b)" : isPast ? "#166534" : "#64748b",
                        fontSize: "12px",
                        fontWeight: isCurrent ? "700" : isPast ? "600" : "500",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isPast ? (
                        <CheckCircle2 size={13} style={{ color: "#166534", flexShrink: 0 }} />
                      ) : isCurrent ? (
                        <span style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "var(--cms-primary, #355e3b)",
                          flexShrink: 0
                        }} />
                      ) : (
                        <Circle size={12} style={{ color: "#cbd5e1", flexShrink: 0 }} />
                      )}
                      <span>{s.step}. {s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile Completion Progress Card */}
            {(() => {
              const comp = compPct;
              return (
                <div style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid rgba(53, 94, 59, 0.15)",
                  borderRadius: "10px",
                  padding: "12px",
                  margin: "4px 8px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e293b" }}>Profile Progress</span>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      color: comp >= 50 ? "var(--cms-primary, #355e3b)" : "#d97706"
                    }}>
                      {comp}%
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      width: `${comp}%`,
                      height: "100%",
                      background: comp >= 50 ? "var(--cms-primary, #355e3b)" : "#f59e0b",
                      borderRadius: "3px",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px", lineHeight: "1.3" }}>
                    {comp >= 50 ? "✓ 50% reached. Ready to review and submit." : "Min 50% required for submission & Offer Letter."}
                  </div>
                </div>
              );
            })()}

            {/* Upcoming Locked Modules Preview - All Staff Portal Modules */}
            <div style={{ opacity: 0.75, marginTop: "4px" }}>
              <div
                className="cms-nav-group"
                style={{
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingRight: "6px"
                }}
              >
                <span>UNLOCKS AFTER HR APPROVAL</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {NAV_ITEMS.filter((n) => n.id !== "profile").map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      padding: "7px 10px",
                      borderRadius: "7px",
                      color: "#64748b",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "not-allowed",
                      userSelect: "none",
                      transition: "background 0.15s ease"
                    }}
                    title="This module will unlock once your onboarding profile is submitted and approved."
                  >
                    <SidebarIcon icon={item.icon} sub={true} />
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.label}
                    </span>
                    <Lock size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Support Help Footnote - Dynamic from Landing/Login Settings */}
            <div
              style={{
                margin: "12px 6px 16px",
                padding: "10px 12px",
                background: "rgba(255, 255, 255, 0.85)",
                border: "1px dashed rgba(53, 94, 59, 0.35)",
                borderRadius: "10px",
                fontSize: "11px",
                color: "#475569",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  color: "var(--cms-primary, #355e3b)",
                  fontWeight: "700",
                  marginBottom: "4px"
                }}
              >
                <Headphones size={13} />
                <span>Need Assistance?</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "#1e293b", fontWeight: "600", marginBottom: "4px" }}>
                {supportContact.name}
              </div>
              {supportContact.phone && (
                <a
                  href={`tel:${supportContact.phone.replace(/\s+/g, "")}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    color: "#334155",
                    textDecoration: "none",
                    fontWeight: "500",
                    margin: "3px 0",
                    transition: "color 0.15s ease"
                  }}
                  title="Call HR Support"
                >
                  <Phone size={11} style={{ color: "var(--cms-primary, #355e3b)" }} />
                  <span>{supportContact.phone}</span>
                </a>
              )}
              {supportContact.email && (
                <a
                  href={`mailto:${supportContact.email}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    color: "var(--cms-primary, #355e3b)",
                    textDecoration: "none",
                    fontWeight: "500",
                    wordBreak: "break-all"
                  }}
                  title="Email HR Support"
                >
                  <Mail size={11} />
                  <span>{supportContact.email}</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          navGroups.map((grp) => {
            const groupItems = NAV_ITEMS.filter((n) => n.group === grp);
            const items = groupItems.filter(
              (n) => !permissionByModule[n.id] || permissions.includes(permissionByModule[n.id])
            );
            const isLoadingGroup =
              !items.length &&
              groupItems.length > 0 &&
              (grp === "ACADEMICS" || grp === "HR & FINANCE") &&
              Boolean(permissions?.isLoadingPermissions) &&
              (!Array.isArray(permissions?.permissions) || permissions.permissions.length === 0);

            if (isLoadingGroup) {
              return (
                <div key={grp} aria-hidden="true">
                  <div className="cms-nav-group">{grp}</div>
                  {groupItems.map((item) => (
                    <div key={item.id} className="cms-nav-link" style={{ pointerEvents: "none" }}>
                      <Skeleton style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0 }} />
                      <Skeleton style={{ width: "68%", height: 13, borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
              );
            }

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
                      <span className="cms-nav-label">
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
